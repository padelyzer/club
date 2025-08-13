"""
EMERGENCY RECOVERY - Clean authentication models without cross-dependencies.
"""

import secrets
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.http import HttpRequest
from django.utils import timezone

from core.models import BaseModel
from core.utils import generate_otp


class User(AbstractUser):
    """
    Custom user model for Padelyzer - EMERGENCY RECOVERY VERSION.
    """

    # Override email to make it unique and required
    email = models.EmailField(
        unique=True,
        help_text="Required. Must be a valid email address.",
        error_messages={
            "unique": "A user with that email already exists.",
        },
    )

    # Additional fields
    phone = models.CharField(max_length=20, blank=True)
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)

    # 2FA settings
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_method = models.CharField(
        max_length=10, choices=[("email", "Email"), ("sms", "SMS")], default="email"
    )

    # Profile
    avatar_url = models.URLField(blank=True)
    language = models.CharField(max_length=5, default="es-mx")
    timezone = models.CharField(max_length=50, default="America/Mexico_City")

    # Multi-tenant context
    current_organization_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Current active organization ID for multi-tenant context",
    )
    
    # Club membership - One user can only belong to one club
    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        help_text="The club this user belongs to (one user can only belong to one club)",
    )

    # Metadata
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_device = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_users",
    )

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_full_name()} ({self.email})"

    @property
    def organization(self) -> Optional["Organization"]:
        """
        Get the user's current active organization.
        Returns the organization based on current_organization_id or the first active membership.
        """
        from apps.root.models import Organization

        # If user has a current organization set, use that
        if self.current_organization_id:
            try:
                return Organization.objects.get(
                    id=self.current_organization_id, is_active=True
                )
            except Organization.DoesNotExist:
                # Clear invalid organization ID
                self.current_organization_id = None
                self.save(update_fields=["current_organization_id"])

        # Otherwise, get the first active organization membership
        membership = (
            self.organization_memberships.filter(
                is_active=True, organization__is_active=True
            )
            .select_related("organization")
            .first()
        )

        if membership:
            # Set this as the current organization
            self.current_organization_id = membership.organization.id
            self.save(update_fields=["current_organization_id"])
            return membership.organization

        return None

    def set_current_organization(self, organization: "Organization") -> bool:
        """
        Set the current active organization for the user.
        """
        # Verify user has membership to this organization
        if self.organization_memberships.filter(
            organization=organization, is_active=True
        ).exists():
            self.current_organization_id = organization.id
            self.save(update_fields=["current_organization_id"])
            return True
        return False

    def get_organizations(self) -> List["Organization"]:
        """
        Get all organizations the user belongs to.
        """
        from apps.root.models import Organization

        return Organization.objects.filter(
            memberships__user=self, memberships__is_active=True, is_active=True
        ).distinct()

    @property
    def club_id(self) -> Optional[int]:
        """
        Compatibility property to access club ID.
        Returns the ID of the user's club if they have one.
        """
        return self.club.id if self.club else None

    @property
    def current_club_id(self) -> Optional[int]:
        """
        Alias for club_id for backward compatibility.
        """
        return self.club_id


class OrganizationMembership(BaseModel):
    """
    User membership in an organization - EMERGENCY RECOVERY VERSION.
    """

    ROLE_CHOICES = [
        ("root_admin", "Root Admin"),
        ("org_admin", "Organization Admin"),
        ("billing", "Billing Manager"),
        ("support", "Support Agent"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="organization_memberships"
    )
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    # Permissions
    permissions = models.JSONField(default=dict, blank=True)

    # Dates
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_invitations_sent",
    )

    class Meta:
        unique_together = ["user", "organization"]
        indexes = [
            models.Index(fields=["user", "organization", "is_active"]),
            models.Index(fields=["organization", "role"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.organization} ({self.get_role_display()})"


class Session(BaseModel):
    """
    User session tracking - EMERGENCY RECOVERY VERSION.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")

    # Session info
    session_key = models.CharField(max_length=100, unique=True)
    device_type = models.CharField(max_length=20, default="web")
    device_name = models.CharField(max_length=100, blank=True)
    device_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField()
    location = models.CharField(max_length=100, blank=True)

    # Multi-tenant context
    organization = models.ForeignKey(
        "root.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_sessions",
        help_text="Organization context for this session",
    )

    # Browser/OS info
    browser = models.CharField(max_length=50, blank=True)
    os = models.CharField(max_length=50, blank=True)

    # Location info
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # Timestamps
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=50, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["session_key"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.device_type} ({self.ip_address})"

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def revoke(self, reason: str = "manual") -> None:
        """Revoke this session."""
        self.revoked_at = timezone.now()
        self.revoked_reason = reason
        self.is_active = False
        self.save()

        # Import here to avoid circular import
        from .signals import emit_session_revoked

        emit_session_revoked(self, reason)

    @classmethod
    def create_for_user(
        cls,
        user: "User",
        request: HttpRequest,
        device_type: str = "web",
        organization: Optional["Organization"] = None,
    ) -> "Session":
        """Create a new session for user."""
        # Parse user agent
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        browser = ""
        os = ""

        # Simple parsing (in production, use user-agents library)
        if "Chrome" in user_agent:
            browser = "Chrome"
        elif "Firefox" in user_agent:
            browser = "Firefox"
        elif "Safari" in user_agent:
            browser = "Safari"

        if "Windows" in user_agent:
            os = "Windows"
        elif "Mac" in user_agent:
            os = "macOS"
        elif "Linux" in user_agent:
            os = "Linux"

        # If no organization provided, use user's current organization
        if not organization:
            organization = user.organization

        return cls.objects.create(
            user=user,
            session_key=secrets.token_urlsafe(32),
            device_type=device_type,
            ip_address=request.META.get("REMOTE_ADDR", "0.0.0.0"),
            expires_at=timezone.now() + timedelta(days=30),
            device_info={
                "user_agent": user_agent,
            },
            browser=browser,
            os=os,
            organization=organization,
        )


class LoginAttempt(BaseModel):
    """
    Login attempt tracking - EMERGENCY RECOVERY VERSION.
    """

    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    success = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self) -> str:
        status = "Success" if self.success else f"Failed ({self.failure_reason})"
        return f"{self.email} - {status}"


class OTPVerification(BaseModel):
    """
    OTP verification for 2FA - EMERGENCY RECOVERY VERSION.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="otp_verifications"
    )

    # OTP details
    purpose = models.CharField(
        max_length=20,
        choices=[
            ("login", "Login"),
            ("email_verify", "Email Verification"),
            ("phone_verify", "Phone Verification"),
            ("password_reset", "Password Reset"),
        ],
    )
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)

    # Delivery
    delivery_method = models.CharField(
        max_length=10, choices=[("email", "Email"), ("sms", "SMS")]
    )
    sent_to = models.CharField(max_length=100)

    # Track when used
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "purpose", "is_active"]),
            models.Index(fields=["code", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.purpose} ({self.delivery_method})"

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def is_max_attempts_reached(self) -> bool:
        return self.attempts >= self.max_attempts

    def verify(self, code: str) -> Tuple[bool, str]:
        """Verify the OTP code."""
        self.attempts += 1
        self.save()

        if self.is_expired():
            return False, "OTP has expired"

        if self.is_max_attempts_reached():
            return False, "Maximum attempts reached"

        if self.code != code:
            return False, "Invalid code"

        # Mark as used
        self.is_active = False
        self.used_at = timezone.now()
        self.save()

        return True, "Code verified successfully"

    @classmethod
    def generate_for_user(
        cls, user: "User", purpose: str, delivery_method: str = "email", **kwargs: Any
    ) -> "OTPVerification":
        """Generate a new OTP for user."""
        # Deactivate any existing OTPs for this purpose
        cls.objects.filter(user=user, purpose=purpose, is_active=True).update(
            is_active=False
        )

        # Extract only fields that aren't part of the model
        # (ip_address and user_agent are passed but not stored in OTP model)
        allowed_fields = {
            "user",
            "purpose",
            "code",
            "expires_at",
            "delivery_method",
            "sent_to",
        }

        # Filter kwargs to only include model fields
        filtered_kwargs = {
            k: v
            for k, v in kwargs.items()
            if k in [f.name for f in cls._meta.get_fields()]
        }

        # Generate new OTP
        otp = cls.objects.create(
            user=user,
            purpose=purpose,
            code=generate_otp(),
            expires_at=timezone.now() + timedelta(minutes=5),
            delivery_method=delivery_method,
            sent_to=user.email if delivery_method == "email" else user.phone,
            **filtered_kwargs,
        )

        return otp


class APIKey(BaseModel):
    """
    API key for programmatic access - EMERGENCY RECOVERY VERSION.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="api_keys"
    )

    # Key details
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=100, unique=True)
    permissions = models.JSONField(default=list, blank=True)

    # Usage tracking
    last_used_at = models.DateTimeField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)

    # Expiration
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["key"]),
            models.Index(fields=["user", "organization"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.organization}"

    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def record_usage(self) -> None:
        """Record API key usage."""
        self.last_used_at = timezone.now()
        self.usage_count += 1
        self.save()


class BlacklistedToken(BaseModel):
    """
    Model to store blacklisted JWT tokens for secure logout.
    """

    BLACKLIST_REASONS = [
        ("logout", "User Logout"),
        ("logout_all", "User Logout All Devices"),
        ("security", "Security Concern"),
        ("admin_action", "Admin Action"),
        ("password_changed", "Password Changed"),
        ("account_disabled", "Account Disabled"),
    ]

    # JWT token identifier
    jti = models.CharField(
        max_length=255, unique=True, db_index=True, help_text="JWT Token Identifier"
    )

    # User reference
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blacklisted_tokens"
    )

    # Token expiry time (for cleanup)
    token_expires_at = models.DateTimeField(help_text="Original token expiry time")

    # Blacklist metadata
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(
        max_length=20, choices=BLACKLIST_REASONS, default="logout"
    )

    # Additional context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["jti"]),
            models.Index(fields=["user", "blacklisted_at"]),
            models.Index(fields=["token_expires_at"]),
        ]
        ordering = ["-blacklisted_at"]

    def __str__(self) -> str:
        return (
            f"{self.user.email} - {self.get_reason_display()} - {self.blacklisted_at}"
        )

    @classmethod
    def blacklist_token(
        cls,
        jti: str,
        user: "User",
        expires_at: timezone.datetime,
        reason: str = "logout",
        request: Optional[HttpRequest] = None,
    ) -> "BlacklistedToken":
        """
        Add a token to the blacklist.

        Args:
            jti: JWT token identifier
            user: User object
            expires_at: Token expiry datetime
            reason: Reason for blacklisting
            request: Optional request object for IP/user agent
        """
        blacklist_data = {
            "jti": jti,
            "user": user,
            "token_expires_at": expires_at,
            "reason": reason,
        }

        if request:
            # Get IP address
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                blacklist_data["ip_address"] = x_forwarded_for.split(",")[0]
            else:
                blacklist_data["ip_address"] = request.META.get(
                    "REMOTE_ADDR", "0.0.0.0"
                )

            # Get user agent
            blacklist_data["user_agent"] = request.META.get("HTTP_USER_AGENT", "")

        return cls.objects.create(**blacklist_data)

    @classmethod
    def is_blacklisted(cls, jti: str) -> bool:
        """
        Check if a token is blacklisted.
        Uses caching for performance.
        """
        from django.core.cache import cache

        # Check cache first
        cache_key = f"blacklisted_token_{jti}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return cached_result

        # Check database
        is_blacklisted = cls.objects.filter(jti=jti, is_active=True).exists()

        # Cache the result for 5 minutes
        cache.set(cache_key, is_blacklisted, 300)

        return is_blacklisted

    @classmethod
    def cleanup_expired(cls) -> int:
        """
        Remove blacklisted tokens that have expired.
        This method should be called periodically via management command.
        """
        from django.utils import timezone

        expired_count = cls.objects.filter(
            token_expires_at__lt=timezone.now()
        ).delete()[0]

        return expired_count


class AuthAuditLog(BaseModel):
    """
    Comprehensive audit logging for authentication events.
    """

    EVENT_TYPES = [
        ("login_attempt", "Login Attempt"),
        ("login_success", "Login Success"),
        ("login_failed", "Login Failed"),
        ("logout", "Logout"),
        ("logout_all", "Logout All Devices"),
        ("password_change", "Password Changed"),
        ("password_reset_request", "Password Reset Requested"),
        ("password_reset_complete", "Password Reset Completed"),
        ("2fa_enabled", "2FA Enabled"),
        ("2fa_disabled", "2FA Disabled"),
        ("2fa_method_changed", "2FA Method Changed"),
        ("2fa_verified", "2FA Verified"),
        ("2fa_failed", "2FA Failed"),
        ("otp_requested", "OTP Requested"),
        ("organization_switch", "Organization Switched"),
        ("session_created", "Session Created"),
        ("session_revoked", "Session Revoked"),
        ("api_key_created", "API Key Created"),
        ("api_key_revoked", "API Key Revoked"),
        ("api_key_used", "API Key Used"),
        ("email_verified", "Email Verified"),
        ("phone_verified", "Phone Verified"),
        ("account_locked", "Account Locked"),
        ("account_unlocked", "Account Unlocked"),
        ("suspicious_login", "Suspicious Login Detected"),
        ("profile_updated", "Profile Updated"),
        ("permission_granted", "Permission Granted"),
        ("permission_revoked", "Permission Revoked"),
    ]

    # User can be null for failed login attempts
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    # Event details
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    success = models.BooleanField(default=True)

    # Additional context
    details = models.JSONField(default=dict, blank=True)

    # Organization context
    organization = models.ForeignKey(
        "root.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auth_audit_logs",
    )

    # For failed logins, store the attempted email
    attempted_email = models.EmailField(blank=True)

    # Location info (populated asynchronously)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)

    # Session/Device info
    device_type = models.CharField(max_length=20, blank=True)
    browser = models.CharField(max_length=50, blank=True)
    os = models.CharField(max_length=50, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "event_type", "created_at"]),
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["attempted_email", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        user_str = (
            self.user.email
            if self.user
            else f"Anonymous ({self.attempted_email or 'N/A'})"
        )
        return f"{user_str} - {self.get_event_type_display()} - {self.created_at}"

    @classmethod
    def log_event(
        cls,
        event_type: str,
        request: Optional[HttpRequest] = None,
        user: Optional["User"] = None,
        success: bool = True,
        organization: Optional["Organization"] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> "AuthAuditLog":
        """
        Create an audit log entry.

        Args:
            event_type: One of the EVENT_TYPES choices
            request: Django request object (optional)
            user: User object (optional)
            success: Whether the event was successful
            organization: Organization context (optional)
            details: Additional JSON details (optional)
            **kwargs: Additional fields like attempted_email
        """
        log_data = {
            "event_type": event_type,
            "user": user,
            "success": success,
            "organization": organization or (user.organization if user else None),
            "details": details or {},
        }

        # Extract request information if available
        if request:
            # Get IP address
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                log_data["ip_address"] = x_forwarded_for.split(",")[0]
            else:
                log_data["ip_address"] = request.META.get("REMOTE_ADDR", "0.0.0.0")

            # Get user agent
            log_data["user_agent"] = request.META.get("HTTP_USER_AGENT", "")

            # Parse browser and OS from user agent
            user_agent = log_data["user_agent"]
            if "Chrome" in user_agent:
                log_data["browser"] = "Chrome"
            elif "Firefox" in user_agent:
                log_data["browser"] = "Firefox"
            elif "Safari" in user_agent:
                log_data["browser"] = "Safari"
            elif "Edge" in user_agent:
                log_data["browser"] = "Edge"

            if "Windows" in user_agent:
                log_data["os"] = "Windows"
            elif "Mac" in user_agent:
                log_data["os"] = "macOS"
            elif "Linux" in user_agent:
                log_data["os"] = "Linux"
            elif "Android" in user_agent:
                log_data["os"] = "Android"
            elif "iOS" in user_agent or "iPhone" in user_agent:
                log_data["os"] = "iOS"
        else:
            # Default values if no request
            log_data["ip_address"] = kwargs.get("ip_address", "0.0.0.0")
            log_data["user_agent"] = kwargs.get("user_agent", "")

        # Add any additional kwargs
        for key, value in kwargs.items():
            if key not in ["ip_address", "user_agent"] and hasattr(cls, key):
                log_data[key] = value

        # Create the audit log
        return cls.objects.create(**log_data)
