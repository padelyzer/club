"""
Performance tests for Django backend.
Tests query optimization, caching, and load handling.
"""

import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection, reset_queries
from django.db.models import Prefetch
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.clients.models import ClientProfile
from apps.clubs.models import Club, Court, Schedule
from apps.finance.models import Invoice, Transaction
from apps.reservations.models import Reservation
from apps.root.models import Organization
from utils.bff_cache import BFFCacheManager

User = get_user_model()


class TestQueryOptimization(TransactionTestCase):
    """Test database query optimization."""

    def setUp(self):
        """Create test data with relationships to test N+1 queries."""
        # Create organizations
        self.orgs = []
        for i in range(3):
            org = Organization.objects.create(
                trade_name=f"Org {i}",
                business_name=f"Organization {i} LLC",
                type="club",
                state="FL",
            )
            self.orgs.append(org)

        # Create users and memberships
        self.users = []
        for i in range(10):
            user = User.objects.create_user(
                email=f"user{i}@test.com",
                password="TEST_PASSWORD",
                first_name=f"User{i}",
                last_name="Test",
            )
            self.users.append(user)

            # Add to organizations
            OrganizationMembership.objects.create(
                user=user, organization=self.orgs[i % 3], role="member"
            )

        # Create clubs with courts
        self.clubs = []
        for org in self.orgs:
            for i in range(5):
                club = Club.objects.create(
                    name=f"{org.trade_name} Club {i}",
                    organization=org,
                    slug=f"{org.trade_name.lower()}-club-{i}",
                )
                self.clubs.append(club)

                # Create courts for each club
                for j in range(4):
                    Court.objects.create(
                        club=club,
                        name=f"Court {j}",
                        court_type="indoor" if j % 2 == 0 else "outdoor",
                        price_per_hour=Decimal("50.00") + Decimal(j * 10),
                    )

                # Create schedule
                for day in range(7):
                    Schedule.objects.create(
                        club=club,
                        weekday=day,
                        opening_time=datetime.strptime("08:00", "%H:%M").time(),
                        closing_time=datetime.strptime("22:00", "%H:%M").time(),
                        is_active=True,
                    )

        # Create reservations
        today = timezone.now().date()
        for i in range(100):
            club = self.clubs[i % len(self.clubs)]
            court = club.courts.first()
            user = self.users[i % len(self.users)]

            Reservation.objects.create(
                club=club,
                court=court,
                date=today + timedelta(days=i % 30),
                start_time=datetime.strptime(f"{9 + (i % 12)}:00", "%H:%M").time(),
                end_time=datetime.strptime(f"{10 + (i % 12)}:00", "%H:%M").time(),
                created_by=user,
                status="confirmed" if i % 3 != 0 else "pending",
            )

    @override_settings(DEBUG=True)
    def test_no_n_plus_one_in_club_list(self):
        """Test that listing clubs doesn't cause N+1 queries."""
        user = self.users[0]
        client = APIClient()
        client.force_authenticate(user=user)

        # Reset queries
        reset_queries()

        # Make request
        response = client.get("/api/v1/clubs/")
        self.assertEqual(response.status_code, 200)

        # Analyze queries
        queries = connection.queries
        query_count = len(queries)

        # Should be a reasonable number of queries
        # 1 for user, 1 for memberships, 1 for clubs, 1 for pagination count
        self.assertLess(
            query_count, 10, f"Too many queries ({query_count}) - possible N+1 problem"
        )

        # Check for repeated patterns (sign of N+1)
        query_types = {}
        for query in queries:
            sql = query["sql"]
            # Simplify query for pattern matching
            table_name = (
                sql.split("FROM")[1].split()[0].strip('"').strip("`")
                if "FROM" in sql
                else "unknown"
            )
            query_types[table_name] = query_types.get(table_name, 0) + 1

        # No table should be queried more than a few times
        for table, count in query_types.items():
            self.assertLess(
                count, 5, f"Table {table} queried {count} times - possible N+1"
            )

    @override_settings(DEBUG=True)
    def test_optimized_dashboard_queries(self):
        """Test that dashboard aggregation uses efficient queries."""
        user = self.users[0]
        client = APIClient()
        client.force_authenticate(user=user)

        club = self.clubs[0]

        # Reset queries
        reset_queries()

        # Make dashboard request
        response = client.get(f"/api/v1/bi/analytics/club/?club={club.id}")
        self.assertEqual(response.status_code, 200)

        # Check query efficiency
        queries = connection.queries
        query_count = len(queries)

        # Dashboard should use aggregation queries, not individual lookups
        self.assertLess(
            query_count, 15, f"Dashboard used {query_count} queries - not optimized"
        )

        # Look for aggregation queries
        has_aggregation = any(
            "COUNT" in q["sql"] or "SUM" in q["sql"] or "AVG" in q["sql"]
            for q in queries
        )
        self.assertTrue(has_aggregation, "Dashboard should use aggregation queries")

    def test_prefetch_related_usage(self):
        """Test that views properly use prefetch_related."""
        user = self.users[0]
        client = APIClient()
        client.force_authenticate(user=user)

        with self.assertNumQueries(5):  # Adjust based on your implementation
            # Get club with related data
            response = client.get(f"/api/v1/clubs/{self.clubs[0].id}/")
            self.assertEqual(response.status_code, 200)

            # Access related data (should be prefetched)
            data = response.data
            if "courts" in data:
                self.assertIsInstance(data["courts"], list)
            if "schedules" in data:
                self.assertIsInstance(data["schedules"], list)

    def test_select_related_usage(self):
        """Test that views properly use select_related."""
        user = self.users[0]
        client = APIClient()
        client.force_authenticate(user=user)

        # Create reservation to test
        reservation = Reservation.objects.filter(created_by=user).first()

        with self.assertNumQueries(3):  # Should be minimal
            response = client.get(f"/api/v1/reservations/{reservation.id}/")
            self.assertEqual(response.status_code, 200)

            # These should not trigger additional queries
            data = response.data
            self.assertIn("club", data)
            self.assertIn("court", data)
            self.assertIn("created_by", data)

    def test_database_index_usage(self):
        """Test that queries use database indexes efficiently."""
        user = self.users[0]
        client = APIClient()
        client.force_authenticate(user=user)

        # Test common filter operations that should use indexes
        test_cases = [
            ("/api/v1/reservations/?date=2024-01-01", "date index"),
            ("/api/v1/reservations/?status=confirmed", "status index"),
            (f"/api/v1/reservations/?club={self.clubs[0].id}", "club_id index"),
            ("/api/v1/clubs/?search=Club", "text search index"),
        ]

        for url, index_name in test_cases:
            reset_queries()
            response = client.get(url)
            self.assertEqual(response.status_code, 200)

            # In a real test, you'd analyze EXPLAIN output
            # For now, just ensure queries are fast
            total_time = sum(float(q["time"]) for q in connection.queries)
            self.assertLess(
                total_time, 0.1, f"Slow query for {index_name}: {total_time}s"
            )


class TestCacheEffectiveness(APITestCase):
    """Test caching mechanisms and effectiveness."""

    def setUp(self):
        """Set up test data."""
        cache.clear()

        self.org = Organization.objects.create(
            trade_name="Cache Test Org", business_name="Cache Test Organization LLC"
        )
        self.user = User.objects.create_user(
            email="cache@test.com", password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

        self.club = Club.objects.create(name="Cache Test Club", organization=self.org)

        # Create courts and reservations
        for i in range(3):
            Court.objects.create(club=self.club, name=f"Court {i}", court_type="indoor")

    def test_dashboard_cache_hit_rate(self):
        """Test that dashboard data is effectively cached."""
        self.client.force_authenticate(user=self.user)

        # First request (cache miss)
        start_time = time.time()
        response1 = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")
        first_request_time = time.time() - start_time
        self.assertEqual(response1.status_code, 200)

        # Second request (cache hit)
        start_time = time.time()
        response2 = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")
        second_request_time = time.time() - start_time
        self.assertEqual(response2.status_code, 200)

        # Cache hit should be much faster
        self.assertLess(
            second_request_time,
            first_request_time / 2,
            f"Cache not effective: {second_request_time:.3f}s vs {first_request_time:.3f}s",
        )

        # Data should be identical
        self.assertEqual(response1.data, response2.data)

    def test_cache_invalidation_on_update(self):
        """Test that cache is invalidated when data changes."""
        self.client.force_authenticate(user=self.user)

        # Cache dashboard data
        response1 = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")
        initial_data = response1.data

        # Create new reservation (should invalidate cache)
        Reservation.objects.create(
            club=self.club,
            court=self.club.courts.first(),
            date=timezone.now().date(),
            start_time=datetime.strptime("14:00", "%H:%M").time(),
            end_time=datetime.strptime("15:00", "%H:%M").time(),
            created_by=self.user,
            status="confirmed",
        )

        # Clear specific cache keys (simulating invalidation)
        BFFCacheManager.invalidate_club_cache(str(self.club.id))

        # Request again
        response2 = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")

        # Occupancy data should be different
        if "occupancy" in initial_data and "occupancy" in response2.data:
            self.assertNotEqual(
                initial_data["occupancy"]["total_reservations"],
                response2.data["occupancy"]["total_reservations"],
            )

    def test_cache_ttl_expiration(self):
        """Test that cache expires according to TTL settings."""
        self.client.force_authenticate(user=self.user)

        # Get availability (short TTL)
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response1 = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={tomorrow}"
        )

        # Verify it's cached
        cache_key = BFFCacheManager.get_availability_key(str(self.club.id), tomorrow)
        cached_data = BFFCacheManager.get_data_only(cache_key)
        self.assertIsNotNone(cached_data)

        # Simulate TTL expiration
        with patch("django.core.cache.cache.get", return_value=None):
            response2 = self.client.get(
                f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={tomorrow}"
            )
            self.assertEqual(response2.status_code, 200)

    def test_cache_key_uniqueness(self):
        """Test that cache keys are unique for different parameters."""
        # Test different cache key scenarios
        keys = []

        # Different clubs
        key1 = BFFCacheManager.get_dashboard_key("club1", "month")
        key2 = BFFCacheManager.get_dashboard_key("club2", "month")
        self.assertNotEqual(key1, key2)
        keys.extend([key1, key2])

        # Different periods
        key3 = BFFCacheManager.get_dashboard_key("club1", "week")
        key4 = BFFCacheManager.get_dashboard_key("club1", "year")
        self.assertNotEqual(key3, key4)
        keys.extend([key3, key4])

        # Different parameters
        key5 = BFFCacheManager.get_dashboard_key("club1", "month", include_revenue=True)
        key6 = BFFCacheManager.get_dashboard_key(
            "club1", "month", include_revenue=False
        )
        self.assertNotEqual(key5, key6)
        keys.extend([key5, key6])

        # All keys should be unique
        self.assertEqual(len(keys), len(set(keys)))

    def test_concurrent_cache_access(self):
        """Test cache behavior under concurrent access."""
        self.client.force_authenticate(user=self.user)

        def make_request():
            client = APIClient()
            client.force_authenticate(user=self.user)
            return client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")

        # Simulate concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in as_completed(futures)]

        # All should succeed
        for response in responses:
            self.assertEqual(response.status_code, 200)

        # Data should be consistent
        data_sets = [r.data for r in responses]
        first_data = data_sets[0]
        for data in data_sets[1:]:
            self.assertEqual(data, first_data)


class TestLoadHandling(APITestCase):
    """Test system behavior under load."""

    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            trade_name="Load Test Org", business_name="Load Test Organization LLC"
        )

        # Create multiple users
        self.users = []
        for i in range(20):
            user = User.objects.create_user(
                email=f"load{i}@test.com", password="TEST_PASSWORD"
            )
            OrganizationMembership.objects.create(
                user=user, organization=self.org, role="member"
            )
            self.users.append(user)

        # Create clubs and courts
        self.clubs = []
        for i in range(5):
            club = Club.objects.create(
                name=f"Load Test Club {i}", organization=self.org
            )
            self.clubs.append(club)

            for j in range(4):
                Court.objects.create(club=club, name=f"Court {j}", court_type="indoor")

    def test_concurrent_user_requests(self):
        """Test handling multiple concurrent users."""

        def user_session(user_index):
            user = self.users[user_index]
            client = APIClient()
            client.force_authenticate(user=user)

            responses = []

            # Each user makes several requests
            club = self.clubs[user_index % len(self.clubs)]

            # Dashboard request
            r1 = client.get(f"/api/v1/bi/analytics/club/?club={club.id}")
            responses.append(("dashboard", r1.status_code))

            # Availability check
            tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            r2 = client.get(
                f"/api/v1/reservations/availability/bulk/?club={club.id}&date={tomorrow}"
            )
            responses.append(("availability", r2.status_code))

            # Club list
            r3 = client.get("/api/v1/clubs/")
            responses.append(("clubs", r3.status_code))

            return responses

        # Run concurrent user sessions
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(user_session, i)
                for i in range(min(10, len(self.users)))
            ]

            all_responses = []
            for future in as_completed(futures):
                all_responses.extend(future.result())

        # Verify all requests succeeded
        for endpoint, status_code in all_responses:
            self.assertEqual(
                status_code, 200, f"Failed request to {endpoint}: {status_code}"
            )

    def test_database_connection_pooling(self):
        """Test that database connections are properly pooled."""
        initial_queries = len(connection.queries) if settings.DEBUG else 0

        def make_database_request():
            # Direct database query
            return list(Club.objects.filter(organization=self.org).values("id", "name"))

        # Make many concurrent database requests
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_database_request) for _ in range(50)]
            results = [future.result() for future in as_completed(futures)]

        # All should succeed and return data
        for result in results:
            self.assertGreater(len(result), 0)

        # No connection errors should occur
        # In production, monitor connection pool metrics

    def test_memory_usage_under_load(self):
        """Test memory usage doesn't grow excessively under load."""
        import gc
        import sys

        # Force garbage collection
        gc.collect()

        # Note: This is a simplified test. In production, use proper memory profiling
        initial_objects = len(gc.get_objects())

        # Perform many operations
        for i in range(100):
            client = APIClient()
            client.force_authenticate(user=self.users[i % len(self.users)])
            response = client.get("/api/v1/clubs/")
            self.assertEqual(response.status_code, 200)

            # Explicitly clean up
            del response
            del client

        # Force garbage collection
        gc.collect()

        # Check object count didn't grow too much
        final_objects = len(gc.get_objects())
        growth_ratio = final_objects / initial_objects

        self.assertLess(
            growth_ratio, 1.5, f"Memory usage grew too much: {growth_ratio:.2f}x"
        )

    def test_response_time_under_load(self):
        """Test that response times remain acceptable under load."""
        response_times = []

        def timed_request(user):
            client = APIClient()
            client.force_authenticate(user=user)

            start = time.time()
            response = client.get(f"/api/v1/bi/analytics/club/?club={self.clubs[0].id}")
            elapsed = time.time() - start

            return elapsed if response.status_code == 200 else None

        # Make concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(timed_request, self.users[i % len(self.users)])
                for i in range(30)
            ]

            for future in as_completed(futures):
                elapsed = future.result()
                if elapsed:
                    response_times.append(elapsed)

        # Calculate statistics
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)

            # Average should be under 200ms
            self.assertLess(
                avg_time, 0.2, f"Average response time too high: {avg_time:.3f}s"
            )

            # Max should be under 500ms
            self.assertLess(
                max_time, 0.5, f"Maximum response time too high: {max_time:.3f}s"
            )


class TestCriticalPathPerformance(APITestCase):
    """Test performance of critical user paths."""

    def setUp(self):
        """Set up realistic test data."""
        self.org = Organization.objects.create(
            trade_name="Performance Org", business_name="Performance Organization LLC"
        )

        self.user = User.objects.create_user(
            email="perf@test.com", password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

        # Create realistic club setup
        self.club = Club.objects.create(
            name="Performance Club",
            organization=self.org,
            opening_time=datetime.strptime("06:00", "%H:%M").time(),
            closing_time=datetime.strptime("23:00", "%H:%M").time(),
        )

        # Create courts
        self.courts = []
        for i in range(8):  # Typical padel club size
            court = Court.objects.create(
                club=self.club,
                name=f"Court {i+1}",
                court_type="indoor" if i < 4 else "outdoor",
                price_per_hour=Decimal("60.00"),
            )
            self.courts.append(court)

        # Create realistic reservation data
        today = timezone.now().date()
        for day_offset in range(30):  # 30 days of data
            date = today + timedelta(days=day_offset)

            # Create 60-80% occupancy
            for court in self.courts:
                for hour in range(8, 22, 2):  # Every 2 hours
                    if hash(f"{date}{court.id}{hour}") % 100 < 70:  # ~70% occupancy
                        Reservation.objects.create(
                            club=self.club,
                            court=court,
                            date=date,
                            start_time=datetime.strptime(f"{hour}:00", "%H:%M").time(),
                            end_time=datetime.strptime(f"{hour+1}:00", "%H:%M").time(),
                            created_by=self.user,
                            status="confirmed",
                        )

    def test_login_to_dashboard_flow(self):
        """Test complete login to dashboard flow performance."""
        total_start = time.time()

        # 1. Login
        start = time.time()
        response = self.client.post(
            "/api/v1/auth/login/", {"email": "perf@test.com", "password": "TEST_PASSWORD"}
        )
        login_time = time.time() - start
        self.assertEqual(response.status_code, 200)
        self.assertLess(login_time, 0.5, f"Login too slow: {login_time:.3f}s")

        # Extract token
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 2. Get auth context
        start = time.time()
        response = self.client.get("/api/v1/auth/context/")
        auth_context_time = time.time() - start
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            auth_context_time, 0.2, f"Auth context too slow: {auth_context_time:.3f}s"
        )

        # 3. Load dashboard
        start = time.time()
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")
        dashboard_time = time.time() - start
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            dashboard_time, 0.3, f"Dashboard too slow: {dashboard_time:.3f}s"
        )

        # Total flow time
        total_time = time.time() - total_start
        self.assertLess(total_time, 1.0, f"Total flow too slow: {total_time:.3f}s")

    def test_reservation_booking_flow(self):
        """Test complete reservation booking flow performance."""
        self.client.force_authenticate(user=self.user)

        tomorrow = timezone.now() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")

        total_start = time.time()

        # 1. Check availability
        start = time.time()
        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/"
            f"?club={self.club.id}&date={tomorrow_str}"
        )
        availability_time = time.time() - start
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            availability_time,
            0.15,
            f"Availability check too slow: {availability_time:.3f}s",
        )

        # Find available slot
        available_court = None
        available_slot = None
        for court_data in response.data["courts"]:
            for slot in court_data["slots"]:
                if slot["is_available"]:
                    available_court = court_data["id"]
                    available_slot = slot
                    break
            if available_court:
                break

        self.assertIsNotNone(available_court, "No available slots found")

        # 2. Create reservation
        start = time.time()
        reservation_data = {
            "club": self.club.id,
            "court": available_court,
            "date": tomorrow_str,
            "start_time": available_slot["start_time"],
            "end_time": available_slot["end_time"],
            "status": "pending",
        }
        response = self.client.post(
            "/api/v1/reservations/", reservation_data, format="json"
        )
        booking_time = time.time() - start
        self.assertEqual(response.status_code, 201)
        self.assertLess(booking_time, 0.2, f"Booking too slow: {booking_time:.3f}s")

        # Total flow time
        total_time = time.time() - total_start
        self.assertLess(
            total_time, 0.5, f"Total booking flow too slow: {total_time:.3f}s"
        )

    def test_analytics_period_comparison(self):
        """Test performance of analytics with period comparison."""
        self.client.force_authenticate(user=self.user)

        periods = ["week", "month", "quarter", "year"]

        for period in periods:
            start = time.time()
            response = self.client.get(
                f"/api/v1/bi/analytics/club/"
                f"?club={self.club.id}"
                f"&period={period}"
                f"&compare_previous=true"
                f"&include_revenue=true"
                f"&include_occupancy=true"
                f"&include_customers=true"
            )
            elapsed = time.time() - start

            self.assertEqual(response.status_code, 200)
            self.assertLess(
                elapsed, 0.5, f"Analytics for {period} too slow: {elapsed:.3f}s"
            )

            # Verify data completeness
            self.assertIn("occupancy", response.data)
            self.assertIn("customers", response.data)
            self.assertIn("revenue", response.data)

            # Verify comparison data
            if response.data.get("occupancy", {}).get("comparison"):
                self.assertIn("previous_rate", response.data["occupancy"]["comparison"])
                self.assertIn(
                    "change_percent", response.data["occupancy"]["comparison"]
                )


if __name__ == "__main__":
    import django

    django.setup()
    import unittest

    unittest.main()
