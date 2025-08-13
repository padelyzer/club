"""
Comprehensive tests for client module.
"""

import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from apps.root.models import Organization
from apps.clubs.models import Club
from apps.clients.models import ClientProfile
from apps.clients.services import ClientService

User = get_user_model()


@pytest.mark.django_db
class TestClientModels(TestCase):
    """Test client models and validations."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Org",
            primary_email="org@test.com",
            primary_phone="+52 55 1234 5678",
            legal_representative="Test Rep"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            email="club@test.com",
            phone="+52 55 9876 5432"
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            current_organization_id=self.org.id
        )
    
    def test_client_profile_creation(self):
        """Test creating a client profile."""
        profile = ClientProfile.objects.create(
            user=self.user,
            organization=self.org,
            club=self.club,
            dominant_hand="right",
            preferred_position="left"
        )
        
        self.assertIsNotNone(profile.id)
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.organization, self.org)
        self.assertEqual(profile.display_name, self.user.email)
    
    def test_email_uniqueness_validation(self):
        """Test email must be unique within organization."""
        # Create first profile
        ClientProfile.objects.create(
            user=self.user,
            organization=self.org,
            club=self.club
        )
        
        # Try to create another user with same email
        user2 = User.objects.create_user(
            email="test2@example.com",
            username="testuser2",
            password="testpass123"
        )
        
        # Manually set email to duplicate (simulating form input)
        user2.email = self.user.email
        
        # Should raise validation error
        with self.assertRaises(ValidationError):
            profile2 = ClientProfile(
                user=user2,
                organization=self.org,
                club=self.club
            )
            profile2.full_clean()
    
    def test_guest_client_creation(self):
        """Test creating a guest client."""
        service = ClientService()
        
        guest_data = {
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'club': self.club
        }
        
        profile = service.create_guest_client(guest_data, self.org)
        
        self.assertIsNotNone(profile)
        self.assertFalse(profile.user.is_active)
        self.assertFalse(profile.user.has_usable_password())
    
    def test_client_migration_between_clubs(self):
        """Test migrating client between clubs."""
        # Create another club
        club2 = Club.objects.create(
            name="Test Club 2",
            organization=self.org,
            email="club2@test.com",
            phone="+52 55 1111 2222"
        )
        
        profile = ClientProfile.objects.create(
            user=self.user,
            organization=self.org,
            club=self.club
        )
        
        service = ClientService()
        migrated = service.migrate_client_between_clubs(profile, self.club, club2)
        
        self.assertEqual(migrated.club, club2)
    
    def test_duplicate_client_merge(self):
        """Test merging duplicate clients."""
        # Create duplicate profiles
        user2 = User.objects.create_user(
            email="duplicate@example.com",
            username="duplicate",
            password="testpass123"
        )
        
        profile1 = ClientProfile.objects.create(
            user=self.user,
            organization=self.org,
            club=self.club
        )
        
        profile2 = ClientProfile.objects.create(
            user=user2,
            organization=self.org,
            club=self.club
        )
        
        service = ClientService()
        merged = service.merge_duplicate_clients(profile1, [profile2])
        
        # Check duplicate was deleted
        self.assertFalse(
            ClientProfile.objects.filter(id=profile2.id).exists()
        )
        
        # Check primary still exists
        self.assertTrue(
            ClientProfile.objects.filter(id=profile1.id).exists()
        )


@pytest.mark.django_db  
class TestClientService(TestCase):
    """Test client service operations."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Org",
            primary_email="org@test.com",
            primary_phone="+52 55 1234 5678",
            legal_representative="Test Rep"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            email="club@test.com",
            phone="+52 55 9876 5432"
        )
        
        self.service = ClientService()
    
    def test_create_client_with_new_user(self):
        """Test creating client with new user."""
        client_data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'phone': '+52 55 5555 5555',
            'club': self.club,
            'dominant_hand': 'right',
            'preferred_position': 'both'
        }
        
        profile = self.service.create_client(
            client_data, 
            self.org
        )
        
        self.assertIsNotNone(profile)
        self.assertEqual(profile.user.email, 'newclient@example.com')
        self.assertEqual(profile.user.first_name, 'New')
        self.assertEqual(profile.user.last_name, 'Client')
    
    def test_create_client_with_existing_user(self):
        """Test creating client with existing user."""
        # Create existing user
        existing_user = User.objects.create_user(
            email='existing@example.com',
            username='existing',
            password='testpass123'
        )
        
        client_data = {
            'email': 'existing@example.com',
            'first_name': 'Existing',
            'last_name': 'User',
            'club': self.club,
            'dominant_hand': 'left'
        }
        
        profile = self.service.create_client(
            client_data,
            self.org
        )
        
        self.assertEqual(profile.user, existing_user)
    
    def test_data_privacy_compliance(self):
        """Test data privacy features."""
        user = User.objects.create_user(
            email='private@example.com',
            username='private',
            password='testpass123'
        )
        
        profile = ClientProfile.objects.create(
            user=user,
            organization=self.org,
            club=self.club,
            show_in_rankings=False,  # Private profile
            is_public=False
        )
        
        # Test that private data is protected
        self.assertFalse(profile.show_in_rankings)
        self.assertFalse(profile.is_public)
