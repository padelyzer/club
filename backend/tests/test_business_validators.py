"""
Edge case tests for business validators.
"""

from datetime import datetime, timedelta, time
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.shared.business_validators import (
    ReservationBusinessValidator,
    PaymentBusinessValidator,
    RevenueBusinessValidator
)
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from apps.finance.models import Payment, Revenue
from apps.authentication.models import User


class ReservationBusinessValidatorTest(TestCase):
    """Test reservation business validators."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass'
        )
        
        # Create minimal club and court for testing
        self.club = Club.objects.create(
            name='Test Club',
            is_active=True
        )
        
        self.court = Court.objects.create(
            name='Court 1',
            club=self.club,
            is_active=True
        )
    
    def test_past_date_validation(self):
        """Test that reservations cannot be made in the past."""
        past_date = timezone.now().date() - timedelta(days=1)
        
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'date': past_date,
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_count': 4
        }
        
        with self.assertRaises(ValidationError) as context:
            ReservationBusinessValidator.validate_reservation_business_rules(
                reservation_data, self.user
            )
        
        self.assertIn("pasado", str(context.exception))
    
    def test_minimum_duration_validation(self):
        """Test minimum duration requirement."""
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'date': tomorrow,
            'start_time': time(10, 0),
            'end_time': time(10, 15),  # Only 15 minutes
            'player_count': 4
        }
        
        with self.assertRaises(ValidationError) as context:
            ReservationBusinessValidator.validate_reservation_business_rules(
                reservation_data, self.user
            )
        
        self.assertIn("30 minutos", str(context.exception))
    
    def test_maximum_duration_validation(self):
        """Test maximum duration limit."""
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'date': tomorrow,
            'start_time': time(10, 0),
            'end_time': time(15, 0),  # 5 hours
            'player_count': 4
        }
        
        with self.assertRaises(ValidationError) as context:
            ReservationBusinessValidator.validate_reservation_business_rules(
                reservation_data, self.user
            )
        
        self.assertIn("4 horas", str(context.exception))
    
    def test_daily_limit_validation(self):
        """Test daily reservation limit."""
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        # Create 3 existing reservations for the user
        for i in range(3):
            Reservation.objects.create(
                club=self.club,
                court=self.court,
                date=tomorrow,
                start_time=time(8 + i, 0),
                end_time=time(9 + i, 0),
                created_by=self.user,
                status='confirmed'
            )
        
        # Try to create a 4th reservation
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'date': tomorrow,
            'start_time': time(12, 0),
            'end_time': time(13, 0),
            'player_count': 4
        }
        
        with self.assertRaises(ValidationError) as context:
            ReservationBusinessValidator.validate_reservation_business_rules(
                reservation_data, self.user
            )
        
        self.assertIn("límite", str(context.exception))
    
    def test_valid_reservation_passes(self):
        """Test that valid reservations pass all validations."""
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'date': tomorrow,
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_count': 4
        }
        
        # Should not raise any exceptions
        result = ReservationBusinessValidator.validate_reservation_business_rules(
            reservation_data, self.user
        )
        self.assertTrue(result)


class PaymentBusinessValidatorTest(TestCase):
    """Test payment business validators."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass'
        )
    
    def test_negative_amount_validation(self):
        """Test that negative amounts are rejected."""
        payment_data = {
            'amount': Decimal('-100'),
            'payment_method': 'cash'
        }
        
        with self.assertRaises(ValidationError) as context:
            PaymentBusinessValidator.validate_payment_business_rules(payment_data)
        
        self.assertIn("mayor a 0", str(context.exception))
    
    def test_excessive_amount_validation(self):
        """Test that excessive amounts are rejected."""
        payment_data = {
            'amount': Decimal('100000'),  # $100,000
            'payment_method': 'cash'
        }
        
        with self.assertRaises(ValidationError) as context:
            PaymentBusinessValidator.validate_payment_business_rules(payment_data)
        
        self.assertIn("límite máximo", str(context.exception))
    
    def test_minimum_amount_by_method(self):
        """Test minimum amounts by payment method."""
        # Test card minimum
        payment_data = {
            'amount': Decimal('5'),  # Below $10 minimum
            'payment_method': 'card'
        }
        
        with self.assertRaises(ValidationError) as context:
            PaymentBusinessValidator.validate_payment_business_rules(payment_data)
        
        self.assertIn("Monto mínimo", str(context.exception))
    
    def test_daily_limit_validation(self):
        """Test daily payment limits."""
        today = timezone.now().date()
        
        # Create existing payments totaling $8,000
        Payment.objects.create(
            user=self.user,
            amount=Decimal('8000'),
            status='completed',
            created_at=timezone.now()
        )
        
        # Try to make another payment for $5,000 (would exceed $10,000 limit)
        payment_data = {
            'amount': Decimal('5000'),
            'payment_method': 'cash'
        }
        
        with self.assertRaises(ValidationError) as context:
            PaymentBusinessValidator.validate_payment_business_rules(
                payment_data, self.user
            )
        
        self.assertIn("límite diario", str(context.exception))
    
    def test_valid_payment_passes(self):
        """Test that valid payments pass all validations."""
        payment_data = {
            'amount': Decimal('100'),
            'payment_method': 'cash'
        }
        
        # Should not raise any exceptions
        result = PaymentBusinessValidator.validate_payment_business_rules(
            payment_data, self.user
        )
        self.assertTrue(result)


class RevenueBusinessValidatorTest(TestCase):
    """Test revenue business validators."""
    
    def setUp(self):
        """Set up test data."""
        self.club = Club.objects.create(
            name='Test Club',
            is_active=True
        )
    
    def test_revenue_integrity_with_missing_revenue(self):
        """Test detection of missing revenue records."""
        # Create a payment without corresponding revenue
        payment = Payment.objects.create(
            club=self.club,
            amount=Decimal('100'),
            net_amount=Decimal('97'),
            status='completed',
            processed_at=timezone.now()
        )
        
        today = timezone.now().date()
        result = RevenueBusinessValidator.validate_revenue_integrity(
            date=today,
            club=self.club
        )
        
        self.assertFalse(result['is_valid'])
        self.assertEqual(len(result['issues']), 1)
        self.assertEqual(result['issues'][0]['type'], 'missing_revenue')
    
    def test_revenue_integrity_with_amount_mismatch(self):
        """Test detection of amount mismatches."""
        today = timezone.now().date()
        
        # Create payment and revenue with different amounts
        payment = Payment.objects.create(
            club=self.club,
            amount=Decimal('100'),
            net_amount=Decimal('97'),
            status='completed',
            processed_at=timezone.now()
        )
        
        Revenue.objects.create(
            club=self.club,
            date=today,
            amount=Decimal('90'),  # Different amount
            payment=payment,
            concept='reservation',
            description='Test revenue',
            payment_method='cash',
            reference='TEST-001'
        )
        
        result = RevenueBusinessValidator.validate_revenue_integrity(
            date=today,
            club=self.club
        )
        
        self.assertFalse(result['is_valid'])
        # Should find amount mismatch
        amount_mismatches = [
            issue for issue in result['issues'] 
            if issue['type'] == 'amount_mismatch'
        ]
        self.assertEqual(len(amount_mismatches), 1)
    
    def test_revenue_integrity_valid_case(self):
        """Test that valid revenue data passes integrity check."""
        today = timezone.now().date()
        
        # Create payment and matching revenue
        payment = Payment.objects.create(
            club=self.club,
            amount=Decimal('100'),
            net_amount=Decimal('97'),
            status='completed',
            processed_at=timezone.now()
        )
        
        Revenue.objects.create(
            club=self.club,
            date=today,
            amount=payment.net_amount,  # Matching amount
            payment=payment,
            concept='reservation',
            description='Test revenue',
            payment_method='cash',
            reference='TEST-001'
        )
        
        result = RevenueBusinessValidator.validate_revenue_integrity(
            date=today,
            club=self.club
        )
        
        self.assertTrue(result['is_valid'])
        self.assertEqual(len(result['issues']), 0)
