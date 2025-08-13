from functools import wraps

from django.http import JsonResponse

from django_ratelimit.decorators import ratelimit


def api_ratelimit(key="ip", rate="100/h", method="ALL", block=True):
    """
    Custom rate limit decorator for API endpoints.

    Args:
        key: What to rate limit by ('ip', 'user', or callable)
        rate: Rate limit (e.g., '5/m', '100/h', '1000/d')
        method: HTTP method(s) to limit
        block: Whether to block or just annotate
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Apply rate limiting
            limited_view = ratelimit(key=key, rate=rate, method=method, block=False)(
                view_func
            )
            response = limited_view(request, *args, **kwargs)

            # Check if rate limited
            if getattr(request, "limited", False) and block:
                return JsonResponse(
                    {
                        "error": "Rate Limit Exceeded",
                        "details": f"Too many requests. Please try again later.",
                        "code": "RATE_LIMIT_EXCEEDED",
                    },
                    status=429,
                )

            # Add rate limit headers
            if hasattr(request, "ratelimit"):
                limit_info = request.ratelimit
                if "limit" in limit_info:
                    response["X-RateLimit-Limit"] = str(limit_info["limit"])
                if "remaining" in limit_info:
                    response["X-RateLimit-Remaining"] = str(limit_info["remaining"])
                if "reset" in limit_info:
                    response["X-RateLimit-Reset"] = str(limit_info["reset"])

            return response

        return wrapped_view

    return decorator


# Predefined rate limiters for common use cases
login_ratelimit = api_ratelimit(key="ip", rate="5/m", method="POST")
register_ratelimit = api_ratelimit(key="ip", rate="3/m", method="POST")
password_reset_ratelimit = api_ratelimit(key="ip", rate="3/h", method="POST")
api_default_ratelimit = api_ratelimit(key="user_or_ip", rate="1000/h")
payment_ratelimit = api_ratelimit(key="user", rate="10/h", method="POST")
otp_ratelimit = api_ratelimit(key="ip", rate="10/h", method="POST")


def user_or_ip(group, request):
    """Rate limit by user if authenticated, otherwise by IP."""
    if request.user.is_authenticated:
        return str(request.user.id)

    # Get IP address
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")

    return ip
