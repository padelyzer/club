#!/usr/bin/env python3
"""
Script de acceso rápido para pruebas - BYPASS LOGIN
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from apps.clubs.models import Club
from apps.root.models import Organization

User = get_user_model()

def create_quick_access_data():
    """Crear datos de acceso rápido para pruebas"""
    
    # 1. Crear/obtener usuario de prueba
    test_email = "test@padelyzer.com"
    test_password = "test123456"
    
    try:
        user = User.objects.get(email=test_email)
        print(f"✅ Usuario existente: {test_email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=test_email,
            password=test_password,
            first_name="Test",
            last_name="User",
            is_active=True
        )
        print(f"✅ Usuario creado: {test_email}")
    
    # 2. Generar tokens JWT
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    print("\n🔑 TOKENS DE ACCESO:")
    print("=" * 80)
    print(f"Access Token:\n{access_token}")
    print("=" * 80)
    print(f"Refresh Token:\n{refresh_token}")
    print("=" * 80)
    
    # 3. Verificar organizaciones y clubes
    print("\n🏢 ORGANIZACIONES:")
    for org in Organization.objects.all():
        print(f"  - {org.trade_name} (ID: {org.id})")
        clubs = Club.objects.filter(organization=org)
        if clubs.exists():
            print(f"    Clubes: {', '.join([c.name for c in clubs])}")
    
    # 4. Verificar clubes del usuario
    user_clubs = user.get_clubs()
    print(f"\n🎾 CLUBES DEL USUARIO:")
    if user_clubs:
        for club in user_clubs:
            print(f"  - {club.name} (slug: {club.slug})")
    else:
        print("  ❌ Sin clubes asignados")
        # Asignar al primer club disponible
        first_club = Club.objects.first()
        if first_club:
            from apps.clubs.models import ClubStaff
            ClubStaff.objects.create(
                club=first_club,
                user=user,
                role='admin'
            )
            print(f"  ✅ Asignado a: {first_club.name}")
    
    # 5. Crear script de curl para pruebas
    print("\n📋 SCRIPTS DE PRUEBA:")
    print("=" * 80)
    
    # Login script
    print("# Login:")
    print(f"""curl -X POST http://localhost:8000/api/auth/login/ \\
  -H "Content-Type: application/json" \\
  -d '{{"email": "{test_email}", "password": "{test_password}"}}'
""")
    
    # Prueba con token
    print("\n# Prueba con token (profile):")
    print(f"""curl -X GET http://localhost:8000/api/auth/profile/ \\
  -H "Authorization: Bearer {access_token}"
""")
    
    # Listar clubes
    print("\n# Listar clubes:")
    print(f"""curl -X GET http://localhost:8000/api/clubs/ \\
  -H "Authorization: Bearer {access_token}"
""")
    
    # Dashboard
    print("\n# Dashboard data:")
    print(f"""curl -X GET http://localhost:8000/api/dashboard/overview/ \\
  -H "Authorization: Bearer {access_token}"
""")
    
    print("\n=" * 80)
    print("\n🚀 ACCESO DIRECTO AL FRONTEND:")
    print(f"http://localhost:3000/api/direct-login?token={access_token}")
    
    # 6. Guardar credenciales en archivo
    with open('test_credentials.txt', 'w') as f:
        f.write(f"Email: {test_email}\n")
        f.write(f"Password: {test_password}\n")
        f.write(f"Access Token: {access_token}\n")
        f.write(f"Refresh Token: {refresh_token}\n")
        f.write(f"Direct Login URL: http://localhost:3000/api/direct-login?token={access_token}\n")
    
    print("\n✅ Credenciales guardadas en: test_credentials.txt")

if __name__ == "__main__":
    create_quick_access_data()