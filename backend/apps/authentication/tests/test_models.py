"""
Comprehensive model tests for authentication app.
"""

import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import uuid

# Import models from the app
from apps.authentication.models import (
    User, OrganizationMembership, Session, LoginAttempt, 
    OTPVerification, APIKey, BlacklistedToken, AuthAuditLog
)

# Import factories
from tests.factories import (
    UserFactory, OrganizationFactory, OrganizationMembershipFactory
)

User = get_user_model()

@pytest.mark.django_db
class TestUserModel(TestCase):
    """Test cases for User model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        if OrganizationFactory:
            self.organization = OrganizationFactory()
        
    def test_user_creation(self):
        """Test user creation with all fields."""
        user = UserFactory(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone="+52-123-456-7890"
        )
        
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.email, "test@example.com")
        self.assertTrue(user.check_password("testpass123"))
        self.assertTrue(user.email_verified)
        self.assertFalse(user.phone_verified)
        self.assertFalse(user.two_factor_enabled)
        
    def test_user_str_representation(self):
        """Test user string representation."""
        user = UserFactory(
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        expected = "John Doe (john@example.com)"
        self.assertEqual(str(user), expected)
        
    def test_user_email_uniqueness(self):
        """Test that email addresses must be unique."""
        UserFactory(email="test@example.com")
        
        with self.assertRaises(IntegrityError):
            UserFactory(email="test@example.com")
            
    def test_user_organization_property(self):
        """Test user organization property."""
        if not OrganizationFactory or not OrganizationMembershipFactory:
            self.skipTest("Organization factories not available")
            
        user = UserFactory()
        org = OrganizationFactory()
        membership = OrganizationMembershipFactory(
            user=user, 
            organization=org
        )
        
        # Should return the organization from membership
        self.assertEqual(user.organization, org)
        
    def test_user_set_current_organization(self):
        """Test setting current organization."""
        if not OrganizationFactory or not OrganizationMembershipFactory:
            self.skipTest("Organization factories not available")
            
        user = UserFactory()
        org = OrganizationFactory()
        membership = OrganizationMembershipFactory(
            user=user, 
            organization=org
        )
        
        result = user.set_current_organization(org)
        self.assertTrue(result)
        self.assertEqual(user.current_organization_id, org.id)


@pytest.mark.django_db 
class TestOrganizationMembershipModel(TestCase):
    """Test cases for OrganizationMembership model."""
    
    def setUp(self):
        """Set up test data."""
        if not OrganizationFactory or not OrganizationMembershipFactory:
            self.skipTest("Organization factories not available")
        
        self.user = UserFactory()
        self.organization = OrganizationFactory()
        
    def test_membership_creation(self):
        """Test membership creation."""
        if not OrganizationMembershipFactory:
            self.skipTest("OrganizationMembershipFactory not available")
            
        membership = OrganizationMembershipFactory(
            user=self.user,
            organization=self.organization,
            role="org_admin"
        )
        
        self.assertEqual(membership.user, self.user)
        self.assertEqual(membership.organization, self.organization)
        self.assertEqual(membership.role, "org_admin")
        self.assertTrue(membership.is_active)
        
    def test_membership_str_representation(self):
        """Test membership string representation."""
        if not OrganizationMembershipFactory:
            self.skipTest("OrganizationMembershipFactory not available")
            
        membership = OrganizationMembershipFactory(
            user=self.user,
            organization=self.organization,
            role="org_admin"
        )
        
        expected = f"{self.user} - {self.organization} (Organization Admin)"
        self.assertEqual(str(membership), expected)
        
    def test_membership_uniqueness(self):
        """Test user-organization combination is unique."""
        if not OrganizationMembershipFactory:
            self.skipTest("OrganizationMembershipFactory not available")
            
        OrganizationMembershipFactory(
            user=self.user,
            organization=self.organization
        )
        
        with self.assertRaises(IntegrityError):
            OrganizationMembershipFactory(
                user=self.user,
                organization=self.organization
            )


@pytest.mark.django_db
class TestOTPVerificationModel(TestCase):
    """Test cases for OTPVerification model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        
    def test_otp_generation(self):
        """Test OTP generation for user."""
        otp = OTPVerification.generate_for_user(
            user=self.user,
            purpose="login",
            delivery_method="email"
        )
        
        self.assertEqual(otp.user, self.user)
        self.assertEqual(otp.purpose, "login")
        self.assertEqual(otp.delivery_method, "email")
        self.assertEqual(len(otp.code), 6)
        self.assertTrue(otp.code.isdigit())
        self.assertEqual(otp.sent_to, self.user.email)
        self.assertTrue(otp.is_active)
        
    def test_otp_verification_success(self):
        """Test successful OTP verification."""
        otp = OTPVerification.generate_for_user(
            user=self.user,
            purpose="login"
        )
        
        success, message = otp.verify(otp.code)
        self.assertTrue(success)
        self.assertEqual(message, "Code verified successfully")
        self.assertFalse(otp.is_active)
        self.assertIsNotNone(otp.used_at)
        
    def test_otp_verification_invalid_code(self):
        """Test OTP verification with invalid code."""
        otp = OTPVerification.generate_for_user(
            user=self.user,
            purpose="login"
        )
        
        success, message = otp.verify("wrong_code")
        self.assertFalse(success)
        self.assertEqual(message, "Invalid code")
        self.assertEqual(otp.attempts, 1)
        
    def test_otp_max_attempts(self):
        """Test OTP max attempts reached."""
        otp = OTPVerification.generate_for_user(
            user=self.user,
            purpose="login"
        )
        
        # Make 3 failed attempts
        for _ in range(3):
            otp.verify("wrong_code")
            
        success, message = otp.verify("wrong_code")
        self.assertFalse(success)
        self.assertEqual(message, "Maximum attempts reached")
        
    def test_otp_str_representation(self):
        """Test OTP string representation."""
        otp = OTPVerification.generate_for_user(
            user=self.user,
            purpose="login",
            delivery_method="email"
        )
        
        expected = f"{self.user} - login (email)"
        self.assertEqual(str(otp), expected)


@pytest.mark.django_db
class TestBlacklistedTokenModel(TestCase):
    """Test cases for BlacklistedToken model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        
    def test_token_blacklisting(self):
        """Test token blacklisting."""
        jti = "test_token_id"
        expires_at = timezone.now() + timedelta(hours=1)
        
        token = BlacklistedToken.blacklist_token(
            jti=jti,
            user=self.user,
            expires_at=expires_at,
            reason="logout"
        )
        
        self.assertEqual(token.jti, jti)
        self.assertEqual(token.user, self.user)
        self.assertEqual(token.reason, "logout")
        self.assertEqual(token.token_expires_at, expires_at)
        
    def test_is_blacklisted(self):
        """Test checking if token is blacklisted."""
        jti = "test_token_id"
        expires_at = timezone.now() + timedelta(hours=1)
        
        # Initially not blacklisted
        self.assertFalse(BlacklistedToken.is_blacklisted(jti))
        
        # Blacklist the token
        BlacklistedToken.blacklist_token(
            jti=jti,
            user=self.user,
            expires_at=expires_at
        )
        
        # Now should be blacklisted
        self.assertTrue(BlacklistedToken.is_blacklisted(jti))
        
    def test_cleanup_expired_tokens(self):
        """Test cleanup of expired tokens."""
        # Create expired token
        expired_jti = "expired_token"
        expired_time = timezone.now() - timedelta(hours=1)
        
        BlacklistedToken.blacklist_token(
            jti=expired_jti,
            user=self.user,
            expires_at=expired_time
        )
        
        # Create non-expired token
        valid_jti = "valid_token"
        valid_time = timezone.now() + timedelta(hours=1)
        
        BlacklistedToken.blacklist_token(
            jti=valid_jti,
            user=self.user,
            expires_at=valid_time
        )
        
        # Cleanup should remove only expired token
        cleaned_count = BlacklistedToken.cleanup_expired()
        self.assertEqual(cleaned_count, 1)
        
        # Valid token should still exist
        self.assertTrue(BlacklistedToken.is_blacklisted(valid_jti))
        

@pytest.mark.django_db
class TestAuthAuditLogModel(TestCase):
    """Test cases for AuthAuditLog model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        
    def test_audit_log_creation(self):
        """Test audit log entry creation."""
        log = AuthAuditLog.log_event(
            event_type="login_success",
            user=self.user,
            success=True,
            ip_address="192.168.1.1",
            user_agent="TestBrowser/1.0"
        )
        
        self.assertEqual(log.event_type, "login_success")
        self.assertEqual(log.user, self.user)
        self.assertTrue(log.success)
        self.assertEqual(log.ip_address, "192.168.1.1")
        self.assertEqual(log.user_agent, "TestBrowser/1.0")
        
    def test_audit_log_failed_login(self):
        """Test audit log for failed login."""
        log = AuthAuditLog.log_event(
            event_type="login_failed",
            success=False,
            attempted_email="test@example.com",
            ip_address="192.168.1.1",
            user_agent="TestBrowser/1.0"
        )
        
        self.assertEqual(log.event_type, "login_failed")
        self.assertIsNone(log.user)
        self.assertFalse(log.success)
        self.assertEqual(log.attempted_email, "test@example.com")
        
    def test_audit_log_str_representation(self):
        """Test audit log string representation."""
        log = AuthAuditLog.log_event(
            event_type="login_success",
            user=self.user,
            ip_address="192.168.1.1",
            user_agent="TestBrowser/1.0"
        )
        
        expected_start = f"{self.user.email} - Login Success -"
        self.assertTrue(str(log).startswith(expected_start))
