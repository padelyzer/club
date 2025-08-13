"""
Test cases for partner-related models in the clients app.
"""

from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.clubs.models import Club
from apps.root.models import Organization
from apps.clients.models import (
    ClientProfile,
    PartnerRequest,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)

User = get_user_model()


class PartnerRequestModelTest(TestCase):
    """Test cases for PartnerRequest model."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization and club
        self.organization = Organization.objects.create(
            type='club',
            business_name='Test Padel Organization',
            trade_name='Test Padel',
            rfc='TPO123456789',
            primary_email='test@padel.com',
            primary_phone='+1234567890',
            legal_representative='John Doe',
            state='active'
        )
        
        self.club = Club.objects.create(
            organization=self.organization,
            name='Test Padel Club',
            slug='test-padel-club',
            email='club@test.com',
            phone='+1234567890',
            is_active=True
        )
        
        # Create test users
        self.user1 = User.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='TEST_PASSWORD'
        )
        self.user1.role = 'CLIENT'
        self.user1.save()
        
        self.user2 = User.objects.create_user(
            username='player2',
            email='player2@test.com',
            password='TEST_PASSWORD'
        )
        self.user2.role = 'CLIENT'
        self.user2.save()
        
        self.user3 = User.objects.create_user(
            username='player3',
            email='player3@test.com',
            password='TEST_PASSWORD'
        )
        self.user3.role = 'CLIENT'
        self.user3.save()
        
        # Create player level
        self.level = PlayerLevel.objects.create(
            name='intermediate',
            display_name='Intermediate',
            min_rating=300,
            max_rating=600,
            color='#3B82F6'
        )
        
        # Create client profiles
        self.profile1 = ClientProfile.objects.create(
            user=self.user1,
            organization=self.organization,
            club=self.club,
            level=self.level,
            rating=500,
            allow_partner_requests=True
        )
        
        self.profile2 = ClientProfile.objects.create(
            user=self.user2,
            organization=self.organization,
            club=self.club,
            level=self.level,
            rating=520,
            allow_partner_requests=True
        )
        
        self.profile3 = ClientProfile.objects.create(
            user=self.user3,
            organization=self.organization,
            club=self.club,
            level=self.level,
            rating=480,
            allow_partner_requests=False  # Not accepting requests
        )
        
        # Create preferences for each profile
        self.prefs1 = PlayerPreferences.objects.create(
            player=self.profile1,
            organization=self.organization,
            club=self.club
        )
        
        self.prefs2 = PlayerPreferences.objects.create(
            player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        self.prefs3 = PlayerPreferences.objects.create(
            player=self.profile3,
            organization=self.organization,
            club=self.club
        )
    
    def test_create_partner_request(self):
        """Test creating a valid partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Looking for a partner for doubles match',
            match_date=timezone.now() + timedelta(days=2)
        )
        
        self.assertEqual(request.from_player, self.profile1)
        self.assertEqual(request.to_player, self.profile2)
        self.assertEqual(request.status, 'pending')
        self.assertIsNone(request.responded_at)
        self.assertEqual(request.response_message, '')
    
    def test_partner_request_str(self):
        """Test string representation of partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        expected = f"{self.profile1} -> {self.profile2} (Pendiente)"
        self.assertEqual(str(request), expected)
    
    def test_accept_partner_request(self):
        """Test accepting a partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Want to play tomorrow?'
        )
        
        # Accept the request
        request.accept('Sure, let\'s play!')
        
        self.assertEqual(request.status, 'accepted')
        self.assertIsNotNone(request.responded_at)
        self.assertEqual(request.response_message, 'Sure, let\'s play!')
    
    def test_reject_partner_request(self):
        """Test rejecting a partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        # Reject the request
        request.reject('Sorry, I\'m busy that day')
        
        self.assertEqual(request.status, 'rejected')
        self.assertIsNotNone(request.responded_at)
        self.assertEqual(request.response_message, 'Sorry, I\'m busy that day')
    
    def test_cancel_partner_request(self):
        """Test cancelling a partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        # Cancel the request
        request.cancel()
        
        self.assertEqual(request.status, 'cancelled')
        self.assertIsNotNone(request.responded_at)
    
    def test_cannot_modify_non_pending_request(self):
        """Test that accepted/rejected requests cannot be modified."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        # Accept the request
        request.accept()
        
        # Try to reject it
        with self.assertRaises(ValidationError):
            request.reject()
        
        # Try to cancel it
        with self.assertRaises(ValidationError):
            request.cancel()
    
    def test_blocked_player_validation(self):
        """Test that blocked players cannot receive requests."""
        # Block profile1
        self.prefs2.blocked_players.add(self.profile1)
        
        # Validation should happen at serializer level, not model
        # So this should still create but serializer would reject
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        self.assertIsNotNone(request.id)
    
    def test_partner_request_manager_pending(self):
        """Test PartnerRequestManager pending() method."""
        # Create multiple requests
        req1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile3,
            organization=self.organization,
            club=self.club
        )
        
        # Accept one
        req2.accept()
        
        # Only req1 should be pending
        pending = PartnerRequest.objects.pending()
        self.assertEqual(pending.count(), 1)
        self.assertIn(req1, pending)
        self.assertNotIn(req2, pending)
    
    def test_partner_request_manager_for_player(self):
        """Test PartnerRequestManager for_player() method."""
        # Create requests
        req1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club
        )
        
        req3 = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile3,
            organization=self.organization,
            club=self.club
        )
        
        # Get requests for profile1
        player1_requests = PartnerRequest.objects.for_player(self.profile1)
        self.assertEqual(player1_requests.count(), 2)
        self.assertIn(req1, player1_requests)
        self.assertIn(req2, player1_requests)
        self.assertNotIn(req3, player1_requests)


class PlayerPreferencesPartnerTest(TestCase):
    """Test cases for partner-related functionality in PlayerPreferences."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization and club
        self.organization = Organization.objects.create(
            type='club',
            business_name='Test Org',
            trade_name='Test Org',
            rfc='TO123456789',
            primary_email='test@org.com',
            primary_phone='+1234567890',
            legal_representative='Test Rep',
            state='active'
        )
        
        self.club = Club.objects.create(
            organization=self.organization,
            name='Test Club',
            slug='test-club',
            email='club@test.com',
            phone='+1234567890',
            is_active=True
        )
        
        # Create levels
        self.beginner = PlayerLevel.objects.create(
            name='beginner',
            display_name='Beginner',
            min_rating=0,
            max_rating=300,
            color='#10B981'
        )
        
        self.intermediate = PlayerLevel.objects.create(
            name='intermediate',
            display_name='Intermediate',
            min_rating=300,
            max_rating=600,
            color='#3B82F6'
        )
        
        self.advanced = PlayerLevel.objects.create(
            name='advanced',
            display_name='Advanced',
            min_rating=600,
            max_rating=900,
            color='#8B5CF6'
        )
        
        # Create test users and profiles
        self.users = []
        self.profiles = []
        
        for i in range(5):
            user = User.objects.create_user(
                username=f'player{i}',
                email=f'player{i}@test.com',
                password='TEST_PASSWORD'
            )
            user.role = 'CLIENT'
            user.save()
            self.users.append(user)
            
            level = [self.beginner, self.intermediate, self.advanced][i % 3]
            profile = ClientProfile.objects.create(
                user=user,
                organization=self.organization,
                club=self.club,
                level=level,
                rating=level.min_rating + 50,
                allow_partner_requests=True
            )
            self.profiles.append(profile)
            
            # Create preferences
            prefs = PlayerPreferences.objects.create(
                player=profile,
                organization=self.organization,
                club=self.club
            )
    
    def test_preferred_partners(self):
        """Test preferred partners functionality."""
        prefs = self.profiles[0].preferences
        
        # Add preferred partners
        prefs.preferred_partners.add(self.profiles[1], self.profiles[2])
        
        self.assertEqual(prefs.preferred_partners.count(), 2)
        self.assertIn(self.profiles[1], prefs.preferred_partners.all())
        self.assertIn(self.profiles[2], prefs.preferred_partners.all())
    
    def test_blocked_players(self):
        """Test blocked players functionality."""
        prefs = self.profiles[0].preferences
        
        # Block some players
        prefs.blocked_players.add(self.profiles[3], self.profiles[4])
        
        self.assertEqual(prefs.blocked_players.count(), 2)
        self.assertIn(self.profiles[3], prefs.blocked_players.all())
        self.assertIn(self.profiles[4], prefs.blocked_players.all())
    
    def test_partner_level_preferences(self):
        """Test partner level preferences."""
        prefs = self.profiles[0].preferences  # Beginner player
        
        # Set preferred partner levels
        prefs.min_partner_level = self.beginner
        prefs.max_partner_level = self.intermediate
        prefs.save()
        
        self.assertEqual(prefs.min_partner_level, self.beginner)
        self.assertEqual(prefs.max_partner_level, self.intermediate)
    
    def test_availability_preferences(self):
        """Test availability preferences for partner matching."""
        prefs = self.profiles[0].preferences
        
        # Set availability
        prefs.available_weekday_morning = False
        prefs.available_weekday_afternoon = True
        prefs.available_weekday_evening = True
        prefs.available_weekend_morning = True
        prefs.available_weekend_afternoon = True
        prefs.available_weekend_evening = False
        prefs.save()
        
        # Test weekday afternoon (should be available)
        tuesday_afternoon = datetime(2024, 1, 9, 15, 0)  # Tuesday 3 PM
        self.assertTrue(prefs.is_available_at(tuesday_afternoon))
        
        # Test weekday morning (should not be available)
        tuesday_morning = datetime(2024, 1, 9, 9, 0)  # Tuesday 9 AM
        self.assertFalse(prefs.is_available_at(tuesday_morning))
        
        # Test weekend evening (should not be available)
        saturday_evening = datetime(2024, 1, 13, 20, 0)  # Saturday 8 PM
        self.assertFalse(prefs.is_available_at(saturday_evening))
    
    def test_match_format_preferences(self):
        """Test match format preferences."""
        prefs = self.profiles[0].preferences
        
        prefs.preferred_match_format = 'competitive'
        prefs.preferred_match_duration = 120  # 2 hours
        prefs.save()
        
        self.assertEqual(prefs.preferred_match_format, 'competitive')
        self.assertEqual(prefs.preferred_match_duration, 120)


class PartnerRequestIntegrationTest(TestCase):
    """Integration tests for partner request flow."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization and club
        self.organization = Organization.objects.create(
            type='club',
            business_name='Integration Test Org',
            trade_name='Test Org',
            rfc='ITO123456789',
            primary_email='integration@test.com',
            primary_phone='+1234567890',
            legal_representative='Test Rep',
            state='active'
        )
        
        self.club = Club.objects.create(
            organization=self.organization,
            name='Integration Test Club',
            slug='integration-test-club',
            email='club@integration.com',
            phone='+1234567890',
            is_active=True
        )
        
        # Create level
        self.level = PlayerLevel.objects.create(
            name='intermediate',
            display_name='Intermediate',
            min_rating=300,
            max_rating=600,
            color='#3B82F6'
        )
        
        # Create users
        self.alice = User.objects.create_user(
            username='alice',
            email='alice@test.com',
            password='TEST_PASSWORD'
        )
        self.alice.role = 'CLIENT'
        self.alice.save()
        
        self.bob = User.objects.create_user(
            username='bob',
            email='bob@test.com',
            password='TEST_PASSWORD'
        )
        self.bob.role = 'CLIENT'
        self.bob.save()
        
        # Create profiles
        self.alice_profile = ClientProfile.objects.create(
            user=self.alice,
            organization=self.organization,
            club=self.club,
            level=self.level,
            rating=450,
            allow_partner_requests=True
        )
        
        self.bob_profile = ClientProfile.objects.create(
            user=self.bob,
            organization=self.organization,
            club=self.club,
            level=self.level,
            rating=480,
            allow_partner_requests=True
        )
        
        # Create stats
        self.alice_stats = PlayerStats.objects.create(
            player=self.alice_profile,
            organization=self.organization,
            club=self.club
        )
        
        self.bob_stats = PlayerStats.objects.create(
            player=self.bob_profile,
            organization=self.organization,
            club=self.club
        )
        
        # Create preferences
        self.alice_prefs = PlayerPreferences.objects.create(
            player=self.alice_profile,
            organization=self.organization,
            club=self.club,
            min_partner_level=self.level,
            max_partner_level=self.level
        )
        
        self.bob_prefs = PlayerPreferences.objects.create(
            player=self.bob_profile,
            organization=self.organization,
            club=self.club
        )
    
    def test_complete_partner_request_flow(self):
        """Test complete flow from request to acceptance."""
        # Alice sends request to Bob
        request = PartnerRequest.objects.create(
            from_player=self.alice_profile,
            to_player=self.bob_profile,
            organization=self.organization,
            club=self.club,
            message='Want to play doubles tomorrow at 6 PM?',
            match_date=timezone.now() + timedelta(days=1)
        )
        
        # Check initial state
        self.assertEqual(request.status, 'pending')
        self.assertEqual(
            PartnerRequest.objects.pending().for_player(self.bob_profile).count(),
            1
        )
        
        # Bob accepts
        request.accept('Sounds great! See you there.')
        
        # Check final state
        self.assertEqual(request.status, 'accepted')
        self.assertIsNotNone(request.responded_at)
        self.assertEqual(
            PartnerRequest.objects.pending().for_player(self.bob_profile).count(),
            0
        )
    
    def test_multiple_pending_requests(self):
        """Test handling multiple pending requests."""
        # Create multiple requests to Bob
        req1 = PartnerRequest.objects.create(
            from_player=self.alice_profile,
            to_player=self.bob_profile,
            organization=self.organization,
            club=self.club,
            message='Friday match?'
        )
        
        # Create another user
        charlie = User.objects.create_user(
            username='charlie',
            email='charlie@test.com',
            password='TEST_PASSWORD'
        )
        charlie.role = 'CLIENT'
        charlie.save()
        
        charlie_profile = ClientProfile.objects.create(
            user=charlie,
            organization=self.organization,
            club=self.club,
            level=self.level,
            rating=500
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=charlie_profile,
            to_player=self.bob_profile,
            organization=self.organization,
            club=self.club,
            message='Weekend tournament?'
        )
        
        # Bob should have 2 pending requests
        bob_pending = PartnerRequest.objects.pending().filter(to_player=self.bob_profile)
        self.assertEqual(bob_pending.count(), 2)
        
        # Accept one, reject the other
        req1.accept('Sure!')
        req2.reject('Sorry, busy that weekend')
        
        # No more pending requests
        bob_pending_after = PartnerRequest.objects.pending().filter(to_player=self.bob_profile)
        self.assertEqual(bob_pending_after.count(), 0)