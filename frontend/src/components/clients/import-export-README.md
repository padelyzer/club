# Sistema de Importación/Exportación de Clientes

## Descripción General

El sistema de importación/exportación de clientes de Padelyzer proporciona una solución completa y robusta para gestionar datos de clientes en masa. Incluye funcionalidades avanzadas como validación en tiempo real, manejo de duplicados, mapeo inteligente de campos, y soporte para archivos grandes con streaming.

## Características Principales

### 🚀 Importación de Datos
- **Formatos soportados**: CSV, Excel (.xlsx, .xls)
- **Detección automática** de delimitadores, codificación y encabezados
- **Mapeo inteligente** de campos con sugerencias automáticas
- **Validación exhaustiva** de datos en tiempo real
- **Manejo de duplicados** con múltiples estrategias
- **Vista previa** de datos antes de importar
- **Procesamiento por chunks** para archivos grandes
- **Rollback automático** en caso de errores

### 📤 Exportación de Datos
- **Múltiples formatos**: CSV, Excel, PDF, JSON
- **Campos personalizables** - selecciona qué datos exportar
- **Plantillas predefinidas** para exportaciones comunes
- **Filtros aplicables** - exporta solo datos filtrados
- **Progreso en tiempo real** para exportaciones grandes
- **Descarga directa** o almacenamiento temporal

### 🔧 Características Técnicas
- **Streaming de archivos grandes** (>5MB o >1000 filas)
- **Validaciones avanzadas**: email, teléfono, fechas, documentos españoles
- **Sistema de progreso** con barras visuales y estimaciones de tiempo
- **Manejo de errores graceful** con logs detallados
- **Accesibilidad completa** con navegación por teclado
- **Responsive design** para dispositivos móviles

## Estructura de Archivos

```
src/components/clients/
├── import-export-index.ts          # Exports principales
├── import-export-actions.tsx       # Botones de acción
├── export-modal.tsx                # Modal de exportación
├── import-modal.tsx                # Modal de importación
├── import-preview.tsx              # Vista previa de datos
├── field-mapper.tsx                # Mapeo de campos
├── duplicate-resolver.tsx          # Resolución de duplicados
├── progress-components.tsx         # Componentes de progreso
└── import-export-README.md         # Esta documentación

src/types/
└── import-export.ts                # Tipos TypeScript

src/lib/api/services/
└── import-export.service.ts        # Servicio de API

src/lib/validations/
└── import-validations.ts           # Validaciones exhaustivas

src/lib/utils/
└── import-stream-handler.ts        # Manejo de streaming

src/store/
└── clientsStore.ts                 # Estado global extendido
```

## Uso Básico

### 1. Integración en la página de clientes

```tsx
import { ImportExportActions } from '@/components/clients';

function ClientsPage() {
  return (
    <div>
      {/* Otros componentes */}
      <ImportExportActions 
        variant="default"
        showLabels={true}
        className="mb-4"
      />
      {/* Lista de clientes */}
    </div>
  );
}
```

### 2. Uso programático

```tsx
import { ImportExportService, useClientsStore } from '@/components/clients';

function MyComponent() {
  const { openImportModal, openExportModal } = useClientsStore();

  const handleQuickExport = async () => {
    const blob = await ImportExportService.exportToCSV();
    ImportExportService.downloadBlob(blob, 'clientes.csv');
  };

  return (
    <div>
      <button onClick={openImportModal}>Importar</button>
      <button onClick={openExportModal}>Exportar</button>
      <button onClick={handleQuickExport}>Exportar CSV</button>
    </div>
  );
}
```

## Componentes Principales

### ImportModal
Modal wizard para importación de archivos con los siguientes pasos:
1. **Upload**: Selección y validación del archivo
2. **Configure**: Configuración de formato CSV y opciones
3. **Mapping**: Mapeo de campos (opcional, con sugerencias automáticas)
4. **Preview**: Vista previa de datos con validación
5. **Duplicates**: Resolución de duplicados (si se encuentran)
6. **Processing**: Procesamiento con barra de progreso
7. **Results**: Resultados finales con estadísticas

### ExportModal
Modal wizard para exportación con pasos:
1. **Configure**: Selección de formato y plantilla
2. **Fields**: Selección de campos a exportar
3. **Filters**: Revisión de filtros aplicados
4. **Processing**: Generación del archivo
5. **Download**: Descarga del archivo generado

### FieldMapper
Componente para mapeo inteligente de campos CSV a campos del sistema:
- Sugerencias automáticas basadas en nombres de columnas
- Validación de campos requeridos
- Transformaciones de datos (mayúsculas, formato de teléfono, etc.)
- Vista previa de transformaciones

### DuplicateResolver
Gestión de duplicados con estrategias:
- **Skip**: Omitir duplicados
- **Update**: Actualizar registros existentes
- **Duplicate**: Crear registros duplicados
- **Ask**: Decidir caso por caso

## Tipos de Validación

### Email
- Formato RFC 5322 compliant
- Detección de errores tipográficos comunes
- Normalización automática (minúsculas, trim)

### Teléfono
- Validación de longitud (8-20 caracteres)
- Soporte para formato internacional
- Validación específica para teléfonos españoles
- Normalización automática

### Fechas
- Múltiples formatos: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
- Validación de fechas lógicas (no futuras, no muy antiguas)
- Conversión automática a formato ISO

### Documentos Españoles
- Validación de DNI y NIE
- Verificación de dígito de control
- Normalización de formato

## Configuración Avanzada

### Validaciones Personalizadas
```tsx
import { ImportValidations } from '@/lib/validations/import-validations';

const result = ImportValidations.validateEmail(
  'usuario@ejemplo.com',
  1, // número de fila
  'email', // nombre del campo
  { strict: true, locale: 'es' }
);
```

### Streaming para Archivos Grandes
```tsx
import { createStreamHandler } from '@/lib/utils/import-stream-handler';

const handler = createStreamHandler(importConfig, {
  chunk_size: 200,
  enable_rollback: true,
  error_threshold: 0.05
});

await handler.processLargeFile(
  (progress) => console.log('Progreso:', progress),
  (chunk, result) => console.log('Chunk completado:', chunk.chunk_id),
  (rollback) => console.log('Punto de rollback creado:', rollback.checkpoint_id)
);
```

## Estado Global (Zustand Store)

El estado se gestiona a través del `clientsStore` extendido:

```tsx
const {
  // Estados de modales
  importModal,
  exportModal,
  
  // Operaciones activas
  activeOperations,
  
  // Resultados anteriores
  lastImportResult,
  lastExportResult,
  
  // Acciones
  openImportModal,
  closeImportModal,
  updateImportModal,
  openExportModal,
  closeExportModal,
  updateExportModal,
  
  // Gestión de operaciones
  addOperation,
  updateOperation,
  removeOperation,
  clearCompletedOperations,
  
  // Acciones de datos en lote
  bulkAddClients,
  bulkUpdateClients,
  bulkRemoveClients,
} = useClientsStore();
```

## APIs Backend Esperadas

El sistema asume las siguientes APIs backend:

### Importación
- `POST /clients/import/detect-csv/` - Detectar formato CSV
- `POST /clients/import/suggest-mappings/` - Sugerir mapeo de campos
- `POST /clients/import/preview/` - Vista previa de importación
- `POST /clients/import/detect-duplicates/` - Detectar duplicados
- `POST /clients/import/start/` - Iniciar importación
- `GET /clients/import/progress/{id}/` - Obtener progreso
- `GET /clients/import/result/{id}/` - Obtener resultado
- `POST /clients/import/cancel/{id}/` - Cancelar importación
- `POST /clients/import/rollback/{id}/` - Realizar rollback

### Exportación
- `POST /clients/export/start/` - Iniciar exportación
- `GET /clients/export/progress/{id}/` - Obtener progreso
- `GET /clients/export/result/{id}/` - Obtener resultado
- `GET /clients/export/download/{id}/` - Descargar archivo
- `GET /clients/export/csv/` - Exportación rápida CSV
- `GET /clients/export/excel/` - Exportación rápida Excel
- `GET /clients/export/pdf/` - Exportación rápida PDF
- `GET /clients/export/json/` - Exportación rápida JSON

### Plantillas
- `GET /clients/export/templates/` - Obtener plantillas
- `POST /clients/export/templates/` - Crear plantilla
- `PATCH /clients/export/templates/{id}/` - Actualizar plantilla
- `DELETE /clients/export/templates/{id}/` - Eliminar plantilla

## Consideraciones de Rendimiento

### Archivos Pequeños (<5MB, <1000 filas)
- Procesamiento directo en memoria
- Validación inmediata
- Respuesta rápida

### Archivos Grandes (>5MB, >1000 filas)
- Procesamiento por chunks
- Streaming de datos
- Puntos de rollback automáticos
- Estimación de tiempo de procesamiento

### Optimizaciones Implementadas
- Debouncing en validaciones
- Lazy loading de componentes
- Memoización de resultados
- Cancelación de operaciones
- Limpieza automática de recursos

## Accesibilidad

### Navegación por Teclado
- Tab order lógico en todos los modales
- Escape para cerrar modales
- Enter para continuar en wizards
- Arrow keys en selecciones múltiples

### Screen Readers
- ARIA labels en todos los controles
- Live regions para actualizaciones de progreso
- Semantic HTML structure
- Descripciones de estado

### Internacionalización
- Mensajes de error localizados
- Formatos de fecha según locale
- Validaciones específicas por región

## Troubleshooting

### Problemas Comunes

**Error: "File too large"**
- Verificar límite de archivo en configuración
- Usar streaming para archivos grandes
- Dividir archivo en chunks más pequeños

**Error: "Invalid CSV format"**
- Verificar codificación del archivo
- Comprobar delimitadores
- Asegurar consistencia en número de columnas

**Error: "Mapping validation failed"**
- Verificar que campos requeridos estén mapeados
- Comprobar tipos de datos
- Revisar configuración de transformaciones

**Importación lenta**
- Reducir chunk_size
- Deshabilitar validaciones no críticas
- Verificar conexión de red

### Logs y Debugging

```tsx
// Habilitar logs detallados
localStorage.setItem('import-export-debug', 'true');

// Obtener estadísticas de operación
const stats = await ImportExportService.getImportExportStats();
console.log('Stats:', stats);
```

## Futuras Mejoras

- [ ] Importación desde Google Sheets
- [ ] Exportación a más formatos (XML, YAML)
- [ ] Plantillas compartidas entre usuarios
- [ ] Validaciones personalizadas por usuario
- [ ] Integración con sistemas externos
- [ ] Programación de exportaciones automáticas
- [ ] Historial de operaciones detallado
- [ ] Notificaciones push para operaciones largas

## Contribuir

Para contribuir al sistema de importación/exportación:

1. Seguir los patrones establecidos en los componentes existentes
2. Añadir tests para nuevas funcionalidades
3. Actualizar tipos TypeScript cuando sea necesario
4. Documentar nuevas APIs y configuraciones
5. Mantener accesibilidad en todos los componentes

## Licencia

Este sistema es parte del proyecto Padelyzer y está sujeto a la licencia del proyecto principal.