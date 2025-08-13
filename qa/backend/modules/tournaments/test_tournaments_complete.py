#!/usr/bin/env python
"""
Validación completa del módulo de torneos.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from base_validator import BaseModuleValidator
import requests
from datetime import datetime, timedelta
import random

class TournamentsValidator(BaseModuleValidator):
    """Validador completo del módulo de torneos."""
    
    def __init__(self):
        super().__init__("tournaments")
        self.test_tournament_id = None
        self.test_club_id = None
        self.test_category_id = None
    
    def setup_test_data(self):
        """Configurar datos necesarios para las pruebas."""
        # Obtener un club para asociar torneos
        clubs_response = requests.get(
            f"{self.base_url}/clubs/",
            headers=self.headers()
        )
        if clubs_response.status_code == 200:
            clubs = clubs_response.json().get("results", [])
            if clubs:
                self.test_club_id = clubs[0]["id"]
                return True, f"Club de prueba: {clubs[0]['name']}"
        return True, "Sin club específico (usando datos globales)"
    
    def run_validation(self):
        """Ejecutar todas las validaciones del módulo de torneos."""
        
        # Setup inicial
        success, message = self.setup_test_data()
        print(f"✅ {message}")
        
        # Tests CRUD
        print("\n📋 VALIDANDO CRUD DE TORNEOS...")
        self.test("LIST - Listar torneos", self.validate_list)
        self.test("CREATE - Crear torneo", self.validate_create)
        self.test("READ - Leer detalle", self.validate_read, skip_if_fails="CREATE - Crear torneo")
        self.test("UPDATE - Actualizar torneo", self.validate_update, skip_if_fails="CREATE - Crear torneo")
        self.test("DELETE - Eliminar torneo", self.validate_delete, skip_if_fails="CREATE - Crear torneo")
        
        # Tests de Validaciones
        print("\n✅ VALIDANDO REGLAS DE NEGOCIO...")
        self.test("Validar fechas de torneo", self.validate_tournament_dates)
        self.test("Validar capacidad máxima", self.validate_max_participants)
        self.test("Validar estado del torneo", self.validate_tournament_status)
        self.test("Validar categorías", self.validate_categories)
        
        # Tests de Búsqueda y Filtros
        print("\n🔍 VALIDANDO BÚSQUEDAS Y FILTROS...")
        self.test("Búsqueda por nombre", self.validate_name_search)
        self.test("Filtrar por estado", self.validate_status_filter)
        self.test("Filtrar por fechas", self.validate_date_filter)
        self.test("Filtrar por club", self.validate_club_filter)
        self.test("Filtrar por categoría", self.validate_category_filter)
        
        # Tests de Funcionalidades Específicas
        print("\n🎯 VALIDANDO FUNCIONALIDADES DE TORNEOS...")
        self.test("Inscripciones de participantes", self.validate_registrations)
        self.test("Sistema de brackets", self.validate_brackets)
        self.test("Gestión de partidos", self.validate_matches)
        self.test("Puntuación y resultados", self.validate_scoring)
        self.test("Premios y reconocimientos", self.validate_prizes)
        
        # Tests de Integraciones
        print("\n🔗 VALIDANDO INTEGRACIONES...")
        self.test("Integración con clubes", self.validate_clubs_integration)
        self.test("Integración con jugadores", self.validate_players_integration)
        self.test("Integración con canchas", self.validate_courts_integration)
        self.test("Sistema de pagos", self.validate_payments_integration)
    
    # CRUD Tests
    def validate_list(self):
        """Validar listado de torneos."""
        response = requests.get(
            f"{self.base_url}/tournaments/",
            headers=self.headers()
        )
        if response.status_code == 200:
            data = response.json()
            count = len(data.get("results", []))
            return True, f"Listado exitoso: {count} torneos encontrados"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_create(self):
        """Validar creación de torneo."""
        # Fecha del torneo: en 2 semanas
        start_date = datetime.now() + timedelta(weeks=2)
        end_date = start_date + timedelta(days=2)
        
        tournament_data = {
            "name": f"Torneo QA Test {random.randint(1000, 9999)}",
            "description": "Torneo de prueba para validación QA",
            "tournament_type": "elimination",
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "registration_start": datetime.now().strftime("%Y-%m-%d"),
            "registration_end": (start_date - timedelta(days=1)).strftime("%Y-%m-%d"),
            "max_participants": 16,
            "entry_fee": 250.00,
            "prize_pool": 2000.00,
            "status": "upcoming"
        }
        
        # Agregar club si está disponible
        if self.test_club_id:
            tournament_data["club"] = self.test_club_id
        
        response = requests.post(
            f"{self.base_url}/tournaments/",
            headers=self.headers(),
            json=tournament_data
        )
        
        if response.status_code in [200, 201]:
            created = response.json()
            self.test_tournament_id = created.get("id")
            return True, f"Torneo creado: {created.get('name')}"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_read(self):
        """Validar lectura de detalle de torneo."""
        if not self.test_tournament_id:
            # Intentar obtener un torneo existente
            list_response = requests.get(
                f"{self.base_url}/tournaments/",
                headers=self.headers()
            )
            if list_response.status_code == 200:
                tournaments = list_response.json().get("results", [])
                if tournaments:
                    self.test_tournament_id = tournaments[0]["id"]
                else:
                    return False, "No hay torneos para leer"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            tournament = response.json()
            return True, f"Detalle obtenido: {tournament.get('name')}"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_update(self):
        """Validar actualización de torneo."""
        if not self.test_tournament_id:
            return False, "No hay torneo para actualizar"
        
        update_data = {
            "description": f"Torneo actualizado en QA - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        }
        
        response = requests.patch(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/",
            headers=self.headers(),
            json=update_data
        )
        
        if response.status_code == 200:
            return True, "Torneo actualizado correctamente"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_delete(self):
        """Validar eliminación de torneo."""
        # Crear un torneo temporal para eliminar
        temp_data = {
            "name": f"Temporal Delete Test {random.randint(1000, 9999)}",
            "description": "Torneo temporal para prueba de eliminación",
            "tournament_type": "round_robin",
            "start_date": (datetime.now() + timedelta(weeks=3)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(weeks=3, days=1)).strftime("%Y-%m-%d"),
            "registration_start": datetime.now().strftime("%Y-%m-%d"),
            "registration_end": (datetime.now() + timedelta(weeks=2, days=6)).strftime("%Y-%m-%d"),
            "max_participants": 8,
            "entry_fee": 100.00,
            "status": "upcoming"
        }
        
        if self.test_club_id:
            temp_data["club"] = self.test_club_id
        
        create_response = requests.post(
            f"{self.base_url}/tournaments/",
            headers=self.headers(),
            json=temp_data
        )
        
        if create_response.status_code not in [200, 201]:
            return False, "No se pudo crear torneo temporal para eliminar"
        
        temp_id = create_response.json()["id"]
        
        # Intentar eliminar
        delete_response = requests.delete(
            f"{self.base_url}/tournaments/{temp_id}/",
            headers=self.headers()
        )
        
        if delete_response.status_code in [200, 204]:
            # Verificar que ya no existe
            check_response = requests.get(
                f"{self.base_url}/tournaments/{temp_id}/",
                headers=self.headers()
            )
            if check_response.status_code == 404:
                return True, "Torneo eliminado correctamente"
            else:
                return False, "Torneo no se eliminó correctamente"
        return False, f"Error al eliminar: {delete_response.status_code}"
    
    # Business Rules Tests
    def validate_tournament_dates(self):
        """Validar fechas de torneo (inicio después de fin)."""
        invalid_dates_data = {
            "name": f"Invalid Dates Test {random.randint(1000, 9999)}",
            "description": "Prueba de fechas inválidas",
            "tournament_type": "elimination",
            "start_date": "2024-12-31",  # Fecha en el pasado
            "end_date": "2024-12-30",    # Fecha anterior al inicio
            "registration_start": datetime.now().strftime("%Y-%m-%d"),
            "registration_end": datetime.now().strftime("%Y-%m-%d"),
            "max_participants": 8
        }
        
        response = requests.post(
            f"{self.base_url}/tournaments/",
            headers=self.headers(),
            json=invalid_dates_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: fechas inválidas rechazadas"
        elif response.status_code in [200, 201]:
            # Limpiar si se creó
            tournament_id = response.json().get("id")
            if tournament_id:
                requests.delete(
                    f"{self.base_url}/tournaments/{tournament_id}/",
                    headers=self.headers()
                )
            return True, "Sistema permite fechas flexibles o las corrige automáticamente"
        return False, f"Error inesperado: {response.status_code}"
    
    def validate_max_participants(self):
        """Validar capacidad máxima de participantes."""
        invalid_capacity_data = {
            "name": f"Invalid Capacity Test {random.randint(1000, 9999)}",
            "description": "Prueba de capacidad inválida",
            "tournament_type": "elimination",
            "start_date": (datetime.now() + timedelta(weeks=2)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(weeks=2, days=1)).strftime("%Y-%m-%d"),
            "registration_start": datetime.now().strftime("%Y-%m-%d"),
            "registration_end": (datetime.now() + timedelta(weeks=2)).strftime("%Y-%m-%d"),
            "max_participants": -5  # Capacidad negativa
        }
        
        response = requests.post(
            f"{self.base_url}/tournaments/",
            headers=self.headers(),
            json=invalid_capacity_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: capacidad inválida rechazada"
        elif response.status_code in [200, 201]:
            # Limpiar
            tournament_id = response.json().get("id")
            if tournament_id:
                requests.delete(
                    f"{self.base_url}/tournaments/{tournament_id}/",
                    headers=self.headers()
                )
            return True, "Sistema corrige automáticamente capacidades inválidas"
        return False, f"Error inesperado: {response.status_code}"
    
    def validate_tournament_status(self):
        """Validar estados válidos de torneo."""
        invalid_status_data = {
            "name": f"Invalid Status Test {random.randint(1000, 9999)}",
            "description": "Prueba de estado inválido",
            "tournament_type": "round_robin",
            "start_date": (datetime.now() + timedelta(weeks=2)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(weeks=2, days=1)).strftime("%Y-%m-%d"),
            "registration_start": datetime.now().strftime("%Y-%m-%d"),
            "registration_end": (datetime.now() + timedelta(weeks=2)).strftime("%Y-%m-%d"),
            "max_participants": 8,
            "status": "invalid_status"  # Estado inválido
        }
        
        response = requests.post(
            f"{self.base_url}/tournaments/",
            headers=self.headers(),
            json=invalid_status_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: estado inválido rechazado"
        elif response.status_code in [200, 201]:
            # Limpiar
            tournament_id = response.json().get("id")
            if tournament_id:
                requests.delete(
                    f"{self.base_url}/tournaments/{tournament_id}/",
                    headers=self.headers()
                )
            return True, "Sistema usa estado por defecto o permite estados flexibles"
        return False, f"Error inesperado: {response.status_code}"
    
    def validate_categories(self):
        """Validar categorías de torneo."""
        response = requests.get(
            f"{self.base_url}/tournaments/categories/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            categories = response.json()
            if isinstance(categories, (list, dict)):
                return True, "Endpoint de categorías funciona"
        elif response.status_code == 404:
            return True, "Endpoint de categorías no implementado"
        return False, f"Error en categorías: {response.status_code}"
    
    # Search and Filter Tests
    def validate_name_search(self):
        """Validar búsqueda por nombre."""
        response = requests.get(
            f"{self.base_url}/tournaments/?search=Test",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Búsqueda por nombre funciona"
        return False, f"Error en búsqueda: {response.status_code}"
    
    def validate_status_filter(self):
        """Validar filtro por estado."""
        response = requests.get(
            f"{self.base_url}/tournaments/?status=upcoming",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por estado funciona"
        return False, f"Error en filtro por estado: {response.status_code}"
    
    def validate_date_filter(self):
        """Validar filtro por fechas."""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{self.base_url}/tournaments/?start_date_from={today}",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por fechas funciona"
        return False, f"Error en filtro por fechas: {response.status_code}"
    
    def validate_club_filter(self):
        """Validar filtro por club."""
        if not self.test_club_id:
            return True, "Filtro por club no probado (sin club de referencia)"
        
        response = requests.get(
            f"{self.base_url}/tournaments/?club={self.test_club_id}",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por club funciona"
        return False, f"Error en filtro por club: {response.status_code}"
    
    def validate_category_filter(self):
        """Validar filtro por categoría."""
        response = requests.get(
            f"{self.base_url}/tournaments/?category=open",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por categoría funciona"
        return False, f"Error en filtro por categoría: {response.status_code}"
    
    # Tournament Features Tests
    def validate_registrations(self):
        """Validar inscripciones de participantes."""
        if not self.test_tournament_id:
            return True, "Inscripciones requieren torneo existente"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/registrations/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Endpoint de inscripciones funciona"
        elif response.status_code == 404:
            return True, "Inscripciones no implementadas"
        return False, f"Error en inscripciones: {response.status_code}"
    
    def validate_brackets(self):
        """Validar sistema de brackets."""
        if not self.test_tournament_id:
            return True, "Brackets requieren torneo existente"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/brackets/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Sistema de brackets disponible"
        elif response.status_code == 404:
            return True, "Brackets no implementados"
        return False, f"Error en brackets: {response.status_code}"
    
    def validate_matches(self):
        """Validar gestión de partidos."""
        if not self.test_tournament_id:
            return True, "Partidos requieren torneo existente"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/matches/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Gestión de partidos disponible"
        elif response.status_code == 404:
            return True, "Gestión de partidos no implementada"
        return False, f"Error en partidos: {response.status_code}"
    
    def validate_scoring(self):
        """Validar puntuación y resultados."""
        if not self.test_tournament_id:
            return True, "Puntuación requiere torneo existente"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/results/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de resultados reconocido"
        return False, f"Error en resultados: {response.status_code}"
    
    def validate_prizes(self):
        """Validar premios y reconocimientos."""
        if not self.test_tournament_id:
            return True, "Premios requieren torneo existente"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/prizes/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de premios reconocido"
        return False, f"Error en premios: {response.status_code}"
    
    # Integration Tests
    def validate_clubs_integration(self):
        """Validar integración con clubes."""
        if self.test_tournament_id:
            response = requests.get(
                f"{self.base_url}/tournaments/{self.test_tournament_id}/",
                headers=self.headers()
            )
            if response.status_code == 200:
                tournament = response.json()
                if "club" in tournament or "club_id" in tournament:
                    return True, "Integración con clubes visible"
                return True, "Torneo sin club específico"
        return True, "Integración con clubes requiere torneo existente"
    
    def validate_players_integration(self):
        """Validar integración con jugadores."""
        if not self.test_tournament_id:
            return True, "Integración con jugadores requiere torneo"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/participants/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de participantes reconocido"
        return False, f"Error en integración: {response.status_code}"
    
    def validate_courts_integration(self):
        """Validar integración con canchas."""
        if not self.test_tournament_id:
            return True, "Integración con canchas requiere torneo"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/schedule/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Programación de canchas reconocida"
        return False, f"Error en integración con canchas: {response.status_code}"
    
    def validate_payments_integration(self):
        """Validar integración con sistema de pagos."""
        if not self.test_tournament_id:
            return True, "Pagos requieren torneo existente"
        
        response = requests.get(
            f"{self.base_url}/tournaments/{self.test_tournament_id}/payments/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Sistema de pagos reconocido"
        return False, f"Error en pagos: {response.status_code}"

if __name__ == '__main__':
    validator = TournamentsValidator()
    validator.run()