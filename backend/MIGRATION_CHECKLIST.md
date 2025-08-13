# ✅ Checklist de Migración a Mejores Prácticas

## 🎯 Estado Actual del Código

### Problemas Identificados:
- [ ] **Directorio raíz contaminado** con scripts de prueba
- [ ] **Archivos `*_broken.py`, `*_backup.py`** en el código
- [ ] **Logs y archivos temporales** en control de versiones
- [ ] **Sin type hints** en la mayoría del código
- [ ] **Tests dispersos** en lugar de estructura organizada
- [ ] **Sin herramientas de calidad** configuradas

## 📋 Checklist de Migración

### 🔧 Fase 1: Preparación Inicial
- [ ] Crear branch de backup: `git checkout -b backup/pre-migration-state`
- [ ] Instalar herramientas: `pip install -r requirements/development.txt`
- [ ] Ejecutar script de reorganización en modo DRY RUN
- [ ] Revisar cambios propuestos
- [ ] Ejecutar reorganización real
- [ ] Eliminar archivos problemáticos (mantener .sqlite3)

### 🎨 Fase 2: Formateo Automático
- [ ] Ejecutar Black en modo check: `black --check .`
- [ ] Aplicar Black: `black .`
- [ ] Commit: `git commit -m "style: apply Black formatting"`
- [ ] Ejecutar isort en modo check: `isort --check-only .`
- [ ] Aplicar isort: `isort .`
- [ ] Commit: `git commit -m "style: organize imports with isort"`

### 🔍 Fase 3: Análisis de Calidad
- [ ] Generar reporte flake8: `flake8 apps/ > flake8_report.txt`
- [ ] Generar reporte pylint: `pylint apps/ > pylint_report.txt || true`
- [ ] Generar reporte mypy: `mypy apps/ > mypy_report.txt || true`
- [ ] Revisar errores críticos (E9, F63, F7, F82)
- [ ] Crear plan de corrección

### 📦 Fase 4: Migración por Módulos

#### Module: `authentication`
- [ ] Aplicar formateo: `black apps/authentication/`
- [ ] Ordenar imports: `isort apps/authentication/`
- [ ] Agregar type hints básicos
- [ ] Agregar docstrings faltantes
- [ ] Ejecutar tests: `pytest tests/ -k authentication`
- [ ] Commit cambios

#### Module: `clubs`
- [ ] Aplicar formateo: `black apps/clubs/`
- [ ] Ordenar imports: `isort apps/clubs/`
- [ ] Agregar type hints básicos
- [ ] Agregar docstrings faltantes
- [ ] Ejecutar tests: `pytest tests/ -k clubs`
- [ ] Commit cambios

#### Module: `clients`
- [ ] Aplicar formateo: `black apps/clients/`
- [ ] Ordenar imports: `isort apps/clients/`
- [ ] Agregar type hints básicos
- [ ] Agregar docstrings faltantes
- [ ] Ejecutar tests: `pytest tests/ -k clients`
- [ ] Commit cambios

#### Module: `reservations`
- [ ] Aplicar formateo: `black apps/reservations/`
- [ ] Ordenar imports: `isort apps/reservations/`
- [ ] Agregar type hints básicos
- [ ] Agregar docstrings faltantes
- [ ] Ejecutar tests: `pytest tests/ -k reservations`
- [ ] Commit cambios

### 🧪 Fase 5: Tests y Cobertura
- [ ] Mover tests a estructura correcta
- [ ] Actualizar imports en tests
- [ ] Ejecutar todos los tests: `pytest`
- [ ] Generar reporte de cobertura: `pytest --cov=apps --cov-report=html`
- [ ] Identificar módulos sin tests
- [ ] Agregar tests para alcanzar 80% cobertura

### 🔒 Fase 6: Configuración Final
- [ ] Configurar pre-commit: `pre-commit install`
- [ ] Ejecutar pre-commit: `pre-commit run --all-files`
- [ ] Corregir problemas encontrados
- [ ] Verificar que `make quality` pasa
- [ ] Actualizar documentación

## 🚀 Comandos Rápidos

```bash
# Ver estado actual
python scripts/migrate_to_best_practices.py --dry-run

# Migrar un módulo específico
python scripts/migrate_to_best_practices.py authentication --apply

# Verificar progreso
python scripts/migration_progress.py

# Ejecutar todas las verificaciones
make quality

# Ver cambios que haría Black
black --check --diff apps/

# Ver cambios que haría isort
isort --check-only --diff apps/
```

## 📊 Métricas de Éxito

### Antes de la Migración:
- Type hints: ~5% de funciones
- Docstrings: ~30% de clases/funciones
- Tests: Dispersos, sin estructura
- Cobertura: Desconocida
- Linting: Múltiples errores

### Objetivo Post-Migración:
- [ ] Type hints: >80% en módulos core
- [ ] Docstrings: >90% en API pública
- [ ] Tests: Estructura organizada
- [ ] Cobertura: >80%
- [ ] Linting: 0 errores críticos
- [ ] Pre-commit: Configurado y pasando

## ⚠️ Puntos de Atención

1. **NO formatear archivos de migraciones Django**
2. **NO modificar archivos en `venv/` o `static/`**
3. **Ejecutar tests después de cada cambio**
4. **Hacer commits pequeños y descriptivos**
5. **Mantener .sqlite3 como solicitado**

## 📅 Timeline Estimado

- **Día 1-2**: Preparación y limpieza
- **Día 3**: Formateo automático
- **Día 4-5**: Análisis y correcciones básicas
- **Semana 2**: Migración de módulos principales
- **Semana 3**: Tests y documentación
- **Semana 4**: Refinamiento y configuración final

## 🎉 Celebrar Progreso

- [ ] 25% completado: Primera fase terminada
- [ ] 50% completado: Formateo aplicado
- [ ] 75% completado: Módulos principales migrados
- [ ] 100% completado: ¡Mejores prácticas implementadas!

---

**Nota**: Marcar cada item conforme se complete. Hacer commits frecuentes para poder revertir si es necesario.