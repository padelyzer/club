"""
Stress Testing Scenarios for Padelyzer
Advanced load testing patterns and edge case scenarios
Day 7 of Testing Suite - Stress Testing Implementation
"""

import json
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List
import threading
from concurrent.futures import ThreadPoolExecutor

from locust import HttpUser, task, between, events, tag
from locust.contrib.fasthttp import FastHttpUser
import requests


class DatabaseStressUser(FastHttpUser):
    """
    User that creates database stress through complex queries.
    Tests database performance under load.
    """
    
    wait_time = between(0.1, 0.5)
    weight = 2
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        
    def on_start(self):
        """Authenticate for database stress testing."""
        login_data = {
            "email": f"dbstress_{random.randint(1, 1000)}@test.com",
            "password": "testpass123"
        }
        
        # Quick registration and login
        self.client.post("/api/v1/auth/register/", json={
            **login_data,
            "first_name": "DB",
            "last_name": "Stress"
        })
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.auth_token}"
            })

    @task(5)
    @tag('database')
    def complex_analytics_query(self):
        """Execute complex analytics queries that stress the database."""
        query_params = {
            "club": "test-club-id",
            "period": random.choice(["week", "month", "quarter", "year"]),
            "compare_previous": "true",
            "include_revenue": "true",
            "include_occupancy": "true",
            "include_customers": "true"
        }
        
        with self.client.get(
            "/api/v1/bi/analytics/club/",
            params=query_params,
            catch_response=True,
            name="DB Stress: Complex Analytics"
        ) as response:
            if response.status_code != 200:
                response.failure(f"Complex analytics failed: {response.status_code}")

    @task(8)
    @tag('database')
    def bulk_availability_stress(self):
        """Stress test bulk availability queries."""
        # Request availability for multiple dates and courts
        dates = []
        for i in range(7):  # Week's worth of data
            date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            dates.append(date)
        
        for date in dates:
            with self.client.get(
                f"/api/v1/reservations/availability/bulk/?club=test-club&date={date}",
                catch_response=True,
                name="DB Stress: Bulk Availability"
            ) as response:
                if response.status_code not in [200, 404]:
                    response.failure(f"Bulk availability stress failed: {response.status_code}")

    @task(3)
    @tag('database')
    def concurrent_booking_attempts(self):
        """Create concurrent booking conflicts to test database locking."""
        # All users try to book the same popular slot
        popular_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        reservation_data = {
            "club": "test-club-id",
            "court": "popular-court-id",
            "date": popular_date,
            "start_time": "18:00",  # Popular evening slot
            "end_time": "19:00",
            "status": "confirmed"
        }
        
        with self.client.post(
            "/api/v1/reservations/",
            json=reservation_data,
            catch_response=True,
            name="DB Stress: Concurrent Booking"
        ) as response:
            # Both success (201) and conflict (409) are acceptable
            if response.status_code not in [201, 409, 400]:
                response.failure(f"Concurrent booking test failed: {response.status_code}")

    @task(2)
    @tag('database')
    def deep_pagination_test(self):
        """Test deep pagination that can cause performance issues."""
        # Request deep pages of reservations
        page = random.randint(50, 200)  # Deep pagination
        
        with self.client.get(
            f"/api/v1/reservations/?page={page}&page_size=50",
            catch_response=True,
            name="DB Stress: Deep Pagination"
        ) as response:
            if response.status_code not in [200, 404]:
                response.failure(f"Deep pagination failed: {response.status_code}")


class CacheStressUser(FastHttpUser):
    """
    User that tests cache performance and invalidation.
    """
    
    wait_time = between(0.1, 1)
    weight = 3
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.club_id = f"cache-test-{random.randint(1, 10)}"
        
    def on_start(self):
        """Setup for cache stress testing."""
        login_data = {
            "email": f"cache_{random.randint(1, 1000)}@test.com",
            "password": "testpass123"
        }
        
        self.client.post("/api/v1/auth/register/", json={
            **login_data,
            "first_name": "Cache",
            "last_name": "Test"
        })
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.auth_token}"
            })

    @task(10)
    @tag('cache')
    def rapid_dashboard_requests(self):
        """Rapidly request same dashboard data to test cache hits."""
        with self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club_id}",
            catch_response=True,
            name="Cache: Rapid Dashboard"
        ) as response:
            if response.status_code not in [200, 404]:
                response.failure(f"Cache dashboard test failed: {response.status_code}")

    @task(8)
    @tag('cache')
    def cache_invalidation_pattern(self):
        """Pattern that should invalidate cache."""
        # Request data
        self.client.get(f"/api/v1/bi/analytics/club/?club={self.club_id}")
        
        # Make change that should invalidate cache
        reservation_data = {
            "club": self.club_id,
            "court": "cache-test-court",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "start_time": f"{random.randint(9, 21)}:00",
            "end_time": f"{random.randint(10, 22)}:00",
            "status": "confirmed"
        }
        
        with self.client.post(
            "/api/v1/reservations/",
            json=reservation_data,
            catch_response=True,
            name="Cache: Invalidation Trigger"
        ) as response:
            if response.status_code not in [201, 409, 400]:
                response.failure(f"Cache invalidation test failed: {response.status_code}")
        
        # Request data again (should be fresh)
        with self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club_id}",
            catch_response=True,
            name="Cache: Post-Invalidation"
        ) as response:
            if response.status_code not in [200, 404]:
                response.failure(f"Post-invalidation request failed: {response.status_code}")

    @task(5)
    @tag('cache')
    def auth_context_caching(self):
        """Test auth context caching."""
        with self.client.get(
            "/api/v1/auth/context/",
            catch_response=True,
            name="Cache: Auth Context"
        ) as response:
            if response.status_code != 200:
                response.failure(f"Auth context cache test failed: {response.status_code}")


class MemoryLeakUser(FastHttpUser):
    """
    User designed to detect memory leaks and resource issues.
    """
    
    wait_time = between(0.05, 0.2)  # Very aggressive
    weight = 1
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.request_count = 0
        
    def on_start(self):
        """Setup for memory leak testing."""
        login_data = {
            "email": f"memory_{random.randint(1, 100)}@test.com",
            "password": "testpass123"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.auth_token}"
            })

    @task(15)
    @tag('memory')
    def memory_intensive_requests(self):
        """Make requests that could cause memory leaks."""
        self.request_count += 1
        
        # Large dataset requests
        with self.client.get(
            "/api/v1/reservations/?page_size=1000",
            catch_response=True,
            name="Memory: Large Dataset"
        ) as response:
            if response.status_code not in [200, 404]:
                response.failure(f"Memory test failed: {response.status_code}")
        
        # Complex aggregation
        with self.client.get(
            "/api/v1/bi/analytics/club/?club=memory-test&period=year&compare_previous=true",
            catch_response=True,
            name="Memory: Complex Aggregation"
        ) as response:
            if response.status_code not in [200, 404]:
                response.failure(f"Memory aggregation failed: {response.status_code}")

    @task(10)
    @tag('memory')
    def rapid_context_switching(self):
        """Rapidly switch contexts to test cleanup."""
        contexts = ["club1", "club2", "club3", "club4"]
        
        for club in contexts:
            with self.client.get(
                f"/api/v1/bi/analytics/club/?club={club}",
                catch_response=True,
                name="Memory: Context Switch"
            ) as response:
                if response.status_code not in [200, 404]:
                    response.failure(f"Context switch failed: {response.status_code}")


class SecurityStressUser(FastHttpUser):
    """
    User that tests security boundaries under load.
    """
    
    wait_time = between(0.5, 2)
    weight = 1
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        
    def on_start(self):
        """Setup for security stress testing."""
        login_data = {
            "email": f"security_{random.randint(1, 100)}@test.com",
            "password": "testpass123"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.auth_token}"
            })

    @task(5)
    @tag('security')
    def cross_tenant_access_attempts(self):
        """Attempt to access other tenants' data."""
        # Try accessing random organization data
        fake_org_ids = [f"fake-org-{i}" for i in range(1, 20)]
        
        for org_id in random.sample(fake_org_ids, 3):
            with self.client.get(
                f"/api/v1/bi/analytics/club/?club={org_id}",
                catch_response=True,
                name="Security: Cross-Tenant Access"
            ) as response:
                # Should be 403/404, not 200
                if response.status_code == 200:
                    response.failure("Security breach: Accessed other tenant data")
                elif response.status_code in [403, 404]:
                    response.success()  # This is expected

    @task(3)
    @tag('security')
    def malformed_request_handling(self):
        """Test handling of malformed requests."""
        malformed_payloads = [
            {"invalid": "json", "structure": {"nested": True}},
            {"extremely_long_field": "x" * 10000},
            {"null_injection": None},
            {"array_injection": ["item1", "item2", {"nested": "object"}]}
        ]
        
        for payload in malformed_payloads:
            with self.client.post(
                "/api/v1/reservations/",
                json=payload,
                catch_response=True,
                name="Security: Malformed Request"
            ) as response:
                # Should handle gracefully (400 error, not 500)
                if response.status_code >= 500:
                    response.failure(f"Server error on malformed request: {response.status_code}")
                else:
                    response.success()

    @task(2)
    @tag('security')
    def token_expiry_handling(self):
        """Test behavior with expired/invalid tokens."""
        # Use invalid token
        old_token = self.auth_token
        self.client.headers.update({
            "Authorization": "Bearer invalid-token-12345"
        })
        
        with self.client.get(
            "/api/v1/auth/context/",
            catch_response=True,
            name="Security: Invalid Token"
        ) as response:
            if response.status_code != 401:
                response.failure(f"Invalid token not rejected: {response.status_code}")
            else:
                response.success()
        
        # Restore valid token
        self.client.headers.update({
            "Authorization": f"Bearer {old_token}"
        })


class NetworkFluctuationUser(FastHttpUser):
    """
    Simulates network fluctuations and timeouts.
    """
    
    wait_time = between(1, 5)
    weight = 2
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        # Simulate varying connection speeds
        self.connection_timeout = random.uniform(5, 30)
        
    def on_start(self):
        """Setup with network simulation."""
        login_data = {
            "email": f"network_{random.randint(1, 100)}@test.com",
            "password": "testpass123"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.auth_token}"
            })

    @task(5)
    @tag('network')
    def slow_connection_simulation(self):
        """Simulate slow network connections."""
        # Add artificial delay
        time.sleep(random.uniform(0.5, 2.0))
        
        with self.client.get(
            "/api/v1/bi/analytics/club/?club=network-test",
            catch_response=True,
            name="Network: Slow Connection",
            timeout=self.connection_timeout
        ) as response:
            if response.status_code not in [200, 404, 408]:  # 408 = timeout
                response.failure(f"Slow connection test failed: {response.status_code}")

    @task(3)
    @tag('network')
    def interrupted_request_simulation(self):
        """Simulate interrupted requests."""
        try:
            # Use very short timeout to simulate interruption
            with self.client.get(
                "/api/v1/reservations/availability/bulk/?club=network-test&date=2024-01-01",
                catch_response=True,
                name="Network: Interrupted Request",
                timeout=0.1  # Very short timeout
            ) as response:
                # Any response is acceptable for network simulation
                response.success()
        except Exception:
            # Timeout/interruption is expected and acceptable
            pass


# Specialized scenario runners
@events.test_start.add_listener
def on_stress_test_start(environment, **kwargs):
    """Initialize stress test monitoring."""
    print("🔥 Starting Stress Testing Scenarios")
    print("Testing: Database, Cache, Memory, Security, Network")

@events.test_stop.add_listener
def on_stress_test_stop(environment, **kwargs):
    """Stress test completion analysis."""
    print("🏁 Stress Testing Complete")
    
    if hasattr(environment.runner, 'stats'):
        stats = environment.runner.stats
        
        # Analyze stress test results
        high_error_endpoints = []
        slow_endpoints = []
        
        for endpoint, stat in stats.entries.items():
            if stat.num_failures > 0:
                failure_rate = (stat.num_failures / stat.num_requests) * 100
                if failure_rate > 10:  # More than 10% failure rate
                    high_error_endpoints.append((endpoint, failure_rate))
            
            if stat.avg_response_time > 2000:  # Slower than 2 seconds
                slow_endpoints.append((endpoint, stat.avg_response_time))
        
        if high_error_endpoints:
            print("⚠️  High Error Rate Endpoints:")
            for endpoint, rate in high_error_endpoints:
                print(f"  - {endpoint}: {rate:.1f}% failures")
        
        if slow_endpoints:
            print("🐌 Slow Response Endpoints:")
            for endpoint, time_ms in slow_endpoints:
                print(f"  - {endpoint}: {time_ms:.0f}ms average")
                
        print(f"📊 Overall Stats:")
        print(f"  - Total Requests: {stats.total.num_requests}")
        print(f"  - Success Rate: {((stats.total.num_requests - stats.total.num_failures) / stats.total.num_requests * 100):.1f}%")
        print(f"  - Average Response: {stats.total.avg_response_time:.0f}ms")
        print(f"  - 95th Percentile: {stats.total.get_response_time_percentile(0.95):.0f}ms")