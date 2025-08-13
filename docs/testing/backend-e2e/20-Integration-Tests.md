# 🔗 Integration Tests

## 📋 Resumen

Esta guía detalla los tests de integración entre diferentes componentes del sistema, servicios externos, y módulos internos, asegurando que todos funcionen correctamente juntos.

## 🎯 Objetivos de Testing

### Cobertura Target: 85%
- **Service Integration**: 90% - Servicios externos
- **Module Integration**: 85% - Módulos internos
- **Database Integration**: 95% - Transacciones y consistencia
- **Cache Integration**: 80% - Redis y caché
- **Message Queue**: 85% - Celery y tareas
- **Third-party APIs**: 90% - APIs externas
- **Frontend-Backend**: 85% - Comunicación completa

### Integraciones a Cubrir
- ✅ Stripe Payment Gateway
- ✅ SendGrid/Email Service
- ✅ Twilio SMS Service
- ✅ Redis Cache
- ✅ PostgreSQL Database
- ✅ Celery Task Queue
- ✅ WebSocket Connections
- ✅ External APIs

## 🧪 Unit Tests

### 1. Service Integration Tests
```python
# backend/tests/unit/integration/test_service_integration.py
from django.test import TestCase
from unittest.mock import Mock, patch
from apps.integration.services import ServiceIntegrator, ServiceHealthChecker
from apps.integration.exceptions import ServiceIntegrationError

class ServiceIntegratorTest(TestCase):
    """Test service integration logic"""
    
    def setUp(self):
        self.integrator = ServiceIntegrator()
        self.health_checker = ServiceHealthChecker()
        
    def test_service_registration(self):
        """Test service registration and discovery"""
        # Register services
        services = {
            'payment': {
                'provider': 'stripe',
                'endpoint': 'https://api.stripe.com',
                'version': 'v1',
                'timeout': 30
            },
            'email': {
                'provider': 'sendgrid',
                'endpoint': 'https://api.sendgrid.com',
                'version': 'v3',
                'timeout': 10
            }
        }
        
        for name, config in services.items():
            self.integrator.register_service(name, config)
            
        # Verify registration
        registered = self.integrator.get_registered_services()
        self.assertEqual(len(registered), 2)
        
        # Get specific service
        payment_service = self.integrator.get_service('payment')
        self.assertEqual(payment_service['provider'], 'stripe')
        
    def test_service_circuit_breaker(self):
        """Test circuit breaker pattern"""
        from apps.integration.circuit_breaker import CircuitBreaker
        
        breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=5,
            expected_exception=ServiceIntegrationError
        )
        
        # Mock failing service
        @breaker
        def failing_service():
            raise ServiceIntegrationError("Service unavailable")
            
        # Should fail 3 times before opening circuit
        for i in range(3):
            with self.assertRaises(ServiceIntegrationError):
                failing_service()
                
        # Circuit should be open now
        self.assertEqual(breaker.state, 'open')
        
        # Further calls should fail immediately
        with self.assertRaises(ServiceIntegrationError) as context:
            failing_service()
            
        self.assertIn('Circuit breaker is open', str(context.exception))
        
    def test_service_retry_logic(self):
        """Test retry logic with exponential backoff"""
        from apps.integration.retry import RetryWithBackoff
        
        retry_handler = RetryWithBackoff(
            max_attempts=3,
            initial_delay=0.1,
            max_delay=1.0,
            exponential_base=2
        )
        
        attempt_count = 0
        
        @retry_handler
        def flaky_service():
            nonlocal attempt_count
            attempt_count += 1
            
            if attempt_count < 3:
                raise ServiceIntegrationError("Temporary failure")
            return "Success"
            
        result = flaky_service()
        
        self.assertEqual(result, "Success")
        self.assertEqual(attempt_count, 3)

class ServiceHealthCheckerTest(TestCase):
    """Test service health monitoring"""
    
    def test_health_check_all_services(self):
        """Test health check for all integrated services"""
        checker = ServiceHealthChecker()
        
        # Mock service responses
        with patch('requests.get') as mock_get:
            # Configure mock responses
            mock_get.side_effect = [
                Mock(status_code=200, json=lambda: {'status': 'healthy'}),  # Stripe
                Mock(status_code=200, json=lambda: {'status': 'ok'}),       # SendGrid
                Mock(status_code=503),                                       # Failed service
            ]
            
            health_status = checker.check_all_services()
            
        # Verify results
        self.assertEqual(health_status['stripe']['status'], 'healthy')
        self.assertEqual(health_status['sendgrid']['status'], 'healthy')
        self.assertIn('failed', health_status)
        
    def test_dependency_health_aggregation(self):
        """Test aggregated health status"""
        checker = ServiceHealthChecker()
        
        service_statuses = {
            'database': {'status': 'healthy', 'latency': 5},
            'cache': {'status': 'healthy', 'latency': 2},
            'payment': {'status': 'degraded', 'latency': 150},
            'email': {'status': 'unhealthy', 'error': 'Connection timeout'}
        }
        
        aggregate = checker.aggregate_health_status(service_statuses)
        
        # Overall status should be worst case
        self.assertEqual(aggregate['overall_status'], 'unhealthy')
        self.assertEqual(aggregate['healthy_services'], 2)
        self.assertEqual(aggregate['total_services'], 4)
        self.assertIn('email', aggregate['failed_services'])
```

### 2. Module Integration Tests
```python
# backend/tests/unit/integration/test_module_integration.py
from django.test import TestCase, TransactionTestCase
from apps.clubs.models import Club
from apps.reservations.models import Reservation
from apps.payments.models import Payment
from apps.notifications.services import NotificationService

class ModuleIntegrationTest(TransactionTestCase):
    """Test integration between internal modules"""
    
    def test_reservation_payment_flow(self):
        """Test reservation creation triggers payment flow"""
        club = ClubFactory()
        court = CourtFactory(club=club, price_per_hour=30)
        user = UserFactory()
        
        # Create reservation
        reservation = Reservation.objects.create(
            user=user,
            court=court,
            date=timezone.now().date() + timedelta(days=1),
            start_time="10:00",
            duration=90,  # 1.5 hours
            status='pending'
        )
        
        # Should create pending payment
        payment = Payment.objects.filter(
            reservation=reservation,
            user=user
        ).first()
        
        self.assertIsNotNone(payment)
        self.assertEqual(payment.amount, Decimal('45.00'))  # 30 * 1.5
        self.assertEqual(payment.status, 'pending')
        
        # Confirm payment
        payment.confirm_payment(
            payment_intent_id='pi_test_123',
            payment_method='card'
        )
        
        # Should update reservation status
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'confirmed')
        
    def test_notification_integration(self):
        """Test notification system integration"""
        notification_service = NotificationService()
        
        # Create event that triggers notification
        user = UserFactory(email='test@example.com')
        reservation = ReservationFactory(
            user=user,
            status='confirmed'
        )
        
        # Should trigger confirmation notification
        with patch('apps.notifications.services.EmailService.send') as mock_send:
            mock_send.return_value = True
            
            notification_service.send_reservation_confirmation(reservation)
            
            # Verify notification sent
            mock_send.assert_called_once()
            call_args = mock_send.call_args[1]
            
            self.assertEqual(call_args['to'], ['test@example.com'])
            self.assertIn('reservation', call_args['context'])
            
    def test_cascade_operations(self):
        """Test cascade operations between modules"""
        club = ClubFactory()
        
        # Create related data
        courts = CourtFactory.create_batch(3, club=club)
        for court in courts:
            ReservationFactory.create_batch(5, court=court)
            
        # Soft delete club
        club.soft_delete()
        
        # Should cascade to courts
        for court in courts:
            court.refresh_from_db()
            self.assertFalse(court.is_active)
            
        # Reservations should be cancelled
        reservations = Reservation.objects.filter(
            court__in=courts
        )
        
        for reservation in reservations:
            self.assertEqual(reservation.status, 'cancelled')
```

### 3. Data Consistency Tests
```python
# backend/tests/unit/integration/test_data_consistency.py
from django.test import TransactionTestCase
from django.db import transaction
from apps.integration.consistency import ConsistencyChecker

class DataConsistencyTest(TransactionTestCase):
    """Test data consistency across modules"""
    
    def test_transaction_atomicity(self):
        """Test atomic transactions across modules"""
        user = UserFactory()
        court = CourtFactory()
        
        # Test failed transaction rollback
        with self.assertRaises(Exception):
            with transaction.atomic():
                # Create reservation
                reservation = Reservation.objects.create(
                    user=user,
                    court=court,
                    date=timezone.now().date(),
                    start_time="10:00"
                )
                
                # Create payment
                payment = Payment.objects.create(
                    user=user,
                    reservation=reservation,
                    amount=50
                )
                
                # Force failure
                raise Exception("Simulated failure")
                
        # Verify rollback
        self.assertEqual(Reservation.objects.count(), 0)
        self.assertEqual(Payment.objects.count(), 0)
        
    def test_referential_integrity(self):
        """Test referential integrity between modules"""
        checker = ConsistencyChecker()
        
        # Create orphaned records (for testing)
        Payment.objects.create(
            user_id=99999,  # Non-existent user
            amount=100,
            status='completed'
        )
        
        # Run integrity check
        issues = checker.check_referential_integrity()
        
        self.assertGreater(len(issues), 0)
        self.assertIn('payment_missing_user', issues[0]['type'])
        
    def test_data_synchronization(self):
        """Test data synchronization between services"""
        from apps.integration.sync import DataSynchronizer
        
        synchronizer = DataSynchronizer()
        
        # Create local data
        local_clubs = ClubFactory.create_batch(5)
        
        # Mock external service data
        external_data = [
            {'id': club.id, 'name': f"Updated {club.name}"}
            for club in local_clubs[:3]
        ]
        
        # Add new clubs in external
        external_data.extend([
            {'id': 'new_1', 'name': 'New Club 1'},
            {'id': 'new_2', 'name': 'New Club 2'}
        ])
        
        # Synchronize
        with patch('apps.integration.sync.fetch_external_data') as mock_fetch:
            mock_fetch.return_value = external_data
            
            sync_result = synchronizer.sync_clubs()
            
        self.assertEqual(sync_result['updated'], 3)
        self.assertEqual(sync_result['created'], 2)
        self.assertEqual(sync_result['errors'], 0)
```

## 🔌 Integration Tests

### 1. Payment Gateway Integration
```python
# backend/tests/integration/external/test_payment_integration.py
from rest_framework.test import APITestCase
from unittest.mock import patch, Mock
import stripe

class StripeIntegrationTest(APITestCase):
    """Test Stripe payment gateway integration"""
    
    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        
    @patch('stripe.PaymentIntent.create')
    def test_payment_intent_creation(self, mock_create):
        """Test creating payment intent with Stripe"""
        # Configure mock
        mock_create.return_value = {
            'id': 'pi_test_123',
            'client_secret': 'pi_test_123_secret_456',
            'amount': 5000,
            'currency': 'eur',
            'status': 'requires_payment_method'
        }
        
        # Create payment intent
        response = self.client.post(
            '/api/v1/payments/create-intent/',
            {
                'amount': 50.00,
                'currency': 'EUR',
                'metadata': {
                    'reservation_id': 123,
                    'user_id': self.user.id
                }
            }
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['amount'], 5000)
        
        # Verify Stripe was called correctly
        mock_create.assert_called_once_with(
            amount=5000,
            currency='eur',
            metadata={
                'reservation_id': '123',
                'user_id': str(self.user.id)
            },
            customer=ANY
        )
        
    @patch('stripe.Webhook.construct_event')
    def test_webhook_handling(self, mock_construct):
        """Test Stripe webhook handling"""
        # Mock webhook event
        mock_event = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_123',
                    'amount': 5000,
                    'metadata': {
                        'reservation_id': '123'
                    }
                }
            }
        }
        
        mock_construct.return_value = mock_event
        
        # Send webhook
        response = self.client.post(
            '/api/v1/payments/stripe-webhook/',
            data=json.dumps(mock_event),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify payment was updated
        payment = Payment.objects.get(
            payment_intent_id='pi_test_123'
        )
        self.assertEqual(payment.status, 'completed')
        
    def test_refund_integration(self):
        """Test refund processing with Stripe"""
        # Create completed payment
        payment = PaymentFactory(
            user=self.user,
            amount=50.00,
            status='completed',
            payment_intent_id='pi_test_123'
        )
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund.return_value = {
                'id': 're_test_123',
                'amount': 5000,
                'status': 'succeeded'
            }
            
            # Request refund
            response = self.client.post(
                f'/api/v1/payments/{payment.id}/refund/',
                {'reason': 'requested_by_customer'}
            )
            
            self.assertEqual(response.status_code, 200)
            
            # Verify Stripe was called
            mock_refund.assert_called_once_with(
                payment_intent='pi_test_123',
                reason='requested_by_customer'
            )
            
            # Verify payment updated
            payment.refresh_from_db()
            self.assertEqual(payment.status, 'refunded')
```

### 2. Email Service Integration
```python
# backend/tests/integration/external/test_email_integration.py
class EmailServiceIntegrationTest(APITestCase):
    """Test email service integration"""
    
    @patch('sendgrid.SendGridAPIClient')
    def test_sendgrid_integration(self, mock_sendgrid):
        """Test SendGrid email sending"""
        # Configure mock
        mock_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 202
        mock_client.send.return_value = mock_response
        mock_sendgrid.return_value = mock_client
        
        # Trigger email
        user = UserFactory(email='test@example.com')
        reservation = ReservationFactory(user=user)
        
        from apps.notifications.services import EmailService
        email_service = EmailService()
        
        result = email_service.send_reservation_confirmation(reservation)
        
        self.assertTrue(result)
        
        # Verify SendGrid was called
        mock_client.send.assert_called_once()
        call_args = mock_client.send.call_args[0][0]
        
        self.assertEqual(call_args.personalizations[0].tos[0]['email'], 'test@example.com')
        self.assertIn('reservation', call_args.subject.lower())
        
    def test_email_template_rendering(self):
        """Test email template rendering with data"""
        from apps.notifications.templates import EmailTemplateRenderer
        
        renderer = EmailTemplateRenderer()
        
        context = {
            'user': UserFactory(first_name='John', last_name='Doe'),
            'reservation': {
                'date': '2023-12-15',
                'time': '10:00',
                'court': 'Court 1',
                'duration': 90
            }
        }
        
        # Render template
        html_content = renderer.render(
            'reservation_confirmation.html',
            context
        )
        
        # Verify content
        self.assertIn('John Doe', html_content)
        self.assertIn('2023-12-15', html_content)
        self.assertIn('10:00', html_content)
        self.assertIn('Court 1', html_content)
        
    def test_email_bounce_handling(self):
        """Test email bounce webhook handling"""
        # SendGrid bounce webhook
        webhook_data = {
            'event': 'bounce',
            'email': 'bounced@example.com',
            'reason': 'Invalid email address'
        }
        
        response = self.client.post(
            '/api/v1/notifications/sendgrid-webhook/',
            [webhook_data],  # SendGrid sends array
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify user email marked as invalid
        user = User.objects.get(email='bounced@example.com')
        self.assertFalse(user.email_valid)
```

### 3. Cache Integration
```python
# backend/tests/integration/cache/test_redis_integration.py
from django.core.cache import cache
from django_redis import get_redis_connection

class RedisIntegrationTest(TestCase):
    """Test Redis cache integration"""
    
    def setUp(self):
        cache.clear()
        
    def test_cache_operations(self):
        """Test basic cache operations"""
        # Set value
        cache.set('test_key', 'test_value', timeout=300)
        
        # Get value
        value = cache.get('test_key')
        self.assertEqual(value, 'test_value')
        
        # Test expiration
        cache.set('expiring_key', 'value', timeout=1)
        time.sleep(2)
        
        value = cache.get('expiring_key')
        self.assertIsNone(value)
        
    def test_cache_invalidation_patterns(self):
        """Test cache invalidation patterns"""
        # Set multiple related keys
        cache.set('clubs:list:page:1', ['club1', 'club2'], 3600)
        cache.set('clubs:list:page:2', ['club3', 'club4'], 3600)
        cache.set('clubs:detail:1', {'id': 1, 'name': 'Club 1'}, 3600)
        cache.set('users:profile:1', {'id': 1, 'name': 'User 1'}, 3600)
        
        # Delete by pattern
        from apps.cache.utils import delete_pattern
        deleted = delete_pattern('clubs:*')
        
        self.assertEqual(deleted, 3)
        
        # Verify clubs cache cleared
        self.assertIsNone(cache.get('clubs:list:page:1'))
        self.assertIsNone(cache.get('clubs:detail:1'))
        
        # User cache should remain
        self.assertIsNotNone(cache.get('users:profile:1'))
        
    def test_redis_connection_pool(self):
        """Test Redis connection pooling"""
        redis_conn = get_redis_connection("default")
        
        # Test connection
        redis_conn.ping()
        
        # Get pool stats
        pool = redis_conn.connection_pool
        
        self.assertGreater(pool.max_connections, 0)
        self.assertLessEqual(
            pool.connection_kwargs['socket_connect_timeout'],
            5
        )
        
    def test_cache_warming_job(self):
        """Test cache warming background job"""
        from apps.cache.tasks import warm_cache
        
        # Run cache warming
        result = warm_cache.apply()
        
        # Verify popular data is cached
        popular_clubs = cache.get('popular:clubs')
        self.assertIsNotNone(popular_clubs)
        
        available_courts = cache.get('available:courts:today')
        self.assertIsNotNone(available_courts)
```

## 🔄 E2E Flow Tests

### 1. Complete Booking Flow Integration
```python
# backend/tests/e2e/integration/test_booking_flow.py
class BookingFlowIntegrationE2ETest(TransactionTestCase):
    """Test complete booking flow with all integrations"""
    
    def test_complete_booking_flow(self):
        """Test booking from search to payment confirmation"""
        user = UserFactory(email='user@test.com')
        self.client.force_authenticate(user=user)
        
        # Step 1: Search for available courts
        search_response = self.client.get(
            '/api/v1/courts/search/',
            {
                'date': '2023-12-15',
                'time': '10:00',
                'duration': 90,
                'city': 'Madrid'
            }
        )
        
        self.assertEqual(search_response.status_code, 200)
        available_courts = search_response.data['results']
        self.assertGreater(len(available_courts), 0)
        
        # Step 2: Check specific court availability
        court = available_courts[0]
        availability_response = self.client.get(
            f'/api/v1/courts/{court["id"]}/availability/',
            {
                'date': '2023-12-15',
                'duration': 90
            }
        )
        
        self.assertEqual(availability_response.status_code, 200)
        slots = availability_response.data['available_slots']
        self.assertIn('10:00', [s['start_time'] for s in slots])
        
        # Step 3: Create reservation
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.return_value = {
                'id': 'pi_test_booking',
                'client_secret': 'secret_test',
                'amount': 4500,  # 30€/hour * 1.5 hours
                'status': 'requires_payment_method'
            }
            
            reservation_response = self.client.post(
                '/api/v1/reservations/',
                {
                    'court_id': court['id'],
                    'date': '2023-12-15',
                    'start_time': '10:00',
                    'duration': 90,
                    'participants': [user.id]
                }
            )
            
            self.assertEqual(reservation_response.status_code, 201)
            reservation_id = reservation_response.data['id']
            payment_intent = reservation_response.data['payment']['client_secret']
            
        # Step 4: Confirm payment (simulate webhook)
        with patch('stripe.Webhook.construct_event') as mock_webhook:
            mock_webhook.return_value = {
                'type': 'payment_intent.succeeded',
                'data': {
                    'object': {
                        'id': 'pi_test_booking',
                        'metadata': {
                            'reservation_id': str(reservation_id)
                        }
                    }
                }
            }
            
            webhook_response = self.client.post(
                '/api/v1/payments/stripe-webhook/',
                json.dumps(mock_webhook.return_value),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_sig'
            )
            
            self.assertEqual(webhook_response.status_code, 200)
            
        # Step 5: Verify reservation confirmed
        reservation = Reservation.objects.get(id=reservation_id)
        self.assertEqual(reservation.status, 'confirmed')
        
        # Step 6: Check notification sent
        with patch('apps.notifications.services.EmailService.send') as mock_email:
            mock_email.return_value = True
            
            # Trigger notification task
            from apps.notifications.tasks import send_reservation_confirmation
            send_reservation_confirmation.apply(args=[reservation_id])
            
            # Verify email sent
            mock_email.assert_called_once()
            call_args = mock_email.call_args[1]
            self.assertEqual(call_args['to'], ['user@test.com'])
```

### 2. Multi-Service Failure Recovery
```python
# backend/tests/e2e/integration/test_failure_recovery.py
class FailureRecoveryE2ETest(TestCase):
    """Test system recovery from service failures"""
    
    def test_payment_failure_recovery(self):
        """Test recovery from payment service failure"""
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        # Create reservation
        reservation_data = {
            'court_id': CourtFactory().id,
            'date': '2023-12-15',
            'start_time': '10:00',
            'duration': 60
        }
        
        # Simulate Stripe failure
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.side_effect = stripe.error.APIConnectionError(
                "Network error"
            )
            
            response = self.client.post(
                '/api/v1/reservations/',
                reservation_data
            )
            
            # Should handle gracefully
            self.assertEqual(response.status_code, 503)
            self.assertIn('payment_service_unavailable', response.data['error'])
            
        # Verify reservation saved but pending
        reservation = Reservation.objects.filter(
            user=user,
            date='2023-12-15'
        ).first()
        
        self.assertIsNotNone(reservation)
        self.assertEqual(reservation.status, 'payment_pending')
        
        # Retry payment
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.return_value = {
                'id': 'pi_retry',
                'client_secret': 'secret_retry'
            }
            
            retry_response = self.client.post(
                f'/api/v1/reservations/{reservation.id}/retry-payment/'
            )
            
            self.assertEqual(retry_response.status_code, 200)
            
    def test_notification_failure_recovery(self):
        """Test recovery from notification service failure"""
        # Create confirmed reservation
        reservation = ReservationFactory(status='confirmed')
        
        # Simulate email service failure
        with patch('sendgrid.SendGridAPIClient') as mock_sendgrid:
            mock_sendgrid.side_effect = Exception("SendGrid error")
            
            # Should not block reservation
            from apps.notifications.tasks import send_reservation_confirmation
            result = send_reservation_confirmation.apply(
                args=[reservation.id]
            )
            
            # Task should retry
            self.assertIsNotNone(result.id)
            
        # Check retry queue
        from apps.notifications.models import NotificationQueue
        queued = NotificationQueue.objects.filter(
            object_id=reservation.id,
            notification_type='reservation_confirmation'
        ).first()
        
        self.assertIsNotNone(queued)
        self.assertEqual(queued.status, 'pending')
        self.assertEqual(queued.retry_count, 1)
```

### 3. Data Synchronization Test
```python
# backend/tests/e2e/integration/test_data_sync.py
class DataSynchronizationE2ETest(TestCase):
    """Test data synchronization between services"""
    
    def test_cross_service_data_consistency(self):
        """Test data remains consistent across services"""
        # Create initial data
        club = ClubFactory(name="Test Club")
        
        # Update in database
        club.name = "Updated Club Name"
        club.save()
        
        # Cache should be invalidated
        cached_club = cache.get(f'club:{club.id}')
        self.assertIsNone(cached_club)
        
        # Search index should be updated
        from apps.search.tasks import update_search_index
        update_search_index.apply(args=['club', club.id])
        
        # Verify search returns updated data
        response = self.client.get(
            '/api/v1/search/',
            {'q': 'Updated Club Name'}
        )
        
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Updated Club Name')
        
    def test_eventual_consistency(self):
        """Test eventual consistency in distributed operations"""
        from apps.integration.consistency import EventualConsistencyManager
        
        manager = EventualConsistencyManager()
        
        # Perform distributed operation
        operation_id = manager.start_distributed_operation()
        
        # Update in multiple services
        updates = [
            manager.update_service('database', operation_id, {'status': 'completed'}),
            manager.update_service('cache', operation_id, {'status': 'completed'}),
            manager.update_service('search', operation_id, {'status': 'pending'})
        ]
        
        # Check consistency
        is_consistent = manager.check_consistency(operation_id)
        self.assertFalse(is_consistent)  # One service pending
        
        # Complete remaining update
        manager.update_service('search', operation_id, {'status': 'completed'})
        
        # Now should be consistent
        is_consistent = manager.check_consistency(operation_id)
        self.assertTrue(is_consistent)
```

## 🔒 Security Integration Tests

### Cross-Service Security Tests
```python
# backend/tests/integration/security/test_security_integration.py
class SecurityIntegrationTest(TestCase):
    """Test security across integrated services"""
    
    def test_token_propagation(self):
        """Test authentication token propagation"""
        user = UserFactory()
        token = AuthToken.objects.create(user=user)
        
        # Test token works across services
        headers = {'HTTP_AUTHORIZATION': f'Token {token.key}'}
        
        # Database service
        db_response = self.client.get('/api/v1/users/me/', **headers)
        self.assertEqual(db_response.status_code, 200)
        
        # Cache service should recognize token
        from apps.cache.auth import CacheAuthenticator
        cache_auth = CacheAuthenticator()
        cached_user = cache_auth.authenticate_token(token.key)
        self.assertEqual(cached_user.id, user.id)
        
        # WebSocket should accept token
        from channels.testing import WebsocketCommunicator
        from apps.ws.consumers import NotificationConsumer
        
        communicator = WebsocketCommunicator(
            NotificationConsumer.as_asgi(),
            f"/ws/notifications/?token={token.key}"
        )
        
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()
        
    def test_service_isolation(self):
        """Test services are properly isolated"""
        # Create service-specific credentials
        services = {
            'payment': 'sk_test_payment_key',
            'email': 'SG.email_api_key',
            'sms': 'twilio_auth_token'
        }
        
        # Verify credentials are not cross-accessible
        from apps.integration.credentials import CredentialManager
        
        manager = CredentialManager()
        
        # Payment service can't access email credentials
        with self.assertRaises(PermissionError):
            manager.get_credential('email', context='payment_service')
            
        # Each service can only access its own
        for service, credential in services.items():
            retrieved = manager.get_credential(
                service,
                context=f'{service}_service'
            )
            self.assertEqual(retrieved, credential)
```

## 📊 Performance Integration Tests

### Integration Performance Tests
```python
# backend/tests/integration/performance/test_integration_performance.py
class IntegrationPerformanceTest(TestCase):
    """Test performance of integrated systems"""
    
    def test_service_latency(self):
        """Test latency between services"""
        from apps.integration.monitoring import LatencyMonitor
        
        monitor = LatencyMonitor()
        
        # Measure service call latencies
        services = ['database', 'cache', 'payment', 'email']
        
        for service in services:
            start = time.time()
            
            # Make service call
            if service == 'database':
                list(Club.objects.all()[:10])
            elif service == 'cache':
                cache.get('test_key')
            elif service == 'payment':
                with patch('stripe.Customer.list') as mock:
                    mock.return_value = {'data': []}
                    stripe.Customer.list(limit=10)
            elif service == 'email':
                with patch('sendgrid.SendGridAPIClient.send'):
                    pass
                    
            latency = (time.time() - start) * 1000  # ms
            monitor.record_latency(service, latency)
            
        # Check latencies are acceptable
        stats = monitor.get_statistics()
        
        for service in services:
            service_stats = stats[service]
            self.assertLess(
                service_stats['p95'],
                100,  # 95th percentile < 100ms
                f"{service} latency too high"
            )
            
    def test_concurrent_service_calls(self):
        """Test performance with concurrent service calls"""
        import asyncio
        from apps.integration.async_client import AsyncServiceClient
        
        client = AsyncServiceClient()
        
        async def make_concurrent_calls():
            tasks = [
                client.call_database('SELECT COUNT(*) FROM clubs'),
                client.call_cache('GET popular:clubs'),
                client.call_payment('GET /v1/customers'),
                client.call_email('GET /v3/stats')
            ]
            
            start = time.time()
            results = await asyncio.gather(*tasks)
            duration = time.time() - start
            
            return results, duration
            
        results, duration = asyncio.run(make_concurrent_calls())
        
        # Should complete all calls efficiently
        self.assertEqual(len(results), 4)
        self.assertLess(duration, 0.5)  # All calls in 500ms
```

## 🎯 Test Execution Commands

### Run All Integration Tests
```bash
# Unit tests
pytest tests/unit/integration/ -v

# Integration tests
pytest tests/integration/ -v

# E2E integration tests
pytest tests/e2e/integration/ -v

# All integration tests
pytest tests/ -k integration -v

# With coverage
pytest tests/ -k integration --cov=apps.integration --cov-report=html
```

### Run Specific Integration Tests
```bash
# Service integration tests
pytest tests/ -k "service_integration" -v

# Payment integration tests
pytest tests/ -k "payment and integration" -v

# Cache integration tests
pytest tests/ -k "cache and integration" -v

# Email integration tests
pytest tests/ -k "email and integration" -v
```

### Integration Test Profiles
```bash
# Quick integration tests
pytest tests/integration/ -m "quick" -v

# Full integration suite
pytest tests/integration/ -m "not slow" -v

# External service tests (requires credentials)
pytest tests/integration/external/ --external-services -v
```

---

**Siguiente**: [Deployment Testing](21-Deployment-Testing.md) →