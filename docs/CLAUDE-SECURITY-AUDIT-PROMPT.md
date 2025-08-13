# 🔒 Claude Code Execution Prompt - Security Audit

## 📋 Copy this prompt to Claude Code:

```
Implementa el Security Audit completo como tarea CRÍTICA pre-producción.

CONTEXTO ACTUAL:
- Proyecto: /Users/ja/PZR4
- Sprint 16 + BI Dashboard ✅ COMPLETADOS
- Sistema Health: 95/100, todos módulos production-ready
- 7 módulos principales para auditar + BI Dashboard

TAREA: SECURITY AUDIT (2-3 días estimados)
Prioridad: 🔴 CRÍTICA para launch en producción

OBJETIVO:
Realizar auditoría completa de seguridad de todos los sistemas implementados, 
identificar vulnerabilidades, y establecer compliance para producción.

SCOPE DE AUDITORÍA:

1. AUTHENTICATION & AUTHORIZATION (Día 1)
   Archivos: backend/apps/authentication/
   
   AUDITAR:
   - JWT token security y tiempo de expiración
   - Password policies y hashing (bcrypt)
   - Session management y blacklisting
   - Multi-tenant isolation (club data separation)
   - Permission-based access controls
   - API rate limiting por usuario/IP
   - OAuth/social login security
   
   CREAR:
   - security_audit_authentication.json - Reporte detallado
   - vulnerabilities_auth.md - Issues encontrados
   - recommendations_auth.md - Soluciones propuestas

2. API SECURITY ASSESSMENT (Día 1-2)
   Archivos: backend/apps/*/views.py, urls.py
   
   AUDITAR:
   - Input validation en todos los endpoints
   - SQL injection prevention
   - XSS protection en responses
   - CSRF tokens en forms
   - API versioning security
   - Sensitive data exposure
   - Error handling (no data leaks)
   - HTTPS enforcement
   - CORS configuration
   
   ENDPOINTS CRÍTICOS:
   - /api/v1/auth/* - Authentication flows
   - /api/v1/finance/* - Payment processing
   - /api/v1/classes/* - Enrollment data
   - /api/v1/tournaments/* - Competition data
   - /api/v1/reservations/* - Booking data
   - /api/v1/bi/* - Analytics data

3. DATA PRIVACY & COMPLIANCE (Día 2)
   
   AUDITAR:
   - GDPR compliance para data personal
   - PCI DSS compliance para payments
   - Data encryption at rest y in transit
   - Personal data anonymization
   - Data retention policies
   - User consent mechanisms
   - Data export/deletion capabilities
   - Audit logging de accesos
   
   CREAR:
   - privacy_compliance_report.json
   - gdpr_compliance_checklist.md
   - data_security_assessment.md

4. INFRASTRUCTURE SECURITY (Día 2-3)
   Archivos: backend/config/settings/
   
   AUDITAR:
   - Environment variables seguras
   - Database connection security
   - Redis security configuration
   - File upload security
   - Static file serving security
   - Debug mode disabled en producción
   - Secret key rotation
   - Dependency vulnerabilities (pip, npm)
   
   HERRAMIENTAS A USAR:
   - bandit para Python security
   - safety para dependency check
   - npm audit para frontend
   - Custom scripts para config review

5. FRONTEND SECURITY (Día 3)
   Archivos: frontend/src/
   
   AUDITAR:
   - XSS prevention en forms
   - Content Security Policy
   - Secure cookie configuration
   - Local storage security
   - Token handling security
   - Input sanitization
   - Third-party script security
   - Bundle analysis para vulnerabilities

HERRAMIENTAS DE SEGURIDAD A IMPLEMENTAR:

Backend Security Tools:
```bash
pip install bandit safety
bandit -r backend/
safety check
python manage.py check --deploy
```

Frontend Security Tools:
```bash
npm audit
npm install --save helmet
# Content Security Policy implementation
# XSS protection headers
```

DELIVERABLES REQUERIDOS:

1. COMPREHENSIVE SECURITY REPORT
   Archivo: SECURITY_AUDIT_REPORT_2025.md
   
   INCLUIR:
   - Executive Summary
   - Vulnerability Assessment (Critical/High/Medium/Low)
   - Compliance Status (GDPR, PCI DSS)
   - Risk Analysis Matrix
   - Remediation Plan con timeline
   - Security Score (1-100)

2. VULNERABILITY DATABASE
   Archivo: vulnerabilities_database.json
   
   FORMATO:
   ```json
   {
     "critical": [
       {
         "id": "VULN-001",
         "module": "authentication",
         "description": "JWT token expiration vulnerability",
         "impact": "High",
         "remediation": "Implement proper token refresh",
         "status": "open"
       }
     ],
     "high": [...],
     "medium": [...],
     "low": [...]
   }
   ```

3. SECURITY FIXES IMPLEMENTATION
   - Implementar fixes para vulnerabilidades CRITICAL y HIGH
   - Crear security patches para issues encontrados
   - Update configurations siguiendo best practices
   - Implement security headers y protections

4. PRODUCTION READINESS CHECKLIST
   Archivo: production_security_checklist.md
   
   VERIFICAR:
   - [ ] All critical vulnerabilities fixed
   - [ ] HTTPS enforced everywhere
   - [ ] Database properly secured
   - [ ] API rate limiting active
   - [ ] Audit logging enabled
   - [ ] Error handling secure
   - [ ] Dependencies up to date
   - [ ] Security headers configured

METODOLOGÍA DE AUDITORÍA:

Fase 1: Automated Scanning (4 horas)
- Run security tools on all code
- Dependency vulnerability scan
- Configuration review automated

Fase 2: Manual Code Review (8 horas)
- Deep dive security review
- Business logic vulnerabilities
- Authorization flow analysis
- Data handling security

Fase 3: Penetration Testing (4 horas)
- Simulated attacks on endpoints
- Authentication bypass attempts
- Data access escalation tests
- SQL injection testing

Fase 4: Compliance Review (4 horas)
- GDPR compliance verification
- PCI DSS requirements check
- Industry best practices validation
- Documentation compliance

COMPLIANCE FRAMEWORKS:

1. GDPR (EU General Data Protection Regulation)
   - Right to be forgotten
   - Data portability
   - Consent mechanisms
   - Breach notification

2. PCI DSS (Payment Card Industry)
   - Secure cardholder data
   - Encryption requirements
   - Access control measures
   - Regular monitoring

3. OWASP Top 10 (Web Application Security)
   - Injection vulnerabilities
   - Broken authentication
   - Sensitive data exposure
   - Security misconfiguration

CRITICAL SUCCESS METRICS:

Security Score Targets:
- Overall Security Score: >85/100
- Critical Vulnerabilities: 0
- High Vulnerabilities: <3
- GDPR Compliance: 100%
- PCI DSS Compliance: 100%

Performance Impact:
- Security measures should not impact performance >5%
- API response times maintained <200ms
- User experience unaffected

COMENZAR CON:
1. Setup security audit environment
2. Install and configure security scanning tools
3. Run automated vulnerability scans
4. Begin manual code review starting with authentication
5. Document findings in real-time

REPORTAR PROGRESO:
- Al completar cada módulo auditado
- Cuando encuentres vulnerabilidades CRITICAL
- Al finalizar cada fase de auditoría
- Si necesitas clarificaciones sobre compliance

¿Listo para comenzar el Security Audit? Esta auditoría es CRÍTICA para el launch en producción.
```

## 🎯 Alternative Short Version:

```
TAREA CRÍTICA: Security Audit completo pre-producción

OBJETIVO: Auditar todos los módulos implementados para identificar vulnerabilidades

SCOPE:
1. Authentication & Authorization security
2. API endpoints vulnerability assessment  
3. Data privacy & GDPR compliance
4. Infrastructure security configuration
5. Frontend XSS & security headers

HERRAMIENTAS: bandit, safety, npm audit, manual penetration testing

DELIVERABLE: SECURITY_AUDIT_REPORT_2025.md con plan de remediación

TIMELINE: 2-3 días, prioridad CRÍTICA

Comienza con authentication security audit y reporta findings críticos inmediatamente.
```

## 📊 Para Monitoreo (esta ventana):

Mientras Claude Code ejecuta el Security Audit:

1. **Verificar herramientas de seguridad**:
   ```bash
   cd /Users/ja/PZR4/backend
   bandit -r . -f json -o security_scan.json
   safety check --json
   ```

2. **Monitorear findings críticos**:
   - Critical vulnerabilities deben ser addressed inmediatamente
   - High severity issues requieren plan de remediación
   - Compliance issues son blockers para producción

3. **Checkpoints importantes**:
   - Después de authentication audit: verificar JWT security
   - Después de API audit: confirmar input validation
   - Después de compliance: verificar GDPR/PCI DSS
   - Al final: revisar production readiness checklist

## 🚨 Red Flags a Monitorear:

- SQL injection vulnerabilities
- Exposed sensitive data
- Weak authentication mechanisms  
- Missing rate limiting
- HTTPS not enforced
- Debug mode enabled
- Hardcoded secrets
- Outdated dependencies

---
*Creado: January 11, 2025*
*Prioridad: 🔴 CRÍTICA para producción*
*Estimated: 2-3 días*