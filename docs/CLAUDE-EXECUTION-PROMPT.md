# 🚀 Claude Code Execution Prompt - Sprint 16 Priority Tasks

## 📋 Copy this prompt to Claude Code:

```
Eres el desarrollador principal de Padelyzer trabajando en el Sprint 16. 

CONTEXTO:
- Proyecto: /Users/ja/PZR4
- Backend: Django REST (puerto 8000)
- Frontend: Next.js 14 TypeScript (puerto 3000)
- Hoy completaste: Stripe webhooks ✅, Classes API ✅, iOS Safari fixes ✅

TAREAS PRIORITARIAS A EJECUTAR (en orden):

1. TOURNAMENT BRACKET ALGORITHM (3-4 días)
   Documentación: /Users/ja/PZR4/docs/Tasks/Tournament-Bracket-Algorithm.md
   
   IMPLEMENTA:
   - Modelos en backend/apps/tournaments/models.py (Bracket, BracketNode, MatchSchedule)
   - Generador en backend/apps/tournaments/bracket_generator.py
   - ViewSets en backend/apps/tournaments/views.py
   - Tests completos en backend/apps/tournaments/tests/
   
   ALGORITMOS REQUERIDOS:
   - Single/Double elimination
   - Round robin con Berger tables
   - Swiss system
   - Seeding por ELO

2. PERFORMANCE TESTING SETUP (2-3 días)
   Documentación: /Users/ja/PZR4/docs/Tasks/Performance-Testing-Setup.md
   
   IMPLEMENTA:
   - Locust tests en backend/performance_tests/locustfile.py
   - Escenarios de carga para 1000+ usuarios
   - Optimizaciones de queries (select_related, prefetch_related)
   - Frontend: Lighthouse CI en frontend/performance_tests/
   
   OBJETIVOS:
   - API response time <200ms (p95)
   - Page load <2s (p95)
   - 200 requests/second sustained

3. LEAGUE SCHEDULING ENGINE (4-5 días)
   Documentación: /Users/ja/PZR4/docs/Tasks/League-Scheduling-Engine.md
   
   IMPLEMENTA:
   - Modelos en backend/apps/tournaments/models.py (League, LeagueSchedule, ScheduleConstraint)
   - Motor en backend/apps/tournaments/league_scheduler.py usando OR-Tools
   - Optimizador geográfico con sklearn KMeans
   - Sistema de rescheduling dinámico
   
   CONSTRAINTS:
   - Disponibilidad de canchas
   - Distancia máxima 50km
   - Preferencias horarias
   - Días mínimos entre partidos

INSTRUCCIONES ESPECIALES:
1. NO crear archivos duplicados (dashboard-v2, test-*, etc)
2. SIEMPRE modificar archivos existentes cuando sea posible
3. Seguir patrones del código existente
4. Escribir tests mientras desarrollas
5. Usar las librerías ya instaladas (no agregar nuevas sin justificación)

ARQUITECTURA A SEGUIR:
- ViewSets con ModelViewSet y custom actions
- Serializers con validación completa
- Permisos basados en IsAuthenticated y custom permissions
- Tests con APITestCase
- Frontend: componentes en src/components/[module]/
- Hooks personalizados en src/hooks/

COMENZAR CON:
1. Leer la documentación de la tarea 1
2. Crear/actualizar modelos necesarios
3. Implementar lógica core
4. Crear API endpoints
5. Escribir tests
6. Documentar código

REPORTAR PROGRESO:
- Al completar cada fase principal
- Si encuentras blockers
- Cuando termines cada tarea

¿Listo para comenzar con Tournament Bracket Algorithm?
```

## 🎯 Alternative Short Version:

```
Implementa las 3 tareas prioritarias del Sprint 16 en orden:

1. Tournament Bracket Algorithm - docs/Tasks/Tournament-Bracket-Algorithm.md
2. Performance Testing Setup - docs/Tasks/Performance-Testing-Setup.md  
3. League Scheduling Engine - docs/Tasks/League-Scheduling-Engine.md

Proyecto: /Users/ja/PZR4
Stack: Django + Next.js TypeScript

Comienza con Tournament Bracket Algorithm siguiendo la documentación.
NO crear archivos duplicados. Modificar existentes cuando sea posible.
Escribir tests mientras desarrollas.
```

## 📊 Para Monitoreo (esta ventana):

Mientras Claude Code trabaja, en esta ventana puedes:

1. **Verificar progreso**:
   ```
   cd /Users/ja/PZR4/docs && python3 agents/status_scanner.py
   ```

2. **Actualizar documentación**:
   - Marcar tareas completadas en Tasks/Active-Tasks.md
   - Actualizar Daily Progress.md con logros
   - Registrar cualquier blocker encontrado

3. **Revisar calidad**:
   - Verificar que no se creen archivos duplicados
   - Confirmar que los tests pasen
   - Validar performance metrics

## 🔄 Flujo de Trabajo Sugerido:

1. **Claude Code (Ventana 1)**: Ejecuta las tareas según el prompt
2. **Esta Ventana**: Monitorea progreso y actualiza docs cada 30 min
3. **Sincronización**: Claude Code reporta → Tú actualizas docs → Continúa

## ⚠️ Puntos de Control:

- **Después de modelos**: Verificar migraciones correctas
- **Después de lógica core**: Ejecutar tests unitarios
- **Después de API**: Probar con Postman/curl
- **Al finalizar**: Run full test suite

---
*Creado: January 11, 2025*
*Sprint: 16 - Foundation & Infrastructure*