"""
BFF Performance Monitoring Middleware.
Tracks performance metrics for BFF endpoints and provides optimization insights.
"""

import logging
import re
import time
from typing import Any, Dict, Optional

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class BFFPerformanceMiddleware(MiddlewareMixin):
    """
    Middleware to monitor BFF endpoint performance.
    Tracks response times, database queries, cache hit rates, and optimization opportunities.
    """

    # BFF endpoint patterns to monitor
    BFF_PATTERNS = [
        r"^/api/bi/analytics/club/",
        r"^/api/auth/context/",
        r"^/api/reservations/.*availability",
        r"^/api/bff/",  # Direct BFF endpoints
    ]

    # Performance thresholds (in milliseconds)
    PERFORMANCE_THRESHOLDS = {
        "dashboard_analytics": 200,  # Target: < 200ms
        "auth_context": 150,  # Target: < 150ms
        "availability": 100,  # Target: < 100ms
        "default": 250,  # Default threshold
    }

    def __init__(self, get_response):
        self.get_response = get_response
        self.compiled_patterns = [re.compile(pattern) for pattern in self.BFF_PATTERNS]
        super().__init__(get_response)

    def process_request(self, request):
        """Initialize performance tracking for the request."""
        if self._is_bff_request(request):
            request._bff_start_time = time.time()
            request._bff_start_queries = len(connection.queries)
            request._bff_endpoint_type = self._identify_endpoint_type(request)

            # Track cache operations
            request._bff_cache_hits = 0
            request._bff_cache_misses = 0

    def process_response(self, request, response):
        """Process and log performance metrics after response."""
        if hasattr(request, "_bff_start_time"):
            self._log_performance_metrics(request, response)

        return response

    def _is_bff_request(self, request) -> bool:
        """Check if request is for a BFF endpoint."""
        path = request.path
        return any(pattern.match(path) for pattern in self.compiled_patterns)

    def _identify_endpoint_type(self, request) -> str:
        """Identify the type of BFF endpoint for targeted monitoring."""
        path = request.path

        if "analytics" in path or "dashboard" in path:
            return "dashboard_analytics"
        elif "auth" in path and "context" in path:
            return "auth_context"
        elif "availability" in path:
            return "availability"
        else:
            return "default"

    def _log_performance_metrics(self, request, response):
        """Log comprehensive performance metrics."""
        try:
            # Calculate response time
            end_time = time.time()
            response_time_ms = (end_time - request._bff_start_time) * 1000

            # Calculate database queries
            end_queries = len(connection.queries)
            query_count = end_queries - request._bff_start_queries

            # Get endpoint type and threshold
            endpoint_type = getattr(request, "_bff_endpoint_type", "default")
            threshold = self.PERFORMANCE_THRESHOLDS.get(endpoint_type, 250)

            # Build performance metrics
            metrics = {
                "timestamp": timezone.now().isoformat(),
                "endpoint": request.path,
                "method": request.method,
                "endpoint_type": endpoint_type,
                "response_time_ms": round(response_time_ms, 2),
                "threshold_ms": threshold,
                "exceeded_threshold": response_time_ms > threshold,
                "query_count": query_count,
                "status_code": response.status_code,
                "user_id": (
                    str(request.user.id)
                    if hasattr(request, "user") and request.user.is_authenticated
                    else None
                ),
                "cache_performance": {
                    "hits": getattr(request, "_bff_cache_hits", 0),
                    "misses": getattr(request, "_bff_cache_misses", 0),
                    "hit_rate": self._calculate_cache_hit_rate(request),
                },
            }

            # Add query details if queries are high
            if query_count > 5:  # Flag high query count
                metrics["query_details"] = self._analyze_queries(request)

            # Add response size if available
            if hasattr(response, "content"):
                metrics["response_size_bytes"] = len(response.content)

            # Log performance data
            self._log_metrics(metrics)

            # Store metrics for dashboard
            self._store_metrics_for_dashboard(metrics)

            # Alert on performance issues
            if response_time_ms > (threshold * 1.5):  # 50% over threshold
                self._alert_performance_issue(metrics)

        except Exception as e:
            logger.error(f"Error logging BFF performance metrics: {str(e)}")

    def _calculate_cache_hit_rate(self, request) -> float:
        """Calculate cache hit rate for the request."""
        hits = getattr(request, "_bff_cache_hits", 0)
        misses = getattr(request, "_bff_cache_misses", 0)
        total = hits + misses

        return (hits / total * 100) if total > 0 else 0.0

    def _analyze_queries(self, request) -> Dict[str, Any]:
        """Analyze database queries for optimization opportunities."""
        start_idx = getattr(request, "_bff_start_queries", 0)
        queries = connection.queries[start_idx:]

        analysis = {
            "total_queries": len(queries),
            "total_time": sum(float(q["time"]) for q in queries),
            "slow_queries": [],
            "duplicate_queries": [],
            "optimization_suggestions": [],
        }

        # Find slow queries
        for i, query in enumerate(queries):
            query_time = float(query["time"])
            if query_time > 0.01:  # > 10ms
                analysis["slow_queries"].append(
                    {
                        "index": i,
                        "time": query_time,
                        "sql": (
                            query["sql"][:200] + "..."
                            if len(query["sql"]) > 200
                            else query["sql"]
                        ),
                    }
                )

        # Find duplicate queries
        sql_counts = {}
        for query in queries:
            sql = query["sql"]
            sql_counts[sql] = sql_counts.get(sql, 0) + 1

        duplicates = {sql: count for sql, count in sql_counts.items() if count > 1}
        if duplicates:
            analysis["duplicate_queries"] = [
                {"sql": sql[:100] + "...", "count": count}
                for sql, count in duplicates.items()
            ]
            analysis["optimization_suggestions"].append(
                "Consider using select_related() or prefetch_related() to reduce duplicate queries"
            )

        # Suggest optimizations based on patterns
        if len(queries) > 10:
            analysis["optimization_suggestions"].append(
                "High query count detected. Consider query optimization or caching."
            )

        return analysis

    def _log_metrics(self, metrics: Dict[str, Any]):
        """Log metrics with appropriate log level based on performance."""
        endpoint_type = metrics["endpoint_type"]
        response_time = metrics["response_time_ms"]
        threshold = metrics["threshold_ms"]

        if response_time > (threshold * 2):  # Very slow
            logger.warning(
                f"BFF Performance CRITICAL: {metrics['endpoint']} took {response_time}ms "
                f"(threshold: {threshold}ms, queries: {metrics['query_count']})"
            )
        elif response_time > threshold:  # Slow
            logger.info(
                f"BFF Performance WARNING: {metrics['endpoint']} took {response_time}ms "
                f"(threshold: {threshold}ms)"
            )
        else:  # Good performance
            logger.debug(
                f"BFF Performance OK: {metrics['endpoint']} took {response_time}ms"
            )

        # Log detailed metrics in debug mode
        if settings.DEBUG:
            logger.debug(f"BFF Metrics: {metrics}")

    def _store_metrics_for_dashboard(self, metrics: Dict[str, Any]):
        """Store metrics in cache for dashboard display."""
        try:
            # Store recent metrics (last 100 requests per endpoint type)
            endpoint_type = metrics["endpoint_type"]
            cache_key = f"bff:performance_metrics:{endpoint_type}"

            # Get existing metrics
            existing_metrics = cache.get(cache_key, [])

            # Add new metric
            existing_metrics.append(metrics)

            # Keep only last 100 entries
            if len(existing_metrics) > 100:
                existing_metrics = existing_metrics[-100:]

            # Store back to cache (1 hour TTL)
            cache.set(cache_key, existing_metrics, 3600)

            # Store aggregated stats
            self._update_aggregated_stats(endpoint_type, metrics)

        except Exception as e:
            logger.error(f"Error storing BFF metrics: {str(e)}")

    def _update_aggregated_stats(self, endpoint_type: str, metrics: Dict[str, Any]):
        """Update aggregated performance statistics."""
        try:
            stats_key = f"bff:performance_stats:{endpoint_type}"
            stats = cache.get(
                stats_key,
                {
                    "total_requests": 0,
                    "total_response_time": 0,
                    "total_queries": 0,
                    "slow_requests": 0,
                    "cache_hits": 0,
                    "cache_misses": 0,
                },
            )

            # Update stats
            stats["total_requests"] += 1
            stats["total_response_time"] += metrics["response_time_ms"]
            stats["total_queries"] += metrics["query_count"]

            if metrics["exceeded_threshold"]:
                stats["slow_requests"] += 1

            cache_perf = metrics["cache_performance"]
            stats["cache_hits"] += cache_perf["hits"]
            stats["cache_misses"] += cache_perf["misses"]

            # Calculate averages
            stats["avg_response_time"] = (
                stats["total_response_time"] / stats["total_requests"]
            )
            stats["avg_queries"] = stats["total_queries"] / stats["total_requests"]
            stats["slow_request_rate"] = (
                stats["slow_requests"] / stats["total_requests"]
            ) * 100

            total_cache_ops = stats["cache_hits"] + stats["cache_misses"]
            stats["cache_hit_rate"] = (
                (stats["cache_hits"] / total_cache_ops * 100)
                if total_cache_ops > 0
                else 0
            )

            # Store updated stats (24 hour TTL)
            cache.set(stats_key, stats, 86400)

        except Exception as e:
            logger.error(f"Error updating BFF stats: {str(e)}")

    def _alert_performance_issue(self, metrics: Dict[str, Any]):
        """Alert on critical performance issues."""
        try:
            alert_data = {
                "type": "bff_performance_alert",
                "severity": "high",
                "endpoint": metrics["endpoint"],
                "response_time_ms": metrics["response_time_ms"],
                "threshold_ms": metrics["threshold_ms"],
                "query_count": metrics["query_count"],
                "timestamp": metrics["timestamp"],
            }

            # In production, you might send this to a monitoring service
            logger.error(f"BFF Performance Alert: {alert_data}")

            # Store alert for dashboard
            alert_key = "bff:performance_alerts"
            alerts = cache.get(alert_key, [])
            alerts.append(alert_data)

            # Keep only last 50 alerts
            if len(alerts) > 50:
                alerts = alerts[-50:]

            cache.set(alert_key, alerts, 86400)  # 24 hour TTL

        except Exception as e:
            logger.error(f"Error creating BFF performance alert: {str(e)}")


class BFFCacheMetricsMiddleware(MiddlewareMixin):
    """
    Middleware to track cache operations for BFF endpoints.
    Works in conjunction with BFFPerformanceMiddleware.
    """

    def process_request(self, request):
        """Initialize cache tracking."""
        if hasattr(request, "_bff_start_time"):  # Only for BFF requests
            # Monkey patch cache.get to track hits/misses
            original_get = cache.get

            def tracked_get(*args, **kwargs):
                result = original_get(*args, **kwargs)
                if result is not None:
                    request._bff_cache_hits = getattr(request, "_bff_cache_hits", 0) + 1
                else:
                    request._bff_cache_misses = (
                        getattr(request, "_bff_cache_misses", 0) + 1
                    )
                return result

            # Temporarily replace cache.get
            cache.get = tracked_get
            request._original_cache_get = original_get

    def process_response(self, request, response):
        """Restore original cache.get method."""
        if hasattr(request, "_original_cache_get"):
            cache.get = request._original_cache_get

        return response


def get_bff_performance_stats(endpoint_type: str = None) -> Dict[str, Any]:
    """
    Get BFF performance statistics.

    Args:
        endpoint_type: Optional endpoint type filter

    Returns:
        Performance statistics dictionary
    """
    try:
        if endpoint_type:
            stats_key = f"bff:performance_stats:{endpoint_type}"
            return cache.get(stats_key, {})
        else:
            # Get stats for all endpoint types
            all_stats = {}
            for ep_type in [
                "dashboard_analytics",
                "auth_context",
                "availability",
                "default",
            ]:
                stats_key = f"bff:performance_stats:{ep_type}"
                stats = cache.get(stats_key)
                if stats:
                    all_stats[ep_type] = stats
            return all_stats

    except Exception as e:
        logger.error(f"Error getting BFF performance stats: {str(e)}")
        return {}


def get_bff_performance_alerts() -> list:
    """Get recent BFF performance alerts."""
    try:
        return cache.get("bff:performance_alerts", [])
    except Exception as e:
        logger.error(f"Error getting BFF performance alerts: {str(e)}")
        return []
