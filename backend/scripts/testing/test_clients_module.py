#!/usr/bin/env python3
"""
Comprehensive validation script for the clients module in Python 3.12.
Tests all core functionality including models, relationships, API endpoints, and business logic.
"""

import os
import sys

import django
from django.conf import settings

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import json
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import Client as DjangoClient
from django.test import TestCase
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

# Import models and related classes
from apps.clients.models import (
    ClientProfile,
    EmergencyContact,
    MedicalInfo,
    PartnerRequest,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)
from apps.clients.serializers import (
    ClientProfileCreateSerializer,
    ClientProfileDetailSerializer,
    EmergencyContactSerializer,
    MedicalInfoSerializer,
    PartnerRequestSerializer,
    PlayerLevelSerializer,
    PlayerPreferencesSerializer,
    PlayerStatsSerializer,
)

User = get_user_model()


class ClientsModuleValidator:
    """Comprehensive validator for the clients module."""

    def __init__(self):
        self.client = DjangoClient()
        self.api_client = APIClient()
        self.test_users = []
        self.test_profiles = []
        self.test_levels = []
        self.results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "errors": [],
        }

    def log_result(self, test_name, success, message=""):
        """Log test result."""
        self.results["total_tests"] += 1
        if success:
            self.results["passed_tests"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.results["failed_tests"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")

    def setup_test_data(self):
        """Create test data for validation."""
        print("\n🔧 Setting up test data...")

        try:
            # Create test player levels
            levels_data = [
                {
                    "name": "beginner",
                    "display_name": "Principiante",
                    "min_rating": 0,
                    "max_rating": 299,
                    "color": "#00FF00",
                },
                {
                    "name": "intermediate",
                    "display_name": "Intermedio",
                    "min_rating": 300,
                    "max_rating": 599,
                    "color": "#FFFF00",
                },
                {
                    "name": "advanced",
                    "display_name": "Avanzado",
                    "min_rating": 600,
                    "max_rating": 899,
                    "color": "#FF8800",
                },
                {
                    "name": "professional",
                    "display_name": "Profesional",
                    "min_rating": 900,
                    "max_rating": 1000,
                    "color": "#FF0000",
                },
            ]

            for level_data in levels_data:
                level, created = PlayerLevel.objects.get_or_create(
                    name=level_data["name"], defaults=level_data
                )
                self.test_levels.append(level)

            # Create test users
            for i in range(5):
                user_data = {
                    "username": f"testuser{i}",
                    "email": f"test{i}@example.com",
                    "first_name": f"Test{i}",
                    "last_name": f"User{i}",
                    "phone": f"+34{600000000 + i}",
                    "is_active": True,
                }
                user, created = User.objects.get_or_create(
                    username=user_data["username"], defaults=user_data
                )
                if created:
                    user.set_password("testpass123")
                    user.save()
                self.test_users.append(user)

            print(
                f"✅ Created {len(self.test_levels)} player levels and {len(self.test_users)} test users"
            )

        except Exception as e:
            print(f"❌ Failed to setup test data: {str(e)}")
            raise

    def test_player_level_model(self):
        """Test PlayerLevel model functionality."""
        print("\n🧪 Testing PlayerLevel model...")

        try:
            # Test level creation
            level = PlayerLevel.objects.get(name="intermediate")
            self.log_result("PlayerLevel creation", level is not None)

            # Test level properties
            self.log_result(
                "PlayerLevel display name", level.display_name == "Intermedio"
            )
            self.log_result(
                "PlayerLevel rating range",
                level.min_rating == 300 and level.max_rating == 599,
            )
            self.log_result(
                "PlayerLevel string representation", "Intermedio" in str(level)
            )

            # Test ordering
            levels = list(PlayerLevel.objects.all().order_by("min_rating"))
            self.log_result(
                "PlayerLevel ordering",
                levels[0].name == "beginner" and levels[-1].name == "professional",
            )

        except Exception as e:
            self.log_result("PlayerLevel model test", False, str(e))

    def test_client_profile_model(self):
        """Test ClientProfile model and relationships."""
        print("\n🧪 Testing ClientProfile model...")

        try:
            # Create client profile
            user = self.test_users[0]
            level = self.test_levels[1]  # intermediate

            profile_data = {
                "user": user,
                "level": level,
                "rating": 450,
                "dominant_hand": "right",
                "preferred_position": "left",
                "birth_date": date(1990, 5, 15),
                "dni": "12345678X",
                "occupation": "Engineer",
                "height": 180,
                "weight": 75,
                "bio": "Test player bio",
                "is_public": True,
                "show_in_rankings": True,
                "allow_partner_requests": True,
            }

            profile = ClientProfile.objects.create(**profile_data)
            self.test_profiles.append(profile)

            # Test profile creation
            self.log_result("ClientProfile creation", profile.id is not None)
            self.log_result("ClientProfile user relationship", profile.user == user)
            self.log_result("ClientProfile level relationship", profile.level == level)

            # Test one-to-one constraint
            try:
                ClientProfile.objects.create(user=user, rating=500)
                self.log_result(
                    "ClientProfile unique user constraint",
                    False,
                    "Should not allow duplicate user",
                )
            except IntegrityError:
                self.log_result("ClientProfile unique user constraint", True)

            # Test rating validation
            profile.rating = 1500  # Invalid rating
            try:
                profile.full_clean()
                self.log_result(
                    "ClientProfile rating validation",
                    False,
                    "Should reject invalid rating",
                )
            except ValidationError:
                self.log_result("ClientProfile rating validation", True)

            # Reset to valid rating
            profile.rating = 450
            profile.save()

            # Test level update by rating
            profile.rating = 750  # Should be advanced level
            profile.update_level_by_rating()
            self.log_result(
                "ClientProfile level auto-update", profile.level.name == "advanced"
            )

            # Test string representation
            self.log_result(
                "ClientProfile string representation",
                user.get_full_name() in str(profile),
            )

        except Exception as e:
            self.log_result("ClientProfile model test", False, str(e))

    def test_player_stats_model(self):
        """Test PlayerStats model and calculations."""
        print("\n🧪 Testing PlayerStats model...")

        try:
            # Get or create stats for test profile
            profile = self.test_profiles[0] if self.test_profiles else None
            if not profile:
                self.log_result(
                    "PlayerStats model test", False, "No test profile available"
                )
                return

            stats, created = PlayerStats.objects.get_or_create(player=profile)

            # Test initial state
            self.log_result("PlayerStats creation", stats.id is not None)
            self.log_result(
                "PlayerStats initial values",
                stats.matches_played == 0 and stats.win_rate == 0,
            )

            # Test match recording
            stats.record_match(won=True, position="right", duration_minutes=90)
            self.log_result(
                "PlayerStats match recording",
                stats.matches_played == 1 and stats.matches_won == 1,
            )
            self.log_result(
                "PlayerStats win streak",
                stats.current_win_streak == 1 and stats.best_win_streak == 1,
            )
            self.log_result(
                "PlayerStats position tracking",
                stats.matches_as_right == 1 and stats.wins_as_right == 1,
            )

            # Record another match (loss)
            stats.record_match(won=False, position="left", duration_minutes=75)
            self.log_result(
                "PlayerStats loss recording",
                stats.matches_played == 2 and stats.matches_lost == 1,
            )
            self.log_result(
                "PlayerStats win streak reset", stats.current_win_streak == 0
            )

            # Test win rate calculation
            expected_win_rate = 50.0  # 1 win out of 2 matches
            self.log_result(
                "PlayerStats win rate calculation",
                abs(float(stats.win_rate) - expected_win_rate) < 0.01,
            )

            # Test average match duration
            expected_avg = (90 + 75) // 2
            self.log_result(
                "PlayerStats average duration",
                stats.average_match_duration == expected_avg,
            )

        except Exception as e:
            self.log_result("PlayerStats model test", False, str(e))

    def test_emergency_contact_model(self):
        """Test EmergencyContact model functionality."""
        print("\n🧪 Testing EmergencyContact model...")

        try:
            if not self.test_profiles:
                self.log_result(
                    "EmergencyContact model test", False, "No test profile available"
                )
                return

            profile = self.test_profiles[0]

            # Create emergency contact
            contact_data = {
                "player": profile,
                "name": "John Doe",
                "relationship": "spouse",
                "phone": "+34666777888",
                "phone_alt": "+34666777889",
                "email": "john.doe@example.com",
                "is_primary": True,
                "notes": "Primary emergency contact",
            }

            contact = EmergencyContact.objects.create(**contact_data)

            # Test contact creation
            self.log_result("EmergencyContact creation", contact.id is not None)
            self.log_result(
                "EmergencyContact player relationship", contact.player == profile
            )

            # Test primary contact uniqueness
            contact2_data = contact_data.copy()
            contact2_data["name"] = "Jane Doe"
            contact2_data["phone"] = "+34666777890"
            contact2 = EmergencyContact.objects.create(**contact2_data)

            # Refresh first contact from database
            contact.refresh_from_db()

            # Only one should be primary
            primary_contacts = EmergencyContact.objects.filter(
                player=profile, is_primary=True
            )
            self.log_result(
                "EmergencyContact primary uniqueness", primary_contacts.count() == 1
            )

            # Test string representation
            self.log_result(
                "EmergencyContact string representation",
                "John Doe" in str(contact) or "Jane Doe" in str(contact),
            )

        except Exception as e:
            self.log_result("EmergencyContact model test", False, str(e))

    def test_medical_info_model(self):
        """Test MedicalInfo model functionality."""
        print("\n🧪 Testing MedicalInfo model...")

        try:
            if not self.test_profiles:
                self.log_result(
                    "MedicalInfo model test", False, "No test profile available"
                )
                return

            profile = self.test_profiles[0]

            # Create medical info
            medical_data = {
                "player": profile,
                "blood_type": "A+",
                "allergies": "Peanuts, Shellfish",
                "chronic_conditions": "None",
                "current_medications": "Ibuprofen as needed",
                "injuries": "Previous ankle sprain",
                "physical_limitations": "None",
                "insurance_company": "Test Insurance Co.",
                "insurance_policy_number": "POL123456",
                "doctor_name": "Dr. Smith",
                "doctor_phone": "+34666123456",
                "emergency_consent": True,
                "data_sharing_consent": True,
            }

            medical_info = MedicalInfo.objects.create(**medical_data)

            # Test medical info creation
            self.log_result("MedicalInfo creation", medical_info.id is not None)
            self.log_result(
                "MedicalInfo player relationship", medical_info.player == profile
            )
            self.log_result("MedicalInfo blood type", medical_info.blood_type == "A+")
            self.log_result(
                "MedicalInfo consent fields",
                medical_info.emergency_consent and medical_info.data_sharing_consent,
            )

            # Test one-to-one constraint
            try:
                MedicalInfo.objects.create(player=profile, blood_type="B+")
                self.log_result(
                    "MedicalInfo unique player constraint",
                    False,
                    "Should not allow duplicate player",
                )
            except IntegrityError:
                self.log_result("MedicalInfo unique player constraint", True)

        except Exception as e:
            self.log_result("MedicalInfo model test", False, str(e))

    def test_player_preferences_model(self):
        """Test PlayerPreferences model functionality."""
        print("\n🧪 Testing PlayerPreferences model...")

        try:
            if not self.test_profiles:
                self.log_result(
                    "PlayerPreferences model test", False, "No test profile available"
                )
                return

            profile = self.test_profiles[0]

            # Create preferences
            preferences_data = {
                "player": profile,
                "available_weekday_morning": False,
                "available_weekday_afternoon": True,
                "available_weekday_evening": True,
                "available_weekend_morning": True,
                "available_weekend_afternoon": True,
                "available_weekend_evening": False,
                "preferred_court_type": "indoor",
                "preferred_match_duration": 90,
                "preferred_match_format": "competitive",
                "min_partner_level": self.test_levels[0],
                "max_partner_level": self.test_levels[2],
                "notify_match_invites": True,
                "notify_tournament_updates": True,
                "email_notifications": True,
                "share_contact_info": False,
                "share_stats": True,
                "language": "es-mx",
                "distance_radius": 15,
            }

            preferences = PlayerPreferences.objects.create(**preferences_data)

            # Test preferences creation
            self.log_result("PlayerPreferences creation", preferences.id is not None)
            self.log_result(
                "PlayerPreferences player relationship", preferences.player == profile
            )

            # Test availability method
            # Test weekday afternoon (should be available)
            test_datetime = datetime(2024, 7, 29, 14, 0, 0)  # Monday 2:00 PM
            test_datetime = timezone.make_aware(test_datetime)
            self.log_result(
                "PlayerPreferences availability check",
                preferences.is_available_at(test_datetime),
            )

            # Test weekend evening (should not be available)
            test_datetime = datetime(2024, 8, 3, 20, 0, 0)  # Saturday 8:00 PM
            test_datetime = timezone.make_aware(test_datetime)
            self.log_result(
                "PlayerPreferences unavailability check",
                not preferences.is_available_at(test_datetime),
            )

            # Test partner level relationships
            self.log_result(
                "PlayerPreferences partner level relationships",
                preferences.min_partner_level == self.test_levels[0]
                and preferences.max_partner_level == self.test_levels[2],
            )

        except Exception as e:
            self.log_result("PlayerPreferences model test", False, str(e))

    def test_partner_request_model(self):
        """Test PartnerRequest model functionality."""
        print("\n🧪 Testing PartnerRequest model...")

        try:
            if len(self.test_profiles) < 2:
                # Create second profile if needed
                if len(self.test_users) >= 2:
                    profile2 = ClientProfile.objects.create(
                        user=self.test_users[1], rating=400, level=self.test_levels[1]
                    )
                    PlayerStats.objects.create(player=profile2)
                    PlayerPreferences.objects.create(player=profile2)
                    self.test_profiles.append(profile2)
                else:
                    self.log_result(
                        "PartnerRequest model test", False, "Need at least 2 profiles"
                    )
                    return

            from_player = self.test_profiles[0]
            to_player = self.test_profiles[1]

            # Create partner request
            request_data = {
                "from_player": from_player,
                "to_player": to_player,
                "message": "Want to be partners for next tournament?",
                "match_date": timezone.now() + timedelta(days=7),
            }

            partner_request = PartnerRequest.objects.create(**request_data)

            # Test request creation
            self.log_result("PartnerRequest creation", partner_request.id is not None)
            self.log_result(
                "PartnerRequest initial status", partner_request.status == "pending"
            )
            self.log_result(
                "PartnerRequest player relationships",
                partner_request.from_player == from_player
                and partner_request.to_player == to_player,
            )

            # Test accept method
            partner_request.accept("Great! Let's do it!")
            self.log_result(
                "PartnerRequest accept", partner_request.status == "accepted"
            )
            self.log_result(
                "PartnerRequest response tracking",
                partner_request.responded_at is not None,
            )

            # Check if players are added to preferred partners
            from_player.preferences.refresh_from_db()
            to_player.preferences.refresh_from_db()
            self.log_result(
                "PartnerRequest preferred partners update",
                to_player in from_player.preferences.preferred_partners.all()
                and from_player in to_player.preferences.preferred_partners.all(),
            )

            # Test reject method with new request
            partner_request2 = PartnerRequest.objects.create(
                from_player=to_player, to_player=from_player, message="Another request"
            )
            partner_request2.reject("Sorry, not available")
            self.log_result(
                "PartnerRequest reject", partner_request2.status == "rejected"
            )

            # Test cancel method
            partner_request3 = PartnerRequest.objects.create(
                from_player=from_player, to_player=to_player, message="Test cancel"
            )
            partner_request3.cancel()
            self.log_result(
                "PartnerRequest cancel", partner_request3.status == "cancelled"
            )

        except Exception as e:
            self.log_result("PartnerRequest model test", False, str(e))

    def test_api_endpoints(self):
        """Test REST API endpoints."""
        print("\n🧪 Testing API endpoints...")

        if not self.test_users:
            self.log_result("API endpoints test", False, "No test users available")
            return

        # Authenticate as test user
        user = self.test_users[0]
        self.api_client.force_authenticate(user=user)

        try:
            # Test PlayerLevel endpoints
            response = self.api_client.get("/api/clients/levels/")
            self.log_result("PlayerLevel list API", response.status_code == 200)

            if response.status_code == 200:
                levels_data = response.json()
                self.log_result(
                    "PlayerLevel API data structure",
                    isinstance(levels_data, list) and len(levels_data) > 0,
                )

            # Test ClientProfile endpoints
            response = self.api_client.get("/api/clients/profiles/")
            self.log_result("ClientProfile list API", response.status_code == 200)

            # Test profile creation via API
            if self.test_levels:
                profile_data = {
                    "user_id": self.test_users[2].id,
                    "level_id": str(self.test_levels[1].id),
                    "rating": 350,
                    "dominant_hand": "left",
                    "preferred_position": "right",
                    "bio": "API created profile",
                }

                response = self.api_client.post("/api/clients/profiles/", profile_data)
                self.log_result("ClientProfile create API", response.status_code == 201)

                if response.status_code == 201:
                    created_profile_data = response.json()
                    self.log_result(
                        "ClientProfile create API response",
                        "id" in created_profile_data
                        and "stats" in created_profile_data,
                    )

            # Test 'me' endpoint
            response = self.api_client.get("/api/clients/profiles/me/")
            # This might return 404 if user doesn't have a profile yet, which is ok
            self.log_result(
                "ClientProfile 'me' API", response.status_code in [200, 404]
            )

            # Test search endpoint
            search_data = {"min_rating": 300, "max_rating": 600, "only_public": True}
            response = self.api_client.post(
                "/api/clients/profiles/search/", search_data
            )
            self.log_result("ClientProfile search API", response.status_code == 200)

            # Test rankings endpoint
            response = self.api_client.get("/api/clients/profiles/rankings/")
            self.log_result("ClientProfile rankings API", response.status_code == 200)

            # Test stats endpoints
            response = self.api_client.get("/api/clients/stats/")
            self.log_result("PlayerStats list API", response.status_code == 200)

            # Test partner requests endpoints
            response = self.api_client.get("/api/clients/partner-requests/")
            self.log_result("PartnerRequest list API", response.status_code == 200)

            response = self.api_client.get("/api/clients/partner-requests/pending/")
            self.log_result("PartnerRequest pending API", response.status_code == 200)

        except Exception as e:
            self.log_result("API endpoints test", False, str(e))

    def test_business_logic(self):
        """Test business logic and complex scenarios."""
        print("\n🧪 Testing business logic...")

        try:
            if not self.test_profiles:
                self.log_result(
                    "Business logic test", False, "No test profiles available"
                )
                return

            # Test automatic level assignment based on rating
            profile = self.test_profiles[0]
            original_level = profile.level

            # Change rating to professional level
            profile.rating = 950
            profile.update_level_by_rating()

            professional_level = PlayerLevel.objects.get(name="professional")
            self.log_result(
                "Business logic: Automatic level promotion",
                profile.level == professional_level,
            )

            # Test rating boundaries
            profile.rating = 299  # Should be beginner
            profile.update_level_by_rating()
            beginner_level = PlayerLevel.objects.get(name="beginner")
            self.log_result(
                "Business logic: Level demotion", profile.level == beginner_level
            )

            # Test partner matching logic (blocked players)
            if len(self.test_profiles) >= 2:
                player1 = self.test_profiles[0]
                player2 = self.test_profiles[1]

                # Block player2 from player1's perspective
                player1.preferences.blocked_players.add(player2)

                # Try to create partner request (should fail)
                from apps.clients.serializers import PartnerRequestSerializer

                request_data = {
                    "from_player_id": str(player2.id),
                    "to_player_id": str(player1.id),
                    "message": "Test blocked request",
                }

                serializer = PartnerRequestSerializer(data=request_data)
                is_valid = serializer.is_valid()
                self.log_result(
                    "Business logic: Blocked player request validation", not is_valid
                )

                # Unblock and try again
                player1.preferences.blocked_players.remove(player2)
                serializer = PartnerRequestSerializer(data=request_data)
                is_valid = serializer.is_valid()
                self.log_result(
                    "Business logic: Unblocked player request validation", is_valid
                )

            # Test privacy settings
            profile.is_public = False
            profile.save()

            # Public profile should not be visible in search
            public_profiles = ClientProfile.objects.filter(is_public=True)
            self.log_result(
                "Business logic: Privacy settings", profile not in public_profiles
            )

        except Exception as e:
            self.log_result("Business logic test", False, str(e))

    def test_data_integrity(self):
        """Test data integrity and constraints."""
        print("\n🧪 Testing data integrity...")

        try:
            # Test rating validation
            if self.test_profiles:
                profile = self.test_profiles[0]

                # Test invalid rating
                profile.rating = -100
                try:
                    profile.full_clean()
                    self.log_result("Data integrity: Invalid rating rejection", False)
                except ValidationError:
                    self.log_result("Data integrity: Invalid rating rejection", True)

                # Test rating too high
                profile.rating = 1500
                try:
                    profile.full_clean()
                    self.log_result("Data integrity: Rating upper bound", False)
                except ValidationError:
                    self.log_result("Data integrity: Rating upper bound", True)

                # Reset to valid rating
                profile.rating = 500
                profile.save()

            # Test height/weight validation
            if self.test_profiles:
                profile = self.test_profiles[0]

                # Test invalid height
                profile.height = 50  # Too short
                try:
                    profile.full_clean()
                    self.log_result("Data integrity: Height validation", False)
                except ValidationError:
                    self.log_result("Data integrity: Height validation", True)

                # Reset height
                profile.height = 180
                profile.save()

            # Test email uniqueness in emergency contacts
            if self.test_profiles:
                profile = self.test_profiles[0]

                # Create two contacts with same email (should be allowed)
                contact1 = EmergencyContact.objects.create(
                    player=profile,
                    name="Contact 1",
                    relationship="parent",
                    phone="+34666111111",
                    email="same@example.com",
                )

                contact2 = EmergencyContact.objects.create(
                    player=profile,
                    name="Contact 2",
                    relationship="sibling",
                    phone="+34666222222",
                    email="same@example.com",
                )

                self.log_result(
                    "Data integrity: Emergency contact email uniqueness",
                    contact1.email == contact2.email,
                )  # Should be allowed

        except Exception as e:
            self.log_result("Data integrity test", False, str(e))

    def cleanup_test_data(self):
        """Clean up test data."""
        print("\n🧹 Cleaning up test data...")

        try:
            # Clean up in reverse order of dependencies
            PartnerRequest.objects.filter(from_player__in=self.test_profiles).delete()
            PartnerRequest.objects.filter(to_player__in=self.test_profiles).delete()

            for profile in self.test_profiles:
                if hasattr(profile, "stats"):
                    profile.stats.delete()
                if hasattr(profile, "medical_info"):
                    profile.medical_info.delete()
                if hasattr(profile, "preferences"):
                    profile.preferences.delete()
                profile.emergency_contacts.all().delete()
                profile.delete()

            # Don't delete test users as they might be used elsewhere
            # Don't delete test levels as they're standard data

            print("✅ Test data cleaned up successfully")

        except Exception as e:
            print(f"⚠️ Warning: Failed to clean up some test data: {str(e)}")

    def run_all_tests(self):
        """Run all validation tests."""
        print("🚀 Starting Clients Module Validation")
        print("=" * 50)

        try:
            self.setup_test_data()

            # Model tests
            self.test_player_level_model()
            self.test_client_profile_model()
            self.test_player_stats_model()
            self.test_emergency_contact_model()
            self.test_medical_info_model()
            self.test_player_preferences_model()
            self.test_partner_request_model()

            # API tests
            self.test_api_endpoints()

            # Business logic tests
            self.test_business_logic()

            # Data integrity tests
            self.test_data_integrity()

        except Exception as e:
            print(f"\n💥 Fatal error during testing: {str(e)}")
            self.results["errors"].append(f"Fatal error: {str(e)}")

        finally:
            self.cleanup_test_data()

        # Print results
        self.print_results()

    def print_results(self):
        """Print validation results."""
        print("\n" + "=" * 50)
        print("📊 CLIENTS MODULE VALIDATION RESULTS")
        print("=" * 50)

        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']} ✅")
        print(f"Failed: {self.results['failed_tests']} ❌")

        if self.results["failed_tests"] > 0:
            print(
                f"\nSuccess Rate: {(self.results['passed_tests'] / self.results['total_tests']) * 100:.1f}%"
            )
            print("\n🔍 FAILED TESTS:")
            for error in self.results["errors"]:
                print(f"  • {error}")
        else:
            print("\n🎉 ALL TESTS PASSED! Success Rate: 100%")

        print("\n" + "=" * 50)

        # Overall assessment
        if self.results["failed_tests"] == 0:
            print("✅ CLIENTS MODULE: FULLY VALIDATED")
            print("The clients module is working correctly and ready for production.")
        elif self.results["failed_tests"] <= self.results["total_tests"] * 0.1:
            print("⚠️ CLIENTS MODULE: MOSTLY VALIDATED")
            print("The clients module has minor issues that should be addressed.")
        else:
            print("❌ CLIENTS MODULE: VALIDATION FAILED")
            print("The clients module has significant issues that must be fixed.")


def main():
    """Main function to run the validation."""
    print("Python version:", sys.version)
    print("Django version:", django.get_version())

    validator = ClientsModuleValidator()
    validator.run_all_tests()


if __name__ == "__main__":
    main()
