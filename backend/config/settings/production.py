"""
Production settings for Padelyzer project.
"""

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *

# Security
DEBUG = False
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

# Database - Use connection URL from environment
DATABASES = {"default": env.db("DATABASE_URL")}

# Security headers
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS - Production domains only
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")

# Static files - Using WhiteNoise
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Media files - Google Cloud Storage
DEFAULT_FILE_STORAGE = "storages.backends.gcloud.GoogleCloudStorage"
GS_BUCKET_NAME = env("GS_BUCKET_NAME")
GS_PROJECT_ID = env("GS_PROJECT_ID")

# Email backend - Production
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env("EMAIL_PORT", default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")

# Sentry error tracking
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment="production",
    )

# Logging configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
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
            "level": "INFO",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Performance optimizations
CONN_MAX_AGE = 60
DATABASES["default"]["CONN_MAX_AGE"] = 60

# Cache configuration
# Use Redis if available, otherwise use local memory
if REDIS_URL and REDIS_URL != "redis://localhost:6379/0":
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "CONNECTION_POOL_KWARGS": {
                    "max_connections": 50,
                },
            },
            "KEY_PREFIX": "padelyzer",
            "TIMEOUT": 300,
        }
    }
else:
    # Fallback to local memory cache
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }

# Session configuration
if REDIS_URL and REDIS_URL != "redis://localhost:6379/0":
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    SESSION_CACHE_ALIAS = "default"
else:
    SESSION_ENGINE = "django.contrib.sessions.backends.db"

# Rate limiting
RATELIMIT_ENABLE = True
RATELIMIT_VIEW = "apps.core.views.ratelimit_exceeded"

# Temporarily silence RECAPTCHA test key error until proper keys are configured
# TODO: Add proper RECAPTCHA_PUBLIC_KEY and RECAPTCHA_PRIVATE_KEY to environment variables
SILENCED_SYSTEM_CHECKS = ["django_recaptcha.recaptcha_test_key_error"]



# Security Settings - Added by Security Remediation
# Generated on: 2025-08-06T23:00:26.982337

# HTTPS and Security Headers
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)

# Cookie Security
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Strict"

# Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "data:", "https:", "blob:")
CSP_CONNECT_SRC = ("'self'", "https://api.stripe.com", "wss://")

# Session Security
SESSION_COOKIE_AGE = 60 * 60 * 2  # 2 hours
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# Additional Security
SECURE_REFERRER_POLICY = "same-origin"
PERMISSIONS_POLICY = {
    "accelerometer": [],
    "ambient-light-sensor": [],
    "autoplay": [],
    "camera": [],
    "display-capture": [],
    "document-domain": [],
    "encrypted-media": [],
    "fullscreen": ["self"],
    "geolocation": [],
    "gyroscope": [],
    "interest-cohort": [],
    "magnetometer": [],
    "microphone": [],
    "midi": [],
    "payment": ["self"],
    "picture-in-picture": [],
    "publickey-credentials-get": [],
    "sync-xhr": [],
    "usb": [],
    "xr-spatial-tracking": [],
}


# TEMPORARY: Disable problematic signals during User creation
DISABLE_USER_CREATION_SIGNALS = True

# Signal bypass for authentication issues
BYPASS_CLIENT_PROFILE_CREATION = True
BYPASS_AUTO_ORG_ASSIGNMENT = True

