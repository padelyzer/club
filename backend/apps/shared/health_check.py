"""
Health check endpoint for Railway deployment verification.
"""

from django.http import JsonResponse
from django.views import View
from django.db import connection
from django.core.cache import cache
import os


class HealthCheckView(View):
    """Simple health check endpoint."""
    
    def get(self, request):
        """Return health status."""
        health_data = {
            "status": "healthy",
            "service": "padelyzer-backend",
            "environment": os.environ.get("RAILWAY_ENVIRONMENT", "unknown"),
            "version": "1.0.0",
            "checks": {}
        }
        
        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_data["checks"]["database"] = "ok"
        except Exception as e:
            health_data["checks"]["database"] = f"error: {str(e)}"
            health_data["status"] = "unhealthy"
        
        # Check cache
        try:
            cache.set("health_check", "ok", 10)
            if cache.get("health_check") == "ok":
                health_data["checks"]["cache"] = "ok"
            else:
                health_data["checks"]["cache"] = "error: cannot read from cache"
        except Exception as e:
            health_data["checks"]["cache"] = f"error: {str(e)}"
        
        status_code = 200 if health_data["status"] == "healthy" else 503
        return JsonResponse(health_data, status=status_code)