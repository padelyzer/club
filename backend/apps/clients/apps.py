from django.apps import AppConfig


class ClientsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clients"
    verbose_name = "Clients"
    
    def ready(self):
        """Import signals when Django starts."""
        import apps.clients.signals
