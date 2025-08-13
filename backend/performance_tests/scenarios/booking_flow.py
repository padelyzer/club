"""
Performance tests for the reservation booking flow.
Tests concurrent bookings, payment processing, and edge cases.
"""

import random
import time
from datetime import datetime, timedelta
from locust import HttpUser, task, between, events
from locust.exception import RescheduleTask
import gevent
from gevent.pool import Group


class BookingFlowTest(HttpUser):
    """
    Test complete reservation flow under heavy load.
    Focuses on the most critical user journey.
    """
    
    wait_time = between(0.5, 2)
    
    # Test configuration
    test_courts = []
    test_slots = []
    popular_slots = []  # High-demand time slots
    
    def on_start(self):
        """Setup for booking tests."""
        self.login()
        self.setup_test_data()
    
    def login(self):
        """Quick login for test users."""
        user_num = random.randint(1, 100)
        response = self.client.post(
            "/api/auth/login/",
            json={
                "username": f"loadtest{user_num}",
                "password": "loadtest123"
            }
        )
        
        if response.status_code == 200:
            self.token = response.json()["access"]
            self.client.headers["Authorization"] = f"Bearer {self.token}"
        else:
            raise Exception("Login failed")
    
    def setup_test_data(self):
        """Initialize test data for realistic scenarios."""
        # Get available courts
        response = self.client.get("/api/courts/")
        if response.status_code == 200:
            self.test_courts = response.json().get("results", [])[:5]  # Use first 5 courts
        
        # Define popular time slots (peak hours)
        self.popular_slots = [
            "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
        ]
    
    @task(5)
    def test_concurrent_bookings(self):
        """
        Simulate multiple users trying to book the same slot.
        This tests race condition handling and database locks.
        """
        if not self.test_courts:
            return
        
        # Pick a popular slot in the near future
        target_date = (datetime.now() + timedelta(days=random.randint(1, 3))).strftime("%Y-%m-%d")
        target_time = random.choice(self.popular_slots)
        target_court = random.choice(self.test_courts)
        
        # Step 1: Check availability (adds load to availability queries)
        start_time = time.time()
        
        with self.client.get(
            f"/api/courts/{target_court['id']}/availability/?date={target_date}",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure("Availability check failed")
                return
            
            availability = response.json()
            available_slots = availability.get("slots", [])
            
            # Find the target slot
            target_slot = None
            for slot in available_slots:
                if slot["time"] == target_time and slot["available"]:
                    target_slot = slot
                    break
            
            if not target_slot:
                response.success()  # Slot already taken is a valid scenario
                return
        
        # Step 2: Attempt to book the slot
        booking_data = {
            "court_id": target_court["id"],
            "date": target_date,
            "start_time": target_time,
            "duration_minutes": 90,
            "payment_method": "card",
            "participants": [
                {"email": f"player{random.randint(1,4)}@test.com"}
            ]
        }
        
        with self.client.post(
            "/api/reservations/",
            json=booking_data,
            catch_response=True,
            name="/api/reservations/ [concurrent]"
        ) as response:
            response_time = time.time() - start_time
            
            if response.status_code == 201:
                response.success()
                # Track successful booking for metrics
                reservation_id = response.json()["id"]
                
                # Immediately process payment to complete flow
                self.process_payment_under_load(reservation_id)
                
            elif response.status_code == 409:
                # Conflict - slot was taken by another user
                response.success()  # This is expected behavior
            else:
                response.failure(f"Unexpected status: {response.status_code}")
        
        # Log performance metrics
        if response_time > 2.0:  # Alert if booking takes > 2 seconds
            print(f"SLOW BOOKING: {response_time:.2f}s")
    
    @task(3)
    def test_payment_processing_load(self):
        """
        Test Stripe payment processing under load.
        Simulates webhook handling and payment confirmations.
        """
        # Create a reservation first
        court = random.choice(self.test_courts) if self.test_courts else None
        if not court:
            return
        
        date = (datetime.now() + timedelta(days=random.randint(7, 14))).strftime("%Y-%m-%d")
        
        # Book a less popular slot for payment testing
        booking_data = {
            "court_id": court["id"],
            "date": date,
            "start_time": f"{random.randint(10, 16)}:00",
            "duration_minutes": 90,
            "payment_method": "card"
        }
        
        response = self.client.post("/api/reservations/", json=booking_data)
        
        if response.status_code == 201:
            reservation_id = response.json()["id"]
            
            # Simulate payment processing
            payment_start = time.time()
            
            with self.client.post(
                "/api/payments/process/",
                json={
                    "reservation_id": reservation_id,
                    "payment_method_id": "pm_card_visa",
                    "save_payment_method": random.choice([True, False])
                },
                catch_response=True,
                name="/api/payments/process/ [load test]"
            ) as payment_response:
                payment_time = time.time() - payment_start
                
                if payment_response.status_code == 200:
                    payment_response.success()
                    
                    # Simulate webhook arrival (async)
                    if random.random() < 0.3:  # 30% of payments
                        self.simulate_stripe_webhook(reservation_id)
                else:
                    payment_response.failure(f"Payment failed: {payment_response.status_code}")
                
                # Alert on slow payments
                if payment_time > 3.0:
                    print(f"SLOW PAYMENT: {payment_time:.2f}s")
    
    @task(2)
    def test_availability_caching(self):
        """
        Test court availability endpoint performance.
        This endpoint is called very frequently and must be fast.
        """
        # Test different date ranges
        date_options = [
            datetime.now(),  # Today
            datetime.now() + timedelta(days=1),  # Tomorrow
            datetime.now() + timedelta(days=7),  # Next week
            datetime.now() + timedelta(days=30),  # Next month
        ]
        
        target_date = random.choice(date_options).strftime("%Y-%m-%d")
        
        # Test with different filters
        filters = [
            "",  # No filter
            "?surface=hard",
            "?surface=clay",
            "?min_duration=60",
            "?max_price=30",
        ]
        
        filter_param = random.choice(filters)
        
        start_time = time.time()
        
        with self.client.get(
            f"/api/courts/availability/?date={target_date}{filter_param}",
            catch_response=True,
            name="/api/courts/availability/ [filtered]"
        ) as response:
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            if response.status_code == 200:
                response.success()
                
                # Check response time against SLA
                if response_time > 200:  # 200ms SLA
                    print(f"AVAILABILITY SLA BREACH: {response_time:.0f}ms")
                    
                # Verify response structure
                data = response.json()
                if "courts" not in data or "date" not in data:
                    response.failure("Invalid response structure")
            else:
                response.failure(f"Availability request failed: {response.status_code}")
    
    @task(1)
    def test_complex_recurring_booking(self):
        """
        Test recurring reservation creation.
        This is a complex operation that creates multiple bookings.
        """
        if not self.test_courts:
            return
        
        court = random.choice(self.test_courts)
        
        # Create a recurring booking for next 4 weeks
        recurring_data = {
            "court_id": court["id"],
            "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": f"{random.randint(16, 20)}:00",
            "duration_minutes": 90,
            "recurrence": {
                "frequency": "weekly",
                "days": ["monday", "wednesday"],
                "occurrences": 8
            },
            "payment_method": "subscription"
        }
        
        with self.client.post(
            "/api/reservations/recurring/",
            json=recurring_data,
            catch_response=True,
            timeout=10  # Longer timeout for complex operation
        ) as response:
            if response.status_code == 201:
                response.success()
                
                # Verify all bookings were created
                booking_ids = response.json().get("reservation_ids", [])
                if len(booking_ids) != 8:
                    response.failure(f"Expected 8 bookings, got {len(booking_ids)}")
            else:
                response.failure(f"Recurring booking failed: {response.status_code}")
    
    def process_payment_under_load(self, reservation_id):
        """Process payment with realistic delays and retries."""
        # Simulate network delay
        gevent.sleep(random.uniform(0.1, 0.5))
        
        # Payment processing
        response = self.client.post(
            "/api/payments/process/",
            json={
                "reservation_id": reservation_id,
                "payment_method_id": f"pm_test_{random.randint(1000, 9999)}"
            }
        )
        
        if response.status_code != 200 and random.random() < 0.3:
            # 30% retry rate on failure
            gevent.sleep(1)
            self.client.post(
                "/api/payments/process/",
                json={
                    "reservation_id": reservation_id,
                    "payment_method_id": "pm_card_visa",
                    "retry": True
                }
            )
    
    def simulate_stripe_webhook(self, reservation_id):
        """Simulate incoming Stripe webhook."""
        webhook_data = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": f"pi_test_{reservation_id}",
                    "amount": 2500,
                    "currency": "eur",
                    "metadata": {
                        "reservation_id": reservation_id
                    }
                }
            }
        }
        
        # Webhooks come from Stripe, not authenticated
        headers = {
            "Stripe-Signature": "test_signature",
            "Content-Type": "application/json"
        }
        
        # Remove auth header for webhook
        auth_header = self.client.headers.pop("Authorization", None)
        
        self.client.post(
            "/api/webhooks/stripe/",
            json=webhook_data,
            headers=headers,
            name="/api/webhooks/stripe/ [simulated]"
        )
        
        # Restore auth header
        if auth_header:
            self.client.headers["Authorization"] = auth_header


class StressTestBooking(HttpUser):
    """
    Stress test for absolute peak load on booking system.
    Simulates flash sale or tournament registration opening.
    """
    
    wait_time = between(0.1, 0.5)  # Very aggressive
    
    def on_start(self):
        """Minimal setup for stress testing."""
        # Pre-authenticated tokens for speed
        self.token = f"stress_test_token_{random.randint(1, 1000)}"
        self.client.headers["Authorization"] = f"Bearer {self.token}"
    
    @task
    def hammer_popular_slot(self):
        """
        Everyone tries to book the same premium slot.
        Tests system behavior under extreme contention.
        """
        # Fixed target - everyone wants Friday 7pm on Court 1
        target_date = self._next_friday()
        
        booking_data = {
            "court_id": "court_1_premium",
            "date": target_date,
            "start_time": "19:00",
            "duration_minutes": 90,
            "express_checkout": True  # Skip payment for stress test
        }
        
        start_time = time.time()
        
        response = self.client.post(
            "/api/reservations/express/",
            json=booking_data,
            catch_response=True
        )
        
        response_time = time.time() - start_time
        
        # Track response codes for analysis
        if response.status_code == 201:
            print(f"SUCCESS: Booked in {response_time:.2f}s")
        elif response.status_code == 409:
            # Expected under contention
            pass
        else:
            print(f"ERROR {response.status_code}: {response_time:.2f}s")
    
    def _next_friday(self):
        """Get next Friday's date."""
        today = datetime.now()
        days_ahead = 4 - today.weekday()  # Friday is 4
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")