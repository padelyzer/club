"""
JWT Authentication Middleware for Django.
Converts JWT tokens to request.user for Django compatibility.
Includes token blacklist checking for secure logout.
"""

import logging

from django.contrib.auth.models import AnonymousUser

from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


class JWTAuthenticationMiddleware:
    """
    Middleware to authenticate users via JWT tokens.
    This allows Django views and admin to work with JWT authentication.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        # Skip JWT auth for admin and static files
        if request.path.startswith("/admin/") or request.path.startswith("/static/"):
            response = self.get_response(request)
            return response

        # Skip for media files
        if request.path.startswith("/media/"):
            response = self.get_response(request)
            return response

        try:
            # Get the raw token from the request
            header = request.META.get("HTTP_AUTHORIZATION")
            if header and header.startswith("Bearer "):
                # Extract the token part after 'Bearer '
                raw_token = header.split(" ")[1] if len(header.split(" ")) > 1 else None
            else:
                raw_token = None

            if raw_token:
                # Validate the token
                validated_token = self.jwt_auth.get_validated_token(raw_token)

                # Check if token is blacklisted
                jti = validated_token.get("jti")
                if jti:
                    from .models import BlacklistedToken

                    if BlacklistedToken.is_blacklisted(jti):
                        logger.debug(f"Blacklisted token attempted: {jti}")
                        request.user = AnonymousUser()
                        request.auth = None

                        # Set a flag to indicate blacklisted token
                        request.blacklisted_token = True
                        response = self.get_response(request)

                        # Return 401 for blacklisted tokens
                        from django.http import JsonResponse

                        return JsonResponse(
                            {"detail": "Token has been blacklisted"}, status=401
                        )

                # Get the user from the validated token
                user = self.jwt_auth.get_user(validated_token)

                # Set the user and auth on the request
                request.user = user
                request.auth = validated_token

                logger.debug(f"JWT Auth successful for user: {user.email}")
            else:
                # No token provided, set anonymous user
                request.user = AnonymousUser()
                request.auth = None

        except (InvalidToken, TokenError) as e:
            # Invalid token, set anonymous user
            logger.debug(f"JWT Auth failed: {str(e)}")
            request.user = AnonymousUser()
            request.auth = None

        except Exception as e:
            # Unexpected error, log it but don't break the request
            logger.error(f"JWT Middleware unexpected error: {str(e)}", exc_info=True)
            request.user = AnonymousUser()
            request.auth = None

        response = self.get_response(request)
        return response
