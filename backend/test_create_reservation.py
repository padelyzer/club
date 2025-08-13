#!/usr/bin/env python3
"""
Script para probar la creación de reservas
"""

import requests
import json
from datetime import datetime, timedelta

# Configuración
API_BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "admin@padelyzer.com"  # Email del usuario
password="TEST_PASSWORD"  # Cambiar según tu contraseña

def get_auth_token():
    """Obtener token de autenticación"""
    url = f"{API_BASE_URL}/auth/login/"
    data = {
        "email": EMAIL,
        "password": PASSWORD
    }
    
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json().get("access")
    else:
        print(f"Error al autenticar: {response.status_code}")
        try:
            print(response.json())
        except:
            print(response.text)
        return None

def test_create_reservation(token):
    """Probar la creación de una reserva"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Primero obtener clubs y courts disponibles
    clubs_response = requests.get(f"{API_BASE_URL}/clubs/clubs/", headers=headers)
    if clubs_response.status_code != 200:
        print("Error al obtener clubs")
        return
    
    clubs = clubs_response.json().get("results", [])
    if not clubs:
        print("No hay clubs disponibles")
        return
    
    club = clubs[0]
    print(f"Usando club: {club['name']} (ID: {club['id']})")
    
    # Obtener courts del club
    courts_response = requests.get(f"{API_BASE_URL}/clubs/courts/?club={club['id']}", headers=headers)
    if courts_response.status_code != 200:
        print("Error al obtener courts")
        return
    
    courts = courts_response.json().get("results", [])
    if not courts:
        print("No hay courts disponibles")
        return
    
    court = courts[0]
    print(f"Usando court: {court['name']} (ID: {court['id']})")
    
    # Crear reserva para mañana
    tomorrow = datetime.now() + timedelta(days=1)
    
    reservation_data = {
        "club": club["id"],
        "court": court["id"],
        "date": tomorrow.strftime("%Y-%m-%d"),
        "start_time": "10:00",
        "end_time": "11:00",
        "player_name": "Juan Pérez",
        "player_email": "juan.perez@example.com",
        "player_phone": "+1234567890",
        "player_count": 4,
        "notes": "Reserva de prueba creada desde script"
    }
    
    print("\nDatos de la reserva a crear:")
    print(json.dumps(reservation_data, indent=2))
    
    # Crear la reserva
    create_response = requests.post(
        f"{API_BASE_URL}/reservations/reservations/",
        headers=headers,
        json=reservation_data
    )
    
    if create_response.status_code == 201:
        print("\n✅ Reserva creada exitosamente!")
        reservation = create_response.json()
        print(f"ID: {reservation['id']}")
        print(f"Fecha: {reservation['date']}")
        print(f"Hora: {reservation['start_time']} - {reservation['end_time']}")
        print(f"Cancha: {reservation['court_name']}")
        print(f"Cliente: {reservation['player_name']}")
        print(f"Estado: {reservation['status']}")
        print(f"Estado de pago: {reservation['payment_status']}")
        print(f"Precio total: ${reservation['total_price']}")
        return reservation
    else:
        print(f"\n❌ Error al crear reserva: {create_response.status_code}")
        print(create_response.json())
        return None

def test_check_availability(token, club_id, date):
    """Probar disponibilidad de canchas"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "club": club_id,
        "date": date
    }
    
    response = requests.post(
        f"{API_BASE_URL}/reservations/reservations/check_availability/",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        print("\n📅 Disponibilidad de canchas:")
        availability = response.json()
        for court_data in availability["availability"]:
            court = court_data["court"]
            print(f"\nCancha: {court['name']} (${court['price_per_hour']}/hora)")
            available_slots = [slot for slot in court_data["slots"] if slot["is_available"]]
            print(f"Horarios disponibles: {len(available_slots)}")
            if available_slots[:3]:  # Mostrar primeros 3 slots disponibles
                for slot in available_slots[:3]:
                    print(f"  - {slot['start_time']} - {slot['end_time']}")
    else:
        print(f"Error al verificar disponibilidad: {response.status_code}")
        print(response.json())

def main():
    print("=== Prueba de creación de reservas ===\n")
    
    # Obtener token
    print("1. Obteniendo token de autenticación...")
    token = get_auth_token()
    if not token:
        print("No se pudo obtener token. Verifica las credenciales.")
        return
    
    print("✅ Token obtenido exitosamente")
    
    # Probar creación de reserva
    print("\n2. Creando nueva reserva...")
    reservation = test_create_reservation(token)
    
    if reservation:
        # Verificar disponibilidad después de crear
        print("\n3. Verificando disponibilidad actualizada...")
        test_check_availability(token, reservation["club"], reservation["date"])

if __name__ == "__main__":
    main()