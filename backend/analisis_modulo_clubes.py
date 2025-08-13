#!/usr/bin/env python3
"""
Análisis completo del módulo de clubes
"""
import os
import sys
import django
import json
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection
from apps.clubs.models import Club, Court, Schedule, Announcement
from apps.clubs import views, serializers
from django.urls import get_resolver

class ClubModuleAnalyzer:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "module": "clubs",
            "components": {}
        }
    
    def analyze_models(self):
        """Analizar modelos del módulo de clubes"""
        print("\n📊 ANÁLISIS DE MODELOS")
        print("=" * 50)
        
        models_info = {}
        
        # Club Model
        print("\n1. Modelo Club:")
        club_fields = [(f.name, f.get_internal_type(), f.null, f.blank) for f in Club._meta.fields]
        print(f"   - Campos: {len(club_fields)}")
        for field in club_fields[:10]:  # Primeros 10
            print(f"     • {field[0]}: {field[1]} (null={field[2]}, blank={field[3]})")
        
        # Relaciones
        relations = [f for f in Club._meta.get_fields() if f.is_relation]
        print(f"   - Relaciones: {len(relations)}")
        for rel in relations:
            print(f"     • {rel.name}: {rel.get_internal_type()}")
        
        # Estadísticas
        total_clubs = Club.objects.count()
        active_clubs = Club.objects.filter(is_active=True).count()
        print(f"   - Total clubes: {total_clubs}")
        print(f"   - Clubes activos: {active_clubs}")
        
        models_info["Club"] = {
            "fields": len(club_fields),
            "relations": len(relations),
            "total_records": total_clubs,
            "active_records": active_clubs
        }
        
        # Court Model
        print("\n2. Modelo Court:")
        court_fields = [(f.name, f.get_internal_type()) for f in Court._meta.fields]
        print(f"   - Campos: {len(court_fields)}")
        total_courts = Court.objects.count()
        active_courts = Court.objects.filter(is_active=True).count()
        print(f"   - Total canchas: {total_courts}")
        print(f"   - Canchas activas: {active_courts}")
        
        models_info["Court"] = {
            "fields": len(court_fields),
            "total_records": total_courts,
            "active_records": active_courts
        }
        
        # Schedule Model
        print("\n3. Modelo Schedule:")
        schedule_count = Schedule.objects.count()
        print(f"   - Total horarios: {schedule_count}")
        
        models_info["Schedule"] = {
            "total_records": schedule_count
        }
        
        # Announcement Model
        print("\n4. Modelo Announcement:")
        announcement_count = Announcement.objects.count()
        print(f"   - Total anuncios: {announcement_count}")
        
        models_info["Announcement"] = {
            "total_records": announcement_count
        }
        
        self.report["components"]["models"] = models_info
        
    def analyze_views(self):
        """Analizar vistas del módulo"""
        print("\n🔍 ANÁLISIS DE VISTAS")
        print("=" * 50)
        
        views_info = {}
        
        # Analizar viewsets
        viewsets = [
            attr for attr in dir(views) 
            if attr.endswith('ViewSet') and not attr.startswith('_')
        ]
        
        print(f"\nViewSets encontrados: {len(viewsets)}")
        for viewset_name in viewsets:
            viewset_class = getattr(views, viewset_name)
            if hasattr(viewset_class, 'queryset'):
                model = viewset_class.queryset.model.__name__ if viewset_class.queryset else 'Unknown'
                print(f"   • {viewset_name} -> Modelo: {model}")
                
                # Analizar acciones
                actions = [method for method in dir(viewset_class) 
                          if not method.startswith('_') and callable(getattr(viewset_class, method))]
                standard_actions = ['list', 'create', 'retrieve', 'update', 'partial_update', 'destroy']
                custom_actions = [a for a in actions if a not in standard_actions and a not in ['get_queryset', 'get_serializer_class']]
                
                if custom_actions:
                    print(f"     - Acciones custom: {', '.join(custom_actions[:5])}")
                
                views_info[viewset_name] = {
                    "model": model,
                    "custom_actions": custom_actions
                }
        
        self.report["components"]["views"] = views_info
    
    def analyze_serializers(self):
        """Analizar serializers del módulo"""
        print("\n📝 ANÁLISIS DE SERIALIZERS")
        print("=" * 50)
        
        serializers_info = {}
        
        # Obtener todos los serializers
        all_serializers = [
            attr for attr in dir(serializers) 
            if attr.endswith('Serializer') and not attr.startswith('_')
        ]
        
        print(f"\nSerializers encontrados: {len(all_serializers)}")
        for serializer_name in all_serializers:
            serializer_class = getattr(serializers, serializer_name)
            
            # Obtener modelo asociado
            if hasattr(serializer_class, 'Meta') and hasattr(serializer_class.Meta, 'model'):
                model = serializer_class.Meta.model.__name__
                fields = getattr(serializer_class.Meta, 'fields', 'all')
                print(f"   • {serializer_name} -> Modelo: {model}")
                if isinstance(fields, list) and len(fields) < 10:
                    print(f"     - Campos: {', '.join(fields)}")
                
                serializers_info[serializer_name] = {
                    "model": model,
                    "fields": fields if isinstance(fields, list) else "all"
                }
        
        self.report["components"]["serializers"] = serializers_info
    
    def analyze_urls(self):
        """Analizar URLs del módulo"""
        print("\n🌐 ANÁLISIS DE URLs")
        print("=" * 50)
        
        try:
            from apps.clubs.urls import urlpatterns, router
            
            # URLs del router
            print("\nRutas del Router:")
            for route in router.registry:
                print(f"   • /{route[0]}/ -> {route[1].__name__}")
            
            # URLs adicionales
            additional_urls = [p for p in urlpatterns if hasattr(p, 'pattern')]
            if additional_urls:
                print("\nURLs adicionales:")
                for url in additional_urls[:5]:
                    print(f"   • {url.pattern}")
            
            self.report["components"]["urls"] = {
                "router_routes": len(router.registry),
                "additional_urls": len(additional_urls)
            }
        except Exception as e:
            print(f"   ❌ Error analizando URLs: {e}")
    
    def analyze_permissions(self):
        """Analizar permisos y seguridad"""
        print("\n🔒 ANÁLISIS DE PERMISOS")
        print("=" * 50)
        
        # Verificar permisos en viewsets
        viewsets = [
            attr for attr in dir(views) 
            if attr.endswith('ViewSet') and not attr.startswith('_')
        ]
        
        for viewset_name in viewsets:
            viewset_class = getattr(views, viewset_name)
            if hasattr(viewset_class, 'permission_classes'):
                perms = viewset_class.permission_classes
                print(f"\n{viewset_name}:")
                for perm in perms:
                    print(f"   • {perm.__name__}")
    
    def analyze_database(self):
        """Analizar estructura de base de datos"""
        print("\n💾 ANÁLISIS DE BASE DE DATOS")
        print("=" * 50)
        
        with connection.cursor() as cursor:
            # Tablas del módulo
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name LIKE '%club%'
            """)
            tables = cursor.fetchall()
            
            print(f"\nTablas relacionadas con clubs: {len(tables)}")
            for table in tables:
                print(f"   • {table[0]}")
                
                # Contar registros
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
                    count = cursor.fetchone()[0]
                    print(f"     - Registros: {count}")
                except:
                    pass
    
    def generate_report(self):
        """Generar reporte completo"""
        print("\n" + "=" * 70)
        print("ANÁLISIS COMPLETO DEL MÓDULO DE CLUBES")
        print("=" * 70)
        
        self.analyze_models()
        self.analyze_views()
        self.analyze_serializers()
        self.analyze_urls()
        self.analyze_permissions()
        self.analyze_database()
        
        # Guardar reporte
        with open('clubs_module_analysis.json', 'w') as f:
            json.dump(self.report, f, indent=2)
        
        print("\n✅ Análisis completado")
        print("📄 Reporte guardado en: clubs_module_analysis.json")
        
        # Resumen
        print("\n📊 RESUMEN EJECUTIVO:")
        print(f"   - Modelos principales: 4 (Club, Court, Schedule, Announcement)")
        print(f"   - Clubes activos: {Club.objects.filter(is_active=True).count()}/{Club.objects.count()}")
        print(f"   - Canchas totales: {Court.objects.count()}")
        print(f"   - ViewSets: {len(self.report['components'].get('views', {}))}")
        print(f"   - Serializers: {len(self.report['components'].get('serializers', {}))}")

if __name__ == "__main__":
    analyzer = ClubModuleAnalyzer()
    analyzer.generate_report()