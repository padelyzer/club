#!/usr/bin/env python3
"""
Comprehensive end-to-end authentication flow test.
This will test the complete authentication system from frontend to backend.
"""
import json
import sys

import requests


def test_direct_backend_auth():
    """Test direct authentication against backend."""
    print("🔐 TESTING DIRECT BACKEND AUTHENTICATION")
    print("=" * 50)

    url = "http://127.0.0.1:9200/api/v1/auth/login/"
    payload = {"email": "simple@admin.com", "password": "TEST_PASSWORD"}
    headers = {"Content-Type": "application/json"}

    try:
        print(f"Making request to: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print("✅ AUTHENTICATION SUCCESSFUL!")
            print(f"Response Data: {json.dumps(data, indent=2)}")

            # Verify expected fields
            required_fields = ["access", "refresh", "user"]
            missing_fields = [field for field in required_fields if field not in data]

            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False

            print("✅ All required fields present")
            return data
        else:
            print(f"❌ AUTHENTICATION FAILED!")
            try:
                error_data = response.json()
                print(f"Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Response Text: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Backend server not running on port 9200")
        return False
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT ERROR: Request took too long")
        return False
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {str(e)}")
        return False


def test_protected_endpoint(access_token):
    """Test accessing a protected endpoint with the token."""
    print("\n🔒 TESTING PROTECTED ENDPOINT ACCESS")
    print("=" * 50)

    url = "http://127.0.0.1:9200/api/v1/auth/profile/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        print(f"Making request to: {url}")
        print(f"Authorization header: Bearer {access_token[:20]}...")

        response = requests.get(url, headers=headers, timeout=10)

        print(f"Response Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ PROTECTED ENDPOINT ACCESS SUCCESSFUL!")
            print(f"Profile Data: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ PROTECTED ENDPOINT ACCESS FAILED!")
            try:
                error_data = response.json()
                print(f"Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Response Text: {response.text}")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def test_health_endpoint():
    """Test health endpoint to verify server is running."""
    print("\n🏥 TESTING HEALTH ENDPOINT")
    print("=" * 50)

    url = "http://127.0.0.1:9200/api/v1/health/"

    try:
        print(f"Making request to: {url}")

        response = requests.get(url, timeout=10)

        print(f"Response Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ HEALTH CHECK SUCCESSFUL!")
            print(f"Health Data: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ HEALTH CHECK FAILED!")
            print(f"Response Text: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Backend server not running on port 9200")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def test_wrong_credentials():
    """Test with wrong credentials to verify error handling."""
    print("\n❌ TESTING WRONG CREDENTIALS")
    print("=" * 50)

    url = "http://127.0.0.1:9200/api/v1/auth/login/"
    payload = {"email": "wrong@example.com", "password": "TEST_PASSWORD"}
    headers = {"Content-Type": "application/json"}

    try:
        print(f"Making request to: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        print(f"Response Status: {response.status_code}")

        if response.status_code == 401 or response.status_code == 400:
            print("✅ WRONG CREDENTIALS CORRECTLY REJECTED!")
            try:
                error_data = response.json()
                print(f"Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Response Text: {response.text}")
            return True
        else:
            print(
                f"❌ UNEXPECTED RESPONSE: Expected 401/400, got {response.status_code}"
            )
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def run_comprehensive_test():
    """Run the complete authentication test suite."""
    print("🚀 COMPREHENSIVE AUTHENTICATION FLOW TEST")
    print("=" * 60)

    test_results = {}

    # Test 1: Health check
    test_results["health"] = test_health_endpoint()

    # Test 2: Wrong credentials
    test_results["wrong_credentials"] = test_wrong_credentials()

    # Test 3: Correct authentication
    auth_data = test_direct_backend_auth()
    test_results["authentication"] = bool(auth_data)

    # Test 4: Protected endpoint (if auth succeeded)
    if auth_data and "access" in auth_data:
        test_results["protected_endpoint"] = test_protected_endpoint(
            auth_data["access"]
        )
    else:
        test_results["protected_endpoint"] = False
        print("\n⚠️ Skipping protected endpoint test - authentication failed")

    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)

    passed = sum(test_results.values())
    total = len(test_results)

    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.upper().replace('_', ' ')}: {status}")

    print(f"\nOVERALL: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL TESTS PASSED! Authentication system is working correctly.")
        return True
    else:
        print("🚨 SOME TESTS FAILED! Check the details above.")
        return False


if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)
