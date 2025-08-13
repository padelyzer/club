#!/usr/bin/env python
"""
Validación profunda del módulo de clubes - Integraciones y funcionalidades avanzadas.
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django
django.setup()

from django.contrib.auth import get_user_model
from apps.clubs.models import Club, Court, Schedule
from apps.root.models import Organization

User = get_user_model()

class ClubsDeepValidator:
    def __init__(self):
        self.base_url = "http://localhost:8000/api/v1"
        self.access_token = None
        self.test_club_slug = None
        self.test_club_id = None
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0
            }
        }
    
    def login(self, email="clubs@padelyzer.com", password="TEST_PASSWORD"):
        """Realizar login y obtener token."""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login/",
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access")
                return True, "Login exitoso"
            else:
                return False, f"Error en login: {response.text}"
        except Exception as e:
            return False, f"Error de conexión: {str(e)}"
    
    def headers(self):
        """Headers con autenticación."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def test(self, name, func):
        """Ejecutar un test y registrar resultado."""
        self.results["summary"]["total"] += 1
        try:
            success, message = func()
            self.results["tests"][name] = {
                "success": success,
                "message": message
            }
            if success:
                self.results["summary"]["passed"] += 1
                print(f"✅ {name}: {message}")
            else:
                self.results["summary"]["failed"] += 1
                print(f"❌ {name}: {message}")
        except Exception as e:
            self.results["summary"]["failed"] += 1
            self.results["tests"][name] = {
                "success": False,
                "message": f"Error: {str(e)}"
            }
            print(f"❌ {name}: Error - {str(e)}")
    
    def setup_test_club(self):
        """Obtener club de prueba."""
        response = requests.get(
            f"{self.base_url}/clubs/",
            headers=self.headers()
        )
        if response.status_code == 200:
            clubs = response.json().get("results", [])
            if clubs:
                # Usar el primer club encontrado
                self.test_club_slug = clubs[0]["slug"]
                self.test_club_id = clubs[0]["id"]
                return True, f"Club de prueba: {clubs[0]['name']}"
        return False, "No se encontraron clubes"
    
    def validate_delete_club(self):
        """Validar eliminación de club."""
        # Primero crear un club temporal
        org_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        if org_response.status_code != 200:
            return False, "No se pudo obtener perfil"
        
        org_id = org_response.json()["organization_memberships"][0]["organization"]
        
        # Crear club temporal
        temp_club_data = {
            "name": f"Club Temporal {datetime.now().strftime('%H%M%S')}",
            "description": "Club para probar eliminación",
            "organization": org_id,
            "email": "temp@clubtest.com",
            "phone": "+525512345678",
            "address": {"street": "Calle Temp", "city": "Ciudad"},
            "opening_time": "08:00",
            "closing_time": "22:00",
            "days_open": [0, 1, 2, 3, 4]
        }
        
        create_response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=temp_club_data
        )
        
        if create_response.status_code not in [200, 201]:
            return False, "No se pudo crear club temporal"
        
        temp_slug = create_response.json()["slug"]
        
        # Intentar eliminar
        delete_response = requests.delete(
            f"{self.base_url}/clubs/{temp_slug}/",
            headers=self.headers()
        )
        
        if delete_response.status_code in [204, 200]:
            # Verificar que no existe
            check_response = requests.get(
                f"{self.base_url}/clubs/{temp_slug}/",
                headers=self.headers()
            )
            if check_response.status_code == 404:
                return True, "Club eliminado correctamente"
            else:
                return False, "Club aún existe después de eliminar"
        return False, f"Error al eliminar: {delete_response.status_code}"
    
    def validate_courts_integration(self):
        """Validar integración con canchas."""
        if not self.test_club_slug:
            return False, "No hay club de prueba"
        
        # Listar canchas del club
        response = requests.get(
            f"{self.base_url}/courts/?club={self.test_club_id}",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            courts = response.json()
            if isinstance(courts, dict) and "results" in courts:
                count = len(courts["results"])
                return True, f"Integración con canchas OK: {count} canchas encontradas"
            elif isinstance(courts, list):
                return True, f"Integración con canchas OK: {len(courts)} canchas encontradas"
            return True, "Integración con canchas OK: estructura de respuesta válida"
        return False, f"Error al obtener canchas: {response.status_code}"
    
    def validate_schedules(self):
        """Validar horarios del club."""
        if not self.test_club_slug:
            return False, "No hay club de prueba"
        
        # Obtener detalle del club
        response = requests.get(
            f"{self.base_url}/clubs/{self.test_club_slug}/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            club = response.json()
            # Verificar horarios
            if "opening_time" in club and "closing_time" in club:
                opening = club["opening_time"]
                closing = club["closing_time"]
                days = club.get("days_open", [])
                return True, f"Horarios configurados: {opening} - {closing}, {len(days)} días"
            return False, "Club sin horarios configurados"
        return False, f"Error al obtener club: {response.status_code}"
    
    def validate_permissions_roles(self):
        """Validar permisos por rol."""
        # Intentar crear club sin organización (debería fallar)
        invalid_club_data = {
            "name": "Club Sin Org",
            "email": "noorg@test.com",
            "phone": "+525512345678"
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=invalid_club_data
        )
        
        if response.status_code == 400:
            return True, "Validación de permisos OK: requiere organización"
        elif response.status_code == 201:
            return False, "Error: permitió crear club sin organización"
        return False, f"Respuesta inesperada: {response.status_code}"
    
    def validate_filters_search(self):
        """Validar filtros y búsqueda avanzada."""
        # Probar diferentes filtros
        filters = [
            ("is_active=true", "clubes activos"),
            ("search=Valencia", "búsqueda por nombre"),
            ("page_size=2", "paginación personalizada")
        ]
        
        for filter_str, desc in filters:
            response = requests.get(
                f"{self.base_url}/clubs/?{filter_str}",
                headers=self.headers()
            )
            if response.status_code != 200:
                return False, f"Filtro '{desc}' falló: {response.status_code}"
        
        return True, "Todos los filtros funcionan correctamente"
    
    def validate_stats_counts(self):
        """Validar estadísticas y contadores."""
        if not self.test_club_slug:
            return False, "No hay club de prueba"
        
        response = requests.get(
            f"{self.base_url}/clubs/{self.test_club_slug}/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            club = response.json()
            stats = []
            
            # Verificar campos de estadísticas
            if "total_courts" in club:
                stats.append(f"canchas: {club['total_courts']}")
            if "courts_count" in club:
                stats.append(f"canchas activas: {club['courts_count']}")
            if "total_members" in club:
                stats.append(f"miembros: {club['total_members']}")
            
            if stats:
                return True, f"Estadísticas disponibles: {', '.join(stats)}"
            return False, "No hay campos de estadísticas"
        return False, f"Error al obtener club: {response.status_code}"
    
    def validate_business_rules(self):
        """Validar reglas de negocio."""
        # Verificar que no se puede crear club con mismo slug
        if not self.test_club_slug:
            return False, "No hay club de prueba"
        
        # Obtener organización
        org_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        org_id = org_response.json()["organization_memberships"][0]["organization"]
        
        duplicate_data = {
            "name": "Club Duplicado",
            "slug": self.test_club_slug,  # Intentar usar slug existente
            "organization": org_id,
            "email": "dup@test.com",
            "phone": "+525512345678",
            "opening_time": "08:00",
            "closing_time": "22:00"
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=duplicate_data
        )
        
        if response.status_code == 400:
            return True, "Regla de negocio OK: no permite slugs duplicados"
        return False, "Error: permitió crear club con slug duplicado"
    
    def validate_data_integrity(self):
        """Validar integridad de datos."""
        response = requests.get(
            f"{self.base_url}/clubs/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            clubs = response.json().get("results", [])
            
            for club in clubs:
                # Verificar campos obligatorios
                required = ["id", "name", "slug", "email", "phone"]
                missing = [f for f in required if not club.get(f)]
                
                if missing:
                    return False, f"Club {club.get('name')} sin campos: {missing}"
            
            return True, f"Integridad de datos OK en {len(clubs)} clubes"
        return False, "Error al verificar integridad"
    
    def run_validation(self):
        """Ejecutar todas las validaciones."""
        print("="*60)
        print("VALIDACIÓN PROFUNDA DEL MÓDULO DE CLUBES")
        print("="*60)
        
        # Login
        success, message = self.login()
        if not success:
            print(f"❌ Error crítico: {message}")
            return
        print(f"✅ Login exitoso")
        
        # Setup
        success, message = self.setup_test_club()
        if success:
            print(f"✅ {message}")
        else:
            print(f"❌ {message}")
        
        # Tests CRUD Avanzado
        print("\n📋 VALIDANDO CRUD AVANZADO...")
        self.test("DELETE - Eliminar club", self.validate_delete_club)
        
        # Tests de Integraciones
        print("\n🔗 VALIDANDO INTEGRACIONES...")
        self.test("Integración con canchas", self.validate_courts_integration)
        self.test("Configuración de horarios", self.validate_schedules)
        
        # Tests de Permisos
        print("\n🔐 VALIDANDO PERMISOS Y ROLES...")
        self.test("Validación de permisos", self.validate_permissions_roles)
        
        # Tests de Funcionalidades
        print("\n🔍 VALIDANDO FUNCIONALIDADES AVANZADAS...")
        self.test("Filtros y búsqueda", self.validate_filters_search)
        self.test("Estadísticas y contadores", self.validate_stats_counts)
        
        # Tests de Reglas de Negocio
        print("\n📏 VALIDANDO REGLAS DE NEGOCIO...")
        self.test("Reglas de unicidad", self.validate_business_rules)
        self.test("Integridad de datos", self.validate_data_integrity)
        
        # Resumen
        print("\n" + "="*60)
        print("RESUMEN DE VALIDACIÓN PROFUNDA")
        print("="*60)
        summary = self.results["summary"]
        print(f"Total de pruebas: {summary['total']}")
        print(f"✅ Exitosas: {summary['passed']}")
        print(f"❌ Fallidas: {summary['failed']}")
        print(f"📊 Porcentaje de éxito: {(summary['passed']/summary['total']*100):.1f}%")
        
        # Guardar resultados
        with open('clubs_deep_validation_results.json', 'w') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Resultados guardados en clubs_deep_validation_results.json")
        
        return self.results

if __name__ == '__main__':
    validator = ClubsDeepValidator()
    validator.run_validation()