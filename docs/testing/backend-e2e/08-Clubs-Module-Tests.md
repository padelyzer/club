# 🏢 Clubs Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de clubes, cubriendo gestión de clubes, canchas, horarios, precios dinámicos y configuraciones avanzadas.

## 🎯 Objetivos de Testing

### Cobertura Target: 90%
- **Unit Tests**: 60% - Modelos y lógica de negocio
- **Integration Tests**: 30% - APIs y endpoints
- **E2E Tests**: 10% - Flujos completos de gestión

### Endpoints a Cubrir
- ✅ GET `/api/v1/clubs/`
- ✅ POST `/api/v1/clubs/`
- ✅ GET `/api/v1/clubs/{id}/`
- ✅ PUT `/api/v1/clubs/{id}/`
- ✅ DELETE `/api/v1/clubs/{id}/`
- ✅ GET `/api/v1/clubs/{id}/courts/`
- ✅ POST `/api/v1/clubs/{id}/courts/`
- ✅ GET `/api/v1/clubs/{id}/stats/`
- ✅ GET `/api/v1/clubs/{id}/availability/`
- ✅ POST `/api/v1/clubs/{id}/staff/invite/`

## 🧪 Unit Tests

### 1. Club Model Tests
```python
# backend/tests/unit/clubs/test_models.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.clubs.models import Club, Court, Schedule, PricingRule
from tests.factories import UserFactory, ClubFactory
from decimal import Decimal

class ClubModelTest(TestCase):
    """Test Club model functionality"""
    
    def test_club_creation(self):
        """Test basic club creation"""
        owner = UserFactory()
        club = Club.objects.create(
            name="Padel Paradise",
            slug="padel-paradise",
            address="Calle Mayor 123, Madrid",
            phone="+34600000000",
            email="info@padelparadise.com",
            description="Best padel club in Madrid"
        )
        club.owners.add(owner)
        
        self.assertEqual(str(club), "Padel Paradise")
        self.assertEqual(club.slug, "padel-paradise")
        self.assertTrue(club.is_active)
        self.assertIn(owner, club.owners.all())
    
    def test_slug_generation(self):
        """Test automatic slug generation"""
        club = Club.objects.create(
            name="Club with Spaces & Symbols!",
            address="Test Address",
            phone="+34600000000",
            email="test@club.com"
        )
        
        self.assertEqual(club.slug, "club-with-spaces-symbols")
    
    def test_unique_slug_constraint(self):
        """Test slug uniqueness"""
        ClubFactory(slug="unique-club")
        
        with self.assertRaises(ValidationError):
            club = Club(
                name="Another Club",
                slug="unique-club",
                address="Test",
                phone="+34600000000",
                email="test@test.com"
            )
            club.full_clean()
    
    def test_subscription_features(self):
        """Test subscription-based features"""
        club = ClubFactory()
        
        # Default features
        self.assertEqual(club.max_courts, 10)
        self.assertEqual(club.max_bookings_per_day, 100)
        self.assertTrue(club.can_accept_online_payments)
        
        # Update subscription
        club.subscription_tier = 'enterprise'
        club.save()
        
        self.assertEqual(club.max_courts, 50)
        self.assertEqual(club.max_bookings_per_day, 1000)
    
    def test_operating_hours(self):
        """Test club operating hours"""
        club = ClubFactory()
        schedule = Schedule.objects.create(
            club=club,
            day_of_week=1,  # Monday
            opening_time="08:00",
            closing_time="22:00",
            is_closed=False
        )
        
        # Test is_open method
        from datetime import time
        self.assertTrue(club.is_open_at(1, time(10, 0)))
        self.assertFalse(club.is_open_at(1, time(23, 0)))
        self.assertFalse(club.is_open_at(1, time(6, 0)))

class CourtModelTest(TestCase):
    """Test Court model functionality"""
    
    def setUp(self):
        self.club = ClubFactory()
    
    def test_court_creation(self):
        """Test court creation with validations"""
        court = Court.objects.create(
            club=self.club,
            name="Court 1",
            court_type="indoor",
            surface_type="artificial_grass",
            price_per_hour=Decimal("30.00"),
            is_active=True
        )
        
        self.assertEqual(str(court), f"Court 1 - {self.club.name}")
        self.assertTrue(court.is_active)
        self.assertEqual(court.price_per_hour, Decimal("30.00"))
    
    def test_court_features(self):
        """Test court features and amenities"""
        court = Court.objects.create(
            club=self.club,
            name="Premium Court",
            court_type="indoor",
            surface_type="artificial_grass",
            price_per_hour=Decimal("40.00"),
            features={
                "lighting": "LED",
                "walls": "glass",
                "has_video_recording": True,
                "has_air_conditioning": True
            }
        )
        
        self.assertTrue(court.features["has_video_recording"])
        self.assertEqual(court.features["lighting"], "LED")
    
    def test_maintenance_window(self):
        """Test court maintenance scheduling"""
        court = CourtFactory(club=self.club)
        
        # Set maintenance
        from datetime import datetime, timedelta
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        court.schedule_maintenance(start, end, "Monthly cleaning")
        
        self.assertTrue(court.is_under_maintenance(start + timedelta(hours=1)))
        self.assertFalse(court.is_under_maintenance(end + timedelta(hours=1)))

class PricingRuleTest(TestCase):
    """Test dynamic pricing rules"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club, price_per_hour=30)
    
    def test_time_based_pricing(self):
        """Test time-based pricing rules"""
        # Peak hours rule
        peak_rule = PricingRule.objects.create(
            club=self.club,
            name="Peak Hours",
            rule_type="time_based",
            conditions={
                "days": [1, 2, 3, 4, 5],  # Weekdays
                "start_time": "18:00",
                "end_time": "21:00"
            },
            price_modifier=1.5,  # 50% increase
            is_active=True
        )
        
        # Weekend rule
        weekend_rule = PricingRule.objects.create(
            club=self.club,
            name="Weekend Rate",
            rule_type="time_based",
            conditions={
                "days": [6, 7],  # Weekend
                "all_day": True
            },
            price_modifier=1.2,  # 20% increase
            is_active=True
        )
        
        # Test price calculation
        from datetime import datetime
        weekday_peak = datetime(2024, 1, 15, 19, 0)  # Monday 7 PM
        weekday_normal = datetime(2024, 1, 15, 10, 0)  # Monday 10 AM
        weekend = datetime(2024, 1, 20, 15, 0)  # Saturday 3 PM
        
        self.assertEqual(
            self.court.calculate_price(weekday_peak),
            Decimal("45.00")  # 30 * 1.5
        )
        self.assertEqual(
            self.court.calculate_price(weekday_normal),
            Decimal("30.00")  # Base price
        )
        self.assertEqual(
            self.court.calculate_price(weekend),
            Decimal("36.00")  # 30 * 1.2
        )
```

### 2. Business Logic Tests
```python
# backend/tests/unit/clubs/test_business_logic.py
from django.test import TestCase
from apps.clubs.services import (
    AvailabilityService,
    PricingService,
    StaffManagementService
)
from tests.factories import ClubFactory, CourtFactory, UserFactory
from datetime import datetime, date, time, timedelta

class AvailabilityServiceTest(TestCase):
    """Test availability calculation logic"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club)
        self.service = AvailabilityService()
    
    def test_get_available_slots(self):
        """Test getting available time slots"""
        # Set club hours: 8 AM to 10 PM
        Schedule.objects.create(
            club=self.club,
            day_of_week=1,  # Monday
            opening_time="08:00",
            closing_time="22:00"
        )
        
        # Get available slots for Monday
        target_date = date(2024, 1, 15)  # Monday
        slots = self.service.get_available_slots(
            self.court,
            target_date,
            duration_minutes=60
        )
        
        # Should have slots from 8 AM to 9 PM (last slot)
        self.assertEqual(len(slots), 14)
        self.assertEqual(slots[0]["time"], "08:00")
        self.assertEqual(slots[-1]["time"], "21:00")
    
    def test_availability_with_existing_bookings(self):
        """Test availability considering existing bookings"""
        from apps.reservations.models import Reservation
        
        # Create existing bookings
        Reservation.objects.create(
            court=self.court,
            user=UserFactory(),
            start_time=datetime(2024, 1, 15, 10, 0),
            end_time=datetime(2024, 1, 15, 11, 30),
            status='confirmed'
        )
        
        target_date = date(2024, 1, 15)
        slots = self.service.get_available_slots(
            self.court,
            target_date,
            duration_minutes=60
        )
        
        # 10:00 and 11:00 slots should not be available
        available_times = [slot["time"] for slot in slots if slot["available"]]
        self.assertNotIn("10:00", available_times)
        self.assertNotIn("11:00", available_times)
        self.assertIn("09:00", available_times)
        self.assertIn("12:00", available_times)

class PricingServiceTest(TestCase):
    """Test pricing calculation service"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club, price_per_hour=30)
        self.service = PricingService()
    
    def test_calculate_booking_price(self):
        """Test booking price calculation"""
        # Regular booking
        start = datetime(2024, 1, 15, 10, 0)
        end = datetime(2024, 1, 15, 11, 30)  # 1.5 hours
        
        price = self.service.calculate_booking_price(
            self.court,
            start,
            end
        )
        
        self.assertEqual(price, Decimal("45.00"))  # 30 * 1.5
    
    def test_member_discount(self):
        """Test member discount application"""
        member = UserFactory()
        self.club.members.add(member)
        
        # Set member discount
        self.club.member_discount_percentage = 20
        self.club.save()
        
        start = datetime(2024, 1, 15, 10, 0)
        end = datetime(2024, 1, 15, 11, 0)
        
        price = self.service.calculate_booking_price(
            self.court,
            start,
            end,
            user=member
        )
        
        self.assertEqual(price, Decimal("24.00"))  # 30 * 0.8
    
    def test_package_pricing(self):
        """Test package/bundle pricing"""
        # Create a 10-session package
        package = Package.objects.create(
            club=self.club,
            name="10 Session Bundle",
            sessions=10,
            price=Decimal("250.00"),  # €25 per session
            validity_days=60
        )
        
        # Calculate savings
        regular_price = self.court.price_per_hour * 10
        savings = regular_price - package.price
        savings_percentage = (savings / regular_price) * 100
        
        self.assertEqual(savings, Decimal("50.00"))
        self.assertAlmostEqual(savings_percentage, Decimal("16.67"), places=2)
```

### 3. Validation Tests
```python
# backend/tests/unit/clubs/test_validators.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.clubs.validators import (
    validate_phone_number,
    validate_court_capacity,
    validate_operating_hours,
    validate_price
)

class ClubValidatorsTest(TestCase):
    """Test club-specific validators"""
    
    def test_spanish_phone_validation(self):
        """Test Spanish phone number validation"""
        valid_phones = [
            "+34600000000",
            "+34 600 00 00 00",
            "600000000",
            "912345678"  # Landline
        ]
        
        for phone in valid_phones:
            # Should not raise
            validate_phone_number(phone)
        
        invalid_phones = [
            "123",
            "+44600000000",  # UK number
            "not-a-phone"
        ]
        
        for phone in invalid_phones:
            with self.assertRaises(ValidationError):
                validate_phone_number(phone)
    
    def test_court_capacity_validation(self):
        """Test court capacity validation"""
        # Valid capacities
        validate_court_capacity(2)  # Singles
        validate_court_capacity(4)  # Doubles
        
        # Invalid capacities
        with self.assertRaises(ValidationError):
            validate_court_capacity(3)
        with self.assertRaises(ValidationError):
            validate_court_capacity(5)
    
    def test_operating_hours_validation(self):
        """Test operating hours validation"""
        # Valid hours
        validate_operating_hours("08:00", "22:00")
        validate_operating_hours("06:00", "23:30")
        
        # Invalid - closing before opening
        with self.assertRaises(ValidationError):
            validate_operating_hours("22:00", "08:00")
        
        # Invalid - same time
        with self.assertRaises(ValidationError):
            validate_operating_hours("10:00", "10:00")
        
        # Invalid format
        with self.assertRaises(ValidationError):
            validate_operating_hours("8:00", "22:00")  # Missing leading zero
```

## 🔌 Integration Tests

### 1. Club CRUD Tests
```python
# backend/tests/integration/clubs/test_club_crud.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, ClubFactory
from django.contrib.auth import get_user_model

User = get_user_model()

class ClubCRUDTest(APITestCase):
    """Test Club CRUD operations"""
    
    def setUp(self):
        self.owner = UserFactory()
        self.owner.set_password('TestPass123!')
        self.owner.save()
        
        self.client.force_authenticate(user=self.owner)
    
    def test_create_club(self):
        """Test club creation"""
        data = {
            "name": "New Padel Club",
            "address": "Calle Test 123, Madrid",
            "phone": "+34600000000",
            "email": "info@newclub.com",
            "description": "Amazing new club",
            "subscription_tier": "professional"
        }
        
        response = self.client.post('/api/v1/clubs/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], "New Padel Club")
        self.assertEqual(response.data['slug'], "new-padel-club")
        self.assertIn('id', response.data)
        
        # Check owner is assigned
        club = Club.objects.get(id=response.data['id'])
        self.assertIn(self.owner, club.owners.all())
    
    def test_list_clubs(self):
        """Test listing clubs with filters"""
        # Create test clubs
        club1 = ClubFactory(name="Madrid Padel", city="Madrid")
        club2 = ClubFactory(name="Barcelona Padel", city="Barcelona")
        club3 = ClubFactory(name="Valencia Padel", city="Valencia", is_active=False)
        
        # List all active clubs
        response = self.client.get('/api/v1/clubs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)  # Only active clubs
        
        # Filter by city
        response = self.client.get('/api/v1/clubs/', {'city': 'Madrid'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], "Madrid Padel")
        
        # Search
        response = self.client.get('/api/v1/clubs/', {'search': 'Barcelona'})
        self.assertEqual(response.data['count'], 1)
    
    def test_update_club(self):
        """Test club update"""
        club = ClubFactory()
        club.owners.add(self.owner)
        
        data = {
            "name": "Updated Club Name",
            "description": "Updated description"
        }
        
        response = self.client.patch(f'/api/v1/clubs/{club.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Updated Club Name")
        
        # Verify slug doesn't change
        self.assertEqual(response.data['slug'], club.slug)
    
    def test_delete_club(self):
        """Test club soft delete"""
        club = ClubFactory()
        club.owners.add(self.owner)
        
        response = self.client.delete(f'/api/v1/clubs/{club.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify soft delete
        club.refresh_from_db()
        self.assertFalse(club.is_active)
        
        # Should not appear in list
        response = self.client.get('/api/v1/clubs/')
        club_ids = [c['id'] for c in response.data['results']]
        self.assertNotIn(str(club.id), club_ids)
    
    def test_permissions(self):
        """Test club permissions"""
        other_user = UserFactory()
        club = ClubFactory()
        club.owners.add(self.owner)
        
        # Other user can read
        self.client.force_authenticate(user=other_user)
        response = self.client.get(f'/api/v1/clubs/{club.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # But cannot update
        response = self.client.patch(
            f'/api/v1/clubs/{club.id}/',
            {"name": "Hacked Name"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

### 2. Court Management Tests
```python
# backend/tests/integration/clubs/test_court_management.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import ClubFactory, CourtFactory, UserFactory
from decimal import Decimal

class CourtManagementTest(APITestCase):
    """Test court management endpoints"""
    
    def setUp(self):
        self.owner = UserFactory()
        self.club = ClubFactory()
        self.club.owners.add(self.owner)
        self.client.force_authenticate(user=self.owner)
    
    def test_create_court(self):
        """Test creating a court"""
        data = {
            "name": "Court 1",
            "court_type": "indoor",
            "surface_type": "artificial_grass",
            "price_per_hour": "35.00",
            "features": {
                "lighting": "LED",
                "has_air_conditioning": True
            }
        }
        
        response = self.client.post(
            f'/api/v1/clubs/{self.club.id}/courts/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], "Court 1")
        self.assertEqual(Decimal(response.data['price_per_hour']), Decimal("35.00"))
        self.assertEqual(response.data['features']['lighting'], "LED")
    
    def test_list_club_courts(self):
        """Test listing courts for a club"""
        # Create courts
        court1 = CourtFactory(club=self.club, name="Court A", price_per_hour=30)
        court2 = CourtFactory(club=self.club, name="Court B", price_per_hour=40)
        court3 = CourtFactory(club=self.club, name="Court C", is_active=False)
        
        response = self.client.get(f'/api/v1/clubs/{self.club.id}/courts/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Only active courts
        
        # Check ordering by name
        self.assertEqual(response.data[0]['name'], "Court A")
        self.assertEqual(response.data[1]['name'], "Court B")
    
    def test_update_court_pricing(self):
        """Test updating court pricing"""
        court = CourtFactory(club=self.club, price_per_hour=30)
        
        data = {
            "price_per_hour": "40.00",
            "peak_price_per_hour": "50.00"
        }
        
        response = self.client.patch(
            f'/api/v1/courts/{court.id}/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Decimal(response.data['price_per_hour']),
            Decimal("40.00")
        )
    
    def test_court_availability_check(self):
        """Test checking court availability"""
        court = CourtFactory(club=self.club)
        
        # Add schedule
        Schedule.objects.create(
            club=self.club,
            day_of_week=1,  # Monday
            opening_time="08:00",
            closing_time="22:00"
        )
        
        response = self.client.get(
            f'/api/v1/courts/{court.id}/availability/',
            {'date': '2024-01-15'}  # Monday
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('slots', response.data)
        self.assertGreater(len(response.data['slots']), 0)
```

### 3. Club Statistics Tests
```python
# backend/tests/integration/clubs/test_club_statistics.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import ClubFactory, CourtFactory, UserFactory
from apps.reservations.models import Reservation
from apps.finance.models import Payment
from datetime import datetime, timedelta
from decimal import Decimal

class ClubStatisticsTest(APITestCase):
    """Test club statistics endpoints"""
    
    def setUp(self):
        self.owner = UserFactory()
        self.club = ClubFactory()
        self.club.owners.add(self.owner)
        self.court = CourtFactory(club=self.club, price_per_hour=30)
        self.client.force_authenticate(user=self.owner)
        
        # Create test data
        self._create_test_reservations()
    
    def _create_test_reservations(self):
        """Create test reservations for statistics"""
        # Create reservations for the past 30 days
        for i in range(30):
            date = datetime.now() - timedelta(days=i)
            if date.weekday() < 5:  # Weekdays only
                user = UserFactory()
                reservation = Reservation.objects.create(
                    court=self.court,
                    user=user,
                    start_time=date.replace(hour=18, minute=0),
                    end_time=date.replace(hour=19, minute=0),
                    price=Decimal("30.00"),
                    status='completed'
                )
                
                # Create payment
                Payment.objects.create(
                    reservation=reservation,
                    amount=Decimal("30.00"),
                    status='completed',
                    payment_method='card'
                )
    
    def test_club_overview_stats(self):
        """Test club overview statistics"""
        response = self.client.get(f'/api/v1/clubs/{self.club.id}/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data
        self.assertIn('total_revenue', stats)
        self.assertIn('total_bookings', stats)
        self.assertIn('occupancy_rate', stats)
        self.assertIn('average_booking_value', stats)
        self.assertIn('popular_time_slots', stats)
    
    def test_revenue_breakdown(self):
        """Test revenue breakdown by period"""
        response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/stats/revenue/',
            {'period': 'monthly'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current_month', response.data)
        self.assertIn('previous_month', response.data)
        self.assertIn('growth_percentage', response.data)
    
    def test_occupancy_analysis(self):
        """Test occupancy analysis"""
        response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/stats/occupancy/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn('by_day_of_week', data)
        self.assertIn('by_hour', data)
        self.assertIn('peak_hours', data)
        self.assertIn('low_demand_slots', data)
```

## 🔄 E2E Flow Tests

### 1. Complete Club Setup Flow
```python
# backend/tests/e2e/clubs/test_club_setup_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

class ClubSetupFlowE2ETest(TestCase):
    """Test complete club setup flow"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create and authenticate club owner
        self.owner = User.objects.create_user(
            email='owner@padelclub.com',
            password='SecurePass123!',
            first_name='Club',
            last_name='Owner'
        )
        self.client.force_authenticate(user=self.owner)
    
    def test_complete_club_setup_flow(self):
        """Test complete flow: Create club → Add courts → Set schedule → Configure pricing → Go live"""
        
        # Step 1: Create club
        club_data = {
            "name": "Elite Padel Madrid",
            "address": "Calle Serrano 100, Madrid",
            "phone": "+34911234567",
            "email": "info@elitepadel.com",
            "description": "Premium padel club in Madrid",
            "subscription_tier": "professional"
        }
        
        club_response = self.client.post('/api/v1/clubs/', club_data)
        self.assertEqual(club_response.status_code, 201)
        club_id = club_response.data['id']
        
        # Step 2: Add multiple courts
        courts = []
        for i in range(4):
            court_data = {
                "name": f"Court {i+1}",
                "court_type": "indoor" if i < 2 else "outdoor",
                "surface_type": "artificial_grass",
                "price_per_hour": "35.00" if i < 2 else "30.00",
                "features": {
                    "lighting": "LED",
                    "has_air_conditioning": i < 2,
                    "has_video_recording": i == 0
                }
            }
            
            court_response = self.client.post(
                f'/api/v1/clubs/{club_id}/courts/',
                court_data,
                format='json'
            )
            self.assertEqual(court_response.status_code, 201)
            courts.append(court_response.data)
        
        # Step 3: Set operating schedule
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for i, day in enumerate(days, 1):
            schedule_data = {
                "day_of_week": i,
                "opening_time": "08:00" if i < 6 else "09:00",  # Later opening on weekends
                "closing_time": "22:00" if i < 6 else "21:00",
                "is_closed": False
            }
            
            schedule_response = self.client.post(
                f'/api/v1/clubs/{club_id}/schedules/',
                schedule_data
            )
            self.assertEqual(schedule_response.status_code, 201)
        
        # Step 4: Configure dynamic pricing
        # Peak hours pricing
        peak_pricing = {
            "name": "Peak Hours",
            "rule_type": "time_based",
            "conditions": {
                "days": [1, 2, 3, 4, 5],  # Weekdays
                "start_time": "18:00",
                "end_time": "21:00"
            },
            "price_modifier": 1.3,  # 30% increase
            "is_active": True
        }
        
        pricing_response = self.client.post(
            f'/api/v1/clubs/{club_id}/pricing-rules/',
            peak_pricing,
            format='json'
        )
        self.assertEqual(pricing_response.status_code, 201)
        
        # Weekend pricing
        weekend_pricing = {
            "name": "Weekend Rate",
            "rule_type": "time_based",
            "conditions": {
                "days": [6, 7],
                "all_day": True
            },
            "price_modifier": 1.2,  # 20% increase
            "is_active": True
        }
        
        weekend_response = self.client.post(
            f'/api/v1/clubs/{club_id}/pricing-rules/',
            weekend_pricing,
            format='json'
        )
        self.assertEqual(weekend_response.status_code, 201)
        
        # Step 5: Invite staff members
        staff_data = {
            "email": "manager@elitepadel.com",
            "role": "manager",
            "permissions": ["manage_bookings", "view_reports", "manage_courts"]
        }
        
        staff_response = self.client.post(
            f'/api/v1/clubs/{club_id}/staff/invite/',
            staff_data
        )
        self.assertEqual(staff_response.status_code, 201)
        
        # Step 6: Configure payment settings
        payment_settings = {
            "accept_online_payments": True,
            "payment_methods": ["card", "cash"],
            "require_deposit": True,
            "deposit_percentage": 50,
            "cancellation_policy": {
                "free_cancellation_hours": 24,
                "late_cancellation_fee": 50  # 50% of booking
            }
        }
        
        settings_response = self.client.patch(
            f'/api/v1/clubs/{club_id}/settings/',
            payment_settings,
            format='json'
        )
        self.assertEqual(settings_response.status_code, 200)
        
        # Step 7: Activate club (go live)
        activate_response = self.client.post(
            f'/api/v1/clubs/{club_id}/activate/'
        )
        self.assertEqual(activate_response.status_code, 200)
        
        # Verify final club state
        final_club = self.client.get(f'/api/v1/clubs/{club_id}/')
        self.assertEqual(final_club.status_code, 200)
        self.assertTrue(final_club.data['is_active'])
        self.assertEqual(len(final_club.data['courts']), 4)
        self.assertTrue(final_club.data['accept_online_payments'])
```

### 2. Multi-Location Management Flow
```python
# backend/tests/e2e/clubs/test_multi_location_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from apps.clubs.models import Club

class MultiLocationFlowE2ETest(TestCase):
    """Test multi-location club management"""
    
    def setUp(self):
        self.client = APIClient()
        self.owner = UserFactory()
        self.client.force_authenticate(user=self.owner)
    
    def test_multi_location_setup(self):
        """Test setting up multiple club locations"""
        
        # Step 1: Create parent organization
        parent_data = {
            "name": "Padel Chain España",
            "is_chain": True,
            "subscription_tier": "enterprise"
        }
        
        parent_response = self.client.post('/api/v1/clubs/', parent_data)
        self.assertEqual(parent_response.status_code, 201)
        parent_id = parent_response.data['id']
        
        # Step 2: Create multiple locations
        locations = [
            {
                "name": "Padel Chain Madrid Centro",
                "address": "Gran Vía 50, Madrid",
                "city": "Madrid",
                "parent_club": parent_id
            },
            {
                "name": "Padel Chain Madrid Norte",
                "address": "Calle Alcalá 500, Madrid",
                "city": "Madrid",
                "parent_club": parent_id
            },
            {
                "name": "Padel Chain Barcelona",
                "address": "Passeig de Gràcia 100, Barcelona",
                "city": "Barcelona",
                "parent_club": parent_id
            }
        ]
        
        location_ids = []
        for location_data in locations:
            response = self.client.post('/api/v1/clubs/', location_data)
            self.assertEqual(response.status_code, 201)
            location_ids.append(response.data['id'])
        
        # Step 3: Apply chain-wide settings
        chain_settings = {
            "chain_wide_settings": {
                "branding": {
                    "primary_color": "#1E40AF",
                    "logo_url": "https://example.com/logo.png"
                },
                "pricing_policy": "synchronized",
                "member_benefits": "cross_location"
            }
        }
        
        settings_response = self.client.patch(
            f'/api/v1/clubs/{parent_id}/chain-settings/',
            chain_settings,
            format='json'
        )
        self.assertEqual(settings_response.status_code, 200)
        
        # Step 4: Get consolidated statistics
        stats_response = self.client.get(
            f'/api/v1/clubs/{parent_id}/chain-stats/'
        )
        self.assertEqual(stats_response.status_code, 200)
        
        stats = stats_response.data
        self.assertEqual(stats['total_locations'], 3)
        self.assertIn('revenue_by_location', stats)
        self.assertIn('total_courts', stats)
        self.assertIn('total_members', stats)
```

### 3. Advanced Configuration Flow
```python
# backend/tests/e2e/clubs/test_advanced_configuration.py
from django.test import TestCase
from rest_framework.test import APIClient

class AdvancedConfigurationE2ETest(TestCase):
    """Test advanced club configuration features"""
    
    def setUp(self):
        self.client = APIClient()
        self.club = ClubFactory()
        self.owner = UserFactory()
        self.club.owners.add(self.owner)
        self.client.force_authenticate(user=self.owner)
    
    def test_tournament_mode_configuration(self):
        """Test configuring club for tournament mode"""
        
        # Step 1: Enable tournament features
        tournament_config = {
            "features": {
                "tournaments_enabled": True,
                "max_concurrent_tournaments": 2,
                "tournament_court_allocation": "dynamic"
            }
        }
        
        response = self.client.patch(
            f'/api/v1/clubs/{self.club.id}/features/',
            tournament_config,
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        
        # Step 2: Create tournament courts configuration
        tournament_courts = {
            "tournament_courts": [1, 2, 3, 4],  # Court IDs
            "spectator_areas": True,
            "live_scoring_enabled": True,
            "streaming_enabled": True
        }
        
        courts_response = self.client.post(
            f'/api/v1/clubs/{self.club.id}/tournament-setup/',
            tournament_courts,
            format='json'
        )
        self.assertEqual(courts_response.status_code, 201)
    
    def test_membership_program_setup(self):
        """Test setting up membership program"""
        
        # Create membership tiers
        membership_tiers = [
            {
                "name": "Basic Member",
                "monthly_fee": "49.00",
                "benefits": {
                    "discount_percentage": 10,
                    "advance_booking_days": 7,
                    "free_classes_per_month": 1
                }
            },
            {
                "name": "Premium Member",
                "monthly_fee": "99.00",
                "benefits": {
                    "discount_percentage": 20,
                    "advance_booking_days": 14,
                    "free_classes_per_month": 4,
                    "guest_passes_per_month": 2,
                    "priority_booking": True
                }
            }
        ]
        
        for tier_data in membership_tiers:
            response = self.client.post(
                f'/api/v1/clubs/{self.club.id}/membership-tiers/',
                tier_data,
                format='json'
            )
            self.assertEqual(response.status_code, 201)
```

## 🔒 Security Tests

### Club Security Tests
```python
# backend/tests/security/clubs/test_security.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory

class ClubSecurityTest(TestCase):
    """Test club module security"""
    
    def setUp(self):
        self.client = APIClient()
        self.club = ClubFactory()
        self.owner = UserFactory()
        self.club.owners.add(self.owner)
        
        self.malicious_user = UserFactory()
        self.regular_user = UserFactory()
    
    def test_ownership_bypass_prevention(self):
        """Test prevention of ownership bypass attacks"""
        self.client.force_authenticate(user=self.malicious_user)
        
        # Try to add self as owner
        response = self.client.post(
            f'/api/v1/clubs/{self.club.id}/owners/',
            {'user_id': self.malicious_user.id}
        )
        self.assertEqual(response.status_code, 403)
        
        # Try to modify club
        response = self.client.patch(
            f'/api/v1/clubs/{self.club.id}/',
            {'name': 'Hacked Club'}
        )
        self.assertEqual(response.status_code, 403)
    
    def test_data_isolation(self):
        """Test data isolation between clubs"""
        other_club = ClubFactory()
        other_court = CourtFactory(club=other_club)
        
        self.client.force_authenticate(user=self.owner)
        
        # Should not be able to modify other club's courts
        response = self.client.patch(
            f'/api/v1/courts/{other_court.id}/',
            {'price_per_hour': '1.00'}
        )
        self.assertEqual(response.status_code, 403)
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention in search"""
        self.client.force_authenticate(user=self.regular_user)
        
        malicious_queries = [
            "'; DROP TABLE clubs;--",
            "' OR '1'='1",
            "' UNION SELECT * FROM auth_user--"
        ]
        
        for query in malicious_queries:
            response = self.client.get(
                '/api/v1/clubs/',
                {'search': query}
            )
            
            # Should handle gracefully
            self.assertEqual(response.status_code, 200)
            # Should not expose SQL errors
            self.assertNotIn('SQL', str(response.data))
```

## 📊 Performance Tests

### Club Performance Tests
```python
# backend/tests/performance/clubs/test_performance.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import ClubFactory, CourtFactory, UserFactory
import time

class ClubPerformanceTest(TestCase):
    """Test club module performance"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        self._create_bulk_data()
    
    def _create_bulk_data(self):
        """Create bulk test data"""
        # Create 50 clubs with courts
        for i in range(50):
            club = ClubFactory(name=f"Club {i}")
            # Each club has 5 courts
            for j in range(5):
                CourtFactory(club=club, name=f"Court {j+1}")
    
    def test_club_list_performance(self):
        """Test club listing performance with pagination"""
        start = time.time()
        response = self.client.get('/api/v1/clubs/?page_size=20')
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 20)
        
        # Should complete within 200ms
        self.assertLess(duration, 0.2)
    
    def test_club_search_performance(self):
        """Test search performance"""
        start = time.time()
        response = self.client.get('/api/v1/clubs/?search=Club 2')
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        
        # Search should complete within 100ms
        self.assertLess(duration, 0.1)
    
    def test_n_plus_one_prevention(self):
        """Test N+1 query prevention"""
        with self.assertNumQueries(3):  # 1 for clubs, 1 for courts, 1 for permissions
            response = self.client.get('/api/v1/clubs/?include=courts')
            
            # Force evaluation
            data = response.data['results']
            for club in data:
                # Access courts - should not trigger additional queries
                courts = club.get('courts', [])
                self.assertIsInstance(courts, list)
```

## 🎯 Test Execution Commands

### Run All Club Tests
```bash
# Unit tests only
pytest tests/unit/clubs/ -v

# Integration tests
pytest tests/integration/clubs/ -v

# E2E tests
pytest tests/e2e/clubs/ -v

# All club tests
pytest tests/ -k clubs -v

# With coverage
pytest tests/ -k clubs --cov=apps.clubs --cov-report=html
```

### Run Specific Test Categories
```bash
# Security tests
pytest tests/security/clubs/ -v

# Performance tests
pytest tests/performance/clubs/ -v

# Run tests matching pattern
pytest tests/ -k "club and crud" -v
```

---

**Siguiente**: [Reservations Tests](09-Reservations-Tests.md) →