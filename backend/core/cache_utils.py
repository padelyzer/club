"""
Cache utilities for Padelyzer.
Provides caching decorators and utilities for expensive queries.
"""

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union

from django.core.cache import cache
from django.db.models import Model, QuerySet
from django.utils import timezone


class CacheKeyBuilder:
    """Utility class for building consistent cache keys."""
    
    @staticmethod
    def build_key(prefix: str, **kwargs) -> str:
        """
        Build a cache key from prefix and parameters.
        
        Args:
            prefix: Cache key prefix
            **kwargs: Key parameters
            
        Returns:
            Consistent cache key
        """
        # Sort kwargs for consistent key generation
        sorted_params = sorted(kwargs.items())
        param_str = json.dumps(sorted_params, sort_keys=True, default=str)
        
        # Create hash for long keys
        if len(param_str) > 200:
            param_hash = hashlib.md5(param_str.encode()).hexdigest()
            return f"{prefix}:{param_hash}"
        
        # Use readable key for short params
        param_parts = [f"{k}:{v}" for k, v in sorted_params]
        return f"{prefix}:{':'.join(param_parts)}"
    
    @staticmethod
    def invalidation_key(prefix: str) -> str:
        """Get invalidation timestamp key for a cache prefix."""
        return f"{prefix}:invalidated_at"


def cache_queryset(
    timeout: int = 300,
    key_prefix: Optional[str] = None,
    vary_on: Optional[List[str]] = None
):
    """
    Decorator for caching queryset results.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        key_prefix: Custom cache key prefix
        vary_on: List of attributes to vary cache on
    
    Usage:
        @cache_queryset(timeout=600, vary_on=['organization_id'])
        def get_expensive_data(self, organization_id):
            return ExpensiveModel.objects.filter(organization_id=organization_id)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs) -> Union[QuerySet, List[Model]]:
            # Build cache key
            prefix = key_prefix or f"{self.__class__.__name__}:{func.__name__}"
            
            # Add vary_on parameters
            cache_params = {}
            if vary_on:
                for param in vary_on:
                    if hasattr(self, param):
                        cache_params[param] = getattr(self, param)
                    elif param in kwargs:
                        cache_params[param] = kwargs[param]
                    elif hasattr(self, 'request') and hasattr(self.request, param):
                        cache_params[param] = getattr(self.request, param)
                    elif hasattr(self, 'request') and hasattr(self.request, 'user') and hasattr(self.request.user, param):
                        cache_params[param] = getattr(self.request.user, param)
            
            # Add args to cache key
            if args:
                cache_params['args'] = args
            
            cache_key = CacheKeyBuilder.build_key(prefix, **cache_params)
            
            # Check invalidation timestamp
            invalidation_key = CacheKeyBuilder.invalidation_key(prefix)
            invalidated_at = cache.get(invalidation_key)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                # Check if cache is still valid
                if invalidated_at is None or cached_result.get('cached_at', 0) > invalidated_at:
                    return cached_result['data']
            
            # Execute function and cache result
            result = func(self, *args, **kwargs)
            
            # Convert queryset to list for caching
            if isinstance(result, QuerySet):
                cache_data = list(result)
            else:
                cache_data = result
            
            # Store with timestamp
            cache_value = {
                'data': cache_data,
                'cached_at': timezone.now().timestamp()
            }
            
            cache.set(cache_key, cache_value, timeout)
            
            return cache_data
        
        # Add cache invalidation method
        def invalidate_cache(prefix_override: Optional[str] = None):
            """Invalidate all cached data for this function."""
            inv_prefix = prefix_override or key_prefix or f"{wrapper.__qualname__}"
            invalidation_key = CacheKeyBuilder.invalidation_key(inv_prefix)
            cache.set(invalidation_key, timezone.now().timestamp(), timeout=86400)  # 24 hours
        
        wrapper.invalidate_cache = invalidate_cache
        return wrapper
    
    return decorator


def cache_method_result(
    timeout: int = 300,
    key_prefix: Optional[str] = None,
    vary_on_args: bool = True
):
    """
    Decorator for caching method results.
    
    Args:
        timeout: Cache timeout in seconds
        key_prefix: Custom cache key prefix
        vary_on_args: Include method arguments in cache key
    
    Usage:
        @cache_method_result(timeout=600)
        def calculate_statistics(self, start_date, end_date):
            return expensive_calculation()
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs) -> Any:
            # Build cache key
            prefix = key_prefix or f"{self.__class__.__name__}:{func.__name__}"
            
            cache_params = {}
            if vary_on_args:
                if args:
                    cache_params['args'] = args
                if kwargs:
                    cache_params['kwargs'] = kwargs
            
            # Add instance ID if available
            if hasattr(self, 'id'):
                cache_params['instance_id'] = self.id
            elif hasattr(self, 'pk'):
                cache_params['instance_pk'] = self.pk
            
            cache_key = CacheKeyBuilder.build_key(prefix, **cache_params)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(self, *args, **kwargs)
            cache.set(cache_key, result, timeout)
            
            return result
        
        return wrapper
    
    return decorator


def cache_per_organization(timeout: int = 300, key_prefix: Optional[str] = None):
    """
    Decorator for caching data per organization.
    Automatically includes organization_id in cache key.
    
    Usage:
        @cache_per_organization(timeout=600)
        def get_organization_stats(self):
            return expensive_stats_calculation()
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs) -> Any:
            # Get organization ID
            org_id = None
            if hasattr(self, 'organization_id'):
                org_id = self.organization_id
            elif hasattr(self, 'request') and hasattr(self.request.user, 'organization_id'):
                org_id = self.request.user.organization_id
            elif 'organization_id' in kwargs:
                org_id = kwargs['organization_id']
            
            if not org_id:
                # Don't cache if no organization
                return func(self, *args, **kwargs)
            
            # Build cache key
            prefix = key_prefix or f"{self.__class__.__name__}:{func.__name__}"
            cache_key = CacheKeyBuilder.build_key(prefix, organization_id=org_id)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(self, *args, **kwargs)
            cache.set(cache_key, result, timeout)
            
            return result
        
        return wrapper
    
    return decorator


class QueryCacheManager:
    """Manager for caching expensive database queries."""
    
    @staticmethod
    def cache_aggregation(
        cache_key: str,
        queryset: QuerySet,
        aggregation: Dict[str, Any],
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Cache aggregation results.
        
        Args:
            cache_key: Cache key
            queryset: QuerySet to aggregate
            aggregation: Aggregation dict
            timeout: Cache timeout
            
        Returns:
            Aggregation results
        """
        result = cache.get(cache_key)
        if result is None:
            result = queryset.aggregate(**aggregation)
            cache.set(cache_key, result, timeout)
        return result
    
    @staticmethod
    def cache_count(
        cache_key: str,
        queryset: QuerySet,
        timeout: int = 300
    ) -> int:
        """
        Cache count results.
        
        Args:
            cache_key: Cache key
            queryset: QuerySet to count
            timeout: Cache timeout
            
        Returns:
            Count result
        """
        count = cache.get(cache_key)
        if count is None:
            count = queryset.count()
            cache.set(cache_key, count, timeout)
        return count
    
    @staticmethod
    def cache_exists(
        cache_key: str,
        queryset: QuerySet,
        timeout: int = 300
    ) -> bool:
        """
        Cache exists results.
        
        Args:
            cache_key: Cache key
            queryset: QuerySet to check
            timeout: Cache timeout
            
        Returns:
            Exists result
        """
        exists = cache.get(cache_key)
        if exists is None:
            exists = queryset.exists()
            cache.set(cache_key, exists, timeout)
        return exists


# Specific cache decorators for common use cases

def cache_dashboard_stats(timeout: int = 300):
    """Cache dashboard statistics per club."""
    return cache_queryset(
        timeout=timeout,
        key_prefix="dashboard_stats",
        vary_on=['club_id', 'organization_id']
    )


def cache_tournament_standings(timeout: int = 600):
    """Cache tournament standings (10 minutes)."""
    return cache_method_result(
        timeout=timeout,
        key_prefix="tournament_standings",
        vary_on_args=True
    )


def cache_revenue_report(timeout: int = 1800):
    """Cache revenue reports (30 minutes)."""
    return cache_queryset(
        timeout=timeout,
        key_prefix="revenue_report",
        vary_on=['club_id', 'start_date', 'end_date']
    )


def cache_availability_check(timeout: int = 60):
    """Cache court availability checks (1 minute)."""
    return cache_method_result(
        timeout=timeout,
        key_prefix="court_availability",
        vary_on_args=True
    )


# Cache invalidation utilities

class CacheInvalidator:
    """Utilities for cache invalidation."""
    
    @staticmethod
    def invalidate_organization_cache(organization_id: int):
        """Invalidate all caches for an organization."""
        patterns = [
            f"*:organization_id:{organization_id}:*",
            f"dashboard_stats:*:organization_id:{organization_id}*",
            f"revenue_report:*:organization_id:{organization_id}*"
        ]
        
        for pattern in patterns:
            cache.delete_pattern(pattern)
    
    @staticmethod
    def invalidate_club_cache(club_id: int):
        """Invalidate all caches for a club."""
        patterns = [
            f"*:club_id:{club_id}:*",
            f"dashboard_stats:*:club_id:{club_id}*",
            f"court_availability:*:club_id:{club_id}*"
        ]
        
        for pattern in patterns:
            cache.delete_pattern(pattern)
    
    @staticmethod
    def invalidate_tournament_cache(tournament_id: int):
        """Invalidate all caches for a tournament."""
        patterns = [
            f"tournament_standings:*:tournament_id:{tournament_id}*",
            f"tournament_bracket:*:tournament_id:{tournament_id}*"
        ]
        
        for pattern in patterns:
            cache.delete_pattern(pattern)


# Model cache mixin

class CachedModelMixin:
    """Mixin for models that need caching."""
    
    def invalidate_caches(self):
        """Invalidate caches related to this model instance."""
        model_name = self.__class__.__name__.lower()
        
        # Invalidate by primary key
        if hasattr(self, 'id'):
            cache.delete_pattern(f"*:{model_name}_id:{self.id}:*")
        
        # Invalidate by organization
        if hasattr(self, 'organization_id'):
            CacheInvalidator.invalidate_organization_cache(self.organization_id)
        
        # Invalidate by club
        if hasattr(self, 'club_id'):
            CacheInvalidator.invalidate_club_cache(self.club_id)
    
    def save(self, *args, **kwargs):
        """Override save to invalidate caches."""
        super().save(*args, **kwargs)
        self.invalidate_caches()
    
    def delete(self, *args, **kwargs):
        """Override delete to invalidate caches."""
        self.invalidate_caches()
        super().delete(*args, **kwargs)