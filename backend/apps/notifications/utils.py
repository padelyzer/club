"""
Utility functions for notifications module.
"""

import json
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model
from django.template import Context, Template
from django.utils import timezone

from .models import (
    Notification,
    NotificationBatch,
    NotificationChannel,
    NotificationDelivery,
    NotificationTemplate,
    NotificationType,
    UserNotificationPreference,
)
from .services import NotificationServiceFactory

User = get_user_model()


def send_immediate_notification(
    notification_type_slug: str,
    recipient: User,
    title: str,
    message: str,
    channels: Optional[List[str]] = None,
    **kwargs,
) -> Notification:
    """
    Send an immediate notification to a user.

    Args:
        notification_type_slug: Slug of the notification type
        recipient: User to send notification to
        title: Notification title
        message: Notification message
        channels: List of channel slugs to use (optional)
        **kwargs: Additional notification data

    Returns:
        Created Notification instance
    """
    try:
        notification_type = NotificationType.objects.get(
            slug=notification_type_slug, is_active=True
        )
    except NotificationType.DoesNotExist:
        raise ValueError(f"Notification type '{notification_type_slug}' not found")

    # Create notification
    notification = Notification.objects.create(
        notification_type=notification_type,
        recipient=recipient,
        title=title,
        message=message,
        **kwargs,
    )

    # Determine channels to use
    if channels:
        channel_objects = NotificationChannel.objects.filter(
            slug__in=channels, is_enabled=True
        )
    else:
        # Use user preferences or defaults
        channel_objects = get_user_preferred_channels(recipient, notification_type)

    # Create and send deliveries
    for channel in channel_objects:
        delivery = NotificationDelivery.objects.create(
            notification=notification, channel=channel
        )
        # Delivery will be automatically scheduled by signal

    return notification


def send_batch_notification(
    notification_type_slug: str,
    recipients: List[User],
    title: str,
    message: str,
    channels: Optional[List[str]] = None,
    schedule_at: Optional[timezone.datetime] = None,
    **kwargs,
) -> NotificationBatch:
    """
    Send a batch notification to multiple users.

    Args:
        notification_type_slug: Slug of the notification type
        recipients: List of users to send notification to
        title: Notification title
        message: Notification message
        channels: List of channel slugs to use (optional)
        schedule_at: When to send the batch (optional, immediate if None)
        **kwargs: Additional batch data

    Returns:
        Created NotificationBatch instance
    """
    try:
        notification_type = NotificationType.objects.get(
            slug=notification_type_slug, is_active=True
        )
    except NotificationType.DoesNotExist:
        raise ValueError(f"Notification type '{notification_type_slug}' not found")

    # Determine channels to use
    if channels:
        channel_objects = NotificationChannel.objects.filter(
            slug__in=channels, is_enabled=True
        )
    else:
        channel_objects = NotificationChannel.objects.filter(
            is_enabled=True, slug__in=notification_type.available_channels
        )

    # Create batch
    batch = NotificationBatch.objects.create(
        name=f"Batch: {title}",
        notification_type=notification_type,
        batch_type="manual",
        subject=title,
        message=message,
        scheduled_at=schedule_at,
        **kwargs,
    )

    # Add recipients and channels
    batch.recipients.set(recipients)
    batch.channels.set(channel_objects)

    # Schedule or process immediately
    if schedule_at and schedule_at > timezone.now():
        batch.status = "scheduled"
        batch.save()
        from .tasks import process_notification_batch

        process_notification_batch.apply_async(args=[batch.id], eta=schedule_at)
    else:
        batch.status = "scheduled"
        batch.save()
        from .tasks import process_notification_batch

        process_notification_batch.apply_async(args=[batch.id])

    return batch


def get_user_preferred_channels(
    user: User, notification_type: NotificationType
) -> List[NotificationChannel]:
    """
    Get user's preferred channels for a notification type.

    Args:
        user: User instance
        notification_type: NotificationType instance

    Returns:
        List of preferred NotificationChannel instances
    """
    try:
        preference = UserNotificationPreference.objects.get(
            user=user, notification_type=notification_type, is_active=True
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


def get_notification_stats(user: User) -> Dict[str, Any]:
    """
    Get notification statistics for a user.

    Args:
        user: User instance

    Returns:
        Dictionary with notification statistics
    """
    notifications = Notification.objects.filter(recipient=user, is_active=True)

    stats = {
        "total": notifications.count(),
        "unread": notifications.filter(is_read=False).count(),
        "by_type": {},
        "by_priority": {},
        "recent": notifications.order_by("-created_at")[:5],
    }

    # Group by type
    type_counts = (
        notifications.values("notification_type__name")
        .annotate(count=models.Count("id"))
        .order_by("-count")
    )

    for item in type_counts:
        stats["by_type"][item["notification_type__name"]] = item["count"]

    # Group by priority
    priority_counts = (
        notifications.values("priority")
        .annotate(count=models.Count("id"))
        .order_by("-count")
    )

    for item in priority_counts:
        stats["by_priority"][item["priority"]] = item["count"]

    return stats


def render_notification_template(
    template: NotificationTemplate, context: Dict[str, Any]
) -> Dict[str, str]:
    """
    Render a notification template with given context.

    Args:
        template: NotificationTemplate instance
        context: Context dictionary for template rendering

    Returns:
        Dictionary with rendered 'subject' and 'body'
    """
    try:
        # Render subject
        subject = ""
        if template.subject_template:
            subject_template = Template(template.subject_template)
            subject = subject_template.render(Context(context))

        # Render body
        body_template = Template(template.body_template)
        body = body_template.render(Context(context))

        return {"subject": subject, "body": body}

    except Exception as e:
        raise ValueError(f"Template rendering error: {str(e)}")


def validate_template_syntax(
    subject_template: str, body_template: str
) -> Dict[str, Any]:
    """
    Validate template syntax.

    Args:
        subject_template: Subject template string
        body_template: Body template string

    Returns:
        Dictionary with validation results
    """
    errors = []
    warnings = []

    try:
        # Test subject template
        if subject_template:
            Template(subject_template)
    except Exception as e:
        errors.append(f"Subject template error: {str(e)}")

    try:
        # Test body template
        Template(body_template)
    except Exception as e:
        errors.append(f"Body template error: {str(e)}")

    # Check for common issues
    if not body_template.strip():
        errors.append("Body template cannot be empty")

    if subject_template and len(subject_template) > 500:
        warnings.append("Subject template is very long (>500 characters)")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


def get_template_variables(template_string: str) -> List[str]:
    """
    Extract variables used in a template string.

    Args:
        template_string: Template string

    Returns:
        List of variable names used in template
    """
    import re

    # Find Django template variables {{ variable }}
    variables = re.findall(r"{{\s*([^}]+)\s*}}", template_string)

    # Clean up variable names
    cleaned_variables = []
    for var in variables:
        # Remove filters and spaces
        var_name = var.split("|")[0].strip()
        if var_name not in cleaned_variables:
            cleaned_variables.append(var_name)

    return cleaned_variables


def test_notification_service(channel_type: str) -> Dict[str, Any]:
    """
    Test if a notification service is properly configured.

    Args:
        channel_type: Type of channel to test

    Returns:
        Dictionary with test results
    """
    try:
        service = NotificationServiceFactory.get_service(channel_type)

        # Basic validation
        test_result = {
            "channel_type": channel_type,
            "service_available": True,
            "configuration_valid": True,
            "errors": [],
        }

        # Test recipient validation
        test_recipients = {
            "email": "test@example.com",
            "sms": "+1234567890",
            "whatsapp": "+1234567890",
            "push_web": "test_token_" + "a" * 140,
            "push_mobile": "test_token_" + "a" * 140,
            "in_app": "12345",
        }

        test_recipient = test_recipients.get(channel_type)
        if test_recipient:
            if not service.validate_recipient(test_recipient):
                test_result["errors"].append("Recipient validation failed")

        return test_result

    except Exception as e:
        return {
            "channel_type": channel_type,
            "service_available": False,
            "configuration_valid": False,
            "errors": [str(e)],
        }


def cleanup_old_notifications(days_old: int = 90) -> Dict[str, int]:
    """
    Clean up old read notifications.

    Args:
        days_old: Number of days old to consider for cleanup

    Returns:
        Dictionary with cleanup statistics
    """
    cutoff_date = timezone.now() - timedelta(days=days_old)

    # Delete old read notifications
    old_notifications = Notification.objects.filter(
        created_at__lt=cutoff_date, is_read=True, is_active=True
    )

    count = old_notifications.count()
    old_notifications.delete()

    return {"notifications_deleted": count, "cutoff_date": cutoff_date.isoformat()}


def export_notification_data(user: User) -> Dict[str, Any]:
    """
    Export user's notification data (for GDPR compliance).

    Args:
        user: User instance

    Returns:
        Dictionary with user's notification data
    """
    notifications = Notification.objects.filter(recipient=user)
    preferences = UserNotificationPreference.objects.filter(user=user)

    export_data = {
        "user_id": str(user.id),
        "export_date": timezone.now().isoformat(),
        "notifications": [],
        "preferences": [],
        "statistics": get_notification_stats(user),
    }

    # Export notifications
    for notification in notifications:
        export_data["notifications"].append(
            {
                "id": str(notification.id),
                "type": notification.notification_type.name,
                "title": notification.title,
                "message": notification.message,
                "priority": notification.priority,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
                "read_at": (
                    notification.read_at.isoformat() if notification.read_at else None
                ),
            }
        )

    # Export preferences
    for preference in preferences:
        export_data["preferences"].append(
            {
                "notification_type": preference.notification_type.name,
                "email_enabled": preference.email_enabled,
                "sms_enabled": preference.sms_enabled,
                "whatsapp_enabled": preference.whatsapp_enabled,
                "push_web_enabled": preference.push_web_enabled,
                "push_mobile_enabled": preference.push_mobile_enabled,
                "in_app_enabled": preference.in_app_enabled,
                "digest_enabled": preference.digest_enabled,
                "digest_frequency": preference.digest_frequency,
            }
        )

    return export_data


# Decorator for easy notification sending
def notify_on_event(
    notification_type_slug: str,
    title_template: str = None,
    message_template: str = None,
):
    """
    Decorator to automatically send notifications when a function is called.

    Usage:
        @notify_on_event('reservation_confirmed', 'Reservation Confirmed', 'Your reservation is confirmed')
        def confirm_reservation(reservation):
            # confirmation logic
            return reservation
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            # Try to extract recipient and context from result or args
            recipient = None
            context = {}

            if hasattr(result, "user"):
                recipient = result.user
                context["object"] = result
            elif hasattr(result, "recipient"):
                recipient = result.recipient
                context["object"] = result

            if recipient and title_template and message_template:
                try:
                    # Render templates with context
                    title = Template(title_template).render(Context(context))
                    message = Template(message_template).render(Context(context))

                    send_immediate_notification(
                        notification_type_slug=notification_type_slug,
                        recipient=recipient,
                        title=title,
                        message=message,
                        data=context,
                    )
                except Exception as e:
                    # Log error but don't break the main function
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send notification: {str(e)}")

            return result

        return wrapper

    return decorator
