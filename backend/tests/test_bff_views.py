"""
Backend tests for BFF (Backend for Frontend) optimized views.
Tests performance, multi-tenant filtering, and aggregation logic.
Day 3-4 of Testing Suite - Django Views, API Integration, Security
"""

import time
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import ClientProfile
from apps.clubs.models import Club, Court, Schedule
from apps.reservations.models import Reservation
from apps.root.models import Organization
from utils.bff_cache import BFFCacheManager

User = get_user_model()


class TestDashboardAggregationView(APITestCase):
    """Test the optimized club analytics endpoint."""

    def setUp(self):
        """Set up test data."""
        # Clear cache before each test
        cache.clear()

        # Create test organizations
        self.org1 = Organization.objects.create(
            trade_name="Test Org 1",
            business_name="Test Organization 1 LLC",
            type="club",
            state="FL",
            email="org1@test.com",
        )
        self.org2 = Organization.objects.create(
            trade_name="Test Org 2",
            business_name="Test Organization 2 LLC",
            type="club",
            state="NY",
            email="org2@test.com",
        )

        # Create test users
        self.user1 = User.objects.create_user(
            email="user1@test.com",
            password="TEST_PASSWORD",
            first_name="Test",
            last_name="User1",
        )
        self.user2 = User.objects.create_user(
            email="user2@test.com",
            password="TEST_PASSWORD",
            first_name="Test",
            last_name="User2",
        )

        # Create organization memberships
        OrganizationMembership.objects.create(
            user=self.user1, organization=self.org1, role="admin", is_active=True
        )
        OrganizationMembership.objects.create(
            user=self.user2, organization=self.org2, role="member", is_active=True
        )

        # Create test clubs
        self.club1 = Club.objects.create(
            name="Club 1",
            organization=self.org1,
            slug="club-1",
            address="123 Main St",
            city="Miami",
            state="FL",
            phone="+1234567890",
            email="club1@test.com",
        )
        self.club2 = Club.objects.create(
            name="Club 2",
            organization=self.org2,
            slug="club-2",
            address="456 Park Ave",
            city="New York",
            state="NY",
            phone="+0987654321",
            email="club2@test.com",
        )

        # Create courts
        self.court1 = Court.objects.create(
            club=self.club1,
            name="Court 1",
            court_type="indoor",
            price_per_hour=Decimal("50.00"),
            is_active=True,
        )
        self.court2 = Court.objects.create(
            club=self.club1,
            name="Court 2",
            court_type="outdoor",
            price_per_hour=Decimal("40.00"),
            is_active=True,
        )

        # Create client profiles
        ClientProfile.objects.create(user=self.user1)
        ClientProfile.objects.create(user=self.user2)

        # Create some test reservations
        today = timezone.now().date()
        for i in range(5):
            Reservation.objects.create(
                club=self.club1,
                court=self.court1,
                date=today - timedelta(days=i),
                start_time=datetime.strptime("10:00", "%H:%M").time(),
                end_time=datetime.strptime("11:00", "%H:%M").time(),
                created_by=self.user1,
                status="confirmed",
            )

    def test_multi_tenant_filtering(self):
        """Verify organization isolation in dashboard data."""
        self.client.force_authenticate(user=self.user1)

        # User1 should only see club1 data
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["club"]["id"], str(self.club1.id))

        # User1 should not be able to access club2 data
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club2.id}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.data)

    def test_no_n_plus_one_queries(self):
        """Ensure no N+1 queries in aggregation."""
        self.client.force_authenticate(user=self.user1)

        with self.assertNumQueries(6):  # Adjust based on actual query count
            response = self.client.get(
                f"/api/v1/bi/analytics/club/?club={self.club1.id}"
            )
            self.assertEqual(response.status_code, 200)

    def test_performance_under_200ms(self):
        """Verify response time is under 200ms."""
        self.client.force_authenticate(user=self.user1)

        # Warm up
        self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")

        # Measure
        start_time = time.time()
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        end_time = time.time()

        response_time = (end_time - start_time) * 1000  # Convert to ms
        self.assertLess(response_time, 200, f"Response took {response_time}ms")
        self.assertEqual(response.status_code, 200)

    def test_cache_behavior(self):
        """Test that caching works correctly."""
        self.client.force_authenticate(user=self.user1)

        # First request - should miss cache
        with patch.object(BFFCacheManager, "get_data_only", return_value=None):
            response1 = self.client.get(
                f"/api/v1/bi/analytics/club/?club={self.club1.id}"
            )
            self.assertEqual(response1.status_code, 200)

        # Second request - should hit cache
        response2 = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response2.status_code, 200)

        # Verify data consistency
        self.assertEqual(response1.data["club"]["id"], response2.data["club"]["id"])

    def test_post_method_support(self):
        """Test that POST method works with same parameters."""
        self.client.force_authenticate(user=self.user1)

        data = {
            "club": str(self.club1.id),
            "period": "month",
            "include_revenue": True,
            "include_occupancy": True,
            "include_customers": True,
            "compare_previous": True,
        }

        response = self.client.post("/api/v1/bi/analytics/club/", data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("occupancy", response.data)
        self.assertIn("customers", response.data)
        self.assertIn("revenue", response.data)

    def test_occupancy_calculation(self):
        """Test occupancy rate calculation accuracy."""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club1.id}&period=week"
        )
        self.assertEqual(response.status_code, 200)

        occupancy_data = response.data.get("occupancy")
        self.assertIsNotNone(occupancy_data)
        self.assertIn("total_reservations", occupancy_data)
        self.assertIn("occupancy_rate", occupancy_data)
        self.assertGreaterEqual(occupancy_data["occupancy_rate"], 0)
        self.assertLessEqual(occupancy_data["occupancy_rate"], 100)

    def test_customer_metrics(self):
        """Test customer analytics accuracy."""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club1.id}&include_customers=true"
        )
        self.assertEqual(response.status_code, 200)

        customer_data = response.data.get("customers")
        self.assertIsNotNone(customer_data)
        self.assertIn("active_customers", customer_data)
        self.assertIn("new_customers", customer_data)
        self.assertGreaterEqual(customer_data["active_customers"], 0)

    def test_revenue_estimation(self):
        """Test revenue calculation based on reservations."""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club1.id}&include_revenue=true"
        )
        self.assertEqual(response.status_code, 200)

        revenue_data = response.data.get("revenue")
        self.assertIsNotNone(revenue_data)
        self.assertIn("estimated_total", revenue_data)
        self.assertGreater(revenue_data["estimated_total"], 0)

    def test_period_comparison(self):
        """Test previous period comparison functionality."""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club1.id}&compare_previous=true"
        )
        self.assertEqual(response.status_code, 200)

        # Check comparison data exists
        if "occupancy" in response.data:
            comparison = response.data["occupancy"].get("comparison")
            if comparison:
                self.assertIn("previous_rate", comparison)
                self.assertIn("change", comparison)
                self.assertIn("change_percent", comparison)

    def test_error_handling(self):
        """Test various error scenarios."""
        self.client.force_authenticate(user=self.user1)

        # No club parameter
        response = self.client.get("/api/v1/bi/analytics/club/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

        # Invalid club ID
        response = self.client.get("/api/v1/bi/analytics/club/?club=invalid-uuid")
        self.assertEqual(response.status_code, 404)

        # Unauthenticated request
        self.client.logout()
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response.status_code, 401)


class TestBulkAvailabilityCheck(APITestCase):
    """Test the optimized bulk availability check endpoint."""

    def setUp(self):
        """Set up test data."""
        cache.clear()

        # Create organization and user
        self.org = Organization.objects.create(
            trade_name="Test Org",
            business_name="Test Organization LLC",
            type="club",
            state="FL",
        )

        self.user = User.objects.create_user(
            email="user@test.com", password="TEST_PASSWORD"
        )

        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin", is_active=True
        )

        # Create club with courts
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            slug="test-club",
            opening_time=datetime.strptime("08:00", "%H:%M").time(),
            closing_time=datetime.strptime("22:00", "%H:%M").time(),
        )

        self.court1 = Court.objects.create(
            club=self.club,
            name="Court A",
            court_type="indoor",
            price_per_hour=Decimal("60.00"),
            is_active=True,
        )

        self.court2 = Court.objects.create(
            club=self.club,
            name="Court B",
            court_type="outdoor",
            price_per_hour=Decimal("45.00"),
            is_active=True,
        )

        # Create schedule
        Schedule.objects.create(
            club=self.club,
            weekday=timezone.now().weekday(),
            opening_time=datetime.strptime("09:00", "%H:%M").time(),
            closing_time=datetime.strptime("21:00", "%H:%M").time(),
            is_active=True,
        )

    def test_availability_check_performance(self):
        """Test that availability check responds under 100ms."""
        self.client.force_authenticate(user=self.user)

        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        # Warm up
        self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={tomorrow}"
        )

        # Measure
        start_time = time.time()
        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={tomorrow}"
        )
        end_time = time.time()

        response_time = (end_time - start_time) * 1000
        self.assertLess(response_time, 100, f"Response took {response_time}ms")
        self.assertEqual(response.status_code, 200)

    def test_multiple_courts_availability(self):
        """Test availability check for multiple courts."""
        self.client.force_authenticate(user=self.user)

        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/"
            f"?club={self.club.id}&date={tomorrow}"
            f"&courts[]={self.court1.id}&courts[]={self.court2.id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["courts"]), 2)

        # Verify court data
        court_ids = [court["id"] for court in response.data["courts"]]
        self.assertIn(str(self.court1.id), court_ids)
        self.assertIn(str(self.court2.id), court_ids)

    def test_slot_availability_logic(self):
        """Test that slot availability is calculated correctly."""
        self.client.force_authenticate(user=self.user)

        tomorrow = timezone.now() + timedelta(days=1)
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")

        # Create a reservation to block a slot
        Reservation.objects.create(
            club=self.club,
            court=self.court1,
            date=tomorrow.date(),
            start_time=datetime.strptime("10:00", "%H:%M").time(),
            end_time=datetime.strptime("11:00", "%H:%M").time(),
            created_by=self.user,
            status="confirmed",
        )

        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={tomorrow_str}"
        )

        self.assertEqual(response.status_code, 200)

        # Find court1 in response
        court1_data = next(
            court
            for court in response.data["courts"]
            if court["id"] == str(self.court1.id)
        )

        # Find the 10:00-11:00 slot
        blocked_slot = next(
            slot for slot in court1_data["slots"] if slot["start_time"] == "10:00"
        )

        self.assertFalse(blocked_slot["is_available"])
        self.assertEqual(blocked_slot["reason"], "reserved")

    def test_past_slots_unavailable(self):
        """Test that past time slots are marked as unavailable."""
        self.client.force_authenticate(user=self.user)

        # Use today's date
        today = timezone.now().strftime("%Y-%m-%d")

        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={today}"
        )

        self.assertEqual(response.status_code, 200)

        # Check that past slots are marked unavailable
        court_data = response.data["courts"][0]
        current_hour = timezone.now().hour

        for slot in court_data["slots"]:
            slot_hour = int(slot["start_time"].split(":")[0])
            if slot_hour < current_hour:
                self.assertFalse(slot["is_available"])
                self.assertEqual(slot["reason"], "past")

    def test_cache_key_generation(self):
        """Test that cache keys are generated correctly for different parameters."""
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        # Different court combinations should have different cache keys
        key1 = BFFCacheManager.get_availability_key(
            str(self.club.id), tomorrow, [str(self.court1.id)]
        )
        key2 = BFFCacheManager.get_availability_key(
            str(self.club.id), tomorrow, [str(self.court2.id)]
        )
        key3 = BFFCacheManager.get_availability_key(
            str(self.club.id), tomorrow, [str(self.court1.id), str(self.court2.id)]
        )

        self.assertNotEqual(key1, key2)
        self.assertNotEqual(key1, key3)
        self.assertNotEqual(key2, key3)

    def test_schedule_override(self):
        """Test that club schedule overrides default hours."""
        self.client.force_authenticate(user=self.user)

        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club.id}&date={tomorrow}"
        )

        self.assertEqual(response.status_code, 200)

        # Verify schedule times are used (09:00-21:00 instead of 08:00-22:00)
        self.assertEqual(response.data["club"]["opening_time"], "09:00")
        self.assertEqual(response.data["club"]["closing_time"], "21:00")


class TestAuthContextAggregated(APITestCase):
    """Test the aggregated auth context endpoint."""

    def setUp(self):
        """Set up test data."""
        cache.clear()

        # Create organizations
        self.org1 = Organization.objects.create(
            trade_name="Primary Org",
            business_name="Primary Organization LLC",
            type="club",
        )
        self.org2 = Organization.objects.create(
            trade_name="Secondary Org",
            business_name="Secondary Organization LLC",
            type="academy",
        )

        # Create user with organization
        self.user = User.objects.create_user(
            email="test@example.com",
            password="TEST_PASSWORD",
            first_name="John",
            last_name="Doe",
            organization=self.org1,
        )

        # Create organization memberships
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org1, role="owner", is_active=True
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org2, role="member", is_active=True
        )

        # Create clubs
        self.club1 = Club.objects.create(
            name="Main Club", organization=self.org1, slug="main-club"
        )
        self.club2 = Club.objects.create(
            name="Secondary Club", organization=self.org2, slug="secondary-club"
        )

    def test_auth_context_structure(self):
        """Test that auth context returns all required data."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

        # Check main structure
        self.assertIn("user", response.data)
        self.assertIn("current_organization", response.data)
        self.assertIn("organizations", response.data)
        self.assertIn("clubs", response.data)
        self.assertIn("permissions", response.data)
        self.assertIn("context", response.data)

        # Check user data
        user_data = response.data["user"]
        self.assertEqual(user_data["email"], self.user.email)
        self.assertEqual(user_data["first_name"], self.user.first_name)
        self.assertEqual(user_data["last_name"], self.user.last_name)

        # Check organization data
        self.assertEqual(len(response.data["organizations"]), 2)
        org_names = [org["trade_name"] for org in response.data["organizations"]]
        self.assertIn("Primary Org", org_names)
        self.assertIn("Secondary Org", org_names)

    def test_multi_org_context(self):
        """Test context data for multi-organization users."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

        context = response.data["context"]
        self.assertTrue(context["is_multi_org"])
        self.assertEqual(context["organization_count"], 2)
        self.assertEqual(context["primary_role"], "owner")

    def test_auth_context_caching(self):
        """Test that auth context is cached properly."""
        self.client.force_authenticate(user=self.user)

        # First request
        start_time = time.time()
        response1 = self.client.get("/api/v1/auth/context/")
        first_request_time = time.time() - start_time

        # Second request (should be cached)
        start_time = time.time()
        response2 = self.client.get("/api/v1/auth/context/")
        second_request_time = time.time() - start_time

        # Second request should be significantly faster
        self.assertLess(second_request_time, first_request_time / 2)

        # Data should be identical
        self.assertEqual(response1.data["user"], response2.data["user"])

    def test_cache_invalidation_endpoint(self):
        """Test the cache invalidation endpoint."""
        self.client.force_authenticate(user=self.user)

        # Cache some data first
        self.client.get("/api/v1/auth/context/")

        # Invalidate cache
        response = self.client.post("/api/v1/auth/invalidate-cache/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["user_id"], str(self.user.id))


class TestQueryOptimization(TransactionTestCase):
    """Test query optimization in BFF views."""

    def setUp(self):
        """Set up test data."""
        # Create a more complex data structure to test N+1 queries
        self.org = Organization.objects.create(
            trade_name="Large Org", business_name="Large Organization LLC"
        )

        self.user = User.objects.create_user(
            email="admin@test.com", password="TEST_PASSWORD"
        )

        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

        # Create multiple clubs with courts
        for i in range(5):
            club = Club.objects.create(
                name=f"Club {i}", organization=self.org, slug=f"club-{i}"
            )

            # Create courts for each club
            for j in range(3):
                Court.objects.create(
                    club=club,
                    name=f"Court {j}",
                    court_type="indoor",
                    price_per_hour=Decimal("50.00"),
                )

    @override_settings(DEBUG=True)
    def test_dashboard_query_count(self):
        """Test that dashboard endpoint uses optimized queries."""
        from django.db import reset_queries
        from django.test.utils import override_settings

        self.client.force_authenticate(user=self.user)

        club = Club.objects.first()

        # Reset query log
        reset_queries()

        # Make request
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={club.id}")
        self.assertEqual(response.status_code, 200)

        # Check query count (should be optimized)
        query_count = len(connection.queries)
        self.assertLess(query_count, 10, f"Too many queries executed: {query_count}")

        # Verify no N+1 queries for courts
        queries = [q["sql"] for q in connection.queries]
        court_queries = [q for q in queries if "court" in q.lower()]
        self.assertLess(len(court_queries), 3, "Possible N+1 query detected for courts")


if __name__ == "__main__":
    import django

    django.setup()
    import unittest

    unittest.main()
