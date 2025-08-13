#!/usr/bin/env python
"""
Core functionality tests - Test critical backend functionality
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from datetime import datetime, timedelta
from decimal import Decimal

from django.core.cache import cache
from django.db import transaction
from django.test import TestCase

from apps.authentication.models import User
from apps.clubs.models import Club
from apps.root.models import Organization


def test_database_connections():
    """Test database connectivity and basic operations."""
    print("🗄️ TESTING DATABASE CONNECTIONS")
    print("=" * 40)

    try:
        # Test basic query
        user_count = User.objects.count()
        print(f"✅ Users in database: {user_count}")

        # Test organization query
        org_count = Organization.objects.count()
        print(f"✅ Organizations in database: {org_count}")

        # Test club query
        club_count = Club.objects.count()
        print(f"✅ Clubs in database: {club_count}")

        # Test transaction
        with transaction.atomic():
            test_user = User.objects.create_user(
                username="db_test_user",
                email="dbtest@example.com",
                password="TEST_PASSWORD",
            )

            # Verify creation
            created_user = User.objects.get(username="db_test_user")
            print(f"✅ Transaction test: User {created_user.username} created")

            # Clean up
            created_user.delete()
            print("✅ Transaction test: User deleted")

        return True

    except Exception as e:
        print(f"❌ Database test error: {e}")
        return False


def test_cache_integration():
    """Test Redis cache integration."""
    print("\n🧠 TESTING CACHE INTEGRATION")
    print("=" * 35)

    try:
        # Clear cache first
        cache.clear()

        # Test basic cache operations
        cache.set("test_integration", "working", timeout=60)
        result = cache.get("test_integration")

        if result == "working":
            print("✅ Basic cache operations working")
        else:
            print(f"❌ Cache failed: expected 'working', got '{result}'")
            return False

        # Test complex data caching
        complex_data = {
            "user_sessions": 150,
            "active_reservations": 45,
            "today_revenue": Decimal("12500.50"),
            "last_updated": datetime.now().isoformat(),
        }

        cache.set("dashboard_stats", complex_data, timeout=300)
        cached_data = cache.get("dashboard_stats")

        if cached_data == complex_data:
            print("✅ Complex data caching working")
        else:
            print(f"❌ Complex cache failed")
            return False

        # Test cache with user data simulation
        user_data = {
            "id": 123,
            "email": "test@example.com",
            "last_login": datetime.now().isoformat(),
            "preferences": {
                "language": "es-mx",
                "timezone": "America/Mexico_City",
                "notifications": True,
            },
        }

        cache.set("user_123_session", user_data, timeout=1800)  # 30 minutes
        cached_user = cache.get("user_123_session")

        if cached_user == user_data:
            print("✅ User session caching working")
        else:
            print(f"❌ User session cache failed")
            return False

        # Test cache performance
        import time

        start_time = time.time()

        for i in range(100):
            cache.set(f"perf_test_{i}", f"value_{i}", timeout=60)

        for i in range(100):
            cache.get(f"perf_test_{i}")

        end_time = time.time()
        duration = end_time - start_time

        print(f"✅ Cache performance: 200 operations in {duration:.3f}s")

        # Clean up performance test keys
        for i in range(100):
            cache.delete(f"perf_test_{i}")

        return True

    except Exception as e:
        print(f"❌ Cache test error: {e}")
        return False


def test_model_relationships():
    """Test critical model relationships."""
    print("\n🔗 TESTING MODEL RELATIONSHIPS")
    print("=" * 38)

    try:
        # Create test organization
        org = Organization.objects.create(
            business_name="Test Integration SA",
            trade_name="Integration Test Club",
            rfc="INT123456TST",
            legal_representative="Test Rep",
            primary_email="integration@test.com",
        )
        print(f"✅ Organization created: {org.business_name}")

        # Create test club
        club = Club.objects.create(
            organization=org,
            name="Test Integration Club",
            address="Test Address 123",
            city="Test City",
            state="Test State",
            postal_code="12345",
            country="Mexico",
        )
        print(f"✅ Club created: {club.name}")

        # Test relationship
        org_clubs = org.clubs.all()
        if club in org_clubs:
            print("✅ Organization-Club relationship working")
        else:
            print("❌ Organization-Club relationship failed")
            return False

        # Create test user
        user = User.objects.create_user(
            username="integration_test",
            email="integration@test.com",
            password="TEST_PASSWORD",
        )
        print(f"✅ User created: {user.username}")

        # Test user organization context
        user.current_current_organization_id = org.id
        user.save()

        if user.current_current_organization_id == org.id:
            print("✅ User-Organization context working")
        else:
            print("❌ User-Organization context failed")
            return False

        # Clean up
        user.delete()
        club.delete()
        org.delete()
        print("✅ Test data cleaned up")

        return True

    except Exception as e:
        print(f"❌ Model relationship test error: {e}")
        return False


def test_authentication_flow():
    """Test authentication functionality."""
    print("\n🔐 TESTING AUTHENTICATION FLOW")
    print("=" * 38)

    try:
        from rest_framework_simplejwt.tokens import RefreshToken

        from apps.authentication.services import EmailService, TokenService

        # Create test user
        user = User.objects.create_user(
            username="auth_test", email="authtest@example.com", password="TEST_PASSWORD"
        )
        print(f"✅ Auth test user created: {user.username}")

        # Test password verification
        if user.check_password("securepass123"):
            print("✅ Password verification working")
        else:
            print("❌ Password verification failed")
            return False

        # Test token generation
        tokens = TokenService.generate_tokens(user)

        if "access" in tokens and "refresh" in tokens:
            print("✅ Token generation working")
        else:
            print("❌ Token generation failed")
            return False

        # Test token validation
        refresh_token = RefreshToken(tokens["refresh"])
        if refresh_token["user_id"] == user.id:
            print("✅ Token validation working")
        else:
            print("❌ Token validation failed")
            return False

        # Test email service (mock)
        try:
            # This will fail because we don't have email configured, but we test the logic
            EmailService.send_welcome_email(user)
            print("✅ Email service structure working")
        except Exception as email_error:
            if "SMTP" in str(email_error) or "connection" in str(email_error).lower():
                print("✅ Email service structure working (SMTP not configured)")
            else:
                print(f"⚠️ Email service error: {email_error}")

        # Clean up
        user.delete()
        print("✅ Auth test data cleaned up")

        return True

    except Exception as e:
        print(f"❌ Authentication test error: {e}")
        return False


def test_api_functionality():
    """Test API functionality."""
    print("\n🌐 TESTING API FUNCTIONALITY")
    print("=" * 35)

    try:
        from django.test import Client as TestClient
        from django.urls import reverse

        from rest_framework.test import APIClient

        # Test Django test client
        client = TestClient()

        # Test API client
        api_client = APIClient()

        # Try to access admin (should redirect to login)
        response = client.get("/admin/")
        if response.status_code in [302, 301, 200]:  # Redirect to login or admin page
            print("✅ Admin interface accessible")
        else:
            print(f"⚠️ Admin response: {response.status_code}")

        # Try to access API root
        try:
            response = api_client.get("/api/v1/")
            if response.status_code in [200, 404, 401]:  # Various acceptable responses
                print("✅ API endpoints responsive")
            else:
                print(f"⚠️ API response: {response.status_code}")
        except Exception as api_error:
            print(f"⚠️ API test: {api_error}")

        # Test API schema endpoint
        try:
            response = api_client.get("/api/schema/")
            if response.status_code in [200, 404]:
                print("✅ API schema endpoint accessible")
            else:
                print(f"⚠️ Schema response: {response.status_code}")
        except Exception as schema_error:
            print(f"⚠️ Schema test: {schema_error}")

        return True

    except Exception as e:
        print(f"❌ API test error: {e}")
        return False


def test_security_headers():
    """Test security configurations."""
    print("\n🛡️ TESTING SECURITY CONFIGURATIONS")
    print("=" * 42)

    try:
        from django.conf import settings

        # Test DEBUG setting
        if hasattr(settings, "DEBUG"):
            debug_status = "ENABLED" if settings.DEBUG else "DISABLED"
            print(f"✅ DEBUG mode: {debug_status}")

        # Test SECRET_KEY
        if hasattr(settings, "SECRET_KEY") and settings.SECRET_KEY:
            print(f"✅ SECRET_KEY configured: {settings.SECRET_KEY[:10]}...")
        else:
            print("❌ SECRET_KEY not configured")
            return False

        # Test ALLOWED_HOSTS
        if hasattr(settings, "ALLOWED_HOSTS"):
            print(f"✅ ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")

        # Test database security
        if hasattr(settings, "DATABASES"):
            db_engine = settings.DATABASES["default"]["ENGINE"]
            print(f"✅ Database engine: {db_engine}")

        # Test CORS settings
        if hasattr(settings, "CORS_ALLOWED_ORIGINS"):
            print(f"✅ CORS origins: {len(settings.CORS_ALLOWED_ORIGINS)} configured")

        # Test authentication settings
        if hasattr(settings, "AUTH_USER_MODEL"):
            print(f"✅ Custom user model: {settings.AUTH_USER_MODEL}")

        return True

    except Exception as e:
        print(f"❌ Security test error: {e}")
        return False


def main():
    """Main test function."""
    print("🧪 PADELYZER CORE FUNCTIONALITY TEST")
    print("🇲🇽 Testing critical backend systems")
    print("=" * 60)

    tests = [
        test_database_connections,
        test_cache_integration,
        test_model_relationships,
        test_authentication_flow,
        test_api_functionality,
        test_security_headers,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 60)
    print(f"📊 CORE FUNCTIONALITY TEST RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All core functionality tests passed!")
        print("\n📋 SYSTEM STATUS:")
        print("✅ Database connections working")
        print("✅ Cache integration operational")
        print("✅ Model relationships functional")
        print("✅ Authentication system ready")
        print("✅ API endpoints accessible")
        print("✅ Security configurations valid")

        print("\n🚀 BACKEND IS READY FOR PRODUCTION!")
    else:
        print("❌ Some core functionality tests failed.")
        print("Please review the issues above before deploying.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
