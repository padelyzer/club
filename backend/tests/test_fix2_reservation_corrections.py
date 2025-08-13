#!/usr/bin/env python
"""
FIX-2: Tests unitarios para correcciones del módulo de reservas.
Tests for reservation admin fixes, model updates, and business logic.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from apps.reservations.models import Reservation
from apps.reservations.admin import ReservationAdmin
from apps.reservations.services import ReservationService, ReservationValidator
from apps.clubs.models import Club, Court
from apps.root.models import Organization
from apps.clients.models import ClientProfile

User = get_user_model()


class TestReservationAdminFixes(TestCase):
    """Test reservation admin panel fixes."""
    
    def setUp(self):
        """Set up test data."""
        self.site = AdminSite()
        self.admin = ReservationAdmin(Reservation, self.site)
        
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        self.reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=timezone.now().date(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='confirmed'
        )
    
    def test_admin_list_display_fields(self):
        """Test that admin list display works without errors."""
        expected_fields = [
            "date", "time_slot", "club_name", "court_name", 
            "player_name", "status_badge", "payment_status_badge", 
            "total_price", "reservation_type"
        ]
        
        for field in expected_fields:
            self.assertIn(field, self.admin.list_display)
    
    def test_admin_custom_methods(self):
        """Test admin custom methods work correctly."""
        # Test time_slot method
        time_slot = self.admin.time_slot(self.reservation)
        expected = f"{self.reservation.start_time} - {self.reservation.end_time}"
        self.assertEqual(time_slot, expected)
        
        # Test club_name method
        club_name = self.admin.club_name(self.reservation)
        self.assertEqual(club_name, self.club.name)
        
        # Test court_name method
        court_name = self.admin.court_name(self.reservation)
        self.assertEqual(court_name, self.court.name)
        
        # Test status_badge method
        status_badge = self.admin.status_badge(self.reservation)
        self.assertIn('confirmed', status_badge)
        self.assertIn('color: green', status_badge)
        
        # Test payment_status_badge method
        payment_badge = self.admin.payment_status_badge(self.reservation)
        self.assertIn('pending', payment_badge)  # Default payment status
        self.assertIn('color: orange', payment_badge)
    
    def test_admin_fieldsets(self):
        """Test admin fieldsets configuration."""
        fieldsets = self.admin.get_fieldsets(None, self.reservation)
        
        # Check main sections exist
        section_names = [fs[0] for fs in fieldsets if fs[0]]
        expected_sections = ['Reservation Details', 'Player Information', 'Payment Information']
        
        for section in expected_sections:
            self.assertIn(section, section_names)
    
    def test_admin_readonly_fields(self):
        """Test admin readonly fields."""
        readonly_fields = self.admin.get_readonly_fields(None, self.reservation)
        
        expected_readonly = ['created_at', 'updated_at', 'check_in_code']
        
        for field in expected_readonly:
            self.assertIn(field, readonly_fields)
    
    def test_admin_list_filters(self):
        """Test admin list filters."""
        expected_filters = ['status', 'payment_status', 'date', 'club', 'court']
        
        for filter_field in expected_filters:
            self.assertIn(filter_field, self.admin.list_filter)
    
    def test_admin_search_fields(self):
        """Test admin search fields."""
        expected_search = ['player_name', 'player_email', 'check_in_code']
        
        for search_field in expected_search:
            self.assertIn(search_field, self.admin.search_fields)


class TestReservationModelUpdates(TestCase):
    """Test reservation model field updates and validations."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
    
    def test_reservation_creation_with_all_fields(self):
        """Test reservation creation with all new fields."""
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=timezone.now().date(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            price_per_hour=Decimal('500.00'),
            duration_hours=1,
            status='confirmed',
            payment_status='paid',
            reservation_type='single',
            requires_partner=False,
            is_recurring=False,
            source='web',
            notes='Test reservation',
            special_requests='No special requests'
        )
        
        # Verify all fields are set correctly
        self.assertEqual(reservation.price_per_hour, Decimal('500.00'))
        self.assertEqual(reservation.duration_hours, 1)
        self.assertEqual(reservation.reservation_type, 'single')
        self.assertFalse(reservation.requires_partner)
        self.assertFalse(reservation.is_recurring)
        self.assertEqual(reservation.source, 'web')
        self.assertEqual(reservation.notes, 'Test reservation')
        self.assertEqual(reservation.special_requests, 'No special requests')
    
    def test_check_in_code_generation(self):
        """Test automatic check-in code generation."""
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=timezone.now().date(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00')
        )
        
        # Check that check-in code was generated
        self.assertIsNotNone(reservation.check_in_code)
        self.assertEqual(len(reservation.check_in_code), 8)
        self.assertTrue(reservation.check_in_code.isalnum())
        self.assertTrue(reservation.check_in_code.isupper())
    
    def test_reservation_validation_business_rules(self):
        """Test reservation business rule validations."""
        # Test past date validation
        with self.assertRaises(ValidationError) as cm:
            reservation = Reservation(
                club=self.club,
                court=self.court,
                user=self.user,
                date=date.today() - timedelta(days=1),
                start_time=time(10, 0),
                end_time=time(11, 0),
                player_name=self.user.get_full_name(),
                player_email=self.user.email,
                total_price=Decimal('500.00')
            )
            reservation.clean()
        
        self.assertIn("past date", str(cm.exception))
        
        # Test end time before start time
        with self.assertRaises(ValidationError) as cm:
            reservation = Reservation(
                club=self.club,
                court=self.court,
                user=self.user,
                date=date.today() + timedelta(days=1),
                start_time=time(11, 0),
                end_time=time(10, 0),
                player_name=self.user.get_full_name(),
                player_email=self.user.email,
                total_price=Decimal('500.00')
            )
            reservation.clean()
        
        self.assertIn("end time must be after start time", str(cm.exception))
        
        # Test maximum duration
        with self.assertRaises(ValidationError) as cm:
            reservation = Reservation(
                club=self.club,
                court=self.court,
                user=self.user,
                date=date.today() + timedelta(days=1),
                start_time=time(10, 0),
                end_time=time(18, 0),  # 8 hours
                player_name=self.user.get_full_name(),
                player_email=self.user.email,
                total_price=Decimal('4000.00')
            )
            reservation.clean()
        
        self.assertIn("maximum duration", str(cm.exception))
    
    def test_partner_validation(self):
        """Test partner-related validations."""
        # Test requires partner but no partner provided
        with self.assertRaises(ValidationError) as cm:
            reservation = Reservation(
                club=self.club,
                court=self.court,
                user=self.user,
                date=date.today() + timedelta(days=1),
                start_time=time(10, 0),
                end_time=time(11, 0),
                player_name=self.user.get_full_name(),
                player_email=self.user.email,
                total_price=Decimal('500.00'),
                requires_partner=True,
                partner_name="",
                partner_email=""
            )
            reservation.clean()
        
        self.assertIn("partner information", str(cm.exception))
    
    def test_recurring_reservation_validation(self):
        """Test recurring reservation validations."""
        # Test recurring without pattern
        with self.assertRaises(ValidationError) as cm:
            reservation = Reservation(
                club=self.club,
                court=self.court,
                user=self.user,
                date=date.today() + timedelta(days=1),
                start_time=time(10, 0),
                end_time=time(11, 0),
                player_name=self.user.get_full_name(),
                player_email=self.user.email,
                total_price=Decimal('500.00'),
                is_recurring=True,
                recurring_pattern=""
            )
            reservation.clean()
        
        self.assertIn("recurring pattern", str(cm.exception))
    
    def test_status_transition_validation(self):
        """Test status transition validations."""
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='pending'
        )
        
        # Valid transition: pending -> confirmed
        reservation.status = 'confirmed'
        reservation.clean()  # Should not raise
        
        # Invalid transition: confirmed -> pending
        reservation.status = 'confirmed'
        reservation.save()
        
        reservation.status = 'pending'
        with self.assertRaises(ValidationError) as cm:
            reservation.clean()
        
        self.assertIn("invalid status transition", str(cm.exception))


class TestReservationService(TestCase):
    """Test reservation service business logic."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        self.service = ReservationService()
    
    def test_create_reservation_service(self):
        """Test reservation creation through service."""
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': self.user.get_full_name(),
            'player_email': self.user.email,
            'total_price': Decimal('500.00')
        }
        
        reservation = self.service.create_reservation(reservation_data)
        
        self.assertIsInstance(reservation, Reservation)
        self.assertEqual(reservation.status, 'pending')
        self.assertIsNotNone(reservation.check_in_code)
        self.assertEqual(reservation.duration_hours, 1)
    
    def test_check_availability_service(self):
        """Test availability checking service."""
        # Create existing reservation
        Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='confirmed'
        )
        
        # Check overlapping time - should be unavailable
        available = self.service.check_availability(
            court=self.court,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 30),
            end_time=time(11, 30)
        )
        
        self.assertFalse(available)
        
        # Check non-overlapping time - should be available
        available = self.service.check_availability(
            court=self.court,
            date=date.today() + timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0)
        )
        
        self.assertTrue(available)
    
    def test_cancel_reservation_service(self):
        """Test reservation cancellation service."""
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='confirmed'
        )
        
        result = self.service.cancel_reservation(reservation, reason="User request")
        
        self.assertTrue(result)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'cancelled')
        self.assertEqual(reservation.cancellation_reason, "User request")
        self.assertIsNotNone(reservation.cancelled_at)
    
    def test_check_in_service(self):
        """Test check-in service."""
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today(),  # Today for check-in
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='confirmed',
            payment_status='paid'
        )
        
        # Test successful check-in
        result = self.service.check_in_reservation(reservation.check_in_code)
        
        self.assertTrue(result)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'checked_in')
        self.assertIsNotNone(reservation.checked_in_at)
        
        # Test duplicate check-in
        result = self.service.check_in_reservation(reservation.check_in_code)
        self.assertFalse(result)  # Should fail on duplicate
    
    def test_modify_reservation_service(self):
        """Test reservation modification service."""
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='confirmed'
        )
        
        # Test time modification
        new_data = {
            'start_time': time(11, 0),
            'end_time': time(12, 0)
        }
        
        result = self.service.modify_reservation(reservation, new_data)
        
        self.assertTrue(result)
        reservation.refresh_from_db()
        self.assertEqual(reservation.start_time, time(11, 0))
        self.assertEqual(reservation.end_time, time(12, 0))


class TestReservationValidator(TestCase):
    """Test reservation validation logic."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        self.validator = ReservationValidator()
    
    def test_validate_business_hours(self):
        """Test business hours validation."""
        # Test too early
        with self.assertRaises(ValidationError) as cm:
            self.validator.validate_business_hours(
                club=self.club,
                start_time=time(5, 0),
                end_time=time(6, 0)
            )
        
        self.assertIn("business hours", str(cm.exception))
        
        # Test too late
        with self.assertRaises(ValidationError) as cm:
            self.validator.validate_business_hours(
                club=self.club,
                start_time=time(23, 0),
                end_time=time(24, 0)
            )
        
        self.assertIn("business hours", str(cm.exception))
        
        # Test valid hours
        self.validator.validate_business_hours(
            club=self.club,
            start_time=time(10, 0),
            end_time=time(11, 0)
        )  # Should not raise
    
    def test_validate_advance_booking_limit(self):
        """Test advance booking limit validation."""
        # Test too far in advance (beyond 30 days)
        future_date = date.today() + timedelta(days=35)
        
        with self.assertRaises(ValidationError) as cm:
            self.validator.validate_advance_booking_limit(
                date=future_date,
                user=self.user
            )
        
        self.assertIn("advance", str(cm.exception))
        
        # Test valid advance booking
        future_date = date.today() + timedelta(days=15)
        self.validator.validate_advance_booking_limit(
            date=future_date,
            user=self.user
        )  # Should not raise
    
    def test_validate_user_restrictions(self):
        """Test user restriction validation."""
        # Test inactive user
        inactive_user = User.objects.create_user(
            email="inactive@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club,
            is_active=False
        )
        
        with self.assertRaises(ValidationError) as cm:
            self.validator.validate_user_restrictions(inactive_user)
        
        self.assertIn("inactive", str(cm.exception))
        
        # Test active user
        self.validator.validate_user_restrictions(self.user)  # Should not raise
    
    def test_validate_court_availability(self):
        """Test court availability validation."""
        # Create existing reservation
        Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='confirmed'
        )
        
        # Test overlapping reservation
        with self.assertRaises(ValidationError) as cm:
            self.validator.validate_court_availability(
                court=self.court,
                date=date.today() + timedelta(days=1),
                start_time=time(10, 30),
                end_time=time(11, 30)
            )
        
        self.assertIn("not available", str(cm.exception))
        
        # Test non-overlapping reservation
        self.validator.validate_court_availability(
            court=self.court,
            date=date.today() + timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0)
        )  # Should not raise


@pytest.mark.django_db
class TestReservationIntegration:
    """Test reservation integration scenarios."""
    
    def test_full_reservation_workflow(self):
        """Test complete reservation workflow."""
        organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        club = Club.objects.create(
            name="Test Club",
            organization=organization,
            address="Test Address",
            is_active=True
        )
        
        court = Court.objects.create(
            name="Court 1",
            club=club,
            court_type="padel",
            is_active=True
        )
        
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=organization,
            club=club
        )
        
        service = ReservationService()
        
        # Step 1: Create reservation
        reservation_data = {
            'club': club,
            'court': court,
            'user': user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': user.get_full_name(),
            'player_email': user.email,
            'total_price': Decimal('500.00')
        }
        
        reservation = service.create_reservation(reservation_data)
        assert reservation.status == 'pending'
        
        # Step 2: Confirm reservation
        reservation.status = 'confirmed'
        reservation.payment_status = 'paid'
        reservation.save()
        
        # Step 3: Check-in (for today's reservation)
        reservation.date = date.today()
        reservation.save()
        
        result = service.check_in_reservation(reservation.check_in_code)
        assert result is True
        
        reservation.refresh_from_db()
        assert reservation.status == 'checked_in'
        
        # Step 4: Complete reservation
        reservation.status = 'completed'
        reservation.save()
        
        assert reservation.status == 'completed'


if __name__ == '__main__':
    pytest.main([__file__])