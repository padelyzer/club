# Integración Gemini Pro + Claude Code para PZR4

## 🎯 Objetivo

Esta integración combina lo mejor de dos mundos:
- **Gemini Pro**: Gestión de contexto, análisis estratégico y planificación inteligente
- **Claude Code**: Ejecución precisa de código, manipulación de archivos y comandos

## 🏗️ Arquitectura

```
🧠 GEMINI PRO              🔄 ORQUESTADOR            ⚡ CLAUDE CODE
(Gestor de Contexto)       (Coordinador)             (Ejecutor)

• Analiza solicitudes      • Coordina flujo          • Implementa código
• Planifica tareas         • Maneja estado           • Ejecuta comandos  
• Gestiona memoria         • Logs y monitoreo        • Manipula archivos
• Remedía errores          • Control de errores      • Integra con Git
```

## 🚀 Instalación Rápida

```bash
# 1. Ejecutar script de configuración
cd /Users/ja/PZR4
chmod +x integration/setup_integration.sh
./integration/setup_integration.sh

# 2. Configurar API keys
nano .env
# Agregar:
# GEMINI_API_KEY=tu_key_aqui
# ANTHROPIC_API_KEY=tu_key_aqui

# 3. Prueba inicial
python3 integration/main.py "Analizar estado del proyecto" --dry-run
```

## 📋 Uso Básico

### Comandos Principales

```bash
# Ejecutar workflow completo
python3 integration/main.py "Tu solicitud de desarrollo"

# Solo análisis (no ejecución)
python3 integration/main.py "Tu solicitud" --dry-run

# Ver estado del proyecto
python3 integration/main.py status

# Ver historial de workflows
python3 integration/main.py history

# Generar insights
python3 integration/main.py insights
```

### Aliases Configurados

```bash
pzr4-workflow "Tu solicitud"    # Ejecutar workflow
pzr4-status                     # Estado del proyecto
pzr4-history                    # Historial
pzr4-insights                   # Insights
```

## 🎯 Ejemplos de Uso para PZR4

### 1. Desarrollo de Nueva Funcionalidad

```bash
pzr4-workflow "Implementar notificaciones push para reservas confirmadas"
```

**Lo que hace:**
- Gemini analiza la arquitectura actual
- Planifica la implementación (backend + frontend)
- Claude Code implementa cada componente
- Se valida y testea automáticamente

### 2. Debugging y Resolución de Problemas

```bash
pzr4-workflow "Resolver el error de ClubStore performance que aparece en logs"
```

**Lo que hace:**
- Gemini analiza logs y patrones de error
- Identifica la causa raíz
- Claude Code implementa la solución
- Se verifica que el problema se resuelve

### 3. Optimización de Rendimiento

```bash
pzr4-workflow "Optimizar las consultas de base de datos del módulo de reservas"
```

**Lo que hace:**
- Gemini analiza el rendimiento actual
- Identifica queries lentas
- Claude Code optimiza las consultas
- Se miden las mejoras de rendimiento

### 4. Auditorías de Seguridad

```bash
pzr4-workflow "Ejecutar auditoría de seguridad y remediar vulnerabilidades encontradas"
```

**Lo que hace:**
- Gemini planifica la auditoría
- Claude Code ejecuta herramientas de seguridad
- Se remedian vulnerabilidades automáticamente
- Se genera reporte de seguridad

## 🔧 Comandos Claude Personalizados

### `/gemini-task`
Ejecuta tareas específicas como parte del flujo orquestado:
```bash
claude /gemini-task "Refactorizar el componente de búsqueda de clubes"
```

### `/quick-analysis`
Análisis rápido de cualquier aspecto:
```bash
claude /quick-analysis "estado de la base de datos"
claude /quick-analysis "rendimiento del frontend"
```

### `/railway-deploy`
Gestión de deployments:
```bash
claude /railway-deploy "deploy a producción"
claude /railway-deploy "rollback última versión"
```

### `/run-tests`
Ejecución de tests:
```bash
claude /run-tests "tests completos"
claude /run-tests "solo tests de seguridad"
```

## 📊 Monitoreo y Logs

### Ubicación de Logs
```
integration/logs/
├── session_YYYYMMDD_HHMMSS.json          # Plan inicial
├── session_YYYYMMDD_HHMMSS_complete.json # Workflow completo
└── ...
```

### Ver Logs Recientes
```bash
pzr4-history --limit 10
```

### Análisis de Rendimiento
```bash
pzr4-insights  # Genera insights basados en el historial
```

## 🎛️ Configuración Avanzada

### Variables de Entorno (.env)
```bash
# API Keys requeridas
GEMINI_API_KEY=tu_gemini_key
ANTHROPIC_API_KEY=tu_anthropic_key

# Configuración del proyecto
PROJECT_PATH=/Users/ja/PZR4
PROJECT_NAME=PZR4-Padelyzer

# Railway (opcional)
RAILWAY_TOKEN=tu_railway_token

# Logging
LOG_LEVEL=INFO
```

### Personalizar Timeouts
```python
# En pzr4_orchestrator.py, línea ~200
timeout=600,  # 10 minutos por tarea
```

### Configurar Memoria de Contexto
```python
# En gemini_context_manager.py
def get_recent_context(self, limit: int = 3):  # Cambiar limit
```

## 🚨 Troubleshooting

### Problema: API Key No Válida
```bash
❌ GEMINI_API_KEY no configurada en .env
```
**Solución:** Configura tus API keys en `.env`

### Problema: Claude Code No Responde
```bash
❌ Error en comunicación con Claude Code
```
**Solución:** 
1. Verifica que Claude Code está instalado: `claude --version`
2. Reinicia tu terminal
3. Verifica tu API key de Anthropic

### Problema: Timeout en Tareas
```bash
❌ Timeout en la ejecución (10 min)
```
**Solución:** 
1. Divide tareas complejas en subtareas
2. Aumenta el timeout en el código
3. Usa `--dry-run` para analizar primero

### Ver Logs Detallados
```bash
python3 integration/main.py "tu solicitud" --verbose
```

## 📈 Mejores Prácticas

### 1. Solicitudes Claras
✅ **Bueno:** "Implementar validación de formularios en el módulo de clientes"
❌ **Malo:** "Mejorar el sistema"

### 2. Usar Dry Run Primero
```bash
# Siempre analiza primero
pzr4-workflow "tu solicitud" --dry-run
# Luego ejecuta
pzr4-workflow "tu solicitud"
```

### 3. Monitorear Progreso
- Revisa logs en tiempo real
- Usa `pzr4-status` regularmente
- Analiza `pzr4-insights` semanalmente

### 4. Backup Antes de Cambios Grandes
```bash
git commit -am "Backup antes de workflow de integración"
pzr4-workflow "tu solicitud grande"
```

## 🔮 Casos de Uso Avanzados

### Migración de Datos
```bash
pzr4-workflow "Migrar datos de usuarios del formato antiguo al nuevo esquema"
```

### Refactoring Completo
```bash
pzr4-workflow "Refactorizar el módulo de finanzas para usar el nuevo patrón de arquitectura"
```

### Integración de APIs Externas
```bash
pzr4-workflow "Integrar API de pagos de Stripe en el módulo de finanzas"
```

### Generación de Documentación
```bash
pzr4-workflow "Generar documentación API completa para todos los endpoints"
```

## 🤝 Contribuir

Para mejorar esta integración:
1. Reporta bugs en los logs
2. Sugiere mejoras en la planificación de Gemini
3. Optimiza comandos de Claude Code
4. Comparte casos de uso exitosos

## 📚 Referencias

- [Documentación de Gemini API](https://ai.google.dev/gemini-api/docs)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [PZR4 Project Documentation](../CLAUDE.md)

---

**¡Disfruta desarrollando con la potencia combinada de Gemini Pro y Claude Code! 🚀**
