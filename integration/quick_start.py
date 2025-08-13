#!/usr/bin/env python3
"""
Quick Start para la Integración Gemini Pro + Claude Code en PZR4
Ejecuta este script para una configuración y prueba rápida
"""

import os
import subprocess
import sys
from pathlib import Path

def verificar_dependencias():
    """Verifica que las dependencias básicas estén instaladas"""
    print("🔍 Verificando dependencias...")
    
    dependencias = {
        'python3': 'Python 3.7+',
        'npm': 'Node.js y npm',
        'git': 'Git',
        'claude': 'Claude Code CLI'
    }
    
    faltantes = []
    
    for cmd, desc in dependencias.items():
        try:
            result = subprocess.run([cmd, '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ {desc}")
            else:
                faltantes.append(desc)
        except FileNotFoundError:
            faltantes.append(desc)
    
    if faltantes:
        print(f"❌ Dependencias faltantes: {', '.join(faltantes)}")
        return False
    
    return True

def ejecutar_configuracion():
    """Ejecuta el script de configuración"""
    print("\\n🔧 Ejecutando configuración automática...")
    
    script_path = Path(__file__).parent / 'setup_integration.sh'
    
    try:
        # Hacer ejecutable
        os.chmod(script_path, 0o755)
        
        # Ejecutar
        result = subprocess.run(['bash', str(script_path)], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Configuración completada")
            return True
        else:
            print(f"❌ Error en configuración: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error ejecutando configuración: {e}")
        return False

def configurar_api_keys():
    """Guía para configurar API keys"""
    print("\\n🔑 Configuración de API Keys")
    print("="*50)
    
    env_file = Path(__file__).parent.parent / '.env'
    template_file = Path(__file__).parent / '.env.template'
    
    if not env_file.exists():
        if template_file.exists():
            # Copiar template
            import shutil
            shutil.copy(template_file, env_file)
            print(f"📄 Archivo .env creado desde template")
        else:
            # Crear básico
            with open(env_file, 'w') as f:
                f.write("GEMINI_API_KEY=your_gemini_api_key_here\\n")
                f.write("ANTHROPIC_API_KEY=your_anthropic_api_key_here\\n")
            print(f"📄 Archivo .env creado")
    
    print(f"\\n📝 Edita el archivo .env para configurar tus API keys:")
    print(f"   nano {env_file}")
    print("\\n🔗 Obtén tus API keys en:")
    print("   • Gemini: https://ai.google.dev/")
    print("   • Anthropic: https://console.anthropic.com/")
    
    return env_file

def prueba_rapida():
    """Ejecuta una prueba rápida del sistema"""
    print("\\n🧪 Ejecutando prueba rápida...")
    
    try:
        # Verificar que Python puede importar los módulos
        sys.path.append(str(Path(__file__).parent))
        
        from dotenv import load_dotenv
        load_dotenv()
        
        # Verificar API keys
        gemini_key = os.getenv('GEMINI_API_KEY')
        claude_key = os.getenv('ANTHROPIC_API_KEY')
        
        if not gemini_key or gemini_key == 'your_gemini_api_key_here':
            print("⚠️  GEMINI_API_KEY no configurada")
            return False
            
        if not claude_key or claude_key == 'your_anthropic_api_key_here':
            print("⚠️  ANTHROPIC_API_KEY no configurada")
            return False
        
        print("✅ API keys configuradas")
        
        # Probar importación de módulos
        from pzr4_orchestrator import PZR4Orchestrator
        from gemini_context_manager import GeminiContextManager
        
        print("✅ Módulos de integración cargados correctamente")
        
        # Prueba básica de conexión (sin ejecutar workflow real)
        orchestrator = PZR4Orchestrator(
            gemini_api_key=gemini_key,
            project_path='/Users/ja/PZR4'
        )
        
        print("✅ Orquestador inicializado correctamente")
        return True
        
    except ImportError as e:
        print(f"❌ Error importando módulos: {e}")
        print("💡 Ejecuta: pip install google-generativeai python-dotenv")
        return False
    except Exception as e:
        print(f"❌ Error en prueba: {e}")
        return False

def mostrar_ejemplos():
    """Muestra ejemplos de comandos"""
    print("\\n📚 EJEMPLOS DE USO")
    print("="*50)
    
    ejemplos = [
        "# Análisis general del proyecto",
        "python3 integration/main.py 'Analizar el estado general del proyecto' --dry-run",
        "",
        "# Desarrollo de nueva funcionalidad", 
        "python3 integration/main.py 'Implementar sistema de notificaciones por email'",
        "",
        "# Debugging de problemas",
        "python3 integration/main.py 'Resolver errores de ClubStore performance'",
        "",
        "# Optimización de rendimiento",
        "python3 integration/main.py 'Optimizar consultas del módulo de reservas'",
        "",
        "# Ver estado del proyecto",
        "python3 integration/main.py status",
        "",
        "# Ver historial",
        "python3 integration/main.py history",
        "",
        "# Generar insights",
        "python3 integration/main.py insights",
        "",
        "# Comandos Claude personalizados",
        "claude /gemini-task 'refactorizar componente de búsqueda'",
        "claude /quick-analysis 'rendimiento de la base de datos'",
        "claude /railway-deploy 'deploy a producción'",
        "claude /run-tests 'tests de integración'"
    ]
    
    for ejemplo in ejemplos:
        print(ejemplo)

def main():
    """Función principal del quick start"""
    print("🚀 QUICK START - INTEGRACIÓN GEMINI PRO + CLAUDE CODE")
    print("="*70)
    print("Configuración rápida para PZR4 - Padelyzer")
    print("="*70)
    
    # Paso 1: Verificar dependencias
    if not verificar_dependencias():
        print("\\n❌ Por favor instala las dependencias faltantes y vuelve a ejecutar")
        return False
    
    # Paso 2: Ejecutar configuración (opcional si ya está hecha)
    respuesta = input("\\n¿Ejecutar configuración automática? (Y/n): ")
    if respuesta.lower() != 'n':
        if not ejecutar_configuracion():
            print("⚠️  Configuración falló, pero puedes continuar manualmente")
    
    # Paso 3: Configurar API keys
    env_file = configurar_api_keys()
    
    # Paso 4: Prueba rápida
    respuesta = input("\\n¿Ejecutar prueba rápida? (Y/n): ")
    if respuesta.lower() != 'n':
        if prueba_rapida():
            print("\\n🎉 ¡Sistema configurado correctamente!")
        else:
            print("\\n⚠️  Hay problemas en la configuración. Revisa los API keys.")
    
    # Paso 5: Mostrar ejemplos
    mostrar_ejemplos()
    
    # Paso 6: Ejecutar ejemplo
    respuesta = input("\\n¿Ejecutar ejemplo de análisis? (y/N): ")
    if respuesta.lower() == 'y':
        try:
            comando = [
                'python3', 
                str(Path(__file__).parent / 'main.py'),
                'Analizar el estado general del proyecto PZR4',
                '--dry-run'
            ]
            
            print("\\n⚡ Ejecutando ejemplo...")
            result = subprocess.run(comando, cwd='/Users/ja/PZR4')
            
            if result.returncode == 0:
                print("\\n✅ Ejemplo ejecutado correctamente")
            else:
                print("\\n⚠️  Hubo problemas ejecutando el ejemplo")
                
        except Exception as e:
            print(f"❌ Error ejecutando ejemplo: {e}")
    
    print("\\n📚 Para más información:")
    print("   cat integration/README.md")
    print("\\n🎯 ¡Listo para usar la integración!")

if __name__ == "__main__":
    main()
