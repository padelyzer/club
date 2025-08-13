from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.authentication"
    label = "authentication"  # This is what Django uses for model references
    verbose_name = "Authentication"

    def ready(self):
        """Import signals when app is ready."""
        import apps.authentication.signals
        import apps.authentication.signals_auto_org
