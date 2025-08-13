#!/usr/bin/env python
"""
FIX-5: Tests unitarios para validaciones de negocio y casos extremos.
Tests for business validators, data integrity, and edge cases.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from apps.shared.business_validators import (
    ReservationBusinessValidator,
    PaymentBusinessValidator,
    RevenueBusinessValidator
)
from apps.shared.data_integrity import DataIntegrityService
from apps.finance.models import Payment, Revenue
from apps.reservations.models import Reservation
from apps.clubs.models import Club, Court
from apps.root.models import Organization
from apps.clients.models import ClientProfile

User = get_user_model()


class TestReservationBusinessValidator(TestCase):
    """Test ReservationBusinessValidator functionality."""
    
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
        
        self.validator = ReservationBusinessValidator()
    
    def test_validate_basic_reservation_rules(self):
        """Test basic reservation business rules validation."""
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
        
        # Valid reservation should not raise
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertEqual(len(errors), 0)
    
    def test_validate_past_date_restriction(self):
        """Test past date reservation restriction."""
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() - timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': self.user.get_full_name(),
            'player_email': self.user.email,
            'total_price': Decimal('500.00')
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        self.assertIn("past date", str(errors[0]))
    
    def test_validate_business_hours(self):
        """Test business hours validation."""
        # Too early
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(5, 0),
            'end_time': time(6, 0),
            'player_name': self.user.get_full_name(),
            'player_email': self.user.email,
            'total_price': Decimal('500.00')
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        business_hour_error = any("business hours" in str(error) for error in errors)
        self.assertTrue(business_hour_error)
        
        # Too late
        reservation_data['start_time'] = time(23, 0)
        reservation_data['end_time'] = time(24, 0)
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        business_hour_error = any("business hours" in str(error) for error in errors)
        self.assertTrue(business_hour_error)
    
    def test_validate_maximum_duration(self):
        """Test maximum reservation duration validation."""
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(18, 0),  # 8 hours
            'player_name': self.user.get_full_name(),
            'player_email': self.user.email,
            'total_price': Decimal('4000.00')
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        duration_error = any("maximum duration" in str(error) for error in errors)
        self.assertTrue(duration_error)
    
    def test_validate_advance_booking_limit(self):
        """Test advance booking limit validation."""
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() + timedelta(days=35),  # Too far in advance
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': self.user.get_full_name(),
            'player_email': self.user.email,
            'total_price': Decimal('500.00')
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        advance_error = any("advance" in str(error) for error in errors)
        self.assertTrue(advance_error)
    
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
        
        # Try to create overlapping reservation
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 30),
            'end_time': time(11, 30),
            'player_name': 'Another Player',
            'player_email': 'another@example.com',
            'total_price': Decimal('500.00')
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        availability_error = any("not available" in str(error) or "overlap" in str(error) for error in errors)
        self.assertTrue(availability_error)
    
    def test_validate_user_restrictions(self):
        """Test user restriction validation."""
        # Create inactive user
        inactive_user = User.objects.create_user(
            email="inactive@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club,
            is_active=False
        )
        
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': inactive_user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': inactive_user.get_full_name(),
            'player_email': inactive_user.email,
            'total_price': Decimal('500.00')
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, inactive_user)
        self.assertGreater(len(errors), 0)
        user_error = any("inactive" in str(error) or "suspended" in str(error) for error in errors)
        self.assertTrue(user_error)
    
    def test_validate_price_consistency(self):
        """Test price consistency validation."""
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': self.user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': self.user.get_full_name(),
            'player_email': self.user.email,
            'total_price': Decimal('50.00'),  # Too low
            'price_per_hour': Decimal('500.00')  # Doesn't match total
        }
        
        errors = self.validator.validate_reservation_business_rules(reservation_data, self.user)
        self.assertGreater(len(errors), 0)
        price_error = any("price" in str(error).lower() for error in errors)
        self.assertTrue(price_error)


class TestPaymentBusinessValidator(TestCase):
    """Test PaymentBusinessValidator functionality."""
    
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
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        self.validator = PaymentBusinessValidator()
    
    def test_validate_payment_amount_limits(self):
        """Test payment amount limit validation."""
        payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': self.user,
            'amount': Decimal('50000.00'),  # Very high amount
            'payment_type': 'reservation',
            'payment_method': 'cash'
        }
        
        errors = self.validator.validate_payment_business_rules(payment_data)
        self.assertGreater(len(errors), 0)
        amount_error = any("amount" in str(error).lower() or "limit" in str(error).lower() for error in errors)
        self.assertTrue(amount_error)
    
    def test_validate_payment_method_restrictions(self):
        """Test payment method restriction validation."""
        # High amount with cash (should require bank transfer)
        payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': self.user,
            'amount': Decimal('15000.00'),
            'payment_type': 'reservation',
            'payment_method': 'cash'
        }
        
        errors = self.validator.validate_payment_business_rules(payment_data)
        self.assertGreater(len(errors), 0)
        method_error = any("payment method" in str(error).lower() for error in errors)
        self.assertTrue(method_error)
    
    def test_validate_invoice_requirements(self):
        """Test invoice requirement validation."""
        payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': self.user,
            'amount': Decimal('2000.00'),  # Above invoice threshold
            'payment_type': 'reservation',
            'payment_method': 'card',
            'requires_invoice': False,
            'billing_rfc': ''
        }
        
        errors = self.validator.validate_payment_business_rules(payment_data)
        self.assertGreater(len(errors), 0)
        invoice_error = any("invoice" in str(error).lower() or "rfc" in str(error).lower() for error in errors)
        self.assertTrue(invoice_error)
    
    def test_validate_refund_business_rules(self):
        """Test refund business rules validation."""
        # Create payment
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            processed_at=timezone.now() - timedelta(days=31)  # More than 30 days old
        )
        
        refund_data = {
            'payment': payment,
            'amount': Decimal('500.00'),
            'reason': 'Customer request'
        }
        
        errors = self.validator.validate_refund_business_rules(refund_data)
        self.assertGreater(len(errors), 0)
        time_error = any("time" in str(error).lower() or "days" in str(error).lower() for error in errors)
        self.assertTrue(time_error)


class TestRevenueBusinessValidator(TestCase):
    """Test RevenueBusinessValidator functionality."""
    
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
        
        self.validator = RevenueBusinessValidator()
    
    def test_validate_revenue_reconciliation(self):
        """Test revenue reconciliation validation."""
        # Create payment
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            net_amount=Decimal('485.00')
        )
        
        # Create revenue with different amount (reconciliation error)
        revenue_data = {
            'organization': self.organization,
            'club': self.club,
            'date': date.today(),
            'concept': 'reservation',
            'amount': Decimal('400.00'),  # Different from payment net amount
            'payment_method': 'stripe',
            'payment': payment
        }
        
        errors = self.validator.validate_revenue_business_rules(revenue_data)
        self.assertGreater(len(errors), 0)
        reconciliation_error = any("reconciliation" in str(error).lower() or "mismatch" in str(error).lower() for error in errors)
        self.assertTrue(reconciliation_error)
    
    def test_validate_revenue_date_consistency(self):
        """Test revenue date consistency validation."""
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='completed',
            processed_at=timezone.now() - timedelta(days=5)
        )
        
        revenue_data = {
            'organization': self.organization,
            'club': self.club,
            'date': date.today(),  # Different date from payment
            'concept': 'reservation',
            'amount': Decimal('500.00'),
            'payment_method': 'cash',
            'payment': payment
        }
        
        errors = self.validator.validate_revenue_business_rules(revenue_data)
        self.assertGreater(len(errors), 0)
        date_error = any("date" in str(error).lower() for error in errors)
        self.assertTrue(date_error)


class TestDataIntegrityService(TestCase):
    """Test DataIntegrityService functionality."""
    
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
        
        self.service = DataIntegrityService()
    
    def test_check_payment_revenue_consistency(self):
        """Test payment-revenue consistency checking."""
        # Create payment without corresponding revenue
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='completed',
            net_amount=Decimal('500.00'),
            processed_at=timezone.now()
        )
        
        # Check integrity
        issues = self.service.check_payment_revenue_consistency(
            start_date=date.today(),
            end_date=date.today()
        )
        
        self.assertGreater(len(issues), 0)
        
        # Check issue structure
        issue = issues[0]
        self.assertIn('type', issue)
        self.assertIn('description', issue)
        self.assertIn('payment_id', issue)
        self.assertEqual(issue['type'], 'missing_revenue')
    
    def test_check_reservation_payment_consistency(self):
        """Test reservation-payment consistency checking."""
        # Create reservation with payment status 'paid' but no payment
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            payment_status='paid',
            status='confirmed'
        )
        
        # Check integrity
        issues = self.service.check_reservation_payment_consistency(
            start_date=date.today(),
            end_date=date.today()
        )
        
        self.assertGreater(len(issues), 0)
        
        # Check issue structure
        issue = issues[0]
        self.assertIn('type', issue)
        self.assertIn('description', issue)
        self.assertIn('reservation_id', issue)
        self.assertEqual(issue['type'], 'payment_status_mismatch')
    
    def test_check_duplicate_reservations(self):
        """Test duplicate reservation checking."""
        # Create two reservations for same court, date, and time
        reservation1 = Reservation.objects.create(
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
        
        user2 = User.objects.create_user(
            email="user2@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        reservation2 = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=user2,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=user2.get_full_name(),
            player_email=user2.email,
            total_price=Decimal('500.00'),
            status='confirmed'
        )
        
        # Check integrity
        issues = self.service.check_duplicate_reservations(
            start_date=date.today(),
            end_date=date.today() + timedelta(days=2)
        )
        
        self.assertGreater(len(issues), 0)
        
        # Check issue structure
        issue = issues[0]
        self.assertIn('type', issue)
        self.assertIn('description', issue)
        self.assertIn('reservation_ids', issue)
        self.assertEqual(issue['type'], 'duplicate_reservation')
    
    def test_auto_fix_missing_revenues(self):
        """Test automatic fixing of missing revenues."""
        # Create completed payment without revenue
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='completed',
            net_amount=Decimal('500.00'),
            processed_at=timezone.now(),
            reference_number='PAY-TEST-001'
        )
        
        # Verify no revenue exists
        self.assertEqual(Revenue.objects.filter(payment=payment).count(), 0)
        
        # Auto-fix
        fixed_count = self.service.auto_fix_missing_revenues(
            start_date=date.today(),
            end_date=date.today()
        )
        
        self.assertEqual(fixed_count, 1)
        
        # Verify revenue was created
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 1)
        
        revenue = revenues.first()
        self.assertEqual(revenue.amount, payment.net_amount)
        self.assertEqual(revenue.concept, payment.payment_type)
        self.assertEqual(revenue.payment_method, payment.payment_method)
    
    def test_generate_integrity_report(self):
        """Test integrity report generation."""
        # Create some integrity issues
        # 1. Payment without revenue
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='completed',
            net_amount=Decimal('500.00'),
            processed_at=timezone.now()
        )
        
        # 2. Reservation with inconsistent payment status
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            payment_status='paid',
            status='confirmed'
        )
        
        # Generate report
        report = self.service.generate_integrity_report(
            start_date=date.today(),
            end_date=date.today()
        )
        
        # Check report structure
        self.assertIn('period', report)
        self.assertIn('total_issues', report)
        self.assertIn('issues_by_type', report)
        self.assertIn('detailed_issues', report)
        self.assertIn('recommendations', report)
        
        # Verify issues were found
        self.assertGreater(report['total_issues'], 0)
        self.assertIsInstance(report['issues_by_type'], dict)
        self.assertIsInstance(report['detailed_issues'], list)
        self.assertIsInstance(report['recommendations'], list)


class TestBusinessValidationMiddleware(TestCase):
    """Test business validation middleware integration."""
    
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
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
    
    def test_validation_error_handling(self):
        """Test validation error handling in middleware."""
        from apps.shared.middleware.business_validation import BusinessValidationMiddleware
        
        middleware = BusinessValidationMiddleware(lambda request: None)
        
        # Mock request with validation errors
        mock_request = MagicMock()
        mock_request.method = 'POST'
        mock_request.path = '/api/reservations/'
        
        # Test that middleware handles validation errors properly
        # This would typically be tested with actual HTTP requests
        # but we're testing the validation logic here
        self.assertTrue(hasattr(middleware, 'process_exception'))


@pytest.mark.django_db
class TestEdgeCaseScenarios:
    """Test edge case scenarios and stress conditions."""
    
    def test_concurrent_reservation_validation(self):
        """Test validation under concurrent reservation attempts."""
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
        
        users = []
        for i in range(3):
            user = User.objects.create_user(
                email=f"user{i}@example.com",
                password="testpass123",
                organization=organization,
                club=club
            )
            users.append(user)
        
        validator = ReservationBusinessValidator()
        
        # Simulate concurrent reservation attempts for same slot
        reservation_date = date.today() + timedelta(days=1)
        start_time = time(10, 0)
        end_time = time(11, 0)
        
        valid_reservations = 0
        
        for user in users:
            reservation_data = {
                'club': club,
                'court': court,
                'user': user,
                'date': reservation_date,
                'start_time': start_time,
                'end_time': end_time,
                'player_name': user.get_full_name(),
                'player_email': user.email,
                'total_price': Decimal('500.00')
            }
            
            errors = validator.validate_reservation_business_rules(reservation_data, user)
            
            if len(errors) == 0:
                # Create reservation if valid
                Reservation.objects.create(**reservation_data, status='confirmed')
                valid_reservations += 1
        
        # Only one reservation should be valid due to court availability
        assert valid_reservations == 1
    
    def test_payment_validation_edge_cases(self):
        """Test payment validation edge cases."""
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
        
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=organization,
            club=club
        )
        
        validator = PaymentBusinessValidator()
        
        # Test edge case: payment amount exactly at limit
        payment_data = {
            'organization': organization,
            'club': club,
            'user': user,
            'amount': Decimal('10000.00'),  # Exactly at cash limit
            'payment_type': 'reservation',
            'payment_method': 'cash'
        }
        
        errors = validator.validate_payment_business_rules(payment_data)
        
        # Should not allow cash for this amount
        assert len(errors) > 0
        
        # Test with bank transfer (should be valid)
        payment_data['payment_method'] = 'transfer'
        errors = validator.validate_payment_business_rules(payment_data)
        
        # Should be valid with bank transfer
        assert len(errors) == 0
    
    def test_data_integrity_large_dataset(self):
        """Test data integrity checking with large dataset."""
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
        
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=organization,
            club=club
        )
        
        # Create many payments (some with issues)
        payments_created = 0
        payments_with_issues = 0
        
        for i in range(100):
            payment = Payment.objects.create(
                organization=organization,
                club=club,
                user=user,
                amount=Decimal('500.00') + i,
                payment_type='reservation',
                payment_method='cash',
                status='completed' if i % 3 != 0 else 'failed',  # Some failed payments
                net_amount=Decimal('500.00') + i,
                processed_at=timezone.now() - timedelta(days=i % 30)
            )
            payments_created += 1
            
            # Create revenue for only some payments (create inconsistencies)
            if i % 2 == 0 and payment.status == 'completed':
                Revenue.objects.create(
                    organization=organization,
                    club=club,
                    date=date.today() - timedelta(days=i % 30),
                    concept='reservation',
                    description=f'Revenue {i}',
                    amount=payment.net_amount,
                    payment_method=payment.payment_method,
                    reference=f'REV-{i:03d}',
                    payment=payment
                )
            else:
                payments_with_issues += 1
        
        service = DataIntegrityService()
        
        # Check integrity
        issues = service.check_payment_revenue_consistency(
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        # Should find issues
        assert len(issues) > 0
        
        # Generate report
        report = service.generate_integrity_report(
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        assert report['total_issues'] > 0
        assert 'missing_revenue' in report['issues_by_type']


if __name__ == '__main__':
    pytest.main([__file__])