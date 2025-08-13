"""
Financial circuit breakers and failover systems for payment gateway reliability.
Provides automatic fallback to secondary gateways and manual processing queues.

CRITICAL: Payment gateway failures can cause revenue loss.
This module ensures continuous payment processing capability.
"""

import logging
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Callable, Any
from decimal import Decimal
from contextlib import contextmanager

from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger('finance.circuit_breakers')

# Circuit breaker states
class CircuitBreakerState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, rejecting requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class PaymentGatewayCircuitBreaker:
    """
    CRITICAL: Circuit breaker for payment gateway reliability.
    
    Monitors gateway health and automatically switches to backup gateways
    when primary gateway fails. Prevents cascade failures and ensures
    continuous payment processing.
    """
    
    def __init__(self, 
                 gateway_name: str,
                 failure_threshold: int = 5,
                 recovery_timeout: int = 300,  # 5 minutes
                 success_threshold: int = 3):
        self.gateway_name = gateway_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout  
        self.success_threshold = success_threshold
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.next_attempt_time = None
        
        # Cache keys for persistence across requests
        self.state_cache_key = f"circuit_breaker_state_{gateway_name}"
        self.failure_cache_key = f"circuit_breaker_failures_{gateway_name}"
        self.last_failure_cache_key = f"circuit_breaker_last_failure_{gateway_name}"
        
        self._load_state_from_cache()
    
    def _load_state_from_cache(self):
        """Load circuit breaker state from cache."""
        try:
            cached_state = cache.get(self.state_cache_key)
            if cached_state:
                self.state = CircuitBreakerState(cached_state)
            
            self.failure_count = cache.get(self.failure_cache_key, 0)
            
            last_failure = cache.get(self.last_failure_cache_key)
            if last_failure:
                self.last_failure_time = datetime.fromisoformat(last_failure)
                self.next_attempt_time = self.last_failure_time + timedelta(seconds=self.recovery_timeout)
            
        except Exception as e:
            logger.warning(f"Failed to load circuit breaker state: {e}")
            # Reset to safe defaults
            self.state = CircuitBreakerState.CLOSED
            self.failure_count = 0
            self.last_failure_time = None
    
    def _save_state_to_cache(self):
        """Save circuit breaker state to cache."""
        try:
            cache.set(self.state_cache_key, self.state.value, 3600)  # 1 hour
            cache.set(self.failure_cache_key, self.failure_count, 3600)
            
            if self.last_failure_time:
                cache.set(
                    self.last_failure_cache_key, 
                    self.last_failure_time.isoformat(), 
                    3600
                )
                
        except Exception as e:
            logger.error(f"Failed to save circuit breaker state: {e}")
    
    def can_execute(self) -> bool:
        """Check if request can be executed through this gateway."""
        current_time = timezone.now()
        
        if self.state == CircuitBreakerState.CLOSED:
            return True
        elif self.state == CircuitBreakerState.OPEN:
            if self.next_attempt_time and current_time >= self.next_attempt_time:
                self.state = CircuitBreakerState.HALF_OPEN
                self.success_count = 0
                logger.info(f"Circuit breaker {self.gateway_name} moving to HALF_OPEN")
                self._save_state_to_cache()
                return True
            return False
        elif self.state == CircuitBreakerState.HALF_OPEN:
            return True
        
        return False
    
    def record_success(self):
        """Record successful gateway operation."""
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self._reset()
                logger.info(f"Circuit breaker {self.gateway_name} recovered - moving to CLOSED")
        elif self.state == CircuitBreakerState.CLOSED:
            # Reset failure count on success
            if self.failure_count > 0:
                self.failure_count = max(0, self.failure_count - 1)
        
        self._save_state_to_cache()
    
    def record_failure(self):
        """Record gateway failure."""
        self.failure_count += 1
        self.last_failure_time = timezone.now()
        
        if self.state == CircuitBreakerState.HALF_OPEN:
            self._trip()
            logger.warning(f"Circuit breaker {self.gateway_name} failed during recovery - back to OPEN")
        elif self.failure_count >= self.failure_threshold:
            self._trip()
            logger.critical(f"Circuit breaker {self.gateway_name} TRIPPED - too many failures")
        
        self._save_state_to_cache()
    
    def _trip(self):
        """Trip the circuit breaker to OPEN state."""
        self.state = CircuitBreakerState.OPEN
        self.next_attempt_time = timezone.now() + timedelta(seconds=self.recovery_timeout)
        
        # Alert monitoring systems
        logger.critical(
            f"PAYMENT_GATEWAY_CIRCUIT_BREAKER_OPEN: {self.gateway_name} "
            f"failures={self.failure_count} next_attempt={self.next_attempt_time}"
        )
    
    def _reset(self):
        """Reset circuit breaker to CLOSED state."""
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.next_attempt_time = None
    
    @contextmanager
    def protected_call(self):
        """Context manager for protected gateway calls."""
        if not self.can_execute():
            raise ValidationError(f"Payment gateway {self.gateway_name} unavailable (circuit breaker OPEN)")
        
        try:
            yield
            self.record_success()
        except Exception as e:
            self.record_failure()
            logger.error(f"Payment gateway {self.gateway_name} call failed: {e}")
            raise


class FinanceRateLimiter:
    """
    CRITICAL: Rate limiter for financial operations to prevent abuse.
    
    Implements multiple rate limiting strategies:
    - Per-user transaction limits
    - Global system limits
    - Payment method specific limits
    - Time-based windows
    """
    
    def __init__(self):
        self.rate_limits = {
            'user_transactions_per_minute': 10,
            'user_transactions_per_hour': 100,
            'user_daily_amount_limit': Decimal('50000.00'),
            'global_transactions_per_second': 100,
            'card_transactions_per_minute': 5,  # Stricter for cards
            'high_value_transactions_per_hour': 5,  # > $1000
        }
    
    def check_rate_limit(self, 
                        user=None, 
                        amount: Decimal = None,
                        payment_method: str = None,
                        transaction_type: str = None) -> Dict[str, Any]:
        """
        Check if operation is within rate limits.
        
        Returns:
            Dict with 'allowed' boolean and limit information
        """
        current_time = timezone.now()
        
        rate_check_result = {
            'allowed': True,
            'limits_checked': [],
            'violations': [],
            'retry_after': None
        }
        
        try:
            # Check user-specific limits
            if user:
                user_checks = self._check_user_limits(user, amount, current_time)
                rate_check_result['limits_checked'].extend(user_checks['checked'])
                if not user_checks['allowed']:
                    rate_check_result['allowed'] = False
                    rate_check_result['violations'].extend(user_checks['violations'])
            
            # Check payment method specific limits
            if payment_method:
                method_checks = self._check_payment_method_limits(
                    payment_method, current_time
                )
                rate_check_result['limits_checked'].extend(method_checks['checked'])
                if not method_checks['allowed']:
                    rate_check_result['allowed'] = False
                    rate_check_result['violations'].extend(method_checks['violations'])
            
            # Check global system limits
            system_checks = self._check_system_limits(current_time)
            rate_check_result['limits_checked'].extend(system_checks['checked'])
            if not system_checks['allowed']:
                rate_check_result['allowed'] = False
                rate_check_result['violations'].extend(system_checks['violations'])
            
            # Check high-value transaction limits
            if amount and amount > Decimal('1000.00'):
                hv_checks = self._check_high_value_limits(user, current_time)
                rate_check_result['limits_checked'].extend(hv_checks['checked'])
                if not hv_checks['allowed']:
                    rate_check_result['allowed'] = False
                    rate_check_result['violations'].extend(hv_checks['violations'])
            
            # Set retry after time if rate limited
            if not rate_check_result['allowed']:
                rate_check_result['retry_after'] = 60  # seconds
            
            # Log rate limit check
            if not rate_check_result['allowed']:
                logger.warning(
                    f"RATE_LIMIT_VIOLATION: user={getattr(user, 'id', 'anonymous')} "
                    f"amount={amount} violations={rate_check_result['violations']}"
                )
            
            return rate_check_result
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open for business continuity
            return {
                'allowed': True,
                'limits_checked': ['error_fallback'],
                'violations': [],
                'error': str(e)
            }
    
    def _check_user_limits(self, user, amount: Optional[Decimal], current_time) -> Dict:
        """Check user-specific rate limits."""
        user_id = str(user.id)
        result = {'allowed': True, 'checked': [], 'violations': []}
        
        # Check transactions per minute
        minute_key = f"rate_limit_user_{user_id}_minute_{current_time.strftime('%Y%m%d%H%M')}"
        minute_count = cache.get(minute_key, 0)
        result['checked'].append(f'user_per_minute: {minute_count}/10')
        
        if minute_count >= self.rate_limits['user_transactions_per_minute']:
            result['allowed'] = False
            result['violations'].append('user_transactions_per_minute_exceeded')
        
        # Check transactions per hour  
        hour_key = f"rate_limit_user_{user_id}_hour_{current_time.strftime('%Y%m%d%H')}"
        hour_count = cache.get(hour_key, 0)
        result['checked'].append(f'user_per_hour: {hour_count}/100')
        
        if hour_count >= self.rate_limits['user_transactions_per_hour']:
            result['allowed'] = False
            result['violations'].append('user_transactions_per_hour_exceeded')
        
        # Check daily amount limit
        if amount:
            day_key = f"rate_limit_user_{user_id}_amount_{current_time.strftime('%Y%m%d')}"
            daily_amount = cache.get(day_key, Decimal('0.00'))
            result['checked'].append(f'user_daily_amount: {daily_amount + amount}/50000')
            
            if daily_amount + amount > self.rate_limits['user_daily_amount_limit']:
                result['allowed'] = False
                result['violations'].append('user_daily_amount_limit_exceeded')
        
        return result
    
    def _check_payment_method_limits(self, payment_method: str, current_time) -> Dict:
        """Check payment method specific limits."""
        result = {'allowed': True, 'checked': [], 'violations': []}
        
        if payment_method == 'card':
            minute_key = f"rate_limit_cards_minute_{current_time.strftime('%Y%m%d%H%M')}"
            card_count = cache.get(minute_key, 0)
            result['checked'].append(f'cards_per_minute: {card_count}/5')
            
            if card_count >= self.rate_limits['card_transactions_per_minute']:
                result['allowed'] = False
                result['violations'].append('card_transactions_per_minute_exceeded')
        
        return result
    
    def _check_system_limits(self, current_time) -> Dict:
        """Check global system limits."""
        result = {'allowed': True, 'checked': [], 'violations': []}
        
        second_key = f"rate_limit_global_second_{current_time.strftime('%Y%m%d%H%M%S')}"
        global_count = cache.get(second_key, 0)
        result['checked'].append(f'global_per_second: {global_count}/100')
        
        if global_count >= self.rate_limits['global_transactions_per_second']:
            result['allowed'] = False
            result['violations'].append('global_transactions_per_second_exceeded')
        
        return result
    
    def _check_high_value_limits(self, user, current_time) -> Dict:
        """Check high-value transaction limits."""
        result = {'allowed': True, 'checked': [], 'violations': []}
        
        if user:
            user_id = str(user.id)
            hour_key = f"rate_limit_hv_{user_id}_hour_{current_time.strftime('%Y%m%d%H')}"
            hv_count = cache.get(hour_key, 0)
            result['checked'].append(f'high_value_per_hour: {hv_count}/5')
            
            if hv_count >= self.rate_limits['high_value_transactions_per_hour']:
                result['allowed'] = False
                result['violations'].append('high_value_transactions_per_hour_exceeded')
        
        return result
    
    def record_transaction(self, 
                          user=None, 
                          amount: Decimal = None,
                          payment_method: str = None):
        """Record transaction for rate limiting tracking."""
        current_time = timezone.now()
        
        try:
            if user:
                user_id = str(user.id)
                
                # Record per-minute counter
                minute_key = f"rate_limit_user_{user_id}_minute_{current_time.strftime('%Y%m%d%H%M')}"
                cache.set(minute_key, cache.get(minute_key, 0) + 1, 60)
                
                # Record per-hour counter
                hour_key = f"rate_limit_user_{user_id}_hour_{current_time.strftime('%Y%m%d%H')}"
                cache.set(hour_key, cache.get(hour_key, 0) + 1, 3600)
                
                # Record daily amount
                if amount:
                    day_key = f"rate_limit_user_{user_id}_amount_{current_time.strftime('%Y%m%d')}"
                    current_amount = cache.get(day_key, Decimal('0.00'))
                    cache.set(day_key, current_amount + amount, 86400)
                    
                    # Record high-value transactions
                    if amount > Decimal('1000.00'):
                        hv_hour_key = f"rate_limit_hv_{user_id}_hour_{current_time.strftime('%Y%m%d%H')}"
                        cache.set(hv_hour_key, cache.get(hv_hour_key, 0) + 1, 3600)
            
            # Record payment method counters
            if payment_method == 'card':
                minute_key = f"rate_limit_cards_minute_{current_time.strftime('%Y%m%d%H%M')}"
                cache.set(minute_key, cache.get(minute_key, 0) + 1, 60)
            
            # Record global counter
            second_key = f"rate_limit_global_second_{current_time.strftime('%Y%m%d%H%M%S')}"
            cache.set(second_key, cache.get(second_key, 0) + 1, 1)
            
        except Exception as e:
            logger.error(f"Failed to record transaction for rate limiting: {e}")


class PaymentGatewayManager:
    """
    CRITICAL: Manager for multiple payment gateways with automatic failover.
    
    Coordinates multiple payment gateways and provides automatic failover
    when primary gateways fail. Includes manual processing queue for
    when all automated gateways are down.
    """
    
    def __init__(self):
        # Initialize circuit breakers for each gateway
        self.circuit_breakers = {
            'stripe': PaymentGatewayCircuitBreaker('stripe', failure_threshold=3),
            'paypal': PaymentGatewayCircuitBreaker('paypal', failure_threshold=5),
            'oxxo': PaymentGatewayCircuitBreaker('oxxo', failure_threshold=10),
            'spei': PaymentGatewayCircuitBreaker('spei', failure_threshold=5)
        }
        
        # Gateway priority order (primary to fallback)
        self.gateway_priority = ['stripe', 'paypal', 'oxxo', 'spei']
        
        # Rate limiter
        self.rate_limiter = FinanceRateLimiter()
        
        # Manual processing queue
        self.manual_queue_key = 'finance_manual_processing_queue'
    
    def process_payment(self, 
                       amount: Decimal,
                       payment_method: str,
                       user=None,
                       metadata: Dict = None) -> Dict[str, Any]:
        """
        CRITICAL: Process payment with automatic gateway failover.
        
        Attempts payment through available gateways in priority order.
        Falls back to manual processing queue if all gateways fail.
        """
        
        # Rate limiting check
        rate_check = self.rate_limiter.check_rate_limit(
            user=user,
            amount=amount,
            payment_method=payment_method
        )
        
        if not rate_check['allowed']:
            logger.warning(f"Payment rate limited: {rate_check['violations']}")
            raise ValidationError(f"Rate limit exceeded: {rate_check['violations']}")
        
        # Record transaction for rate limiting
        self.rate_limiter.record_transaction(user, amount, payment_method)
        
        # Determine suitable gateways for payment method
        suitable_gateways = self._get_suitable_gateways(payment_method)
        
        # Try each gateway in priority order
        for gateway in suitable_gateways:
            try:
                result = self._try_gateway_payment(gateway, amount, payment_method, user, metadata)
                if result['status'] == 'success':
                    logger.info(f"Payment successful via {gateway}: {result}")
                    return result
                    
            except Exception as e:
                logger.warning(f"Payment failed via {gateway}: {e}")
                continue
        
        # All gateways failed - add to manual processing queue
        logger.critical("All payment gateways failed - adding to manual queue")
        return self._add_to_manual_queue(amount, payment_method, user, metadata)
    
    def _get_suitable_gateways(self, payment_method: str) -> List[str]:
        """Get gateways suitable for the payment method, in priority order."""
        gateway_compatibility = {
            'card': ['stripe', 'paypal'],
            'transfer': ['spei'],
            'cash': ['oxxo'],
            'paypal': ['paypal']
        }
        
        compatible = gateway_compatibility.get(payment_method, [])
        
        # Filter to available gateways (circuit breaker not OPEN)
        available = [
            gw for gw in compatible 
            if gw in self.circuit_breakers and self.circuit_breakers[gw].can_execute()
        ]
        
        # Sort by priority
        prioritized = [gw for gw in self.gateway_priority if gw in available]
        
        logger.info(f"Available gateways for {payment_method}: {prioritized}")
        return prioritized
    
    def _try_gateway_payment(self, 
                           gateway: str,
                           amount: Decimal, 
                           payment_method: str,
                           user,
                           metadata: Dict) -> Dict[str, Any]:
        """Try processing payment through specific gateway."""
        
        circuit_breaker = self.circuit_breakers[gateway]
        
        with circuit_breaker.protected_call():
            # Mock gateway processing - in production this would call actual gateway APIs
            logger.info(f"Processing ${amount} via {gateway}")
            
            # Simulate processing time
            time.sleep(0.1)
            
            # Simulate occasional failures for testing
            import random
            if random.random() < 0.1:  # 10% failure rate for testing
                raise Exception(f"Gateway {gateway} processing error")
            
            return {
                'status': 'success',
                'gateway': gateway,
                'transaction_id': f"{gateway}_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
                'amount': str(amount),
                'timestamp': timezone.now().isoformat()
            }
    
    def _add_to_manual_queue(self, 
                           amount: Decimal,
                           payment_method: str, 
                           user,
                           metadata: Dict) -> Dict[str, Any]:
        """Add payment to manual processing queue."""
        
        manual_item = {
            'id': str(timezone.now().timestamp()),
            'amount': str(amount),
            'payment_method': payment_method,
            'user_id': getattr(user, 'id', None),
            'metadata': metadata or {},
            'created_at': timezone.now().isoformat(),
            'status': 'pending_manual_processing'
        }
        
        # Add to queue (in production, use proper queue system)
        try:
            queue = cache.get(self.manual_queue_key, [])
            queue.append(manual_item)
            cache.set(self.manual_queue_key, queue, 86400)  # 24 hours
            
            logger.critical(f"Payment added to manual queue: {manual_item}")
            
            # Alert administrators
            self._alert_manual_processing_required(manual_item)
            
            return {
                'status': 'queued_for_manual_processing',
                'queue_id': manual_item['id'],
                'message': 'Payment will be processed manually within 24 hours'
            }
            
        except Exception as e:
            logger.critical(f"Failed to add payment to manual queue: {e}")
            raise ValidationError("Payment processing temporarily unavailable")
    
    def _alert_manual_processing_required(self, payment_item: Dict):
        """Alert administrators that manual payment processing is required."""
        # In production, this would send emails/notifications to admin staff
        logger.critical(
            f"MANUAL_PAYMENT_PROCESSING_REQUIRED: "
            f"amount=${payment_item['amount']} "
            f"user={payment_item.get('user_id', 'anonymous')}"
        )
    
    def get_manual_queue_status(self) -> Dict[str, Any]:
        """Get status of manual processing queue."""
        try:
            queue = cache.get(self.manual_queue_key, [])
            
            return {
                'queue_length': len(queue),
                'total_amount': sum(Decimal(item['amount']) for item in queue),
                'oldest_item': min((item['created_at'] for item in queue), default=None),
                'items': queue
            }
            
        except Exception as e:
            logger.error(f"Failed to get manual queue status: {e}")
            return {
                'queue_length': 0,
                'total_amount': Decimal('0.00'),
                'error': str(e)
            }
    
    def get_gateway_health_status(self) -> Dict[str, Any]:
        """Get health status of all payment gateways."""
        status = {
            'timestamp': timezone.now().isoformat(),
            'overall_healthy': True,
            'gateways': {}
        }
        
        for gateway_name, circuit_breaker in self.circuit_breakers.items():
            gateway_status = {
                'state': circuit_breaker.state.value,
                'can_execute': circuit_breaker.can_execute(),
                'failure_count': circuit_breaker.failure_count,
                'last_failure': circuit_breaker.last_failure_time.isoformat() if circuit_breaker.last_failure_time else None
            }
            
            status['gateways'][gateway_name] = gateway_status
            
            if not gateway_status['can_execute']:
                status['overall_healthy'] = False
        
        return status


# Singleton instance for global use
payment_gateway_manager = PaymentGatewayManager()