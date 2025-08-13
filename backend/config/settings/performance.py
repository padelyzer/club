"""
Performance-specific settings for Django.
Optimized for high-throughput production environments.
"""

from .base import *

# Performance monitoring configuration
PERFORMANCE_MONITORING = {
    'APM_ENABLED': True,
    'SLOW_QUERY_THRESHOLD': 50,  # milliseconds
    'TRACE_SAMPLING_RATE': 0.1,  # 10% of requests
    'METRICS': [
        'response_time',
        'throughput',
        'error_rate',
        'database_connections',
        'cache_hit_rate',
    ],
    'ALERTS': {
        'response_time_p95': 200,  # ms
        'error_rate': 0.01,  # 1%
        'cpu_usage': 80,  # percent
        'memory_usage': 85,  # percent
    }
}

# Database optimizations
DATABASES['default'].update({
    'CONN_MAX_AGE': 600,  # Persistent connections
    'OPTIONS': {
        'connect_timeout': 10,
        'options': '-c statement_timeout=30000',  # 30 second timeout
        'pool': {
            'min_size': 10,
            'max_size': 100,
            'max_overflow': 50,
            'pool_pre_ping': True,
            'pool_recycle': 3600,
        }
    },
})

# Add read replica for heavy queries
DATABASES['replica'] = DATABASES['default'].copy()
DATABASES['replica']['OPTIONS']['options'] = '-c default_transaction_read_only=on'

# Database routing for read replicas
DATABASE_ROUTERS = ['config.routers.ReadWriteRouter']

# Cache configuration for performance
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_HOST}:{REDIS_PORT}/1",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 100,
                'retry_on_timeout': True,
            },
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        },
        'KEY_PREFIX': 'padelyzer',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_HOST}:{REDIS_PORT}/2",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    },
    'api': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_HOST}:{REDIS_PORT}/3",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 60,  # 1 minute for API responses
    },
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_SAVE_EVERY_REQUEST = False  # Only save on change

# Cache middleware configuration
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 300
CACHE_MIDDLEWARE_KEY_PREFIX = 'cache_page'

# Add caching middleware
MIDDLEWARE.insert(1, 'django.middleware.cache.UpdateCacheMiddleware')
MIDDLEWARE.append('django.middleware.cache.FetchFromCacheMiddleware')

# Query optimization settings
# Select and prefetch related configurations
DEFAULT_SELECT_RELATED = {
    'reservations.Reservation': ['court', 'user', 'time_slot'],
    'tournaments.Match': ['team1', 'team2', 'tournament', 'court'],
    'clubs.Court': ['club'],
}

DEFAULT_PREFETCH_RELATED = {
    'reservations.Reservation': ['participants'],
    'tournaments.Tournament': ['matches', 'registrations'],
    'clubs.Club': ['courts', 'members'],
}

# Pagination settings
REST_FRAMEWORK['PAGE_SIZE'] = 20
REST_FRAMEWORK['MAX_PAGE_SIZE'] = 100

# Add performance-related middleware
MIDDLEWARE.extend([
    'performance_tests.kpi_tracker.PerformanceTrackingMiddleware',
    'django.middleware.gzip.GZipMiddleware',  # Compress responses
])

# Static files optimization
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Template caching
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]

# Security settings that may impact performance
SECURE_SSL_REDIRECT = False  # Handle at load balancer level
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Logging configuration for performance monitoring
LOGGING['handlers']['performance'] = {
    'level': 'INFO',
    'class': 'logging.handlers.RotatingFileHandler',
    'filename': 'logs/performance.log',
    'maxBytes': 1024 * 1024 * 100,  # 100MB
    'backupCount': 10,
    'formatter': 'verbose',
}

LOGGING['loggers']['performance'] = {
    'handlers': ['performance'],
    'level': 'INFO',
    'propagate': False,
}

LOGGING['loggers']['django.db.backends'] = {
    'handlers': ['performance'],
    'level': 'WARNING',  # Log slow queries
    'propagate': False,
}

# Celery optimization
CELERY_WORKER_PREFETCH_MULTIPLIER = 4
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 270  # 4.5 minutes

# API throttling (adjust for load testing)
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '1000/hour',
    'user': '10000/hour',
    'burst': '100/minute',
}

# Django Debug Toolbar (only in debug mode)
if DEBUG and not TESTING:
    INSTALLED_APPS.append('debug_toolbar')
    MIDDLEWARE.insert(2, 'debug_toolbar.middleware.DebugToolbarMiddleware')
    INTERNAL_IPS = ['127.0.0.1', 'localhost']
    
    DEBUG_TOOLBAR_CONFIG = {
        'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
        'SHOW_TEMPLATE_CONTEXT': True,
        'ENABLE_STACKTRACES': True,
    }

# Django Silk profiler (for detailed profiling)
if env.bool('ENABLE_SILK', default=False):
    INSTALLED_APPS.append('silk')
    MIDDLEWARE.insert(3, 'silk.middleware.SilkyMiddleware')
    
    SILKY_PYTHON_PROFILER = True
    SILKY_PYTHON_PROFILER_BINARY = True
    SILKY_PYTHON_PROFILER_RESULT_PATH = 'profiles/'
    SILKY_MAX_RECORDED_REQUESTS = 10000
    SILKY_INTERCEPT_PERCENT = 10  # Profile 10% of requests

# Performance-specific feature flags
FEATURES = {
    'ENABLE_QUERY_CACHE': True,
    'ENABLE_RESPONSE_CACHE': True,
    'ENABLE_AGGRESSIVE_PREFETCH': True,
    'ENABLE_CONNECTION_POOLING': True,
    'ENABLE_ASYNC_PROCESSING': True,
}

# Custom performance settings
PERFORMANCE_SETTINGS = {
    'CACHE_COURT_AVAILABILITY': True,
    'CACHE_TIMEOUT_AVAILABILITY': 60,  # 1 minute
    'CACHE_USER_STATS': True,
    'CACHE_TIMEOUT_STATS': 300,  # 5 minutes
    'BATCH_SIZE_BULK_CREATE': 1000,
    'QUERY_TIMEOUT': 30000,  # 30 seconds
    'MAX_QUERY_RESULTS': 10000,
}

# Email backend for performance (use Celery)
EMAIL_BACKEND = 'djcelery_email.backends.CeleryEmailBackend'

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB

# Optimize ORM queries
DATABASE_QUERY_LOGGING = env.bool('DATABASE_QUERY_LOGGING', default=False)