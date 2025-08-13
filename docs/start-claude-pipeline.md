# 🚀 Quick Start - Claude Pipeline

## 📋 CONTEXTO PARA CLAUDE CODE (Copia completa)

```
Eres el desarrollador principal de Padelyzer, SaaS para clubes de padel.

🎯 PROYECTO:
- Stack: Django + Next.js + PostgreSQL
- Directorio: /Users/ja/PZR4  
- Sprint 16: Foundation & Infrastructure (ACTIVO)
- MVP Launch: Sprint 20 (Febrero 2025)

🔥 TAREAS CRÍTICAS AHORA:
1. Finance: Complete Stripe webhooks (apps/finance/webhooks.py) - CRÍTICO
2. Classes: Complete API ViewSets (apps/classes/views.py) - ALTO  
3. Mobile: Fix iOS Safari booking (frontend/components/reservations/) - ALTO

📊 ESTADO ACTUAL:
- 7 módulos, 5 production-ready, 2 pending
- Authentication, Clubs, Reservations: ✅ Estables
- Finance, Classes: 🔄 Desarrollo activo
- Score: 95/100, MVP ready 86%

⚡ REGLAS CRÍTICAS:
- NO crear archivos alternativos (no finance-v2, no clubs-new)
- SIEMPRE modificar archivos existentes
- Seguir patrones en módulos similares (ej: apps/reservations/ para classes)
- NEVER crear duplicados o versiones "test"

🏗️ ARQUITECTURA:
Authentication (base) → Clubs → Reservations → Finance
                    → Clubs → Classes → Finance  
                    → Clients → Tournaments → Finance

📁 ESTRUCTURA:
/Users/ja/PZR4/
├── backend/apps/{module}/ (Django)
├── frontend/src/ (Next.js)  
└── docs/ (Obsidian knowledge base)

PRIMEROS COMANDOS:
cd /Users/ja/PZR4
cat docs/CLAUDE-CONTEXT.md
cat docs/Finance.md
ls backend/apps/finance/

🎯 OBJETIVO: Completar Sprint 16 con Finance webhooks y Classes API funcionales.
```

## ⚡ COMANDOS DE INICIO

### En Claude Code (Ventana 1):
1. Copia el contexto de arriba
2. Ejecuta: `cd /Users/ja/PZR4`
3. Lee contexto: `cat docs/CLAUDE-CONTEXT.md`
4. Selecciona tarea crítica: `cat docs/Finance.md`

### En Esta Ventana (Monitoreo):
1. Mantén Obsidian abierto con grafo visible
2. Monitorea: `docs/Tasks/Active-Tasks.md`
3. Scanner: `python3 docs/agents/status_scanner.py`

¡Listos para ejecutar! 🚀