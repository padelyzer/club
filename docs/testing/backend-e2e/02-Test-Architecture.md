# 🏗️ Backend E2E Test Architecture

## 📐 Arquitectura General

### Capas de Testing
```
┌─────────────────────────────────────────┐
│          E2E Test Layer                 │ ← Flujos completos
├─────────────────────────────────────────┤
│       Integration Test Layer            │ ← APIs y módulos
├─────────────────────────────────────────┤
│         Unit Test Layer                 │ ← Lógica aislada
├─────────────────────────────────────────┤
│      Test Infrastructure               │ ← Utilities y mocks
└─────────────────────────────────────────┘
```

## 🔧 Componentes Principales

### 1. Test Runner Configuration
```python
# backend/conftest.py
import pytest
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

@pytest.fixture(scope='session')
def django_db_setup():
    """Override django setup for tests"""
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }

@pytest.fixture
def api_client():
    """Configured API client"""
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, test_user):
    """Pre-authenticated client"""
    api_client.force_authenticate(user=test_user)
    return api_client

@pytest.fixture
def test_user(django_user_model):
    """Standard test user"""
    return django_user_model.objects.create_user(
        email='test@padelyzer.com',
        password='TestPass123!',
        first_name='Test',
        last_name='User'
    )
```

### 2. Factory Pattern Implementation
```python
# backend/tests/factories.py
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from apps.authentication.models import User
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation

fake = Faker()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f'user{n}@padelyzer.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True
    
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or 'defaultpass123')

class ClubFactory(DjangoModelFactory):
    class Meta:
        model = Club
    
    name = factory.Faker('company')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))
    address = factory.Faker('address')
    phone = factory.Faker('phone_number')
    email = factory.Faker('email')
    
    @factory.post_generation
    def owners(self, create, extracted, **kwargs):
        if create and extracted:
            for owner in extracted:
                self.owners.add(owner)

class CourtFactory(DjangoModelFactory):
    class Meta:
        model = Court
    
    club = factory.SubFactory(ClubFactory)
    name = factory.Sequence(lambda n: f'Court {n}')
    court_type = 'indoor'
    surface_type = 'artificial_grass'
    price_per_hour = factory.Faker('random_int', min=20, max=50)
```

### 3. Mock Services Architecture
```python
# backend/tests/mocks/stripe_mock.py
from unittest.mock import MagicMock, patch
import stripe

class StripeMockService:
    """Mock Stripe API for testing"""
    
    def __init__(self):
        self.payments = []
        self.customers = []
        self.webhooks = []
    
    def create_payment_intent(self, amount, currency='eur', **kwargs):
        """Mock payment intent creation"""
        payment = {
            'id': f'pi_test_{len(self.payments)}',
            'amount': amount,
            'currency': currency,
            'status': 'requires_payment_method',
            'client_secret': f'secret_test_{len(self.payments)}',
            **kwargs
        }
        self.payments.append(payment)
        return payment
    
    def confirm_payment(self, payment_id):
        """Mock payment confirmation"""
        for payment in self.payments:
            if payment['id'] == payment_id:
                payment['status'] = 'succeeded'
                return payment
        raise stripe.error.InvalidRequestError('Payment not found', None)
    
    @contextmanager
    def mock_stripe(self):
        """Context manager for Stripe mocking"""
        with patch('stripe.PaymentIntent.create', self.create_payment_intent):
            with patch('stripe.PaymentIntent.confirm', self.confirm_payment):
                yield self

# backend/tests/mocks/email_mock.py
class EmailMockService:
    """Mock email service for testing"""
    
    def __init__(self):
        self.sent_emails = []
    
    def send_email(self, to, subject, template, context):
        """Mock email sending"""
        email = {
            'to': to,
            'subject': subject,
            'template': template,
            'context': context,
            'sent_at': timezone.now()
        }
        self.sent_emails.append(email)
        return True
    
    def assert_email_sent(self, to=None, subject=None, template=None):
        """Assert email was sent with criteria"""
        for email in self.sent_emails:
            if (not to or email['to'] == to) and \
               (not subject or email['subject'] == subject) and \
               (not template or email['template'] == template):
                return True
        return False
```

### 4. Test Data Builders
```python
# backend/tests/builders.py
class TestDataBuilder:
    """Builder pattern for complex test scenarios"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.data = {
            'users': [],
            'clubs': [],
            'courts': [],
            'reservations': []
        }
        return self
    
    def with_club_setup(self, name="Test Club", courts=3):
        """Create club with courts"""
        owner = UserFactory()
        club = ClubFactory(name=name, owners=[owner])
        
        for i in range(courts):
            CourtFactory(club=club, name=f"Court {i+1}")
        
        self.data['users'].append(owner)
        self.data['clubs'].append(club)
        return self
    
    def with_reservations(self, count=5):
        """Add reservations to first club"""
        if not self.data['clubs']:
            self.with_club_setup()
        
        club = self.data['clubs'][0]
        court = club.courts.first()
        
        for i in range(count):
            user = UserFactory()
            reservation = ReservationFactory(
                court=court,
                user=user,
                start_time=timezone.now() + timedelta(days=i)
            )
            self.data['users'].append(user)
            self.data['reservations'].append(reservation)
        
        return self
    
    def build(self):
        """Return built test data"""
        return self.data
```

### 5. Custom Test Assertions
```python
# backend/tests/assertions.py
class PadelyzerAssertions:
    """Custom assertions for Padelyzer tests"""
    
    @staticmethod
    def assert_valid_jwt(response):
        """Assert response contains valid JWT"""
        assert 'access' in response.data
        assert 'refresh' in response.data
        
        # Verify token structure
        access_token = response.data['access']
        parts = access_token.split('.')
        assert len(parts) == 3  # Header.Payload.Signature
    
    @staticmethod
    def assert_paginated_response(response, expected_count=None):
        """Assert response is properly paginated"""
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert 'results' in response.data
        
        if expected_count:
            assert response.data['count'] == expected_count
    
    @staticmethod
    def assert_stripe_payment(payment_data, expected_amount):
        """Assert Stripe payment data is valid"""
        assert payment_data['amount'] == expected_amount
        assert payment_data['currency'] == 'eur'
        assert payment_data['status'] in ['succeeded', 'processing']
        assert 'client_secret' in payment_data
```

## 🔄 Test Lifecycle Management

### Setup and Teardown
```python
class E2ETestCase(TestCase):
    """Base E2E test with lifecycle management"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.stripe_mock = StripeMockService()
        cls.email_mock = EmailMockService()
        
    def setUp(self):
        """Setup for each test"""
        self.builder = TestDataBuilder()
        self.client = APIClient()
        self.assertions = PadelyzerAssertions()
        
    def tearDown(self):
        """Cleanup after each test"""
        # Clear caches
        cache.clear()
        
        # Reset mocks
        self.stripe_mock.payments.clear()
        self.email_mock.sent_emails.clear()
        
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        # Any class-level cleanup
```

### Transaction Management
```python
from django.test import TransactionTestCase

class TransactionalE2ETest(TransactionTestCase):
    """For tests requiring real transactions"""
    
    def test_concurrent_bookings(self):
        """Test race conditions in bookings"""
        with transaction.atomic():
            # Test logic here
            pass
```

## 🎯 Test Organization

### Naming Conventions
```python
# Test files
test_<module>_<feature>.py

# Test classes
class Test<Module><Feature>:
    pass

# Test methods
def test_<action>_<expected_result>_<condition>(self):
    pass

# Examples:
test_authentication_login.py
class TestAuthenticationLogin:
    def test_login_returns_jwt_when_valid_credentials(self):
        pass
```

### Test Categorization
```python
# Mark tests for selective execution
@pytest.mark.unit
def test_price_calculation():
    pass

@pytest.mark.integration
def test_api_endpoint():
    pass

@pytest.mark.e2e
def test_complete_booking_flow():
    pass

@pytest.mark.slow
def test_performance_under_load():
    pass
```

## 📊 Test Execution Strategies

### Parallel Execution
```bash
# Run tests in parallel
pytest -n auto

# Run specific test categories
pytest -m "not slow"
pytest -m "e2e"

# Run with coverage
pytest --cov=apps --cov-report=html
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
          
      - name: Install dependencies
        run: |
          pip install -r requirements/test.txt
          
      - name: Run tests
        run: |
          pytest --cov=apps --cov-report=xml
          
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

---

**Siguiente**: [Coverage Goals](03-Coverage-Goals.md) →