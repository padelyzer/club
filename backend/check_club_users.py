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


def check_club_users():
    print("=== USUARIOS CON CLUBES ASIGNADOS ===\n")

    # Get all clubs
    clubs = Club.objects.all()
    print(f"Total de clubes: {clubs.count()}\n")

    for club in clubs:
        print(f"\n📍 Club: {club.name}")
        print(f"   Slug: {club.slug}")
        try:
            org_name = (
                club.organization.name
                if hasattr(club.organization, "name")
                else str(club.organization)
            )
        except:
            org_name = "Sin organización"
        print(f"   Organización: {org_name}")
        print(f"   Activo: {'Sí' if club.is_active else 'No'}")

        # Get users associated with this club through client profiles
        clients = ClientProfile.objects.filter(club=club).select_related("user")

        if clients.exists():
            print("\n   Usuarios del club:")
            for client in clients:
                if client.user:
                    user = client.user
                    print(f"   - {user.email}")
                    print(f"     Nombre: {user.first_name} {user.last_name}")
                    print(f"     Es staff: {'Sí' if user.is_staff else 'No'}")
                    print(f"     Activo: {'Sí' if user.is_active else 'No'}")
                    print()
        else:
            print("   Sin usuarios asignados")

    # Check for users in organizations (potential club owners)
    print("\n=== USUARIOS POR ORGANIZACIÓN ===")
    from apps.organizations.models import Organization

    orgs = Organization.objects.all()

    for org in orgs:
        print(f"\nOrganización: {org.name}")

        # Check if organization has an owner field
        if hasattr(org, "owner"):
            print(
                f"  Propietario: {org.owner.email if org.owner else 'Sin propietario'}"
            )

        # Get clubs in this organization
        org_clubs = Club.objects.filter(organization=org)
        if org_clubs.exists():
            print(f"  Clubes: {', '.join([c.name for c in org_clubs])}")

    # Show all users and their clubs
    print("\n=== TODOS LOS USUARIOS Y SUS CLUBES ===")
    all_users = User.objects.all()

    for user in all_users:
        print(f"\n- {user.email}")
        print(f"  Es superusuario: {'Sí' if user.is_superuser else 'No'}")
        print(f"  Es staff: {'Sí' if user.is_staff else 'No'}")

        # Check if user has client profiles
        client_profiles = ClientProfile.objects.filter(user=user).select_related("club")
        if client_profiles.exists():
            for client in client_profiles:
                if client.club:
                    print(f"  Club: {client.club.name} ({client.club.slug})")
        else:
            print("  Sin club asignado")


if __name__ == "__main__":
    check_club_users()
