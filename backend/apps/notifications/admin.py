"""
Admin configuration for notifications module.
"""

import json

from django.contrib import admin
from django.db.models import Count
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    Notification,
    NotificationBatch,
    NotificationChannel,
    NotificationDelivery,
    NotificationEvent,
    NotificationTemplate,
    NotificationType,
    UserNotificationPreference,
)
from .tasks import process_notification_batch, send_notification_delivery


@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "slug",
        "is_system",
        "default_enabled",
        "available_channels_display",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_system", "default_enabled", "is_active", "created_at"]
    search_fields = ["name", "slug", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    prepopulated_fields = {"slug": ("name",)}

    fieldsets = (
        ("Basic Information", {"fields": ("name", "slug", "description")}),
        (
            "Configuration",
            {"fields": ("is_system", "default_enabled", "available_channels")},
        ),
        ("Status", {"fields": ("is_active",)}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def available_channels_display(self, obj):
        """Display available channels as badges."""
        if not obj.available_channels:
            return "-"

        badges = []
        for channel in obj.available_channels:
            badges.append(f'<span class="badge badge-info">{channel}</span>')

        return mark_safe(" ".join(badges))

    available_channels_display.short_description = "Available Channels"


@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "slug",
        "channel_type",
        "is_enabled",
        "priority",
        "rate_limits_display",
        "is_active",
        "created_at",
    ]
    list_filter = ["channel_type", "is_enabled", "is_active", "created_at"]
    search_fields = ["name", "slug", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    prepopulated_fields = {"slug": ("name",)}

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "slug", "channel_type", "description")},
        ),
        ("Configuration", {"fields": ("is_enabled", "priority")}),
        (
            "Rate Limiting",
            {
                "fields": (
                    "rate_limit_per_minute",
                    "rate_limit_per_hour",
                    "rate_limit_per_day",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Provider Configuration",
            {
                "fields": ("provider_config",),
                "classes": ("collapse",),
                "description": "Provider-specific configuration (sensitive data)",
            },
        ),
        ("Status", {"fields": ("is_active",)}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def rate_limits_display(self, obj):
        """Display rate limits in a compact format."""
        limits = []
        if obj.rate_limit_per_minute:
            limits.append(f"{obj.rate_limit_per_minute}/min")
        if obj.rate_limit_per_hour:
            limits.append(f"{obj.rate_limit_per_hour}/hr")
        if obj.rate_limit_per_day:
            limits.append(f"{obj.rate_limit_per_day}/day")

        return " | ".join(limits) if limits else "-"

    rate_limits_display.short_description = "Rate Limits"


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "notification_type",
        "channel",
        "language",
        "is_default",
        "organization",
        "club",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "notification_type",
        "channel",
        "language",
        "is_default",
        "is_active",
        "created_at",
    ]
    search_fields = ["name", "subject_template", "body_template"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "notification_type", "channel", "language")},
        ),
        (
            "Template Content",
            {"fields": ("subject_template", "body_template"), "classes": ("wide",)},
        ),
        (
            "Template Metadata",
            {"fields": ("variables", "is_default"), "classes": ("collapse",)},
        ),
        (
            "Tenant Information",
            {
                "fields": ("organization", "club"),
            },
        ),
        ("Status", {"fields": ("is_active",)}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Customize form fields."""
        if db_field.name == "body_template":
            kwargs["widget"] = admin.widgets.AdminTextareaWidget(
                attrs={"rows": 10, "cols": 80}
            )
        elif db_field.name == "variables":
            kwargs["widget"] = admin.widgets.AdminTextareaWidget(
                attrs={"rows": 5, "cols": 80}
            )
        return super().formfield_for_dbfield(db_field, request, **kwargs)


class NotificationDeliveryInline(admin.TabularInline):
    model = NotificationDelivery
    extra = 0
    readonly_fields = [
        "status",
        "attempt_count",
        "provider_id",
        "sent_at",
        "delivered_at",
        "failed_at",
        "error_message",
    ]
    fields = [
        "channel",
        "status",
        "attempt_count",
        "provider_id",
        "sent_at",
        "delivered_at",
        "failed_at",
    ]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "notification_type",
        "recipient",
        "priority",
        "is_read",
        "delivery_status",
        "created_at",
    ]
    list_filter = [
        "notification_type",
        "priority",
        "is_read",
        "is_active",
        "created_at",
    ]
    search_fields = [
        "title",
        "message",
        "recipient__email",
        "recipient__first_name",
        "recipient__last_name",
    ]
    readonly_fields = ["id", "read_at", "created_at", "updated_at"]
    date_hierarchy = "created_at"
    inlines = [NotificationDeliveryInline]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("notification_type", "recipient", "title", "message")},
        ),
        (
            "Configuration",
            {
                "fields": (
                    "priority",
                    "category",
                    "action_url",
                    "action_label",
                    "deep_link",
                )
            },
        ),
        ("Status", {"fields": ("is_read", "read_at", "is_active")}),
        ("Relationships", {"fields": ("batch", "template"), "classes": ("collapse",)}),
        ("Data", {"fields": ("data",), "classes": ("collapse",)}),
        (
            "Tenant Information",
            {"fields": ("organization", "club"), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def delivery_status(self, obj):
        """Display delivery status summary."""
        deliveries = obj.deliveries.all()
        if not deliveries:
            return format_html('<span style="color: gray;">No deliveries</span>')

        status_counts = {}
        for delivery in deliveries:
            status_counts[delivery.status] = status_counts.get(delivery.status, 0) + 1

        status_badges = []
        for status, count in status_counts.items():
            color = {
                "pending": "orange",
                "sent": "blue",
                "delivered": "green",
                "failed": "red",
                "read": "purple",
                "clicked": "teal",
            }.get(status, "gray")

            status_badges.append(
                f'<span style="color: {color}; font-weight: bold;">{status}: {count}</span>'
            )

        return format_html(" | ".join(status_badges))

    delivery_status.short_description = "Delivery Status"

    actions = ["mark_as_read", "resend_failed_deliveries"]

    def mark_as_read(self, request, queryset):
        """Mark selected notifications as read."""
        count = 0
        for notification in queryset:
            if not notification.is_read:
                notification.mark_as_read()
                count += 1

        self.message_user(request, f"{count} notifications marked as read.")

    mark_as_read.short_description = "Mark selected notifications as read"

    def resend_failed_deliveries(self, request, queryset):
        """Resend failed deliveries for selected notifications."""
        count = 0
        for notification in queryset:
            failed_deliveries = notification.deliveries.filter(status="failed")
            for delivery in failed_deliveries:
                if delivery.can_retry():
                    send_notification_delivery.apply_async(args=[delivery.id])
                    count += 1

        self.message_user(request, f"{count} failed deliveries scheduled for retry.")

    resend_failed_deliveries.short_description = "Resend failed deliveries"


@admin.register(NotificationBatch)
class NotificationBatchAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "notification_type",
        "status",
        "batch_type",
        "total_recipients",
        "stats_display",
        "created_by",
        "created_at",
    ]
    list_filter = ["status", "batch_type", "notification_type", "created_at"]
    search_fields = ["name", "subject", "message"]
    readonly_fields = [
        "id",
        "status",
        "started_at",
        "completed_at",
        "total_recipients",
        "total_sent",
        "total_delivered",
        "total_failed",
        "created_at",
        "updated_at",
    ]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Basic Information", {"fields": ("name", "notification_type", "batch_type")}),
        (
            "Recipients",
            {"fields": ("recipients", "recipient_filters"), "classes": ("wide",)},
        ),
        (
            "Message Content",
            {
                "fields": ("subject", "message", "template", "template_context"),
                "classes": ("wide",),
            },
        ),
        ("Channels", {"fields": ("channels",)}),
        ("Scheduling", {"fields": ("scheduled_at",)}),
        (
            "Status",
            {
                "fields": ("status", "started_at", "completed_at", "error_log"),
                "classes": ("collapse",),
            },
        ),
        (
            "Statistics",
            {
                "fields": (
                    "total_recipients",
                    "total_sent",
                    "total_delivered",
                    "total_failed",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Tenant Information",
            {"fields": ("organization", "club"), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {
                "fields": ("id", "created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def stats_display(self, obj):
        """Display batch statistics."""
        if obj.total_recipients == 0:
            return "-"

        success_rate = (
            (obj.total_delivered / obj.total_sent * 100) if obj.total_sent > 0 else 0
        )

        return format_html(
            '<span style="color: green;">✓ {}</span> / '
            '<span style="color: red;">✗ {}</span> '
            '(<span style="font-weight: bold;">{:.1f}%</span>)',
            obj.total_delivered,
            obj.total_failed,
            success_rate,
        )

    stats_display.short_description = "Success/Failure Rate"

    actions = ["schedule_batch", "cancel_batch"]

    def schedule_batch(self, request, queryset):
        """Schedule selected batches."""
        count = 0
        for batch in queryset:
            if batch.status == "draft":
                batch.status = "scheduled"
                batch.save()
                process_notification_batch.apply_async(args=[batch.id])
                count += 1

        self.message_user(request, f"{count} batches scheduled for processing.")

    schedule_batch.short_description = "Schedule selected batches"

    def cancel_batch(self, request, queryset):
        """Cancel selected batches."""
        count = 0
        for batch in queryset:
            if batch.status in ["draft", "scheduled"]:
                batch.status = "cancelled"
                batch.save()
                count += 1

        self.message_user(request, f"{count} batches cancelled.")

    cancel_batch.short_description = "Cancel selected batches"


@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "notification_type",
        "enabled_channels_display",
        "digest_enabled",
        "digest_frequency",
        "created_at",
    ]
    list_filter = [
        "notification_type",
        "digest_enabled",
        "digest_frequency",
        "created_at",
    ]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "notification_type__name",
    ]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("user", "notification_type")}),
        (
            "Channel Preferences",
            {
                "fields": (
                    "email_enabled",
                    "sms_enabled",
                    "whatsapp_enabled",
                    "push_web_enabled",
                    "push_mobile_enabled",
                    "in_app_enabled",
                )
            },
        ),
        (
            "Timing Preferences",
            {
                "fields": ("quiet_hours_start", "quiet_hours_end"),
                "classes": ("collapse",),
            },
        ),
        (
            "Digest Settings",
            {
                "fields": ("digest_enabled", "digest_frequency"),
                "classes": ("collapse",),
            },
        ),
        ("Status", {"fields": ("is_active",)}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def enabled_channels_display(self, obj):
        """Display enabled channels as badges."""
        channels = []

        if obj.email_enabled:
            channels.append(
                '<span style="background: #007cba; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">EMAIL</span>'
            )
        if obj.sms_enabled:
            channels.append(
                '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">SMS</span>'
            )
        if obj.whatsapp_enabled:
            channels.append(
                '<span style="background: #25d366; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">WHATSAPP</span>'
            )
        if obj.push_web_enabled:
            channels.append(
                '<span style="background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">PUSH WEB</span>'
            )
        if obj.push_mobile_enabled:
            channels.append(
                '<span style="background: #fd7e14; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">PUSH MOBILE</span>'
            )
        if obj.in_app_enabled:
            channels.append(
                '<span style="background: #6f42c1; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">IN-APP</span>'
            )

        return mark_safe(" ".join(channels)) if channels else "-"

    enabled_channels_display.short_description = "Enabled Channels"


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    list_display = [
        "notification_title",
        "channel",
        "status",
        "attempt_count",
        "provider_id",
        "sent_at",
        "delivered_at",
        "created_at",
    ]
    list_filter = ["status", "channel__channel_type", "attempt_count", "created_at"]
    search_fields = [
        "notification__title",
        "channel__name",
        "provider_id",
        "error_message",
    ]
    readonly_fields = [
        "id",
        "attempt_count",
        "provider_id",
        "provider_response",
        "sent_at",
        "delivered_at",
        "failed_at",
        "read_at",
        "clicked_at",
        "created_at",
        "updated_at",
    ]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Basic Information", {"fields": ("notification", "channel")}),
        (
            "Status",
            {"fields": ("status", "attempt_count", "max_attempts", "next_retry_at")},
        ),
        (
            "Provider Information",
            {"fields": ("provider_id", "provider_response"), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "sent_at",
                    "delivered_at",
                    "failed_at",
                    "read_at",
                    "clicked_at",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Error Information",
            {"fields": ("error_code", "error_message"), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def notification_title(self, obj):
        """Display notification title with link."""
        url = reverse(
            "admin:notifications_notification_change", args=[obj.notification.id]
        )
        return format_html('<a href="{}">{}</a>', url, obj.notification.title)

    notification_title.short_description = "Notification"

    actions = ["retry_delivery"]

    def retry_delivery(self, request, queryset):
        """Retry selected deliveries."""
        count = 0
        for delivery in queryset:
            if delivery.can_retry():
                send_notification_delivery.apply_async(args=[delivery.id])
                count += 1

        self.message_user(request, f"{count} deliveries scheduled for retry.")

    retry_delivery.short_description = "Retry selected deliveries"


@admin.register(NotificationEvent)
class NotificationEventAdmin(admin.ModelAdmin):
    list_display = [
        "notification_title",
        "event_type",
        "delivery_channel",
        "ip_address",
        "created_at",
    ]
    list_filter = ["event_type", "created_at"]
    search_fields = ["notification__title", "ip_address"]
    readonly_fields = ["id", "created_at"]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Basic Information", {"fields": ("notification", "delivery", "event_type")}),
        ("Event Data", {"fields": ("event_data",), "classes": ("wide",)}),
        (
            "Request Information",
            {"fields": ("ip_address", "user_agent"), "classes": ("collapse",)},
        ),
        ("Metadata", {"fields": ("id", "created_at"), "classes": ("collapse",)}),
    )

    def notification_title(self, obj):
        """Display notification title with link."""
        url = reverse(
            "admin:notifications_notification_change", args=[obj.notification.id]
        )
        return format_html('<a href="{}">{}</a>', url, obj.notification.title)

    notification_title.short_description = "Notification"

    def delivery_channel(self, obj):
        """Display delivery channel if available."""
        if obj.delivery:
            return obj.delivery.channel.name
        return "-"

    delivery_channel.short_description = "Channel"

    def has_add_permission(self, request):
        """Events are created automatically."""
        return False

    def has_change_permission(self, request, obj=None):
        """Events are read-only."""
        return False
