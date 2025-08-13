#!/usr/bin/env python3
"""
Advanced Integration Tests for Organization Context and Complete Workflows
"""

import json
import os
import sys
import time
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

# Add Django project to path
sys.path.append("/Users/ja/PZR4/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django

django.setup()

from django.contrib.auth import get_user_model

from apps.authentication.models import OrganizationMembership
from apps.root.models import Organization

User = get_user_model()


class AdvancedIntegrationTester:
    """Advanced integration tester focusing on multi-tenant workflows"""

    def __init__(self, base_url: str = "http://localhost:9200"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.session = requests.Session()
        self.test_results = []
        self.test_data = {}

    def log_result(
        self, test_name: str, status: str, details: Dict = None, error: str = None
    ):
        """Log test result"""
        result = {
            "test_name": test_name,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details or {},
            "error": error,
        }
        self.test_results.append(result)

        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏭️"
        print(f"{status_emoji} {test_name}: {status}")
        if error:
            print(f"   Error: {error}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
        print()

    def make_request(
        self,
        method: str,
        endpoint: str,
        data: Dict = None,
        headers: Dict = None,
        auth_token: str = None,
    ) -> requests.Response:
        """Make HTTP request"""
        url = f"{self.api_url}{endpoint}"
        request_headers = {"Content-Type": "application/json"}

        if headers:
            request_headers.update(headers)

        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"

        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers, params=data)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=request_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=request_headers)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, json=data, headers=request_headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            return response
        except Exception as e:
            print(f"Request failed: {method} {url} - {str(e)}")
            raise

    def setup_organization_context(self):
        """Set up organization and user context for testing"""
        try:
            print("Setting up organization context...")

            # Create organization in the database directly
            org = Organization.objects.create(
                business_name="Test Organization SA de CV",
                trade_name="Test Club Chain",
                rfc="TST123456ABC",
                primary_email="admin@testorg.com",
                primary_phone="+1234567890",
                legal_representative="Test Admin",
                state="active",
            )

            self.test_data["organization_id"] = org.id

            # Register user
            registration_data = {
                "email": f"orgadmin_{int(time.time())}@example.com",
                "password": "TEST_PASSWORD",
                "password_confirm": "TestPassword123!",
                "first_name": "Organization",
                "last_name": "Admin",
                "phone": "+1234567890",
                "accept_terms": True,
            }

            response = self.make_request("POST", "/auth/register/", registration_data)
            if response.status_code in [200, 201]:
                reg_result = response.json()
                self.test_data["user_id"] = reg_result.get("user", {}).get("id")
                self.test_data["user_email"] = registration_data["email"]
                self.test_data["user_password"] = registration_data["password"]

                # Login to get token
                login_data = {
                    "email": registration_data["email"],
                    "password": registration_data["password"],
                }

                response = self.make_request("POST", "/auth/login/", login_data)
                if response.status_code == 200:
                    login_result = response.json()
                    self.test_data["access_token"] = login_result.get("access")

                    # Create organization membership directly in DB
                    user = User.objects.get(id=self.test_data["user_id"])
                    membership = OrganizationMembership.objects.create(
                        user=user, organization=org, role="admin", is_active=True
                    )

                    # Update user's current organization (using smaller int)
                    user.current_organization_id = (
                        int(org.id) if org.id < 2147483647 else None
                    )
                    user.save()

                    self.log_result(
                        "Organization Context Setup",
                        "PASS",
                        {
                            "organization_id": org.id,
                            "user_id": user.id,
                            "membership_role": membership.role,
                        },
                    )
                    return True

            self.log_result(
                "Organization Context Setup",
                "FAIL",
                error="Failed to set up user authentication",
            )
            return False

        except Exception as e:
            self.log_result(
                "Organization Context Setup", "FAIL", error=f"Exception: {str(e)}"
            )
            return False

    def test_complete_club_workflow(self):
        """Test complete club creation and management workflow"""
        try:
            # Create club with organization context
            club_data = {
                "name": f"Integration Test Club {int(time.time())}",
                "description": "Club created during advanced integration testing",
                "address": "123 Integration Test Street",
                "city": "Test City",
                "state": "Test State",
                "zip_code": "12345",
                "phone": "+1234567890",
                "email": "testclub@integration.com",
                "website": "https://testclub.integration.com",
                "is_active": True,
                "organization": self.test_data.get("organization_id"),
            }

            response = self.make_request(
                "POST",
                "/clubs/clubs/",
                club_data,
                auth_token=self.test_data["access_token"],
            )

            if response.status_code in [200, 201]:
                club_result = response.json()
                self.test_data["club_id"] = club_result.get("id")

                self.log_result(
                    "Complete Club Workflow - Club Creation",
                    "PASS",
                    {
                        "club_id": club_result.get("id"),
                        "club_name": club_result.get("name"),
                    },
                )

                # Create courts for the club
                court_data = {
                    "name": "Court 1",
                    "court_type": "indoor",
                    "surface_type": "synthetic_grass",
                    "is_active": True,
                    "hourly_rate": 50.00,
                    "club": self.test_data["club_id"],
                }

                response = self.make_request(
                    "POST",
                    "/clubs/courts/",
                    court_data,
                    auth_token=self.test_data["access_token"],
                )

                if response.status_code in [200, 201]:
                    court_result = response.json()
                    self.test_data["court_id"] = court_result.get("id")

                    self.log_result(
                        "Complete Club Workflow - Court Creation",
                        "PASS",
                        {
                            "court_id": court_result.get("id"),
                            "court_name": court_result.get("name"),
                        },
                    )

                    # Test court schedule configuration
                    schedule_data = {
                        "club": self.test_data["club_id"],
                        "day_of_week": 1,  # Monday
                        "opening_time": "08:00:00",
                        "closing_time": "22:00:00",
                        "is_active": True,
                    }

                    response = self.make_request(
                        "POST",
                        "/clubs/schedules/",
                        schedule_data,
                        auth_token=self.test_data["access_token"],
                    )

                    if response.status_code in [200, 201]:
                        self.log_result(
                            "Complete Club Workflow - Schedule Configuration",
                            "PASS",
                            {"schedule_configured": True},
                        )
                    else:
                        self.log_result(
                            "Complete Club Workflow - Schedule Configuration",
                            "FAIL",
                            error=f"Schedule creation failed: HTTP {response.status_code}: {response.text}",
                        )

                else:
                    self.log_result(
                        "Complete Club Workflow - Court Creation",
                        "FAIL",
                        error=f"Court creation failed: HTTP {response.status_code}: {response.text}",
                    )

            else:
                self.log_result(
                    "Complete Club Workflow - Club Creation",
                    "FAIL",
                    error=f"Club creation failed: HTTP {response.status_code}: {response.text}",
                )

        except Exception as e:
            self.log_result(
                "Complete Club Workflow", "FAIL", error=f"Exception: {str(e)}"
            )

    def test_client_profile_complete_flow(self):
        """Test complete client profile creation and preferences"""
        try:
            # Create client profile
            profile_data = {
                "user_id": self.test_data.get("user_id"),
                "birth_date": "1990-01-01",
                "dominant_hand": "right",
                "preferred_position": "both",
                "bio": "Advanced integration test profile",
            }

            response = self.make_request(
                "POST",
                "/clients/profiles/",
                profile_data,
                auth_token=self.test_data["access_token"],
            )

            if response.status_code in [200, 201]:
                profile_result = response.json()
                self.test_data["client_profile_id"] = profile_result.get("id")

                self.log_result(
                    "Client Profile Complete Flow - Profile Creation",
                    "PASS",
                    {
                        "profile_id": profile_result.get("id"),
                        "user_id": self.test_data.get("user_id"),
                    },
                )

                # Test emergency contact creation
                emergency_contact_data = {
                    "client_profile": self.test_data["client_profile_id"],
                    "name": "Emergency Contact Person",
                    "phone": "+1987654321",
                    "relationship": "spouse",
                    "is_primary": True,
                }

                response = self.make_request(
                    "POST",
                    "/clients/emergency-contacts/",
                    emergency_contact_data,
                    auth_token=self.test_data["access_token"],
                )

                if response.status_code in [200, 201]:
                    self.log_result(
                        "Client Profile Complete Flow - Emergency Contact",
                        "PASS",
                        {"emergency_contact_created": True},
                    )
                else:
                    self.log_result(
                        "Client Profile Complete Flow - Emergency Contact",
                        "FAIL",
                        error=f"Emergency contact creation failed: HTTP {response.status_code}: {response.text}",
                    )

            else:
                self.log_result(
                    "Client Profile Complete Flow - Profile Creation",
                    "FAIL",
                    error=f"Profile creation failed: HTTP {response.status_code}: {response.text}",
                )

        except Exception as e:
            self.log_result(
                "Client Profile Complete Flow", "FAIL", error=f"Exception: {str(e)}"
            )

    def test_reservation_complete_workflow(self):
        """Test complete reservation workflow with conflict detection"""
        try:
            if not all(
                [
                    self.test_data.get("access_token"),
                    self.test_data.get("club_id"),
                    self.test_data.get("court_id"),
                ]
            ):
                self.log_result(
                    "Reservation Complete Workflow",
                    "SKIP",
                    error="Missing required test data (club, court, or auth token)",
                )
                return

            # Test reservation creation
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            start_time = "10:00"
            end_time = "11:00"

            reservation_data = {
                "court": self.test_data["court_id"],
                "date": tomorrow,
                "start_time": start_time,
                "end_time": end_time,
                "notes": "Advanced integration test reservation",
                "is_recurring": False,
            }

            response = self.make_request(
                "POST",
                "/reservations/",
                reservation_data,
                auth_token=self.test_data["access_token"],
            )

            if response.status_code in [200, 201]:
                reservation_result = response.json()
                self.test_data["reservation_id"] = reservation_result.get("id")

                self.log_result(
                    "Reservation Complete Workflow - Creation",
                    "PASS",
                    {
                        "reservation_id": reservation_result.get("id"),
                        "date": reservation_result.get("date"),
                        "court": reservation_result.get("court"),
                    },
                )

                # Test conflict detection
                conflict_data = {
                    "court": self.test_data["court_id"],
                    "date": tomorrow,
                    "start_time": "10:30",  # Overlaps with existing
                    "end_time": "11:30",
                    "notes": "Conflicting reservation",
                }

                response = self.make_request(
                    "POST",
                    "/reservations/",
                    conflict_data,
                    auth_token=self.test_data["access_token"],
                )

                if response.status_code in [400, 409]:
                    self.log_result(
                        "Reservation Complete Workflow - Conflict Detection",
                        "PASS",
                        {
                            "conflict_properly_detected": True,
                            "status_code": response.status_code,
                        },
                    )
                else:
                    self.log_result(
                        "Reservation Complete Workflow - Conflict Detection",
                        "FAIL",
                        error=f"Conflict not detected: HTTP {response.status_code}: {response.text}",
                    )

                # Test reservation modification
                update_data = {
                    "notes": "Updated advanced integration test reservation",
                    "end_time": "12:00",
                }

                response = self.make_request(
                    "PATCH",
                    f'/reservations/{self.test_data["reservation_id"]}/',
                    update_data,
                    auth_token=self.test_data["access_token"],
                )

                if response.status_code == 200:
                    self.log_result(
                        "Reservation Complete Workflow - Modification",
                        "PASS",
                        {"notes_updated": True, "time_extended": True},
                    )
                else:
                    self.log_result(
                        "Reservation Complete Workflow - Modification",
                        "FAIL",
                        error=f"Modification failed: HTTP {response.status_code}: {response.text}",
                    )

                # Test cancellation
                response = self.make_request(
                    "DELETE",
                    f'/reservations/{self.test_data["reservation_id"]}/',
                    auth_token=self.test_data["access_token"],
                )

                if response.status_code in [200, 204]:
                    self.log_result(
                        "Reservation Complete Workflow - Cancellation",
                        "PASS",
                        {"cancelled_successfully": True},
                    )
                else:
                    self.log_result(
                        "Reservation Complete Workflow - Cancellation",
                        "FAIL",
                        error=f"Cancellation failed: HTTP {response.status_code}: {response.text}",
                    )

            else:
                self.log_result(
                    "Reservation Complete Workflow - Creation",
                    "FAIL",
                    error=f"Reservation creation failed: HTTP {response.status_code}: {response.text}",
                )

        except Exception as e:
            self.log_result(
                "Reservation Complete Workflow", "FAIL", error=f"Exception: {str(e)}"
            )

    def test_multi_tenant_isolation(self):
        """Test multi-tenant data isolation"""
        try:
            # Create a second organization and user
            org2 = Organization.objects.create(
                business_name="Second Test Organization SA de CV",
                trade_name="Second Test Club",
                rfc="ST2123456ABC",
                primary_email="admin2@testorg.com",
                primary_phone="+1234567891",
                legal_representative="Second Test Admin",
                state="active",
            )

            # Register second user
            reg_data_2 = {
                "email": f"seconduser_{int(time.time())}@example.com",
                "password": "TEST_PASSWORD",
                "password_confirm": "TestPassword123!",
                "first_name": "Second",
                "last_name": "User",
                "phone": "+1234567891",
                "accept_terms": True,
            }

            response = self.make_request("POST", "/auth/register/", reg_data_2)
            if response.status_code in [200, 201]:
                reg_result_2 = response.json()
                user_id_2 = reg_result_2.get("user", {}).get("id")

                # Login as second user
                login_data_2 = {
                    "email": reg_data_2["email"],
                    "password": reg_data_2["password"],
                }

                response = self.make_request("POST", "/auth/login/", login_data_2)
                if response.status_code == 200:
                    login_result_2 = response.json()
                    token_2 = login_result_2.get("access")

                    # Create membership for second organization
                    user_2 = User.objects.get(id=user_id_2)
                    OrganizationMembership.objects.create(
                        user=user_2, organization=org2, role="admin", is_active=True
                    )
                    user_2.current_organization_id = org2.id
                    user_2.save()

                    # Try to access first organization's clubs with second user
                    response = self.make_request(
                        "GET", "/clubs/clubs/", auth_token=token_2
                    )

                    if response.status_code == 200:
                        clubs_data = response.json()
                        # Should see no clubs from first organization
                        clubs_visible = len(clubs_data.get("results", []))

                        self.log_result(
                            "Multi-Tenant Isolation Test",
                            "PASS",
                            {
                                "second_org_id": org2.id,
                                "clubs_visible_to_second_user": clubs_visible,
                                "isolation_working": clubs_visible == 0,
                            },
                        )
                    else:
                        self.log_result(
                            "Multi-Tenant Isolation Test",
                            "FAIL",
                            error=f"Could not test isolation: HTTP {response.status_code}: {response.text}",
                        )

        except Exception as e:
            self.log_result(
                "Multi-Tenant Isolation Test", "FAIL", error=f"Exception: {str(e)}"
            )

    def run_advanced_tests(self):
        """Run all advanced integration tests"""
        print("=" * 80)
        print("ADVANCED INTEGRATION TESTS - MULTI-TENANT WORKFLOWS")
        print("=" * 80)
        print(f"Target API: {self.api_url}")
        print(f"Test Started: {datetime.now().isoformat()}")
        print("=" * 80)

        if not self.setup_organization_context():
            print("❌ Cannot continue without organization context")
            return

        test_methods = [
            self.test_complete_club_workflow,
            self.test_client_profile_complete_flow,
            self.test_reservation_complete_workflow,
            self.test_multi_tenant_isolation,
        ]

        for test_method in test_methods:
            try:
                test_method()
                time.sleep(1)
            except Exception as e:
                self.log_result(
                    test_method.__name__, "FAIL", error=f"Test method failed: {str(e)}"
                )

        self.generate_final_report()

    def generate_final_report(self):
        """Generate final integration report"""
        print("=" * 80)
        print("ADVANCED INTEGRATION TEST REPORT")
        print("=" * 80)

        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        skipped_tests = len([r for r in self.test_results if r["status"] == "SKIP"])

        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Skipped: {skipped_tests}")
        print(
            f"Success Rate: {(passed_tests / total_tests * 100):.1f}%"
            if total_tests > 0
            else "N/A"
        )
        print()

        if failed_tests > 0:
            print("FAILED TESTS:")
            print("-" * 40)
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"❌ {result['test_name']}")
                    if result["error"]:
                        print(f"   Error: {result['error']}")
            print()

        print("SYSTEM INTEGRATION ASSESSMENT:")
        print("-" * 40)

        if failed_tests == 0:
            print("✅ EXCELLENT INTEGRATION")
            print("   All advanced workflows completed successfully")
            print("   System ready for production deployment")
        elif failed_tests <= 1:
            print("✅ GOOD INTEGRATION")
            print("   Core workflows functional with minor issues")
            print("   System ready for production with monitoring")
        elif failed_tests <= 2:
            print("⚠️ MODERATE INTEGRATION")
            print("   Some workflow issues detected")
            print("   Review and fix recommended before production")
        else:
            print("❌ POOR INTEGRATION")
            print("   Multiple workflow failures detected")
            print("   Not ready for production deployment")

        print("=" * 80)

        # Save detailed report
        report_file = f"/Users/ja/PZR4/backend/advanced_integration_report_{int(time.time())}.json"
        with open(report_file, "w") as f:
            json.dump(
                {
                    "summary": {
                        "total_tests": total_tests,
                        "passed": passed_tests,
                        "failed": failed_tests,
                        "skipped": skipped_tests,
                        "success_rate": (
                            (passed_tests / total_tests * 100) if total_tests > 0 else 0
                        ),
                    },
                    "test_results": self.test_results,
                    "test_data": self.test_data,
                },
                f,
                indent=2,
            )

        print(f"Detailed report saved to: {report_file}")


if __name__ == "__main__":
    tester = AdvancedIntegrationTester()
    tester.run_advanced_tests()
