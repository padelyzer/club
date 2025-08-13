import logging
import os
import time
from datetime import datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt

import psutil
import redis

logger = logging.getLogger(__name__)


@never_cache
@csrf_exempt
def health_check(request):
    """Comprehensive health check endpoint for monitoring."""
    start_time = time.time()

    checks = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": getattr(settings, "VERSION", "1.0.0"),
        "environment": os.environ.get("DJANGO_SETTINGS_MODULE", "unknown"),
        "checks": {},
    }

    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                checks["checks"]["database"] = {
                    "status": "ok",
                    "response_time_ms": round((time.time() - start_time) * 1000, 2),
                }
            else:
                raise Exception("Database query failed")
    except Exception as e:
        checks["checks"]["database"] = {"status": "fail", "error": str(e)}
        checks["status"] = "unhealthy"

    # Redis/Cache check
    cache_start = time.time()
    try:
        cache_key = "health_check_test"
        cache.set(cache_key, "ok", 1)
        cache_value = cache.get(cache_key)

        if cache_value == "ok":
            checks["checks"]["cache"] = {
                "status": "ok",
                "response_time_ms": round((time.time() - cache_start) * 1000, 2),
            }
        else:
            raise Exception("Cache get/set failed")
    except Exception as e:
        checks["checks"]["cache"] = {"status": "fail", "error": str(e)}
        checks["status"] = "unhealthy"

    # Redis detailed check
    if hasattr(settings, "REDIS_URL"):
        redis_start = time.time()
        try:
            r = redis.from_url(settings.REDIS_URL)
            r.ping()
            checks["checks"]["redis"] = {
                "status": "ok",
                "response_time_ms": round((time.time() - redis_start) * 1000, 2),
            }
        except Exception as e:
            checks["checks"]["redis"] = {"status": "fail", "error": str(e)}

    # File system check
    try:
        media_root = getattr(settings, "MEDIA_ROOT", "/tmp")
        if os.path.exists(media_root) and os.access(media_root, os.W_OK):
            checks["checks"]["filesystem"] = {"status": "ok"}
        else:
            raise Exception("Media directory not writable")
    except Exception as e:
        checks["checks"]["filesystem"] = {"status": "fail", "error": str(e)}

    # System resources
    try:
        checks["system"] = {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
        }
    except:
        # psutil might not be available
        pass

    # Total response time
    checks["response_time_ms"] = round((time.time() - start_time) * 1000, 2)

    # Determine HTTP status
    status_code = 200 if checks["status"] == "healthy" else 503

    return JsonResponse(checks, status=status_code)


@never_cache
def liveness_check(request):
    """Simple liveness probe for Kubernetes/Docker."""
    return JsonResponse({"status": "alive"})


@never_cache
def readiness_check(request):
    """Readiness probe - checks if app is ready to serve requests."""
    try:
        # Quick database check
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        # Quick cache check
        cache.get("readiness_check")

        return JsonResponse({"status": "ready"})
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JsonResponse({"status": "not_ready", "error": str(e)}, status=503)


@csrf_exempt
def metrics(request):
    """Prometheus-compatible metrics endpoint."""
    from django.core.cache import cache
    from django.db import connection

    metrics_data = []

    # Request metrics
    metrics_data.append(f"# HELP django_request_count Total HTTP requests")
    metrics_data.append(f"# TYPE django_request_count counter")
    request_count = cache.get("metrics_request_count", 0)
    metrics_data.append(f"django_request_count {request_count}")

    # Database metrics
    metrics_data.append(f"# HELP django_db_query_count Total database queries")
    metrics_data.append(f"# TYPE django_db_query_count counter")
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM django_migrations")
        migration_count = cursor.fetchone()[0]
    metrics_data.append(
        f'django_db_query_count {{type="migrations"}} {migration_count}'
    )

    # Active users metric
    metrics_data.append(f"# HELP django_active_users Number of active users")
    metrics_data.append(f"# TYPE django_active_users gauge")
    active_users = cache.get("metrics_active_users", 0)
    metrics_data.append(f"django_active_users {active_users}")

    # Response time metrics
    metrics_data.append(f"# HELP django_response_time_seconds Response time in seconds")
    metrics_data.append(f"# TYPE django_response_time_seconds histogram")

    # System metrics
    try:
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent

        metrics_data.append(f"# HELP system_cpu_usage_percent CPU usage percentage")
        metrics_data.append(f"# TYPE system_cpu_usage_percent gauge")
        metrics_data.append(f"system_cpu_usage_percent {cpu_percent}")

        metrics_data.append(
            f"# HELP system_memory_usage_percent Memory usage percentage"
        )
        metrics_data.append(f"# TYPE system_memory_usage_percent gauge")
        metrics_data.append(f"system_memory_usage_percent {memory_percent}")
    except:
        pass

    return JsonResponse(
        "\n".join(metrics_data), safe=False, content_type="text/plain; charset=utf-8"
    )


class MetricsMiddleware:
    """Middleware to collect metrics."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Track request count
        request_count = cache.get("metrics_request_count", 0)
        cache.set("metrics_request_count", request_count + 1, 3600)

        # Track active users
        if request.user.is_authenticated:
            active_users_key = f"active_user_{request.user.id}"
            cache.set(active_users_key, True, 300)  # 5 minute TTL

            # Count active users
            # Note: This is a simplified approach. In production, use a more sophisticated method
            active_count = cache.get("metrics_active_users", 0)
            cache.set("metrics_active_users", active_count, 300)

        # Process request
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time

        # Track response time
        # In production, you'd want to use a proper metrics library
        response["X-Response-Time"] = f"{duration:.3f}s"

        return response
