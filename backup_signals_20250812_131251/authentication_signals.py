"""
Django signals for authentication audit logging.
"""

import logging

from django.contrib.auth.signals import (
    user_logged_in,
    user_logged_out,
    user_login_failed,
)
from django.db.models.signals import post_save, pre_save
from django.dispatch import Signal, receiver
from django.utils import timezone

from .models import (
    APIKey,
    AuthAuditLog,
    OrganizationMembership,
    OTPVerification,
    Session,
    User,
)

logger = logging.getLogger(__name__)

# Custom signals
password_changed = Signal()
password_reset_requested = Signal()
password_reset_completed = Signal()
two_factor_enabled = Signal()
two_factor_disabled = Signal()
two_factor_method_changed = Signal()
organization_switched = Signal()
session_revoked = Signal()
otp_verified = Signal()
otp_failed = Signal()


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful login."""
    AuthAuditLog.log_event(
        event_type="login_success",
        request=request,
        user=user,
        success=True,
        details={"method": "django_auth", "backend": kwargs.get("backend", "unknown")},
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout."""
    if user and user.is_authenticated:
        AuthAuditLog.log_event(
            event_type="logout", request=request, user=user, success=True
        )


@receiver(user_login_failed)
def log_login_failed(sender, credentials, request, **kwargs):
    """Log failed login attempt."""
    AuthAuditLog.log_event(
        event_type="login_failed",
        request=request,
        success=False,
        attempted_email=credentials.get("username", ""),
        details={"reason": "invalid_credentials"},
    )


@receiver(post_save, sender=Session)
def log_session_created(sender, instance, created, **kwargs):
    """Log when a new session is created."""
    if created:
        AuthAuditLog.log_event(
            event_type="session_created",
            user=instance.user,
            success=True,
            organization=instance.organization,
            ip_address=instance.ip_address,
            user_agent=instance.device_info.get("user_agent", ""),
            device_type=instance.device_type,
            browser=instance.browser,
            os=instance.os,
            details={
                "session_id": str(instance.id),
                "device_name": instance.device_name,
                "expires_at": (
                    instance.expires_at.isoformat() if instance.expires_at else None
                ),
            },
        )


@receiver(session_revoked)
def log_session_revoked(sender, session, reason, **kwargs):
    """Log when a session is revoked."""
    AuthAuditLog.log_event(
        event_type="session_revoked",
        user=session.user,
        success=True,
        organization=session.organization,
        details={
            "session_id": str(session.id),
            "reason": reason,
            "device_type": session.device_type,
            "device_name": session.device_name,
        },
    )


@receiver(pre_save, sender=User)
def detect_password_change(sender, instance, **kwargs):
    """Detect password changes."""
    if instance.pk:
        try:
            old_user = User.objects.get(pk=instance.pk)
            if old_user.password != instance.password:
                # Password has changed
                instance._password_changed = True
        except User.DoesNotExist:
            pass


@receiver(post_save, sender=User)
def log_password_change(sender, instance, created, **kwargs):
    """Log password changes."""
    if not created and hasattr(instance, "_password_changed"):
        AuthAuditLog.log_event(
            event_type="password_change",
            user=instance,
            success=True,
            details={"method": "user_save"},
        )
        # Safely remove the attribute
        try:
            delattr(instance, "_password_changed")
        except AttributeError:
            pass  # Attribute already removed or doesn't exist


@receiver(password_changed)
def log_password_changed_signal(sender, user, request=None, **kwargs):
    """Log password change from custom signal."""
    AuthAuditLog.log_event(
        event_type="password_change",
        request=request,
        user=user,
        success=True,
        details={"method": kwargs.get("method", "api")},
    )


@receiver(password_reset_requested)
def log_password_reset_request(sender, user, request=None, **kwargs):
    """Log password reset request."""
    AuthAuditLog.log_event(
        event_type="password_reset_request", request=request, user=user, success=True
    )


@receiver(password_reset_completed)
def log_password_reset_complete(sender, user, request=None, **kwargs):
    """Log password reset completion."""
    AuthAuditLog.log_event(
        event_type="password_reset_complete", request=request, user=user, success=True
    )


@receiver(two_factor_enabled)
def log_2fa_enabled(sender, user, method, request=None, **kwargs):
    """Log 2FA enablement."""
    AuthAuditLog.log_event(
        event_type="2fa_enabled",
        request=request,
        user=user,
        success=True,
        details={"method": method},
    )


@receiver(two_factor_disabled)
def log_2fa_disabled(sender, user, request=None, **kwargs):
    """Log 2FA disablement."""
    AuthAuditLog.log_event(
        event_type="2fa_disabled", request=request, user=user, success=True
    )


@receiver(two_factor_method_changed)
def log_2fa_method_changed(
    sender, user, old_method, new_method, request=None, **kwargs
):
    """Log 2FA method change."""
    AuthAuditLog.log_event(
        event_type="2fa_method_changed",
        request=request,
        user=user,
        success=True,
        details={"old_method": old_method, "new_method": new_method},
    )


@receiver(organization_switched)
def log_organization_switch(sender, user, from_org, to_org, request=None, **kwargs):
    """Log organization switch."""
    AuthAuditLog.log_event(
        event_type="organization_switch",
        request=request,
        user=user,
        success=True,
        organization=to_org,
        details={
            "from_org_id": from_org.id if from_org else None,
            "from_org_name": from_org.name if from_org else None,
            "to_org_id": to_org.id,
            "to_org_name": to_org.name,
        },
    )


@receiver(otp_verified)
def log_otp_verified(sender, user, purpose, request=None, **kwargs):
    """Log successful OTP verification."""
    event_type = "2fa_verified" if purpose == "login" else "email_verified"
    AuthAuditLog.log_event(
        event_type=event_type,
        request=request,
        user=user,
        success=True,
        details={"purpose": purpose},
    )


@receiver(otp_failed)
def log_otp_failed(sender, user, purpose, reason, request=None, **kwargs):
    """Log failed OTP verification."""
    event_type = "2fa_failed" if purpose == "login" else "login_failed"
    AuthAuditLog.log_event(
        event_type=event_type,
        request=request,
        user=user,
        success=False,
        details={"purpose": purpose, "reason": reason},
    )


@receiver(post_save, sender=APIKey)
def log_api_key_created(sender, instance, created, **kwargs):
    """Log API key creation."""
    if created:
        AuthAuditLog.log_event(
            event_type="api_key_created",
            user=instance.user,
            success=True,
            organization=instance.organization,
            details={
                "api_key_id": str(instance.id),
                "api_key_name": instance.name,
                "permissions": instance.permissions,
            },
        )


@receiver(pre_save, sender=APIKey)
def detect_api_key_revocation(sender, instance, **kwargs):
    """Detect API key revocation."""
    if instance.pk:
        try:
            old_key = APIKey.objects.get(pk=instance.pk)
            if old_key.is_active and not instance.is_active:
                instance._was_revoked = True
        except APIKey.DoesNotExist:
            pass


@receiver(post_save, sender=APIKey)
def log_api_key_revoked(sender, instance, created, **kwargs):
    """Log API key revocation."""
    if not created and hasattr(instance, "_was_revoked"):
        AuthAuditLog.log_event(
            event_type="api_key_revoked",
            user=instance.user,
            success=True,
            organization=instance.organization,
            details={"api_key_id": str(instance.id), "api_key_name": instance.name},
        )
        delattr(instance, "_was_revoked")


@receiver(post_save, sender=OrganizationMembership)
def log_permission_changes(sender, instance, created, **kwargs):
    """Log permission grants/revokes."""
    if created:
        AuthAuditLog.log_event(
            event_type="permission_granted",
            user=instance.user,
            success=True,
            organization=instance.organization,
            details={
                "role": instance.role,
                "invited_by": (
                    instance.invited_by.email if instance.invited_by else None
                ),
            },
        )
    elif not instance.is_active:
        AuthAuditLog.log_event(
            event_type="permission_revoked",
            user=instance.user,
            success=True,
            organization=instance.organization,
            details={"role": instance.role},
        )


# Function to emit session revoked signal
def emit_session_revoked(session, reason):
    """Helper function to emit session revoked signal."""
    session_revoked.send(sender=Session, session=session, reason=reason)


# Function to emit OTP verified signal
def emit_otp_verified(user, purpose, request=None):
    """Helper function to emit OTP verified signal."""
    otp_verified.send(
        sender=OTPVerification, user=user, purpose=purpose, request=request
    )


# Function to emit OTP failed signal
def emit_otp_failed(user, purpose, reason, request=None):
    """Helper function to emit OTP failed signal."""
    otp_failed.send(
        sender=OTPVerification,
        user=user,
        purpose=purpose,
        reason=reason,
        request=request,
    )
