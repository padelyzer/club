"""
Services for authentication module.
"""

import logging
from typing import Any, Dict, Literal, Optional, Union

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

# Import User model for type hints
from django.contrib.auth import get_user_model

User = get_user_model()

PurposeType = Literal["login", "verification", "password_reset"]


class EmailService:
    """Service for sending authentication emails."""

    @staticmethod
    def send_otp_email(
        user: User, otp_code: str, purpose: PurposeType = "login"
    ) -> bool:
        """Send OTP code via email."""
        subject_map = {
            "login": "Código de verificación - Padelyzer",
            "verification": "Verifica tu cuenta - Padelyzer",
            "password_reset": "Restablecer contraseña - Padelyzer",
        }

        template_map = {
            "login": "auth/emails/otp_login.html",
            "verification": "auth/emails/otp_verification.html",
            "password_reset": "auth/emails/otp_password_reset.html",
        }

        subject = subject_map.get(purpose, "Código de verificación - Padelyzer")
        template = template_map.get(purpose, "auth/emails/otp_generic.html")

        context = {
            "user": user,
            "otp_code": otp_code,
            "purpose": purpose,
            "app_name": "Padelyzer",
            "support_email": "soporte@padelyzer.com",
        }

        # Render HTML email
        html_message = render_to_string(template, context)
        plain_message = strip_tags(html_message)

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
        """Send welcome email to new user."""
        subject = "Bienvenido a Padelyzer"
        template = "auth/emails/welcome.html"

        context = {
            "user": user,
            "app_url": settings.PADELYZER_DOMAIN,
            "support_email": "soporte@padelyzer.com",
        }

        # Render HTML email
        html_message = render_to_string(template, context)
        plain_message = strip_tags(html_message)

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
        """Send notification that password was changed."""
        subject = "Tu contraseña ha sido actualizada - Padelyzer"
        template = "auth/emails/password_changed.html"

        context = {
            "user": user,
            "app_url": settings.PADELYZER_DOMAIN,
            "support_email": "soporte@padelyzer.com",
        }

        # Render HTML email
        html_message = render_to_string(template, context)
        plain_message = strip_tags(html_message)

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
    """Service for managing JWT tokens."""

    @staticmethod
    def generate_tokens(user: User) -> Dict[str, str]:
        """Generate access and refresh tokens for user."""
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)

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
        """Revoke all tokens for a user."""
        # In production, implement token blacklisting
        # For now, we'll rely on session management
        from .models import Session

        Session.objects.filter(user=user, revoked_at__isnull=True).update(
            revoked_at=timezone.now(), revoked_reason="password_changed"
        )


class IPGeolocationService:
    """Service for IP geolocation (for session tracking)."""

    @staticmethod
    def get_location(ip_address: str) -> Dict[str, Optional[Union[str, float]]]:
        """Get location information from IP address."""
        # In production, use a service like ipapi.co or MaxMind
        # For now, return empty data
        return {
            "country": "",
            "country_code": "",
            "city": "",
            "region": "",
            "latitude": None,
            "longitude": None,
        }
