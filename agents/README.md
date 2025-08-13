# 🤖 Agente de Deployment para Render - Padelyzer

## 📋 Descripción

El **Render Deployment Agent** es un agente especializado que automatiza completamente el proceso de deployment, migración y gestión de servicios en Render. Maneja todo el ciclo de vida del deployment de forma inteligente y segura.

## 🚀 Características

### Automatización Completa
- ✅ Instalación y configuración de Render CLI
- ✅ Autenticación automática con API key
- ✅ Creación de servicios (backend y frontend)
- ✅ Gestión de variables de entorno
- ✅ Backup automático de base de datos
- ✅ Ejecución de migraciones Django
- ✅ Health checks y smoke tests post-deploy
- ✅ Rollback en caso de errores

### Validaciones Integradas
- ✅ Validación pre-deploy completa
- ✅ Verificación de tipos Django-TypeScript
- ✅ Detección de problemas de configuración
- ✅ Tests automáticos post-deployment

## 📦 Instalación

### 1. Configurar API Key de Render
```bash
# Obtén tu API key en: https://dashboard.render.com/account/api-keys
export RENDER_API_KEY='rnd_xxxxxxxxxxxxxxxxxxxxx'
```

### 2. Instalar dependencias
```bash
pip install requests
```

## 🎯 Uso Rápido

### Deployment Completo (Recomendado)
```bash
# Deployment paralelo con servicios v2
python agents/render_deployment_agent.py deploy --parallel
```

### Otros Comandos
```bash
# Listar servicios existentes
python agents/render_deployment_agent.py list

# Backup de base de datos
python agents/render_deployment_agent.py backup --service-id srv_xxxxx

# Rollback a deployment anterior
python agents/render_deployment_agent.py rollback --service-id srv_xxxxx --deploy-id dep_xxxxx

# Health check manual
python agents/render_deployment_agent.py health-check --service-id srv_xxxxx
```

## 🔄 Workflow de Deployment

### 1. Validación Pre-Deploy
El agente ejecuta automáticamente:
- Verificación de variables de entorno
- Validación de configuración Django
- Build del frontend
- Verificación de tipos sincronizados

### 2. Backup de Datos
- Backup automático de base de datos existente
- Guardado en `backups/` con timestamp
- Compresión con gzip

### 3. Creación de Servicios
En modo `--parallel`:
- Crea `padelyzer-api-v2` (backend)
- Crea `padelyzer-app-v2` (frontend)
- Usa la misma base de datos

### 4. Deployment
- Deploy con el último commit de Git
- Espera a que complete (--wait)
- Verificación de estado

### 5. Post-Deploy
- Ejecuta migraciones Django
- Crea superusuario automáticamente
- Ejecuta health checks
- Ejecuta smoke tests

## 📝 Configuración

### Variables de Entorno Requeridas

#### Para el Agente:
```bash
RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://... (para backups)
```

#### Para Django (en .env.production):
```
SECRET_KEY=tu-secret-key
DEBUG=False
ALLOWED_HOSTS=*.onrender.com
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CORS_ALLOWED_ORIGINS=https://padelyzer-app-v2.onrender.com
```

#### Para Next.js:
```
NEXT_PUBLIC_API_URL=https://padelyzer-api-v2.onrender.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://padelyzer-app-v2.onrender.com
```

## 🏗️ Arquitectura del Agente

### Componentes Principales:

1. **CLI Manager**: Gestiona Render CLI
2. **API Client**: Interactúa con Render API
3. **Validator**: Ejecuta validaciones pre/post deploy
4. **Backup Manager**: Gestiona backups de BD
5. **Deployment Engine**: Orquesta el deployment
6. **Health Monitor**: Verifica salud post-deploy

### Flujo de Decisiones:
```
┌─────────────────┐
│ Inicio Deploy   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Validar │──No──▶ Abortar
    └────┬────┘
         │ Sí
    ┌────▼────┐
    │ Backup  │
    └────┬────┘
         │
    ┌────▼────┐
    │ Deploy  │──Error──▶ Rollback
    └────┬────┘
         │ OK
    ┌────▼────┐
    │ Tests   │──Fail──▶ Alertar
    └────┬────┘
         │ Pass
    ┌────▼────┐
    │ Éxito   │
    └─────────┘
```

## 🔧 Troubleshooting

### "RENDER_API_KEY no está configurada"
```bash
export RENDER_API_KEY='tu-api-key'
# O agregar a ~/.bashrc o ~/.zshrc
```

### "Render CLI no instalado"
El agente lo instalará automáticamente, pero puedes hacerlo manualmente:
```bash
brew install render  # macOS
# o
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
```

### "Error en validación pre-deploy"
```bash
# Ejecutar validación manual para ver detalles
python scripts/pre_deploy_validation.py
```

### "Deployment falló"
1. Revisar logs en Render Dashboard
2. Ejecutar rollback si es necesario
3. Corregir errores y reintentar

## 🎯 Mejores Prácticas

1. **Siempre usar --parallel** para primer deployment
2. **Hacer backup manual** antes de cambios grandes
3. **Probar en horarios de bajo tráfico**
4. **Monitorear logs** las primeras horas
5. **Tener plan de rollback** documentado

## 📊 Métricas de Éxito

El agente reporta:
- ✅ Tiempo total de deployment
- ✅ Estado de cada servicio
- ✅ Resultados de health checks
- ✅ Resultados de smoke tests
- ✅ URLs de los servicios desplegados

## 🚀 Comandos Rápidos

```bash
# Deployment completo recomendado
./deploy-to-render.sh

# Solo validación
python scripts/pre_deploy_validation.py

# Solo health check
python scripts/production_health_check.py https://tu-app.onrender.com

# Solo smoke tests
python scripts/smoke_tests.py https://tu-app.onrender.com
```

## 🔗 Enlaces Útiles

- [Render Dashboard](https://dashboard.render.com)
- [Render CLI Docs](https://render.com/docs/cli)
- [API Keys](https://dashboard.render.com/account/api-keys)
- [Status Page](https://status.render.com)

---

**Versión**: 1.0.0  
**Última actualización**: 13 de Agosto 2025  
**Mantenedor**: Equipo DevOps Padelyzer