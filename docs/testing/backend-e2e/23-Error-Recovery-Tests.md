# 🔄 Error Recovery Tests

## 📋 Resumen

Esta guía detalla los tests para mecanismos de recuperación de errores, resiliencia del sistema, y manejo de fallos en cascada.

## 🎯 Objetivos de Testing

### Cobertura de Recuperación
- **Transient Failures**: 100% - Fallos temporales
- **Service Recovery**: 95% - Recuperación de servicios
- **Data Consistency**: 100% - Consistencia tras fallos
- **Circuit Breakers**: 90% - Prevención de cascada
- **Retry Mechanisms**: 95% - Reintentos inteligentes
- **Fallback Strategies**: 90% - Estrategias alternativas
- **State Recovery**: 95% - Recuperación de estado

### Escenarios a Cubrir
- ✅ Database Connection Loss
- ✅ External Service Failures
- ✅ Network Timeouts
- ✅ Memory Exhaustion
- ✅ Disk Space Issues
- ✅ Concurrent Update Conflicts
- ✅ Message Queue Failures
- ✅ Cache Unavailability

## 🧪 Unit Tests

### 1. Retry Mechanism Tests
```python
# backend/tests/unit/recovery/test_retry_mechanisms.py
from django.test import TestCase
from unittest.mock import Mock, patch
from apps.recovery.retry import RetryManager, ExponentialBackoff
from apps.recovery.exceptions import MaxRetriesExceeded, NonRetryableError
import time

class RetryMechanismTest(TestCase):
    """Test retry mechanisms for transient failures"""
    
    def setUp(self):
        self.retry_manager = RetryManager(
            max_attempts=3,
            backoff_strategy=ExponentialBackoff(base=1, multiplier=2)
        )
        
    def test_successful_retry_after_failures(self):
        """Test successful retry after transient failures"""
        attempt_count = 0
        
        def flaky_operation():
            nonlocal attempt_count
            attempt_count += 1
            
            if attempt_count < 3:
                raise ConnectionError("Temporary failure")
            return "Success"
            
        result = self.retry_manager.execute(
            flaky_operation,
            retryable_exceptions=(ConnectionError,)
        )
        
        self.assertEqual(result, "Success")
        self.assertEqual(attempt_count, 3)
        
    def test_exponential_backoff_timing(self):
        """Test exponential backoff timing"""
        backoff = ExponentialBackoff(base=0.1, multiplier=2, max_delay=1)
        
        delays = []
        for attempt in range(5):
            delay = backoff.get_delay(attempt)
            delays.append(delay)
            
        # Verify exponential growth
        self.assertAlmostEqual(delays[0], 0.1, places=2)
        self.assertAlmostEqual(delays[1], 0.2, places=2)
        self.assertAlmostEqual(delays[2], 0.4, places=2)
        self.assertAlmostEqual(delays[3], 0.8, places=2)
        self.assertEqual(delays[4], 1.0)  # Max delay
        
    def test_non_retryable_error_handling(self):
        """Test handling of non-retryable errors"""
        def failing_operation():
            raise ValueError("Invalid input - not retryable")
            
        with self.assertRaises(ValueError):
            self.retry_manager.execute(
                failing_operation,
                retryable_exceptions=(ConnectionError, TimeoutError)
            )
            
        # Should not retry for non-retryable errors
        self.assertEqual(self.retry_manager.get_attempt_count(), 1)
        
    def test_max_retries_exceeded(self):
        """Test max retries exceeded scenario"""
        def always_failing():
            raise ConnectionError("Persistent failure")
            
        with self.assertRaises(MaxRetriesExceeded) as context:
            self.retry_manager.execute(
                always_failing,
                retryable_exceptions=(ConnectionError,)
            )
            
        self.assertEqual(context.exception.attempts, 3)
        self.assertIsInstance(context.exception.last_exception, ConnectionError)

class CircuitBreakerTest(TestCase):
    """Test circuit breaker pattern for cascading failure prevention"""
    
    def setUp(self):
        from apps.recovery.circuit_breaker import CircuitBreaker
        
        self.breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=5,
            expected_exception=ConnectionError
        )
        
    def test_circuit_breaker_states(self):
        """Test circuit breaker state transitions"""
        # Initial state should be closed
        self.assertEqual(self.breaker.state, 'closed')
        
        # Cause failures to open circuit
        for i in range(3):
            try:
                self.breaker.call(lambda: self._failing_service())
            except ConnectionError:
                pass
                
        # Circuit should be open
        self.assertEqual(self.breaker.state, 'open')
        
        # Calls should fail fast when open
        with self.assertRaises(Exception) as context:
            self.breaker.call(lambda: "test")
            
        self.assertIn("Circuit breaker is open", str(context.exception))
        
        # Wait for recovery timeout
        time.sleep(5)
        
        # Should transition to half-open
        self.assertEqual(self.breaker.state, 'half-open')
        
        # Successful call should close circuit
        result = self.breaker.call(lambda: "success")
        self.assertEqual(result, "success")
        self.assertEqual(self.breaker.state, 'closed')
        
    def test_circuit_breaker_metrics(self):
        """Test circuit breaker metrics collection"""
        metrics = self.breaker.get_metrics()
        
        self.assertEqual(metrics['total_calls'], 0)
        self.assertEqual(metrics['failures'], 0)
        self.assertEqual(metrics['success_rate'], 1.0)
        
        # Make some calls
        for i in range(10):
            try:
                if i < 7:
                    self.breaker.call(lambda: "success")
                else:
                    self.breaker.call(lambda: self._failing_service())
            except:
                pass
                
        metrics = self.breaker.get_metrics()
        
        self.assertEqual(metrics['total_calls'], 10)
        self.assertEqual(metrics['failures'], 3)
        self.assertEqual(metrics['success_rate'], 0.7)
        
    def _failing_service(self):
        raise ConnectionError("Service unavailable")
```

### 2. State Recovery Tests
```python
# backend/tests/unit/recovery/test_state_recovery.py
from django.test import TestCase, TransactionTestCase
from apps.recovery.state import StateManager, StateSnapshot
from apps.recovery.transactions import CompensatingTransaction
import json

class StateRecoveryTest(TransactionTestCase):
    """Test state recovery mechanisms"""
    
    def setUp(self):
        self.state_manager = StateManager()
        
    def test_state_snapshot_creation(self):
        """Test creating state snapshots"""
        # Create initial state
        reservation = ReservationFactory(
            status='pending',
            payment_status='unpaid'
        )
        
        # Take snapshot
        snapshot = self.state_manager.create_snapshot(
            entity=reservation,
            fields=['status', 'payment_status', 'amount']
        )
        
        self.assertEqual(snapshot.entity_type, 'Reservation')
        self.assertEqual(snapshot.entity_id, reservation.id)
        self.assertEqual(snapshot.state['status'], 'pending')
        self.assertEqual(snapshot.state['payment_status'], 'unpaid')
        
        # Modify state
        reservation.status = 'confirmed'
        reservation.payment_status = 'paid'
        reservation.save()
        
        # Restore from snapshot
        self.state_manager.restore_from_snapshot(snapshot)
        
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'pending')
        self.assertEqual(reservation.payment_status, 'unpaid')
        
    def test_transaction_compensation(self):
        """Test compensating transactions for rollback"""
        # Create initial data
        user = UserFactory(balance=100)
        
        # Define compensating transaction
        compensator = CompensatingTransaction()
        
        # Record original state
        compensator.record_state('user_balance', {
            'user_id': user.id,
            'balance': user.balance
        })
        
        # Perform operation
        user.balance -= 50
        user.save()
        
        compensator.record_operation('debit', {
            'user_id': user.id,
            'amount': 50
        })
        
        # Something goes wrong, need to compensate
        compensator.compensate()
        
        # Check balance restored
        user.refresh_from_db()
        self.assertEqual(user.balance, 100)
        
    def test_saga_pattern_recovery(self):
        """Test saga pattern for distributed transaction recovery"""
        from apps.recovery.saga import SagaOrchestrator, SagaStep
        
        orchestrator = SagaOrchestrator()
        
        # Define saga steps
        steps = [
            SagaStep(
                name='create_reservation',
                forward=lambda: self._create_reservation(),
                compensate=lambda id: self._cancel_reservation(id)
            ),
            SagaStep(
                name='process_payment',
                forward=lambda: self._process_payment(),
                compensate=lambda id: self._refund_payment(id)
            ),
            SagaStep(
                name='send_notification',
                forward=lambda: self._send_notification(),
                compensate=lambda: None  # No compensation needed
            )
        ]
        
        # Execute saga with failure
        with patch.object(self, '_send_notification') as mock_notify:
            mock_notify.side_effect = Exception("Notification service down")
            
            result = orchestrator.execute(steps)
            
        # Should have compensated previous steps
        self.assertFalse(result.success)
        self.assertEqual(result.failed_step, 'send_notification')
        self.assertEqual(len(result.compensated_steps), 2)
        
    def _create_reservation(self):
        return ReservationFactory().id
        
    def _cancel_reservation(self, reservation_id):
        Reservation.objects.filter(id=reservation_id).update(
            status='cancelled'
        )
        
    def _process_payment(self):
        return PaymentFactory().id
        
    def _refund_payment(self, payment_id):
        Payment.objects.filter(id=payment_id).update(
            status='refunded'
        )
        
    def _send_notification(self):
        return "notification_sent"

class ConflictResolutionTest(TestCase):
    """Test conflict resolution strategies"""
    
    def test_optimistic_locking_recovery(self):
        """Test recovery from optimistic locking conflicts"""
        from apps.recovery.locking import OptimisticLockManager
        
        manager = OptimisticLockManager()
        
        # Create versioned entity
        court = CourtFactory(version=1)
        
        # Simulate concurrent updates
        update1 = {
            'id': court.id,
            'version': 1,
            'price': 50
        }
        
        update2 = {
            'id': court.id,
            'version': 1,
            'price': 60
        }
        
        # First update succeeds
        result1 = manager.update_with_version_check(Court, update1)
        self.assertTrue(result1.success)
        
        # Second update fails due to version conflict
        result2 = manager.update_with_version_check(Court, update2)
        self.assertFalse(result2.success)
        self.assertEqual(result2.error, 'version_conflict')
        
        # Retry with latest version
        court.refresh_from_db()
        update2['version'] = court.version
        
        result3 = manager.update_with_version_check(Court, update2)
        self.assertTrue(result3.success)
        
    def test_conflict_resolution_strategies(self):
        """Test different conflict resolution strategies"""
        from apps.recovery.conflicts import ConflictResolver
        
        resolver = ConflictResolver()
        
        # Test last-write-wins strategy
        conflict = {
            'field': 'price',
            'current_value': 50,
            'update1': {'value': 60, 'timestamp': '2023-12-01T10:00:00Z'},
            'update2': {'value': 55, 'timestamp': '2023-12-01T10:00:01Z'}
        }
        
        result = resolver.resolve(conflict, strategy='last_write_wins')
        self.assertEqual(result, 55)
        
        # Test merge strategy for lists
        conflict = {
            'field': 'amenities',
            'current_value': ['parking'],
            'update1': {'value': ['parking', 'wifi'], 'timestamp': '2023-12-01T10:00:00Z'},
            'update2': {'value': ['parking', 'restaurant'], 'timestamp': '2023-12-01T10:00:01Z'}
        }
        
        result = resolver.resolve(conflict, strategy='merge_lists')
        self.assertEqual(set(result), {'parking', 'wifi', 'restaurant'})
```

### 3. Cascading Failure Prevention Tests
```python
# backend/tests/unit/recovery/test_cascading_failures.py
class CascadingFailurePreventionTest(TestCase):
    """Test prevention of cascading failures"""
    
    def test_bulkhead_pattern(self):
        """Test bulkhead pattern for failure isolation"""
        from apps.recovery.bulkhead import BulkheadManager
        
        bulkhead = BulkheadManager(
            max_concurrent_calls=10,
            timeout=5
        )
        
        # Fill up bulkhead
        active_calls = []
        for i in range(10):
            call = bulkhead.acquire()
            self.assertIsNotNone(call)
            active_calls.append(call)
            
        # Next call should be rejected
        rejected_call = bulkhead.acquire()
        self.assertIsNone(rejected_call)
        
        # Release one and try again
        bulkhead.release(active_calls[0])
        
        new_call = bulkhead.acquire()
        self.assertIsNotNone(new_call)
        
    def test_timeout_propagation_prevention(self):
        """Test prevention of timeout propagation"""
        from apps.recovery.timeout import TimeoutManager
        
        timeout_mgr = TimeoutManager()
        
        def slow_operation():
            time.sleep(10)
            return "Never completes"
            
        # Should timeout and not propagate delay
        start = time.time()
        
        with self.assertRaises(TimeoutError):
            timeout_mgr.execute_with_timeout(
                slow_operation,
                timeout=1
            )
            
        duration = time.time() - start
        
        # Should timeout quickly, not wait full 10 seconds
        self.assertLess(duration, 2)
        
    def test_resource_pool_exhaustion_handling(self):
        """Test handling of resource pool exhaustion"""
        from apps.recovery.resources import ResourcePool
        
        pool = ResourcePool(
            max_resources=5,
            acquire_timeout=1
        )
        
        # Acquire all resources
        resources = []
        for i in range(5):
            resource = pool.acquire()
            self.assertIsNotNone(resource)
            resources.append(resource)
            
        # Try to acquire when exhausted
        start = time.time()
        
        with self.assertRaises(ResourceExhausted):
            pool.acquire()
            
        duration = time.time() - start
        
        # Should fail fast after timeout
        self.assertAlmostEqual(duration, 1, places=1)
        
        # Release and verify recovery
        pool.release(resources[0])
        
        new_resource = pool.acquire()
        self.assertIsNotNone(new_resource)
```

## 🔌 Integration Tests

### 1. Service Recovery Integration
```python
# backend/tests/integration/recovery/test_service_recovery.py
from rest_framework.test import APITestCase
import requests
from unittest.mock import patch, Mock

class ServiceRecoveryIntegrationTest(APITestCase):
    """Test service recovery in integrated environment"""
    
    def test_payment_service_recovery(self):
        """Test recovery when payment service fails"""
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        # First attempt fails
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.side_effect = stripe.error.APIConnectionError(
                "Network error"
            )
            
            response = self.client.post(
                '/api/v1/reservations/',
                {
                    'court_id': CourtFactory().id,
                    'date': '2023-12-15',
                    'start_time': '10:00',
                    'duration': 60
                }
            )
            
            self.assertEqual(response.status_code, 503)
            reservation_id = response.data['reservation_id']
            
        # Verify reservation saved with pending payment
        reservation = Reservation.objects.get(id=reservation_id)
        self.assertEqual(reservation.status, 'payment_pending')
        
        # Service recovers, retry payment
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.return_value = {
                'id': 'pi_recovered',
                'client_secret': 'secret_recovered',
                'amount': 3000
            }
            
            retry_response = self.client.post(
                f'/api/v1/reservations/{reservation_id}/retry-payment/'
            )
            
            self.assertEqual(retry_response.status_code, 200)
            
        # Verify recovery
        reservation.refresh_from_db()
        self.assertEqual(reservation.payment_status, 'pending')
        self.assertIsNotNone(reservation.payment_intent_id)
        
    def test_database_failover(self):
        """Test database failover mechanism"""
        from apps.recovery.database import DatabaseFailover
        
        failover = DatabaseFailover()
        
        # Simulate primary database failure
        with patch('django.db.connections["default"].ensure_connection') as mock_conn:
            mock_conn.side_effect = Exception("Primary DB down")
            
            # Should failover to read replica
            response = self.client.get('/api/v1/clubs/')
            
            # Should still work with degraded functionality
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data.get('read_only_mode'))
            
        # Verify writes are queued
        with patch('apps.recovery.queue.WriteQueue.enqueue') as mock_queue:
            response = self.client.post(
                '/api/v1/clubs/',
                {'name': 'New Club', 'city': 'Madrid'}
            )
            
            self.assertEqual(response.status_code, 202)  # Accepted
            mock_queue.assert_called_once()
            
    def test_cache_degradation_handling(self):
        """Test graceful degradation when cache fails"""
        # Simulate cache failure
        with patch('django.core.cache.cache.get') as mock_get:
            mock_get.side_effect = Exception("Redis connection failed")
            
            # Should still work without cache
            response = self.client.get('/api/v1/clubs/popular/')
            
            self.assertEqual(response.status_code, 200)
            
            # Check degraded mode header
            self.assertEqual(
                response.headers.get('X-Cache-Status'),
                'bypass'
            )
```

### 2. Data Consistency Recovery
```python
# backend/tests/integration/recovery/test_data_consistency.py
class DataConsistencyRecoveryTest(TransactionTestCase):
    """Test data consistency recovery mechanisms"""
    
    def test_distributed_transaction_recovery(self):
        """Test recovery of distributed transactions"""
        from apps.recovery.distributed import DistributedTransactionManager
        
        dtm = DistributedTransactionManager()
        
        # Start distributed transaction
        transaction_id = dtm.begin_transaction()
        
        try:
            # Step 1: Create reservation
            reservation = dtm.execute_step(
                transaction_id,
                'create_reservation',
                lambda: Reservation.objects.create(
                    user_id=1,
                    court_id=1,
                    date='2023-12-15',
                    start_time='10:00'
                )
            )
            
            # Step 2: Process payment (fails)
            with patch('stripe.PaymentIntent.create') as mock_stripe:
                mock_stripe.side_effect = Exception("Payment failed")
                
                with self.assertRaises(Exception):
                    dtm.execute_step(
                        transaction_id,
                        'process_payment',
                        lambda: create_payment(reservation.id, 50)
                    )
                    
        except Exception:
            # Rollback distributed transaction
            dtm.rollback_transaction(transaction_id)
            
        # Verify rollback
        self.assertFalse(
            Reservation.objects.filter(id=reservation.id).exists()
        )
        
        # Verify compensation log
        compensations = dtm.get_compensation_log(transaction_id)
        self.assertEqual(len(compensations), 1)
        self.assertEqual(compensations[0]['step'], 'create_reservation')
        
    def test_eventual_consistency_recovery(self):
        """Test eventual consistency recovery"""
        from apps.recovery.consistency import EventualConsistencyManager
        
        ecm = EventualConsistencyManager()
        
        # Create inconsistent state
        club = ClubFactory(total_courts=5)
        
        # Delete courts without updating count
        Court.objects.filter(club=club).delete()
        
        # Detect inconsistency
        inconsistencies = ecm.detect_inconsistencies()
        
        self.assertGreater(len(inconsistencies), 0)
        
        club_inconsistency = next(
            i for i in inconsistencies 
            if i['entity_type'] == 'Club' and i['entity_id'] == club.id
        )
        
        self.assertEqual(
            club_inconsistency['issue'],
            'court_count_mismatch'
        )
        
        # Repair inconsistency
        ecm.repair_inconsistencies(inconsistencies)
        
        # Verify repair
        club.refresh_from_db()
        self.assertEqual(club.total_courts, 0)
```

## 🔄 E2E Flow Tests

### 1. Complete System Recovery Flow
```python
# backend/tests/e2e/recovery/test_system_recovery.py
class SystemRecoveryE2ETest(TestCase):
    """Test complete system recovery scenarios"""
    
    def test_cascading_service_failure_recovery(self):
        """Test recovery from cascading service failures"""
        # Simulate payment service failure affecting multiple operations
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.side_effect = Exception("Payment service down")
            
            # Multiple users try to make reservations
            failed_reservations = []
            
            for i in range(10):
                user = UserFactory()
                self.client.force_authenticate(user=user)
                
                response = self.client.post(
                    '/api/v1/reservations/',
                    {
                        'court_id': CourtFactory().id,
                        'date': '2023-12-15',
                        'start_time': f'{10+i}:00',
                        'duration': 60
                    }
                )
                
                if response.status_code == 503:
                    failed_reservations.append({
                        'user': user,
                        'data': response.data
                    })
                    
        # Service recovers
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_stripe.return_value = {
                'id': 'pi_recovered',
                'client_secret': 'secret',
                'amount': 3000
            }
            
            # System should automatically retry failed operations
            from apps.recovery.tasks import retry_failed_payments
            retry_failed_payments.apply()
            
        # Verify all reservations recovered
        for failed in failed_reservations:
            reservation = Reservation.objects.get(
                id=failed['data']['reservation_id']
            )
            self.assertNotEqual(reservation.payment_status, 'failed')
            
    def test_data_corruption_recovery(self):
        """Test recovery from data corruption"""
        from apps.recovery.integrity import DataIntegrityChecker
        
        checker = DataIntegrityChecker()
        
        # Simulate data corruption
        corrupted_payment = PaymentFactory(
            amount=-100,  # Invalid negative amount
            status='completed'
        )
        
        corrupted_reservation = ReservationFactory(
            start_time='25:00',  # Invalid time
            duration=-30  # Invalid duration
        )
        
        # Run integrity check
        issues = checker.run_full_check()
        
        self.assertGreater(len(issues), 0)
        
        # Attempt repair
        repair_results = checker.repair_issues(issues)
        
        # Verify repairs
        corrupted_payment.refresh_from_db()
        self.assertGreaterEqual(corrupted_payment.amount, 0)
        
        corrupted_reservation.refresh_from_db()
        self.assertNotEqual(corrupted_reservation.start_time, '25:00')
        self.assertGreater(corrupted_reservation.duration, 0)
        
    def test_disaster_recovery_procedure(self):
        """Test full disaster recovery procedure"""
        from apps.recovery.disaster import DisasterRecoveryManager
        
        drm = DisasterRecoveryManager()
        
        # Take system snapshot before disaster
        snapshot_id = drm.create_system_snapshot()
        
        # Simulate disaster - corrupt data
        Club.objects.all().update(name='CORRUPTED')
        Court.objects.all().delete()
        Reservation.objects.all().update(status='error')
        
        # Initiate disaster recovery
        recovery_result = drm.initiate_recovery(
            snapshot_id,
            recovery_point='2023-12-01T10:00:00Z'
        )
        
        # Verify system restored
        self.assertTrue(recovery_result.success)
        
        # Check data integrity
        self.assertFalse(
            Club.objects.filter(name='CORRUPTED').exists()
        )
        self.assertGreater(Court.objects.count(), 0)
        self.assertFalse(
            Reservation.objects.filter(status='error').exists()
        )
```

### 2. Performance Under Failure
```python
# backend/tests/e2e/recovery/test_performance_degradation.py
class PerformanceDegradationTest(TestCase):
    """Test system performance during failures"""
    
    def test_graceful_degradation_performance(self):
        """Test performance during graceful degradation"""
        import time
        from statistics import mean, stdev
        
        # Baseline performance
        baseline_times = []
        for _ in range(50):
            start = time.time()
            response = self.client.get('/api/v1/clubs/')
            baseline_times.append(time.time() - start)
            
        baseline_avg = mean(baseline_times)
        
        # Performance during cache failure
        degraded_times = []
        with patch('django.core.cache.cache.get') as mock_cache:
            mock_cache.side_effect = Exception("Cache unavailable")
            
            for _ in range(50):
                start = time.time()
                response = self.client.get('/api/v1/clubs/')
                degraded_times.append(time.time() - start)
                
        degraded_avg = mean(degraded_times)
        
        # Should degrade gracefully
        self.assertLess(
            degraded_avg,
            baseline_avg * 3,  # Max 3x slower
            "Performance degradation too severe"
        )
        
    def test_circuit_breaker_performance_impact(self):
        """Test circuit breaker performance impact"""
        # Cause circuit breaker to open
        for _ in range(5):
            with patch('requests.get') as mock_get:
                mock_get.side_effect = Exception("Service down")
                
                try:
                    self.client.get('/api/v1/external-data/')
                except:
                    pass
                    
        # Circuit should be open, requests should fail fast
        fast_fail_times = []
        
        for _ in range(20):
            start = time.time()
            response = self.client.get('/api/v1/external-data/')
            fast_fail_times.append(time.time() - start)
            
        # Should fail very quickly when circuit is open
        avg_fail_time = mean(fast_fail_times)
        self.assertLess(avg_fail_time, 0.01)  # Less than 10ms
```

### 3. Recovery Monitoring
```python
# backend/tests/e2e/recovery/test_recovery_monitoring.py
class RecoveryMonitoringTest(TestCase):
    """Test recovery monitoring and alerting"""
    
    def test_recovery_metrics_collection(self):
        """Test collection of recovery metrics"""
        from apps.recovery.monitoring import RecoveryMetricsCollector
        
        collector = RecoveryMetricsCollector()
        
        # Simulate various recovery events
        events = [
            {'type': 'retry_success', 'service': 'payment', 'duration': 2.5},
            {'type': 'circuit_breaker_open', 'service': 'email', 'duration': 0},
            {'type': 'failover', 'service': 'database', 'duration': 5.2},
            {'type': 'retry_failure', 'service': 'payment', 'duration': 10.0},
        ]
        
        for event in events:
            collector.record_recovery_event(event)
            
        # Get metrics
        metrics = collector.get_recovery_metrics()
        
        self.assertEqual(metrics['total_events'], 4)
        self.assertEqual(metrics['success_rate'], 0.5)
        self.assertIn('payment', metrics['by_service'])
        self.assertEqual(metrics['by_service']['payment']['attempts'], 2)
        
    def test_recovery_alerting(self):
        """Test recovery alerting mechanisms"""
        from apps.recovery.alerts import RecoveryAlertManager
        
        alert_manager = RecoveryAlertManager()
        
        # Configure alert rules
        alert_manager.add_rule(
            name='high_retry_rate',
            condition=lambda m: m['retry_rate'] > 0.3,
            severity='warning'
        )
        
        alert_manager.add_rule(
            name='circuit_breaker_open_too_long',
            condition=lambda m: m['circuit_open_duration'] > 300,
            severity='critical'
        )
        
        # Simulate conditions that trigger alerts
        metrics = {
            'retry_rate': 0.4,
            'circuit_open_duration': 360
        }
        
        alerts = alert_manager.evaluate_rules(metrics)
        
        self.assertEqual(len(alerts), 2)
        
        # Verify alert details
        critical_alerts = [a for a in alerts if a['severity'] == 'critical']
        self.assertEqual(len(critical_alerts), 1)
        self.assertEqual(
            critical_alerts[0]['name'],
            'circuit_breaker_open_too_long'
        )
```

## 🔒 Security Recovery Tests

### Security Incident Recovery
```python
# backend/tests/recovery/security/test_security_recovery.py
class SecurityIncidentRecoveryTest(TestCase):
    """Test recovery from security incidents"""
    
    def test_brute_force_attack_recovery(self):
        """Test recovery from brute force attack"""
        from apps.recovery.security import SecurityIncidentHandler
        
        handler = SecurityIncidentHandler()
        
        # Simulate brute force attack
        attacker_ip = '192.168.1.100'
        
        for i in range(100):
            self.client.post(
                '/api/v1/auth/login/',
                {
                    'email': f'user{i}@test.com',
                    'password': 'wrongpass'
                },
                REMOTE_ADDR=attacker_ip
            )
            
        # System should detect and respond
        incident = handler.detect_incident()
        
        self.assertIsNotNone(incident)
        self.assertEqual(incident['type'], 'brute_force')
        self.assertEqual(incident['source_ip'], attacker_ip)
        
        # Verify automatic response
        response = handler.respond_to_incident(incident)
        
        self.assertTrue(response['ip_blocked'])
        self.assertTrue(response['rate_limit_applied'])
        
        # Verify recovery after time period
        time.sleep(handler.block_duration)
        
        # Should be unblocked
        test_response = self.client.get(
            '/api/v1/health/',
            REMOTE_ADDR=attacker_ip
        )
        
        self.assertEqual(test_response.status_code, 200)
        
    def test_data_breach_recovery(self):
        """Test recovery from potential data breach"""
        from apps.recovery.security import DataBreachHandler
        
        handler = DataBreachHandler()
        
        # Simulate suspicious data access
        user = UserFactory(is_staff=True)
        self.client.force_authenticate(user=user)
        
        # Mass data export attempt
        for model in ['users', 'payments', 'reservations']:
            self.client.get(
                f'/api/v1/admin/export/{model}/',
                {'limit': 100000}
            )
            
        # Detect breach
        breach = handler.detect_data_breach()
        
        self.assertTrue(breach['detected'])
        self.assertEqual(breach['user_id'], user.id)
        
        # Initiate recovery
        recovery = handler.initiate_breach_recovery(breach)
        
        # Verify recovery actions
        self.assertTrue(recovery['user_suspended'])
        self.assertTrue(recovery['tokens_revoked'])
        self.assertTrue(recovery['audit_log_created'])
        
        # Verify user access revoked
        user.refresh_from_db()
        self.assertFalse(user.is_active)
```

## 📊 Recovery Metrics

### Recovery Performance Metrics
```python
# backend/tests/recovery/metrics/test_recovery_metrics.py
class RecoveryMetricsTest(TestCase):
    """Test recovery metrics collection and analysis"""
    
    def test_mttr_calculation(self):
        """Test Mean Time To Recovery calculation"""
        from apps.recovery.metrics import MTTRCalculator
        
        calculator = MTTRCalculator()
        
        # Record incidents
        incidents = [
            {
                'start': '2023-12-01T10:00:00Z',
                'detected': '2023-12-01T10:05:00Z',
                'resolved': '2023-12-01T10:30:00Z'
            },
            {
                'start': '2023-12-02T14:00:00Z',
                'detected': '2023-12-02T14:02:00Z',
                'resolved': '2023-12-02T14:20:00Z'
            }
        ]
        
        for incident in incidents:
            calculator.record_incident(incident)
            
        # Calculate MTTR
        mttr = calculator.calculate_mttr()
        
        self.assertEqual(mttr['mean_time_to_detect'], 3.5)  # minutes
        self.assertEqual(mttr['mean_time_to_resolve'], 24)  # minutes
        self.assertEqual(mttr['total_mttr'], 27.5)  # minutes
        
    def test_recovery_success_rate(self):
        """Test recovery success rate metrics"""
        from apps.recovery.metrics import RecoverySuccessTracker
        
        tracker = RecoverySuccessTracker()
        
        # Record recovery attempts
        attempts = [
            {'id': 1, 'type': 'retry', 'success': True},
            {'id': 2, 'type': 'failover', 'success': True},
            {'id': 3, 'type': 'retry', 'success': False},
            {'id': 4, 'type': 'compensation', 'success': True},
        ]
        
        for attempt in attempts:
            tracker.record_attempt(attempt)
            
        # Get success rates
        rates = tracker.get_success_rates()
        
        self.assertEqual(rates['overall'], 0.75)
        self.assertEqual(rates['by_type']['retry'], 0.5)
        self.assertEqual(rates['by_type']['failover'], 1.0)
```

## 🎯 Test Execution Commands

### Run All Recovery Tests
```bash
# Unit tests
pytest tests/unit/recovery/ -v

# Integration tests
pytest tests/integration/recovery/ -v

# E2E tests
pytest tests/e2e/recovery/ -v

# All recovery tests
pytest tests/ -k recovery -v

# With coverage
pytest tests/ -k recovery --cov=apps.recovery --cov-report=html
```

### Simulate Failure Scenarios
```bash
# Simulate database failure
python manage.py simulate_failure --type=database --duration=60

# Simulate service failures
python manage.py simulate_failure --type=payment --duration=30

# Simulate network issues
python manage.py simulate_failure --type=network --packet-loss=0.1

# Run chaos testing
python manage.py chaos_test --scenario=cascading_failure
```

### Recovery Monitoring Commands
```bash
# Check recovery metrics
python manage.py recovery_metrics --period=7d

# View incident history
python manage.py incident_report --days=30

# Test disaster recovery
python manage.py test_dr --dry-run

# Validate recovery procedures
python manage.py validate_recovery --all
```

---

**Siguiente**: [Accessibility Compliance Tests](24-Accessibility-Compliance-Tests.md) →