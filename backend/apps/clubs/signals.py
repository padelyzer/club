"""
Signals for the clubs app to maintain data consistency.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Court


@receiver(post_save, sender=Court)
def update_club_court_count_on_save(sender, instance, created, **kwargs):
    """
    Update club's total_courts count when a court is saved.
    This ensures the count stays in sync when courts are created or updated.
    """
    if instance.club_id:  # Ensure the court has a club
        club = instance.club
        club.total_courts = club.courts.filter(is_active=True).count()
        club.save(update_fields=["total_courts"])


@receiver(post_delete, sender=Court)
def update_club_court_count_on_delete(sender, instance, **kwargs):
    """
    Update club's total_courts count when a court is deleted.
    This ensures the count stays in sync when courts are removed.
    """
    if instance.club_id:  # Ensure the court had a club
        club = instance.club
        club.total_courts = club.courts.filter(is_active=True).count()
        club.save(update_fields=["total_courts"])