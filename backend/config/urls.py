"""
URL configuration for Padelyzer project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.shared.monitoring import health_check as monitoring_health_check
from apps.shared.monitoring import (
    liveness_check,
    metrics,
    readiness_check,
)
from apps.shared.views import api_root, cors_preflight, health_check, debug_db_tables, force_migrate, create_admin_user, fix_club_id_column

# PHASE 2 RECOVERY: Enable Reservations for production system
api_urlpatterns = [
    path("", api_root, name="api-root"),
    path("health/", health_check, name="health-check"),
    path("debug/tables/", debug_db_tables, name="debug-tables"),
    path("debug/force-migrate/", force_migrate, name="force-migrate"),
    path("debug/create-admin/", create_admin_user, name="create-admin"),
    path("debug/fix-club-id/", fix_club_id_column, name="fix-club-id"),
    path("auth/", include("apps.authentication.urls")),
    path("root/", include("apps.root.urls")),
    path("clubs/", include("apps.clubs.urls")),  # ENABLED - Core business
    path("reservations/", include("apps.reservations.urls")),  # ENABLED - Phase 2
    path("clients/", include("apps.clients.urls")),  # ENABLED - Phase 3
    path(
        "classes/", include("apps.classes.urls")
    ),  # ENABLED - Classes System ($8k/month revenue)
    # path(
    #     "tournaments/", include("apps.tournaments.urls")
    # ),  # DISABLED - Missing dependencies (sklearn, ortools)
    path(
        "leagues/", include("apps.leagues.urls")
    ),  # ENABLED - Phase 3 Competitive Parity
    path("finance/", include("apps.finance.urls")),  # ENABLED - Revenue Recovery
    path("bi/", include("apps.bi.urls")),
    path(
        "notifications/", include("apps.notifications.urls")
    ),  # ENABLED - Real-time system ($15k/month revenue)
    # BFF OPTIMIZED ENDPOINTS - Targeted performance optimizations
    # path('bff/bi/', include('apps.bi.urls_optimized')),
    # path('bff/auth/', include('apps.authentication.urls_optimized')),
    # MANAGEMENT ENDPOINTS - Performance monitoring and cache management
    # path('management/', include('apps.management.urls')),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_urlpatterns)),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # Monitoring endpoints
    path("health/", monitoring_health_check, name="monitoring-health"),
    path("healthz/", liveness_check, name="liveness"),
    path("ready/", readiness_check, name="readiness"),
    path("metrics/", metrics, name="metrics"),
]

# Debug settings
if settings.DEBUG:
    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Custom admin configuration
admin.site.site_header = "Padelyzer Administration"
admin.site.site_title = "Padelyzer Admin"
admin.site.index_title = "Welcome to Padelyzer Administration"
