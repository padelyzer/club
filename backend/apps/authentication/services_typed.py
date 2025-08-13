"""
Services for authentication module with type hints.
This is an example of how to properly type hint the services.
"""

import logging
from typing import Any, Dict, Literal, Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

User = get_user_model()

PurposeType = Literal["login", "verification", "password_reset"]


class EmailService:
    """Service for sending authentication emails with proper type hints."""

    @staticmethod
    def send_otp_email(
        user: User, otp_code: str, purpose: PurposeType = "login"
    ) -> bool:
        """
        Send OTP code via email.

        Args:
            user: User instance to send email to
            otp_code: The OTP code to send
            purpose: Purpose of the OTP (login, verification, password_reset)

        Returns:
            True if email was sent successfully, False otherwise
        """
        subject_map: Dict[PurposeType, str] = {
            "login": "Código de verificación - Padelyzer",
            "verification": "Verifica tu cuenta - Padelyzer",
            "password_reset": "Restablecer contraseña - Padelyzer",
        }

        template_map: Dict[PurposeType, str] = {
            "login": "auth/emails/otp_login.html",
            "verification": "auth/emails/otp_verification.html",
            "password_reset": "auth/emails/otp_password_reset.html",
        }

        subject: str = subject_map.get(purpose, "Código de verificación - Padelyzer")
        template: str = template_map.get(purpose, "auth/emails/otp_generic.html")

        context: Dict[str, Any] = {
            "user": user,
            "otp_code": otp_code,
            "purpose": purpose,
            "app_name": "Padelyzer",
            "support_email": "soporte@padelyzer.com",
        }

        # Render HTML email
        html_message: str = render_to_string(template, context)
        plain_message: str = strip_tags(html_message)

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"OTP email sent to {user.email} for {purpose}")
            return True

        except Exception as e:
            logger.error(f"Failed to send OTP email to {user.email}: {str(e)}")
            return False

    @staticmethod
    def send_welcome_email(user: User) -> bool:
        """
        Send welcome email to new user.

        Args:
            user: Newly created user instance

        Returns:
            True if email was sent successfully, False otherwise
        """
        subject: str = "Bienvenido a Padelyzer"
        template: str = "auth/emails/welcome.html"

        context: Dict[str, Any] = {
            "user": user,
            "app_url": settings.PADELYZER_DOMAIN,
            "support_email": "soporte@padelyzer.com",
        }

        # Render HTML email
        html_message: str = render_to_string(template, context)
        plain_message: str = strip_tags(html_message)

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Welcome email sent to {user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
            return False

    @staticmethod
    def send_password_changed_email(user: User) -> bool:
        """
        Send notification that password was changed.

        Args:
            user: User whose password was changed

        Returns:
            True if email was sent successfully, False otherwise
        """
        subject: str = "Tu contraseña ha sido actualizada - Padelyzer"
        template: str = "auth/emails/password_changed.html"

        context: Dict[str, Any] = {
            "user": user,
            "app_url": settings.PADELYZER_DOMAIN,
            "support_email": "soporte@padelyzer.com",
        }

        # Render HTML email
        html_message: str = render_to_string(template, context)
        plain_message: str = strip_tags(html_message)

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Password changed email sent to {user.email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send password changed email to {user.email}: {str(e)}"
            )
            return False


class TokenService:
    """Service for managing JWT tokens with proper type hints."""

    @staticmethod
    def generate_tokens(user: User) -> Dict[str, str]:
        """
        Generate access and refresh tokens for user.

        Args:
            user: User to generate tokens for

        Returns:
            Dictionary with 'access' and 'refresh' token strings
        """
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh: RefreshToken = RefreshToken.for_user(user)

        # Add custom claims
        refresh["email"] = user.email
        refresh["is_superuser"] = user.is_superuser
        refresh["is_staff"] = user.is_staff

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

    @staticmethod
    def revoke_all_tokens(user: User) -> None:
        """
        Revoke all tokens for a user.

        Args:
            user: User whose tokens should be revoked
        """
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

        # Blacklist all outstanding tokens for the user
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            try:
                token.blacklist()
            except Exception as e:
                logger.error(
                    f"Failed to blacklist token for user {user.email}: {str(e)}"
                )

    @staticmethod
    def validate_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Validate a JWT token and return its payload.

        Args:
            token: JWT token string to validate

        Returns:
            Token payload if valid, None otherwise
        """
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import AccessToken

        try:
            access_token = AccessToken(token)
            return dict(access_token.payload)
        except TokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
