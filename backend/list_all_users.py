#!/usr/bin/env python
import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model

from apps.clients.models import ClientProfile
from apps.clubs.models import Club

User = get_user_model()

print("=== TODOS LOS USUARIOS EN EL SISTEMA ===\n")

all_users = User.objects.all().order_by("-is_superuser", "-is_staff", "email")

for user in all_users:
    print(f"Email: {user.email}")
    print(f"  Nombre: {user.first_name} {user.last_name}".strip())
    print(f"  Superusuario: {'Sí' if user.is_superuser else 'No'}")
    print(f"  Staff: {'Sí' if user.is_staff else 'No'}")
    print(f"  Activo: {'Sí' if user.is_active else 'No'}")

    # Check for client profiles
    profiles = ClientProfile.objects.filter(user=user).select_related("club")
    if profiles:
        for profile in profiles:
            if profile.club:
                print(f"  Club asignado: {profile.club.name} ({profile.club.slug})")

    print("-" * 50)

print(f"\nTotal de usuarios: {all_users.count()}")

# Also show clubs
print("\n=== CLUBES DISPONIBLES ===\n")
clubs = Club.objects.all()
for club in clubs:
    print(
        f"- {club.name} (slug: {club.slug}, activo: {'Sí' if club.is_active else 'No'})"
    )
