"""
Communication services for notifications.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

import requests

logger = logging.getLogger(__name__)


class BaseNotificationService:
    """
    Base class for notification services.
    """

    def __init__(self):
        self.channel_type = None
        self.provider_name = None

    def send(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Send notification. Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement send method")

    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate recipient format. Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement validate_recipient method")

    def get_delivery_status(self, provider_id: str) -> Dict[str, Any]:
        """
        Get delivery status from provider. Optional for subclasses.
        """
        return {"status": "unknown", "provider_id": provider_id}


class EmailService(BaseNotificationService):
    """
    Email notification service using Resend.
    """

    def __init__(self):
        super().__init__()
        self.channel_type = "email"
        self.provider_name = "resend"
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM_EMAIL
        self.base_url = "https://api.resend.com"

    def validate_recipient(self, recipient: str) -> bool:
        """Validate email format."""
        import re

        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, recipient))

    def send(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Send email using Resend API.
        """
        if not self.validate_recipient(recipient):
            return {
                "success": False,
                "error": "Invalid email format",
                "provider_id": None,
            }

        if not self.api_key:
            logger.warning(
                "Resend API key not configured, using Django's email backend"
            )
            return self._send_with_django(recipient, subject, message, **kwargs)

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            # Prepare email data
            email_data = {
                "from": kwargs.get("from_email", self.from_email),
                "to": [recipient],
                "subject": subject,
                "html": message,
            }

            # Add reply-to if provided
            if kwargs.get("reply_to"):
                email_data["reply_to"] = [kwargs["reply_to"]]

            # Add attachments if provided
            if kwargs.get("attachments"):
                email_data["attachments"] = kwargs["attachments"]

            # Add tags for tracking
            if kwargs.get("tags"):
                email_data["tags"] = kwargs["tags"]

            response = requests.post(
                f"{self.base_url}/emails", headers=headers, json=email_data, timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "provider_id": result.get("id"),
                    "provider_response": result,
                }
            else:
                error_data = (
                    response.json()
                    if response.headers.get("content-type") == "application/json"
                    else {}
                )
                return {
                    "success": False,
                    "error": error_data.get("message", f"HTTP {response.status_code}"),
                    "provider_response": error_data,
                    "provider_id": None,
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Resend API error: {str(e)}")
            return {
                "success": False,
                "error": f"Network error: {str(e)}",
                "provider_id": None,
            }
        except Exception as e:
            logger.error(f"Unexpected error sending email: {str(e)}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "provider_id": None,
            }

    def _send_with_django(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Fallback to Django's email backend.
        """
        try:
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=kwargs.get("from_email", self.from_email),
                to=[recipient],
                reply_to=[kwargs["reply_to"]] if kwargs.get("reply_to") else None,
            )
            email.content_subtype = "html"

            # Add attachments if provided
            if kwargs.get("attachments"):
                for attachment in kwargs["attachments"]:
                    email.attach(
                        attachment["filename"],
                        attachment["content"],
                        attachment["mimetype"],
                    )

            email.send()

            return {
                "success": True,
                "provider_id": f"django_{timezone.now().timestamp()}",
                "provider_response": {"method": "django_email_backend"},
            }

        except Exception as e:
            logger.error(f"Django email backend error: {str(e)}")
            return {
                "success": False,
                "error": f"Django email error: {str(e)}",
                "provider_id": None,
            }

    def get_delivery_status(self, provider_id: str) -> Dict[str, Any]:
        """
        Get email delivery status from Resend.
        """
        if not self.api_key or provider_id.startswith("django_"):
            return {"status": "sent", "provider_id": provider_id}

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
            }

            response = requests.get(
                f"{self.base_url}/emails/{provider_id}", headers=headers, timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                # Map Resend status to our status
                status_map = {
                    "sent": "sent",
                    "delivered": "delivered",
                    "bounced": "bounced",
                    "complained": "bounced",
                    "delivery_delayed": "sent",
                }
                return {
                    "status": status_map.get(data.get("last_event"), "sent"),
                    "provider_response": data,
                    "provider_id": provider_id,
                }
            else:
                return {"status": "unknown", "provider_id": provider_id}

        except Exception as e:
            logger.error(f"Error getting email status: {str(e)}")
            return {"status": "unknown", "provider_id": provider_id}


class SMSService(BaseNotificationService):
    """
    SMS notification service using Twilio.
    """

    def __init__(self):
        super().__init__()
        self.channel_type = "sms"
        self.provider_name = "twilio"
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER

    def validate_recipient(self, recipient: str) -> bool:
        """Validate phone number format."""
        import re

        # Basic international phone number validation
        pattern = r"^\+[1-9]\d{1,14}$"
        return bool(re.match(pattern, recipient))

    def send(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Send SMS using Twilio API.
        """
        if not self.validate_recipient(recipient):
            return {
                "success": False,
                "error": "Invalid phone number format",
                "provider_id": None,
            }

        if not all([self.account_sid, self.auth_token, self.from_number]):
            logger.warning("Twilio credentials not configured")
            return {
                "success": False,
                "error": "Twilio not configured",
                "provider_id": None,
            }

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)

            # For SMS, we usually don't use the subject, just the message
            sms_body = f"{subject}\n\n{message}" if subject else message

            # Truncate if too long (SMS limit is usually 160 chars for single SMS)
            if len(sms_body) > 1600:  # Allow for 10 SMS segments
                sms_body = sms_body[:1597] + "..."

            message_obj = client.messages.create(
                body=sms_body, from_=self.from_number, to=recipient
            )

            return {
                "success": True,
                "provider_id": message_obj.sid,
                "provider_response": {
                    "sid": message_obj.sid,
                    "status": message_obj.status,
                    "to": message_obj.to,
                    "from": message_obj.from_,
                },
            }

        except Exception as e:
            logger.error(f"Twilio SMS error: {str(e)}")
            return {
                "success": False,
                "error": f"SMS send error: {str(e)}",
                "provider_id": None,
            }

    def get_delivery_status(self, provider_id: str) -> Dict[str, Any]:
        """
        Get SMS delivery status from Twilio.
        """
        if not all([self.account_sid, self.auth_token]):
            return {"status": "unknown", "provider_id": provider_id}

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)
            message = client.messages(provider_id).fetch()

            # Map Twilio status to our status
            status_map = {
                "queued": "pending",
                "sending": "sent",
                "sent": "sent",
                "delivered": "delivered",
                "undelivered": "failed",
                "failed": "failed",
            }

            return {
                "status": status_map.get(message.status, "unknown"),
                "provider_response": {
                    "status": message.status,
                    "error_code": message.error_code,
                    "error_message": message.error_message,
                },
                "provider_id": provider_id,
            }

        except Exception as e:
            logger.error(f"Error getting SMS status: {str(e)}")
            return {"status": "unknown", "provider_id": provider_id}


class WhatsAppService(BaseNotificationService):
    """
    WhatsApp notification service using Twilio WhatsApp API.
    """

    def __init__(self):
        super().__init__()
        self.channel_type = "whatsapp"
        self.provider_name = "twilio_whatsapp"
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = f"whatsapp:{settings.WHATSAPP_PHONE_NUMBER}"

    def validate_recipient(self, recipient: str) -> bool:
        """Validate WhatsApp number format."""
        import re

        # WhatsApp uses international phone numbers
        pattern = r"^\+[1-9]\d{1,14}$"
        return bool(re.match(pattern, recipient))

    def send(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Send WhatsApp message using Twilio WhatsApp API.
        """
        if not self.validate_recipient(recipient):
            return {
                "success": False,
                "error": "Invalid WhatsApp number format",
                "provider_id": None,
            }

        if not all([self.account_sid, self.auth_token, self.from_number]):
            logger.warning("Twilio WhatsApp credentials not configured")
            return {
                "success": False,
                "error": "Twilio WhatsApp not configured",
                "provider_id": None,
            }

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)

            # Format message for WhatsApp
            whatsapp_body = f"*{subject}*\n\n{message}" if subject else message

            # WhatsApp has longer message limits
            if len(whatsapp_body) > 4096:
                whatsapp_body = whatsapp_body[:4093] + "..."

            message_obj = client.messages.create(
                body=whatsapp_body, from_=self.from_number, to=f"whatsapp:{recipient}"
            )

            return {
                "success": True,
                "provider_id": message_obj.sid,
                "provider_response": {
                    "sid": message_obj.sid,
                    "status": message_obj.status,
                    "to": message_obj.to,
                    "from": message_obj.from_,
                },
            }

        except Exception as e:
            logger.error(f"Twilio WhatsApp error: {str(e)}")
            return {
                "success": False,
                "error": f"WhatsApp send error: {str(e)}",
                "provider_id": None,
            }

    def get_delivery_status(self, provider_id: str) -> Dict[str, Any]:
        """
        Get WhatsApp delivery status from Twilio.
        """
        # Same as SMS service since both use Twilio
        sms_service = SMSService()
        return sms_service.get_delivery_status(provider_id)


class PushNotificationService(BaseNotificationService):
    """
    Push notification service using Firebase Cloud Messaging.
    """

    def __init__(self):
        super().__init__()
        self.channel_type = "push"
        self.provider_name = "firebase"
        self.credentials_path = settings.FIREBASE_CREDENTIALS_PATH
        self.project_id = settings.FIREBASE_PROJECT_ID
        self._firebase_app = None

    def _get_firebase_app(self):
        """Get or initialize Firebase app."""
        if self._firebase_app is None:
            try:
                import firebase_admin
                from firebase_admin import credentials

                if self.credentials_path:
                    cred = credentials.Certificate(self.credentials_path)
                    self._firebase_app = firebase_admin.initialize_app(cred)
                else:
                    # Use default credentials (e.g., in Google Cloud environment)
                    self._firebase_app = firebase_admin.initialize_app()

            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {str(e)}")
                return None

        return self._firebase_app

    def validate_recipient(self, recipient: str) -> bool:
        """Validate FCM token format."""
        # Basic FCM token validation (tokens are usually 152 characters)
        return len(recipient) > 100 and ":" in recipient

    def send(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Send push notification using Firebase Cloud Messaging.
        """
        if not self.validate_recipient(recipient):
            return {
                "success": False,
                "error": "Invalid FCM token format",
                "provider_id": None,
            }

        if not self._get_firebase_app():
            return {
                "success": False,
                "error": "Firebase not configured",
                "provider_id": None,
            }

        try:
            from firebase_admin import messaging

            # Build notification
            notification = messaging.Notification(
                title=subject, body=message, image=kwargs.get("image_url")
            )

            # Build data payload
            data = kwargs.get("data", {})
            # Convert all values to strings (FCM requirement)
            data = {str(k): str(v) for k, v in data.items()}

            # Build Android config
            android_config = messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    click_action=kwargs.get("click_action"),
                    color=kwargs.get("color", "#1976D2"),
                    sound="default",
                    channel_id=kwargs.get("channel_id", "default"),
                ),
            )

            # Build iOS config
            apns_config = messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(
                            title=subject,
                            body=message,
                        ),
                        sound="default",
                        badge=kwargs.get("badge"),
                        category=kwargs.get("category"),
                    )
                )
            )

            # Build web config
            web_config = messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=subject,
                    body=message,
                    icon=kwargs.get("icon_url"),
                    badge=kwargs.get("badge_url"),
                    image=kwargs.get("image_url"),
                    actions=[
                        messaging.WebpushNotificationAction(
                            action=action.get("action"),
                            title=action.get("title"),
                            icon=action.get("icon"),
                        )
                        for action in kwargs.get("actions", [])
                    ],
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link=kwargs.get("click_action")
                ),
            )

            # Create message
            fcm_message = messaging.Message(
                notification=notification,
                data=data,
                token=recipient,
                android=android_config,
                apns=apns_config,
                webpush=web_config,
            )

            # Send message
            response = messaging.send(fcm_message)

            return {
                "success": True,
                "provider_id": response,
                "provider_response": {"message_id": response},
            }

        except Exception as e:
            logger.error(f"Firebase push notification error: {str(e)}")
            return {
                "success": False,
                "error": f"Push notification error: {str(e)}",
                "provider_id": None,
            }

    def send_to_topic(
        self, topic: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Send push notification to a topic.
        """
        if not self._get_firebase_app():
            return {
                "success": False,
                "error": "Firebase not configured",
                "provider_id": None,
            }

        try:
            from firebase_admin import messaging

            # Similar to send() but with topic instead of token
            notification = messaging.Notification(
                title=subject, body=message, image=kwargs.get("image_url")
            )

            data = kwargs.get("data", {})
            data = {str(k): str(v) for k, v in data.items()}

            fcm_message = messaging.Message(
                notification=notification,
                data=data,
                topic=topic,
            )

            response = messaging.send(fcm_message)

            return {
                "success": True,
                "provider_id": response,
                "provider_response": {"message_id": response},
            }

        except Exception as e:
            logger.error(f"Firebase topic notification error: {str(e)}")
            return {
                "success": False,
                "error": f"Topic notification error: {str(e)}",
                "provider_id": None,
            }


class InAppNotificationService(BaseNotificationService):
    """
    In-app notification service (stores in database only).
    """

    def __init__(self):
        super().__init__()
        self.channel_type = "in_app"
        self.provider_name = "database"

    def validate_recipient(self, recipient: str) -> bool:
        """For in-app notifications, recipient is user ID."""
        try:
            int(recipient)  # Check if it's a valid ID
            return True
        except (ValueError, TypeError):
            return False

    def send(
        self, recipient: str, subject: str, message: str, **kwargs
    ) -> Dict[str, Any]:
        """
        Create in-app notification (already stored in database by caller).
        """
        # For in-app notifications, the notification is already created
        # This service just marks it as "sent"
        return {
            "success": True,
            "provider_id": f"in_app_{timezone.now().timestamp()}",
            "provider_response": {"method": "in_app_database"},
        }


# Add static methods to EmailService for specific email types
EmailService.send_invoice_paid = staticmethod(lambda invoice: _send_invoice_paid(invoice))
EmailService.send_invoice_payment_failed = staticmethod(lambda invoice: _send_invoice_payment_failed(invoice))
EmailService.send_subscription_created = staticmethod(lambda subscription: _send_subscription_created(subscription))
EmailService.send_subscription_canceled = staticmethod(lambda subscription: _send_subscription_canceled(subscription))
EmailService.send_subscription_will_cancel = staticmethod(lambda subscription: _send_subscription_will_cancel(subscription))


def _send_invoice_paid(invoice):
    """Send email notification when invoice is paid."""
    try:
        if hasattr(invoice, 'subscription') and invoice.subscription:
            recipient = invoice.subscription.user.email if invoice.subscription.user else None
            if not recipient and invoice.subscription.club.owner:
                recipient = invoice.subscription.club.owner.email
                
            if recipient:
                email_service = EmailService()
                subject = f"Payment Confirmation - Invoice {invoice.invoice_number or invoice.stripe_invoice_id}"
                message = f"""
                <h2>Payment Confirmation</h2>
                <p>Your payment has been successfully processed.</p>
                <p><strong>Invoice:</strong> {invoice.invoice_number or invoice.stripe_invoice_id}</p>
                <p><strong>Amount:</strong> ${invoice.amount_paid}</p>
                <p><strong>Period:</strong> {invoice.period_start.strftime('%Y-%m-%d')} to {invoice.period_end.strftime('%Y-%m-%d')}</p>
                <p>Thank you for your payment.</p>
                """
                return email_service.send(recipient, subject, message)
    except Exception as e:
        logger.error(f"Error sending invoice paid email: {e}")


def _send_invoice_payment_failed(invoice):
    """Send email notification when invoice payment fails."""
    try:
        if hasattr(invoice, 'subscription') and invoice.subscription:
            recipient = invoice.subscription.user.email if invoice.subscription.user else None
            if not recipient and invoice.subscription.club.owner:
                recipient = invoice.subscription.club.owner.email
                
            if recipient:
                email_service = EmailService()
                subject = f"Payment Failed - Invoice {invoice.invoice_number or invoice.stripe_invoice_id}"
                message = f"""
                <h2>Payment Failed</h2>
                <p>We were unable to process your payment.</p>
                <p><strong>Invoice:</strong> {invoice.invoice_number or invoice.stripe_invoice_id}</p>
                <p><strong>Amount:</strong> ${invoice.amount}</p>
                <p>Please update your payment method to avoid service interruption.</p>
                """
                return email_service.send(recipient, subject, message)
    except Exception as e:
        logger.error(f"Error sending invoice payment failed email: {e}")


def _send_subscription_created(subscription):
    """Send welcome email for new subscription."""
    try:
        recipient = subscription.user.email if subscription.user else None
        if not recipient and subscription.club.owner:
            recipient = subscription.club.owner.email
            
        if recipient:
            email_service = EmailService()
            subject = f"Welcome to {subscription.plan_name or 'Padelyzer Subscription'}"
            message = f"""
            <h2>Welcome!</h2>
            <p>Your subscription has been successfully created.</p>
            <p><strong>Plan:</strong> {subscription.plan_name or 'Standard Plan'}</p>
            <p><strong>Amount:</strong> ${subscription.plan_amount} per {subscription.plan_interval}</p>
            <p><strong>Status:</strong> {subscription.get_status_display()}</p>
            <p>Thank you for subscribing!</p>
            """
            return email_service.send(recipient, subject, message)
    except Exception as e:
        logger.error(f"Error sending subscription created email: {e}")


def _send_subscription_canceled(subscription):
    """Send confirmation email for subscription cancellation."""
    try:
        recipient = subscription.user.email if subscription.user else None
        if not recipient and subscription.club.owner:
            recipient = subscription.club.owner.email
            
        if recipient:
            email_service = EmailService()
            subject = "Subscription Canceled"
            message = f"""
            <h2>Subscription Canceled</h2>
            <p>Your subscription has been canceled.</p>
            <p><strong>Plan:</strong> {subscription.plan_name or 'Standard Plan'}</p>
            <p>If you change your mind, you can resubscribe at any time.</p>
            """
            return email_service.send(recipient, subject, message)
    except Exception as e:
        logger.error(f"Error sending subscription canceled email: {e}")


def _send_subscription_will_cancel(subscription):
    """Send notification that subscription will cancel at period end."""
    try:
        recipient = subscription.user.email if subscription.user else None
        if not recipient and subscription.club.owner:
            recipient = subscription.club.owner.email
            
        if recipient:
            email_service = EmailService()
            subject = "Subscription Will Cancel"
            message = f"""
            <h2>Subscription Scheduled for Cancellation</h2>
            <p>Your subscription will be canceled at the end of the current billing period.</p>
            <p><strong>Current period ends:</strong> {subscription.current_period_end.strftime('%Y-%m-%d')}</p>
            <p>You can reactivate your subscription at any time before this date.</p>
            """
            return email_service.send(recipient, subject, message)
    except Exception as e:
        logger.error(f"Error sending subscription will cancel email: {e}")


# Service factory
class NotificationServiceFactory:
    """
    Factory to get the appropriate notification service.
    """

    _services = {
        "email": EmailService,
        "sms": SMSService,
        "whatsapp": WhatsAppService,
        "push_web": PushNotificationService,
        "push_mobile": PushNotificationService,
        "in_app": InAppNotificationService,
    }

    @classmethod
    def get_service(cls, channel_type: str) -> BaseNotificationService:
        """
        Get notification service for channel type.
        """
        service_class = cls._services.get(channel_type)
        if not service_class:
            raise ValueError(f"Unknown channel type: {channel_type}")

        return service_class()

    @classmethod
    def get_available_channels(cls) -> List[str]:
        """
        Get list of available channel types.
        """
        return list(cls._services.keys())


# Utility functions
def send_notification_via_channel(
    channel_type: str, recipient: str, subject: str, message: str, **kwargs
) -> Dict[str, Any]:
    """
    Convenience function to send notification via specific channel.
    """
    try:
        service = NotificationServiceFactory.get_service(channel_type)
        return service.send(recipient, subject, message, **kwargs)
    except Exception as e:
        logger.error(f"Error sending notification via {channel_type}: {str(e)}")
        return {
            "success": False,
            "error": f"Service error: {str(e)}",
            "provider_id": None,
        }


def validate_notification_recipient(channel_type: str, recipient: str) -> bool:
    """
    Validate recipient format for specific channel.
    """
    try:
        service = NotificationServiceFactory.get_service(channel_type)
        return service.validate_recipient(recipient)
    except Exception:
        return False
