# 🤖 Claude Code - Executive Context

> **Quick navigation and execution context for AI development**

## 🎯 CURRENT FOCUS - Sprint 16 Foundation

### ⚡ IMMEDIATE ACTIONS NEEDED
1. **[[Finance]] - CRITICAL** → Complete Stripe webhooks (`apps/finance/webhooks.py`)
2. **[[Classes]] - HIGH** → Complete API ViewSets (`apps/classes/views.py`)
3. **[[Reservations]] - MOBILE** → iOS Safari booking fixes

### 📊 PROJECT STATUS: 86% MVP READY
- **Production Ready**: [[Authentication]], [[Clubs]], [[Reservations]]
- **Nearly Ready**: [[Finance]] (webhooks pending), [[Clients]] (testing needed)
- **In Progress**: [[Classes]] (API completion), [[Tournaments]] (MVP features)

## 🏗️ ARCHITECTURE QUICK REF

### Module Dependencies
```
Authentication (foundation)
├── Clubs → Reservations → Finance
├── Clubs → Classes → Finance  
└── Clients → Tournaments → Finance
```

### Critical File Locations
- **Backend**: `/Users/ja/PZR4/backend/apps/{module}/`
- **Frontend**: `/Users/ja/PZR4/frontend/src/app/[locale]/`
- **Documentation**: `/Users/ja/PZR4/docs/Modules/{module}/`

## ⚡ EXECUTION SHORTCUTS

### For Backend Work
```bash
cd /Users/ja/PZR4/backend
# Active work on: Finance webhooks, Classes API
# Pattern: apps/{module}/models.py → views.py → serializers.py → urls.py
```

### For Frontend Work  
```bash
cd /Users/ja/PZR4/frontend
# Active work on: Mobile booking, iOS Safari fixes
# Pattern: src/app/[locale]/{feature}/ → src/components/{module}/
```

### For Documentation Updates
```bash
cd /Users/ja/PZR4/docs
# Auto-update with: python3 agents/status_scanner.py
```

## 🔥 CRITICAL PATHS

### Path 1: Finance Module Completion
- **File**: `backend/apps/finance/webhooks.py` 
- **Status**: 60% complete, webhooks missing
- **Impact**: Blocks payment testing
- **Priority**: 🔴 CRITICAL

### Path 2: Classes API Implementation  
- **File**: `backend/apps/classes/views.py`
- **Status**: Models done, API missing
- **Impact**: Blocks instructor features
- **Priority**: 🟡 HIGH

### Path 3: Mobile Experience
- **Files**: `frontend/src/components/reservations/apple-booking-flow.tsx`
- **Status**: iOS Safari touch issues
- **Impact**: 30% of users affected
- **Priority**: 🟡 HIGH

## 📋 CONTEXT BY MODULE

### [[Authentication]] - ✅ STABLE
- **Purpose**: User management, JWT, multi-tenant
- **Status**: Production ready, security hardened
- **Note**: Foundation for everything, don't modify unless critical

### [[Clubs]] - ✅ STABLE  
- **Purpose**: Club profiles, court management
- **Status**: Production ready, analytics integrated
- **Note**: Stable, focus on optimization only

### [[Reservations]] - ⚠️ MOBILE FIXES
- **Purpose**: Court booking, scheduling
- **Status**: Core stable, mobile issues
- **Active**: iOS Safari touch events, booking flow

### [[Finance]] - 🔄 WEBHOOKS PENDING
- **Purpose**: Payments, Stripe integration  
- **Status**: Core done, webhooks 60% complete
- **Active**: Stripe webhook handlers (payment_intent, invoice events)

### [[Clients]] - ⚠️ TESTING NEEDED
- **Purpose**: Player profiles, social features
- **Status**: MVP ready, needs comprehensive testing  
- **Next**: AI partner matching (Sprint 18)

### [[Classes]] - 🔄 API DEVELOPMENT
- **Purpose**: Class scheduling, instructors
- **Status**: Models complete, API in progress
- **Active**: ViewSets, serializers, enrollment logic

### [[Tournaments]] - ⚠️ MVP FEATURES
- **Purpose**: Competition management
- **Status**: Basic features done, advanced pending
- **Next**: Live streaming (Sprint 18)

## 🎯 DECISION TREE FOR CLAUDE CODE

### When asked about Authentication:
→ "Stable production module. Avoid changes unless security critical."

### When asked about Clubs:
→ "Stable foundation. Focus on analytics integration and performance."

### When asked about Reservations:
→ "Core stable. Priority: Fix iOS Safari booking issues."

### When asked about Finance:
→ "CRITICAL: Complete Stripe webhooks. File: apps/finance/webhooks.py"

### When asked about Clients:
→ "MVP ready. Next: comprehensive testing, then AI features."

### When asked about Classes:
→ "HIGH: Complete API implementation. File: apps/classes/views.py"

### When asked about Tournaments:
→ "MVP features ready. Advanced features in Sprint 18."

## 🚨 AVOID THESE MISTAKES

### ❌ DON'T CREATE
- New versions of existing modules (no clubs-v2, etc.)
- Alternative implementations "for testing"
- Duplicate components or pages
- New authentication systems

### ✅ DO MODIFY
- Existing files in place
- Add features to established patterns
- Follow existing architecture
- Update documentation after changes

## ⚡ QUICK COMMANDS

### Status Check
```bash
python3 docs/agents/status_scanner.py
```

### Run Tests
```bash
# Backend
cd backend && python manage.py test

# Frontend  
cd frontend && npm test
```

### Check Current Sprint
```bash
# See: docs/Sprint Dashboard.md
# Active tasks: docs/Tasks/Active-Tasks.md  
```

## 🎯 SUCCESS METRICS

### Sprint 16 Goals (Current)
- [ ] Finance webhooks: 100% complete
- [ ] Classes API: 100% complete  
- [ ] Mobile booking: iOS issues resolved
- [ ] All tests: Passing

### MVP Launch (Target)
- [ ] 7/7 modules production ready
- [ ] Zero critical bugs
- [ ] Performance targets met
- [ ] Security audit passed

---

## 📞 ESCALATION PATHS

### Blocked on Technical Issues
→ Check existing implementations in similar modules

### Unsure about Architecture  
→ Follow patterns in Authentication or Clubs modules

### Need Clarification on Requirements
→ Check [[Modules-Overview]] or module-specific README

### Performance Concerns
→ See [[Tasks/Performance-Optimization]]

---

**🔄 Auto-updated by**: [[agents/status_scanner.py]]  
**⏰ Last scan**: Every 15 minutes  
**🎯 Focus**: Execute fast, follow patterns, avoid duplication