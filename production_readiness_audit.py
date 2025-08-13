#!/usr/bin/env python3
"""
Auditoría de Preparación para Producción - Padelyzer
Analiza el proyecto completo para identificar errores, gaps y problemas que impidan el lanzamiento
"""

import os
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

class ProductionReadinessAuditor:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.backend_path = self.project_root / "backend"
        self.frontend_path = self.project_root / "frontend"
        self.issues = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": [],
            "info": []
        }
        
    def add_issue(self, severity: str, category: str, title: str, description: str, 
                  file_path: str = None, line: int = None, fix: str = None):
        """Agregar un problema encontrado"""
        issue = {
            "category": category,
            "title": title,
            "description": description,
            "file_path": file_path,
            "line": line,
            "fix": fix,
            "timestamp": datetime.now().isoformat()
        }
        self.issues[severity].append(issue)
    
    def check_project_structure(self):
        """Verificar estructura del proyecto"""
        print("🔍 Verificando estructura del proyecto...")
        
        # Verificar directorios críticos
        critical_dirs = ["backend", "frontend"]
        for dir_name in critical_dirs:
            if not (self.project_root / dir_name).exists():
                self.add_issue("critical", "structure", 
                              f"Directorio {dir_name} faltante",
                              f"El directorio {dir_name} es esencial para el proyecto")
        
        # Verificar archivos críticos del backend
        backend_critical_files = [
            "manage.py",
            "requirements/base.txt",
            "config/settings/base.py",
            "config/urls.py"
        ]
        
        for file_path in backend_critical_files:
            full_path = self.backend_path / file_path
            if not full_path.exists():
                self.add_issue("critical", "backend", 
                              f"Archivo crítico faltante: {file_path}",
                              f"El archivo {file_path} es esencial para Django",
                              str(full_path))
        
        # Verificar archivos críticos del frontend
        frontend_critical_files = [
            "package.json",
            "next.config.mjs",
            "src/app/layout.tsx",
            "src/app/page.tsx"
        ]
        
        for file_path in frontend_critical_files:
            full_path = self.frontend_path / file_path
            if not full_path.exists():
                self.add_issue("critical", "frontend", 
                              f"Archivo crítico faltante: {file_path}",
                              f"El archivo {file_path} es esencial para Next.js",
                              str(full_path))
    
    def check_security_issues(self):
        """Verificar problemas de seguridad"""
        print("🔒 Verificando problemas de seguridad...")
        
        # Verificar archivos de configuración de seguridad
        security_files = [
            ".env",
            ".env.local",
            ".env.production"
        ]
        
        for env_file in security_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                # Verificar si contiene información sensible
                try:
                    with open(env_path, 'r') as f:
                        content = f.read()
                        sensitive_patterns = [
                            r'PASSWORD\s*=\s*[\'"][^\'"]+[\'"]',
                            r'SECRET_KEY\s*=\s*[\'"][^\'"]+[\'"]',
                            r'API_KEY\s*=\s*[\'"][^\'"]+[\'"]',
                            r'TOKEN\s*=\s*[\'"][^\'"]+[\'"]'
                        ]
                        
                        for pattern in sensitive_patterns:
                            if re.search(pattern, content, re.IGNORECASE):
                                self.add_issue("critical", "security",
                                              f"Información sensible en {env_file}",
                                              f"El archivo {env_file} contiene información sensible que no debe estar en el repositorio",
                                              str(env_path),
                                              fix="Agregar archivo al .gitignore y usar variables de entorno en producción")
                except Exception as e:
                    self.add_issue("medium", "security",
                                  f"Error leyendo {env_file}",
                                  f"No se pudo leer el archivo {env_file}: {e}",
                                  str(env_path))
        
        # Verificar .gitignore
        gitignore_path = self.project_root / ".gitignore"
        if gitignore_path.exists():
            with open(gitignore_path, 'r') as f:
                content = f.read()
                required_ignores = [
                    ".env",
                    "*.pyc",
                    "__pycache__",
                    "node_modules",
                    ".next",
                    "dist",
                    "build"
                ]
                
                for ignore in required_ignores:
                    if ignore not in content:
                        self.add_issue("medium", "security",
                                      f"Falta en .gitignore: {ignore}",
                                      f"El archivo/directorio {ignore} debe estar en .gitignore",
                                      str(gitignore_path))
    
    def check_dependencies(self):
        """Verificar dependencias"""
        print("📦 Verificando dependencias...")
        
        # Backend dependencies
        requirements_files = [
            "requirements/base.txt",
            "requirements/production.txt"
        ]
        
        for req_file in requirements_files:
            req_path = self.backend_path / req_file
            if req_path.exists():
                try:
                    with open(req_path, 'r') as f:
                        content = f.read()
                        
                        # Verificar versiones específicas
                        lines = content.split('\n')
                        for line_num, line in enumerate(lines, 1):
                            line = line.strip()
                            if line and not line.startswith('#') and '==' not in line and '>=' not in line:
                                self.add_issue("medium", "dependencies",
                                              f"Versión no especificada en {req_file}",
                                              f"La dependencia '{line}' no tiene versión específica",
                                              str(req_path), line_num,
                                              fix="Especificar versión exacta (ej: package==1.2.3)")
                except Exception as e:
                    self.add_issue("high", "dependencies",
                                  f"Error leyendo {req_file}",
                                  f"No se pudo leer el archivo {req_file}: {e}",
                                  str(req_path))
        
        # Frontend dependencies
        package_json_path = self.frontend_path / "package.json"
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                    
                    # Verificar scripts críticos
                    scripts = package_data.get('scripts', {})
                    required_scripts = ['build', 'start', 'dev']
                    
                    for script in required_scripts:
                        if script not in scripts:
                            self.add_issue("critical", "frontend",
                                          f"Script faltante: {script}",
                                          f"El script '{script}' es necesario para producción",
                                          str(package_json_path))
                    
                    # Verificar dependencias de producción
                    dependencies = package_data.get('dependencies', {})
                    dev_dependencies = package_data.get('devDependencies', {})
                    
                    # Verificar que no haya dependencias de desarrollo en producción
                    for dep in dev_dependencies:
                        if dep in dependencies:
                            self.add_issue("medium", "dependencies",
                                          f"Dependencia duplicada: {dep}",
                                          f"La dependencia {dep} está tanto en dependencies como devDependencies",
                                          str(package_json_path))
                            
            except Exception as e:
                self.add_issue("critical", "dependencies",
                              f"Error leyendo package.json",
                              f"No se pudo leer package.json: {e}",
                              str(package_json_path))
    
    def check_configuration_files(self):
        """Verificar archivos de configuración"""
        print("⚙️ Verificando archivos de configuración...")
        
        # Django settings
        settings_files = [
            "config/settings/base.py",
            "config/settings/production.py",
            "config/settings/local.py"
        ]
        
        for settings_file in settings_files:
            settings_path = self.backend_path / settings_file
            if settings_path.exists():
                try:
                    with open(settings_path, 'r') as f:
                        content = f.read()
                        
                        # Verificar configuración de seguridad
                        if 'DEBUG = True' in content and 'production' in settings_file:
                            self.add_issue("critical", "configuration",
                                          f"DEBUG=True en configuración de producción",
                                          f"El archivo {settings_file} tiene DEBUG=True",
                                          str(settings_path),
                                          fix="Cambiar DEBUG = False para producción")
                        
                        # Verificar ALLOWED_HOSTS
                        if 'ALLOWED_HOSTS' not in content and 'production' in settings_file:
                            self.add_issue("critical", "configuration",
                                          f"ALLOWED_HOSTS no configurado en producción",
                                          f"El archivo {settings_file} no tiene ALLOWED_HOSTS configurado",
                                          str(settings_path),
                                          fix="Agregar ALLOWED_HOSTS = ['tu-dominio.com']")
                        
                        # Verificar SECRET_KEY
                        if 'SECRET_KEY' in content and 'os.environ' not in content:
                            self.add_issue("critical", "security",
                                          f"SECRET_KEY hardcodeada en {settings_file}",
                                          f"El archivo {settings_file} tiene SECRET_KEY hardcodeada",
                                          str(settings_path),
                                          fix="Usar SECRET_KEY = os.environ.get('SECRET_KEY')")
                            
                except Exception as e:
                    self.add_issue("high", "configuration",
                                  f"Error leyendo {settings_file}",
                                  f"No se pudo leer el archivo {settings_file}: {e}",
                                  str(settings_path))
        
        # Next.js configuration
        next_config_path = self.frontend_path / "next.config.mjs"
        if next_config_path.exists():
            try:
                with open(next_config_path, 'r') as f:
                    content = f.read()
                    
                    # Verificar configuración de producción
                    if 'output: "export"' in content:
                        self.add_issue("info", "configuration",
                                      "Next.js configurado para export estático",
                                      "El proyecto está configurado para export estático",
                                      str(next_config_path))
                        
            except Exception as e:
                self.add_issue("medium", "configuration",
                              f"Error leyendo next.config.mjs",
                              f"No se pudo leer next.config.mjs: {e}",
                              str(next_config_path))
    
    def check_database_configuration(self):
        """Verificar configuración de base de datos"""
        print("🗄️ Verificando configuración de base de datos...")
        
        # Verificar migraciones
        migrations_dir = self.backend_path / "apps"
        if migrations_dir.exists():
            for app_dir in migrations_dir.iterdir():
                if app_dir.is_dir():
                    migrations_path = app_dir / "migrations"
                    if migrations_path.exists():
                        migration_files = list(migrations_path.glob("*.py"))
                        if len(migration_files) == 0:
                            self.add_issue("medium", "database",
                                          f"Sin migraciones en {app_dir.name}",
                                          f"La aplicación {app_dir.name} no tiene migraciones",
                                          str(migrations_path))
        
        # Verificar configuración de base de datos en settings
        settings_path = self.backend_path / "config/settings/base.py"
        if settings_path.exists():
            try:
                with open(settings_path, 'r') as f:
                    content = f.read()
                    
                    if 'DATABASES' not in content:
                        self.add_issue("critical", "database",
                                      "Configuración de DATABASES faltante",
                                      "No se encontró configuración de DATABASES en settings",
                                      str(settings_path))
                        
            except Exception as e:
                self.add_issue("high", "database",
                              f"Error verificando configuración de base de datos",
                              f"No se pudo leer la configuración: {e}",
                              str(settings_path))
    
    def check_api_endpoints(self):
        """Verificar endpoints de API"""
        print("🔗 Verificando endpoints de API...")
        
        # Verificar URLs principales
        urls_path = self.backend_path / "config/urls.py"
        if urls_path.exists():
            try:
                with open(urls_path, 'r') as f:
                    content = f.read()
                    
                    # Verificar endpoints críticos
                    critical_endpoints = [
                        "admin/",
                        "api/",
                        "health/"
                    ]
                    
                    for endpoint in critical_endpoints:
                        if endpoint not in content:
                            self.add_issue("medium", "api",
                                          f"Endpoint faltante: {endpoint}",
                                          f"El endpoint {endpoint} no está configurado",
                                          str(urls_path))
                            
            except Exception as e:
                self.add_issue("high", "api",
                              f"Error verificando URLs",
                              f"No se pudo leer urls.py: {e}",
                              str(urls_path))
    
    def check_frontend_build(self):
        """Verificar build del frontend"""
        print("🏗️ Verificando build del frontend...")
        
        # Verificar que se pueda hacer build
        try:
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                self.add_issue("critical", "frontend",
                              "Error en build del frontend",
                              f"El build del frontend falló: {result.stderr}",
                              fix="Revisar errores de TypeScript y dependencias")
            else:
                self.add_issue("info", "frontend",
                              "Build del frontend exitoso",
                              "El frontend se puede compilar correctamente")
                
        except subprocess.TimeoutExpired:
            self.add_issue("high", "frontend",
                          "Timeout en build del frontend",
                          "El build del frontend tardó más de 5 minutos",
                          fix="Optimizar dependencias y configuración")
        except FileNotFoundError:
            self.add_issue("critical", "frontend",
                          "npm no encontrado",
                          "npm no está instalado o no está en PATH",
                          fix="Instalar Node.js y npm")
        except Exception as e:
            self.add_issue("high", "frontend",
                          f"Error ejecutando build: {e}",
                          f"Error inesperado durante el build: {e}")
    
    def check_backend_tests(self):
        """Verificar tests del backend"""
        print("🧪 Verificando tests del backend...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "test", "--verbosity=2"],
                cwd=self.backend_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                self.add_issue("high", "testing",
                              "Tests del backend fallando",
                              f"Los tests del backend fallaron: {result.stderr}",
                              fix="Revisar y corregir tests fallidos")
            else:
                # Extraer estadísticas de tests
                output = result.stdout
                if "FAILED" in output:
                    self.add_issue("high", "testing",
                                  "Tests del backend con fallos",
                                  "Algunos tests del backend están fallando",
                                  fix="Revisar y corregir tests fallidos")
                else:
                    self.add_issue("info", "testing",
                                  "Tests del backend pasando",
                                  "Todos los tests del backend están pasando")
                    
        except subprocess.TimeoutExpired:
            self.add_issue("medium", "testing",
                          "Timeout en tests del backend",
                          "Los tests del backend tardaron más de 5 minutos",
                          fix="Optimizar tests y configuración")
        except Exception as e:
            self.add_issue("medium", "testing",
                          f"Error ejecutando tests: {e}",
                          f"Error inesperado durante los tests: {e}")
    
    def check_deployment_configuration(self):
        """Verificar configuración de deployment"""
        print("🚀 Verificando configuración de deployment...")
        
        # Verificar archivos de deployment
        deployment_files = [
            "Dockerfile",
            "docker-compose.yml",
            "Procfile",
            "railway.json",
            "vercel.json"
        ]
        
        found_deployment_files = []
        for file_name in deployment_files:
            file_path = self.project_root / file_name
            if file_path.exists():
                found_deployment_files.append(file_name)
        
        if not found_deployment_files:
            self.add_issue("critical", "deployment",
                          "Sin configuración de deployment",
                          "No se encontraron archivos de configuración de deployment",
                          fix="Crear Dockerfile, docker-compose.yml o configuración específica de la plataforma")
        else:
            self.add_issue("info", "deployment",
                          f"Archivos de deployment encontrados: {', '.join(found_deployment_files)}",
                          f"Se encontraron {len(found_deployment_files)} archivos de configuración de deployment")
        
        # Verificar variables de entorno
        env_template_path = self.project_root / ".env.example"
        if not env_template_path.exists():
            self.add_issue("medium", "deployment",
                          "Archivo .env.example faltante",
                          "No se encontró archivo .env.example para documentar variables de entorno",
                          fix="Crear .env.example con todas las variables necesarias")
    
    def check_performance_issues(self):
        """Verificar problemas de performance"""
        print("⚡ Verificando problemas de performance...")
        
        # Verificar tamaño de node_modules
        node_modules_path = self.frontend_path / "node_modules"
        if node_modules_path.exists():
            try:
                size = sum(f.stat().st_size for f in node_modules_path.rglob('*') if f.is_file())
                size_mb = size / (1024 * 1024)
                
                if size_mb > 500:  # Más de 500MB
                    self.add_issue("medium", "performance",
                                  f"node_modules muy grande ({size_mb:.1f}MB)",
                                  f"El directorio node_modules es muy grande: {size_mb:.1f}MB",
                                  fix="Revisar dependencias innecesarias y usar .npmrc para optimizar")
                else:
                    self.add_issue("info", "performance",
                                  f"Tamaño de node_modules aceptable ({size_mb:.1f}MB)",
                                  f"El directorio node_modules tiene un tamaño razonable")
                    
            except Exception as e:
                self.add_issue("low", "performance",
                              f"Error verificando tamaño de node_modules: {e}",
                              f"No se pudo verificar el tamaño: {e}")
        
        # Verificar archivos grandes
        large_files = []
        for file_path in self.project_root.rglob("*"):
            if file_path.is_file():
                try:
                    size = file_path.stat().st_size
                    if size > 10 * 1024 * 1024:  # Más de 10MB
                        large_files.append((file_path, size))
                except:
                    pass
        
        if large_files:
            for file_path, size in large_files[:5]:  # Mostrar solo los primeros 5
                size_mb = size / (1024 * 1024)
                self.add_issue("medium", "performance",
                              f"Archivo muy grande: {file_path.name} ({size_mb:.1f}MB)",
                              f"El archivo {file_path} es muy grande: {size_mb:.1f}MB",
                              str(file_path),
                              fix="Considerar comprimir o mover a CDN")
    
    def check_documentation(self):
        """Verificar documentación"""
        print("📚 Verificando documentación...")
        
        # Verificar README
        readme_files = ["README.md", "README.txt"]
        readme_found = False
        
        for readme_file in readme_files:
            readme_path = self.project_root / readme_file
            if readme_path.exists():
                readme_found = True
                try:
                    with open(readme_path, 'r') as f:
                        content = f.read()
                        
                        # Verificar secciones importantes
                        important_sections = [
                            "instalación",
                            "configuración",
                            "deployment",
                            "uso"
                        ]
                        
                        missing_sections = []
                        for section in important_sections:
                            if section.lower() not in content.lower():
                                missing_sections.append(section)
                        
                        if missing_sections:
                            self.add_issue("medium", "documentation",
                                          f"Secciones faltantes en README: {', '.join(missing_sections)}",
                                          f"El README no tiene las secciones: {', '.join(missing_sections)}",
                                          str(readme_path),
                                          fix="Agregar secciones faltantes al README")
                        else:
                            self.add_issue("info", "documentation",
                                          "README completo",
                                          "El README contiene todas las secciones importantes")
                            
                except Exception as e:
                    self.add_issue("low", "documentation",
                                  f"Error leyendo README: {e}",
                                  f"No se pudo leer el README: {e}",
                                  str(readme_path))
                break
        
        if not readme_found:
            self.add_issue("high", "documentation",
                          "README faltante",
                          "No se encontró archivo README",
                          fix="Crear README.md con instrucciones de instalación y uso")
    
    def generate_report(self):
        """Generar reporte completo"""
        print("\n📊 Generando reporte de auditoría...")
        
        total_issues = sum(len(issues) for issues in self.issues.values())
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_issues": total_issues,
                "critical": len(self.issues["critical"]),
                "high": len(self.issues["high"]),
                "medium": len(self.issues["medium"]),
                "low": len(self.issues["low"]),
                "info": len(self.issues["info"])
            },
            "issues": self.issues,
            "recommendations": self.generate_recommendations()
        }
        
        # Guardar reporte
        report_path = self.project_root / "production_audit_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Mostrar resumen
        print("\n" + "="*60)
        print("🔍 AUDITORÍA DE PREPARACIÓN PARA PRODUCCIÓN")
        print("="*60)
        print(f"📊 Total de problemas encontrados: {total_issues}")
        print(f"🚨 Críticos: {len(self.issues['critical'])}")
        print(f"⚠️  Altos: {len(self.issues['high'])}")
        print(f"⚡ Medios: {len(self.issues['medium'])}")
        print(f"💡 Bajos: {len(self.issues['low'])}")
        print(f"ℹ️  Información: {len(self.issues['info'])}")
        
        # Mostrar problemas críticos
        if self.issues["critical"]:
            print("\n🚨 PROBLEMAS CRÍTICOS (Deben resolverse antes de producción):")
            for i, issue in enumerate(self.issues["critical"], 1):
                print(f"  {i}. {issue['title']}")
                print(f"     {issue['description']}")
                if issue.get('fix'):
                    print(f"     💡 Fix: {issue['fix']}")
                print()
        
        # Mostrar problemas altos
        if self.issues["high"]:
            print("\n⚠️  PROBLEMAS ALTOS (Recomendado resolver antes de producción):")
            for i, issue in enumerate(self.issues["high"], 1):
                print(f"  {i}. {issue['title']}")
                print(f"     {issue['description']}")
                if issue.get('fix'):
                    print(f"     💡 Fix: {issue['fix']}")
                print()
        
        print(f"\n📄 Reporte completo guardado en: {report_path}")
        
        # Determinar si está listo para producción
        if len(self.issues["critical"]) == 0 and len(self.issues["high"]) == 0:
            print("\n✅ EL PROYECTO ESTÁ LISTO PARA PRODUCCIÓN")
        elif len(self.issues["critical"]) == 0:
            print("\n⚠️  EL PROYECTO TIENE PROBLEMAS MENORES - Revisar antes de producción")
        else:
            print("\n❌ EL PROYECTO NO ESTÁ LISTO PARA PRODUCCIÓN - Resolver problemas críticos")
        
        return report
    
    def generate_recommendations(self):
        """Generar recomendaciones generales"""
        recommendations = []
        
        if len(self.issues["critical"]) > 0:
            recommendations.append({
                "priority": "critical",
                "title": "Resolver problemas críticos",
                "description": "Debes resolver todos los problemas críticos antes de ir a producción"
            })
        
        if len(self.issues["high"]) > 0:
            recommendations.append({
                "priority": "high",
                "title": "Revisar problemas altos",
                "description": "Es recomendable resolver los problemas de alta prioridad"
            })
        
        recommendations.extend([
            {
                "priority": "medium",
                "title": "Configurar monitoreo",
                "description": "Implementar herramientas de monitoreo (Sentry, LogRocket, etc.)"
            },
            {
                "priority": "medium",
                "title": "Configurar backups",
                "description": "Implementar estrategia de backups automáticos de la base de datos"
            },
            {
                "priority": "medium",
                "title": "Configurar SSL",
                "description": "Asegurar que el dominio tenga certificado SSL válido"
            },
            {
                "priority": "low",
                "title": "Optimizar performance",
                "description": "Considerar optimizaciones de performance (CDN, caching, etc.)"
            }
        ])
        
        return recommendations
    
    def run_full_audit(self):
        """Ejecutar auditoría completa"""
        print("🔍 INICIANDO AUDITORÍA DE PREPARACIÓN PARA PRODUCCIÓN")
        print("=" * 60)
        
        self.check_project_structure()
        self.check_security_issues()
        self.check_dependencies()
        self.check_configuration_files()
        self.check_database_configuration()
        self.check_api_endpoints()
        self.check_frontend_build()
        self.check_backend_tests()
        self.check_deployment_configuration()
        self.check_performance_issues()
        self.check_documentation()
        
        return self.generate_report()

def main():
    auditor = ProductionReadinessAuditor()
    report = auditor.run_full_audit()
    
    # Guardar reporte también en formato legible
    report_path = Path("production_audit_report.json")
    if report_path.exists():
        with open(report_path, 'r') as f:
            data = json.load(f)
        
        # Crear versión legible
        readable_path = Path("production_audit_report.md")
        with open(readable_path, 'w') as f:
            f.write("# Auditoría de Preparación para Producción - Padelyzer\n\n")
            f.write(f"**Fecha:** {data['timestamp']}\n\n")
            
            f.write("## Resumen\n\n")
            f.write(f"- Total de problemas: {data['summary']['total_issues']}\n")
            f.write(f"- Críticos: {data['summary']['critical']}\n")
            f.write(f"- Altos: {data['summary']['high']}\n")
            f.write(f"- Medios: {data['summary']['medium']}\n")
            f.write(f"- Bajos: {data['summary']['low']}\n")
            f.write(f"- Información: {data['summary']['info']}\n\n")
            
            for severity in ['critical', 'high', 'medium', 'low', 'info']:
                if data['issues'][severity]:
                    f.write(f"## {severity.upper()}\n\n")
                    for issue in data['issues'][severity]:
                        f.write(f"### {issue['title']}\n")
                        f.write(f"**Categoría:** {issue['category']}\n")
                        f.write(f"**Descripción:** {issue['description']}\n")
                        if issue.get('file_path'):
                            f.write(f"**Archivo:** {issue['file_path']}\n")
                        if issue.get('fix'):
                            f.write(f"**Solución:** {issue['fix']}\n")
                        f.write("\n")
        
        print(f"📄 Reporte legible guardado en: {readable_path}")

if __name__ == "__main__":
    main()
