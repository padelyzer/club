# 🗄️ Database Testing Strategy

## 📋 Resumen

Esta guía define la estrategia para testing de base de datos, incluyendo aislamiento de datos, fixtures, transacciones y optimización de rendimiento.

## 🎯 Principios de Testing de Base de Datos

### 1. **Aislamiento de Datos**
- Cada test debe ser independiente
- No debe haber dependencias entre tests
- Los datos de test deben limpiarse automáticamente
- No afectar datos de otros tests

### 2. **Rendimiento**
- Usar transacciones para rollback automático
- Minimizar el número de queries
- Usar bases de datos en memoria cuando sea posible
- Cachear fixtures comunes

### 3. **Realismo**
- Los datos de test deben ser realistas
- Respetar constraints y validaciones
- Simular escenarios del mundo real
- Incluir edge cases

## 🏗️ Configuración de Base de Datos para Tests

### 1. Base de Datos en Memoria (SQLite)
```python
# backend/config/settings/test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 20,
        }
    }
}

# Optimizaciones para SQLite en tests
DATABASES['default']['OPTIONS'].update({
    'init_command': """
        PRAGMA journal_mode=MEMORY;
        PRAGMA synchronous=OFF;
        PRAGMA foreign_keys=ON;
        PRAGMA temp_store=MEMORY;
        PRAGMA mmap_size=134217728;
        PRAGMA cache_size=10000;
        PRAGMA locking_mode=EXCLUSIVE;
    """
})
```

### 2. PostgreSQL para Tests de Integración
```python
# backend/config/settings/integration_test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'padelyzer_test',
        'USER': 'padelyzer_test',
        'PASSWORD': 'test_password',
        'HOST': 'localhost',
        'PORT': '5433',  # Different port for test DB
        'OPTIONS': {
            'options': '-c default_transaction_isolation=serializable'
        },
        'TEST': {
            'NAME': 'test_padelyzer',
            'CHARSET': 'utf8',
            'TEMPLATE': 'template0',
            'CREATE_DB': True,
            'USER': 'postgres',
            'PASSWORD': 'postgres',
        }
    }
}
```

### 3. Test Database Router
```python
# backend/tests/db_router.py
class TestDatabaseRouter:
    """
    Route test models to test database
    """
    def db_for_read(self, model, **hints):
        if 'test' in model._meta.app_label:
            return 'test'
        return None

    def db_for_write(self, model, **hints):
        if 'test' in model._meta.app_label:
            return 'test'
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == 'test':
            return app_label == 'test'
        return None
```

## 🧪 Estrategias de Testing

### 1. Transaction Test Cases
```python
# backend/tests/test_transactions.py
from django.test import TransactionTestCase
from django.db import transaction

class ReservationTransactionTest(TransactionTestCase):
    """Test transaction behavior for reservations"""
    
    def test_concurrent_booking_prevention(self):
        """Test that concurrent bookings are prevented"""
        court = CourtFactory()
        user1 = UserFactory()
        user2 = UserFactory()
        
        # Simulate concurrent requests
        with transaction.atomic():
            # User 1 starts booking
            reservation1 = Reservation.objects.create(
                court=court,
                user=user1,
                start_time=timezone.now() + timedelta(hours=1),
                end_time=timezone.now() + timedelta(hours=2)
            )
            
            # User 2 tries to book same slot
            with self.assertRaises(ValidationError):
                Reservation.objects.create(
                    court=court,
                    user=user2,
                    start_time=timezone.now() + timedelta(hours=1),
                    end_time=timezone.now() + timedelta(hours=2)
                )
```

### 2. Database Fixtures Strategy
```python
# backend/tests/fixtures/base_fixtures.py
import json
from pathlib import Path

class FixtureManager:
    """Manage test fixtures efficiently"""
    
    FIXTURES_DIR = Path(__file__).parent / 'data'
    
    @classmethod
    def load_fixture(cls, name: str):
        """Load fixture from JSON file"""
        file_path = cls.FIXTURES_DIR / f"{name}.json"
        with open(file_path, 'r') as f:
            return json.load(f)
    
    @classmethod
    def create_base_data(cls):
        """Create base data for all tests"""
        # Create users
        users_data = cls.load_fixture('users')
        users = [User.objects.create(**data) for data in users_data]
        
        # Create clubs
        clubs_data = cls.load_fixture('clubs')
        clubs = [Club.objects.create(**data) for data in clubs_data]
        
        return {
            'users': users,
            'clubs': clubs
        }

# backend/tests/fixtures/data/users.json
[
    {
        "email": "admin@padelyzer.com",
        "first_name": "Admin",
        "last_name": "User",
        "is_staff": true,
        "is_superuser": true
    },
    {
        "email": "player1@padelyzer.com",
        "first_name": "Player",
        "last_name": "One",
        "is_active": true
    }
]
```

### 3. Data Factories con Faker
```python
# backend/tests/factories/advanced_factories.py
import factory
from factory import fuzzy
from faker import Faker
from decimal import Decimal

fake = Faker('es_ES')  # Spanish locale

class AdvancedClubFactory(ClubFactory):
    """Advanced club factory with realistic data"""
    
    # Realistic Spanish addresses
    address = factory.LazyAttribute(
        lambda _: f"{fake.street_address()}, {fake.city()}, {fake.postcode()} {fake.state()}"
    )
    
    # Spanish phone numbers
    phone = factory.LazyAttribute(lambda _: fake.phone_number())
    
    # Business hours
    opening_time = fuzzy.FuzzyChoice(['08:00', '09:00', '10:00'])
    closing_time = fuzzy.FuzzyChoice(['20:00', '21:00', '22:00'])
    
    # Subscription tier
    subscription_tier = fuzzy.FuzzyChoice(['basic', 'pro', 'enterprise'])
    
    # Settings
    settings = factory.Dict({
        'allow_cancellations': True,
        'cancellation_hours': fuzzy.FuzzyInteger(2, 48),
        'require_payment': True,
        'booking_advance_days': fuzzy.FuzzyInteger(7, 30),
        'min_booking_duration': 60,
        'currency': 'EUR',
    })

class RealisticReservationFactory(factory.django.DjangoModelFactory):
    """Create realistic reservations"""
    
    class Meta:
        model = Reservation
    
    court = factory.SubFactory(CourtFactory)
    user = factory.SubFactory(UserFactory)
    
    # Realistic time slots
    @factory.lazy_attribute
    def start_time(self):
        # Generate times in 30-minute intervals
        hour = fake.random_int(min=8, max=20)
        minute = fake.random_element([0, 30])
        date = fake.future_date(end_date='+30d')
        return timezone.make_aware(
            timezone.datetime.combine(date, timezone.time(hour, minute))
        )
    
    @factory.lazy_attribute
    def end_time(self):
        # 60 or 90 minute sessions
        duration = fake.random_element([60, 90])
        return self.start_time + timedelta(minutes=duration)
    
    # Realistic pricing
    price = factory.LazyAttribute(
        lambda obj: Decimal(str(fake.random_int(min=20, max=50)))
    )
    
    status = fuzzy.FuzzyChoice(['confirmed', 'pending'])
    
    # Payment info
    payment_status = factory.LazyAttribute(
        lambda obj: 'paid' if obj.status == 'confirmed' else 'pending'
    )
```

## 🔄 Test Data Lifecycle

### 1. Setup and Teardown
```python
# backend/tests/test_base_with_lifecycle.py
class TestWithDataLifecycle(TestCase):
    """Base test with proper data lifecycle management"""
    
    @classmethod
    def setUpTestData(cls):
        """Create data once for all tests in class"""
        # This data is wrapped in a transaction and rolled back
        cls.base_club = ClubFactory()
        cls.base_courts = [
            CourtFactory(club=cls.base_club) for _ in range(3)
        ]
    
    def setUp(self):
        """Run before each test method"""
        # Create test-specific data
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        
        # Track created objects for cleanup
        self.created_objects = []
    
    def tearDown(self):
        """Clean up after each test"""
        # Clean any files created
        for obj in self.created_objects:
            if hasattr(obj, 'delete'):
                obj.delete()
        
        # Clear cache
        cache.clear()
        
        # Reset sequences
        self.reset_sequences()
    
    def reset_sequences(self):
        """Reset database sequences"""
        from django.db import connection
        with connection.cursor() as cursor:
            # PostgreSQL
            if connection.vendor == 'postgresql':
                cursor.execute("""
                    SELECT setval(pg_get_serial_sequence(tablename, 'id'), 1, false)
                    FROM pg_tables
                    WHERE schemaname = 'public'
                """)
```

### 2. Bulk Data Creation
```python
# backend/tests/utils/bulk_data.py
class BulkDataCreator:
    """Efficiently create large amounts of test data"""
    
    @staticmethod
    def create_clubs_with_courts(count: int = 10, courts_per_club: int = 5):
        """Bulk create clubs with courts"""
        clubs = []
        courts = []
        
        # Prepare club data
        for i in range(count):
            clubs.append(Club(
                name=f"Club {i}",
                slug=f"club-{i}",
                address=f"Address {i}",
                phone=f"+34600{i:06d}",
                email=f"club{i}@test.com"
            ))
        
        # Bulk create clubs
        Club.objects.bulk_create(clubs)
        
        # Prepare court data
        for club in Club.objects.all():
            for j in range(courts_per_club):
                courts.append(Court(
                    club=club,
                    name=f"Court {j+1}",
                    court_type='indoor',
                    price_per_hour=30
                ))
        
        # Bulk create courts
        Court.objects.bulk_create(courts)
        
        return clubs, courts
    
    @staticmethod
    def create_reservations_batch(user, court, days: int = 30):
        """Create batch of reservations"""
        reservations = []
        base_date = timezone.now().date()
        
        for day in range(days):
            date = base_date + timedelta(days=day)
            # Morning slot
            reservations.append(Reservation(
                user=user,
                court=court,
                start_time=timezone.make_aware(
                    datetime.combine(date, time(10, 0))
                ),
                end_time=timezone.make_aware(
                    datetime.combine(date, time(11, 0))
                ),
                price=30,
                status='confirmed'
            ))
        
        return Reservation.objects.bulk_create(reservations)
```

## 🎭 Mocking Database Operations

### 1. Query Count Assertions
```python
# backend/tests/test_performance.py
from django.test.utils import override_settings
from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext

class DatabasePerformanceTest(TestCase):
    """Test database query performance"""
    
    def test_club_list_query_count(self):
        """Test that club list doesn't have N+1 queries"""
        # Create test data
        clubs = [ClubFactory() for _ in range(10)]
        for club in clubs:
            CourtFactory.create_batch(5, club=club)
        
        # Capture queries
        with CaptureQueriesContext(connection) as context:
            response = self.client.get('/api/v1/clubs/')
            
        # Assert query count is constant
        self.assertLessEqual(
            len(context.captured_queries), 
            3,  # 1 for clubs, 1 for courts, 1 for permissions
            f"Too many queries: {len(context.captured_queries)}"
        )
    
    def test_prefetch_related_optimization(self):
        """Test that prefetch_related is used correctly"""
        ClubFactory.create_batch(10)
        
        with self.assertNumQueries(2):  # 1 for clubs, 1 for courts
            clubs = Club.objects.prefetch_related('courts').all()
            # Force evaluation
            for club in clubs:
                list(club.courts.all())
```

### 2. Database Triggers and Signals
```python
# backend/tests/test_signals.py
from django.db.models.signals import post_save
from django.test import TestCase
from unittest.mock import patch

class SignalTestCase(TestCase):
    """Test database signals"""
    
    @patch('apps.clubs.signals.notify_club_created')
    def test_club_creation_signal(self, mock_notify):
        """Test that creating a club triggers notification"""
        club = ClubFactory()
        
        # Assert signal was called
        mock_notify.assert_called_once()
        
        # Assert correct arguments
        call_args = mock_notify.call_args[1]
        self.assertEqual(call_args['instance'], club)
        self.assertTrue(call_args['created'])
```

## 🔍 Database State Verification

### 1. Complex State Assertions
```python
# backend/tests/utils/db_assertions.py
class DatabaseAssertions:
    """Custom assertions for database state"""
    
    @staticmethod
    def assert_reservation_state(reservation_id, expected_state):
        """Assert complete reservation state"""
        reservation = Reservation.objects.select_related(
            'user', 'court', 'court__club'
        ).get(id=reservation_id)
        
        # Basic assertions
        assert reservation.status == expected_state['status']
        assert reservation.payment_status == expected_state['payment_status']
        
        # Related data assertions
        if expected_state.get('user_notified'):
            assert reservation.user.notifications.filter(
                type='reservation_confirmation',
                related_object_id=reservation_id
            ).exists()
        
        # Financial assertions
        if expected_state['status'] == 'confirmed':
            assert Transaction.objects.filter(
                reservation=reservation,
                type='payment',
                status='completed'
            ).exists()
```

### 2. Data Integrity Tests
```python
# backend/tests/test_data_integrity.py
class DataIntegrityTest(TestCase):
    """Test database constraints and integrity"""
    
    def test_cascade_deletion(self):
        """Test cascade deletion works correctly"""
        club = ClubFactory()
        courts = CourtFactory.create_batch(3, club=club)
        reservations = []
        
        for court in courts:
            reservations.extend(
                ReservationFactory.create_batch(2, court=court)
            )
        
        # Delete club
        club_id = club.id
        club.delete()
        
        # Assert cascaded deletions
        self.assertFalse(Club.objects.filter(id=club_id).exists())
        self.assertFalse(Court.objects.filter(club_id=club_id).exists())
        self.assertEqual(
            Reservation.objects.filter(
                court_id__in=[c.id for c in courts]
            ).count(), 
            0
        )
    
    def test_unique_constraints(self):
        """Test unique constraints are enforced"""
        club = ClubFactory(slug='unique-club')
        
        # Try to create duplicate
        with self.assertRaises(IntegrityError):
            ClubFactory(slug='unique-club')
```

## 📊 Test Database Metrics

### Query Performance Tracking
```python
# backend/tests/utils/performance_tracker.py
import time
from contextlib import contextmanager

class PerformanceTracker:
    """Track database performance metrics"""
    
    def __init__(self):
        self.metrics = []
    
    @contextmanager
    def track_query_time(self, operation_name):
        """Track time for database operation"""
        start = time.time()
        initial_queries = len(connection.queries)
        
        yield
        
        duration = time.time() - start
        query_count = len(connection.queries) - initial_queries
        
        self.metrics.append({
            'operation': operation_name,
            'duration': duration,
            'query_count': query_count,
            'queries_per_second': query_count / duration if duration > 0 else 0
        })
    
    def get_report(self):
        """Generate performance report"""
        return {
            'total_operations': len(self.metrics),
            'total_duration': sum(m['duration'] for m in self.metrics),
            'total_queries': sum(m['query_count'] for m in self.metrics),
            'slowest_operations': sorted(
                self.metrics, 
                key=lambda x: x['duration'], 
                reverse=True
            )[:5]
        }
```

## 🛡️ Best Practices

### 1. **Use Transactions Wisely**
- Wrap each test in a transaction for speed
- Use `TransactionTestCase` only when testing transactions
- Be aware of transaction isolation levels

### 2. **Optimize Fixture Loading**
- Use `setUpTestData()` for shared data
- Create only necessary data
- Use factories instead of fixtures files

### 3. **Mock External Dependencies**
- Mock email sending
- Mock payment processing
- Mock file storage operations

### 4. **Monitor Query Count**
- Always check for N+1 queries
- Use `assertNumQueries()`
- Profile slow tests

### 5. **Clean Up Properly**
- Delete created files
- Clear cache
- Reset sequences
- Close connections

---

**Siguiente**: [Mock Services Setup](06-Mock-Services-Setup.md) →