# Django App: clubs

## 📁 Propósito
Gestión de clubes y canchas deportivas

## 🏗️ Estructura
- **Modelos**: ✅ models.py
- **Serializers**: ✅ serializers.py  
- **Views**: ✅ views.py
- **URLs**: ✅ urls.py

## ⚠️ Componentes Críticos
- Club model
- Court model
- Disponibilidad

## 🚨 Cambios Peligrosos
1. **NUNCA** Cambiar relaciones con reservations
1. **NUNCA** Modificar campos de Court

## 🔥 Pruebas de Humo

```python
# En Django shell
from clubs.models import *

# Verificar modelos
print(f"Modelos cargados correctamente")

# Test básico de creación (ajustar según modelos)
# obj = Model.objects.create(...)
```

## 📝 Notas de Desarrollo
- Siempre ejecutar migraciones después de cambios en models.py
- Actualizar serializers si cambian los modelos
- Verificar permisos en views después de cambios
- Ejecutar tests: `python manage.py test clubs`
