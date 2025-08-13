"""
Comprehensive tests for reservation module.
"""

import pytest
from datetime import datetime, timedelta, date, time
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.root.models import Organization
from apps.clubs.models import Club, Court
from apps.clients.models import ClientProfile
from apps.reservations.models import Reservation, ReservationPayment, BlockedSlot
from apps.reservations.services import ReservationService, BlockedSlotService

User = get_user_model()


@pytest.mark.django_db
class TestReservationModels(TestCase):
    """Test reservation models."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Padel Club",
            primary_email="org@test.com",
            primary_phone="+52 55 1234 5678",
            legal_representative="Test Manager"
        )
        
        # Create club
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            email="club@test.com",
            phone="+52 55 9876 5432",
            opening_time=time(6, 0),
            closing_time=time(23, 0)
        )
        
        # Create court
        self.court = Court.objects.create(
            club=self.club,
            organization=self.org,
            name="Court 1",
            number=1,
            price_per_hour=Decimal("150.00"),
            surface_type="artificial_grass"
        )
        
        # Create user
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            current_organization_id=self.org.id
        )
        
        # Create client profile
        self.client = ClientProfile.objects.create(
            user=self.user,
            organization=self.org,
            club=self.club
        )
    
    def test_reservation_creation(self):
        """Test basic reservation creation."""
        tomorrow = date.today() + timedelta(days=1)
        
        reservation = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            created_by=self.user,
            client_profile=self.client,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test Player",
            player_email="player@test.com",
            player_count=4,
            total_price=Decimal("150.00")
        )
        
        self.assertIsNotNone(reservation.id)
        self.assertEqual(reservation.duration_minutes, 60)
        self.assertEqual(reservation.price_per_hour, self.court.price_per_hour)
        self.assertEqual(reservation.status, "pending")
    
    def test_reservation_time_validation(self):
        """Test reservation time validations."""
        # Past date
        with self.assertRaises(ValidationError):
            reservation = Reservation(
                organization=self.org,
                club=self.club,
                court=self.court,
                date=date.today() - timedelta(days=1),
                start_time=time(10, 0),
                end_time=time(11, 0),
                player_name="Test",
                player_email="test@test.com"
            )
            reservation.full_clean()
        
        # End time before start time
        with self.assertRaises(ValidationError):
            reservation = Reservation(
                organization=self.org,
                club=self.club,
                court=self.court,
                date=date.today() + timedelta(days=1),
                start_time=time(11, 0),
                end_time=time(10, 0),
                player_name="Test",
                player_email="test@test.com"
            )
            reservation.full_clean()
    
    def test_price_calculation(self):
        """Test price calculation logic."""
        tomorrow = date.today() + timedelta(days=1)
        
        # 2-hour reservation
        reservation = Reservation(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(12, 0),
            player_name="Test",
            player_email="test@test.com",
            price_per_hour=Decimal("150.00")
        )
        reservation.save()
        
        self.assertEqual(reservation.duration_minutes, 120)
        self.assertEqual(reservation.total_price, Decimal("300.00"))
        
        # With discount
        reservation.discount_percentage = Decimal("20.00")
        reservation.calculate_total_price()
        reservation.save()
        
        self.assertEqual(reservation.total_price, Decimal("240.00"))
    
    def test_cancellation_policy(self):
        """Test cancellation policies."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Flexible policy
        reservation = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test",
            player_email="test@test.com",
            total_price=Decimal("150.00"),
            cancellation_policy='flexible'
        )
        
        # Should be 2 hours before
        expected_deadline = datetime.combine(tomorrow, time(8, 0))
        self.assertEqual(
            reservation.cancellation_deadline.date(),
            expected_deadline.date()
        )
        
        # Can cancel
        self.assertTrue(reservation.can_cancel())
    
    def test_split_payment(self):
        """Test split payment functionality."""
        tomorrow = date.today() + timedelta(days=1)
        
        reservation = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test",
            player_email="test@test.com",
            total_price=Decimal("200.00"),
            is_split_payment=True,
            split_count=4
        )
        
        # Create split payments
        service = ReservationService()
        service.create_split_payments(reservation)
        
        # Check payments created
        self.assertEqual(reservation.split_payments.count(), 4)
        
        # Check amount per person
        for payment in reservation.split_payments.all():
            self.assertEqual(payment.amount, Decimal("50.00"))
            self.assertIsNotNone(payment.payment_token)
            self.assertIsNotNone(payment.check_in_code)
    
    def test_recurring_reservation(self):
        """Test recurring reservation creation."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(weeks=4)
        
        reservation = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=start_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test",
            player_email="test@test.com",
            total_price=Decimal("150.00"),
            is_recurring=True,
            recurrence_pattern='weekly',
            recurrence_end_date=end_date
        )
        
        # Create instances
        reservation.create_recurring_instances()
        
        # Check instances created (4 weeks = 4 instances)
        instances = Reservation.objects.filter(
            parent_reservation=reservation
        )
        self.assertEqual(instances.count(), 4)
        
        # Check dates
        for i, instance in enumerate(instances.order_by('date')):
            expected_date = start_date + timedelta(weeks=i+1)
            self.assertEqual(instance.date, expected_date)
    
    def test_wait_list(self):
        """Test wait list functionality."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Create first reservation
        reservation1 = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Player 1",
            player_email="player1@test.com",
            total_price=Decimal("150.00"),
            status='confirmed'
        )
        
        # Try to book same slot - should go to wait list
        reservation2 = Reservation(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Player 2",
            player_email="player2@test.com",
            total_price=Decimal("150.00")
        )
        
        # Add to wait list
        reservation2.add_to_wait_list()
        
        self.assertTrue(reservation2.on_wait_list)
        self.assertEqual(reservation2.wait_list_position, 1)
        
        # Cancel first reservation
        reservation1.cancel()
        
        # TODO: Test notification to wait list


@pytest.mark.django_db
class TestReservationService(TestCase):
    """Test reservation service operations."""
    
    def setUp(self):
        """Set up test data."""
        # Same setup as model tests
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Padel Club",
            primary_email="org@test.com",
            primary_phone="+52 55 1234 5678",
            legal_representative="Test Manager"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            email="club@test.com",
            phone="+52 55 9876 5432",
            opening_time=time(6, 0),
            closing_time=time(23, 0)
        )
        
        self.court = Court.objects.create(
            club=self.club,
            organization=self.org,
            name="Court 1",
            number=1,
            price_per_hour=Decimal("150.00")
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123"
        )
        
        self.service = ReservationService()
    
    def test_create_reservation_with_validations(self):
        """Test reservation creation through service."""
        tomorrow = date.today() + timedelta(days=1)
        
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'date': tomorrow,
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': 'Test Player',
            'player_email': 'player@test.com',
            'player_count': 4
        }
        
        reservation = self.service.create_reservation(
            reservation_data,
            user=self.user
        )
        
        self.assertIsNotNone(reservation)
        self.assertEqual(reservation.created_by, self.user)
        self.assertEqual(reservation.total_price, Decimal("150.00"))
        self.assertTrue(reservation.confirmation_sent)
    
    def test_check_availability(self):
        """Test availability checking."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Check availability
        slots = self.service.check_availability(
            self.club,
            tomorrow,
            duration_minutes=60
        )
        
        # Should have multiple slots available
        self.assertGreater(len(slots), 0)
        
        # Create a reservation
        Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test",
            player_email="test@test.com",
            total_price=Decimal("150.00"),
            status='confirmed'
        )
        
        # Check again - 10:00 slot should not be available
        slots = self.service.check_availability(
            self.club,
            tomorrow,
            court=self.court,
            duration_minutes=60
        )
        
        slot_times = [(s['start_time'], s['end_time']) for s in slots]
        self.assertNotIn((time(10, 0), time(11, 0)), slot_times)
    
    def test_cancel_with_refund(self):
        """Test cancellation with refund calculation."""
        tomorrow = date.today() + timedelta(days=1)
        
        reservation = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test",
            player_email="test@test.com",
            total_price=Decimal("150.00"),
            payment_status='paid',
            cancellation_policy='flexible'
        )
        
        # Cancel with service
        cancelled = self.service.cancel_reservation(
            reservation,
            user=self.user,
            reason="Change of plans"
        )
        
        self.assertEqual(cancelled.status, 'cancelled')
        self.assertEqual(cancelled.cancellation_fee, Decimal("0.00"))
        self.assertEqual(cancelled.payment_status, 'refunded')
    
    def test_process_no_shows(self):
        """Test no-show processing."""
        # Create past reservation
        yesterday = date.today() - timedelta(days=1)
        
        reservation = Reservation.objects.create(
            organization=self.org,
            club=self.club,
            court=self.court,
            date=yesterday,
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name="Test",
            player_email="test@test.com",
            total_price=Decimal("150.00"),
            status='confirmed'
        )
        
        # Process no-shows
        self.service.process_no_shows()
        
        # Check marked as no-show
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'no_show')
        self.assertTrue(reservation.no_show)
        self.assertEqual(reservation.no_show_fee, Decimal("150.00"))


@pytest.mark.django_db
class TestBlockedSlots(TestCase):
    """Test blocked slot functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Club",
            primary_email="org@test.com",
            primary_phone="+52 55 1234 5678",
            legal_representative="Test Manager"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            email="club@test.com",
            phone="+52 55 9876 5432"
        )
        
        self.court = Court.objects.create(
            club=self.club,
            organization=self.org,
            name="Court 1",
            number=1,
            price_per_hour=Decimal("150.00")
        )
        
        self.user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123"
        )
        
        self.service = BlockedSlotService()
    
    def test_create_blocked_slot(self):
        """Test creating blocked slot."""
        tomorrow = date.today() + timedelta(days=1)
        start_dt = timezone.make_aware(datetime.combine(tomorrow, time(10, 0)))
        end_dt = timezone.make_aware(datetime.combine(tomorrow, time(12, 0)))
        
        data = {
            'organization': self.org,
            'club': self.club,
            'court': self.court,
            'start_datetime': start_dt,
            'end_datetime': end_dt,
            'reason': 'maintenance',
            'description': 'Court resurfacing'
        }
        
        blocked = self.service.create_blocked_slot(data, self.user)
        
        self.assertIsNotNone(blocked)
        self.assertEqual(blocked.created_by, self.user)
        
        # Try to create reservation in blocked time
        with self.assertRaises(ValidationError):
            ReservationService.create_reservation({
                'club': self.club,
                'court': self.court,
                'date': tomorrow,
                'start_time': time(10, 30),
                'end_time': time(11, 30),
                'player_name': 'Test',
                'player_email': 'test@test.com',
                'player_count': 4
            })
