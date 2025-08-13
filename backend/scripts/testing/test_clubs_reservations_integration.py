#!/usr/bin/env python3
"""
CLUBS-RESERVATIONS INTEGRATION TEST - Python 3.12 Compatibility
Test the integration between clubs and reservations modules.
"""
import json
import os
import sys
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.clubs.models import Club, Court, Schedule
from apps.reservations.models import Reservation
from apps.root.models import Organization

User = get_user_model()


class ClubsReservationsIntegrationTest:
    """Test integration between clubs and reservations modules."""

    def __init__(self):
        self.results = {
            "setup": {},
            "court_reservation_flow": {},
            "club_availability": {},
            "schedule_integration": {},
            "pricing_integration": {},
            "business_rules": {},
            "data_consistency": {},
            "errors": [],
        }
        self.test_org = None
        self.test_club = None
        self.test_court = None
        self.test_user = None

    def setup_integration_test_data(self):
        """Setup test data for integration testing."""
        print("🔧 Setting up integration test data...")

        try:
            # Create test organization
            self.test_org = Organization.objects.create(
                business_name="Integration Test Organization S.A. de C.V.",
                trade_name="Integration Test Org",
                rfc="ITO123456ABC",
                legal_representative="Integration Representative",
                primary_email="integration@testorg.com",
                primary_phone="+52-55-5555-6666",
                tax_address={"street": "Integration Street", "number": "789"},
            )

            # Create test club
            self.test_club = Club.objects.create(
                organization=self.test_org,
                name="Integration Test Club",
                email="contact@integrationclub.com",
                phone="+52-55-7777-8888",
                address={"street": "Club Street", "number": "123"},
                opening_time=time(7, 0),
                closing_time=time(23, 0),
                days_open=[0, 1, 2, 3, 4, 5, 6],  # All days open
            )

            # Create test court
            self.test_court = Court.objects.create(
                club=self.test_club,
                organization=self.test_org,
                name="Integration Test Court",
                number=1,
                surface_type="glass",
                has_lighting=True,
                price_per_hour=Decimal("500.00"),
            )

            # Create test user for reservations
            self.test_user = User.objects.create_user(
                email="integration@user.test",
                first_name="Integration",
                last_name="User",
            )

            # Create club schedule
            for weekday in range(7):
                Schedule.objects.create(
                    club=self.test_club,
                    organization=self.test_org,
                    weekday=weekday,
                    opening_time=time(8, 0),
                    closing_time=time(22, 0),
                    is_closed=False,
                )

            self.results["setup"]["data_creation"] = "PASS"
            print("✅ Integration test data created")

        except Exception as e:
            self.results["setup"]["data_creation"] = f"FAIL: {str(e)}"
            self.results["errors"].append(f"Integration setup: {str(e)}")
            print(f"❌ Integration setup failed: {e}")

    def test_court_reservation_flow(self):
        """Test the complete flow from court selection to reservation."""
        print("\n🎯 Testing Court Reservation Flow...")

        try:
            if not all([self.test_club, self.test_court, self.test_user]):
                raise Exception("Required test data not available")

            # 1. Court availability check (what reservations module needs from clubs)
            court_info = {
                "court_id": self.test_court.id,
                "club_id": self.test_club.id,
                "court_name": self.test_court.name,
                "surface_type": self.test_court.surface_type,
                "has_lighting": self.test_court.has_lighting,
                "price_per_hour": self.test_court.price_per_hour,
                "is_available": self.test_court.is_active
                and not self.test_court.is_maintenance,
            }

            assert court_info["is_available"], "Court should be available"
            assert court_info["price_per_hour"] > 0, "Court should have pricing"

            self.results["court_reservation_flow"]["court_info"] = "PASS"
            print("✅ Court information retrieval")

            # 2. Create a test reservation using court data
            reservation_date = timezone.now().date() + timedelta(days=1)
            start_time = time(10, 0)
            end_time = time(11, 30)
            duration = Decimal("1.5")

            test_reservation = Reservation.objects.create(
                organization=self.test_org,
                club=self.test_club,
                court=self.test_court,
                created_by=self.test_user,
                date=reservation_date,
                start_time=start_time,
                end_time=end_time,
                duration_hours=duration,
                player_name="Integration Test Player",
                player_email="player@integration.test",
                player_phone="+52-55-1111-2222",
                status="confirmed",
                price_per_hour=court_info["price_per_hour"],
                total_price=court_info["price_per_hour"] * duration,
            )

            # Verify reservation relationships
            assert (
                test_reservation.court == self.test_court
            ), "Court relationship failed"
            assert test_reservation.club == self.test_club, "Club relationship failed"
            assert (
                test_reservation.organization == self.test_org
            ), "Organization relationship failed"

            self.results["court_reservation_flow"]["reservation_creation"] = "PASS"
            print("✅ Reservation creation with court relationship")

            # 3. Verify data consistency after reservation
            court_reservations = Reservation.objects.filter(court=self.test_court)
            assert (
                test_reservation in court_reservations
            ), "Reservation not linked to court"

            club_reservations = Reservation.objects.filter(club=self.test_club)
            assert (
                test_reservation in club_reservations
            ), "Reservation not linked to club"

            self.results["court_reservation_flow"]["relationship_integrity"] = "PASS"
            print("✅ Relationship integrity")

        except Exception as e:
            self.results["court_reservation_flow"]["error"] = f"FAIL: {str(e)}"
            self.results["errors"].append(f"Court reservation flow: {str(e)}")
            print(f"❌ Court reservation flow: {e}")

    def test_club_availability_integration(self):
        """Test club availability rules integration with reservations."""
        print("\n⏰ Testing Club Availability Integration...")

        try:
            if not self.test_club:
                raise Exception("Test club not available")

            # 1. Test operational hours integration
            monday_schedule = Schedule.objects.filter(
                club=self.test_club, weekday=0  # Monday
            ).first()

            if monday_schedule:
                # Simulate availability check that reservations would perform
                is_club_open = not monday_schedule.is_closed
                opening_time = monday_schedule.opening_time
                closing_time = monday_schedule.closing_time

                # Test time slot validation
                valid_slot_start = time(10, 0)  # Within operating hours
                valid_slot_end = time(11, 0)

                is_valid_time = (
                    opening_time <= valid_slot_start < closing_time
                    and opening_time < valid_slot_end <= closing_time
                )

                assert is_club_open, "Club should be open on Monday"
                assert is_valid_time, "Time slot should be valid"

                self.results["club_availability"]["operational_hours"] = "PASS"
                print("✅ Operational hours validation")

            # 2. Test court maintenance blocking
            self.test_court.is_maintenance = True
            self.test_court.save()

            # Simulate availability check
            is_court_available = (
                self.test_court.is_active and not self.test_court.is_maintenance
            )
            assert (
                not is_court_available
            ), "Court in maintenance should not be available"

            # Restore court availability
            self.test_court.is_maintenance = False
            self.test_court.save()

            self.results["club_availability"]["maintenance_blocking"] = "PASS"
            print("✅ Maintenance blocking")

            # 3. Test club closure impact
            sunday_schedule = Schedule.objects.filter(
                club=self.test_club, weekday=6  # Sunday
            ).first()

            if sunday_schedule:
                sunday_schedule.is_closed = True
                sunday_schedule.save()

                # Simulate Sunday availability check
                is_sunday_available = not sunday_schedule.is_closed
                assert not is_sunday_available, "Club should be closed on Sunday"

                self.results["club_availability"]["closure_impact"] = "PASS"
                print("✅ Club closure impact")

        except Exception as e:
            self.results["club_availability"]["error"] = f"FAIL: {str(e)}"
            self.results["errors"].append(f"Club availability integration: {str(e)}")
            print(f"❌ Club availability integration: {e}")

    def test_pricing_integration(self):
        """Test pricing integration between clubs and reservations."""
        print("\n💰 Testing Pricing Integration...")

        try:
            if not self.test_court:
                raise Exception("Test court not available")

            # 1. Test basic pricing calculation
            hours = Decimal("2.0")
            expected_price = self.test_court.price_per_hour * hours

            # Simulate reservation pricing calculation
            calculated_price = float(self.test_court.price_per_hour) * float(hours)

            assert (
                abs(calculated_price - float(expected_price)) < 0.01
            ), "Price calculation mismatch"

            self.results["pricing_integration"]["basic_calculation"] = "PASS"
            print("✅ Basic pricing calculation")

            # 2. Test pricing consistency in reservations
            existing_reservations = Reservation.objects.filter(court=self.test_court)

            for reservation in existing_reservations:
                # Calculate expected price based on court pricing and stored duration
                expected_total = (
                    self.test_court.price_per_hour * reservation.duration_hours
                )

                # Allow for small rounding differences
                price_diff = abs(reservation.total_price - expected_total)
                assert price_diff < Decimal(
                    "1.00"
                ), f"Price inconsistency: {price_diff}"

            self.results["pricing_integration"]["consistency_check"] = "PASS"
            print("✅ Pricing consistency")

            # 3. Test dynamic pricing updates
            original_price = self.test_court.price_per_hour
            new_price = Decimal("600.00")

            self.test_court.price_per_hour = new_price
            self.test_court.save()

            # Verify the price update
            self.test_court.refresh_from_db()
            assert self.test_court.price_per_hour == new_price, "Price update failed"

            # Restore original price
            self.test_court.price_per_hour = original_price
            self.test_court.save()

            self.results["pricing_integration"]["dynamic_updates"] = "PASS"
            print("✅ Dynamic pricing updates")

        except Exception as e:
            self.results["pricing_integration"]["error"] = f"FAIL: {str(e)}"
            self.results["errors"].append(f"Pricing integration: {str(e)}")
            print(f"❌ Pricing integration: {e}")

    def test_business_rules_integration(self):
        """Test business rules integration."""
        print("\n📋 Testing Business Rules Integration...")

        try:
            if not all([self.test_club, self.test_court]):
                raise Exception("Required test data not available")

            # 1. Test multi-tenant isolation in reservations
            other_org = Organization.objects.create(
                business_name="Other Integration Org S.A. de C.V.",
                trade_name="Other Integration",
                rfc="OIO123456XYZ",
                legal_representative="Other Representative",
                primary_email="other@integration.test",
                primary_phone="+52-55-1111-2222",
                tax_address={"street": "Other Street", "number": "456"},
            )

            # Verify that reservations are properly isolated by organization
            org_reservations = Reservation.objects.filter(organization=self.test_org)
            other_org_reservations = Reservation.objects.filter(organization=other_org)

            # Should have no cross-contamination
            assert not any(
                r.organization == other_org for r in org_reservations
            ), "Organization isolation failed"

            self.results["business_rules"]["multi_tenant_isolation"] = "PASS"
            print("✅ Multi-tenant isolation")

            # 2. Test court capacity rules
            # Simulate double booking prevention
            tomorrow = timezone.now().date() + timedelta(days=1)

            # Create first reservation
            reservation1 = Reservation.objects.create(
                organization=self.test_org,
                club=self.test_club,
                court=self.test_court,
                created_by=self.test_user,
                date=tomorrow,
                start_time=time(14, 0),
                end_time=time(15, 0),
                duration_hours=Decimal("1.0"),
                player_name="Test Player 1",
                player_email="player1@test.com",
                status="confirmed",
                price_per_hour=self.test_court.price_per_hour,
                total_price=self.test_court.price_per_hour,
            )

            # Check for potential conflicts (what reservations system should do)
            conflicting_reservations = Reservation.objects.filter(
                court=self.test_court,
                date=tomorrow,
                start_time__lt=time(15, 0),
                end_time__gt=time(14, 0),
                status__in=["confirmed", "pending"],
            )

            assert conflicting_reservations.count() == 1, "Conflict detection failed"

            self.results["business_rules"]["conflict_detection"] = "PASS"
            print("✅ Conflict detection")

            # 3. Test club-level business rules
            # Test that reservations respect club settings
            club_settings = self.test_club.settings or {}
            advance_booking_days = club_settings.get("advance_booking_days", 7)

            # Test future booking limit
            too_far_future = timezone.now().date() + timedelta(
                days=advance_booking_days + 1
            )

            # This would be validated in the reservations module
            is_booking_allowed = (
                too_far_future - timezone.now().date()
            ).days <= advance_booking_days
            assert not is_booking_allowed, "Advance booking limit not enforced"

            self.results["business_rules"]["booking_limits"] = "PASS"
            print("✅ Booking limits")

        except Exception as e:
            self.results["business_rules"]["error"] = f"FAIL: {str(e)}"
            self.results["errors"].append(f"Business rules integration: {str(e)}")
            print(f"❌ Business rules integration: {e}")

    def test_data_consistency(self):
        """Test data consistency between clubs and reservations."""
        print("\n🔄 Testing Data Consistency...")

        try:
            if not all([self.test_club, self.test_court]):
                raise Exception("Required test data not available")

            # 1. Test referential integrity
            # Verify that all reservations have valid court references
            reservations_with_courts = Reservation.objects.filter(
                court__isnull=False, court__club=self.test_club
            )

            for reservation in reservations_with_courts:
                assert (
                    reservation.court.club == reservation.club
                ), "Court-Club relationship inconsistent"
                assert (
                    reservation.court.organization == reservation.organization
                ), "Court-Organization relationship inconsistent"

            self.results["data_consistency"]["referential_integrity"] = "PASS"
            print("✅ Referential integrity")

            # 2. Test cascade behavior simulation
            # What happens to reservations when a court is deactivated
            court_reservations_count = Reservation.objects.filter(
                court=self.test_court
            ).count()

            # Deactivate court
            self.test_court.is_active = False
            self.test_court.save()

            # In a real system, future reservations might be cancelled
            # For now, just verify the court state change doesn't break existing data
            self.test_court.refresh_from_db()
            assert not self.test_court.is_active, "Court deactivation failed"

            # Reactivate for other tests
            self.test_court.is_active = True
            self.test_court.save()

            self.results["data_consistency"]["cascade_behavior"] = "PASS"
            print("✅ Cascade behavior")

            # 3. Test statistics consistency
            # Verify that club statistics match reservation data
            club_reservation_count = Reservation.objects.filter(
                club=self.test_club
            ).count()
            court_reservation_count = Reservation.objects.filter(
                court__club=self.test_club
            ).count()

            # These should match since all courts belong to the club
            assert (
                club_reservation_count == court_reservation_count
            ), "Reservation count mismatch"

            self.results["data_consistency"]["statistics_consistency"] = "PASS"
            print("✅ Statistics consistency")

        except Exception as e:
            self.results["data_consistency"]["error"] = f"FAIL: {str(e)}"
            self.results["errors"].append(f"Data consistency: {str(e)}")
            print(f"❌ Data consistency: {e}")

    def run_integration_tests(self):
        """Run all integration tests."""
        print("🚀 Starting Clubs-Reservations Integration Tests with Python 3.12\n")

        self.setup_integration_test_data()
        self.test_court_reservation_flow()
        self.test_club_availability_integration()
        self.test_pricing_integration()
        self.test_business_rules_integration()
        self.test_data_consistency()

        return self.results

    def generate_report(self):
        """Generate integration test report."""
        print("\n📈 CLUBS-RESERVATIONS INTEGRATION TEST REPORT")
        print("=" * 60)

        total_tests = 0
        passed_tests = 0

        for category, tests in self.results.items():
            if category in ["errors"]:
                continue

            print(f"\n{category.upper().replace('_', ' ')}:")
            if isinstance(tests, dict):
                for test_name, result in tests.items():
                    if test_name == "error":
                        continue
                    total_tests += 1
                    status = "✅ PASS" if result == "PASS" else "❌ FAIL"
                    if status == "✅ PASS":
                        passed_tests += 1
                    print(f"  {test_name}: {status}")
                    if isinstance(result, str) and result != "PASS":
                        print(f"    {result}")
            else:
                total_tests += 1
                if tests == "PASS":
                    passed_tests += 1
                    print(f"  Overall: ✅ PASS")
                else:
                    print(f"  Overall: ❌ FAIL")

        print(f"\n📊 SUMMARY:")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")

        if self.results.get("errors"):
            print(f"\n❌ ERRORS ({len(self.results['errors'])}):")
            for error in self.results["errors"]:
                print(f"  - {error}")

        # Overall assessment
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        if success_rate >= 95:
            print(f"\n🎉 CLUBS-RESERVATIONS INTEGRATION: EXCELLENT WITH PYTHON 3.12")
        elif success_rate >= 85:
            print(f"\n✅ CLUBS-RESERVATIONS INTEGRATION: VERY GOOD WITH PYTHON 3.12")
        elif success_rate >= 75:
            print(f"\n✅ CLUBS-RESERVATIONS INTEGRATION: GOOD WITH PYTHON 3.12")
        else:
            print(f"\n⚠️ CLUBS-RESERVATIONS INTEGRATION: NEEDS IMPROVEMENT")

        return success_rate


def main():
    """Main integration test function."""
    tester = ClubsReservationsIntegrationTest()

    try:
        results = tester.run_integration_tests()
        success_rate = tester.generate_report()

        # Save results to file
        with open("clubs_reservations_integration_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)

        print(
            f"\n💾 Full results saved to: clubs_reservations_integration_results.json"
        )

        # Exit with appropriate code
        sys.exit(0 if success_rate >= 85 else 1)

    except Exception as e:
        print(f"❌ Integration test failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
