"""
Comprehensive integration tests for reservations module.
Focuses on concurrency, double-booking prevention, and system reliability.
Based on the successful clubs module integration test pattern.
"""

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError, connection
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from apps.reservations.models import Reservation, BlockedSlot
from apps.reservations.mixins import ReservationSafetyMixin
from apps.reservations.validators import ReservationIntegrityValidator
from apps.reservations.circuit_breakers import reservation_circuit_breaker, ReservationCircuitBreakerError
from apps.reservations.health import get_reservation_health_status
from apps.clubs.models import Club, Court
from apps.root.models import Organization

logger = logging.getLogger(__name__)
User = get_user_model()


class ReservationConcurrencyTests(TransactionTestCase):
    """
    Tests for concurrent reservation operations and double-booking prevention.
    """
    
    def setUp(self):
        """Set up test data for concurrency tests."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            email="test@club.com",
            phone="123456789",
            organization=self.organization,
            opening_time="06:00:00",
            closing_time="23:00:00"
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            number=1,
            club=self.club,
            organization=self.organization,
            price_per_hour=Decimal('50.00'),
            surface_type="padel",
            is_active=True
        )
        
        self.user1 = User.objects.create_user(
            username="testuser1",
            email="test1@example.com",
            password="testpass"
        )
        
        self.user2 = User.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass"
        )
        
        self.reservation_data = {
            'organization': self.organization,
            'club': self.club,
            'court': self.court,
            'datetime_start': timezone.now() + timedelta(hours=1),
            'datetime_end': timezone.now() + timedelta(hours=2),
            'status': 'confirmed',
            'payment_status': 'pending',
            'reservation_type': 'single',
            'player_count': 2,
            'total_amount': Decimal('50.00'),
            'user': self.user1,
            'created_by': self.user1
        }
    
    def test_concurrent_reservation_creation_prevention(self):
        """Test that concurrent reservation creation prevents double booking."""
        
        def create_reservation(user_id, reservation_data):
            """Helper function to create reservation in thread."""
            try:
                # Add some randomness to increase chance of race condition
                time.sleep(0.01 + (user_id * 0.005))
                
                with transaction.atomic():
                    mixin = ReservationSafetyMixin()
                    
                    # Modify data for this thread
                    thread_data = reservation_data.copy()
                    thread_data['user'] = User.objects.get(id=user_id)
                    thread_data['created_by'] = thread_data['user']
                    
                    reservation = mixin.create_reservation_atomic(thread_data)
                    return {'success': True, 'reservation_id': reservation.id}
                    
            except ValidationError as e:
                return {'success': False, 'error': str(e)}
            except Exception as e:
                return {'success': False, 'error': f'Unexpected error: {str(e)}'}
        
        # Run multiple threads trying to create reservations at the same time
        results = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            # Submit 10 concurrent reservation creation attempts
            for i in range(10):
                user_id = self.user1.id if i < 5 else self.user2.id
                future = executor.submit(create_reservation, user_id, self.reservation_data)
                futures.append(future)
            
            # Collect results
            for future in as_completed(futures):
                results.append(future.result())
        
        # Analyze results
        successful_creations = [r for r in results if r['success']]
        failed_creations = [r for r in results if not r['success']]
        
        # Should have exactly one successful creation
        self.assertEqual(len(successful_creations), 1, 
                         f"Expected exactly 1 successful creation, got {len(successful_creations)}")
        
        # All other attempts should fail with validation error
        self.assertEqual(len(failed_creations), 9,
                         f"Expected 9 failed attempts, got {len(failed_creations)}")
        
        # Verify the failure reason is related to double booking
        double_booking_errors = [
            r for r in failed_creations 
            if 'already booked' in r.get('error', '').lower() or 'overlap' in r.get('error', '').lower()
        ]
        
        self.assertGreater(len(double_booking_errors), 0, 
                          "Expected at least some failures due to double booking prevention")
        
        # Verify only one reservation exists in database
        reservation_count = Reservation.objects.filter(
            court=self.court,
            datetime_start=self.reservation_data['datetime_start']
        ).count()
        
        self.assertEqual(reservation_count, 1, "Only one reservation should exist in database")
    
    def test_concurrent_availability_checks(self):
        """Test concurrent availability checks under load."""
        
        def check_availability():
            """Helper function to check availability in thread."""
            try:
                mixin = ReservationSafetyMixin()
                result = mixin.prevent_double_booking(
                    self.court,
                    self.reservation_data['datetime_start'],
                    self.reservation_data['datetime_end']
                )
                return {'success': True, 'available': result}
                
            except ValidationError:
                return {'success': True, 'available': False}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        # First, create a reservation
        Reservation.objects.create(**self.reservation_data)
        
        # Now run concurrent availability checks
        results = []
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(check_availability) for _ in range(50)]
            
            for future in as_completed(futures):
                results.append(future.result())
        
        # All checks should be successful
        successful_checks = [r for r in results if r['success']]
        self.assertEqual(len(successful_checks), 50, "All availability checks should succeed")
        
        # All should report unavailable (since we created a reservation)
        available_slots = [r for r in successful_checks if r.get('available', False)]
        self.assertEqual(len(available_slots), 0, "No slots should be available")
    
    def test_concurrent_reservation_updates(self):
        """Test concurrent updates to the same reservation."""
        
        # Create initial reservation
        reservation = Reservation.objects.create(**self.reservation_data)
        
        def update_reservation(field_name, value):
            """Helper function to update reservation in thread."""
            try:
                time.sleep(0.01)  # Small delay to increase race condition chance
                
                with transaction.atomic():
                    # Use select_for_update to prevent race conditions
                    locked_reservation = Reservation.objects.select_for_update().get(id=reservation.id)
                    setattr(locked_reservation, field_name, value)
                    locked_reservation.save()
                    
                return {'success': True, 'field': field_name, 'value': value}
                
            except Exception as e:
                return {'success': False, 'error': str(e), 'field': field_name}
        
        # Run concurrent updates
        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(update_reservation, 'notes', f'Updated by thread {i}')
                for i in range(10)
            ]
            
            for future in as_completed(futures):
                results.append(future.result())
        
        # All updates should be successful
        successful_updates = [r for r in results if r['success']]
        self.assertEqual(len(successful_updates), 10, "All updates should succeed")
        
        # Verify final state is consistent
        updated_reservation = Reservation.objects.get(id=reservation.id)
        self.assertIsNotNone(updated_reservation.notes)
        self.assertIn('Updated by thread', updated_reservation.notes)
    
    def test_concurrent_cancellations(self):
        """Test concurrent cancellation attempts on the same reservation."""
        
        # Create reservation
        reservation = Reservation.objects.create(**self.reservation_data)
        
        def cancel_reservation():
            """Helper function to cancel reservation in thread."""
            try:
                mixin = ReservationSafetyMixin()
                result = mixin.cancel_reservation_safe(reservation, 'concurrent_test')
                return {'success': True, 'reservation_id': result.id, 'status': result.status}
                
            except ValidationError as e:
                return {'success': False, 'error': str(e)}
            except Exception as e:
                return {'success': False, 'error': f'Unexpected: {str(e)}'}
        
        # Run concurrent cancellation attempts
        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(cancel_reservation) for _ in range(10)]
            
            for future in as_completed(futures):
                results.append(future.result())
        
        # Only one should succeed, others should fail gracefully
        successful_cancellations = [r for r in results if r['success']]
        failed_cancellations = [r for r in results if not r['success']]
        
        # At least one should succeed
        self.assertGreaterEqual(len(successful_cancellations), 1, "At least one cancellation should succeed")
        
        # Failed ones should have appropriate error messages
        for failed in failed_cancellations:
            self.assertIn('cancel', failed['error'].lower())
        
        # Verify final state
        final_reservation = Reservation.objects.get(id=reservation.id)
        self.assertEqual(final_reservation.status, 'cancelled')


class ReservationIntegrationTests(TestCase):
    """
    Integration tests for reservation system components.
    """
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        self.club = Club.objects.create(
            name="Integration Test Club",
            slug="integration-club",
            email="integration@club.com",
            phone="987654321",
            organization=self.organization
        )
        
        self.court = Court.objects.create(
            name="Integration Court",
            number=1,
            club=self.club,
            organization=self.organization,
            price_per_hour=Decimal('60.00'),
            surface_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            username="integrationuser",
            email="integration@example.com",
            password="testpass"
        )
    
    def test_end_to_end_reservation_flow(self):
        """Test complete reservation lifecycle."""
        
        # Step 1: Create reservation using safety mixin
        mixin = ReservationSafetyMixin()
        
        reservation_data = {
            'organization': self.organization,
            'club': self.club,
            'court': self.court,
            'datetime_start': timezone.now() + timedelta(hours=2),
            'datetime_end': timezone.now() + timedelta(hours=3),
            'status': 'confirmed',
            'payment_status': 'pending',
            'reservation_type': 'single',
            'player_count': 4,
            'total_amount': Decimal('60.00'),
            'user': self.user,
            'created_by': self.user
        }
        
        reservation = mixin.create_reservation_atomic(reservation_data)
        self.assertIsNotNone(reservation.id)
        
        # Step 2: Validate reservation with comprehensive validator
        validator = ReservationIntegrityValidator(reservation)
        validation_result = validator.validate_all()
        
        self.assertTrue(validation_result['is_valid'], 
                       f"Reservation should be valid: {validation_result['errors']}")
        
        # Step 3: Test price calculation
        price_info = mixin.calculate_reservation_price_safe(
            self.court,
            reservation.datetime_start,
            reservation.datetime_end,
            4
        )
        
        self.assertIsInstance(price_info['total_price'], Decimal)
        self.assertGreater(price_info['total_price'], Decimal('0'))
        
        # Step 4: Test double booking prevention
        with self.assertRaises(ValidationError):
            mixin.prevent_double_booking(
                self.court,
                reservation.datetime_start,
                reservation.datetime_end
            )
        
        # Step 5: Update reservation
        updated_reservation = mixin.cancel_reservation_safe(
            reservation, 
            'integration_test'
        )
        
        self.assertEqual(updated_reservation.status, 'cancelled')
        self.assertIsNotNone(updated_reservation.cancelled_at)
    
    def test_circuit_breaker_integration(self):
        """Test circuit breaker functionality."""
        
        # Test availability circuit breaker
        court = self.court
        date = (timezone.now() + timedelta(days=1)).date()
        start_time = time(10, 0)
        end_time = time(11, 0)
        
        # Should work normally
        result = reservation_circuit_breaker.check_availability_with_breaker(
            court, date, start_time, end_time
        )
        
        self.assertIsNotNone(result)
        
        # Test circuit breaker status
        health_status = reservation_circuit_breaker.get_health_status()
        
        self.assertIn('overall_healthy', health_status)
        self.assertIn('total_breakers', health_status)
        
        # Test individual circuit breaker stats
        availability_breaker = reservation_circuit_breaker.get_breaker('availability_check')
        stats = availability_breaker.get_stats()
        
        self.assertEqual(stats['state'], 'closed')
        self.assertEqual(stats['failure_count'], 0)
    
    def test_health_monitoring_integration(self):
        """Test health monitoring system."""
        
        health_status = get_reservation_health_status()
        
        # Check basic structure
        self.assertIn('overall_healthy', health_status)
        self.assertIn('detailed_results', health_status)
        self.assertIn('timestamp', health_status)
        
        # Check individual health checks
        detailed_results = health_status['detailed_results']
        
        expected_checks = [
            'database_connectivity',
            'reservation_operations',
            'availability_system',
            'circuit_breakers',
            'cache_system'
        ]
        
        for check_name in expected_checks:
            self.assertIn(check_name, detailed_results, f"Missing health check: {check_name}")
            
            check_result = detailed_results[check_name]
            self.assertIn('healthy', check_result)
            self.assertIn('message', check_result)
        
        # Database connectivity should be healthy
        db_check = detailed_results['database_connectivity']
        self.assertTrue(db_check['healthy'], "Database connectivity should be healthy")
    
    def test_cache_integration(self):
        """Test cache integration with reservation operations."""
        
        mixin = ReservationSafetyMixin()
        
        # Test cache invalidation on reservation creation
        reservation_data = {
            'organization': self.organization,
            'club': self.club,
            'court': self.court,
            'datetime_start': timezone.now() + timedelta(hours=1),
            'datetime_end': timezone.now() + timedelta(hours=2),
            'status': 'confirmed',
            'payment_status': 'pending',
            'reservation_type': 'single',
            'player_count': 2,
            'total_amount': Decimal('60.00'),
            'user': self.user,
            'created_by': self.user
        }
        
        # Create reservation (should invalidate cache)
        reservation = mixin.create_reservation_atomic(reservation_data)
        
        # Test that cache is properly managed
        # This would be more comprehensive with actual cache inspection
        self.assertIsNotNone(reservation.id)
        
        # Test cache invalidation on cancellation
        cancelled_reservation = mixin.cancel_reservation_safe(reservation, 'cache_test')
        self.assertEqual(cancelled_reservation.status, 'cancelled')
    
    def test_multi_tenant_isolation(self):
        """Test that multi-tenant isolation works correctly."""
        
        # Create another organization
        other_org = Organization.objects.create(
            name="Other Organization",
            slug="other-org"
        )
        
        other_club = Club.objects.create(
            name="Other Club",
            slug="other-club",
            email="other@club.com",
            phone="111111111",
            organization=other_org
        )
        
        other_court = Court.objects.create(
            name="Other Court",
            number=1,
            club=other_club,
            organization=other_org,
            price_per_hour=Decimal('70.00'),
            surface_type="padel",
            is_active=True
        )
        
        # Create reservations in both organizations
        mixin = ReservationSafetyMixin()
        
        datetime_start = timezone.now() + timedelta(hours=1)
        datetime_end = timezone.now() + timedelta(hours=2)
        
        # First org reservation
        reservation1 = mixin.create_reservation_atomic({
            'organization': self.organization,
            'club': self.club,
            'court': self.court,
            'datetime_start': datetime_start,
            'datetime_end': datetime_end,
            'status': 'confirmed',
            'payment_status': 'pending',
            'reservation_type': 'single',
            'player_count': 2,
            'total_amount': Decimal('60.00'),
            'user': self.user,
            'created_by': self.user
        })
        
        # Second org reservation (should not conflict)
        reservation2 = mixin.create_reservation_atomic({
            'organization': other_org,
            'club': other_club,
            'court': other_court,
            'datetime_start': datetime_start,
            'datetime_end': datetime_end,
            'status': 'confirmed',
            'payment_status': 'pending',
            'reservation_type': 'single',
            'player_count': 2,
            'total_amount': Decimal('70.00'),
            'user': self.user,
            'created_by': self.user
        })
        
        self.assertNotEqual(reservation1.organization, reservation2.organization)
        self.assertNotEqual(reservation1.club, reservation2.club)
        self.assertNotEqual(reservation1.court, reservation2.court)
        
        # Both should be valid
        validator1 = ReservationIntegrityValidator(reservation1)
        validator2 = ReservationIntegrityValidator(reservation2)
        
        result1 = validator1.validate_all()
        result2 = validator2.validate_all()
        
        self.assertTrue(result1['is_valid'], "First reservation should be valid")
        self.assertTrue(result2['is_valid'], "Second reservation should be valid")


class ReservationStressTests(TransactionTestCase):
    """
    Stress tests for reservation system under high load.
    """
    
    def setUp(self):
        """Set up test data for stress tests."""
        self.organization = Organization.objects.create(
            name="Stress Test Organization",
            slug="stress-test-org"
        )
        
        self.club = Club.objects.create(
            name="Stress Test Club",
            slug="stress-test-club",
            email="stress@club.com",
            phone="555555555",
            organization=self.organization
        )
        
        # Create multiple courts for stress testing
        self.courts = []
        for i in range(5):
            court = Court.objects.create(
                name=f"Stress Court {i+1}",
                number=i+1,
                club=self.club,
                organization=self.organization,
                price_per_hour=Decimal('50.00'),
                surface_type="padel",
                is_active=True
            )
            self.courts.append(court)
        
        # Create multiple users
        self.users = []
        for i in range(10):
            user = User.objects.create_user(
                username=f"stressuser{i}",
                email=f"stress{i}@example.com",
                password="testpass"
            )
            self.users.append(user)
    
    def test_high_volume_concurrent_reservations(self):
        """Test system behavior under high volume of concurrent reservations."""
        
        def create_random_reservation(court_index, user_index, hour_offset):
            """Create a reservation with random parameters."""
            try:
                court = self.courts[court_index % len(self.courts)]
                user = self.users[user_index % len(self.users)]
                
                start_time = timezone.now() + timedelta(hours=hour_offset)
                end_time = start_time + timedelta(hours=1)
                
                reservation_data = {
                    'organization': self.organization,
                    'club': self.club,
                    'court': court,
                    'datetime_start': start_time,
                    'datetime_end': end_time,
                    'status': 'confirmed',
                    'payment_status': 'pending',
                    'reservation_type': 'single',
                    'player_count': 2,
                    'total_amount': Decimal('50.00'),
                    'user': user,
                    'created_by': user
                }
                
                mixin = ReservationSafetyMixin()
                reservation = mixin.create_reservation_atomic(reservation_data)
                
                return {'success': True, 'reservation_id': str(reservation.id)}
                
            except ValidationError as e:
                return {'success': False, 'error': 'validation', 'message': str(e)}
            except Exception as e:
                return {'success': False, 'error': 'unexpected', 'message': str(e)}
        
        # Create 100 concurrent reservation attempts
        results = []
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = []
            
            for i in range(100):
                court_index = i % len(self.courts)
                user_index = i % len(self.users)
                hour_offset = 1 + (i % 48)  # Spread across 48 hours
                
                future = executor.submit(
                    create_random_reservation, 
                    court_index, 
                    user_index, 
                    hour_offset
                )
                futures.append(future)
            
            # Collect results
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=30)  # 30 second timeout
                    results.append(result)
                except Exception as e:
                    results.append({
                        'success': False, 
                        'error': 'timeout', 
                        'message': str(e)
                    })
        
        # Analyze results
        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        
        # Should have some successful reservations
        self.assertGreater(len(successful), 0, "Should have at least some successful reservations")
        
        # Failures should be due to business logic, not system errors
        validation_failures = [r for r in failed if r.get('error') == 'validation']
        system_errors = [r for r in failed if r.get('error') not in ['validation', 'timeout']]
        
        # Should not have many system errors
        error_rate = len(system_errors) / len(results)
        self.assertLess(error_rate, 0.1, f"System error rate too high: {error_rate:.2%}")
        
        print(f"Stress test results: {len(successful)} successful, {len(failed)} failed")
        print(f"Validation failures: {len(validation_failures)}, System errors: {len(system_errors)}")
    
    def test_circuit_breaker_under_stress(self):
        """Test circuit breaker behavior under stress conditions."""
        
        # Simulate circuit breaker opening due to failures
        availability_breaker = reservation_circuit_breaker.get_breaker('availability_check')
        
        # Force some failures to test circuit breaker
        with patch.object(availability_breaker, 'call_with_breaker') as mock_call:
            mock_call.side_effect = ReservationCircuitBreakerError("Simulated failure")
            
            # Multiple calls should trigger circuit breaker
            for i in range(10):
                try:
                    reservation_circuit_breaker.check_availability_with_breaker(
                        self.courts[0], 
                        timezone.now().date(), 
                        time(10, 0), 
                        time(11, 0)
                    )
                except ReservationCircuitBreakerError:
                    pass  # Expected
        
        # Check circuit breaker status
        stats = availability_breaker.get_stats()
        
        # Circuit should be open or have recorded failures
        self.assertTrue(
            stats['state'] == 'open' or stats['failure_count'] > 0,
            "Circuit breaker should have recorded failures"
        )


# Performance benchmark tests
class ReservationPerformanceTests(TestCase):
    """
    Performance benchmark tests for reservation operations.
    """
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        # Create test data
        cls.organization = Organization.objects.create(
            name="Performance Test Org",
            slug="perf-test-org"
        )
        
        cls.club = Club.objects.create(
            name="Performance Test Club",
            slug="perf-test-club",
            email="perf@club.com",
            phone="999999999",
            organization=cls.organization
        )
        
        cls.court = Court.objects.create(
            name="Performance Court",
            number=1,
            club=cls.club,
            organization=cls.organization,
            price_per_hour=Decimal('50.00'),
            surface_type="padel",
            is_active=True
        )
        
        cls.user = User.objects.create_user(
            username="perfuser",
            email="perf@example.com",
            password="testpass"
        )
    
    def test_reservation_creation_performance(self):
        """Benchmark reservation creation performance."""
        
        mixin = ReservationSafetyMixin()
        creation_times = []
        
        for i in range(10):  # Create 10 reservations
            start_time = time.time()
            
            reservation_data = {
                'organization': self.organization,
                'club': self.club,
                'court': self.court,
                'datetime_start': timezone.now() + timedelta(hours=i+1),
                'datetime_end': timezone.now() + timedelta(hours=i+2),
                'status': 'confirmed',
                'payment_status': 'pending',
                'reservation_type': 'single',
                'player_count': 2,
                'total_amount': Decimal('50.00'),
                'user': self.user,
                'created_by': self.user
            }
            
            reservation = mixin.create_reservation_atomic(reservation_data)
            
            end_time = time.time()
            creation_times.append(end_time - start_time)
            
            self.assertIsNotNone(reservation.id)
        
        # Analyze performance
        avg_time = sum(creation_times) / len(creation_times)
        max_time = max(creation_times)
        
        print(f"Reservation creation - Average: {avg_time:.3f}s, Max: {max_time:.3f}s")
        
        # Performance thresholds
        self.assertLess(avg_time, 1.0, "Average creation time should be under 1 second")
        self.assertLess(max_time, 2.0, "Max creation time should be under 2 seconds")
    
    def test_availability_check_performance(self):
        """Benchmark availability checking performance."""
        
        mixin = ReservationSafetyMixin()
        check_times = []
        
        for i in range(20):  # Perform 20 availability checks
            start_time = time.time()
            
            datetime_start = timezone.now() + timedelta(hours=i+10)
            datetime_end = datetime_start + timedelta(hours=1)
            
            try:
                mixin.prevent_double_booking(self.court, datetime_start, datetime_end)
            except ValidationError:
                pass  # Expected for some checks
            
            end_time = time.time()
            check_times.append(end_time - start_time)
        
        # Analyze performance
        avg_time = sum(check_times) / len(check_times)
        max_time = max(check_times)
        
        print(f"Availability check - Average: {avg_time:.3f}s, Max: {max_time:.3f}s")
        
        # Performance thresholds
        self.assertLess(avg_time, 0.5, "Average check time should be under 0.5 seconds")
        self.assertLess(max_time, 1.0, "Max check time should be under 1 second")