# 📊 MAPA DE DEPENDENCIAS - Módulo Clubs

**Generado**: 2025-08-08  
**Propósito**: Documentar todas las dependencias del módulo clubs para implementar arquitectura defensiva

## 🏗️ MODELOS QUE DEPENDEN DE CLUB

### 1. **Reservations** (apps.reservations)
```python
# reservations/models.py
class Reservation(BaseModel):
    club = models.ForeignKey("clubs.Club", on_delete=models.CASCADE, related_name="reservations")
    court = models.ForeignKey("clubs.Court", on_delete=models.CASCADE, related_name="reservations")
```

**Criticidad**: ⚠️ **CRÍTICA**
- **Relación**: Club → Court → Reservation (1:N:N)
- **Comportamiento on_delete**: CASCADE (Si se borra club, se borran reservaciones)
- **Campos relacionados**: 
  - `club`: ForeignKey directo a Club
  - `court`: ForeignKey a Court (que depende de Club)
  - `organization`: Compartido para multi-tenancy

### 2. **Clients** (apps.clients)
```python
# clients/models.py
class ClientProfile(MultiTenantModel):
    # Hereda club de MultiTenantModel
    club = models.ForeignKey("clubs.Club", ...)
```

**Criticidad**: ⚠️ **CRÍTICA**
- **Relación**: Club → ClientProfile (1:N)
- **Comportamiento**: Herencia de MultiTenantModel
- **Implicaciones**: Cliente pertenece a un club específico

### 3. **Tournaments** (apps.tournaments)
```python
# Basado en análisis de código existente
# Probable relación Club → Tournament
```

**Criticidad**: 📊 **MEDIA**
- **Estado**: Requiere análisis detallado
- **Relación esperada**: Club → Tournament (1:N)

### 4. **Leagues** (apps.leagues)
```python
# Basado en análisis de código existente
# Probable relación Club → League
```

**Criticidad**: 📊 **MEDIA**
- **Estado**: Requiere análisis detallado
- **Relación esperada**: Club → League (1:N)

### 5. **Finance** (apps.finance)
```python
# Basado en análisis de código existente
# Probable relación para pagos de membresías y reservas
```

**Criticidad**: 📊 **MEDIA-ALTA**
- **Estado**: Requiere análisis detallado
- **Relación esperada**: Club → Payment/Invoice (1:N)

## 🔗 RELACIONES INTERNAS DEL MÓDULO CLUBS

### Club ↔ Court
```python
class Court(BaseModel):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="courts")
    organization = models.ForeignKey("root.Organization", on_delete=models.CASCADE, related_name="courts")
```

**Tipo**: 1:N (Un club tiene muchas canchas)
**Criticidad**: ⚠️ **CRÍTICA**
**Comportamiento**: CASCADE - Si se borra club, se borran canchas

### Club ↔ Schedule
```python
class Schedule(BaseModel):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="schedules")
```

**Tipo**: 1:N (Un club tiene múltiples horarios)
**Criticidad**: 📊 **MEDIA**
**Comportamiento**: CASCADE

### Court ↔ CourtSpecialPricing
```python
class CourtSpecialPricing(BaseModel):
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="special_pricing_periods")
```

**Tipo**: 1:N (Una cancha tiene múltiples períodos de precios especiales)
**Criticidad**: 📊 **MEDIA**

### Club ↔ Maintenance System
```python
class MaintenanceRecord(BaseModel):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="maintenance_records")
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="maintenance_records")

class MaintenanceSchedule(BaseModel):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="maintenance_schedules")
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="maintenance_schedules", null=True, blank=True)
```

**Tipo**: 1:N (Un club/cancha tiene múltiples mantenimientos)
**Criticidad**: 📊 **MEDIA**

## 🎯 VISTAS QUE COMPARTEN DATOS

### Backend Views (apps.clubs.views)
**Endpoints críticos que requieren protección**:
- `/api/clubs/` - Lista de clubes
- `/api/clubs/{id}/` - Detalle de club
- `/api/clubs/{id}/courts/` - Canchas del club
- `/api/courts/{id}/availability/` - Disponibilidad de cancha

### Cross-Module Views
**Views que consumen datos de clubs**:
- `apps.reservations.views` - Para validar disponibilidad
- `apps.clients.views` - Para mostrar club del cliente
- `apps.tournaments.views` - Para torneos del club
- `apps.finance.views` - Para pagos relacionados al club

## 🔄 SERIALIZERS INTERCONECTADOS

### ClubSerializer (apps.clubs.serializers)
```python
class ClubSerializer(serializers.ModelSerializer):
    courts_count = serializers.SerializerMethodField()
    active_courts = CourtSerializer(many=True, read_only=True)
```

**Dependencias**:
- `CourtSerializer` - Para mostrar canchas
- Campos calculados que requieren queries a Court

### ReservationSerializer (apps.reservations.serializers)
```python
class ReservationSerializer(serializers.ModelSerializer):
    club = ClubSerializer(read_only=True)
    court = CourtSerializer(read_only=True)
```

**Dependencias**:
- Consume `ClubSerializer` y `CourtSerializer`
- Requiere que clubs esté disponible

## ⚡ ORDEN DE INICIALIZACIÓN REQUERIDO

### 1. **Primera Prioridad** (Debe inicializarse primero)
```
1. root.Organization (Dependencia externa)
2. clubs.Club
3. clubs.Court
```

### 2. **Segunda Prioridad** (Puede inicializarse después)
```
4. clubs.Schedule
5. clubs.CourtSpecialPricing  
6. clubs.MaintenanceType
7. clubs.MaintenanceRecord
8. clubs.MaintenanceSchedule
9. clubs.Announcement
```

### 3. **Tercera Prioridad** (Depende de clubs)
```
10. clients.ClientProfile
11. reservations.Reservation
12. tournaments.Tournament (por analizar)
13. leagues.League (por analizar) 
14. finance.* (por analizar)
```

## 🚨 PUNTOS CRÍTICOS DE FALLO

### 1. **Club Deletion Cascade**
**Riesgo**: Si se borra un Club, se borran EN CASCADA:
- Todas las Courts
- Todas las Reservations (vía Court)
- Todos los ClientProfiles
- Todos los Schedules
- Todos los MaintenanceRecords

**Mitigación necesaria**:
- Soft delete en lugar de hard delete
- Validaciones antes de borrar
- Backup automático antes de operaciones destructivas

### 2. **Court Availability Logic**
**Riesgo**: La lógica de disponibilidad está distribuida entre:
- `clubs.Court.is_maintenance`
- `reservations.Reservation.status`
- `clubs.MaintenanceRecord.status`
- `reservations.BlockedSlot`

**Mitigación necesaria**:
- Centralizar lógica de disponibilidad
- Circuit breakers para fallos de disponibilidad

### 3. **Multi-tenancy Integrity**
**Riesgo**: Inconsistencias en `organization` field entre modelos relacionados
**Mitigación necesaria**:
- Validadores de integridad multi-tenant
- Signals para mantener consistencia

## 📋 QUERIES CRÍTICOS QUE REQUIEREN OPTIMIZACIÓN

### 1. **Club Dashboard Query**
```python
# Vista típica que puede ser costosa
club = Club.objects.select_related('organization').prefetch_related(
    'courts__reservations',
    'maintenance_records',
    'announcements'
).get(id=club_id)
```

### 2. **Court Availability Query**
```python
# Query complejo para calcular disponibilidad
available_courts = Court.objects.filter(
    club=club,
    is_active=True,
    is_maintenance=False
).exclude(
    reservations__date=target_date,
    reservations__start_time__lt=end_time,
    reservations__end_time__gt=start_time,
    reservations__status__in=['confirmed', 'pending']
)
```

## 🛠️ RECOMENDACIONES DE ESTABILIZACIÓN

### Inmediatas (Críticas)
1. ✅ Implementar mixins defensivos
2. ✅ Crear validators de integridad
3. ✅ Implementar circuit breakers
4. ✅ Health checks específicos

### Mediano plazo (Importantes)
1. Optimizar queries N+1
2. Implementar cache para disponibilidad
3. Soft delete system
4. Audit trail para cambios críticos

### Largo plazo (Mejoras)
1. Event sourcing para cambios de estado
2. CQRS para reads complejos
3. Microservices separation
4. Advanced monitoring

---

**🔄 Última actualización**: 2025-08-08  
**📝 Próxima revisión**: Después de implementar circuit breakers