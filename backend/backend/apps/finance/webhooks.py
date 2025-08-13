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

from apps.finance.models import Payment, PaymentRefund
from apps.finance.services import PaymentService

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
