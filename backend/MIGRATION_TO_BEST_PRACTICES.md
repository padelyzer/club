# Plan de Migración a Mejores Prácticas Python

## 🎯 Objetivo
Migrar el código existente para cumplir con los estándares establecidos sin romper funcionalidad.

## 📋 Estrategia de Migración

### Fase 1: Preparación y Limpieza (1-2 días)
**Prioridad: CRÍTICA**

#### 1.1 Backup del Estado Actual
```bash
# Crear branch de seguridad
git checkout -b backup/pre-migration-state
git push origin backup/pre-migration-state

# Volver a main
git checkout main
git checkout -b feature/python-best-practices-migration
```

#### 1.2 Instalar Herramientas
```bash
# Activar entorno virtual
source venv/bin/activate

# Instalar herramientas de desarrollo
pip install -r requirements/development.txt
make install-dev-tools
```

#### 1.3 Ejecutar Script de Reorganización
```bash
# Primero en modo DRY RUN
python scripts/reorganize_project.py

# Revisar cambios propuestos
# Si todo se ve bien, cambiar DRY_RUN = False en el script
python scripts/reorganize_project.py
```

#### 1.4 Limpiar Archivos Problemáticos
```bash
# Eliminar archivos rotos/backup
find . -name "*_broken.py" -delete
find . -name "*_backup.py" -delete
find . -name "*_original.py" -delete

# Eliminar logs (mantener .sqlite3)
find . -name "*.log" -delete

# Eliminar archivos de test JSON temporales
rm -f *_test_report*.json *_validation_results.json
```

### Fase 2: Formateo Automático (1 día)
**Prioridad: ALTA**

#### 2.1 Aplicar Black (Formateo)
```bash
# Ver cambios que haría Black
black --diff .

# Aplicar formateo
black .

# Commit cambios
git add .
git commit -m "style: apply Black formatting to entire codebase"
```

#### 2.2 Aplicar isort (Ordenar imports)
```bash
# Ver cambios que haría isort
isort --diff .

# Aplicar ordenamiento
isort .

# Commit cambios
git add .
git commit -m "style: organize imports with isort"
```

### Fase 3: Correcciones Automáticas de Linting (2-3 días)
**Prioridad: ALTA**

#### 3.1 Ejecutar autopep8 para Correcciones Básicas
```bash
# Instalar si no está
pip install autopep8

# Aplicar correcciones automáticas seguras
autopep8 --in-place --aggressive --aggressive -r .

# Commit
git add .
git commit -m "style: apply autopep8 automatic fixes"
```

#### 3.2 Identificar Problemas Restantes
```bash
# Generar reporte de problemas
flake8 apps/ --output-file=flake8_report.txt
pylint apps/ > pylint_report.txt || true
mypy apps/ > mypy_report.txt || true

# Analizar reportes
wc -l *_report.txt
```

### Fase 4: Type Hints Gradual (1-2 semanas)
**Prioridad: MEDIA**

#### 4.1 Priorizar Módulos Core
```python
# Orden recomendado:
# 1. core/utils.py → core/utils_typed.py (ya hecho como ejemplo)
# 2. core/models.py
# 3. core/services.py
# 4. authentication/services.py → authentication/services_typed.py (ya hecho)
# 5. authentication/models.py
# 6. clubs/models.py
# 7. clubs/services.py
```

#### 4.2 Script para Agregar Type Hints Básicos
```bash
# Crear script de migración
cat > scripts/add_basic_type_hints.py << 'EOF'
#!/usr/bin/env python
"""Add basic type hints to functions."""
import ast
import os
from pathlib import Path

def add_basic_hints_to_file(filepath):
    """Add -> None to functions without return type."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Simple regex approach for basic cases
    import re
    
    # Pattern: def function_name(...):
    pattern = r'def\s+(\w+)\s*\([^)]*\)\s*:'
    
    def replace_func(match):
        full_match = match.group(0)
        if ' -> ' in full_match:
            return full_match
        return full_match[:-1] + ' -> None:'
    
    new_content = re.sub(pattern, replace_func, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

# Apply to all Python files
for py_file in Path('apps').rglob('*.py'):
    if 'migrations' not in str(py_file):
        add_basic_hints_to_file(py_file)
EOF

python scripts/add_basic_type_hints.py
```

### Fase 5: Docstrings y Documentación (1 semana)
**Prioridad: MEDIA**

#### 5.1 Verificar Docstrings Faltantes
```bash
# Instalar herramienta
pip install interrogate

# Generar reporte
interrogate -v apps/

# Ver archivos sin docstrings
interrogate -v apps/ -f
```

#### 5.2 Template para Docstrings
```python
# Crear template
cat > scripts/docstring_template.py << 'EOF'
"""
Template para agregar docstrings.

Para clases:
\"\"\"
Descripción breve de la clase.

Descripción más detallada si es necesario.

Attributes:
    attr1: Descripción del atributo
    attr2: Descripción del atributo
\"\"\"

Para funciones:
\"\"\"
Descripción breve de la función.

Args:
    param1: Descripción del parámetro
    param2: Descripción del parámetro
    
Returns:
    Descripción de lo que retorna
    
Raises:
    ExceptionType: Cuándo se lanza
\"\"\"
EOF
```

### Fase 6: Tests y Cobertura (1-2 semanas)
**Prioridad: ALTA**

#### 6.1 Migrar Tests Existentes
```bash
# Mover tests a estructura correcta
mkdir -p tests/unit tests/integration tests/e2e

# Mover tests existentes
mv test_*.py tests/unit/
mv apps/*/tests/*.py tests/unit/

# Actualizar imports en los tests
find tests/ -name "*.py" -exec sed -i 's/from apps\./from apps./g' {} \;
```

#### 6.2 Agregar Tests Faltantes
```bash
# Ver cobertura actual
pytest --cov=apps --cov-report=html
open htmlcov/index.html

# Identificar módulos sin tests
find apps -name "*.py" -not -path "*/migrations/*" | while read f; do
    test_file="tests/unit/test_$(basename $f)"
    if [ ! -f "$test_file" ]; then
        echo "Missing test for: $f"
    fi
done > missing_tests.txt
```

### Fase 7: Configurar Pre-commit (1 día)
**Prioridad: ALTA**

```bash
# Instalar pre-commit
pre-commit install

# Ejecutar en todos los archivos
pre-commit run --all-files

# Arreglar problemas encontrados
# Repetir hasta que pase
```

## 🔄 Proceso de Migración por Módulo

### Para cada módulo (authentication, clubs, clients, etc.):

1. **Crear branch específico**
```bash
git checkout -b refactor/MODULE_NAME-best-practices
```

2. **Aplicar mejoras en orden**
```bash
# 1. Formateo
black apps/MODULE_NAME/
isort apps/MODULE_NAME/

# 2. Linting básico
flake8 apps/MODULE_NAME/ --select=E9,F63,F7,F82
# Arreglar errores críticos

# 3. Type hints en models.py
# Editar manualmente agregando tipos

# 4. Type hints en views.py y serializers.py
# Editar manualmente

# 5. Docstrings
# Agregar donde falten

# 6. Tests
pytest tests/unit/test_MODULE_NAME*.py
# Agregar tests faltantes
```

3. **Verificar que todo funciona**
```bash
# Ejecutar tests del módulo
pytest tests/ -k MODULE_NAME

# Verificar que el servidor arranca
python manage.py runserver

# Probar endpoints manualmente
```

4. **Commit y PR**
```bash
git add .
git commit -m "refactor(MODULE_NAME): apply Python best practices

- Apply Black formatting
- Fix linting issues  
- Add type hints to models and views
- Add missing docstrings
- Improve test coverage"

git push origin refactor/MODULE_NAME-best-practices
```

## 📊 Métricas de Progreso

### Crear Dashboard de Progreso
```bash
# Script para tracking
cat > scripts/migration_progress.py << 'EOF'
#!/usr/bin/env python
"""Track migration progress."""
import subprocess
from pathlib import Path

def check_module_status(module_path):
    """Check migration status of a module."""
    stats = {
        'files': 0,
        'black_compliant': 0,
        'typed': 0,
        'documented': 0,
        'tested': 0
    }
    
    for py_file in Path(module_path).rglob('*.py'):
        if 'migrations' in str(py_file):
            continue
            
        stats['files'] += 1
        
        # Check Black
        result = subprocess.run(
            ['black', '--check', str(py_file)], 
            capture_output=True
        )
        if result.returncode == 0:
            stats['black_compliant'] += 1
        
        # Check type hints (basic)
        with open(py_file) as f:
            content = f.read()
            if '-> ' in content or ': ' in content:
                stats['typed'] += 1
        
        # Check docstrings
        if '"""' in content:
            stats['documented'] += 1
    
    return stats

# Check all modules
modules = ['authentication', 'clubs', 'clients', 'reservations']
for module in modules:
    stats = check_module_status(f'apps/{module}')
    print(f"\n{module}:")
    print(f"  Files: {stats['files']}")
    print(f"  Black compliant: {stats['black_compliant']}/{stats['files']}")
    print(f"  With type hints: {stats['typed']}/{stats['files']}")
    print(f"  Documented: {stats['documented']}/{stats['files']}")
EOF

python scripts/migration_progress.py
```

## ⚠️ Puntos de Atención

### 1. Migraciones de Django
- **NO** reformatear archivos de migración
- Agregar a `.black` y `.isort.cfg` exclusiones

### 2. Archivos de Terceros
- **NO** modificar código en `venv/` o `static/`
- Excluir de todas las herramientas

### 3. Tests en Ejecución
- Ejecutar tests después de cada cambio mayor
- Mantener CI/CD verde

### 4. Code Review
- Hacer PRs pequeños por módulo
- No mezclar refactoring con nuevas features

## 📅 Timeline Sugerido

**Semana 1:**
- Día 1-2: Fase 1 (Preparación)
- Día 3: Fase 2 (Formateo)
- Día 4-5: Fase 3 (Linting básico)

**Semana 2-3:**
- Módulo authentication
- Módulo clubs
- Módulo clients

**Semana 4:**
- Módulo reservations
- Otros módulos menores
- Configuración final

## 🎉 Criterios de Éxito

La migración estará completa cuando:

1. ✅ `make format` no hace cambios
2. ✅ `make lint` pasa sin errores críticos
3. ✅ `make test` pasa con >80% cobertura
4. ✅ `pre-commit run --all-files` pasa
5. ✅ Todos los módulos core tienen type hints
6. ✅ Documentación actualizada

## 🚀 Comando de Inicio Rápido

```bash
# Ejecutar todo el proceso para un módulo
./migrate_module.sh authentication
```

Crear script:
```bash
cat > migrate_module.sh << 'EOF'
#!/bin/bash
MODULE=$1
echo "Migrating module: $MODULE"

# Format
black apps/$MODULE/
isort apps/$MODULE/

# Lint
flake8 apps/$MODULE/ || true

# Test
pytest tests/ -k $MODULE

echo "Module $MODULE migrated!"
EOF

chmod +x migrate_module.sh
```