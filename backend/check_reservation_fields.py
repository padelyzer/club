#!/usr/bin/env python
"""
Check Reservation model fields.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.reservations.models import Reservation

print("RESERVATION MODEL FIELDS:")
print("=" * 50)

# Get all fields
fields = Reservation._meta.get_fields()

# Print field names and types
for field in fields:
    field_type = type(field).__name__
    print(f"{field.name:30} {field_type}")
    
# Check for user-related fields
print("\nUSER-RELATED FIELDS:")
user_fields = [f for f in fields if 'user' in f.name.lower() or 'player' in f.name.lower()]
for field in user_fields:
    print(f"  - {field.name}: {type(field).__name__}")