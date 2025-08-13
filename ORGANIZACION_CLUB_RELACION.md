# Relación entre Organizaciones y Clubes en Padelyzer

## Arquitectura Multi-Tenant

Padelyzer utiliza una arquitectura multi-tenant jerárquica donde:

```
┌─────────────────────────────────────────────────────┐
│                    PADELYZER                        │
│                  (Sistema SaaS)                     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐          ┌────────▼────────┐
│ Organización A │          │ Organización B  │
│ (Cadena)       │          │ (Club único)    │
└───────┬────────┘          └────────┬────────┘
        │                            │
   ┌────┴────┬────┬────┐            │
   │         │    │    │            │
┌──▼──┐  ┌──▼──┐ │ ┌──▼──┐    ┌────▼────┐
│Club 1│  │Club 2│ │ │Club 3│    │ Club 1  │
└──┬───┘  └──┬───┘ │ └──┬───┘    └────┬────┘
   │         │     │    │              │
Canchas   Canchas  │  Canchas      Canchas
```

## Niveles de la Jerarquía

### 1. **Organización** (`root.Organization`)
- Es la entidad principal que contrata el servicio
- Puede ser:
  - **Club Individual**: Un solo club
  - **Cadena de Clubes**: Múltiples clubes bajo una misma administración
  - **Franquicia**: Modelo de franquicia con múltiples ubicaciones
- Tiene:
  - Información fiscal (RFC, razón social)
  - Suscripción al servicio
  - Límites según el plan contratado
  - Facturación centralizada

### 2. **Club** (`clubs.Club`)
- Es una ubicación física donde se juega padel
- Pertenece a UNA organización
- Tiene:
  - Canchas
  - Horarios de operación
  - Empleados
  - Clientes/miembros
  - Reservaciones
  - Configuración propia

### 3. **Canchas** (`clubs.Court`)
- Pertenecen a UN club
- Son las unidades reservables

## Ejemplos Prácticos

### Caso 1: Club Individual
```
Organización: "Padel Club Polanco S.A. de C.V."
└── Club: "Padel Club Polanco"
    ├── Cancha 1
    ├── Cancha 2
    └── Cancha 3
```

### Caso 2: Cadena de Clubes
```
Organización: "Grupo Padel México S.A. de C.V."
├── Club: "Padel México - Polanco"
│   ├── Cancha 1
│   ├── Cancha 2
│   └── Cancha 3
├── Club: "Padel México - Santa Fe"
│   ├── Cancha 1
│   ├── Cancha 2
│   ├── Cancha 3
│   └── Cancha 4
└── Club: "Padel México - Coyoacán"
    ├── Cancha 1
    └── Cancha 2
```

## Límites por Plan de Suscripción

Los planes definen cuántos clubes puede tener una organización:

```python
# En backend/apps/root/models.py
def can_add_club(self):
    """Check if organization can add more clubs based on plan."""
    limits = {
        'basic': 1,        # Solo 1 club
        'pro': 5,          # Hasta 5 clubes
        'enterprise': -1   # Clubes ilimitados
    }
    
    limit = limits.get(self.plan, 1)
    if limit == -1:  # Unlimited
        return True
        
    current_clubs = self.organization.clubs.filter(is_active=True).count()
    return current_clubs < limit
```

## Gestión desde ROOT

El módulo ROOT permite a los superadministradores:

1. **Ver todas las organizaciones**
   - Estado (trial, active, suspended)
   - Plan de suscripción
   - Número de clubes

2. **Gestionar clubes**
   - Crear clubes asignándolos a una organización
   - Transferir clubes entre organizaciones
   - Eliminar clubes
   - Ver métricas por club

3. **Control de límites**
   - Validar que no se excedan los límites del plan
   - Alertar cuando una organización está cerca del límite

## Flujo de Creación

1. **Se crea una Organización** (al contratar el servicio)
2. **Se asigna un plan de suscripción**
3. **Se crean los clubes** dentro de los límites del plan
4. **Se configuran las canchas** en cada club
5. **Los usuarios finales** hacen reservaciones en las canchas

## Ventajas de esta Arquitectura

1. **Facturación centralizada**: Una organización, una factura
2. **Gestión multi-sede**: Administrar varios clubes desde un solo lugar
3. **Reportes consolidados**: Ver métricas de todos los clubes
4. **Flexibilidad**: Diferentes configuraciones por club
5. **Escalabilidad**: Fácil agregar nuevos clubes

## Permisos y Acceso

- **Superadmin (ROOT)**: Ve y gestiona todas las organizaciones y clubes
- **Admin de Organización**: Ve y gestiona solo sus clubes
- **Manager de Club**: Gestiona solo su club específico
- **Empleados**: Acceso limitado a funciones operativas
- **Clientes**: Solo pueden hacer reservaciones

Esta estructura permite que Padelyzer sirva tanto a clubes individuales pequeños como a grandes cadenas con múltiples ubicaciones, todo en la misma plataforma.