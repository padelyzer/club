#!/usr/bin/env python
"""
FIX-3: Tests unitarios para implementación completa de pagos.
Tests for payment system, Stripe integration, and all payment scenarios.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
import uuid
import json

from apps.finance.models import Payment, PaymentRefund, PaymentIntent, PaymentMethod
from apps.finance.services import PaymentService, ReconciliationService
from apps.reservations.models import Reservation
from apps.clubs.models import Club, Court
from apps.root.models import Organization
from apps.clients.models import ClientProfile

User = get_user_model()


class TestPaymentModel(TestCase):
    """Test Payment model functionality."""
    
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
        
        self.reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00')
        )
    
    def test_payment_creation_all_fields(self):
        """Test payment creation with all fields."""
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            reservation=self.reservation,
            amount=Decimal('500.00'),
            currency='MXN',
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            reference_number='PAY-TEST-001',
            external_transaction_id='pi_test_123456',
            gateway='stripe',
            gateway_response={'status': 'succeeded'},
            card_last4='4242',
            card_brand='visa',
            card_country='MX',
            billing_name='John Doe',
            billing_email='john@example.com',
            billing_phone='+525512345678',
            billing_address='Test Address, Mexico City',
            billing_rfc='XAXX010101000',
            requires_invoice=True,
            description='Court reservation payment',
            processing_fee=Decimal('15.00'),
            net_amount=Decimal('485.00'),
            processed_at=timezone.now(),
            metadata={'reservation_id': str(self.reservation.id)}
        )
        
        # Verify all fields
        self.assertEqual(payment.amount, Decimal('500.00'))
        self.assertEqual(payment.currency, 'MXN')
        self.assertEqual(payment.payment_type, 'reservation')
        self.assertEqual(payment.payment_method, 'stripe')
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.reference_number, 'PAY-TEST-001')
        self.assertEqual(payment.card_last4, '4242')
        self.assertEqual(payment.processing_fee, Decimal('15.00'))
        self.assertEqual(payment.net_amount, Decimal('485.00'))
        self.assertTrue(payment.requires_invoice)
    
    def test_payment_reference_generation(self):
        """Test automatic payment reference generation."""
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash'
        )
        
        self.assertIsNotNone(payment.reference_number)
        self.assertTrue(payment.reference_number.startswith('PAY-'))
        self.assertEqual(len(payment.reference_number.split('-')), 3)
    
    def test_payment_net_amount_calculation(self):
        """Test automatic net amount calculation."""
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('1000.00'),
            payment_type='reservation',
            payment_method='stripe',
            processing_fee=Decimal('30.00')
        )
        
        self.assertEqual(payment.net_amount, Decimal('970.00'))
    
    def test_payment_status_validation(self):
        """Test payment status validation."""
        valid_statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']
        
        for status in valid_statuses:
            payment = Payment(
                organization=self.organization,
                club=self.club,
                user=self.user,
                amount=Decimal('500.00'),
                payment_type='reservation',
                payment_method='cash',
                status=status
            )
            payment.clean()  # Should not raise
        
        # Invalid status
        payment = Payment(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='invalid_status'
        )
        
        with self.assertRaises(ValidationError):
            payment.clean()
    
    def test_payment_amount_validation(self):
        """Test payment amount validation."""
        # Negative amount
        with self.assertRaises(ValidationError):
            payment = Payment(
                organization=self.organization,
                club=self.club,
                user=self.user,
                amount=Decimal('-100.00'),
                payment_type='reservation',
                payment_method='cash'
            )
            payment.clean()
        
        # Zero amount
        with self.assertRaises(ValidationError):
            payment = Payment(
                organization=self.organization,
                club=self.club,
                user=self.user,
                amount=Decimal('0.00'),
                payment_type='reservation',
                payment_method='cash'
            )
            payment.clean()
    
    def test_payment_refund_validation(self):
        """Test payment refund amount validation."""
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='completed'
        )
        
        # Valid refund
        payment.refund_amount = Decimal('200.00')
        payment.clean()  # Should not raise
        
        # Refund exceeds payment amount
        payment.refund_amount = Decimal('600.00')
        with self.assertRaises(ValidationError) as cm:
            payment.clean()
        
        self.assertIn("refund amount cannot exceed", str(cm.exception))
    
    def test_payment_invoice_requirement_validation(self):
        """Test invoice requirement validation."""
        # Requires invoice but no RFC
        with self.assertRaises(ValidationError) as cm:
            payment = Payment(
                organization=self.organization,
                club=self.club,
                user=self.user,
                amount=Decimal('500.00'),
                payment_type='reservation',
                payment_method='cash',
                requires_invoice=True,
                billing_rfc=""
            )
            payment.clean()
        
        self.assertIn("RFC is required", str(cm.exception))
    
    def test_payment_str_representation(self):
        """Test payment string representation."""
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            reference_number='PAY-TEST-001'
        )
        
        expected = "PAY-TEST-001 - $500.00 MXN (cash)"
        self.assertEqual(str(payment), expected)


class TestPaymentRefund(TestCase):
    """Test PaymentRefund model functionality."""
    
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
        
        self.payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed'
        )
    
    def test_refund_creation(self):
        """Test refund creation."""
        refund = PaymentRefund.objects.create(
            payment=self.payment,
            amount=Decimal('200.00'),
            reason='Customer request',
            status='completed',
            gateway_refund_id='re_test_123456',
            processed_by=self.user
        )
        
        self.assertEqual(refund.payment, self.payment)
        self.assertEqual(refund.amount, Decimal('200.00'))
        self.assertEqual(refund.reason, 'Customer request')
        self.assertEqual(refund.status, 'completed')
        self.assertEqual(refund.processed_by, self.user)
    
    def test_refund_amount_validation(self):
        """Test refund amount validation."""
        # Refund exceeds payment amount
        with self.assertRaises(ValidationError) as cm:
            refund = PaymentRefund(
                payment=self.payment,
                amount=Decimal('600.00'),
                reason='Customer request'
            )
            refund.clean()
        
        self.assertIn("refund amount cannot exceed", str(cm.exception))
        
        # Multiple refunds exceeding total
        PaymentRefund.objects.create(
            payment=self.payment,
            amount=Decimal('300.00'),
            reason='First refund',
            status='completed'
        )
        
        with self.assertRaises(ValidationError) as cm:
            refund = PaymentRefund(
                payment=self.payment,
                amount=Decimal('300.00'),
                reason='Second refund'
            )
            refund.clean()
        
        self.assertIn("total refunds would exceed", str(cm.exception))


class TestPaymentIntent(TestCase):
    """Test PaymentIntent model functionality."""
    
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
    
    def test_payment_intent_creation(self):
        """Test payment intent creation."""
        expires_at = timezone.now() + timedelta(hours=1)
        
        intent = PaymentIntent.objects.create(
            intent_id='pi_test_123456',
            amount=Decimal('500.00'),
            currency='MXN',
            status='requires_payment_method',
            customer_email='test@example.com',
            customer_name='John Doe',
            payment_method_types=['card', 'oxxo'],
            gateway='stripe',
            gateway_intent_id='pi_stripe_123456',
            client_secret='pi_test_123456_secret',
            expires_at=expires_at
        )
        
        self.assertEqual(intent.intent_id, 'pi_test_123456')
        self.assertEqual(intent.amount, Decimal('500.00'))
        self.assertEqual(intent.customer_email, 'test@example.com')
        self.assertEqual(intent.payment_method_types, ['card', 'oxxo'])
        self.assertEqual(intent.expires_at, expires_at)
    
    def test_payment_intent_expiration_validation(self):
        """Test payment intent expiration validation."""
        # Past expiration date
        with self.assertRaises(ValidationError) as cm:
            intent = PaymentIntent(
                intent_id='pi_test_123456',
                amount=Decimal('500.00'),
                customer_email='test@example.com',
                customer_name='John Doe',
                expires_at=timezone.now() - timedelta(hours=1)
            )
            intent.clean()
        
        self.assertIn("expiration date must be in the future", str(cm.exception))


class TestPaymentService(TransactionTestCase):
    """Test PaymentService functionality."""
    
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
        
        self.service = PaymentService()
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_stripe(self, mock_stripe_create):
        """Test Stripe payment intent creation."""
        mock_stripe_create.return_value = MagicMock(
            id='pi_test_123456',
            client_secret='pi_test_123456_secret',
            status='requires_payment_method'
        )
        
        intent = self.service.create_payment_intent(
            amount=Decimal('500.00'),
            currency='MXN',
            customer_email='test@example.com',
            metadata={'reservation_id': '123'}
        )
        
        self.assertIsInstance(intent, PaymentIntent)
        self.assertEqual(intent.amount, Decimal('500.00'))
        self.assertEqual(intent.currency, 'MXN')
        self.assertEqual(intent.customer_email, 'test@example.com')
        
        # Verify Stripe was called
        mock_stripe_create.assert_called_once()
    
    def test_process_cash_payment(self):
        """Test cash payment processing."""
        payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': self.user,
            'amount': Decimal('500.00'),
            'payment_type': 'reservation',
            'payment_method': 'cash',
            'billing_name': 'John Doe',
            'description': 'Court reservation payment'
        }
        
        payment = self.service.process_payment(payment_data)
        
        self.assertIsInstance(payment, Payment)
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.amount, Decimal('500.00'))
        self.assertEqual(payment.net_amount, Decimal('500.00'))  # No fees for cash
        self.assertIsNotNone(payment.processed_at)
    
    @patch('stripe.PaymentIntent.confirm')
    def test_confirm_stripe_payment(self, mock_stripe_confirm):
        """Test Stripe payment confirmation."""
        # Create payment intent
        intent = PaymentIntent.objects.create(
            intent_id='pi_test_123456',
            amount=Decimal('500.00'),
            customer_email='test@example.com',
            customer_name='John Doe',
            gateway='stripe',
            gateway_intent_id='pi_stripe_123456',
            client_secret='pi_test_123456_secret',
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Mock Stripe confirmation
        mock_stripe_confirm.return_value = MagicMock(
            id='pi_stripe_123456',
            status='succeeded',
            charges=MagicMock(
                data=[MagicMock(
                    payment_method_details=MagicMock(
                        card=MagicMock(
                            last4='4242',
                            brand='visa',
                            country='MX'
                        )
                    ),
                    billing_details=MagicMock(
                        name='John Doe',
                        email='test@example.com'
                    )
                )]
            )
        )
        
        payment = self.service.confirm_payment_intent(
            intent_id='pi_test_123456',
            payment_method_id='pm_test_123456'
        )
        
        self.assertIsInstance(payment, Payment)
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.card_last4, '4242')
        self.assertEqual(payment.card_brand, 'visa')
        
        # Verify intent was confirmed
        mock_stripe_confirm.assert_called_once()
    
    def test_calculate_processing_fee(self):
        """Test processing fee calculation."""
        # Stripe fee (3% + 3 MXN)
        fee = self.service.calculate_processing_fee(
            amount=Decimal('1000.00'),
            payment_method='stripe'
        )
        expected_fee = Decimal('1000.00') * Decimal('0.03') + Decimal('3.00')
        self.assertEqual(fee, expected_fee)
        
        # Cash - no fee
        fee = self.service.calculate_processing_fee(
            amount=Decimal('1000.00'),
            payment_method='cash'
        )
        self.assertEqual(fee, Decimal('0.00'))
        
        # Card fee (2.5%)
        fee = self.service.calculate_processing_fee(
            amount=Decimal('1000.00'),
            payment_method='card'
        )
        expected_fee = Decimal('1000.00') * Decimal('0.025')
        self.assertEqual(fee, expected_fee)
    
    @patch('stripe.Refund.create')
    def test_process_refund(self, mock_stripe_refund):
        """Test refund processing."""
        # Create completed payment
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            external_transaction_id='pi_test_123456'
        )
        
        # Mock Stripe refund
        mock_stripe_refund.return_value = MagicMock(
            id='re_test_123456',
            status='succeeded'
        )
        
        refund = self.service.process_refund(
            payment=payment,
            amount=Decimal('200.00'),
            reason='Customer request',
            processed_by=self.user
        )
        
        self.assertIsInstance(refund, PaymentRefund)
        self.assertEqual(refund.amount, Decimal('200.00'))
        self.assertEqual(refund.status, 'completed')
        self.assertEqual(refund.reason, 'Customer request')
        
        # Verify Stripe was called
        mock_stripe_refund.assert_called_once()


class TestReconciliationService(TestCase):
    """Test ReconciliationService functionality."""
    
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
        
        self.service = ReconciliationService()
        
        # Create test payments
        self.payments = []
        for i in range(5):
            payment = Payment.objects.create(
                organization=self.organization,
                club=self.club,
                amount=Decimal('500.00') * (i + 1),
                payment_type='reservation',
                payment_method='stripe' if i % 2 == 0 else 'cash',
                status='completed',
                processed_at=timezone.now() - timedelta(hours=i)
            )
            self.payments.append(payment)
    
    def test_daily_reconciliation(self):
        """Test daily reconciliation report."""
        report = self.service.daily_reconciliation_report(
            date=date.today(),
            club=self.club
        )
        
        self.assertIn('total_transactions', report)
        self.assertIn('total_amount', report)
        self.assertIn('by_payment_method', report)
        self.assertIn('discrepancies', report)
        
        # Check totals
        expected_total = sum(p.amount for p in self.payments)
        self.assertEqual(report['total_amount'], expected_total)
        self.assertEqual(report['total_transactions'], len(self.payments))
    
    def test_identify_discrepancies(self):
        """Test discrepancy identification."""
        # Create payment with failed status but processed_at set (discrepancy)
        Payment.objects.create(
            organization=self.organization,
            club=self.club,
            amount=Decimal('100.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='failed',
            processed_at=timezone.now()  # This is a discrepancy
        )
        
        discrepancies = self.service.identify_discrepancies(
            start_date=date.today(),
            end_date=date.today(),
            club=self.club
        )
        
        self.assertGreater(len(discrepancies), 0)
        
        # Check discrepancy types
        discrepancy_types = [d['type'] for d in discrepancies]
        self.assertIn('status_mismatch', discrepancy_types)
    
    def test_reconciliation_summary(self):
        """Test reconciliation summary generation."""
        summary = self.service.generate_reconciliation_summary(
            start_date=date.today(),
            end_date=date.today(),
            club=self.club
        )
        
        self.assertIn('period', summary)
        self.assertIn('club', summary)
        self.assertIn('summary', summary)
        self.assertIn('payment_methods', summary)
        self.assertIn('discrepancies', summary)
        self.assertIn('recommendations', summary)
        
        # Verify structure
        self.assertEqual(summary['club'], self.club.name)
        self.assertIsInstance(summary['payment_methods'], dict)
        self.assertIsInstance(summary['discrepancies'], list)


@pytest.mark.django_db
class TestPaymentIntegration:
    """Test payment integration scenarios."""
    
    def test_complete_payment_workflow_stripe(self):
        """Test complete Stripe payment workflow."""
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
        
        service = PaymentService()
        
        # Step 1: Create payment intent
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(
                id='pi_test_123456',
                client_secret='pi_test_123456_secret',
                status='requires_payment_method'
            )
            
            intent = service.create_payment_intent(
                amount=Decimal('500.00'),
                customer_email=user.email,
                metadata={'user_id': str(user.id)}
            )
            
            assert intent.status == 'requires_payment_method'
        
        # Step 2: Confirm payment
        with patch('stripe.PaymentIntent.confirm') as mock_confirm:
            mock_confirm.return_value = MagicMock(
                id='pi_stripe_123456',
                status='succeeded',
                charges=MagicMock(
                    data=[MagicMock(
                        payment_method_details=MagicMock(
                            card=MagicMock(last4='4242', brand='visa')
                        ),
                        billing_details=MagicMock(
                            name='John Doe',
                            email='test@example.com'
                        )
                    )]
                )
            )
            
            payment = service.confirm_payment_intent(
                intent_id=intent.intent_id,
                payment_method_id='pm_test_123456'
            )
            
            assert payment.status == 'completed'
            assert payment.card_last4 == '4242'
        
        # Step 3: Process refund
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund.return_value = MagicMock(
                id='re_test_123456',
                status='succeeded'
            )
            
            refund = service.process_refund(
                payment=payment,
                amount=Decimal('200.00'),
                reason='Customer request',
                processed_by=user
            )
            
            assert refund.status == 'completed'
            assert refund.amount == Decimal('200.00')


if __name__ == '__main__':
    pytest.main([__file__])