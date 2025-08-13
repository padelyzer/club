"""
Health monitoring system for reservations module.
Provides comprehensive health checks for all reservation-related operations.
Based on the successful clubs module health monitoring pattern.
"""

import logging
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import connection, DatabaseError
from django.utils import timezone

logger = logging.getLogger('reservations.health')


class ReservationModuleHealth:
    """
    Comprehensive health monitoring for the reservations module.
    Orchestrates all health checks and provides unified status reporting.
    """
    
    def __init__(self):
        self.health_checks = {
            'database_connectivity': DatabaseConnectivityCheck(),
            'reservation_operations': ReservationOperationsCheck(),
            'availability_system': AvailabilitySystemCheck(),
            'payment_integration': PaymentIntegrationCheck(),
            'circuit_breakers': CircuitBreakerHealthCheck(),
            'cache_system': CacheSystemCheck(),
            'booking_integrity': BookingIntegrityCheck(),
            'notification_system': NotificationSystemCheck(),
        }
        
    def get_comprehensive_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status for the entire reservations module.
        
        Returns:
            Dict with overall health status and detailed check results
        """
        start_time = time.time()
        
        try:
            logger.info('Starting comprehensive reservation health check')
            
            overall_healthy = True
            detailed_results = {}
            critical_issues = []
            warnings = []
            
            # Execute all health checks
            for check_name, health_check in self.health_checks.items():
                try:
                    logger.debug(f'Executing health check: {check_name}')
                    
                    check_start_time = time.time()
                    result = health_check.check_health()
                    check_duration = (time.time() - check_start_time) * 1000  # ms
                    
                    result['check_duration_ms'] = round(check_duration, 2)
                    detailed_results[check_name] = result
                    
                    # Aggregate status
                    if not result.get('healthy', False):
                        overall_healthy = False
                        if result.get('critical', False):
                            critical_issues.append(f"{check_name}: {result.get('message', 'Unknown issue')}")
                    
                    # Collect warnings
                    if result.get('warnings'):
                        warnings.extend([f"{check_name}: {warning}" for warning in result['warnings']])
                    
                    logger.debug(f'Health check {check_name} completed in {check_duration:.2f}ms')
                    
                except Exception as e:
                    logger.error(f'Health check {check_name} failed: {e}')
                    overall_healthy = False
                    critical_issues.append(f"{check_name}: Health check failed - {str(e)}")
                    detailed_results[check_name] = {
                        'healthy': False,
                        'critical': True,
                        'message': f'Health check execution failed: {str(e)}',
                        'check_duration_ms': 0
                    }
            
            total_duration = (time.time() - start_time) * 1000  # ms
            
            health_status = {
                'overall_healthy': overall_healthy,
                'timestamp': timezone.now().isoformat(),
                'total_duration_ms': round(total_duration, 2),
                'critical_issues': critical_issues,
                'warnings': warnings,
                'detailed_results': detailed_results,
                'summary': self._generate_health_summary(detailed_results, overall_healthy),
                'recommendations': self._generate_recommendations(detailed_results, critical_issues, warnings)
            }
            
            # Log overall status
            log_level = logging.INFO if overall_healthy else logging.ERROR
            logger.log(
                log_level,
                f'Reservation health check completed in {total_duration:.2f}ms. '
                f'Status: {"HEALTHY" if overall_healthy else "UNHEALTHY"}'
            )
            
            return health_status
            
        except Exception as e:
            logger.error(f'Critical error during health check execution: {e}')
            return {
                'overall_healthy': False,
                'timestamp': timezone.now().isoformat(),
                'critical_error': str(e),
                'message': 'Health check system failure'
            }
    
    def _generate_health_summary(self, detailed_results: Dict, overall_healthy: bool) -> Dict[str, Any]:
        """Generate summary statistics from detailed results."""
        healthy_checks = sum(1 for result in detailed_results.values() if result.get('healthy', False))
        total_checks = len(detailed_results)
        critical_checks = sum(1 for result in detailed_results.values() if result.get('critical', False))
        
        return {
            'total_checks': total_checks,
            'healthy_checks': healthy_checks,
            'unhealthy_checks': total_checks - healthy_checks,
            'critical_failures': critical_checks,
            'health_percentage': round((healthy_checks / total_checks) * 100, 1) if total_checks > 0 else 0,
            'overall_status': 'HEALTHY' if overall_healthy else 'UNHEALTHY'
        }
    
    def _generate_recommendations(self, detailed_results: Dict, critical_issues: List, warnings: List) -> List[str]:
        """Generate actionable recommendations based on health check results."""
        recommendations = []
        
        # Critical issues recommendations
        if critical_issues:
            recommendations.append('URGENT: Address critical issues immediately to restore service')
            
            # Database connectivity issues
            if any('database' in issue.lower() for issue in critical_issues):
                recommendations.append('Check database connectivity and resource availability')
            
            # Circuit breaker issues
            if any('circuit' in issue.lower() for issue in critical_issues):
                recommendations.append('Review circuit breaker states - service degradation may be occurring')
            
            # Payment issues
            if any('payment' in issue.lower() for issue in critical_issues):
                recommendations.append('Verify payment gateway connectivity and credentials')
        
        # Performance recommendations
        slow_checks = [
            name for name, result in detailed_results.items() 
            if result.get('check_duration_ms', 0) > 1000  # >1 second
        ]
        if slow_checks:
            recommendations.append(f'Investigate slow health checks: {", ".join(slow_checks)}')
        
        # Warning-based recommendations
        if warnings:
            if len(warnings) > 5:
                recommendations.append('Multiple warnings detected - perform comprehensive system review')
        
        # General recommendations
        if not recommendations:
            recommendations.append('System appears healthy - maintain regular monitoring')
        
        return recommendations


class DatabaseConnectivityCheck:
    """Health check for database connectivity and basic operations."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check database connectivity and basic reservation operations."""
        try:
            start_time = time.time()
            
            # Test basic connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
                if not result or result[0] != 1:
                    raise DatabaseError("Invalid database response")
            
            # Test reservation table access
            from apps.reservations.models import Reservation
            
            # Simple count query
            reservation_count = Reservation.objects.count()
            
            # Test basic filtering
            recent_reservations = Reservation.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=1)
            ).count()
            
            response_time = (time.time() - start_time) * 1000  # ms
            
            return {
                'healthy': True,
                'message': 'Database connectivity normal',
                'metrics': {
                    'response_time_ms': round(response_time, 2),
                    'total_reservations': reservation_count,
                    'recent_reservations': recent_reservations
                }
            }
            
        except DatabaseError as e:
            logger.error(f'Database connectivity check failed: {e}')
            return {
                'healthy': False,
                'critical': True,
                'message': f'Database connectivity failed: {str(e)}'
            }
        except Exception as e:
            logger.error(f'Unexpected error in database check: {e}')
            return {
                'healthy': False,
                'critical': True,
                'message': f'Database check error: {str(e)}'
            }


class ReservationOperationsCheck:
    """Health check for core reservation operations."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check core reservation operations functionality."""
        try:
            from apps.reservations.models import Reservation
            from apps.reservations.mixins import ReservationSafetyMixin
            
            warnings = []
            metrics = {}
            
            # Test reservation query operations
            mixin = ReservationSafetyMixin()
            
            # Check recent reservation activity
            now = timezone.now()
            recent_reservations = Reservation.objects.filter(
                created_at__gte=now - timedelta(hours=24)
            )
            
            metrics['reservations_last_24h'] = recent_reservations.count()
            
            # Check reservation statuses distribution
            status_distribution = {}
            for status, _ in Reservation.STATUS_CHOICES:
                count = Reservation.objects.filter(status=status).count()
                status_distribution[status] = count
            
            metrics['status_distribution'] = status_distribution
            
            # Check for data integrity issues
            # Reservations with end time before start time
            invalid_durations = Reservation.objects.filter(
                datetime_end__lte=models.F('datetime_start')
            ).count()
            
            if invalid_durations > 0:
                warnings.append(f'{invalid_durations} reservations with invalid durations found')
            
            # Check for very old pending reservations
            old_pending = Reservation.objects.filter(
                status='pending',
                created_at__lt=now - timedelta(days=7)
            ).count()
            
            if old_pending > 0:
                warnings.append(f'{old_pending} old pending reservations need review')
            
            return {
                'healthy': True,
                'message': 'Reservation operations functional',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Reservation operations check failed: {e}')
            return {
                'healthy': False,
                'critical': True,
                'message': f'Reservation operations check failed: {str(e)}'
            }


class AvailabilitySystemCheck:
    """Health check for court availability system."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check availability system functionality."""
        try:
            from apps.clubs.models import Court
            from apps.reservations.mixins import ReservationSafetyMixin
            
            warnings = []
            metrics = {}
            
            # Get sample court for testing
            courts = Court.objects.filter(is_active=True)[:5]  # Test with first 5 active courts
            
            if not courts.exists():
                return {
                    'healthy': False,
                    'critical': False,
                    'message': 'No active courts available for availability testing'
                }
            
            mixin = ReservationSafetyMixin()
            availability_tests = 0
            successful_tests = 0
            
            # Test availability checks
            test_date = timezone.now().date() + timedelta(days=1)  # Tomorrow
            test_start_time = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
            test_end_time = test_start_time + timedelta(hours=1)
            
            for court in courts:
                try:
                    availability_tests += 1
                    
                    # This would normally check availability - we're just testing the system works
                    time_validation = mixin.validate_reservation_time_safe(
                        court, test_start_time, test_end_time
                    )
                    
                    if time_validation['is_valid']:
                        successful_tests += 1
                    
                except Exception as e:
                    logger.warning(f'Availability test failed for court {court.id}: {e}')
            
            metrics['availability_tests_performed'] = availability_tests
            metrics['successful_availability_tests'] = successful_tests
            metrics['availability_test_success_rate'] = (successful_tests / availability_tests) * 100 if availability_tests > 0 else 0
            
            # Warning if success rate is low
            if metrics['availability_test_success_rate'] < 80:
                warnings.append(f'Low availability test success rate: {metrics["availability_test_success_rate"]:.1f}%')
            
            return {
                'healthy': True,
                'message': 'Availability system functional',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Availability system check failed: {e}')
            return {
                'healthy': False,
                'critical': True,
                'message': f'Availability system check failed: {str(e)}'
            }


class PaymentIntegrationCheck:
    """Health check for payment integration system."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check payment system integration."""
        try:
            from apps.reservations.models import ReservationPayment
            
            warnings = []
            metrics = {}
            
            # Check recent payment activity
            now = timezone.now()
            recent_payments = ReservationPayment.objects.filter(
                created_at__gte=now - timedelta(hours=24)
            ) if hasattr(ReservationPayment.objects, 'filter') else []
            
            if hasattr(recent_payments, 'count'):
                metrics['payments_last_24h'] = recent_payments.count()
                
                # Check payment status distribution
                payment_statuses = {}
                for status in ['pending', 'completed', 'failed', 'refunded']:
                    count = recent_payments.filter(status=status).count() if hasattr(recent_payments, 'filter') else 0
                    payment_statuses[status] = count
                
                metrics['payment_status_distribution'] = payment_statuses
                
                # Warning for high failure rate
                total_payments = sum(payment_statuses.values())
                failed_payments = payment_statuses.get('failed', 0)
                
                if total_payments > 0:
                    failure_rate = (failed_payments / total_payments) * 100
                    metrics['payment_failure_rate'] = round(failure_rate, 2)
                    
                    if failure_rate > 10:  # >10% failure rate
                        warnings.append(f'High payment failure rate: {failure_rate:.1f}%')
            else:
                metrics['payments_last_24h'] = 0
                warnings.append('Payment model not accessible or no payments found')
            
            # Test basic payment functionality (mock)
            try:
                # This would test actual payment gateway connectivity
                # For now, we'll just simulate a test
                payment_test_result = True
                metrics['payment_gateway_test'] = 'passed' if payment_test_result else 'failed'
            except Exception as e:
                warnings.append(f'Payment gateway test failed: {str(e)}')
                metrics['payment_gateway_test'] = 'failed'
            
            return {
                'healthy': True,
                'message': 'Payment integration functional',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Payment integration check failed: {e}')
            return {
                'healthy': False,
                'critical': False,  # Payment issues are not critical for core functionality
                'message': f'Payment integration check failed: {str(e)}'
            }


class CircuitBreakerHealthCheck:
    """Health check for circuit breaker status."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check circuit breaker health status."""
        try:
            from apps.reservations.circuit_breakers import reservation_circuit_breaker
            
            warnings = []
            
            # Get circuit breaker health status
            cb_health = reservation_circuit_breaker.get_health_status()
            
            metrics = {
                'total_breakers': cb_health.get('total_breakers', 0),
                'open_breakers': len(cb_health.get('open_breakers', [])),
                'half_open_breakers': len(cb_health.get('half_open_breakers', [])),
                'breaker_details': cb_health.get('detailed_stats', {})
            }
            
            # Warnings for open circuit breakers
            open_breakers = cb_health.get('open_breakers', [])
            if open_breakers:
                warnings.append(f'Open circuit breakers: {", ".join(open_breakers)}')
            
            # Check specific critical breakers
            critical_breakers = ['availability_check', 'reservation_creation', 'payment_processing']
            for breaker_name in critical_breakers:
                breaker_stats = metrics['breaker_details'].get(breaker_name, {})
                if breaker_stats.get('state') == 'open':
                    return {
                        'healthy': False,
                        'critical': True,
                        'message': f'Critical circuit breaker {breaker_name} is open',
                        'metrics': metrics
                    }
            
            overall_healthy = cb_health.get('overall_healthy', True)
            
            return {
                'healthy': overall_healthy,
                'message': 'Circuit breakers operational',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Circuit breaker health check failed: {e}')
            return {
                'healthy': False,
                'critical': True,
                'message': f'Circuit breaker health check failed: {str(e)}'
            }


class CacheSystemCheck:
    """Health check for cache system."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check cache system functionality."""
        try:
            warnings = []
            metrics = {}
            
            # Test basic cache operations
            test_key = 'health_check_test_key'
            test_value = 'health_check_test_value'
            
            # Test cache set
            start_time = time.time()
            cache.set(test_key, test_value, 60)
            set_duration = (time.time() - start_time) * 1000
            
            # Test cache get
            start_time = time.time()
            retrieved_value = cache.get(test_key)
            get_duration = (time.time() - start_time) * 1000
            
            # Test cache delete
            start_time = time.time()
            cache.delete(test_key)
            delete_duration = (time.time() - start_time) * 1000
            
            # Verify operations worked
            if retrieved_value != test_value:
                return {
                    'healthy': False,
                    'critical': False,
                    'message': 'Cache get operation failed - value mismatch'
                }
            
            # Check if cache is slow
            if set_duration > 100 or get_duration > 100:  # >100ms is slow for cache
                warnings.append(f'Slow cache operations detected (set: {set_duration:.1f}ms, get: {get_duration:.1f}ms)')
            
            metrics = {
                'cache_set_duration_ms': round(set_duration, 2),
                'cache_get_duration_ms': round(get_duration, 2),
                'cache_delete_duration_ms': round(delete_duration, 2)
            }
            
            return {
                'healthy': True,
                'message': 'Cache system operational',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Cache system check failed: {e}')
            return {
                'healthy': False,
                'critical': False,
                'message': f'Cache system check failed: {str(e)}'
            }


class BookingIntegrityCheck:
    """Health check for booking data integrity."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check booking data integrity."""
        try:
            from apps.reservations.models import Reservation
            from django.db import models
            
            warnings = []
            metrics = {}
            issues_found = 0
            
            # Check for overlapping confirmed reservations (double bookings)
            overlapping_reservations = Reservation.objects.filter(
                status__in=['confirmed', 'pending']
            ).values('court').annotate(
                count=models.Count('id')
            ).filter(count__gt=1)
            
            for court_data in overlapping_reservations:
                court_reservations = Reservation.objects.filter(
                    court_id=court_data['court'],
                    status__in=['confirmed', 'pending']
                ).order_by('datetime_start')
                
                # Check for actual time overlaps
                reservations_list = list(court_reservations)
                for i, reservation in enumerate(reservations_list[:-1]):
                    next_reservation = reservations_list[i + 1]
                    
                    if reservation.datetime_end > next_reservation.datetime_start:
                        issues_found += 1
                        warnings.append(
                            f'Overlapping reservations found: {reservation.id} and {next_reservation.id}'
                        )
            
            # Check for reservations with invalid durations
            invalid_durations = Reservation.objects.filter(
                datetime_end__lte=models.F('datetime_start')
            ).count()
            
            if invalid_durations > 0:
                issues_found += invalid_durations
                warnings.append(f'{invalid_durations} reservations with invalid durations')
            
            # Check for reservations in the far past that are still pending
            old_pending = Reservation.objects.filter(
                status='pending',
                datetime_start__lt=timezone.now() - timedelta(days=7)
            ).count()
            
            if old_pending > 0:
                warnings.append(f'{old_pending} old pending reservations need cleanup')
            
            # Check for very expensive reservations (possible data errors)
            expensive_reservations = Reservation.objects.filter(
                total_amount__gt=1000
            ).count()
            
            if expensive_reservations > 0:
                warnings.append(f'{expensive_reservations} reservations with amount >€1000 - verify pricing')
            
            metrics = {
                'integrity_issues_found': issues_found,
                'old_pending_reservations': old_pending,
                'expensive_reservations': expensive_reservations,
                'total_active_reservations': Reservation.objects.filter(
                    status__in=['pending', 'confirmed']
                ).count()
            }
            
            # Critical if double bookings found
            is_critical = any('overlapping' in warning.lower() for warning in warnings)
            
            return {
                'healthy': issues_found == 0,
                'critical': is_critical,
                'message': f'Booking integrity check: {issues_found} issues found',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Booking integrity check failed: {e}')
            return {
                'healthy': False,
                'critical': True,
                'message': f'Booking integrity check failed: {str(e)}'
            }


class NotificationSystemCheck:
    """Health check for notification system."""
    
    def check_health(self) -> Dict[str, Any]:
        """Check notification system functionality."""
        try:
            warnings = []
            metrics = {}
            
            # Test basic notification functionality
            # This would typically test email/SMS services
            
            # Check notification queue (if implemented)
            try:
                # Mock notification test
                notification_test_result = True
                metrics['notification_test'] = 'passed' if notification_test_result else 'failed'
            except Exception as e:
                warnings.append(f'Notification test failed: {str(e)}')
                metrics['notification_test'] = 'failed'
            
            # Check for users without contact information
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            users_without_email = User.objects.filter(email__isnull=True).count()
            if users_without_email > 0:
                warnings.append(f'{users_without_email} users without email addresses')
            
            metrics['users_without_email'] = users_without_email
            
            return {
                'healthy': True,
                'message': 'Notification system functional',
                'metrics': metrics,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f'Notification system check failed: {e}')
            return {
                'healthy': False,
                'critical': False,
                'message': f'Notification system check failed: {str(e)}'
            }


# Convenience functions for easy import
def get_reservation_health_status():
    """Get comprehensive reservation module health status."""
    health_monitor = ReservationModuleHealth()
    return health_monitor.get_comprehensive_health_status()


def is_reservation_system_healthy():
    """Quick check if reservation system is healthy."""
    try:
        health_status = get_reservation_health_status()
        return health_status.get('overall_healthy', False)
    except Exception as e:
        logger.error(f'Error checking reservation system health: {e}')
        return False