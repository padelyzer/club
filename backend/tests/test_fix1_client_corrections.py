#!/usr/bin/env python
"""
FIX-1: Tests unitarios para correcciones del módulo de clientes.
Tests for client profile signals, validations, and multi-tenant functionality.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock

from apps.clients.models import ClientProfile
from apps.clients.signals import (
    create_client_profile_on_user_creation,
    update_client_profile_organization,
    validate_client_organization_consistency
)
from apps.clubs.models import Club
from apps.root.models import Organization
from apps.authentication.models import User

User = get_user_model()


class TestClientProfileSignals(TransactionTestCase):
    """Test client profile automatic creation and updates via signals."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
    
    def test_client_profile_created_on_user_creation(self):
        """Test that client profile is automatically created when user is created."""
        # Create user
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="John",
            last_name="Doe",
            organization=self.organization,
            club=self.club
        )
        
        # Check that profile was created
        self.assertTrue(hasattr(user, 'client_profile'))
        profile = user.client_profile
        
        # Validate profile data
        self.assertEqual(profile.user, user)
        self.assertEqual(profile.organization, self.organization)
        self.assertEqual(profile.club, self.club)
        self.assertEqual(profile.full_name, "John Doe")
        self.assertEqual(profile.email, "test@example.com")
        self.assertIsNotNone(profile.player_code)
        self.assertTrue(profile.player_code.startswith(self.organization.slug.upper()))
    
    def test_client_profile_organization_update(self):
        """Test that client profile organization is updated when user organization changes."""
        # Create user with initial organization
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        profile = user.client_profile
        self.assertEqual(profile.organization, self.organization)
        
        # Create new organization and club
        new_org = Organization.objects.create(
            name="New Organization",
            slug="new-org",
            is_active=True
        )
        
        new_club = Club.objects.create(
            name="New Club",
            organization=new_org,
            address="New Address",
            is_active=True
        )
        
        # Update user organization
        user.organization = new_org
        user.club = new_club
        user.save()
        
        # Check that profile organization was updated
        profile.refresh_from_db()
        self.assertEqual(profile.organization, new_org)
        self.assertEqual(profile.club, new_club)
    
    def test_client_profile_validation_consistency(self):
        """Test organization consistency validation."""
        # Create user
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        profile = user.client_profile
        
        # Create different organization
        other_org = Organization.objects.create(
            name="Other Organization",
            slug="other-org",
            is_active=True
        )
        
        # Try to set profile to different organization
        profile.organization = other_org
        
        # Should raise validation error
        with self.assertRaises(ValidationError) as cm:
            profile.clean()
        
        self.assertIn("organization must match", str(cm.exception))
    
    def test_duplicate_email_within_organization(self):
        """Test that duplicate emails within same organization are prevented."""
        # Create first user
        user1 = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        # Try to create second user with same email in same organization
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email="test@example.com",
                password="testpass456",
                organization=self.organization,
                club=self.club
            )
    
    def test_same_email_different_organizations(self):
        """Test that same email can exist in different organizations."""
        # Create second organization
        org2 = Organization.objects.create(
            name="Organization 2",
            slug="org-2",
            is_active=True
        )
        
        club2 = Club.objects.create(
            name="Club 2",
            organization=org2,
            address="Address 2",
            is_active=True
        )
        
        # Create users with same email in different organizations
        user1 = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        user2 = User.objects.create_user(
            email="test@example.com",
            password="testpass456",
            organization=org2,
            club=club2
        )
        
        # Both should be created successfully
        self.assertNotEqual(user1.id, user2.id)
        self.assertEqual(user1.email, user2.email)
        self.assertNotEqual(user1.organization, user2.organization)


class TestClientProfileModel(TestCase):
    """Test client profile model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="John",
            last_name="Doe",
            organization=self.organization,
            club=self.club
        )
        
        self.profile = self.user.client_profile
    
    def test_player_code_generation(self):
        """Test player code generation."""
        self.assertIsNotNone(self.profile.player_code)
        self.assertTrue(self.profile.player_code.startswith("TEST-ORG"))
        self.assertEqual(len(self.profile.player_code), 12)  # ORG-8digits
    
    def test_skill_level_validation(self):
        """Test skill level validation."""
        valid_levels = ['beginner', 'intermediate', 'advanced', 'professional']
        
        for level in valid_levels:
            self.profile.skill_level = level
            self.profile.clean()  # Should not raise
        
        # Invalid level
        self.profile.skill_level = 'invalid'
        with self.assertRaises(ValidationError):
            self.profile.clean()
    
    def test_playing_position_validation(self):
        """Test playing position validation."""
        valid_positions = ['left', 'right', 'both']
        
        for position in valid_positions:
            self.profile.playing_position = position
            self.profile.clean()  # Should not raise
        
        # Invalid position
        self.profile.playing_position = 'center'
        with self.assertRaises(ValidationError):
            self.profile.clean()
    
    def test_full_name_property(self):
        """Test full name property."""
        self.assertEqual(self.profile.full_name, "John Doe")
        
        # Test with only first name
        self.user.last_name = ""
        self.user.save()
        self.assertEqual(self.profile.full_name, "John")
        
        # Test with only last name
        self.user.first_name = ""
        self.user.last_name = "Doe"
        self.user.save()
        self.assertEqual(self.profile.full_name, "Doe")
    
    def test_age_calculation(self):
        """Test age calculation."""
        from datetime import date
        
        # Set birth date to 25 years ago
        birth_date = date.today().replace(year=date.today().year - 25)
        self.profile.birth_date = birth_date
        self.profile.save()
        
        self.assertEqual(self.profile.age, 25)
        
        # Test without birth date
        self.profile.birth_date = None
        self.profile.save()
        self.assertIsNone(self.profile.age)
    
    def test_is_minor_property(self):
        """Test is_minor property."""
        from datetime import date
        
        # Set birth date to 16 years ago
        birth_date = date.today().replace(year=date.today().year - 16)
        self.profile.birth_date = birth_date
        self.profile.save()
        
        self.assertTrue(self.profile.is_minor)
        
        # Set birth date to 20 years ago
        birth_date = date.today().replace(year=date.today().year - 20)
        self.profile.birth_date = birth_date
        self.profile.save()
        
        self.assertFalse(self.profile.is_minor)
    
    def test_str_representation(self):
        """Test string representation."""
        expected = "John Doe (TEST-ORG)"
        self.assertEqual(str(self.profile), expected)


class TestClientProfileValidations(TestCase):
    """Test client profile business validations."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        self.profile = self.user.client_profile
    
    def test_phone_number_validation(self):
        """Test phone number format validation."""
        valid_phones = ["+525512345678", "5512345678", "+1234567890"]
        invalid_phones = ["123", "abcdefghij", "+52123", ""]
        
        for phone in valid_phones:
            self.profile.phone = phone
            self.profile.clean()  # Should not raise
        
        for phone in invalid_phones:
            self.profile.phone = phone
            with self.assertRaises(ValidationError):
                self.profile.clean()
    
    def test_emergency_contact_validation(self):
        """Test emergency contact validation."""
        # Both name and phone required
        self.profile.emergency_contact_name = "John Emergency"
        self.profile.emergency_contact_phone = ""
        
        with self.assertRaises(ValidationError) as cm:
            self.profile.clean()
        
        self.assertIn("emergency contact phone", str(cm.exception))
        
        # Valid emergency contact
        self.profile.emergency_contact_phone = "+525512345678"
        self.profile.clean()  # Should not raise
    
    def test_medical_conditions_with_medications(self):
        """Test medical conditions requiring medications."""
        self.profile.has_medical_conditions = True
        self.profile.medical_conditions = "Diabetes"
        self.profile.medications = ""
        
        with self.assertRaises(ValidationError) as cm:
            self.profile.clean()
        
        self.assertIn("medications must be specified", str(cm.exception))
        
        # Valid with medications
        self.profile.medications = "Insulin"
        self.profile.clean()  # Should not raise
    
    def test_minor_requires_guardian(self):
        """Test that minors require guardian information."""
        from datetime import date
        
        # Set as minor
        birth_date = date.today().replace(year=date.today().year - 16)
        self.profile.birth_date = birth_date
        self.profile.guardian_name = ""
        
        with self.assertRaises(ValidationError) as cm:
            self.profile.clean()
        
        self.assertIn("guardian information", str(cm.exception))
        
        # Valid guardian info
        self.profile.guardian_name = "Guardian Name"
        self.profile.guardian_phone = "+525512345678"
        self.profile.clean()  # Should not raise


class TestClientProfileManager(TestCase):
    """Test client profile custom manager methods."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
    
    def test_active_profiles_filter(self):
        """Test active profiles filter."""
        # Create active user
        active_user = User.objects.create_user(
            email="active@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        # Create inactive user
        inactive_user = User.objects.create_user(
            email="inactive@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club,
            is_active=False
        )
        
        # Test active filter
        active_profiles = ClientProfile.objects.active()
        self.assertIn(active_user.client_profile, active_profiles)
        self.assertNotIn(inactive_user.client_profile, active_profiles)
    
    def test_by_skill_level_filter(self):
        """Test filter by skill level."""
        # Create users with different skill levels
        beginner_user = User.objects.create_user(
            email="beginner@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        beginner_user.client_profile.skill_level = 'beginner'
        beginner_user.client_profile.save()
        
        advanced_user = User.objects.create_user(
            email="advanced@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        advanced_user.client_profile.skill_level = 'advanced'
        advanced_user.client_profile.save()
        
        # Test filter
        beginners = ClientProfile.objects.by_skill_level('beginner')
        self.assertIn(beginner_user.client_profile, beginners)
        self.assertNotIn(advanced_user.client_profile, beginners)
    
    def test_search_functionality(self):
        """Test profile search functionality."""
        # Create test users
        user1 = User.objects.create_user(
            email="john.doe@example.com",
            password="testpass123",
            first_name="John",
            last_name="Doe",
            organization=self.organization,
            club=self.club
        )
        
        user2 = User.objects.create_user(
            email="jane.smith@example.com",
            password="testpass123",
            first_name="Jane",
            last_name="Smith",
            organization=self.organization,
            club=self.club
        )
        
        # Test search by name
        results = ClientProfile.objects.search("John")
        self.assertIn(user1.client_profile, results)
        self.assertNotIn(user2.client_profile, results)
        
        # Test search by email
        results = ClientProfile.objects.search("jane.smith")
        self.assertIn(user2.client_profile, results)
        self.assertNotIn(user1.client_profile, results)


@pytest.mark.django_db
class TestClientProfileSignalsIntegration:
    """Test signal integration scenarios."""
    
    def test_user_creation_rollback_on_profile_error(self):
        """Test that user creation is rolled back if profile creation fails."""
        organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        club = Club.objects.create(
            name="Test Club",
            organization=organization,
            address="Test Address",
            is_active=True
        )
        
        # Mock profile creation to fail
        with patch('apps.clients.models.ClientProfile.objects.create') as mock_create:
            mock_create.side_effect = Exception("Profile creation failed")
            
            with pytest.raises(Exception):
                User.objects.create_user(
                    email="test@example.com",
                    password="testpass123",
                    organization=organization,
                    club=club
                )
            
            # User should not exist due to rollback
            assert not User.objects.filter(email="test@example.com").exists()
    
    def test_organization_change_cascade(self):
        """Test that organization changes cascade properly."""
        org1 = Organization.objects.create(
            name="Organization 1",
            slug="org-1",
            is_active=True
        )
        
        org2 = Organization.objects.create(
            name="Organization 2",
            slug="org-2",
            is_active=True
        )
        
        club1 = Club.objects.create(
            name="Club 1",
            organization=org1,
            address="Address 1",
            is_active=True
        )
        
        club2 = Club.objects.create(
            name="Club 2",
            organization=org2,
            address="Address 2",
            is_active=True
        )
        
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=org1,
            club=club1
        )
        
        profile = user.client_profile
        assert profile.organization == org1
        assert profile.club == club1
        
        # Change user organization
        user.organization = org2
        user.club = club2
        user.save()
        
        # Profile should be updated
        profile.refresh_from_db()
        assert profile.organization == org2
        assert profile.club == club2


if __name__ == '__main__':
    pytest.main([__file__])