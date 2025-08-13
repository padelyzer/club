"""
Circuit Breaker pattern implementation for clubs module.
Prevents cascade failures and provides fallback mechanisms for critical operations.
"""

import logging
import threading
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import DatabaseError, OperationalError
from django.utils import timezone

logger = logging.getLogger('clubs.circuit_breakers')


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerError(Exception):
    """Custom exception for circuit breaker failures."""
    pass


class CircuitBreaker:
    """
    Generic circuit breaker implementation with configurable thresholds and timeouts.
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,  # seconds
        expected_exception: Union[Exception, tuple] = Exception,
        fallback_function: Optional[Callable] = None
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.fallback_function = fallback_function
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        self.lock = threading.RLock()
        
        # Cache keys
        self.failure_count_key = f"circuit_breaker_{name}_failures"
        self.state_key = f"circuit_breaker_{name}_state"
        self.last_failure_key = f"circuit_breaker_{name}_last_failure"
        
        # Load state from cache
        self._load_state_from_cache()
    
    def _load_state_from_cache(self):
        """Load circuit breaker state from cache."""
        try:
            self.failure_count = cache.get(self.failure_count_key, 0)
            self.state = CircuitState(cache.get(self.state_key, CircuitState.CLOSED.value))
            self.last_failure_time = cache.get(self.last_failure_key)
        except Exception as e:
            logger.warning(f"Failed to load circuit breaker state from cache: {e}")
    
    def _save_state_to_cache(self):
        """Save circuit breaker state to cache."""
        try:
            cache.set(self.failure_count_key, self.failure_count, 3600)  # 1 hour
            cache.set(self.state_key, self.state.value, 3600)
            cache.set(self.last_failure_key, self.last_failure_time, 3600)
        except Exception as e:
            logger.warning(f"Failed to save circuit breaker state to cache: {e}")
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator interface for circuit breaker."""
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection.
        """
        with self.lock:
            # Check if we should attempt the call
            if not self._can_attempt():
                return self._handle_blocked_call(func.__name__)
            
            try:
                # Attempt the function call
                result = func(*args, **kwargs)
                
                # Success - reset failure count
                self._handle_success()
                
                return result
                
            except self.expected_exception as e:
                # Expected failure - increment failure count
                self._handle_failure(e, func.__name__)
                raise
            except Exception as e:
                # Unexpected error - don't count as failure for circuit breaker
                logger.error(f"Unexpected error in circuit breaker {self.name}: {e}")
                raise
    
    def _can_attempt(self) -> bool:
        """Check if we can attempt the call based on circuit breaker state."""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if (self.last_failure_time and 
                time.time() - self.last_failure_time > self.recovery_timeout):
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
                self._save_state_to_cache()
                return True
            return False
        
        if self.state == CircuitState.HALF_OPEN:
            # Allow one attempt in half-open state
            return True
        
        return False
    
    def _handle_success(self):
        """Handle successful function execution."""
        if self.failure_count > 0 or self.state != CircuitState.CLOSED:
            logger.info(f"Circuit breaker {self.name} resetting to CLOSED state")
        
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = None
        self._save_state_to_cache()
    
    def _handle_failure(self, exception: Exception, func_name: str):
        """Handle function execution failure."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        logger.warning(f"Circuit breaker {self.name} recorded failure {self.failure_count}: {exception}")
        
        if self.state == CircuitState.HALF_OPEN:
            # Failed in half-open, go back to open
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit breaker {self.name} transitioning back to OPEN from HALF_OPEN")
        elif self.failure_count >= self.failure_threshold:
            # Threshold reached, open the circuit
            self.state = CircuitState.OPEN
            logger.error(f"Circuit breaker {self.name} OPENING due to {self.failure_count} failures")
        
        self._save_state_to_cache()
    
    def _handle_blocked_call(self, func_name: str) -> Any:
        """Handle call when circuit breaker is open."""
        logger.warning(f"Circuit breaker {self.name} BLOCKED call to {func_name}")
        
        if self.fallback_function:
            try:
                logger.info(f"Circuit breaker {self.name} executing fallback function")
                return self.fallback_function()
            except Exception as e:
                logger.error(f"Circuit breaker {self.name} fallback function failed: {e}")
        
        raise CircuitBreakerError(
            f"Circuit breaker {self.name} is OPEN. "
            f"Service is temporarily unavailable."
        )
    
    def reset(self):
        """Manually reset circuit breaker to closed state."""
        with self.lock:
            self.failure_count = 0
            self.state = CircuitState.CLOSED
            self.last_failure_time = None
            self._save_state_to_cache()
            logger.info(f"Circuit breaker {self.name} manually reset")
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state information."""
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'failure_threshold': self.failure_threshold,
            'last_failure_time': self.last_failure_time,
            'recovery_timeout': self.recovery_timeout,
            'is_available': self._can_attempt()
        }


class ClubCircuitBreaker:
    """
    Specialized circuit breaker manager for clubs module operations.
    """
    
    def __init__(self):
        self.circuit_breakers = {}
        self._initialize_circuit_breakers()
    
    def _initialize_circuit_breakers(self):
        """Initialize all circuit breakers for club operations."""
        
        # Club availability checking
        self.circuit_breakers['club_availability'] = CircuitBreaker(
            name='club_availability',
            failure_threshold=3,
            recovery_timeout=30,
            expected_exception=(DatabaseError, OperationalError, ValidationError),
            fallback_function=self._fallback_club_availability
        )
        
        # Court availability checking
        self.circuit_breakers['court_availability'] = CircuitBreaker(
            name='court_availability',
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=(DatabaseError, OperationalError, ValidationError),
            fallback_function=self._fallback_court_availability
        )
        
        # Reservation creation
        self.circuit_breakers['reservation_creation'] = CircuitBreaker(
            name='reservation_creation',
            failure_threshold=3,
            recovery_timeout=120,
            expected_exception=(DatabaseError, OperationalError, ValidationError),
            fallback_function=self._fallback_reservation_creation
        )
        
        # Pricing calculation
        self.circuit_breakers['pricing_calculation'] = CircuitBreaker(
            name='pricing_calculation',
            failure_threshold=10,
            recovery_timeout=30,
            expected_exception=(DatabaseError, OperationalError, ArithmeticError),
            fallback_function=self._fallback_pricing_calculation
        )
        
        # Club dashboard data
        self.circuit_breakers['club_dashboard'] = CircuitBreaker(
            name='club_dashboard',
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=(DatabaseError, OperationalError),
            fallback_function=self._fallback_club_dashboard
        )
        
        # Maintenance checking
        self.circuit_breakers['maintenance_check'] = CircuitBreaker(
            name='maintenance_check',
            failure_threshold=5,
            recovery_timeout=30,
            expected_exception=(DatabaseError, OperationalError),
            fallback_function=self._fallback_maintenance_check
        )
    
    def get_circuit_breaker(self, name: str) -> CircuitBreaker:
        """Get circuit breaker by name."""
        if name not in self.circuit_breakers:
            raise ValueError(f"Circuit breaker '{name}' not found")
        return self.circuit_breakers[name]
    
    def check_club_availability(self, club_id: int) -> Dict[str, Any]:
        """Check club availability with circuit breaker protection."""
        cb = self.get_circuit_breaker('club_availability')
        return cb.call(self._check_club_availability_impl, club_id)
    
    def check_court_availability(self, court_id: int, date, start_time, end_time) -> Dict[str, Any]:
        """Check court availability with circuit breaker protection."""
        cb = self.get_circuit_breaker('court_availability')
        return cb.call(self._check_court_availability_impl, court_id, date, start_time, end_time)
    
    def create_reservation(self, reservation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create reservation with circuit breaker protection."""
        cb = self.get_circuit_breaker('reservation_creation')
        return cb.call(self._create_reservation_impl, reservation_data)
    
    def calculate_pricing(self, court_id: int, date, start_time, end_time) -> Dict[str, Any]:
        """Calculate pricing with circuit breaker protection."""
        cb = self.get_circuit_breaker('pricing_calculation')
        return cb.call(self._calculate_pricing_impl, court_id, date, start_time, end_time)
    
    def get_club_dashboard_data(self, club_id: int) -> Dict[str, Any]:
        """Get club dashboard data with circuit breaker protection."""
        cb = self.get_circuit_breaker('club_dashboard')
        return cb.call(self._get_club_dashboard_data_impl, club_id)
    
    def check_maintenance_status(self, court_id: int, date) -> Dict[str, Any]:
        """Check maintenance status with circuit breaker protection."""
        cb = self.get_circuit_breaker('maintenance_check')
        return cb.call(self._check_maintenance_status_impl, court_id, date)
    
    # Implementation methods (these would contain the actual business logic)
    
    def _check_club_availability_impl(self, club_id: int) -> Dict[str, Any]:
        """Implementation of club availability check."""
        from .models import Club
        
        try:
            club = Club.objects.select_related('organization').get(id=club_id)
            
            if not club.is_active:
                return {'available': False, 'reason': 'Club is inactive'}
            
            if not club.organization.is_active:
                return {'available': False, 'reason': 'Organization is inactive'}
            
            active_courts = club.courts.filter(is_active=True).count()
            if active_courts == 0:
                return {'available': False, 'reason': 'No active courts'}
            
            return {'available': True, 'active_courts': active_courts}
            
        except Club.DoesNotExist:
            return {'available': False, 'reason': 'Club not found'}
    
    def _check_court_availability_impl(self, court_id: int, date, start_time, end_time) -> Dict[str, Any]:
        """Implementation of court availability check."""
        from .models import Court
        
        try:
            court = Court.objects.select_related('club').get(id=court_id)
            
            # Use defensive availability check from mixins if available
            if hasattr(court, 'defensive_is_available'):
                is_available, reason = court.defensive_is_available(date, start_time, end_time)
                return {'available': is_available, 'reason': reason}
            else:
                # Fallback basic check
                if not court.is_active:
                    return {'available': False, 'reason': 'Court is inactive'}
                if court.is_maintenance:
                    return {'available': False, 'reason': 'Court under maintenance'}
                return {'available': True, 'reason': 'Available'}
                
        except Court.DoesNotExist:
            return {'available': False, 'reason': 'Court not found'}
    
    def _create_reservation_impl(self, reservation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation of reservation creation."""
        # This would contain the actual reservation creation logic
        # For now, we'll return a placeholder
        return {
            'success': True,
            'reservation_id': 'placeholder',
            'message': 'Reservation created successfully'
        }
    
    def _calculate_pricing_impl(self, court_id: int, date, start_time, end_time) -> Dict[str, Any]:
        """Implementation of pricing calculation."""
        from .models import Court
        
        try:
            court = Court.objects.get(id=court_id)
            
            # Use defensive pricing calculation from mixins if available
            if hasattr(court, 'defensive_calculate_price'):
                pricing_info = court.defensive_calculate_price(date, start_time, end_time)
                return {'success': True, 'pricing': pricing_info}
            else:
                # Fallback basic pricing
                from datetime import datetime
                duration = (datetime.combine(date, end_time) - datetime.combine(date, start_time)).total_seconds() / 3600
                total_price = court.price_per_hour * duration
                
                return {
                    'success': True,
                    'pricing': {
                        'base_price': court.price_per_hour,
                        'duration_hours': duration,
                        'total_price': total_price
                    }
                }
                
        except Court.DoesNotExist:
            return {'success': False, 'error': 'Court not found'}
    
    def _get_club_dashboard_data_impl(self, club_id: int) -> Dict[str, Any]:
        """Implementation of club dashboard data retrieval."""
        from .models import Club
        
        try:
            club = Club.objects.select_related('organization').prefetch_related('courts').get(id=club_id)
            
            # Basic dashboard data
            data = {
                'club': {
                    'id': club.id,
                    'name': club.name,
                    'is_active': club.is_active,
                },
                'courts': {
                    'total': club.courts.count(),
                    'active': club.courts.filter(is_active=True).count(),
                    'maintenance': club.courts.filter(is_maintenance=True).count(),
                },
                'timestamp': timezone.now().isoformat()
            }
            
            return {'success': True, 'data': data}
            
        except Club.DoesNotExist:
            return {'success': False, 'error': 'Club not found'}
    
    def _check_maintenance_status_impl(self, court_id: int, date) -> Dict[str, Any]:
        """Implementation of maintenance status check."""
        from .models import Court
        
        try:
            court = Court.objects.get(id=court_id)
            
            if court.is_maintenance:
                return {'has_maintenance': True, 'type': 'general'}
            
            # Check for scheduled maintenance
            if hasattr(court, 'maintenance_records'):
                maintenance = court.maintenance_records.filter(
                    scheduled_date__date=date,
                    status__in=['scheduled', 'in_progress']
                ).first()
                
                if maintenance:
                    return {
                        'has_maintenance': True,
                        'type': 'scheduled',
                        'maintenance_id': maintenance.id,
                        'title': maintenance.title
                    }
            
            return {'has_maintenance': False}
            
        except Court.DoesNotExist:
            return {'error': 'Court not found'}
    
    # Fallback functions
    
    def _fallback_club_availability(self) -> Dict[str, Any]:
        """Fallback for club availability check."""
        logger.warning("Using fallback for club availability check")
        return {
            'available': True,  # Optimistic fallback
            'reason': 'Fallback response - actual status unknown',
            'fallback': True
        }
    
    def _fallback_court_availability(self) -> Dict[str, Any]:
        """Fallback for court availability check."""
        logger.warning("Using fallback for court availability check")
        return {
            'available': False,  # Conservative fallback
            'reason': 'Service temporarily unavailable - please try again later',
            'fallback': True
        }
    
    def _fallback_reservation_creation(self) -> Dict[str, Any]:
        """Fallback for reservation creation."""
        logger.warning("Using fallback for reservation creation")
        return {
            'success': False,
            'error': 'Reservation service temporarily unavailable',
            'fallback': True
        }
    
    def _fallback_pricing_calculation(self) -> Dict[str, Any]:
        """Fallback for pricing calculation."""
        logger.warning("Using fallback for pricing calculation")
        return {
            'success': False,
            'error': 'Pricing service temporarily unavailable',
            'fallback': True
        }
    
    def _fallback_club_dashboard(self) -> Dict[str, Any]:
        """Fallback for club dashboard data."""
        logger.warning("Using fallback for club dashboard")
        return {
            'success': True,
            'data': {
                'message': 'Dashboard data temporarily unavailable',
                'fallback': True
            }
        }
    
    def _fallback_maintenance_check(self) -> Dict[str, Any]:
        """Fallback for maintenance status check."""
        logger.warning("Using fallback for maintenance check")
        return {
            'has_maintenance': False,  # Optimistic fallback
            'fallback': True
        }
    
    def get_all_states(self) -> Dict[str, Dict[str, Any]]:
        """Get state of all circuit breakers."""
        return {
            name: cb.get_state() 
            for name, cb in self.circuit_breakers.items()
        }
    
    def reset_all(self):
        """Reset all circuit breakers."""
        for name, cb in self.circuit_breakers.items():
            cb.reset()
        logger.info("All circuit breakers reset")
    
    def reset_circuit_breaker(self, name: str):
        """Reset specific circuit breaker."""
        if name in self.circuit_breakers:
            self.circuit_breakers[name].reset()
            logger.info(f"Circuit breaker '{name}' reset")
        else:
            raise ValueError(f"Circuit breaker '{name}' not found")


# Global instance
club_circuit_breaker = ClubCircuitBreaker()


# Decorator functions for easy use
def with_club_availability_protection(func):
    """Decorator to protect function with club availability circuit breaker."""
    return club_circuit_breaker.get_circuit_breaker('club_availability')(func)


def with_court_availability_protection(func):
    """Decorator to protect function with court availability circuit breaker."""
    return club_circuit_breaker.get_circuit_breaker('court_availability')(func)


def with_reservation_protection(func):
    """Decorator to protect function with reservation circuit breaker."""
    return club_circuit_breaker.get_circuit_breaker('reservation_creation')(func)


def with_pricing_protection(func):
    """Decorator to protect function with pricing circuit breaker."""
    return club_circuit_breaker.get_circuit_breaker('pricing_calculation')(func)


# Utility functions
def get_circuit_breaker_status() -> Dict[str, Any]:
    """Get status of all circuit breakers."""
    return club_circuit_breaker.get_all_states()


def reset_all_circuit_breakers():
    """Reset all circuit breakers."""
    club_circuit_breaker.reset_all()


def is_service_available(service_name: str) -> bool:
    """Check if a specific service is available (circuit breaker is closed)."""
    try:
        cb = club_circuit_breaker.get_circuit_breaker(service_name)
        return cb._can_attempt()
    except ValueError:
        return True  # Unknown services are considered available