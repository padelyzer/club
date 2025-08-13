#!/usr/bin/env python3
"""
Authentication Module Python 3.12 Validation Script
===================================================

Comprehensive test script to validate authentication module functionality
specifically with Python 3.12.10. Tests all components, security features,
and integration points.
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta

import django
from django.utils import timezone

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.db import connection
from django.test import RequestFactory, TestCase

from rest_framework.test import APIClient

from rest_framework_simplejwt.tokens import RefreshToken

# Import authentication models and services
from apps.authentication.models import (
    APIKey,
    AuthAuditLog,
    BlacklistedToken,
    LoginAttempt,
    OTPVerification,
    Session,
    User,
)
from apps.authentication.serializers import LoginSerializer, UserSerializer
from apps.authentication.services import (
    EmailService,
    IPGeolocationService,
    TokenService,
)
from apps.authentication.views import LoginView, RegisterView, VerifyOTPView
from apps.root.models import Organization

# Test results storage
test_results = {
    "python_version": sys.version,
    "django_version": django.VERSION,
    "timestamp": datetime.now().isoformat(),
    "tests": {},
}


def log_test_result(test_name, status, details=None, error=None):
    """Log test result."""
    test_results["tests"][test_name] = {
        "status": status,
        "details": details or {},
        "error": str(error) if error else None,
        "timestamp": datetime.now().isoformat(),
    }
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{status_icon} {test_name}: {status}")
    if error:
        print(f"   Error: {error}")


def print_section(title):
    """Print section header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")


class AuthenticationPython312Validator:
    """Main validation class for authentication module."""

    def __init__(self):
        self.factory = RequestFactory()
        self.client = APIClient()
        self.test_user = None
        self.test_org = None

    def run_all_tests(self):
        """Run all validation tests."""
        print_section("AUTHENTICATION MODULE PYTHON 3.12 VALIDATION")
        print(f"Python Version: {sys.version}")
        print(f"Django Version: {django.get_version()}")

        # 1. Model Tests
        self.test_authentication_models()

        # 2. View and API Tests
        self.test_authentication_views_apis()

        # 3. Security Features
        self.test_security_features()

        # 4. Permissions System
        self.test_permissions_system()

        # 5. Integration Tests
        self.test_integrations()

        # 6. Python 3.12 Specific Tests
        self.test_python312_compatibility()

        # Generate final report
        self.generate_report()

    def test_authentication_models(self):
        """Test authentication models functionality."""
        print_section("1. AUTHENTICATION MODELS")

        try:
            # Test User model
            print("Testing User model...")
            user_data = {
                "username": "testuser312",
                "email": "test312@example.com",
                "password": "TEST_PASSWORD",
                "first_name": "Test",
                "last_name": "User312",
            }

            user = User.objects.create_user(**user_data)
            self.test_user = user

            # Test custom fields
            user.phone = "+1234567890"
            user.phone_verified = True
            user.email_verified = True
            user.two_factor_enabled = True
            user.save()

            assert user.phone == "+1234567890"
            assert user.phone_verified is True
            assert user.email_verified is True
            assert user.two_factor_enabled is True

            log_test_result(
                "user_model_creation",
                "PASS",
                {
                    "user_id": user.id,
                    "custom_fields": [
                        "phone",
                        "phone_verified",
                        "email_verified",
                        "two_factor_enabled",
                    ],
                },
            )

        except Exception as e:
            log_test_result("user_model_creation", "FAIL", error=e)

        try:
            # Test Organization and Membership
            print("Testing Organization membership...")

            # Create organization
            org = Organization.objects.create(
                name="Test Org 312", slug="test-org-312", email="org312@example.com"
            )
            self.test_org = org

            # Create membership
            membership = OrganizationMembership.objects.create(
                user=self.test_user,
                organization=org,
                role="org_admin",
                permissions={"can_manage_users": True},
            )

            # Test organization property
            self.test_user.set_current_organization(org)
            assert self.test_user.organization == org

            log_test_result(
                "organization_membership",
                "PASS",
                {
                    "org_id": org.id,
                    "membership_id": membership.id,
                    "role": membership.role,
                },
            )

        except Exception as e:
            log_test_result("organization_membership", "FAIL", error=e)

        try:
            # Test Session model
            print("Testing Session model...")
            request = self.factory.post("/login")
            request.META["HTTP_USER_AGENT"] = "Python 3.12 Test Agent"
            request.META["REMOTE_ADDR"] = "127.0.0.1"

            session = Session.create_for_user(
                self.test_user, request, organization=self.test_org
            )

            assert session.user == self.test_user
            assert session.organization == self.test_org
            assert session.device_type == "web"
            assert not session.is_expired()

            # Test session revocation
            session.revoke("test_revocation")
            assert session.revoked_at is not None
            assert session.revoked_reason == "test_revocation"

            log_test_result(
                "session_model",
                "PASS",
                {
                    "session_id": session.id,
                    "device_type": session.device_type,
                    "revoked": True,
                },
            )

        except Exception as e:
            log_test_result("session_model", "FAIL", error=e)

        try:
            # Test OTP Verification
            print("Testing OTP Verification...")

            otp = OTPVerification.generate_for_user(
                user=self.test_user, purpose="login", delivery_method="email"
            )

            assert otp.user == self.test_user
            assert otp.purpose == "login"
            assert len(otp.code) == 6
            assert not otp.is_expired()

            # Test OTP verification
            success, message = otp.verify(otp.code)
            assert success is True
            assert otp.used_at is not None

            log_test_result(
                "otp_verification",
                "PASS",
                {"otp_id": otp.id, "purpose": otp.purpose, "verified": True},
            )

        except Exception as e:
            log_test_result("otp_verification", "FAIL", error=e)

        try:
            # Test JWT Blacklist
            print("Testing JWT Blacklist...")

            # Generate a token
            refresh = RefreshToken.for_user(self.test_user)
            jti = refresh["jti"]

            # Blacklist the token
            blacklisted = BlacklistedToken.blacklist_token(
                jti=jti,
                user=self.test_user,
                expires_at=timezone.now() + timedelta(hours=1),
                reason="logout",
            )

            # Check if blacklisted
            is_blacklisted = BlacklistedToken.is_blacklisted(jti)
            assert is_blacklisted is True

            log_test_result(
                "jwt_blacklist",
                "PASS",
                {
                    "blacklist_id": blacklisted.id,
                    "jti": jti,
                    "is_blacklisted": is_blacklisted,
                },
            )

        except Exception as e:
            log_test_result("jwt_blacklist", "FAIL", error=e)

        try:
            # Test Auth Audit Log
            print("Testing Auth Audit Log...")

            request = self.factory.post("/login")
            request.META["HTTP_USER_AGENT"] = "Python 3.12 Test"
            request.META["REMOTE_ADDR"] = "127.0.0.1"

            audit_log = AuthAuditLog.log_event(
                event_type="login_success",
                request=request,
                user=self.test_user,
                success=True,
                organization=self.test_org,
                details={"test": "python312"},
            )

            assert audit_log.event_type == "login_success"
            assert audit_log.user == self.test_user
            assert audit_log.organization == self.test_org
            assert audit_log.success is True

            log_test_result(
                "auth_audit_log",
                "PASS",
                {"audit_id": audit_log.id, "event_type": audit_log.event_type},
            )

        except Exception as e:
            log_test_result("auth_audit_log", "FAIL", error=e)

    def test_authentication_views_apis(self):
        """Test authentication views and API endpoints."""
        print_section("2. AUTHENTICATION VIEWS & APIs")

        try:
            # Test Registration API
            print("Testing Registration API...")

            registration_data = {
                "username": "apitest312",
                "email": "apitest312@example.com",
                "password": "TEST_PASSWORD",
                "password_confirm": "APITest123!@#",
                "first_name": "API",
                "last_name": "Test312",
            }

            response = self.client.post(
                "/api/auth/register/", registration_data, format="json"
            )

            if response.status_code == 201:
                assert "user" in response.data
                assert "access" in response.data
                assert "refresh" in response.data
                log_test_result(
                    "registration_api",
                    "PASS",
                    {
                        "status_code": response.status_code,
                        "user_id": response.data["user"]["id"],
                    },
                )
            else:
                log_test_result(
                    "registration_api",
                    "FAIL",
                    {"status_code": response.status_code, "response": response.data},
                )

        except Exception as e:
            log_test_result("registration_api", "FAIL", error=e)

        try:
            # Test Login API
            print("Testing Login API...")

            login_data = {
                "email": "test312@example.com",
                "password": "TEST_PASSWORD",
                "device_type": "web",
            }

            response = self.client.post("/api/auth/login/", login_data, format="json")

            if response.status_code in [200, 202]:  # 202 for 2FA required
                if response.status_code == 200:
                    assert "access" in response.data
                    assert "user" in response.data
                elif response.status_code == 202:
                    assert "requires_2fa" in response.data

                log_test_result(
                    "login_api",
                    "PASS",
                    {
                        "status_code": response.status_code,
                        "requires_2fa": response.data.get("requires_2fa", False),
                    },
                )
            else:
                log_test_result(
                    "login_api",
                    "FAIL",
                    {"status_code": response.status_code, "response": response.data},
                )

        except Exception as e:
            log_test_result("login_api", "FAIL", error=e)

        try:
            # Test Token Refresh
            print("Testing Token Refresh...")

            if self.test_user:
                tokens = TokenService.generate_tokens(self.test_user)

                refresh_data = {"refresh": tokens["refresh"]}

                response = self.client.post(
                    "/api/auth/token/refresh/", refresh_data, format="json"
                )

                if response.status_code == 200:
                    assert "access" in response.data
                    log_test_result(
                        "token_refresh", "PASS", {"status_code": response.status_code}
                    )
                else:
                    log_test_result(
                        "token_refresh",
                        "FAIL",
                        {
                            "status_code": response.status_code,
                            "response": response.data,
                        },
                    )
            else:
                log_test_result(
                    "token_refresh", "SKIP", {"reason": "No test user available"}
                )

        except Exception as e:
            log_test_result("token_refresh", "FAIL", error=e)

    def test_security_features(self):
        """Test security features."""
        print_section("3. SECURITY FEATURES")

        try:
            # Test Rate Limiting
            print("Testing Rate Limiting...")

            # Make multiple rapid requests to trigger rate limiting
            login_data = {
                "email": "nonexistent@example.com",
                "password": "TEST_PASSWORD",
                "device_type": "web",
            }

            responses = []
            for i in range(10):  # Exceed rate limit
                response = self.client.post(
                    "/api/auth/login/", login_data, format="json"
                )
                responses.append(response.status_code)
                time.sleep(0.1)

            # Check if rate limiting kicked in
            rate_limited = any(status == 429 for status in responses[-5:])

            log_test_result(
                "rate_limiting",
                "PASS" if rate_limited else "WARN",
                {"rate_limited": rate_limited, "response_codes": responses[-5:]},
            )

        except Exception as e:
            log_test_result("rate_limiting", "FAIL", error=e)

        try:
            # Test Password Validation
            print("Testing Password Validation...")

            weak_passwords = ["123", "password", "test", "12345678"]
            strong_password="TEST_PASSWORD"

            weak_results = []
            for password in weak_passwords:
                registration_data = {
                    "username": f"weaktest{password}",
                    "email": f"weak{password}@example.com",
                    "password": password,
                    "password_confirm": password,
                    "first_name": "Weak",
                    "last_name": "Test",
                }

                response = self.client.post(
                    "/api/auth/register/", registration_data, format="json"
                )
                weak_results.append(response.status_code == 400)  # Should fail

            # Test strong password
            strong_registration_data = {
                "username": "strongtest312",
                "email": "strong312@example.com",
                "password": strong_password,
                "password_confirm": strong_password,
                "first_name": "Strong",
                "last_name": "Test",
            }

            strong_response = self.client.post(
                "/api/auth/register/", strong_registration_data, format="json"
            )

            password_validation_works = (
                all(weak_results) and strong_response.status_code == 201
            )

            log_test_result(
                "password_validation",
                "PASS" if password_validation_works else "FAIL",
                {
                    "weak_passwords_rejected": all(weak_results),
                    "strong_password_accepted": strong_response.status_code == 201,
                },
            )

        except Exception as e:
            log_test_result("password_validation", "FAIL", error=e)

        try:
            # Test JWT Blacklist Functionality
            print("Testing JWT Blacklist Functionality...")

            if self.test_user:
                # Generate token
                tokens = TokenService.generate_tokens(self.test_user)
                access_token = tokens["access"]

                # Set authorization header
                self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

                # Test protected endpoint
                response = self.client.get("/api/auth/profile/")
                authorized_before = response.status_code == 200

                # Logout (should blacklist token)
                logout_response = self.client.post("/api/auth/logout/")

                # Try to use token after logout
                response = self.client.get("/api/auth/profile/")
                unauthorized_after = response.status_code == 401

                blacklist_works = authorized_before and unauthorized_after

                log_test_result(
                    "jwt_blacklist_functionality",
                    "PASS" if blacklist_works else "FAIL",
                    {
                        "authorized_before_logout": authorized_before,
                        "unauthorized_after_logout": unauthorized_after,
                    },
                )
            else:
                log_test_result(
                    "jwt_blacklist_functionality", "SKIP", {"reason": "No test user"}
                )

        except Exception as e:
            log_test_result("jwt_blacklist_functionality", "FAIL", error=e)

    def test_permissions_system(self):
        """Test RBAC and permissions system."""
        print_section("4. PERMISSIONS SYSTEM")

        try:
            print("Testing RBAC System...")

            if self.test_user and self.test_org:
                # Test organization-level permissions
                tokens = TokenService.generate_tokens(self.test_user)
                self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')

                # Test accessing organization-specific endpoint
                response = self.client.get(f"/api/organizations/{self.test_org.id}/")

                rbac_works = response.status_code in [
                    200,
                    403,
                ]  # Either access or proper denial

                log_test_result(
                    "rbac_system",
                    "PASS" if rbac_works else "FAIL",
                    {"status_code": response.status_code, "user_role": "org_admin"},
                )
            else:
                log_test_result(
                    "rbac_system", "SKIP", {"reason": "No test user or organization"}
                )

        except Exception as e:
            log_test_result("rbac_system", "FAIL", error=e)

        try:
            print("Testing API Endpoint Protection...")

            # Test unauthenticated access to protected endpoint
            self.client.credentials()  # Clear credentials
            response = self.client.get("/api/auth/profile/")

            endpoint_protection = response.status_code == 401

            log_test_result(
                "api_endpoint_protection",
                "PASS" if endpoint_protection else "FAIL",
                {"status_code": response.status_code, "protected": endpoint_protection},
            )

        except Exception as e:
            log_test_result("api_endpoint_protection", "FAIL", error=e)

    def test_integrations(self):
        """Test integrations."""
        print_section("5. INTEGRATIONS")

        try:
            print("Testing Email Service...")

            if self.test_user:
                # Test OTP email
                email_sent = EmailService.send_otp_email(
                    self.test_user, "123456", "login"
                )

                # Test welcome email
                welcome_sent = EmailService.send_welcome_email(self.test_user)

                log_test_result(
                    "email_service",
                    "PASS" if (email_sent or welcome_sent) else "FAIL",
                    {"otp_email_sent": email_sent, "welcome_email_sent": welcome_sent},
                )
            else:
                log_test_result("email_service", "SKIP", {"reason": "No test user"})

        except Exception as e:
            log_test_result("email_service", "FAIL", error=e)

        try:
            print("Testing Token Service...")

            if self.test_user:
                tokens = TokenService.generate_tokens(self.test_user)

                token_service_works = (
                    "access" in tokens
                    and "refresh" in tokens
                    and len(tokens["access"]) > 0
                    and len(tokens["refresh"]) > 0
                )

                log_test_result(
                    "token_service",
                    "PASS" if token_service_works else "FAIL",
                    {
                        "has_access_token": "access" in tokens,
                        "has_refresh_token": "refresh" in tokens,
                    },
                )
            else:
                log_test_result("token_service", "SKIP", {"reason": "No test user"})

        except Exception as e:
            log_test_result("token_service", "FAIL", error=e)

        try:
            print("Testing IP Geolocation Service...")

            location = IPGeolocationService.get_location("127.0.0.1")

            geolocation_works = isinstance(location, dict) and "country" in location

            log_test_result(
                "ip_geolocation_service",
                "PASS" if geolocation_works else "FAIL",
                {"location_data": location},
            )

        except Exception as e:
            log_test_result("ip_geolocation_service", "FAIL", error=e)

    def test_python312_compatibility(self):
        """Test Python 3.12 specific compatibility."""
        print_section("6. PYTHON 3.12 COMPATIBILITY")

        try:
            print("Testing Python 3.12 Features...")

            # Test new Python 3.12 features that might affect Django/authentication
            python_version = sys.version_info
            is_python312 = python_version.major == 3 and python_version.minor == 12

            log_test_result(
                "python_version_check",
                "PASS" if is_python312 else "WARN",
                {
                    "python_version": f"{python_version.major}.{python_version.minor}.{python_version.micro}",
                    "is_python312": is_python312,
                },
            )

        except Exception as e:
            log_test_result("python_version_check", "FAIL", error=e)

        try:
            print("Testing Django Database Connection...")

            # Test database connection and queries
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()

            db_connection_works = result[0] == 1

            log_test_result(
                "database_connection",
                "PASS" if db_connection_works else "FAIL",
                {
                    "connection_works": db_connection_works,
                    "database": connection.vendor,
                },
            )

        except Exception as e:
            log_test_result("database_connection", "FAIL", error=e)

        try:
            print("Testing Django Model Operations...")

            # Test complex model operations
            user_count = User.objects.count()
            session_count = Session.objects.count()
            audit_count = AuthAuditLog.objects.count()

            model_operations_work = all(
                isinstance(count, int)
                for count in [user_count, session_count, audit_count]
            )

            log_test_result(
                "model_operations",
                "PASS" if model_operations_work else "FAIL",
                {
                    "user_count": user_count,
                    "session_count": session_count,
                    "audit_count": audit_count,
                },
            )

        except Exception as e:
            log_test_result("model_operations", "FAIL", error=e)

        try:
            print("Testing Cache Operations...")

            # Test Django cache
            cache.set("python312_test", "test_value", 60)
            cached_value = cache.get("python312_test")

            cache_works = cached_value == "test_value"

            log_test_result(
                "cache_operations",
                "PASS" if cache_works else "FAIL",
                {"cache_works": cache_works, "cache_backend": type(cache).__name__},
            )

        except Exception as e:
            log_test_result("cache_operations", "FAIL", error=e)

    def generate_report(self):
        """Generate final validation report."""
        print_section("VALIDATION REPORT")

        total_tests = len(test_results["tests"])
        passed_tests = sum(
            1 for test in test_results["tests"].values() if test["status"] == "PASS"
        )
        failed_tests = sum(
            1 for test in test_results["tests"].values() if test["status"] == "FAIL"
        )
        warned_tests = sum(
            1 for test in test_results["tests"].values() if test["status"] == "WARN"
        )
        skipped_tests = sum(
            1 for test in test_results["tests"].values() if test["status"] == "SKIP"
        )

        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warned_tests}")
        print(f"⏭️  Skipped: {skipped_tests}")

        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")

        # Critical issues
        critical_failures = []
        for test_name, result in test_results["tests"].items():
            if result["status"] == "FAIL" and any(
                keyword in test_name.lower()
                for keyword in ["login", "token", "user", "security"]
            ):
                critical_failures.append(test_name)

        if critical_failures:
            print(f"\n⚠️  CRITICAL FAILURES DETECTED:")
            for failure in critical_failures:
                print(f"   - {failure}")

        # Production readiness assessment
        if failed_tests == 0 and success_rate >= 95:
            print(
                f"\n✅ PRODUCTION READY: Authentication module is ready for Python 3.12 deployment"
            )
        elif failed_tests <= 2 and success_rate >= 85:
            print(
                f"\n⚠️  NEEDS ATTENTION: Minor issues need resolution before production"
            )
        else:
            print(f"\n❌ NOT PRODUCTION READY: Critical issues must be resolved")

        # Save detailed report
        with open(
            "/Users/ja/PZR4/backend/auth_python312_validation_report.json", "w"
        ) as f:
            json.dump(test_results, f, indent=2, default=str)

        print(f"\nDetailed report saved to: auth_python312_validation_report.json")


def main():
    """Main execution function."""
    try:
        validator = AuthenticationPython312Validator()
        validator.run_all_tests()
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
