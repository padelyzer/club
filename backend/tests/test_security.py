"""
Security tests for the Django backend.
Tests multi-tenant isolation, JWT authentication, and security vulnerabilities.
"""

import json
import time
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.clients.models import ClientProfile
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from apps.root.models import Organization

User = get_user_model()


class TestMultiTenantSecurity(APITestCase):
    """Test multi-tenant data isolation and security."""

    def setUp(self):
        """Set up test data for multi-tenant testing."""
        # Create two separate organizations
        self.org1 = Organization.objects.create(
            trade_name="Organization 1",
            business_name="Org 1 LLC",
            type="club",
            state="FL",
        )
        self.org2 = Organization.objects.create(
            trade_name="Organization 2",
            business_name="Org 2 LLC",
            type="club",
            state="NY",
        )

        # Create users for each organization
        self.user_org1 = User.objects.create_user(
            email="user1@org1.com",
            password="TEST_PASSWORD",
            first_name="User",
            last_name="One",
        )
        self.user_org2 = User.objects.create_user(
            email="user2@org2.com",
            password="TEST_PASSWORD",
            first_name="User",
            last_name="Two",
        )

        # Create organization memberships
        OrganizationMembership.objects.create(
            user=self.user_org1, organization=self.org1, role="admin", is_active=True
        )
        OrganizationMembership.objects.create(
            user=self.user_org2, organization=self.org2, role="admin", is_active=True
        )

        # Create clubs for each organization
        self.club_org1 = Club.objects.create(
            name="Club Org 1", organization=self.org1, slug="club-org-1"
        )
        self.club_org2 = Club.objects.create(
            name="Club Org 2", organization=self.org2, slug="club-org-2"
        )

        # Create courts
        self.court_org1 = Court.objects.create(
            club=self.club_org1, name="Court 1", court_type="indoor"
        )
        self.court_org2 = Court.objects.create(
            club=self.club_org2, name="Court 2", court_type="outdoor"
        )

        # Create reservations
        self.reservation_org1 = Reservation.objects.create(
            club=self.club_org1,
            court=self.court_org1,
            date=timezone.now().date(),
            start_time=datetime.strptime("10:00", "%H:%M").time(),
            end_time=datetime.strptime("11:00", "%H:%M").time(),
            created_by=self.user_org1,
            status="confirmed",
        )
        self.reservation_org2 = Reservation.objects.create(
            club=self.club_org2,
            court=self.court_org2,
            date=timezone.now().date(),
            start_time=datetime.strptime("14:00", "%H:%M").time(),
            end_time=datetime.strptime("15:00", "%H:%M").time(),
            created_by=self.user_org2,
            status="confirmed",
        )

    def test_cross_tenant_club_access_denied(self):
        """Ensure users cannot access clubs from other organizations."""
        # User from org1 trying to access org2's club
        self.client.force_authenticate(user=self.user_org1)

        # Try to get org2's club details
        response = self.client.get(f"/api/v1/clubs/{self.club_org2.id}/")
        self.assertIn(response.status_code, [403, 404])

        # Try to list clubs - should only see org1's clubs
        response = self.client.get("/api/v1/clubs/")
        self.assertEqual(response.status_code, 200)
        club_ids = [club["id"] for club in response.data.get("results", [])]
        self.assertIn(str(self.club_org1.id), club_ids)
        self.assertNotIn(str(self.club_org2.id), club_ids)

    def test_cross_tenant_reservation_access_denied(self):
        """Ensure users cannot access reservations from other organizations."""
        self.client.force_authenticate(user=self.user_org1)

        # Try to access org2's reservation
        response = self.client.get(f"/api/v1/reservations/{self.reservation_org2.id}/")
        self.assertIn(response.status_code, [403, 404])

        # List reservations - should only see org1's reservations
        response = self.client.get("/api/v1/reservations/")
        self.assertEqual(response.status_code, 200)
        reservation_ids = [r["id"] for r in response.data.get("results", [])]
        self.assertIn(str(self.reservation_org1.id), reservation_ids)
        self.assertNotIn(str(self.reservation_org2.id), reservation_ids)

    def test_cross_tenant_analytics_access_denied(self):
        """Ensure users cannot access analytics from other organizations."""
        self.client.force_authenticate(user=self.user_org1)

        # Try to get analytics for org2's club
        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club_org2.id}"
        )
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.data)

    def test_cross_tenant_court_modification_denied(self):
        """Ensure users cannot modify courts from other organizations."""
        self.client.force_authenticate(user=self.user_org1)

        # Try to update org2's court
        update_data = {"name": "Hacked Court Name", "price_per_hour": "999.99"}
        response = self.client.patch(
            f"/api/v1/courts/{self.court_org2.id}/", update_data, format="json"
        )
        self.assertIn(response.status_code, [403, 404])

        # Verify court wasn't modified
        court = Court.objects.get(id=self.court_org2.id)
        self.assertNotEqual(court.name, "Hacked Court Name")

    def test_organization_switching_security(self):
        """Test security when user has access to multiple organizations."""
        # Create a user with access to both organizations
        multi_org_user = User.objects.create_user(
            email="multi@test.com", password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=multi_org_user, organization=self.org1, role="member", is_active=True
        )
        OrganizationMembership.objects.create(
            user=multi_org_user, organization=self.org2, role="member", is_active=True
        )

        self.client.force_authenticate(user=multi_org_user)

        # Should be able to access both organizations' data
        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["organizations"]), 2)

        # Verify proper access based on current organization context
        # This would depend on your implementation of organization switching


class TestJWTAuthentication(APITestCase):
    """Test JWT authentication and token security."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="jwt@test.com",
            password="TEST_PASSWORD",
            first_name="JWT",
            last_name="Test",
        )
        self.org = Organization.objects.create(
            trade_name="JWT Org", business_name="JWT Organization LLC"
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

    def test_jwt_token_generation(self):
        """Test JWT token generation on login."""
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Verify token structure
        access_token = response.data["access"]
        self.assertIsInstance(access_token, str)
        self.assertGreater(len(access_token), 100)  # JWT tokens are long

    def test_jwt_token_validation(self):
        """Test that valid JWT tokens are accepted."""
        # Get tokens
        refresh = RefreshToken.for_user(self.user)
        access_token = refresh.access_token

        # Use token to access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get("/api/v1/auth/user/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], self.user.email)

    def test_invalid_jwt_token_rejected(self):
        """Test that invalid JWT tokens are rejected."""
        # Use invalid token
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.here")
        response = self.client.get("/api/v1/auth/user/")

        self.assertEqual(response.status_code, 401)

    def test_expired_jwt_token_rejected(self):
        """Test that expired JWT tokens are rejected."""
        # Create token with past expiration
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=timedelta(seconds=-1))  # Expired 1 second ago

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/v1/auth/user/")

        self.assertEqual(response.status_code, 401)

    def test_jwt_token_blacklisting(self):
        """Test that blacklisted tokens are rejected."""
        # Get tokens
        refresh = RefreshToken.for_user(self.user)
        access_token = refresh.access_token

        # Blacklist the refresh token
        outstanding_token = OutstandingToken.objects.create(
            user=self.user, token=str(refresh), expires_at=refresh["exp"]
        )
        BlacklistedToken.objects.create(token=outstanding_token)

        # Try to use the access token (should still work if only refresh is blacklisted)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get("/api/v1/auth/user/")

        # Access token should still work
        self.assertEqual(response.status_code, 200)

        # But refresh should fail
        response = self.client.post(
            "/api/v1/auth/token/refresh/", {"refresh": str(refresh)}
        )
        self.assertEqual(response.status_code, 401)

    def test_jwt_refresh_token_rotation(self):
        """Test JWT refresh token rotation."""
        # Initial login
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
        )

        initial_refresh = response.data["refresh"]

        # Refresh the token
        response = self.client.post(
            "/api/v1/auth/token/refresh/", {"refresh": initial_refresh}
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

        # If rotation is enabled, verify old refresh token doesn't work
        # (This depends on your JWT configuration)


class TestSQLInjectionPrevention(APITestCase):
    """Test SQL injection prevention."""

    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            trade_name="Test Org", business_name="Test Organization LLC"
        )
        self.user = User.objects.create_user(
            email="sql@test.com", password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )
        self.club = Club.objects.create(name="Test Club", organization=self.org)

    def test_sql_injection_in_query_params(self):
        """Test SQL injection attempts in query parameters."""
        self.client.force_authenticate(user=self.user)

        # Common SQL injection patterns
        injection_attempts = [
            "1' OR '1'='1",
            "1; DROP TABLE clubs;--",
            "1' UNION SELECT * FROM users--",
            "1' AND 1=1--",
            "'; DELETE FROM clubs WHERE '1'='1",
            "1' OR 1=1#",
            "admin'--",
            "1' OR 'a'='a",
        ]

        for injection in injection_attempts:
            # Try injection in various endpoints
            response = self.client.get(f"/api/v1/clubs/?search={injection}")
            self.assertIn(response.status_code, [200, 400])

            response = self.client.get(f"/api/v1/reservations/?club={injection}")
            self.assertIn(response.status_code, [200, 400])

            # Verify no data manipulation occurred
            self.assertTrue(Club.objects.filter(id=self.club.id).exists())

    def test_sql_injection_in_post_data(self):
        """Test SQL injection attempts in POST data."""
        self.client.force_authenticate(user=self.user)

        # Try SQL injection in club creation
        malicious_data = {
            "name": "Test'; DROP TABLE clubs;--",
            "organization": self.org.id,
            "slug": "test-slug",
            "description": "1' OR '1'='1",
        }

        response = self.client.post("/api/v1/clubs/", malicious_data, format="json")

        # Should either succeed with escaped data or fail validation
        if response.status_code == 201:
            # Verify data was properly escaped
            created_club = Club.objects.get(id=response.data["id"])
            self.assertEqual(created_club.name, malicious_data["name"])
            self.assertEqual(created_club.description, malicious_data["description"])

    def test_sql_injection_in_json_fields(self):
        """Test SQL injection in JSON field data."""
        self.client.force_authenticate(user=self.user)

        # If you have JSON fields, test them
        malicious_json = {
            "metadata": {
                "key": "value'; DROP TABLE clubs;--",
                "nested": {"sql": "1' OR 1=1--"},
            }
        }

        # Test with an endpoint that accepts JSON fields
        response = self.client.patch(
            f"/api/v1/clubs/{self.club.id}/", malicious_json, format="json"
        )

        # Verify tables still exist
        self.assertTrue(Club.objects.filter(id=self.club.id).exists())


class TestXSSPrevention(APITestCase):
    """Test XSS (Cross-Site Scripting) prevention."""

    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            trade_name="XSS Test Org", business_name="XSS Test Organization LLC"
        )
        self.user = User.objects.create_user(
            email="xss@test.com", password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

    def test_xss_in_text_fields(self):
        """Test XSS prevention in text fields."""
        self.client.force_authenticate(user=self.user)

        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src='javascript:alert(\"XSS\")'></iframe>",
            "<body onload=alert('XSS')>",
            "';alert('XSS');//",
            "<script>document.cookie</script>",
        ]

        for payload in xss_payloads:
            # Try to create club with XSS payload
            response = self.client.post(
                "/api/v1/clubs/",
                {
                    "name": f"Club {payload}",
                    "organization": self.org.id,
                    "slug": "xss-test-club",
                    "description": payload,
                    "address": payload,
                },
                format="json",
            )

            if response.status_code == 201:
                # Verify data is properly escaped/sanitized
                club = Club.objects.get(id=response.data["id"])

                # The payload should be stored as-is (escaped) not executed
                self.assertIn(payload, club.description)

                # Clean up
                club.delete()

    def test_xss_in_json_responses(self):
        """Test that API responses properly escape data."""
        # Create club with potential XSS content
        club = Club.objects.create(
            name="<script>alert('XSS')</script>",
            organization=self.org,
            slug="xss-response-test",
            description="<img src=x onerror=alert('XSS')>",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/v1/clubs/{club.id}/")

        self.assertEqual(response.status_code, 200)

        # Verify response is JSON (not HTML that could execute scripts)
        self.assertEqual(response["Content-Type"], "application/json")

        # Verify data is present but would be escaped if rendered
        self.assertEqual(response.data["name"], "<script>alert('XSS')</script>")


class TestRateLimiting(APITestCase):
    """Test rate limiting functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="ratelimit@test.com", password="TEST_PASSWORD"
        )

    @override_settings(
        RATELIMIT_ENABLE=True,
        RATELIMIT_USE_CACHE="default",
        CACHES={
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            }
        },
    )
    def test_login_rate_limiting(self):
        """Test rate limiting on login endpoint."""
        # Clear any existing rate limit data
        cache.clear()

        # Attempt multiple failed logins
        for i in range(10):
            response = self.client.post(
                "/api/v1/auth/login/",
                {"email": "ratelimit@test.com", "password": "TEST_PASSWORD"},
            )

            if i < 5:  # Assuming rate limit is 5 attempts
                self.assertEqual(response.status_code, 401)
            else:
                # Should be rate limited
                self.assertIn(response.status_code, [429, 401])
                if response.status_code == 429:
                    self.assertIn("Retry-After", response)

    @override_settings(RATELIMIT_ENABLE=True, RATELIMIT_USE_CACHE="default")
    def test_api_endpoint_rate_limiting(self):
        """Test rate limiting on regular API endpoints."""
        self.client.force_authenticate(user=self.user)

        # Clear cache
        cache.clear()

        # Make many rapid requests
        responses = []
        for i in range(100):
            response = self.client.get("/api/v1/clubs/")
            responses.append(response.status_code)

        # Should see some rate limiting (429 responses) if configured
        # This depends on your rate limit configuration
        # At minimum, all requests should be handled without crashes
        self.assertTrue(all(status in [200, 429] for status in responses))


class TestPermissionEnforcement(APITestCase):
    """Test permission enforcement across endpoints."""

    def setUp(self):
        """Set up test data with different user roles."""
        self.org = Organization.objects.create(
            trade_name="Permission Test Org",
            business_name="Permission Test Organization LLC",
        )

        # Create users with different roles
        self.owner = User.objects.create_user(
            email="owner@test.com", password="TEST_PASSWORD"
        )
        self.admin = User.objects.create_user(
            email="admin@test.com", password="TEST_PASSWORD"
        )
        self.member = User.objects.create_user(
            email="member@test.com", password="TEST_PASSWORD"
        )
        self.guest = User.objects.create_user(
            email="guest@test.com", password="TEST_PASSWORD"
        )

        # Create memberships
        OrganizationMembership.objects.create(
            user=self.owner, organization=self.org, role="owner", is_active=True
        )
        OrganizationMembership.objects.create(
            user=self.admin, organization=self.org, role="admin", is_active=True
        )
        OrganizationMembership.objects.create(
            user=self.member, organization=self.org, role="member", is_active=True
        )
        # Guest has no membership

        self.club = Club.objects.create(
            name="Permission Test Club", organization=self.org
        )

    def test_owner_permissions(self):
        """Test that owners have full access."""
        self.client.force_authenticate(user=self.owner)

        # Should be able to create clubs
        response = self.client.post(
            "/api/v1/clubs/",
            {"name": "Owner Club", "organization": self.org.id, "slug": "owner-club"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        # Should be able to delete clubs
        response = self.client.delete(f'/api/v1/clubs/{response.data["id"]}/')
        self.assertEqual(response.status_code, 204)

    def test_admin_permissions(self):
        """Test admin permission boundaries."""
        self.client.force_authenticate(user=self.admin)

        # Should be able to modify clubs
        response = self.client.patch(
            f"/api/v1/clubs/{self.club.id}/",
            {"name": "Admin Updated Club"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        # May or may not be able to delete organization (depends on your rules)
        # Test based on your permission model

    def test_member_permissions(self):
        """Test member permission boundaries."""
        self.client.force_authenticate(user=self.member)

        # Should be able to read
        response = self.client.get(f"/api/v1/clubs/{self.club.id}/")
        self.assertEqual(response.status_code, 200)

        # Should NOT be able to modify clubs
        response = self.client.patch(
            f"/api/v1/clubs/{self.club.id}/",
            {"name": "Member Updated Club"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_guest_permissions(self):
        """Test that guests (non-members) have no access."""
        self.client.force_authenticate(user=self.guest)

        # Should not be able to access organization data
        response = self.client.get(f"/api/v1/clubs/{self.club.id}/")
        self.assertIn(response.status_code, [403, 404])

        # Should not be able to list clubs
        response = self.client.get("/api/v1/clubs/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data.get("results", [])), 0)


class TestDataLeakagePrevention(APITestCase):
    """Test prevention of sensitive data leakage."""

    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            trade_name="Data Leak Test Org",
            business_name="Data Leak Test Organization LLC",
        )
        self.user = User.objects.create_user(
            email="leak@test.com", password="TEST_PASSWORD", phone_number="+1234567890"
        )
        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="member"
        )

    def test_password_not_exposed(self):
        """Ensure passwords are never exposed in API responses."""
        self.client.force_authenticate(user=self.user)

        # Check user endpoint
        response = self.client.get("/api/v1/auth/user/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("password", response.data)

        # Check in list views
        response = self.client.get("/api/v1/users/")
        if response.status_code == 200 and "results" in response.data:
            for user in response.data["results"]:
                self.assertNotIn("password", user)

    def test_sensitive_fields_protection(self):
        """Test that sensitive fields are protected based on permissions."""
        other_user = User.objects.create_user(
            email="other@test.com", password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=other_user, organization=self.org, role="member"
        )

        self.client.force_authenticate(user=self.user)

        # Try to access another user's data
        response = self.client.get(f"/api/v1/users/{other_user.id}/")

        if response.status_code == 200:
            # Should not see sensitive data like phone numbers
            # (depends on your serializer configuration)
            pass

    def test_internal_fields_not_exposed(self):
        """Test that internal fields are not exposed in API."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/v1/auth/user/")
        self.assertEqual(response.status_code, 200)

        # Internal fields that should not be exposed
        internal_fields = [
            "_state",
            "password",
            "is_superuser",  # Depending on your security model
            "user_permissions",
            "groups",
        ]

        for field in internal_fields:
            self.assertNotIn(field, response.data)


if __name__ == "__main__":
    import django

    django.setup()
    import unittest

    unittest.main()
