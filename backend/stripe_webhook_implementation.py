"""
Stripe Webhook Implementation Template for Padelyzer
This file provides a complete webhook implementation that can be integrated into the finance app.
"""

import json
import logging

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

import stripe

from apps.finance.models import PaymentMethod, Transaction
from apps.reservations.models import Reservation

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Stripe webhook handler for processing payment events.

    Usage:
    1. Add this to your finance/urls.py:
       path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook')

    2. Configure webhook endpoint in Stripe Dashboard:
       URL: https://yourdomain.com/api/finance/webhooks/stripe/
       Events: payment_intent.succeeded, payment_intent.payment_failed, etc.
    """

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        if not sig_header:
            logger.warning("Stripe webhook received without signature")
            return HttpResponseBadRequest("Missing signature")

        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.error("Invalid payload in Stripe webhook")
            return HttpResponseBadRequest("Invalid payload")
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature in Stripe webhook")
            return HttpResponseBadRequest("Invalid signature")

        # Log the event for debugging
        logger.info(f"Stripe webhook received: {event['type']} - {event['id']}")

        # Handle the event
        try:
            if event["type"] == "payment_intent.succeeded":
                self._handle_payment_succeeded(event["data"]["object"])
            elif event["type"] == "payment_intent.payment_failed":
                self._handle_payment_failed(event["data"]["object"])
            elif event["type"] == "payment_intent.canceled":
                self._handle_payment_canceled(event["data"]["object"])
            elif event["type"] == "payment_intent.requires_action":
                self._handle_payment_requires_action(event["data"]["object"])
            elif event["type"] == "charge.dispute.created":
                self._handle_dispute_created(event["data"]["object"])
            else:
                logger.info(f"Unhandled Stripe event type: {event['type']}")

        except Exception as e:
            logger.error(f"Error processing Stripe webhook {event['type']}: {str(e)}")
            return Response(
                {"error": "Webhook processing failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return HttpResponse(status=200)

    def _handle_payment_succeeded(self, payment_intent):
        """Handle successful payment."""
        payment_intent_id = payment_intent["id"]

        try:
            # Find the transaction by Stripe payment intent ID
            transaction = Transaction.objects.get(
                external_transaction_id=payment_intent_id
            )

            # Update transaction status
            transaction.status = "completed"
            transaction.processor_response = payment_intent
            transaction.save()

            # Update reservation status if linked
            if transaction.reservation:
                reservation = transaction.reservation
                reservation.payment_status = "paid"
                reservation.status = "confirmed"
                reservation.save()

                logger.info(
                    f"Reservation {reservation.id} confirmed after payment success"
                )

            logger.info(f"Transaction {transaction.id} marked as completed")

        except Transaction.DoesNotExist:
            logger.warning(
                f"Transaction not found for payment intent: {payment_intent_id}"
            )
        except Exception as e:
            logger.error(f"Error updating transaction for successful payment: {str(e)}")
            raise

    def _handle_payment_failed(self, payment_intent):
        """Handle failed payment."""
        payment_intent_id = payment_intent["id"]
        failure_reason = payment_intent.get("last_payment_error", {}).get(
            "message", "Unknown error"
        )

        try:
            transaction = Transaction.objects.get(
                external_transaction_id=payment_intent_id
            )

            # Update transaction status
            transaction.status = "failed"
            transaction.processor_response = payment_intent
            transaction.notes = (
                f"{transaction.notes}\nPayment failed: {failure_reason}".strip()
            )
            transaction.save()

            # Update reservation status if linked
            if transaction.reservation:
                reservation = transaction.reservation
                reservation.payment_status = "pending"
                reservation.status = "pending"  # Keep reservation but mark as unpaid
                reservation.save()

                logger.info(
                    f"Reservation {reservation.id} marked as unpaid after payment failure"
                )

            logger.info(
                f"Transaction {transaction.id} marked as failed: {failure_reason}"
            )

        except Transaction.DoesNotExist:
            logger.warning(
                f"Transaction not found for failed payment intent: {payment_intent_id}"
            )
        except Exception as e:
            logger.error(f"Error updating transaction for failed payment: {str(e)}")
            raise

    def _handle_payment_canceled(self, payment_intent):
        """Handle canceled payment."""
        payment_intent_id = payment_intent["id"]

        try:
            transaction = Transaction.objects.get(
                external_transaction_id=payment_intent_id
            )

            # Update transaction status
            transaction.status = "cancelled"
            transaction.processor_response = payment_intent
            transaction.save()

            # Cancel reservation if linked
            if transaction.reservation:
                reservation = transaction.reservation
                reservation.payment_status = "pending"
                reservation.status = "cancelled"
                reservation.save()

                logger.info(
                    f"Reservation {reservation.id} cancelled after payment cancellation"
                )

            logger.info(f"Transaction {transaction.id} marked as cancelled")

        except Transaction.DoesNotExist:
            logger.warning(
                f"Transaction not found for canceled payment intent: {payment_intent_id}"
            )
        except Exception as e:
            logger.error(f"Error updating transaction for canceled payment: {str(e)}")
            raise

    def _handle_payment_requires_action(self, payment_intent):
        """Handle payment that requires additional action (3D Secure, etc.)."""
        payment_intent_id = payment_intent["id"]

        try:
            transaction = Transaction.objects.get(
                external_transaction_id=payment_intent_id
            )

            # Update transaction to indicate action required
            transaction.status = "pending"
            transaction.processor_response = payment_intent
            transaction.notes = f"{transaction.notes}\nPayment requires additional authentication".strip()
            transaction.save()

            logger.info(f"Transaction {transaction.id} requires additional action")

        except Transaction.DoesNotExist:
            logger.warning(
                f"Transaction not found for payment requiring action: {payment_intent_id}"
            )
        except Exception as e:
            logger.error(
                f"Error updating transaction for payment requiring action: {str(e)}"
            )
            raise

    def _handle_dispute_created(self, charge):
        """Handle charge dispute (chargeback)."""
        charge_id = charge["id"]
        dispute = charge.get("dispute", {})
        dispute_reason = dispute.get("reason", "Unknown")

        try:
            # Find transaction by charge ID (stored in processor_response)
            transaction = Transaction.objects.filter(
                processor_response__icontains=charge_id
            ).first()

            if transaction:
                # Create a note about the dispute
                transaction.notes = (
                    f"{transaction.notes}\nDispute created: {dispute_reason}".strip()
                )
                transaction.save()

                logger.warning(
                    f"Dispute created for transaction {transaction.id}: {dispute_reason}"
                )
            else:
                logger.warning(
                    f"Transaction not found for disputed charge: {charge_id}"
                )

        except Exception as e:
            logger.error(f"Error handling dispute for charge {charge_id}: {str(e)}")
            raise


# Alternative function-based view (simpler approach)
@csrf_exempt
@require_POST
def stripe_webhook_handler(request):
    """
    Simple function-based webhook handler.

    Usage:
    Add to finance/urls.py:
    path('webhooks/stripe-simple/', stripe_webhook_handler, name='stripe-webhook-simple')
    """
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponseBadRequest()

    # Handle the event
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        # Update your database here
        logger.info(f"Payment succeeded: {payment_intent['id']}")

    return HttpResponse(status=200)


# Integration example for finance/urls.py
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .stripe_webhook_implementation import StripeWebhookView

# Add to your existing urlpatterns:
urlpatterns = [
    # ... existing patterns
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
]
"""

# Settings configuration example
"""
# Add to your settings.py:
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

# Make sure you have logging configured:
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'stripe_webhooks.log',
        },
    },
    'loggers': {
        'stripe_webhook_implementation': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
"""

# Stripe Dashboard Configuration Instructions
"""
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: https://yourdomain.com/api/finance/webhooks/stripe/
4. Select events to send:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payment_intent.canceled
   - payment_intent.requires_action
   - charge.dispute.created
5. Copy the webhook signing secret to your .env file as STRIPE_WEBHOOK_SECRET
"""
