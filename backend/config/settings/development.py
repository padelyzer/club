"""
Development settings for Padelyzer project.
"""

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "testserver"]

# Database
# Use SQLite for local development (override from .env if needed)
import dj_database_url

DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL", default="sqlite:///db.sqlite3")
    )
}

# Django Debug Toolbar - Disabled for now
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
# INTERNAL_IPS = ['127.0.0.1', 'localhost']

# CORS - Allow frontend development server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]

# CSRF - Trust frontend origins
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]

# Allow all origins in development (more permissive)


# Email backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Celery with Redis for development
CELERY_BROKER_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# For development, you can enable eager mode to test without Celery worker
# CELERY_TASK_ALWAYS_EAGER = True
# CELERY_TASK_EAGER_PROPAGATES = True

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "apps.finance.webhooks": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Development-specific settings
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Media files in development
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Redis caching in development
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "padelyzer_dev",
        "TIMEOUT": 300,  # 5 minutes default timeout
    }
}

# CAPTCHA settings for development
# Can be disabled by setting ENABLE_CAPTCHA=False in .env
ENABLE_CAPTCHA = env.bool(
    "ENABLE_CAPTCHA", default=False
)  # Disabled by default in development

# Silence reCAPTCHA test key warnings in development
SILENCED_SYSTEM_CHECKS = ["django_recaptcha.recaptcha_test_key_error"]

# Auto-organization assignment for new users (development only)
AUTO_ASSIGN_DEFAULT_ORG = env.bool("AUTO_ASSIGN_DEFAULT_ORG", default=True)
DEFAULT_ORGANIZATION_ID = env.str("DEFAULT_ORGANIZATION_ID", default=None)



# CORS Configuration - Restrictive
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "https://padelyzer.com",
        "https://www.padelyzer.com",
        "https://app.padelyzer.com",
    ]
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOWED_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
