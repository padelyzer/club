"""
Tests for Court endpoints - EMERGENCY RECOVERY VERSION.
"""

from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clubs.models import Club, Court, Schedule
from apps.root.models import Organization

User = get_user_model()


class CourtEndpointsTest(APITestCase):
    """Test all Court API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            business_name="Test Organization",
            trade_name="Test Org",
            rfc="XAXX010101000",
            primary_email="test@org.com",
            primary_phone="+1234567890",
        )

        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

        # Create membership to organization
        from apps.authentication.models import OrganizationMembership

        OrganizationMembership.objects.create(
            user=self.user, organization=self.organization, role="manager"
        )
        self.user.current_organization_id = self.organization.id
        self.user.save()

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            address={"street": "Test Street", "city": "Test City"},
            phone="+1234567890",
            email="test@club.com",
        )

        self.court = Court.objects.create(
            club=self.club,
            organization=self.organization,
            name="Court 1",
            number=1,
            surface_type="glass",
            price_per_hour=50.00,
        )

        # Create schedules for the club
        for weekday in range(7):
            Schedule.objects.create(
                club=self.club,
                organization=self.organization,
                weekday=weekday,
                opening_time="08:00",
                closing_time="22:00",
                is_closed=False,
            )

        self.client.force_authenticate(user=self.user)

    def test_availability_endpoint(self):
        """Test /courts/{id}/availability/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/availability/"

        # Test without parameters (defaults to today)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("court_id", response.data)
        self.assertIn("availability", response.data)
        self.assertEqual(len(response.data["availability"]), 1)  # 1 day by default

        # Test with specific date and days
        tomorrow = (timezone.now().date() + timedelta(days=1)).isoformat()
        response = self.client.get(url, {"date": tomorrow, "days": 3})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["availability"]), 3)

        # Verify time slots structure
        day_availability = response.data["availability"][0]
        self.assertIn("date", day_availability)
        self.assertIn("time_slots", day_availability)

        if day_availability["time_slots"]:
            slot = day_availability["time_slots"][0]
            self.assertIn("start_time", slot)
            self.assertIn("end_time", slot)
            self.assertIn("is_available", slot)
            self.assertIn("price", slot)

    def test_weekly_availability_endpoint(self):
        """Test /courts/{id}/weekly-availability/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/weekly-availability/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("weekly_pattern", response.data)

        # Check all days are present
        days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
        for day in days:
            self.assertIn(day, response.data["weekly_pattern"])
            day_data = response.data["weekly_pattern"][day]
            self.assertIn("is_closed", day_data)
            self.assertIn("opening_time", day_data)
            self.assertIn("closing_time", day_data)
            self.assertIn("typical_occupancy", day_data)

    def test_pricing_endpoint_get(self):
        """Test GET /courts/{id}/pricing/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/pricing/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("default_price_per_hour", response.data)
        self.assertEqual(response.data["default_price_per_hour"], "50.00")
        self.assertEqual(response.data["currency"], "MXN")

    def test_pricing_endpoint_post(self):
        """Test POST /courts/{id}/pricing/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/pricing/"

        response = self.client.post(url, {"price_per_hour": 75.50})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["price_per_hour"], "75.5")

        # Verify price was updated
        self.court.refresh_from_db()
        self.assertEqual(float(self.court.price_per_hour), 75.50)

    def test_occupancy_endpoint(self):
        """Test /courts/{id}/occupancy/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/occupancy/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response structure
        self.assertIn("period", response.data)
        self.assertIn("summary", response.data)
        self.assertIn("daily_breakdown", response.data)

        # Check summary fields
        summary = response.data["summary"]
        self.assertIn("total_available_hours", summary)
        self.assertIn("total_occupied_hours", summary)
        self.assertIn("occupancy_rate", summary)
        self.assertIn("total_reservations", summary)
        self.assertIn("total_revenue", summary)

        # Test with custom days parameter
        response = self.client.get(url, {"days": 7})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["period"]["days"], 7)

    def test_bulk_availability_endpoint(self):
        """Test /courts/{id}/bulk-availability/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/bulk-availability/"

        tomorrow = (timezone.now().date() + timedelta(days=1)).isoformat()
        slots = [
            {
                "date": tomorrow,
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "is_available": False,
            }
        ]

        response = self.client.post(url, {"slots": slots}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("updated_slots", response.data)
        self.assertIn("errors", response.data)

    def test_maintenance_endpoint_get(self):
        """Test GET /courts/{id}/maintenance/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/maintenance/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("current_status", response.data)
        self.assertIn("maintenance_history", response.data)
        self.assertIn("scheduled_maintenance", response.data)

    def test_maintenance_endpoint_post(self):
        """Test POST /courts/{id}/maintenance/ endpoint."""
        url = f"/api/v1/clubs/courts/{self.court.id}/maintenance/"

        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        maintenance_data = {
            "type": "cleaning",
            "scheduled_date": tomorrow,
            "duration_hours": 2,
            "notes": "Regular cleaning",
        }

        response = self.client.post(url, maintenance_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("maintenance_scheduled", response.data)

        # Verify court is marked for maintenance
        self.court.refresh_from_db()
        self.assertTrue(self.court.is_maintenance)

    def test_endpoints_require_authentication(self):
        """Test that all endpoints require authentication."""
        self.client.force_authenticate(user=None)

        endpoints = [
            f"/api/v1/clubs/courts/{self.court.id}/availability/",
            f"/api/v1/clubs/courts/{self.court.id}/weekly-availability/",
            f"/api/v1/clubs/courts/{self.court.id}/pricing/",
            f"/api/v1/clubs/courts/{self.court.id}/occupancy/",
            f"/api/v1/clubs/courts/{self.court.id}/bulk-availability/",
            f"/api/v1/clubs/courts/{self.court.id}/maintenance/",
        ]

        for url in endpoints:
            response = self.client.get(url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Endpoint {url} should require authentication",
            )
