#!/usr/bin/env python3
"""
Asegurar que el usuario admin tenga perfil de cliente con preferencias
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.clients.models import ClientProfile, PlayerLevel, PlayerStats, PlayerPreferences
from apps.clubs.models import Club

User = get_user_model()

def ensure_admin_profile():
    print("🔍 Verificando perfil de admin...")
    
    try:
        admin = User.objects.get(email='test@padelyzer.com')
        club = Club.objects.get(name='API Test Padel Club')
        
        # Verificar o crear perfil
        profile, created = ClientProfile.objects.get_or_create(
            user=admin,
            defaults={
                'organization': admin.organization,
                'club': club,
                'level': PlayerLevel.objects.get(name='intermediate'),
                'rating': 500,
                'dominant_hand': 'right',
                'preferred_position': 'both',
                'is_public': True,
                'show_in_rankings': True
            }
        )
        
        if created:
            print("✅ Perfil de cliente creado para admin")
        else:
            print("✅ Admin ya tiene perfil de cliente")
            
        # Asegurar que tiene estadísticas
        stats, _ = PlayerStats.objects.get_or_create(
            player=profile,
            defaults={
                'organization': admin.organization,
                'club': club,
                'matches_played': 0,
                'matches_won': 0,
                'matches_lost': 0
            }
        )
        
        # Asegurar que tiene preferencias
        prefs, _ = PlayerPreferences.objects.get_or_create(
            player=profile,
            defaults={
                'organization': admin.organization,
                'club': club,
                'available_weekday_morning': True,
                'available_weekday_afternoon': True,
                'available_weekday_evening': True,
                'available_weekend_morning': True,
                'available_weekend_afternoon': True,
                'available_weekend_evening': True,
                'notify_match_invites': True,
                'notify_partner_requests': True
            }
        )
        
        print("✅ Perfil completo con estadísticas y preferencias")
        
        # Probar el endpoint
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(admin)
        token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Probar recommendations
        response = client.get('/api/v1/clients/profiles/recommendations/')
        print(f"\n📡 GET /clients/profiles/recommendations/: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ {len(data)} recomendaciones obtenidas")
        else:
            print(f"   ❌ Error: {response.data}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    ensure_admin_profile()