"""
Optimized URL configuration for BFF authentication endpoints.
These URLs point to aggregated views that combine multiple data sources.
"""

from django.urls import path

from .views_optimized import (
    auth_context_aggregated,
    invalidate_auth_cache,
    user_clubs_optimized,
)

app_name = "auth_optimized"

urlpatterns = [
    # Aggregated auth context endpoint (combines user, org, clubs, permissions)
    path("context/", auth_context_aggregated, name="auth-context-aggregated"),
    # Optimized user clubs endpoint
    path("user-clubs/", user_clubs_optimized, name="user-clubs-optimized"),
    # Cache invalidation endpoint
    path("cache/invalidate/", invalidate_auth_cache, name="invalidate-auth-cache"),
]
