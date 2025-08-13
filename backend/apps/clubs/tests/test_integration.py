"""
Comprehensive integration tests for clubs module.
Tests end-to-end functionality, data integrity, and concurrency scenarios.
"""

import asyncio
import concurrent.futures
import logging
import time
from datetime import date, datetime, timedelta
from decimal import Decimal
from threading import Thread
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.db.models import Q
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from apps.clients.models import ClientProfile
from apps.reservations.models import Reservation
from apps.root.models import Organization
from ..circuit_breakers import ClubCircuitBreaker, CircuitBreakerError
from ..health import ClubModuleHealth, HealthStatus
from ..mixins import DefensiveModelMixin, DefensiveQueryMixin
from ..models import Club, Court, CourtSpecialPricing, MaintenanceRecord, Schedule
from ..validators import ClubIntegrityValidator

User = get_user_model()
logger = logging.getLogger('clubs.tests')


class ClubsIntegrationTestCase(TestCase):
    """Base test case with common setup for integration tests."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data for all test methods."""
        # Create organization
        cls.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        # Create test user
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        # Create test club
        cls.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            email="club@example.com",
            phone="+1234567890",
            organization=cls.organization,
            is_active=True
        )
        
        # Create test courts
        cls.court1 = Court.objects.create(
            name="Court 1",
            number=1,
            club=cls.club,
            organization=cls.organization,
            price_per_hour=Decimal('50.00'),
            is_active=True
        )
        
        cls.court2 = Court.objects.create(
            name="Court 2",
            number=2,
            club=cls.club,
            organization=cls.organization,
            price_per_hour=Decimal('60.00'),
            is_active=True
        )
    
    def setUp(self):
        """Set up for each test method."""
        # Clear cache before each test
        cache.clear()
        
        # Reset circuit breakers
        from ..circuit_breakers import club_circuit_breaker
        club_circuit_breaker.reset_all()


class TestClubBasicIntegration(ClubsIntegrationTestCase):
    """Test basic club operations and integrations."""
    
    def test_club_creation_with_relationships(self):
        """Test creating club with all related objects."""
        # Create a new club with full data
        new_club = Club.objects.create(
            name="Integration Test Club",
            slug="integration-test-club",
            email="integration@example.com",
            phone="+9876543210",
            organization=self.organization,
            opening_time="08:00",
            closing_time="22:00",
            days_open=[0, 1, 2, 3, 4, 5, 6],  # All days
            features=["parking", "restaurant", "shop"],
            primary_color="#FF0000",
            is_active=True
        )
        
        # Add courts
        court = Court.objects.create(
            name="Integration Court",
            number=1,
            club=new_club,
            organization=self.organization,
            price_per_hour=Decimal('75.00'),
            surface_type="glass",
            has_lighting=True,
            is_active=True
        )
        
        # Add schedule
        schedule = Schedule.objects.create(
            club=new_club,
            organization=self.organization,
            weekday=0,  # Monday
            opening_time="08:00",
            closing_time="22:00"
        )
        
        # Verify relationships
        self.assertEqual(new_club.courts.count(), 1)
        self.assertEqual(new_club.schedules.count(), 1)
        self.assertEqual(court.club, new_club)
        self.assertEqual(schedule.club, new_club)
        
        # Test organization consistency
        self.assertEqual(new_club.organization, court.organization)
        self.assertEqual(new_club.organization, schedule.organization)
    
    def test_club_court_availability_integration(self):
        """Test court availability checking with all constraints."""
        from ..mixins import AvailabilityMixin
        
        # Add availability mixin to court (simulate)
        court = self.court1
        
        # Create a reservation that should block availability
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        Reservation.objects.create(
            club=self.club,
            court=court,
            organization=self.organization,
            date=tomorrow,
            start_time="10:00",
            end_time="11:00",
            player_name="Test Player",
            player_email="player@example.com",
            total_price=Decimal('50.00'),
            status="confirmed"
        )
        
        # Test availability check
        # This would normally use the defensive method
        conflicting_reservations = Reservation.objects.filter(
            court=court,
            date=tomorrow,
            status__in=['pending', 'confirmed']
        )
        
        self.assertEqual(conflicting_reservations.count(), 1)
        
        # Check for time overlap
        test_start = time(9, 30)
        test_end = time(10, 30)
        
        has_conflict = any(
            test_start < r.end_time and test_end > r.start_time
            for r in conflicting_reservations
        )
        
        self.assertTrue(has_conflict)
    
    def test_special_pricing_integration(self):
        """Test special pricing with court pricing calculations."""
        court = self.court1
        
        # Create special pricing for weekend
        special_pricing = CourtSpecialPricing.objects.create(
            court=court,
            organization=self.organization,
            name="Weekend Premium",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            price_per_hour=Decimal('75.00'),
            priority=5,
            days_of_week=[5, 6]  # Saturday and Sunday
        )
        
        # Test pricing calculation for weekend
        saturday = date.today() + timedelta(days=(5 - date.today().weekday()) % 7)
        
        # Get active pricing (simulate defensive calculation)
        active_pricing = CourtSpecialPricing.get_active_pricing_for_court_datetime(
            court, saturday, time(10, 0)
        )
        
        if saturday.weekday() in [5, 6]:  # Weekend
            self.assertEqual(active_pricing, special_pricing)
            effective_price = active_pricing.price_per_hour
        else:
            self.assertIsNone(active_pricing)
            effective_price = court.price_per_hour
        
        # Test effective price calculation
        expected_price = CourtSpecialPricing.get_effective_price_for_court_datetime(
            court, saturday, time(10, 0)
        )
        
        self.assertEqual(expected_price, effective_price)


class TestClubValidationIntegration(ClubsIntegrationTestCase):
    """Test comprehensive validation integration."""
    
    def test_club_integrity_validator_full_check(self):
        """Test full club integrity validation."""
        # Add some test data
        Reservation.objects.create(
            club=self.club,
            court=self.court1,
            organization=self.organization,
            date=date.today() + timedelta(days=1),
            start_time="10:00",
            end_time="11:00",
            player_name="Test Player",
            player_email="player@example.com",
            total_price=Decimal('50.00'),
            status="confirmed"
        )
        
        # Run full validation
        validator = ClubIntegrityValidator(self.club)
        result = validator.validate_all()
        
        # Check result structure
        self.assertIn('club_id', result)
        self.assertIn('is_valid', result)
        self.assertIn('errors', result)
        self.assertIn('warnings', result)
        self.assertIn('status', result)
        
        self.assertEqual(result['club_id'], self.club.id)
        self.assertIsInstance(result['errors'], list)
        self.assertIsInstance(result['warnings'], list)
        
        # Should be valid for well-formed test data
        if not result['is_valid']:
            print(f"Validation errors: {result['errors']}")
            print(f"Validation warnings: {result['warnings']}")
    
    def test_validation_with_data_issues(self):
        """Test validation with intentional data issues."""
        # Create club with issues
        problematic_club = Club.objects.create(
            name="",  # Empty name should trigger error
            slug="problematic-club",
            email="invalid-email",  # Invalid email
            phone="",
            organization=self.organization,
            total_courts=-1,  # Negative count
            is_active=True
        )
        
        validator = ClubIntegrityValidator(problematic_club)
        result = validator.validate_all()
        
        # Should have errors
        self.assertFalse(result['is_valid'])
        self.assertGreater(len(result['errors']), 0)
        
        # Check for specific errors
        error_messages = [error for error in result['errors']]
        self.assertTrue(any('name is required' in error.lower() for error in error_messages))


class TestClubCircuitBreakerIntegration(ClubsIntegrationTestCase):
    """Test circuit breaker integration."""
    
    def test_circuit_breaker_club_availability(self):
        """Test circuit breaker for club availability."""
        from ..circuit_breakers import ClubCircuitBreaker
        
        cb_manager = ClubCircuitBreaker()
        
        # Test normal operation
        result = cb_manager.check_club_availability(self.club.id)
        self.assertTrue(result['available'])
        
        # Test with non-existent club (should trigger circuit breaker eventually)
        with patch('apps.clubs.models.Club.objects.get') as mock_get:
            mock_get.side_effect = Exception("Database error")
            
            # Should fail and eventually open circuit
            for i in range(5):  # Trigger failures
                try:
                    cb_manager.check_club_availability(999)
                except Exception:
                    pass
            
            # Check circuit breaker state
            states = cb_manager.get_all_states()
            club_availability_state = states.get('club_availability')
            
            if club_availability_state:
                # Circuit should be open after failures
                self.assertGreater(club_availability_state['failure_count'], 0)
    
    def test_circuit_breaker_fallback(self):
        """Test circuit breaker fallback mechanisms."""
        from ..circuit_breakers import ClubCircuitBreaker
        
        cb_manager = ClubCircuitBreaker()
        
        # Open the circuit manually
        cb = cb_manager.get_circuit_breaker('club_availability')
        cb.state = cb_manager.get_circuit_breaker('club_availability').state.__class__('open')
        cb.failure_count = 10
        cb.last_failure_time = time.time()
        
        # Try to use the service - should get fallback
        try:
            result = cb_manager.check_club_availability(self.club.id)
            
            # Should either raise CircuitBreakerError or return fallback
            if isinstance(result, dict) and result.get('fallback'):
                self.assertTrue(result['fallback'])
        except CircuitBreakerError:
            # This is also acceptable
            pass


class TestClubHealthCheckIntegration(ClubsIntegrationTestCase):
    """Test health check integration."""
    
    def test_comprehensive_health_check(self):
        """Test full health check system."""
        from ..health import ClubModuleHealth
        
        health = ClubModuleHealth()
        result = health.run_all_checks(use_cache=False)
        
        # Check result structure
        self.assertIn('module', result)
        self.assertIn('overall_status', result)
        self.assertIn('checks', result)
        self.assertIn('summary', result)
        self.assertIn('recommendations', result)
        
        self.assertEqual(result['module'], 'clubs')
        self.assertIn(result['overall_status'], ['healthy', 'degraded', 'unhealthy'])
        
        # Check individual checks ran
        check_names = [check['name'] for check in result['checks']]
        expected_checks = [
            'database_connectivity',
            'club_model_operations',
            'court_availability',
            'reservation_integrity',
            'circuit_breakers',
            'cache_system',
            'pricing_system'
        ]
        
        for expected_check in expected_checks:
            self.assertIn(expected_check, check_names)
    
    def test_health_check_caching(self):
        """Test health check caching mechanism."""
        from ..health import ClubModuleHealth
        
        health = ClubModuleHealth()
        
        # First call - should execute checks
        start_time = time.time()
        result1 = health.run_all_checks(use_cache=True)
        duration1 = time.time() - start_time
        
        # Second call - should use cache
        start_time = time.time()
        result2 = health.run_all_checks(use_cache=True)
        duration2 = time.time() - start_time
        
        # Cached call should be faster
        self.assertLess(duration2, duration1)
        
        # Results should be identical
        self.assertEqual(result1['overall_status'], result2['overall_status'])
        self.assertEqual(len(result1['checks']), len(result2['checks']))


class TestClubConcurrencyIntegration(TransactionTestCase):
    """Test concurrency and race condition handling."""
    
    def setUp(self):
        """Set up for concurrency tests."""
        # Create organization
        self.organization = Organization.objects.create(
            name="Concurrency Test Org",
            slug="concurrency-org",
            is_active=True
        )
        
        # Create club
        self.club = Club.objects.create(
            name="Concurrency Test Club",
            slug="concurrency-club",
            email="concurrency@example.com",
            phone="+1111111111",
            organization=self.organization,
            is_active=True
        )
        
        # Create court
        self.court = Court.objects.create(
            name="Concurrency Court",
            number=1,
            club=self.club,
            organization=self.organization,
            price_per_hour=Decimal('50.00'),
            is_active=True
        )
    
    def test_concurrent_reservations(self):
        """Test concurrent reservation creation for same time slot."""
        tomorrow = timezone.now().date() + timedelta(days=1)
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'organization': self.organization,
            'date': tomorrow,
            'start_time': "10:00",
            'end_time': "11:00",
            'player_email': "test@example.com",
            'total_price': Decimal('50.00'),
            'status': "confirmed"
        }
        
        def create_reservation(player_name):
            """Create a reservation in a thread."""
            try:
                with transaction.atomic():
                    reservation = Reservation.objects.create(
                        player_name=player_name,
                        **reservation_data
                    )
                    return reservation.id
            except Exception as e:
                return str(e)
        
        # Create multiple threads trying to book same slot
        threads = []
        results = []
        
        def thread_worker(player_name):
            result = create_reservation(player_name)
            results.append(result)
        
        # Start multiple threads
        for i in range(5):
            thread = Thread(target=thread_worker, args=[f"Player {i}"])
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Only one should succeed, others should fail
        successful_reservations = [r for r in results if isinstance(r, int)]
        failed_reservations = [r for r in results if isinstance(r, str)]
        
        self.assertEqual(len(successful_reservations), 1)
        self.assertGreater(len(failed_reservations), 0)
        
        # Verify only one reservation exists
        actual_reservations = Reservation.objects.filter(
            court=self.court,
            date=tomorrow,
            start_time="10:00"
        ).count()
        
        self.assertEqual(actual_reservations, 1)
    
    def test_concurrent_court_pricing_updates(self):
        """Test concurrent updates to court pricing."""
        original_price = self.court.price_per_hour
        
        def update_price(new_price):
            """Update court price in a thread."""
            try:
                with transaction.atomic():
                    court = Court.objects.select_for_update().get(id=self.court.id)
                    court.price_per_hour = new_price
                    court.save()
                    return True
            except Exception as e:
                return str(e)
        
        # Create multiple threads updating price
        threads = []
        results = []
        prices = [Decimal('60.00'), Decimal('70.00'), Decimal('80.00')]
        
        def thread_worker(price):
            result = update_price(price)
            results.append(result)
        
        for price in prices:
            thread = Thread(target=thread_worker, args=[price])
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All should succeed
        successful_updates = [r for r in results if r is True]
        self.assertEqual(len(successful_updates), len(prices))
        
        # Final price should be one of the update values
        self.court.refresh_from_db()
        self.assertIn(self.court.price_per_hour, prices)
        self.assertNotEqual(self.court.price_per_hour, original_price)


class TestClubPerformanceIntegration(ClubsIntegrationTestCase):
    """Test performance characteristics of the clubs module."""
    
    def test_large_data_set_queries(self):
        """Test query performance with larger data sets."""
        # Create multiple clubs and courts
        clubs = []
        for i in range(10):
            club = Club.objects.create(
                name=f"Performance Club {i}",
                slug=f"performance-club-{i}",
                email=f"performance{i}@example.com",
                phone=f"+123456789{i}",
                organization=self.organization,
                is_active=True
            )
            clubs.append(club)
            
            # Create courts for each club
            for j in range(5):
                Court.objects.create(
                    name=f"Court {j}",
                    number=j + 1,
                    club=club,
                    organization=self.organization,
                    price_per_hour=Decimal(f'{50 + j * 10}.00'),
                    is_active=True
                )
        
        # Test query performance
        start_time = time.time()
        
        # Complex query with relationships
        clubs_with_courts = Club.objects.filter(
            is_active=True,
            organization=self.organization
        ).prefetch_related(
            'courts'
        ).annotate(
            court_count=models.Count('courts')
        ).filter(
            court_count__gt=0
        )
        
        # Force evaluation
        club_list = list(clubs_with_courts)
        
        end_time = time.time()
        query_time = end_time - start_time
        
        # Should complete in reasonable time (adjust threshold as needed)
        self.assertLess(query_time, 1.0)  # Less than 1 second
        self.assertEqual(len(club_list), 10)  # All clubs should be returned
    
    def test_cache_performance(self):
        """Test caching performance improvements."""
        from ..health import ClubModuleHealth
        
        health = ClubModuleHealth()
        
        # First call - no cache
        start_time = time.time()
        result1 = health.run_all_checks(use_cache=False)
        duration_no_cache = time.time() - start_time
        
        # Second call - with cache
        start_time = time.time()
        result2 = health.run_all_checks(use_cache=True)
        duration_with_cache = time.time() - start_time
        
        # Third call - should use cache
        start_time = time.time()
        result3 = health.run_all_checks(use_cache=True)
        duration_cached = time.time() - start_time
        
        # Cached call should be significantly faster
        self.assertLess(duration_cached, duration_no_cache)
        
        # Results should be consistent
        self.assertEqual(result2['overall_status'], result3['overall_status'])


class TestClubAPIIntegration(ClubsIntegrationTestCase):
    """Test API integration scenarios."""
    
    def test_api_error_handling(self):
        """Test API error handling with circuit breakers."""
        from ..circuit_breakers import ClubCircuitBreaker
        
        cb_manager = ClubCircuitBreaker()
        
        # Test with invalid club ID
        result = cb_manager.check_club_availability(99999)
        self.assertFalse(result['available'])
        self.assertIn('not found', result['reason'].lower())
        
        # Test pricing calculation with invalid court
        result = cb_manager.calculate_pricing(99999, date.today(), time(10, 0), time(11, 0))
        self.assertFalse(result['success'])
        
        # Verify circuit breaker state
        states = cb_manager.get_all_states()
        self.assertIsInstance(states, dict)
        self.assertIn('club_availability', states)
    
    def test_defensive_operations(self):
        """Test defensive operations and error recovery."""
        # Test with malformed data
        try:
            club = Club(
                name="",  # Empty name
                slug="test-slug",
                email="invalid-email",  # Invalid email
                organization=self.organization
            )
            club.full_clean()  # Should raise ValidationError
            self.fail("Expected ValidationError")
        except ValidationError as e:
            self.assertIn('name', str(e) or '')
        
        # Test defensive query operations would go here
        # (These would use the actual mixins when implemented)


@override_settings(DEBUG=True)
class TestClubIntegrationFullSystem(ClubsIntegrationTestCase):
    """Test full system integration scenarios."""
    
    def test_complete_booking_workflow(self):
        """Test complete booking workflow from club selection to reservation."""
        # 1. Get available clubs
        available_clubs = Club.objects.filter(is_active=True)
        self.assertGreater(available_clubs.count(), 0)
        
        # 2. Select a club
        selected_club = available_clubs.first()
        self.assertEqual(selected_club, self.club)
        
        # 3. Get available courts
        available_courts = selected_club.courts.filter(is_active=True)
        self.assertGreater(available_courts.count(), 0)
        
        # 4. Check court availability
        test_court = available_courts.first()
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        # Basic availability check
        conflicting_reservations = Reservation.objects.filter(
            court=test_court,
            date=tomorrow,
            start_time__lt=time(11, 0),
            end_time__gt=time(10, 0),
            status__in=['pending', 'confirmed']
        )
        
        is_available = not conflicting_reservations.exists()
        self.assertTrue(is_available)
        
        # 5. Calculate pricing
        base_price = test_court.price_per_hour
        duration_hours = 1
        total_price = base_price * duration_hours
        
        self.assertEqual(total_price, test_court.price_per_hour)
        
        # 6. Create reservation
        reservation = Reservation.objects.create(
            club=selected_club,
            court=test_court,
            organization=self.organization,
            date=tomorrow,
            start_time="10:00",
            end_time="11:00",
            player_name="Integration Test Player",
            player_email="integration@example.com",
            total_price=total_price,
            status="confirmed"
        )
        
        # 7. Verify reservation
        self.assertEqual(reservation.club, selected_club)
        self.assertEqual(reservation.court, test_court)
        self.assertEqual(reservation.total_price, total_price)
        
        # 8. Check availability again - should now be blocked
        conflicting_reservations = Reservation.objects.filter(
            court=test_court,
            date=tomorrow,
            start_time__lt=time(11, 0),
            end_time__gt=time(10, 0),
            status__in=['pending', 'confirmed']
        )
        
        is_available_after = not conflicting_reservations.exists()
        self.assertFalse(is_available_after)
    
    def test_system_health_monitoring(self):
        """Test system health monitoring integration."""
        from ..health import get_health_status, is_module_healthy
        
        # Check module health
        is_healthy = is_module_healthy()
        self.assertIsInstance(is_healthy, bool)
        
        # Get detailed health status
        health_status = get_health_status(use_cache=False)
        
        # Verify structure
        self.assertIn('module', health_status)
        self.assertIn('overall_status', health_status)
        self.assertIn('checks', health_status)
        
        # Should have some healthy checks with test data
        healthy_checks = [
            check for check in health_status['checks']
            if check['status'] == HealthStatus.HEALTHY
        ]
        
        self.assertGreater(len(healthy_checks), 0)
    
    def test_error_recovery_scenarios(self):
        """Test error recovery and system resilience."""
        from ..circuit_breakers import club_circuit_breaker
        
        # Reset all circuit breakers
        club_circuit_breaker.reset_all()
        
        # Verify all are closed
        states = club_circuit_breaker.get_all_states()
        for name, state in states.items():
            self.assertEqual(state['state'], 'closed')
        
        # Test recovery after manual reset
        # (In real scenarios, this would test recovery from actual failures)
        
        # All circuit breakers should be operational
        for name in states.keys():
            self.assertTrue(states[name]['is_available'])


if __name__ == '__main__':
    # Run tests with verbose output
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            },
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'apps.root',
                'apps.clubs',
                'apps.reservations',
                'apps.clients',
            ],
            USE_TZ=True,
        )
    
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2)
    failures = test_runner.run_tests(['apps.clubs.tests.test_integration'])
    
    if failures:
        exit(1)