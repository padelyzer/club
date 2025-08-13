"""
Tests for Court model unification - EMERGENCY RECOVERY VERSION.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clubs.models import Club, Court
from apps.clubs.serializers import CourtSerializer
from apps.root.models import Organization

User = get_user_model()


class CourtModelUnificationTest(TestCase):
    """Test Court model matches TypeScript interface."""

    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            business_name="Test Organization",
            trade_name="Test Org",
            rfc="XAXX010101000",
            primary_email="test@org.com",
            primary_phone="+1234567890",
        )

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            address={"street": "Test Street", "city": "Test City"},
            phone="+1234567890",
            email="test@club.com",
        )

    def test_court_model_fields(self):
        """Test Court model has all required fields."""
        court = Court.objects.create(
            club=self.club,
            organization=self.organization,
            name="Court 1",
            number=1,
            surface_type="glass",
            has_lighting=True,
            has_heating=False,
            has_roof=False,
            is_maintenance=False,
            maintenance_notes="",
            price_per_hour=50.00,
        )

        # Verify all fields exist
        self.assertEqual(court.club, self.club)
        self.assertEqual(court.organization, self.organization)
        self.assertEqual(court.name, "Court 1")
        self.assertEqual(court.number, 1)
        self.assertEqual(court.surface_type, "glass")
        self.assertTrue(court.has_lighting)
        self.assertFalse(court.has_heating)
        self.assertFalse(court.has_roof)
        self.assertFalse(court.is_maintenance)
        self.assertEqual(court.maintenance_notes, "")
        self.assertEqual(float(court.price_per_hour), 50.00)
        self.assertTrue(court.is_active)  # From BaseModel
        self.assertIsNotNone(court.created_at)
        self.assertIsNotNone(court.updated_at)

    def test_court_serializer_output(self):
        """Test CourtSerializer matches TypeScript interface."""
        court = Court.objects.create(
            club=self.club,
            organization=self.organization,
            name="Court 1",
            number=1,
            surface_type="glass",
            price_per_hour=50.00,
        )

        serializer = CourtSerializer(court)
        data = serializer.data

        # Check all fields from TypeScript interface
        required_fields = [
            "id",
            "club",
            "club_name",
            "organization",
            "name",
            "number",
            "surface_type",
            "surface_type_display",
            "has_lighting",
            "has_heating",
            "has_roof",
            "is_maintenance",
            "maintenance_notes",
            "price_per_hour",
            "is_active",
            "created_at",
            "updated_at",
        ]

        for field in required_fields:
            self.assertIn(
                field, data, f"Field '{field}' missing from serializer output"
            )

        # Verify field types
        self.assertIsInstance(data["id"], int)
        self.assertIsInstance(data["club"], int)
        self.assertIsInstance(data["club_name"], str)
        self.assertIsInstance(data["organization"], int)
        self.assertIsInstance(data["name"], str)
        self.assertIsInstance(data["number"], int)
        self.assertIn(data["surface_type"], ["glass", "wall", "mesh", "mixed"])
        self.assertIsInstance(data["surface_type_display"], str)
        self.assertIsInstance(data["has_lighting"], bool)
        self.assertIsInstance(data["has_heating"], bool)
        self.assertIsInstance(data["has_roof"], bool)
        self.assertIsInstance(data["is_maintenance"], bool)
        self.assertIsInstance(data["maintenance_notes"], str)
        self.assertIsInstance(data["price_per_hour"], str)  # Decimal as string
        self.assertIsInstance(data["is_active"], bool)
        self.assertIsInstance(data["created_at"], str)  # DateTime as string
        self.assertIsInstance(data["updated_at"], str)  # DateTime as string

        # Verify computed fields
        self.assertEqual(data["club_name"], self.club.name)
        self.assertEqual(data["surface_type_display"], court.get_surface_type_display())


class CourtAPIUnificationTest(APITestCase):
    """Test Court API endpoints match frontend expectations."""

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

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            address={"street": "Test Street", "city": "Test City"},
            phone="+1234567890",
            email="test@club.com",
        )

        # Add user to organization via membership
        from apps.authentication.models import OrganizationMembership
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role='admin',
            is_active=True
        )

        self.client.force_authenticate(user=self.user)

    def test_create_court_with_form_data(self):
        """Test creating court with CourtFormData interface."""
        form_data = {
            "club": self.club.id,
            "organization": self.organization.id,
            "name": "New Court",
            "number": 1,
            "surface_type": "glass",
            "has_lighting": True,
            "has_heating": False,
            "has_roof": False,
            "is_maintenance": False,
            "maintenance_notes": "Test notes",
            "price_per_hour": "75.50",
            "is_active": True,
        }

        response = self.client.post("/api/v1/clubs/courts/", form_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify response matches Court interface
        data = response.data
        self.assertEqual(data["name"], form_data["name"])
        self.assertEqual(data["number"], form_data["number"])
        self.assertEqual(data["surface_type"], form_data["surface_type"])
        self.assertEqual(data["price_per_hour"], form_data["price_per_hour"])
        self.assertIn("organization", data)  # Verify organization field is included

    def test_list_courts_response_format(self):
        """Test list courts response matches TypeScript expectations."""
        # Create test courts
        for i in range(3):
            Court.objects.create(
                club=self.club,
                organization=self.organization,
                name=f"Court {i+1}",
                number=i + 1,
                surface_type="glass" if i % 2 == 0 else "wall",
                price_per_hour=50.00 + (i * 10),
            )

        response = self.client.get(f"/api/v1/clubs/courts/?club={self.club.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check response format
        self.assertIn("results", response.data)
        self.assertIsInstance(response.data["results"], list)
        self.assertEqual(len(response.data["results"]), 3)

        # Verify each court has required fields
        for court_data in response.data["results"]:
            self.assertIn("id", court_data)
            self.assertIn("club", court_data)
            self.assertIn("club_name", court_data)
            self.assertIn("organization", court_data)
            self.assertIn("surface_type_display", court_data)
