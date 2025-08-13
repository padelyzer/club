"""
Admin configuration for authentication models.
"""

import json

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    APIKey,
    AuthAuditLog,
    BlacklistedToken,
    LoginAttempt,
    OrganizationMembership,
    OTPVerification,
    Session,
    User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""

    list_display = [
        "email",
        "get_full_name",
        "phone",
        "email_verified",
        "two_factor_enabled",
        "current_organization_id",
        "is_active",
        "is_staff",
        "date_joined",
    ]
    list_filter = [
        "is_active",
        "is_staff",
        "is_superuser",
        "email_verified",
        "phone_verified",
        "two_factor_enabled",
        "two_factor_method",
        "date_joined",
    ]
    search_fields = ["email", "first_name", "last_name", "phone"]
    ordering = ["-date_joined"]

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Additional Info",
            {
                "fields": (
                    "phone",
                    "phone_verified",
                    "email_verified",
                    "two_factor_enabled",
                    "two_factor_method",
                    "avatar_url",
                    "language",
                    "timezone",
                    "current_organization_id",
                    "last_login_ip",
                    "last_login_device",
                )
            },
        ),
    )

    def get_full_name(self, obj):
        return obj.get_full_name() or "-"

    get_full_name.short_description = "Full Name"


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    """Admin interface for OrganizationMembership model."""

    list_display = ["user", "organization", "role", "joined_at", "is_active"]
    list_filter = ["role", "is_active", "joined_at"]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "organization__trade_name",
    ]
    raw_id_fields = ["user", "organization", "invited_by"]
    date_hierarchy = "joined_at"
    ordering = ["-joined_at"]


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    """Admin interface for Session model."""

    list_display = [
        "user",
        "device_type",
        "ip_address",
        "browser",
        "os",
        "last_activity",
        "is_active",
        "is_expired_display",
        "revoked_at",
    ]
    list_filter = ["device_type", "is_active", "browser", "os", "created_at"]
    search_fields = ["user__email", "ip_address", "session_key"]
    readonly_fields = [
        "session_key",
        "created_at",
        "updated_at",
        "device_info",
        "is_expired_display",
    ]
    raw_id_fields = ["user", "organization"]
    date_hierarchy = "created_at"
    ordering = ["-last_activity"]

    def is_expired_display(self, obj):
        return obj.is_expired()

    is_expired_display.boolean = True
    is_expired_display.short_description = "Is Expired"

    actions = ["revoke_sessions"]

    def revoke_sessions(self, request, queryset):
        count = 0
        for session in queryset.filter(is_active=True, revoked_at__isnull=True):
            session.revoke("admin_action")
            count += 1
        self.message_user(request, f"{count} sessions revoked.")

    revoke_sessions.short_description = "Revoke selected sessions"


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """Admin interface for LoginAttempt model."""

    list_display = ["email", "ip_address", "success", "failure_reason", "created_at"]
    list_filter = ["success", "created_at"]
    search_fields = ["email", "ip_address"]
    readonly_fields = ["created_at"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    """Admin interface for OTPVerification model."""

    list_display = [
        "user",
        "purpose",
        "delivery_method",
        "sent_to",
        "attempts",
        "is_active",
        "used_at",
        "expires_at",
    ]
    list_filter = ["purpose", "delivery_method", "is_active", "created_at"]
    search_fields = ["user__email", "sent_to", "code"]
    readonly_fields = ["code", "created_at", "updated_at", "used_at"]
    raw_id_fields = ["user"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    """Admin interface for APIKey model."""

    list_display = [
        "name",
        "user",
        "organization",
        "is_active",
        "last_used_at",
        "usage_count",
        "expires_at",
    ]
    list_filter = ["is_active", "created_at", "expires_at"]
    search_fields = ["name", "user__email", "organization__trade_name"]
    readonly_fields = ["key", "created_at", "updated_at", "last_used_at", "usage_count"]
    raw_id_fields = ["user", "organization"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]


@admin.register(AuthAuditLog)
class AuthAuditLogAdmin(admin.ModelAdmin):
    """Admin interface for AuthAuditLog model."""

    list_display = [
        "created_at",
        "event_type_colored",
        "user_display",
        "ip_address",
        "browser",
        "os",
        "success_display",
        "organization",
    ]
    list_filter = [
        "event_type",
        "success",
        "browser",
        "os",
        "device_type",
        "created_at",
    ]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "attempted_email",
        "ip_address",
        "city",
        "country",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "event_type",
        "user",
        "ip_address",
        "user_agent",
        "success",
        "details_formatted",
        "organization",
        "attempted_email",
        "country",
        "city",
        "device_type",
        "browser",
        "os",
    ]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    def event_type_colored(self, obj):
        """Display event type with color coding."""
        colors = {
            "login_success": "green",
            "login_failed": "red",
            "login_attempt": "blue",
            "logout": "gray",
            "logout_all": "gray",
            "password_change": "orange",
            "password_reset_request": "orange",
            "password_reset_complete": "orange",
            "2fa_enabled": "purple",
            "2fa_disabled": "purple",
            "2fa_verified": "green",
            "2fa_failed": "red",
            "suspicious_login": "red",
            "session_created": "blue",
            "session_revoked": "gray",
            "organization_switch": "teal",
            "profile_updated": "blue",
        }
        color = colors.get(obj.event_type, "black")
        return format_html(
            '<span style="color: {};">{}</span>', color, obj.get_event_type_display()
        )

    event_type_colored.short_description = "Event Type"

    def user_display(self, obj):
        """Display user with link or attempted email."""
        if obj.user:
            url = reverse("admin:authentication_user_change", args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        elif obj.attempted_email:
            return f"Failed: {obj.attempted_email}"
        return "-"

    user_display.short_description = "User"

    def success_display(self, obj):
        """Display success status with icon."""
        if obj.success:
            return format_html('<span style="color: green;">✓</span>')
        else:
            return format_html('<span style="color: red;">✗</span>')

    success_display.short_description = "Success"

    def details_formatted(self, obj):
        """Display formatted JSON details."""
        if obj.details:
            formatted = json.dumps(obj.details, indent=2)
            return format_html("<pre>{}</pre>", formatted)
        return "-"

    details_formatted.short_description = "Details"

    def has_add_permission(self, request):
        """Audit logs should not be added manually."""
        return False

    def has_change_permission(self, request, obj=None):
        """Audit logs should not be edited."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete audit logs."""
        return request.user.is_superuser


@admin.register(BlacklistedToken)
class BlacklistedTokenAdmin(admin.ModelAdmin):
    """Admin interface for BlacklistedToken model."""

    list_display = [
        "jti_short",
        "user",
        "reason",
        "blacklisted_at",
        "token_expires_at",
        "ip_address",
        "is_active",
    ]
    list_filter = ["reason", "is_active", "blacklisted_at", "token_expires_at"]
    search_fields = ["jti", "user__email", "ip_address"]
    readonly_fields = [
        "jti",
        "user",
        "token_expires_at",
        "blacklisted_at",
        "ip_address",
        "user_agent",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = ["user"]
    date_hierarchy = "blacklisted_at"
    ordering = ["-blacklisted_at"]

    def jti_short(self, obj):
        """Display shortened JTI for readability."""
        if len(obj.jti) > 20:
            return f"{obj.jti[:8]}...{obj.jti[-8:]}"
        return obj.jti

    jti_short.short_description = "Token ID"

    def has_add_permission(self, request):
        """Blacklisted tokens should not be added manually."""
        return False

    def has_change_permission(self, request, obj=None):
        """Blacklisted tokens should not be edited."""
        return False

    actions = ["cleanup_expired"]

    def cleanup_expired(self, request, queryset):
        """Cleanup expired tokens."""
        from django.utils import timezone

        expired = queryset.filter(token_expires_at__lt=timezone.now())
        count = expired.count()
        expired.delete()
        self.message_user(request, f"{count} expired tokens removed.")

    cleanup_expired.short_description = "Cleanup expired tokens"
