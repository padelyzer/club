#!/usr/bin/env python
"""
Test script for authentication flows.
Run from backend directory with virtual environment activated.
"""
import json
import time
from datetime import datetime

import requests

BASE_URL = "http://localhost:9200/api/v1/auth"


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    END = "\033[0m"


def print_test(name, success, message=""):
    status = (
        f"{Colors.GREEN}✓ PASS{Colors.END}"
        if success
        else f"{Colors.RED}✗ FAIL{Colors.END}"
    )
    print(f"{status} {name}")
    if message:
        print(f"  {Colors.YELLOW}{message}{Colors.END}")


def test_registration():
    """Test user registration flow."""
    print(f"\n{Colors.BLUE}=== Testing Registration ==={Colors.END}")

    test_user = {
        "email": f"test_{int(time.time())}@example.com",
        "password": "TEST_PASSWORD",
        "password_confirm": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+521234567890",
    }

    try:
        response = requests.post(f"{BASE_URL}/register/", json=test_user)
        success = response.status_code == 201
        print_test(
            "Registration endpoint",
            success,
            f"Status: {response.status_code}, Response: {response.text[:100]}",
        )

        if success:
            data = response.json()
            return (
                test_user["email"],
                test_user["password"],
                data.get("access"),
                data.get("refresh"),
            )
        return None, None, None, None

    except Exception as e:
        print_test("Registration endpoint", False, f"Error: {str(e)}")
        return None, None, None, None


def test_login(email, password):
    """Test login flow."""
    print(f"\n{Colors.BLUE}=== Testing Login ==={Colors.END}")

    try:
        response = requests.post(
            f"{BASE_URL}/login/", json={"email": email, "password": password}
        )

        success = response.status_code == 200
        print_test("Login endpoint", success, f"Status: {response.status_code}")

        if success:
            data = response.json()
            # Check if 2FA is required
            if data.get("requires_2fa"):
                print_test("2FA detection", True, "2FA required for this account")
                return None, None, True

            access_token = data.get("access")
            refresh_token = data.get("refresh")
            print_test("Token generation", bool(access_token and refresh_token))
            return access_token, refresh_token, False

        return None, None, False

    except Exception as e:
        print_test("Login endpoint", False, f"Error: {str(e)}")
        return None, None, False


def test_token_refresh(refresh_token):
    """Test token refresh."""
    print(f"\n{Colors.BLUE}=== Testing Token Refresh ==={Colors.END}")

    try:
        response = requests.post(
            f"{BASE_URL}/token/refresh/", json={"refresh": refresh_token}
        )

        success = response.status_code == 200
        print_test("Token refresh", success, f"Status: {response.status_code}")

        if success:
            data = response.json()
            return data.get("access")
        return None

    except Exception as e:
        print_test("Token refresh", False, f"Error: {str(e)}")
        return None


def test_profile(access_token):
    """Test profile access."""
    print(f"\n{Colors.BLUE}=== Testing Profile Access ==={Colors.END}")

    try:
        response = requests.get(
            f"{BASE_URL}/profile/", headers={"Authorization": f"Bearer {access_token}"}
        )

        success = response.status_code == 200
        print_test("Profile endpoint", success, f"Status: {response.status_code}")

        if success:
            data = response.json()
            print_test(
                "Profile data", bool(data.get("email")), f"Email: {data.get('email')}"
            )

    except Exception as e:
        print_test("Profile endpoint", False, f"Error: {str(e)}")


def test_sessions(access_token):
    """Test session management."""
    print(f"\n{Colors.BLUE}=== Testing Session Management ==={Colors.END}")

    try:
        response = requests.get(
            f"{BASE_URL}/sessions/", headers={"Authorization": f"Bearer {access_token}"}
        )

        success = response.status_code == 200
        print_test("Sessions list", success, f"Status: {response.status_code}")

        if success:
            data = response.json()
            count = len(data.get("results", []))
            print_test("Active sessions", count > 0, f"Found {count} active session(s)")

    except Exception as e:
        print_test("Sessions endpoint", False, f"Error: {str(e)}")


def test_logout(access_token):
    """Test logout."""
    print(f"\n{Colors.BLUE}=== Testing Logout ==={Colors.END}")

    try:
        response = requests.post(
            f"{BASE_URL}/logout/", headers={"Authorization": f"Bearer {access_token}"}
        )

        success = response.status_code in [200, 204]
        print_test("Logout endpoint", success, f"Status: {response.status_code}")

    except Exception as e:
        print_test("Logout endpoint", False, f"Error: {str(e)}")


def test_password_reset():
    """Test password reset flow."""
    print(f"\n{Colors.BLUE}=== Testing Password Reset ==={Colors.END}")

    try:
        # Request password reset
        response = requests.post(
            f"{BASE_URL}/password-reset/", json={"email": "test@example.com"}
        )

        success = response.status_code in [200, 201]
        print_test("Password reset request", success, f"Status: {response.status_code}")

    except Exception as e:
        print_test("Password reset", False, f"Error: {str(e)}")


def main():
    """Run all authentication tests."""
    print(f"{Colors.BLUE}{'='*50}")
    print("Authentication Flow Tests")
    print(f"Testing against: {BASE_URL}")
    print(f"{'='*50}{Colors.END}")

    # Test registration
    email, password, access_token, refresh_token = test_registration()

    if email and password:
        # Test login with new user
        access_token, refresh_token, requires_2fa = test_login(email, password)

        if access_token and refresh_token:
            # Test token refresh
            new_access_token = test_token_refresh(refresh_token)

            # Use new token if refresh succeeded
            if new_access_token:
                access_token = new_access_token

            # Test authenticated endpoints
            test_profile(access_token)
            test_sessions(access_token)

            # Test logout
            test_logout(access_token)

    # Test password reset (doesn't require auth)
    test_password_reset()

    print(f"\n{Colors.BLUE}{'='*50}")
    print("Tests completed!")
    print(f"{'='*50}{Colors.END}")


if __name__ == "__main__":
    main()
