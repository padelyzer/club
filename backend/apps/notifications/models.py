"""
Models for notifications module.
"""

import json

from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel, MultiTenantModel

User = get_user_model()


class NotificationType(BaseModel):
    """
    Types of notifications that can be sent.
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    # Configuration
    is_system = models.BooleanField(
        default=False, help_text="System notifications cannot be disabled by users"
    )
    default_enabled = models.BooleanField(
        default=True, help_text="Default preference for new users"
    )

    # Available channels for this notification type
    available_channels = models.JSONField(
        default=list,
        help_text="List of channel slugs that support this notification type",
    )

    class Meta:
        verbose_name = "Tipo de Notificación"
        verbose_name_plural = "Tipos de Notificaciones"
        ordering = ["name"]

    def __str__(self):
        return self.name


class NotificationChannel(BaseModel):
    """
    Communication channels for notifications (email, SMS, WhatsApp, push).
    """

    CHANNEL_TYPES = [
        ("email", "Email"),
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("push_web", "Push Web"),
        ("push_mobile", "Push Móvil"),
        ("in_app", "In-App"),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    channel_type = models.CharField(max_length=20, choices=CHANNEL_TYPES)
    description = models.TextField(blank=True)

    # Configuration
    is_enabled = models.BooleanField(default=True)
    priority = models.IntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Priority for fallback ordering (1=highest, 100=lowest)",
    )

    # Rate limiting
    rate_limit_per_minute = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum notifications per minute for this channel",
    )
    rate_limit_per_hour = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum notifications per hour for this channel",
    )
    rate_limit_per_day = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum notifications per day for this channel",
    )

    # Provider configuration
    provider_config = models.JSONField(
        default=dict,
        help_text="Channel-specific configuration (API keys, endpoints, etc.)",
    )

    class Meta:
        verbose_name = "Canal de Notificación"
        verbose_name_plural = "Canales de Notificación"
        ordering = ["priority", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_channel_type_display()})"


class NotificationTemplate(MultiTenantModel):
    """
    Customizable templates for notifications.
    """

    name = models.CharField(max_length=200)
    notification_type = models.ForeignKey(
        NotificationType, on_delete=models.CASCADE, related_name="templates"
    )
    channel = models.ForeignKey(
        NotificationChannel, on_delete=models.CASCADE, related_name="templates"
    )

    # Template content
    subject_template = models.CharField(
        max_length=500,
        blank=True,
        help_text="Template for subject/title (supports variables)",
    )
    body_template = models.TextField(
        help_text="Template for message body (supports HTML and variables)"
    )

    # Template metadata
    variables = models.JSONField(
        default=dict, help_text="Available variables for this template"
    )
    language = models.CharField(max_length=10, default="es-mx")

    # Template settings
    is_default = models.BooleanField(
        default=False,
        help_text="Default template for this notification type and channel",
    )

    class Meta:
        verbose_name = "Plantilla de Notificación"
        verbose_name_plural = "Plantillas de Notificaciones"
        unique_together = [
            ["notification_type", "channel", "organization", "club", "language"],
            ["notification_type", "channel", "organization", "is_default"],
        ]
        ordering = ["notification_type__name", "channel__name"]

    def __str__(self):
        return f"{self.name} - {self.notification_type.name} ({self.channel.name})"

    def render(self, context):
        """
        Render template with provided context variables.
        """
        from django.template import Context, Template

        subject = (
            Template(self.subject_template).render(Context(context))
            if self.subject_template
            else ""
        )
        body = Template(self.body_template).render(Context(context))

        return {"subject": subject, "body": body}


class UserNotificationPreference(BaseModel):
    """
    User preferences for notification types and channels.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notification_preferences"
    )
    notification_type = models.ForeignKey(NotificationType, on_delete=models.CASCADE)

    # Channel preferences
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    whatsapp_enabled = models.BooleanField(default=True)
    push_web_enabled = models.BooleanField(default=True)
    push_mobile_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)

    # Timing preferences
    quiet_hours_start = models.TimeField(
        null=True, blank=True, help_text="Start of quiet hours (no notifications)"
    )
    quiet_hours_end = models.TimeField(
        null=True, blank=True, help_text="End of quiet hours"
    )

    # Frequency control
    digest_enabled = models.BooleanField(
        default=False, help_text="Receive digest instead of individual notifications"
    )
    digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ("hourly", "Cada hora"),
            ("daily", "Diario"),
            ("weekly", "Semanal"),
        ],
        default="daily",
    )

    class Meta:
        verbose_name = "Preferencia de Notificación"
        verbose_name_plural = "Preferencias de Notificaciones"
        unique_together = ["user", "notification_type"]
        indexes = [
            models.Index(fields=["user", "notification_type"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.notification_type.name}"

    def is_channel_enabled(self, channel_slug):
        """Check if a specific channel is enabled for this preference."""
        channel_map = {
            "email": self.email_enabled,
            "sms": self.sms_enabled,
            "whatsapp": self.whatsapp_enabled,
            "push_web": self.push_web_enabled,
            "push_mobile": self.push_mobile_enabled,
            "in_app": self.in_app_enabled,
        }
        return channel_map.get(channel_slug, False)


class NotificationBatch(MultiTenantModel):
    """
    Batch notifications for mass sending.
    """

    BATCH_TYPES = [
        ("manual", "Manual"),
        ("scheduled", "Programado"),
        ("triggered", "Disparado por evento"),
    ]

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("scheduled", "Programado"),
        ("processing", "Procesando"),
        ("completed", "Completado"),
        ("failed", "Fallido"),
        ("cancelled", "Cancelado"),
    ]

    name = models.CharField(max_length=200)
    notification_type = models.ForeignKey(
        NotificationType, on_delete=models.CASCADE, related_name="batches"
    )

    # Batch configuration
    batch_type = models.CharField(max_length=20, choices=BATCH_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Recipients
    recipients = models.ManyToManyField(
        User, blank=True, help_text="Specific users to notify"
    )
    recipient_filters = models.JSONField(
        default=dict, help_text="Filters to select recipients dynamically"
    )

    # Message content
    subject = models.CharField(max_length=500, blank=True)
    message = models.TextField()
    template = models.ForeignKey(
        NotificationTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )
    template_context = models.JSONField(
        default=dict, help_text="Context variables for template rendering"
    )

    # Channels
    channels = models.ManyToManyField(
        NotificationChannel, help_text="Channels to use for this batch"
    )

    # Scheduling
    scheduled_at = models.DateTimeField(
        null=True, blank=True, help_text="When to send this batch"
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Statistics
    total_recipients = models.IntegerField(default=0)
    total_sent = models.IntegerField(default=0)
    total_delivered = models.IntegerField(default=0)
    total_failed = models.IntegerField(default=0)

    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_batches",
    )
    error_log = models.TextField(blank=True)

    class Meta:
        verbose_name = "Lote de Notificaciones"
        verbose_name_plural = "Lotes de Notificaciones"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.get_status_display()}"


class Notification(MultiTenantModel):
    """
    Individual notification instances.
    """

    PRIORITY_CHOICES = [
        ("low", "Baja"),
        ("normal", "Normal"),
        ("high", "Alta"),
        ("urgent", "Urgente"),
    ]

    # Basic info
    notification_type = models.ForeignKey(
        NotificationType, on_delete=models.CASCADE, related_name="notifications"
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )

    # Content
    title = models.CharField(max_length=255)
    message = models.TextField()

    # Metadata
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="normal"
    )
    category = models.CharField(max_length=100, blank=True)

    # Links and actions
    action_url = models.URLField(blank=True)
    action_label = models.CharField(max_length=100, blank=True)
    deep_link = models.CharField(
        max_length=500, blank=True, help_text="Deep link for mobile apps"
    )

    # Data payload
    data = models.JSONField(
        default=dict, help_text="Additional data for the notification"
    )

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Batch relationship
    batch = models.ForeignKey(
        NotificationBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    # Template used
    template = models.ForeignKey(
        NotificationTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
            models.Index(fields=["notification_type", "created_at"]),
            models.Index(fields=["priority", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.recipient}"

    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at", "updated_at"])


class NotificationDelivery(BaseModel):
    """
    Track delivery status for each notification and channel.
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("sent", "Enviado"),
        ("delivered", "Entregado"),
        ("failed", "Fallido"),
        ("bounced", "Rebotado"),
        ("read", "Leído"),
        ("clicked", "Clickeado"),
    ]

    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name="deliveries"
    )
    channel = models.ForeignKey(
        NotificationChannel, on_delete=models.CASCADE, related_name="deliveries"
    )

    # Delivery details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)

    # Provider response
    provider_id = models.CharField(
        max_length=255, blank=True, help_text="Provider's message/delivery ID"
    )
    provider_response = models.JSONField(
        default=dict, help_text="Full provider response"
    )

    # Timestamps
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)

    # Next retry
    next_retry_at = models.DateTimeField(null=True, blank=True)

    # Error details
    error_code = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "Entrega de Notificación"
        verbose_name_plural = "Entregas de Notificaciones"
        unique_together = ["notification", "channel"]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "next_retry_at"]),
            models.Index(fields=["channel", "status"]),
            models.Index(fields=["provider_id"]),
        ]

    def __str__(self):
        return f"{self.notification.title} - {self.channel.name} ({self.get_status_display()})"

    def can_retry(self):
        """Check if delivery can be retried."""
        return (
            self.status in ["pending", "failed"]
            and self.attempt_count < self.max_attempts
            and (self.next_retry_at is None or self.next_retry_at <= timezone.now())
        )

    def mark_as_sent(self, provider_id=None, provider_response=None):
        """Mark delivery as sent."""
        self.status = "sent"
        self.sent_at = timezone.now()
        self.attempt_count += 1

        if provider_id:
            self.provider_id = provider_id
        if provider_response:
            self.provider_response = provider_response

        self.save()

    def mark_as_delivered(self, provider_response=None):
        """Mark delivery as delivered."""
        self.status = "delivered"
        self.delivered_at = timezone.now()

        if provider_response:
            self.provider_response.update(provider_response)

        self.save()

    def mark_as_failed(self, error_code=None, error_message=None, schedule_retry=True):
        """Mark delivery as failed and optionally schedule retry."""
        self.status = "failed"
        self.failed_at = timezone.now()
        self.attempt_count += 1

        if error_code:
            self.error_code = error_code
        if error_message:
            self.error_message = error_message

        # Schedule retry if possible
        if schedule_retry and self.attempt_count < self.max_attempts:
            from datetime import timedelta

            delay_minutes = 5 * (2 ** (self.attempt_count - 1))  # Exponential backoff
            self.next_retry_at = timezone.now() + timedelta(minutes=delay_minutes)
            self.status = "pending"  # Reset to pending for retry

        self.save()

    def mark_as_read(self):
        """Mark delivery as read."""
        if self.status == "delivered":
            self.status = "read"
            self.read_at = timezone.now()
            self.save()

    def mark_as_clicked(self):
        """Mark delivery as clicked."""
        if self.status in ["delivered", "read"]:
            self.status = "clicked"
            self.clicked_at = timezone.now()
            self.save()


class NotificationEvent(BaseModel):
    """
    Log of notification events for analytics and debugging.
    """

    EVENT_TYPES = [
        ("created", "Notificación creada"),
        ("sent", "Enviado"),
        ("delivered", "Entregado"),
        ("failed", "Fallido"),
        ("bounced", "Rebotado"),
        ("read", "Leído"),
        ("clicked", "Clickeado"),
        ("unsubscribed", "Desuscrito"),
    ]

    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name="events"
    )
    delivery = models.ForeignKey(
        NotificationDelivery,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="events",
    )

    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    event_data = models.JSONField(default=dict)

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        verbose_name = "Evento de Notificación"
        verbose_name_plural = "Eventos de Notificaciones"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["notification", "event_type", "created_at"]),
            models.Index(fields=["event_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.notification.title} - {self.get_event_type_display()}"
