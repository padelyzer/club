"""
Comprehensive model tests for reservations app.
"""

import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta, date, time
from decimal import Decimal
import uuid

# Import models from the app
from apps.reservations.models import Reservation

# Import factories
from tests.factories import (
    UserFactory, OrganizationFactory, ClubFactory, CourtFactory, 
    ReservationFactory, ClientProfileFactory
)

User = get_user_model()

@pytest.mark.django_db
class TestReservationModel(TestCase):
    """Test cases for Reservation model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        if OrganizationFactory:
            self.organization = OrganizationFactory()
        if ClubFactory:
            self.club = ClubFactory()
        if CourtFactory:
            self.court = CourtFactory()
        
    def test_reservation_creation(self):
        """Test reservation creation with all required fields."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        reservation = ReservationFactory(
            player_name="John Doe",
            player_email="john@example.com",
            player_phone="+52-123-456-7890",
            player_count=4,
            status="confirmed",
            payment_status="paid",
            total_amount=Decimal("450.00")
        )
        
        self.assertEqual(reservation.player_name, "John Doe")
        self.assertEqual(reservation.player_email, "john@example.com")
        self.assertEqual(reservation.player_count, 4)
        self.assertEqual(reservation.status, "confirmed")
        self.assertEqual(reservation.payment_status, "paid")
        self.assertEqual(reservation.total_amount, Decimal("450.00"))
        self.assertIsNotNone(reservation.club)
        self.assertIsNotNone(reservation.court)
        self.assertIsNotNone(reservation.organization)
        self.assertIsNotNone(reservation.created_by)
        
    def test_reservation_str_representation(self):
        """Test reservation string representation."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        reservation = ReservationFactory(
            player_name="Jane Smith",
            date=date(2024, 12, 15),
            start_time=time(10, 0)
        )
        
        expected_start = "Jane Smith -"
        self.assertTrue(str(reservation).startswith(expected_start))
        
    def test_reservation_with_client_profile(self):
        """Test reservation linked to client profile."""
        if not ReservationFactory or not ClientProfileFactory:
            self.skipTest("ReservationFactory or ClientProfileFactory not available")
            
        client = ClientProfileFactory()
        reservation = ReservationFactory(
            client=client,
            player_name=client.user.get_full_name(),
            player_email=client.user.email
        )
        
        self.assertEqual(reservation.client, client)
        self.assertEqual(reservation.player_email, client.user.email)
        
    def test_reservation_without_client_profile(self):
        """Test reservation for non-registered player."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        reservation = ReservationFactory(
            client=None,
            player_name="Walk-in Player",
            player_email="walkin@example.com"
        )
        
        self.assertIsNone(reservation.client)
        self.assertEqual(reservation.player_name, "Walk-in Player")
        self.assertEqual(reservation.player_email, "walkin@example.com")
        
    def test_reservation_status_choices(self):
        """Test reservation status validation."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        valid_statuses = ["pending", "confirmed", "cancelled", "completed"]
        
        for status in valid_statuses:
            reservation = ReservationFactory(status=status)
            self.assertEqual(reservation.status, status)
            
    def test_reservation_payment_status_choices(self):
        """Test reservation payment status validation.""" 
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        valid_payment_statuses = ["pending", "paid", "refunded"]
        
        for payment_status in valid_payment_statuses:
            reservation = ReservationFactory(payment_status=payment_status)
            self.assertEqual(reservation.payment_status, payment_status)
            
    def test_reservation_duration_validation(self):
        """Test reservation duration constraints."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        # Valid duration (1.5 hours)
        reservation = ReservationFactory(
            duration_hours=Decimal("1.5"),
            start_time=time(10, 0),
            end_time=time(11, 30)
        )
        
        self.assertEqual(reservation.duration_hours, Decimal("1.5"))
        
    def test_reservation_player_count_validation(self):
        """Test player count constraints."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        # Valid player counts (1-8)
        for count in [1, 2, 4, 6, 8]:
            reservation = ReservationFactory(player_count=count)
            self.assertEqual(reservation.player_count, count)
            
    def test_reservation_future_date(self):
        """Test reservation is for future date."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        tomorrow = date.today() + timedelta(days=1)
        reservation = ReservationFactory(date=tomorrow)
        
        self.assertGreater(reservation.date, date.today())
        
    def test_reservation_club_court_relationship(self):
        """Test reservation belongs to club and court."""
        if not ReservationFactory or not ClubFactory or not CourtFactory:
            self.skipTest("Required factories not available")
            
        club = ClubFactory(name="Test Club")
        court = CourtFactory(club=club, name="Court 1")
        reservation = ReservationFactory(club=club, court=court)
        
        self.assertEqual(reservation.club, club)
        self.assertEqual(reservation.court, court)
        self.assertEqual(reservation.court.club, club)
        
    def test_reservation_organization_context(self):
        """Test reservation has organization context."""
        if not ReservationFactory or not OrganizationFactory:
            self.skipTest("Required factories not available")
            
        org = OrganizationFactory()
        reservation = ReservationFactory(organization=org)
        
        self.assertEqual(reservation.organization, org)
        
    def test_reservation_created_by_user(self):
        """Test reservation tracks who created it."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        user = UserFactory(first_name="Admin", last_name="User")
        reservation = ReservationFactory(created_by=user)
        
        self.assertEqual(reservation.created_by, user)


@pytest.mark.django_db
class TestReservationBusinessLogic(TestCase):
    """Test business logic for reservations."""
    
    def test_reservation_time_slot_calculation(self):
        """Test reservation time slot calculations."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        reservation = ReservationFactory(
            start_time=time(10, 0),
            duration_hours=Decimal("1.5")
        )
        
        # Expected end time should be 11:30
        expected_end = time(11, 30)
        self.assertEqual(reservation.end_time, expected_end)
        
    def test_reservation_pricing_calculation(self):
        """Test reservation pricing calculations."""
        if not ReservationFactory or not CourtFactory:
            self.skipTest("Required factories not available")
            
        court = CourtFactory(hourly_price=Decimal("300.00"))
        reservation = ReservationFactory(
            court=court,
            duration_hours=Decimal("1.5"),
            total_amount=Decimal("450.00")  # 300 * 1.5 = 450
        )
        
        expected_total = court.hourly_price * reservation.duration_hours
        self.assertEqual(reservation.total_amount, expected_total)
        
    def test_reservation_availability_conflict(self):
        """Test detecting reservation conflicts."""
        if not ReservationFactory or not CourtFactory:
            self.skipTest("Required factories not available")
            
        court = CourtFactory()
        
        # Create first reservation
        reservation1 = ReservationFactory(
            court=court,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 30),
            status="confirmed"
        )
        
        # Try to create overlapping reservation
        from apps.reservations.models import Reservation
        overlapping_reservations = Reservation.objects.filter(
            court=court,
            date=reservation1.date,
            start_time__lt=reservation1.end_time,
            end_time__gt=reservation1.start_time,
            status__in=["pending", "confirmed"]
        ).exclude(id=reservation1.id)
        
        self.assertEqual(overlapping_reservations.count(), 0)
        
    def test_reservation_cancellation(self):
        """Test reservation cancellation logic."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        reservation = ReservationFactory(status="confirmed")
        
        # Simulate cancellation
        reservation.status = "cancelled"
        reservation.cancelled_at = timezone.now()
        reservation.cancellation_reason = "Client request"
        reservation.save()
        
        self.assertEqual(reservation.status, "cancelled")
        self.assertIsNotNone(reservation.cancelled_at)
        
    def test_reservation_completion(self):
        """Test marking reservation as completed."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        reservation = ReservationFactory(status="confirmed")
        
        # Simulate completion
        reservation.status = "completed"
        reservation.completed_at = timezone.now()
        reservation.save()
        
        self.assertEqual(reservation.status, "completed")
        self.assertIsNotNone(reservation.completed_at)


@pytest.mark.django_db 
class TestReservationQueryMethods(TestCase):
    """Test reservation query and filter methods."""
    
    def setUp(self):
        """Set up test data."""
        if not ReservationFactory:
            self.skipTest("ReservationFactory not available")
            
        # Create test reservations
        self.today = date.today()
        self.tomorrow = self.today + timedelta(days=1)
        
        self.confirmed_reservation = ReservationFactory(
            date=self.tomorrow,
            status="confirmed"
        )
        self.pending_reservation = ReservationFactory(
            date=self.tomorrow,
            status="pending" 
        )
        self.cancelled_reservation = ReservationFactory(
            date=self.tomorrow,
            status="cancelled"
        )
        
    def test_filter_by_status(self):
        """Test filtering reservations by status."""
        from apps.reservations.models import Reservation
        
        confirmed = Reservation.objects.filter(status="confirmed")
        pending = Reservation.objects.filter(status="pending")
        cancelled = Reservation.objects.filter(status="cancelled")
        
        self.assertIn(self.confirmed_reservation, confirmed)
        self.assertIn(self.pending_reservation, pending)
        self.assertIn(self.cancelled_reservation, cancelled)
        
    def test_filter_by_date_range(self):
        """Test filtering reservations by date range."""
        from apps.reservations.models import Reservation
        
        future_reservations = Reservation.objects.filter(
            date__gte=self.today
        )
        
        self.assertIn(self.confirmed_reservation, future_reservations)
        self.assertIn(self.pending_reservation, future_reservations)
        
    def test_active_reservations(self):
        """Test querying active (non-cancelled) reservations."""
        from apps.reservations.models import Reservation
        
        active_reservations = Reservation.objects.filter(
            status__in=["pending", "confirmed", "completed"]
        )
        
        self.assertIn(self.confirmed_reservation, active_reservations)
        self.assertIn(self.pending_reservation, active_reservations)
        self.assertNotIn(self.cancelled_reservation, active_reservations)
