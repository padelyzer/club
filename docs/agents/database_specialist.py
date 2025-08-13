#!/usr/bin/env python3
"""
🗄️ Database Specialist Agent for Padelyzer
Analiza la estructura de base de datos, relaciones, índices y optimizaciones
"""

import os
import re
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
import ast

class DatabaseSpecialistAgent:
    """Agente especializado en análisis de base de datos Django"""
    
    def __init__(self, project_root: str = "/Users/ja/PZR4"):
        self.project_root = Path(project_root)
        self.backend_path = self.project_root / "backend"
        self.apps_path = self.backend_path / "apps"
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def analyze_database_structure(self) -> Dict[str, Any]:
        """Análisis completo de la estructura de base de datos"""
        print("🗄️ Database Specialist Agent - Iniciando análisis...")
        print("=" * 60)
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "models": self._analyze_all_models(),
            "relationships": self._analyze_relationships(),
            "indexes": self._analyze_indexes(),
            "migrations": self._analyze_migrations(),
            "optimizations": self._suggest_optimizations(),
            "schema_diagram": self._generate_schema_diagram(),
            "statistics": self._calculate_statistics()
        }
        
        # Guardar resultados
        self._save_results(results)
        self._generate_documentation(results)
        
        return results
    
    def _analyze_all_models(self) -> Dict[str, Any]:
        """Analiza todos los modelos Django en el proyecto"""
        models = {}
        
        for app_dir in self.apps_path.iterdir():
            if app_dir.is_dir() and (app_dir / "models.py").exists():
                app_name = app_dir.name
                models[app_name] = self._analyze_app_models(app_dir / "models.py", app_name)
                
        return models
    
    def _analyze_app_models(self, model_file: Path, app_name: str) -> Dict[str, Any]:
        """Analiza los modelos de una aplicación específica"""
        with open(model_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse del archivo Python
        try:
            tree = ast.parse(content)
        except:
            return {"error": "No se pudo parsear el archivo"}
        
        models = {}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                # Verificar si es un modelo Django
                if any(base.id == 'Model' or 
                      (hasattr(base, 'attr') and base.attr == 'Model')
                      for base in node.bases if hasattr(base, 'id') or hasattr(base, 'attr')):
                    
                    model_info = {
                        "name": node.name,
                        "fields": self._extract_fields(node),
                        "meta": self._extract_meta(node),
                        "methods": self._extract_methods(node),
                        "properties": self._extract_properties(node),
                        "managers": self._extract_managers(node),
                        "line_number": node.lineno
                    }
                    models[node.name] = model_info
        
        return models
    
    def _extract_fields(self, class_node: ast.ClassDef) -> List[Dict[str, Any]]:
        """Extrae información de los campos del modelo"""
        fields = []
        
        for node in class_node.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        field_info = self._analyze_field(target.id, node.value)
                        if field_info:
                            fields.append(field_info)
        
        return fields
    
    def _analyze_field(self, field_name: str, value_node: ast.AST) -> Dict[str, Any]:
        """Analiza un campo específico del modelo"""
        if isinstance(value_node, ast.Call):
            if hasattr(value_node.func, 'attr'):
                field_type = value_node.func.attr
                
                # Extraer parámetros del campo
                params = {}
                for keyword in value_node.keywords:
                    if isinstance(keyword.value, ast.Constant):
                        params[keyword.arg] = keyword.value.value
                    elif isinstance(keyword.value, ast.Name):
                        params[keyword.arg] = keyword.value.id
                
                return {
                    "name": field_name,
                    "type": field_type,
                    "params": params,
                    "is_relation": field_type in ['ForeignKey', 'ManyToManyField', 'OneToOneField'],
                    "is_indexed": params.get('db_index', False),
                    "is_unique": params.get('unique', False),
                    "is_nullable": params.get('null', False),
                    "has_default": 'default' in params
                }
        
        return None
    
    def _extract_meta(self, class_node: ast.ClassDef) -> Dict[str, Any]:
        """Extrae información de la clase Meta del modelo"""
        meta_info = {}
        
        for node in class_node.body:
            if isinstance(node, ast.ClassDef) and node.name == 'Meta':
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name):
                                meta_info[target.id] = self._extract_value(item.value)
        
        return meta_info
    
    def _extract_value(self, node: ast.AST) -> Any:
        """Extrae el valor de un nodo AST"""
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.List):
            return [self._extract_value(elt) for elt in node.elts]
        elif isinstance(node, ast.Tuple):
            return tuple(self._extract_value(elt) for elt in node.elts)
        else:
            return str(type(node).__name__)
    
    def _extract_methods(self, class_node: ast.ClassDef) -> List[str]:
        """Extrae los métodos del modelo"""
        methods = []
        for node in class_node.body:
            if isinstance(node, ast.FunctionDef):
                methods.append({
                    "name": node.name,
                    "args": [arg.arg for arg in node.args.args],
                    "is_property": any(isinstance(d, ast.Name) and d.id == 'property' 
                                     for d in node.decorator_list)
                })
        return methods
    
    def _extract_properties(self, class_node: ast.ClassDef) -> List[str]:
        """Extrae las propiedades del modelo"""
        return [m["name"] for m in self._extract_methods(class_node) if m.get("is_property")]
    
    def _extract_managers(self, class_node: ast.ClassDef) -> List[str]:
        """Extrae los managers personalizados"""
        managers = []
        for node in class_node.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and 'Manager' in str(node.value):
                        managers.append(target.id)
        return managers
    
    def _analyze_relationships(self) -> Dict[str, List[Dict[str, Any]]]:
        """Analiza las relaciones entre modelos"""
        relationships = {
            "foreign_keys": [],
            "many_to_many": [],
            "one_to_one": []
        }
        
        for app_name, models in self._analyze_all_models().items():
            for model_name, model_info in models.items():
                for field in model_info.get("fields", []):
                    if field.get("is_relation"):
                        rel_info = {
                            "from_app": app_name,
                            "from_model": model_name,
                            "from_field": field["name"],
                            "to_model": field["params"].get("to", "Unknown"),
                            "type": field["type"],
                            "on_delete": field["params"].get("on_delete", "CASCADE"),
                            "related_name": field["params"].get("related_name")
                        }
                        
                        if field["type"] == "ForeignKey":
                            relationships["foreign_keys"].append(rel_info)
                        elif field["type"] == "ManyToManyField":
                            relationships["many_to_many"].append(rel_info)
                        elif field["type"] == "OneToOneField":
                            relationships["one_to_one"].append(rel_info)
        
        return relationships
    
    def _analyze_indexes(self) -> Dict[str, Any]:
        """Analiza los índices de la base de datos"""
        indexes = {
            "single_field": [],
            "composite": [],
            "unique": [],
            "recommendations": []
        }
        
        for app_name, models in self._analyze_all_models().items():
            for model_name, model_info in models.items():
                # Índices de campos únicos
                for field in model_info.get("fields", []):
                    if field.get("is_indexed") or field.get("is_unique"):
                        indexes["single_field"].append({
                            "model": f"{app_name}.{model_name}",
                            "field": field["name"],
                            "type": "unique" if field.get("is_unique") else "index"
                        })
                
                # Índices compuestos de Meta
                meta = model_info.get("meta", {})
                if "index_together" in meta:
                    for idx in meta["index_together"]:
                        indexes["composite"].append({
                            "model": f"{app_name}.{model_name}",
                            "fields": idx
                        })
                
                if "unique_together" in meta:
                    for idx in meta["unique_together"]:
                        indexes["unique"].append({
                            "model": f"{app_name}.{model_name}",
                            "fields": idx
                        })
        
        # Recomendaciones de índices
        indexes["recommendations"] = self._recommend_indexes()
        
        return indexes
    
    def _recommend_indexes(self) -> List[Dict[str, str]]:
        """Genera recomendaciones de índices basadas en el análisis"""
        recommendations = []
        
        # Analizar patrones comunes que necesitan índices
        patterns = {
            "created_at": "Campos de fecha para ordenamiento",
            "updated_at": "Campos de fecha para filtrado",
            "status": "Campos de estado para filtrado frecuente",
            "email": "Campos únicos para búsqueda rápida",
            "slug": "Campos para URLs amigables"
        }
        
        for app_name, models in self._analyze_all_models().items():
            for model_name, model_info in models.items():
                for field in model_info.get("fields", []):
                    field_name = field["name"]
                    if field_name in patterns and not field.get("is_indexed"):
                        recommendations.append({
                            "model": f"{app_name}.{model_name}",
                            "field": field_name,
                            "reason": patterns[field_name],
                            "priority": "high" if field_name in ["email", "slug"] else "medium"
                        })
        
        return recommendations
    
    def _analyze_migrations(self) -> Dict[str, Any]:
        """Analiza el estado de las migraciones"""
        migrations = {
            "total_count": 0,
            "by_app": {},
            "latest_migrations": [],
            "pending": []
        }
        
        for app_dir in self.apps_path.iterdir():
            if app_dir.is_dir():
                migrations_dir = app_dir / "migrations"
                if migrations_dir.exists():
                    app_name = app_dir.name
                    migration_files = list(migrations_dir.glob("*.py"))
                    migration_files = [f for f in migration_files if f.name != "__init__.py"]
                    
                    migrations["by_app"][app_name] = {
                        "count": len(migration_files),
                        "files": sorted([f.name for f in migration_files])
                    }
                    migrations["total_count"] += len(migration_files)
                    
                    # Última migración
                    if migration_files:
                        latest = sorted(migration_files)[-1]
                        migrations["latest_migrations"].append({
                            "app": app_name,
                            "file": latest.name,
                            "date": datetime.fromtimestamp(latest.stat().st_mtime).isoformat()
                        })
        
        return migrations
    
    def _suggest_optimizations(self) -> List[Dict[str, Any]]:
        """Sugiere optimizaciones para la base de datos"""
        optimizations = []
        
        # Analizar N+1 queries potenciales
        relationships = self._analyze_relationships()
        for fk in relationships["foreign_keys"]:
            optimizations.append({
                "type": "select_related",
                "model": fk["from_model"],
                "field": fk["from_field"],
                "suggestion": f"Usar select_related('{fk['from_field']}') en queries",
                "impact": "high",
                "category": "performance"
            })
        
        for m2m in relationships["many_to_many"]:
            optimizations.append({
                "type": "prefetch_related",
                "model": m2m["from_model"],
                "field": m2m["from_field"],
                "suggestion": f"Usar prefetch_related('{m2m['from_field']}') en queries",
                "impact": "high",
                "category": "performance"
            })
        
        # Analizar campos grandes sin lazy loading
        for app_name, models in self._analyze_all_models().items():
            for model_name, model_info in models.items():
                for field in model_info.get("fields", []):
                    if field["type"] in ["TextField", "JSONField"]:
                        optimizations.append({
                            "type": "defer",
                            "model": f"{app_name}.{model_name}",
                            "field": field["name"],
                            "suggestion": f"Considerar defer('{field['name']}') para campos grandes",
                            "impact": "medium",
                            "category": "memory"
                        })
        
        return optimizations
    
    def _generate_schema_diagram(self) -> str:
        """Genera un diagrama de la estructura de base de datos en formato Mermaid"""
        diagram = ["erDiagram"]
        
        # Primero, definir todas las entidades
        all_models = self._analyze_all_models()
        for app_name, models in all_models.items():
            for model_name, model_info in models.items():
                fields_str = []
                for field in model_info.get("fields", []):
                    field_type = self._mermaid_field_type(field["type"])
                    constraint = ""
                    if field.get("is_unique"):
                        constraint = "UK"
                    elif field.get("is_indexed"):
                        constraint = "IDX"
                    fields_str.append(f"{field_type} {field['name']} {constraint}".strip())
                
                if fields_str:
                    diagram.append(f"    {model_name} {{")
                    for field_str in fields_str:
                        diagram.append(f"        {field_str}")
                    diagram.append("    }")
        
        # Luego, definir las relaciones
        relationships = self._analyze_relationships()
        for rel_type, rels in relationships.items():
            for rel in rels:
                from_model = rel["from_model"]
                to_model = rel["to_model"].split('.')[-1] if '.' in rel["to_model"] else rel["to_model"]
                
                if rel_type == "foreign_keys":
                    diagram.append(f"    {from_model} ||--o{{ {to_model} : \"{rel['from_field']}\"")
                elif rel_type == "many_to_many":
                    diagram.append(f"    {from_model} }}o--o{{ {to_model} : \"{rel['from_field']}\"")
                elif rel_type == "one_to_one":
                    diagram.append(f"    {from_model} ||--|| {to_model} : \"{rel['from_field']}\"")
        
        return "\n".join(diagram)
    
    def _mermaid_field_type(self, django_type: str) -> str:
        """Convierte tipos Django a tipos Mermaid"""
        type_mapping = {
            "CharField": "string",
            "TextField": "text",
            "IntegerField": "int",
            "BigIntegerField": "bigint",
            "FloatField": "float",
            "DecimalField": "decimal",
            "BooleanField": "boolean",
            "DateField": "date",
            "DateTimeField": "datetime",
            "TimeField": "time",
            "EmailField": "email",
            "URLField": "url",
            "UUIDField": "uuid",
            "JSONField": "json",
            "ForeignKey": "FK",
            "ManyToManyField": "M2M",
            "OneToOneField": "O2O"
        }
        return type_mapping.get(django_type, "string")
    
    def _calculate_statistics(self) -> Dict[str, Any]:
        """Calcula estadísticas sobre la base de datos"""
        all_models = self._analyze_all_models()
        relationships = self._analyze_relationships()
        
        stats = {
            "total_apps": len(all_models),
            "total_models": sum(len(models) for models in all_models.values()),
            "total_fields": 0,
            "total_relationships": {
                "foreign_keys": len(relationships["foreign_keys"]),
                "many_to_many": len(relationships["many_to_many"]),
                "one_to_one": len(relationships["one_to_one"]),
                "total": sum(len(rels) for rels in relationships.values())
            },
            "field_types_distribution": {},
            "avg_fields_per_model": 0,
            "models_without_timestamps": [],
            "models_without_str_method": []
        }
        
        # Calcular distribución de tipos de campos
        field_count = 0
        for app_name, models in all_models.items():
            for model_name, model_info in models.items():
                fields = model_info.get("fields", [])
                field_count += len(fields)
                
                # Verificar timestamps
                field_names = [f["name"] for f in fields]
                if "created_at" not in field_names or "updated_at" not in field_names:
                    stats["models_without_timestamps"].append(f"{app_name}.{model_name}")
                
                # Verificar __str__ method
                methods = [m["name"] for m in model_info.get("methods", [])]
                if "__str__" not in methods:
                    stats["models_without_str_method"].append(f"{app_name}.{model_name}")
                
                # Contar tipos de campos
                for field in fields:
                    field_type = field["type"]
                    stats["field_types_distribution"][field_type] = \
                        stats["field_types_distribution"].get(field_type, 0) + 1
        
        stats["total_fields"] = field_count
        if stats["total_models"] > 0:
            stats["avg_fields_per_model"] = round(field_count / stats["total_models"], 2)
        
        return stats
    
    def _save_results(self, results: Dict[str, Any]):
        """Guarda los resultados del análisis"""
        output_file = self.project_root / "docs" / f"database_analysis_{self.timestamp}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n📄 Resultados guardados en: {output_file}")
    
    def _generate_documentation(self, results: Dict[str, Any]):
        """Genera documentación en Markdown"""
        doc_file = self.project_root / "docs" / "DATABASE_STRUCTURE.md"
        
        with open(doc_file, 'w', encoding='utf-8') as f:
            f.write("# 🗄️ Estructura de Base de Datos - Padelyzer\n\n")
            f.write(f"**Generado**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Estadísticas
            stats = results["statistics"]
            f.write("## 📊 Estadísticas Generales\n\n")
            f.write(f"- **Total de Apps**: {stats['total_apps']}\n")
            f.write(f"- **Total de Modelos**: {stats['total_models']}\n")
            f.write(f"- **Total de Campos**: {stats['total_fields']}\n")
            f.write(f"- **Promedio campos/modelo**: {stats['avg_fields_per_model']}\n")
            f.write(f"- **Relaciones totales**: {stats['total_relationships']['total']}\n\n")
            
            # Diagrama
            f.write("## 📐 Diagrama Entidad-Relación\n\n")
            f.write("```mermaid\n")
            f.write(results["schema_diagram"])
            f.write("\n```\n\n")
            
            # Modelos por aplicación
            f.write("## 📦 Modelos por Aplicación\n\n")
            for app_name, models in results["models"].items():
                f.write(f"### {app_name.title()}\n\n")
                for model_name, model_info in models.items():
                    f.write(f"#### {model_name}\n")
                    f.write(f"- **Campos**: {len(model_info.get('fields', []))}\n")
                    f.write(f"- **Métodos**: {len(model_info.get('methods', []))}\n")
                    
                    # Campos importantes
                    fields = model_info.get('fields', [])
                    if fields:
                        f.write("- **Campos principales**:\n")
                        for field in fields[:5]:  # Mostrar primeros 5 campos
                            f.write(f"  - `{field['name']}` ({field['type']})\n")
                    f.write("\n")
            
            # Optimizaciones
            f.write("## 🚀 Optimizaciones Recomendadas\n\n")
            optimizations = results["optimizations"]
            
            # Agrupar por categoría
            by_category = {}
            for opt in optimizations:
                category = opt.get("category", "general")
                if category not in by_category:
                    by_category[category] = []
                by_category[category].append(opt)
            
            for category, opts in by_category.items():
                f.write(f"### {category.title()}\n\n")
                for opt in opts[:5]:  # Mostrar primeras 5 de cada categoría
                    f.write(f"- **{opt['model']}**: {opt['suggestion']}\n")
                f.write("\n")
            
            # Índices recomendados
            indexes = results["indexes"]
            if indexes["recommendations"]:
                f.write("## 🔍 Índices Recomendados\n\n")
                for rec in indexes["recommendations"][:10]:
                    f.write(f"- **{rec['model']}.{rec['field']}**: {rec['reason']}\n")
        
        print(f"📚 Documentación generada en: {doc_file}")

if __name__ == "__main__":
    agent = DatabaseSpecialistAgent()
    results = agent.analyze_database_structure()
    
    print("\n✅ Análisis completado!")
    print(f"\n📊 Resumen:")
    stats = results["statistics"]
    print(f"   - Apps analizadas: {stats['total_apps']}")
    print(f"   - Modelos encontrados: {stats['total_models']}")
    print(f"   - Campos totales: {stats['total_fields']}")
    print(f"   - Relaciones: {stats['total_relationships']['total']}")