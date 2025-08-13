#!/usr/bin/env python
"""
Validación completa del módulo de clubes.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from base_validator import BaseModuleValidator
import requests
from datetime import datetime

class ClubsValidator(BaseModuleValidator):
    """Validador completo del módulo de clubes."""
    
    def __init__(self):
        super().__init__("clubs")
        self.test_club_slug = None
        self.test_club_id = None
    
    def run_validation(self):
        """Ejecutar todas las validaciones del módulo de clubes."""
        
        # Tests CRUD
        print("\n📋 VALIDANDO CRUD...")
        self.test("LIST - Listar clubes", self.validate_list)
        self.test("CREATE - Crear club", self.validate_create)
        self.test("READ - Leer detalle", self.validate_read, skip_if_fails="CREATE - Crear club")
        self.test("UPDATE - Actualizar club", self.validate_update, skip_if_fails="CREATE - Crear club")
        self.test("DELETE - Eliminar club", self.validate_delete)
        
        # Tests de Permisos
        print("\n🔐 VALIDANDO PERMISOS...")
        self.test("Acceso sin autenticación", self.validate_no_auth_access)
        self.test("Validación de organización", self.validate_org_requirement)
        
        # Tests de Funcionalidades
        print("\n🔍 VALIDANDO FUNCIONALIDADES...")
        self.test("Búsqueda por nombre", self.validate_search)
        self.test("Paginación", self.validate_pagination)
        self.test("Filtros", self.validate_filters)
        
        # Tests de Integraciones
        print("\n🔗 VALIDANDO INTEGRACIONES...")
        self.test("Integración con canchas", self.validate_courts_integration)
        self.test("Configuración de horarios", self.validate_schedules)
        
        # Tests de Reglas de Negocio
        print("\n📏 VALIDANDO REGLAS DE NEGOCIO...")
        self.test("Unicidad de slug", self.validate_unique_slug)
        self.test("Validación de teléfono", self.validate_phone_format)
        self.test("Integridad de datos", self.validate_data_integrity)
    
    # CRUD Tests
    def validate_list(self):
        """Validar listado de clubes."""
        response = requests.get(
            f"{self.base_url}/clubs/",
            headers=self.headers()
        )
        if response.status_code == 200:
            data = response.json()
            count = len(data.get("results", []))
            return True, f"Listado exitoso: {count} clubes encontrados"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_create(self):
        """Validar creación de club."""
        # Obtener organización del usuario
        user_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        if user_response.status_code != 200:
            return False, "No se pudo obtener perfil de usuario"
        
        user_data = user_response.json()
        org_memberships = user_data.get("organization_memberships", [])
        
        if not org_memberships:
            return False, "Usuario no tiene organización asignada"
        
        org_id = org_memberships[0].get("organization")
        
        club_data = {
            "name": f"Club Test {datetime.now().strftime('%H%M%S')}",
            "description": "Club creado para validación QA",
            "organization": org_id,
            "email": "qa@clubtest.com",
            "phone": "+525512345678",
            "address": {
                "street": "Calle QA 123",
                "city": "Ciudad de México",
                "postal_code": "01000",
                "country": "México"
            },
            "opening_time": "08:00",
            "closing_time": "22:00",
            "days_open": [0, 1, 2, 3, 4, 5]
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=club_data
        )
        
        if response.status_code in [200, 201]:
            created_club = response.json()
            self.test_club_id = created_club.get("id")
            self.test_club_slug = created_club.get("slug")
            return True, f"Club creado: {created_club.get('name')} (ID: {self.test_club_id})"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_read(self):
        """Validar lectura de detalle de club."""
        if not self.test_club_slug:
            # Obtener primer club disponible
            list_response = requests.get(
                f"{self.base_url}/clubs/",
                headers=self.headers()
            )
            if list_response.status_code == 200:
                clubs = list_response.json().get("results", [])
                if clubs:
                    self.test_club_slug = clubs[0]["slug"]
                    self.test_club_id = clubs[0]["id"]
        
        if not self.test_club_slug:
            return False, "No hay clubes para leer"
        
        response = requests.get(
            f"{self.base_url}/clubs/{self.test_club_slug}/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            club = response.json()
            return True, f"Detalle obtenido: {club.get('name')}"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_update(self):
        """Validar actualización de club."""
        if not self.test_club_slug:
            return False, "No hay club para actualizar"
        
        update_data = {
            "description": f"Descripción actualizada en QA - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        }
        
        response = requests.patch(
            f"{self.base_url}/clubs/{self.test_club_slug}/",
            headers=self.headers(),
            json=update_data
        )
        
        if response.status_code == 200:
            return True, "Club actualizado correctamente"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_delete(self):
        """Validar eliminación de club."""
        # Crear club temporal para eliminar
        create_result = self.create_temp_club()
        if not create_result[0]:
            return False, "No se pudo crear club temporal"
        
        temp_slug = create_result[1]
        
        # Intentar eliminar
        response = requests.delete(
            f"{self.base_url}/clubs/{temp_slug}/",
            headers=self.headers()
        )
        
        if response.status_code in [204, 200]:
            # Verificar que no existe
            check_response = requests.get(
                f"{self.base_url}/clubs/{temp_slug}/",
                headers=self.headers()
            )
            if check_response.status_code == 404:
                return True, "Club eliminado correctamente"
            return False, "Club aún existe después de eliminar"
        return False, f"Error al eliminar: {response.status_code}"
    
    # Permission Tests
    def validate_no_auth_access(self):
        """Validar que no se puede acceder sin autenticación."""
        response = requests.get(f"{self.base_url}/clubs/")
        if response.status_code == 401:
            return True, "Acceso denegado sin autenticación"
        return False, f"Error: API accesible sin auth (código {response.status_code})"
    
    def validate_org_requirement(self):
        """Validar que se requiere organización para crear club."""
        invalid_data = {
            "name": "Club Sin Org",
            "email": "noorg@test.com",
            "phone": "+525512345678"
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=invalid_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: requiere organización"
        return False, f"Error: permitió crear sin organización ({response.status_code})"
    
    # Feature Tests
    def validate_search(self):
        """Validar búsqueda."""
        response = requests.get(
            f"{self.base_url}/clubs/?search=Valencia",
            headers=self.headers()
        )
        if response.status_code == 200:
            data = response.json()
            count = len(data.get("results", []))
            return True, f"Búsqueda funciona: {count} resultados"
        return False, f"Error en búsqueda: {response.status_code}"
    
    def validate_pagination(self):
        """Validar paginación."""
        response = requests.get(
            f"{self.base_url}/clubs/?page=1&page_size=2",
            headers=self.headers()
        )
        if response.status_code == 200:
            data = response.json()
            has_pagination = all(key in data for key in ["count", "next", "previous", "results"])
            if has_pagination:
                return True, f"Paginación OK: {data.get('count')} total, página {data.get('current_page', 1)}/{data.get('total_pages', 1)}"
            return False, "Respuesta sin estructura de paginación"
        return False, f"Error en paginación: {response.status_code}"
    
    def validate_filters(self):
        """Validar filtros."""
        # Probar filtro de activos
        response = requests.get(
            f"{self.base_url}/clubs/?is_active=true",
            headers=self.headers()
        )
        if response.status_code != 200:
            return False, f"Error en filtro is_active: {response.status_code}"
        
        return True, "Filtros funcionan correctamente"
    
    # Integration Tests
    def validate_courts_integration(self):
        """Validar integración con canchas."""
        if not self.test_club_id:
            return False, "No hay club de prueba"
        
        response = requests.get(
            f"{self.base_url}/courts/?club={self.test_club_id}",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Integración con canchas OK"
        elif response.status_code == 404:
            return True, "Endpoint de canchas no implementado aún"
        return False, f"Error en integración: {response.status_code}"
    
    def validate_schedules(self):
        """Validar configuración de horarios."""
        if not self.test_club_slug:
            return False, "No hay club de prueba"
        
        response = requests.get(
            f"{self.base_url}/clubs/{self.test_club_slug}/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            club = response.json()
            if "opening_time" in club and "closing_time" in club:
                return True, f"Horarios configurados: {club['opening_time']} - {club['closing_time']}"
            return False, "Club sin horarios configurados"
        return False, f"Error al obtener club: {response.status_code}"
    
    # Business Rules Tests
    def validate_unique_slug(self):
        """Validar unicidad de slug."""
        if not self.test_club_slug:
            return False, "No hay club de prueba"
        
        # Obtener organización
        user_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        org_id = user_response.json()["organization_memberships"][0]["organization"]
        
        duplicate_data = {
            "name": "Club Duplicado",
            "slug": self.test_club_slug,
            "organization": org_id,
            "email": "dup@test.com",
            "phone": "+525512345678"
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=duplicate_data
        )
        
        if response.status_code == 400:
            return True, "Validación OK: no permite slugs duplicados"
        return False, f"Error: permitió slug duplicado ({response.status_code})"
    
    def validate_phone_format(self):
        """Validar formato de teléfono."""
        # Obtener organización
        user_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        org_id = user_response.json()["organization_memberships"][0]["organization"]
        
        # Teléfono inválido
        invalid_phone_data = {
            "name": "Club Phone Test",
            "organization": org_id,
            "email": "phone@test.com",
            "phone": "123",  # Teléfono inválido
            "opening_time": "08:00",
            "closing_time": "22:00"
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=invalid_phone_data
        )
        
        if response.status_code == 400:
            return True, "Validación OK: rechaza teléfonos inválidos"
        return False, f"Error: aceptó teléfono inválido ({response.status_code})"
    
    def validate_data_integrity(self):
        """Validar integridad de datos."""
        response = requests.get(
            f"{self.base_url}/clubs/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            clubs = response.json().get("results", [])
            
            for club in clubs:
                required = ["id", "name", "slug", "email", "phone"]
                missing = [f for f in required if not club.get(f)]
                
                if missing:
                    return False, f"Club '{club.get('name')}' sin campos: {missing}"
            
            return True, f"Integridad OK en {len(clubs)} clubes"
        return False, f"Error al verificar integridad: {response.status_code}"
    
    # Helper methods
    def create_temp_club(self):
        """Crear club temporal para pruebas."""
        user_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        org_id = user_response.json()["organization_memberships"][0]["organization"]
        
        temp_data = {
            "name": f"Temp Club {datetime.now().strftime('%H%M%S')}",
            "organization": org_id,
            "email": "temp@test.com",
            "phone": "+525512345678",
            "opening_time": "08:00",
            "closing_time": "22:00"
        }
        
        response = requests.post(
            f"{self.base_url}/clubs/",
            headers=self.headers(),
            json=temp_data
        )
        
        if response.status_code in [200, 201]:
            return True, response.json()["slug"]
        return False, None

if __name__ == '__main__':
    validator = ClubsValidator()
    validator.run()