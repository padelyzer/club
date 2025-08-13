# 📬 Notifications Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de notificaciones, cubriendo emails, SMS, notificaciones push y gestión de preferencias de usuario.

## 🎯 Objetivos de Testing

### Cobertura Target: 85%
- **Unit Tests**: 55% - Lógica de templates y validaciones
- **Integration Tests**: 25% - Servicios de terceros y APIs
- **E2E Tests**: 15% - Flujos completos de notificación

### Componentes a Cubrir
- ✅ Email Service (SendGrid/SMTP)
- ✅ SMS Service (Twilio)
- ✅ Push Notifications (FCM/APNS)
- ✅ In-App Notifications
- ✅ Notification Templates
- ✅ User Preferences
- ✅ Notification History
- ✅ Unsubscribe Management

## 🧪 Unit Tests

### 1. Notification Model Tests
```python
# backend/tests/unit/notifications/test_models.py
from django.test import TestCase
from django.utils import timezone
from apps.notifications.models import (
    Notification, NotificationTemplate, UserNotificationPreference,
    NotificationHistory, EmailTemplate
)
from tests.factories import UserFactory

class NotificationModelTest(TestCase):
    """Test Notification model functionality"""
    
    def setUp(self):
        self.user = UserFactory()
    
    def test_create_notification(self):
        """Test notification creation"""
        notification = Notification.objects.create(
            user=self.user,
            type='RESERVATION_CONFIRMATION',
            title='Reservation Confirmed',
            message='Your reservation for Court 1 is confirmed',
            data={
                'reservation_id': 123,
                'court_name': 'Court 1',
                'date': '2023-12-01',
                'time': '10:00'
            }
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertFalse(notification.is_read)
        self.assertEqual(notification.type, 'RESERVATION_CONFIRMATION')
        self.assertIsNotNone(notification.created_at)
    
    def test_mark_as_read(self):
        """Test marking notification as read"""
        notification = Notification.objects.create(
            user=self.user,
            type='GENERAL',
            title='Test',
            message='Test message'
        )
        
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)
        
        notification.mark_as_read()
        
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)
    
    def test_notification_expiry(self):
        """Test notification expiry functionality"""
        # Create expired notification
        expired_notification = Notification.objects.create(
            user=self.user,
            type='GENERAL',
            title='Expired',
            message='This should expire',
            expires_at=timezone.now() - timedelta(days=1)
        )
        
        # Create valid notification
        valid_notification = Notification.objects.create(
            user=self.user,
            type='GENERAL',
            title='Valid',
            message='This is still valid',
            expires_at=timezone.now() + timedelta(days=1)
        )
        
        # Query non-expired notifications
        active_notifications = Notification.objects.active()
        
        self.assertIn(valid_notification, active_notifications)
        self.assertNotIn(expired_notification, active_notifications)

class NotificationTemplateTest(TestCase):
    """Test notification template functionality"""
    
    def test_create_email_template(self):
        """Test email template creation"""
        template = EmailTemplate.objects.create(
            code='RESERVATION_CONFIRMATION',
            name='Reservation Confirmation',
            subject='Your reservation is confirmed - {{court_name}}',
            body_html='''
                <h1>Reservation Confirmed!</h1>
                <p>Hi {{user_name}},</p>
                <p>Your reservation for {{court_name}} on {{date}} at {{time}} is confirmed.</p>
                <p>Reservation code: {{reservation_code}}</p>
            ''',
            body_text='''
                Reservation Confirmed!
                Hi {{user_name}},
                Your reservation for {{court_name}} on {{date}} at {{time}} is confirmed.
                Reservation code: {{reservation_code}}
            ''',
            variables=['user_name', 'court_name', 'date', 'time', 'reservation_code']
        )
        
        self.assertEqual(template.code, 'RESERVATION_CONFIRMATION')
        self.assertIn('{{court_name}}', template.subject)
        self.assertEqual(len(template.variables), 5)
    
    def test_render_template(self):
        """Test template rendering with context"""
        template = EmailTemplate.objects.create(
            code='TEST',
            subject='Hello {{name}}',
            body_html='<p>Welcome {{name}}!</p>',
            body_text='Welcome {{name}}!'
        )
        
        context = {'name': 'John Doe'}
        
        rendered_subject = template.render_subject(context)
        rendered_html = template.render_html(context)
        rendered_text = template.render_text(context)
        
        self.assertEqual(rendered_subject, 'Hello John Doe')
        self.assertIn('Welcome John Doe!', rendered_html)
        self.assertEqual(rendered_text, 'Welcome John Doe!')
    
    def test_template_validation(self):
        """Test template variable validation"""
        template = EmailTemplate(
            code='INVALID',
            subject='Hello {{name}}',
            body_html='<p>Your email is {{email}}</p>',
            variables=['name']  # Missing 'email'
        )
        
        with self.assertRaises(ValidationError):
            template.full_clean()

class UserNotificationPreferenceTest(TestCase):
    """Test user notification preferences"""
    
    def setUp(self):
        self.user = UserFactory()
    
    def test_default_preferences(self):
        """Test default notification preferences"""
        prefs = UserNotificationPreference.objects.create(user=self.user)
        
        # Check defaults
        self.assertTrue(prefs.email_enabled)
        self.assertTrue(prefs.sms_enabled)
        self.assertTrue(prefs.push_enabled)
        self.assertTrue(prefs.email_reservations)
        self.assertTrue(prefs.email_payments)
        self.assertFalse(prefs.email_marketing)
    
    def test_preference_categories(self):
        """Test notification category preferences"""
        prefs = UserNotificationPreference.objects.create(
            user=self.user,
            email_reservations=True,
            email_tournaments=False,
            email_classes=True,
            sms_reservations=True,
            sms_reminders=False
        )
        
        # Test category checks
        self.assertTrue(prefs.should_send_email('RESERVATION_CONFIRMATION'))
        self.assertFalse(prefs.should_send_email('TOURNAMENT_REMINDER'))
        self.assertTrue(prefs.should_send_sms('RESERVATION_REMINDER'))
    
    def test_unsubscribe_token(self):
        """Test unsubscribe token generation"""
        prefs = UserNotificationPreference.objects.create(user=self.user)
        
        token = prefs.generate_unsubscribe_token()
        self.assertIsNotNone(token)
        self.assertEqual(len(token), 64)  # SHA256 hex digest
        
        # Verify token is consistent
        token2 = prefs.generate_unsubscribe_token()
        self.assertEqual(token, token2)
```

### 2. Notification Service Tests
```python
# backend/tests/unit/notifications/test_services.py
from django.test import TestCase
from unittest.mock import patch, Mock, MagicMock
from apps.notifications.services import (
    NotificationService, EmailService, SMSService, PushService
)
from apps.notifications.exceptions import NotificationError

class NotificationServiceTest(TestCase):
    """Test main notification service"""
    
    def setUp(self):
        self.service = NotificationService()
        self.user = UserFactory()
    
    @patch('apps.notifications.services.EmailService.send')
    @patch('apps.notifications.services.SMSService.send')
    @patch('apps.notifications.services.PushService.send')
    def test_send_notification_all_channels(self, mock_push, mock_sms, mock_email):
        """Test sending notification through all channels"""
        mock_email.return_value = True
        mock_sms.return_value = True
        mock_push.return_value = True
        
        result = self.service.send_notification(
            user=self.user,
            notification_type='RESERVATION_CONFIRMATION',
            context={
                'court_name': 'Court 1',
                'date': '2023-12-01',
                'time': '10:00'
            },
            channels=['email', 'sms', 'push', 'in_app']
        )
        
        # Verify all services called
        mock_email.assert_called_once()
        mock_sms.assert_called_once()
        mock_push.assert_called_once()
        
        # Verify in-app notification created
        notification = Notification.objects.filter(user=self.user).first()
        self.assertIsNotNone(notification)
        
        # Check result
        self.assertTrue(result['email'])
        self.assertTrue(result['sms'])
        self.assertTrue(result['push'])
        self.assertTrue(result['in_app'])
    
    def test_respect_user_preferences(self):
        """Test notification respects user preferences"""
        # Disable email notifications
        UserNotificationPreference.objects.create(
            user=self.user,
            email_enabled=False,
            sms_enabled=True
        )
        
        with patch('apps.notifications.services.EmailService.send') as mock_email:
            with patch('apps.notifications.services.SMSService.send') as mock_sms:
                self.service.send_notification(
                    user=self.user,
                    notification_type='GENERAL',
                    context={},
                    channels=['email', 'sms']
                )
                
                # Email should not be called
                mock_email.assert_not_called()
                # SMS should be called
                mock_sms.assert_called_once()
    
    def test_notification_history_logging(self):
        """Test notification history is logged"""
        with patch('apps.notifications.services.EmailService.send') as mock_email:
            mock_email.return_value = True
            
            self.service.send_notification(
                user=self.user,
                notification_type='PAYMENT_RECEIVED',
                context={'amount': 50.00},
                channels=['email']
            )
        
        # Check history created
        history = NotificationHistory.objects.filter(
            user=self.user,
            notification_type='PAYMENT_RECEIVED'
        ).first()
        
        self.assertIsNotNone(history)
        self.assertEqual(history.channel, 'email')
        self.assertEqual(history.status, 'sent')
        self.assertEqual(history.context['amount'], 50.00)

class EmailServiceTest(TestCase):
    """Test email service"""
    
    def setUp(self):
        self.service = EmailService()
        self.user = UserFactory(email='test@example.com')
    
    @patch('sendgrid.SendGridAPIClient')
    def test_send_email_success(self, mock_sendgrid):
        """Test successful email sending"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 202
        mock_client.send.return_value = mock_response
        mock_sendgrid.return_value = mock_client
        
        result = self.service.send(
            to=['test@example.com'],
            subject='Test Email',
            html_content='<p>Test content</p>',
            text_content='Test content'
        )
        
        self.assertTrue(result)
        mock_client.send.assert_called_once()
    
    @patch('django.core.mail.send_mail')
    def test_send_email_fallback_smtp(self, mock_send_mail):
        """Test fallback to SMTP when SendGrid fails"""
        mock_send_mail.return_value = 1
        
        # Force SendGrid to fail
        with patch('sendgrid.SendGridAPIClient') as mock_sendgrid:
            mock_sendgrid.side_effect = Exception("SendGrid error")
            
            result = self.service.send(
                to=['test@example.com'],
                subject='Test Email',
                html_content='<p>Test content</p>',
                text_content='Test content'
            )
        
        # Should fallback to SMTP
        self.assertTrue(result)
        mock_send_mail.assert_called_once()
    
    def test_email_validation(self):
        """Test email address validation"""
        invalid_emails = [
            'not-an-email',
            '@example.com',
            'user@',
            'user@@example.com',
            ''
        ]
        
        for email in invalid_emails:
            with self.assertRaises(ValueError):
                self.service.send(
                    to=[email],
                    subject='Test',
                    html_content='Test'
                )

class SMSServiceTest(TestCase):
    """Test SMS service"""
    
    def setUp(self):
        self.service = SMSService()
    
    @patch('twilio.rest.Client')
    def test_send_sms_success(self, mock_twilio):
        """Test successful SMS sending"""
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.sid = 'SM123456'
        mock_client.messages.create.return_value = mock_message
        mock_twilio.return_value = mock_client
        
        result = self.service.send(
            to='+34600000000',
            body='Your reservation is confirmed for Court 1 at 10:00'
        )
        
        self.assertTrue(result)
        self.assertEqual(result['sid'], 'SM123456')
        
        mock_client.messages.create.assert_called_once_with(
            to='+34600000000',
            from_=self.service.from_number,
            body='Your reservation is confirmed for Court 1 at 10:00'
        )
    
    def test_phone_number_validation(self):
        """Test phone number validation"""
        invalid_numbers = [
            '600000000',  # Missing country code
            '+34',         # Too short
            'not-a-number',
            '+1234567890123456'  # Too long
        ]
        
        for number in invalid_numbers:
            with self.assertRaises(ValueError):
                self.service.send(to=number, body='Test')
    
    def test_sms_length_limit(self):
        """Test SMS message length limit"""
        # Create message longer than 1600 chars (SMS limit)
        long_message = 'A' * 1601
        
        with self.assertRaises(ValueError) as context:
            self.service.send(to='+34600000000', body=long_message)
        
        self.assertIn('exceeds maximum length', str(context.exception))

class PushNotificationServiceTest(TestCase):
    """Test push notification service"""
    
    def setUp(self):
        self.service = PushService()
        self.user = UserFactory()
    
    @patch('fcm_django.FCMDevice.objects.filter')
    def test_send_push_to_user_devices(self, mock_filter):
        """Test sending push to all user devices"""
        # Mock user devices
        mock_devices = MagicMock()
        mock_devices.send_message.return_value = {'success': 2, 'failure': 0}
        mock_filter.return_value = mock_devices
        
        result = self.service.send(
            user=self.user,
            title='Match Reminder',
            body='Your match starts in 30 minutes',
            data={'match_id': 123}
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['sent_count'], 2)
        
        mock_devices.send_message.assert_called_once_with(
            title='Match Reminder',
            body='Your match starts in 30 minutes',
            data={'match_id': '123'}
        )
    
    def test_handle_invalid_tokens(self):
        """Test handling of invalid device tokens"""
        with patch('fcm_django.FCMDevice.objects.filter') as mock_filter:
            mock_devices = MagicMock()
            # Simulate invalid token error
            mock_devices.send_message.side_effect = Exception("Invalid token")
            mock_filter.return_value = mock_devices
            
            result = self.service.send(
                user=self.user,
                title='Test',
                body='Test message'
            )
            
            self.assertFalse(result['success'])
            self.assertIn('error', result)
```

### 3. Template Rendering Tests
```python
# backend/tests/unit/notifications/test_templates.py
from django.test import TestCase
from django.template import Context, Template
from apps.notifications.templatetags import notification_tags

class NotificationTemplateTagsTest(TestCase):
    """Test custom template tags for notifications"""
    
    def test_format_currency_tag(self):
        """Test currency formatting tag"""
        template = Template('{% load notification_tags %}{{ amount|format_currency }}')
        context = Context({'amount': 25.50})
        rendered = template.render(context)
        
        self.assertEqual(rendered.strip(), '€25.50')
    
    def test_format_datetime_tag(self):
        """Test datetime formatting tag"""
        from datetime import datetime
        
        template = Template('{% load notification_tags %}{{ date|format_datetime }}')
        test_date = datetime(2023, 12, 1, 10, 30)
        context = Context({'date': test_date})
        rendered = template.render(context)
        
        self.assertIn('December 1, 2023', rendered)
        self.assertIn('10:30', rendered)
    
    def test_unsubscribe_link_tag(self):
        """Test unsubscribe link generation"""
        template = Template(
            '{% load notification_tags %}'
            '{% unsubscribe_link user category %}'
        )
        user = UserFactory()
        context = Context({'user': user, 'category': 'marketing'})
        rendered = template.render(context)
        
        self.assertIn('/unsubscribe/', rendered)
        self.assertIn('category=marketing', rendered)
        self.assertIn(f'user={user.id}', rendered)
```

## 🔌 Integration Tests

### 1. Email Integration Tests
```python
# backend/tests/integration/notifications/test_email_integration.py
from rest_framework.test import APITestCase
from django.core import mail
from unittest.mock import patch

class EmailNotificationIntegrationTest(APITestCase):
    """Test email notification integration"""
    
    def setUp(self):
        self.user = UserFactory(email='user@test.com')
        
    def test_reservation_confirmation_email(self):
        """Test reservation confirmation email flow"""
        # Create reservation
        reservation_data = {
            'court_id': CourtFactory().id,
            'date': '2023-12-01',
            'start_time': '10:00',
            'duration': 60
        }
        
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/reservations/', reservation_data)
        
        self.assertEqual(response.status_code, 201)
        
        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        
        email = mail.outbox[0]
        self.assertEqual(email.to, ['user@test.com'])
        self.assertIn('Reservation Confirmed', email.subject)
        self.assertIn('2023-12-01', email.body)
        self.assertIn('10:00', email.body)
    
    @patch('sendgrid.SendGridAPIClient')
    def test_bulk_email_notification(self, mock_sendgrid):
        """Test bulk email notifications"""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 202
        mock_client.send.return_value = mock_response
        mock_sendgrid.return_value = mock_client
        
        # Create multiple users
        users = [UserFactory() for _ in range(10)]
        
        # Send bulk notification
        response = self.client.post(
            '/api/v1/notifications/bulk/',
            {
                'user_ids': [u.id for u in users],
                'notification_type': 'MAINTENANCE_NOTICE',
                'context': {
                    'date': '2023-12-15',
                    'duration': '2 hours'
                }
            }
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['sent_count'], 10)
    
    def test_email_with_attachments(self):
        """Test sending email with attachments"""
        # Generate PDF invoice
        invoice_pdf = self._generate_test_pdf()
        
        with patch('apps.notifications.services.EmailService.send') as mock_send:
            mock_send.return_value = True
            
            service = NotificationService()
            result = service.send_notification(
                user=self.user,
                notification_type='INVOICE',
                context={'invoice_number': 'INV-001'},
                attachments=[{
                    'filename': 'invoice.pdf',
                    'content': invoice_pdf,
                    'mimetype': 'application/pdf'
                }]
            )
            
            # Verify attachment included
            call_args = mock_send.call_args[1]
            self.assertEqual(len(call_args['attachments']), 1)
            self.assertEqual(call_args['attachments'][0]['filename'], 'invoice.pdf')
```

### 2. SMS Integration Tests
```python
# backend/tests/integration/notifications/test_sms_integration.py
class SMSNotificationIntegrationTest(APITestCase):
    """Test SMS notification integration"""
    
    def setUp(self):
        self.user = UserFactory(phone='+34600000000')
        
    @patch('twilio.rest.Client')
    def test_reservation_reminder_sms(self, mock_twilio):
        """Test reservation reminder SMS"""
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.sid = 'SM123'
        mock_client.messages.create.return_value = mock_message
        mock_twilio.return_value = mock_client
        
        # Create reservation for tomorrow
        reservation = ReservationFactory(
            user=self.user,
            date=timezone.now().date() + timedelta(days=1),
            start_time='10:00'
        )
        
        # Trigger reminder job
        from apps.notifications.tasks import send_reservation_reminders
        send_reservation_reminders()
        
        # Verify SMS sent
        mock_client.messages.create.assert_called_once()
        call_args = mock_client.messages.create.call_args[1]
        
        self.assertEqual(call_args['to'], '+34600000000')
        self.assertIn('reminder', call_args['body'].lower())
        self.assertIn('10:00', call_args['body'])
    
    def test_sms_opt_out_handling(self):
        """Test SMS opt-out handling"""
        # User opts out
        prefs = UserNotificationPreference.objects.create(
            user=self.user,
            sms_enabled=False
        )
        
        with patch('twilio.rest.Client') as mock_twilio:
            # Try to send SMS
            service = SMSService()
            result = service.send_to_user(
                user=self.user,
                body='Test message'
            )
            
            # Should not send
            self.assertFalse(result)
            mock_twilio.assert_not_called()
```

### 3. Push Notification Integration Tests
```python
# backend/tests/integration/notifications/test_push_integration.py
class PushNotificationIntegrationTest(APITestCase):
    """Test push notification integration"""
    
    def setUp(self):
        self.user = UserFactory()
        # Register device
        self.device = FCMDevice.objects.create(
            user=self.user,
            registration_id='test_token_123',
            type='ios'
        )
    
    @patch('fcm_django.fcm.fcm_send_message')
    def test_match_start_push_notification(self, mock_fcm):
        """Test match start push notification"""
        mock_fcm.return_value = {'success': 1}
        
        # Create match starting soon
        match = MatchFactory(
            player1=self.user,
            scheduled_time=timezone.now() + timedelta(minutes=15)
        )
        
        # Send notification
        service = PushService()
        result = service.send(
            user=self.user,
            title='Match Starting Soon',
            body=f'Your match starts in 15 minutes on {match.court.name}',
            data={
                'type': 'match_reminder',
                'match_id': str(match.id),
                'court_id': str(match.court.id)
            }
        )
        
        self.assertTrue(result['success'])
        
        # Verify FCM called correctly
        mock_fcm.assert_called_once()
        call_args = mock_fcm.call_args[1]
        self.assertEqual(call_args['registration_id'], 'test_token_123')
        self.assertIn('15 minutes', call_args['message_body'])
    
    def test_silent_push_notification(self):
        """Test silent push for data sync"""
        with patch('fcm_django.fcm.fcm_send_message') as mock_fcm:
            mock_fcm.return_value = {'success': 1}
            
            service = PushService()
            result = service.send_silent(
                user=self.user,
                data={
                    'action': 'sync_reservations',
                    'timestamp': '2023-12-01T10:00:00Z'
                }
            )
            
            # Verify silent notification flags
            call_args = mock_fcm.call_args[1]
            self.assertTrue(call_args.get('content_available'))
            self.assertEqual(call_args.get('priority'), 'high')
```

## 🔄 E2E Flow Tests

### 1. Complete Notification Flow
```python
# backend/tests/e2e/notifications/test_notification_flow.py
from django.test import TestCase
from django.core import mail
from unittest.mock import patch

class NotificationCompleteFlowE2ETest(TestCase):
    """Test complete notification flows"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory(
            email='user@test.com',
            phone='+34600000000'
        )
        # Setup notification preferences
        UserNotificationPreference.objects.create(
            user=self.user,
            email_enabled=True,
            sms_enabled=True,
            push_enabled=True
        )
        # Register device for push
        FCMDevice.objects.create(
            user=self.user,
            registration_id='test_device_token'
        )
    
    @patch('twilio.rest.Client')
    @patch('fcm_django.fcm.fcm_send_message')
    def test_reservation_lifecycle_notifications(self, mock_fcm, mock_twilio):
        """Test all notifications in reservation lifecycle"""
        # Setup mocks
        mock_fcm.return_value = {'success': 1}
        mock_sms = MagicMock()
        mock_sms.messages.create.return_value = MagicMock(sid='SM123')
        mock_twilio.return_value = mock_sms
        
        self.client.force_authenticate(user=self.user)
        
        # Step 1: Create reservation
        court = CourtFactory()
        reservation_data = {
            'court_id': court.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '10:00',
            'duration': 60
        }
        
        response = self.client.post('/api/v1/reservations/', reservation_data)
        self.assertEqual(response.status_code, 201)
        reservation_id = response.data['id']
        
        # Verify confirmation notifications sent
        # Email
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Reservation Confirmed', mail.outbox[0].subject)
        
        # SMS
        mock_sms.messages.create.assert_called()
        sms_body = mock_sms.messages.create.call_args[1]['body']
        self.assertIn('confirmed', sms_body.lower())
        
        # Push
        mock_fcm.assert_called()
        push_call = mock_fcm.call_args[1]
        self.assertIn('confirmed', push_call['message_title'].lower())
        
        # In-app
        in_app = Notification.objects.filter(
            user=self.user,
            type='RESERVATION_CONFIRMATION'
        ).first()
        self.assertIsNotNone(in_app)
        
        # Step 2: Reminder (simulate cron job 24h before)
        from apps.notifications.tasks import send_reservation_reminders
        
        # Reset mocks
        mail.outbox.clear()
        mock_sms.reset_mock()
        mock_fcm.reset_mock()
        
        with freeze_time(timezone.now() + timedelta(hours=23)):
            send_reservation_reminders()
        
        # Verify reminder notifications
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reminder', mail.outbox[0].subject.lower())
        mock_sms.messages.create.assert_called()
        mock_fcm.assert_called()
        
        # Step 3: Cancel reservation
        mail.outbox.clear()
        mock_sms.reset_mock()
        mock_fcm.reset_mock()
        
        response = self.client.delete(f'/api/v1/reservations/{reservation_id}/')
        self.assertEqual(response.status_code, 204)
        
        # Verify cancellation notifications
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('cancelled', mail.outbox[0].subject.lower())
        mock_sms.messages.create.assert_called()
        mock_fcm.assert_called()
```

### 2. Notification Preferences Flow
```python
# backend/tests/e2e/notifications/test_preferences_flow.py
class NotificationPreferencesFlowE2ETest(TestCase):
    """Test notification preferences management"""
    
    def test_complete_preferences_management(self):
        """Test user managing notification preferences"""
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        # Step 1: Get current preferences
        response = self.client.get('/api/v1/users/me/notification-preferences/')
        self.assertEqual(response.status_code, 200)
        
        # Default should have email enabled
        self.assertTrue(response.data['email_enabled'])
        
        # Step 2: Update preferences
        updates = {
            'email_enabled': True,
            'email_reservations': True,
            'email_payments': False,
            'email_marketing': False,
            'sms_enabled': True,
            'sms_reminders': True,
            'push_enabled': True
        }
        
        response = self.client.patch(
            '/api/v1/users/me/notification-preferences/',
            updates
        )
        self.assertEqual(response.status_code, 200)
        
        # Step 3: Test preferences are respected
        with patch('apps.notifications.services.EmailService.send') as mock_email:
            # Send payment notification (should be blocked)
            service = NotificationService()
            service.send_notification(
                user=user,
                notification_type='PAYMENT_RECEIVED',
                context={'amount': 50}
            )
            
            # Email should not be sent
            mock_email.assert_not_called()
        
        # Step 4: Test unsubscribe link
        prefs = UserNotificationPreference.objects.get(user=user)
        token = prefs.generate_unsubscribe_token()
        
        response = self.client.get(
            f'/api/v1/notifications/unsubscribe/?token={token}&category=all'
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify all notifications disabled
        prefs.refresh_from_db()
        self.assertFalse(prefs.email_enabled)
        self.assertFalse(prefs.sms_enabled)
        self.assertFalse(prefs.push_enabled)
```

### 3. Notification History and Analytics
```python
# backend/tests/e2e/notifications/test_analytics_flow.py
class NotificationAnalyticsE2ETest(TestCase):
    """Test notification analytics and history"""
    
    def test_notification_tracking_flow(self):
        """Test complete notification tracking"""
        admin = StaffUserFactory(is_superuser=True)
        users = [UserFactory() for _ in range(5)]
        
        # Send notifications to users
        with patch('apps.notifications.services.EmailService.send') as mock_email:
            mock_email.return_value = True
            
            for i, user in enumerate(users):
                # Some fail
                if i > 2:
                    mock_email.return_value = False
                    
                NotificationService().send_notification(
                    user=user,
                    notification_type='ANNOUNCEMENT',
                    context={'message': 'Test announcement'}
                )
        
        # Admin views analytics
        self.client.force_authenticate(user=admin)
        
        response = self.client.get('/api/v1/notifications/analytics/')
        self.assertEqual(response.status_code, 200)
        
        analytics = response.data
        self.assertEqual(analytics['total_sent'], 5)
        self.assertEqual(analytics['successful'], 3)
        self.assertEqual(analytics['failed'], 2)
        self.assertEqual(analytics['success_rate'], 60.0)
        
        # View detailed history
        response = self.client.get(
            '/api/v1/notifications/history/?status=failed'
        )
        self.assertEqual(len(response.data['results']), 2)
```

## 🔒 Security Tests

### Notification Security Tests
```python
# backend/tests/security/notifications/test_security.py
class NotificationSecurityTest(TestCase):
    """Test notification security features"""
    
    def test_notification_data_sanitization(self):
        """Test XSS prevention in notifications"""
        user = UserFactory()
        
        # Try to inject script
        malicious_context = {
            'message': '<script>alert("XSS")</script>',
            'court_name': '<img src=x onerror=alert("XSS")>'
        }
        
        notification = Notification.objects.create(
            user=user,
            type='GENERAL',
            title='Test',
            message='Test with {{message}}',
            data=malicious_context
        )
        
        # Render notification
        rendered = notification.get_rendered_message()
        
        # Scripts should be escaped
        self.assertNotIn('<script>', rendered)
        self.assertNotIn('onerror=', rendered)
        self.assertIn('&lt;script&gt;', rendered)
    
    def test_unsubscribe_token_security(self):
        """Test unsubscribe token cannot be guessed"""
        user1 = UserFactory()
        user2 = UserFactory()
        
        prefs1 = UserNotificationPreference.objects.create(user=user1)
        prefs2 = UserNotificationPreference.objects.create(user=user2)
        
        token1 = prefs1.generate_unsubscribe_token()
        
        # Try to unsubscribe user2 with user1's token
        response = self.client.get(
            f'/api/v1/notifications/unsubscribe/?token={token1}&user_id={user2.id}'
        )
        
        # Should fail
        self.assertEqual(response.status_code, 403)
        
        # User2 preferences should not change
        prefs2.refresh_from_db()
        self.assertTrue(prefs2.email_enabled)
    
    def test_rate_limiting_bulk_notifications(self):
        """Test rate limiting for bulk notifications"""
        admin = StaffUserFactory()
        self.client.force_authenticate(user=admin)
        
        # Try to send many bulk notifications quickly
        for i in range(10):
            response = self.client.post(
                '/api/v1/notifications/bulk/',
                {
                    'user_ids': list(range(1000)),  # Large number
                    'notification_type': 'SPAM',
                    'context': {}
                }
            )
            
            if i < 3:
                # First few should succeed
                self.assertIn(response.status_code, [200, 201])
            else:
                # Should be rate limited
                self.assertEqual(response.status_code, 429)
```

## 📊 Performance Tests

### Notification Performance Tests
```python
# backend/tests/performance/notifications/test_performance.py
class NotificationPerformanceTest(TestCase):
    """Test notification system performance"""
    
    def test_bulk_notification_performance(self):
        """Test sending notifications to many users"""
        # Create 1000 users
        users = []
        for i in range(1000):
            users.append(
                User(
                    email=f'user{i}@test.com',
                    username=f'user{i}'
                )
            )
        User.objects.bulk_create(users)
        
        # Measure bulk notification time
        start = time.time()
        
        with patch('apps.notifications.services.EmailService.send_bulk') as mock_send:
            mock_send.return_value = {'success': 1000, 'failed': 0}
            
            service = NotificationService()
            result = service.send_bulk_notification(
                users=User.objects.all(),
                notification_type='ANNOUNCEMENT',
                context={'message': 'Test'}
            )
        
        duration = time.time() - start
        
        # Should complete within 5 seconds
        self.assertLess(duration, 5.0)
        self.assertEqual(result['total'], 1000)
    
    def test_notification_query_optimization(self):
        """Test notification queries are optimized"""
        user = UserFactory()
        
        # Create many notifications
        notifications = []
        for i in range(100):
            notifications.append(
                Notification(
                    user=user,
                    type='GENERAL',
                    title=f'Notification {i}',
                    message=f'Message {i}'
                )
            )
        Notification.objects.bulk_create(notifications)
        
        # Test query count
        with self.assertNumQueries(1):
            # Should use single query with select_related
            list(Notification.objects.filter(user=user).select_related('user'))
    
    def test_template_rendering_performance(self):
        """Test template rendering performance"""
        template = EmailTemplate.objects.create(
            code='COMPLEX',
            subject='Complex {{var1}} template {{var2}}',
            body_html='''
                {% for item in items %}
                    <p>{{item.name}}: {{item.value|format_currency}}</p>
                {% endfor %}
            '''
        )
        
        # Complex context
        context = {
            'var1': 'Test',
            'var2': 'Template',
            'items': [
                {'name': f'Item {i}', 'value': i * 10.50}
                for i in range(100)
            ]
        }
        
        # Measure rendering time
        start = time.time()
        rendered = template.render_html(context)
        duration = time.time() - start
        
        # Should render quickly even with loops
        self.assertLess(duration, 0.1)
        self.assertIn('Item 99', rendered)
```

## 🎯 Test Execution Commands

### Run All Notification Tests
```bash
# Unit tests only
pytest tests/unit/notifications/ -v

# Integration tests
pytest tests/integration/notifications/ -v

# E2E tests
pytest tests/e2e/notifications/ -v

# All notification tests
pytest tests/ -k notification -v

# With coverage
pytest tests/ -k notification --cov=apps.notifications --cov-report=html
```

### Run Specific Test Categories
```bash
# Email tests
pytest tests/ -k "notification and email" -v

# SMS tests
pytest tests/ -k "notification and sms" -v

# Push notification tests
pytest tests/ -k "notification and push" -v

# Template tests
pytest tests/ -k "template" -v
```

---

**Siguiente**: [Analytics Module Tests](14-Analytics-Module-Tests.md) →