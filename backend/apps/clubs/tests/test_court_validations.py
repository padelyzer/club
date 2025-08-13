"""
Tests for Court validation logic - EMERGENCY RECOVERY VERSION.
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import OrganizationMembership
from apps.clubs.models import Club, Court
from apps.clubs.serializers import CourtSerializer
from apps.root.models import Organization

User = get_user_model()


class CourtValidationTest(TestCase):
    """Test Court model and serializer validations."""

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

    def test_court_name_validation(self):
        """Test court name validation and sanitization."""
        # Test empty name
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "",
                "number": 1,
                "surface_type": "glass",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

        # Test XSS attempt
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "organization": str(self.organization.id),
                "name": '<script>alert("XSS")</script>Court 1',
                "number": 1,
                "surface_type": "glass",
            }
        )
        self.assertTrue(serializer.is_valid())
        # Check sanitization removed script tag
        self.assertNotIn("<script>", serializer.validated_data["name"])

        # Test name too long
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "A" * 101,  # 101 characters
                "number": 1,
                "surface_type": "glass",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_court_number_validation(self):
        """Test court number validation."""
        # Test number too low
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 0,
                "surface_type": "glass",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("number", serializer.errors)

        # Test number too high
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 51,
                "surface_type": "glass",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("number", serializer.errors)

        # Test valid number
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
            }
        )
        self.assertTrue(serializer.is_valid())

    def test_court_number_uniqueness(self):
        """Test court number uniqueness within club."""
        # Create first court
        Court.objects.create(
            club=self.club,
            organization=self.organization,
            name="Court 1",
            number=1,
            surface_type="glass",
        )

        # Try to create another court with same number
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1 Duplicate",
                "number": 1,
                "surface_type": "wall",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("number", serializer.errors)
        self.assertIn("already exists", str(serializer.errors["number"][0]))

    def test_price_validation(self):
        """Test price validation."""
        # Test negative price
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "price_per_hour": "-10.00",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("price_per_hour", serializer.errors)

        # Test price with too many decimals
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "price_per_hour": "50.999",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("price_per_hour", serializer.errors)

        # Test price too high
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "price_per_hour": "1000000.00",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("price_per_hour", serializer.errors)

        # Test valid price
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "price_per_hour": "75.50",
            }
        )
        self.assertTrue(serializer.is_valid())

    def test_maintenance_validation(self):
        """Test maintenance-related validations."""
        # Test maintenance without notes (should get warning)
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "is_maintenance": True,
                "maintenance_notes": "",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("maintenance_notes", serializer.errors)

        # Test maintenance with notes
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "is_maintenance": True,
                "maintenance_notes": "Resurfacing in progress",
            }
        )
        self.assertTrue(serializer.is_valid())

        # Test maintenance notes too long
        serializer = CourtSerializer(
            data={
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "glass",
                "is_maintenance": True,
                "maintenance_notes": "A" * 501,  # 501 characters
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("maintenance_notes", serializer.errors)


class CourtValidationAPITest(APITestCase):
    """Test Court validation through API endpoints."""

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

        self.client.force_authenticate(user=self.user)

    def test_api_validation_errors(self):
        """Test that API returns proper validation errors."""
        # Invalid surface type
        response = self.client.post(
            "/api/v1/clubs/courts/",
            {
                "club": str(self.club.id),
                "name": "Court 1",
                "number": 1,
                "surface_type": "invalid_type",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("surface_type", response.data)

        # Multiple validation errors
        response = self.client.post(
            "/api/v1/clubs/courts/",
            {
                "club": str(self.club.id),
                "name": "",  # Empty name
                "number": 100,  # Number too high
                "surface_type": "glass",
                "price_per_hour": "invalid",  # Invalid price format
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("number", response.data)
        self.assertIn("price_per_hour", response.data)

    def test_update_validation(self):
        """Test validation on update operations."""
        court = Court.objects.create(
            club=self.club,
            organization=self.organization,
            name="Court 1",
            number=1,
            surface_type="glass",
            price_per_hour=50.00,
        )

        # Try to update with invalid data
        response = self.client.patch(
            f"/api/v1/clubs/courts/{court.id}/",
            {"price_per_hour": "-20.00"},  # Negative price
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("price_per_hour", response.data)
