"""
Comprehensive tests for payment module.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.root.models import Organization
from apps.clubs.models import Club
from apps.reservations.models import Reservation
from apps.finance.models import Payment, PaymentIntent, PaymentMethod, PaymentRefund
from apps.finance.services import PaymentService, ReconciliationService

User = get_user_model()


@pytest.mark.django_db
class TestPaymentModels(TestCase):
    """Test payment models."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Org"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org
        )
        
        self.user = User.objects.create_user(
            email="test@test.com",
            username="test",
            password="test123"
        )
    
    def test_payment_creation(self):
        """Test creating a payment."""
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            user=self.user,
            amount=Decimal("1000"),
            payment_type='reservation',
            payment_method='card'
        )
        
        self.assertIsNotNone(payment.reference_number)
        self.assertTrue(payment.reference_number.startswith('RES-'))
        self.assertEqual(payment.status, 'pending')
        self.assertEqual(payment.net_amount, Decimal("1000"))
    
    def test_payment_processing(self):
        """Test payment processing."""
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("500"),
            payment_type='reservation',
            payment_method='cash'
        )
        
        # Process payment
        payment.process_payment()
        
        self.assertEqual(payment.status, 'completed')
        self.assertIsNotNone(payment.processed_at)
    
    def test_payment_with_fees(self):
        """Test payment with processing fees."""
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("1000"),
            payment_type='reservation',
            payment_method='card',
            processing_fee=Decimal("29.30")  # 2.9% + 30¢
        )
        
        self.assertEqual(payment.net_amount, Decimal("970.70"))
    
    def test_payment_refund(self):
        """Test payment refund."""
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("1000"),
            payment_type='reservation',
            payment_method='card',
            status='completed',
            processed_at=timezone.now()
        )
        
        # Full refund
        refund = payment.refund(reason="Customer request")
        
        self.assertEqual(payment.status, 'refunded')
        self.assertEqual(payment.refund_amount, Decimal("1000"))
        self.assertIsNotNone(payment.refunded_at)
        self.assertEqual(refund.amount, Decimal("1000"))
    
    def test_partial_refund(self):
        """Test partial refund."""
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("1000"),
            payment_type='reservation',
            payment_method='card',
            status='completed',
            processed_at=timezone.now()
        )
        
        # Partial refund
        refund = payment.refund(amount=Decimal("300"), reason="Partial service")
        
        self.assertEqual(payment.status, 'partial_refund')
        self.assertEqual(payment.refund_amount, Decimal("300"))
        self.assertEqual(refund.amount, Decimal("300"))
        
        # Can still refund more
        self.assertTrue(payment.can_refund())
    
    def test_payment_intent_creation(self):
        """Test payment intent creation."""
        intent = PaymentIntent.objects.create(
            amount=Decimal("500"),
            customer_email="customer@test.com",
            customer_name="Test Customer"
        )
        
        self.assertIsNotNone(intent.intent_id)
        self.assertTrue(intent.intent_id.startswith('pi_'))
        self.assertEqual(intent.status, 'requires_payment_method')
        self.assertIsNotNone(intent.expires_at)


@pytest.mark.django_db
class TestPaymentService(TestCase):
    """Test payment service operations."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Org"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org
        )
        
        self.user = User.objects.create_user(
            email="test@test.com",
            username="test",
            password="test123"
        )
        
        self.service = PaymentService()
    
    def test_create_payment(self):
        """Test creating payment through service."""
        payment = self.service.create_payment(
            amount=Decimal("750"),
            payment_type='reservation',
            payment_method='card',
            organization=self.org,
            club=self.club,
            user=self.user,
            description="Test payment"
        )
        
        self.assertIsNotNone(payment)
        self.assertEqual(payment.amount, Decimal("750"))
        self.assertEqual(payment.description, "Test payment")
    
    @patch('stripe.Charge.create')
    def test_stripe_payment_processing(self, mock_charge):
        """Test Stripe payment processing."""
        # Mock Stripe response
        mock_charge.return_value = Mock(
            id='ch_test123',
            status='succeeded',
            source=Mock(
                last4='4242',
                brand='Visa',
                country='US'
            )
        )
        
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("1000"),
            payment_type='reservation',
            payment_method='stripe'
        )
        
        # Process with Stripe
        success, message = self.service.process_payment(
            payment,
            {'stripe_token': 'tok_test123'}
        )
        
        self.assertTrue(success)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.external_transaction_id, 'ch_test123')
        self.assertEqual(payment.card_last4, '4242')
        self.assertEqual(payment.card_brand, 'Visa')
    
    def test_cash_payment_processing(self):
        """Test cash payment processing."""
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("500"),
            payment_type='reservation',
            payment_method='cash'
        )
        
        success, message = self.service.process_payment(payment, {})
        
        self.assertTrue(success)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'completed')
    
    @patch('stripe.Refund.create')
    def test_payment_refund_service(self, mock_refund):
        """Test refund through service."""
        # Mock Stripe refund
        mock_refund.return_value = Mock(
            id='re_test123',
            status='succeeded'
        )
        
        payment = Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("1000"),
            payment_type='reservation',
            payment_method='card',
            gateway='stripe',
            external_transaction_id='ch_test123',
            status='completed',
            processed_at=timezone.now()
        )
        
        # Process refund
        refund = self.service.refund_payment(
            payment,
            amount=Decimal("500"),
            reason="Test refund",
            user=self.user
        )
        
        self.assertIsNotNone(refund)
        self.assertEqual(refund.amount, Decimal("500"))
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'partial_refund')
        self.assertEqual(payment.refund_amount, Decimal("500"))


@pytest.mark.django_db
class TestReconciliationService(TestCase):
    """Test payment reconciliation."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(
            rfc="TEST123456ABC",
            business_name="Test Org",
            trade_name="Test Org"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org
        )
        
        self.service = ReconciliationService()
    
    def test_daily_reconciliation(self):
        """Test daily payment reconciliation."""
        # Create payments for today
        today = timezone.now().date()
        
        for i in range(3):
            Payment.objects.create(
                organization=self.org,
                club=self.club,
                amount=Decimal("100"),
                payment_type='reservation',
                payment_method='card',
                status='completed',
                processed_at=timezone.now()
            )
        
        # Create one reconciled payment
        Payment.objects.create(
            organization=self.org,
            club=self.club,
            amount=Decimal("100"),
            payment_type='reservation',
            payment_method='card',
            status='completed',
            processed_at=timezone.now(),
            reconciled=True
        )
        
        # Run reconciliation
        result = self.service.reconcile_daily_payments(today, self.club)
        
        self.assertEqual(result['total_reconciled'], 3)
        self.assertEqual(len(result['errors']), 0)
    
    def test_reconciliation_report(self):
        """Test reconciliation report generation."""
        # Create various payments
        for method in ['cash', 'card', 'transfer']:
            for i in range(2):
                Payment.objects.create(
                    organization=self.org,
                    club=self.club,
                    amount=Decimal("100"),
                    payment_type='reservation',
                    payment_method=method,
                    status='completed',
                    processed_at=timezone.now(),
                    processing_fee=Decimal("3") if method == 'card' else Decimal("0")
                )
        
        # Generate report
        today = timezone.now().date()
        report = self.service.generate_reconciliation_report(
            today, today, self.club
        )
        
        self.assertEqual(report['totals']['transactions'], 6)
        self.assertEqual(report['totals']['gross_amount'], Decimal("600"))
        self.assertEqual(report['totals']['processing_fees'], Decimal("6"))  # 2 card payments
        self.assertEqual(len(report['by_payment_method']), 3)
