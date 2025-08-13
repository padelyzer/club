#!/usr/bin/env python3
"""
Test de funcionalidad del módulo de clubes
"""
import os
import sys
import django
import json
from datetime import datetime, time, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.clubs.models import Club, Court, Schedule, Announcement
from apps.clubs.serializers import ClubSerializer, CourtSerializer
from apps.root.models import Organization
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class ClubsFunctionalityTest:
    def __init__(self):
        self.client = APIClient()
        self.user = None
        self.token = None
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {}
        }
    
    def setup(self):
        """Configurar usuario y autenticación"""
        print("\n🔧 CONFIGURACIÓN")
        print("=" * 50)
        
        # Usar el usuario test@padelyzer.com
        self.user = User.objects.get(email="test@padelyzer.com")
        print(f"✅ Usuario: {self.user.email}")
        
        # Generar token
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        print("✅ Token generado y configurado")
        
        # Obtener club del usuario
        # El usuario tiene current_organization_id, buscar el primer club de esa org
        if hasattr(self.user, 'current_organization_id') and self.user.current_organization_id:
            self.club = Club.objects.filter(
                organization_id=self.user.current_organization_id,
                is_active=True
            ).first()
        else:
            # Si no, obtener el primer club activo
            self.club = Club.objects.filter(is_active=True).first()
        
        if self.club:
            print(f"✅ Club activo: {self.club.name}")
        else:
            print("❌ No se encontró club activo")
    
    def test_list_clubs(self):
        """Test: Listar clubes"""
        print("\n📋 TEST: Listar clubes")
        print("-" * 30)
        
        response = self.client.get('/api/v1/clubs/')
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # Manejar respuesta paginada
            if isinstance(data, dict) and 'results' in data:
                clubs = data['results']
            else:
                clubs = data if isinstance(data, list) else []
            
            print(f"✅ Clubes obtenidos: {len(clubs)}")
            if clubs and len(clubs) > 0:
                print(f"   Primer club: {clubs[0].get('name', 'Sin nombre')}")
            self.results["tests"]["list_clubs"] = {"status": "passed", "count": len(clubs)}
        else:
            print(f"❌ Error: {response.status_code}")
            self.results["tests"]["list_clubs"] = {"status": "failed", "error": response.status_code}
    
    def test_get_club_detail(self):
        """Test: Obtener detalle de club"""
        print("\n🔍 TEST: Detalle de club")
        print("-" * 30)
        
        response = self.client.get(f'/api/v1/clubs/{self.club.id}/')
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            club_data = response.json()
            print(f"✅ Club: {club_data.get('name')}")
            print(f"   Email: {club_data.get('email')}")
            print(f"   Canchas: {club_data.get('total_courts', 0)}")
            self.results["tests"]["get_club_detail"] = {"status": "passed", "data": club_data}
        else:
            print(f"❌ Error: {response.status_code}")
            self.results["tests"]["get_club_detail"] = {"status": "failed", "error": response.status_code}
    
    def test_list_courts(self):
        """Test: Listar canchas"""
        print("\n🎾 TEST: Listar canchas")
        print("-" * 30)
        
        response = self.client.get(f'/api/v1/clubs/courts/?club={self.club.id}')
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # Manejar respuesta paginada
            if isinstance(data, dict) and 'results' in data:
                courts = data['results']
            else:
                courts = data if isinstance(data, list) else []
            
            print(f"✅ Canchas obtenidas: {len(courts)}")
            for court in courts[:3]:  # Primeras 3
                print(f"   - {court.get('name')} (#{court.get('number')})")
            self.results["tests"]["list_courts"] = {"status": "passed", "count": len(courts)}
        else:
            print(f"❌ Error: {response.status_code}")
            self.results["tests"]["list_courts"] = {"status": "failed", "error": response.status_code}
    
    def test_court_availability(self):
        """Test: Verificar disponibilidad de canchas"""
        print("\n📅 TEST: Disponibilidad de canchas")
        print("-" * 30)
        
        # Obtener primera cancha activa
        court = Court.objects.filter(club=self.club, is_active=True).first()
        if not court:
            print("❌ No hay canchas activas")
            return
        
        # Probar endpoint de disponibilidad
        params = {
            "date": datetime.now().date().isoformat(),
            "start_time": "10:00",
            "end_time": "12:00"
        }
        
        response = self.client.get(
            f'/api/v1/clubs/courts/{court.id}/availability/',
            params
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Disponibilidad consultada")
            print(f"   Cancha: {court.name}")
            print(f"   Disponible: {data.get('available', 'Unknown')}")
            self.results["tests"]["court_availability"] = {"status": "passed", "data": data}
        else:
            print(f"❌ Error: {response.status_code}")
            self.results["tests"]["court_availability"] = {"status": "failed", "error": response.status_code}
    
    def test_create_announcement(self):
        """Test: Crear anuncio"""
        print("\n📢 TEST: Crear anuncio")
        print("-" * 30)
        
        announcement_data = {
            "club": self.club.id,
            "organization": self.club.organization.id,
            "title": "Test Announcement",
            "content": "Este es un anuncio de prueba",
            "announcement_type": "general",
            "starts_at": datetime.now().isoformat(),
            "ends_at": (datetime.now() + timedelta(days=7)).isoformat(),
            "is_priority": False,
            "show_on_app": True,
            "show_on_website": True
        }
        
        response = self.client.post(
            '/api/v1/clubs/announcements/',
            announcement_data,
            format='json'
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            announcement = response.json()
            print(f"✅ Anuncio creado: {announcement.get('title')}")
            self.results["tests"]["create_announcement"] = {"status": "passed", "id": announcement.get('id')}
            
            # Eliminar el anuncio de prueba
            self.client.delete(f'/api/v1/clubs/announcements/{announcement["id"]}/')
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Detalle: {response.json()}")
            self.results["tests"]["create_announcement"] = {"status": "failed", "error": response.json()}
    
    def test_schedules(self):
        """Test: Horarios del club"""
        print("\n⏰ TEST: Horarios del club")
        print("-" * 30)
        
        response = self.client.get(f'/api/v1/clubs/schedules/?club={self.club.id}')
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # Manejar respuesta paginada
            if isinstance(data, dict) and 'results' in data:
                schedules = data['results']
            else:
                schedules = data if isinstance(data, list) else []
            
            print(f"✅ Horarios obtenidos: {len(schedules)}")
            for schedule in schedules[:3]:
                print(f"   - {schedule.get('weekday')} {schedule.get('opening_time')} - {schedule.get('closing_time')}")
            self.results["tests"]["schedules"] = {"status": "passed", "count": len(schedules)}
        else:
            print(f"❌ Error: {response.status_code}")
            self.results["tests"]["schedules"] = {"status": "failed", "error": response.status_code}
    
    def run_all_tests(self):
        """Ejecutar todos los tests"""
        print("\n" + "=" * 70)
        print("TEST DE FUNCIONALIDAD - MÓDULO DE CLUBES")
        print("=" * 70)
        
        self.setup()
        
        # Ejecutar tests
        self.test_list_clubs()
        self.test_get_club_detail()
        self.test_list_courts()
        self.test_court_availability()
        self.test_create_announcement()
        self.test_schedules()
        
        # Guardar resultados
        with open('clubs_functionality_test.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        # Resumen
        print("\n" + "=" * 70)
        print("📊 RESUMEN DE PRUEBAS")
        print("=" * 70)
        
        passed = sum(1 for test in self.results["tests"].values() if test["status"] == "passed")
        failed = sum(1 for test in self.results["tests"].values() if test["status"] == "failed")
        
        print(f"✅ Pasadas: {passed}")
        print(f"❌ Fallidas: {failed}")
        print(f"📄 Resultados guardados en: clubs_functionality_test.json")
        
        if failed == 0:
            print("\n🎉 ¡TODOS LOS TESTS PASARON!")
        else:
            print("\n⚠️  Algunos tests fallaron, revisar el archivo de resultados")

if __name__ == "__main__":
    tester = ClubsFunctionalityTest()
    tester.run_all_tests()