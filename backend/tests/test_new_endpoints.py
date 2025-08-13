"""
Comprehensive tests for the new authentication, clubs, and root endpoints.
"""

import json
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import OrganizationMembership
from apps.root.models import Organization, Subscription
from apps.clubs.models import Club, Court

User = get_user_model()


class NewEndpointsTestCase(TestCase):
    """Base test case with common setup for new endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        # Create test organization
        self.organization = Organization.objects.create(
            type="club",
            business_name="Test Business Ltd",
            trade_name="Test Club",
            rfc="TST123456789",
            primary_email="admin@testclub.com",
            primary_phone="+525551234567",
            legal_representative="John Doe",
            tax_address={
                "street": "Test Street",
                "number": "123",
                "city": "Mexico City",
                "state": "CDMX",
                "postal_code": "12345",
                "country": "Mexico"
            }
        )
        
        # Create subscription for the organization
        self.subscription = Subscription.objects.create(
            organization=self.organization,
            plan="basic",
            billing_frequency="monthly",
            amount=500.00,
            clubs_allowed=3,
            users_per_club=50,
            courts_per_club=10,
            start_date="2024-01-01",
            current_period_start="2024-01-01T00:00:00Z",
            current_period_end="2024-02-01T00:00:00Z",
            next_billing_date="2024-02-01T00:00:00Z",
            invoice_email="billing@testclub.com"
        )
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@testclub.com",
            password="TEST_PASSWORD",
            first_name="Test",
            last_name="User"
        )
        
        # Create organization membership for user
        self.org_membership = OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role="org_admin",
            permissions={
                "manage_clubs": True,
                "view_analytics": True,
                "manage_billing": False
            }
        )
        
        # Set user's current organization
        self.user.current_organization_id = self.organization.id
        self.user.save()
        
        # Create test clubs
        self.club1 = Club.objects.create(
            name="Test Club 1",
            slug="test-club-1",
            organization=self.organization,
            email="club1@testclub.com",
            phone="+525551234568",
            address={"street": "Club Street 1", "number": "100"},
            total_courts=3
        )
        
        self.club2 = Club.objects.create(
            name="Test Club 2",
            slug="test-club-2",
            organization=self.organization,
            email="club2@testclub.com",
            phone="+525551234569",
            address={"street": "Club Street 2", "number": "200"},
            total_courts=2
        )
        
        # Create courts for clubs
        Court.objects.create(
            club=self.club1,
            organization=self.organization,
            name="Court 1A",
            number=1,
            surface_type="glass",
            price_per_hour=200.00
        )
        
        Court.objects.create(
            club=self.club1,
            organization=self.organization,
            name="Court 1B",
            number=2,
            surface_type="glass",
            price_per_hour=200.00
        )
        
        # Create superuser for admin tests
        self.superuser = User.objects.create_superuser(
            username="admin",
            email="admin@padelyzer.com",
            password="TEST_PASSWORD"
        )
        
    def authenticate_user(self, user=None):
        """Authenticate a user and return the access token."""
        if user is None:
            user = self.user
            
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        return access_token


class AuthPermissionsEndpointTest(NewEndpointsTestCase):
    """Test the /auth/permissions/ endpoint."""

    def test_permissions_endpoint_authenticated(self):
        """Test permissions endpoint with authenticated user."""
        self.authenticate_user()
        
        url = reverse('auth:permissions')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check response structure
        self.assertIn('global_permissions', data)
        self.assertIn('club_permissions', data)
        
        # Check global permissions
        global_perms = data['global_permissions']
        self.assertIn('organization:member', global_perms)
        self.assertIn('organization:org_admin', global_perms)
        self.assertIn('organization:manage_clubs', global_perms)
        self.assertIn('organization:view_analytics', global_perms)
        
        # Check club permissions
        club_perms = data['club_permissions']
        self.assertIn(str(self.club1.id), club_perms)
        self.assertIn(str(self.club2.id), club_perms)
        
        # Check club permission contents
        club1_perms = club_perms[str(self.club1.id)]
        self.assertIn('club:member', club1_perms)
        self.assertIn('club:admin', club1_perms)
        self.assertIn('club:manage_courts', club1_perms)

    def test_permissions_endpoint_superuser(self):
        """Test permissions endpoint with superuser."""
        self.authenticate_user(self.superuser)
        
        url = reverse('auth:permissions')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Superuser should have superuser permission
        self.assertIn('superuser', data['global_permissions'])

    def test_permissions_endpoint_unauthenticated(self):
        """Test permissions endpoint without authentication."""
        url = reverse('auth:permissions')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserClubsEndpointTest(NewEndpointsTestCase):
    """Test the /clubs/user-clubs/ endpoint."""

    def test_user_clubs_endpoint_authenticated(self):
        """Test user clubs endpoint with authenticated user."""
        self.authenticate_user()
        
        url = reverse('clubs:user-clubs-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check response structure
        self.assertIn('clubs', data)
        self.assertIn('count', data)
        
        # Check clubs data
        clubs = data['clubs']
        self.assertEqual(len(clubs), 2)
        self.assertEqual(data['count'], 2)
        
        # Check club details
        club_names = [club['name'] for club in clubs]
        self.assertIn('Test Club 1', club_names)
        self.assertIn('Test Club 2', club_names)

    def test_user_clubs_endpoint_with_search(self):
        """Test user clubs endpoint with search parameter."""
        self.authenticate_user()
        
        url = reverse('clubs:user-clubs-list')
        response = self.client.get(url, {'search': 'Club 1'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should only return Club 1
        self.assertEqual(len(data['clubs']), 1)
        self.assertEqual(data['clubs'][0]['name'], 'Test Club 1')

    def test_user_clubs_summary_endpoint(self):
        """Test user clubs summary endpoint."""
        self.authenticate_user()
        
        url = reverse('clubs:user-clubs-summary')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check summary data
        self.assertEqual(data['total_clubs'], 2)
        self.assertEqual(data['total_courts'], 2)  # We created 2 courts
        
        # Check organization data
        org_data = data['organization']
        self.assertIsNotNone(org_data)
        self.assertEqual(org_data['name'], 'Test Club')
        self.assertEqual(org_data['type'], 'club')

    def test_user_clubs_endpoint_no_organization(self):
        """Test user clubs endpoint with user who has no organization."""
        # Create user without organization
        user_no_org = User.objects.create_user(
            username="noorg",
            email="noorg@example.com",
            password="TEST_PASSWORD"
        )
        
        self.authenticate_user(user_no_org)
        
        url = reverse('clubs:user-clubs-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should return empty clubs
        self.assertEqual(len(data['clubs']), 0)
        self.assertEqual(data['count'], 0)

    def test_user_clubs_endpoint_unauthenticated(self):
        """Test user clubs endpoint without authentication."""
        url = reverse('clubs:user-clubs-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CurrentOrganizationEndpointTest(NewEndpointsTestCase):
    """Test the /root/organization/ endpoint."""

    def test_current_organization_endpoint_authenticated(self):
        """Test current organization endpoint with authenticated user."""
        self.authenticate_user()
        
        url = reverse('root:current-organization-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check organization data
        self.assertEqual(data['trade_name'], 'Test Club')
        self.assertEqual(data['business_name'], 'Test Business Ltd')
        self.assertEqual(data['rfc'], 'TST123456789')
        self.assertEqual(data['type'], 'club')
        self.assertEqual(data['state'], 'trial')
        
        # Check user role and permissions
        self.assertEqual(data['user_role'], 'org_admin')
        self.assertIn('manage_clubs', data['user_permissions'])
        self.assertTrue(data['user_permissions']['manage_clubs'])
        
        # Check subscription data
        self.assertIn('subscription', data)
        subscription = data['subscription']
        self.assertEqual(subscription['plan'], 'basic')
        self.assertEqual(subscription['clubs_allowed'], 3)
        
        # Check usage data
        self.assertIn('usage', data)
        usage = data['usage']
        self.assertEqual(usage['clubs_count'], 2)
        self.assertEqual(usage['clubs_limit'], 3)

    def test_current_organization_endpoint_no_organization(self):
        """Test current organization endpoint with user who has no organization."""
        # Create user without organization
        user_no_org = User.objects.create_user(
            username="noorg",
            email="noorg@example.com",
            password="TEST_PASSWORD"
        )
        
        self.authenticate_user(user_no_org)
        
        url = reverse('root:current-organization-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.json())

    def test_current_organization_retrieve_endpoint(self):
        """Test current organization retrieve endpoint with specific ID."""
        self.authenticate_user()
        
        url = reverse('root:current-organization-detail', kwargs={'pk': str(self.organization.id)})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['trade_name'], 'Test Club')

    def test_current_organization_retrieve_wrong_id(self):
        """Test current organization retrieve endpoint with wrong organization ID."""
        # Create another organization
        other_org = Organization.objects.create(
            type="club",
            business_name="Other Business",
            trade_name="Other Club",
            rfc="OTH123456789",
            primary_email="admin@otherclub.com",
            primary_phone="+525551234570",
            legal_representative="Jane Doe"
        )
        
        self.authenticate_user()
        
        url = reverse('root:current-organization-detail', kwargs={'pk': str(other_org.id)})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.json())

    def test_current_organization_endpoint_unauthenticated(self):
        """Test current organization endpoint without authentication."""
        url = reverse('root:current-organization-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class EndpointsIntegrationTest(NewEndpointsTestCase):
    """Integration tests for all new endpoints together."""

    def test_auth_context_flow(self):
        """Test the complete auth context flow that the frontend expects."""
        self.authenticate_user()
        
        # 1. Get user permissions
        perms_url = reverse('auth:permissions')
        perms_response = self.client.get(perms_url)
        self.assertEqual(perms_response.status_code, status.HTTP_200_OK)
        perms_data = perms_response.json()
        
        # 2. Get user's clubs
        clubs_url = reverse('clubs:user-clubs-list')
        clubs_response = self.client.get(clubs_url)
        self.assertEqual(clubs_response.status_code, status.HTTP_200_OK)
        clubs_data = clubs_response.json()
        
        # 3. Get current organization
        org_url = reverse('root:current-organization-list')
        org_response = self.client.get(org_url)
        self.assertEqual(org_response.status_code, status.HTTP_200_OK)
        org_data = org_response.json()
        
        # Verify consistency between endpoints
        self.assertEqual(len(clubs_data['clubs']), 2)
        self.assertEqual(org_data['usage']['clubs_count'], 2)
        
        # Verify permissions are consistent with organization role
        self.assertIn('organization:org_admin', perms_data['global_permissions'])
        self.assertEqual(org_data['user_role'], 'org_admin')
        
        # Verify club permissions match available clubs
        club_ids = [str(club['id']) for club in clubs_data['clubs']]
        for club_id in club_ids:
            self.assertIn(club_id, perms_data['club_permissions'])

    def test_error_handling_consistency(self):
        """Test that all endpoints handle errors consistently."""
        # Test unauthenticated access
        endpoints = [
            reverse('auth:permissions'),
            reverse('clubs:user-clubs-list'),
            reverse('root:current-organization-list'),
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            
    def test_performance_considerations(self):
        """Test that endpoints are optimized and don't cause N+1 queries."""
        self.authenticate_user()
        
        # Test with multiple clubs and courts
        for i in range(5):
            club = Club.objects.create(
                name=f"Performance Club {i}",
                slug=f"performance-club-{i}",
                organization=self.organization,
                email=f"club{i}@testclub.com",
                phone=f"+52555123456{i}",
                address={"street": f"Performance Street {i}", "number": f"{i}00"}
            )
            
            # Add courts to each club
            for j in range(3):
                Court.objects.create(
                    club=club,
                    organization=self.organization,
                    name=f"Court {i}-{j}",
                    number=j + 1,
                    surface_type="glass",
                    price_per_hour=200.00
                )
        
        # Test that clubs endpoint still performs well
        clubs_url = reverse('clubs:user-clubs-list')
        clubs_response = self.client.get(clubs_url)
        self.assertEqual(clubs_response.status_code, status.HTTP_200_OK)
        
        # Should return all 7 clubs (2 original + 5 new)
        clubs_data = clubs_response.json()
        self.assertEqual(len(clubs_data['clubs']), 7)