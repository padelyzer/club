"""
Signal handlers for notifications integration.
"""

from django.contrib.auth import get_user_model
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    Notification,
    NotificationDelivery,
    NotificationType,
    UserNotificationPreference,
)
from .tasks import send_notification_delivery

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_notification_preferences(sender, instance, created, **kwargs):
    """
    Create default notification preferences for new users.
    """
    if created:
        try:
            # Get all active notification types
            notification_types = NotificationType.objects.filter(is_active=True)

            for notification_type in notification_types:
                # Create preference with default settings
                UserNotificationPreference.objects.get_or_create(
                    user=instance,
                    notification_type=notification_type,
                    defaults={
                        "email_enabled": notification_type.default_enabled,
                        "sms_enabled": notification_type.default_enabled,
                        "whatsapp_enabled": notification_type.default_enabled,
                        "push_web_enabled": notification_type.default_enabled,
                        "push_mobile_enabled": notification_type.default_enabled,
                        "in_app_enabled": True,  # Always enable in-app notifications
                    },
                )
        except Exception as e:
            # Log error but don't fail user creation
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to create notification preferences for user {instance.id}: {e}")
            pass


@receiver(post_save, sender=NotificationType)
def create_preferences_for_existing_users(sender, instance, created, **kwargs):
    """
    Create preferences for existing users when a new notification type is created.
    """
    if created:
        # Get all active users
        users = User.objects.filter(is_active=True)

        preferences_to_create = []
        for user in users:
            if not UserNotificationPreference.objects.filter(
                user=user, notification_type=instance
            ).exists():
                preferences_to_create.append(
                    UserNotificationPreference(
                        user=user,
                        notification_type=instance,
                        email_enabled=instance.default_enabled,
                        sms_enabled=instance.default_enabled,
                        whatsapp_enabled=instance.default_enabled,
                        push_web_enabled=instance.default_enabled,
                        push_mobile_enabled=instance.default_enabled,
                        in_app_enabled=True,
                    )
                )

        # Bulk create preferences
        if preferences_to_create:
            UserNotificationPreference.objects.bulk_create(preferences_to_create)


@receiver(post_save, sender=NotificationDelivery)
def schedule_notification_delivery(sender, instance, created, **kwargs):
    """
    Automatically schedule delivery when a NotificationDelivery is created.
    """
    if created and instance.status == "pending":
        # Schedule the delivery task
        send_notification_delivery.apply_async(args=[instance.id])


# Integration signals for other apps
def create_notification_for_event(
    notification_type_slug, recipient, title, message, **kwargs
):
    """
    Helper function to create notifications from other apps.
    """
    try:
        notification_type = NotificationType.objects.get(
            slug=notification_type_slug, is_active=True
        )

        # Create notification
        notification = Notification.objects.create(
            notification_type=notification_type,
            recipient=recipient,
            title=title,
            message=message,
            **kwargs,
        )

        # Get user's preferred channels for this notification type
        try:
            preference = UserNotificationPreference.objects.get(
                user=recipient, notification_type=notification_type
            )

            # Create deliveries for enabled channels
            from .models import NotificationChannel

            channels = NotificationChannel.objects.filter(is_enabled=True)

            for channel in channels:
                if preference.is_channel_enabled(channel.slug):
                    NotificationDelivery.objects.create(
                        notification=notification, channel=channel
                    )

        except UserNotificationPreference.DoesNotExist:
            # Use default channels if no preference exists
            from .models import NotificationChannel

            default_channels = NotificationChannel.objects.filter(
                is_enabled=True, slug__in=notification_type.available_channels
            )

            for channel in default_channels:
                NotificationDelivery.objects.create(
                    notification=notification, channel=channel
                )

        return notification

    except NotificationType.DoesNotExist:
        # Log error or handle gracefully
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(f"Notification type '{notification_type_slug}' not found")
        return None


# Example integration signals for other apps
# These would be connected in the respective apps


def on_reservation_confirmed(sender, instance, **kwargs):
    """Signal handler for when a reservation is confirmed."""
    create_notification_for_event(
        notification_type_slug="reservation_confirmed",
        recipient=instance.client.user,
        title="Reserva confirmada",
        message=f"Tu reserva para {instance.date} a las {instance.time} ha sido confirmada.",
        organization=instance.club.organization,
        club=instance.club,
        data={
            "reservation_id": str(instance.id),
            "court": instance.court.name if hasattr(instance, "court") else "",
            "date": instance.date.isoformat() if hasattr(instance, "date") else "",
            "time": instance.time.isoformat() if hasattr(instance, "time") else "",
        },
    )


def on_payment_received(sender, instance, **kwargs):
    """Signal handler for when a payment is received."""
    create_notification_for_event(
        notification_type_slug="payment_received",
        recipient=instance.user,
        title="Pago recibido",
        message=f"Hemos recibido tu pago de ${instance.amount} por {instance.description}.",
        organization=(
            instance.organization if hasattr(instance, "organization") else None
        ),
        club=instance.club if hasattr(instance, "club") else None,
        data={
            "payment_id": str(instance.id),
            "amount": str(instance.amount),
            "description": instance.description,
            "reference": instance.reference if hasattr(instance, "reference") else "",
        },
    )


def on_class_scheduled(sender, instance, **kwargs):
    """Signal handler for when a class is scheduled."""
    # Notify all enrolled students
    if hasattr(instance, "students") and instance.students.exists():
        for student in instance.students.all():
            create_notification_for_event(
                notification_type_slug="class_scheduled",
                recipient=student.user,
                title="Nueva clase programada",
                message=f'Se ha programado la clase "{instance.name}" para {instance.date} a las {instance.time}.',
                organization=(
                    instance.club.organization if hasattr(instance, "club") else None
                ),
                club=instance.club if hasattr(instance, "club") else None,
                data={
                    "class_id": str(instance.id),
                    "class_name": instance.name,
                    "instructor": (
                        instance.instructor.get_full_name()
                        if hasattr(instance, "instructor")
                        else ""
                    ),
                    "date": (
                        instance.date.isoformat() if hasattr(instance, "date") else ""
                    ),
                    "time": (
                        instance.time.isoformat() if hasattr(instance, "time") else ""
                    ),
                },
            )


def on_user_welcome(sender, instance, **kwargs):
    """Signal handler for when a user joins a club."""
    create_notification_for_event(
        notification_type_slug="user_welcome",
        recipient=instance.user,
        title=f"¡Bienvenido a {instance.club.name}!",
        message=f"Te damos la bienvenida a nuestra comunidad de pádel. ¡Esperamos verte pronto en las canchas!",
        organization=instance.club.organization,
        club=instance.club,
        data={
            "membership_id": str(instance.id),
            "role": instance.role,
            "club_name": instance.club.name,
        },
    )


# You can connect these signals in the respective apps like this:
# from django.db.models.signals import post_save
# from apps.reservations.models import Reservation
# post_save.connect(on_reservation_confirmed, sender=Reservation)
