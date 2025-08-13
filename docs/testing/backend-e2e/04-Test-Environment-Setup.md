# 🔧 Test Environment Setup

## 🏗️ Configuración del Entorno de Tests

### Requisitos Previos
- Python 3.11+
- PostgreSQL 14+ (para tests de integración)
- Redis (para tests de caché)
- Docker (opcional, para servicios externos)

## 📦 Instalación de Dependencias

### 1. Crear archivo de requirements para tests
```bash
# backend/requirements/test.txt
-r base.txt

# Testing framework
pytest==7.4.0
pytest-django==4.5.2
pytest-cov==4.1.0
pytest-xdist==3.3.1
pytest-timeout==2.1.0
pytest-mock==3.11.1

# Test data generation
factory-boy==3.3.0
faker==19.3.0

# Mocking and fixtures
responses==0.23.3
freezegun==1.2.2
model-bakery==1.15.0

# Code quality
black==23.7.0
isort==5.12.0
flake8==6.1.0
mypy==1.4.1
django-stubs==4.2.3

# Performance testing
locust==2.15.1
django-silk==5.0.3

# Security testing
bandit==1.7.5
safety==2.3.5
```

### 2. Instalación
```bash
cd backend
pip install -r requirements/test.txt
```

## ⚙️ Configuración de Django para Tests

### 1. Settings de Test
```python
# backend/config/settings/test.py
from .base import *

# Override settings for testing
DEBUG = False
TESTING = True

# Use in-memory SQLite for speed
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Speed up password hashing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Email backend for testing
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Media files
MEDIA_ROOT = APPS_DIR / 'test_media'

# Celery - run synchronously
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable external services
STRIPE_TEST_MODE = True
STRIPE_TEST_SECRET_KEY = 'sk_test_dummy'
STRIPE_TEST_PUBLISHABLE_KEY = 'pk_test_dummy'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
```

## 🧪 Pytest Configuration

### 1. pytest.ini
```ini
# backend/pytest.ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
testpaths = tests
addopts = 
    --verbose
    --strict-markers
    --reuse-db
    --nomigrations
    --cov=apps
    --cov-branch
    --cov-report=term-missing:skip-covered
    --cov-report=html
    --cov-report=xml
    --maxfail=1
    --tb=short
    --disable-warnings

markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Tests that take > 1s
    external: Tests requiring external services
    smoke: Quick smoke tests
    regression: Regression tests
```

### 2. Configuración de Coverage
```ini
# backend/.coveragerc
[run]
source = apps
omit = 
    */migrations/*
    */tests/*
    */conftest.py
    */apps.py
    */admin.py
    */__init__.py
    */settings/*
    */wsgi.py
    */asgi.py

[report]
precision = 2
skip_empty = True
show_missing = True
exclude_lines =
    pragma: no cover
    def __repr__
    def __str__
    raise AssertionError
    raise NotImplementedError
    if self.debug:
    if settings.DEBUG
    if TYPE_CHECKING:
    @abstract

[html]
directory = htmlcov
```

## 🐳 Docker Setup para Tests (Opcional)

### 1. docker-compose.test.yml
```yaml
version: '3.8'

services:
  test-db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: padelyzer_test
      POSTGRES_USER: padelyzer
      POSTGRES_PASSWORD: testpass
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data

  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"

  test-stripe-mock:
    image: stripemock/stripe-mock:latest
    ports:
      - "12111:12111"

  test-mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
```

### 2. Usar servicios Docker en tests
```python
# backend/conftest.py
import os
import pytest

def pytest_configure(config):
    """Configure test environment"""
    if os.getenv('USE_DOCKER_SERVICES'):
        os.environ['DATABASE_URL'] = 'postgres://padelyzer:testpass@localhost:5433/padelyzer_test'
        os.environ['REDIS_URL'] = 'redis://localhost:6380'
        os.environ['STRIPE_API_BASE'] = 'http://localhost:12111'
        os.environ['EMAIL_HOST'] = 'localhost'
        os.environ['EMAIL_PORT'] = '1025'
```

## 🏃 Test Runners y Scripts

### 1. Script de Test Rápido
```bash
#!/bin/bash
# backend/scripts/test-quick.sh

echo "🚀 Running quick tests..."

# Unit tests only
pytest -m unit -x --tb=short

# Check coverage
coverage report --fail-under=80
```

### 2. Script de Test Completo
```bash
#!/bin/bash
# backend/scripts/test-full.sh

echo "🧪 Running full test suite..."

# Start docker services if needed
if [ "$USE_DOCKER" = "true" ]; then
    docker-compose -f docker-compose.test.yml up -d
    sleep 5
fi

# Run all tests
pytest \
    --cov=apps \
    --cov-report=term \
    --cov-report=html \
    --cov-report=xml

# Generate coverage badge
coverage-badge -o coverage.svg

# Run security checks
bandit -r apps/
safety check

# Code quality
flake8 apps/
isort --check-only apps/
black --check apps/

# Type checking
mypy apps/

# Cleanup
if [ "$USE_DOCKER" = "true" ]; then
    docker-compose -f docker-compose.test.yml down
fi
```

### 3. Pre-commit Hook
```yaml
# backend/.pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest-check
        name: pytest-check
        entry: pytest
        language: system
        pass_filenames: false
        always_run: true
        args: ['-m', 'unit', '--tb=short']
        
      - id: black
        name: black
        entry: black
        language: system
        types: [python]
        
      - id: isort
        name: isort
        entry: isort
        language: system
        types: [python]
        
      - id: flake8
        name: flake8
        entry: flake8
        language: system
        types: [python]
```

## 🧩 Test Fixtures Base

### 1. Fixtures Globales
```python
# backend/conftest.py
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.clubs.models import Club, Court
from tests.factories import UserFactory, ClubFactory, CourtFactory

User = get_user_model()

@pytest.fixture
def api_client():
    """API client for testing"""
    return APIClient()

@pytest.fixture
def admin_user(db):
    """Admin user fixture"""
    return User.objects.create_superuser(
        email='admin@padelyzer.com',
        password='admin123'
    )

@pytest.fixture
def regular_user(db):
    """Regular user fixture"""
    return UserFactory()

@pytest.fixture
def authenticated_client(api_client, regular_user):
    """Pre-authenticated API client"""
    api_client.force_authenticate(user=regular_user)
    return api_client

@pytest.fixture
def club_with_courts(db):
    """Club with courts fixture"""
    club = ClubFactory()
    courts = [CourtFactory(club=club) for _ in range(3)]
    club.courts_list = courts
    return club

@pytest.fixture
def mock_stripe(mocker):
    """Mock Stripe for all tests"""
    return mocker.patch('stripe.PaymentIntent')

@pytest.fixture(autouse=True)
def reset_sequences(db):
    """Reset factory sequences between tests"""
    from factory import Factory
    Factory.reset_sequence()
```

## 🎯 Comandos de Test Útiles

### Ejecución Básica
```bash
# Run all tests
pytest

# Run specific module
pytest tests/authentication/

# Run specific test
pytest tests/authentication/test_login.py::TestLogin::test_valid_credentials

# Run with output
pytest -s

# Run in parallel
pytest -n auto

# Run only failed tests
pytest --lf

# Run tests matching pattern
pytest -k "login or logout"
```

### Coverage Commands
```bash
# Generate coverage report
pytest --cov=apps

# HTML coverage report
pytest --cov=apps --cov-report=html
open htmlcov/index.html

# Show missing lines
pytest --cov=apps --cov-report=term-missing

# Fail if coverage below threshold
pytest --cov=apps --cov-fail-under=85
```

### Marcadores
```bash
# Run only unit tests
pytest -m unit

# Run integration and e2e tests
pytest -m "integration or e2e"

# Skip slow tests
pytest -m "not slow"

# Run smoke tests
pytest -m smoke
```

## 🔍 Debugging Tests

### 1. Debug con pdb
```python
def test_complex_logic():
    import pdb; pdb.set_trace()
    # Test code here
```

### 2. Ver SQL queries
```python
# In test settings
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        }
    }
}
```

### 3. Fixtures verbosas
```bash
pytest --setup-show
```

---

**Siguiente**: [Database Testing Strategy](05-Database-Testing-Strategy.md) →