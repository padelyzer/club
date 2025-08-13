# Django App: shared

## 📁 Propósito
App Django para shared

## 🏗️ Estructura
- **Modelos**: ❌ models.py
- **Serializers**: ❌ serializers.py  
- **Views**: ✅ views.py
- **URLs**: ❌ urls.py

## ⚠️ Componentes Críticos
- Ninguno identificado

## 🚨 Cambios Peligrosos
- Ninguno identificado

## 🔥 Pruebas de Humo

```python
# En Django shell
from shared.models import *

# Verificar modelos
print(f"Modelos cargados correctamente")

# Test básico de creación (ajustar según modelos)
# obj = Model.objects.create(...)
```

## 📝 Notas de Desarrollo
- Siempre ejecutar migraciones después de cambios en models.py
- Actualizar serializers si cambian los modelos
- Verificar permisos en views después de cambios
- Ejecutar tests: `python manage.py test shared`
