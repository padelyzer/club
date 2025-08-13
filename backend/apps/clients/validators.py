"""
Validators for client module.
"""

import re
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator


# Mexican phone validator
mexican_phone_regex = RegexValidator(
    regex=r'^\+?52\s?\d{2,3}\s?\d{4}\s?\d{4}$',
    message='Ingrese un número de teléfono válido. Ejemplo: +52 55 1234 5678'
)

# RFC validator
rfc_regex = RegexValidator(
    regex=r'^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$',
    message='RFC inválido. Formato: XXXX######XXX'
)

# CURP validator  
curp_regex = RegexValidator(
    regex=r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$',
    message='CURP inválido. Formato: XXXX######HXXXXX##'
)


def validate_email_unique_in_organization(email, organization, exclude_user=None):
    """Validate email is unique within organization."""
    from apps.clients.models import ClientProfile
    
    existing = ClientProfile.objects.filter(
        user__email=email,
        organization=organization
    )
    
    if exclude_user:
        existing = existing.exclude(user=exclude_user)
    
    if existing.exists():
        raise ValidationError(
            f'Ya existe un cliente con el email {email} en esta organización.'
        )


def validate_no_duplicate_by_name_phone(first_name, last_name, phone, organization, exclude_user=None):
    """Prevent duplicate clients by name+phone combination."""
    from apps.clients.models import ClientProfile
    from django.db.models import Q
    
    if not phone:
        return  # Can't check without phone
    
    # Normalize phone for comparison
    normalized_phone = re.sub(r'[^0-9+]', '', phone)
    
    existing = ClientProfile.objects.filter(
        Q(user__first_name__iexact=first_name) &
        Q(user__last_name__iexact=last_name),
        organization=organization
    )
    
    if exclude_user:
        existing = existing.exclude(user=exclude_user)
    
    # Check if any have similar phone
    for profile in existing:
        if profile.user and hasattr(profile.user, 'phone'):
            existing_phone = re.sub(r'[^0-9+]', '', profile.user.phone or '')
            if existing_phone == normalized_phone:
                raise ValidationError(
                    f'Ya existe un cliente llamado {first_name} {last_name} con ese teléfono.'
                )
