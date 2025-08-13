# 🚀 Pipeline de Ejecución - Claude Code

> **Instrucciones para configurar Claude Code como ejecutor técnico usando Obsidian como base de conocimiento**

## 🎯 CONFIGURACIÓN DEL PIPELINE

### Ventana 1: Claude Code (Ejecución)
**Rol**: Desarrollador técnico principal
**Contexto inicial**: Proporcionar el contenido de `CLAUDE-CONTEXT.md`
**Directorio de trabajo**: `/Users/ja/PZR4`

### Ventana 2: Claude Actual (Soporte y Continuidad)  
**Rol**: Project Manager y monitor de progreso
**Función**: Supervisión, actualización de documentación, coordinación

## 📋 INSTRUCCIONES PARA CLAUDE CODE

### 🔥 CONTEXTO INICIAL (Copia y pega esto a Claude Code)
```markdown
Eres el desarrollador principal de Padelyzer, un SaaS para clubes de padel. 

CONTEXTO CRÍTICO:
- Proyecto Django + Next.js en /Users/ja/PZR4
- Sprint 16 activo: Foundation & Infrastructure  
- Documentación completa en Obsidian: docs/

TAREAS CRÍTICAS INMEDIATAS:
1. Finance Module: Complete Stripe webhooks en apps/finance/webhooks.py (CRÍTICO)
2. Classes Module: Complete API ViewSets en apps/classes/views.py (ALTO)
3. Mobile Issues: Fix iOS Safari en frontend/src/components/reservations/apple-booking-flow.tsx

REGLAS ESTRICTAS:
- NO crear versiones alternativas (no clubs-v2, etc.)
- SIEMPRE modificar archivos existentes
- Seguir patrones establecidos en módulos similares
- Ejecutar tests después de cambios

CONTEXTO COMPLETO: Lee docs/CLAUDE-CONTEXT.md para detalles completos.

DIRECTORIO: cd /Users/ja/PZR4
PRIMER COMANDO: cat docs/CLAUDE-CONTEXT.md
```

### 🎯 FLUJO DE TRABAJO SUGERIDO

#### 1. Inicialización
```bash
cd /Users/ja/PZR4
cat docs/CLAUDE-CONTEXT.md
ls docs/Tasks/Active-Tasks.md
```

#### 2. Verificar Estado
```bash
python3 docs/agents/status_scanner.py
git status
```

#### 3. Seleccionar Tarea
- Lee `docs/Finance.md` para webhooks de Stripe
- Lee `docs/Classes.md` para API de clases
- Lee `docs/Reservations.md` para issues móviles

#### 4. Implementar y Validar
- Modifica archivos existentes
- Ejecuta tests
- Actualiza documentación si necesario

## 📊 MONITOREO DESDE OBSIDIAN (Ventana 2)

### Archivos a Monitorear
- `docs/Tasks/Active-Tasks.md` - Estado de tareas en tiempo real
- `docs/scan_results_*.json` - Resultados del scanner
- `docs/Modules/*/status.md` - Estado de módulos

### Comandos de Monitoreo
```bash
# Ejecutar cada 15 minutos
python3 docs/agents/status_scanner.py

# Verificar progreso
git log --oneline -10

# Actualizar estado de tareas
# Editar docs/Tasks/Active-Tasks.md manualmente
```

## 🔄 COMUNICACIÓN ENTRE VENTANAS

### Claude Code → Obsidian (Reportar Progreso)
Cuando Claude Code complete una tarea:
1. Reportar en esta ventana: "Completé [tarea] - archivo [ruta] - tests [estado]"
2. Esta ventana actualizará docs/Tasks/Active-Tasks.md
3. Ejecutar status scanner para refrescar métricas

### Obsidian → Claude Code (Nueva Dirección)
Si hay cambios de prioridad o nuevas tareas:
1. Actualizar docs/Next Actions.md
2. Informar a Claude Code: "Nueva prioridad: [descripción] - ver docs/Next Actions.md"

## 🎯 TAREAS POR PRIORIDAD

### 🔴 CRÍTICO - Finance Module
```markdown
TAREA: Complete Stripe webhook handlers
ARCHIVO: backend/apps/finance/webhooks.py
CONTEXTO: Lee docs/Finance.md y docs/Modules/Finance/README.md
PATRÓN: Revisar apps/finance/ existente para estructura
OBJETIVO: Handlers para payment_intent.succeeded, payment_intent.failed, invoice.payment_succeeded
VALIDACIÓN: Tests en apps/finance/tests/ deben pasar
DEADLINE: Sprint 16 (próximos días)
```

### 🟡 ALTO - Classes Module  
```markdown
TAREA: Complete API ViewSets para Classes
ARCHIVO: backend/apps/classes/views.py  
CONTEXTO: Lee docs/Classes.md y docs/Modules/Classes/README.md
PATRÓN: Seguir estructura de apps/reservations/views.py
OBJETIVO: ViewSets para ClassSchedule, ClassSession, ClassEnrollment
VALIDACIÓN: API endpoints funcionales, tests básicos
DEADLINE: Sprint 16
```

### 🟡 ALTO - Mobile Experience
```markdown  
TAREA: Fix iOS Safari booking issues
ARCHIVO: frontend/src/components/reservations/apple-booking-flow.tsx
CONTEXTO: Lee docs/Reservations.md  
PROBLEMA: Touch events fallan en booking flow de iOS Safari
IMPACTO: 30% usuarios afectados
VALIDACIÓN: Test en dispositivo iOS real o simulador
DEADLINE: Próximos días
```

## 📈 MÉTRICAS DE ÉXITO

### Objetivos Sprint 16
- [ ] Finance webhooks: 100% funcionales
- [ ] Classes API: Endpoints completos  
- [ ] Mobile booking: iOS issues resueltos
- [ ] Tests: Todos pasando
- [ ] Documentación: Actualizada

### Indicadores de Progreso
- Scanner status: Score > 95/100
- Git commits: Progreso documentado
- Tests: Zero failures críticos
- Performance: API < 200ms response

## ⚠️ SEÑALES DE ALERTA

### Cuando Escalar
- Claude Code reporta arquitectura confusa
- Tests fallan después de cambios
- Performance degradada
- Conflictos con patrones existentes

### Acciones de Escalación
1. Parar desarrollo activo
2. Revisar docs/Modules/[module]/README.md
3. Consultar implementaciones similares
4. Reassess approach en esta ventana

## 🔧 TROUBLESHOOTING COMÚN

### "No encuentro el contexto"
→ `cat docs/CLAUDE-CONTEXT.md`

### "No sé qué patrón seguir"  
→ `ls apps/[similar-module]/` para ejemplos

### "Tests fallan"
→ `python manage.py test apps.[module]` para debug

### "Documentación inconsistente"
→ `python3 docs/agents/status_scanner.py` para actualizar

## 🚀 COMANDOS DE INICIO RÁPIDO

### Para Claude Code (Ventana 1)
```bash
cd /Users/ja/PZR4
cat docs/CLAUDE-CONTEXT.md
cat docs/Finance.md
ls backend/apps/finance/
```

### Para Monitoreo (Ventana 2)  
```bash  
cd /Users/ja/PZR4/docs
ls Tasks/Active-Tasks.md
python3 agents/status_scanner.py
```

---

## ✅ CHECKLIST DE PREPARACIÓN

- [ ] Claude Code tiene acceso a directorio /Users/ja/PZR4
- [ ] Obsidian abierto con vista de grafo
- [ ] Contexto inicial proporcionado a Claude Code  
- [ ] Status scanner ejecutado para baseline
- [ ] Prioridades claras definidas

**🎯 OBJETIVO**: Usar Obsidian como sistema nervioso central mientras Claude Code ejecuta el desarrollo técnico con contexto completo y dirección clara.

**⚡ RESULTADO ESPERADO**: Desarrollo eficiente con documentación automática y progreso trackeable en tiempo real.