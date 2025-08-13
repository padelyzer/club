#!/usr/bin/env python
"""
Test script for new authentication endpoints
"""
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = 'http://localhost:8000/api/v1'
TEST_USER = {
    'email': 'test@padelyzer.com',
    'password': 'TEST_PASSWORD'
}

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{BLUE}ℹ {message}{RESET}")

def print_section(title):
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}{title}{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")

def login():
    """Login and get access token"""
    print_section("1. LOGIN TEST")
    
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json=TEST_USER
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Login successful for {data['user']['email']}")
        print_info(f"Access token: {data['access'][:20]}...")
        return data['access']
    else:
        print_error(f"Login failed: {response.status_code}")
        print_error(response.text)
        return None

def test_permissions(token):
    """Test the new permissions endpoint"""
    print_section("2. PERMISSIONS ENDPOINT TEST")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/auth/permissions/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success("Permissions endpoint working!")
        print_info(f"Global permissions: {len(data.get('global_permissions', []))} permissions")
        print_info(f"Club permissions: {len(data.get('club_permissions', {}))} clubs")
        
        # Show some permissions
        if data.get('global_permissions'):
            print(f"\n  Global permissions sample:")
            for perm in data['global_permissions'][:3]:
                print(f"    - {perm}")
                
        if data.get('club_permissions'):
            print(f"\n  Club permissions:")
            for club_id, perms in list(data['club_permissions'].items())[:2]:
                print(f"    - Club {club_id[:8]}...: {len(perms)} permissions")
        
        return True
    else:
        print_error(f"Permissions endpoint failed: {response.status_code}")
        print_error(response.text)
        return False

def test_user_clubs(token):
    """Test the new user clubs endpoint"""
    print_section("3. USER CLUBS ENDPOINT TEST")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/clubs/user-clubs/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success("User clubs endpoint working!")
        print_info(f"User has access to {data.get('count', 0)} clubs")
        
        # Show clubs
        if data.get('clubs'):
            print(f"\n  Accessible clubs:")
            for club in data['clubs']:
                print(f"    - {club['name']} ({club['slug']})")
                print(f"      Courts: {club.get('total_courts', 0)}")
                
        # Test summary endpoint
        summary_response = requests.get(f"{BASE_URL}/clubs/user-clubs/summary/", headers=headers)
        if summary_response.status_code == 200:
            summary = summary_response.json()
            print_success("\nUser clubs summary endpoint working!")
            print_info(f"Total courts across all clubs: {summary.get('total_courts', 0)}")
        
        return True
    else:
        print_error(f"User clubs endpoint failed: {response.status_code}")
        print_error(response.text)
        return False

def test_organization(token):
    """Test the new organization endpoint"""
    print_section("4. ORGANIZATION ENDPOINT TEST")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/root/organization/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success("Organization endpoint working!")
        
        if isinstance(data, list) and data:
            # If it returns a list, get the first item
            org = data[0]
        else:
            org = data
            
        print_info(f"Organization: {org.get('trade_name', 'N/A')}")
        print_info(f"User role: {org.get('user_role', 'N/A')}")
        
        # Show subscription info
        if org.get('subscription'):
            print(f"\n  Subscription:")
            print(f"    - Plan: {org['subscription'].get('plan', 'N/A')}")
            print(f"    - Clubs allowed: {org['subscription'].get('clubs_allowed', 'N/A')}")
            
        # Show usage
        if org.get('usage'):
            print(f"\n  Usage:")
            print(f"    - Clubs: {org['usage'].get('clubs_count', 0)}/{org['usage'].get('clubs_limit', 0)}")
        
        return True
    else:
        print_error(f"Organization endpoint failed: {response.status_code}")
        print_error(response.text)
        return False

def test_frontend_auth_context(token):
    """Test that all endpoints work together for the frontend auth context"""
    print_section("5. FRONTEND AUTH CONTEXT SIMULATION")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Simulate what the frontend does
    print_info("Simulating frontend auth context fetch...")
    
    # 1. Get profile
    profile_resp = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
    
    # 2. Get organization
    org_resp = requests.get(f"{BASE_URL}/root/organization/", headers=headers)
    
    # 3. Get user clubs
    clubs_resp = requests.get(f"{BASE_URL}/clubs/user-clubs/", headers=headers)
    
    # 4. Get permissions
    perms_resp = requests.get(f"{BASE_URL}/auth/permissions/", headers=headers)
    
    all_success = all([
        profile_resp.status_code == 200,
        org_resp.status_code == 200,
        clubs_resp.status_code == 200,
        perms_resp.status_code == 200
    ])
    
    if all_success:
        print_success("All auth context endpoints working together!")
        
        # Build the context object like frontend does
        context = {
            'user': profile_resp.json(),
            'organization': org_resp.json()[0] if isinstance(org_resp.json(), list) else org_resp.json(),
            'clubs': clubs_resp.json().get('clubs', []),
            'permissions': perms_resp.json()
        }
        
        print_info(f"\nAuth context summary:")
        print(f"  - User: {context['user']['email']}")
        print(f"  - Organization: {context['organization'].get('trade_name', 'N/A')}")
        print(f"  - Clubs: {len(context['clubs'])}")
        print(f"  - Global permissions: {len(context['permissions'].get('global_permissions', []))}")
        
        return True
    else:
        print_error("Some auth context endpoints failed!")
        if profile_resp.status_code != 200:
            print_error(f"  - Profile: {profile_resp.status_code}")
        if org_resp.status_code != 200:
            print_error(f"  - Organization: {org_resp.status_code}")
        if clubs_resp.status_code != 200:
            print_error(f"  - User clubs: {clubs_resp.status_code}")
        if perms_resp.status_code != 200:
            print_error(f"  - Permissions: {perms_resp.status_code}")
        return False

def main():
    """Run all tests"""
    print(f"\n{BLUE}Testing new authentication endpoints...{RESET}")
    print(f"{BLUE}Backend URL: {BASE_URL}{RESET}")
    print(f"{BLUE}Test user: {TEST_USER['email']}{RESET}")
    
    # Login first
    token = login()
    if not token:
        print_error("\nCannot continue without valid token!")
        return
    
    # Run all tests
    results = []
    results.append(test_permissions(token))
    results.append(test_user_clubs(token))
    results.append(test_organization(token))
    results.append(test_frontend_auth_context(token))
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print_success(f"All tests passed! ({passed}/{total})")
    else:
        print_error(f"Some tests failed! ({passed}/{total})")
        print_info("\nFailed tests need to be fixed before frontend integration")

if __name__ == "__main__":
    main()