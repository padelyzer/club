"""
Auto-organization assignment for new users.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

User = get_user_model()


@receiver(post_save, sender=User)
def auto_assign_default_organization(sender, instance, created, **kwargs):
    """
    Automatically assign new users to a default organization if configured.
    This is useful for single-tenant deployments or demos.
    """
    if not created:
        return

    # Skip if user already has an organization set
    if instance.current_organization_id:
        return

    # Check if auto-assignment is enabled
    if not getattr(settings, "AUTO_ASSIGN_DEFAULT_ORG", False):
        return

    # Get default organization ID from settings
    default_org_id = getattr(settings, "DEFAULT_ORGANIZATION_ID", None)
    if not default_org_id:
        logger.debug(
            f"AUTO_ASSIGN_DEFAULT_ORG is True but DEFAULT_ORGANIZATION_ID is not set"
        )
        return

    try:
        from apps.authentication.models import OrganizationMembership
        from apps.root.models import Organization

        # Get the default organization
        default_org = Organization.objects.get(id=default_org_id, is_active=True)

        # Create membership for the user
        membership, created = OrganizationMembership.objects.get_or_create(
            user=instance,
            organization=default_org,
            defaults={
                "role": "billing",  # Default role for auto-assigned users
                "permissions": {
                    "can_view_organization": True,
                    "can_manage_billing": True,
                    "can_access_clubs": True,
                },
            },
        )

        if created:
            # Set the current organization for the user
            instance.current_organization_id = default_org.id
            instance.save(update_fields=["current_organization_id"])

            logger.info(
                f"Auto-assigned user {instance.email} to organization {default_org.trade_name}"
            )

    except Organization.DoesNotExist:
        logger.error(f"Default organization with ID {default_org_id} not found")
    except Exception as e:
        logger.error(
            f"Error auto-assigning organization to user {instance.email}: {str(e)}"
        )


@receiver(post_save, sender=User)
def create_user_profiles(sender, instance, created, **kwargs):
    """
    Create related profiles for new users.
    """
    if not created:
        return

    try:
        # Import here to avoid circular imports
        from apps.clients.models import ClientProfile, PlayerPreferences, PlayerStats

        # Only create client profile if user has an organization
        if instance.current_organization_id:
            # Create ClientProfile
            client_profile, _ = ClientProfile.objects.get_or_create(
                user=instance,
                defaults={
                    "organization_id": instance.current_organization_id,
                    
                },
            )

            # Create PlayerStats
            PlayerStats.objects.get_or_create(
                player=client_profile,
                defaults={
                    "organization_id": instance.current_organization_id,
                },
            )

            # Create PlayerPreferences
            PlayerPreferences.objects.get_or_create(
                player=client_profile,
                defaults={
                    "organization_id": instance.current_organization_id,
                },
            )

            logger.info(f"Created profiles for user {instance.email}")

    except Exception as e:
        logger.error(f"Error creating profiles for user {instance.email}: {str(e)}")
