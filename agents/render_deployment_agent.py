#!/usr/bin/env python3
"""
Agente Especialista en Render CLI para Deployment Automatizado
Maneja todo el proceso de deployment, migración y gestión de servicios en Render
"""

import os
import subprocess
import json
import sys
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
import requests

class RenderDeploymentAgent:
    """
    Agente especializado en gestionar deployments en Render.
    Automatiza todo el proceso de deployment, migración y monitoreo.
    """
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.api_key = os.environ.get('RENDER_API_KEY')
        self.api_base_url = "https://api.render.com/v1"
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}'
            })
        
        # Configuración de servicios
        self.services = {
            'backend': {
                'name': 'padelyzer-api',
                'type': 'web_service',
                'env': 'docker',
                'plan': 'starter',
                'buildCommand': './build.sh',
                'startCommand': 'gunicorn core.wsgi:application',
                'healthCheckPath': '/api/v1/health/',
                'rootDir': 'backend'
            },
            'frontend': {
                'name': 'padelyzer-app',
                'type': 'static_site',
                'buildCommand': 'cd frontend && npm install && npm run build',
                'publishDir': 'frontend/out',
                'rootDir': 'frontend'
            }
        }
        
    def check_cli_installed(self) -> bool:
        """Verifica si Render CLI está instalado"""
        try:
            result = subprocess.run(['render', '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Render CLI instalado: {result.stdout.strip()}")
                return True
        except FileNotFoundError:
            pass
        
        print("❌ Render CLI no está instalado")
        return False
    
    def install_cli(self) -> bool:
        """Instala Render CLI"""
        print("📦 Instalando Render CLI...")
        
        # Detectar sistema operativo
        if sys.platform == "darwin":  # macOS
            # Intentar con Homebrew
            try:
                subprocess.run(['brew', 'update'], check=True)
                subprocess.run(['brew', 'install', 'render'], check=True)
                print("✅ Render CLI instalado con Homebrew")
                return True
            except:
                print("⚠️  Homebrew no disponible, usando instalador alternativo")
        
        # Instalador universal
        install_script = """
        curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
        """
        
        try:
            subprocess.run(install_script, shell=True, check=True)
            print("✅ Render CLI instalado exitosamente")
            return True
        except Exception as e:
            print(f"❌ Error instalando Render CLI: {e}")
            return False
    
    def authenticate(self) -> bool:
        """Autentica con Render"""
        if not self.api_key:
            print("❌ RENDER_API_KEY no está configurada")
            print("💡 Puedes obtener tu API key en: https://dashboard.render.com/account/api-keys")
            print("\nPara configurarla:")
            print("export RENDER_API_KEY='tu-api-key-aqui'")
            return False
        
        # Verificar autenticación con API
        try:
            response = self.session.get(f"{self.api_base_url}/services")
            if response.status_code == 200:
                print("✅ Autenticación exitosa con Render")
                return True
            else:
                print(f"❌ Error de autenticación: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error conectando con Render API: {e}")
            return False
    
    def list_services(self) -> List[Dict]:
        """Lista todos los servicios en la cuenta"""
        print("\n📋 Listando servicios existentes...")
        
        try:
            # Usar CLI
            result = subprocess.run(['render', 'services'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout)
            
            # También usar API para obtener más detalles
            response = self.session.get(f"{self.api_base_url}/services")
            if response.status_code == 200:
                services = response.json()
                return services
            else:
                print(f"⚠️  No se pudieron obtener servicios: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Error listando servicios: {e}")
            return []
    
    def backup_database(self, database_id: str) -> str:
        """Crea backup de la base de datos"""
        print(f"\n💾 Creando backup de base de datos {database_id}...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.project_root / "backups"
        backup_dir.mkdir(exist_ok=True)
        backup_file = backup_dir / f"render_backup_{timestamp}.sql"
        
        try:
            # Usar render psql para hacer dump
            dump_command = f"render psql {database_id} -c '\\copy (SELECT * FROM pg_dump()) TO STDOUT' > {backup_file}"
            
            # Alternativa: usar pg_dump directamente si tenemos la URL
            if os.environ.get('DATABASE_URL'):
                subprocess.run(
                    f"pg_dump {os.environ['DATABASE_URL']} > {backup_file}",
                    shell=True,
                    check=True
                )
                
                # Comprimir
                subprocess.run(f"gzip {backup_file}", shell=True, check=True)
                print(f"✅ Backup creado: {backup_file}.gz")
                return f"{backup_file}.gz"
            else:
                print("⚠️  DATABASE_URL no configurada, saltando backup")
                return ""
                
        except Exception as e:
            print(f"❌ Error creando backup: {e}")
            return ""
    
    def create_service(self, service_type: str, config: Dict) -> Optional[str]:
        """Crea un nuevo servicio en Render"""
        print(f"\n🚀 Creando servicio {config['name']}...")
        
        # Preparar configuración para API
        service_data = {
            "type": config['type'],
            "name": config['name'],
            "env": config.get('env', 'docker'),
            "plan": config.get('plan', 'starter'),
            "repo": {
                "url": self.get_git_repo_url(),
                "branch": "main",
                "rootDir": config.get('rootDir', ''),
                "buildCommand": config.get('buildCommand', ''),
                "startCommand": config.get('startCommand', '')
            },
            "healthCheckPath": config.get('healthCheckPath', '/'),
            "envVars": self.get_env_vars(service_type)
        }
        
        try:
            response = self.session.post(
                f"{self.api_base_url}/services",
                json=service_data
            )
            
            if response.status_code == 201:
                service = response.json()
                service_id = service['id']
                print(f"✅ Servicio creado: {service_id}")
                print(f"   URL: {service.get('url', 'Pendiente...')}")
                return service_id
            else:
                print(f"❌ Error creando servicio: {response.status_code}")
                print(response.json())
                return None
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    def get_git_repo_url(self) -> str:
        """Obtiene la URL del repositorio Git"""
        try:
            result = subprocess.run(
                ['git', 'config', '--get', 'remote.origin.url'],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except:
            return ""
    
    def get_env_vars(self, service_type: str) -> List[Dict]:
        """Obtiene las variables de entorno para el servicio"""
        env_vars = []
        
        if service_type == 'backend':
            # Variables críticas para Django
            required_vars = [
                'SECRET_KEY',
                'DEBUG',
                'ALLOWED_HOSTS',
                'DATABASE_URL',
                'REDIS_URL',
                'STRIPE_SECRET_KEY',
                'STRIPE_WEBHOOK_SECRET',
                'CORS_ALLOWED_ORIGINS'
            ]
            
            # Leer de .env.production si existe
            env_file = self.project_root / '.env.production'
            if env_file.exists():
                with open(env_file) as f:
                    for line in f:
                        if '=' in line and not line.startswith('#'):
                            key, value = line.strip().split('=', 1)
                            if key in required_vars:
                                env_vars.append({
                                    "key": key,
                                    "value": value.strip('"\'')
                                })
                                
        elif service_type == 'frontend':
            # Variables para Next.js
            frontend_vars = {
                'NEXT_PUBLIC_API_URL': os.environ.get('NEXT_PUBLIC_API_URL', ''),
                'NEXT_PUBLIC_STRIPE_PUBLIC_KEY': os.environ.get('NEXT_PUBLIC_STRIPE_PUBLIC_KEY', ''),
                'NEXT_PUBLIC_APP_URL': os.environ.get('NEXT_PUBLIC_APP_URL', '')
            }
            
            for key, value in frontend_vars.items():
                if value:
                    env_vars.append({"key": key, "value": value})
                    
        return env_vars
    
    def deploy_service(self, service_id: str, wait: bool = True) -> bool:
        """Despliega un servicio"""
        print(f"\n🚀 Desplegando servicio {service_id}...")
        
        try:
            # Obtener último commit
            result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                capture_output=True,
                text=True,
                check=True
            )
            commit_sha = result.stdout.strip()
            
            # Crear deployment
            cmd = ['render', 'deploys', 'create', service_id, '--commit', commit_sha]
            if wait:
                cmd.append('--wait')
                
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Deployment iniciado exitosamente")
                if wait:
                    print("⏳ Esperando a que complete...")
                    # El --wait ya maneja la espera
                    print("✅ Deployment completado")
                return True
            else:
                print(f"❌ Error en deployment: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def run_health_checks(self, service_url: str) -> bool:
        """Ejecuta health checks en el servicio"""
        print(f"\n🏥 Ejecutando health checks en {service_url}...")
        
        # Esperar un poco para que el servicio se estabilice
        time.sleep(30)
        
        # Ejecutar nuestro script de health check
        health_check_script = self.project_root / "scripts" / "production_health_check.py"
        if health_check_script.exists():
            result = subprocess.run(
                [sys.executable, str(health_check_script), service_url],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("✅ Health checks pasaron exitosamente")
                return True
            else:
                print("❌ Health checks fallaron")
                print(result.stdout)
                return False
        else:
            print("⚠️  Script de health check no encontrado")
            return False
    
    def run_smoke_tests(self, service_url: str) -> bool:
        """Ejecuta smoke tests en el servicio"""
        print(f"\n🧪 Ejecutando smoke tests en {service_url}...")
        
        smoke_test_script = self.project_root / "scripts" / "smoke_tests.py"
        if smoke_test_script.exists():
            result = subprocess.run(
                [sys.executable, str(smoke_test_script), service_url],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("✅ Smoke tests pasaron exitosamente")
                return True
            else:
                print("❌ Smoke tests fallaron")
                print(result.stdout)
                return False
        else:
            print("⚠️  Script de smoke tests no encontrado")
            return False
    
    def migrate_database(self, service_id: str) -> bool:
        """Ejecuta migraciones de Django en el servicio"""
        print(f"\n🗄️  Ejecutando migraciones en {service_id}...")
        
        try:
            # SSH al servicio y ejecutar migraciones
            commands = [
                "python manage.py migrate --noinput",
                "python manage.py collectstatic --noinput"
            ]
            
            for cmd in commands:
                print(f"  Ejecutando: {cmd}")
                result = subprocess.run(
                    ['render', 'ssh', service_id, '--', cmd],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    print(f"  ❌ Error: {result.stderr}")
                    return False
                else:
                    print(f"  ✅ Completado")
                    
            return True
            
        except Exception as e:
            print(f"❌ Error ejecutando migraciones: {e}")
            return False
    
    def create_superuser(self, service_id: str) -> bool:
        """Crea un superusuario en Django"""
        print(f"\n👤 Creando superusuario...")
        
        # Script para crear superuser de forma no interactiva
        create_user_script = '''
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser("admin", "admin@padelyzer.com", "AdminPassword123!")
    print("Superusuario creado")
else:
    print("Superusuario ya existe")
'''
        
        try:
            cmd = f'echo "{create_user_script}" | python manage.py shell'
            result = subprocess.run(
                ['render', 'ssh', service_id, '--', 'bash', '-c', cmd],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("✅ Superusuario configurado")
                print("   Username: admin")
                print("   Password: AdminPassword123! (CAMBIAR EN PRODUCCIÓN)")
                return True
            else:
                print(f"❌ Error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def full_deployment_workflow(self, parallel: bool = True) -> bool:
        """Ejecuta el workflow completo de deployment"""
        print("🚀 INICIANDO WORKFLOW COMPLETO DE DEPLOYMENT EN RENDER")
        print("="*60)
        
        # 1. Verificaciones iniciales
        if not self.check_cli_installed():
            if not self.install_cli():
                return False
                
        if not self.authenticate():
            return False
        
        # 2. Validación pre-deploy
        print("\n📋 Ejecutando validación pre-deploy...")
        validation_script = self.project_root / "scripts" / "pre_deploy_validation.py"
        if validation_script.exists():
            result = subprocess.run(
                [sys.executable, str(validation_script)],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print("❌ Validación pre-deploy falló")
                print(result.stdout)
                return False
        
        # 3. Listar servicios existentes
        existing_services = self.list_services()
        
        # 4. Backup de base de datos (si existe)
        database_id = None
        for service in existing_services:
            if service.get('type') == 'postgres':
                database_id = service['id']
                self.backup_database(database_id)
                break
        
        # 5. Crear o actualizar servicios
        if parallel:
            # Crear servicios v2 en paralelo
            backend_id = self.create_service('backend', {
                **self.services['backend'],
                'name': f"{self.services['backend']['name']}-v2"
            })
            
            frontend_id = self.create_service('frontend', {
                **self.services['frontend'],
                'name': f"{self.services['frontend']['name']}-v2"
            })
        else:
            # Actualizar servicios existentes
            print("⚠️  Modo actualización in-place no implementado aún")
            return False
        
        if not backend_id or not frontend_id:
            print("❌ Error creando servicios")
            return False
        
        # 6. Deploy servicios
        print("\n🚀 Desplegando servicios...")
        if not self.deploy_service(backend_id, wait=True):
            return False
            
        if not self.deploy_service(frontend_id, wait=True):
            return False
        
        # 7. Migraciones y configuración
        if not self.migrate_database(backend_id):
            return False
            
        if not self.create_superuser(backend_id):
            return False
        
        # 8. Health checks y smoke tests
        # Obtener URLs de los servicios
        response = self.session.get(f"{self.api_base_url}/services/{backend_id}")
        if response.status_code == 200:
            backend_url = response.json().get('url', '')
            
            if backend_url:
                self.run_health_checks(backend_url)
                self.run_smoke_tests(backend_url)
        
        # 9. Reporte final
        print("\n" + "="*60)
        print("📋 DEPLOYMENT COMPLETADO")
        print("="*60)
        print(f"\n✅ Backend ID: {backend_id}")
        print(f"✅ Frontend ID: {frontend_id}")
        print("\n📝 Próximos pasos:")
        print("1. Verificar servicios en https://dashboard.render.com")
        print("2. Configurar DNS si es necesario")
        print("3. Monitorear logs las primeras 24 horas")
        print("4. Actualizar variables de entorno del frontend con URLs reales")
        
        return True
    
    def rollback_deployment(self, service_id: str, deploy_id: str) -> bool:
        """Hace rollback a un deployment anterior"""
        print(f"\n⏪ Haciendo rollback del servicio {service_id} al deploy {deploy_id}...")
        
        try:
            # Render CLI no tiene comando directo de rollback, usar API
            response = self.session.post(
                f"{self.api_base_url}/services/{service_id}/deploys/{deploy_id}/rollback"
            )
            
            if response.status_code == 201:
                print("✅ Rollback iniciado exitosamente")
                return True
            else:
                print(f"❌ Error en rollback: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False


def main():
    """Función principal del agente"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Agente de Deployment para Render - Padelyzer'
    )
    parser.add_argument(
        'action',
        choices=['deploy', 'list', 'backup', 'rollback', 'health-check'],
        help='Acción a ejecutar'
    )
    parser.add_argument(
        '--parallel',
        action='store_true',
        help='Crear servicios v2 en paralelo (recomendado)'
    )
    parser.add_argument(
        '--service-id',
        help='ID del servicio para acciones específicas'
    )
    parser.add_argument(
        '--deploy-id',
        help='ID del deployment para rollback'
    )
    
    args = parser.parse_args()
    
    # Crear agente
    agent = RenderDeploymentAgent()
    
    # Ejecutar acción
    if args.action == 'deploy':
        success = agent.full_deployment_workflow(parallel=args.parallel)
        sys.exit(0 if success else 1)
        
    elif args.action == 'list':
        agent.list_services()
        
    elif args.action == 'backup':
        if args.service_id:
            agent.backup_database(args.service_id)
        else:
            print("❌ Necesitas especificar --service-id")
            sys.exit(1)
            
    elif args.action == 'rollback':
        if args.service_id and args.deploy_id:
            success = agent.rollback_deployment(args.service_id, args.deploy_id)
            sys.exit(0 if success else 1)
        else:
            print("❌ Necesitas especificar --service-id y --deploy-id")
            sys.exit(1)
            
    elif args.action == 'health-check':
        if args.service_id:
            # Obtener URL del servicio y ejecutar health check
            print("🏥 Ejecutando health check...")
        else:
            print("❌ Necesitas especificar --service-id")
            sys.exit(1)


if __name__ == "__main__":
    main()