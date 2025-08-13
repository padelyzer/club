from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    verbose_name = "Notifications"

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import apps.notifications.signals
        except ImportError:
            pass
