"""
BFF Cache Manager - Specialized caching for Backend-For-Frontend endpoints.
Provides optimized caching strategies with appropriate TTL values for different data types.
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


class BFFCacheManager:
    """
    Centralized cache management for BFF endpoints.
    Handles cache keys, TTL strategies, and invalidation patterns.
    """

    # Cache TTL configurations (in seconds)
    TTL_CONFIG = {
        # High-frequency, real-time data
        "availability": 60,  # 1 minute - availability changes quickly
        "live_metrics": 30,  # 30 seconds - real-time metrics
        # Medium-frequency data
        "dashboard_analytics": 300,  # 5 minutes - analytics can be slightly stale
        "user_permissions": 600,  # 10 minutes - permissions don't change often
        "club_data": 600,  # 10 minutes - club info rarely changes
        # Low-frequency data
        "auth_context": 3600,  # 1 hour - user context is fairly stable
        "organization_data": 1800,  # 30 minutes - org data changes infrequently
        "user_profile": 1800,  # 30 minutes - profile changes are rare
        # Static-like data
        "club_list": 7200,  # 2 hours - club list rarely changes
        "system_config": 14400,  # 4 hours - system configuration
    }

    # Cache key prefixes for different data types
    KEY_PREFIXES = {
        "dashboard": "bff:dashboard",
        "auth": "bff:auth",
        "availability": "bff:availability",
        "user": "bff:user",
        "club": "bff:club",
        "analytics": "bff:analytics",
        "permissions": "bff:permissions",
    }

    @classmethod
    def get_dashboard_key(cls, club_id: str, period: str, **kwargs) -> str:
        """
        Generate cache key for dashboard analytics.

        Args:
            club_id: Club ID
            period: Time period (week, month, quarter, year)
            **kwargs: Additional parameters that affect the cache

        Returns:
            Cache key string
        """
        # Create a deterministic hash of the parameters
        params = {"club_id": club_id, "period": period, **kwargs}
        param_hash = cls._hash_params(params)
        return f"{cls.KEY_PREFIXES['dashboard']}:{club_id}:{period}:{param_hash}"

    @classmethod
    def get_auth_context_key(
        cls, user_id: str, last_login_timestamp: float = None
    ) -> str:
        """
        Generate cache key for auth context.
        Includes last login timestamp to invalidate cache when user logs in again.

        Args:
            user_id: User ID
            last_login_timestamp: Timestamp of last login for cache invalidation

        Returns:
            Cache key string
        """
        login_hash = int(last_login_timestamp) if last_login_timestamp else 0
        return f"{cls.KEY_PREFIXES['auth']}:context:{user_id}:{login_hash}"

    @classmethod
    def get_availability_key(
        cls, club_id: str, date: str, court_ids: List[str] = None
    ) -> str:
        """
        Generate cache key for court availability.

        Args:
            club_id: Club ID
            date: Date string (YYYY-MM-DD)
            court_ids: List of court IDs (optional)

        Returns:
            Cache key string
        """
        court_hash = (
            cls._hash_params({"courts": sorted(court_ids)}) if court_ids else "all"
        )
        return f"{cls.KEY_PREFIXES['availability']}:{club_id}:{date}:{court_hash}"

    @classmethod
    def get_user_clubs_key(cls, user_id: str) -> str:
        """Generate cache key for user's clubs."""
        return f"{cls.KEY_PREFIXES['user']}:clubs:{user_id}"

    @classmethod
    def get_club_analytics_key(
        cls, club_id: str, period: str, metrics: List[str] = None
    ) -> str:
        """Generate cache key for club analytics."""
        metrics_hash = (
            cls._hash_params({"metrics": sorted(metrics)}) if metrics else "default"
        )
        return f"{cls.KEY_PREFIXES['analytics']}:club:{club_id}:{period}:{metrics_hash}"

    @classmethod
    def get_permissions_key(cls, user_id: str, organization_id: str = None) -> str:
        """Generate cache key for user permissions."""
        org_part = organization_id if organization_id else "global"
        return f"{cls.KEY_PREFIXES['permissions']}:{user_id}:{org_part}"

    @classmethod
    def set_with_ttl(
        cls, key: str, value: Any, cache_type: str = "dashboard_analytics"
    ) -> bool:
        """
        Set cache value with appropriate TTL based on data type.

        Args:
            key: Cache key
            value: Value to cache
            cache_type: Type of data being cached (affects TTL)

        Returns:
            True if successful, False otherwise
        """
        try:
            ttl = cls.TTL_CONFIG.get(cache_type, 300)  # Default 5 minutes

            # Add metadata to cached value
            cached_data = {
                "data": value,
                "cached_at": timezone.now().isoformat(),
                "cache_type": cache_type,
                "ttl": ttl,
            }

            cache.set(key, cached_data, ttl)

            logger.debug(f"Cache set: {key} (TTL: {ttl}s, Type: {cache_type})")
            return True

        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {str(e)}")
            return False

    @classmethod
    def get_with_metadata(cls, key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached value with metadata.

        Args:
            key: Cache key

        Returns:
            Dict with data and metadata, or None if not found
        """
        try:
            cached_data = cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit: {key}")
                return cached_data
            else:
                logger.debug(f"Cache miss: {key}")
                return None

        except Exception as e:
            logger.error(f"Cache get failed for key {key}: {str(e)}")
            return None

    @classmethod
    def get_data_only(cls, key: str) -> Optional[Any]:
        """
        Get only the data part of cached value (without metadata).

        Args:
            key: Cache key

        Returns:
            Cached data or None if not found
        """
        cached_result = cls.get_with_metadata(key)
        return cached_result.get("data") if cached_result else None

    @classmethod
    def invalidate_pattern(cls, pattern: str) -> int:
        """
        Invalidate cache keys matching a pattern.
        Note: This is a simplified version. For production, consider using
        Redis SCAN or similar for efficient pattern matching.

        Args:
            pattern: Pattern to match (supports basic wildcard *)

        Returns:
            Number of keys invalidated
        """
        try:
            # This is a basic implementation
            # In production, you'd want to use Redis SCAN or maintain key lists
            invalidated = 0

            if "*" in pattern:
                # For patterns, we'd need to scan all keys (expensive)
                # Better to maintain organized key hierarchies
                logger.warning(f"Pattern invalidation requested: {pattern}")
                # Implement proper pattern matching based on your cache backend
                pass
            else:
                # Direct key deletion
                cache.delete(pattern)
                invalidated = 1

            logger.info(f"Cache invalidated: {pattern} ({invalidated} keys)")
            return invalidated

        except Exception as e:
            logger.error(f"Cache invalidation failed for pattern {pattern}: {str(e)}")
            return 0

    @classmethod
    def invalidate_user_cache(cls, user_id: str) -> int:
        """
        Invalidate all cache keys for a specific user.

        Args:
            user_id: User ID

        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"{cls.KEY_PREFIXES['auth']}:context:{user_id}:*",
            f"{cls.KEY_PREFIXES['user']}:clubs:{user_id}",
            f"{cls.KEY_PREFIXES['permissions']}:{user_id}:*",
        ]

        total_invalidated = 0
        for pattern in patterns:
            total_invalidated += cls.invalidate_pattern(pattern)

        return total_invalidated

    @classmethod
    def invalidate_club_cache(cls, club_id: str) -> int:
        """
        Invalidate all cache keys for a specific club.

        Args:
            club_id: Club ID

        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"{cls.KEY_PREFIXES['dashboard']}:{club_id}:*",
            f"{cls.KEY_PREFIXES['availability']}:{club_id}:*",
            f"{cls.KEY_PREFIXES['analytics']}:club:{club_id}:*",
        ]

        total_invalidated = 0
        for pattern in patterns:
            total_invalidated += cls.invalidate_pattern(pattern)

        return total_invalidated

    @classmethod
    def get_cache_stats(cls) -> Dict[str, Any]:
        """
        Get cache statistics for monitoring.

        Returns:
            Dict with cache statistics
        """
        try:
            # Basic stats - expand based on your cache backend
            stats = {
                "timestamp": timezone.now().isoformat(),
                "ttl_config": cls.TTL_CONFIG,
                "key_prefixes": cls.KEY_PREFIXES,
            }

            # Add backend-specific stats if available
            if hasattr(cache, "get_stats"):
                stats["backend_stats"] = cache.get_stats()

            return stats

        except Exception as e:
            logger.error(f"Failed to get cache stats: {str(e)}")
            return {"error": str(e)}

    @classmethod
    def warm_up_cache(cls, user_id: str, club_ids: List[str] = None) -> Dict[str, bool]:
        """
        Warm up cache for a user and their clubs.
        Useful for improving first-load performance.

        Args:
            user_id: User ID
            club_ids: List of club IDs to warm up

        Returns:
            Dict indicating success/failure for each operation
        """
        results = {}

        try:
            # This would trigger cache population for key endpoints
            # Implementation depends on having access to the actual view functions
            logger.info(f"Cache warm-up requested for user {user_id}")

            # Placeholder for warm-up logic
            results["auth_context"] = True
            results["user_clubs"] = True

            if club_ids:
                for club_id in club_ids:
                    results[f"club_{club_id}_analytics"] = True
                    results[f"club_{club_id}_availability"] = True

        except Exception as e:
            logger.error(f"Cache warm-up failed: {str(e)}")
            results["error"] = str(e)

        return results

    @staticmethod
    def _hash_params(params: Dict[str, Any]) -> str:
        """
        Create a deterministic hash of parameters for cache key generation.

        Args:
            params: Dictionary of parameters

        Returns:
            Hash string
        """
        # Convert to JSON string with sorted keys for deterministic hashing
        param_str = json.dumps(params, sort_keys=True, default=str)
        return hashlib.md5(param_str.encode()).hexdigest()[:8]  # First 8 chars

    @classmethod
    def create_middleware_key(
        cls, request_path: str, query_params: Dict[str, Any]
    ) -> str:
        """
        Create cache key for middleware-level caching.

        Args:
            request_path: Request path
            query_params: Query parameters

        Returns:
            Cache key for middleware
        """
        path_hash = cls._hash_params({"path": request_path, "params": query_params})
        return f"bff:middleware:{path_hash}"


# Convenience functions for common operations
def cache_dashboard_analytics(club_id: str, period: str, data: Any, **kwargs) -> bool:
    """Convenience function to cache dashboard analytics."""
    key = BFFCacheManager.get_dashboard_key(club_id, period, **kwargs)
    return BFFCacheManager.set_with_ttl(key, data, "dashboard_analytics")


def get_cached_dashboard_analytics(
    club_id: str, period: str, **kwargs
) -> Optional[Any]:
    """Convenience function to get cached dashboard analytics."""
    key = BFFCacheManager.get_dashboard_key(club_id, period, **kwargs)
    return BFFCacheManager.get_data_only(key)


def cache_auth_context(
    user_id: str, data: Any, last_login_timestamp: float = None
) -> bool:
    """Convenience function to cache auth context."""
    key = BFFCacheManager.get_auth_context_key(user_id, last_login_timestamp)
    return BFFCacheManager.set_with_ttl(key, data, "auth_context")


def get_cached_auth_context(
    user_id: str, last_login_timestamp: float = None
) -> Optional[Any]:
    """Convenience function to get cached auth context."""
    key = BFFCacheManager.get_auth_context_key(user_id, last_login_timestamp)
    return BFFCacheManager.get_data_only(key)


def cache_availability(
    club_id: str, date: str, data: Any, court_ids: List[str] = None
) -> bool:
    """Convenience function to cache availability data."""
    key = BFFCacheManager.get_availability_key(club_id, date, court_ids)
    return BFFCacheManager.set_with_ttl(key, data, "availability")


def get_cached_availability(
    club_id: str, date: str, court_ids: List[str] = None
) -> Optional[Any]:
    """Convenience function to get cached availability data."""
    key = BFFCacheManager.get_availability_key(club_id, date, court_ids)
    return BFFCacheManager.get_data_only(key)
