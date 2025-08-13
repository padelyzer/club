"""
Serializers for notifications module.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import serializers

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

User = get_user_model()


class NotificationTypeSerializer(serializers.ModelSerializer):
    """Serializer for NotificationType model."""

    class Meta:
        model = NotificationType
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_system",
            "default_enabled",
            "available_channels",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_slug(self, value):
        """Validate slug uniqueness."""
        if self.instance and self.instance.slug == value:
            return value

        if NotificationType.objects.filter(slug=value).exists():
            raise serializers.ValidationError("This slug already exists.")
        return value


class NotificationChannelSerializer(serializers.ModelSerializer):
    """Serializer for NotificationChannel model."""

    channel_type_display = serializers.CharField(
        source="get_channel_type_display", read_only=True
    )

    class Meta:
        model = NotificationChannel
        fields = [
            "id",
            "name",
            "slug",
            "channel_type",
            "channel_type_display",
            "description",
            "is_enabled",
            "priority",
            "rate_limit_per_minute",
            "rate_limit_per_hour",
            "rate_limit_per_day",
            "provider_config",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "channel_type_display"]
        extra_kwargs = {"provider_config": {"write_only": True}}

    def validate_slug(self, value):
        """Validate slug uniqueness."""
        if self.instance and self.instance.slug == value:
            return value

        if NotificationChannel.objects.filter(slug=value).exists():
            raise serializers.ValidationError("This slug already exists.")
        return value


class NotificationChannelPublicSerializer(serializers.ModelSerializer):
    """Public serializer for NotificationChannel (without sensitive data)."""

    channel_type_display = serializers.CharField(
        source="get_channel_type_display", read_only=True
    )

    class Meta:
        model = NotificationChannel
        fields = [
            "id",
            "name",
            "slug",
            "channel_type",
            "channel_type_display",
            "description",
            "is_enabled",
            "priority",
        ]


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for NotificationTemplate model."""

    notification_type_name = serializers.CharField(
        source="notification_type.name", read_only=True
    )
    channel_name = serializers.CharField(source="channel.name", read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = [
            "id",
            "name",
            "notification_type",
            "notification_type_name",
            "channel",
            "channel_name",
            "subject_template",
            "body_template",
            "variables",
            "language",
            "is_default",
            "organization",
            "club",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "notification_type_name",
            "channel_name",
        ]

    def validate(self, data):
        """Validate template uniqueness and constraints."""
        notification_type = data.get("notification_type")
        channel = data.get("channel")
        organization = data.get("organization")
        club = data.get("club")
        language = data.get("language", "es-mx")
        is_default = data.get("is_default", False)

        # Check unique constraint for combination
        queryset = NotificationTemplate.objects.filter(
            notification_type=notification_type,
            channel=channel,
            organization=organization,
            club=club,
            language=language,
        )

        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        if queryset.exists():
            raise serializers.ValidationError(
                "A template for this combination already exists."
            )

        # Check default template constraint
        if is_default:
            default_queryset = NotificationTemplate.objects.filter(
                notification_type=notification_type,
                channel=channel,
                organization=organization,
                is_default=True,
            )

            if self.instance:
                default_queryset = default_queryset.exclude(id=self.instance.id)

            if default_queryset.exists():
                raise serializers.ValidationError(
                    "A default template for this notification type and channel already exists."
                )

        return data


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for UserNotificationPreference model."""

    notification_type_name = serializers.CharField(
        source="notification_type.name", read_only=True
    )
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = UserNotificationPreference
        fields = [
            "id",
            "user",
            "user_email",
            "notification_type",
            "notification_type_name",
            "email_enabled",
            "sms_enabled",
            "whatsapp_enabled",
            "push_web_enabled",
            "push_mobile_enabled",
            "in_app_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "digest_enabled",
            "digest_frequency",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "notification_type_name",
            "user_email",
        ]


class NotificationEventSerializer(serializers.ModelSerializer):
    """Serializer for NotificationEvent model."""

    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )

    class Meta:
        model = NotificationEvent
        fields = [
            "id",
            "notification",
            "delivery",
            "event_type",
            "event_type_display",
            "event_data",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "event_type_display"]


class NotificationDeliverySerializer(serializers.ModelSerializer):
    """Serializer for NotificationDelivery model."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    channel_name = serializers.CharField(source="channel.name", read_only=True)
    channel_type = serializers.CharField(source="channel.channel_type", read_only=True)
    events = NotificationEventSerializer(many=True, read_only=True)

    class Meta:
        model = NotificationDelivery
        fields = [
            "id",
            "notification",
            "channel",
            "channel_name",
            "channel_type",
            "status",
            "status_display",
            "attempt_count",
            "max_attempts",
            "provider_id",
            "provider_response",
            "sent_at",
            "delivered_at",
            "failed_at",
            "read_at",
            "clicked_at",
            "next_retry_at",
            "error_code",
            "error_message",
            "events",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status_display",
            "channel_name",
            "channel_type",
            "attempt_count",
            "provider_id",
            "provider_response",
            "sent_at",
            "delivered_at",
            "failed_at",
            "read_at",
            "clicked_at",
            "next_retry_at",
            "error_code",
            "error_message",
            "events",
            "created_at",
            "updated_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""

    recipient_name = serializers.CharField(
        source="recipient.get_full_name", read_only=True
    )
    recipient_email = serializers.CharField(source="recipient.email", read_only=True)
    notification_type_name = serializers.CharField(
        source="notification_type.name", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    deliveries = NotificationDeliverySerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "notification_type_name",
            "recipient",
            "recipient_name",
            "recipient_email",
            "title",
            "message",
            "priority",
            "priority_display",
            "category",
            "action_url",
            "action_label",
            "deep_link",
            "data",
            "is_read",
            "read_at",
            "batch",
            "template",
            "deliveries",
            "organization",
            "club",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "notification_type_name",
            "recipient_name",
            "recipient_email",
            "priority_display",
            "read_at",
            "deliveries",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """Validate notification data."""
        if data.get("action_url") and not data.get("action_label"):
            raise serializers.ValidationError(
                "action_label is required when action_url is provided."
            )
        return data


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification lists."""

    notification_type_name = serializers.CharField(
        source="notification_type.name", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    delivery_count = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type_name",
            "title",
            "priority",
            "priority_display",
            "is_read",
            "delivery_count",
            "created_at",
        ]

    def get_delivery_count(self, obj):
        """Get count of deliveries."""
        return obj.deliveries.count()


class NotificationBatchSerializer(serializers.ModelSerializer):
    """Serializer for NotificationBatch model."""

    notification_type_name = serializers.CharField(
        source="notification_type.name", read_only=True
    )
    batch_type_display = serializers.CharField(
        source="get_batch_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    channels_data = NotificationChannelPublicSerializer(
        source="channels", many=True, read_only=True
    )

    class Meta:
        model = NotificationBatch
        fields = [
            "id",
            "name",
            "notification_type",
            "notification_type_name",
            "batch_type",
            "batch_type_display",
            "status",
            "status_display",
            "recipients",
            "recipient_filters",
            "subject",
            "message",
            "template",
            "template_context",
            "channels",
            "channels_data",
            "scheduled_at",
            "started_at",
            "completed_at",
            "total_recipients",
            "total_sent",
            "total_delivered",
            "total_failed",
            "created_by",
            "created_by_name",
            "error_log",
            "organization",
            "club",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "notification_type_name",
            "batch_type_display",
            "status_display",
            "created_by_name",
            "channels_data",
            "started_at",
            "completed_at",
            "total_recipients",
            "total_sent",
            "total_delivered",
            "total_failed",
            "error_log",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """Validate batch data."""
        # Either recipients or recipient_filters must be provided
        recipients = data.get("recipients", [])
        recipient_filters = data.get("recipient_filters", {})

        if not recipients and not recipient_filters:
            raise serializers.ValidationError(
                "Either recipients or recipient_filters must be provided."
            )

        # Subject or template must be provided
        subject = data.get("subject")
        message = data.get("message")
        template = data.get("template")

        if not template and (not subject or not message):
            raise serializers.ValidationError(
                "Subject and message are required when no template is provided."
            )

        # Scheduled time validation
        scheduled_at = data.get("scheduled_at")
        if scheduled_at and scheduled_at <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")

        return data


class NotificationBatchCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notification batches."""

    class Meta:
        model = NotificationBatch
        fields = [
            "name",
            "notification_type",
            "batch_type",
            "recipients",
            "recipient_filters",
            "subject",
            "message",
            "template",
            "template_context",
            "channels",
            "scheduled_at",
            "organization",
            "club",
        ]

    def validate(self, data):
        """Validate batch creation data."""
        # Use same validation as NotificationBatchSerializer
        return NotificationBatchSerializer().validate(data)

    def create(self, validated_data):
        """Create notification batch with proper status."""
        validated_data["status"] = "draft"
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class MarkNotificationReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read."""

    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        help_text="List of notification IDs to mark as read",
    )


class SendNotificationSerializer(serializers.Serializer):
    """Serializer for sending individual notifications."""

    notification_type = serializers.PrimaryKeyRelatedField(
        queryset=NotificationType.objects.filter(is_active=True)
    )
    recipients = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=User.objects.filter(is_active=True)
        ),
        allow_empty=False,
    )
    channels = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=NotificationChannel.objects.filter(is_enabled=True)
        ),
        allow_empty=False,
    )
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_CHOICES, default="normal"
    )
    category = serializers.CharField(max_length=100, required=False, allow_blank=True)
    action_url = serializers.URLField(required=False, allow_blank=True)
    action_label = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    deep_link = serializers.CharField(max_length=500, required=False, allow_blank=True)
    data = serializers.JSONField(required=False, default=dict)
    template = serializers.PrimaryKeyRelatedField(
        queryset=NotificationTemplate.objects.filter(is_active=True), required=False
    )

    def validate(self, data):
        """Validate notification send data."""
        if data.get("action_url") and not data.get("action_label"):
            raise serializers.ValidationError(
                "action_label is required when action_url is provided."
            )
        return data


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics."""

    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    notifications_by_type = serializers.DictField()
    notifications_by_priority = serializers.DictField()
    delivery_stats = serializers.DictField()
    recent_activity = NotificationListSerializer(many=True)


class BulkPreferenceUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating notification preferences."""

    notification_types = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=NotificationType.objects.filter(is_active=True)
        ),
        allow_empty=False,
    )
    email_enabled = serializers.BooleanField(required=False)
    sms_enabled = serializers.BooleanField(required=False)
    whatsapp_enabled = serializers.BooleanField(required=False)
    push_web_enabled = serializers.BooleanField(required=False)
    push_mobile_enabled = serializers.BooleanField(required=False)
    in_app_enabled = serializers.BooleanField(required=False)
    digest_enabled = serializers.BooleanField(required=False)
    digest_frequency = serializers.ChoiceField(
        choices=UserNotificationPreference._meta.get_field("digest_frequency").choices,
        required=False,
    )
