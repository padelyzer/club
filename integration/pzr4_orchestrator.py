#!/usr/bin/env python3
"""
Orquestador Principal PZR4
Coordina entre Gemini Pro (contexto) y Claude Code (ejecución)
"""

import subprocess
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

from gemini_context_manager import GeminiContextManager

class PZR4Orchestrator:
    def __init__(self, gemini_api_key: str, project_path: str):
        self.gemini = GeminiContextManager(gemini_api_key)
        self.project_path = Path(project_path)
        self.session_log = []
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Crear directorio de logs
        self.logs_dir = self.project_path / "integration" / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        
    def load_project_state(self) -> Dict[str, Any]:
        """Carga el estado actual del proyecto PZR4"""
        state = {
            "timestamp": datetime.now().isoformat(),
            "git_status": self._get_git_status(),
            "recent_files": self._get_recent_files(),
            "claude_md_content": self._read_claude_md(),
            "directory_structure": self._get_directory_structure(),
            "recent_logs": self._get_recent_logs(),
            "railway_status": self._check_railway_status()
        }
        return state
    
    def execute_workflow(self, user_request: str, dry_run: bool = False) -> Dict[str, Any]:
        """Ejecuta el flujo de trabajo completo"""
        print(f"🚀 Iniciando workflow para: {user_request}")
        print(f"📁 Proyecto: {self.project_path}")
        print(f"🔍 Modo: {'DRY RUN' if dry_run else 'EJECUCIÓN'}")
        
        workflow_start = time.time()
        
        try:
            # 1. Cargar estado del proyecto
            print("\n📊 Cargando estado del proyecto...")
            project_state = self.load_project_state()
            
            # 2. Gemini Pro analiza y planifica
            print("🧠 Analizando con Gemini Pro...")
            plan = self.gemini.analyze_and_plan(user_request, project_state)
            
            self._log_plan(plan)
            print(f"📋 Plan creado: {len(plan['tasks'])} tareas identificadas")
            print(f"⏱️  Tiempo estimado: {plan['analysis'].get('estimated_time', 'N/A')}")
            print(f"🎯 Complejidad: {plan['analysis'].get('complexity', 'N/A')}")
            
            if dry_run:
                print("\n🔍 DRY RUN - No se ejecutarán las tareas")
                return {
                    "plan": plan,
                    "results": [],
                    "success": True,
                    "dry_run": True,
                    "execution_time": time.time() - workflow_start
                }
            
            # 3. Ejecutar tareas con Claude Code
            print("\\n⚡ Ejecutando tareas con Claude Code...")
            results = []
            
            for i, task in enumerate(plan['tasks'], 1):
                print(f"\\n📝 Tarea {i}/{len(plan['tasks'])}: {task['description']}")
                print(f"🔧 Comando: {task['claude_command']}")
                
                # Verificar dependencias
                if not self._check_dependencies(task, results):
                    result = {
                        "task_id": task["id"],
                        "success": False,
                        "output": "",
                        "error": "Dependencias no cumplidas",
                        "notes": "Tarea saltada por dependencias"
                    }
                    results.append(result)
                    continue
                
                # Ejecutar tarea
                result = self._execute_claude_task(task)
                results.append(result)
                
                # Actualizar memoria de Gemini
                self.gemini.update_project_memory(result)
                
                # Si hay error crítico, intentar remediar
                if not result['success'] and task.get('priority') == 'high':
                    print("❌ Error crítico detectado, consultando con Gemini...")
                    remediation = self.gemini.analyze_failure(task, result)
                    
                    if not remediation.get('requires_manual_review', False):
                        print("🔄 Intentando remediación automática...")
                        retry_result = self._execute_claude_task(remediation['remediation_task'])
                        results.append(retry_result)
                        
                        if retry_result['success']:
                            print("✅ Remediación exitosa")
                        else:
                            print("❌ Remediación falló - se requiere intervención manual")
                            break
                    else:
                        print("⚠️  Se requiere revisión manual")
                        break
                
                # Pausa entre tareas para evitar saturar el sistema
                time.sleep(1)
            
            # 4. Generar reporte final
            workflow_result = {
                "session_id": self.session_id,
                "request": user_request,
                "plan": plan,
                "results": results,
                "success": all(r['success'] for r in results),
                "execution_time": time.time() - workflow_start,
                "total_tasks": len(plan['tasks']),
                "completed_tasks": sum(1 for r in results if r['success']),
                "failed_tasks": sum(1 for r in results if not r['success'])
            }
            
            self._save_session_log(workflow_result)
            self._print_summary(workflow_result)
            
            return workflow_result
            
        except Exception as e:
            error_result = {
                "session_id": self.session_id,
                "request": user_request,
                "error": str(e),
                "success": False,
                "execution_time": time.time() - workflow_start
            }
            
            print(f"❌ Error en workflow: {e}")
            self._save_session_log(error_result)
            return error_result
    
    def _execute_claude_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta una tarea específica con Claude Code"""
        os.chdir(self.project_path)
        
        start_time = time.time()
        claude_cmd = task["claude_command"]
        
        # Si es un comando interactivo, usar modo no interactivo
        if not claude_cmd.startswith('claude -p'):
            claude_cmd = f'claude -p "{claude_cmd}"'
        
        try:
            print(f"⚡ Ejecutando: {claude_cmd}")
            
            result = subprocess.run(
                claude_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minutos timeout
                cwd=self.project_path
            )
            
            execution_time = time.time() - start_time
            
            task_result = {
                "task_id": task["id"],
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr,
                "execution_time": execution_time,
                "command": claude_cmd,
                "notes": f"Ejecutado en {execution_time:.2f}s"
            }
            
            if task_result['success']:
                print(f"✅ Completado en {execution_time:.2f}s")
            else:
                print(f"❌ Error en {execution_time:.2f}s: {result.stderr}")
            
            return task_result
            
        except subprocess.TimeoutExpired:
            return {
                "task_id": task["id"],
                "success": False,
                "output": "",
                "error": "Timeout en la ejecución (10 min)",
                "execution_time": 600,
                "command": claude_cmd,
                "notes": "Tarea cancelada por timeout"
            }
        except Exception as e:
            return {
                "task_id": task["id"],
                "success": False,
                "output": "",
                "error": str(e),
                "execution_time": time.time() - start_time,
                "command": claude_cmd,
                "notes": f"Error de ejecución: {e}"
            }
    
    def _check_dependencies(self, task: Dict, completed_results: List[Dict]) -> bool:
        """Verifica si las dependencias de una tarea están cumplidas"""
        dependencies = task.get('dependencies', [])
        if not dependencies:
            return True
        
        completed_task_ids = {r['task_id'] for r in completed_results if r['success']}
        return all(dep_id in completed_task_ids for dep_id in dependencies)
    
    def _get_git_status(self) -> Dict[str, Any]:
        """Obtiene el estado de Git"""
        try:
            os.chdir(self.project_path)
            
            # Estado general
            status_result = subprocess.run(['git', 'status', '--porcelain'], 
                                         capture_output=True, text=True)
            
            # Último commit
            last_commit = subprocess.run(['git', 'log', '-1', '--oneline'], 
                                       capture_output=True, text=True)
            
            # Rama actual
            branch_result = subprocess.run(['git', 'branch', '--show-current'], 
                                         capture_output=True, text=True)
            
            return {
                "clean": len(status_result.stdout.strip()) == 0,
                "modified_files": status_result.stdout.strip().split('\\n') if status_result.stdout.strip() else [],
                "current_branch": branch_result.stdout.strip(),
                "last_commit": last_commit.stdout.strip()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _get_recent_files(self, limit: int = 10) -> List[str]:
        """Obtiene los archivos modificados recientemente"""
        try:
            os.chdir(self.project_path)
            result = subprocess.run([
                'find', '.', '-type', 'f', '-name', '*.py', '-o', '-name', '*.js', 
                '-o', '-name', '*.md', '-mtime', '-7'
            ], capture_output=True, text=True)
            
            files = result.stdout.strip().split('\\n')[:limit]
            return [f for f in files if f and not f.startswith('./.git')]
        except Exception:
            return []
    
    def _read_claude_md(self) -> str:
        """Lee el contenido del archivo CLAUDE.md"""
        claude_md_path = self.project_path / "CLAUDE.md"
        try:
            if claude_md_path.exists():
                return claude_md_path.read_text()
            else:
                return "CLAUDE.md no encontrado"
        except Exception as e:
            return f"Error leyendo CLAUDE.md: {e}"
    
    def _get_directory_structure(self) -> Dict[str, Any]:
        """Obtiene una vista simplificada de la estructura del proyecto"""
        try:
            # Directorios principales
            main_dirs = []
            for item in self.project_path.iterdir():
                if item.is_dir() and not item.name.startswith('.'):
                    main_dirs.append(item.name)
            
            # Archivos Python principales
            python_files = list(self.project_path.glob("*.py"))
            
            return {
                "main_directories": main_dirs,
                "root_python_files": [f.name for f in python_files],
                "has_backend": (self.project_path / "backend").exists(),
                "has_frontend": (self.project_path / "frontend").exists()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _get_recent_logs(self) -> List[str]:
        """Obtiene logs recientes relevantes"""
        log_files = list(self.project_path.glob("*.log"))
        recent_logs = []
        
        for log_file in log_files[-3:]:  # Últimos 3 archivos de log
            try:
                content = log_file.read_text()
                recent_logs.append({
                    "file": log_file.name,
                    "last_lines": content.split('\\n')[-5:]  # Últimas 5 líneas
                })
            except Exception:
                continue
                
        return recent_logs
    
    def _check_railway_status(self) -> Dict[str, Any]:
        """Verifica el estado de Railway si está configurado"""
        try:
            railway_files = list(self.project_path.glob("railway-*.py"))
            railway_configs = list(self.project_path.glob("railway-*.txt"))
            
            return {
                "has_railway_scripts": len(railway_files) > 0,
                "has_railway_configs": len(railway_configs) > 0,
                "railway_files": [f.name for f in railway_files[:5]]
            }
        except Exception:
            return {"error": "No se pudo verificar estado de Railway"}
    
    def _log_plan(self, plan: Dict[str, Any]) -> None:
        """Registra el plan en logs"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": "plan",
            "session_id": self.session_id,
            "plan": plan
        }
        
        log_file = self.logs_dir / f"session_{self.session_id}.json"
        try:
            with open(log_file, 'w') as f:
                json.dump(log_entry, f, indent=2)
        except Exception as e:
            print(f"⚠️  No se pudo guardar log del plan: {e}")
    
    def _save_session_log(self, result: Dict[str, Any]) -> None:
        """Guarda el log completo de la sesión"""
        log_file = self.logs_dir / f"session_{self.session_id}_complete.json"
        try:
            with open(log_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"📄 Log guardado en: {log_file}")
        except Exception as e:
            print(f"⚠️  No se pudo guardar log de sesión: {e}")
    
    def _print_summary(self, result: Dict[str, Any]) -> None:
        """Imprime un resumen del workflow"""
        print("\\n" + "="*60)
        print("📊 RESUMEN DEL WORKFLOW")
        print("="*60)
        print(f"🆔 Sesión: {result['session_id']}")
        print(f"⏱️  Tiempo total: {result['execution_time']:.2f}s")
        print(f"📋 Tareas totales: {result['total_tasks']}")
        print(f"✅ Completadas: {result['completed_tasks']}")
        print(f"❌ Fallidas: {result['failed_tasks']}")
        print(f"🎯 Éxito general: {'SÍ' if result['success'] else 'NO'}")
        
        if result['failed_tasks'] > 0:
            print("\\n⚠️  TAREAS FALLIDAS:")
            for task_result in result['results']:
                if not task_result['success']:
                    print(f"  - Tarea {task_result['task_id']}: {task_result['error']}")
        
        print("="*60)
    
    def get_session_history(self, limit: int = 10) -> List[Dict]:
        """Obtiene el historial de sesiones recientes"""
        log_files = sorted(self.logs_dir.glob("session_*_complete.json"))[-limit:]
        history = []
        
        for log_file in log_files:
            try:
                with open(log_file) as f:
                    history.append(json.load(f))
            except Exception:
                continue
                
        return history
