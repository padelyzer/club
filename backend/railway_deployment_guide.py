#!/usr/bin/env python
"""
Railway Deployment Analysis and Setup Guide for Padelyzer Backend
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import json

from django.conf import settings


def analyze_current_config():
    """Analyze current configuration for Railway compatibility."""
    print("🚂 RAILWAY DEPLOYMENT ANALYSIS")
    print("=" * 40)

    issues = []
    ready_items = []

    # Check current database
    if hasattr(settings, "DATABASES"):
        db_engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite" in db_engine.lower():
            issues.append("❌ SQLite not suitable for Railway (ephemeral storage)")
            print("❌ Database: SQLite (needs PostgreSQL)")
        else:
            ready_items.append("✅ Database ready for Railway")
            print("✅ Database: PostgreSQL compatible")

    # Check environment variables
    env_file_exists = os.path.exists(".env")
    if env_file_exists:
        ready_items.append("✅ Environment variables configured")
        print("✅ Environment: .env file exists")
    else:
        issues.append("❌ .env file missing")
        print("❌ Environment: .env file missing")

    # Check static files
    if hasattr(settings, "STATIC_ROOT"):
        ready_items.append("✅ Static files configuration exists")
        print("✅ Static Files: STATIC_ROOT configured")
    else:
        issues.append("⚠️ STATIC_ROOT needs configuration")
        print("⚠️ Static Files: STATIC_ROOT needs setup")

    # Check ALLOWED_HOSTS
    if hasattr(settings, "ALLOWED_HOSTS"):
        if "*" in settings.ALLOWED_HOSTS or not settings.ALLOWED_HOSTS:
            issues.append("⚠️ ALLOWED_HOSTS needs Railway domain")
            print("⚠️ ALLOWED_HOSTS: Needs Railway domain")
        else:
            ready_items.append("✅ ALLOWED_HOSTS configured")
            print("✅ ALLOWED_HOSTS: Configured")

    # Check Redis configuration
    if hasattr(settings, "CACHES"):
        cache_backend = settings.CACHES["default"]["BACKEND"]
        if "redis" in cache_backend.lower():
            ready_items.append("✅ Redis cache ready for Railway")
            print("✅ Cache: Redis configured")
        else:
            issues.append("⚠️ Cache needs Redis for Railway")
            print("⚠️ Cache: Needs Redis")

    return issues, ready_items


def create_railway_files():
    """Create necessary files for Railway deployment."""
    print("\n📁 CREATING RAILWAY DEPLOYMENT FILES")
    print("=" * 45)

    # 1. Create Procfile for Railway
    procfile_content = """web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
worker: celery -A config worker --loglevel=info
beat: celery -A config beat --loglevel=info"""

    with open("Procfile", "w") as f:
        f.write(procfile_content)
    print("✅ Procfile created")

    # 2. Create railway.json configuration
    railway_config = {
        "build": {"builder": "heroku/buildpacks:20"},
        "deploy": {
            "startCommand": "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT",
            "healthcheckPath": "/admin/",
            "healthcheckTimeout": 100,
        },
    }

    with open("railway.json", "w") as f:
        json.dump(railway_config, f, indent=2)
    print("✅ railway.json created")

    # 3. Create requirements.txt for production
    production_requirements = """# Production requirements for Railway
-r requirements/production.txt

# Additional Railway-specific packages
whitenoise==6.6.0
dj-database-url==2.1.0
psycopg2-binary==2.9.9
redis==5.0.1
gunicorn==21.2.0"""

    with open("requirements-railway.txt", "w") as f:
        f.write(production_requirements)
    print("✅ requirements-railway.txt created")

    # 4. Create runtime.txt for Python version
    with open("runtime.txt", "w") as f:
        f.write("python-3.12.10\n")
    print("✅ runtime.txt created")

    return True


def create_railway_settings():
    """Create Railway-specific Django settings."""
    print("\n⚙️ CREATING RAILWAY SETTINGS")
    print("=" * 35)

    railway_settings = '''"""
Railway production settings for Padelyzer.
"""

from .base import *
import dj_database_url
import os

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool('DEBUG', default=False)

# Railway automatically provides RAILWAY_STATIC_URL and RAILWAY_PUBLIC_DOMAIN
ALLOWED_HOSTS = [
    '.railway.app',
    '.up.railway.app', 
    'localhost',
    '127.0.0.1',
]

# Add Railway public domain if available
if 'RAILWAY_PUBLIC_DOMAIN' in os.environ:
    ALLOWED_HOSTS.append(os.environ['RAILWAY_PUBLIC_DOMAIN'])

# Database - Railway PostgreSQL
DATABASES = {
    'default': dj_database_url.parse(
        env('DATABASE_URL', default='sqlite:///db.sqlite3')
    )
}

# Redis - Railway Redis
REDIS_URL = env('REDIS_URL', default='redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'padelyzer_prod',
        'TIMEOUT': 300,
    }
}

# Celery - Railway Redis
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# Static files - WhiteNoise
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise for static files
] + MIDDLEWARE[2:]  # Keep the rest of middleware

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files - Railway persistent volume or external storage
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Security settings for production
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# SSL settings (Railway provides HTTPS)
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS - Update for Railway domain
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend.railway.app",  # Update with your frontend Railway URL
    "http://localhost:3000",  # Keep for local development
    "http://127.0.0.1:3000",
]

# Add Railway public domain to CORS if available
if 'RAILWAY_PUBLIC_DOMAIN' in os.environ:
    CORS_ALLOWED_ORIGINS.append(f"https://{os.environ['RAILWAY_PUBLIC_DOMAIN']}")

# Logging for Railway
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Email settings for production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@padelyzer.com')

# Stripe settings
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

# Railway-specific settings
PORT = env.int('PORT', default=8000)

# Performance optimizations
CONN_MAX_AGE = 600  # 10 minutes connection persistence

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024   # 10MB
'''

    with open("config/settings/railway.py", "w") as f:
        f.write(railway_settings)
    print("✅ config/settings/railway.py created")

    return True


def create_railway_env_template():
    """Create environment variables template for Railway."""
    print("\n🔧 CREATING RAILWAY ENVIRONMENT TEMPLATE")
    print("=" * 48)

    env_template = """# Railway Environment Variables Template
# Copy these to your Railway project environment variables

# Django Settings
DEBUG=False
SECRET_KEY=your-super-secret-key-for-production-50-characters-minimum
DJANGO_SETTINGS_MODULE=config.settings.railway

# Database (Railway will provide this automatically)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (Railway will provide this automatically)
REDIS_URL=redis://default:password@host:port

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@padelyzer.com

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Security
SECURE_SSL_REDIRECT=True

# External Services
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase-key.json

# Analytics
MIXPANEL_TOKEN=your_mixpanel_token

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Mexican Tax Integration
FACTURAPI_SECRET_KEY=your_facturapi_secret_key
FACTURAPI_PUBLIC_KEY=your_facturapi_public_key

# File Storage (if using external storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=us-east-1
"""

    with open(".env.railway.template", "w") as f:
        f.write(env_template)
    print("✅ .env.railway.template created")

    return True


def create_deployment_scripts():
    """Create deployment and management scripts."""
    print("\n📜 CREATING DEPLOYMENT SCRIPTS")
    print("=" * 38)

    # Deploy script
    deploy_script = """#!/bin/bash
# Railway Deployment Script for Padelyzer

echo "🚂 Starting Railway deployment for Padelyzer..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements-railway.txt

# Run migrations
echo "🗄️ Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if needed (only on first deploy)
echo "👤 Creating superuser if needed..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@padelyzer.com', 'secure_admin_password_123')
    print("Superuser created")
else:
    print("Superuser already exists")
EOF

echo "✅ Deployment preparation complete!"
echo "🚀 Starting application server..."
"""

    with open("deploy.sh", "w") as f:
        f.write(deploy_script)

    # Make executable
    os.chmod("deploy.sh", 0o755)
    print("✅ deploy.sh created (executable)")

    # Health check script
    health_check = """#!/usr/bin/env python
# Health check script for Railway

import os
import sys
import django
import requests
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.railway')

def check_health():
    print("🏥 Checking application health...")
    
    try:
        # Check database
        django.setup()
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Database connection: OK")
        
        # Check cache
        from django.core.cache import cache
        cache.set('health_check', 'ok', timeout=60)
        if cache.get('health_check') == 'ok':
            print("✅ Redis cache: OK")
        else:
            print("❌ Redis cache: FAIL")
            return False
        
        # Check critical models
        from apps.authentication.models import User
        user_count = User.objects.count()
        print(f"✅ User model: {user_count} users")
        
        print("🎉 Health check passed!")
        return True
        
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

if __name__ == '__main__':
    success = check_health()
    sys.exit(0 if success else 1)
"""

    with open("health_check.py", "w") as f:
        f.write(health_check)
    print("✅ health_check.py created")

    return True


def create_railway_readme():
    """Create Railway deployment documentation."""
    print("\n📚 CREATING RAILWAY DEPLOYMENT GUIDE")
    print("=" * 45)

    readme_content = """# Padelyzer Backend - Railway Deployment Guide

## 🚂 Railway Deployment Setup

### Prerequisites
1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected
3. Railway CLI installed (optional)

### Step 1: Create Railway Project
```bash
# Using Railway CLI
railway login
railway new padelyzer-backend
railway link
```

### Step 2: Add Services
Add these services to your Railway project:

1. **PostgreSQL Database**
   - Go to Railway dashboard
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will auto-generate `DATABASE_URL`

2. **Redis Cache**
   - Click "New" → "Database" → "Redis"
   - Railway will auto-generate `REDIS_URL`

### Step 3: Configure Environment Variables
In your Railway project settings, add these environment variables:

```env
DEBUG=False
SECRET_KEY=your-super-secret-key-minimum-50-characters-long
DJANGO_SETTINGS_MODULE=config.settings.railway

# These are auto-generated by Railway:
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@padelyzer.com

# Stripe (use live keys for production)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# External Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

MIXPANEL_TOKEN=your_mixpanel_token
SENTRY_DSN=https://your-sentry-dsn@sentry.io/...
```

### Step 4: Deploy
1. Push your code to GitHub
2. Railway will automatically deploy
3. Check deployment logs for any issues

### Step 5: Post-Deployment Setup
```bash
# Using Railway CLI
railway run python manage.py migrate
railway run python manage.py collectstatic --noinput
railway run python manage.py createsuperuser
```

### Step 6: Configure Domain
1. Go to Railway dashboard
2. Click on your service
3. Go to "Settings" → "Networking"
4. Add custom domain or use Railway subdomain

### Step 7: Update CORS and ALLOWED_HOSTS
Update your frontend URLs in:
- `CORS_ALLOWED_ORIGINS` in railway.py
- Your frontend's API base URL

## 🔧 Railway-Specific Features

### Automatic Deployments
Railway automatically deploys when you push to your connected branch.

### Environment Variables
Railway provides these automatically:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)
- `PORT` (application port)
- `RAILWAY_PUBLIC_DOMAIN` (your app domain)

### Health Checks
Railway checks `/admin/` endpoint for health status.

### Scaling
Railway can scale your application:
- Go to Settings → Resources
- Adjust CPU and Memory limits

## 🚀 Production Checklist

### Before Going Live:
- [ ] Set `DEBUG=False`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure real Stripe keys
- [ ] Set up email service
- [ ] Configure custom domain
- [ ] Update CORS origins
- [ ] Set up monitoring (Sentry)
- [ ] Configure backup strategy
- [ ] Test all critical paths

### Security:
- [ ] HTTPS enabled (automatic with Railway)
- [ ] Security headers configured
- [ ] Database credentials secured
- [ ] API rate limiting enabled
- [ ] Admin panel secured

### Performance:
- [ ] Static files optimized
- [ ] Database queries optimized
- [ ] Redis cache working
- [ ] CDN for media files (if needed)

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**
   ```bash
   # Check Python version in runtime.txt
   echo "python-3.12.10" > runtime.txt
   ```

2. **Database Connection Issues**
   ```bash
   # Verify DATABASE_URL is set
   railway variables
   ```

3. **Static Files Not Loading**
   ```bash
   # Run collectstatic
   railway run python manage.py collectstatic --noinput
   ```

4. **CORS Errors**
   - Update `CORS_ALLOWED_ORIGINS` in railway.py
   - Include your Railway domain

### Logs:
```bash
# View application logs
railway logs

# View specific service logs
railway logs --service padelyzer-backend
```

## 📊 Monitoring

### Built-in Railway Monitoring:
- CPU usage
- Memory usage
- Network traffic
- Response times

### External Monitoring (Recommended):
- Sentry for error tracking
- New Relic or DataDog for APM
- Uptime monitoring service

## 💰 Costs

Railway pricing (approximate):
- Starter plan: $5/month
- PostgreSQL: ~$5-10/month
- Redis: ~$3-5/month
- Total: ~$13-20/month for small-medium traffic

## 🔄 CI/CD Pipeline

Railway automatically handles:
1. Code pull from GitHub
2. Dependency installation
3. Static file collection
4. Database migrations
5. Application restart

## 📞 Support

- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Padelyzer Issues: GitHub Issues
"""

    with open("RAILWAY_DEPLOYMENT.md", "w") as f:
        f.write(readme_content)
    print("✅ RAILWAY_DEPLOYMENT.md created")

    return True


def main():
    """Main Railway deployment preparation function."""
    print("🚂 RAILWAY DEPLOYMENT PREPARATION")
    print("🇲🇽 Preparing Padelyzer for Railway deployment")
    print("=" * 55)

    tasks = [
        ("Analyzing current configuration", analyze_current_config),
        ("Creating Railway files", create_railway_files),
        ("Creating Railway settings", create_railway_settings),
        ("Creating environment template", create_railway_env_template),
        ("Creating deployment scripts", create_deployment_scripts),
        ("Creating deployment guide", create_railway_readme),
    ]

    completed = 0
    total_issues = 0
    total_ready = 0

    for task_name, task_func in tasks:
        print(f"\n📋 {task_name}...")
        try:
            result = task_func()
            if isinstance(
                result, tuple
            ):  # analyze_current_config returns issues, ready_items
                issues, ready_items = result
                total_issues += len(issues)
                total_ready += len(ready_items)
                if len(issues) == 0:
                    completed += 1
            elif result:
                completed += 1
        except Exception as e:
            print(f"❌ Error in {task_name}: {e}")

    print("\n" + "=" * 55)
    print(f"🚂 RAILWAY PREPARATION COMPLETE: {completed}/{len(tasks)} tasks")

    if completed == len(tasks):
        print("🎉 All Railway deployment files created successfully!")

        print(f"\n📋 SUMMARY:")
        print(f"✅ Ready items: {total_ready}")
        print(f"❌ Issues to fix: {total_issues}")

        print(f"\n📁 FILES CREATED:")
        print("• Procfile - Process definitions")
        print("• railway.json - Railway configuration")
        print("• requirements-railway.txt - Production dependencies")
        print("• runtime.txt - Python version")
        print("• config/settings/railway.py - Railway settings")
        print("• .env.railway.template - Environment variables template")
        print("• deploy.sh - Deployment script")
        print("• health_check.py - Health monitoring")
        print("• RAILWAY_DEPLOYMENT.md - Complete deployment guide")

        print(f"\n🚀 NEXT STEPS:")
        print("1. Create Railway account and project")
        print("2. Add PostgreSQL and Redis services")
        print("3. Configure environment variables")
        print("4. Connect GitHub repository")
        print("5. Deploy and test")
        print("6. Configure custom domain")

        print(f"\n💡 KEY CHANGES NEEDED:")
        if total_issues > 0:
            print("• Switch from SQLite to PostgreSQL")
            print("• Update ALLOWED_HOSTS with Railway domain")
            print("• Configure production environment variables")
            print("• Set DEBUG=False for production")
        else:
            print("• No critical issues found!")

        print(f"\n📖 READ: RAILWAY_DEPLOYMENT.md for complete guide")

    else:
        print("❌ Some tasks failed. Check errors above.")

    return completed >= len(tasks) - 1  # Allow for minor issues


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
