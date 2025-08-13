"""
Email authentication backend for Padelyzer.
"""

from typing import Optional

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.http import HttpRequest

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Authenticate using email address instead of username.
    Enhanced version with better error handling and logging.
    """

    def authenticate(
        self,
        request: Optional[HttpRequest],
        username: Optional[str] = None,
        password: Optional[str] = None,
        **kwargs,
    ) -> Optional[User]:
        import logging

        logger = logging.getLogger(__name__)

        if not username or not password:
            logger.debug("Authentication failed: Missing username or password")
            return None

        try:
            # Normalize email to lowercase to avoid case-sensitive issues
            email = username.lower().strip()

            # Use filter().first() to handle any potential duplicates gracefully
            # This will return the first user found, typically the oldest
            user = User.objects.filter(email=email, is_active=True).first()

            if not user:
                logger.debug(
                    f"Authentication failed: No active user found for email {email}"
                )
                return None

            # Verify password
            if user.check_password(password):
                logger.debug(f"Authentication successful for user: {user.email}")
                return user
            else:
                logger.debug(
                    f"Authentication failed: Invalid password for user {user.email}"
                )
                return None

        except Exception as e:
            # Log the error for debugging but don't crash authentication
            logger.error(
                f"Unexpected authentication error for email {username}: {str(e)}",
                exc_info=True,
            )
            return None

    def get_user(self, user_id: int) -> Optional[User]:
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
