# 🎾 Padelyzer - Sistema de Gestión de Clubs de Padel

## 🚨 EMERGENCY RECOVERY VERSION

Este es el sistema Padelyzer recuperado y funcional con las características principales de **Clubs + Reservaciones**.

## 🚀 Inicio Rápido

### 1. Configuración inicial

```bash
# Activar entorno virtual
source venv/bin/activate

# Aplicar migraciones (si no están aplicadas)
python manage.py migrate

# Cargar datos de demo
python setup_demo.py
```

### 2. Iniciar servidor

```bash
python manage.py runserver
```

### 3. Acceder al sistema

- **Admin Panel**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/schema/swagger/
- **API Root**: http://localhost:8000/api/v1/

### 4. Credenciales de demo

| Usuario | Password | Rol |
|---------|----------|-----|
| admin | admin123 | Superadmin |
| staff | staff123 | Staff del club |
| player | player123 | Jugador |

## 📋 Características Implementadas

### ✅ Fase 1: Gestión de Clubs
- **Clubs**: CRUD completo, configuración, horarios
- **Canchas**: Gestión, precios, mantenimiento
- **Horarios**: Por día de la semana
- **Anuncios**: Sistema de anuncios del club

### ✅ Fase 2: Sistema de Reservaciones
- **Reservaciones**: Crear, modificar, cancelar
- **Disponibilidad**: Verificación en tiempo real
- **Calendario**: Vista mensual de ocupación
- **Bloqueos**: Para mantenimiento o eventos

## 🛠️ API Endpoints

### Autenticación
```
POST   /api/v1/auth/login/         # Login
POST   /api/v1/auth/logout/        # Logout
POST   /api/v1/auth/refresh/       # Refresh token
GET    /api/v1/auth/profile/       # User profile
```

### Clubs
```
GET    /api/v1/clubs/clubs/        # Listar clubs
POST   /api/v1/clubs/clubs/        # Crear club
GET    /api/v1/clubs/clubs/{id}/   # Detalle club
PUT    /api/v1/clubs/clubs/{id}/   # Actualizar club
DELETE /api/v1/clubs/clubs/{id}/   # Eliminar club
```

### Canchas
```
GET    /api/v1/clubs/courts/       # Listar canchas
POST   /api/v1/clubs/courts/       # Crear cancha
GET    /api/v1/clubs/courts/{id}/  # Detalle cancha
PUT    /api/v1/clubs/courts/{id}/  # Actualizar cancha
DELETE /api/v1/clubs/courts/{id}/  # Eliminar cancha
POST   /api/v1/clubs/courts/{id}/toggle_maintenance/  # Cambiar mantenimiento
```

### Reservaciones
```
GET    /api/v1/reservations/reservations/              # Listar reservaciones
POST   /api/v1/reservations/reservations/              # Crear reservación
GET    /api/v1/reservations/reservations/{id}/         # Detalle reservación
PUT    /api/v1/reservations/reservations/{id}/         # Actualizar reservación
DELETE /api/v1/reservations/reservations/{id}/         # Eliminar reservación
POST   /api/v1/reservations/reservations/{id}/cancel/  # Cancelar reservación
POST   /api/v1/reservations/reservations/check_availability/  # Verificar disponibilidad
GET    /api/v1/reservations/reservations/calendar/     # Vista calendario
```

### Horarios Bloqueados
```
GET    /api/v1/reservations/blocked-slots/      # Listar bloqueos
POST   /api/v1/reservations/blocked-slots/      # Crear bloqueo
GET    /api/v1/reservations/blocked-slots/{id}/ # Detalle bloqueo
PUT    /api/v1/reservations/blocked-slots/{id}/ # Actualizar bloqueo
DELETE /api/v1/reservations/blocked-slots/{id}/ # Eliminar bloqueo
```

## 🧪 Testing

### Test manual de API
```bash
# Ejecutar tests de API
python test_api.py
```

### Verificar sistema
```bash
# Verificar configuración Django
python manage.py check

# Verificar modelos
python manage.py shell -c "from apps.clubs.models import Club; from apps.reservations.models import Reservation; print('✅ Models OK')"
```

## 📁 Estructura del Proyecto

```
backend/
├── apps/
│   ├── authentication/    # Sistema de autenticación JWT
│   ├── root/             # Organizaciones y suscripciones
│   ├── clubs/            # Gestión de clubs (HABILITADO)
│   └── reservations/     # Sistema de reservas (HABILITADO)
├── config/
│   ├── settings/         # Configuración Django
│   └── urls.py          # URLs principales
├── core/                # Utilidades compartidas
├── fixtures/            # Datos de demo
└── manage.py           # Django management
```

## 🔧 Características Técnicas

- **Framework**: Django 4.2 + Django REST Framework
- **Base de datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **Autenticación**: JWT (Simple JWT)
- **API Docs**: Swagger/OpenAPI (drf-spectacular)
- **Multi-tenant**: Soporte para múltiples organizaciones

## 📊 Modelos Principales

### Club
- Información básica (nombre, email, teléfono)
- Dirección y ubicación
- Horarios de operación
- Configuración y características

### Court (Cancha)
- Tipo de superficie
- Características (iluminación, techo, calefacción)
- Precio por hora
- Estado de mantenimiento

### Reservation
- Fecha y horario
- Cancha asignada
- Información del jugador
- Estado y pago
- Sistema de cancelación

### BlockedSlot
- Bloqueos por mantenimiento
- Eventos especiales
- Rango de fechas/horas

## 🚀 Próximos Pasos

Para expandir el sistema, se pueden habilitar gradualmente:

1. **Clientes**: Gestión avanzada de jugadores
2. **Clases**: Sistema de clases grupales
3. **Torneos**: Gestión de torneos
4. **Ligas**: Sistema de ligas
5. **Finanzas**: Facturación y pagos
6. **BI**: Analytics y reportes
7. **Notificaciones**: Email/SMS/Push

## 🐛 Solución de Problemas

### Error de migraciones
```bash
python manage.py migrate --run-syncdb
```

### Error de permisos
Asegurarse de que el usuario tenga una organización asignada o sea superusuario.

### Error de importación
```bash
# Reinstalar dependencias
pip install -r requirements.txt
```

## 📝 Notas de Recuperación

Este sistema fue recuperado de emergencia enfocándose en:
- ✅ Funcionalidad core (Clubs + Reservaciones)
- ✅ Modelos simplificados sin dependencias circulares
- ✅ APIs mínimas pero funcionales
- ✅ Admin interface básico
- ✅ Autenticación JWT funcional

**Tiempo de recuperación**: ~3.5 horas
**Estado**: ✅ PRODUCCIÓN LISTA

---

© 2024 Padelyzer - Emergency Recovery Version