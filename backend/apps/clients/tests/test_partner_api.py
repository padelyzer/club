"""
Test cases for partner API endpoints in the clients app.
"""

import json
from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

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


class PartnerAPITestCase(TestCase):
    """Base test case for partner API tests."""

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
        
        # Create player level
        self.level = PlayerLevel.objects.create(
            name='intermediate',
            display_name='Intermediate',
            min_rating=300,
            max_rating=600,
            color='#3B82F6'
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
            allow_partner_requests=True
        )
        
        # Create stats and preferences for each profile
        for profile in [self.profile1, self.profile2, self.profile3]:
            PlayerStats.objects.create(
                player=profile,
                organization=self.organization,
                club=self.club
            )
            PlayerPreferences.objects.create(
                player=profile,
                organization=self.organization,
                club=self.club
            )
        
        # Set up API client
        self.client = APIClient()


class PartnerRequestAPITest(PartnerAPITestCase):
    """Test partner request API endpoints."""

    def test_create_partner_request_authenticated(self):
        """Test creating a partner request when authenticated."""
        self.client.force_authenticate(user=self.user1)
        
        url = reverse('clients:partnerrequest-list')
        data = {
            'to_player_id': str(self.profile2.id),
            'message': 'Want to play doubles tomorrow?',
            'match_date': (timezone.now() + timedelta(days=1)).isoformat()
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PartnerRequest.objects.count(), 1)
        
        request = PartnerRequest.objects.first()
        self.assertEqual(request.from_player, self.profile1)
        self.assertEqual(request.to_player, self.profile2)
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.message, 'Want to play doubles tomorrow?')

    def test_create_partner_request_unauthenticated(self):
        """Test creating a partner request when unauthenticated."""
        url = reverse('clients:partnerrequest-list')
        data = {
            'to_player_id': str(self.profile2.id),
            'message': 'Want to play?'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(PartnerRequest.objects.count(), 0)

    def test_create_partner_request_to_non_accepting_player(self):
        """Test creating request to player who doesn't accept requests."""
        # Disable partner requests for profile2
        self.profile2.allow_partner_requests = False
        self.profile2.save()
        
        self.client.force_authenticate(user=self.user1)
        
        url = reverse('clients:partnerrequest-list')
        data = {
            'to_player_id': str(self.profile2.id),
            'message': 'Want to play?'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not accepting partner requests', response.data['non_field_errors'][0])

    def test_list_partner_requests(self):
        """Test listing partner requests."""
        # Create some partner requests
        req1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Request 1'
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile3,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            message='Request 2'
        )
        
        # Test as user1 (should see both requests)
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:partnerrequest-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_respond_to_partner_request_accept(self):
        """Test accepting a partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Want to play?'
        )
        
        self.client.force_authenticate(user=self.user2)
        url = reverse('clients:partnerrequest-detail', kwargs={'pk': request.id}) + 'respond/'
        data = {
            'action': 'accept',
            'message': 'Sure, let\'s play!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.status, 'accepted')
        self.assertEqual(request.response_message, 'Sure, let\'s play!')
        self.assertIsNotNone(request.responded_at)

    def test_respond_to_partner_request_reject(self):
        """Test rejecting a partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Want to play?'
        )
        
        self.client.force_authenticate(user=self.user2)
        url = reverse('clients:partnerrequest-detail', kwargs={'pk': request.id}) + 'respond/'
        data = {
            'action': 'reject',
            'message': 'Sorry, busy that day'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.status, 'rejected')
        self.assertEqual(request.response_message, 'Sorry, busy that day')
        self.assertIsNotNone(request.responded_at)

    def test_respond_to_request_not_recipient(self):
        """Test responding to request when not the recipient."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Want to play?'
        )
        
        # User3 tries to respond to request sent to user2
        self.client.force_authenticate(user=self.user3)
        url = reverse('clients:partnerrequest-detail', kwargs={'pk': request.id}) + 'respond/'
        data = {'action': 'accept'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancel_partner_request(self):
        """Test cancelling a partner request."""
        request = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Want to play?'
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:partnerrequest-detail', kwargs={'pk': request.id}) + 'cancel/'
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.status, 'cancelled')

    def test_get_sent_requests(self):
        """Test getting sent partner requests."""
        # Create requests
        req1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Request to user2'
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile3,
            organization=self.organization,
            club=self.club,
            message='Request to user3'
        )
        
        # Request from another user (shouldn't appear)
        PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile3,
            organization=self.organization,
            club=self.club,
            message='Request from user2'
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:partnerrequest-list') + 'sent/'
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_received_requests(self):
        """Test getting received partner requests."""
        # Create requests
        req1 = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            message='Request from user2'
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile3,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            message='Request from user3'
        )
        
        # Request to another user (shouldn't appear)
        PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            message='Request to user2'
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:partnerrequest-list') + 'received/'
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_pending_requests(self):
        """Test getting pending partner requests."""
        # Create requests with different statuses
        pending_req = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            message='Pending request',
            status='pending'
        )
        
        accepted_req = PartnerRequest.objects.create(
            from_player=self.profile3,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            message='Accepted request',
            status='accepted'
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:partnerrequest-list') + 'pending/'
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(pending_req.id))


class ClientProfilePartnerAPITest(PartnerAPITestCase):
    """Test client profile partner-related endpoints."""

    def test_get_recent_partners(self):
        """Test getting recent partners for a player."""
        # Create accepted partner requests
        req1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            status='accepted',
            responded_at=timezone.now() - timedelta(days=1)
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile3,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            status='accepted',
            responded_at=timezone.now() - timedelta(days=2)
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:clientprofile-detail', kwargs={'pk': self.profile1.id}) + 'recent_partners/'
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_suggested_partners(self):
        """Test getting suggested partners for a player."""
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:clientprofile-detail', kwargs={'pk': self.profile1.id}) + 'suggested_partners/'
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return other players as suggestions
        self.assertGreaterEqual(len(response.data), 1)

    def test_get_suggested_partners_with_match_date(self):
        """Test getting suggested partners with specific match date."""
        match_date = (timezone.now() + timedelta(days=1)).isoformat()
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:clientprofile-detail', kwargs={'pk': self.profile1.id}) + 'suggested_partners/'
        
        response = self.client.get(url, {'match_date': match_date})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_partner_history(self):
        """Test getting partner history between two players."""
        # Create some partner requests between two players
        req1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=self.profile2,
            organization=self.organization,
            club=self.club,
            status='accepted',
            responded_at=timezone.now() - timedelta(days=1)
        )
        
        req2 = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            status='accepted',
            responded_at=timezone.now() - timedelta(days=5)
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:clientprofile-detail', kwargs={'pk': self.profile1.id}) + 'partner_history/'
        
        response = self.client.get(url, {'partner_id': str(self.profile2.id)})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['have_played_together'])
        self.assertEqual(response.data['matches_count'], 2)

    def test_get_pending_requests_count(self):
        """Test getting count of pending partner requests."""
        # Create some requests
        PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            status='pending'
        )
        
        PartnerRequest.objects.create(
            from_player=self.profile3,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            status='pending'
        )
        
        # Accepted request (shouldn't count)
        PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile1,
            organization=self.organization,
            club=self.club,
            status='accepted'
        )
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('clients:clientprofile-detail', kwargs={'pk': self.profile1.id}) + 'pending_requests_count/'
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


class PlayerPreferencesPartnerAPITest(PartnerAPITestCase):
    """Test player preferences partner-related endpoints."""

    def test_add_preferred_partner(self):
        """Test adding a preferred partner."""
        self.client.force_authenticate(user=self.user1)
        
        # Get preferences object
        prefs = self.profile1.preferences
        url = reverse('clients:playerpreferences-detail', kwargs={'pk': prefs.id}) + 'add_preferred_partner/'
        data = {'partner_id': str(self.profile2.id)}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(prefs.preferred_partners.filter(id=self.profile2.id).exists())

    def test_remove_preferred_partner(self):
        """Test removing a preferred partner."""
        self.client.force_authenticate(user=self.user1)
        
        # Add partner first
        prefs = self.profile1.preferences
        prefs.preferred_partners.add(self.profile2)
        
        url = reverse('clients:playerpreferences-detail', kwargs={'pk': prefs.id}) + 'remove_preferred_partner/'
        data = {'partner_id': str(self.profile2.id)}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(prefs.preferred_partners.filter(id=self.profile2.id).exists())

    def test_block_player(self):
        """Test blocking a player."""
        self.client.force_authenticate(user=self.user1)
        
        prefs = self.profile1.preferences
        url = reverse('clients:playerpreferences-detail', kwargs={'pk': prefs.id}) + 'block_player/'
        data = {'player_id': str(self.profile2.id)}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(prefs.blocked_players.filter(id=self.profile2.id).exists())

    def test_unblock_player(self):
        """Test unblocking a player."""
        self.client.force_authenticate(user=self.user1)
        
        # Block player first
        prefs = self.profile1.preferences
        prefs.blocked_players.add(self.profile2)
        
        url = reverse('clients:playerpreferences-detail', kwargs={'pk': prefs.id}) + 'unblock_player/'
        data = {'player_id': str(self.profile2.id)}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(prefs.blocked_players.filter(id=self.profile2.id).exists())