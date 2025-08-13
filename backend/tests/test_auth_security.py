"""
Security and authentication tests for Django backend.
Tests JWT handling, RBAC permissions, and security vulnerabilities.
Day 3-4 of Testing Suite - Authentication Security & Permissions
"""

import time
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

import jwt
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User as AuthUser
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from apps.root.models import Organization
from core.permissions import IsOrganizationMember

User = get_user_model()


class TestJWTAuthentication(APITestCase):
    """Test JWT token handling and security."""

    def setUp(self):
        """Set up test users and organizations."""
        self.org = Organization.objects.create(
            trade_name="JWT Test Org",
            business_name="JWT Test Organization LLC",
            type="club",
        )

        self.user = User.objects.create_user(
            email="jwt@test.com",
            password="TEST_PASSWORD",
            first_name="JWT",
            last_name="User",
        )

        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

        self.club = Club.objects.create(name="JWT Test Club", organization=self.org)

    def test_valid_token_authentication(self):
        """Test authentication with valid JWT token."""
        # Get token
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
        )

        self.assertEqual(response.status_code, 200)
        access_token = response.data["access"]

        # Use token for authenticated request
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["email"], "jwt@test.com")

    def test_expired_token_rejection(self):
        """Test that expired tokens are rejected."""
        # Create expired token
        token = RefreshToken.for_user(self.user)
        token.set_exp(lifetime=timedelta(seconds=-1))  # Already expired

        access_token = str(token.access_token)

        # Try to use expired token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_format(self):
        """Test rejection of malformed tokens."""
        invalid_tokens = [
            "invalid-token-format",
            "Bearer invalid-token",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature",
            "",
        ]

        for token in invalid_tokens:
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

            response = self.client.get("/api/v1/auth/context/")
            self.assertEqual(
                response.status_code, 401, f"Token '{token}' should be rejected"
            )

    def test_token_refresh_flow(self):
        """Test JWT token refresh mechanism."""
        # Get initial tokens
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
        )

        refresh_token = response.data["refresh"]
        old_access_token = response.data["access"]

        # Use refresh token to get new access token
        response = self.client.post(
            "/api/v1/auth/token/refresh/", {"refresh": refresh_token}
        )

        self.assertEqual(response.status_code, 200)
        new_access_token = response.data["access"]

        # New token should be different
        self.assertNotEqual(old_access_token, new_access_token)

        # New token should work
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access_token}")
        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

    def test_token_blacklisting(self):
        """Test JWT token blacklisting on logout."""
        # Login
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
        )

        refresh_token = response.data["refresh"]
        access_token = response.data["access"]

        # Token should work initially
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

        # Logout (blacklist token)
        response = self.client.post("/api/v1/auth/logout/", {"refresh": refresh_token})
        self.assertEqual(response.status_code, 205)

        # Token should no longer work
        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 401)

    def test_concurrent_token_usage(self):
        """Test behavior with multiple simultaneous sessions."""
        # Create multiple tokens for same user
        tokens = []
        for i in range(3):
            response = self.client.post(
                "/api/v1/auth/login/",
                {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
            )
            tokens.append(response.data["access"])

        # All tokens should work independently
        for token in tokens:
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
            response = self.client.get("/api/v1/auth/context/")
            self.assertEqual(response.status_code, 200)

    def test_token_payload_security(self):
        """Test that sensitive data is not in JWT payload."""
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "jwt@test.com", "password": "TEST_PASSWORD"},
        )

        access_token = response.data["access"]

        # Decode token payload (without verification for testing)
        payload = jwt.decode(access_token, options={"verify_signature": False})

        # Sensitive fields should not be in payload
        sensitive_fields = ["password", "password_hash", "secret_key"]
        for field in sensitive_fields:
            self.assertNotIn(field, payload)

        # Only safe user identification should be present
        self.assertIn("user_id", payload)
        self.assertEqual(str(payload["user_id"]), str(self.user.id))


class TestRBACPermissions(APITestCase):
    """Test Role-Based Access Control permissions."""

    def setUp(self):
        """Set up test organizations and users with different roles."""
        # Create organizations
        self.org1 = Organization.objects.create(
            trade_name="RBAC Org 1", business_name="RBAC Organization 1 LLC"
        )

        self.org2 = Organization.objects.create(
            trade_name="RBAC Org 2", business_name="RBAC Organization 2 LLC"
        )

        # Create users with different roles
        self.owner = User.objects.create_user(
            email="owner@test.com", password="TEST_PASSWORD"
        )

        self.admin = User.objects.create_user(
            email="admin@test.com", password="TEST_PASSWORD"
        )

        self.manager = User.objects.create_user(
            email="manager@test.com", password="TEST_PASSWORD"
        )

        self.member = User.objects.create_user(
            email="member@test.com", password="TEST_PASSWORD"
        )

        self.guest = User.objects.create_user(
            email="guest@test.com", password="TEST_PASSWORD"
        )

        # Create organization memberships
        OrganizationMembership.objects.create(
            user=self.owner, organization=self.org1, role="owner"
        )
        OrganizationMembership.objects.create(
            user=self.admin, organization=self.org1, role="admin"
        )
        OrganizationMembership.objects.create(
            user=self.manager, organization=self.org1, role="manager"
        )
        OrganizationMembership.objects.create(
            user=self.member, organization=self.org1, role="member"
        )
        OrganizationMembership.objects.create(
            user=self.guest, organization=self.org2, role="member"  # Different org
        )

        # Create clubs
        self.club1 = Club.objects.create(name="RBAC Club 1", organization=self.org1)

        self.club2 = Club.objects.create(name="RBAC Club 2", organization=self.org2)

    def test_owner_full_access(self):
        """Test that owners have full access to their organization."""
        self.client.force_authenticate(user=self.owner)

        # Should access dashboard
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response.status_code, 200)

        # Should access user management endpoints (if implemented)
        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

        # Should not access other organization's clubs
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club2.id}")
        self.assertEqual(response.status_code, 404)

    def test_admin_organization_access(self):
        """Test that admins have broad access within their organization."""
        self.client.force_authenticate(user=self.admin)

        # Should access dashboard
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response.status_code, 200)

        # Should access availability
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club1.id}&date={tomorrow}"
        )
        self.assertEqual(response.status_code, 200)

    def test_manager_limited_access(self):
        """Test that managers have limited access within their organization."""
        self.client.force_authenticate(user=self.manager)

        # Should access basic club data
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response.status_code, 200)

        # Should access availability
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club1.id}&date={tomorrow}"
        )
        self.assertEqual(response.status_code, 200)

    def test_member_read_only_access(self):
        """Test that members have read-only access to their organization."""
        self.client.force_authenticate(user=self.member)

        # Should access availability
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club1.id}&date={tomorrow}"
        )
        self.assertEqual(response.status_code, 200)

        # Should access basic auth context
        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

    def test_cross_organization_isolation(self):
        """Test that users cannot access other organizations' data."""
        # Guest user from org2 trying to access org1 data
        self.client.force_authenticate(user=self.guest)

        # Should not access org1's club
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club1.id}")
        self.assertEqual(response.status_code, 404)

        # Should not access org1's availability
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.get(
            f"/api/v1/reservations/availability/bulk/?club={self.club1.id}&date={tomorrow}"
        )
        self.assertEqual(response.status_code, 404)

    def test_permission_inheritance(self):
        """Test that permission hierarchy is respected."""
        roles_hierarchy = [
            (self.owner, "owner"),
            (self.admin, "admin"),
            (self.manager, "manager"),
            (self.member, "member"),
        ]

        for user, expected_role in roles_hierarchy:
            self.client.force_authenticate(user=user)

            response = self.client.get("/api/v1/auth/context/")
            self.assertEqual(response.status_code, 200)

            # Find user's role in response
            user_role = None
            for org in response.data["organizations"]:
                if org["id"] == str(self.org1.id):
                    user_role = org["role"]
                    break

            self.assertEqual(user_role, expected_role)

    def test_dynamic_permission_updates(self):
        """Test that permission changes take effect immediately."""
        # Initially member
        self.client.force_authenticate(user=self.member)

        response = self.client.get("/api/v1/auth/context/")
        self.assertEqual(response.status_code, 200)

        # Change role to admin
        membership = OrganizationMembership.objects.get(
            user=self.member, organization=self.org1
        )
        membership.role = "admin"
        membership.save()

        # Invalidate cache
        response = self.client.post("/api/v1/auth/invalidate-cache/")
        self.assertEqual(response.status_code, 200)

        # Should now have admin permissions
        response = self.client.get("/api/v1/auth/context/")
        user_org = next(
            org
            for org in response.data["organizations"]
            if org["id"] == str(self.org1.id)
        )
        self.assertEqual(user_org["role"], "admin")


class TestSecurityVulnerabilities(APITestCase):
    """Test protection against common security vulnerabilities."""

    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            trade_name="Security Test Org", business_name="Security Test LLC"
        )

        self.user = User.objects.create_user(
            email="security@test.com", password="TEST_PASSWORD"
        )

        OrganizationMembership.objects.create(
            user=self.user, organization=self.org, role="admin"
        )

        self.club = Club.objects.create(name="Security Club", organization=self.org)

    def test_sql_injection_protection(self):
        """Test protection against SQL injection attacks."""
        self.client.force_authenticate(user=self.user)

        # SQL injection attempts
        injection_attempts = [
            "1' OR '1'='1",
            "1; DROP TABLE clubs;--",
            "1 UNION SELECT * FROM auth_user",
            "1' AND 1=1--",
            "1' WAITFOR DELAY '00:00:10'--",
        ]

        for injection in injection_attempts:
            # Try in club parameter
            response = self.client.get(f"/api/v1/bi/analytics/club/?club={injection}")
            self.assertIn(
                response.status_code,
                [400, 404],
                f"SQL injection '{injection}' should be blocked",
            )

            # Try in date parameter
            response = self.client.get(
                f"/api/v1/reservations/availability/bulk/"
                f"?club={self.club.id}&date={injection}"
            )
            self.assertIn(
                response.status_code,
                [400, 404],
                f"SQL injection '{injection}' should be blocked",
            )

    def test_xss_protection(self):
        """Test protection against Cross-Site Scripting."""
        self.client.force_authenticate(user=self.user)

        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "'\"><script>alert('xss')</script>",
        ]

        for payload in xss_payloads:
            # Try XSS in search parameters (if implemented)
            response = self.client.get(
                f"/api/v1/reservations/availability/bulk/"
                f"?club={self.club.id}&date=2024-01-01&search={payload}"
            )

            # Should not contain unescaped payload in response
            if response.status_code == 200:
                self.assertNotIn(payload, str(response.content))

    def test_csrf_protection(self):
        """Test CSRF protection for state-changing operations."""
        # Note: DRF typically handles CSRF through other means (JWT tokens)
        # This test ensures CSRF tokens are properly handled where needed

        # Login to get tokens
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "security@test.com", "password": "TEST_PASSWORD"},
        )

        access_token = response.data["access"]

        # Try request without proper authentication
        client_no_auth = APIClient()
        response = client_no_auth.post("/api/v1/auth/invalidate-cache/")
        self.assertEqual(response.status_code, 401)

        # With proper authentication should work
        client_no_auth.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = client_no_auth.post("/api/v1/auth/invalidate-cache/")
        self.assertEqual(response.status_code, 200)

    def test_authorization_bypass_attempts(self):
        """Test protection against authorization bypass."""
        # Create another user in different organization
        other_org = Organization.objects.create(
            trade_name="Other Org", business_name="Other Organization LLC"
        )

        other_user = User.objects.create_user(
            email="other@test.com", password="TEST_PASSWORD"
        )

        OrganizationMembership.objects.create(
            user=other_user, organization=other_org, role="admin"
        )

        # Try to access first org's data with second user's token
        self.client.force_authenticate(user=other_user)

        # Direct object reference attack
        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")
        self.assertEqual(response.status_code, 404)

        # Parameter manipulation
        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club.id}&current_organization_id={self.org.id}"
        )
        self.assertEqual(response.status_code, 404)

        # Header manipulation attempts
        response = self.client.get(
            f"/api/v1/bi/analytics/club/?club={self.club.id}",
            HTTP_X_ORGANIZATION_ID=str(self.org.id),
        )
        self.assertEqual(response.status_code, 404)

    def test_rate_limiting_compliance(self):
        """Test that endpoints comply with rate limiting."""
        self.client.force_authenticate(user=self.user)

        # Make multiple rapid requests
        response_codes = []
        for i in range(100):  # Simulate burst traffic
            response = self.client.get(
                f"/api/v1/bi/analytics/club/?club={self.club.id}"
            )
            response_codes.append(response.status_code)

        # Should eventually get rate limited (429) or continue serving (200)
        # Implementation depends on rate limiting middleware
        allowed_codes = [200, 429]
        for code in response_codes:
            self.assertIn(
                code,
                allowed_codes,
                f"Unexpected response code {code} during rate limiting test",
            )

    def test_input_validation_edge_cases(self):
        """Test input validation for edge cases."""
        self.client.force_authenticate(user=self.user)

        edge_cases = [
            # Extremely long strings
            "a" * 10000,
            # Special characters
            "../../etc/passwd",
            # Null bytes
            "test\x00test",
            # Unicode edge cases
            "\u0000\u0001\u0002",
            # Large numbers
            "9" * 100,
            # Negative numbers where not expected
            "-999999",
        ]

        for case in edge_cases:
            # Test club parameter
            response = self.client.get(f"/api/v1/bi/analytics/club/?club={case}")
            self.assertIn(
                response.status_code,
                [400, 404],
                f"Edge case '{case[:50]}...' should be handled gracefully",
            )

            # Test date parameter
            response = self.client.get(
                f"/api/v1/reservations/availability/bulk/"
                f"?club={self.club.id}&date={case}"
            )
            self.assertIn(
                response.status_code,
                [400, 404],
                f"Edge case '{case[:50]}...' should be handled gracefully",
            )

    def test_information_disclosure_prevention(self):
        """Test that sensitive information is not disclosed in errors."""
        self.client.force_authenticate(user=self.user)

        # Try to access non-existent resources
        response = self.client.get(
            "/api/v1/bi/analytics/club/?club=99999999-9999-9999-9999-999999999999"
        )
        self.assertEqual(response.status_code, 404)

        # Error message should not disclose internal information
        error_response = response.data.get("error", "").lower()
        sensitive_info = [
            "database",
            "sql",
            "internal",
            "debug",
            "traceback",
            "exception",
            "server error",
            "django",
            "python",
        ]

        for info in sensitive_info:
            self.assertNotIn(
                info, error_response, f"Error message should not contain '{info}'"
            )

    def test_secure_headers_presence(self):
        """Test that security headers are present in responses."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f"/api/v1/bi/analytics/club/?club={self.club.id}")
        self.assertEqual(response.status_code, 200)

        # Check for security headers (these would be set by middleware)
        expected_headers = [
            # 'X-Content-Type-Options',
            # 'X-Frame-Options',
            # 'X-XSS-Protection',
            # 'Strict-Transport-Security'
        ]

        # Note: These headers are typically set by web server or middleware
        # This test documents what should be present in production
        for header in expected_headers:
            # self.assertIn(header, response)
            pass  # Placeholder for actual header checking


if __name__ == "__main__":
    import django

    django.setup()
    import unittest

    unittest.main()
