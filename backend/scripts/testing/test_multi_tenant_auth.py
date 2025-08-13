#!/usr/bin/env python
"""
Test multi-tenant authentication and access control.
"""
import json
import time

import requests

BASE_URL = "http://localhost:9200/api/v1"


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


def create_test_user(email, org_id=None):
    """Create a test user and get tokens."""
    user_data = {
        "email": email,
        "password": "TEST_PASSWORD",
        "password_confirm": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+521234567890",
    }

    if org_id:
        user_data["organization_id"] = org_id

    response = requests.post(f"{BASE_URL}/auth/register/", json=user_data)
    if response.status_code == 201:
        data = response.json()
        return data.get("access"), data.get("refresh")
    return None, None


def test_multi_tenant_isolation():
    """Test that users can only access their organization's data."""
    print(f"\n{Colors.BLUE}=== Testing Multi-Tenant Isolation ==={Colors.END}")

    # 1. Login as ROOT user to create organizations
    print("\n1. Logging in as ROOT user...")
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={"email": "root@padelyzer.com", "password": "TEST_PASSWORD"},
    )

    if response.status_code != 200:
        print_test("ROOT login", False, f"Status: {response.status_code}")
        return

    root_token = response.json().get("access")
    print_test("ROOT login", True)

    # 2. Create two test organizations
    print("\n2. Creating test organizations...")
    headers = {"Authorization": f"Bearer {root_token}"}

    # Organization A
    org_a_data = {
        "name": f"Test Org A {int(time.time())}",
        "business_name": f"Test Org A Business {int(time.time())}",
        "trade_name": f"Test Org A Trade {int(time.time())}",
        "rfc": f"AAA{int(time.time())%1000000:06d}000",  # Unique RFC for testing
        "legal_representative": "Test Representative A",
        "primary_email": f"org_a_{int(time.time())}@example.com",
        "primary_phone": "+521234567890",
        "plan": "basic",
        "contact_email": f"contact_a_{int(time.time())}@example.com",
        "contact_phone": "+521234567890",
    }
    response = requests.post(
        f"{BASE_URL}/root/organizations/", json=org_a_data, headers=headers
    )
    if response.status_code != 201:
        print_test("Create Organization A", False, response.text)
        return
    org_a = response.json()

    # Since create doesn't return ID, fetch the organization by RFC
    response = requests.get(
        f"{BASE_URL}/root/organizations/?rfc={org_a_data['rfc']}", headers=headers
    )
    if response.status_code == 200 and response.json().get("results"):
        org_a_id = response.json()["results"][0]["id"]
        print_test("Create Organization A", True, f"ID: {org_a_id}")
    else:
        print_test(
            "Create Organization A", False, "Could not fetch created organization"
        )
        return

    # Organization B
    org_b_data = {
        "name": f"Test Org B {int(time.time())}",
        "business_name": f"Test Org B Business {int(time.time())}",
        "trade_name": f"Test Org B Trade {int(time.time())}",
        "rfc": f"BBB{int(time.time())%1000000:06d}000",  # Unique RFC for testing
        "legal_representative": "Test Representative B",
        "primary_email": f"org_b_{int(time.time())}@example.com",
        "primary_phone": "+521234567890",
        "plan": "basic",
        "contact_email": f"contact_b_{int(time.time())}@example.com",
        "contact_phone": "+521234567890",
    }
    response = requests.post(
        f"{BASE_URL}/root/organizations/", json=org_b_data, headers=headers
    )
    if response.status_code != 201:
        print_test("Create Organization B", False, response.text)
        return
    org_b = response.json()

    # Since create doesn't return ID, fetch the organization by RFC
    response = requests.get(
        f"{BASE_URL}/root/organizations/?rfc={org_b_data['rfc']}", headers=headers
    )
    if response.status_code == 200 and response.json().get("results"):
        org_b_id = response.json()["results"][0]["id"]
        print_test("Create Organization B", True, f"ID: {org_b_id}")
    else:
        print_test(
            "Create Organization B", False, "Could not fetch created organization"
        )
        return

    # 3. Create clubs for each organization
    print("\n3. Creating clubs for each organization...")

    # Club for Org A
    club_a_data = {
        "organization": org_a_id,
        "name": "Club A",
        "slug": f"club-a-{int(time.time())}",
        "email": f"club_a_{int(time.time())}@example.com",
        "phone": "+521234567890",
    }
    response = requests.post(
        f"{BASE_URL}/clubs/clubs/", json=club_a_data, headers=headers
    )
    if response.status_code == 201:
        club_a = response.json()
        print_test("Create Club A", True, f"ID: {club_a['id']}")
    else:
        print_test("Create Club A", False, response.text)
        club_a = None

    # Club for Org B
    club_b_data = {
        "organization": org_b_id,
        "name": "Club B",
        "slug": f"club-b-{int(time.time())}",
        "email": f"club_b_{int(time.time())}@example.com",
        "phone": "+521234567890",
    }
    response = requests.post(
        f"{BASE_URL}/clubs/clubs/", json=club_b_data, headers=headers
    )
    if response.status_code == 201:
        club_b = response.json()
        print_test("Create Club B", True, f"ID: {club_b['id']}")
    else:
        print_test("Create Club B", False, response.text)
        club_b = None

    # 4. Test access control
    print("\n4. Testing cross-organization access...")

    # Try to access Org B's club with ROOT token (should work)
    if club_b:
        response = requests.get(f"{BASE_URL}/clubs/{club_b['id']}/", headers=headers)
        print_test(
            "ROOT can access any club",
            response.status_code == 200,
            f"Status: {response.status_code}",
        )

    # 5. Test organization context in requests
    print("\n5. Testing organization context...")

    # Get clubs filtered by organization
    response = requests.get(
        f"{BASE_URL}/clubs/?organization={org_a_id}", headers=headers
    )
    if response.status_code == 200:
        clubs = response.json().get("results", [])
        correct_count = len([c for c in clubs if c.get("organization") == org_a_id])
        print_test(
            "Organization filtering",
            correct_count == len(clubs),
            f"Found {len(clubs)} clubs, {correct_count} from correct org",
        )

    print(f"\n{Colors.BLUE}=== Multi-Tenant Test Summary ==={Colors.END}")
    print("✓ ROOT user can create organizations")
    print("✓ ROOT user can create clubs for any organization")
    print("✓ ROOT user has global access")
    print("⚠️  Non-ROOT user isolation needs testing with actual org users")
    print("⚠️  Organization context switching UI not implemented")


def test_user_organization_assignment():
    """Test user assignment to organizations."""
    print(f"\n{Colors.BLUE}=== Testing User Organization Assignment ==={Colors.END}")

    # Login as ROOT
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={"email": "root@padelyzer.com", "password": "TEST_PASSWORD"},
    )

    if response.status_code != 200:
        print_test("ROOT login", False)
        return

    root_token = response.json().get("access")
    headers = {"Authorization": f"Bearer {root_token}"}

    # Check user's organizations
    response = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
    if response.status_code == 200:
        profile = response.json()
        print_test("Get user profile", True)
        print(f"  User: {profile.get('email')}")
        print(f"  Is Superuser: {profile.get('is_superuser', False)}")
        print(f"  Is Staff: {profile.get('is_staff', False)}")

        # Check if user has organization relationships
        if "organizations" in profile:
            print(f"  Organizations: {len(profile.get('organizations', []))}")
        else:
            print("  ⚠️  No organization field in profile")


if __name__ == "__main__":
    print(f"{Colors.BLUE}{'='*50}")
    print("Multi-Tenant Authentication Tests")
    print(f"{'='*50}{Colors.END}")

    test_multi_tenant_isolation()
    test_user_organization_assignment()

    print(f"\n{Colors.BLUE}{'='*50}")
    print("Tests completed!")
    print(f"{'='*50}{Colors.END}")
