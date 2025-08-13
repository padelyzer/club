"""
Services for client module operations.
"""

from django.db import transaction
from django.core.exceptions import ValidationError
from apps.clients.models import ClientProfile
from apps.authentication.models import User
import logging

logger = logging.getLogger(__name__)


class ClientService:
    """Service for client operations with business logic."""
    
    @staticmethod
    @transaction.atomic
    def create_client(client_data, organization, created_by=None):
        """
        Create a new client with all validations.
        
        Args:
            client_data: Dict with client information
            organization: Organization instance
            created_by: User who creates the client
            
        Returns:
            ClientProfile instance
        """
        # Extract user data
        user_data = {
            'email': client_data.pop('email'),
            'first_name': client_data.pop('first_name', ''),
            'last_name': client_data.pop('last_name', ''),
            'phone': client_data.pop('phone', ''),
        }
        
        # Check if user already exists
        user = User.objects.filter(email=user_data['email']).first()
        
        if user:
            # Check if already has profile in this organization
            if ClientProfile.objects.filter(user=user, organization=organization).exists():
                raise ValidationError(f"Cliente con email {user.email} ya existe en esta organización")
        else:
            # Create new user
            user = User.objects.create(
                email=user_data['email'],
                username=user_data['email'],  # Use email as username
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                is_active=True,
                current_organization_id=organization.id
            )
            
            # Set random password (user will reset on first login)
            user.set_unusable_password()
            user.save()
        
        # Create client profile
        profile = ClientProfile.objects.create(
            user=user,
            organization=organization,
            **client_data
        )
        
        logger.info(f"Created client {user.email} for organization {organization.id}")
        
        return profile
    
    @staticmethod
    def create_guest_client(guest_data, organization):
        """
        Create a guest client without user account.
        For one-time reservations.
        """
        # For guests, we store data differently
        # This is a simplified version - in production you'd want a GuestClient model
        
        # Create a placeholder user with unusable password
        email = guest_data.get('email', f"guest_{uuid.uuid4().hex[:8]}@guest.local")
        
        user = User.objects.create(
            email=email,
            username=email,
            first_name=guest_data.get('first_name', 'Guest'),
            last_name=guest_data.get('last_name', 'User'),
            is_active=False,  # Inactive for guests
            current_organization_id=organization.id
        )
        user.set_unusable_password()
        user.save()
        
        # Create minimal profile
        profile = ClientProfile.objects.create(
            user=user,
            organization=organization,
            club=guest_data.get('club'),
            is_guest=True  # You'd need to add this field
        )
        
        return profile
    
    @staticmethod
    @transaction.atomic
    def merge_duplicate_clients(primary_client, duplicate_clients):
        """
        Merge duplicate client profiles into one.
        Moves all related data to primary client.
        """
        from apps.reservations.models import Reservation
        
        for duplicate in duplicate_clients:
            if duplicate.id == primary_client.id:
                continue
                
            # Move reservations
            Reservation.objects.filter(client_profile=duplicate).update(
                client_profile=primary_client
            )
            
            # Move other related data (payments, stats, etc.)
            # ... add more as needed
            
            # Delete duplicate profile
            duplicate.delete()
            
        logger.info(f"Merged {len(duplicate_clients)} duplicate profiles into {primary_client.id}")
        
        return primary_client
    
    @staticmethod
    def migrate_client_between_clubs(client, from_club, to_club):
        """
        Migrate client from one club to another within same organization.
        """
        if from_club.organization_id != to_club.organization_id:
            raise ValidationError("No se puede migrar clientes entre diferentes organizaciones")
        
        # Update client's club
        client.club = to_club
        client.save()
        
        # Log the migration
        logger.info(f"Migrated client {client.id} from club {from_club.id} to {to_club.id}")
        
        return client


import uuid  # Add at top of file
