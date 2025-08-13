"""
Custom JWT Authentication classes with blacklist support.
"""

import logging

from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import BlacklistedToken

logger = logging.getLogger(__name__)


class JWTAuthenticationWithBlacklist(JWTAuthentication):
    """
    JWT Authentication that checks for blacklisted tokens.
    """

    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        # Get the JWT token from the request
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        # Validate the token
        validated_token = self.get_validated_token(raw_token)

        # Check if token is blacklisted
        jti = validated_token.get("jti")
        if jti and BlacklistedToken.is_blacklisted(jti):
            logger.debug(f"Blacklisted token attempted: {jti}")
            raise AuthenticationFailed("Token has been blacklisted")

        # Get the user
        user = self.get_user(validated_token)

        return user, validated_token
