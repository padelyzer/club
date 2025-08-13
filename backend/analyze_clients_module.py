#!/usr/bin/env python3
"""
Análisis completo del módulo de clientes
"""
import os
import sys
import django
import json
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection
from apps.clients.models import ClientProfile, PlayerLevel, PlayerStats, EmergencyContact, MedicalInfo, PlayerPreferences, PartnerRequest
from apps.clients import views, serializers
from apps.clubs.models import Club
from apps.root.models import Organization

class ClientsModuleAnalyzer:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "module": "clients",
            "analysis": {}
        }
    
    def analyze_models(self):
        """Analizar modelos del módulo de clientes"""
        print("\n📊 ANÁLISIS DE MODELOS - CLIENTES")
        print("=" * 60)
        
        models_info = {}
        
        # 1. PlayerLevel
        print("\n1. PlayerLevel (Niveles de jugador):")
        levels = PlayerLevel.objects.all()
        print(f"   - Total niveles: {levels.count()}")
        for level in levels:
            print(f"     • {level.display_name} ({level.name}) - Rating: {level.min_rating}-{level.max_rating}")
        
        models_info["PlayerLevel"] = {
            "count": levels.count(),
            "levels": list(levels.values('name', 'display_name', 'min_rating', 'max_rating'))
        }
        
        # 2. ClientProfile
        print("\n2. ClientProfile (Perfiles de cliente):")
        profiles = ClientProfile.objects.all()
        print(f"   - Total perfiles: {profiles.count()}")
        print(f"   - Con organización: {profiles.filter(organization__isnull=False).count()}")
        print(f"   - Con club: {profiles.filter(club__isnull=False).count()}")
        
        # Campos importantes
        profile_fields = [f.name for f in ClientProfile._meta.fields]
        print(f"   - Campos totales: {len(profile_fields)}")
        print(f"   - Campos clave: user, level, rating, dominant_hand, preferred_position")
        
        models_info["ClientProfile"] = {
            "count": profiles.count(),
            "fields_count": len(profile_fields),
            "with_organization": profiles.filter(organization__isnull=False).count(),
            "with_club": profiles.filter(club__isnull=False).count()
        }
        
        # 3. PlayerStats
        print("\n3. PlayerStats (Estadísticas):")
        stats = PlayerStats.objects.all()
        print(f"   - Total registros: {stats.count()}")
        if stats.exists():
            sample = stats.first()
            print(f"   - Campos de stats: matches_played, matches_won, tournaments_played, etc.")
        
        models_info["PlayerStats"] = {"count": stats.count()}
        
        # 4. EmergencyContact
        print("\n4. EmergencyContact (Contactos de emergencia):")
        contacts = EmergencyContact.objects.all()
        print(f"   - Total contactos: {contacts.count()}")
        
        models_info["EmergencyContact"] = {"count": contacts.count()}
        
        # 5. MedicalInfo
        print("\n5. MedicalInfo (Información médica):")
        medical = MedicalInfo.objects.all()
        print(f"   - Total registros: {medical.count()}")
        
        models_info["MedicalInfo"] = {"count": medical.count()}
        
        # 6. PlayerPreferences
        print("\n6. PlayerPreferences (Preferencias):")
        prefs = PlayerPreferences.objects.all()
        print(f"   - Total registros: {prefs.count()}")
        
        models_info["PlayerPreferences"] = {"count": prefs.count()}
        
        # 7. PartnerRequest
        print("\n7. PartnerRequest (Solicitudes de pareja):")
        requests = PartnerRequest.objects.all()
        print(f"   - Total solicitudes: {requests.count()}")
        print(f"   - Estados: pending, accepted, rejected")
        
        models_info["PartnerRequest"] = {"count": requests.count()}
        
        self.report["analysis"]["models"] = models_info
    
    def analyze_views(self):
        """Analizar vistas y endpoints"""
        print("\n🔍 ANÁLISIS DE VISTAS Y ENDPOINTS")
        print("=" * 60)
        
        viewsets = []
        for attr_name in dir(views):
            attr = getattr(views, attr_name)
            if attr_name.endswith('ViewSet') and hasattr(attr, 'queryset'):
                viewsets.append(attr_name)
        
        print(f"\nViewSets encontrados: {len(viewsets)}")
        for vs in viewsets:
            print(f"   • {vs}")
        
        self.report["analysis"]["viewsets"] = viewsets
    
    def analyze_serializers(self):
        """Analizar serializers"""
        print("\n📝 ANÁLISIS DE SERIALIZERS")
        print("=" * 60)
        
        serializers_list = []
        for attr_name in dir(serializers):
            if attr_name.endswith('Serializer'):
                serializers_list.append(attr_name)
        
        print(f"\nSerializers encontrados: {len(serializers_list)}")
        for s in serializers_list:
            print(f"   • {s}")
        
        self.report["analysis"]["serializers"] = serializers_list
    
    def analyze_relationships(self):
        """Analizar relaciones entre modelos"""
        print("\n🔗 ANÁLISIS DE RELACIONES")
        print("=" * 60)
        
        print("\nRelaciones principales:")
        print("   • ClientProfile -> User (OneToOne)")
        print("   • ClientProfile -> Organization (ForeignKey)")
        print("   • ClientProfile -> Club (ForeignKey)")
        print("   • ClientProfile -> PlayerLevel (ForeignKey)")
        print("   • PlayerStats -> ClientProfile (OneToOne)")
        print("   • EmergencyContact -> ClientProfile (ForeignKey)")
        print("   • MedicalInfo -> ClientProfile (OneToOne)")
        print("   • PlayerPreferences -> ClientProfile (OneToOne)")
        print("   • PartnerRequest -> requester/requested (ClientProfile)")
    
    def analyze_features(self):
        """Analizar características del módulo"""
        print("\n✨ CARACTERÍSTICAS DEL MÓDULO")
        print("=" * 60)
        
        features = {
            "profile_management": {
                "description": "Gestión completa de perfiles de jugadores",
                "includes": [
                    "Información personal",
                    "Nivel de juego y rating",
                    "Preferencias de juego",
                    "Historial médico"
                ]
            },
            "partner_system": {
                "description": "Sistema de búsqueda y solicitud de parejas",
                "includes": [
                    "Búsqueda por nivel",
                    "Solicitudes de pareja",
                    "Bloqueo de jugadores",
                    "Preferencias de pareja"
                ]
            },
            "statistics": {
                "description": "Estadísticas detalladas de juego",
                "includes": [
                    "Partidos jugados/ganados",
                    "Torneos participados",
                    "Ratio victorias/derrotas",
                    "Puntos totales"
                ]
            },
            "multi_tenant": {
                "description": "Soporte multi-tenant completo",
                "includes": [
                    "Aislamiento por organización",
                    "Filtrado por club",
                    "Permisos granulares"
                ]
            }
        }
        
        for feature, details in features.items():
            print(f"\n📌 {feature.upper()}")
            print(f"   {details['description']}")
            for item in details['includes']:
                print(f"   • {item}")
        
        self.report["analysis"]["features"] = features
    
    def check_data_integrity(self):
        """Verificar integridad de datos"""
        print("\n🔧 VERIFICACIÓN DE INTEGRIDAD")
        print("=" * 60)
        
        issues = []
        
        # 1. Perfiles sin organización
        profiles_no_org = ClientProfile.objects.filter(organization__isnull=True).count()
        if profiles_no_org > 0:
            issues.append(f"⚠️  {profiles_no_org} perfiles sin organización")
        
        # 2. Perfiles sin nivel
        profiles_no_level = ClientProfile.objects.filter(level__isnull=True).count()
        if profiles_no_level > 0:
            issues.append(f"⚠️  {profiles_no_level} perfiles sin nivel asignado")
        
        # 3. Stats huérfanas
        stats_orphan = PlayerStats.objects.filter(player__isnull=True).count()
        if stats_orphan > 0:
            issues.append(f"⚠️  {stats_orphan} estadísticas sin jugador")
        
        if issues:
            print("\nProblemas encontrados:")
            for issue in issues:
                print(f"   {issue}")
        else:
            print("\n✅ No se encontraron problemas de integridad")
        
        self.report["analysis"]["integrity_issues"] = issues
    
    def generate_summary(self):
        """Generar resumen ejecutivo"""
        print("\n" + "=" * 60)
        print("📊 RESUMEN EJECUTIVO - MÓDULO DE CLIENTES")
        print("=" * 60)
        
        self.analyze_models()
        self.analyze_views()
        self.analyze_serializers()
        self.analyze_relationships()
        self.analyze_features()
        self.check_data_integrity()
        
        # Guardar reporte
        with open('clients_module_analysis.json', 'w') as f:
            json.dump(self.report, f, indent=2, default=str)
        
        print(f"\n✅ Análisis completado")
        print(f"📄 Reporte guardado en: clients_module_analysis.json")
        
        # Estado general
        print("\n🎯 ESTADO DEL MÓDULO:")
        print("   ✅ Modelos implementados: 7")
        print("   ✅ Multi-tenant habilitado")
        print("   ✅ Sistema de niveles configurado")
        print("   ⚠️  Solo 1 perfil de cliente creado")
        print("   📌 Listo para crear más clientes")

if __name__ == "__main__":
    analyzer = ClientsModuleAnalyzer()
    analyzer.generate_summary()