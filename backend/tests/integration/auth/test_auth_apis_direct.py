#!/usr/bin/env python3
"""
Direct API Test for Authentication Endpoints
============================================

Test authentication APIs directly using Django test client
to validate Python 3.12 compatibility.
"""

import json
import os
import sys

import django
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.authentication.models import AuthAuditLog, User
from apps.root.models import Organization


def test_auth_endpoints():
    """Test authentication endpoints directly."""
    client = Client()

    print("Testing Authentication Endpoints with Python 3.12...")
    print(f"Python Version: {sys.version}")

    # Test 1: Registration endpoint
    print("\n1. Testing Registration...")
    registration_data = {
        "username": "directtest312",
        "email": "directtest312@example.com",
        "password": "TEST_PASSWORD",
        "password_confirm": "DirectTest123!@#",
        "first_name": "Direct",
        "last_name": "Test",
    }

    try:
        response = client.post(
            "/api/auth/register/",
            data=json.dumps(registration_data),
            content_type="application/json",
        )
        print(f"Registration Status: {response.status_code}")
        if hasattr(response, "content"):
            print(f"Response: {response.content.decode()[:200]}...")
    except Exception as e:
        print(f"Registration Error: {e}")

    # Test 2: Login endpoint
    print("\n2. Testing Login...")
    login_data = {
        "email": "directtest312@example.com",
        "password": "TEST_PASSWORD",
        "device_type": "web",
    }

    try:
        response = client.post(
            "/api/auth/login/",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        print(f"Login Status: {response.status_code}")
        if hasattr(response, "content"):
            print(f"Response: {response.content.decode()[:200]}...")
    except Exception as e:
        print(f"Login Error: {e}")

    # Test 3: Check available URLs
    print("\n3. Available Auth URLs:")
    try:
        from django.urls import get_resolver

        resolver = get_resolver()
        auth_patterns = []

        def extract_patterns(patterns, prefix=""):
            for pattern in patterns:
                if hasattr(pattern, "url_patterns"):
                    extract_patterns(
                        pattern.url_patterns, prefix + str(pattern.pattern)
                    )
                else:
                    full_pattern = prefix + str(pattern.pattern)
                    if "auth" in full_pattern.lower():
                        auth_patterns.append(full_pattern)

        extract_patterns(resolver.url_patterns)

        for pattern in auth_patterns[:10]:  # Show first 10
            print(f"  - {pattern}")

    except Exception as e:
        print(f"URL extraction error: {e}")

    # Test 4: Model operations
    print("\n4. Testing Model Operations...")
    try:
        user_count = User.objects.count()
        audit_count = AuthAuditLog.objects.count()
        print(f"Users in DB: {user_count}")
        print(f"Audit logs: {audit_count}")

        # Test creating a user directly
        test_user = User.objects.create_user(
            username="modeltest312",
            email="modeltest312@example.com",
            password="TEST_PASSWORD",
        )
        print(f"Created user: {test_user.id}")

    except Exception as e:
        print(f"Model operation error: {e}")

    print("\nDirect API test completed!")


if __name__ == "__main__":
    test_auth_endpoints()
