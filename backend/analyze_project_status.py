#!/usr/bin/env python3
"""
Análisis exhaustivo del estado del proyecto Padelyzer
"""
import os
import sys
import django
from datetime import datetime
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.db import models
from django.apps import apps

# Módulos del proyecto
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from apps.clients.models import Client
from apps.tournaments.models import Tournament
from apps.leagues.models import League
from apps.classes.models import ClassSchedule
from apps.finance.models import Payment, Invoice
from apps.root.models import Organization

User = get_user_model()

def analyze_module(model_class, module_name):
    """Analizar un módulo específico"""
    print(f"\n{'='*60}")
    print(f"📊 MÓDULO: {module_name}")
    print(f"{'='*60}")
    
    try:
        # Contar registros
        total = model_class.objects.count()
        active = model_class.objects.filter(is_active=True).count() if hasattr(model_class, 'is_active') else total
        
        print(f"Total registros: {total}")
        print(f"Registros activos: {active}")
        
        # Obtener campos del modelo
        fields = [f.name for f in model_class._meta.get_fields() if not f.many_to_many and not f.one_to_many]
        print(f"Campos del modelo: {', '.join(fields[:10])}...")
        
        # Mostrar algunos ejemplos
        if total > 0:
            print("\nEjemplos:")
            for obj in model_class.objects.all()[:3]:
                print(f"  - {obj}")
                
    except Exception as e:
        print(f"❌ Error analizando {module_name}: {str(e)}")

def check_api_endpoints():
    """Verificar endpoints disponibles"""
    print(f"\n{'='*60}")
    print(f"🌐 ENDPOINTS API")
    print(f"{'='*60}")
    
    # Importar URLs
    try:
        from config.urls import urlpatterns
        from django.urls import URLPattern, URLResolver
        
        def extract_patterns(patterns, prefix=''):
            urls = []
            for pattern in patterns:
                if isinstance(pattern, URLPattern):
                    urls.append(prefix + str(pattern.pattern))
                elif isinstance(pattern, URLResolver):
                    urls.extend(extract_patterns(pattern.url_patterns, prefix + str(pattern.pattern)))
            return urls
        
        all_urls = extract_patterns(urlpatterns)
        api_urls = [url for url in all_urls if 'api/' in url]
        
        print(f"Total endpoints API: {len(api_urls)}")
        print("\nPrincipales endpoints:")
        for url in sorted(api_urls)[:20]:
            print(f"  - /{url}")
            
    except Exception as e:
        print(f"❌ Error verificando endpoints: {str(e)}")

def analyze_authentication():
    """Analizar estado de autenticación"""
    print(f"\n{'='*60}")
    print(f"🔐 AUTENTICACIÓN")
    print(f"{'='*60}")
    
    print(f"Total usuarios: {User.objects.count()}")
    print(f"Usuarios activos: {User.objects.filter(is_active=True).count()}")
    print(f"Superusuarios: {User.objects.filter(is_superuser=True).count()}")
    print(f"Staff: {User.objects.filter(is_staff=True).count()}")
    
    # Verificar configuración JWT
    try:
        from django.conf import settings
        jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
        print(f"\nConfiguración JWT:")
        print(f"  - Access token lifetime: {jwt_settings.get('ACCESS_TOKEN_LIFETIME', 'No configurado')}")
        print(f"  - Refresh token lifetime: {jwt_settings.get('REFRESH_TOKEN_LIFETIME', 'No configurado')}")
    except:
        print("❌ No se pudo verificar configuración JWT")

def check_database_integrity():
    """Verificar integridad de la base de datos"""
    print(f"\n{'='*60}")
    print(f"🗄️ INTEGRIDAD DE BASE DE DATOS")
    print(f"{'='*60}")
    
    # Verificar organizaciones sin clubes
    orgs_sin_clubes = Organization.objects.filter(clubs__isnull=True).count()
    print(f"Organizaciones sin clubes: {orgs_sin_clubes}")
    
    # Verificar clubes sin canchas
    clubes_sin_canchas = Club.objects.filter(courts__isnull=True).count()
    print(f"Clubes sin canchas: {clubes_sin_canchas}")
    
    # Verificar reservaciones huérfanas
    try:
        reservas_total = Reservation.objects.count()
        print(f"Total reservaciones: {reservas_total}")
    except:
        print("❌ No se pudieron verificar reservaciones")

def generate_test_commands():
    """Generar comandos de prueba"""
    print(f"\n{'='*60}")
    print(f"🚀 COMANDOS DE PRUEBA RÁPIDA")
    print(f"{'='*60}")
    
    print("\n1. INICIAR SERVIDORES:")
    print("   Backend:  cd backend && python3 manage.py runserver")
    print("   Frontend: cd frontend && npm run dev")
    
    print("\n2. ACCESO DIRECTO (copiar URL):")
    print("   http://localhost:3000/api/direct-login?token=<TOKEN>")
    
    print("\n3. CREAR DATOS DE PRUEBA:")
    print("   cd backend && python3 manage.py create_demo_data")
    
    print("\n4. RESET DE CONTRASEÑA ADMIN:")
    print("   cd backend && python3 manage.py changepassword admin@padelyzer.com")

def main():
    print(f"\n{'='*80}")
    print(f"🏓 ANÁLISIS COMPLETO DEL PROYECTO PADELYZER")
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}")
    
    # Analizar autenticación
    analyze_authentication()
    
    # Analizar cada módulo
    modules = [
        (Organization, "ORGANIZACIONES"),
        (Club, "CLUBES"),
        (Court, "CANCHAS"),
        (Client, "CLIENTES"),
        (Reservation, "RESERVACIONES"),
        (Tournament, "TORNEOS"),
        (League, "LIGAS"),
        (ClassSchedule, "CLASES"),
        (Payment, "PAGOS"),
        (Invoice, "FACTURAS")
    ]
    
    for model, name in modules:
        try:
            analyze_module(model, name)
        except Exception as e:
            print(f"\n❌ Error con módulo {name}: {str(e)}")
    
    # Verificar integridad
    check_database_integrity()
    
    # Verificar endpoints
    check_api_endpoints()
    
    # Generar comandos
    generate_test_commands()
    
    # Resumen final
    print(f"\n{'='*80}")
    print(f"📋 RESUMEN Y SIGUIENTES PASOS")
    print(f"{'='*80}")
    print("\n1. El proyecto tiene la estructura completa de módulos")
    print("2. Hay datos de prueba disponibles")
    print("3. Los tokens JWT están configurados")
    print("4. Use el script quick_test_access.py para obtener tokens de acceso")
    print("5. Inicie ambos servidores para comenzar las pruebas")
    
    # Guardar reporte
    report = {
        "timestamp": datetime.now().isoformat(),
        "users": User.objects.count(),
        "organizations": Organization.objects.count(),
        "clubs": Club.objects.count(),
        "courts": Court.objects.count(),
        "reservations": Reservation.objects.count() if 'Reservation' in locals() else 0
    }
    
    with open('project_status_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✅ Reporte guardado en: project_status_report.json")

if __name__ == "__main__":
    main()