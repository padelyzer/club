# 🛠️ Tools - Padelyzer Development

Esta sección contiene documentación de todas las herramientas de desarrollo, debugging y automatización creadas para el proyecto Padelyzer.

## 📋 Categorías de Herramientas

### 🔍 [Herramientas de Debugging](./debugging-tools.md)
Sistema completo de debugging y validación de sincronización Django-TypeScript:
- Validadores de sincronización
- Generadores de tipos automáticos
- Health Check System
- Monitoring en tiempo real
- Middleware de validación

### 🚀 Scripts de Automatización
*(Próximamente)*
- Deploy automation
- Database migrations
- Testing automation

### 📊 Herramientas de Performance
*(Próximamente)*
- Performance profiling
- Query optimization
- Bundle analysis

### 🔐 Security Tools
*(Próximamente)*
- Security audit scripts
- Vulnerability scanning
- Dependency checking

## 🎯 Quick Access

### Herramientas Más Usadas

1. **Generar Tipos TypeScript**
   ```bash
   python3 scripts/complete_type_generator.py
   ```

2. **Validar Sincronización**
   ```bash
   python3 scripts/final_validation.py
   ```

3. **Health Check**
   ```bash
   curl -s http://localhost:8000/api/v1/health/ | python3 -m json.tool
   ```

4. **Monitor Visual**
   ```tsx
   import { SyncMonitor } from '@/components/shared/SyncMonitor';
   <SyncMonitor />
   ```

## 📊 Estado Actual del Sistema

- ✅ **2,240 campos** sincronizados entre Django y TypeScript
- ✅ **11 módulos** con tipos completos
- ✅ **7 herramientas** de debugging creadas
- ✅ **100% cobertura** de modelos Django

## 🔗 Enlaces Rápidos

- [Debugging Tools Documentation](./debugging-tools.md)
- [Scripts Directory](/scripts/)
- [Backend Health App](/backend/apps/health/)
- [Frontend Types](/frontend/src/types/complete/)

---

**Última actualización**: 13 de Agosto 2025