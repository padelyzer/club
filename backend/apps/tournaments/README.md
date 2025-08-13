# Módulo Tournaments

## Descripción

El módulo **Tournaments** es un sistema completo para la gestión de torneos de pádel que incluye múltiples formatos de competencia, sistema de inscripciones, generación automática de llaves, seguimiento de partidos y resultados, rankings y estadísticas.

## Características Principales

### 1. **Gestión de Torneos**
- Múltiples formatos: eliminación, round-robin, sistema suizo, doble eliminación
- Categorías personalizables (nivel, edad, género, mixta, abierta)
- Configuración flexible de fechas, inscripciones y capacidad
- Sistema de visibilidad (público, privado, solo miembros)

### 2. **Sistema de Inscripciones**
- Inscripción de parejas con validaciones automáticas
- Sistema de suplentes
- Estados de inscripción (pendiente, confirmada, lista de espera, rechazada)
- Gestión de pagos integrada

### 3. **Generación Automática de Llaves**
- Algoritmos para diferentes formatos de torneo
- Asignación automática de semillas
- Manejo de byes cuando es necesario
- Estructura de llaves completa

### 4. **Seguimiento de Partidos**
- Programación automática de partidos
- Registro de resultados set por set
- Manejo de walkovers
- Seguimiento de tiempo de juego

### 5. **Rankings y Estadísticas**
- Clasificaciones en tiempo real
- Estadísticas detalladas por torneo
- Métricas de participación y rendimiento
- Historial completo de resultados

### 6. **Sistema de Premios**
- Configuración flexible de premios por posición
- Múltiples tipos: efectivo, trofeos, medallas, puntos
- Seguimiento de premios otorgados

## Modelos Principales

### TournamentCategory
Categorías para organizar torneos por nivel, edad, género, etc.

### Tournament
Modelo principal que define un torneo con toda su configuración.

### TournamentRegistration
Inscripciones de parejas a torneos.

### TournamentBracket
Estructura de llaves del torneo.

### Match
Partidos individuales con resultados y seguimiento.

### Prize
Sistema de premios por posición.

### TournamentRules
Reglas específicas del torneo.

### TournamentStats
Estadísticas y métricas del torneo.

## API Endpoints

### Torneos
- `GET /api/tournaments/` - Listar torneos
- `POST /api/tournaments/` - Crear torneo
- `GET /api/tournaments/{id}/` - Detalle del torneo
- `PUT /api/tournaments/{id}/` - Actualizar torneo
- `DELETE /api/tournaments/{id}/` - Eliminar torneo

### Acciones Específicas de Torneos
- `POST /api/tournaments/{id}/start/` - Iniciar torneo
- `GET /api/tournaments/{id}/bracket/` - Obtener llave
- `GET /api/tournaments/{id}/matches/` - Partidos del torneo
- `GET /api/tournaments/{id}/registrations/` - Inscripciones
- `POST /api/tournaments/{id}/register/` - Inscribirse al torneo
- `GET /api/tournaments/{id}/standings/` - Clasificaciones
- `GET /api/tournaments/{id}/schedule/` - Calendario
- `POST /api/tournaments/{id}/generate_schedule/` - Generar horarios
- `GET /api/tournaments/{id}/stats/` - Estadísticas
- `GET /api/tournaments/{id}/prizes/` - Premios
- `GET /api/tournaments/{id}/rules/` - Reglas

### Inscripciones
- `GET /api/tournaments/registrations/` - Listar inscripciones
- `POST /api/tournaments/registrations/` - Crear inscripción
- `GET /api/tournaments/registrations/{id}/` - Detalle inscripción
- `POST /api/tournaments/registrations/{id}/confirm/` - Confirmar inscripción
- `POST /api/tournaments/registrations/{id}/cancel/` - Cancelar inscripción

### Partidos
- `GET /api/tournaments/matches/` - Listar partidos
- `GET /api/tournaments/matches/{id}/` - Detalle del partido
- `POST /api/tournaments/matches/{id}/start/` - Iniciar partido
- `POST /api/tournaments/matches/{id}/finish/` - Finalizar partido
- `POST /api/tournaments/matches/{id}/record_score/` - Registrar resultado
- `POST /api/tournaments/matches/{id}/walkover/` - Registrar walkover

### Categorías
- `GET /api/tournaments/categories/` - Listar categorías
- `POST /api/tournaments/categories/` - Crear categoría
- `GET /api/tournaments/categories/{id}/` - Detalle categoría

### Premios
- `GET /api/tournaments/prizes/` - Listar premios
- `POST /api/tournaments/prizes/` - Crear premio
- `POST /api/tournaments/prizes/{id}/award/` - Otorgar premio

## Filtros y Búsqueda

### Filtros de Torneos
- `format` - Formato del torneo
- `status` - Estado del torneo
- `category_type` - Tipo de categoría
- `start_date_from/to` - Rango de fechas
- `registration_open` - Inscripciones abiertas
- `my_tournaments` - Mis torneos
- `has_spaces` - Con espacios disponibles

### Filtros de Partidos
- `tournament` - Torneo específico
- `status` - Estado del partido
- `scheduled_date_from/to` - Rango de fechas programadas
- `my_matches` - Mis partidos
- `today` - Partidos de hoy
- `upcoming` - Partidos próximos

## Formatos de Torneo Soportados

### 1. Eliminación Simple
- Estructura de llave tradicional
- Un partido perdido = eliminación
- Número de rondas: log₂(equipos)

### 2. Doble Eliminación
- Llave de ganadores y perdedores
- Dos oportunidades antes de ser eliminado
- Final puede requerir doble victoria

### 3. Round Robin (Todos contra Todos)
- Cada equipo juega contra todos los demás
- Clasificación por puntos/victorias
- Mejor para pocos equipos

### 4. Sistema Suizo
- Emparejamientos basados en resultados
- Número fijo de rondas
- Sin eliminación directa

## Configuración de Categorías

Las categorías permiten organizar torneos según diferentes criterios:

- **Por Nivel**: Principiante, Intermedio, Avanzado, Profesional
- **Por Edad**: Juvenil, Adulto, Veteranos, etc.
- **Por Género**: Masculino, Femenino, Mixto
- **Abierta**: Sin restricciones específicas

## Integración con Otros Módulos

### Clients
- Validación de elegibilidad de jugadores
- Actualización de estadísticas de jugadores
- Gestión de perfiles y niveles

### Clubs
- Asignación de canchas para partidos
- Configuración de horarios del club
- Integración con sistema de reservas

### Notifications
- Notificaciones de inscripción
- Recordatorios de partidos
- Actualizaciones de resultados
- Notificaciones de premios

## Commands de Gestión

### setup_tournament_categories
Crea categorías de torneo por defecto:

```bash
python manage.py setup_tournament_categories
```

## Permisos y Seguridad

- **Organizadores**: Pueden crear y gestionar sus torneos
- **Jugadores**: Pueden inscribirse y ver sus partidos
- **Staff**: Acceso completo a todos los torneos
- **Miembros del Club**: Acceso según configuración de visibilidad

## Validaciones Implementadas

- Validación de fechas de torneo
- Elegibilidad de jugadores por categoría
- Capacidad máxima de inscripciones
- Formato de resultados de partidos
- Reglas de pádel para puntuación

## Estadísticas Disponibles

- Número de participantes por categoría
- Porcentaje de finalización de torneos
- Tiempo promedio de partidos
- Ingresos por inscripciones
- Premios otorgados
- Rankings de jugadores

## Casos de Uso Principales

1. **Organizar Torneo Semanal del Club**
2. **Campeonato Interclubs**
3. **Torneo de Principiantes**
4. **Liga Regular con Multiple Fechas**
5. **Torneo Benéfico o Especial**

## Configuración Recomendada

Para una configuración inicial óptima:

1. Ejecutar `setup_tournament_categories` para crear categorías base
2. Configurar niveles de jugadores en el módulo clients
3. Definir canchas disponibles en el módulo clubs
4. Configurar notificaciones automáticas
5. Establecer reglas de club específicas