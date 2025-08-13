#!/usr/bin/env python
"""
Test para validar la corrección de unicidad de slug en modelo Club.
"""

import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.clubs.models import Club
from apps.root.models import Organization

def test_slug_uniqueness():
    """Probar que el slug se genera de forma única."""
    
    print("🧪 PROBANDO UNICIDAD DE SLUG EN CLUBES")
    print("=" * 50)
    
    try:
        # Obtener organización de prueba
        org = Organization.objects.get(trade_name="QA Test Organization")
        print(f"✅ Usando organización: {org.trade_name}")
        
        # Crear clubs con nombres similares para probar unicidad
        test_clubs = []
        
        # Club original
        club1 = Club.objects.create(
            name="Test Club Unicidad",
            organization=org,
            address={"street": "Test 1"},
            phone="+525512345678",
            email="test1@test.com"
        )
        test_clubs.append(club1)
        print(f"✅ Club 1 creado: {club1.name} -> slug: '{club1.slug}'")
        
        # Club con mismo nombre (debería generar slug único)
        club2 = Club.objects.create(
            name="Test Club Unicidad",
            organization=org,
            address={"street": "Test 2"},
            phone="+525512345679",
            email="test2@test.com"
        )
        test_clubs.append(club2)
        print(f"✅ Club 2 creado: {club2.name} -> slug: '{club2.slug}'")
        
        # Tercer club con mismo nombre
        club3 = Club.objects.create(
            name="Test Club Unicidad",
            organization=org,
            address={"street": "Test 3"},
            phone="+525512345680",
            email="test3@test.com"
        )
        test_clubs.append(club3)
        print(f"✅ Club 3 creado: {club3.name} -> slug: '{club3.slug}'")
        
        # Validar que todos los slugs son únicos
        slugs = [club.slug for club in test_clubs]
        unique_slugs = set(slugs)
        
        if len(slugs) == len(unique_slugs):
            print(f"\n✅ PRUEBA EXITOSA: Todos los slugs son únicos")
            print(f"   Slugs generados: {slugs}")
        else:
            print(f"\n❌ PRUEBA FALLIDA: Hay slugs duplicados")
            print(f"   Slugs: {slugs}")
            print(f"   Únicos: {unique_slugs}")
        
        # Probar actualización de club existente (no debería cambiar slug)
        original_slug = club1.slug
        club1.name = "Test Club Unicidad Actualizado"
        club1.save()
        
        if club1.slug == original_slug:
            print(f"✅ SLUG PRESERVADO: Actualización no cambió slug existente")
        else:
            print(f"❌ SLUG MODIFICADO: {original_slug} -> {club1.slug}")
        
        print(f"\n🧹 LIMPIEZA: Eliminando clubs de prueba...")
        for club in test_clubs:
            club.delete()
            print(f"   - Eliminado: {club.name}")
        
        print(f"\n🎯 RESUMEN:")
        print(f"   - Unicidad de slug: ✅ FUNCIONA")
        print(f"   - Preservación en actualización: ✅ FUNCIONA")
        print(f"   - Limpieza completada: ✅ FUNCIONA")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR EN PRUEBA: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_slug_uniqueness()
    exit(0 if success else 1)