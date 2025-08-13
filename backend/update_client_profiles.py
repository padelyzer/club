#!/usr/bin/env python3
"""
Actualizar perfiles de clientes existentes con organización y club
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.clients.models import ClientProfile, PlayerStats, EmergencyContact, MedicalInfo, PlayerPreferences, PartnerRequest
from apps.clubs.models import Club
from apps.root.models import Organization

def update_multitenant_fields():
    print("🔄 Actualizando campos multi-tenant en modelos de clientes...")
    
    # Obtener primera organización y club activos
    default_org = Organization.objects.filter(is_active=True).first()
    default_club = Club.objects.filter(is_active=True).first()
    
    if not default_org or not default_club:
        print("❌ No hay organización o club activos")
        return
    
    print(f"📍 Usando organización: {default_org.trade_name}")
    print(f"🏢 Usando club: {default_club.name}")
    
    # Actualizar ClientProfile
    updated = ClientProfile.objects.filter(organization__isnull=True).update(
        organization=default_org,
        club=default_club
    )
    print(f"✅ ClientProfile: {updated} registros actualizados")
    
    # Actualizar PlayerStats
    updated = PlayerStats.objects.filter(organization__isnull=True).update(
        organization=default_org,
        club=default_club
    )
    print(f"✅ PlayerStats: {updated} registros actualizados")
    
    # Actualizar EmergencyContact
    updated = EmergencyContact.objects.filter(organization__isnull=True).update(
        organization=default_org,
        club=default_club
    )
    print(f"✅ EmergencyContact: {updated} registros actualizados")
    
    # Actualizar MedicalInfo
    updated = MedicalInfo.objects.filter(organization__isnull=True).update(
        organization=default_org,
        club=default_club
    )
    print(f"✅ MedicalInfo: {updated} registros actualizados")
    
    # Actualizar PlayerPreferences
    updated = PlayerPreferences.objects.filter(organization__isnull=True).update(
        organization=default_org,
        club=default_club
    )
    print(f"✅ PlayerPreferences: {updated} registros actualizados")
    
    # Actualizar PartnerRequest
    updated = PartnerRequest.objects.filter(organization__isnull=True).update(
        organization=default_org,
        club=default_club
    )
    print(f"✅ PartnerRequest: {updated} registros actualizados")
    
    print("\n✅ Actualización completada")

if __name__ == "__main__":
    update_multitenant_fields()