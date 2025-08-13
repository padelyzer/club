# 🛠️ Herramientas de Debugging - Padelyzer

## 📋 Índice de Herramientas

1. [Validación de Sincronización](#validación-de-sincronización)
2. [Generadores de Tipos](#generadores-de-tipos)
3. [Health Check System](#health-check-system)
4. [Monitoring Tools](#monitoring-tools)
5. [Middleware de Debugging](#middleware-de-debugging)

---

## 🔍 Validación de Sincronización

### **validate_sync.py**
Script básico para detectar discrepancias entre modelos Django y tipos TypeScript.

**Ubicación**: `/scripts/validate_sync.py`

**Uso**:
```bash
python3 scripts/validate_sync.py
```

**Output**: Genera `sync_validation_report.md` con lista de problemas encontrados.

---

### **validate_sync_improved.py**
Versión mejorada con soporte para transformación snake_case/camelCase.

**Ubicación**: `/scripts/validate_sync_improved.py`

**Uso**:
```bash
python3 scripts/validate_sync_improved.py
```

**Features**:
- Detecta campos en ambos formatos
- Busca en múltiples directorios de tipos
- Identifica problemas N+1 en serializers

---

### **final_validation.py**
Validador específico para tipos completos generados.

**Ubicación**: `/scripts/final_validation.py`

**Uso**:
```bash
python3 scripts/final_validation.py
```

**Output**:
- Valida 2,240 campos totales
- Verifica formato dual
- Confirma modelos clave

---

## 🏗️ Generadores de Tipos

### **generate_types_from_models.py**
Generador simple que extrae tipos básicos de models.py.

**Ubicación**: `/scripts/generate_types_from_models.py`

**Uso**:
```bash
python3 scripts/generate_types_from_models.py
```

**Output**: Tipos en `/frontend/src/types/generated/`

---

### **complete_type_generator.py** ⭐ RECOMENDADO
Generador exhaustivo que extrae TODOS los campos (1,156 campos).

**Ubicación**: `/scripts/complete_type_generator.py`

**Uso**:
```bash
python3 scripts/complete_type_generator.py
```

**Output**: 
- Tipos completos en `/frontend/src/types/complete/`
- 11 archivos TypeScript
- Formato dual (camelCase y snake_case)
- 2,240 campos totales con duplicados para compatibilidad

**Ejemplo de tipo generado**:
```typescript
export interface Club {
  id: string;
  createdAt: string;
  created_at: string;
  name: string;
  openingTime: string;
  opening_time: string;
  // ... 50+ campos más
}
```

---

### **auto_generate_types.py**
Generador con schemas Zod (requiere Django configurado).

**Ubicación**: `/scripts/auto_generate_types.py`

**Uso**:
```bash
cd backend && source venv/bin/activate
python ../scripts/auto_generate_types.py
```

**Nota**: Requiere variables de entorno Django configuradas.

---

## 🏥 Health Check System

### **Health Check API**
Sistema completo de monitoreo de salud del backend.

**Ubicación**: `/backend/apps/health/`

**Endpoints**:
- `GET /api/v1/health/` - Estado general del sistema
- `POST /api/v1/health/validate-sync/` - Validación de tipos

**Uso**:
```bash
# Check básico
curl http://localhost:8000/api/v1/health/

# Pretty print
curl -s http://localhost:8000/api/v1/health/ | python3 -m json.tool
```

**Response**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "database": true,
    "cache": true,
    "redis": false,
    "model_integrity": true,
    "api_format": true
  },
  "response_time_ms": 45
}
```

---

## 📊 Monitoring Tools

### **SyncMonitor Component**
Monitor visual React para el frontend.

**Ubicación**: `/frontend/src/components/shared/SyncMonitor.tsx`

**Uso**:
```tsx
import { SyncMonitor } from '@/components/shared/SyncMonitor';

// En tu layout
<SyncMonitor showInProduction={false} />
```

**Features**:
- Monitor flotante en esquina inferior derecha
- Muestra estado de health checks
- Lista errores de validación de tipos
- Actualización cada 30 segundos

---

### **API Logging Middleware**
Middleware Django para logging detallado.

**Ubicación**: `/backend/core/middleware/logging.py`

**Activación en settings**:
```python
MIDDLEWARE = [
    # ...
    'core.middleware.logging.APILoggingMiddleware',
    'core.middleware.logging.DatabaseQueryLoggingMiddleware',
    # ...
]
```

**Features**:
- Logs de todas las requests/responses
- Detección de respuestas lentas (>1s)
- Identificación de problemas N+1
- Request IDs únicos para tracking

---

## 🔄 Middleware de Debugging

### **TypeScript Validation Middleware**
Validación y transformación de tipos en runtime.

**Ubicación**: `/frontend/src/lib/api/middleware.ts`

**Uso**:
```typescript
import { 
  transformKeysSnakeToCamel,
  transformKeysCamelToSnake,
  TypeValidationMiddleware,
  axiosInterceptor
} from '@/lib/api/middleware';

// Configurar Axios
axios.interceptors.request.use(axiosInterceptor.request);
axios.interceptors.response.use(axiosInterceptor.response);

// Usar validación
const validator = new TypeValidationMiddleware();
validator.registerSchema('/api/clubs', ClubSchema);
const validated = validator.validateResponse('/api/clubs', data);
```

**Features**:
- Transformación automática snake_case ↔ camelCase
- Validación con Zod schemas
- Logging de errores de tipos
- Hook React para monitoreo

---

## 📋 Comandos Rápidos

### Validación Completa
```bash
# 1. Generar tipos actualizados
python3 scripts/complete_type_generator.py

# 2. Validar sincronización
python3 scripts/final_validation.py

# 3. Check health
curl -s http://localhost:8000/api/v1/health/ | python3 -m json.tool
```

### Debugging de Problemas
```bash
# Ver logs del backend
tail -f backend/logs/django.log

# Validar un modelo específico
python3 scripts/validate_sync_improved.py | grep "Club"

# Regenerar solo un módulo
# Editar complete_type_generator.py para procesar solo una app
```

### Monitoreo en Desarrollo
```bash
# Activar monitor visual en frontend
# Agregar <SyncMonitor /> a tu layout

# Ver errores de validación en consola
# Los errores aparecen automáticamente en desarrollo
```

---

## 🚀 Workflow Recomendado

1. **Después de cambios en models.py**:
   ```bash
   python3 scripts/complete_type_generator.py
   ```

2. **Verificar sincronización**:
   ```bash
   python3 scripts/final_validation.py
   ```

3. **En desarrollo, activar monitoring**:
   - Agregar `<SyncMonitor />` al layout
   - Revisar logs en consola del navegador

4. **Antes de deploy**:
   - Ejecutar validación completa
   - Verificar health check
   - Confirmar 0 errores de tipos

---

## 📊 Métricas de Éxito

- ✅ **2,240 campos** sincronizados
- ✅ **11 módulos** con tipos completos
- ✅ **0 errores** de validación (usando tipos completos)
- ✅ **100% cobertura** de modelos Django
- ✅ Soporte **dual format** (snake_case y camelCase)

---

## 🐛 Troubleshooting

### "Campo X existe en Django pero no en TypeScript"
1. Regenerar tipos: `python3 scripts/complete_type_generator.py`
2. Verificar que el campo esté en models.py
3. Revisar el archivo generado en `/types/complete/`

### "No se encontró tipo TypeScript para modelo Y"
1. Verificar que el modelo exista en Django
2. Asegurarse que hereda de `models.Model`
3. Regenerar tipos completos

### Health check muestra "unhealthy"
1. Normal en desarrollo (Redis/DB config)
2. Verificar conexión a base de datos
3. Revisar logs para detalles específicos

---

**Última actualización**: 13 de Agosto 2025
**Mantenedor**: Sistema de Debugging Automatizado Padelyzer