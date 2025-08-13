"""
Client signals for automatic profile creation.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from apps.clients.models import ClientProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create ClientProfile when a new User is created.
    """
    if created and not hasattr(instance, '_profile_created'):
        # Check if profile already exists (avoid duplicates)
        if not hasattr(instance, 'client_profile'):
            try:
                # Get default organization and club
                from apps.root.models import Organization
                from apps.clubs.models import Club
                
                # Try user's current org/club first, then fall back to defaults
                org = getattr(instance, 'current_organization', None)
                club = getattr(instance, 'current_club', None)
                
                if not org:
                    # Use default organization
                    org = Organization.objects.filter(rfc='DEFAULT123456').first()
                    
                if not club and org:
                    # Use default club from the organization
                    club = Club.objects.filter(organization=org).first()
                
                # Only create profile if we have an organization
                if org:
                    ClientProfile.objects.create(
                        user=instance,
                        organization=org,
                        club=club,
                        dominant_hand='right',
                        preferred_position='right',
                        is_active=True
                    )
                    # Mark to avoid recursion
                    instance._profile_created = True
                else:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"No organization found for user {instance.id}, profile not created")
                    
            except Exception as e:
                # Log the error but don't fail user creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create client profile for user {instance.id}: {e}")


@receiver(post_save, sender=User)
def update_user_profile(sender, instance, created, **kwargs):
    """
    Update ClientProfile when User is updated.
    """
    if not created and hasattr(instance, 'client_profile'):
        # The profile is already connected to the user
        # Most updates come through the profile itself, not the user
        pass