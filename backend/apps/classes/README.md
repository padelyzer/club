# Classes Module

El módulo **Classes** gestiona todo lo relacionado con clases de pádel y tenis, incluyendo horarios, inscripciones, asistencia y evaluaciones de instructores.

## Modelos Implementados

### 1. ClassLevel
- **Propósito**: Define los niveles de dificultad de las clases
- **Campos principales**:
  - `name`: Nombre del nivel (beginner, intermediate, advanced, all_levels)
  - `display_name`: Nombre para mostrar
  - `description`: Descripción del nivel
  - `order`: Orden para visualización
  - `color`: Color representativo
  - `icon`: Icono del nivel

### 2. ClassType
- **Propósito**: Tipos de clases disponibles (grupal, individual, clínica, intensivo)
- **Campos principales**:
  - `name`: Tipo de clase (group, individual, clinic, intensive, workshop)
  - `display_name`: Nombre para mostrar
  - `min_participants`/`max_participants`: Capacidad
  - `default_duration_minutes`: Duración por defecto
  - `base_price`: Precio base
  - `allow_drop_in`: Permite inscripción espontánea
  - `allow_waitlist`: Permite lista de espera

### 3. Instructor
- **Propósito**: Gestión de instructores y sus perfiles
- **Campos principales**:
  - `user`: Relación con usuario
  - `bio`: Biografía
  - `specialties`: Especialidades (tipos de clase)
  - `certifications`: Certificaciones (JSON)
  - `years_experience`: Años de experiencia
  - `available_days`: Días disponibles
  - `rating`: Calificación promedio
  - `total_ratings`: Total de evaluaciones

### 4. ClassSchedule
- **Propósito**: Programación de clases (horarios y recurrencia)
- **Campos principales**:
  - `name`: Nombre de la programación
  - `class_type`: Tipo de clase
  - `level`: Nivel
  - `instructor`: Instructor asignado
  - `start_date`/`end_date`: Fechas de vigencia
  - `start_time`: Hora de inicio
  - `recurrence`: Tipo de recurrencia (once, daily, weekly, biweekly, monthly)
  - `recurrence_days`: Días de la semana para recurrencia
  - `price`/`member_price`: Precios
  - `allow_waitlist`: Configuración de lista de espera

### 5. ClassSession
- **Propósito**: Sesiones individuales de clases
- **Campos principales**:
  - `schedule`: Programación padre
  - `scheduled_datetime`: Fecha y hora programada
  - `instructor`/`substitute_instructor`: Instructores
  - `max_participants`: Capacidad máxima
  - `enrolled_count`/`attended_count`: Contadores
  - `status`: Estado (scheduled, confirmed, in_progress, completed, cancelled)

### 6. ClassEnrollment
- **Propósito**: Inscripciones de estudiantes en sesiones
- **Campos principales**:
  - `session`: Sesión
  - `student`: Estudiante (ClientProfile)
  - `status`: Estado (enrolled, waitlisted, cancelled, no_show)
  - `waitlist_position`: Posición en lista de espera
  - `paid`/`payment_amount`: Información de pago
  - `checked_in`/`check_in_time`: Check-in

### 7. ClassAttendance
- **Propósito**: Control de asistencia y evaluaciones de clase
- **Campos principales**:
  - `session`: Sesión
  - `student`: Estudiante
  - `present`: Asistencia
  - `arrival_time`/`departure_time`: Tiempos
  - `instructor_notes`: Notas del instructor
  - `performance_rating`: Calificación de rendimiento
  - `student_rating`/`student_feedback`: Evaluación del estudiante

### 8. InstructorEvaluation
- **Propósito**: Evaluaciones de instructores por estudiantes
- **Campos principales**:
  - `instructor`: Instructor evaluado
  - `student`: Estudiante evaluador
  - `session`: Sesión evaluada
  - `overall_rating`: Calificación general
  - `teaching_quality`/`punctuality`/`communication`: Aspectos específicos
  - `comments`: Comentarios
  - `would_recommend`: Recomendaría
  - `is_anonymous`: Evaluación anónima

### 9. ClassPackage
- **Propósito**: Paquetes de clases para compra masiva
- **Campos principales**:
  - `name`: Nombre del paquete
  - `class_types`: Tipos de clase incluidos
  - `num_classes`: Número de clases
  - `validity_days`: Días de validez
  - `price`: Precio del paquete
  - `transferable`: Transferible entre usuarios

### 10. StudentPackage
- **Propósito**: Paquetes comprados por estudiantes
- **Campos principales**:
  - `student`: Estudiante
  - `package`: Paquete comprado
  - `expires_at`: Fecha de expiración
  - `classes_remaining`/`classes_used`: Uso del paquete
  - `payment_amount`/`payment_reference`: Información de pago

## API Endpoints

### ClassLevel
- `GET /api/classes/levels/` - Listar niveles
- `POST /api/classes/levels/` - Crear nivel
- `GET /api/classes/levels/{id}/` - Detalle de nivel
- `PUT /api/classes/levels/{id}/` - Actualizar nivel
- `DELETE /api/classes/levels/{id}/` - Eliminar nivel

### ClassType
- `GET /api/classes/types/` - Listar tipos de clase
- `POST /api/classes/types/` - Crear tipo de clase
- `GET /api/classes/types/{id}/` - Detalle de tipo
- `PUT /api/classes/types/{id}/` - Actualizar tipo
- `DELETE /api/classes/types/{id}/` - Eliminar tipo

### Instructor
- `GET /api/classes/instructors/` - Listar instructores
- `POST /api/classes/instructors/` - Crear instructor
- `GET /api/classes/instructors/{id}/` - Detalle de instructor
- `PUT /api/classes/instructors/{id}/` - Actualizar instructor
- `DELETE /api/classes/instructors/{id}/` - Eliminar instructor
- `GET /api/classes/instructors/{id}/schedule/` - Horario del instructor
- `GET /api/classes/instructors/{id}/evaluations/` - Evaluaciones del instructor
- `GET /api/classes/instructors/{id}/stats/` - Estadísticas del instructor

### ClassSchedule
- `GET /api/classes/schedules/` - Listar horarios
- `POST /api/classes/schedules/` - Crear horario
- `GET /api/classes/schedules/{id}/` - Detalle de horario
- `PUT /api/classes/schedules/{id}/` - Actualizar horario
- `DELETE /api/classes/schedules/{id}/` - Eliminar horario
- `POST /api/classes/schedules/{id}/generate_sessions/` - Generar sesiones
- `PATCH /api/classes/schedules/{id}/toggle_published/` - Publicar/despublicar

### ClassSession
- `GET /api/classes/sessions/` - Listar sesiones
- `POST /api/classes/sessions/` - Crear sesión
- `GET /api/classes/sessions/{id}/` - Detalle de sesión
- `PUT /api/classes/sessions/{id}/` - Actualizar sesión
- `DELETE /api/classes/sessions/{id}/` - Eliminar sesión
- `POST /api/classes/sessions/{id}/cancel/` - Cancelar sesión
- `POST /api/classes/sessions/{id}/start/` - Iniciar sesión
- `POST /api/classes/sessions/{id}/complete/` - Completar sesión
- `GET /api/classes/sessions/{id}/enrollments/` - Inscripciones de la sesión

### ClassEnrollment
- `GET /api/classes/enrollments/` - Listar inscripciones
- `POST /api/classes/enrollments/` - Crear inscripción
- `GET /api/classes/enrollments/{id}/` - Detalle de inscripción
- `PUT /api/classes/enrollments/{id}/` - Actualizar inscripción
- `DELETE /api/classes/enrollments/{id}/` - Eliminar inscripción
- `POST /api/classes/enrollments/{id}/cancel/` - Cancelar inscripción
- `POST /api/classes/enrollments/{id}/check_in/` - Check-in

### ClassAttendance
- `GET /api/classes/attendance/` - Listar asistencias
- `POST /api/classes/attendance/` - Registrar asistencia
- `GET /api/classes/attendance/{id}/` - Detalle de asistencia
- `PUT /api/classes/attendance/{id}/` - Actualizar asistencia

### InstructorEvaluation
- `GET /api/classes/evaluations/` - Listar evaluaciones
- `POST /api/classes/evaluations/` - Crear evaluación
- `GET /api/classes/evaluations/{id}/` - Detalle de evaluación
- `PUT /api/classes/evaluations/{id}/` - Actualizar evaluación

### ClassPackage & StudentPackage
- `GET /api/classes/packages/` - Listar paquetes
- `POST /api/classes/packages/` - Crear paquete
- `GET /api/classes/student-packages/` - Paquetes del estudiante
- `POST /api/classes/student-packages/` - Comprar paquete

### Calendar
- `GET /api/classes/calendar/monthly/` - Vista mensual del calendario
- `GET /api/classes/calendar/weekly/` - Vista semanal del calendario

### Student History
- `GET /api/classes/history/my_classes/` - Historial de clases del estudiante
- `GET /api/classes/history/stats/` - Estadísticas del estudiante

## Funcionalidades Implementadas

### 1. Gestión de Tipos de Clases y Niveles
- CRUD completo para tipos de clase y niveles
- Configuración de capacidad, duración y precios
- Configuración de inscripciones y listas de espera

### 2. Perfil de Instructores
- Gestión completa de instructores
- Especialidades y certificaciones
- Sistema de calificaciones y evaluaciones
- Disponibilidad y horarios

### 3. Programación Flexible
- Clases únicas y recurrentes (diario, semanal, quincenal, mensual)
- Generación automática de sesiones
- Gestión de horarios y ubicaciones

### 4. Sistema de Inscripciones
- Inscripción con validaciones automáticas
- Lista de espera automática
- Control de límites de capacidad
- Sistema de check-in

### 5. Control de Asistencia
- Registro de asistencia por sesión
- Evaluaciones de rendimiento
- Feedback de estudiantes

### 6. Lista de Espera Automática
- Promoción automática desde lista de espera
- Gestión de posiciones en cola
- Notificaciones de disponibilidad

### 7. Cancelación de Clases
- Cancelación con razones
- Actualización automática de inscripciones
- Sistema de notificaciones (pendiente de implementar)

### 8. Paquetes de Clases
- Compra de paquetes con múltiples clases
- Control de validez y uso
- Transferencia entre usuarios (opcional)

### 9. Calendario y Vistas
- Vista mensual y semanal
- Integración con horarios de instructores
- Filtros por organización y club

### 10. Historial de Estudiantes
- Historial completo de clases
- Estadísticas de asistencia
- Gestión de paquetes activos

## Permisos y Seguridad

- **IsAuthenticated**: Requerido para todos los endpoints
- **IsOrganizationMember**: Para operaciones dentro de la organización
- **Multi-tenant**: Filtrado automático por organización/club
- **Validaciones**: Extensas validaciones en modelos y serializers

## Integraciones

- **Clubs**: Integración con canchas y clubes
- **Clients**: Integración con perfiles de clientes
- **Auth**: Sistema de autenticación y usuarios
- **Root**: Sistema multi-tenant con organizaciones

## Pruebas

- Tests unitarios para modelos
- Tests de integración para APIs
- Validación de lógica de negocio
- Tests de permisos y seguridad

## Configuración del Admin

- Interface administrativa completa
- Filtros y búsquedas avanzadas
- Gestión de relaciones
- Vistas de solo lectura para campos calculados

## Próximos Pasos

1. Implementar sistema de notificaciones
2. Integrar sistema de pagos
3. Agregar reportes y analytics
4. Implementar reserva de canchas automática
5. Sistema de comunicación instructor-estudiante