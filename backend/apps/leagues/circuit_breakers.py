"""
Circuit breakers and rate limiters for league operations.
Prevents system overload and ensures stable league functionality under high load.

CRITICAL: This module protects against league operation cascading failures.
Every threshold and timeout has been carefully calibrated for league operations.
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable
from functools import wraps
from threading import Lock
from dataclasses import dataclass
from enum import Enum

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone

# Configure circuit breaker logger
logger = logging.getLogger('leagues.circuit_breaker')

# Circuit breaker constants for league operations
LEAGUE_CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5
LEAGUE_CIRCUIT_BREAKER_RECOVERY_TIMEOUT = 60  # seconds
LEAGUE_CIRCUIT_BREAKER_TIMEOUT = 30  # seconds

# Rate limiter constants
LEAGUE_RATE_LIMIT_WINDOW = 60  # seconds
LEAGUE_MAX_OPERATIONS_PER_MINUTE = 30
STANDINGS_UPDATE_RATE_LIMIT = 10  # per minute per season
SEASON_TRANSITION_RATE_LIMIT = 2  # per hour per league

# Specific thresholds for different league operations
LEAGUE_OPERATION_THRESHOLDS = {
    'standings_update': {
        'max_requests': 10,
        'window_seconds': 60,
        'cooldown_seconds': 30
    },
    'season_transition': {
        'max_requests': 2,
        'window_seconds': 3600,  # 1 hour
        'cooldown_seconds': 300  # 5 minutes
    },
    'team_registration': {
        'max_requests': 50,
        'window_seconds': 60,
        'cooldown_seconds': 10
    },
    'match_result_update': {
        'max_requests': 20,
        'window_seconds': 60,
        'cooldown_seconds': 5
    },
    'bracket_generation': {
        'max_requests': 5,
        'window_seconds': 300,  # 5 minutes
        'cooldown_seconds': 60
    }
}


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking requests
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreakerStats:
    """Circuit breaker statistics."""
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state: CircuitBreakerState = CircuitBreakerState.CLOSED
    total_requests: int = 0


class LeagueCircuitBreaker:
    """
    CRITICAL: Circuit breaker for league operations.
    Prevents cascading failures and protects system stability.
    """
    
    def __init__(
        self,
        failure_threshold: int = LEAGUE_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        recovery_timeout: int = LEAGUE_CIRCUIT_BREAKER_RECOVERY_TIMEOUT,
        timeout: int = LEAGUE_CIRCUIT_BREAKER_TIMEOUT,
        name: str = "league_default"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.timeout = timeout
        self.name = name
        self._lock = Lock()
        self._stats = CircuitBreakerStats()
        
        logger.info(
            f"League circuit breaker initialized: {name} "
            f"threshold={failure_threshold} recovery={recovery_timeout}s"
        )
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator to protect functions with circuit breaker."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self._call_with_circuit_breaker(func, *args, **kwargs)
        return wrapper
    
    def _call_with_circuit_breaker(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        with self._lock:
            self._stats.total_requests += 1
            
            # Check current state
            current_state = self._get_state()
            
            if current_state == CircuitBreakerState.OPEN:
                logger.warning(
                    f"Circuit breaker OPEN for {self.name}: "
                    f"failures={self._stats.failure_count} "
                    f"last_failure={self._stats.last_failure_time}"
                )
                raise ValidationError(
                    f"League operation temporarily unavailable: {self.name} circuit breaker open"
                )
            
            if current_state == CircuitBreakerState.HALF_OPEN:
                logger.info(f"Circuit breaker HALF_OPEN for {self.name}: testing recovery")
        
        # Execute the function
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Check for timeout
            if execution_time > self.timeout:
                self._record_failure("timeout")
                raise ValidationError(f"League operation timeout: {execution_time:.2f}s > {self.timeout}s")
            
            self._record_success()
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self._record_failure(str(e))
            logger.error(
                f"Circuit breaker failure in {self.name}: "
                f"error={str(e)} execution_time={execution_time:.2f}s"
            )
            raise
    
    def _get_state(self) -> CircuitBreakerState:
        """Get current circuit breaker state."""
        now = timezone.now()
        
        # If we're in OPEN state, check if we should transition to HALF_OPEN
        if self._stats.state == CircuitBreakerState.OPEN:
            if (self._stats.last_failure_time and 
                (now - self._stats.last_failure_time).total_seconds() >= self.recovery_timeout):
                self._stats.state = CircuitBreakerState.HALF_OPEN
                logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
        
        return self._stats.state
    
    def _record_success(self):
        """Record successful operation."""
        with self._lock:
            self._stats.success_count += 1
            self._stats.last_success_time = timezone.now()
            
            # Reset failure count on success and close circuit if needed
            if self._stats.state == CircuitBreakerState.HALF_OPEN:
                self._stats.state = CircuitBreakerState.CLOSED
                self._stats.failure_count = 0
                logger.info(f"Circuit breaker {self.name} CLOSED: recovery successful")
    
    def _record_failure(self, error: str):
        """Record failed operation."""
        with self._lock:
            self._stats.failure_count += 1
            self._stats.last_failure_time = timezone.now()
            
            # Open circuit if failure threshold exceeded
            if self._stats.failure_count >= self.failure_threshold:
                self._stats.state = CircuitBreakerState.OPEN
                logger.critical(
                    f"Circuit breaker {self.name} OPENED: "
                    f"failures={self._stats.failure_count} threshold={self.failure_threshold}"
                )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics."""
        with self._lock:
            return {
                'name': self.name,
                'state': self._stats.state.value,
                'failure_count': self._stats.failure_count,
                'success_count': self._stats.success_count,
                'total_requests': self._stats.total_requests,
                'last_failure_time': self._stats.last_failure_time.isoformat() if self._stats.last_failure_time else None,
                'last_success_time': self._stats.last_success_time.isoformat() if self._stats.last_success_time else None,
                'failure_rate': self._stats.failure_count / max(self._stats.total_requests, 1)
            }
    
    def reset(self):
        """Reset circuit breaker to initial state."""
        with self._lock:
            self._stats = CircuitBreakerStats()
            logger.info(f"Circuit breaker {self.name} reset")


class LeagueRateLimiter:
    """
    CRITICAL: Rate limiter for league operations.
    Prevents system overload and ensures fair resource usage.
    """
    
    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        cooldown_seconds: int = 0,
        name: str = "league_rate_limiter"
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.cooldown_seconds = cooldown_seconds
        self.name = name
        self._lock = Lock()
        
        logger.info(
            f"League rate limiter initialized: {name} "
            f"max={max_requests} window={window_seconds}s cooldown={cooldown_seconds}s"
        )
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator to apply rate limiting to functions."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self._call_with_rate_limit(func, *args, **kwargs)
        return wrapper
    
    def _call_with_rate_limit(self, func: Callable, *args, **kwargs):
        """Execute function with rate limiting."""
        # Generate cache key based on function and arguments
        cache_key = self._generate_cache_key(func, *args, **kwargs)
        
        with self._lock:
            # Check current request count
            if not self._is_request_allowed(cache_key):
                logger.warning(
                    f"Rate limit exceeded for {self.name}: "
                    f"key={cache_key} max={self.max_requests}"
                )
                raise ValidationError(
                    f"Rate limit exceeded: {self.max_requests} requests per {self.window_seconds} seconds"
                )
            
            # Record the request
            self._record_request(cache_key)
        
        # Execute the function
        try:
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            # Don't penalize failed requests in rate limiting
            logger.debug(f"Rate limited function failed: {str(e)}")
            raise
    
    def _generate_cache_key(self, func: Callable, *args, **kwargs) -> str:
        """Generate cache key for rate limiting."""
        # Use function name and relevant identifiers
        key_parts = [f"rate_limit_{self.name}_{func.__name__}"]
        
        # Add user ID if available
        user = kwargs.get('user') or (args[0] if args else None)
        if hasattr(user, 'id'):
            key_parts.append(f"user_{user.id}")
        
        # Add league/season ID if available
        for obj_name in ['league', 'season']:
            obj = kwargs.get(obj_name)
            if hasattr(obj, 'id'):
                key_parts.append(f"{obj_name}_{obj.id}")
        
        return ":".join(key_parts)
    
    def _is_request_allowed(self, cache_key: str) -> bool:
        """Check if request is allowed based on rate limit."""
        now = timezone.now()
        window_start = now - timedelta(seconds=self.window_seconds)
        
        # Get request timestamps from cache
        request_times = cache.get(cache_key, [])
        
        # Filter out old requests
        recent_requests = [
            timestamp for timestamp in request_times
            if timestamp >= window_start.timestamp()
        ]
        
        # Check if under limit
        if len(recent_requests) >= self.max_requests:
            return False
        
        # Check cooldown if configured
        if self.cooldown_seconds > 0 and recent_requests:
            last_request = max(recent_requests)
            if (now.timestamp() - last_request) < self.cooldown_seconds:
                return False
        
        return True
    
    def _record_request(self, cache_key: str):
        """Record a request for rate limiting."""
        now = timezone.now()
        window_start = now - timedelta(seconds=self.window_seconds)
        
        # Get existing request times
        request_times = cache.get(cache_key, [])
        
        # Filter out old requests and add new one
        recent_requests = [
            timestamp for timestamp in request_times
            if timestamp >= window_start.timestamp()
        ]
        recent_requests.append(now.timestamp())
        
        # Store updated request times
        cache.set(cache_key, recent_requests, timeout=self.window_seconds * 2)
    
    def get_current_usage(self, cache_key: str) -> Dict[str, Any]:
        """Get current rate limit usage for a key."""
        now = timezone.now()
        window_start = now - timedelta(seconds=self.window_seconds)
        
        request_times = cache.get(cache_key, [])
        recent_requests = [
            timestamp for timestamp in request_times
            if timestamp >= window_start.timestamp()
        ]
        
        return {
            'current_requests': len(recent_requests),
            'max_requests': self.max_requests,
            'window_seconds': self.window_seconds,
            'requests_remaining': max(0, self.max_requests - len(recent_requests)),
            'window_reset_seconds': self.window_seconds - (now.timestamp() - min(recent_requests)) if recent_requests else 0
        }


# Pre-configured circuit breakers and rate limiters for league operations
league_standings_circuit_breaker = LeagueCircuitBreaker(
    failure_threshold=3,
    recovery_timeout=30,
    timeout=15,
    name="league_standings"
)

league_season_transition_circuit_breaker = LeagueCircuitBreaker(
    failure_threshold=2,
    recovery_timeout=120,
    timeout=60,
    name="season_transition"
)

league_match_result_circuit_breaker = LeagueCircuitBreaker(
    failure_threshold=5,
    recovery_timeout=30,
    timeout=10,
    name="match_results"
)

# Rate limiters for different operations
standings_update_rate_limiter = LeagueRateLimiter(
    max_requests=STANDINGS_UPDATE_RATE_LIMIT,
    window_seconds=60,
    cooldown_seconds=1,
    name="standings_updates"
)

season_transition_rate_limiter = LeagueRateLimiter(
    max_requests=SEASON_TRANSITION_RATE_LIMIT,
    window_seconds=3600,
    cooldown_seconds=300,
    name="season_transitions"
)

team_registration_rate_limiter = LeagueRateLimiter(
    max_requests=50,
    window_seconds=60,
    cooldown_seconds=2,
    name="team_registrations"
)


def get_league_circuit_breaker(operation_type: str) -> LeagueCircuitBreaker:
    """Get appropriate circuit breaker for league operation type."""
    circuit_breakers = {
        'standings_update': league_standings_circuit_breaker,
        'season_transition': league_season_transition_circuit_breaker,
        'match_result': league_match_result_circuit_breaker
    }
    
    return circuit_breakers.get(operation_type, LeagueCircuitBreaker(name=f"league_{operation_type}"))


def get_league_rate_limiter(operation_type: str) -> LeagueRateLimiter:
    """Get appropriate rate limiter for league operation type."""
    rate_limiters = {
        'standings_update': standings_update_rate_limiter,
        'season_transition': season_transition_rate_limiter,
        'team_registration': team_registration_rate_limiter
    }
    
    if operation_type in rate_limiters:
        return rate_limiters[operation_type]
    
    # Create default rate limiter based on operation thresholds
    if operation_type in LEAGUE_OPERATION_THRESHOLDS:
        config = LEAGUE_OPERATION_THRESHOLDS[operation_type]
        return LeagueRateLimiter(
            max_requests=config['max_requests'],
            window_seconds=config['window_seconds'],
            cooldown_seconds=config['cooldown_seconds'],
            name=f"league_{operation_type}"
        )
    
    # Default rate limiter
    return LeagueRateLimiter(
        max_requests=LEAGUE_MAX_OPERATIONS_PER_MINUTE,
        window_seconds=LEAGUE_RATE_LIMIT_WINDOW,
        name=f"league_{operation_type}_default"
    )


def protected_league_operation(operation_type: str = 'default'):
    """
    Decorator that applies both circuit breaker and rate limiting to league operations.
    """
    def decorator(func: Callable) -> Callable:
        # Get appropriate protection mechanisms
        circuit_breaker = get_league_circuit_breaker(operation_type)
        rate_limiter = get_league_rate_limiter(operation_type)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Apply rate limiting first
            rate_limited_func = rate_limiter(func)
            # Then apply circuit breaker
            protected_func = circuit_breaker(rate_limited_func)
            
            return protected_func(*args, **kwargs)
        
        return wrapper
    return decorator


def get_all_circuit_breaker_stats() -> Dict[str, Any]:
    """Get statistics for all league circuit breakers."""
    circuit_breakers = [
        league_standings_circuit_breaker,
        league_season_transition_circuit_breaker,
        league_match_result_circuit_breaker
    ]
    
    stats = {}
    for cb in circuit_breakers:
        stats[cb.name] = cb.get_stats()
    
    return {
        'circuit_breakers': stats,
        'timestamp': timezone.now().isoformat(),
        'total_breakers': len(stats)
    }


def reset_all_circuit_breakers():
    """Reset all league circuit breakers to initial state."""
    circuit_breakers = [
        league_standings_circuit_breaker,
        league_season_transition_circuit_breaker,
        league_match_result_circuit_breaker
    ]
    
    for cb in circuit_breakers:
        cb.reset()
    
    logger.info("All league circuit breakers reset")


# Health check function for circuit breakers
def check_circuit_breaker_health() -> Dict[str, Any]:
    """Check health of all league circuit breakers."""
    stats = get_all_circuit_breaker_stats()
    
    health_report = {
        'overall_status': 'healthy',
        'circuit_breakers': {},
        'alerts': [],
        'timestamp': timezone.now().isoformat()
    }
    
    for name, cb_stats in stats['circuit_breakers'].items():
        cb_health = {
            'status': 'healthy',
            'state': cb_stats['state'],
            'failure_rate': cb_stats['failure_rate']
        }
        
        # Check for issues
        if cb_stats['state'] == 'open':
            cb_health['status'] = 'circuit_open'
            health_report['overall_status'] = 'degraded'
            health_report['alerts'].append(f"Circuit breaker {name} is OPEN")
        
        elif cb_stats['failure_rate'] > 0.5:  # >50% failure rate
            cb_health['status'] = 'high_failure_rate'
            if health_report['overall_status'] == 'healthy':
                health_report['overall_status'] = 'warning'
            health_report['alerts'].append(f"High failure rate in {name}: {cb_stats['failure_rate']:.2%}")
        
        health_report['circuit_breakers'][name] = cb_health
    
    return health_report