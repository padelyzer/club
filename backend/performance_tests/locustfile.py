"""
Main Locust file for Padelyzer load testing.
Simulates realistic user behavior patterns for performance testing.
"""

import random
import json
from datetime import datetime, timedelta
from locust import HttpUser, task, between, events
from locust.exception import RescheduleTask

# Test data storage
test_users = []
test_courts = []
test_clubs = []
auth_tokens = {}


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Set up test data before load test starts."""
    print("Setting up test data...")
    # This would normally load from fixtures or create test data
    # For now, we'll use predefined test accounts


class PadelyzerUser(HttpUser):
    """
    Simulates a typical Padelyzer user behavior.
    Weighted tasks represent realistic usage patterns.
    """
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Called when a simulated user starts."""
        self.login()
        
    def login(self):
        """Authenticate and store token."""
        # Use test user credentials
        test_user_index = random.randint(0, 9)  # Assume 10 test users
        username = f"testuser{test_user_index}"
        password = "testpass123"
        
        response = self.client.post(
            "/api/auth/login/",
            json={
                "username": username,
                "password": password
            },
            catch_response=True
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
            response.success()
        else:
            response.failure(f"Login failed: {response.status_code}")
            raise RescheduleTask()
    
    @task(5)
    def check_court_availability(self):
        """Most common task - checking court availability."""
        # Random date within next 7 days
        days_ahead = random.randint(1, 7)
        date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        
        with self.client.get(
            f"/api/courts/availability/?date={date}",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Availability check failed: {response.status_code}")
    
    @task(3)
    def view_dashboard(self):
        """View dashboard with stats."""
        with self.client.get(
            "/api/dashboard/stats/",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Dashboard failed: {response.status_code}")
    
    @task(2)
    def make_reservation(self):
        """Complete reservation flow."""
        # Step 1: Get available courts
        date = (datetime.now() + timedelta(days=random.randint(1, 7))).strftime("%Y-%m-%d")
        
        with self.client.get(
            f"/api/courts/availability/?date={date}",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure("Could not get available courts")
                return
            
            available_slots = response.json().get("available_slots", [])
            if not available_slots:
                response.success()  # No slots available is valid
                return
        
        # Step 2: Select a random available slot
        slot = random.choice(available_slots)
        
        # Step 3: Create reservation
        reservation_data = {
            "court_id": slot["court_id"],
            "date": date,
            "time_slot_id": slot["time_slot_id"],
            "duration_minutes": 90,
            "payment_method": "card"
        }
        
        with self.client.post(
            "/api/reservations/",
            json=reservation_data,
            catch_response=True
        ) as response:
            if response.status_code == 201:
                response.success()
                reservation_id = response.json().get("id")
                
                # Step 4: Simulate payment (if required)
                if response.json().get("requires_payment"):
                    self.process_payment(reservation_id)
            else:
                response.failure(f"Reservation failed: {response.status_code}")
    
    @task(2)
    def view_my_reservations(self):
        """View user's reservations."""
        with self.client.get(
            "/api/reservations/my-reservations/",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"My reservations failed: {response.status_code}")
    
    @task(1)
    def search_clubs(self):
        """Search for clubs."""
        search_terms = ["padel", "tennis", "sport", "club"]
        query = random.choice(search_terms)
        
        with self.client.get(
            f"/api/clubs/?search={query}",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Club search failed: {response.status_code}")
    
    @task(1)
    def view_tournament_list(self):
        """View active tournaments."""
        with self.client.get(
            "/api/tournaments/?status=registration_open",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Tournament list failed: {response.status_code}")
    
    def process_payment(self, reservation_id):
        """Simulate payment processing."""
        payment_data = {
            "reservation_id": reservation_id,
            "payment_method_id": "pm_card_visa",  # Test Stripe payment method
            "amount": 2500  # €25.00
        }
        
        with self.client.post(
            "/api/payments/process/",
            json=payment_data,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Payment failed: {response.status_code}")


class MobileUser(HttpUser):
    """
    Simulates mobile app user behavior with different patterns.
    Mobile users check availability more frequently but book less.
    """
    
    wait_time = between(0.5, 2)  # Mobile users are faster
    
    def on_start(self):
        """Mobile users use token auth."""
        self.login()
        self.client.headers.update({
            "User-Agent": "Padelyzer-Mobile/1.0 (iOS 14.0)"
        })
    
    def login(self):
        """Mobile login flow."""
        response = self.client.post(
            "/api/auth/mobile-login/",
            json={
                "username": f"mobileuser{random.randint(0, 9)}",
                "password": "testpass123",
                "device_id": f"device_{random.randint(1000, 9999)}"
            }
        )
        
        if response.status_code == 200:
            self.token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
    
    @task(10)
    def quick_availability_check(self):
        """Mobile users frequently check availability."""
        date = datetime.now().strftime("%Y-%m-%d")
        
        self.client.get(
            f"/api/courts/quick-availability/?date={date}",
            name="/api/courts/quick-availability/"
        )
    
    @task(3)
    def view_nearby_clubs(self):
        """Check nearby clubs based on location."""
        # Simulate different locations
        lat = 40.4168 + random.uniform(-0.1, 0.1)  # Madrid area
        lon = -3.7038 + random.uniform(-0.1, 0.1)
        
        self.client.get(
            f"/api/clubs/nearby/?lat={lat}&lon={lon}&radius=5000",
            name="/api/clubs/nearby/"
        )
    
    @task(2)
    def push_notification_check(self):
        """Check for push notifications."""
        self.client.get("/api/notifications/unread/")
    
    @task(1)
    def make_quick_booking(self):
        """Simplified mobile booking flow."""
        # Mobile users often book recurring slots
        booking_data = {
            "court_id": random.choice(["court1", "court2", "court3"]),
            "quick_book": True,
            "recurring": random.choice([True, False])
        }
        
        self.client.post(
            "/api/reservations/quick-book/",
            json=booking_data
        )


class AdminUser(HttpUser):
    """
    Simulates club admin behavior - less frequent but heavier operations.
    """
    
    wait_time = between(5, 10)  # Admins spend more time on each task
    weight = 1  # Much fewer admin users
    
    def on_start(self):
        """Admin authentication."""
        self.login_as_admin()
    
    def login_as_admin(self):
        """Admin login with different permissions."""
        response = self.client.post(
            "/api/auth/login/",
            json={
                "username": "admin@testclub.com",
                "password": "adminpass123"
            }
        )
        
        if response.status_code == 200:
            self.token = response.json().get("access")
            self.client.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
    
    @task(5)
    def view_analytics_dashboard(self):
        """View complex analytics dashboard."""
        # This is typically a heavy operation
        self.client.get("/api/analytics/dashboard/")
    
    @task(3)
    def manage_court_schedules(self):
        """Update court schedules."""
        court_id = random.choice(["court1", "court2", "court3"])
        
        # Get current schedule
        self.client.get(f"/api/courts/{court_id}/schedule/")
        
        # Occasionally update schedule
        if random.random() < 0.2:  # 20% chance
            schedule_data = {
                "court_id": court_id,
                "availability": [
                    {"day": "monday", "start": "09:00", "end": "22:00"},
                    {"day": "tuesday", "start": "09:00", "end": "22:00"}
                ]
            }
            self.client.put(
                f"/api/courts/{court_id}/schedule/",
                json=schedule_data
            )
    
    @task(2)
    def export_reports(self):
        """Export various reports - heavy operation."""
        report_types = ["reservations", "revenue", "occupancy", "members"]
        report_type = random.choice(report_types)
        
        # Reports for last 30 days
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        self.client.get(
            f"/api/reports/export/?type={report_type}&start={start_date}&end={end_date}",
            name="/api/reports/export/"
        )
    
    @task(1)
    def manage_tournaments(self):
        """Tournament management operations."""
        # List tournaments
        response = self.client.get("/api/tournaments/managed/")
        
        if response.status_code == 200:
            tournaments = response.json().get("results", [])
            if tournaments:
                # View detailed tournament data
                tournament_id = random.choice(tournaments)["id"]
                self.client.get(f"/api/tournaments/{tournament_id}/details/")
                
                # Occasionally update bracket
                if random.random() < 0.1:  # 10% chance
                    self.client.post(
                        f"/api/tournaments/{tournament_id}/update-bracket/"
                    )


# Weighted user class selection
# 70% regular users, 25% mobile users, 5% admin users
user_classes = [PadelyzerUser] * 70 + [MobileUser] * 25 + [AdminUser] * 5


class MixedUserScenario(HttpUser):
    """
    Randomly selects user type to simulate realistic mixed traffic.
    """
    tasks = {cls: 1 for cls in user_classes}
    wait_time = between(1, 5)