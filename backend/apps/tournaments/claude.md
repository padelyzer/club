# Django App: tournaments

## 📁 Propósito
Gestión de torneos y competiciones

## 🏗️ Estructura
- **Modelos**: ✅ models.py
- **Serializers**: ✅ serializers.py  
- **Views**: ✅ views.py
- **URLs**: ✅ urls.py

## ⚠️ Componentes Críticos
- Tournament model
- Match scheduling
- Brackets

## 🚨 Cambios Peligrosos
1. **NUNCA** Cambiar algoritmo de brackets
1. **NUNCA** Modificar sistema de puntos

## 🔥 Pruebas de Humo

```python
# En Django shell
from tournaments.models import *

# Verificar modelos
print(f"Modelos cargados correctamente")

# Test básico de creación (ajustar según modelos)
# obj = Model.objects.create(...)
```

## 📝 Notas de Desarrollo
- Siempre ejecutar migraciones después de cambios en models.py
- Actualizar serializers si cambian los modelos
- Verificar permisos en views después de cambios
- Ejecutar tests: `python manage.py test tournaments`
