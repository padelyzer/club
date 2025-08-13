"""
Stripe webhook handler for payment events.
"""

import json
import logging
import stripe
from decimal import Decimal

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.db import transaction
from datetime import datetime

from apps.finance.models import Payment, PaymentRefund, Subscription, Invoice
from apps.finance.services import PaymentService
from apps.notifications.services import EmailService

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events.
    
    Events handled:
    - charge.succeeded
    - charge.failed
    - charge.refunded
    - payment_intent.succeeded
    - payment_intent.payment_failed
    - invoice.payment_succeeded
    - invoice.payment_failed
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid payload in Stripe webhook")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature in Stripe webhook")
        return HttpResponse(status=400)
    
    # Handle the event
    if event['type'] == 'charge.succeeded':
        charge = event['data']['object']
        handle_successful_charge(charge)
        
    elif event['type'] == 'charge.failed':
        charge = event['data']['object']
        handle_failed_charge(charge)
        
    elif event['type'] == 'charge.refunded':
        charge = event['data']['object']
        handle_refunded_charge(charge)
        
    elif event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        handle_successful_intent(intent)
        
    elif event['type'] == 'payment_intent.payment_failed':
        intent = event['data']['object']
        handle_failed_intent(intent)
        
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        handle_invoice_payment_succeeded(invoice)
        
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        handle_invoice_payment_failed(invoice)
        
    elif event['type'] == 'customer.subscription.created':
        subscription = event['data']['object']
        handle_subscription_created(subscription)
        
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        handle_subscription_updated(subscription)
        
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_deleted(subscription)
    
    else:
        logger.info(f"Unhandled Stripe event type: {event['type']}")
    
    return HttpResponse(status=200)


def handle_successful_charge(charge):
    """Handle successful charge from Stripe."""
    try:
        # Find payment by charge ID
        payment = Payment.objects.filter(
            external_transaction_id=charge['id']
        ).first()
        
        if not payment:
            # Check metadata for payment ID
            payment_id = charge.get('metadata', {}).get('payment_id')
            if payment_id:
                payment = Payment.objects.filter(id=payment_id).first()
        
        if payment and payment.status != 'completed':
            # Update payment status
            payment.status = 'completed'
            payment.processed_at = timezone.now()
            payment.gateway_response = charge
            
            # Update card details
            if charge.get('source'):
                payment.card_last4 = charge['source']['last4']
                payment.card_brand = charge['source']['brand']
                payment.card_country = charge['source']['country']
            
            payment.save()
            
            # Update related objects
            payment._update_related_object()
            payment._create_revenue_record()
            
            logger.info(f"Updated payment {payment.reference_number} as successful")
            
    except Exception as e:
        logger.error(f"Error handling successful charge: {e}")


def handle_failed_charge(charge):
    """Handle failed charge from Stripe."""
    try:
        payment = Payment.objects.filter(
            external_transaction_id=charge['id']
        ).first()
        
        if payment and payment.status not in ['failed', 'completed']:
            payment.status = 'failed'
            payment.failed_at = timezone.now()
            payment.failure_reason = charge.get('failure_message', 'Payment failed')
            payment.gateway_response = charge
            payment.save()
            
            logger.info(f"Updated payment {payment.reference_number} as failed")
            
    except Exception as e:
        logger.error(f"Error handling failed charge: {e}")


def handle_refunded_charge(charge):
    """Handle refunded charge from Stripe."""
    try:
        payment = Payment.objects.filter(
            external_transaction_id=charge['id']
        ).first()
        
        if payment:
            # Check if we already have this refund
            refund_amount = Decimal(str(charge['amount_refunded'] / 100))
            
            if refund_amount > payment.refund_amount:
                # Create refund record
                refund = PaymentRefund.objects.create(
                    payment=payment,
                    amount=refund_amount - payment.refund_amount,
                    reason='Stripe refund',
                    status='completed',
                    gateway_refund_id=charge.get('refunds', {}).get('data', [{}])[0].get('id'),
                    gateway_response=charge
                )
                
                # Update payment
                payment.refund_amount = refund_amount
                if refund_amount >= payment.amount:
                    payment.status = 'refunded'
                else:
                    payment.status = 'partial_refund'
                payment.save()
                
                logger.info(f"Processed refund for payment {payment.reference_number}")
                
    except Exception as e:
        logger.error(f"Error handling refunded charge: {e}")


def handle_successful_intent(intent):
    """Handle successful payment intent."""
    # Similar to charge succeeded
    if intent.get('charges', {}).get('data'):
        charge = intent['charges']['data'][0]
        handle_successful_charge(charge)


def handle_failed_intent(intent):
    """Handle failed payment intent."""
    if intent.get('charges', {}).get('data'):
        charge = intent['charges']['data'][0]
        handle_failed_charge(charge)


@transaction.atomic
def handle_invoice_payment_succeeded(invoice):
    """Handle successful invoice payment from Stripe."""
    try:
        # Find or create invoice record
        invoice_obj = Invoice.objects.filter(
            stripe_invoice_id=invoice['id']
        ).first()
        
        if not invoice_obj:
            # Check if we have a subscription for this invoice
            subscription = Subscription.objects.filter(
                stripe_subscription_id=invoice.get('subscription')
            ).first()
            
            if subscription:
                # Create invoice record
                invoice_obj = Invoice.objects.create(
                    stripe_invoice_id=invoice['id'],
                    subscription=subscription,
                    amount=Decimal(str(invoice['amount_paid'] / 100)),
                    status='paid',
                    paid_at=timezone.now(),
                    period_start=timezone.make_aware(datetime.fromtimestamp(invoice['period_start'])),
                    period_end=timezone.make_aware(datetime.fromtimestamp(invoice['period_end'])),
                    metadata=invoice
                )
                
                # Update subscription last payment date
                subscription.last_payment_date = timezone.now()
                subscription.save()
                
                logger.info(f"Created and marked invoice {invoice['id']} as paid")
        
        elif invoice_obj.status != 'paid':
            # Update existing invoice
            invoice_obj.status = 'paid'
            invoice_obj.paid_at = timezone.now()
            invoice_obj.amount_paid = Decimal(str(invoice['amount_paid'] / 100))
            invoice_obj.metadata = invoice
            invoice_obj.save()
            
            logger.info(f"Updated invoice {invoice['id']} as paid")
            
        # Send payment confirmation
        if invoice_obj and hasattr(invoice_obj, 'subscription'):
            EmailService.send_invoice_paid(invoice_obj)
            
    except Exception as e:
        logger.error(f"Error handling invoice payment succeeded: {e}")


@transaction.atomic
def handle_invoice_payment_failed(invoice):
    """Handle failed invoice payment from Stripe."""
    try:
        # Find invoice record
        invoice_obj = Invoice.objects.filter(
            stripe_invoice_id=invoice['id']
        ).first()
        
        if not invoice_obj:
            # Check if we have a subscription for this invoice
            subscription = Subscription.objects.filter(
                stripe_subscription_id=invoice.get('subscription')
            ).first()
            
            if subscription:
                # Create invoice record with failed status
                invoice_obj = Invoice.objects.create(
                    stripe_invoice_id=invoice['id'],
                    subscription=subscription,
                    amount=Decimal(str(invoice['amount_due'] / 100)),
                    status='failed',
                    period_start=timezone.make_aware(datetime.fromtimestamp(invoice['period_start'])),
                    period_end=timezone.make_aware(datetime.fromtimestamp(invoice['period_end'])),
                    metadata=invoice
                )
                
                logger.info(f"Created invoice {invoice['id']} with failed status")
        
        else:
            # Update existing invoice
            invoice_obj.status = 'failed'
            invoice_obj.metadata = invoice
            invoice_obj.save()
            
            logger.info(f"Updated invoice {invoice['id']} as failed")
            
        # Send payment failure notification
        if invoice_obj and hasattr(invoice_obj, 'subscription'):
            EmailService.send_invoice_payment_failed(invoice_obj)
            
            # Update subscription status if multiple failures
            if invoice['attempt_count'] >= 3:
                subscription = invoice_obj.subscription
                subscription.status = 'past_due'
                subscription.save()
                logger.warning(f"Subscription {subscription.id} marked as past_due after {invoice['attempt_count']} failed attempts")
            
    except Exception as e:
        logger.error(f"Error handling invoice payment failed: {e}")


@transaction.atomic
def handle_subscription_created(subscription):
    """Handle new subscription creation from Stripe."""
    try:
        # Find or create subscription record
        sub_obj = Subscription.objects.filter(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if not sub_obj:
            # Get customer and find associated user/club
            customer_id = subscription['customer']
            
            # Try to find payment method or user with this customer ID
            payment = Payment.objects.filter(
                gateway_response__customer=customer_id
            ).order_by('-created_at').first()
            
            if payment:
                # Create subscription record
                sub_obj = Subscription.objects.create(
                    stripe_subscription_id=subscription['id'],
                    stripe_customer_id=customer_id,
                    club=payment.club,
                    user=payment.user,
                    status='active',
                    current_period_start=timezone.make_aware(datetime.fromtimestamp(subscription['current_period_start'])),
                    current_period_end=timezone.make_aware(datetime.fromtimestamp(subscription['current_period_end'])),
                    cancel_at_period_end=subscription['cancel_at_period_end'],
                    metadata=subscription
                )
                
                # Extract plan details
                if subscription['items']['data']:
                    plan = subscription['items']['data'][0]['price']
                    sub_obj.plan_id = plan['id']
                    sub_obj.plan_amount = Decimal(str(plan['unit_amount'] / 100))
                    sub_obj.plan_interval = plan['recurring']['interval']
                    sub_obj.save()
                
                logger.info(f"Created subscription {subscription['id']}")
                
                # Send welcome email
                EmailService.send_subscription_created(sub_obj)
        
        else:
            # Update existing subscription
            sub_obj.status = 'active'
            sub_obj.current_period_start = timezone.make_aware(datetime.fromtimestamp(subscription['current_period_start']))
            sub_obj.current_period_end = timezone.make_aware(datetime.fromtimestamp(subscription['current_period_end']))
            sub_obj.metadata = subscription
            sub_obj.save()
            
            logger.info(f"Updated subscription {subscription['id']}")
            
    except Exception as e:
        logger.error(f"Error handling subscription created: {e}")


@transaction.atomic
def handle_subscription_updated(subscription):
    """Handle subscription updates from Stripe."""
    try:
        # Find subscription record
        sub_obj = Subscription.objects.filter(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if sub_obj:
            # Update subscription details
            sub_obj.status = subscription['status']
            sub_obj.current_period_start = timezone.make_aware(datetime.fromtimestamp(subscription['current_period_start']))
            sub_obj.current_period_end = timezone.make_aware(datetime.fromtimestamp(subscription['current_period_end']))
            sub_obj.cancel_at_period_end = subscription['cancel_at_period_end']
            sub_obj.canceled_at = timezone.make_aware(datetime.fromtimestamp(subscription['canceled_at'])) if subscription.get('canceled_at') else None
            sub_obj.metadata = subscription
            
            # Update plan details if changed
            if subscription['items']['data']:
                plan = subscription['items']['data'][0]['price']
                sub_obj.plan_id = plan['id']
                sub_obj.plan_amount = Decimal(str(plan['unit_amount'] / 100))
                sub_obj.plan_interval = plan['recurring']['interval']
            
            sub_obj.save()
            
            logger.info(f"Updated subscription {subscription['id']} with status {subscription['status']}")
            
            # Send notification based on status change
            if subscription['status'] == 'canceled':
                EmailService.send_subscription_canceled(sub_obj)
            elif subscription['cancel_at_period_end']:
                EmailService.send_subscription_will_cancel(sub_obj)
                
        else:
            logger.warning(f"Subscription {subscription['id']} not found for update")
            
    except Exception as e:
        logger.error(f"Error handling subscription updated: {e}")


@transaction.atomic
def handle_subscription_deleted(subscription):
    """Handle subscription deletion/cancellation from Stripe."""
    try:
        # Find subscription record
        sub_obj = Subscription.objects.filter(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if sub_obj:
            # Update subscription as canceled
            sub_obj.status = 'canceled'
            sub_obj.canceled_at = timezone.now()
            sub_obj.ended_at = timezone.now()
            sub_obj.metadata = subscription
            sub_obj.save()
            
            logger.info(f"Marked subscription {subscription['id']} as canceled")
            
            # Send cancellation confirmation
            EmailService.send_subscription_canceled(sub_obj)
            
            # Handle any cleanup (e.g., revoke access, update permissions)
            if hasattr(sub_obj, 'club') and sub_obj.club:
                # Update club subscription status
                sub_obj.club.has_active_subscription = False
                sub_obj.club.save()
                
        else:
            logger.warning(f"Subscription {subscription['id']} not found for deletion")
            
    except Exception as e:
        logger.error(f"Error handling subscription deleted: {e}")
