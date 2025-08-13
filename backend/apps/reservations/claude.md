# Django App: reservations

## 📁 Propósito
Sistema de reservas de canchas

## 🏗️ Estructura
- **Modelos**: ✅ models.py
- **Serializers**: ✅ serializers.py  
- **Views**: ✅ views.py
- **URLs**: ✅ urls.py

## ⚠️ Componentes Críticos
- Reservation model
- Validación de horarios
- Estado de reservas

## 🚨 Cambios Peligrosos
1. **NUNCA** Cambiar lógica de disponibilidad
1. **NUNCA** Modificar estados

## 🔥 Pruebas de Humo

```python
# En Django shell
from reservations.models import *

# Verificar modelos
print(f"Modelos cargados correctamente")

# Test básico de creación (ajustar según modelos)
# obj = Model.objects.create(...)
```

## 📝 Notas de Desarrollo
- Siempre ejecutar migraciones después de cambios en models.py
- Actualizar serializers si cambian los modelos
- Verificar permisos en views después de cambios
- Ejecutar tests: `python manage.py test reservations`
