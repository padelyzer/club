"""
Script to test ROOT API endpoints
Run with: python test_root_api.py
"""

import json
from datetime import datetime

import requests

# Configuration
BASE_URL = "http://localhost:9200/api/v1"
ADMIN_EMAIL = "admin@padelyzer.com"
ADMIN_password="TEST_PASSWORD"


def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access")
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None


def test_dashboard_endpoint(token):
    """Test dashboard metrics endpoint"""
    print("\n📊 Testing Dashboard Endpoint...")
    print("-" * 40)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/root/organizations/dashboard/", headers=headers
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Response structure:")
        print(json.dumps(data, indent=2, default=str))
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text}")


def test_organizations_endpoint(token):
    """Test organizations list endpoint"""
    print("\n🏢 Testing Organizations Endpoint...")
    print("-" * 40)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/root/organizations/", headers=headers)

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success!")

        # Check if it's paginated or direct array
        if isinstance(data, dict) and "results" in data:
            print(f"Paginated response with {data.get('count')} total items")
            print(
                f"First organization: {data['results'][0] if data['results'] else 'None'}"
            )
        elif isinstance(data, list):
            print(f"Direct array with {len(data)} items")
            print(f"First organization: {data[0] if data else 'None'}")
        else:
            print(f"Unexpected response structure: {type(data)}")
            print(json.dumps(data, indent=2, default=str))
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text}")


def main():
    print("🧪 Testing ROOT API Endpoints")
    print("=" * 60)

    # Get auth token
    print("🔐 Getting authentication token...")
    token = get_auth_token()

    if not token:
        print("❌ Failed to authenticate. Exiting.")
        return

    print(f"✅ Got token: {token[:20]}...")

    # Test endpoints
    test_dashboard_endpoint(token)
    test_organizations_endpoint(token)

    print("\n" + "=" * 60)
    print("✅ Tests completed")


if __name__ == "__main__":
    main()
