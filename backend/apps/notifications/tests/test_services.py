"""
Tests for notification services.
"""

from unittest.mock import Mock, patch

from django.test import TestCase, override_settings

from ..services import (
    EmailService,
    InAppNotificationService,
    NotificationServiceFactory,
    PushNotificationService,
    SMSService,
    WhatsAppService,
)


class EmailServiceTest(TestCase):
    """Test EmailService."""

    def setUp(self):
        """Set up test data."""
        self.service = EmailService()

    def test_validate_recipient_valid_email(self):
        """Test validating valid email addresses."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
        ]

        for email in valid_emails:
            with self.subTest(email=email):
                self.assertTrue(self.service.validate_recipient(email))

    def test_validate_recipient_invalid_email(self):
        """Test validating invalid email addresses."""
        invalid_emails = [
            "invalid-email",
            "@example.com",
            "test@",
            "test..test@example.com",
        ]

        for email in invalid_emails:
            with self.subTest(email=email):
                self.assertFalse(self.service.validate_recipient(email))

    @override_settings(RESEND_API_KEY="")
    @patch("apps.notifications.services.EmailMessage")
    def test_send_with_django_backend(self, mock_email):
        """Test sending email with Django backend when Resend not configured."""
        mock_email_instance = Mock()
        mock_email.return_value = mock_email_instance

        result = self.service.send("test@example.com", "Test Subject", "Test message")

        self.assertTrue(result["success"])
        self.assertTrue(result["provider_id"].startswith("django_"))
        mock_email_instance.send.assert_called_once()

    @override_settings(RESEND_API_KEY="test_key")
    @patch("apps.notifications.services.requests.post")
    def test_send_with_resend_success(self, mock_post):
        """Test successful email sending with Resend."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "resend_123"}
        mock_post.return_value = mock_response

        result = self.service.send("test@example.com", "Test Subject", "Test message")

        self.assertTrue(result["success"])
        self.assertEqual(result["provider_id"], "resend_123")
        mock_post.assert_called_once()

    @override_settings(RESEND_API_KEY="test_key")
    @patch("apps.notifications.services.requests.post")
    def test_send_with_resend_failure(self, mock_post):
        """Test failed email sending with Resend."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"message": "Invalid email"}
        mock_response.headers = {"content-type": "application/json"}
        mock_post.return_value = mock_response

        result = self.service.send("invalid@email", "Test Subject", "Test message")

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Invalid email")


class SMSServiceTest(TestCase):
    """Test SMSService."""

    def setUp(self):
        """Set up test data."""
        self.service = SMSService()

    def test_validate_recipient_valid_phone(self):
        """Test validating valid phone numbers."""
        valid_phones = ["+1234567890", "+521234567890", "+44123456789"]

        for phone in valid_phones:
            with self.subTest(phone=phone):
                self.assertTrue(self.service.validate_recipient(phone))

    def test_validate_recipient_invalid_phone(self):
        """Test validating invalid phone numbers."""
        invalid_phones = [
            "1234567890",  # Missing +
            "+0123456789",  # Starts with 0
            "invalid",
            "+1",  # Too short
        ]

        for phone in invalid_phones:
            with self.subTest(phone=phone):
                self.assertFalse(self.service.validate_recipient(phone))

    @override_settings(
        TWILIO_ACCOUNT_SID="", TWILIO_AUTH_TOKEN="", TWILIO_PHONE_NUMBER=""
    )
    def test_send_without_credentials(self):
        """Test sending SMS without Twilio credentials."""
        result = self.service.send("+1234567890", "Test Subject", "Test message")

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Twilio not configured")


class WhatsAppServiceTest(TestCase):
    """Test WhatsAppService."""

    def setUp(self):
        """Set up test data."""
        self.service = WhatsAppService()

    def test_validate_recipient(self):
        """Test recipient validation (same as SMS)."""
        self.assertTrue(self.service.validate_recipient("+1234567890"))
        self.assertFalse(self.service.validate_recipient("invalid"))


class PushNotificationServiceTest(TestCase):
    """Test PushNotificationService."""

    def setUp(self):
        """Set up test data."""
        self.service = PushNotificationService()

    def test_validate_recipient_valid_token(self):
        """Test validating valid FCM tokens."""
        valid_token = "a" * 152 + ":" + "b" * 20  # Simulated FCM token
        self.assertTrue(self.service.validate_recipient(valid_token))

    def test_validate_recipient_invalid_token(self):
        """Test validating invalid FCM tokens."""
        invalid_tokens = ["short_token", "no_colon_token_" + "a" * 100, ""]

        for token in invalid_tokens:
            with self.subTest(token=token):
                self.assertFalse(self.service.validate_recipient(token))


class InAppNotificationServiceTest(TestCase):
    """Test InAppNotificationService."""

    def setUp(self):
        """Set up test data."""
        self.service = InAppNotificationService()

    def test_validate_recipient_valid_id(self):
        """Test validating valid user IDs."""
        valid_ids = ["123", "456789", "1"]

        for user_id in valid_ids:
            with self.subTest(user_id=user_id):
                self.assertTrue(self.service.validate_recipient(user_id))

    def test_validate_recipient_invalid_id(self):
        """Test validating invalid user IDs."""
        invalid_ids = ["abc", "user123", ""]

        for user_id in invalid_ids:
            with self.subTest(user_id=user_id):
                self.assertFalse(self.service.validate_recipient(user_id))

    def test_send(self):
        """Test sending in-app notification."""
        result = self.service.send("123", "Test Subject", "Test message")

        self.assertTrue(result["success"])
        self.assertTrue(result["provider_id"].startswith("in_app_"))


class NotificationServiceFactoryTest(TestCase):
    """Test NotificationServiceFactory."""

    def test_get_service_email(self):
        """Test getting email service."""
        service = NotificationServiceFactory.get_service("email")
        self.assertIsInstance(service, EmailService)

    def test_get_service_sms(self):
        """Test getting SMS service."""
        service = NotificationServiceFactory.get_service("sms")
        self.assertIsInstance(service, SMSService)

    def test_get_service_whatsapp(self):
        """Test getting WhatsApp service."""
        service = NotificationServiceFactory.get_service("whatsapp")
        self.assertIsInstance(service, WhatsAppService)

    def test_get_service_push_web(self):
        """Test getting push web service."""
        service = NotificationServiceFactory.get_service("push_web")
        self.assertIsInstance(service, PushNotificationService)

    def test_get_service_push_mobile(self):
        """Test getting push mobile service."""
        service = NotificationServiceFactory.get_service("push_mobile")
        self.assertIsInstance(service, PushNotificationService)

    def test_get_service_in_app(self):
        """Test getting in-app service."""
        service = NotificationServiceFactory.get_service("in_app")
        self.assertIsInstance(service, InAppNotificationService)

    def test_get_service_unknown(self):
        """Test getting unknown service type."""
        with self.assertRaises(ValueError):
            NotificationServiceFactory.get_service("unknown")

    def test_get_available_channels(self):
        """Test getting available channels."""
        channels = NotificationServiceFactory.get_available_channels()
        expected_channels = [
            "email",
            "sms",
            "whatsapp",
            "push_web",
            "push_mobile",
            "in_app",
        ]

        self.assertEqual(set(channels), set(expected_channels))
