# 🏢 Claude Code Execution Prompt - Clubs Module Completion

## 📋 Copy this prompt to Claude Code:

```
Completa el módulo de Clubs antes de proceder con Mobile App Foundation.

CONTEXTO ACTUAL:
- Proyecto: /Users/ja/PZR4
- Security Audit ✅ COMPLETADO (88/100 score, production ready)
- Sistema Health: 95/100, todo listo para producción
- Clubs Module: Funcional pero necesita features avanzadas

TAREA: CLUBS MODULE COMPLETION (1-2 días estimados)
Prioridad: 🔴 ALTA - Prerequisito para Mobile App

OBJETIVOS:
Completar todas las funcionalidades avanzadas del módulo Clubs para que esté 
100% listo antes de desarrollar la Mobile App que consumirá estas APIs.

ANÁLISIS DEL ESTADO ACTUAL:

Revisar estado actual:
- backend/apps/clubs/models.py - Verificar modelos completos
- backend/apps/clubs/views.py - Verificar ViewSets completos  
- backend/apps/clubs/serializers.py - Verificar serialización
- frontend/src/app/[locale]/(dashboard)/clubs/ - Verificar UI

FEATURES A COMPLETAR/MEJORAR:

1. CLUB MANAGEMENT ADVANCED (Priority 1)
   
   BACKEND:
   - Club onboarding workflow completo
   - Multi-location support para clubs con múltiples sedes
   - Club subscription management integrado con Stripe
   - Club analytics dashboard específico
   - Staff management con roles granulares
   - Club branding y customization options
   
   FRONTEND:  
   - Club settings dashboard completo
   - Onboarding wizard para nuevos clubs
   - Multi-location management interface
   - Staff invitation y role management
   - Club customization interface
   - Analytics específicos del club

2. COURT MANAGEMENT OPTIMIZATION (Priority 1)
   
   BACKEND:
   - Court availability optimization algorithms
   - Dynamic pricing basado en demanda
   - Maintenance scheduling automático
   - Court analytics y utilization reports
   - Integration con weather APIs para outdoor courts
   
   FRONTEND:
   - Court availability calendar mejorado
   - Maintenance scheduling interface
   - Pricing management dashboard
   - Court analytics visualizations
   - Weather integration para outdoor courts

3. MEMBER MANAGEMENT SYSTEM (Priority 2)
   
   BACKEND:
   - Membership tiers y benefits management
   - Member analytics y retention metrics
   - Automated communication system
   - Member rewards y loyalty program
   - Member check-in system
   
   FRONTEND:
   - Member management dashboard
   - Membership tiers configuration
   - Communication center
   - Rewards program management
   - Check-in interface

4. FINANCIAL MANAGEMENT (Priority 2)
   
   BACKEND:
   - Revenue analytics específicos del club
   - Cost tracking y profit analysis
   - Automated billing para memberships
   - Financial reporting automation
   - Integration con accounting systems
   
   FRONTEND:
   - Financial dashboard específico
   - Revenue analytics charts
   - Cost tracking interface
   - Billing management
   - Financial reports generator

5. MOBILE API PREPARATION (Priority 1)
   
   BACKEND:
   - Mobile-optimized endpoints
   - Push notification system
   - Offline capability preparation
   - Mobile authentication flow
   - Image optimization para mobile
   
   API ENDPOINTS ESPECÍFICOS:
   - /api/v1/clubs/mobile/ - Mobile-specific data
   - /api/v1/clubs/{id}/dashboard-mobile/ - Mobile dashboard
   - /api/v1/clubs/{id}/notifications/ - Push notifications
   - /api/v1/clubs/{id}/offline-data/ - Offline sync data

INTEGRATIONS NECESARIAS:

1. Con BI Dashboard:
   - Club-specific metrics en BI system
   - Custom dashboards por club
   - Comparative analytics entre clubs

2. Con Finance Module:
   - Club revenue tracking
   - Subscription management
   - Payment processing per club

3. Con Classes/Tournaments:
   - Club-hosted events management
   - Revenue sharing para events
   - Club-specific tournament features

4. Con Reservations:
   - Club-specific booking rules
   - Priority booking para members
   - Club-specific pricing

PERFORMANCE REQUIREMENTS:

- Club dashboard load: <2s
- Court availability check: <500ms  
- Member lookup: <200ms
- Analytics generation: <3s
- Mobile API response: <300ms

ARCHITECTURE PATTERNS:

Backend:
```python
# Club ViewSet con actions específicas
class ClubViewSet(viewsets.ModelViewSet):
    @action(methods=['get'], detail=True)
    def dashboard_mobile(self, request, pk=None):
        # Mobile-optimized club dashboard
        pass
    
    @action(methods=['post'], detail=True) 
    def send_notification(self, request, pk=None):
        # Push notification system
        pass
    
    @action(methods=['get'], detail=True)
    def analytics_summary(self, request, pk=None):
        # Club analytics summary
        pass
```

Frontend:
```typescript
// Club management interfaces
- ClubDashboard.tsx - Main club dashboard
- ClubSettings.tsx - Configuration interface  
- CourtManagement.tsx - Court administration
- MemberManagement.tsx - Member administration
- FinancialDashboard.tsx - Club financials
```

MOBILE READINESS CHECKLIST:

Backend API:
- [ ] Mobile-optimized endpoints implemented
- [ ] Push notification system configured
- [ ] Image optimization pipeline
- [ ] Offline sync capabilities
- [ ] Mobile authentication flow

Data Optimization:
- [ ] Efficient serializers para mobile
- [ ] Pagination en all endpoints
- [ ] Image thumbnails y compression
- [ ] Cached responses para datos estáticos
- [ ] Minimized payload sizes

Testing:
- [ ] API performance testing
- [ ] Mobile payload size testing
- [ ] Offline capability testing
- [ ] Push notification testing
- [ ] Authentication flow testing

DELIVERABLES REQUERIDOS:

1. COMPLETE CLUB BACKEND API
   - All ViewSets con mobile-ready endpoints
   - Performance optimized queries
   - Mobile-specific serializers
   - Push notification integration

2. ENHANCED CLUB FRONTEND  
   - Complete club management interface
   - Mobile-responsive design
   - Integration con BI Dashboard
   - Real-time updates

3. MOBILE API DOCUMENTATION
   - Complete endpoint documentation
   - Mobile-specific usage examples
   - Authentication flow documentation
   - Offline sync documentation

4. PERFORMANCE BENCHMARKS
   - API response time benchmarks
   - Mobile payload size analysis
   - Database query optimization report
   - Caching strategy documentation

COMENZAR CON:
1. Auditar estado actual del módulo Clubs
2. Identificar gaps específicos para Mobile App
3. Implementar mobile-optimized endpoints
4. Mejorar club dashboard frontend
5. Integrar con BI Dashboard

REPORTAR PROGRESO:
- Al completar club management features
- Al implementar mobile API preparation
- Al integrar con otros módulos
- Cuando esté 100% listo para Mobile App

El objetivo es tener el módulo Clubs COMPLETO y MOBILE-READY antes de comenzar 
el Mobile App Foundation. ¿Listo para completar el módulo Clubs?
```

## 🎯 Alternative Short Version:

```
TAREA: Completar módulo Clubs antes de Mobile App Foundation

OBJETIVO: Preparar Clubs module con todas las features avanzadas y mobile-ready APIs

PRIORIDADES:
1. Club management completo (onboarding, multi-location, staff)
2. Court management optimizado (pricing dinámico, maintenance)
3. Mobile API preparation (endpoints optimizados, push notifications)
4. Integration con BI Dashboard

DELIVERABLE: Clubs module 100% completo y listo para Mobile App consumption

TIMELINE: 1-2 días

Comenzar auditando estado actual y identificando gaps para Mobile App.
```

## 📊 Para Monitoreo (esta ventana):

Mientras Claude Code completa el módulo Clubs:

1. **Verificar integrations**:
   - Con BI Dashboard analytics
   - Con Finance module
   - Con reservations system

2. **Validar mobile readiness**:
   - API response times <300ms
   - Payload sizes optimizados
   - Push notification setup

3. **Confirmar completeness**:
   - All CRUD operations
   - Advanced features implemented
   - Frontend interface completo

---
*Creado: January 11, 2025*
*Prerequisito para: Mobile App Foundation*
*Estimado: 1-2 días*