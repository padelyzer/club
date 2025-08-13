"""
Django management command for data integrity checks.
"""

from apps.shared.data_integrity import IntegrityCheckCommand

class Command(IntegrityCheckCommand):
    """Data integrity check command."""
    pass
