# 🎭 Mock Services Setup

## 📋 Resumen

Esta guía detalla cómo configurar y utilizar mocks para servicios externos en los tests E2E, incluyendo Stripe, servicios de email, SMS, almacenamiento de archivos y APIs externas.

## 🎯 Principios de Mocking

### 1. **Realismo**
- Los mocks deben comportarse como el servicio real
- Incluir respuestas de éxito y error
- Simular latencia cuando sea relevante
- Mantener la misma interfaz que el servicio real

### 2. **Determinismo**
- Las respuestas deben ser predecibles
- Evitar aleatoriedad no controlada
- Permitir configuración de escenarios específicos

### 3. **Aislamiento**
- No depender de servicios externos en tests
- Cada test debe controlar su propio mock
- No compartir estado entre tests

## 💳 Stripe Mock Service

### 1. Mock Service Completo
```python
# backend/tests/mocks/stripe_service.py
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from decimal import Decimal

class StripeMockService:
    """Complete Stripe API mock for testing"""
    
    def __init__(self):
        self.reset()
        
    def reset(self):
        """Reset all mock data"""
        self.customers = {}
        self.payment_intents = {}
        self.payment_methods = {}
        self.subscriptions = {}
        self.invoices = {}
        self.webhook_events = []
        self.charges = {}
        self.refunds = {}
        
    # Customer Management
    def create_customer(self, **kwargs) -> Dict[str, Any]:
        """Mock Stripe Customer creation"""
        customer_id = f"cus_test_{uuid.uuid4().hex[:14]}"
        customer = {
            'id': customer_id,
            'object': 'customer',
            'created': int(datetime.now(timezone.utc).timestamp()),
            'email': kwargs.get('email'),
            'name': kwargs.get('name'),
            'phone': kwargs.get('phone'),
            'metadata': kwargs.get('metadata', {}),
            'default_source': None,
            'invoice_settings': {
                'default_payment_method': None
            }
        }
        self.customers[customer_id] = customer
        return customer
    
    # Payment Intents
    def create_payment_intent(self, **kwargs) -> Dict[str, Any]:
        """Mock Payment Intent creation"""
        pi_id = f"pi_test_{uuid.uuid4().hex[:24]}"
        payment_intent = {
            'id': pi_id,
            'object': 'payment_intent',
            'amount': kwargs['amount'],
            'currency': kwargs.get('currency', 'eur'),
            'status': 'requires_payment_method',
            'client_secret': f"{pi_id}_secret_{uuid.uuid4().hex[:16]}",
            'created': int(datetime.now(timezone.utc).timestamp()),
            'customer': kwargs.get('customer'),
            'metadata': kwargs.get('metadata', {}),
            'payment_method': None,
            'last_payment_error': None,
            'charges': {
                'data': []
            }
        }
        self.payment_intents[pi_id] = payment_intent
        return payment_intent
    
    def confirm_payment_intent(self, pi_id: str, **kwargs) -> Dict[str, Any]:
        """Mock Payment Intent confirmation"""
        if pi_id not in self.payment_intents:
            raise ValueError(f"Payment Intent {pi_id} not found")
            
        pi = self.payment_intents[pi_id]
        
        # Simulate payment processing
        pi['status'] = 'processing'
        
        # Create charge
        charge_id = f"ch_test_{uuid.uuid4().hex[:24]}"
        charge = {
            'id': charge_id,
            'object': 'charge',
            'amount': pi['amount'],
            'currency': pi['currency'],
            'paid': True,
            'payment_intent': pi_id,
            'status': 'succeeded'
        }
        self.charges[charge_id] = charge
        pi['charges']['data'].append(charge)
        
        # Update payment intent
        pi['status'] = 'succeeded'
        pi['payment_method'] = kwargs.get('payment_method', 'pm_test_visa')
        
        # Create webhook event
        self._create_webhook_event('payment_intent.succeeded', pi)
        
        return pi
    
    def cancel_payment_intent(self, pi_id: str) -> Dict[str, Any]:
        """Mock Payment Intent cancellation"""
        if pi_id not in self.payment_intents:
            raise ValueError(f"Payment Intent {pi_id} not found")
            
        pi = self.payment_intents[pi_id]
        pi['status'] = 'canceled'
        pi['canceled_at'] = int(datetime.now(timezone.utc).timestamp())
        
        self._create_webhook_event('payment_intent.canceled', pi)
        return pi
    
    # Subscriptions
    def create_subscription(self, **kwargs) -> Dict[str, Any]:
        """Mock Subscription creation"""
        sub_id = f"sub_test_{uuid.uuid4().hex[:24]}"
        subscription = {
            'id': sub_id,
            'object': 'subscription',
            'customer': kwargs['customer'],
            'items': kwargs['items'],
            'status': 'active',
            'current_period_start': int(datetime.now(timezone.utc).timestamp()),
            'current_period_end': int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
            'created': int(datetime.now(timezone.utc).timestamp()),
            'metadata': kwargs.get('metadata', {})
        }
        self.subscriptions[sub_id] = subscription
        
        # Create initial invoice
        self._create_subscription_invoice(subscription)
        
        return subscription
    
    # Refunds
    def create_refund(self, **kwargs) -> Dict[str, Any]:
        """Mock Refund creation"""
        refund_id = f"re_test_{uuid.uuid4().hex[:24]}"
        refund = {
            'id': refund_id,
            'object': 'refund',
            'amount': kwargs.get('amount'),
            'charge': kwargs.get('charge'),
            'payment_intent': kwargs.get('payment_intent'),
            'reason': kwargs.get('reason'),
            'status': 'succeeded',
            'created': int(datetime.now(timezone.utc).timestamp())
        }
        self.refunds[refund_id] = refund
        
        # Update payment intent if provided
        if kwargs.get('payment_intent'):
            pi = self.payment_intents.get(kwargs['payment_intent'])
            if pi:
                pi['amount_refunded'] = kwargs.get('amount', 0)
        
        self._create_webhook_event('charge.refunded', refund)
        return refund
    
    # Webhook Events
    def _create_webhook_event(self, event_type: str, data: Dict[str, Any]):
        """Create a webhook event"""
        event = {
            'id': f"evt_test_{uuid.uuid4().hex[:24]}",
            'object': 'event',
            'type': event_type,
            'created': int(datetime.now(timezone.utc).timestamp()),
            'data': {
                'object': data
            }
        }
        self.webhook_events.append(event)
        return event
    
    def get_webhook_events(self) -> List[Dict[str, Any]]:
        """Get all webhook events"""
        return self.webhook_events
    
    # Test Helpers
    def simulate_payment_failure(self, pi_id: str, error_code: str = 'card_declined'):
        """Simulate a payment failure"""
        if pi_id not in self.payment_intents:
            raise ValueError(f"Payment Intent {pi_id} not found")
            
        pi = self.payment_intents[pi_id]
        pi['status'] = 'requires_payment_method'
        pi['last_payment_error'] = {
            'code': error_code,
            'message': f"Your card was declined. ({error_code})",
            'type': 'card_error'
        }
        
        self._create_webhook_event('payment_intent.payment_failed', pi)
        return pi

# backend/tests/mocks/stripe_fixtures.py
class StripeTestData:
    """Common Stripe test data"""
    
    VALID_CARDS = {
        'visa': {
            'number': '4242424242424242',
            'exp_month': 12,
            'exp_year': 2025,
            'cvc': '123'
        },
        'mastercard': {
            'number': '5555555555554444',
            'exp_month': 12,
            'exp_year': 2025,
            'cvc': '123'
        },
        '3d_secure': {
            'number': '4000002500003155',
            'exp_month': 12,
            'exp_year': 2025,
            'cvc': '123'
        }
    }
    
    ERROR_CARDS = {
        'declined': '4000000000000002',
        'insufficient_funds': '4000000000009995',
        'expired': '4000000000000069',
        'processing_error': '4000000000000119'
    }
```

### 2. Integration con Django
```python
# backend/tests/mocks/stripe_integration.py
from unittest.mock import patch, MagicMock
from contextlib import contextmanager

class StripeTestMixin:
    """Mixin for tests that need Stripe mocking"""
    
    def setUp(self):
        super().setUp()
        self.stripe_mock = StripeMockService()
        self._setup_stripe_patches()
    
    def _setup_stripe_patches(self):
        """Setup all Stripe patches"""
        # Patch stripe module
        self.stripe_patcher = patch('stripe')
        mock_stripe = self.stripe_patcher.start()
        
        # Configure stripe methods
        mock_stripe.Customer.create = self.stripe_mock.create_customer
        mock_stripe.PaymentIntent.create = self.stripe_mock.create_payment_intent
        mock_stripe.PaymentIntent.confirm = self.stripe_mock.confirm_payment_intent
        mock_stripe.PaymentIntent.cancel = self.stripe_mock.cancel_payment_intent
        mock_stripe.Subscription.create = self.stripe_mock.create_subscription
        mock_stripe.Refund.create = self.stripe_mock.create_refund
    
    def tearDown(self):
        self.stripe_patcher.stop()
        super().tearDown()
    
    @contextmanager
    def mock_stripe_webhook(self, event_type: str, **event_data):
        """Context manager for webhook testing"""
        event = self.stripe_mock._create_webhook_event(event_type, event_data)
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = event
            yield event
```

## 📧 Email Service Mock

### 1. Email Mock Service
```python
# backend/tests/mocks/email_service.py
from typing import List, Dict, Any, Optional
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

class EmailMockService:
    """Mock email service for testing"""
    
    def __init__(self):
        self.sent_emails = []
        self.templates = {}
        self.failures = []
        
    def reset(self):
        """Reset all email data"""
        self.sent_emails.clear()
        self.failures.clear()
    
    def send_email(
        self, 
        to: List[str], 
        subject: str, 
        template: str, 
        context: Dict[str, Any],
        from_email: str = 'noreply@padelyzer.com'
    ) -> bool:
        """Mock email sending"""
        # Check if should fail
        if self._should_fail(to[0]):
            self.failures.append({
                'to': to,
                'subject': subject,
                'reason': 'Simulated failure'
            })
            return False
        
        # Render template
        html_content = self._render_template(template, context)
        
        # Store email
        email_data = {
            'id': f"email_{len(self.sent_emails)}",
            'to': to,
            'from': from_email,
            'subject': subject,
            'template': template,
            'context': context,
            'html': html_content,
            'sent_at': datetime.now(timezone.utc)
        }
        
        self.sent_emails.append(email_data)
        return True
    
    def _render_template(self, template: str, context: Dict[str, Any]) -> str:
        """Render email template"""
        # Simple template rendering for tests
        if template == 'reservation_confirmation':
            return f"""
            <h1>Reservation Confirmation</h1>
            <p>Dear {context.get('user_name')},</p>
            <p>Your reservation is confirmed for {context.get('date')} at {context.get('time')}</p>
            <p>Court: {context.get('court_name')}</p>
            <p>Club: {context.get('club_name')}</p>
            """
        return f"<p>Template: {template}</p>"
    
    def _should_fail(self, email: str) -> bool:
        """Determine if email should fail"""
        return email.endswith('@fail.com')
    
    # Assertion helpers
    def assert_email_sent(
        self, 
        to: Optional[str] = None,
        subject: Optional[str] = None,
        template: Optional[str] = None
    ) -> bool:
        """Assert email was sent with criteria"""
        for email in self.sent_emails:
            if (not to or to in email['to']) and \
               (not subject or subject == email['subject']) and \
               (not template or template == email['template']):
                return True
        return False
    
    def get_sent_email(self, to: str) -> Optional[Dict[str, Any]]:
        """Get sent email by recipient"""
        for email in self.sent_emails:
            if to in email['to']:
                return email
        return None
    
    def assert_email_contains(self, to: str, text: str) -> bool:
        """Assert email contains specific text"""
        email = self.get_sent_email(to)
        if email:
            return text in email['html'] or text in email['subject']
        return False

# backend/tests/mocks/email_test_utils.py
class EmailTestCase(TestCase):
    """Base test case with email mocking"""
    
    def setUp(self):
        super().setUp()
        self.email_mock = EmailMockService()
        
        # Patch Django email backend
        self.email_patcher = patch('django.core.mail.send_mail')
        mock_send = self.email_patcher.start()
        mock_send.side_effect = self._mock_send_mail
        
        # Patch custom email service
        self.service_patcher = patch('apps.notifications.services.email_service.send')
        mock_service = self.service_patcher.start()
        mock_service.side_effect = self.email_mock.send_email
    
    def tearDown(self):
        self.email_patcher.stop()
        self.service_patcher.stop()
        super().tearDown()
    
    def _mock_send_mail(self, subject, message, from_email, recipient_list, **kwargs):
        """Mock Django's send_mail"""
        return self.email_mock.send_email(
            to=recipient_list,
            subject=subject,
            template='generic',
            context={'message': message},
            from_email=from_email
        )
```

## 📱 SMS Service Mock

### 1. SMS Mock Service
```python
# backend/tests/mocks/sms_service.py
from twilio.rest import Client
from typing import Optional

class SMSMockService:
    """Mock SMS service (Twilio)"""
    
    def __init__(self):
        self.sent_messages = []
        self.failed_numbers = []
        
    def send_sms(
        self, 
        to: str, 
        body: str, 
        from_: str = '+34600000000'
    ) -> Dict[str, Any]:
        """Mock SMS sending"""
        # Validate phone number
        if not self._is_valid_phone(to):
            raise ValueError(f"Invalid phone number: {to}")
        
        # Check if should fail
        if to in self.failed_numbers:
            raise Exception(f"Failed to send SMS to {to}")
        
        # Create message
        message = {
            'sid': f"SM{uuid.uuid4().hex}",
            'to': to,
            'from': from_,
            'body': body,
            'status': 'sent',
            'created': datetime.now(timezone.utc),
            'price': '0.05',
            'price_unit': 'EUR'
        }
        
        self.sent_messages.append(message)
        return message
    
    def _is_valid_phone(self, phone: str) -> bool:
        """Validate phone number format"""
        # Simple validation for tests
        return phone.startswith('+') and len(phone) >= 10
    
    def add_failed_number(self, number: str):
        """Add number that should fail"""
        self.failed_numbers.append(number)
    
    def assert_sms_sent(self, to: str, containing: Optional[str] = None) -> bool:
        """Assert SMS was sent"""
        for msg in self.sent_messages:
            if msg['to'] == to:
                if not containing or containing in msg['body']:
                    return True
        return False
    
    def get_verification_code(self, phone: str) -> Optional[str]:
        """Extract verification code from SMS"""
        for msg in self.sent_messages:
            if msg['to'] == phone:
                # Extract code from message
                import re
                match = re.search(r'\b(\d{6})\b', msg['body'])
                if match:
                    return match.group(1)
        return None
```

## 💾 File Storage Mock

### 1. Storage Mock Service
```python
# backend/tests/mocks/storage_service.py
from django.core.files.storage import Storage
from django.core.files.base import ContentFile
import io
from PIL import Image

class MockStorageService(Storage):
    """Mock file storage for testing"""
    
    def __init__(self):
        self.files = {}
        self.urls = {}
        
    def _save(self, name: str, content: ContentFile) -> str:
        """Save file to mock storage"""
        self.files[name] = content.read()
        self.urls[name] = f"https://mock-storage.padelyzer.com/{name}"
        return name
    
    def exists(self, name: str) -> bool:
        """Check if file exists"""
        return name in self.files
    
    def url(self, name: str) -> str:
        """Get file URL"""
        return self.urls.get(name, '')
    
    def delete(self, name: str):
        """Delete file"""
        self.files.pop(name, None)
        self.urls.pop(name, None)
    
    def size(self, name: str) -> int:
        """Get file size"""
        if name in self.files:
            return len(self.files[name])
        return 0
    
    def open(self, name: str, mode='rb'):
        """Open file"""
        if name in self.files:
            return io.BytesIO(self.files[name])
        raise FileNotFoundError(f"File {name} not found")
    
    # Test helpers
    def create_test_image(self, name: str, size=(100, 100), format='JPEG'):
        """Create a test image"""
        img = Image.new('RGB', size, color='red')
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        buffer.seek(0)
        
        self._save(name, ContentFile(buffer.read()))
        return name
    
    def assert_file_exists(self, name: str) -> bool:
        """Assert file exists in storage"""
        return self.exists(name)
    
    def get_file_content(self, name: str) -> bytes:
        """Get file content for assertions"""
        return self.files.get(name, b'')
```

## 🌐 External API Mock

### 1. Generic API Mock
```python
# backend/tests/mocks/external_api.py
import responses
from typing import Dict, Any, Optional

class ExternalAPIMock:
    """Mock external API calls"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.responses_mock = responses.RequestsMock()
        
    def add_response(
        self, 
        method: str, 
        endpoint: str, 
        json: Optional[Dict[str, Any]] = None,
        status: int = 200,
        headers: Optional[Dict[str, str]] = None
    ):
        """Add mocked response"""
        url = f"{self.base_url}{endpoint}"
        self.responses_mock.add(
            method=method,
            url=url,
            json=json,
            status=status,
            headers=headers
        )
    
    def add_callback_response(
        self, 
        method: str, 
        endpoint: str, 
        callback
    ):
        """Add dynamic response with callback"""
        url = f"{self.base_url}{endpoint}"
        self.responses_mock.add_callback(
            method=method,
            url=url,
            callback=callback
        )
    
    def start(self):
        """Start mocking"""
        self.responses_mock.start()
        
    def stop(self):
        """Stop mocking"""
        self.responses_mock.stop()
        
    def reset(self):
        """Reset all responses"""
        self.responses_mock.reset()

# Example: Weather API Mock
class WeatherAPIMock(ExternalAPIMock):
    """Mock weather API for court conditions"""
    
    def __init__(self):
        super().__init__('https://api.weather.com')
        
    def setup_sunny_weather(self, location: str):
        """Setup sunny weather response"""
        self.add_response(
            'GET',
            f'/v1/current?location={location}',
            json={
                'temperature': 25,
                'condition': 'sunny',
                'humidity': 60,
                'wind_speed': 5,
                'suitable_for_outdoor': True
            }
        )
    
    def setup_rainy_weather(self, location: str):
        """Setup rainy weather response"""
        self.add_response(
            'GET',
            f'/v1/current?location={location}',
            json={
                'temperature': 15,
                'condition': 'rainy',
                'humidity': 90,
                'wind_speed': 20,
                'suitable_for_outdoor': False
            }
        )
```

## 🔧 Mock Configuration

### 1. Central Mock Registry
```python
# backend/tests/mocks/registry.py
class MockServiceRegistry:
    """Central registry for all mock services"""
    
    def __init__(self):
        self.stripe = StripeMockService()
        self.email = EmailMockService()
        self.sms = SMSMockService()
        self.storage = MockStorageService()
        self.weather = WeatherAPIMock()
        
    def reset_all(self):
        """Reset all mock services"""
        self.stripe.reset()
        self.email.reset()
        self.sms.sent_messages.clear()
        self.storage.files.clear()
        self.weather.reset()
    
    def setup_happy_path(self):
        """Setup all mocks for happy path testing"""
        # Stripe - successful payments
        self.stripe.reset()
        
        # Email - all emails succeed
        self.email.reset()
        
        # SMS - all messages sent
        self.sms.sent_messages.clear()
        
        # Weather - always sunny
        self.weather.setup_sunny_weather('default')
    
    def setup_failure_scenarios(self):
        """Setup mocks for failure testing"""
        # Add failed card numbers
        self.stripe.simulate_payment_failure('pi_test_fail', 'card_declined')
        
        # Add failed email addresses
        self.email.failures.append('fail@example.com')
        
        # Add failed phone numbers
        self.sms.add_failed_number('+34600000001')
```

### 2. Test Base with All Mocks
```python
# backend/tests/test_e2e_base.py
class E2ETestWithMocks(TestCase):
    """Base E2E test with all services mocked"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.mocks = MockServiceRegistry()
        
    def setUp(self):
        super().setUp()
        self.mocks.reset_all()
        self.mocks.setup_happy_path()
        
        # Apply patches
        self._apply_patches()
        
    def tearDown(self):
        self._remove_patches()
        super().tearDown()
        
    def _apply_patches(self):
        """Apply all service patches"""
        # Stripe
        self.stripe_patcher = patch('stripe')
        mock_stripe = self.stripe_patcher.start()
        self._configure_stripe_mock(mock_stripe)
        
        # Email
        self.email_patcher = patch('apps.notifications.email.send')
        self.email_patcher.start().side_effect = self.mocks.email.send_email
        
        # SMS
        self.sms_patcher = patch('apps.notifications.sms.send')
        self.sms_patcher.start().side_effect = self.mocks.sms.send_sms
        
        # Storage
        self.storage_patcher = patch('django.core.files.storage.default_storage')
        self.storage_patcher.start().return_value = self.mocks.storage
        
    def _remove_patches(self):
        """Remove all patches"""
        self.stripe_patcher.stop()
        self.email_patcher.stop()
        self.sms_patcher.stop()
        self.storage_patcher.stop()
```

## 📊 Mock Verification

### Assert Helpers
```python
# backend/tests/mocks/assertions.py
class MockAssertions:
    """Assertions for mock services"""
    
    @staticmethod
    def assert_payment_completed(mocks: MockServiceRegistry, amount: int):
        """Assert payment was processed correctly"""
        # Check payment intent created
        assert len(mocks.stripe.payment_intents) > 0
        
        # Check amount
        pi = list(mocks.stripe.payment_intents.values())[-1]
        assert pi['amount'] == amount
        assert pi['status'] == 'succeeded'
        
        # Check webhook sent
        webhooks = mocks.stripe.get_webhook_events()
        assert any(e['type'] == 'payment_intent.succeeded' for e in webhooks)
        
    @staticmethod
    def assert_notification_sent(mocks: MockServiceRegistry, user_email: str):
        """Assert user was notified"""
        # Check email
        assert mocks.email.assert_email_sent(to=user_email)
        
        # Check SMS if phone provided
        # assert mocks.sms.assert_sms_sent(to=user.phone) if user.phone
        
    @staticmethod
    def assert_file_uploaded(mocks: MockServiceRegistry, filename: str):
        """Assert file was uploaded"""
        assert mocks.storage.assert_file_exists(filename)
        assert mocks.storage.size(filename) > 0
```

---

**Siguiente**: [Authentication Tests](07-Authentication-Tests.md) →