# 📋 Instrucciones de Respaldo - Padelyzer

## 🔐 Archivo de Respaldo Creado

He creado un archivo con todas las claves importantes:

**`.env.backup.important`**

## ⚠️ MUY IMPORTANTE

1. **COPIAR ESTE ARCHIVO A UN LUGAR SEGURO** antes de ejecutar la limpieza
   - Gestor de contraseñas (1Password, Bitwarden, etc.)
   - Documento privado en Google Drive/Dropbox
   - USB encriptado

2. **NUNCA SUBIR A GITHUB**
   - Ya está en .gitignore
   - Contiene credenciales sensibles

3. **DESPUÉS DE COPIAR**, puedes ejecutar:
   ```bash
   ./clean_for_github.sh
   ```

## 🔑 Claves Incluidas en el Respaldo

- ✅ Django SECRET_KEY
- ✅ Database credentials
- ✅ Stripe API keys
- ✅ JWT secrets
- ✅ Email configuration
- ✅ Superuser credentials
- ✅ Frontend API URLs
- ✅ Deployment tokens

## 📝 Para Restaurar en Nuevo Entorno

1. Copiar `.env.example` a `.env`
2. Llenar con valores del respaldo
3. Ajustar URLs según el entorno
4. Generar nuevas claves para producción

## 🚀 Próximos Pasos

1. **Guardar** `.env.backup.important` en lugar seguro
2. **Ejecutar** `./clean_for_github.sh`
3. **Verificar** que no queden archivos sensibles
4. **Subir** a GitHub

---

**Nota**: Las claves de ejemplo en el respaldo son plantillas. Debes usar tus claves reales o generar nuevas para producción.