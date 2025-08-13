"""
Middleware to exempt API views from CSRF validation when using JWT authentication.
"""

from django.middleware.csrf import CsrfViewMiddleware
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


class CSRFExemptAPIMiddleware(CsrfViewMiddleware):
    """
    Middleware that exempts API views from CSRF validation.
    This is safe because our API uses JWT tokens for authentication.
    """

    def process_view(self, request, callback, callback_args, callback_kwargs):
        # Skip CSRF check for API endpoints
        if request.path.startswith("/api/"):
            return None

        # For non-API views, use the default CSRF validation
        return super().process_view(request, callback, callback_args, callback_kwargs)
