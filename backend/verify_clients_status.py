#!/usr/bin/env python3
"""
Verificar el estado actual de los clientes
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.clients.models import ClientProfile, PlayerLevel, PlayerStats, PlayerPreferences
from apps.clubs.models import Club
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def verify_clients():
    print("🔍 VERIFICACIÓN COMPLETA DEL MÓDULO DE CLIENTES")
    print("=" * 60)
    
    club = Club.objects.get(name="API Test Padel Club")
    
    # 1. Contar clientes
    print("\n📊 ESTADÍSTICAS GENERALES:")
    total_clients = ClientProfile.objects.filter(club=club).count()
    print(f"   • Total clientes en el club: {total_clients}")
    
    # 2. Listar clientes
    print("\n👥 CLIENTES REGISTRADOS:")
    clients = ClientProfile.objects.filter(club=club).select_related('user', 'level')
    
    for i, client in enumerate(clients, 1):
        print(f"\n{i}. {client.user.first_name} {client.user.last_name}")
        print(f"   • Email: {client.user.email}")
        print(f"   • Usuario: {client.user.email if client.user else 'Sin usuario'}")
        print(f"   • Nivel: {client.level.display_name if client.level else 'Sin nivel'}")
        print(f"   • Rating: {client.rating}")
        print(f"   • Mano dominante: {client.get_dominant_hand_display()}")
        print(f"   • Posición preferida: {client.get_preferred_position_display()}")
        
        # Verificar estadísticas
        if hasattr(client, 'stats'):
            print(f"   • Estadísticas: ✅ Creadas")
        else:
            print(f"   • Estadísticas: ❌ No creadas")
    
    # 3. Distribución por nivel
    print("\n📈 DISTRIBUCIÓN POR NIVEL:")
    for level in PlayerLevel.objects.all():
        count = ClientProfile.objects.filter(club=club, level=level).count()
        print(f"   • {level.display_name}: {count} jugadores")
    
    # 4. Probar API
    print("\n🔧 PRUEBA DE API:")
    
    # Usar el usuario test@padelyzer.com
    test_user = User.objects.get(email="test@padelyzer.com")
    refresh = RefreshToken.for_user(test_user)
    token = str(refresh.access_token)
    
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # Listar clientes
    response = client.get('/api/v1/clients/')
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"   ✅ API /clients/: {len(results)} clientes obtenidos")
    else:
        print(f"   ❌ API /clients/: Error {response.status_code}")
    
    # Obtener detalle de un cliente
    if clients.exists():
        first_client = clients.first()
        response = client.get(f'/api/v1/clients/{first_client.id}/')
        if response.status_code == 200:
            print(f"   ✅ API /clients/{first_client.id}/: Detalle obtenido")
        else:
            print(f"   ❌ API /clients/{first_client.id}/: Error {response.status_code}")
    
    # 5. Verificar integridad
    print("\n🔧 VERIFICACIÓN DE INTEGRIDAD:")
    
    # Clientes sin usuario
    no_user = ClientProfile.objects.filter(club=club, user__isnull=True).count()
    if no_user > 0:
        print(f"   ⚠️  {no_user} clientes sin usuario asociado")
    
    # Clientes sin nivel
    no_level = ClientProfile.objects.filter(club=club, level__isnull=True).count()
    if no_level > 0:
        print(f"   ⚠️  {no_level} clientes sin nivel")
    
    # Clientes sin estadísticas
    clients_with_stats = PlayerStats.objects.filter(
        player__club=club
    ).values_list('player_id', flat=True)
    
    clients_without_stats = ClientProfile.objects.filter(
        club=club
    ).exclude(id__in=clients_with_stats).count()
    
    if clients_without_stats > 0:
        print(f"   ⚠️  {clients_without_stats} clientes sin estadísticas")
    else:
        print(f"   ✅ Todos los clientes tienen estadísticas")
    
    print("\n✅ Verificación completada")

if __name__ == "__main__":
    verify_clients()