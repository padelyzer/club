#!/usr/bin/env python
"""
Script para ejecutar todos los tests de QA disponibles.
"""

import os
import sys
import json
import importlib
from datetime import datetime

# Agregar paths necesarios
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../backend'))

def run_module_tests(module_name):
    """Ejecutar tests de un módulo específico."""
    print(f"\n{'='*60}")
    print(f"Ejecutando tests del módulo: {module_name.upper()}")
    print('='*60)
    
    try:
        # Importar y ejecutar el validador del módulo
        module_path = f"backend.modules.{module_name}.test_{module_name}_complete"
        test_module = importlib.import_module(module_path)
        
        # Buscar la clase validadora
        validator_class = None
        for attr_name in dir(test_module):
            attr = getattr(test_module, attr_name)
            if (isinstance(attr, type) and 
                attr_name.endswith('Validator') and 
                attr_name != 'BaseModuleValidator'):
                validator_class = attr
                break
        
        if validator_class:
            validator = validator_class()
            results = validator.run()
            return results
        else:
            print(f"❌ No se encontró validador para {module_name}")
            return None
            
    except ImportError as e:
        print(f"❌ No se pudo importar tests para {module_name}: {e}")
        return None
    except Exception as e:
        print(f"❌ Error ejecutando tests de {module_name}: {e}")
        return None

def main():
    """Ejecutar todos los tests disponibles."""
    print("🚀 SISTEMA DE QA - PADELYZER")
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Módulos disponibles para testing
    modules = ['clubs']  # Agregar más módulos conforme se implementen
    
    # Resultados globales
    global_results = {
        "timestamp": datetime.now().isoformat(),
        "modules": {},
        "summary": {
            "total_modules": len(modules),
            "modules_passed": 0,
            "modules_failed": 0,
            "total_tests": 0,
            "tests_passed": 0,
            "tests_failed": 0
        }
    }
    
    # Ejecutar tests por módulo
    for module in modules:
        results = run_module_tests(module)
        if results:
            global_results["modules"][module] = results
            
            # Actualizar estadísticas globales
            module_summary = results.get("summary", {})
            global_results["summary"]["total_tests"] += module_summary.get("total", 0)
            global_results["summary"]["tests_passed"] += module_summary.get("passed", 0)
            global_results["summary"]["tests_failed"] += module_summary.get("failed", 0)
            
            # Determinar si el módulo pasó
            if module_summary.get("failed", 0) == 0:
                global_results["summary"]["modules_passed"] += 1
            else:
                global_results["summary"]["modules_failed"] += 1
    
    # Resumen global
    print("\n" + "="*60)
    print("📊 RESUMEN GLOBAL DE QA")
    print("="*60)
    print(f"Módulos probados: {global_results['summary']['total_modules']}")
    print(f"✅ Módulos exitosos: {global_results['summary']['modules_passed']}")
    print(f"❌ Módulos con fallos: {global_results['summary']['modules_failed']}")
    print(f"\nTotal de pruebas: {global_results['summary']['total_tests']}")
    print(f"✅ Pruebas exitosas: {global_results['summary']['tests_passed']}")
    print(f"❌ Pruebas fallidas: {global_results['summary']['tests_failed']}")
    
    # Calcular porcentaje de éxito
    if global_results['summary']['total_tests'] > 0:
        success_rate = (global_results['summary']['tests_passed'] / 
                       global_results['summary']['total_tests'] * 100)
        print(f"\n📈 Tasa de éxito global: {success_rate:.1f}%")
    
    # Guardar resultados globales
    results_file = os.path.join(os.path.dirname(__file__), 'qa_global_results.json')
    with open(results_file, 'w') as f:
        json.dump(global_results, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Resultados globales guardados en: {results_file}")
    
    # Determinar código de salida
    exit_code = 0 if global_results['summary']['modules_failed'] == 0 else 1
    sys.exit(exit_code)

if __name__ == '__main__':
    main()