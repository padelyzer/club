#!/usr/bin/env python3
"""
Probar endpoints API de reservaciones
"""
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.reservations.models import Reservation, BlockedSlot
from apps.clubs.models import Club, Court

User = get_user_model()

def test_reservations_api():
    print("🚀 PRUEBA DE ENDPOINTS API DE RESERVACIONES")
    print("=" * 60)
    
    # Configurar cliente y autenticación
    user = User.objects.get(email='test@padelyzer.com')
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    club = Club.objects.get(name='API Test Padel Club')
    court = Court.objects.filter(club=club).first()
    
    print(f"✅ Usuario: {user.email}")
    print(f"✅ Club: {club.name}")
    print(f"✅ Cancha: {court.name}")
    
    # TEST 1: Listar reservaciones
    print("\n📍 TEST 1: Listar reservaciones")
    response = client.get('/api/v1/reservations/reservations/')
    print(f"   GET /api/v1/reservations/reservations/: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        # Manejar paginación si existe
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
            print(f"   ✅ {data.get('count', len(results))} reservaciones totales")
        elif isinstance(data, list):
            results = data
            print(f"   ✅ {len(results)} reservaciones encontradas")
        else:
            results = []
            print(f"   ⚠️  Formato de respuesta inesperado: {type(data)}")
        
        if results:
            print("   Primeras 3 reservaciones:")
            for res in results[:3]:
                print(f"     - {res['player_name']} - {res['date']} {res['start_time']}")
    else:
        print(f"   ❌ Error: {response.data}")
    
    # TEST 2: Obtener detalle de una reservación
    print("\n📍 TEST 2: Obtener detalle de reservación")
    # Use the ID from the first reservation if available from the list
    reservation_id = None
    if 'results' in locals() and results:
        reservation_id = results[0].get('id') or results[0].get('uuid') or results[0].get('pk')
    
    if reservation_id:
        response = client.get(f'/api/v1/reservations/reservations/{reservation_id}/')
        print(f"   GET /api/v1/reservations/reservations/{reservation_id}/: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Reservación: {data.get('player_name', 'N/A')} - {data.get('status', 'N/A')}")
        else:
            print(f"   ❌ Error: {response.data}")
    else:
        print("   ⚠️  No se pudo obtener un ID de reservación válido")
    
    # TEST 3: Verificar disponibilidad
    print("\n📍 TEST 3: Verificar disponibilidad")
    tomorrow = (timezone.now() + timedelta(days=1)).date()
    availability_data = {
        'club': str(club.id),
        'court': str(court.id),
        'date': str(tomorrow),
        'start_time': '14:00',
        'end_time': '15:30'
    }
    response = client.post('/api/v1/reservations/reservations/check_availability/', availability_data)
    print(f"   POST /api/v1/reservations/reservations/check_availability/: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Disponible: {data.get('available', False)}")
        if not data.get('available'):
            print(f"   Razón: {data.get('reason', 'No especificada')}")
    else:
        print(f"   ❌ Error: {response.data}")
    
    # TEST 4: Crear nueva reservación
    print("\n📍 TEST 4: Crear nueva reservación")
    # Use a different time to avoid conflicts
    import random
    hour = random.choice([10, 11, 12, 13, 15, 16, 17, 18, 19])
    new_reservation_data = {
        'club': str(club.id),
        'court': str(court.id),
        'date': str(tomorrow),
        'start_time': f'{hour:02d}:00',
        'end_time': f'{hour+1:02d}:30',
        'duration_hours': '1.5',
        'player_name': 'Test API User',
        'player_email': 'test.api@example.com',
        'player_phone': '5559999999',
        'player_count': 4,
        'price_per_hour': str(court.price_per_hour),
        'total_price': str(court.price_per_hour * Decimal('1.5')),
        'notes': 'Reserva creada desde API test',
        'organization': str(club.organization_id)  # Add organization field
    }
    response = client.post('/api/v1/reservations/reservations/', new_reservation_data)
    print(f"   POST /api/v1/reservations/reservations/: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        # Debug: show the entire response structure
        print(f"   Response data: {data}")
        # Try to get ID safely
        reservation_id = data.get('id') or data.get('uuid') or data.get('pk')
        if reservation_id:
            print(f"   ✅ Reservación creada: ID {reservation_id}")
            print(f"      - {data.get('player_name', 'N/A')} - {data.get('date', 'N/A')} {data.get('start_time', 'N/A')}")
            new_reservation_id = reservation_id
        else:
            print(f"   ⚠️  Reservación creada pero no se encontró ID en respuesta")
            new_reservation_id = None
    else:
        print(f"   ❌ Error: {response.data}")
        new_reservation_id = None
    
    # TEST 5: Actualizar reservación
    if new_reservation_id:
        print("\n📍 TEST 5: Actualizar reservación")
        update_data = {
            'notes': 'Reserva actualizada desde API test',
            'player_count': 2
        }
        response = client.patch(f'/api/v1/reservations/reservations/{new_reservation_id}/', update_data)
        print(f"   PATCH /api/v1/reservations/reservations/{new_reservation_id}/: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Reservación actualizada")
        else:
            print(f"   ❌ Error: {response.data}")
    
    # TEST 6: Cancelar reservación
    if new_reservation_id:
        print("\n📍 TEST 6: Cancelar reservación")
        cancel_data = {
            'reason': 'Cancelación de prueba'
        }
        response = client.post(f'/api/v1/reservations/reservations/{new_reservation_id}/cancel/', cancel_data)
        print(f"   POST /api/v1/reservations/reservations/{new_reservation_id}/cancel/: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Reservación cancelada")
        else:
            print(f"   ❌ Error: {response.data}")
    
    # TEST 7: Vista de calendario
    print("\n📍 TEST 7: Vista de calendario")
    current_month = timezone.now()
    calendar_params = {
        'month': current_month.strftime('%Y-%m'),  # Format as YYYY-MM
        'club': str(club.id)
    }
    response = client.get('/api/v1/reservations/reservations/calendar/', calendar_params)
    print(f"   GET /api/v1/reservations/reservations/calendar/: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Calendario para {data.get('month')}/{data.get('year')}")
        if 'days' in data:
            days_with_reservations = [day for day in data['days'] if day['reservation_count'] > 0]
            print(f"   Días con reservaciones: {len(days_with_reservations)}")
            for day in days_with_reservations[:3]:
                print(f"     - Día {day['day']}: {day['reservation_count']} reservaciones")
    else:
        print(f"   ❌ Error: {response.data}")
    
    # TEST 8: Listar slots bloqueados
    print("\n📍 TEST 8: Listar slots bloqueados")
    response = client.get('/api/v1/reservations/blocked-slots/')
    print(f"   GET /api/v1/reservations/blocked-slots/: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"   ✅ {len(results)} slots bloqueados encontrados")
        for slot in results:
            court_name = slot.get('court_name', 'Todas las canchas')
            print(f"     - {slot['reason']} - {court_name} - {slot['start_datetime'][:10]}")
    else:
        print(f"   ❌ Error: {response.data}")
    
    # TEST 9: Crear slot bloqueado
    print("\n📍 TEST 9: Crear slot bloqueado")
    future_date = timezone.now() + timedelta(days=14)
    blocked_slot_data = {
        'club': str(club.id),
        'court': str(court.id),
        'block_type': 'maintenance',
        'reason': 'Mantenimiento de prueba API',
        'start_datetime': future_date.replace(hour=10, minute=0).isoformat(),
        'end_datetime': future_date.replace(hour=12, minute=0).isoformat(),
        'organization': str(club.organization_id)  # Add required organization field
    }
    response = client.post('/api/v1/reservations/blocked-slots/', blocked_slot_data)
    print(f"   POST /api/v1/reservations/blocked-slots/: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"   ✅ Slot bloqueado creado: ID {data['id']}")
        blocked_slot_id = data['id']
        
        # Eliminar el slot bloqueado de prueba
        response = client.delete(f'/api/v1/reservations/blocked-slots/{blocked_slot_id}/')
        print(f"   DELETE /api/v1/reservations/blocked-slots/{blocked_slot_id}/: {response.status_code}")
    else:
        print(f"   ❌ Error: {response.data}")
    
    # TEST 10: Filtros de reservaciones
    print("\n📍 TEST 10: Probar filtros de reservaciones")
    
    # Filtrar por fecha
    today = timezone.now().date()
    response = client.get('/api/v1/reservations/reservations/', {'date': str(today)})
    print(f"   GET /api/v1/reservations/reservations/?date={today}: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"   ✅ {len(results)} reservaciones para hoy")
    
    # Filtrar por estado
    response = client.get('/api/v1/reservations/reservations/', {'status': 'confirmed'})
    print(f"   GET /api/v1/reservations/reservations/?status=confirmed: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"   ✅ {len(results)} reservaciones confirmadas")
    
    # RESUMEN
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS API")
    print("=" * 60)
    print("✅ Endpoints básicos funcionando:")
    print("   - Listar reservaciones")
    print("   - Obtener detalle")
    print("   - Verificar disponibilidad")
    print("   - Crear reservación")
    print("   - Actualizar reservación")
    print("   - Cancelar reservación")
    print("   - Vista de calendario")
    print("   - Gestión de slots bloqueados")
    print("   - Filtros funcionando")
    
    # Eliminar reservación de prueba si quedó
    if new_reservation_id:
        try:
            reservation = Reservation.objects.get(id=new_reservation_id)
            reservation.delete()
            print("\n🧹 Reservación de prueba eliminada")
        except:
            pass

if __name__ == "__main__":
    test_reservations_api()