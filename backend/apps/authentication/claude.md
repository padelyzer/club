# Django App: authentication

## 📁 Propósito
Sistema de autenticación y autorización con JWT

## 🏗️ Estructura
- **Modelos**: ✅ models.py
- **Serializers**: ✅ serializers.py  
- **Views**: ✅ views.py
- **URLs**: ✅ urls.py

## ⚠️ Componentes Críticos
- User model
- JWT tokens
- Login/Register endpoints

## 🚨 Cambios Peligrosos
1. **NUNCA** Cambiar campos del User
1. **NUNCA** Modificar JWT settings
1. **NUNCA** Alterar permisos

## 🔥 Pruebas de Humo

```python
# En Django shell
from authentication.models import *

# Verificar modelos
print(f"Modelos cargados correctamente")

# Test básico de creación (ajustar según modelos)
# obj = Model.objects.create(...)
```

## 📝 Notas de Desarrollo
- Siempre ejecutar migraciones después de cambios en models.py
- Actualizar serializers si cambian los modelos
- Verificar permisos en views después de cambios
- Ejecutar tests: `python manage.py test authentication`
