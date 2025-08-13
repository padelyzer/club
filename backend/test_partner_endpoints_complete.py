#!/usr/bin/env python3
"""
Comprehensive test for partner endpoints functionality.
Tests the complete partner request system end-to-end.
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.clubs.models import Club
from apps.root.models import Organization
from apps.clients.models import (
    ClientProfile,
    PartnerRequest,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)

User = get_user_model()


def create_test_data():
    """Create test data for partner endpoints."""
    print("Creating test data...")
    
    # Create organization and club (or get existing)
    organization, created = Organization.objects.get_or_create(
        rfc='TPO123456789',
        defaults={
            'type': 'club',
            'business_name': 'Test Padel Organization',
            'trade_name': 'Test Padel',
            'primary_email': 'test@padel.com',
            'primary_phone': '+1234567890',
            'legal_representative': 'John Doe',
            'state': 'active'
        }
    )
    
    club, created = Club.objects.get_or_create(
        slug='test-padel-club-partners',
        defaults={
            'organization': organization,
            'name': 'Test Padel Club Partners',
            'email': 'club@test.com',
            'phone': '+1234567890',
            'is_active': True
        }
    )
    
    # Create player level (or get existing)
    level, created = PlayerLevel.objects.get_or_create(
        name='intermediate',
        defaults={
            'display_name': 'Intermediate',
            'min_rating': 300,
            'max_rating': 600,
            'color': '#3B82F6'
        }
    )
    
    # Create test users
    users = []
    profiles = []
    
    for i in range(3):
        user, created = User.objects.get_or_create(
            username=f'partners_player{i+1}',
            defaults={
                'email': f'partners_player{i+1}@test.com',
                'password': 'TEST_PASSWORD'
            }
        )
        if created:
            user.set_password('testpass123')
        user.role = 'CLIENT'
        user.save()
        users.append(user)
        
        # Create client profile (or get existing)
        profile, created = ClientProfile.objects.get_or_create(
            user=user,
            defaults={
                'organization': organization,
                'club': club,
                'level': level,
                'rating': 500 + i * 10,
                'allow_partner_requests': True
            }
        )
        profiles.append(profile)
        
        # Create related objects (or get existing)
        PlayerStats.objects.get_or_create(
            player=profile,
            defaults={
                'organization': organization,
                'club': club
            }
        )
        PlayerPreferences.objects.get_or_create(
            player=profile,
            defaults={
                'organization': organization,
                'club': club
            }
        )
    
    print(f"Created {len(users)} users and profiles")
    return {
        'organization': organization,
        'club': club,
        'level': level,
        'users': users,
        'profiles': profiles
    }


def test_partner_request_flow(data):
    """Test the complete partner request flow."""
    print("\n=== Testing Partner Request Flow ===")
    
    client = APIClient()
    users = data['users']
    profiles = data['profiles']
    
    # Test 1: Create partner request
    print("1. Testing partner request creation...")
    client.force_authenticate(user=users[0])
    
    url = '/api/v1/clients/partner-requests/'
    request_data = {
        'to_player_id': str(profiles[1].id),
        'message': 'Want to play doubles tomorrow?',
        'match_date': (timezone.now() + timedelta(days=1)).isoformat()
    }
    
    response = client.post(url, request_data, format='json')
    if response.status_code == 201:
        print("✓ Partner request created successfully")
        request_id = response.data['id']
    else:
        print(f"✗ Failed to create partner request: {response.status_code}")
        print(f"Response: {response.data}")
        return False
    
    # Test 2: List partner requests
    print("2. Testing partner request listing...")
    response = client.get(url)
    if response.status_code == 200 and len(response.data) > 0:
        print(f"✓ Listed {len(response.data)} partner requests")
    else:
        print(f"✗ Failed to list partner requests: {response.status_code}")
        return False
    
    # Test 3: Respond to partner request (accept)
    print("3. Testing partner request acceptance...")
    client.force_authenticate(user=users[1])  # Switch to recipient
    
    # Find the request and respond
    respond_url = f'/api/v1/clients/partner-requests/{request_id}/respond/'
    response_data = {
        'action': 'accept',
        'message': 'Sure, let\'s play!'
    }
    
    response = client.post(respond_url, response_data, format='json')
    if response.status_code == 200:
        print("✓ Partner request accepted successfully")
    else:
        print(f"✗ Failed to accept partner request: {response.status_code}")
        print(f"Response: {response.data}")
        return False
    
    # Test 4: Verify request status
    print("4. Verifying request status...")
    partner_request = PartnerRequest.objects.get(id=request_id)
    if partner_request.status == 'accepted':
        print("✓ Request status updated correctly")
    else:
        print(f"✗ Request status incorrect: {partner_request.status}")
        return False
    
    return True


def test_client_profile_endpoints(data):
    """Test client profile partner-related endpoints."""
    print("\n=== Testing Client Profile Partner Endpoints ===")
    
    client = APIClient()
    users = data['users']
    profiles = data['profiles']
    
    # Create some partner history
    PartnerRequest.objects.create(
        from_player=profiles[0],
        to_player=profiles[1],
        organization=data['organization'],
        club=data['club'],
        status='accepted',
        responded_at=timezone.now() - timedelta(days=1)
    )
    
    client.force_authenticate(user=users[0])
    
    # Test 1: Recent partners
    print("1. Testing recent partners endpoint...")
    url = f'/api/v1/clients/profiles/{profiles[0].id}/recent_partners/'
    response = client.get(url)
    if response.status_code == 200:
        print(f"✓ Retrieved recent partners: {len(response.data)} entries")
    else:
        print(f"✗ Failed to get recent partners: {response.status_code}")
        return False
    
    # Test 2: Suggested partners
    print("2. Testing suggested partners endpoint...")
    url = f'/api/v1/clients/profiles/{profiles[0].id}/suggested_partners/'
    response = client.get(url)
    if response.status_code == 200:
        print(f"✓ Retrieved suggested partners: {len(response.data)} entries")
    else:
        print(f"✗ Failed to get suggested partners: {response.status_code}")
        return False
    
    # Test 3: Partner history
    print("3. Testing partner history endpoint...")
    url = f'/api/v1/clients/profiles/{profiles[0].id}/partner_history/'
    response = client.get(url, {'partner_id': str(profiles[1].id)})
    if response.status_code == 200:
        print(f"✓ Retrieved partner history: {response.data}")
    else:
        print(f"✗ Failed to get partner history: {response.status_code}")
        return False
    
    # Test 4: Pending requests count
    print("4. Testing pending requests count endpoint...")
    url = f'/api/v1/clients/profiles/{profiles[0].id}/pending_requests_count/'
    response = client.get(url)
    if response.status_code == 200:
        print(f"✓ Retrieved pending requests count: {response.data['count']}")
    else:
        print(f"✗ Failed to get pending requests count: {response.status_code}")
        return False
    
    return True


def test_player_preferences_endpoints(data):
    """Test player preferences partner-related endpoints."""
    print("\n=== Testing Player Preferences Partner Endpoints ===")
    
    client = APIClient()
    users = data['users']
    profiles = data['profiles']
    
    client.force_authenticate(user=users[0])
    
    # Get preferences
    prefs = profiles[0].preferences
    
    # Test 1: Add preferred partner
    print("1. Testing add preferred partner...")
    url = f'/api/v1/clients/preferences/{prefs.id}/add_preferred_partner/'
    response = client.post(url, {'partner_id': str(profiles[1].id)}, format='json')
    if response.status_code == 200:
        print("✓ Added preferred partner successfully")
    else:
        print(f"✗ Failed to add preferred partner: {response.status_code}")
        return False
    
    # Test 2: Block player
    print("2. Testing block player...")
    url = f'/api/v1/clients/preferences/{prefs.id}/block_player/'
    response = client.post(url, {'player_id': str(profiles[2].id)}, format='json')
    if response.status_code == 200:
        print("✓ Blocked player successfully")
    else:
        print(f"✗ Failed to block player: {response.status_code}")
        return False
    
    # Test 3: Remove preferred partner
    print("3. Testing remove preferred partner...")
    url = f'/api/v1/clients/preferences/{prefs.id}/remove_preferred_partner/'
    response = client.post(url, {'partner_id': str(profiles[1].id)}, format='json')
    if response.status_code == 200:
        print("✓ Removed preferred partner successfully")
    else:
        print(f"✗ Failed to remove preferred partner: {response.status_code}")
        return False
    
    # Test 4: Unblock player
    print("4. Testing unblock player...")
    url = f'/api/v1/clients/preferences/{prefs.id}/unblock_player/'
    response = client.post(url, {'player_id': str(profiles[2].id)}, format='json')
    if response.status_code == 200:
        print("✓ Unblocked player successfully")
    else:
        print(f"✗ Failed to unblock player: {response.status_code}")
        return False
    
    return True


def main():
    """Run all partner endpoint tests."""
    print("Partner Endpoints Comprehensive Test")
    print("=" * 50)
    
    # Clean up any existing test data
    PartnerRequest.objects.filter(message__contains='Want to play').delete()
    
    # Create test data
    data = create_test_data()
    
    # Run tests
    tests = [
        test_partner_request_flow,
        test_client_profile_endpoints,
        test_player_preferences_endpoints,
    ]
    
    results = []
    for test_func in tests:
        try:
            result = test_func(data)
            results.append(result)
        except Exception as e:
            print(f"✗ Test {test_func.__name__} failed with exception: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    for i, (test_func, result) in enumerate(zip(tests, results)):
        status_symbol = "✓" if result else "✗"
        print(f"{status_symbol} {test_func.__name__}")
    
    print(f"\nPassed: {passed}/{total} tests")
    
    if passed == total:
        print("🎉 All partner endpoints are working correctly!")
        return True
    else:
        print("❌ Some partner endpoints need fixes")
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)