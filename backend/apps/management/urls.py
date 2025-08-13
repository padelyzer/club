"""
URL configuration for BFF management endpoints.
These endpoints provide monitoring and management capabilities for BFF optimizations.
"""

from django.urls import path

from .views import (
    bff_cache_status,
    bff_performance_dashboard,
    database_index_usage,
    flush_bff_cache,
    warm_up_bff_cache,
)

app_name = "management"

urlpatterns = [
    # Performance monitoring
    path(
        "bff/performance/", bff_performance_dashboard, name="bff-performance-dashboard"
    ),
    # Cache management
    path("bff/cache/status/", bff_cache_status, name="bff-cache-status"),
    path("bff/cache/flush/", flush_bff_cache, name="flush-bff-cache"),
    path("bff/cache/warmup/", warm_up_bff_cache, name="warm-up-bff-cache"),
    # Database monitoring
    path("bff/database/indexes/", database_index_usage, name="database-index-usage"),
]
