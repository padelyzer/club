# 💰 Finance & Payments Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de finanzas y pagos, cubriendo integración con Stripe, procesamiento de pagos, webhooks, reembolsos, suscripciones y reportes financieros.

## 🎯 Objetivos de Testing

### Cobertura Target: 100%
- **Unit Tests**: 60% - Cálculos financieros y validaciones
- **Integration Tests**: 30% - APIs de pagos y webhooks
- **E2E Tests**: 10% - Flujos completos de pago

### Endpoints a Cubrir
- ✅ POST `/api/v1/payments/create-intent/`
- ✅ POST `/api/v1/payments/confirm/`
- ✅ GET `/api/v1/payments/{id}/`
- ✅ POST `/api/v1/webhooks/stripe/`
- ✅ GET `/api/v1/invoices/`
- ✅ GET `/api/v1/invoices/{id}/`
- ✅ POST `/api/v1/refunds/`
- ✅ GET `/api/v1/payment-methods/`
- ✅ POST `/api/v1/payment-methods/`
- ✅ DELETE `/api/v1/payment-methods/{id}/`

## 🧪 Unit Tests

### 1. Payment Model Tests
```python
# backend/tests/unit/finance/test_models.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.finance.models import Payment, Invoice, Transaction, Refund
from tests.factories import UserFactory, ReservationFactory, PaymentFactory
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

class PaymentModelTest(TestCase):
    """Test Payment model functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        self.reservation = ReservationFactory(
            user=self.user,
            price=Decimal("35.00")
        )
    
    def test_payment_creation(self):
        """Test basic payment creation"""
        payment = Payment.objects.create(
            reservation=self.reservation,
            user=self.user,
            amount=Decimal("35.00"),
            currency="EUR",
            payment_method="card",
            status="pending",
            stripe_payment_intent_id="pi_test_123"
        )
        
        self.assertEqual(payment.reservation, self.reservation)
        self.assertEqual(payment.amount, Decimal("35.00"))
        self.assertEqual(str(payment), f"Payment {payment.id} - €35.00")
    
    def test_payment_validation(self):
        """Test payment amount validation"""
        # Amount must match reservation price
        with self.assertRaises(ValidationError):
            payment = Payment(
                reservation=self.reservation,
                user=self.user,
                amount=Decimal("50.00"),  # Wrong amount
                payment_method="card"
            )
            payment.full_clean()
    
    def test_payment_status_transitions(self):
        """Test payment status transitions"""
        payment = PaymentFactory(
            reservation=self.reservation,
            status="pending"
        )
        
        # Pending -> Processing
        payment.mark_processing()
        self.assertEqual(payment.status, "processing")
        self.assertIsNotNone(payment.processed_at)
        
        # Processing -> Completed
        payment.mark_completed(
            stripe_charge_id="ch_test_123",
            stripe_balance_transaction="txn_test_123"
        )
        self.assertEqual(payment.status, "completed")
        self.assertIsNotNone(payment.completed_at)
        self.assertEqual(payment.stripe_charge_id, "ch_test_123")
        
        # Cannot go back to pending
        with self.assertRaises(ValidationError):
            payment.status = "pending"
            payment.save()
    
    def test_payment_fee_calculation(self):
        """Test payment fee calculations"""
        payment = Payment.objects.create(
            reservation=self.reservation,
            amount=Decimal("100.00"),
            payment_method="card",
            stripe_fee=Decimal("2.90"),  # 2.9% Stripe fee
            platform_fee_percentage=Decimal("10.00")  # 10% platform fee
        )
        
        payment.calculate_fees()
        
        self.assertEqual(payment.platform_fee, Decimal("10.00"))
        self.assertEqual(payment.club_payout, Decimal("87.10"))  # 100 - 2.90 - 10
        self.assertEqual(payment.total_fees, Decimal("12.90"))

class InvoiceModelTest(TestCase):
    """Test Invoice model functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        self.payment = PaymentFactory(
            user=self.user,
            amount=Decimal("50.00"),
            status="completed"
        )
    
    def test_invoice_generation(self):
        """Test automatic invoice generation"""
        invoice = Invoice.generate_for_payment(self.payment)
        
        self.assertEqual(invoice.payment, self.payment)
        self.assertEqual(invoice.user, self.user)
        self.assertEqual(invoice.subtotal, Decimal("41.32"))  # Without VAT
        self.assertEqual(invoice.tax_rate, Decimal("21.00"))  # Spanish VAT
        self.assertEqual(invoice.tax_amount, Decimal("8.68"))
        self.assertEqual(invoice.total, Decimal("50.00"))
        self.assertIsNotNone(invoice.invoice_number)
    
    def test_invoice_number_sequence(self):
        """Test invoice numbering sequence"""
        # Create multiple invoices
        invoices = []
        for i in range(3):
            payment = PaymentFactory(amount=Decimal("30.00"))
            invoice = Invoice.generate_for_payment(payment)
            invoices.append(invoice)
        
        # Check sequential numbering
        numbers = [inv.invoice_number for inv in invoices]
        self.assertEqual(len(set(numbers)), 3)  # All unique
        
        # Check format (e.g., INV-2024-00001)
        for number in numbers:
            self.assertTrue(number.startswith("INV-"))
            self.assertIn(str(timezone.now().year), number)
    
    def test_invoice_pdf_generation(self):
        """Test invoice PDF generation"""
        invoice = Invoice.generate_for_payment(self.payment)
        
        # Generate PDF
        pdf_content = invoice.generate_pdf()
        
        self.assertIsNotNone(pdf_content)
        self.assertGreater(len(pdf_content), 1000)  # Has content
        self.assertTrue(pdf_content.startswith(b'%PDF'))  # PDF header

class TransactionModelTest(TestCase):
    """Test Transaction model for ledger"""
    
    def test_double_entry_bookkeeping(self):
        """Test double-entry bookkeeping implementation"""
        payment = PaymentFactory(
            amount=Decimal("100.00"),
            stripe_fee=Decimal("2.90"),
            platform_fee=Decimal("10.00")
        )
        
        # Create transactions
        transactions = Transaction.create_for_payment(payment)
        
        # Should create multiple transactions
        self.assertEqual(len(transactions), 4)
        
        # Check debit/credit balance
        total_debit = sum(t.debit for t in transactions)
        total_credit = sum(t.credit for t in transactions)
        self.assertEqual(total_debit, total_credit)
        
        # Verify accounts
        accounts = {t.account for t in transactions}
        expected_accounts = {
            'cash',           # Payment received
            'stripe_fees',    # Stripe fee expense
            'platform_fees',  # Platform revenue
            'club_payable'    # Amount owed to club
        }
        self.assertEqual(accounts, expected_accounts)
```

### 2. Pricing Calculation Tests
```python
# backend/tests/unit/finance/test_pricing.py
from django.test import TestCase
from apps.finance.services import PricingService
from apps.clubs.models import Club, Court, PricingRule
from tests.factories import ClubFactory, CourtFactory, UserFactory
from decimal import Decimal
from datetime import datetime, time

class PricingServiceTest(TestCase):
    """Test pricing calculation service"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(
            club=self.club,
            price_per_hour=Decimal("30.00")
        )
        self.service = PricingService()
    
    def test_basic_pricing(self):
        """Test basic hourly pricing"""
        # 1 hour booking
        price = self.service.calculate_price(
            court=self.court,
            start_time=datetime(2024, 1, 15, 10, 0),
            end_time=datetime(2024, 1, 15, 11, 0)
        )
        self.assertEqual(price, Decimal("30.00"))
        
        # 1.5 hour booking
        price = self.service.calculate_price(
            court=self.court,
            start_time=datetime(2024, 1, 15, 10, 0),
            end_time=datetime(2024, 1, 15, 11, 30)
        )
        self.assertEqual(price, Decimal("45.00"))
    
    def test_dynamic_pricing_rules(self):
        """Test dynamic pricing with rules"""
        # Create peak hours rule
        peak_rule = PricingRule.objects.create(
            club=self.club,
            name="Peak Hours",
            rule_type="time_based",
            conditions={
                "weekdays": [1, 2, 3, 4, 5],
                "start_time": "18:00",
                "end_time": "21:00"
            },
            modifier_type="percentage",
            modifier_value=Decimal("50.00"),  # 50% increase
            is_active=True
        )
        
        # Regular hours
        regular_price = self.service.calculate_price(
            court=self.court,
            start_time=datetime(2024, 1, 15, 10, 0),  # Monday 10 AM
            end_time=datetime(2024, 1, 15, 11, 0)
        )
        self.assertEqual(regular_price, Decimal("30.00"))
        
        # Peak hours
        peak_price = self.service.calculate_price(
            court=self.court,
            start_time=datetime(2024, 1, 15, 19, 0),  # Monday 7 PM
            end_time=datetime(2024, 1, 15, 20, 0)
        )
        self.assertEqual(peak_price, Decimal("45.00"))  # 30 * 1.5
    
    def test_member_discounts(self):
        """Test member discount application"""
        member = UserFactory()
        self.club.members.add(member)
        self.club.member_discount_percentage = Decimal("20.00")
        self.club.save()
        
        # Non-member price
        non_member_price = self.service.calculate_price(
            court=self.court,
            start_time=datetime(2024, 1, 15, 10, 0),
            end_time=datetime(2024, 1, 15, 11, 0),
            user=UserFactory()  # Non-member
        )
        self.assertEqual(non_member_price, Decimal("30.00"))
        
        # Member price
        member_price = self.service.calculate_price(
            court=self.court,
            start_time=datetime(2024, 1, 15, 10, 0),
            end_time=datetime(2024, 1, 15, 11, 0),
            user=member
        )
        self.assertEqual(member_price, Decimal("24.00"))  # 30 * 0.8
    
    def test_promotional_codes(self):
        """Test promotional code application"""
        from apps.finance.models import PromoCode
        
        # Create promo code
        promo = PromoCode.objects.create(
            code="SUMMER20",
            discount_type="percentage",
            discount_value=Decimal("20.00"),
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
            usage_limit=100,
            is_active=True
        )
        
        base_price = Decimal("50.00")
        discounted_price = self.service.apply_promo_code(
            base_price=base_price,
            promo_code="SUMMER20"
        )
        
        self.assertEqual(discounted_price, Decimal("40.00"))
        
        # Test usage tracking
        self.assertEqual(promo.times_used, 1)
```

### 3. Fee Calculation Tests
```python
# backend/tests/unit/finance/test_fees.py
from django.test import TestCase
from apps.finance.services import FeeCalculationService
from decimal import Decimal

class FeeCalculationTest(TestCase):
    """Test fee calculation logic"""
    
    def setUp(self):
        self.service = FeeCalculationService()
    
    def test_stripe_fee_calculation(self):
        """Test Stripe fee calculation"""
        # European card
        stripe_fee = self.service.calculate_stripe_fee(
            amount=Decimal("100.00"),
            payment_method="card",
            card_country="ES"
        )
        # 1.4% + €0.25 for European cards
        expected = Decimal("1.65")  # (100 * 0.014) + 0.25
        self.assertEqual(stripe_fee, expected)
        
        # Non-European card
        stripe_fee = self.service.calculate_stripe_fee(
            amount=Decimal("100.00"),
            payment_method="card",
            card_country="US"
        )
        # 2.9% + €0.25 for non-European cards
        expected = Decimal("3.15")  # (100 * 0.029) + 0.25
        self.assertEqual(stripe_fee, expected)
    
    def test_platform_fee_calculation(self):
        """Test platform fee calculation"""
        # Percentage-based fee
        platform_fee = self.service.calculate_platform_fee(
            amount=Decimal("100.00"),
            fee_type="percentage",
            fee_value=Decimal("10.00")  # 10%
        )
        self.assertEqual(platform_fee, Decimal("10.00"))
        
        # Fixed fee
        platform_fee = self.service.calculate_platform_fee(
            amount=Decimal("100.00"),
            fee_type="fixed",
            fee_value=Decimal("5.00")
        )
        self.assertEqual(platform_fee, Decimal("5.00"))
        
        # Hybrid fee (percentage + fixed)
        platform_fee = self.service.calculate_platform_fee(
            amount=Decimal("100.00"),
            fee_type="hybrid",
            percentage_value=Decimal("5.00"),  # 5%
            fixed_value=Decimal("2.00")
        )
        self.assertEqual(platform_fee, Decimal("7.00"))  # 5 + 2
    
    def test_club_payout_calculation(self):
        """Test club payout calculation"""
        payout = self.service.calculate_club_payout(
            gross_amount=Decimal("100.00"),
            stripe_fee=Decimal("2.90"),
            platform_fee=Decimal("10.00"),
            tax_rate=Decimal("21.00")  # Spanish VAT
        )
        
        # Net amount after all fees
        expected_payout = Decimal("87.10")  # 100 - 2.90 - 10
        self.assertEqual(payout['net_amount'], expected_payout)
        
        # Tax calculations
        self.assertEqual(payout['tax_amount'], Decimal("15.17"))  # VAT on net
        self.assertEqual(payout['total_payout'], Decimal("71.93"))  # After tax
```

## 🔌 Integration Tests

### 1. Payment Intent Tests
```python
# backend/tests/integration/finance/test_payment_intents.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, ReservationFactory
from apps.finance.models import Payment
from decimal import Decimal
from unittest.mock import patch, MagicMock

class PaymentIntentAPITest(APITestCase):
    """Test payment intent creation and management"""
    
    def setUp(self):
        self.user = UserFactory()
        self.reservation = ReservationFactory(
            user=self.user,
            price=Decimal("45.00"),
            status="pending"
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent(self, mock_stripe_create):
        """Test creating a payment intent"""
        # Mock Stripe response
        mock_stripe_create.return_value = MagicMock(
            id="pi_test_123",
            client_secret="pi_test_123_secret_456",
            amount=4500,
            currency="eur",
            status="requires_payment_method"
        )
        
        data = {
            "reservation_id": self.reservation.id,
            "payment_method_id": "pm_test_visa"
        }
        
        response = self.client.post('/api/v1/payments/create-intent/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment_intent_id'], "pi_test_123")
        self.assertEqual(response.data['client_secret'], "pi_test_123_secret_456")
        self.assertEqual(response.data['amount'], "45.00")
        
        # Check payment record created
        payment = Payment.objects.get(reservation=self.reservation)
        self.assertEqual(payment.stripe_payment_intent_id, "pi_test_123")
        self.assertEqual(payment.amount, Decimal("45.00"))
        self.assertEqual(payment.status, "pending")
        
        # Verify Stripe was called correctly
        mock_stripe_create.assert_called_once_with(
            amount=4500,  # Amount in cents
            currency='eur',
            payment_method=data['payment_method_id'],
            customer=self.user.stripe_customer_id,
            metadata={
                'reservation_id': str(self.reservation.id),
                'user_id': str(self.user.id)
            },
            capture_method='automatic'
        )
    
    @patch('stripe.PaymentIntent.confirm')
    def test_confirm_payment(self, mock_stripe_confirm):
        """Test confirming a payment"""
        # Create payment
        payment = Payment.objects.create(
            reservation=self.reservation,
            user=self.user,
            amount=Decimal("45.00"),
            stripe_payment_intent_id="pi_test_123",
            status="pending"
        )
        
        # Mock Stripe confirmation
        mock_stripe_confirm.return_value = MagicMock(
            id="pi_test_123",
            status="succeeded",
            charges=MagicMock(
                data=[{
                    'id': 'ch_test_123',
                    'balance_transaction': 'txn_test_123'
                }]
            )
        )
        
        data = {
            "payment_intent_id": "pi_test_123",
            "reservation_id": self.reservation.id
        }
        
        response = self.client.post('/api/v1/payments/confirm/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], "succeeded")
        
        # Check payment updated
        payment.refresh_from_db()
        self.assertEqual(payment.status, "completed")
        self.assertEqual(payment.stripe_charge_id, "ch_test_123")
        
        # Check reservation confirmed
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, "confirmed")
    
    def test_payment_requires_authentication(self):
        """Test payment endpoints require authentication"""
        self.client.force_authenticate(user=None)
        
        response = self.client.post('/api/v1/payments/create-intent/', {
            "reservation_id": self.reservation.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_cannot_pay_for_others_reservation(self):
        """Test users cannot pay for others' reservations"""
        other_user = UserFactory()
        other_reservation = ReservationFactory(user=other_user)
        
        response = self.client.post('/api/v1/payments/create-intent/', {
            "reservation_id": other_reservation.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

### 2. Webhook Tests
```python
# backend/tests/integration/finance/test_webhooks.py
from rest_framework.test import APITestCase
from rest_framework import status
from apps.finance.models import Payment, WebhookEvent
from tests.factories import PaymentFactory
from unittest.mock import patch, MagicMock
import json
import time

class StripeWebhookTest(APITestCase):
    """Test Stripe webhook handling"""
    
    def setUp(self):
        self.webhook_secret = "whsec_test_secret"
        
    def _create_webhook_payload(self, event_type, data):
        """Create a webhook payload"""
        return {
            "id": f"evt_test_{int(time.time())}",
            "object": "event",
            "type": event_type,
            "created": int(time.time()),
            "data": {
                "object": data
            }
        }
    
    @patch('stripe.Webhook.construct_event')
    def test_payment_intent_succeeded_webhook(self, mock_construct):
        """Test handling payment intent succeeded webhook"""
        # Create payment
        payment = PaymentFactory(
            stripe_payment_intent_id="pi_test_123",
            status="processing"
        )
        
        # Create webhook data
        webhook_data = self._create_webhook_payload(
            "payment_intent.succeeded",
            {
                "id": "pi_test_123",
                "status": "succeeded",
                "amount": 4500,
                "charges": {
                    "data": [{
                        "id": "ch_test_123",
                        "balance_transaction": "txn_test_123"
                    }]
                }
            }
        )
        
        # Mock Stripe signature verification
        mock_construct.return_value = webhook_data
        
        # Send webhook
        response = self.client.post(
            '/api/v1/webhooks/stripe/',
            data=json.dumps(webhook_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check payment updated
        payment.refresh_from_db()
        self.assertEqual(payment.status, "completed")
        self.assertEqual(payment.stripe_charge_id, "ch_test_123")
        
        # Check webhook event recorded
        webhook_event = WebhookEvent.objects.get(
            stripe_event_id=webhook_data['id']
        )
        self.assertEqual(webhook_event.event_type, "payment_intent.succeeded")
        self.assertEqual(webhook_event.status, "processed")
    
    @patch('stripe.Webhook.construct_event')
    def test_payment_intent_failed_webhook(self, mock_construct):
        """Test handling payment failure webhook"""
        payment = PaymentFactory(
            stripe_payment_intent_id="pi_test_failed",
            status="processing"
        )
        
        webhook_data = self._create_webhook_payload(
            "payment_intent.payment_failed",
            {
                "id": "pi_test_failed",
                "status": "requires_payment_method",
                "last_payment_error": {
                    "code": "card_declined",
                    "message": "Your card was declined"
                }
            }
        )
        
        mock_construct.return_value = webhook_data
        
        response = self.client.post(
            '/api/v1/webhooks/stripe/',
            data=json.dumps(webhook_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check payment updated
        payment.refresh_from_db()
        self.assertEqual(payment.status, "failed")
        self.assertEqual(payment.failure_reason, "card_declined")
        
        # Check reservation not confirmed
        self.assertEqual(payment.reservation.status, "pending")
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_idempotency(self, mock_construct):
        """Test webhook idempotency (same event processed once)"""
        payment = PaymentFactory(
            stripe_payment_intent_id="pi_test_123",
            status="processing"
        )
        
        webhook_data = self._create_webhook_payload(
            "payment_intent.succeeded",
            {
                "id": "pi_test_123",
                "status": "succeeded"
            }
        )
        
        mock_construct.return_value = webhook_data
        
        # Send webhook twice
        for _ in range(2):
            response = self.client.post(
                '/api/v1/webhooks/stripe/',
                data=json.dumps(webhook_data),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check only one webhook event recorded
        events = WebhookEvent.objects.filter(
            stripe_event_id=webhook_data['id']
        )
        self.assertEqual(events.count(), 1)
    
    def test_webhook_signature_verification(self):
        """Test webhook signature verification"""
        response = self.client.post(
            '/api/v1/webhooks/stripe/',
            data=json.dumps({"test": "data"}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('signature', str(response.data).lower())
```

### 3. Refund Tests
```python
# backend/tests/integration/finance/test_refunds.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, PaymentFactory
from apps.finance.models import Refund
from decimal import Decimal
from unittest.mock import patch, MagicMock

class RefundAPITest(APITestCase):
    """Test refund functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        self.payment = PaymentFactory(
            user=self.user,
            amount=Decimal("50.00"),
            status="completed",
            stripe_charge_id="ch_test_123"
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('stripe.Refund.create')
    def test_full_refund(self, mock_stripe_refund):
        """Test creating a full refund"""
        # Mock Stripe refund
        mock_stripe_refund.return_value = MagicMock(
            id="re_test_123",
            amount=5000,
            status="succeeded",
            charge="ch_test_123"
        )
        
        data = {
            "payment_id": self.payment.id,
            "reason": "requested_by_customer",
            "notes": "Customer changed plans"
        }
        
        response = self.client.post('/api/v1/refunds/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['amount'], "50.00")
        self.assertEqual(response.data['status'], "pending")
        
        # Check refund created
        refund = Refund.objects.get(payment=self.payment)
        self.assertEqual(refund.amount, Decimal("50.00"))
        self.assertEqual(refund.stripe_refund_id, "re_test_123")
        
        # Verify Stripe called
        mock_stripe_refund.assert_called_once_with(
            charge="ch_test_123",
            amount=5000,
            reason="requested_by_customer",
            metadata={
                'payment_id': str(self.payment.id),
                'notes': "Customer changed plans"
            }
        )
    
    @patch('stripe.Refund.create')
    def test_partial_refund(self, mock_stripe_refund):
        """Test creating a partial refund"""
        mock_stripe_refund.return_value = MagicMock(
            id="re_test_partial",
            amount=2500,
            status="succeeded"
        )
        
        data = {
            "payment_id": self.payment.id,
            "amount": "25.00",  # Half refund
            "reason": "other",
            "notes": "Late cancellation fee applied"
        }
        
        response = self.client.post('/api/v1/refunds/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['amount'], "25.00")
        
        # Check remaining balance
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.refunded_amount, Decimal("25.00"))
        self.assertEqual(self.payment.refundable_amount, Decimal("25.00"))
    
    def test_cannot_refund_more_than_paid(self):
        """Test cannot refund more than payment amount"""
        data = {
            "payment_id": self.payment.id,
            "amount": "60.00",  # More than payment
            "reason": "other"
        }
        
        response = self.client.post('/api/v1/refunds/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exceed', str(response.data).lower())
    
    def test_cannot_refund_others_payment(self):
        """Test users cannot refund others' payments"""
        other_payment = PaymentFactory()
        
        data = {
            "payment_id": other_payment.id,
            "reason": "requested_by_customer"
        }
        
        response = self.client.post('/api/v1/refunds/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

## 🔄 E2E Flow Tests

### 1. Complete Payment Flow
```python
# backend/tests/e2e/finance/test_payment_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory, CourtFactory
from apps.finance.models import Payment, Invoice
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock

class CompletePaymentFlowE2ETest(TestCase):
    """Test complete payment flow including webhooks"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory(
            email="player@test.com",
            stripe_customer_id="cus_test_123"
        )
        self.club = ClubFactory(
            stripe_account_id="acct_test_123"
        )
        self.court = CourtFactory(
            club=self.club,
            price_per_hour=Decimal("40.00")
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('stripe.PaymentIntent.create')
    @patch('stripe.PaymentIntent.confirm')
    @patch('stripe.Webhook.construct_event')
    def test_complete_payment_flow_with_3ds(
        self, 
        mock_webhook_construct,
        mock_confirm,
        mock_create
    ):
        """Test complete payment flow with 3D Secure"""
        
        # Step 1: Create reservation
        start_time = timezone.now() + timedelta(days=2, hours=3)
        reservation_response = self.client.post('/api/v1/reservations/', {
            "court": self.court.id,
            "start_time": start_time.isoformat(),
            "end_time": (start_time + timedelta(hours=1.5)).isoformat()
        })
        self.assertEqual(reservation_response.status_code, 201)
        reservation_id = reservation_response.data['id']
        
        # Step 2: Create payment intent
        mock_create.return_value = MagicMock(
            id="pi_test_3ds",
            client_secret="pi_test_3ds_secret",
            status="requires_action",  # 3DS required
            next_action={
                "type": "use_stripe_sdk",
                "use_stripe_sdk": {
                    "type": "three_d_secure_redirect",
                    "stripe_js": "https://hooks.stripe.com/3d_secure"
                }
            }
        )
        
        payment_intent_response = self.client.post(
            '/api/v1/payments/create-intent/',
            {
                "reservation_id": reservation_id,
                "payment_method_id": "pm_card_threeDSecure2Required"
            }
        )
        self.assertEqual(payment_intent_response.status_code, 200)
        self.assertEqual(
            payment_intent_response.data['requires_action'],
            True
        )
        
        # Step 3: User completes 3DS (simulated)
        # Frontend would handle this with Stripe.js
        
        # Step 4: Confirm payment after 3DS
        mock_confirm.return_value = MagicMock(
            id="pi_test_3ds",
            status="processing"
        )
        
        confirm_response = self.client.post('/api/v1/payments/confirm/', {
            "payment_intent_id": "pi_test_3ds",
            "reservation_id": reservation_id
        })
        self.assertEqual(confirm_response.status_code, 200)
        
        # Step 5: Webhook for payment success
        webhook_data = {
            "id": "evt_test_success",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_3ds",
                    "status": "succeeded",
                    "amount": 6000,  # €60 (1.5 hours × €40)
                    "charges": {
                        "data": [{
                            "id": "ch_test_123",
                            "balance_transaction": "txn_test_123",
                            "payment_method_details": {
                                "card": {
                                    "country": "ES"
                                }
                            }
                        }]
                    }
                }
            }
        }
        
        mock_webhook_construct.return_value = webhook_data
        
        webhook_response = self.client.post(
            '/api/v1/webhooks/stripe/',
            data=webhook_data,
            format='json',
            HTTP_STRIPE_SIGNATURE='valid_sig'
        )
        self.assertEqual(webhook_response.status_code, 200)
        
        # Step 6: Verify final state
        # Check payment
        payment = Payment.objects.get(reservation_id=reservation_id)
        self.assertEqual(payment.status, "completed")
        self.assertEqual(payment.amount, Decimal("60.00"))
        self.assertIsNotNone(payment.stripe_charge_id)
        
        # Check reservation confirmed
        reservation = self.client.get(f'/api/v1/reservations/{reservation_id}/')
        self.assertEqual(reservation.data['status'], "confirmed")
        self.assertEqual(reservation.data['payment_status'], "paid")
        
        # Check invoice generated
        invoice = Invoice.objects.get(payment=payment)
        self.assertIsNotNone(invoice.invoice_number)
        self.assertEqual(invoice.total, Decimal("60.00"))
        
        # Step 7: Download invoice
        invoice_response = self.client.get(
            f'/api/v1/invoices/{invoice.id}/pdf/'
        )
        self.assertEqual(invoice_response.status_code, 200)
        self.assertEqual(
            invoice_response['Content-Type'],
            'application/pdf'
        )
```

### 2. Subscription Flow
```python
# backend/tests/e2e/finance/test_subscription_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from apps.finance.models import Subscription, Payment
from tests.factories import UserFactory, ClubFactory
from decimal import Decimal
from unittest.mock import patch, MagicMock

class SubscriptionFlowE2ETest(TestCase):
    """Test subscription management flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.club = ClubFactory()
        self.client.force_authenticate(user=self.user)
    
    @patch('stripe.Subscription.create')
    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.Customer.modify')
    def test_membership_subscription_flow(
        self,
        mock_customer_modify,
        mock_payment_attach,
        mock_subscription_create
    ):
        """Test creating and managing a membership subscription"""
        
        # Step 1: Get membership plans
        plans_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/membership-plans/'
        )
        self.assertEqual(plans_response.status_code, 200)
        self.assertTrue(len(plans_response.data) > 0)
        
        premium_plan = next(
            p for p in plans_response.data 
            if p['name'] == 'Premium Membership'
        )
        
        # Step 2: Add payment method
        mock_payment_attach.return_value = MagicMock(
            id="pm_test_visa"
        )
        
        payment_method_response = self.client.post(
            '/api/v1/payment-methods/',
            {
                "payment_method_id": "pm_test_visa",
                "set_as_default": True
            }
        )
        self.assertEqual(payment_method_response.status_code, 201)
        
        # Step 3: Create subscription
        mock_subscription_create.return_value = MagicMock(
            id="sub_test_123",
            status="active",
            current_period_start=1234567890,
            current_period_end=1237159890,
            items=MagicMock(data=[{
                "id": "si_test_123",
                "price": {
                    "id": premium_plan['stripe_price_id'],
                    "unit_amount": 9900  # €99
                }
            }])
        )
        
        subscription_response = self.client.post(
            '/api/v1/subscriptions/',
            {
                "club_id": self.club.id,
                "plan_id": premium_plan['id'],
                "payment_method_id": "pm_test_visa"
            }
        )
        self.assertEqual(subscription_response.status_code, 201)
        self.assertEqual(subscription_response.data['status'], "active")
        
        # Step 4: Verify membership benefits
        membership_response = self.client.get('/api/v1/users/me/membership/')
        self.assertEqual(membership_response.status_code, 200)
        self.assertTrue(membership_response.data['is_active'])
        self.assertEqual(
            membership_response.data['benefits']['discount_percentage'],
            20
        )
        
        # Step 5: Use membership discount on booking
        from datetime import datetime, timedelta
        court = CourtFactory(club=self.club, price_per_hour=40)
        
        booking_response = self.client.post('/api/v1/reservations/', {
            "court": court.id,
            "start_time": (timezone.now() + timedelta(days=1)).isoformat(),
            "end_time": (timezone.now() + timedelta(days=1, hours=1)).isoformat()
        })
        self.assertEqual(booking_response.status_code, 201)
        # Price should be €32 (€40 - 20% discount)
        self.assertEqual(
            Decimal(booking_response.data['price']),
            Decimal("32.00")
        )
        
        # Step 6: Cancel subscription
        cancel_response = self.client.post(
            f'/api/v1/subscriptions/{subscription_response.data["id"]}/cancel/',
            {"cancel_at_period_end": True}
        )
        self.assertEqual(cancel_response.status_code, 200)
        self.assertTrue(cancel_response.data['cancel_at_period_end'])
```

### 3. Financial Reporting Flow
```python
# backend/tests/e2e/finance/test_reporting_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory, PaymentFactory
from datetime import datetime, timedelta, date
from decimal import Decimal

class FinancialReportingE2ETest(TestCase):
    """Test financial reporting functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.club_owner = UserFactory()
        self.club = ClubFactory()
        self.club.owners.add(self.club_owner)
        self.client.force_authenticate(user=self.club_owner)
        
        # Create test payment data
        self._create_test_payments()
    
    def _create_test_payments(self):
        """Create payments for testing reports"""
        # Create payments over last 30 days
        for i in range(30):
            payment_date = timezone.now() - timedelta(days=i)
            
            # 2-3 payments per day
            for j in range(2 + (i % 2)):
                payment = PaymentFactory(
                    amount=Decimal("30.00") + (i % 3) * 10,
                    status="completed",
                    created_at=payment_date,
                    stripe_fee=Decimal("1.00"),
                    platform_fee=Decimal("3.00")
                )
                payment.reservation.court.club = self.club
                payment.reservation.court.save()
    
    def test_revenue_dashboard(self):
        """Test revenue dashboard data"""
        # Get revenue overview
        overview_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/revenue/overview/'
        )
        self.assertEqual(overview_response.status_code, 200)
        
        data = overview_response.data
        self.assertIn('total_revenue', data)
        self.assertIn('revenue_today', data)
        self.assertIn('revenue_this_week', data)
        self.assertIn('revenue_this_month', data)
        self.assertIn('growth_percentage', data)
        
        # Get detailed breakdown
        breakdown_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/revenue/breakdown/',
            {'period': 'last_30_days'}
        )
        self.assertEqual(breakdown_response.status_code, 200)
        
        breakdown = breakdown_response.data
        self.assertIn('by_day', breakdown)
        self.assertIn('by_court', breakdown)
        self.assertIn('by_payment_method', breakdown)
        self.assertEqual(len(breakdown['by_day']), 30)
    
    def test_financial_statement_generation(self):
        """Test generating financial statements"""
        # Request monthly statement
        statement_response = self.client.post(
            f'/api/v1/clubs/{self.club.id}/statements/generate/',
            {
                "type": "monthly",
                "month": timezone.now().month,
                "year": timezone.now().year
            }
        )
        self.assertEqual(statement_response.status_code, 202)  # Accepted
        
        task_id = statement_response.data['task_id']
        
        # Check statement generation status
        status_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/statements/status/{task_id}/'
        )
        self.assertEqual(status_response.status_code, 200)
        
        # Download statement (when ready)
        download_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/statements/{task_id}/download/'
        )
        self.assertIn(
            download_response.status_code,
            [200, 202]  # 200 if ready, 202 if still processing
        )
    
    def test_tax_report_generation(self):
        """Test tax report generation"""
        # Get VAT report
        vat_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/tax/vat-report/',
            {
                "start_date": date.today().replace(day=1).isoformat(),
                "end_date": date.today().isoformat()
            }
        )
        self.assertEqual(vat_response.status_code, 200)
        
        vat_data = vat_response.data
        self.assertIn('total_revenue', vat_data)
        self.assertIn('vat_collected', vat_data)
        self.assertIn('vat_rate', vat_data)
        self.assertEqual(vat_data['vat_rate'], "21.00")  # Spanish VAT
        
        # Calculate expected VAT
        total_revenue = Decimal(vat_data['total_revenue'])
        expected_vat = (total_revenue * Decimal("21")) / Decimal("121")
        self.assertAlmostEqual(
            Decimal(vat_data['vat_collected']),
            expected_vat,
            places=2
        )
```

## 🔒 Security Tests

### Payment Security Tests
```python
# backend/tests/security/finance/test_payment_security.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ReservationFactory, PaymentFactory
from apps.finance.models import Payment

class PaymentSecurityTest(TestCase):
    """Test payment security features"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.malicious_user = UserFactory()
    
    def test_payment_data_isolation(self):
        """Test users cannot access others' payment data"""
        # Create payment for other user
        other_payment = PaymentFactory()
        
        self.client.force_authenticate(user=self.user)
        
        # Try to access payment
        response = self.client.get(f'/api/v1/payments/{other_payment.id}/')
        self.assertEqual(response.status_code, 404)
        
        # Try to refund
        response = self.client.post('/api/v1/refunds/', {
            "payment_id": other_payment.id
        })
        self.assertEqual(response.status_code, 403)
    
    def test_webhook_replay_attack_prevention(self):
        """Test webhook replay attack prevention"""
        from apps.finance.models import WebhookEvent
        
        # Create webhook event
        event = WebhookEvent.objects.create(
            stripe_event_id="evt_test_123",
            event_type="payment_intent.succeeded",
            processed=True
        )
        
        # Try to replay webhook
        response = self.client.post(
            '/api/v1/webhooks/stripe/',
            data={
                "id": "evt_test_123",
                "type": "payment_intent.succeeded",
                "data": {"object": {}}
            },
            format='json',
            HTTP_STRIPE_SIGNATURE='test_sig'
        )
        
        # Should handle gracefully without reprocessing
        self.assertEqual(response.status_code, 200)
        
        # Verify not processed again
        self.assertEqual(
            WebhookEvent.objects.filter(stripe_event_id="evt_test_123").count(),
            1
        )
    
    def test_sensitive_data_not_exposed(self):
        """Test sensitive payment data is not exposed"""
        payment = PaymentFactory(
            user=self.user,
            stripe_payment_intent_id="pi_secret_123"
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/payments/{payment.id}/')
        
        self.assertEqual(response.status_code, 200)
        
        # Check sensitive data not in response
        response_str = str(response.data)
        self.assertNotIn('pi_secret', response_str)
        self.assertNotIn('client_secret', response_str)
        self.assertNotIn('stripe_account', response_str)
```

## 📊 Performance Tests

### Payment Performance Tests
```python
# backend/tests/performance/finance/test_payment_performance.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory, PaymentFactory
import time
from concurrent.futures import ThreadPoolExecutor

class PaymentPerformanceTest(TestCase):
    """Test payment system performance"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.club = ClubFactory()
    
    def test_payment_processing_speed(self):
        """Test payment processing performance"""
        reservation = ReservationFactory(user=self.user)
        self.client.force_authenticate(user=self.user)
        
        start = time.time()
        
        # Create payment intent
        response = self.client.post('/api/v1/payments/create-intent/', {
            "reservation_id": reservation.id
        })
        
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 1.0)  # Should complete within 1 second
    
    def test_concurrent_payment_handling(self):
        """Test system handles concurrent payments"""
        users = [UserFactory() for _ in range(10)]
        reservations = [
            ReservationFactory(user=user) for user in users
        ]
        
        def create_payment(user, reservation):
            client = APIClient()
            client.force_authenticate(user=user)
            return client.post('/api/v1/payments/create-intent/', {
                "reservation_id": reservation.id
            })
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            start = time.time()
            futures = [
                executor.submit(create_payment, user, reservation)
                for user, reservation in zip(users, reservations)
            ]
            results = [f.result() for f in futures]
            duration = time.time() - start
        
        # All should succeed
        for result in results:
            self.assertEqual(result.status_code, 200)
        
        # Should handle 10 concurrent payments quickly
        self.assertLess(duration, 3.0)
    
    def test_financial_report_performance(self):
        """Test financial report generation performance"""
        # Create 1000 payments
        for _ in range(1000):
            PaymentFactory(
                amount=Decimal("30.00"),
                status="completed"
            )
        
        self.client.force_authenticate(user=self.club.owners.first())
        
        start = time.time()
        response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/revenue/overview/'
        )
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 0.5)  # Should complete within 500ms
```

## 🎯 Test Execution Commands

### Run All Finance Tests
```bash
# Unit tests only
pytest tests/unit/finance/ -v

# Integration tests
pytest tests/integration/finance/ -v

# E2E tests
pytest tests/e2e/finance/ -v

# All finance tests
pytest tests/ -k finance -v

# With coverage
pytest tests/ -k finance --cov=apps.finance --cov-report=html
```

### Run Specific Test Categories
```bash
# Payment tests
pytest tests/ -k "payment" -v

# Webhook tests
pytest tests/ -k "webhook" -v

# Refund tests
pytest tests/ -k "refund" -v

# Subscription tests
pytest tests/ -k "subscription" -v
```

---

**Siguiente**: [Classes Module Tests](11-Classes-Module-Tests.md) →