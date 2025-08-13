#!/usr/bin/env python3
"""
🗄️ Database Analyzer - Seamless DB-Backend Integration Tool
Analiza la integración completa entre base de datos y backend Django
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Agregar el path del proyecto para imports
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()

from django.apps import apps
from django.db import connection
from django.db.models import Model, ForeignKey, ManyToManyField, OneToOneField
import ast
from typing import Dict, List, Any, Set, Tuple

class DatabaseBackendAnalyzer:
    """Analizador de integración DB-Backend con funciones mejoradas"""
    
    def __init__(self):
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.project_root = project_root
        self.backend_path = project_root / "backend"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "django_models": {},
            "database_schema": {},
            "integration_status": {},
            "optimizations": [],
            "issues": []
        }
        
    def analyze_full_integration(self):
        """Análisis completo de integración DB-Backend"""
        print("🗄️ Database-Backend Integration Analyzer")
        print("=" * 60)
        print("📊 Iniciando análisis de integración seamless...")
        
        # 1. Analizar modelos Django
        self._analyze_django_models()
        
        # 2. Analizar esquema de base de datos real
        self._analyze_database_schema()
        
        # 3. Validar integración
        self._validate_integration()
        
        # 4. Analizar performance
        self._analyze_performance()
        
        # 5. Generar recomendaciones
        self._generate_recommendations()
        
        # 6. Guardar resultados
        self._save_results()
        
        return self.results
    
    def _analyze_django_models(self):
        """Analiza todos los modelos Django del proyecto"""
        print("\n🔍 Analizando modelos Django...")
        
        for app_config in apps.get_app_configs():
            if app_config.path and 'site-packages' not in app_config.path:
                app_name = app_config.name
                models_info = {}
                
                for model in app_config.get_models():
                    model_name = model.__name__
                    models_info[model_name] = {
                        "fields": self._get_model_fields(model),
                        "meta": self._get_model_meta(model),
                        "methods": self._get_model_methods(model),
                        "managers": self._get_model_managers(model),
                        "relationships": self._get_model_relationships(model),
                        "indexes": self._get_model_indexes(model),
                        "constraints": self._get_model_constraints(model)
                    }
                
                if models_info:
                    self.results["django_models"][app_name] = models_info
                    print(f"  ✅ {app_name}: {len(models_info)} modelos")
    
    def _get_model_fields(self, model):
        """Obtiene información detallada de los campos"""
        fields = {}
        for field in model._meta.get_fields():
            field_info = {
                "type": field.__class__.__name__,
                "null": getattr(field, 'null', False),
                "blank": getattr(field, 'blank', False),
                "unique": getattr(field, 'unique', False),
                "db_index": getattr(field, 'db_index', False),
                "primary_key": getattr(field, 'primary_key', False),
                "editable": getattr(field, 'editable', True),
            }
            
            # Info adicional para relaciones
            if isinstance(field, (ForeignKey, ManyToManyField, OneToOneField)):
                field_info["related_model"] = field.related_model.__name__
                field_info["related_name"] = field.related_query_name()
                if isinstance(field, ForeignKey):
                    field_info["on_delete"] = str(field.on_delete)
            
            # Validadores
            if hasattr(field, 'validators'):
                field_info["validators"] = len(field.validators)
            
            fields[field.name] = field_info
        
        return fields
    
    def _get_model_meta(self, model):
        """Obtiene opciones Meta del modelo"""
        meta = model._meta
        return {
            "db_table": meta.db_table,
            "ordering": meta.ordering,
            "verbose_name": str(meta.verbose_name),
            "verbose_name_plural": str(meta.verbose_name_plural),
            "abstract": meta.abstract,
            "managed": meta.managed,
            "proxy": meta.proxy,
            "unique_together": meta.unique_together,
            "index_together": meta.index_together,
            "constraints": len(meta.constraints),
            "indexes": len(meta.indexes),
            "permissions": meta.permissions,
            "default_permissions": meta.default_permissions,
        }
    
    def _get_model_methods(self, model):
        """Obtiene métodos personalizados del modelo"""
        methods = []
        for attr_name in dir(model):
            if not attr_name.startswith('_'):
                attr = getattr(model, attr_name)
                if callable(attr) and not hasattr(Model, attr_name):
                    methods.append(attr_name)
        return methods
    
    def _get_model_managers(self, model):
        """Obtiene managers del modelo"""
        managers = {}
        for attr_name in dir(model):
            attr = getattr(model, attr_name)
            if hasattr(attr, 'model'):
                managers[attr_name] = {
                    "type": attr.__class__.__name__,
                    "use_in_migrations": getattr(attr, 'use_in_migrations', True)
                }
        return managers
    
    def _get_model_relationships(self, model):
        """Analiza relaciones del modelo"""
        relationships = {
            "foreign_keys": [],
            "many_to_many": [],
            "one_to_one": [],
            "reverse_foreign_keys": [],
            "reverse_many_to_many": []
        }
        
        for field in model._meta.get_fields():
            if isinstance(field, ForeignKey):
                relationships["foreign_keys"].append({
                    "field": field.name,
                    "to": field.related_model.__name__,
                    "on_delete": str(field.on_delete)
                })
            elif isinstance(field, ManyToManyField):
                relationships["many_to_many"].append({
                    "field": field.name,
                    "to": field.related_model.__name__
                })
            elif isinstance(field, OneToOneField):
                relationships["one_to_one"].append({
                    "field": field.name,
                    "to": field.related_model.__name__
                })
            elif hasattr(field, 'field') and field.field.__class__.__name__ == 'ForeignKey':
                relationships["reverse_foreign_keys"].append({
                    "field": field.name,
                    "from": field.related_model.__name__
                })
        
        return relationships
    
    def _get_model_indexes(self, model):
        """Obtiene índices del modelo"""
        indexes = []
        
        # Índices definidos en Meta
        for index in model._meta.indexes:
            indexes.append({
                "name": index.name,
                "fields": index.fields,
                "type": "btree"  # PostgreSQL default
            })
        
        # Índices de campos individuales
        for field in model._meta.get_fields():
            if getattr(field, 'db_index', False):
                indexes.append({
                    "name": f"{model._meta.db_table}_{field.name}_idx",
                    "fields": [field.name],
                    "type": "btree"
                })
        
        return indexes
    
    def _get_model_constraints(self, model):
        """Obtiene constraints del modelo"""
        constraints = []
        
        for constraint in model._meta.constraints:
            constraint_info = {
                "name": constraint.name,
                "type": constraint.__class__.__name__
            }
            
            if hasattr(constraint, 'fields'):
                constraint_info["fields"] = constraint.fields
            if hasattr(constraint, 'condition'):
                constraint_info["condition"] = str(constraint.condition)
                
            constraints.append(constraint_info)
        
        return constraints
    
    def _analyze_database_schema(self):
        """Analiza el esquema real de la base de datos"""
        print("\n🔍 Analizando esquema de base de datos...")
        
        with connection.cursor() as cursor:
            # Obtener todas las tablas
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            
            for (table_name,) in tables:
                if not table_name.startswith('django_'):
                    table_info = {
                        "columns": self._get_table_columns(cursor, table_name),
                        "indexes": self._get_table_indexes(cursor, table_name),
                        "constraints": self._get_table_constraints(cursor, table_name),
                        "foreign_keys": self._get_table_foreign_keys(cursor, table_name),
                        "row_count": self._get_table_row_count(cursor, table_name)
                    }
                    self.results["database_schema"][table_name] = table_info
        
        print(f"  ✅ Analizadas {len(self.results['database_schema'])} tablas")
    
    def _get_table_columns(self, cursor, table_name):
        """Obtiene columnas de una tabla"""
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position;
        """, [table_name])
        
        columns = {}
        for row in cursor.fetchall():
            columns[row[0]] = {
                "type": row[1],
                "nullable": row[2] == 'YES',
                "default": row[3],
                "max_length": row[4]
            }
        
        return columns
    
    def _get_table_indexes(self, cursor, table_name):
        """Obtiene índices de una tabla"""
        cursor.execute("""
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes
            WHERE tablename = %s;
        """, [table_name])
        
        indexes = []
        for row in cursor.fetchall():
            indexes.append({
                "name": row[0],
                "definition": row[1]
            })
        
        return indexes
    
    def _get_table_constraints(self, cursor, table_name):
        """Obtiene constraints de una tabla"""
        cursor.execute("""
            SELECT 
                conname,
                contype
            FROM pg_constraint
            JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
            WHERE relname = %s;
        """, [table_name])
        
        constraints = []
        for row in cursor.fetchall():
            constraint_type = {
                'p': 'PRIMARY KEY',
                'f': 'FOREIGN KEY',
                'u': 'UNIQUE',
                'c': 'CHECK'
            }.get(row[1], row[1])
            
            constraints.append({
                "name": row[0],
                "type": constraint_type
            })
        
        return constraints
    
    def _get_table_foreign_keys(self, cursor, table_name):
        """Obtiene foreign keys de una tabla"""
        cursor.execute("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = %s
            AND tc.constraint_type = 'FOREIGN KEY';
        """, [table_name])
        
        foreign_keys = []
        for row in cursor.fetchall():
            foreign_keys.append({
                "column": row[0],
                "references_table": row[1],
                "references_column": row[2]
            })
        
        return foreign_keys
    
    def _get_table_row_count(self, cursor, table_name):
        """Obtiene el conteo de filas de una tabla"""
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            return cursor.fetchone()[0]
        except:
            return -1
    
    def _validate_integration(self):
        """Valida la integración entre modelos Django y esquema DB"""
        print("\n🔍 Validando integración DB-Backend...")
        
        issues = []
        
        # Verificar que cada modelo Django tenga su tabla
        for app_name, models in self.results["django_models"].items():
            for model_name, model_info in models.items():
                db_table = model_info["meta"]["db_table"]
                
                if db_table not in self.results["database_schema"]:
                    issues.append({
                        "type": "missing_table",
                        "model": f"{app_name}.{model_name}",
                        "table": db_table,
                        "severity": "high"
                    })
                else:
                    # Verificar campos
                    self._validate_model_fields(app_name, model_name, model_info, db_table, issues)
        
        # Verificar tablas huérfanas
        django_tables = set()
        for models in self.results["django_models"].values():
            for model_info in models.values():
                django_tables.add(model_info["meta"]["db_table"])
        
        for table_name in self.results["database_schema"]:
            if table_name not in django_tables and not table_name.startswith('django_'):
                issues.append({
                    "type": "orphan_table",
                    "table": table_name,
                    "severity": "medium"
                })
        
        self.results["integration_status"] = {
            "is_valid": len(issues) == 0,
            "issues_count": len(issues),
            "issues": issues
        }
        
        if len(issues) == 0:
            print("  ✅ Integración perfecta - No se encontraron problemas")
        else:
            print(f"  ⚠️ Se encontraron {len(issues)} problemas de integración")
    
    def _validate_model_fields(self, app_name, model_name, model_info, db_table, issues):
        """Valida campos del modelo contra la tabla"""
        db_columns = self.results["database_schema"][db_table]["columns"]
        model_fields = model_info["fields"]
        
        # Verificar campos faltantes en DB
        for field_name, field_info in model_fields.items():
            if field_info["type"] not in ["ManyToManyRel", "ManyToOneRel"]:
                column_name = field_name
                if column_name not in db_columns:
                    issues.append({
                        "type": "missing_column",
                        "model": f"{app_name}.{model_name}",
                        "field": field_name,
                        "table": db_table,
                        "severity": "high"
                    })
    
    def _analyze_performance(self):
        """Analiza aspectos de performance"""
        print("\n🔍 Analizando performance...")
        
        performance_issues = []
        
        # Analizar índices faltantes
        for app_name, models in self.results["django_models"].items():
            for model_name, model_info in models.items():
                # Verificar ForeignKeys sin índice
                for field_name, field_info in model_info["fields"].items():
                    if field_info["type"] == "ForeignKey" and not field_info["db_index"]:
                        performance_issues.append({
                            "type": "missing_fk_index",
                            "model": f"{app_name}.{model_name}",
                            "field": field_name,
                            "impact": "high",
                            "suggestion": f"Add db_index=True to {field_name}"
                        })
                
                # Verificar campos de filtrado común sin índice
                common_filter_fields = ["created_at", "updated_at", "status", "is_active"]
                for field_name in common_filter_fields:
                    if field_name in model_info["fields"] and not model_info["fields"][field_name]["db_index"]:
                        performance_issues.append({
                            "type": "missing_filter_index",
                            "model": f"{app_name}.{model_name}",
                            "field": field_name,
                            "impact": "medium",
                            "suggestion": f"Consider adding index to {field_name}"
                        })
        
        self.results["performance_analysis"] = {
            "issues_count": len(performance_issues),
            "issues": performance_issues
        }
        
        print(f"  ✅ Análisis completado - {len(performance_issues)} oportunidades de mejora")
    
    def _generate_recommendations(self):
        """Genera recomendaciones de optimización"""
        print("\n🔍 Generando recomendaciones...")
        
        recommendations = []
        
        # Basadas en el análisis de performance
        for issue in self.results.get("performance_analysis", {}).get("issues", []):
            recommendations.append({
                "priority": "high" if issue["impact"] == "high" else "medium",
                "type": "index",
                "description": issue["suggestion"],
                "model": issue["model"],
                "field": issue["field"]
            })
        
        # Basadas en tamaño de tablas
        large_tables = []
        for table_name, table_info in self.results["database_schema"].items():
            if table_info["row_count"] > 10000:
                large_tables.append({
                    "table": table_name,
                    "rows": table_info["row_count"]
                })
        
        for table in sorted(large_tables, key=lambda x: x["rows"], reverse=True)[:5]:
            recommendations.append({
                "priority": "medium",
                "type": "optimization",
                "description": f"Consider partitioning table {table['table']} ({table['rows']:,} rows)",
                "table": table["table"]
            })
        
        self.results["optimizations"] = recommendations
        print(f"  ✅ Generadas {len(recommendations)} recomendaciones")
    
    def _save_results(self):
        """Guarda los resultados del análisis"""
        # JSON detallado
        output_dir = self.project_root / "docs" / "analysis"
        output_dir.mkdir(exist_ok=True)
        
        json_file = output_dir / f"db_backend_integration_{self.timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        # Markdown report
        self._generate_markdown_report()
        
        print(f"\n📄 Resultados guardados:")
        print(f"  - JSON: {json_file}")
        print(f"  - Markdown: docs/tools/database/INTEGRATION_REPORT.md")
    
    def _generate_markdown_report(self):
        """Genera reporte en Markdown"""
        report_file = self.project_root / "docs" / "tools" / "database" / "INTEGRATION_REPORT.md"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("# 🔗 Database-Backend Integration Report\n\n")
            f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Resumen
            f.write("## 📊 Summary\n\n")
            f.write(f"- **Django Models**: {sum(len(models) for models in self.results['django_models'].values())}\n")
            f.write(f"- **Database Tables**: {len(self.results['database_schema'])}\n")
            f.write(f"- **Integration Status**: {'✅ Perfect' if self.results['integration_status']['is_valid'] else '⚠️ Issues Found'}\n")
            f.write(f"- **Performance Issues**: {self.results.get('performance_analysis', {}).get('issues_count', 0)}\n\n")
            
            # Problemas de integración
            if not self.results['integration_status']['is_valid']:
                f.write("## ⚠️ Integration Issues\n\n")
                for issue in self.results['integration_status']['issues']:
                    f.write(f"- **{issue['type']}**: {issue.get('model', issue.get('table'))} ")
                    f.write(f"(Severity: {issue['severity']})\n")
                f.write("\n")
            
            # Recomendaciones
            if self.results['optimizations']:
                f.write("## 🚀 Optimization Recommendations\n\n")
                
                # Agrupar por prioridad
                high_priority = [r for r in self.results['optimizations'] if r['priority'] == 'high']
                medium_priority = [r for r in self.results['optimizations'] if r['priority'] == 'medium']
                
                if high_priority:
                    f.write("### High Priority\n")
                    for rec in high_priority[:10]:
                        f.write(f"- {rec['description']}\n")
                    f.write("\n")
                
                if medium_priority:
                    f.write("### Medium Priority\n")
                    for rec in medium_priority[:10]:
                        f.write(f"- {rec['description']}\n")
                    f.write("\n")
            
            # Estadísticas por módulo
            f.write("## 📦 Module Statistics\n\n")
            f.write("| Module | Models | Tables | Fields | Relationships |\n")
            f.write("|--------|--------|--------|--------|---------------|\n")
            
            for app_name, models in self.results['django_models'].items():
                total_fields = sum(len(m['fields']) for m in models.values())
                total_rels = sum(
                    len(m['relationships']['foreign_keys']) + 
                    len(m['relationships']['many_to_many']) + 
                    len(m['relationships']['one_to_one'])
                    for m in models.values()
                )
                f.write(f"| {app_name} | {len(models)} | {len(models)} | {total_fields} | {total_rels} |\n")
            
            f.write("\n---\n*Database-Backend Integration Analyzer v1.0*")

def main():
    """Función principal con argumentos CLI"""
    parser = argparse.ArgumentParser(description='Database-Backend Integration Analyzer')
    parser.add_argument('--module', help='Analyze specific module only')
    parser.add_argument('--diagram', action='store_true', help='Generate ER diagram')
    parser.add_argument('--only-relationships', action='store_true', help='Only analyze relationships')
    parser.add_argument('--full', action='store_true', help='Run full analysis', default=True)
    
    args = parser.parse_args()
    
    analyzer = DatabaseBackendAnalyzer()
    results = analyzer.analyze_full_integration()
    
    print("\n✅ Análisis completado!")
    print("\n📊 Resumen de Integración:")
    print(f"   - Modelos Django: {sum(len(models) for models in results['django_models'].values())}")
    print(f"   - Tablas en DB: {len(results['database_schema'])}")
    print(f"   - Estado: {'✅ Perfecta' if results['integration_status']['is_valid'] else '⚠️ Con problemas'}")
    print(f"   - Optimizaciones: {len(results['optimizations'])}")

if __name__ == "__main__":
    main()