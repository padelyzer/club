import json
import logging
import traceback

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.db import IntegrityError
from django.http import JsonResponse

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
)

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware:
    """Comprehensive error handling middleware for production environment."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
        except Exception as e:
            response = self.process_exception(request, e)

        return response

    def process_exception(self, request, exception):
        """Process different types of exceptions and return appropriate responses."""

        # Log the exception with context
        self.log_exception(request, exception)

        # Handle specific exception types
        if isinstance(exception, ValidationError):
            return self.handle_validation_error(exception)

        elif isinstance(exception, ObjectDoesNotExist):
            return self.handle_not_found_error(exception)

        elif isinstance(exception, PermissionDenied):
            return self.handle_permission_error(exception)

        elif isinstance(exception, IntegrityError):
            return self.handle_integrity_error(exception)

        elif isinstance(exception, (NotAuthenticated, AuthenticationFailed)):
            return self.handle_authentication_error(exception)

        elif isinstance(exception, APIException):
            return self.handle_api_exception(exception)

        else:
            # Generic error handler
            return self.handle_generic_error(exception)

    def log_exception(self, request, exception):
        """Log exception with request context."""
        logger.error(
            f"Unhandled exception: {exception.__class__.__name__}",
            exc_info=True,
            extra={
                "request_path": request.path,
                "request_method": request.method,
                "user": getattr(request, "user", None),
                "user_id": (
                    getattr(request.user, "id", None)
                    if hasattr(request, "user")
                    else None
                ),
                "ip_address": self.get_client_ip(request),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def handle_validation_error(self, exception):
        """Handle Django validation errors."""
        if hasattr(exception, "message_dict"):
            details = exception.message_dict
        elif hasattr(exception, "messages"):
            details = list(exception.messages)
        else:
            details = str(exception)

        return JsonResponse(
            {
                "error": "Validation Error",
                "details": details,
                "code": "VALIDATION_ERROR",
            },
            status=400,
        )

    def handle_not_found_error(self, exception):
        """Handle object not found errors."""
        model_name = exception.__class__.__name__.replace("DoesNotExist", "")

        return JsonResponse(
            {
                "error": "Not Found",
                "details": f"{model_name} not found",
                "code": "NOT_FOUND",
            },
            status=404,
        )

    def handle_permission_error(self, exception):
        """Handle permission denied errors."""
        return JsonResponse(
            {
                "error": "Permission Denied",
                "details": "You do not have permission to perform this action",
                "code": "PERMISSION_DENIED",
            },
            status=403,
        )

    def handle_integrity_error(self, exception):
        """Handle database integrity errors."""
        error_message = str(exception)

        # Parse common integrity errors
        if "UNIQUE constraint failed" in error_message:
            details = "A record with this information already exists"
        elif "FOREIGN KEY constraint failed" in error_message:
            details = "Related record not found or cannot be deleted"
        else:
            details = "Database constraint violation"

        return JsonResponse(
            {"error": "Database Error", "details": details, "code": "INTEGRITY_ERROR"},
            status=400,
        )

    def handle_authentication_error(self, exception):
        """Handle authentication errors."""
        return JsonResponse(
            {
                "error": "Authentication Required",
                "details": (
                    str(exception)
                    if str(exception)
                    else "Please authenticate to access this resource"
                ),
                "code": "AUTHENTICATION_REQUIRED",
            },
            status=401,
        )

    def handle_api_exception(self, exception):
        """Handle DRF API exceptions."""
        if hasattr(exception, "get_codes"):
            code = exception.get_codes()
        else:
            code = "API_ERROR"

        if hasattr(exception, "detail"):
            details = exception.detail
        else:
            details = str(exception)

        return JsonResponse(
            {"error": exception.__class__.__name__, "details": details, "code": code},
            status=getattr(exception, "status_code", 400),
        )

    def handle_generic_error(self, exception):
        """Handle all other exceptions."""
        # In production, don't expose internal error details
        from django.conf import settings

        if settings.DEBUG:
            error_details = {
                "error": "Internal Server Error",
                "details": str(exception),
                "type": exception.__class__.__name__,
                "code": "INTERNAL_ERROR",
            }
        else:
            error_details = {
                "error": "Internal Server Error",
                "details": "An unexpected error occurred. Please try again later.",
                "code": "INTERNAL_ERROR",
            }

        return JsonResponse(error_details, status=500)


class RequestLoggingMiddleware:
    """Middleware to log all incoming requests for debugging."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger("requests")

    def __call__(self, request):
        # Log request
        self.log_request(request)

        # Process request
        response = self.get_response(request)

        # Log response
        self.log_response(request, response)

        return response

    def log_request(self, request):
        """Log incoming request details."""
        self.logger.info(
            f"Request: {request.method} {request.path}",
            extra={
                "method": request.method,
                "path": request.path,
                "user": getattr(request.user, "username", "anonymous"),
                "ip": self.get_client_ip(request),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )

    def log_response(self, request, response):
        """Log response details."""
        self.logger.info(
            f"Response: {response.status_code} for {request.path}",
            extra={
                "status_code": response.status_code,
                "path": request.path,
                "user": getattr(request.user, "username", "anonymous"),
            },
        )

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip
