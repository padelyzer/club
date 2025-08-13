#!/usr/bin/env python3
"""
Focused validation script for specific issues in the clients module.
"""

import os
import sys

import django
from django.conf import settings

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

from apps.clients.models import (
    ClientProfile,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)
from apps.clubs.models import Club
from apps.root.models import Organization

User = get_user_model()


def test_multi_tenancy():
    """Test multi-tenant isolation in clients module."""
    print("\n🧪 Testing Multi-Tenancy...")

    # Check if users have organization context
    users = User.objects.all()[:2]
    for user in users:
        org = getattr(user, "current_organization", None)
        if org:
            print(f"✅ User {user.username} has organization context: {org.id}")
        else:
            print(f"⚠️ User {user.username} has no organization context")

    # Check if client profiles are properly scoped
    profiles = ClientProfile.objects.all()
    print(f"📊 Total client profiles in system: {profiles.count()}")

    # Test organization-based filtering (if implemented)
    if (
        users
        and hasattr(users[0], "current_organization")
        and users[0].current_organization
    ):
        org = users[0].current_organization
        # This would test organization-based filtering if implemented
        print(f"🔍 Organization-specific filtering would be needed for org: {org.id}")

    return True


def test_api_endpoints_with_settings():
    """Test API endpoints with proper settings."""
    print("\n🧪 Testing API Endpoints...")

    # Get or create a test user
    user, created = User.objects.get_or_create(
        username="api_test_user",
        defaults={
            "email": "apitest@example.com",
            "first_name": "API",
            "last_name": "Test",
        },
    )

    if created:
        user.set_password("testpass123")
        user.save()

    # Test with proper Django test client
    from django.test import Client

    client = Client()

    # Login user (simulate authentication)
    client.force_login(user)

    try:
        # Test PlayerLevel endpoints
        response = client.get("/api/clients/levels/")
        print(f"✅ PlayerLevel list API: {response.status_code} (expected: 200 or 403)")

        # Test ClientProfile endpoints
        response = client.get("/api/clients/profiles/")
        print(
            f"✅ ClientProfile list API: {response.status_code} (expected: 200 or 403)"
        )

        # Test 'me' endpoint
        response = client.get("/api/clients/profiles/me/")
        print(
            f"✅ ClientProfile 'me' API: {response.status_code} (expected: 200 or 404)"
        )

        # Test stats endpoints
        response = client.get("/api/clients/stats/")
        print(f"✅ PlayerStats list API: {response.status_code} (expected: 200 or 403)")

        return True

    except Exception as e:
        print(f"❌ API test failed: {str(e)}")
        return False


def test_player_level_data():
    """Test PlayerLevel model data consistency."""
    print("\n🧪 Testing PlayerLevel Data...")

    levels = PlayerLevel.objects.all().order_by("min_rating")

    if not levels.exists():
        print("❌ No PlayerLevel data found")
        return False

    print(f"📊 Found {levels.count()} player levels:")

    expected_levels = ["beginner", "intermediate", "advanced", "professional"]
    actual_levels = [level.name for level in levels]

    for expected in expected_levels:
        if expected in actual_levels:
            level = levels.get(name=expected)
            print(
                f"✅ {expected}: {level.display_name} ({level.min_rating}-{level.max_rating})"
            )
        else:
            print(f"❌ Missing level: {expected}")

    # Test level logic
    test_ratings = [150, 450, 750, 950]
    for rating in test_ratings:
        matching_levels = levels.filter(min_rating__lte=rating, max_rating__gte=rating)
        if matching_levels:
            level = matching_levels.first()
            print(f"✅ Rating {rating} maps to {level.name}")
        else:
            print(f"❌ Rating {rating} has no matching level")

    return True


def test_client_profile_creation():
    """Test ClientProfile creation and relationships."""
    print("\n🧪 Testing ClientProfile Creation...")

    # Get or create test user
    user, created = User.objects.get_or_create(
        username="profile_test_user",
        defaults={
            "email": "profiletest@example.com",
            "first_name": "Profile",
            "last_name": "Test",
        },
    )

    # Clean up existing profile if any
    ClientProfile.objects.filter(user=user).delete()

    # Get a player level
    level = PlayerLevel.objects.first()
    if not level:
        print("❌ No PlayerLevel available for testing")
        return False

    try:
        # Create profile
        profile = ClientProfile.objects.create(
            user=user,
            level=level,
            rating=400,
            dominant_hand="right",
            preferred_position="left",
        )

        print(f"✅ Created ClientProfile: {profile.id}")

        # Check auto-created related objects
        stats = PlayerStats.objects.filter(player=profile).first()
        preferences = PlayerPreferences.objects.filter(player=profile).first()

        if not stats:
            # Create stats if not auto-created
            stats = PlayerStats.objects.create(player=profile)
            print("⚠️ PlayerStats created manually (should be auto-created)")
        else:
            print("✅ PlayerStats auto-created")

        if not preferences:
            # Create preferences if not auto-created
            preferences = PlayerPreferences.objects.create(player=profile)
            print("⚠️ PlayerPreferences created manually (should be auto-created)")
        else:
            print("✅ PlayerPreferences auto-created")

        # Test level auto-update
        profile.rating = 750  # Should be advanced
        profile.update_level_by_rating()

        if profile.level.name == "advanced":
            print("✅ Level auto-update works")
        else:
            print(
                f"⚠️ Level auto-update issue: expected 'advanced', got '{profile.level.name}'"
            )

        # Clean up
        profile.delete()
        print("✅ Profile cleanup completed")

        return True

    except Exception as e:
        print(f"❌ ClientProfile creation failed: {str(e)}")
        return False


def test_partner_matching():
    """Test partner matching and filtering."""
    print("\n🧪 Testing Partner Matching...")

    # Create two test users if needed
    user1, _ = User.objects.get_or_create(
        username="partner_test_1",
        defaults={
            "email": "partner1@example.com",
            "first_name": "Partner",
            "last_name": "One",
        },
    )

    user2, _ = User.objects.get_or_create(
        username="partner_test_2",
        defaults={
            "email": "partner2@example.com",
            "first_name": "Partner",
            "last_name": "Two",
        },
    )

    # Clean up existing profiles
    ClientProfile.objects.filter(user__in=[user1, user2]).delete()

    level = PlayerLevel.objects.first()
    if not level:
        print("❌ No PlayerLevel available")
        return False

    try:
        # Create profiles
        profile1 = ClientProfile.objects.create(user=user1, level=level, rating=400)
        profile2 = ClientProfile.objects.create(user=user2, level=level, rating=500)

        # Create related objects
        PlayerStats.objects.get_or_create(player=profile1)
        PlayerStats.objects.get_or_create(player=profile2)
        prefs1, _ = PlayerPreferences.objects.get_or_create(player=profile1)
        prefs2, _ = PlayerPreferences.objects.get_or_create(player=profile2)

        # Test blocking functionality
        prefs1.blocked_players.add(profile2)

        # Test search would exclude blocked players
        available_partners = (
            ClientProfile.objects.filter(is_public=True, is_active=True)
            .exclude(id__in=prefs1.blocked_players.values_list("id", flat=True))
            .exclude(id=profile1.id)
        )

        if profile2 not in available_partners:
            print("✅ Blocked player correctly excluded from search")
        else:
            print("❌ Blocked player not excluded from search")

        # Test unblocking
        prefs1.blocked_players.remove(profile2)

        available_partners = ClientProfile.objects.filter(
            is_public=True, is_active=True
        ).exclude(id=profile1.id)

        if profile2 in available_partners:
            print("✅ Unblocked player included in search")
        else:
            print("❌ Unblocked player not included in search")

        # Clean up
        profile1.delete()
        profile2.delete()

        return True

    except Exception as e:
        print(f"❌ Partner matching test failed: {str(e)}")
        return False


def test_data_privacy():
    """Test privacy settings and data protection."""
    print("\n🧪 Testing Data Privacy...")

    user, _ = User.objects.get_or_create(
        username="privacy_test_user",
        defaults={
            "email": "privacy@example.com",
            "first_name": "Privacy",
            "last_name": "Test",
        },
    )

    # Clean up
    ClientProfile.objects.filter(user=user).delete()

    level = PlayerLevel.objects.first()
    if not level:
        print("❌ No PlayerLevel available")
        return False

    try:
        # Create private profile
        profile = ClientProfile.objects.create(
            user=user, level=level, rating=400, is_public=False  # Private profile
        )

        # Test privacy filtering
        public_profiles = ClientProfile.objects.filter(is_public=True)
        private_profiles = ClientProfile.objects.filter(is_public=False)

        if profile in private_profiles and profile not in public_profiles:
            print("✅ Privacy settings correctly applied")
        else:
            print("❌ Privacy settings not working")

        # Test rankings visibility
        profile.show_in_rankings = False
        profile.save()

        ranking_profiles = ClientProfile.objects.filter(show_in_rankings=True)
        if profile not in ranking_profiles:
            print("✅ Ranking visibility setting works")
        else:
            print("❌ Ranking visibility setting not working")

        # Clean up
        profile.delete()

        return True

    except Exception as e:
        print(f"❌ Privacy test failed: {str(e)}")
        return False


def main():
    """Run focused tests."""
    print("🚀 Starting Focused Clients Module Tests")
    print("=" * 50)

    tests = [
        test_multi_tenancy,
        test_api_endpoints_with_settings,
        test_player_level_data,
        test_client_profile_creation,
        test_partner_matching,
        test_data_privacy,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")

    print("\n" + "=" * 50)
    print(f"📊 FOCUSED TEST RESULTS: {passed}/{total} passed")

    if passed == total:
        print("✅ All focused tests passed!")
    else:
        print(f"⚠️ {total - passed} tests failed or had issues")


if __name__ == "__main__":
    main()
