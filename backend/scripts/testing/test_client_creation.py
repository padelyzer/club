#!/usr/bin/env python3
"""Test client creation with atomic user+profile creation."""

import json
import os
from datetime import datetime

import django

import requests

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# API configuration
API_URL = "http://127.0.0.1:9200/api/v1"

# Create or get admin user
from django.contrib.auth import get_user_model

User = get_user_model()

# Get the first superuser
admin_user = User.objects.filter(is_superuser=True).first()
if not admin_user:
    admin_user = User.objects.create_superuser(
        username="admin",
        email="admin@padelyzer.com",
        password="TEST_PASSWORD",
        first_name="Admin",
        last_name="User",
    )
    print(f"Created admin user: {admin_user.email}")
else:
    admin_user.set_password("admin123")
    admin_user.save()
    print(f"Using existing admin user: {admin_user.email}")

ADMIN_EMAIL = admin_user.email
ADMIN_password="TEST_PASSWORD"


def get_auth_token():
    """Get authentication token for admin user."""
    print("Getting auth token...")
    response = requests.post(
        f"{API_URL}/auth/login/",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Logged in as {ADMIN_EMAIL}")
        return data.get("access")
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(response.json())
        return None


def test_create_client_with_user(token):
    """Test the atomic client creation endpoint."""
    print("\nTesting atomic client creation...")

    # Generate unique test data
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    test_client_data = {
        "email": f"test_client_{timestamp}@example.com",
        "first_name": "Test",
        "last_name": f"Client_{timestamp}",
        "phone_number": "+1234567890",
        "dni": f"12345678{timestamp[-3:]}",
        "birth_date": "1990-01-01",
    }

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print(f"Creating client: {test_client_data['email']}")

    response = requests.post(
        f"{API_URL}/clients/profiles/create_with_user/",
        json=test_client_data,
        headers=headers,
    )

    if response.status_code == 201:
        profile = response.json()
        print("✓ Client created successfully!")
        print(f"  - Profile ID: {profile['id']}")
        print(f"  - User: {profile['user']['full_name']} ({profile['user']['email']})")
        print(f"  - Rating: {profile['rating']}")

        # Verify user was created
        try:
            user = User.objects.get(email=test_client_data["email"])
            print(f"✓ User verified in database: {user.username}")
            print(f"  - Role: {user.role}")
            print(f"  - Has ClientProfile: {hasattr(user, 'client_profile')}")
        except User.DoesNotExist:
            print("✗ User not found in database!")

        return profile
    else:
        print(f"✗ Client creation failed: {response.status_code}")
        print(response.json())
        return None


def test_duplicate_email(token, email):
    """Test that duplicate emails are rejected."""
    print(f"\nTesting duplicate email rejection...")

    test_data = {
        "email": email,
        "first_name": "Duplicate",
        "last_name": "Test",
        "phone_number": "+1234567890",
    }

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    response = requests.post(
        f"{API_URL}/clients/profiles/create_with_user/", json=test_data, headers=headers
    )

    if response.status_code == 400:
        print("✓ Duplicate email correctly rejected")
        print(f"  - Error: {response.json().get('detail')}")
    else:
        print("✗ Duplicate email was not rejected!")
        print(response.json())


def test_permission_check():
    """Test that non-staff users cannot create clients."""
    print("\nTesting permission check...")

    # Create a regular user token (if you have one)
    # For now, we'll test without auth

    test_data = {
        "email": "unauthorized@example.com",
        "first_name": "Unauthorized",
        "last_name": "Test",
        "phone_number": "+1234567890",
    }

    response = requests.post(
        f"{API_URL}/clients/profiles/create_with_user/", json=test_data
    )

    if response.status_code in [401, 403]:
        print("✓ Unauthorized access correctly rejected")
    else:
        print("✗ Unauthorized access was not rejected!")
        print(response.status_code, response.text)


def main():
    """Run all tests."""
    print("=== Testing Client Creation Flow ===\n")

    # Get auth token
    token = get_auth_token()
    if not token:
        print("Failed to get auth token. Make sure admin user exists.")
        return

    # Test permission check
    test_permission_check()

    # Test successful creation
    profile = test_create_client_with_user(token)

    # Test duplicate email
    if profile:
        test_duplicate_email(token, profile["user"]["email"])

    print("\n=== Tests Complete ===")


if __name__ == "__main__":
    main()
