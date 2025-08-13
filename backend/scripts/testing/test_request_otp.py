#!/usr/bin/env python
"""Test the request-otp endpoint."""
import json

import requests

# Base URL for the backend API
BASE_URL = "http://localhost:9200/api/v1"


def test_request_otp():
    """Test requesting an OTP code."""
    print("Testing request-otp endpoint...")

    # Test with valid email
    test_cases = [
        {
            "name": "Valid email request (default login purpose)",
            "data": {"email": "test@example.com", "method": "email"},
            "expected_status": 200,
        },
        {
            "name": "Valid email request with login purpose",
            "data": {
                "email": "test@example.com",
                "method": "email",
                "purpose": "login",
            },
            "expected_status": 200,
        },
        {
            "name": "Valid email request with email_verification purpose",
            "data": {
                "email": "test@example.com",
                "method": "email",
                "purpose": "email_verification",
            },
            "expected_status": 200,
        },
        {
            "name": "Valid email request with password_reset purpose",
            "data": {
                "email": "test@example.com",
                "method": "email",
                "purpose": "password_reset",
            },
            "expected_status": 200,
        },
        {"name": "Missing email", "data": {"method": "email"}, "expected_status": 400},
        {
            "name": "Invalid method",
            "data": {"email": "test@example.com", "method": "invalid"},
            "expected_status": 400,
        },
        {
            "name": "SMS method (not supported yet)",
            "data": {"email": "test@example.com", "method": "sms"},
            "expected_status": 400,
        },
        {
            "name": "WhatsApp method (not supported yet)",
            "data": {"email": "test@example.com", "method": "whatsapp"},
            "expected_status": 400,
        },
    ]

    for test in test_cases:
        print(f"\n{test['name']}:")
        try:
            response = requests.post(
                f"{BASE_URL}/auth/request-otp/",
                json=test["data"],
                headers={"Content-Type": "application/json"},
            )

            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")

            if response.status_code == test["expected_status"]:
                print("✓ Test passed")
            else:
                print(f"✗ Test failed - expected {test['expected_status']}")

        except Exception as e:
            print(f"✗ Error: {str(e)}")


if __name__ == "__main__":
    test_request_otp()
