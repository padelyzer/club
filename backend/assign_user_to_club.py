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


def assign_user_to_club(email, club_slug):
    """Assign a user to a specific club."""
    try:
        user = User.objects.get(email=email)
        club = Club.objects.get(slug=club_slug)

        # Check if user already has a client profile
        try:
            profile = ClientProfile.objects.get(user=user)
            # Update existing profile
            profile.club = club
            profile.save()
            print(
                f"✅ Actualizado perfil existente de {user.email} al club {club.name}"
            )
        except ClientProfile.DoesNotExist:
            # Create new profile
            profile = ClientProfile.objects.create(
                user=user, club=club, phone="", skill_level="beginner"
            )
            print(f"✅ Creado nuevo perfil para {user.email} en el club {club.name}")

        print(f"   Club: {club.name} ({club.slug})")
        print(f"   Organización: {club.organization}")

        return True

    except User.DoesNotExist:
        print(f"❌ Usuario no encontrado: {email}")
        return False
    except Club.DoesNotExist:
        print(f"❌ Club no encontrado: {club_slug}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("=== ASIGNAR USUARIOS A CLUBES ===\n")

    # Asignar usuario lety al club lety
    assign_user_to_club("letygaez@gmail.com", "lety")

    # También asignar otros usuarios de prueba
    print("\n--- Asignando otros usuarios de prueba ---")
    assign_user_to_club("demo@padelclub.com", "padel-club-demo")
    assign_user_to_club("info@clubdemo.com", "club-demo")

    print("\n=== COMPLETADO ===")
