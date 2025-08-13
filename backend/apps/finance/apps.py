"""
Finance app configuration.
"""

from django.apps import AppConfig


class FinanceConfig(AppConfig):
    """Finance app config."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finance'
    
    def ready(self):
        """Import signals when app is ready."""
        try:
            from . import signals  # noqa
        except ImportError:
            pass
