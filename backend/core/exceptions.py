"""
Custom exceptions for Padelyzer.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class PadelyzerException(APIException):
    """Base exception for all Padelyzer custom exceptions."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "An error occurred."
    default_code = "error"


class OrganizationLimitExceeded(PadelyzerException):
    """Raised when organization exceeds plan limits."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Organization has exceeded plan limits."
    default_code = "limit_exceeded"


class PaymentRequired(PadelyzerException):
    """Raised when payment is required for an action."""

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Payment is required to complete this action."
    default_code = "payment_required"


class SubscriptionExpired(PadelyzerException):
    """Raised when subscription has expired."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Subscription has expired."
    default_code = "subscription_expired"


class InvalidTimeSlot(PadelyzerException):
    """Raised when time slot is invalid or unavailable."""

    default_detail = "The selected time slot is not available."
    default_code = "invalid_time_slot"


class DuplicateReservation(PadelyzerException):
    """Raised when trying to create duplicate reservation."""

    default_detail = "A reservation already exists for this time slot."
    default_code = "duplicate_reservation"


class InsufficientCapacity(PadelyzerException):
    """Raised when capacity is exceeded."""

    default_detail = "Insufficient capacity for this request."
    default_code = "insufficient_capacity"


class InvalidPaymentMethod(PadelyzerException):
    """Raised when payment method is invalid."""

    default_detail = "Invalid payment method."
    default_code = "invalid_payment_method"


class CancellationNotAllowed(PadelyzerException):
    """Raised when cancellation is not allowed."""

    default_detail = "Cancellation is not allowed at this time."
    default_code = "cancellation_not_allowed"


class InvalidRFC(PadelyzerException):
    """Raised when RFC is invalid."""

    default_detail = "Invalid RFC format."
    default_code = "invalid_rfc"


class WhatsAppError(PadelyzerException):
    """Raised when WhatsApp message fails."""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Failed to send WhatsApp message."
    default_code = "whatsapp_error"


class StripeError(PadelyzerException):
    """Raised when Stripe payment fails."""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Payment processing failed."
    default_code = "stripe_error"


class MercadoPagoError(PadelyzerException):
    """Raised when MercadoPago payment fails."""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Payment processing failed."
    default_code = "mercadopago_error"
