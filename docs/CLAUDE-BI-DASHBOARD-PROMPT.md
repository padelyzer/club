# 🚀 Claude Code Execution Prompt - BI Dashboard Foundation

## 📋 Copy this prompt to Claude Code:

```
Implementa el BI Dashboard Foundation como la siguiente tarea prioritaria post-Sprint 16.

CONTEXTO ACTUAL:
- Proyecto: /Users/ja/PZR4
- Sprint 16 COMPLETADO: 6 tareas críticas ✅
- Sistema Health: 95/100, todos módulos MVP ready
- Todos los datos están disponibles: users, reservations, payments, classes, tournaments

TAREA: BI DASHBOARD FOUNDATION (5-6 días estimados)
Documentación detallada: /Users/ja/PZR4/docs/Tasks/BI-Dashboard-Foundation.md

IMPLEMENTAR:

1. BACKEND ANALYTICS API (2-3 días)
   Archivo: backend/apps/analytics/
   
   CREAR:
   - models.py: KPI, MetricSnapshot, ReportSchedule, Dashboard
   - services.py: MetricsCalculator, ReportGenerator, DataAggregator
   - views.py: AnalyticsViewSet con endpoints especializados
   - serializers.py: Complex data serialization
   - tasks.py: Celery para cálculos pesados

   ENDPOINTS CRÍTICOS:
   - GET /analytics/kpis/ - KPIs en tiempo real
   - GET /analytics/revenue/ - Revenue breakdown
   - GET /analytics/usage/ - Court utilization
   - GET /analytics/growth/ - User growth metrics
   - GET /analytics/dashboard/{type}/ - Dashboard preconfigurado

2. FRONTEND DASHBOARD (2-3 días)
   Archivo: frontend/src/app/[locale]/(dashboard)/analytics/
   
   CREAR:
   - page.tsx: Main analytics dashboard
   - components/charts/: RevenueChart, UsageChart, GrowthChart
   - components/kpis/: KPICard, MetricsTile, ComparisonWidget
   - components/filters/: DateRangePicker, MetricSelector
   - hooks/useAnalytics.ts: Data fetching and caching

   CHARTS REQUERIDOS:
   - Revenue by month (Bar/Line chart)
   - Court utilization heatmap
   - User growth over time
   - Top revenue clubs ranking
   - Class attendance trends
   - Tournament participation

3. REAL-TIME METRICS (1 día)
   INTEGRAR:
   - WebSocket connections para live updates
   - Redis caching para performance
   - Background tasks para cálculos pesados
   - Export functionality (PDF/Excel)

STACK TECNOLÓGICO:
- Charts: Recharts (ya instalado en frontend)
- Background: Celery + Redis
- Database: Efficient aggregation queries
- Real-time: WebSocket integration

MÉTRICAS OBJETIVO:
- Dashboard load time: <3s
- Real-time update: <500ms
- Data accuracy: 99.9%
- Export generation: <10s

PATRONES A SEGUIR:
- Backend: Usar existing patterns (ViewSets, serializers, permissions)
- Frontend: Componentes en src/components/analytics/
- Queries: Optimizar con select_related, prefetch_related
- Caching: Redis para metrics pesadas
- Testing: Unit tests para cálculos, integration para endpoints

DATOS DISPONIBLES (integrar desde):
- Users: registration, activity, retention
- Reservations: bookings, cancellations, peak hours
- Payments: revenue, transactions, methods
- Classes: attendance, instructor performance
- Tournaments: participation, completion rates
- Clubs: utilization, performance metrics

FASES DE IMPLEMENTACIÓN:

Fase 1 (Día 1-2): Backend Foundation
1. Crear app analytics con modelos básicos
2. Implementar MetricsCalculator service
3. Crear endpoints básicos para KPIs
4. Setup Celery tasks para agregaciones

Fase 2 (Día 3-4): Frontend Dashboard
1. Crear layout principal del dashboard
2. Implementar componentes de charts básicos
3. Integrar con backend APIs
4. Añadir filters y date pickers

Fase 3 (Día 5-6): Advanced Features
1. Real-time updates con WebSocket
2. Export functionality
3. Performance optimization
4. Testing comprehensivo

COMENZAR CON:
1. Leer documentación completa en Tasks/BI-Dashboard-Foundation.md
2. Crear app analytics: python manage.py startapp analytics
3. Implementar modelos básicos y migrations
4. Crear service para metrics calculation
5. Desarrollar primeros endpoints de KPIs

REPORTAR PROGRESO:
- Al completar backend foundation
- Al completar frontend básico
- Al implementar real-time features
- Si encuentras blockers

¿Listo para comenzar con BI Dashboard Foundation?
```

## 🎯 Alternative Short Version:

```
Implementa BI Dashboard Foundation siguiendo la documentación en:
/Users/ja/PZR4/docs/Tasks/BI-Dashboard-Foundation.md

OBJETIVO: Sistema completo de analytics con KPIs, charts y real-time updates.

STACK: Django analytics app + Next.js dashboard con Recharts + Celery/Redis

FASES:
1. Backend API con métricas (2-3 días)
2. Frontend dashboard con charts (2-3 días)  
3. Real-time y optimización (1 día)

Comienza creando la app analytics y leyendo la documentación detallada.
Sigue los patterns existentes del proyecto.
```

## 📊 Para Monitoreo (esta ventana):

Mientras Claude Code implementa BI Dashboard, monitorear:

1. **Verificar estructura de archivos**:
   ```
   backend/apps/analytics/
   frontend/src/app/[locale]/(dashboard)/analytics/
   frontend/src/components/analytics/
   ```

2. **Validar performance**:
   - Dashboard load time <3s
   - API response times <200ms
   - Chart render time <1s

3. **Checking points**:
   - Después de backend foundation: verificar endpoints
   - Después de frontend: probar dashboard visualmente
   - Al final: test completo de functionality

## 🔄 Context para Claude Code:

**Datos disponibles para analytics:**
- 7 módulos completamente funcionales
- Sistema de pagos con Stripe
- Reservations con patterns de uso
- Classes con attendance data
- Tournaments con participation metrics
- Users con activity tracking

**Performance requirements:**
- Sistema debe manejar 1000+ usuarios concurrentes
- Analytics en tiempo real
- Exports pesados en background
- Caching inteligente

---
*Creado: January 11, 2025*
*Post Sprint 16 - Task 1 of Sprint 17*