"""
Celery tasks for notifications.
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from celery import shared_task

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
from .services import NotificationServiceFactory, send_notification_via_channel

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_notification_delivery(self, delivery_id: int):
    """
    Send a single notification delivery.
    """
    try:
        delivery = NotificationDelivery.objects.select_related(
            "notification", "channel"
        ).get(id=delivery_id)

        if not delivery.can_retry():
            logger.warning(f"Delivery {delivery_id} cannot be retried")
            return {"success": False, "reason": "cannot_retry"}

        notification = delivery.notification
        channel = delivery.channel

        # Get recipient information based on channel
        recipient = _get_recipient_for_channel(notification.recipient, channel)
        if not recipient:
            delivery.mark_as_failed(
                error_code="NO_RECIPIENT",
                error_message=f"No {channel.channel_type} address for user",
                schedule_retry=False,
            )
            return {"success": False, "reason": "no_recipient"}

        # Prepare message content
        content = _prepare_notification_content(notification, channel)

        # Send via service
        result = send_notification_via_channel(
            channel.channel_type,
            recipient,
            content["subject"],
            content["body"],
            **content.get("extra", {}),
        )

        # Update delivery status
        if result["success"]:
            delivery.mark_as_sent(
                provider_id=result["provider_id"],
                provider_response=result.get("provider_response"),
            )

            # Create event
            NotificationEvent.objects.create(
                notification=notification,
                delivery=delivery,
                event_type="sent",
                event_data=result,
            )

            # Schedule status check for channels that support it
            if channel.channel_type in ["email", "sms", "whatsapp"]:
                check_delivery_status.apply_async(
                    args=[delivery.id], countdown=60  # Check after 1 minute
                )

        else:
            delivery.mark_as_failed(
                error_code=result.get("error_code", "SEND_FAILED"),
                error_message=result.get("error", "Unknown error"),
                schedule_retry=True,
            )

            # Create event
            NotificationEvent.objects.create(
                notification=notification,
                delivery=delivery,
                event_type="failed",
                event_data=result,
            )

        return result

    except NotificationDelivery.DoesNotExist:
        logger.error(f"Delivery {delivery_id} not found")
        return {"success": False, "reason": "not_found"}

    except Exception as exc:
        logger.error(f"Error sending delivery {delivery_id}: {str(exc)}")

        # Retry the task
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2**self.request.retries))

        # Mark as failed after max retries
        try:
            delivery = NotificationDelivery.objects.get(id=delivery_id)
            delivery.mark_as_failed(
                error_code="TASK_FAILED", error_message=str(exc), schedule_retry=False
            )
        except:
            pass

        return {"success": False, "reason": "task_failed", "error": str(exc)}


@shared_task
def check_delivery_status(delivery_id: int):
    """
    Check delivery status from provider.
    """
    try:
        delivery = NotificationDelivery.objects.select_related("channel").get(
            id=delivery_id
        )

        if not delivery.provider_id or delivery.status not in ["sent"]:
            return {"success": False, "reason": "not_applicable"}

        # Get service and check status
        service = NotificationServiceFactory.get_service(delivery.channel.channel_type)
        status_result = service.get_delivery_status(delivery.provider_id)

        # Update delivery based on status
        old_status = delivery.status
        new_status = status_result.get("status")

        if new_status and new_status != old_status:
            if new_status == "delivered":
                delivery.mark_as_delivered(status_result.get("provider_response"))
            elif new_status in ["failed", "bounced"]:
                delivery.mark_as_failed(
                    error_code="PROVIDER_FAILED",
                    error_message=f"Provider reported: {new_status}",
                    schedule_retry=False,
                )

            # Create event for status change
            NotificationEvent.objects.create(
                notification=delivery.notification,
                delivery=delivery,
                event_type=new_status,
                event_data=status_result,
            )

        return {"success": True, "old_status": old_status, "new_status": new_status}

    except NotificationDelivery.DoesNotExist:
        logger.error(f"Delivery {delivery_id} not found for status check")
        return {"success": False, "reason": "not_found"}

    except Exception as exc:
        logger.error(f"Error checking delivery status {delivery_id}: {str(exc)}")
        return {"success": False, "reason": "error", "error": str(exc)}


@shared_task
def process_notification_batch(batch_id: int):
    """
    Process a notification batch - create individual notifications.
    """
    try:
        batch = (
            NotificationBatch.objects.select_related("notification_type", "template")
            .prefetch_related("channels", "recipients")
            .get(id=batch_id)
        )

        if batch.status != "scheduled":
            logger.warning(f"Batch {batch_id} is not in scheduled status")
            return {"success": False, "reason": "invalid_status"}

        # Update batch status
        batch.status = "processing"
        batch.started_at = timezone.now()
        batch.save()

        # Get recipients
        recipients = _get_batch_recipients(batch)
        batch.total_recipients = len(recipients)
        batch.save()

        if not recipients:
            batch.status = "completed"
            batch.completed_at = timezone.now()
            batch.save()
            return {"success": True, "recipients": 0, "notifications": 0}

        # Create notifications for each recipient
        notifications_created = 0

        with transaction.atomic():
            for recipient in recipients:
                # Check user preferences
                if not _should_send_to_user(
                    recipient, batch.notification_type, batch.channels.all()
                ):
                    continue

                # Prepare notification content
                content = _prepare_batch_content(batch, recipient)

                # Create notification
                notification = Notification.objects.create(
                    notification_type=batch.notification_type,
                    recipient=recipient,
                    title=content["subject"],
                    message=content["body"],
                    organization=batch.organization,
                    club=batch.club,
                    batch=batch,
                    template=batch.template,
                    data=content.get("data", {}),
                )

                # Create deliveries for each channel
                for channel in batch.channels.all():
                    if _user_accepts_channel(
                        recipient, batch.notification_type, channel
                    ):
                        NotificationDelivery.objects.create(
                            notification=notification, channel=channel
                        )

                notifications_created += 1

                # Create event
                NotificationEvent.objects.create(
                    notification=notification,
                    event_type="created",
                    event_data={"batch_id": batch_id},
                )

        # Schedule delivery of all notifications
        deliveries = NotificationDelivery.objects.filter(
            notification__batch=batch, status="pending"
        )

        for delivery in deliveries:
            send_notification_delivery.apply_async(args=[delivery.id])

        # Update batch
        batch.total_sent = notifications_created
        batch.save()

        return {
            "success": True,
            "recipients": len(recipients),
            "notifications": notifications_created,
            "deliveries": deliveries.count(),
        }

    except NotificationBatch.DoesNotExist:
        logger.error(f"Batch {batch_id} not found")
        return {"success": False, "reason": "not_found"}

    except Exception as exc:
        logger.error(f"Error processing batch {batch_id}: {str(exc)}")

        # Mark batch as failed
        try:
            batch = NotificationBatch.objects.get(id=batch_id)
            batch.status = "failed"
            batch.error_log = str(exc)
            batch.completed_at = timezone.now()
            batch.save()
        except:
            pass

        return {"success": False, "reason": "error", "error": str(exc)}


@shared_task
def retry_failed_deliveries():
    """
    Retry failed deliveries that are eligible for retry.
    """
    now = timezone.now()

    # Get deliveries that can be retried
    failed_deliveries = NotificationDelivery.objects.filter(
        status="pending",
        next_retry_at__lte=now,
        attempt_count__lt=models.F("max_attempts"),
    )

    retry_count = 0
    for delivery in failed_deliveries:
        if delivery.can_retry():
            send_notification_delivery.apply_async(args=[delivery.id])
            retry_count += 1

    return {"retries_scheduled": retry_count}


@shared_task
def cleanup_old_notifications():
    """
    Cleanup old notifications and events.
    """
    # Delete notifications older than 90 days
    cutoff_date = timezone.now() - timedelta(days=90)

    old_notifications = Notification.objects.filter(
        created_at__lt=cutoff_date, is_read=True
    )

    deleted_count = old_notifications.count()
    old_notifications.delete()

    # Delete old events (keep for 30 days)
    events_cutoff = timezone.now() - timedelta(days=30)
    old_events = NotificationEvent.objects.filter(created_at__lt=events_cutoff)

    events_deleted = old_events.count()
    old_events.delete()

    return {"notifications_deleted": deleted_count, "events_deleted": events_deleted}


@shared_task
def send_digest_notifications():
    """
    Send digest notifications for users who have enabled them.
    """
    from django.db.models import Q

    # Get users with digest preferences
    digest_preferences = UserNotificationPreference.objects.filter(
        digest_enabled=True, is_active=True
    ).select_related("user", "notification_type")

    digests_sent = 0

    for preference in digest_preferences:
        # Get unread notifications for this user and type
        notifications = Notification.objects.filter(
            recipient=preference.user,
            notification_type=preference.notification_type,
            is_read=False,
            created_at__gte=_get_digest_period_start(preference.digest_frequency),
        ).order_by("-created_at")

        if notifications.exists():
            # Create digest notification
            digest_content = _create_digest_content(notifications, preference)

            # Send via preferred channels
            channels = _get_user_preferred_channels(
                preference.user, preference.notification_type
            )

            for channel in channels:
                result = send_notification_via_channel(
                    channel.channel_type,
                    _get_recipient_for_channel(preference.user, channel),
                    digest_content["subject"],
                    digest_content["body"],
                )

                if result["success"]:
                    digests_sent += 1

    return {"digests_sent": digests_sent}


# Helper functions
def _get_recipient_for_channel(user, channel):
    """Get recipient address for specific channel."""
    channel_map = {
        "email": user.email,
        "sms": user.phone if hasattr(user, "phone") else None,
        "whatsapp": user.phone if hasattr(user, "phone") else None,
        "push_web": None,  # Handled differently
        "push_mobile": None,  # Handled differently
        "in_app": str(user.id),
    }
    return channel_map.get(channel.channel_type)


def _prepare_notification_content(notification, channel):
    """Prepare notification content for specific channel."""
    content = {
        "subject": notification.title,
        "body": notification.message,
        "extra": notification.data or {},
    }

    # Use template if available
    if notification.template:
        context = {
            "user": notification.recipient,
            "notification": notification,
            "club": notification.club,
            "organization": notification.organization,
            **notification.data,
        }
        rendered = notification.template.render(context)
        content["subject"] = rendered["subject"] or content["subject"]
        content["body"] = rendered["body"] or content["body"]

    return content


def _prepare_batch_content(batch, recipient):
    """Prepare content for batch notification."""
    context = {
        "user": recipient,
        "batch": batch,
        "club": batch.club,
        "organization": batch.organization,
        **batch.template_context,
    }

    if batch.template:
        rendered = batch.template.render(context)
        return {
            "subject": rendered["subject"] or batch.subject,
            "body": rendered["body"] or batch.message,
            "data": context,
        }
    else:
        return {"subject": batch.subject, "body": batch.message, "data": context}


def _get_batch_recipients(batch):
    """Get recipients for a batch notification."""
    if batch.recipients.exists():
        return list(batch.recipients.all())

    # Apply filters to get recipients dynamically
    filters = batch.recipient_filters
    queryset = User.objects.filter(is_active=True)

    # Apply organization/club filters
    if batch.organization:
        queryset = queryset.filter(
            organization_memberships__organization=batch.organization
        )

    if batch.club:
        queryset = queryset.filter(club=batch.club)

    # Apply custom filters
    if filters.get("roles"):
        # Note: roles filtering not available in current model structure
        pass

    if filters.get("verified_email"):
        queryset = queryset.filter(email_verified=True)

    return list(queryset.distinct())


def _should_send_to_user(user, notification_type, channels):
    """Check if notification should be sent to user."""
    try:
        preference = UserNotificationPreference.objects.get(
            user=user, notification_type=notification_type
        )

        # Check if any channel is enabled
        return any(preference.is_channel_enabled(channel.slug) for channel in channels)

    except UserNotificationPreference.DoesNotExist:
        # Use default preference
        return notification_type.default_enabled


def _user_accepts_channel(user, notification_type, channel):
    """Check if user accepts notifications via specific channel."""
    try:
        preference = UserNotificationPreference.objects.get(
            user=user, notification_type=notification_type
        )
        return preference.is_channel_enabled(channel.slug)

    except UserNotificationPreference.DoesNotExist:
        return notification_type.default_enabled


def _get_digest_period_start(frequency):
    """Get start time for digest period."""
    now = timezone.now()

    if frequency == "hourly":
        return now - timedelta(hours=1)
    elif frequency == "daily":
        return now - timedelta(days=1)
    elif frequency == "weekly":
        return now - timedelta(weeks=1)
    else:
        return now - timedelta(days=1)


def _create_digest_content(notifications, preference):
    """Create digest content from notifications."""
    count = notifications.count()
    subject = f"Tienes {count} notificaciones nuevas"

    body_parts = [f"Resumen de tus últimas {count} notificaciones:\n"]

    for notification in notifications:
        body_parts.append(f"• {notification.title}")
        if notification.action_url:
            body_parts.append(f"  Ver más: {notification.action_url}")
        body_parts.append("")

    return {"subject": subject, "body": "\n".join(body_parts)}


def _get_user_preferred_channels(user, notification_type):
    """Get user's preferred channels for notification type."""
    try:
        preference = UserNotificationPreference.objects.get(
            user=user, notification_type=notification_type
        )

        enabled_channels = []
        for channel in NotificationChannel.objects.filter(is_enabled=True):
            if preference.is_channel_enabled(channel.slug):
                enabled_channels.append(channel)

        return enabled_channels

    except UserNotificationPreference.DoesNotExist:
        # Return default channels
        return NotificationChannel.objects.filter(
            is_enabled=True, slug__in=notification_type.available_channels
        )
