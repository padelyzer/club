"""
Caching utilities for BI module performance optimization.
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from functools import wraps

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.db.models import QuerySet

logger = logging.getLogger(__name__)

# Cache configuration
DEFAULT_CACHE_TIMEOUT = getattr(settings, 'BI_CACHE_TIMEOUT', 300)  # 5 minutes
KPI_CACHE_TIMEOUT = 60  # 1 minute for KPIs (more frequent updates)
DASHBOARD_CACHE_TIMEOUT = 300  # 5 minutes for dashboard data
EXPORT_CACHE_TIMEOUT = 600  # 10 minutes for exports
GROWTH_CACHE_TIMEOUT = 1800  # 30 minutes for growth data (less frequent changes)
REVENUE_CACHE_TIMEOUT = 300  # 5 minutes for revenue data
USAGE_CACHE_TIMEOUT = 180  # 3 minutes for usage data

# Cache key prefixes
CACHE_PREFIX = 'bi_analytics'
KPI_PREFIX = f'{CACHE_PREFIX}:kpis'
REVENUE_PREFIX = f'{CACHE_PREFIX}:revenue'
USAGE_PREFIX = f'{CACHE_PREFIX}:usage'
GROWTH_PREFIX = f'{CACHE_PREFIX}:growth'
QUERY_PREFIX = f'{CACHE_PREFIX}:query'


def generate_cache_key(prefix: str, user_id: str, **kwargs) -> str:
    """
    Generate a consistent cache key based on parameters.
    
    Args:
        prefix: Cache key prefix (e.g., 'kpis', 'revenue')
        user_id: User identifier
        **kwargs: Additional parameters to include in the key
    
    Returns:
        str: Cache key
    """
    # Sort kwargs for consistent key generation
    sorted_kwargs = sorted(kwargs.items())
    key_data = f"{user_id}:{json.dumps(sorted_kwargs, sort_keys=True)}"
    key_hash = hashlib.md5(key_data.encode()).hexdigest()
    return f"{prefix}:{key_hash}"


def get_user_cache_context(user) -> Dict[str, Any]:
    """
    Get user-specific cache context (club, role, permissions).
    
    Args:
        user: Django user instance
    
    Returns:
        Dict containing user cache context
    """
    context = {
        'user_id': str(user.id),
        'role': getattr(user, 'role', 'USER'),
    }
    
    # Add club context if user has one
    if hasattr(user, 'club') and user.club:
        context['club_id'] = str(user.club.id)
    
    return context


def cache_analytics_data(
    prefix: str, 
    timeout: Optional[int] = None,
    vary_on: Optional[List[str]] = None
):
    """
    Decorator to cache analytics data with smart key generation.
    
    Args:
        prefix: Cache prefix for this data type
        timeout: Cache timeout in seconds (defaults to DEFAULT_CACHE_TIMEOUT)
        vary_on: List of parameter names to include in cache key
    
    Usage:
        @cache_analytics_data('kpis', timeout=60, vary_on=['start_date', 'end_date'])
        def get_kpis(self, user, start_date, end_date):
            # expensive computation
            return data
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not getattr(settings, 'USE_CACHE', True):
                return func(self, request, *args, **kwargs)
            
            user = request.user
            cache_timeout = timeout or DEFAULT_CACHE_TIMEOUT
            
            # Build cache key parameters
            cache_params = get_user_cache_context(user)
            
            # Add query parameters to cache key
            if vary_on:
                for param in vary_on:
                    if param in request.query_params:
                        cache_params[param] = request.query_params[param]
            
            # Generate cache key
            cache_key = generate_cache_key(prefix, str(user.id), **cache_params)
            
            # Try to get from cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.debug(f"Cache HIT for key: {cache_key}")
                return cached_data
            
            # Cache miss - compute data
            logger.debug(f"Cache MISS for key: {cache_key}")
            result = func(self, request, *args, **kwargs)
            
            # Cache successful responses
            if hasattr(result, 'status_code') and result.status_code == 200:
                cache.set(cache_key, result, cache_timeout)
                logger.debug(f"Cached data for key: {cache_key}, timeout: {cache_timeout}s")
            
            return result
            
        return wrapper
    return decorator


def invalidate_analytics_cache(user_id: str, cache_types: Optional[List[str]] = None):
    """
    Invalidate analytics cache for a specific user.
    
    Args:
        user_id: User ID to invalidate cache for
        cache_types: List of cache types to invalidate (None = all)
    """
    prefixes = cache_types or [KPI_PREFIX, REVENUE_PREFIX, USAGE_PREFIX, GROWTH_PREFIX]
    
    # Since we can't easily list all keys, we'll use a version-based approach
    for prefix in prefixes:
        version_key = f"{prefix}:version:{user_id}"
        current_version = cache.get(version_key, 0)
        cache.set(version_key, current_version + 1, 86400)  # 24 hours
        logger.info(f"Invalidated cache for user {user_id}, prefix {prefix}")


def get_cache_version(user_id: str, prefix: str) -> int:
    """Get current cache version for user and prefix."""
    version_key = f"{prefix}:version:{user_id}"
    return cache.get(version_key, 0)


class QueryCacheManager:
    """
    Manager for caching database queries with smart invalidation.
    """
    
    @staticmethod
    def cache_queryset(
        queryset: QuerySet,
        cache_key: str,
        timeout: int = DEFAULT_CACHE_TIMEOUT,
        select_related: Optional[List[str]] = None,
        prefetch_related: Optional[List[str]] = None
    ) -> List:
        """
        Cache a queryset with optional optimizations.
        
        Args:
            queryset: Django QuerySet to cache
            cache_key: Cache key to use
            timeout: Cache timeout in seconds
            select_related: Fields to select_related
            prefetch_related: Fields to prefetch_related
        
        Returns:
            List of model instances
        """
        # Check cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data
        
        # Optimize queryset
        if select_related:
            queryset = queryset.select_related(*select_related)
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        
        # Execute and cache
        result = list(queryset)
        cache.set(cache_key, result, timeout)
        
        return result
    
    @staticmethod
    def cache_aggregation(
        queryset: QuerySet,
        aggregation_func: callable,
        cache_key: str,
        timeout: int = DEFAULT_CACHE_TIMEOUT
    ) -> Any:
        """
        Cache aggregation results.
        
        Args:
            queryset: Django QuerySet
            aggregation_func: Function to perform aggregation
            cache_key: Cache key to use
            timeout: Cache timeout in seconds
        
        Returns:
            Aggregation result
        """
        # Check cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return cached_result
        
        # Compute aggregation
        result = aggregation_func(queryset)
        cache.set(cache_key, result, timeout)
        
        return result


class MemoryCache:
    """
    In-memory cache for frequently accessed data within a request.
    """
    
    def __init__(self):
        self._cache = {}
        self._timestamps = {}
        self._ttl = {}
    
    def get(self, key: str, default=None):
        """Get value from memory cache."""
        if key not in self._cache:
            return default
        
        # Check TTL
        if key in self._ttl:
            if timezone.now().timestamp() > self._ttl[key]:
                self.delete(key)
                return default
        
        return self._cache.get(key, default)
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        """Set value in memory cache."""
        self._cache[key] = value
        self._timestamps[key] = timezone.now()
        
        if ttl_seconds:
            self._ttl[key] = timezone.now().timestamp() + ttl_seconds
    
    def delete(self, key: str):
        """Delete value from memory cache."""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
        self._ttl.pop(key, None)
    
    def clear(self):
        """Clear all cached data."""
        self._cache.clear()
        self._timestamps.clear()
        self._ttl.clear()
    
    def size(self) -> int:
        """Get number of cached items."""
        return len(self._cache)


# Global memory cache instance for request-scoped caching
request_cache = MemoryCache()


def warm_cache(user_id: str, club_id: Optional[str] = None):
    """
    Pre-warm cache with commonly accessed data.
    
    Args:
        user_id: User ID to warm cache for
        club_id: Optional club ID for club-specific data
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        
        # This would be called by a background task
        logger.info(f"Warming cache for user {user_id}")
        
        # Warm common queries (implement based on actual usage patterns)
        # Example: pre-load KPIs for current month
        # kpis_data = get_kpis_data(user, start_date=start_of_month, end_date=now)
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for cache warming")


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics for monitoring.
    
    Returns:
        Dict with cache statistics
    """
    # This would integrate with your monitoring system
    return {
        'memory_cache_size': request_cache.size(),
        'cache_backend': cache.__class__.__name__,
        'default_timeout': DEFAULT_CACHE_TIMEOUT,
        'kpi_timeout': KPI_CACHE_TIMEOUT,
        'growth_timeout': GROWTH_CACHE_TIMEOUT,
    }


# Cache middleware for request-scoped caching
class RequestCacheMiddleware:
    """Middleware to provide request-scoped caching."""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Clear request cache at start of request
        request_cache.clear()
        
        response = self.get_response(request)
        
        # Optionally log cache stats
        if getattr(settings, 'DEBUG', False):
            logger.debug(f"Request cache size: {request_cache.size()}")
        
        return response