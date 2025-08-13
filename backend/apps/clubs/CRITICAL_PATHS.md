# 🎯 RUTAS CRÍTICAS - Módulo Clubs

**Generado**: 2025-08-08  
**Propósito**: Documentar los flujos críticos que NUNCA deben fallar en el sistema

## 🚨 APIS QUE NUNCA DEBEN FALLAR

### **Nivel 1: CRÍTICO ABSOLUTO** 
> ❌ Si fallan, el sistema completo se ve comprometido

#### 1. `/api/clubs/` - Lista de Clubes
**Endpoint**: `GET /api/clubs/`
**Used by**: Dashboard principal, selección de club, navegación
**Dependencias**: 
- `Organization.clubs` relationship
- `Club.is_active` status
**Failure Impact**: 🔴 **TOTAL** - Usuario no puede acceder al sistema

#### 2. `/api/clubs/{id}/` - Detalle de Club  
**Endpoint**: `GET /api/clubs/{club_id}/`
**Used by**: Navegación de club, dashboard específico
**Dependencias**:
- `Club` model integrity
- `Club.courts` relationship  
- `Club.organization` relationship
**Failure Impact**: 🔴 **ALTO** - Usuario no puede operar en el club seleccionado

#### 3. `/api/clubs/{id}/courts/` - Canchas del Club
**Endpoint**: `GET /api/clubs/{club_id}/courts/`  
**Used by**: Sistema de reservas, disponibilidad
**Dependencias**:
- `Club.courts` relationship
- `Court.is_active` status
- `Court.is_maintenance` status
**Failure Impact**: 🔴 **ALTO** - No se pueden crear reservas

### **Nivel 2: CRÍTICO OPERACIONAL**
> ⚠️ Si fallan, operaciones específicas se ven afectadas

#### 4. `/api/courts/{id}/availability/` - Disponibilidad de Cancha
**Endpoint**: `GET /api/courts/{court_id}/availability/`
**Used by**: Modal de nueva reserva, calendario
**Dependencias**:
- `Court` model integrity
- `Reservation.status` logic
- `MaintenanceRecord.blocks_reservations()` method
- `BlockedSlot` checks
**Failure Impact**: 🟠 **MEDIO-ALTO** - No se puede validar disponibilidad

#### 5. `/api/clubs/{id}/dashboard/` - Métricas de Club
**Endpoint**: `GET /api/clubs/{club_id}/dashboard/`
**Used by**: Dashboard principal del club
**Dependencias**:
- Agregaciones de `Reservation`
- Counts de `Court`  
- Métricas de `ClientProfile`
**Failure Impact**: 🟠 **MEDIO** - Dashboard no muestra datos

## 🔄 FLUJO 1: Club → Reserva → Cliente

### **Secuencia Normal de Operación**
```
1. Usuario selecciona Club
   ↓ GET /api/clubs/
   ↓ Muestra lista de clubes activos
   ↓ Usuario hace click en club

2. Sistema carga datos del Club  
   ↓ GET /api/clubs/{id}/
   ↓ Prefetch courts, schedules
   ↓ Muestra dashboard del club

3. Usuario quiere hacer reserva
   ↓ GET /api/clubs/{id}/courts/
   ↓ Filtra courts activos y disponibles
   ↓ Muestra selector de canchas

4. Sistema valida disponibilidad
   ↓ GET /api/courts/{id}/availability/
   ↓ Valida contra reservas existentes
   ↓ Valida contra mantenimientos
   ↓ Valida contra slots bloqueados

5. Usuario crea reserva
   ↓ POST /api/reservations/
   ↓ Valida court pertenece a club
   ↓ Valida horario disponible
   ↓ Crea/vincula ClientProfile si necesario
```

### **Puntos de Fallo Críticos**
1. **Club no existe o inactivo** → Error 404/403
2. **Courts no disponibles** → Error de validación  
3. **Availability service down** → Error 503
4. **Reservation creation fails** → Rollback necesario
5. **ClientProfile creation fails** → Orphan reservation

### **Mecanismos de Protección Requeridos**
- ✅ Circuit breaker en availability checks
- ✅ Retry logic para database timeouts
- ✅ Transaction rollback en reservation creation
- ✅ Health checks para dependencies
- ✅ Fallback responses cuando sea posible

## 🏆 FLUJO 2: Club → Torneo → Liga  

### **Secuencia Normal de Operación**
```
1. Club Manager crea Torneo
   ↓ POST /api/tournaments/
   ↓ Valida club ownership
   ↓ Asigna courts del club
   ↓ Set tournament schedule

2. Sistema configura Bracket
   ↓ PUT /api/tournaments/{id}/bracket/
   ↓ Calcula matches basado en courts
   ↓ Schedules matches en courts disponibles
   ↓ Crea reservations "tournament" type

3. Torneo genera League Points
   ↓ POST /api/tournaments/{id}/results/
   ↓ Actualiza player stats
   ↓ Calcula league standings
   ↓ Updates club rankings
```

### **Dependencias Críticas**
- `Club.courts` → Must be available for tournament
- `Court.is_active` → Tournament matches need active courts
- `Reservation.tournament` → Blocks court availability
- `Tournament.club` → Determines permissions and courts

### **Failure Scenarios**
1. **Club courts become unavailable** → Tournament rescheduling needed
2. **Reservation conflicts** → Match scheduling fails
3. **Tournament results fail to save** → League standings inconsistent

## 💰 FLUJO 3: Club → Finanzas → Pagos

### **Secuencia Normal de Operación**  
```
1. Club configura Pricing
   ↓ PUT /api/clubs/{id}/pricing/
   ↓ Set Court.price_per_hour
   ↓ Configure CourtSpecialPricing periods
   ↓ Set membership fees

2. Reservation triggers Payment
   ↓ POST /api/reservations/
   ↓ Calculate total_price from court pricing
   ↓ Apply special pricing if applicable  
   ↓ Create payment record
   ↓ Process payment via gateway

3. Payment confirmation updates Finance
   ↓ Webhook from payment gateway
   ↓ POST /api/webhooks/payment/
   ↓ Updates reservation.payment_status
   ↓ Creates finance.Transaction record
   ↓ Updates club revenue metrics
```

### **Critical Financial Integrity Points**
1. **Price calculation** → Must be accurate and consistent
2. **Payment processing** → Must handle failures gracefully  
3. **Revenue tracking** → Must maintain consistency
4. **Refund processing** → Must handle cancellation policies

## 🛡️ MECANISMOS DE PROTECCIÓN POR FLUJO

### **Para Flujo Club → Reserva → Cliente**
```python
# Circuit Breaker Pattern
class ClubAvailabilityCircuitBreaker:
    def get_court_availability(self, court_id, date, start_time, end_time):
        if self.circuit_open:
            return self.fallback_availability_response()
        
        try:
            return self.real_availability_check(court_id, date, start_time, end_time)
        except Exception as e:
            self.record_failure(e)
            if self.failure_threshold_reached():
                self.open_circuit()
            raise
```

### **Para Flujo Club → Torneo → Liga**
```python
# Compensation Pattern  
class TournamentCompensationHandler:
    def handle_tournament_creation_failure(self, tournament_data):
        # Rollback court reservations
        # Cancel bracket generation
        # Notify participants
        # Restore previous state
```

### **Para Flujo Club → Finanzas → Pagos**
```python
# Saga Pattern
class PaymentSagaOrchestrator:
    def process_reservation_payment(self, reservation):
        try:
            # Step 1: Calculate pricing
            price = self.calculate_price(reservation)
            # Step 2: Create payment intent
            payment_intent = self.create_payment_intent(price)
            # Step 3: Process payment
            result = self.process_payment(payment_intent)
            # Step 4: Update records
            self.update_reservation_payment_status(reservation, result)
        except Exception as e:
            # Compensate: rollback all steps
            self.compensate(reservation, e)
```

## 📊 MÉTRICAS DE MONITOREO CRÍTICAS

### **Availability SLA Metrics**
```python
# Estas métricas NUNCA deben estar por debajo de los thresholds
CRITICAL_METRICS = {
    'club_list_api_uptime': '99.9%',           # GET /api/clubs/
    'club_detail_api_uptime': '99.5%',        # GET /api/clubs/{id}/
    'court_availability_uptime': '99.0%',     # GET /api/courts/{id}/availability/
    'reservation_creation_success': '98.0%',  # POST /api/reservations/
    'payment_processing_success': '99.5%',    # Payment flow
}
```

### **Performance Thresholds**
```python
PERFORMANCE_THRESHOLDS = {
    'club_list_response_time': '500ms',
    'club_detail_response_time': '1s', 
    'availability_check_response_time': '2s',
    'reservation_creation_time': '3s',
    'payment_processing_time': '10s'
}
```

## 🚨 ESCALATION PROCEDURES

### **Nivel 1: Automatic Recovery**
- Circuit breakers activate
- Retry mechanisms engage  
- Fallback responses served
- Health checks trigger auto-healing

### **Nivel 2: Alert & Manual Intervention**
- Operations team notified
- Manual failover procedures
- Database integrity checks
- Service restart procedures

### **Nivel 3: Emergency Protocols**
- System-wide maintenance mode
- Data backup and recovery
- Rollback to last known good state
- Customer communication protocols

---

**🔄 Última actualización**: 2025-08-08  
**📝 Revisión siguiente**: Después de implementar circuit breakers  
**🎯 Objetivo**: Zero downtime en rutas críticas