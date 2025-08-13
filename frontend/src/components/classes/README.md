# Módulo de Clases - Padelyzer Frontend

## Componente ClassForm

El componente `class-form.tsx` es un formulario completo para crear y editar clases en el sistema Padelyzer.

### Características principales:

1. **Modo dual**: Soporta tanto creación como edición de clases
2. **Validación completa**: Usa React Hook Form con Zod para validación robusta
3. **Búsqueda de instructores**: Combobox con búsqueda y filtrado de instructores
4. **Cálculo automático**: La hora de fin se calcula automáticamente basada en la duración
5. **Clases recurrentes**: Soporte completo para programar clases recurrentes
6. **Verificación de conflictos**: Verifica conflictos de horario antes de guardar
7. **Gestión de arrays**: Manejo dinámico de equipamiento, requisitos y objetivos

### Secciones del formulario:

#### 1. Información Básica
- Nombre y descripción de la clase
- Nivel (principiante, intermedio, avanzado, profesional, mixto)
- Categoría (grupo, privada, semi-privada, intensiva, clínica)
- Tipo (técnica, táctica, físico, partido, fundamentos)

#### 2. Instructor y Ubicación
- Búsqueda y selección de instructor con detalles
- Selección de club
- Selección opcional de cancha

#### 3. Programación
- Fecha y horarios
- Duración y capacidad máxima
- Configuración de recurrencia (diaria, semanal, mensual)

#### 4. Precios y Pagos
- Precio por clase
- Moneda

#### 5. Configuración Adicional
- Estado de la clase (solo en modo edición)
- Equipamiento requerido
- Requisitos previos
- Objetivos de la clase
- Notas adicionales
- Opciones de lista de espera
- Política de cancelación

### Integración con el Store

El formulario se integra completamente con `classesStore` y utiliza los hooks de API:
- `useInstructors`: Para obtener la lista de instructores
- `useCreateClass`: Para crear nuevas clases
- `useUpdateClass`: Para actualizar clases existentes
- `useConflictCheck`: Para verificar conflictos de horario

### Uso

```tsx
<ClassForm
  isOpen={isOpen}
  onClose={handleClose}
  onSuccess={handleSuccess}
  editingClass={classToEdit} // opcional, para modo edición
/>
```

### Componentes UI requeridos

El formulario requiere los siguientes componentes UI:
- Modal
- Button
- Input
- Label
- Textarea
- Select
- Switch
- Badge
- Combobox (personalizado)

### Traducciones

El formulario utiliza i18next para traducciones. Las claves de traducción siguen el patrón `classes.*` para mantener consistencia con el resto del módulo.