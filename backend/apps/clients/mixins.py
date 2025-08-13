"""
Mixins for clients module.
"""

from django.core.exceptions import ValidationError

from rest_framework.exceptions import PermissionDenied


class MultiTenantViewMixin:
    """Mixin to handle multi-tenant filtering in views."""

    def get_queryset(self):
        """Filter queryset by user's organization and club."""
        queryset = super().get_queryset()

        if not self.request.user.is_authenticated:
            return queryset.none()

        # Use the manager's for_user method
        if hasattr(queryset, "for_user"):
            return queryset.for_user(self.request.user)

        return queryset

    def perform_create(self, serializer):
        """Set organization and club on creation."""
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Authentication required.")

        if not hasattr(self.request.user, "organization"):
            raise ValidationError("User must belong to an organization.")

        # Set organization and club from current user
        validated_data = {
            "organization": self.request.user.organization,
        }

        # Check if user has a club relationship (through membership or direct)
        club = None
        if hasattr(self.request.user, "clubs") and self.request.user.clubs.exists():
            club = self.request.user.clubs.first()
        elif hasattr(self.request.user, "memberships") and self.request.user.memberships.exists():
            club = self.request.user.memberships.first().club

        if club:
            validated_data["club"] = club

        serializer.save(**validated_data)


class ClientSafetyMixin:
    """
    Safety mixin for client operations with validation and permission checks.
    """
    
    def get_client_safe(self, client_id, user=None):
        """
        Safely get client with permission validation.
        """
        try:
            from .models import ClientProfile
            
            if user and hasattr(user, 'organization'):
                # Filter by user's organization for multi-tenant safety
                client = ClientProfile.objects.filter(
                    id=client_id,
                    organization=user.organization
                ).first()
                
                if not client:
                    import logging
                    logger = logging.getLogger('clients.safety')
                    logger.warning(f"Client {client_id} not found or not accessible by user {user.id}")
                    return None
                    
                return client
            else:
                # Fallback without user context
                client = ClientProfile.objects.filter(id=client_id).first()
                if not client:
                    import logging
                    logger = logging.getLogger('clients.safety')
                    logger.warning(f"Client {client_id} not found")
                
                return client
                
        except Exception as e:
            import logging
            logger = logging.getLogger('clients.safety')
            logger.error(f"Error getting client {client_id}: {e}")
            return None
    
    def create_client_with_validation(self, client_data, user):
        """
        Create client with comprehensive validation.
        """
        from .models import ClientProfile
        import logging
        
        logger = logging.getLogger('clients.safety')
        
        try:
            # Validate data first
            validator = ClientDataValidator()
            validation_result = validator.validate_client_data(client_data)
            
            if not validation_result['is_valid']:
                logger.warning(f"Client validation failed: {validation_result['errors']}")
                raise ValidationError(validation_result['errors'])
            
            # Set organization and club context
            if hasattr(user, 'organization'):
                client_data['organization'] = user.organization
            
            # Check if user has club context
            club = None
            if hasattr(user, 'clubs') and user.clubs.exists():
                club = user.clubs.first()
            elif hasattr(user, 'memberships') and user.memberships.exists():
                club = user.memberships.first().club
            
            if club:
                client_data['club'] = club
            
            # Create client
            client = ClientProfile.objects.create(**client_data)
            logger.info(f"Client created successfully: {client.id}")
            
            return client, True
            
        except ValidationError as e:
            logger.error(f"Validation error creating client: {e}")
            return None, False
        except Exception as e:
            logger.error(f"Unexpected error creating client: {e}")
            return None, False


class ClientDataValidator:
    """
    Comprehensive data validator for client information.
    """
    
    def validate_client_data(self, data):
        """
        Validate all client data fields.
        """
        errors = {}
        is_valid = True
        
        # Validate email
        email_validation = self.validate_email(data.get('email'))
        if not email_validation['is_valid']:
            errors['email'] = email_validation['error']
            is_valid = False
        
        # Validate phone
        phone_validation = self.validate_phone(data.get('phone'))
        if not phone_validation['is_valid']:
            errors['phone'] = phone_validation['error']
            is_valid = False
        
        # Validate birth date
        birth_date_validation = self.validate_birth_date(data.get('birth_date'))
        if not birth_date_validation['is_valid']:
            errors['birth_date'] = birth_date_validation['error']
            is_valid = False
        
        return {
            'is_valid': is_valid,
            'errors': errors
        }
    
    def validate_email(self, email):
        """Validate email format and uniqueness."""
        import re
        from .models import ClientProfile
        
        if not email:
            return {'is_valid': False, 'error': 'Email is required'}
        
        # Basic email format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return {'is_valid': False, 'error': 'Invalid email format'}
        
        # Check uniqueness
        if ClientProfile.objects.filter(email=email).exists():
            return {'is_valid': False, 'error': 'Email already exists'}
        
        return {'is_valid': True, 'error': None}
    
    def validate_phone(self, phone):
        """Validate phone number format."""
        import re
        
        if not phone:
            return {'is_valid': True, 'error': None}  # Phone is optional
        
        # Basic phone validation (adjust pattern as needed)
        phone_pattern = r'^\+?[\d\s\-\(\)]+$'
        if not re.match(phone_pattern, phone):
            return {'is_valid': False, 'error': 'Invalid phone format'}
        
        return {'is_valid': True, 'error': None}
    
    def validate_birth_date(self, birth_date):
        """Validate birth date is reasonable."""
        if not birth_date:
            return {'is_valid': True, 'error': None}  # Birth date is optional
        
        from datetime import date, timedelta
        
        try:
            # Check if date is not in the future
            if birth_date > date.today():
                return {'is_valid': False, 'error': 'Birth date cannot be in the future'}
            
            # Check if date is not too far in the past (e.g., 120 years)
            min_date = date.today() - timedelta(days=120*365)
            if birth_date < min_date:
                return {'is_valid': False, 'error': 'Birth date seems unrealistic'}
            
            return {'is_valid': True, 'error': None}
            
        except (TypeError, ValueError):
            return {'is_valid': False, 'error': 'Invalid birth date format'}


class ClientPrivacyMixin:
    """
    Mixin for protecting client personal data (GDPR compliance).
    """
    
    def anonymize_client(self, client):
        """
        Anonymize client data for GDPR compliance.
        """
        import logging
        from django.utils import timezone
        
        logger = logging.getLogger('clients.privacy')
        
        try:
            # Store original data for audit
            original_data = {
                'email': client.email,
                'first_name': client.first_name,
                'last_name': client.last_name,
                'phone': client.phone
            }
            
            # Anonymize sensitive fields
            client.email = f"anonymized_{client.id}@example.com"
            client.first_name = "Anonymized"
            client.last_name = "User"
            client.phone = None
            client.notes = "User data anonymized for GDPR compliance"
            
            # Mark as anonymized
            if hasattr(client, 'is_anonymized'):
                client.is_anonymized = True
            if hasattr(client, 'anonymized_at'):
                client.anonymized_at = timezone.now()
            
            client.save()
            
            # Log the anonymization
            logger.info(f"Client {client.id} anonymized successfully")
            
            # Create audit log
            self._create_privacy_audit_log(client.id, 'anonymized', original_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Error anonymizing client {client.id}: {e}")
            return False
    
    def export_client_data(self, client):
        """
        Export all client data for GDPR data portability.
        """
        import logging
        from django.utils import timezone
        
        logger = logging.getLogger('clients.privacy')
        
        try:
            # Collect all client data
            client_data = {
                'personal_info': {
                    'id': client.id,
                    'email': client.email,
                    'first_name': client.first_name,
                    'last_name': client.last_name,
                    'phone': client.phone,
                    'birth_date': client.birth_date.isoformat() if client.birth_date else None,
                    'created_at': client.created_at.isoformat(),
                    'updated_at': client.updated_at.isoformat()
                },
                'preferences': {},
                'activity_history': [],
                'export_metadata': {
                    'exported_at': timezone.now().isoformat(),
                    'export_reason': 'GDPR data portability request'
                }
            }
            
            # Add preferences if available
            if hasattr(client, 'preferences'):
                client_data['preferences'] = client.preferences
            
            # Add reservations if available
            if hasattr(client, 'reservations'):
                reservations = []
                for reservation in client.reservations.all()[:100]:  # Limit to last 100
                    reservations.append({
                        'id': reservation.id,
                        'date': reservation.date.isoformat(),
                        'start_time': reservation.start_time.isoformat(),
                        'end_time': reservation.end_time.isoformat(),
                        'status': reservation.status,
                        'created_at': reservation.created_at.isoformat()
                    })
                client_data['activity_history'] = reservations
            
            # Log the export
            logger.info(f"Client data exported for client {client.id}")
            
            # Create audit log
            self._create_privacy_audit_log(client.id, 'data_exported', {'records_count': len(client_data['activity_history'])})
            
            return client_data
            
        except Exception as e:
            logger.error(f"Error exporting client data for {client.id}: {e}")
            return None
    
    def _create_privacy_audit_log(self, client_id, action, details):
        """
        Create audit log for privacy-related actions.
        """
        try:
            from django.utils import timezone
            import logging
            
            logger = logging.getLogger('clients.privacy.audit')
            
            audit_data = {
                'timestamp': timezone.now().isoformat(),
                'client_id': client_id,
                'action': action,
                'details': details
            }
            
            logger.info(f"PRIVACY_AUDIT: {audit_data}")
            
            # In production, save to dedicated audit table
            
        except Exception as e:
            import logging
            logger = logging.getLogger('clients.privacy')
            logger.error(f"Error creating privacy audit log: {e}")
