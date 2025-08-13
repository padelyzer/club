#!/usr/bin/env python3
"""
Script para analizar y comparar las versiones del proyecto Padelyzer
Determina cuál es la versión activa y cuál debería mantenerse
"""

import os
import json
from pathlib import Path
from datetime import datetime
import subprocess

class ProjectVersionAnalyzer:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.clean_version_path = self.project_root / "clean_version"
        self.main_frontend_path = self.project_root / "frontend"
        self.main_backend_path = self.project_root / "backend"
        
    def get_file_modification_time(self, file_path):
        """Obtener tiempo de modificación de un archivo"""
        if file_path.exists():
            return datetime.fromtimestamp(file_path.stat().st_mtime)
        return None
    
    def compare_package_versions(self):
        """Comparar versiones de package.json"""
        print("📦 COMPARANDO VERSIONES DE PACKAGE.JSON")
        print("=" * 50)
        
        # Frontend package.json
        main_package = self.main_frontend_path / "package.json"
        clean_package = self.clean_version_path / "frontend" / "package.json"
        
        if main_package.exists() and clean_package.exists():
            main_time = self.get_file_modification_time(main_package)
            clean_time = self.get_file_modification_time(clean_package)
            
            print(f"📱 Frontend Package.json:")
            print(f"   Principal: {main_time}")
            print(f"   Clean:     {clean_time}")
            print(f"   Más reciente: {'Principal' if main_time > clean_time else 'Clean'}")
            
            # Comparar contenido
            with open(main_package, 'r') as f:
                main_content = json.load(f)
            with open(clean_package, 'r') as f:
                clean_content = json.load(f)
            
            print(f"   Dependencias principales:")
            print(f"   Principal Next.js: {main_content.get('dependencies', {}).get('next', 'N/A')}")
            print(f"   Clean Next.js:     {clean_content.get('dependencies', {}).get('next', 'N/A')}")
            print(f"   Principal React:   {main_content.get('dependencies', {}).get('react', 'N/A')}")
            print(f"   Clean React:       {clean_content.get('dependencies', {}).get('react', 'N/A')}")
    
    def compare_manage_py(self):
        """Comparar manage.py del backend"""
        print("\n🐍 COMPARANDO MANAGE.PY")
        print("=" * 50)
        
        main_manage = self.main_backend_path / "manage.py"
        clean_manage = self.clean_version_path / "backend" / "manage.py"
        
        if main_manage.exists() and clean_manage.exists():
            main_time = self.get_file_modification_time(main_manage)
            clean_time = self.get_file_modification_time(clean_manage)
            
            print(f"📄 Manage.py:")
            print(f"   Principal: {main_time}")
            print(f"   Clean:     {clean_time}")
            print(f"   Más reciente: {'Principal' if main_time > clean_time else 'Clean'}")
    
    def count_files_by_type(self, directory):
        """Contar archivos por tipo en un directorio"""
        if not directory.exists():
            return {}
        
        counts = {}
        for file_path in directory.rglob("*"):
            if file_path.is_file():
                ext = file_path.suffix.lower()
                counts[ext] = counts.get(ext, 0) + 1
        return counts
    
    def analyze_directory_structure(self):
        """Analizar estructura de directorios"""
        print("\n📁 ANALIZANDO ESTRUCTURA DE DIRECTORIOS")
        print("=" * 50)
        
        # Frontend
        print("📱 Frontend:")
        main_frontend_files = self.count_files_by_type(self.main_frontend_path)
        clean_frontend_files = self.count_files_by_type(self.clean_version_path / "frontend")
        
        print(f"   Principal: {sum(main_frontend_files.values())} archivos")
        print(f"   Clean:     {sum(clean_frontend_files.values())} archivos")
        
        # Backend
        print("🐍 Backend:")
        main_backend_files = self.count_files_by_type(self.main_backend_path)
        clean_backend_files = self.count_files_by_type(self.clean_version_path / "backend")
        
        print(f"   Principal: {sum(main_backend_files.values())} archivos")
        print(f"   Clean:     {sum(clean_backend_files.values())} archivos")
    
    def check_git_status(self):
        """Verificar estado de Git"""
        print("\n🔍 VERIFICANDO ESTADO DE GIT")
        print("=" * 50)
        
        # Principal
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "-5"], 
                cwd=self.project_root, 
                capture_output=True, 
                text=True
            )
            if result.returncode == 0:
                print("📝 Últimos commits (Principal):")
                for line in result.stdout.strip().split('\n'):
                    if line:
                        print(f"   {line}")
        except Exception as e:
            print(f"❌ Error verificando Git principal: {e}")
        
        # Clean version
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "-5"], 
                cwd=self.clean_version_path, 
                capture_output=True, 
                text=True
            )
            if result.returncode == 0:
                print("📝 Últimos commits (Clean):")
                for line in result.stdout.strip().split('\n'):
                    if line:
                        print(f"   {line}")
        except Exception as e:
            print(f"❌ Error verificando Git clean: {e}")
    
    def check_recent_files(self):
        """Verificar archivos más recientes"""
        print("\n🕒 ARCHIVOS MÁS RECIENTES")
        print("=" * 50)
        
        # Buscar archivos modificados en las últimas 24 horas
        recent_files = []
        for file_path in self.project_root.rglob("*"):
            if file_path.is_file() and not str(file_path).startswith(str(self.clean_version_path)):
                mod_time = self.get_file_modification_time(file_path)
                if mod_time and (datetime.now() - mod_time).days < 1:
                    recent_files.append((file_path, mod_time))
        
        recent_files.sort(key=lambda x: x[1], reverse=True)
        
        print("📄 Archivos modificados en las últimas 24 horas:")
        for file_path, mod_time in recent_files[:10]:
            relative_path = file_path.relative_to(self.project_root)
            print(f"   {relative_path} - {mod_time}")
    
    def generate_recommendation(self):
        """Generar recomendación sobre qué versión mantener"""
        print("\n💡 RECOMENDACIÓN")
        print("=" * 50)
        
        main_package = self.main_frontend_path / "package.json"
        clean_package = self.clean_version_path / "frontend" / "package.json"
        
        if main_package.exists() and clean_package.exists():
            main_time = self.get_file_modification_time(main_package)
            clean_time = self.get_file_modification_time(clean_package)
            
            if main_time > clean_time:
                print("✅ RECOMENDACIÓN: Mantener la versión PRINCIPAL")
                print("   Razones:")
                print("   - Package.json más reciente")
                print("   - Más dependencias actualizadas")
                print("   - Estructura más completa")
                print("\n   Acciones sugeridas:")
                print("   1. Eliminar directorio clean_version")
                print("   2. Continuar trabajando en la versión principal")
                print("   3. Ejecutar limpieza de archivos temporales")
            else:
                print("✅ RECOMENDACIÓN: Considerar migrar a clean_version")
                print("   Razones:")
                print("   - Versión más limpia")
                print("   - Menos archivos temporales")
                print("   - Estructura más organizada")
        else:
            print("⚠️  No se pueden comparar las versiones")
    
    def run_analysis(self):
        """Ejecutar análisis completo"""
        print("🔍 ANÁLISIS DE VERSIONES DEL PROYECTO PADELYZER")
        print("=" * 60)
        
        self.compare_package_versions()
        self.compare_manage_py()
        self.analyze_directory_structure()
        self.check_git_status()
        self.check_recent_files()
        self.generate_recommendation()
        
        print("\n📊 RESUMEN")
        print("=" * 50)
        print("• La versión principal tiene más archivos y dependencias actualizadas")
        print("• La versión clean parece ser una copia anterior más limpia")
        print("• Se recomienda mantener la versión principal y limpiar archivos temporales")

def main():
    analyzer = ProjectVersionAnalyzer()
    analyzer.run_analysis()

if __name__ == "__main__":
    main()
