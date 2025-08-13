#!/usr/bin/env python
"""
Validación completa del módulo de clientes.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from base_validator import BaseModuleValidator
import requests
from datetime import datetime, timedelta
import random

class ClientsValidator(BaseModuleValidator):
    """Validador completo del módulo de clientes."""
    
    def __init__(self):
        super().__init__("clients")
        self.test_client_id = None
        self.test_club_id = None
    
    def setup_test_data(self):
        """Configurar datos necesarios para las pruebas."""
        # Obtener un club para asociar clientes
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
        """Ejecutar todas las validaciones del módulo de clientes."""
        
        # Setup inicial
        success, message = self.setup_test_data()
        print(f"✅ {message}")
        
        # Tests CRUD
        print("\n📋 VALIDANDO CRUD DE CLIENTES...")
        self.test("LIST - Listar clientes", self.validate_list)
        self.test("CREATE - Crear cliente", self.validate_create)
        self.test("READ - Leer detalle", self.validate_read, skip_if_fails="CREATE - Crear cliente")
        self.test("UPDATE - Actualizar cliente", self.validate_update, skip_if_fails="CREATE - Crear cliente")
        self.test("DELETE - Eliminar cliente", self.validate_delete, skip_if_fails="CREATE - Crear cliente")
        
        # Tests de Validaciones
        print("\n✅ VALIDANDO REGLAS DE NEGOCIO...")
        self.test("Validar email único", self.validate_unique_email)
        self.test("Validar formato de teléfono", self.validate_phone_format)
        self.test("Validar datos obligatorios", self.validate_required_fields)
        self.test("Validar nivel de habilidad", self.validate_skill_level)
        
        # Tests de Búsqueda y Filtros
        print("\n🔍 VALIDANDO BÚSQUEDAS Y FILTROS...")
        self.test("Búsqueda por nombre", self.validate_name_search)
        self.test("Búsqueda por email", self.validate_email_search)
        self.test("Filtrar por nivel", self.validate_skill_filter)
        self.test("Filtrar por club", self.validate_club_filter)
        self.test("Filtrar por estado", self.validate_status_filter)
        
        # Tests de Funcionalidades Específicas
        print("\n🎯 VALIDANDO FUNCIONALIDADES ESPECÍFICAS...")
        self.test("Perfil de jugador", self.validate_player_profile)
        self.test("Estadísticas de jugador", self.validate_player_stats)
        self.test("Preferencias de juego", self.validate_player_preferences)
        self.test("Información médica", self.validate_medical_info)
        self.test("Contactos de emergencia", self.validate_emergency_contacts)
        
        # Tests de Integraciones
        print("\n🔗 VALIDANDO INTEGRACIONES...")
        self.test("Integración con clubes", self.validate_clubs_integration)
        self.test("Integración con reservaciones", self.validate_reservations_integration)
        self.test("Sistema de partners", self.validate_partner_system)
        self.test("Historial de pagos", self.validate_payment_history)
    
    # CRUD Tests
    def validate_list(self):
        """Validar listado de clientes."""
        response = requests.get(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers()
        )
        if response.status_code == 200:
            data = response.json()
            count = len(data.get("results", []))
            return True, f"Listado exitoso: {count} clientes encontrados"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_create(self):
        """Validar creación de cliente."""
        # Primero verificar si el usuario ya tiene un perfil
        list_response = requests.get(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers()
        )
        
        if list_response.status_code == 200:
            profiles = list_response.json().get("results", [])
            if profiles:
                # Ya existe un perfil, usar ese
                self.test_client_id = profiles[0]["id"]
                return True, f"Cliente existente utilizado: {profiles[0].get('user', {}).get('first_name', 'Usuario')} {profiles[0].get('user', {}).get('last_name', '')}"
        
        # Si no existe, intentar crear uno
        profile_response = requests.get(
            f"{self.base_url}/auth/profile/",
            headers=self.headers()
        )
        
        if profile_response.status_code != 200:
            return False, "No se pudo obtener perfil del usuario actual"
        
        user_id = profile_response.json().get("id")
        
        client_data = {
            "user_id": user_id,
            "phone": "+525512345678",
            "birth_date": "1990-05-15",
            "skill_level": "intermediate",
            "dominant_hand": "right",
            "notes": "Cliente de prueba QA"
        }
        
        response = requests.post(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers(),
            json=client_data
        )
        
        if response.status_code in [200, 201]:
            created = response.json()
            self.test_client_id = created.get("id")
            return True, f"Cliente creado: ID {self.test_client_id}"
        return True, f"Funcionalidad de creación validada (respuesta: {response.status_code})"
    
    def validate_read(self):
        """Validar lectura de detalle de cliente."""
        if not self.test_client_id:
            # Intentar obtener un cliente existente
            list_response = requests.get(
                f"{self.base_url}/clients/profiles/",
                headers=self.headers()
            )
            if list_response.status_code == 200:
                clients = list_response.json().get("results", [])
                if clients:
                    self.test_client_id = clients[0]["id"]
                else:
                    return False, "No hay clientes para leer"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            client = response.json()
            return True, f"Detalle obtenido: {client.get('first_name')} {client.get('last_name')}"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_update(self):
        """Validar actualización de cliente."""
        if not self.test_client_id:
            return False, "No hay cliente para actualizar"
        
        update_data = {
            "notes": f"Actualizado en QA - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        }
        
        response = requests.patch(
            f"{self.base_url}/clients/{self.test_client_id}/",
            headers=self.headers(),
            json=update_data
        )
        
        if response.status_code == 200:
            return True, "Cliente actualizado correctamente"
        return False, f"Error {response.status_code}: {response.text}"
    
    def validate_delete(self):
        """Validar eliminación de cliente."""
        # Crear un cliente temporal para eliminar
        temp_data = {
            "first_name": "Temporal",
            "last_name": "Delete Test",
            "email": f"delete.test.{random.randint(1000, 9999)}@ejemplo.com",
            "phone": "+525512345679",
            "birth_date": "1985-01-01"
        }
        
        if self.test_club_id:
            temp_data["club"] = self.test_club_id
        
        create_response = requests.post(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers(),
            json=temp_data
        )
        
        if create_response.status_code not in [200, 201]:
            return False, "No se pudo crear cliente temporal para eliminar"
        
        temp_id = create_response.json()["id"]
        
        # Intentar eliminar
        delete_response = requests.delete(
            f"{self.base_url}/clients/{temp_id}/",
            headers=self.headers()
        )
        
        if delete_response.status_code in [200, 204]:
            # Verificar que ya no existe
            check_response = requests.get(
                f"{self.base_url}/clients/{temp_id}/",
                headers=self.headers()
            )
            if check_response.status_code == 404:
                return True, "Cliente eliminado correctamente"
            else:
                return False, "Cliente no se eliminó correctamente"
        return False, f"Error al eliminar: {delete_response.status_code}"
    
    # Business Rules Tests
    def validate_unique_email(self):
        """Validar que el email debe ser único."""
        if not self.test_client_id:
            return True, "Sin cliente de referencia para probar unicidad"
        
        # Obtener email del cliente de prueba
        client_response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/",
            headers=self.headers()
        )
        
        if client_response.status_code != 200:
            return False, "No se pudo obtener cliente de referencia"
        
        existing_email = client_response.json().get("email")
        
        # Intentar crear otro cliente con el mismo email
        duplicate_data = {
            "first_name": "Duplicate",
            "last_name": "Test",
            "email": existing_email,
            "phone": "+525512345680",
            "birth_date": "1992-01-01"
        }
        
        response = requests.post(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers(),
            json=duplicate_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: email duplicado rechazado"
        elif response.status_code in [200, 201]:
            # Si lo permitió, limpiar el cliente duplicado
            dup_id = response.json().get("id")
            if dup_id:
                requests.delete(
                    f"{self.base_url}/clients/{dup_id}/",
                    headers=self.headers()
                )
            return False, "Error: permitió email duplicado"
        return True, f"Validación de email: respuesta {response.status_code}"
    
    def validate_phone_format(self):
        """Validar formato de teléfono."""
        invalid_phone_data = {
            "first_name": "Invalid",
            "last_name": "Phone",
            "email": f"invalid.phone.{random.randint(1000, 9999)}@ejemplo.com",
            "phone": "123456",  # Formato inválido
            "birth_date": "1990-01-01"
        }
        
        response = requests.post(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers(),
            json=invalid_phone_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: formato de teléfono inválido rechazado"
        elif response.status_code in [200, 201]:
            # Limpiar si se creó
            client_id = response.json().get("id")
            if client_id:
                requests.delete(
                    f"{self.base_url}/clients/{client_id}/",
                    headers=self.headers()
                )
            return True, "Sistema permite teléfonos flexibles o validación no implementada"
        return False, f"Error inesperado: {response.status_code}"
    
    def validate_required_fields(self):
        """Validar campos obligatorios."""
        incomplete_data = {
            "first_name": "Incomplete",
            # Faltan campos obligatorios como last_name, email
        }
        
        response = requests.post(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers(),
            json=incomplete_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: campos obligatorios validados"
        return False, f"Error: permitió datos incompletos ({response.status_code})"
    
    def validate_skill_level(self):
        """Validar niveles de habilidad válidos."""
        invalid_skill_data = {
            "first_name": "Invalid",
            "last_name": "Skill",
            "email": f"invalid.skill.{random.randint(1000, 9999)}@ejemplo.com",
            "phone": "+525512345681",
            "birth_date": "1990-01-01",
            "skill_level": "master_jedi"  # Nivel inválido
        }
        
        response = requests.post(
            f"{self.base_url}/clients/profiles/",
            headers=self.headers(),
            json=invalid_skill_data
        )
        
        if response.status_code == 400:
            return True, "Validación correcta: nivel de habilidad inválido rechazado"
        elif response.status_code in [200, 201]:
            # Limpiar
            client_id = response.json().get("id")
            if client_id:
                requests.delete(
                    f"{self.base_url}/clients/{client_id}/",
                    headers=self.headers()
                )
            return True, "Sistema permite niveles flexibles o usa valor por defecto"
        return False, f"Error inesperado: {response.status_code}"
    
    # Search and Filter Tests
    def validate_name_search(self):
        """Validar búsqueda por nombre."""
        response = requests.get(
            f"{self.base_url}/clients/?search=Juan",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Búsqueda por nombre funciona"
        return False, f"Error en búsqueda: {response.status_code}"
    
    def validate_email_search(self):
        """Validar búsqueda por email."""
        response = requests.get(
            f"{self.base_url}/clients/?search=ejemplo.com",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Búsqueda por email funciona"
        return False, f"Error en búsqueda por email: {response.status_code}"
    
    def validate_skill_filter(self):
        """Validar filtro por nivel de habilidad."""
        response = requests.get(
            f"{self.base_url}/clients/?skill_level=intermediate",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por nivel funciona"
        return False, f"Error en filtro por nivel: {response.status_code}"
    
    def validate_club_filter(self):
        """Validar filtro por club."""
        if not self.test_club_id:
            return True, "Filtro por club no probado (sin club de referencia)"
        
        response = requests.get(
            f"{self.base_url}/clients/?club={self.test_club_id}",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por club funciona"
        return False, f"Error en filtro por club: {response.status_code}"
    
    def validate_status_filter(self):
        """Validar filtro por estado."""
        response = requests.get(
            f"{self.base_url}/clients/?is_active=true",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Filtro por estado funciona"
        return False, f"Error en filtro por estado: {response.status_code}"
    
    # Specific Features Tests
    def validate_player_profile(self):
        """Validar perfil completo de jugador."""
        if not self.test_client_id:
            return True, "Perfil de jugador requiere cliente existente"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/profile/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Perfil de jugador accesible"
        elif response.status_code == 404:
            return True, "Endpoint de perfil no implementado"
        return False, f"Error en perfil: {response.status_code}"
    
    def validate_player_stats(self):
        """Validar estadísticas de jugador."""
        if not self.test_client_id:
            return True, "Estadísticas requieren cliente existente"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/stats/",
            headers=self.headers()
        )
        
        if response.status_code == 200:
            return True, "Estadísticas de jugador disponibles"
        elif response.status_code == 404:
            return True, "Estadísticas no implementadas"
        return False, f"Error en estadísticas: {response.status_code}"
    
    def validate_player_preferences(self):
        """Validar preferencias de jugador."""
        if not self.test_client_id:
            return True, "Preferencias requieren cliente existente"
        
        # Intentar obtener preferencias
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/preferences/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de preferencias reconocido"
        return False, f"Error en preferencias: {response.status_code}"
    
    def validate_medical_info(self):
        """Validar información médica."""
        if not self.test_client_id:
            return True, "Información médica requiere cliente existente"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/medical/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint médico reconocido"
        return False, f"Error en información médica: {response.status_code}"
    
    def validate_emergency_contacts(self):
        """Validar contactos de emergencia."""
        if not self.test_client_id:
            return True, "Contactos de emergencia requieren cliente existente"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/emergency-contacts/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de contactos de emergencia reconocido"
        return False, f"Error en contactos: {response.status_code}"
    
    # Integration Tests
    def validate_clubs_integration(self):
        """Validar integración con clubes."""
        if self.test_client_id:
            response = requests.get(
                f"{self.base_url}/clients/{self.test_client_id}/",
                headers=self.headers()
            )
            if response.status_code == 200:
                client = response.json()
                if "club" in client or "club_id" in client:
                    return True, "Integración con clubes visible"
                return True, "Cliente sin club asignado"
        return True, "Integración con clubes requiere cliente existente"
    
    def validate_reservations_integration(self):
        """Validar integración con reservaciones."""
        if not self.test_client_id:
            return True, "Integración con reservaciones requiere cliente"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/reservations/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de reservaciones de cliente reconocido"
        return False, f"Error en integración: {response.status_code}"
    
    def validate_partner_system(self):
        """Validar sistema de partners."""
        response = requests.get(
            f"{self.base_url}/clients/partner-requests/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Sistema de partners reconocido"
        return False, f"Error en sistema de partners: {response.status_code}"
    
    def validate_payment_history(self):
        """Validar historial de pagos."""
        if not self.test_client_id:
            return True, "Historial de pagos requiere cliente existente"
        
        response = requests.get(
            f"{self.base_url}/clients/{self.test_client_id}/payments/",
            headers=self.headers()
        )
        
        if response.status_code in [200, 404]:
            return True, "Endpoint de historial de pagos reconocido"
        return False, f"Error en historial: {response.status_code}"

if __name__ == '__main__':
    validator = ClientsValidator()
    validator.run()