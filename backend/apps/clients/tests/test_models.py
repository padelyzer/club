"""
Comprehensive model tests for clients app.
"""

import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta, date
import uuid

# Import models from the app
from apps.clients.models import PlayerLevel, ClientProfile

# Import factories
from tests.factories import (
    UserFactory, OrganizationFactory, ClubFactory, 
    PlayerLevelFactory, ClientProfileFactory
)

User = get_user_model()

@pytest.mark.django_db
class TestPlayerLevelModel(TestCase):
    """Test cases for PlayerLevel model."""
    
    def test_player_level_creation(self):
        """Test player level creation with all fields."""
        if not PlayerLevelFactory:
            self.skipTest("PlayerLevelFactory not available")
            
        level = PlayerLevelFactory(
            name="advanced",
            display_name="Avanzado",
            description="Jugador con alta experiencia",
            min_rating=600,
            max_rating=900,
            color="#FF0000"
        )
        
        self.assertEqual(level.name, "advanced")
        self.assertEqual(level.display_name, "Avanzado")
        self.assertEqual(level.min_rating, 600)
        self.assertEqual(level.max_rating, 900)
        self.assertEqual(level.color, "#FF0000")
        
    def test_player_level_str_representation(self):
        """Test player level string representation."""
        if not PlayerLevelFactory:
            self.skipTest("PlayerLevelFactory not available")
            
        level = PlayerLevelFactory(display_name="Professional")
        self.assertEqual(str(level), "Professional")
        
    def test_player_level_choices(self):
        """Test player level name choices."""
        if not PlayerLevelFactory:
            self.skipTest("PlayerLevelFactory not available")
            
        valid_levels = ["beginner", "intermediate", "advanced", "professional"]
        
        for level_name in valid_levels:
            level = PlayerLevelFactory(name=level_name)
            self.assertEqual(level.name, level_name)
            
    def test_player_level_rating_range(self):
        """Test player level rating constraints."""
        if not PlayerLevelFactory:
            self.skipTest("PlayerLevelFactory not available")
            
        # Valid ratings (0-1000)
        level = PlayerLevelFactory(min_rating=100, max_rating=400)
        self.assertEqual(level.min_rating, 100)
        self.assertEqual(level.max_rating, 400)
        
    def test_player_level_ordering(self):
        """Test player levels are ordered by min_rating."""
        if not PlayerLevelFactory:
            self.skipTest("PlayerLevelFactory not available")
            
        from apps.clients.models import PlayerLevel
        
        beginner = PlayerLevelFactory(name="beginner", min_rating=0)
        intermediate = PlayerLevelFactory(name="intermediate", min_rating=300) 
        advanced = PlayerLevelFactory(name="advanced", min_rating=600)
        
        levels = list(PlayerLevel.objects.all())
        
        # Should be ordered by min_rating
        self.assertEqual(levels[0], beginner)
        self.assertEqual(levels[1], intermediate)
        self.assertEqual(levels[2], advanced)


@pytest.mark.django_db
class TestClientProfileModel(TestCase):
    """Test cases for ClientProfile model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        if OrganizationFactory:
            self.organization = OrganizationFactory()
        if ClubFactory:
            self.club = ClubFactory()
        if PlayerLevelFactory:
            self.level = PlayerLevelFactory()
        
    def test_client_profile_creation(self):
        """Test client profile creation with all fields."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        profile = ClientProfileFactory(
            phone="+52-123-456-7890",
            date_of_birth=date(1990, 5, 15),
            gender="F",
            hand="left",
            position="both"
        )
        
        self.assertIsNotNone(profile.user)
        self.assertEqual(profile.phone, "+52-123-456-7890")
        self.assertEqual(profile.date_of_birth, date(1990, 5, 15))
        self.assertEqual(profile.gender, "F")
        self.assertEqual(profile.hand, "left")
        self.assertEqual(profile.position, "both")
        
    def test_client_profile_str_representation(self):
        """Test client profile string representation."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        user = UserFactory(first_name="John", last_name="Doe")
        profile = ClientProfileFactory(user=user)
        
        expected = f"John Doe"
        self.assertEqual(str(profile), expected)
        
    def test_client_profile_user_relationship(self):
        """Test client profile one-to-one relationship with user."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        user = UserFactory()
        profile = ClientProfileFactory(user=user)
        
        self.assertEqual(profile.user, user)
        self.assertEqual(user.client_profile, profile)
        
    def test_client_profile_organization_relationship(self):
        """Test client profile belongs to organization."""
        if not ClientProfileFactory or not OrganizationFactory:
            self.skipTest("Required factories not available")
            
        org = OrganizationFactory()
        profile = ClientProfileFactory(organization=org)
        
        self.assertEqual(profile.organization, org)
        
    def test_client_profile_club_relationship(self):
        """Test client profile belongs to club."""
        if not ClientProfileFactory or not ClubFactory:
            self.skipTest("Required factories not available")
            
        club = ClubFactory()
        profile = ClientProfileFactory(club=club)
        
        self.assertEqual(profile.club, club)
        
    def test_client_profile_level_relationship(self):
        """Test client profile has player level."""
        if not ClientProfileFactory or not PlayerLevelFactory:
            self.skipTest("Required factories not available")
            
        level = PlayerLevelFactory(name="intermediate")
        profile = ClientProfileFactory(level=level)
        
        self.assertEqual(profile.level, level)
        
    def test_client_profile_hand_choices(self):
        """Test client profile hand choices validation."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        valid_hands = ["right", "left", "ambidextrous"]
        
        for hand in valid_hands:
            profile = ClientProfileFactory(hand=hand)
            self.assertEqual(profile.hand, hand)
            
    def test_client_profile_position_choices(self):
        """Test client profile position choices validation."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        valid_positions = ["right", "left", "both"]
        
        for position in valid_positions:
            profile = ClientProfileFactory(position=position)
            self.assertEqual(profile.position, position)
            
    def test_client_profile_gender_choices(self):
        """Test client profile gender choices validation."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        valid_genders = ["M", "F", "Other"]
        
        for gender in valid_genders:
            profile = ClientProfileFactory(gender=gender)
            self.assertEqual(profile.gender, gender)


@pytest.mark.django_db
class TestClientProfileBusinessLogic(TestCase):
    """Test business logic for client profiles."""
    
    def test_client_profile_unique_per_user(self):
        """Test that each user can have only one client profile."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        user = UserFactory()
        profile1 = ClientProfileFactory(user=user)
        
        # Try to create another profile for same user
        with self.assertRaises(IntegrityError):
            ClientProfileFactory(user=user)
            
    def test_client_profile_multi_tenant_context(self):
        """Test client profile multi-tenant context."""
        if not ClientProfileFactory or not OrganizationFactory or not ClubFactory:
            self.skipTest("Required factories not available")
            
        org = OrganizationFactory()
        club = ClubFactory(organization=org)
        profile = ClientProfileFactory(organization=org, club=club)
        
        self.assertEqual(profile.organization, org)
        self.assertEqual(profile.club, club)
        self.assertEqual(profile.club.organization, org)
        
    def test_client_profile_skill_tracking(self):
        """Test client profile skill level tracking."""
        if not ClientProfileFactory or not PlayerLevelFactory:
            self.skipTest("Required factories not available")
            
        beginner_level = PlayerLevelFactory(name="beginner", min_rating=0, max_rating=300)
        intermediate_level = PlayerLevelFactory(name="intermediate", min_rating=300, max_rating=600)
        
        # Create profile with beginner level
        profile = ClientProfileFactory(level=beginner_level)
        self.assertEqual(profile.level, beginner_level)
        
        # Upgrade to intermediate
        profile.level = intermediate_level
        profile.save()
        
        self.assertEqual(profile.level, intermediate_level)
        
    def test_client_profile_contact_information(self):
        """Test client profile contact information."""
        if not ClientProfileFactory:
            self.skipTest("ClientProfileFactory not available")
            
        user = UserFactory(email="client@example.com")
        profile = ClientProfileFactory(
            user=user,
            phone="+52-555-123-4567"
        )
        
        # Email comes from user
        self.assertEqual(profile.user.email, "client@example.com")
        # Phone is in profile
        self.assertEqual(profile.phone, "+52-555-123-4567")
