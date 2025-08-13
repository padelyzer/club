"""
Performance optimization utilities and decorators.
Provides caching, query optimization, and monitoring tools.
"""

import time
import functools
import hashlib
import json
from typing import Any, Callable, Optional, Union
from django.core.cache import cache
from django.db import connection
from django.conf import settings
from django.utils.functional import SimpleLazyObject
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


class PerformanceOptimizer:
    """
    Collection of performance optimization decorators and utilities.
    """
    
    @staticmethod
    def cache_result(timeout: int = 300, key_prefix: str = '', vary_on_user: bool = False):
        """
        Cache function results with intelligent key generation.
        
        Args:
            timeout: Cache timeout in seconds (default 5 minutes)
            key_prefix: Prefix for cache keys
            vary_on_user: Whether to include user ID in cache key
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = PerformanceOptimizer._generate_cache_key(
                    func.__name__,
                    args,
                    kwargs,
                    key_prefix,
                    vary_on_user
                )
                
                # Try to get from cache
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for {cache_key}")
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout)
                logger.debug(f"Cache miss for {cache_key}, cached for {timeout}s")
                
                return result
            
            return wrapper
        return decorator
    
    @staticmethod
    def cache_page_data(timeout: int = 300):
        """
        Cache entire API response data.
        Useful for expensive list views.
        """
        def decorator(view_func):
            @functools.wraps(view_func)
            def wrapper(request, *args, **kwargs):
                # Generate cache key from request
                cache_key = PerformanceOptimizer._generate_request_cache_key(request)
                
                # Check cache
                cached_response = cache.get(cache_key)
                if cached_response is not None:
                    return Response(cached_response)
                
                # Get response
                response = view_func(request, *args, **kwargs)
                
                # Cache successful responses only
                if hasattr(response, 'data') and response.status_code == 200:
                    cache.set(cache_key, response.data, timeout)
                
                return response
            
            return wrapper
        return decorator
    
    @staticmethod
    def optimize_queries(func: Callable) -> Callable:
        """
        Log and optimize database queries for a function.
        Useful for identifying N+1 queries and slow queries.
        """
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Reset queries if in debug mode
            if settings.DEBUG:
                connection.queries_log.clear()
            
            start_time = time.time()
            initial_queries = len(connection.queries)
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Analyze queries
            execution_time = time.time() - start_time
            query_count = len(connection.queries) - initial_queries
            
            # Log performance metrics
            if query_count > 20 or execution_time > 1.0:
                logger.warning(
                    f"Performance issue in {func.__name__}: "
                    f"{query_count} queries in {execution_time:.2f}s"
                )
                
                # Log slow queries in debug mode
                if settings.DEBUG and execution_time > 1.0:
                    slow_queries = [
                        q for q in connection.queries[initial_queries:]
                        if float(q.get('time', 0)) > 0.05
                    ]
                    for query in slow_queries[:5]:
                        logger.warning(f"Slow query ({query['time']}s): {query['sql'][:100]}...")
            
            return result
        
        return wrapper
    
    @staticmethod
    def batch_operation(batch_size: int = 100):
        """
        Process large datasets in batches to avoid memory issues.
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(queryset, *args, **kwargs):
                results = []
                total = queryset.count()
                
                for offset in range(0, total, batch_size):
                    batch = queryset[offset:offset + batch_size]
                    batch_results = func(batch, *args, **kwargs)
                    results.extend(batch_results)
                    
                    # Log progress
                    progress = min(offset + batch_size, total)
                    logger.info(f"Processed {progress}/{total} items")
                
                return results
            
            return wrapper
        return decorator
    
    @staticmethod
    def rate_limit(calls: int = 10, period: int = 60):
        """
        Rate limit function calls per user/IP.
        
        Args:
            calls: Number of allowed calls
            period: Time period in seconds
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(request, *args, **kwargs):
                # Get identifier (user ID or IP)
                if request.user.is_authenticated:
                    identifier = f"user_{request.user.id}"
                else:
                    identifier = f"ip_{request.META.get('REMOTE_ADDR', 'unknown')}"
                
                # Rate limit key
                rate_key = f"rate_limit:{func.__name__}:{identifier}"
                
                # Check rate limit
                current_calls = cache.get(rate_key, 0)
                if current_calls >= calls:
                    return Response(
                        {"error": "Rate limit exceeded. Please try again later."},
                        status=429
                    )
                
                # Increment counter
                cache.set(rate_key, current_calls + 1, period)
                
                # Execute function
                return func(request, *args, **kwargs)
            
            return wrapper
        return decorator
    
    @staticmethod
    def lazy_property(func: Callable) -> property:
        """
        Lazy load expensive properties.
        Property is calculated once and cached.
        """
        attr_name = f"_lazy_{func.__name__}"
        
        @property
        @functools.wraps(func)
        def wrapper(self):
            if not hasattr(self, attr_name):
                setattr(self, attr_name, func(self))
            return getattr(self, attr_name)
        
        return wrapper
    
    @staticmethod
    def _generate_cache_key(func_name: str, args: tuple, kwargs: dict, 
                          prefix: str, vary_on_user: bool) -> str:
        """Generate a unique cache key."""
        key_parts = [prefix, func_name]
        
        # Add user ID if needed
        if vary_on_user and len(args) > 0:
            # Assume first arg is request or has user attribute
            request_or_obj = args[0]
            if hasattr(request_or_obj, 'user') and request_or_obj.user.is_authenticated:
                key_parts.append(f"user_{request_or_obj.user.id}")
            elif hasattr(request_or_obj, 'request'):
                request = request_or_obj.request
                if request.user.is_authenticated:
                    key_parts.append(f"user_{request.user.id}")
        
        # Add function arguments
        key_data = {
            'args': [str(arg) for arg in args[1:]],  # Skip self/request
            'kwargs': kwargs
        }
        
        # Create hash of arguments
        key_hash = hashlib.md5(
            json.dumps(key_data, sort_keys=True).encode()
        ).hexdigest()[:8]
        
        key_parts.append(key_hash)
        
        return ":".join(filter(None, key_parts))
    
    @staticmethod
    def _generate_request_cache_key(request) -> str:
        """Generate cache key from request."""
        key_parts = [
            'api_cache',
            request.method,
            request.path,
            request.GET.urlencode()
        ]
        
        # Add user ID for personalized endpoints
        if request.user.is_authenticated:
            key_parts.append(f"user_{request.user.id}")
        
        return ":".join(filter(None, key_parts))


class DatabaseOptimizer:
    """
    Database-specific optimization utilities.
    """
    
    @staticmethod
    def optimize_queryset(queryset, select_related=None, prefetch_related=None, only=None):
        """
        Apply common query optimizations.
        
        Args:
            queryset: Django QuerySet to optimize
            select_related: List of foreign key fields to select
            prefetch_related: List of many-to-many/reverse foreign key fields
            only: List of fields to fetch (defer others)
        """
        if select_related:
            queryset = queryset.select_related(*select_related)
        
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        
        if only:
            queryset = queryset.only(*only)
        
        return queryset
    
    @staticmethod
    def bulk_update_or_create(model, objects, match_fields, update_fields=None, batch_size=1000):
        """
        Efficiently bulk update or create objects.
        
        Args:
            model: Django model class
            objects: List of model instances
            match_fields: Fields to match on for updates
            update_fields: Fields to update (if None, update all)
            batch_size: Batch size for operations
        """
        created_count = 0
        updated_count = 0
        
        for i in range(0, len(objects), batch_size):
            batch = objects[i:i + batch_size]
            
            # Build lookup for existing objects
            match_values = []
            for obj in batch:
                match_dict = {field: getattr(obj, field) for field in match_fields}
                match_values.append(match_dict)
            
            # Get existing objects
            existing_objects = {}
            for match_dict in match_values:
                existing = model.objects.filter(**match_dict).first()
                if existing:
                    key = tuple(match_dict.values())
                    existing_objects[key] = existing
            
            # Separate creates and updates
            to_create = []
            to_update = []
            
            for obj in batch:
                key = tuple(getattr(obj, field) for field in match_fields)
                if key in existing_objects:
                    # Update existing
                    existing_obj = existing_objects[key]
                    if update_fields:
                        for field in update_fields:
                            setattr(existing_obj, field, getattr(obj, field))
                    to_update.append(existing_obj)
                else:
                    # Create new
                    to_create.append(obj)
            
            # Bulk operations
            if to_create:
                model.objects.bulk_create(to_create)
                created_count += len(to_create)
            
            if to_update:
                model.objects.bulk_update(to_update, update_fields or [])
                updated_count += len(to_update)
        
        return created_count, updated_count
    
    @staticmethod
    def analyze_query_plan(queryset):
        """
        Analyze query execution plan (PostgreSQL specific).
        """
        sql, params = queryset.query.sql_with_params()
        
        # Execute EXPLAIN ANALYZE
        with connection.cursor() as cursor:
            cursor.execute(f"EXPLAIN ANALYZE {sql}", params)
            plan = cursor.fetchall()
        
        # Parse and return plan
        return {
            'sql': sql,
            'plan': [row[0] for row in plan],
            'recommendations': DatabaseOptimizer._analyze_plan(plan)
        }
    
    @staticmethod
    def _analyze_plan(plan):
        """Analyze query plan and provide recommendations."""
        recommendations = []
        plan_text = ' '.join([row[0] for row in plan])
        
        # Check for common issues
        if 'Seq Scan' in plan_text:
            recommendations.append("Sequential scan detected - consider adding an index")
        
        if 'Nested Loop' in plan_text and 'rows=' in plan_text:
            # Check for high row counts in nested loops
            for row in plan:
                if 'Nested Loop' in row[0] and 'rows=' in row[0]:
                    import re
                    match = re.search(r'rows=(\d+)', row[0])
                    if match and int(match.group(1)) > 1000:
                        recommendations.append("High row count in nested loop - consider query restructuring")
        
        if 'Sort' in plan_text and 'external' in plan_text:
            recommendations.append("External sort detected - consider adding an index on ORDER BY columns")
        
        return recommendations


# Example usage in views
class OptimizedViewMixin:
    """
    Mixin for views with common optimizations.
    """
    
    # Cache configuration
    cache_timeout = 300  # 5 minutes
    cache_vary_on_user = True
    
    # Query optimization
    select_related_fields = []
    prefetch_related_fields = []
    only_fields = None
    
    def get_queryset(self):
        """Get optimized queryset."""
        queryset = super().get_queryset()
        
        # Apply optimizations
        queryset = DatabaseOptimizer.optimize_queryset(
            queryset,
            select_related=self.select_related_fields,
            prefetch_related=self.prefetch_related_fields,
            only=self.only_fields
        )
        
        return queryset
    
    @PerformanceOptimizer.cache_page_data(timeout=300)
    def list(self, request, *args, **kwargs):
        """Cached list view."""
        return super().list(request, *args, **kwargs)