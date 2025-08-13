# Django App: clients

## 📁 Propósito
Gestión de clientes y jugadores

## 🏗️ Estructura
- **Modelos**: ✅ models.py
- **Serializers**: ✅ serializers.py  
- **Views**: ✅ views.py
- **URLs**: ✅ urls.py

## ⚠️ Componentes Críticos
- Client profile
- Relación con User
- Datos personales

## 🚨 Cambios Peligrosos
1. **NUNCA** Cambiar estructura de perfiles
1. **NUNCA** Modificar permisos

## 🔥 Pruebas de Humo

```python
# En Django shell
from clients.models import *

# Verificar modelos
print(f"Modelos cargados correctamente")

# Test básico de creación (ajustar según modelos)
# obj = Model.objects.create(...)
```

## 📝 Notas de Desarrollo
- Siempre ejecutar migraciones después de cambios en models.py
- Actualizar serializers si cambian los modelos
- Verificar permisos en views después de cambios
- Ejecutar tests: `python manage.py test clients`
