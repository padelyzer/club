"""
Views for notifications module.
"""

from django.db.models import Case, Count, IntegerField, Q, When
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from core.mixins import MultiTenantMixin
from core.permissions import IsClubMemberOrStaff, IsOwnerOrStaff

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
from .serializers import (
    BulkPreferenceUpdateSerializer,
    MarkNotificationReadSerializer,
    NotificationBatchCreateSerializer,
    NotificationBatchSerializer,
    NotificationChannelPublicSerializer,
    NotificationChannelSerializer,
    NotificationDeliverySerializer,
    NotificationEventSerializer,
    NotificationListSerializer,
    NotificationSerializer,
    NotificationStatsSerializer,
    NotificationTemplateSerializer,
    NotificationTypeSerializer,
    SendNotificationSerializer,
    UserNotificationPreferenceSerializer,
)
from .tasks import process_notification_batch, send_notification_delivery


class NotificationTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification types.
    """

    queryset = NotificationType.objects.filter(is_active=True)
    serializer_class = NotificationTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_system", "default_enabled"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        """
        Instantiate and return the list of permissions for this view.
        """
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated, IsOwnerOrStaff]

        return [permission() for permission in permission_classes]


class NotificationChannelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification channels.
    """

    queryset = NotificationChannel.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel_type", "is_enabled"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "priority", "created_at"]
    ordering = ["priority", "name"]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["list", "retrieve"] and not self.request.user.is_staff:
            return NotificationChannelPublicSerializer
        return NotificationChannelSerializer

    def get_permissions(self):
        """
        Instantiate and return the list of permissions for this view.
        """
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated, IsOwnerOrStaff]

        return [permission() for permission in permission_classes]


class NotificationTemplateViewSet(MultiTenantMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing notification templates.
    """

    queryset = NotificationTemplate.objects.filter(is_active=True)
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated, IsClubMemberOrStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["notification_type", "channel", "language", "is_default"]
    search_fields = ["name", "subject_template", "body_template"]
    ordering_fields = ["name", "created_at"]
    ordering = ["notification_type__name", "channel__name"]

    @action(detail=True, methods=["post"])
    def preview(self, request, pk=None):
        """
        Preview template with sample data.
        """
        template = self.get_object()
        context = request.data.get("context", {})

        # Add default context
        default_context = {
            "user": request.user,
            "club": template.club,
            "organization": template.organization,
        }
        context = {**default_context, **context}

        try:
            rendered = template.render(context)
            return Response(
                {
                    "subject": rendered["subject"],
                    "body": rendered["body"],
                    "variables_used": list(context.keys()),
                }
            )
        except Exception as e:
            return Response(
                {"error": f"Template rendering error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"])
    def variables(self, request):
        """
        Get available template variables.
        """
        variables = {
            "user": ["first_name", "last_name", "email", "phone"],
            "club": ["name", "address", "phone", "email"],
            "organization": ["name", "domain"],
            "notification": ["title", "message", "created_at"],
            "custom": ["Any custom variables passed in context"],
        }
        return Response(variables)


class NotificationViewSet(MultiTenantMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing notifications.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["notification_type", "priority", "is_read", "category"]
    search_fields = ["title", "message"]
    ordering_fields = ["created_at", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter notifications by recipient and tenant."""
        queryset = (
            Notification.objects.filter(recipient=self.request.user, is_active=True)
            .select_related("notification_type", "recipient", "batch", "template")
            .prefetch_related("deliveries")
        )

        # Apply tenant filtering
        return self.filter_by_tenant(queryset)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return NotificationListSerializer
        return NotificationSerializer

    def perform_create(self, serializer):
        """Set recipient to current user and apply tenant info."""
        serializer.save(recipient=self.request.user, **self.get_tenant_kwargs())

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """
        Mark notification as read.
        """
        notification = self.get_object()
        notification.mark_as_read()
        return Response({"status": "marked as read"})

    @action(detail=False, methods=["post"])
    def mark_multiple_read(self, request):
        """
        Mark multiple notifications as read.
        """
        serializer = MarkNotificationReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        notification_ids = serializer.validated_data["notification_ids"]

        # Get user's notifications
        notifications = self.get_queryset().filter(
            id__in=notification_ids, is_read=False
        )

        count = 0
        for notification in notifications:
            notification.mark_as_read()
            count += 1

        return Response({"status": "success", "marked_count": count})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """
        Mark all notifications as read.
        """
        queryset = self.get_queryset().filter(is_read=False)
        count = queryset.count()

        # Update in bulk for efficiency
        queryset.update(is_read=True, read_at=timezone.now())

        return Response({"status": "success", "marked_count": count})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Get notification statistics for current user.
        """
        queryset = self.get_queryset()

        # Basic counts
        total = queryset.count()
        unread = queryset.filter(is_read=False).count()

        # Group by type
        by_type = (
            queryset.values("notification_type__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        notifications_by_type = {
            item["notification_type__name"]: item["count"] for item in by_type
        }

        # Group by priority
        by_priority = (
            queryset.values("priority").annotate(count=Count("id")).order_by("-count")
        )

        notifications_by_priority = {
            item["priority"]: item["count"] for item in by_priority
        }

        # Delivery stats
        delivery_stats = (
            NotificationDelivery.objects.filter(notification__recipient=request.user)
            .values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        delivery_stats_dict = {item["status"]: item["count"] for item in delivery_stats}

        # Recent activity (last 10 notifications)
        recent = queryset[:10]
        recent_serializer = NotificationListSerializer(recent, many=True)

        stats_data = {
            "total_notifications": total,
            "unread_notifications": unread,
            "notifications_by_type": notifications_by_type,
            "notifications_by_priority": notifications_by_priority,
            "delivery_stats": delivery_stats_dict,
            "recent_activity": recent_serializer.data,
        }

        serializer = NotificationStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def send_notification(self, request):
        """
        Send notification to multiple users.
        """
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        notifications_created = []

        # Create notifications for each recipient
        for recipient in data["recipients"]:
            notification = Notification.objects.create(
                notification_type=data["notification_type"],
                recipient=recipient,
                title=data["title"],
                message=data["message"],
                priority=data.get("priority", "normal"),
                category=data.get("category", ""),
                action_url=data.get("action_url", ""),
                action_label=data.get("action_label", ""),
                deep_link=data.get("deep_link", ""),
                data=data.get("data", {}),
                template=data.get("template"),
                **self.get_tenant_kwargs(),
            )

            # Create deliveries for each channel
            for channel in data["channels"]:
                delivery = NotificationDelivery.objects.create(
                    notification=notification, channel=channel
                )

                # Schedule delivery
                send_notification_delivery.apply_async(args=[delivery.id])

            notifications_created.append(notification)

        # Serialize created notifications
        response_serializer = NotificationListSerializer(
            notifications_created, many=True
        )

        return Response(
            {
                "status": "success",
                "notifications_created": len(notifications_created),
                "notifications": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class NotificationBatchViewSet(MultiTenantMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing notification batches.
    """

    queryset = NotificationBatch.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated, IsClubMemberOrStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["notification_type", "batch_type", "status"]
    search_fields = ["name", "subject", "message"]
    ordering_fields = ["name", "created_at", "scheduled_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return NotificationBatchCreateSerializer
        return NotificationBatchSerializer

    def perform_create(self, serializer):
        """Set created_by and apply tenant info."""
        serializer.save(created_by=self.request.user, **self.get_tenant_kwargs())

    @action(detail=True, methods=["post"])
    def schedule(self, request, pk=None):
        """
        Schedule batch for processing.
        """
        batch = self.get_object()

        if batch.status != "draft":
            return Response(
                {"error": "Only draft batches can be scheduled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scheduled_at = request.data.get("scheduled_at")
        if scheduled_at:
            from django.utils.dateparse import parse_datetime

            scheduled_at = parse_datetime(scheduled_at)
            if not scheduled_at or scheduled_at <= timezone.now():
                return Response(
                    {"error": "Scheduled time must be in the future"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            batch.scheduled_at = scheduled_at

        batch.status = "scheduled"
        batch.save()

        # Schedule processing task
        if batch.scheduled_at:
            process_notification_batch.apply_async(
                args=[batch.id], eta=batch.scheduled_at
            )
        else:
            process_notification_batch.apply_async(args=[batch.id])

        return Response({"status": "scheduled"})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """
        Cancel scheduled batch.
        """
        batch = self.get_object()

        if batch.status not in ["draft", "scheduled"]:
            return Response(
                {"error": "Only draft or scheduled batches can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        batch.status = "cancelled"
        batch.save()

        return Response({"status": "cancelled"})

    @action(detail=True, methods=["get"])
    def notifications(self, request, pk=None):
        """
        Get notifications created from this batch.
        """
        batch = self.get_object()
        notifications = batch.notifications.filter(is_active=True)

        # Apply pagination
        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = NotificationListSerializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """
        Get batch statistics.
        """
        batch = self.get_object()

        # Delivery statistics
        deliveries = NotificationDelivery.objects.filter(notification__batch=batch)

        delivery_stats = (
            deliveries.values("status").annotate(count=Count("id")).order_by("-count")
        )

        delivery_stats_dict = {item["status"]: item["count"] for item in delivery_stats}

        # Channel statistics
        channel_stats = (
            deliveries.values("channel__name", "channel__channel_type")
            .annotate(
                count=Count("id"),
                delivered=Count(
                    Case(When(status="delivered", then=1), output_field=IntegerField())
                ),
                failed=Count(
                    Case(When(status="failed", then=1), output_field=IntegerField())
                ),
            )
            .order_by("-count")
        )

        return Response(
            {
                "batch_id": batch.id,
                "total_recipients": batch.total_recipients,
                "total_sent": batch.total_sent,
                "total_delivered": batch.total_delivered,
                "total_failed": batch.total_failed,
                "delivery_stats": delivery_stats_dict,
                "channel_stats": list(channel_stats),
                "completion_rate": (
                    (batch.total_delivered / batch.total_sent * 100)
                    if batch.total_sent > 0
                    else 0
                ),
            }
        )


class UserNotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notification preferences.
    """

    serializer_class = UserNotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["notification_type", "digest_enabled"]
    search_fields = ["notification_type__name"]
    ordering_fields = ["notification_type__name", "created_at"]
    ordering = ["notification_type__name"]

    def get_queryset(self):
        """Filter preferences by current user."""
        return UserNotificationPreference.objects.filter(
            user=self.request.user, is_active=True
        ).select_related("notification_type")

    def perform_create(self, serializer):
        """Set user to current user."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def bulk_update(self, request):
        """
        Bulk update preferences for multiple notification types.
        """
        serializer = BulkPreferenceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        notification_types = data.pop("notification_types")

        updated_count = 0

        for notification_type in notification_types:
            preference, created = UserNotificationPreference.objects.get_or_create(
                user=request.user, notification_type=notification_type, defaults=data
            )

            if not created:
                # Update existing preference
                for key, value in data.items():
                    setattr(preference, key, value)
                preference.save()

            updated_count += 1

        return Response({"status": "success", "updated_count": updated_count})

    @action(detail=False, methods=["post"])
    def reset_defaults(self, request):
        """
        Reset all preferences to default values.
        """
        # Delete user's custom preferences to use defaults
        deleted_count = self.get_queryset().count()
        self.get_queryset().delete()

        return Response({"status": "reset to defaults", "deleted_count": deleted_count})


class NotificationDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing notification deliveries (read-only).
    """

    serializer_class = NotificationDeliverySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "status",
        "channel__channel_type",
        "notification__notification_type",
    ]
    search_fields = ["notification__title", "channel__name"]
    ordering_fields = ["created_at", "sent_at", "delivered_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter deliveries by current user's notifications."""
        return (
            NotificationDelivery.objects.filter(
                notification__recipient=self.request.user, is_active=True
            )
            .select_related("notification", "channel")
            .prefetch_related("events")
        )

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        """
        Retry failed delivery.
        """
        delivery = self.get_object()

        if not delivery.can_retry():
            return Response(
                {"error": "Delivery cannot be retried"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Schedule retry
        send_notification_delivery.apply_async(args=[delivery.id])

        return Response({"status": "retry scheduled"})


class NotificationEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing notification events (read-only).
    """

    serializer_class = NotificationEventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["event_type", "notification__notification_type"]
    search_fields = ["notification__title"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter events by current user's notifications."""
        return NotificationEvent.objects.filter(
            notification__recipient=self.request.user
        ).select_related("notification", "delivery")


# Webhook views for external providers
class NotificationWebhookView(viewsets.ViewSet):
    """
    ViewSet for handling notification webhooks from external providers.
    
    SECURITY NOTE: While these endpoints don't require user authentication,
    they implement webhook signature verification for security.
    """

    permission_classes = []  # No user authentication for webhooks, but signature verification is implemented

    @action(detail=False, methods=["post"], url_path="resend")
    def resend_webhook(self, request):
        """
        Handle Resend email webhooks.
        """
        # Verify webhook signature if configured
        # Process webhook data and update delivery status

        event_type = request.data.get("type")
        message_id = request.data.get("data", {}).get("email_id")

        if not message_id:
            return Response({"error": "Invalid webhook data"}, status=400)

        try:
            delivery = NotificationDelivery.objects.get(provider_id=message_id)

            if event_type == "email.delivered":
                delivery.mark_as_delivered()
            elif event_type == "email.bounced":
                delivery.mark_as_failed(
                    error_code="BOUNCED",
                    error_message="Email bounced",
                    schedule_retry=False,
                )
            # Add more event types as needed

            return Response({"status": "processed"})

        except NotificationDelivery.DoesNotExist:
            return Response({"error": "Delivery not found"}, status=404)

    @action(detail=False, methods=["post"], url_path="twilio")
    def twilio_webhook(self, request):
        """
        Handle Twilio SMS/WhatsApp webhooks.
        """
        message_sid = request.data.get("MessageSid")
        message_status = request.data.get("MessageStatus")

        if not message_sid:
            return Response({"error": "Invalid webhook data"}, status=400)

        try:
            delivery = NotificationDelivery.objects.get(provider_id=message_sid)

            if message_status == "delivered":
                delivery.mark_as_delivered()
            elif message_status in ["failed", "undelivered"]:
                delivery.mark_as_failed(
                    error_code="PROVIDER_FAILED",
                    error_message=f"Status: {message_status}",
                    schedule_retry=False,
                )

            return Response({"status": "processed"})

        except NotificationDelivery.DoesNotExist:
            return Response({"error": "Delivery not found"}, status=404)
