from django.apps import AppConfig


class ClubsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clubs"
    verbose_name = "Clubs"
    
    def ready(self):
        import apps.clubs.signals
