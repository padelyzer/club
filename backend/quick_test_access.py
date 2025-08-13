#!/usr/bin/env python3
"""
Script simplificado de acceso rápido para pruebas
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

# Credenciales de prueba
test_email = "test@padelyzer.com"
test_password = "test123456"

# Obtener o crear usuario
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

# Generar tokens
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

print("\n🔑 TOKEN DE ACCESO:")
print("=" * 80)
print(access_token)
print("=" * 80)

# Verificar clubes disponibles
clubs = Club.objects.all()
if clubs.exists():
    print(f"\n🏢 Clubes disponibles: {clubs.count()}")
    for club in clubs[:5]:  # Mostrar primeros 5
        print(f"  - {club.name} (org: {club.organization.trade_name})")
else:
    print("\n❌ No hay clubes disponibles")

# URLs de acceso directo
print("\n🚀 ACCESO DIRECTO:")
print(f"\n1. Frontend: http://localhost:3000/api/direct-login?token={access_token}")
print(f"\n2. Login normal:")
print(f"   Email: {test_email}")
print(f"   Password: {test_password}")

print("\n📋 COMANDOS DE PRUEBA:")
print(f"""
# Login:
curl -X POST http://localhost:8000/api/auth/login/ \\
  -H "Content-Type: application/json" \\
  -d '{{"email": "{test_email}", "password": "{test_password}"}}'

# Profile:
curl -X GET http://localhost:8000/api/auth/profile/ \\
  -H "Authorization: Bearer {access_token}"

# Clubs:
curl -X GET http://localhost:8000/api/clubs/ \\
  -H "Authorization: Bearer {access_token}"
""")

# Guardar credenciales
with open('test_access.txt', 'w') as f:
    f.write(f"Email: {test_email}\n")
    f.write(f"Password: {test_password}\n")
    f.write(f"Access Token: {access_token}\n")
    f.write(f"Direct Login: http://localhost:3000/api/direct-login?token={access_token}\n")

print("\n✅ Credenciales guardadas en: test_access.txt")