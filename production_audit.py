#!/usr/bin/env python3
"""
Auditoría de Preparación para Producción - Padelyzer
"""

import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

class ProductionAuditor:
    def __init__(self):
        self.project_root = Path(".")
        self.issues = {"critical": [], "high": [], "medium": [], "low": []}
    
    def add_issue(self, severity, title, description, fix=None):
        self.issues[severity].append({
            "title": title,
            "description": description,
            "fix": fix
        })
    
    def check_critical_files(self):
        """Verificar archivos críticos"""
        critical_files = [
            "backend/manage.py",
            "backend/requirements/base.txt",
            "frontend/package.json",
            "frontend/next.config.mjs"
        ]
        
        for file_path in critical_files:
            if not (self.project_root / file_path).exists():
                self.add_issue("critical", f"Archivo faltante: {file_path}", 
                              f"El archivo {file_path} es esencial")
    
    def check_security(self):
        """Verificar problemas de seguridad"""
        env_files = [".env", ".env.local", ".env.production"]
        
        for env_file in env_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                self.add_issue("critical", f"Archivo {env_file} en repositorio",
                              f"El archivo {env_file} contiene información sensible",
                              "Mover a .gitignore y usar variables de entorno")
    
    def check_dependencies(self):
        """Verificar dependencias"""
        # Backend
        req_path = self.project_root / "backend/requirements/base.txt"
        if req_path.exists():
            with open(req_path, 'r') as f:
                content = f.read()
                if "Django" not in content:
                    self.add_issue("critical", "Django no encontrado en requirements",
                                  "Django no está en requirements/base.txt")
        
        # Frontend
        package_path = self.project_root / "frontend/package.json"
        if package_path.exists():
            with open(package_path, 'r') as f:
                data = json.load(f)
                scripts = data.get('scripts', {})
                if 'build' not in scripts:
                    self.add_issue("critical", "Script build faltante",
                                  "No hay script 'build' en package.json")
    
    def check_configuration(self):
        """Verificar configuración"""
        settings_path = self.project_root / "backend/config/settings/base.py"
        if settings_path.exists():
            with open(settings_path, 'r') as f:
                content = f.read()
                if 'DEBUG = True' in content:
                    self.add_issue("high", "DEBUG=True en configuración base",
                                  "DEBUG está en True en configuración base",
                                  "Usar variables de entorno para DEBUG")
    
    def check_database(self):
        """Verificar base de datos"""
        settings_path = self.project_root / "backend/config/settings/base.py"
        if settings_path.exists():
            with open(settings_path, 'r') as f:
                content = f.read()
                if 'DATABASES' not in content:
                    self.add_issue("critical", "Configuración de DATABASES faltante",
                                  "No hay configuración de DATABASES")
    
    def check_deployment(self):
        """Verificar configuración de deployment"""
        deployment_files = ["Dockerfile", "docker-compose.yml", "Procfile"]
        found = [f for f in deployment_files if (self.project_root / f).exists()]
        
        if not found:
            self.add_issue("critical", "Sin configuración de deployment",
                          "No hay archivos de configuración de deployment",
                          "Crear Dockerfile o configuración específica")
    
    def run_audit(self):
        """Ejecutar auditoría completa"""
        print("🔍 Auditoría de Preparación para Producción")
        print("=" * 50)
        
        self.check_critical_files()
        self.check_security()
        self.check_dependencies()
        self.check_configuration()
        self.check_database()
        self.check_deployment()
        
        # Generar reporte
        total_issues = sum(len(issues) for issues in self.issues.values())
        
        print(f"\n📊 Total de problemas: {total_issues}")
        print(f"🚨 Críticos: {len(self.issues['critical'])}")
        print(f"⚠️  Altos: {len(self.issues['high'])}")
        print(f"⚡ Medios: {len(self.issues['medium'])}")
        print(f"💡 Bajos: {len(self.issues['low'])}")
        
        if self.issues["critical"]:
            print("\n🚨 PROBLEMAS CRÍTICOS:")
            for issue in self.issues["critical"]:
                print(f"  • {issue['title']}")
                print(f"    {issue['description']}")
                if issue.get('fix'):
                    print(f"    💡 {issue['fix']}")
                print()
        
        if self.issues["high"]:
            print("\n⚠️  PROBLEMAS ALTOS:")
            for issue in self.issues["high"]:
                print(f"  • {issue['title']}")
                print(f"    {issue['description']}")
                if issue.get('fix'):
                    print(f"    💡 {issue['fix']}")
                print()
        
        # Conclusión
        if len(self.issues["critical"]) == 0:
            print("✅ El proyecto está listo para producción")
        else:
            print("❌ El proyecto NO está listo para producción")
            print("   Resolver problemas críticos antes de continuar")
        
        return self.issues

if __name__ == "__main__":
    auditor = ProductionAuditor()
    auditor.run_audit()
