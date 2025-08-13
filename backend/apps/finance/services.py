"""
Payment services for handling all payment operations.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Optional, Tuple

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.finance.models import Payment, PaymentIntent, PaymentMethod, PaymentRefund
from apps.notifications.services import EmailService

logger = logging.getLogger(__name__)
User = get_user_model()

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:
    """Service for payment operations."""
    
    @staticmethod
    @transaction.atomic
    def create_payment(
        amount: Decimal,
        payment_type: str,
        payment_method: str,
        organization,
        club,
        user=None,
        client=None,
        **kwargs
    ) -> Payment:
        """
        Create a new payment record.
        
        Args:
            amount: Payment amount
            payment_type: Type of payment (reservation, membership, etc)
            payment_method: Payment method (card, cash, etc)
            organization: Organization instance
            club: Club instance
            user: User making payment (optional)
            client: Client profile (optional)
            **kwargs: Additional payment fields
            
        Returns:
            Payment instance
        """
        payment_data = {
            'amount': amount,
            'payment_type': payment_type,
            'payment_method': payment_method,
            'organization': organization,
            'club': club,
            'user': user,
            'client': client,
            **kwargs
        }
        
        # Extract related objects
        reservation = kwargs.get('reservation')
        membership = kwargs.get('membership')
        
        # Set description
        if not payment_data.get('description'):
            if reservation:
                payment_data['description'] = f"Pago por reserva de {reservation.court.name}"
            elif membership:
                payment_data['description'] = f"Pago de membresía {membership.plan.name}"
            else:
                payment_data['description'] = f"Pago {payment_type}"
        
        payment = Payment.objects.create(**payment_data)
        
        logger.info(f"Created payment {payment.reference_number} for ${amount}")
        
        return payment
    
    @staticmethod
    def process_payment(payment: Payment, payment_details: Dict) -> Tuple[bool, str]:
        """
        Process a payment through the appropriate gateway.
        
        Args:
            payment: Payment instance
            payment_details: Payment details (card info, etc)
            
        Returns:
            Tuple of (success, message)
        """
        try:
            if payment.payment_method == 'stripe':
                return PaymentService._process_stripe_payment(payment, payment_details)
            elif payment.payment_method == 'cash':
                return PaymentService._process_cash_payment(payment)
            elif payment.payment_method == 'transfer':
                return PaymentService._process_transfer_payment(payment)
            else:
                # Default processing
                payment.process_payment()
                return True, "Pago procesado exitosamente"
                
        except Exception as e:
            logger.error(f"Payment processing error: {e}")
            return False, str(e)
    
    @staticmethod
    def _process_stripe_payment(payment: Payment, payment_details: Dict) -> Tuple[bool, str]:
        """Process payment through Stripe."""
        try:
            # Create Stripe charge
            charge = stripe.Charge.create(
                amount=int(payment.amount * 100),  # Convert to cents
                currency=payment.currency.lower(),
                source=payment_details.get('stripe_token'),
                description=payment.description,
                metadata={
                    'payment_id': str(payment.id),
                    'reference': payment.reference_number
                }
            )
            
            # Update payment with Stripe response
            payment.gateway = 'stripe'
            payment.external_transaction_id = charge.id
            payment.gateway_response = charge
            
            # Extract card details
            if charge.source:
                payment.card_last4 = charge.source.last4
                payment.card_brand = charge.source.brand
                payment.card_country = charge.source.country
            
            # Calculate fees (Stripe: 2.9% + 30¢)
            payment.processing_fee = (payment.amount * Decimal('0.029')) + Decimal('0.30')
            
            payment.process_payment(charge)
            
            # Send receipt
            PaymentService._send_payment_receipt(payment)
            
            return True, "Pago procesado exitosamente"
            
        except stripe.error.CardError as e:
            payment.status = 'failed'
            payment.failed_at = timezone.now()
            payment.failure_reason = e.user_message
            payment.save()
            return False, e.user_message
            
        except Exception as e:
            payment.status = 'failed'
            payment.failed_at = timezone.now()
            payment.failure_reason = str(e)
            payment.save()
            logger.error(f"Stripe payment error: {e}")
            return False, "Error procesando el pago"
    
    @staticmethod
    def _process_cash_payment(payment: Payment) -> Tuple[bool, str]:
        """Process cash payment."""
        payment.process_payment()
        return True, "Pago en efectivo registrado"
    
    @staticmethod
    def _process_transfer_payment(payment: Payment) -> Tuple[bool, str]:
        """Process bank transfer payment."""
        # Mark as processing - will be completed when transfer is confirmed
        payment.status = 'processing'
        payment.save()
        
        # Send transfer instructions
        PaymentService._send_transfer_instructions(payment)
        
        return True, "Instrucciones de transferencia enviadas"
    
    @staticmethod
    @transaction.atomic
    def refund_payment(
        payment: Payment,
        amount: Optional[Decimal] = None,
        reason: str = '',
        user: Optional[User] = None
    ) -> PaymentRefund:
        """
        Refund a payment.
        
        Args:
            payment: Payment to refund
            amount: Amount to refund (None for full refund)
            reason: Refund reason
            user: User processing refund
            
        Returns:
            PaymentRefund instance
        """
        if not payment.can_refund():
            raise ValidationError("Este pago no puede ser reembolsado")
        
        # Process gateway refund
        if payment.gateway == 'stripe' and payment.external_transaction_id:
            try:
                stripe_refund = stripe.Refund.create(
                    charge=payment.external_transaction_id,
                    amount=int((amount or payment.amount) * 100),
                    reason='requested_by_customer'
                )
                
                # Create refund with gateway info
                refund = payment.refund(
                    amount=amount,
                    reason=reason,
                    user=user
                )
                
                refund.gateway_refund_id = stripe_refund.id
                refund.gateway_response = stripe_refund
                refund.save()
                
            except Exception as e:
                logger.error(f"Stripe refund error: {e}")
                raise ValidationError(f"Error procesando reembolso: {e}")
        else:
            # Process manual refund
            refund = payment.refund(
                amount=amount,
                reason=reason,
                user=user
            )
        
        # Send refund notification
        PaymentService._send_refund_notification(payment, refund)
        
        logger.info(f"Processed refund of ${refund.amount} for payment {payment.reference_number}")
        
        return refund
    
    @staticmethod
    def create_payment_intent(
        amount: Decimal,
        customer_email: str,
        customer_name: str,
        metadata: Dict = None
    ) -> PaymentIntent:
        """
        Create a payment intent for client-side payment flow.
        
        Args:
            amount: Payment amount
            customer_email: Customer email
            customer_name: Customer name
            metadata: Additional metadata
            
        Returns:
            PaymentIntent instance
        """
        # Create Stripe PaymentIntent
        stripe_intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency='mxn',
            payment_method_types=['card', 'oxxo'],
            metadata=metadata or {}
        )
        
        # Create our PaymentIntent
        intent = PaymentIntent.objects.create(
            amount=amount,
            customer_email=customer_email,
            customer_name=customer_name,
            gateway_intent_id=stripe_intent.id,
            client_secret=stripe_intent.client_secret,
            metadata=metadata or {}
        )
        
        logger.info(f"Created payment intent {intent.intent_id} for ${amount}")
        
        return intent
    
    @staticmethod
    def save_payment_method(
        user: User,
        payment_method_id: str,
        set_as_default: bool = False
    ) -> PaymentMethod:
        """
        Save a payment method for future use.
        
        Args:
            user: User to save method for
            payment_method_id: Stripe payment method ID
            set_as_default: Set as default payment method
            
        Returns:
            PaymentMethod instance
        """
        # Get or create Stripe customer
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.get_full_name()
            )
            user.stripe_customer_id = customer.id
            user.save()
        
        # Attach payment method to customer
        stripe_pm = stripe.PaymentMethod.attach(
            payment_method_id,
            customer=user.stripe_customer_id
        )
        
        # Create our PaymentMethod
        payment_method = PaymentMethod.objects.create(
            user=user,
            type='card',
            is_default=set_as_default,
            card_last4=stripe_pm.card.last4,
            card_brand=stripe_pm.card.brand,
            card_exp_month=stripe_pm.card.exp_month,
            card_exp_year=stripe_pm.card.exp_year,
            card_country=stripe_pm.card.country,
            gateway='stripe',
            gateway_customer_id=user.stripe_customer_id,
            gateway_payment_method_id=stripe_pm.id
        )
        
        logger.info(f"Saved payment method for user {user.email}")
        
        return payment_method
    
    @staticmethod
    def _send_payment_receipt(payment: Payment):
        """Send payment receipt email."""
        try:
            # TODO: Implement email notification
            # EmailService().send_payment_receipt(payment)
            pass
        except Exception as e:
            logger.error(f"Error sending payment receipt: {e}")
    
    @staticmethod
    def _send_transfer_instructions(payment: Payment):
        """Send bank transfer instructions."""
        try:
            # TODO: Implement email notification
            # EmailService().send_transfer_instructions(payment)
            pass
        except Exception as e:
            logger.error(f"Error sending transfer instructions: {e}")
    
    @staticmethod
    def _send_refund_notification(payment: Payment, refund: PaymentRefund):
        """Send refund notification."""
        try:
            # TODO: Implement email notification
            # EmailService().send_refund_notification(payment, refund)
            pass
        except Exception as e:
            logger.error(f"Error sending refund notification: {e}")
    
    @staticmethod
    def get_payment_methods(user: User) -> list:
        """Get user's saved payment methods."""
        return user.payment_methods.filter(is_active=True).order_by('-is_default', '-created_at')
    
    @staticmethod
    def charge_with_saved_method(
        user: User,
        amount: Decimal,
        payment_method: PaymentMethod,
        description: str,
        **kwargs
    ) -> Payment:
        """
        Charge using a saved payment method.
        
        Args:
            user: User to charge
            amount: Amount to charge
            payment_method: Saved payment method
            description: Payment description
            **kwargs: Additional payment fields
            
        Returns:
            Payment instance
        """
        # Create payment intent with saved method
        stripe_intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency='mxn',
            customer=payment_method.gateway_customer_id,
            payment_method=payment_method.gateway_payment_method_id,
            off_session=True,
            confirm=True,
            description=description
        )
        
        # Create payment record
        payment = Payment.objects.create(
            amount=amount,
            user=user,
            payment_method='card',
            gateway='stripe',
            external_transaction_id=stripe_intent.id,
            gateway_response=stripe_intent,
            card_last4=payment_method.card_last4,
            card_brand=payment_method.card_brand,
            description=description,
            **kwargs
        )
        
        if stripe_intent.status == 'succeeded':
            payment.process_payment(stripe_intent)
        else:
            payment.status = 'failed'
            payment.failure_reason = 'Payment requires authentication'
            payment.save()
        
        return payment


class ReconciliationService:
    """Service for payment reconciliation."""
    
    @staticmethod
    def reconcile_daily_payments(date: datetime.date, club=None):
        """
        Reconcile payments for a specific date.
        
        Args:
            date: Date to reconcile
            club: Optional club filter
        """
        payments = Payment.objects.filter(
            processed_at__date=date,
            status='completed',
            reconciled=False
        )
        
        if club:
            payments = payments.filter(club=club)
        
        total_reconciled = 0
        errors = []
        
        for payment in payments:
            try:
                # Verify payment in gateway
                if payment.gateway == 'stripe' and payment.external_transaction_id:
                    charge = stripe.Charge.retrieve(payment.external_transaction_id)
                    
                    if charge.status != 'succeeded':
                        errors.append(f"Payment {payment.reference_number} not succeeded in Stripe")
                        continue
                
                # Reconcile
                payment.reconcile(notes=f"Daily reconciliation for {date}")
                total_reconciled += 1
                
            except Exception as e:
                errors.append(f"Error reconciling {payment.reference_number}: {e}")
        
        logger.info(f"Reconciled {total_reconciled} payments for {date}")
        
        if errors:
            logger.error(f"Reconciliation errors: {errors}")
        
        return {
            'date': date,
            'total_reconciled': total_reconciled,
            'errors': errors
        }
    
    @staticmethod
    def generate_reconciliation_report(start_date: datetime.date, end_date: datetime.date, club=None):
        """
        Generate reconciliation report for date range.
        
        Args:
            start_date: Start date
            end_date: End date
            club: Optional club filter
            
        Returns:
            Report dictionary
        """
        payments = Payment.objects.filter(
            processed_at__date__range=[start_date, end_date],
            status='completed'
        )
        
        if club:
            payments = payments.filter(club=club)
        
        # Calculate totals by payment method
        by_method = {}
        for payment in payments:
            method = payment.get_payment_method_display()
            if method not in by_method:
                by_method[method] = {
                    'count': 0,
                    'gross': Decimal('0'),
                    'fees': Decimal('0'),
                    'net': Decimal('0'),
                    'reconciled': 0
                }
            
            by_method[method]['count'] += 1
            by_method[method]['gross'] += payment.amount
            by_method[method]['fees'] += payment.processing_fee
            by_method[method]['net'] += payment.net_amount
            if payment.reconciled:
                by_method[method]['reconciled'] += 1
        
        # Calculate totals
        total_gross = sum(m['gross'] for m in by_method.values())
        total_fees = sum(m['fees'] for m in by_method.values())
        total_net = sum(m['net'] for m in by_method.values())
        
        return {
            'period': f"{start_date} to {end_date}",
            'club': club.name if club else 'All clubs',
            'by_payment_method': by_method,
            'totals': {
                'transactions': payments.count(),
                'gross_amount': total_gross,
                'processing_fees': total_fees,
                'net_amount': total_net,
                'reconciled': payments.filter(reconciled=True).count()
            }
        }
