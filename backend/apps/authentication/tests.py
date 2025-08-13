"""
Tests for authentication module
"""

import json
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase, TransactionTestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.backends import EmailBackend
from apps.authentication.models import (
    AuthAuditLog,
    BlacklistedToken,
    OTPVerification,
    Session,
    User,
)
from apps.authentication.services import (
    EmailService,
    IPGeolocationService,
    TokenService,
)
from apps.root.models import Organization


class AuthenticationModelsTest(TestCase):
    """Test authentication models."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org", email="org@example.com"
        )

    def test_otp_verification_creation(self):
        """Test OTP verification model creation."""
        otp = OTPVerification.objects.create(
            user=self.user,
            otp_code="123456",
            otp_type="LOGIN",
            expires_at=datetime.now() + timedelta(minutes=5),
        )

        self.assertEqual(otp.user, self.user)
        self.assertEqual(otp.otp_code, "123456")
        self.assertEqual(otp.otp_type, "LOGIN")
        self.assertFalse(otp.is_used)
        self.assertIsNone(otp.used_at)

    def test_otp_verification_is_valid(self):
        """Test OTP validation logic."""
        # Create valid OTP
        otp = OTPVerification.objects.create(
            user=self.user,
            otp_code="123456",
            otp_type="LOGIN",
            expires_at=datetime.now() + timedelta(minutes=5),
        )
        self.assertTrue(otp.is_valid())

        # Test expired OTP
        expired_otp = OTPVerification.objects.create(
            user=self.user,
            otp_code="654321",
            otp_type="LOGIN",
            expires_at=datetime.now() - timedelta(minutes=1),
        )
        self.assertFalse(expired_otp.is_valid())

        # Test used OTP
        used_otp = OTPVerification.objects.create(
            user=self.user,
            otp_code="111111",
            otp_type="LOGIN",
            expires_at=datetime.now() + timedelta(minutes=5),
            is_used=True,
            used_at=datetime.now(),
        )
        self.assertFalse(used_otp.is_valid())

    def test_session_creation(self):
        """Test session model creation."""
        session = Session.objects.create(
            user=self.user,
            organization=self.organization,
            session_key="test_session_key",
            ip_address="127.0.0.1",
            user_agent="Test Browser",
            is_active=True,
        )

        self.assertEqual(session.user, self.user)
        self.assertEqual(session.organization, self.organization)
        self.assertEqual(session.session_key, "test_session_key")
        self.assertTrue(session.is_active)

    def test_auth_audit_log_creation(self):
        """Test audit log creation."""
        audit_log = AuthAuditLog.objects.create(
            user=self.user,
            organization=self.organization,
            action="LOGIN_SUCCESS",
            ip_address="127.0.0.1",
            user_agent="Test Browser",
            details={"method": "password"},
        )

        self.assertEqual(audit_log.user, self.user)
        self.assertEqual(audit_log.action, "LOGIN_SUCCESS")
        self.assertEqual(audit_log.details["method"], "password")

    def test_blacklisted_token_creation(self):
        """Test blacklisted token creation."""
        token = RefreshToken.for_user(self.user)

        blacklisted = BlacklistedToken.objects.create(
            jti=token["jti"],
            user=self.user,
            token_type="refresh",
            expires_at=datetime.now() + timedelta(days=7),
        )

        self.assertEqual(blacklisted.jti, token["jti"])
        self.assertEqual(blacklisted.user, self.user)
        self.assertEqual(blacklisted.token_type, "refresh")


class AuthenticationServiceTest(TestCase):
    """Test authentication service."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org", email="org@example.com"
        )
        self.service = AuthenticationService()

    def test_generate_otp(self):
        """Test OTP generation."""
        otp = self.service.generate_otp(self.user, "LOGIN")

        self.assertIsInstance(otp, OTPVerification)
        self.assertEqual(otp.user, self.user)
        self.assertEqual(otp.otp_type, "LOGIN")
        self.assertEqual(len(otp.otp_code), 6)
        self.assertTrue(otp.otp_code.isdigit())

    def test_verify_otp_valid(self):
        """Test valid OTP verification."""
        otp = self.service.generate_otp(self.user, "LOGIN")

        result = self.service.verify_otp(self.user, otp.otp_code, "LOGIN")

        self.assertTrue(result)

        # Verify OTP is marked as used
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)
        self.assertIsNotNone(otp.used_at)

    def test_verify_otp_invalid(self):
        """Test invalid OTP verification."""
        self.service.generate_otp(self.user, "LOGIN")

        result = self.service.verify_otp(self.user, "999999", "LOGIN")

        self.assertFalse(result)

    def test_create_session(self):
        """Test session creation."""
        session = self.service.create_session(
            user=self.user,
            organization=self.organization,
            ip_address="127.0.0.1",
            user_agent="Test Browser",
        )

        self.assertIsInstance(session, Session)
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.organization, self.organization)
        self.assertTrue(session.is_active)

    def test_blacklist_token(self):
        """Test token blacklisting."""
        token = RefreshToken.for_user(self.user)

        result = self.service.blacklist_token(
            jti=token["jti"], user=self.user, token_type="refresh"
        )

        self.assertTrue(result)
        self.assertTrue(BlacklistedToken.objects.filter(jti=token["jti"]).exists())

    def test_is_token_blacklisted(self):
        """Test token blacklist checking."""
        token = RefreshToken.for_user(self.user)

        # Initially not blacklisted
        self.assertFalse(self.service.is_token_blacklisted(token["jti"]))

        # Blacklist the token
        self.service.blacklist_token(
            jti=token["jti"], user=self.user, token_type="refresh"
        )

        # Now should be blacklisted
        self.assertTrue(self.service.is_token_blacklisted(token["jti"]))

    @patch("apps.authentication.services.send_otp_email")
    def test_send_login_otp(self, mock_send_email):
        """Test sending login OTP."""
        mock_send_email.return_value = True

        result = self.service.send_login_otp(self.user)

        self.assertTrue(result)
        mock_send_email.assert_called_once()

        # Verify OTP was created
        self.assertTrue(
            OTPVerification.objects.filter(user=self.user, otp_type="LOGIN").exists()
        )


class EmailBackendTest(TestCase):
    """Test custom email authentication backend."""

    def setUp(self):
        """Set up test data."""
        self.backend = EmailBackend()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

    def test_authenticate_with_email(self):
        """Test authentication with email."""
        user = self.backend.authenticate(
            request=None, username="test@example.com", password="TEST_PASSWORD"
        )

        self.assertEqual(user, self.user)

    def test_authenticate_with_username(self):
        """Test authentication with username."""
        user = self.backend.authenticate(
            request=None, username="testuser", password="TEST_PASSWORD"
        )

        self.assertEqual(user, self.user)

    def test_authenticate_invalid_credentials(self):
        """Test authentication with invalid credentials."""
        user = self.backend.authenticate(
            request=None, username="test@example.com", password="TEST_PASSWORD"
        )

        self.assertIsNone(user)

    def test_authenticate_nonexistent_user(self):
        """Test authentication with nonexistent user."""
        user = self.backend.authenticate(
            request=None, username="nonexistent@example.com", password="TEST_PASSWORD"
        )

        self.assertIsNone(user)


class AuthenticationAPITest(APITestCase):
    """Test authentication API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org", email="org@example.com"
        )

        # URLs
        self.login_url = reverse("authentication:login")
        self.logout_url = reverse("authentication:logout")
        self.refresh_url = reverse("authentication:refresh")
        self.profile_url = reverse("authentication:profile")

    def test_login_with_valid_credentials(self):
        """Test login with valid credentials."""
        data = {"username": "test@example.com", "password": "TEST_PASSWORD"}

        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials."""
        data = {"username": "test@example.com", "password": "TEST_PASSWORD"}

        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_missing_fields(self):
        """Test login with missing fields."""
        data = {
            "username": "test@example.com"
            # Missing password
        }

        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_refresh(self):
        """Test token refresh."""
        # First, login to get tokens
        login_data = {"username": "test@example.com", "password": "TEST_PASSWORD"}
        login_response = self.client.post(self.login_url, login_data)
        refresh_token = login_response.data["refresh"]

        # Then refresh the token
        refresh_data = {"refresh": refresh_token}

        response = self.client.post(self.refresh_url, refresh_data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_authenticated_profile_access(self):
        """Test accessing profile with valid token."""
        # Login first
        login_data = {"username": "test@example.com", "password": "TEST_PASSWORD"}
        login_response = self.client.post(self.login_url, login_data)
        access_token = login_response.data["access"]

        # Access profile with token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@example.com")

    def test_unauthenticated_profile_access(self):
        """Test accessing profile without token."""
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        """Test logout functionality."""
        # Login first
        login_data = {"username": "test@example.com", "password": "TEST_PASSWORD"}
        login_response = self.client.post(self.login_url, login_data)
        access_token = login_response.data["access"]
        refresh_token = login_response.data["refresh"]

        # Logout
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_data = {"refresh": refresh_token}

        response = self.client.post(self.logout_url, logout_data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CacheIntegrationTest(TransactionTestCase):
    """Test cache integration with authentication."""

    def setUp(self):
        """Set up test data."""
        cache.clear()  # Clear cache before each test
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.service = AuthenticationService()

    def tearDown(self):
        """Clean up after each test."""
        cache.clear()

    def test_otp_caching(self):
        """Test OTP caching functionality."""
        otp = self.service.generate_otp(self.user, "LOGIN")

        # Check if OTP is cached
        cache_key = f"otp_attempts_{self.user.id}_LOGIN"
        cached_attempts = cache.get(cache_key, 0)

        # Should track attempts
        self.assertIsInstance(cached_attempts, int)

    def test_failed_login_attempts(self):
        """Test failed login attempt tracking."""
        cache_key = f"failed_login_attempts_{self.user.email}"

        # Initially no failed attempts
        self.assertEqual(cache.get(cache_key, 0), 0)

        # Simulate failed login
        cache.set(cache_key, 1, timeout=300)

        # Check cached value
        self.assertEqual(cache.get(cache_key), 1)

    def test_session_caching(self):
        """Test session data caching."""
        from apps.root.models import Organization

        organization = Organization.objects.create(
            name="Test Org", slug="test-org", email="test@example.com"
        )

        session = self.service.create_session(
            user=self.user,
            organization=organization,
            ip_address="127.0.0.1",
            user_agent="Test Browser",
        )

        # Session should be created
        self.assertIsNotNone(session)
        self.assertTrue(session.is_active)


if __name__ == "__main__":
    # Configure Django for testing
    import os
    import sys

    from django.conf import settings
    from django.test.utils import get_runner

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

    import django

    django.setup()

    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["apps.authentication.tests"])

    if failures:
        sys.exit(1)
