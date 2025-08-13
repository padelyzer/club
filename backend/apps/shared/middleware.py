"""
API Debug Middleware for detailed logging and error tracking.
"""

import json
import logging
import time

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone

logger = logging.getLogger("api")


class APIDebugMiddleware:
    """
    Middleware for debugging API requests and responses.
    Logs detailed information about each API request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only log in debug mode
        if not settings.DEBUG:
            return self.get_response(request)

        # Skip non-API paths
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        # Start timing
        start_time = time.time()

        # Log request details
        self._log_request(request)

        # Process the request
        response = self.get_response(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response details
        self._log_response(request, response, duration)

        return response

    def process_exception(self, request, exception):
        """Handle unhandled exceptions in API endpoints."""
        if not request.path.startswith("/api/"):
            return None

        logger.error(
            f"💥 UNHANDLED EXCEPTION on {request.method} {request.path}: {exception}",
            exc_info=True,
            extra={
                "request_method": request.method,
                "request_path": request.path,
                "user": str(getattr(request, "user", "Anonymous")),
            },
        )

        # Return JSON error response
        error_response = {
            "error": "Internal server error",
            "message": (
                str(exception) if settings.DEBUG else "An unexpected error occurred"
            ),
            "timestamp": timezone.now().isoformat(),
            "path": request.path,
            "method": request.method,
        }

        return JsonResponse(error_response, status=500)

    def _log_request(self, request):
        """Log incoming request details."""
        log_data = {
            "timestamp": timezone.now().isoformat(),
            "method": request.method,
            "path": request.path,
            "query_params": dict(request.GET),
            "user": str(getattr(request, "user", "Anonymous")),
            "user_authenticated": (
                request.user.is_authenticated if hasattr(request, "user") else False
            ),
            "headers": self._get_safe_headers(request),
        }

        # Log request body for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"] and request.body:
            try:
                body = json.loads(request.body.decode("utf-8"))
                # Mask sensitive fields
                log_data["body"] = self._mask_sensitive_data(body)
            except:
                log_data["body"] = "<binary or non-JSON data>"

        logger.info(f"🔵 API REQUEST: {request.method} {request.path}", extra=log_data)

    def _log_response(self, request, response, duration):
        """Log response details."""
        log_data = {
            "timestamp": timezone.now().isoformat(),
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "user": str(getattr(request, "user", "Anonymous")),
        }

        # Log level based on status code
        if response.status_code >= 500:
            log_level = logging.ERROR
            emoji = "❌"
        elif response.status_code >= 400:
            log_level = logging.WARNING
            emoji = "⚠️"
        else:
            log_level = logging.INFO
            emoji = "✅"

        # Try to get response content for errors
        if response.status_code >= 400:
            try:
                content = response.content.decode("utf-8")
                log_data["response_body"] = content[:1000]  # Limit size
            except:
                log_data["response_body"] = "<unable to decode response>"

        logger.log(
            log_level,
            f"{emoji} API RESPONSE: {request.method} {request.path} [{response.status_code}] ({duration:.2f}s)",
            extra=log_data,
        )

    def _get_safe_headers(self, request):
        """Get headers with sensitive values masked."""
        safe_headers = {}
        sensitive_headers = ["authorization", "cookie", "x-api-key", "x-auth-token"]

        for header, value in request.headers.items():
            if header.lower() in sensitive_headers:
                safe_headers[header] = "***MASKED***"
            else:
                safe_headers[header] = value

        return safe_headers

    def _mask_sensitive_data(self, data):
        """Mask sensitive fields in request/response data."""
        if not isinstance(data, dict):
            return data

        sensitive_fields = [
            "password",
            "token",
            "secret",
            "api_key",
            "access",
            "refresh",
        ]
        masked_data = data.copy()

        for field in sensitive_fields:
            if field in masked_data:
                masked_data[field] = "***MASKED***"

        return masked_data
