"""
Comprehensive health monitoring system for clubs module.
Provides detailed health checks for all club-related systems and dependencies.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.core.cache import cache
from django.db import connection, transaction
from django.db.models import Count, Q
from django.utils import timezone

from .circuit_breakers import club_circuit_breaker, get_circuit_breaker_status
from .validators import ClubIntegrityValidator

logger = logging.getLogger('clubs.health')


class HealthStatus:
    """Health status constants."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class HealthCheck:
    """Base class for individual health checks."""
    
    def __init__(self, name: str, description: str = "", timeout: int = 10):
        self.name = name
        self.description = description
        self.timeout = timeout
    
    def check(self) -> Dict[str, Any]:
        """
        Perform the health check and return results.
        Should be overridden by subclasses.
        """
        return {
            'name': self.name,
            'status': HealthStatus.UNKNOWN,
            'message': 'Health check not implemented',
            'timestamp': timezone.now().isoformat(),
            'duration_ms': 0
        }
    
    def _timed_check(self, check_function) -> Dict[str, Any]:
        """Execute check function with timing."""
        start_time = time.time()
        
        try:
            result = check_function()
            duration_ms = int((time.time() - start_time) * 1000)
            
            result.update({
                'name': self.name,
                'description': self.description,
                'timestamp': timezone.now().isoformat(),
                'duration_ms': duration_ms
            })
            
            return result
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Health check '{self.name}' failed: {e}")
            
            return {
                'name': self.name,
                'description': self.description,
                'status': HealthStatus.UNHEALTHY,
                'message': f'Health check failed: {str(e)}',
                'error': str(e),
                'timestamp': timezone.now().isoformat(),
                'duration_ms': duration_ms
            }


class DatabaseHealthCheck(HealthCheck):
    """Health check for database connectivity and performance."""
    
    def __init__(self):
        super().__init__(
            name='database_connectivity',
            description='Check database connectivity and basic operations'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_database)
    
    def _check_database(self) -> Dict[str, Any]:
        try:
            # Test basic connectivity
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # Test clubs table access
            from .models import Club
            club_count = Club.objects.count()
            
            # Test transaction capability
            with transaction.atomic():
                # This tests the transaction system without making changes
                pass
            
            return {
                'status': HealthStatus.HEALTHY,
                'message': f'Database operational. {club_count} clubs in system.',
                'metrics': {
                    'club_count': club_count,
                    'connection_alive': True
                }
            }
            
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Database error: {str(e)}',
                'metrics': {
                    'connection_alive': False
                }
            }


class ClubModelHealthCheck(HealthCheck):
    """Health check for Club model operations."""
    
    def __init__(self):
        super().__init__(
            name='club_model_operations',
            description='Check Club model basic operations'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_club_model)
    
    def _check_club_model(self) -> Dict[str, Any]:
        from .models import Club
        
        try:
            # Test query operations
            active_clubs = Club.objects.filter(is_active=True).count()
            total_clubs = Club.objects.count()
            
            # Test relationships
            clubs_with_courts = Club.objects.annotate(
                court_count=Count('courts')
            ).filter(court_count__gt=0).count()
            
            # Test complex query
            recent_clubs = Club.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            status = HealthStatus.HEALTHY
            messages = []
            
            if total_clubs == 0:
                status = HealthStatus.DEGRADED
                messages.append("No clubs in system")
            
            if active_clubs == 0:
                status = HealthStatus.DEGRADED
                messages.append("No active clubs")
            
            return {
                'status': status,
                'message': '; '.join(messages) if messages else 'Club model operations healthy',
                'metrics': {
                    'total_clubs': total_clubs,
                    'active_clubs': active_clubs,
                    'clubs_with_courts': clubs_with_courts,
                    'recent_clubs': recent_clubs
                }
            }
            
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Club model operations failed: {str(e)}'
            }


class CourtAvailabilityHealthCheck(HealthCheck):
    """Health check for court availability system."""
    
    def __init__(self):
        super().__init__(
            name='court_availability',
            description='Check court availability checking system'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_court_availability)
    
    def _check_court_availability(self) -> Dict[str, Any]:
        from .models import Club, Court
        
        try:
            # Find a test club and court
            test_club = Club.objects.filter(is_active=True).first()
            if not test_club:
                return {
                    'status': HealthStatus.DEGRADED,
                    'message': 'No active clubs available for availability testing'
                }
            
            test_court = test_club.courts.filter(is_active=True).first()
            if not test_court:
                return {
                    'status': HealthStatus.DEGRADED,
                    'message': 'No active courts available for availability testing'
                }
            
            # Test availability check
            tomorrow = timezone.now().date() + timedelta(days=1)
            test_time = timezone.now().time().replace(hour=10, minute=0, second=0, microsecond=0)
            test_end_time = timezone.now().time().replace(hour=11, minute=0, second=0, microsecond=0)
            
            if hasattr(test_court, 'defensive_is_available'):
                is_available, reason = test_court.defensive_is_available(
                    tomorrow, test_time, test_end_time
                )
                
                return {
                    'status': HealthStatus.HEALTHY,
                    'message': f'Availability check successful. Test result: {reason}',
                    'metrics': {
                        'test_court_id': test_court.id,
                        'test_availability': is_available,
                        'test_reason': reason
                    }
                }
            else:
                return {
                    'status': HealthStatus.DEGRADED,
                    'message': 'Defensive availability checking not available'
                }
                
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Court availability check failed: {str(e)}'
            }


class ReservationIntegrityHealthCheck(HealthCheck):
    """Health check for reservation system integrity."""
    
    def __init__(self):
        super().__init__(
            name='reservation_integrity',
            description='Check reservation system integrity'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_reservation_integrity)
    
    def _check_reservation_integrity(self) -> Dict[str, Any]:
        try:
            from apps.reservations.models import Reservation
            
            # Check for basic reservation metrics
            total_reservations = Reservation.objects.count()
            active_reservations = Reservation.objects.filter(
                status__in=['pending', 'confirmed']
            ).count()
            
            # Check for data integrity issues
            future_date = timezone.now().date() + timedelta(days=1)
            future_reservations = Reservation.objects.filter(date__gte=future_date).count()
            
            # Check for overlapping reservations (basic check)
            overlapping_count = 0
            recent_reservations = Reservation.objects.filter(
                date__gte=timezone.now().date(),
                status__in=['pending', 'confirmed']
            ).order_by('court', 'date', 'start_time')[:100]  # Limit to avoid performance issues
            
            # Basic overlap detection (simplified)
            court_dates = {}
            for reservation in recent_reservations:
                key = (reservation.court_id, reservation.date)
                if key not in court_dates:
                    court_dates[key] = []
                court_dates[key].append((reservation.start_time, reservation.end_time))
            
            for (court_id, date), time_slots in court_dates.items():
                time_slots.sort()
                for i in range(len(time_slots) - 1):
                    if time_slots[i][1] > time_slots[i + 1][0]:
                        overlapping_count += 1
            
            status = HealthStatus.HEALTHY
            messages = []
            
            if overlapping_count > 0:
                status = HealthStatus.DEGRADED
                messages.append(f"Found {overlapping_count} potential overlapping reservations")
            
            return {
                'status': status,
                'message': '; '.join(messages) if messages else 'Reservation integrity healthy',
                'metrics': {
                    'total_reservations': total_reservations,
                    'active_reservations': active_reservations,
                    'future_reservations': future_reservations,
                    'overlapping_reservations': overlapping_count
                }
            }
            
        except ImportError:
            return {
                'status': HealthStatus.DEGRADED,
                'message': 'Reservation module not available for integrity check'
            }
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Reservation integrity check failed: {str(e)}'
            }


class CircuitBreakerHealthCheck(HealthCheck):
    """Health check for circuit breaker system."""
    
    def __init__(self):
        super().__init__(
            name='circuit_breakers',
            description='Check circuit breaker system status'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_circuit_breakers)
    
    def _check_circuit_breakers(self) -> Dict[str, Any]:
        try:
            cb_states = get_circuit_breaker_status()
            
            open_circuits = []
            degraded_circuits = []
            healthy_circuits = []
            
            for name, state in cb_states.items():
                if state['state'] == 'open':
                    open_circuits.append(name)
                elif state['state'] == 'half_open':
                    degraded_circuits.append(name)
                else:
                    healthy_circuits.append(name)
            
            if open_circuits:
                status = HealthStatus.UNHEALTHY
                message = f"Circuit breakers OPEN: {', '.join(open_circuits)}"
            elif degraded_circuits:
                status = HealthStatus.DEGRADED
                message = f"Circuit breakers HALF-OPEN: {', '.join(degraded_circuits)}"
            else:
                status = HealthStatus.HEALTHY
                message = f"All {len(healthy_circuits)} circuit breakers healthy"
            
            return {
                'status': status,
                'message': message,
                'metrics': {
                    'total_circuits': len(cb_states),
                    'healthy_circuits': len(healthy_circuits),
                    'degraded_circuits': len(degraded_circuits),
                    'open_circuits': len(open_circuits),
                    'circuit_details': cb_states
                }
            }
            
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Circuit breaker health check failed: {str(e)}'
            }


class CacheHealthCheck(HealthCheck):
    """Health check for cache system."""
    
    def __init__(self):
        super().__init__(
            name='cache_system',
            description='Check cache system availability and performance'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_cache)
    
    def _check_cache(self) -> Dict[str, Any]:
        try:
            # Test cache write/read
            test_key = 'health_check_test'
            test_value = f'test_{int(time.time())}'
            
            cache.set(test_key, test_value, 60)
            retrieved_value = cache.get(test_key)
            
            if retrieved_value == test_value:
                # Clean up
                cache.delete(test_key)
                
                return {
                    'status': HealthStatus.HEALTHY,
                    'message': 'Cache system operational',
                    'metrics': {
                        'cache_available': True,
                        'read_write_test': 'passed'
                    }
                }
            else:
                return {
                    'status': HealthStatus.DEGRADED,
                    'message': 'Cache read/write test failed',
                    'metrics': {
                        'cache_available': True,
                        'read_write_test': 'failed'
                    }
                }
                
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Cache system error: {str(e)}',
                'metrics': {
                    'cache_available': False
                }
            }


class PricingSystemHealthCheck(HealthCheck):
    """Health check for pricing calculation system."""
    
    def __init__(self):
        super().__init__(
            name='pricing_system',
            description='Check pricing calculation system'
        )
    
    def check(self) -> Dict[str, Any]:
        return self._timed_check(self._check_pricing_system)
    
    def _check_pricing_system(self) -> Dict[str, Any]:
        from .models import Club, Court
        
        try:
            # Find a test court with pricing
            test_court = Court.objects.filter(
                is_active=True,
                price_per_hour__gt=0
            ).first()
            
            if not test_court:
                return {
                    'status': HealthStatus.DEGRADED,
                    'message': 'No courts with pricing available for testing'
                }
            
            # Test pricing calculation
            tomorrow = timezone.now().date() + timedelta(days=1)
            test_start = timezone.now().time().replace(hour=10, minute=0, second=0, microsecond=0)
            test_end = timezone.now().time().replace(hour=11, minute=0, second=0, microsecond=0)
            
            if hasattr(test_court, 'defensive_calculate_price'):
                try:
                    pricing_result = test_court.defensive_calculate_price(tomorrow, test_start, test_end)
                    
                    return {
                        'status': HealthStatus.HEALTHY,
                        'message': 'Pricing calculation successful',
                        'metrics': {
                            'test_court_id': test_court.id,
                            'base_price': float(pricing_result['base_price']),
                            'total_price': float(pricing_result['total_price']),
                            'duration_minutes': pricing_result['duration_minutes']
                        }
                    }
                except Exception as pricing_error:
                    return {
                        'status': HealthStatus.UNHEALTHY,
                        'message': f'Pricing calculation failed: {str(pricing_error)}'
                    }
            else:
                return {
                    'status': HealthStatus.DEGRADED,
                    'message': 'Defensive pricing calculation not available'
                }
                
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'message': f'Pricing system check failed: {str(e)}'
            }


class ClubModuleHealth:
    """
    Main health monitoring class for the clubs module.
    Orchestrates all health checks and provides comprehensive reporting.
    """
    
    def __init__(self):
        self.health_checks = [
            DatabaseHealthCheck(),
            ClubModelHealthCheck(),
            CourtAvailabilityHealthCheck(),
            ReservationIntegrityHealthCheck(),
            CircuitBreakerHealthCheck(),
            CacheHealthCheck(),
            PricingSystemHealthCheck(),
        ]
        
        self.cache_key = 'clubs_health_status'
        self.cache_timeout = 60  # Cache results for 1 minute
    
    def run_all_checks(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        Run all health checks and return comprehensive status.
        """
        if use_cache:
            cached_result = cache.get(self.cache_key)
            if cached_result:
                logger.debug("Returning cached health check results")
                return cached_result
        
        logger.info("Running comprehensive health checks for clubs module")
        start_time = time.time()
        
        results = []
        overall_status = HealthStatus.HEALTHY
        
        for health_check in self.health_checks:
            try:
                result = health_check.check()
                results.append(result)
                
                # Determine overall status
                if result['status'] == HealthStatus.UNHEALTHY:
                    overall_status = HealthStatus.UNHEALTHY
                elif result['status'] == HealthStatus.DEGRADED and overall_status != HealthStatus.UNHEALTHY:
                    overall_status = HealthStatus.DEGRADED
                    
            except Exception as e:
                logger.error(f"Health check '{health_check.name}' crashed: {e}")
                results.append({
                    'name': health_check.name,
                    'status': HealthStatus.UNHEALTHY,
                    'message': f'Health check crashed: {str(e)}',
                    'error': str(e),
                    'timestamp': timezone.now().isoformat(),
                    'duration_ms': 0
                })
                overall_status = HealthStatus.UNHEALTHY
        
        total_duration = int((time.time() - start_time) * 1000)
        
        # Calculate statistics
        healthy_count = sum(1 for r in results if r['status'] == HealthStatus.HEALTHY)
        degraded_count = sum(1 for r in results if r['status'] == HealthStatus.DEGRADED)
        unhealthy_count = sum(1 for r in results if r['status'] == HealthStatus.UNHEALTHY)
        
        comprehensive_result = {
            'module': 'clubs',
            'overall_status': overall_status,
            'timestamp': timezone.now().isoformat(),
            'total_duration_ms': total_duration,
            'summary': {
                'total_checks': len(results),
                'healthy_checks': healthy_count,
                'degraded_checks': degraded_count,
                'unhealthy_checks': unhealthy_count,
                'success_rate': f"{(healthy_count / len(results) * 100):.1f}%"
            },
            'checks': results,
            'recommendations': self._generate_recommendations(results)
        }
        
        # Cache the result
        if use_cache:
            cache.set(self.cache_key, comprehensive_result, self.cache_timeout)
        
        logger.info(f"Health check completed in {total_duration}ms - Status: {overall_status}")
        return comprehensive_result
    
    def _generate_recommendations(self, results: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations based on health check results."""
        recommendations = []
        
        unhealthy_checks = [r for r in results if r['status'] == HealthStatus.UNHEALTHY]
        degraded_checks = [r for r in results if r['status'] == HealthStatus.DEGRADED]
        
        if unhealthy_checks:
            recommendations.append(
                f"URGENT: {len(unhealthy_checks)} critical systems are unhealthy. "
                "Immediate attention required."
            )
            
        if degraded_checks:
            recommendations.append(
                f"WARNING: {len(degraded_checks)} systems are degraded. "
                "Monitor closely and consider maintenance."
            )
            
        # Specific recommendations based on check results
        for result in results:
            if result['name'] == 'circuit_breakers' and result['status'] != HealthStatus.HEALTHY:
                recommendations.append(
                    "Consider resetting circuit breakers or investigating underlying issues."
                )
                
            if result['name'] == 'cache_system' and result['status'] != HealthStatus.HEALTHY:
                recommendations.append(
                    "Cache system issues may impact performance. Check cache configuration."
                )
                
            if result['name'] == 'reservation_integrity' and result['status'] != HealthStatus.HEALTHY:
                recommendations.append(
                    "Reservation integrity issues detected. Run data cleanup procedures."
                )
        
        if not recommendations:
            recommendations.append("All systems healthy. Continue regular monitoring.")
        
        return recommendations
    
    def get_quick_status(self) -> Dict[str, Any]:
        """Get a quick health status without running full checks."""
        try:
            # Try to get cached result first
            cached_result = cache.get(self.cache_key)
            if cached_result:
                return {
                    'status': cached_result['overall_status'],
                    'last_check': cached_result['timestamp'],
                    'cached': True
                }
            
            # If no cache, run minimal checks
            db_check = DatabaseHealthCheck()
            db_result = db_check.check()
            
            return {
                'status': db_result['status'],
                'last_check': timezone.now().isoformat(),
                'cached': False,
                'message': 'Quick status from minimal database check'
            }
            
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY,
                'last_check': timezone.now().isoformat(),
                'cached': False,
                'error': str(e)
            }
    
    def run_specific_check(self, check_name: str) -> Optional[Dict[str, Any]]:
        """Run a specific health check by name."""
        for health_check in self.health_checks:
            if health_check.name == check_name:
                return health_check.check()
        
        return None
    
    def clear_cache(self):
        """Clear cached health check results."""
        cache.delete(self.cache_key)
        logger.info("Health check cache cleared")


# Global instance for easy access
club_health = ClubModuleHealth()


# Utility functions
def get_health_status(use_cache: bool = True) -> Dict[str, Any]:
    """Get comprehensive health status for clubs module."""
    return club_health.run_all_checks(use_cache=use_cache)


def get_quick_health_status() -> Dict[str, Any]:
    """Get quick health status without full checks."""
    return club_health.get_quick_status()


def is_module_healthy() -> bool:
    """Check if the clubs module is healthy."""
    try:
        status = get_quick_health_status()
        return status['status'] == HealthStatus.HEALTHY
    except Exception:
        return False