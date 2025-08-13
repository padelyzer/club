"""
Management views for monitoring BFF performance and cache status.
These endpoints provide insights into the optimized BFF endpoints.
"""

import logging

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from middleware.bff_performance import (
    get_bff_performance_alerts,
    get_bff_performance_stats,
)
from utils.bff_cache import BFFCacheManager

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def bff_performance_dashboard(request):
    """
    Comprehensive BFF performance dashboard.
    Shows performance metrics, cache statistics, and optimization recommendations.
    """
    try:
        # Get performance stats for all endpoint types
        performance_stats = get_bff_performance_stats()

        # Get recent performance alerts
        alerts = get_bff_performance_alerts()

        # Get cache statistics
        cache_stats = BFFCacheManager.get_cache_stats()

        # Get database connection info
        db_stats = {
            "total_queries": len(connection.queries),
            "backend": connection.vendor,
            "connection_name": connection.alias,
        }

        # Calculate overall health score
        health_score = calculate_bff_health_score(performance_stats)

        dashboard_data = {
            "timestamp": timezone.now().isoformat(),
            "health_score": health_score,
            "performance": {
                "stats": performance_stats,
                "alerts": alerts[-10:],  # Last 10 alerts
                "thresholds": {
                    "dashboard_analytics": 200,
                    "auth_context": 150,
                    "availability": 100,
                },
            },
            "cache": cache_stats,
            "database": db_stats,
            "recommendations": generate_optimization_recommendations(
                performance_stats, alerts
            ),
        }

        return Response(dashboard_data)

    except Exception as e:
        logger.error(f"Error generating BFF performance dashboard: {str(e)}")
        return Response(
            {"error": "Failed to generate dashboard", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def bff_cache_status(request):
    """
    Detailed cache status for BFF endpoints.
    Shows cache hit rates, memory usage, and cached items.
    """
    try:
        # Get cache backend info
        cache_info = {
            "backend": cache.__class__.__name__,
            "location": (
                getattr(cache, "_cache", {}).get("LOCATION", "N/A")
                if hasattr(cache, "_cache")
                else "N/A"
            ),
        }

        # Get BFF-specific cache statistics
        bff_cache_keys = [
            "bff:dashboard:*",
            "bff:auth:*",
            "bff:availability:*",
            "bff:user:*",
            "bff:analytics:*",
        ]

        cache_status = {
            "info": cache_info,
            "bff_keys": bff_cache_keys,
            "ttl_config": BFFCacheManager.TTL_CONFIG,
            "key_prefixes": BFFCacheManager.KEY_PREFIXES,
            "timestamp": timezone.now().isoformat(),
        }

        return Response(cache_status)

    except Exception as e:
        logger.error(f"Error getting BFF cache status: {str(e)}")
        return Response(
            {"error": "Failed to get cache status", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAdminUser])
def flush_bff_cache(request):
    """
    Flush all BFF-related cache entries.
    Useful for testing or when cache becomes inconsistent.
    """
    try:
        flush_type = request.data.get(
            "type", "all"
        )  # all, dashboard, auth, availability

        flushed_patterns = []

        if flush_type == "all" or flush_type == "dashboard":
            BFFCacheManager.invalidate_pattern("bff:dashboard:*")
            BFFCacheManager.invalidate_pattern("bff:analytics:*")
            flushed_patterns.extend(["dashboard", "analytics"])

        if flush_type == "all" or flush_type == "auth":
            BFFCacheManager.invalidate_pattern("bff:auth:*")
            BFFCacheManager.invalidate_pattern("bff:user:*")
            BFFCacheManager.invalidate_pattern("bff:permissions:*")
            flushed_patterns.extend(["auth", "user", "permissions"])

        if flush_type == "all" or flush_type == "availability":
            BFFCacheManager.invalidate_pattern("bff:availability:*")
            flushed_patterns.append("availability")

        return Response(
            {
                "message": f"BFF cache flushed successfully",
                "type": flush_type,
                "flushed_patterns": flushed_patterns,
                "timestamp": timezone.now().isoformat(),
            }
        )

    except Exception as e:
        logger.error(f"Error flushing BFF cache: {str(e)}")
        return Response(
            {"error": "Failed to flush cache", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def database_index_usage(request):
    """
    Check usage of BFF-specific database indexes.
    Helps identify if the targeted indexes are being used effectively.
    """
    try:
        # PostgreSQL-specific query to check index usage
        # This would need to be adapted for other databases

        # Define the indexes to check
        indexes_to_check = [
            "idx_bff_reservations_availability",
            "idx_bff_clubs_organization",
            "idx_bff_user_org_memberships",
        ]

        # Use parameterized query to prevent SQL injection
        index_usage_query = """
            SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE indexname = %s;
        """

        index_stats = {}

        with connection.cursor() as cursor:
            for index_name in indexes_to_check:
                try:
                    cursor.execute(index_usage_query, [index_name])
                    result = cursor.fetchone()
                    if result:
                        index_stats[index_name] = {
                            "schema": result[0],
                            "table": result[1],
                            "index": result[2],
                            "tuples_read": result[3],
                            "tuples_fetched": result[4],
                            "usage_ratio": (
                                result[4] / result[3] if result[3] > 0 else 0
                            ),
                        }
                    else:
                        index_stats[index_name] = {"status": "not_found"}
                except Exception as e:
                    index_stats[index_name] = {"error": str(e)}

        return Response(
            {
                "database_vendor": connection.vendor,
                "index_usage": index_stats,
                "timestamp": timezone.now().isoformat(),
                "note": "Index usage statistics (PostgreSQL only)",
            }
        )

    except Exception as e:
        logger.error(f"Error getting database index usage: {str(e)}")
        return Response(
            {"error": "Failed to get index usage", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAdminUser])
def warm_up_bff_cache(request):
    """
    Warm up BFF cache for improved first-load performance.
    Useful after cache flushes or system restarts.
    """
    try:
        user_id = request.data.get("user_id")
        club_ids = request.data.get("club_ids", [])

        if not user_id:
            return Response(
                {"error": "user_id is required for cache warm-up"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use BFFCacheManager to warm up cache
        warm_up_results = BFFCacheManager.warm_up_cache(user_id, club_ids)

        return Response(
            {
                "message": "BFF cache warm-up completed",
                "user_id": user_id,
                "club_ids": club_ids,
                "results": warm_up_results,
                "timestamp": timezone.now().isoformat(),
            }
        )

    except Exception as e:
        logger.error(f"Error warming up BFF cache: {str(e)}")
        return Response(
            {"error": "Failed to warm up cache", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def calculate_bff_health_score(performance_stats: dict) -> dict:
    """
    Calculate overall health score for BFF endpoints.

    Args:
        performance_stats: Performance statistics dictionary

    Returns:
        Health score information
    """
    try:
        scores = []
        details = {}

        for endpoint_type, stats in performance_stats.items():
            if not stats:
                continue

            # Calculate individual scores (0-100)
            response_time_score = min(
                100, max(0, 100 - (stats.get("avg_response_time", 0) / 5))
            )  # 500ms = 0 score
            query_score = min(
                100, max(0, 100 - (stats.get("avg_queries", 0) * 10))
            )  # 10 queries = 0 score
            cache_score = stats.get("cache_hit_rate", 0)
            error_score = max(
                0, 100 - (stats.get("slow_request_rate", 0) * 2)
            )  # 50% slow = 0 score

            endpoint_score = (
                response_time_score + query_score + cache_score + error_score
            ) / 4
            scores.append(endpoint_score)

            details[endpoint_type] = {
                "overall_score": round(endpoint_score, 1),
                "response_time_score": round(response_time_score, 1),
                "query_efficiency_score": round(query_score, 1),
                "cache_hit_score": round(cache_score, 1),
                "reliability_score": round(error_score, 1),
            }

        overall_score = sum(scores) / len(scores) if scores else 0

        # Determine health status
        if overall_score >= 80:
            status_text = "excellent"
        elif overall_score >= 60:
            status_text = "good"
        elif overall_score >= 40:
            status_text = "fair"
        else:
            status_text = "poor"

        return {
            "overall_score": round(overall_score, 1),
            "status": status_text,
            "details": details,
            "total_endpoints": len(scores),
        }

    except Exception as e:
        logger.error(f"Error calculating BFF health score: {str(e)}")
        return {"overall_score": 0, "status": "unknown", "error": str(e)}


def generate_optimization_recommendations(
    performance_stats: dict, alerts: list
) -> list:
    """
    Generate optimization recommendations based on performance data.

    Args:
        performance_stats: Performance statistics
        alerts: Recent performance alerts

    Returns:
        List of optimization recommendations
    """
    recommendations = []

    try:
        # Analyze performance stats
        for endpoint_type, stats in performance_stats.items():
            if not stats:
                continue

            avg_response_time = stats.get("avg_response_time", 0)
            avg_queries = stats.get("avg_queries", 0)
            cache_hit_rate = stats.get("cache_hit_rate", 0)
            slow_request_rate = stats.get("slow_request_rate", 0)

            # Response time recommendations
            if avg_response_time > 300:
                recommendations.append(
                    {
                        "type": "performance",
                        "endpoint": endpoint_type,
                        "priority": "high",
                        "issue": "High average response time",
                        "recommendation": f"Consider optimizing {endpoint_type} queries or increasing cache TTL",
                        "current_value": f"{avg_response_time:.1f}ms",
                        "target_value": "< 200ms",
                    }
                )

            # Query count recommendations
            if avg_queries > 10:
                recommendations.append(
                    {
                        "type": "database",
                        "endpoint": endpoint_type,
                        "priority": "medium",
                        "issue": "High database query count",
                        "recommendation": "Consider using select_related() or prefetch_related() to reduce queries",
                        "current_value": f"{avg_queries:.1f} queries",
                        "target_value": "< 5 queries",
                    }
                )

            # Cache hit rate recommendations
            if cache_hit_rate < 70:
                recommendations.append(
                    {
                        "type": "cache",
                        "endpoint": endpoint_type,
                        "priority": "medium",
                        "issue": "Low cache hit rate",
                        "recommendation": "Consider increasing cache TTL or improving cache key strategy",
                        "current_value": f"{cache_hit_rate:.1f}%",
                        "target_value": "> 80%",
                    }
                )

            # Error rate recommendations
            if slow_request_rate > 10:
                recommendations.append(
                    {
                        "type": "reliability",
                        "endpoint": endpoint_type,
                        "priority": "high",
                        "issue": "High slow request rate",
                        "recommendation": "Investigate and fix performance bottlenecks",
                        "current_value": f"{slow_request_rate:.1f}%",
                        "target_value": "< 5%",
                    }
                )

        # Analyze recent alerts
        recent_alerts = alerts[-5:] if alerts else []
        if len(recent_alerts) > 2:
            recommendations.append(
                {
                    "type": "monitoring",
                    "endpoint": "all",
                    "priority": "high",
                    "issue": "Frequent performance alerts",
                    "recommendation": "System may be under high load. Consider scaling or optimization.",
                    "current_value": f"{len(recent_alerts)} recent alerts",
                    "target_value": "< 2 alerts per hour",
                }
            )

        # Sort by priority
        priority_order = {"high": 3, "medium": 2, "low": 1}
        recommendations.sort(
            key=lambda x: priority_order.get(x["priority"], 0), reverse=True
        )

        return recommendations

    except Exception as e:
        logger.error(f"Error generating optimization recommendations: {str(e)}")
        return [
            {
                "type": "error",
                "issue": "Failed to generate recommendations",
                "details": str(e),
            }
        ]
