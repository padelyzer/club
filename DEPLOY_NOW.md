# 🚀 Deploy AHORA en Render - Guía Rápida

## 📋 Pasos Rápidos (5 minutos)

### 1. Actualizar el repositorio con los últimos cambios:

```bash
cd /Users/ja/PZR4
cp render.yaml ../padelyzer-export/
cp backend/create_superuser.py ../padelyzer-export/backend/
cp RENDER_DEPLOYMENT_COMPLETE.md ../padelyzer-export/

cd ../padelyzer-export
git add .
git commit -m "feat: add Render deployment configuration

- Update render.yaml with correct repository URL
- Add create_superuser.py script for initial setup
- Add complete deployment documentation

Ready for one-click deployment on Render"

git push origin main
```

### 2. Deploy en Render:

1. **Ve a https://render.com**
2. **Click en "New +" → "Blueprint"**
3. **Conecta GitHub y selecciona `padelyzer/club`**
4. **Configura estas 3 variables**:
   ```
   STRIPE_SECRET_KEY = sk_test_51... (tu clave de Stripe)
   STRIPE_WEBHOOK_SECRET = whsec_... (tu webhook secret)
   ADMIN_PASSWORD = TuContraseñaSegura123!
   ```
5. **Click "Apply"**

### 3. Esperar (10-15 minutos)

Render creará automáticamente:
- ✅ Backend API
- ✅ Frontend Web App
- ✅ PostgreSQL Database
- ✅ Redis Cache

### 4. Acceder a tu aplicación:

- **Frontend**: https://padelyzer-frontend.onrender.com
- **Admin**: https://padelyzer-backend.onrender.com/admin
  - Usuario: `admin`
  - Contraseña: la que pusiste en `ADMIN_PASSWORD`

## 🔑 Variables de Entorno Mínimas

Solo necesitas estas 3 para empezar:

```env
STRIPE_SECRET_KEY=sk_test_... 
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=TuContraseña123!
```

Las demás se generan automáticamente.

## ✅ Verificación Rápida

```bash
# Check backend
curl https://padelyzer-backend.onrender.com/api/v1/health/

# Debería responder:
# {"status":"ok","database":"connected","time":"..."}
```

## 🚨 Si algo falla:

1. **Ve a Render Dashboard → Logs**
2. **Busca el error específico**
3. **Común**: Si falla collectstatic, ignorar (no afecta funcionamiento)

---

**¡Eso es todo! En 15 minutos tendrás Padelyzer corriendo en producción** 🎉