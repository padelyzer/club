#!/usr/bin/env python3
"""Test client creation API endpoint directly."""

import json
from datetime import datetime

import requests

# API configuration
API_URL = "http://127.0.0.1:9200/api/v1"


def test_create_client_direct():
    """Test creating a client through the API."""
    print("=== Testing Client Creation API ===\n")

    # First, let's test if the endpoint exists
    print("1. Testing endpoint availability...")
    response = requests.options(f"{API_URL}/clients/profiles/create_with_user/")
    print(f"   OPTIONS response: {response.status_code}")

    # Test without authentication
    print("\n2. Testing without authentication...")
    test_data = {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "phone_number": "+1234567890",
    }

    response = requests.post(
        f"{API_URL}/clients/profiles/create_with_user/", json=test_data
    )
    print(f"   Response: {response.status_code}")
    if response.status_code == 401:
        print("   ✓ Authentication required (as expected)")
    else:
        print(f"   Response: {response.text}")

    # Test the regular profile creation endpoint
    print("\n3. Testing regular profile list endpoint...")
    response = requests.get(f"{API_URL}/clients/profiles/")
    print(f"   Response: {response.status_code}")
    if response.status_code == 401:
        print("   ✓ Authentication required (as expected)")

    print("\n=== Test Complete ===")
    print("\nNote: To fully test client creation, you need:")
    print("1. A staff user account with valid authentication")
    print("2. The backend must have the create_with_user action implemented")
    print("3. Email service configured for welcome emails")


if __name__ == "__main__":
    test_create_client_direct()
