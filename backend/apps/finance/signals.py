"""
Revenue signals for automatic revenue tracking.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.finance.models import Payment, Revenue
from apps.reservations.models import Reservation


@receiver(post_save, sender=Payment)
def create_revenue_on_payment_completion(sender, instance, created, **kwargs):
    """
    Create revenue record when payment is completed.
    """
    if instance.status == 'completed' and not hasattr(instance, '_revenue_created'):
        # Check if revenue already exists
        if not instance.revenue_records.exists():
            Revenue.objects.create(
                organization=instance.organization,
                club=instance.club,
                date=instance.processed_at.date() if instance.processed_at else timezone.now().date(),
                concept=instance.payment_type,
                description=instance.description or f"Payment {instance.reference_number}",
                amount=instance.net_amount,
                payment_method=instance.payment_method,
                payment=instance,
                reference=instance.reference_number
            )
            # Mark to avoid recursion
            instance._revenue_created = True


@receiver(post_save, sender=Reservation)
def update_reservation_on_payment(sender, instance, created, **kwargs):
    """
    Update reservation status when payment is completed.
    """
    if not created and instance.payment_status == 'paid':
        # Check if we need to update status
        if instance.status == 'pending':
            instance.status = 'confirmed'
            instance.save(update_fields=['status'])
