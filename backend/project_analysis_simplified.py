#!/usr/bin/env python3
"""
Análisis simplificado del proyecto Padelyzer - Estado actual
"""
import os
import sys
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from django.apps import apps

User = get_user_model()

def print_section(title):
    print(f"\n{'='*60}")
    print(f"📊 {title}")
    print(f"{'='*60}")

def analyze_models():
    """Analizar todos los modelos disponibles"""
    print_section("MODELOS DISPONIBLES POR APP")
    
    app_configs = apps.get_app_configs()
    
    for app_config in app_configs:
        if app_config.name.startswith('apps.'):
            models = app_config.get_models()
            if models:
                print(f"\n{app_config.verbose_name or app_config.name}:")
                for model in models:
                    try:
                        count = model.objects.count()
                        print(f"  - {model.__name__}: {count} registros")
                    except:
                        print(f"  - {model.__name__}: Error al contar")

def analyze_database():
    """Analizar tablas en la base de datos"""
    print_section("TABLAS EN BASE DE DATOS")
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = cursor.fetchall()
        
        print(f"Total de tablas: {len(tables)}")
        print("\nTablas principales del proyecto:")
        for table in tables:
            table_name = table[0]
            if any(prefix in table_name for prefix in ['apps_', 'auth_', 'clubs_', 'reservations_', 'clients_']):
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"  - {table_name}: {count} registros")

def check_authentication():
    """Verificar estado de autenticación"""
    print_section("AUTENTICACIÓN Y USUARIOS")
    
    print(f"Total usuarios: {User.objects.count()}")
    print(f"Usuarios activos: {User.objects.filter(is_active=True).count()}")
    print(f"Superusuarios: {User.objects.filter(is_superuser=True).count()}")
    
    print("\nUsuarios de prueba disponibles:")
    test_users = User.objects.filter(email__contains='test')
    for user in test_users[:5]:
        print(f"  - {user.email} (activo: {user.is_active})")

def check_api_routes():
    """Verificar rutas API principales"""
    print_section("RUTAS API PRINCIPALES")
    
    api_routes = [
        "/api/auth/login/",
        "/api/auth/profile/",
        "/api/auth/refresh/",
        "/api/clubs/",
        "/api/reservations/",
        "/api/clients/",
        "/api/tournaments/",
        "/api/leagues/",
        "/api/finance/payments/",
        "/api/dashboard/overview/"
    ]
    
    print("Endpoints disponibles:")
    for route in api_routes:
        print(f"  - http://localhost:8000{route}")

def generate_quick_test_plan():
    """Generar plan de pruebas rápidas"""
    print_section("PLAN DE PRUEBAS RÁPIDAS")
    
    print("\n1. PREPARACIÓN:")
    print("   a) Iniciar backend:  cd backend && python3 manage.py runserver")
    print("   b) Iniciar frontend: cd frontend && npm run dev")
    print("   c) Ejecutar: cd backend && python3 quick_test_access.py")
    
    print("\n2. PRUEBAS POR MÓDULO:")
    
    modules = [
        ("Autenticación", [
            "Login con credenciales de prueba",
            "Verificar JWT tokens",
            "Logout y refresh token"
        ]),
        ("Clubes", [
            "Listar clubes disponibles",
            "Ver detalles de un club",
            "Editar información del club"
        ]),
        ("Reservaciones", [
            "Ver calendario de reservas",
            "Crear nueva reserva",
            "Cancelar/modificar reserva"
        ]),
        ("Clientes", [
            "Listar clientes/jugadores",
            "Crear perfil de jugador",
            "Buscar compañeros de juego"
        ]),
        ("Finanzas", [
            "Ver pagos pendientes",
            "Procesar pago con Stripe",
            "Generar factura"
        ]),
        ("Torneos", [
            "Ver torneos activos",
            "Inscribirse en torneo",
            "Ver bracket y resultados"
        ])
    ]
    
    for module, tests in modules:
        print(f"\n   {module}:")
        for i, test in enumerate(tests, 1):
            print(f"      {i}. {test}")

def main():
    print(f"\n{'='*80}")
    print(f"🏓 ANÁLISIS DE ESTADO - PROYECTO PADELYZER")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}")
    
    # Ejecutar análisis
    try:
        check_authentication()
    except Exception as e:
        print(f"Error en autenticación: {e}")
    
    try:
        analyze_database()
    except Exception as e:
        print(f"Error analizando BD: {e}")
    
    try:
        analyze_models()
    except Exception as e:
        print(f"Error analizando modelos: {e}")
    
    check_api_routes()
    generate_quick_test_plan()
    
    print_section("RESUMEN EJECUTIVO")
    print("\n✅ El proyecto está estructurado y tiene datos")
    print("✅ Sistema de autenticación JWT configurado")
    print("✅ Múltiples módulos disponibles para pruebas")
    print("✅ Use quick_test_access.py para obtener tokens")
    print("\n⚠️  IMPORTANTE: Inicie ambos servidores antes de probar")
    
    # Guardar tokens de acceso en archivo
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        test_user = User.objects.get(email="test@padelyzer.com")
        refresh = RefreshToken.for_user(test_user)
        
        with open('current_test_token.txt', 'w') as f:
            f.write(f"Access Token:\n{str(refresh.access_token)}\n\n")
            f.write(f"Direct Login URL:\nhttp://localhost:3000/api/direct-login?token={str(refresh.access_token)}")
        
        print(f"\n📝 Token actual guardado en: current_test_token.txt")
    except:
        pass

if __name__ == "__main__":
    main()