"""
Circuit Breaker pattern implementation for reservations module.
Prevents cascade failures and provides fallback mechanisms for critical reservation operations.
Based on the successful clubs module circuit breaker pattern.
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

logger = logging.getLogger('reservations.circuit_breakers')


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class ReservationCircuitBreakerError(Exception):
    """Custom exception for reservation circuit breaker failures."""
    pass


class ReservationCircuitBreaker:
    """
    Circuit breaker implementation specifically designed for reservation operations.
    More tolerant than clubs circuit breaker due to higher critical nature of reservations.
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,  # More tolerant than clubs
        recovery_timeout: int = 30,  # Faster recovery for reservations
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
        self.failure_count_key = f"reservation_circuit_breaker_{name}_failures"
        self.state_key = f"reservation_circuit_breaker_{name}_state"
        self.last_failure_key = f"reservation_circuit_breaker_{name}_last_failure"
        
        # Load state from cache
        self._load_state_from_cache()
    
    def _load_state_from_cache(self):
        """Load circuit breaker state from cache."""
        try:
            self.failure_count = cache.get(self.failure_count_key, 0)
            self.state = CircuitState(cache.get(self.state_key, CircuitState.CLOSED.value))
            self.last_failure_time = cache.get(self.last_failure_key)
        except Exception as e:
            logger.warning(f"Failed to load reservation circuit breaker state from cache: {e}")
    
    def _save_state_to_cache(self):
        """Save circuit breaker state to cache."""
        try:
            cache.set(self.failure_count_key, self.failure_count, 3600)  # 1 hour
            cache.set(self.state_key, self.state.value, 3600)
            cache.set(self.last_failure_key, self.last_failure_time, 3600)
        except Exception as e:
            logger.warning(f"Failed to save reservation circuit breaker state to cache: {e}")
    
    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset the circuit breaker."""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.recovery_timeout
    
    def _record_success(self):
        """Record a successful operation."""
        with self.lock:
            self.failure_count = 0
            self.state = CircuitState.CLOSED
            self.last_failure_time = None
            self._save_state_to_cache()
            logger.info(f"Reservation circuit breaker '{self.name}' reset to CLOSED state")
    
    def _record_failure(self, exception: Exception):
        """Record a failed operation."""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.error(
                    f"Reservation circuit breaker '{self.name}' opened after {self.failure_count} failures. "
                    f"Last error: {exception}"
                )
            else:
                logger.warning(
                    f"Reservation circuit breaker '{self.name}' failure {self.failure_count}/{self.failure_threshold}. "
                    f"Error: {exception}"
                )
            
            self._save_state_to_cache()
    
    def call_with_breaker(self, func: Callable, *args, **kwargs) -> Any:
        """
        Call a function with circuit breaker protection.
        
        Args:
            func: Function to call
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result or fallback result
            
        Raises:
            ReservationCircuitBreakerError: When circuit is open and no fallback
        """
        with self.lock:
            # Check if circuit is open
            if self.state == CircuitState.OPEN:
                if not self._should_attempt_reset():
                    logger.warning(f"Reservation circuit breaker '{self.name}' is OPEN, using fallback")
                    if self.fallback_function:
                        return self.fallback_function(*args, **kwargs)
                    raise ReservationCircuitBreakerError(
                        f"Reservation circuit breaker '{self.name}' is open"
                    )
                else:
                    # Attempt reset
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Reservation circuit breaker '{self.name}' attempting reset (HALF_OPEN)")
        
        # Attempt to call the function
        try:
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000  # ms
            
            logger.debug(f"Reservation circuit breaker '{self.name}' call succeeded in {execution_time:.2f}ms")
            self._record_success()
            return result
            
        except self.expected_exception as e:
            logger.error(f"Reservation circuit breaker '{self.name}' call failed: {e}")
            self._record_failure(e)
            
            # Return fallback if available
            if self.fallback_function:
                logger.info(f"Using fallback for reservation circuit breaker '{self.name}'")
                return self.fallback_function(*args, **kwargs)
            
            raise
        except Exception as e:
            # Unexpected exception - don't count as failure but log it
            logger.error(f"Unexpected exception in reservation circuit breaker '{self.name}': {e}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics."""
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'failure_threshold': self.failure_threshold,
            'recovery_timeout': self.recovery_timeout,
            'last_failure_time': self.last_failure_time,
            'time_since_last_failure': (
                time.time() - self.last_failure_time 
                if self.last_failure_time else None
            )
        }


class ReservationCircuitBreakerManager:
    """
    Manager for all reservation-related circuit breakers.
    """
    
    def __init__(self):
        self.breakers: Dict[str, ReservationCircuitBreaker] = {}
        self._initialize_breakers()
    
    def _initialize_breakers(self):
        """Initialize all reservation circuit breakers."""
        
        # Availability check circuit breaker
        self.breakers['availability_check'] = ReservationCircuitBreaker(
            name='availability_check',
            failure_threshold=3,  # Very critical - low threshold
            recovery_timeout=15,  # Quick recovery
            expected_exception=(DatabaseError, OperationalError, ValidationError),
            fallback_function=self._availability_fallback
        )
        
        # Reservation creation circuit breaker
        self.breakers['reservation_creation'] = ReservationCircuitBreaker(
            name='reservation_creation',
            failure_threshold=5,
            recovery_timeout=30,
            expected_exception=(DatabaseError, OperationalError, ValidationError),
            fallback_function=self._creation_fallback
        )
        
        # Payment processing circuit breaker
        self.breakers['payment_processing'] = ReservationCircuitBreaker(
            name='payment_processing',
            failure_threshold=3,  # Critical for payments
            recovery_timeout=60,  # Longer recovery for payment issues
            expected_exception=(ValidationError, ConnectionError),
            fallback_function=self._payment_fallback
        )
        
        # Price calculation circuit breaker
        self.breakers['price_calculation'] = ReservationCircuitBreaker(
            name='price_calculation',
            failure_threshold=7,  # More tolerant
            recovery_timeout=20,
            expected_exception=(ValidationError, ValueError),
            fallback_function=self._pricing_fallback
        )
        
        # Cancellation circuit breaker
        self.breakers['cancellation'] = ReservationCircuitBreaker(
            name='cancellation',
            failure_threshold=4,
            recovery_timeout=25,
            expected_exception=(DatabaseError, ValidationError),
            fallback_function=self._cancellation_fallback
        )
        
        # Notification circuit breaker (non-critical)
        self.breakers['notification'] = ReservationCircuitBreaker(
            name='notification',
            failure_threshold=10,  # Very tolerant - notifications are not critical
            recovery_timeout=45,
            expected_exception=(ConnectionError, TimeoutError),
            fallback_function=self._notification_fallback
        )
    
    def get_breaker(self, name: str) -> ReservationCircuitBreaker:
        """Get a specific circuit breaker."""
        if name not in self.breakers:
            raise ValueError(f"Unknown reservation circuit breaker: {name}")
        return self.breakers[name]
    
    def check_availability_with_breaker(self, court, date, start_time, end_time):
        """Check court availability with circuit breaker protection."""
        def availability_check():
            from apps.reservations.mixins import ReservationSafetyMixin
            mixin = ReservationSafetyMixin()
            return mixin.prevent_double_booking(
                court, 
                datetime.combine(date, start_time),
                datetime.combine(date, end_time)
            )
        
        return self.get_breaker('availability_check').call_with_breaker(availability_check)
    
    def create_reservation_with_breaker(self, reservation_data):
        """Create reservation with circuit breaker protection."""
        def create_reservation():
            from apps.reservations.mixins import ReservationSafetyMixin
            mixin = ReservationSafetyMixin()
            return mixin.create_reservation_atomic(reservation_data)
        
        return self.get_breaker('reservation_creation').call_with_breaker(create_reservation)
    
    def calculate_price_with_breaker(self, court, datetime_start, datetime_end, player_count=2):
        """Calculate reservation price with circuit breaker protection."""
        def calculate_price():
            from apps.reservations.mixins import ReservationSafetyMixin
            mixin = ReservationSafetyMixin()
            return mixin.calculate_reservation_price_safe(
                court, datetime_start, datetime_end, player_count
            )
        
        return self.get_breaker('price_calculation').call_with_breaker(calculate_price)
    
    def cancel_reservation_with_breaker(self, reservation, reason='user_requested'):
        """Cancel reservation with circuit breaker protection."""
        def cancel_reservation():
            from apps.reservations.mixins import ReservationSafetyMixin
            mixin = ReservationSafetyMixin()
            return mixin.cancel_reservation_safe(reservation, reason)
        
        return self.get_breaker('cancellation').call_with_breaker(cancel_reservation)
    
    def process_payment_with_breaker(self, reservation, payment_data):
        """Process payment with circuit breaker protection."""
        def process_payment():
            # This would integrate with your payment service
            # For now, return a mock success
            logger.info(f"Processing payment for reservation {reservation.id}")
            return {'status': 'success', 'transaction_id': 'mock_transaction'}
        
        return self.get_breaker('payment_processing').call_with_breaker(process_payment)
    
    def send_notification_with_breaker(self, reservation, notification_type='booking_confirmation'):
        """Send notification with circuit breaker protection."""
        def send_notification():
            # This would integrate with your notification service
            logger.info(f"Sending {notification_type} notification for reservation {reservation.id}")
            return {'status': 'sent', 'message_id': 'mock_message'}
        
        return self.get_breaker('notification').call_with_breaker(send_notification)
    
    # Fallback functions
    def _availability_fallback(self, *args, **kwargs):
        """Fallback for availability checks - assume unavailable for safety."""
        logger.warning("Using availability fallback - assuming slot unavailable for safety")
        return {
            'available': False,
            'reason': 'Availability service temporarily unavailable',
            'fallback': True
        }
    
    def _creation_fallback(self, *args, **kwargs):
        """Fallback for reservation creation - cannot create reservation."""
        logger.error("Reservation creation service unavailable - cannot create reservation")
        raise ReservationCircuitBreakerError(
            "Reservation service temporarily unavailable. Please try again later."
        )
    
    def _payment_fallback(self, *args, **kwargs):
        """Fallback for payment processing."""
        logger.warning("Payment service unavailable - reservation created with pending payment")
        return {
            'status': 'pending',
            'message': 'Payment will be processed when service is available',
            'fallback': True
        }
    
    def _pricing_fallback(self, *args, **kwargs):
        """Fallback for price calculation - use default pricing."""
        logger.warning("Price calculation service unavailable - using default pricing")
        return {
            'total_price': 50.00,
            'currency': 'EUR',
            'fallback': True,
            'message': 'Default pricing applied - final price may vary'
        }
    
    def _cancellation_fallback(self, *args, **kwargs):
        """Fallback for cancellation - mark for manual processing."""
        logger.warning("Cancellation service unavailable - marking for manual processing")
        return {
            'status': 'pending_manual_cancellation',
            'message': 'Cancellation will be processed manually',
            'fallback': True
        }
    
    def _notification_fallback(self, *args, **kwargs):
        """Fallback for notifications - log but don't fail."""
        logger.info("Notification service unavailable - notification will be retried later")
        return {
            'status': 'deferred',
            'message': 'Notification will be sent when service is available',
            'fallback': True
        }
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all circuit breakers."""
        return {
            name: breaker.get_stats() 
            for name, breaker in self.breakers.items()
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status of all circuit breakers."""
        stats = self.get_all_stats()
        
        open_breakers = [
            name for name, stat in stats.items() 
            if stat['state'] == 'open'
        ]
        
        half_open_breakers = [
            name for name, stat in stats.items() 
            if stat['state'] == 'half_open'
        ]
        
        return {
            'overall_healthy': len(open_breakers) == 0,
            'open_breakers': open_breakers,
            'half_open_breakers': half_open_breakers,
            'total_breakers': len(stats),
            'detailed_stats': stats,
            'timestamp': timezone.now().isoformat()
        }


# Global instance
reservation_circuit_breaker = ReservationCircuitBreakerManager()


# Convenience functions for easy import
def check_availability_safe(court, date, start_time, end_time):
    """Convenience function to check availability with circuit breaker."""
    return reservation_circuit_breaker.check_availability_with_breaker(
        court, date, start_time, end_time
    )


def create_reservation_safe(reservation_data):
    """Convenience function to create reservation with circuit breaker."""
    return reservation_circuit_breaker.create_reservation_with_breaker(reservation_data)


def calculate_price_safe(court, datetime_start, datetime_end, player_count=2):
    """Convenience function to calculate price with circuit breaker."""
    return reservation_circuit_breaker.calculate_price_with_breaker(
        court, datetime_start, datetime_end, player_count
    )


def cancel_reservation_safe(reservation, reason='user_requested'):
    """Convenience function to cancel reservation with circuit breaker."""
    return reservation_circuit_breaker.cancel_reservation_with_breaker(reservation, reason)


def process_payment_safe(reservation, payment_data):
    """Convenience function to process payment with circuit breaker."""
    return reservation_circuit_breaker.process_payment_with_breaker(reservation, payment_data)


def send_notification_safe(reservation, notification_type='booking_confirmation'):
    """Convenience function to send notification with circuit breaker."""
    return reservation_circuit_breaker.send_notification_with_breaker(reservation, notification_type)


def get_reservation_circuit_health():
    """Get health status of all reservation circuit breakers."""
    return reservation_circuit_breaker.get_health_status()