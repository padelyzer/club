#!/usr/bin/env python3
"""
Script para vincular usuarios a clubes.
El problema es que los usuarios necesitan estar vinculados a un club para poder acceder.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.clubs.models import Club
from apps.root.models import Organization
from apps.authentication.models import OrganizationMembership

User = get_user_model()

def link_user_to_club():
    print("🔍 Analizando estructura de usuarios y clubes...")
    
    # 1. Obtener el usuario test@padelyzer.com
    try:
        user = User.objects.get(email="test@padelyzer.com")
        print(f"✅ Usuario encontrado: {user.email}")
        print(f"   - ID: {user.id}")
        print(f"   - Username: {user.username}")
        print(f"   - Es staff: {user.is_staff}")
        print(f"   - Es superusuario: {user.is_superuser}")
    except User.DoesNotExist:
        print("❌ Usuario test@padelyzer.com no encontrado")
        return
    
    # 2. Ver organizaciones del usuario
    print("\n📊 Organizaciones del usuario:")
    org_memberships = user.organization_memberships.all()
    for membership in org_memberships:
        print(f"   - Organización: {membership.organization.trade_name}")
        print(f"     Role: {membership.role}")
        print(f"     ID: {membership.organization.id}")
    
    # 3. Ver clubes disponibles
    print("\n🏢 Clubes disponibles:")
    clubs = Club.objects.filter(is_active=True)
    for club in clubs[:5]:  # Mostrar primeros 5
        print(f"   - {club.name} (Org: {club.organization.trade_name})")
        print(f"     ID: {club.id}")
    
    # 4. Seleccionar el primer club activo
    if clubs.exists():
        selected_club = clubs.first()
        print(f"\n🎯 Club seleccionado: {selected_club.name}")
        
        # 5. Verificar si necesitamos actualizar algo
        # En Padelyzer, los usuarios acceden a clubes a través de su organización
        # Necesitamos asegurarnos de que el usuario tenga la organización correcta
        
        if not org_memberships.filter(organization=selected_club.organization).exists():
            print(f"\n⚠️  El usuario no pertenece a la organización del club")
            print(f"   Creando membresía en {selected_club.organization.trade_name}...")
            
            # Crear membresía en la organización
            OrganizationMembership.objects.create(
                user=user,
                organization=selected_club.organization,
                role="org_admin"  # Le damos permisos de admin para testing
            )
            print(f"✅ Membresía creada con rol 'org_admin'")
        else:
            print(f"\n✅ El usuario ya pertenece a la organización del club")
            
        # 6. Actualizar el current_organization_id del usuario
        user.current_organization_id = selected_club.organization.id
        user.current_club_id = selected_club.id
        user.save()
        print(f"\n✅ Usuario actualizado:")
        print(f"   - current_organization_id: {user.current_organization_id}")
        print(f"   - current_club_id: {user.current_club_id}")
        
        # 7. Generar nuevo token para el usuario actualizado
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        print(f"\n🔑 Nuevo token de acceso:")
        print(f"{refresh.access_token}")
        print(f"\n🚀 URL de acceso directo actualizada:")
        print(f"http://localhost:3001/api/direct-login?token={refresh.access_token}")
        
        # Guardar en archivo
        with open('test_access_updated.txt', 'w') as f:
            f.write(f"Email: {user.email}\n")
            f.write(f"Password: test123456\n")
            f.write(f"Club: {selected_club.name}\n")
            f.write(f"Organization: {selected_club.organization.trade_name}\n")
            f.write(f"Access Token: {refresh.access_token}\n")
            f.write(f"Direct Login: http://localhost:3001/api/direct-login?token={refresh.access_token}\n")
        
        print(f"\n📝 Credenciales actualizadas guardadas en: test_access_updated.txt")
        
    else:
        print("❌ No hay clubes disponibles en el sistema")

if __name__ == "__main__":
    link_user_to_club()