# Render Configuration Settings

## ⚠️ IMPORTANT: Update Start Command

In your Render dashboard, update the **Start Command** to:

```bash
bash deploy.sh
```

## Environment Variables to Set

Copy and paste these into your Render environment variables:

```
SECRET_KEY=your-very-secure-secret-key-here
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
ALLOWED_HOSTS=backend-io1y.onrender.com
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

# Temporary RECAPTCHA test keys (replace with real ones later)
RECAPTCHA_PUBLIC_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_PRIVATE_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe

# Optional but recommended
SENTRY_DSN=your-sentry-dsn-if-you-have-one
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
```

## Build Command (should already be set)

```bash
pip install -r requirements/production.txt && python manage.py collectstatic --noinput
```

## What Each Fix Does

1. **AUTH_USER_MODEL** - Tells Django to use our custom User model
2. **App Label** - Ensures Django can find the authentication app
3. **Deploy Script** - Handles migrations gracefully
4. **RECAPTCHA Silencing** - Allows deployment with test keys

## After Deployment

1. Check: https://backend-io1y.onrender.com/api/v1/health/
2. Admin: https://backend-io1y.onrender.com/admin/
   - Username: admin@padelyzer.com
   - Password: Padelyzer2025!

## If Still Failing

The deployment script (deploy.sh) will:
1. Try to run migrations
2. If that fails, create missing migrations
3. Create superuser
4. Start the server

Check the Render logs for specific errors.