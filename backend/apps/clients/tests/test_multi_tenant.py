"""
Test multi-tenant functionality for clients module.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import (
    ClientProfile,
    EmergencyContact,
    MedicalInfo,
    PartnerRequest,
    PlayerPreferences,
    PlayerStats,
)
from apps.clubs.models import Club
from apps.root.models import Organization

User = get_user_model()


class MultiTenantModelTestCase(TestCase):
    """Test multi-tenant model functionality."""

    def setUp(self):
        # Create two organizations
        self.org1 = Organization.objects.create(
            business_name="Org 1",
            trade_name="Org 1",
            rfc="ORG1000000000",
            legal_email="org1@test.com",
            subscription_plan="premium",
        )

        self.org2 = Organization.objects.create(
            business_name="Org 2",
            trade_name="Org 2",
            rfc="ORG2000000000",
            legal_email="org2@test.com",
            subscription_plan="premium",
        )

        # Create clubs for each organization
        self.club1 = Club.objects.create(
            organization=self.org1, name="Club 1", address="Address 1"
        )

        self.club2 = Club.objects.create(
            organization=self.org2, name="Club 2", address="Address 2"
        )

        # Create users for each organization
        self.user1 = User.objects.create_user(
            username="user1@test.com",
            email="user1@test.com",
            password="TEST_PASSWORD",
            current_organization=self.org1,
            current_club=self.club1,
        )

        self.user2 = User.objects.create_user(
            username="user2@test.com",
            email="user2@test.com",
            password="TEST_PASSWORD",
            current_organization=self.org2,
            current_club=self.club2,
        )

        # Create client profiles
        self.profile1 = ClientProfile.objects.create(
            user=self.user1, organization=self.org1, club=self.club1
        )

        self.profile2 = ClientProfile.objects.create(
            user=self.user2, organization=self.org2, club=self.club2
        )

    def test_client_profile_filtering(self):
        """Test that client profiles are filtered by organization."""
        # User 1 should only see profiles from org1
        profiles = ClientProfile.objects.for_user(self.user1)
        self.assertEqual(profiles.count(), 1)
        self.assertEqual(profiles.first(), self.profile1)

        # User 2 should only see profiles from org2
        profiles = ClientProfile.objects.for_user(self.user2)
        self.assertEqual(profiles.count(), 1)
        self.assertEqual(profiles.first(), self.profile2)

    def test_related_models_inherit_organization(self):
        """Test that related models inherit organization from profile."""
        # Create stats for profile1
        stats = PlayerStats.objects.create(
            player=self.profile1,
            organization=self.profile1.organization,
            club=self.profile1.club,
        )

        self.assertEqual(stats.organization, self.org1)
        self.assertEqual(stats.club, self.club1)

        # Create emergency contact
        contact = EmergencyContact.objects.create(
            player=self.profile1,
            organization=self.profile1.organization,
            club=self.profile1.club,
            name="Emergency Contact",
            relationship="spouse",
            phone="1234567890",
        )

        self.assertEqual(contact.organization, self.org1)
        self.assertEqual(contact.club, self.club1)

    def test_manager_active_filtering(self):
        """Test that active() method filters correctly."""
        # Deactivate profile2
        self.profile2.is_active = False
        self.profile2.save()

        # Active profiles for org2
        active_profiles = ClientProfile.objects.for_organization(self.org2).active()
        self.assertEqual(active_profiles.count(), 0)

        # All profiles for org2
        all_profiles = ClientProfile.objects.for_organization(self.org2)
        self.assertEqual(all_profiles.count(), 1)


class MultiTenantAPITestCase(APITestCase):
    """Test multi-tenant API functionality."""

    def setUp(self):
        # Create organizations and users similar to model tests
        self.org1 = Organization.objects.create(
            business_name="API Org 1",
            trade_name="API Org 1",
            rfc="API1000000000",
            legal_email="api.org1@test.com",
            subscription_plan="premium",
        )

        self.org2 = Organization.objects.create(
            business_name="API Org 2",
            trade_name="API Org 2",
            rfc="API2000000000",
            legal_email="api.org2@test.com",
            subscription_plan="premium",
        )

        self.user1 = User.objects.create_user(
            username="api.user1@test.com",
            email="api.user1@test.com",
            password="TEST_PASSWORD",
            current_organization=self.org1,
        )

        self.user2 = User.objects.create_user(
            username="api.user2@test.com",
            email="api.user2@test.com",
            password="TEST_PASSWORD",
            current_organization=self.org2,
        )

        self.profile1 = ClientProfile.objects.create(
            user=self.user1, organization=self.org1, is_public=True
        )

        self.profile2 = ClientProfile.objects.create(
            user=self.user2, organization=self.org2, is_public=True
        )

    def test_client_profile_list_filtering(self):
        """Test that API filters profiles by organization."""
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        response = self.client.get("/api/v1/clients/profiles/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only see profile from org1
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.profile1.id))

    def test_emergency_contact_creation_inherits_org(self):
        """Test that emergency contacts inherit organization."""
        self.client.force_authenticate(user=self.user1)

        data = {"name": "Test Contact", "relationship": "spouse", "phone": "1234567890"}

        response = self.client.post("/api/v1/clients/emergency-contacts/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that contact was created with correct organization
        contact = EmergencyContact.objects.get(id=response.data["id"])
        self.assertEqual(contact.organization, self.org1)
        self.assertEqual(contact.player, self.profile1)

    def test_partner_request_filtering(self):
        """Test that partner requests are filtered by organization."""
        # Create a partner request within org1
        other_user = User.objects.create_user(
            username="other@test.com",
            email="other@test.com",
            password="TEST_PASSWORD",
            current_organization=self.org1,
        )

        other_profile = ClientProfile.objects.create(
            user=other_user, organization=self.org1
        )

        request1 = PartnerRequest.objects.create(
            from_player=self.profile1,
            to_player=other_profile,
            organization=self.org1,
            message="Play together?",
        )

        # Create a partner request in org2 (should not be visible)
        request2 = PartnerRequest.objects.create(
            from_player=self.profile2,
            to_player=self.profile2,  # Self request for testing
            organization=self.org2,
            message="Test request",
        )

        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        response = self.client.get("/api/v1/clients/partner-requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only see request from org1
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(request1.id))
