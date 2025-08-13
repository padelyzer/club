# 📅 Reservations Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de reservas, cubriendo creación de reservas, gestión de disponibilidad, cancelaciones, reservas recurrentes y validaciones de conflictos.

## 🎯 Objetivos de Testing

### Cobertura Target: 95%
- **Unit Tests**: 60% - Lógica de disponibilidad y validaciones
- **Integration Tests**: 30% - APIs de reservas
- **E2E Tests**: 10% - Flujos completos de reserva

### Endpoints a Cubrir
- ✅ GET `/api/v1/reservations/`
- ✅ POST `/api/v1/reservations/`
- ✅ GET `/api/v1/reservations/{id}/`
- ✅ PUT `/api/v1/reservations/{id}/`
- ✅ DELETE `/api/v1/reservations/{id}/`
- ✅ POST `/api/v1/reservations/{id}/cancel/`
- ✅ POST `/api/v1/reservations/{id}/confirm/`
- ✅ GET `/api/v1/courts/{id}/availability/`
- ✅ POST `/api/v1/reservations/check-conflicts/`
- ✅ POST `/api/v1/reservations/recurring/`

## 🧪 Unit Tests

### 1. Reservation Model Tests
```python
# backend/tests/unit/reservations/test_models.py
from django.test import TestCase
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from apps.reservations.models import Reservation, RecurringReservation
from tests.factories import UserFactory, CourtFactory, ReservationFactory
from decimal import Decimal

class ReservationModelTest(TestCase):
    """Test Reservation model functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        self.court = CourtFactory(price_per_hour=30)
    
    def test_reservation_creation(self):
        """Test basic reservation creation"""
        start = timezone.now() + timedelta(hours=1)
        end = start + timedelta(hours=1)
        
        reservation = Reservation.objects.create(
            court=self.court,
            user=self.user,
            start_time=start,
            end_time=end,
            price=Decimal("30.00"),
            status='pending'
        )
        
        self.assertEqual(reservation.court, self.court)
        self.assertEqual(reservation.user, self.user)
        self.assertEqual(reservation.duration_hours, 1.0)
        self.assertEqual(str(reservation), f"{self.user} - {self.court} - {start}")
    
    def test_reservation_validation(self):
        """Test reservation time validations"""
        # Test end time before start time
        with self.assertRaises(ValidationError):
            reservation = Reservation(
                court=self.court,
                user=self.user,
                start_time=timezone.now() + timedelta(hours=2),
                end_time=timezone.now() + timedelta(hours=1),
                price=Decimal("30.00")
            )
            reservation.full_clean()
        
        # Test reservation in the past
        with self.assertRaises(ValidationError):
            reservation = Reservation(
                court=self.court,
                user=self.user,
                start_time=timezone.now() - timedelta(hours=2),
                end_time=timezone.now() - timedelta(hours=1),
                price=Decimal("30.00")
            )
            reservation.full_clean()
    
    def test_duration_calculations(self):
        """Test duration calculation methods"""
        start = timezone.now() + timedelta(hours=1)
        
        # 1 hour reservation
        reservation = ReservationFactory(
            start_time=start,
            end_time=start + timedelta(minutes=60)
        )
        self.assertEqual(reservation.duration_hours, 1.0)
        self.assertEqual(reservation.duration_minutes, 60)
        
        # 1.5 hour reservation
        reservation = ReservationFactory(
            start_time=start,
            end_time=start + timedelta(minutes=90)
        )
        self.assertEqual(reservation.duration_hours, 1.5)
        self.assertEqual(reservation.duration_minutes, 90)
    
    def test_status_transitions(self):
        """Test reservation status transitions"""
        reservation = ReservationFactory(status='pending')
        
        # Pending -> Confirmed
        reservation.confirm()
        self.assertEqual(reservation.status, 'confirmed')
        self.assertIsNotNone(reservation.confirmed_at)
        
        # Confirmed -> Cancelled
        reservation.cancel(reason="User request")
        self.assertEqual(reservation.status, 'cancelled')
        self.assertEqual(reservation.cancellation_reason, "User request")
        self.assertIsNotNone(reservation.cancelled_at)
        
        # Cannot confirm cancelled reservation
        with self.assertRaises(ValidationError):
            reservation.confirm()
    
    def test_overlapping_detection(self):
        """Test overlapping reservation detection"""
        # Create existing reservation
        start = timezone.now() + timedelta(hours=24)
        existing = ReservationFactory(
            court=self.court,
            start_time=start,
            end_time=start + timedelta(hours=1),
            status='confirmed'
        )
        
        # Test exact overlap
        with self.assertRaises(ValidationError):
            overlapping = Reservation(
                court=self.court,
                user=UserFactory(),
                start_time=start,
                end_time=start + timedelta(hours=1)
            )
            overlapping.full_clean()
        
        # Test partial overlap (starts during existing)
        with self.assertRaises(ValidationError):
            overlapping = Reservation(
                court=self.court,
                user=UserFactory(),
                start_time=start + timedelta(minutes=30),
                end_time=start + timedelta(hours=2)
            )
            overlapping.full_clean()
        
        # Test no overlap (after existing)
        no_overlap = Reservation(
            court=self.court,
            user=UserFactory(),
            start_time=start + timedelta(hours=2),
            end_time=start + timedelta(hours=3)
        )
        no_overlap.full_clean()  # Should not raise

class RecurringReservationTest(TestCase):
    """Test recurring reservation functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        self.court = CourtFactory(price_per_hour=30)
    
    def test_weekly_recurrence(self):
        """Test weekly recurring reservations"""
        start_date = timezone.now().date() + timedelta(days=1)
        
        recurring = RecurringReservation.objects.create(
            court=self.court,
            user=self.user,
            start_date=start_date,
            end_date=start_date + timedelta(weeks=4),
            start_time="18:00",
            end_time="19:00",
            frequency='weekly',
            days_of_week=[1, 3, 5],  # Monday, Wednesday, Friday
            price_per_session=Decimal("30.00")
        )
        
        # Generate occurrences
        occurrences = recurring.generate_occurrences()
        
        # Should have 12 occurrences (3 days × 4 weeks)
        self.assertEqual(len(occurrences), 12)
        
        # Check all are on correct days
        for occurrence in occurrences:
            self.assertIn(occurrence['date'].weekday(), [0, 2, 4])  # 0=Monday
    
    def test_monthly_recurrence(self):
        """Test monthly recurring reservations"""
        start_date = timezone.now().date().replace(day=15)
        
        recurring = RecurringReservation.objects.create(
            court=self.court,
            user=self.user,
            start_date=start_date,
            end_date=start_date + timedelta(days=90),
            start_time="10:00",
            end_time="11:00",
            frequency='monthly',
            day_of_month=15,
            price_per_session=Decimal("30.00")
        )
        
        occurrences = recurring.generate_occurrences()
        
        # Check all occurrences are on the 15th
        for occurrence in occurrences:
            self.assertEqual(occurrence['date'].day, 15)
    
    def test_exclusion_dates(self):
        """Test exclusion dates in recurring reservations"""
        start_date = timezone.now().date() + timedelta(days=1)
        exclusion_date = start_date + timedelta(weeks=2)
        
        recurring = RecurringReservation.objects.create(
            court=self.court,
            user=self.user,
            start_date=start_date,
            end_date=start_date + timedelta(weeks=4),
            start_time="18:00",
            end_time="19:00",
            frequency='weekly',
            days_of_week=[1],  # Monday only
            exclusion_dates=[exclusion_date],
            price_per_session=Decimal("30.00")
        )
        
        occurrences = recurring.generate_occurrences()
        occurrence_dates = [occ['date'] for occ in occurrences]
        
        # Exclusion date should not be in occurrences
        self.assertNotIn(exclusion_date, occurrence_dates)
        self.assertEqual(len(occurrences), 3)  # 4 weeks - 1 exclusion
```

### 2. Availability Service Tests
```python
# backend/tests/unit/reservations/test_availability.py
from django.test import TestCase
from apps.reservations.services import AvailabilityService
from apps.clubs.models import Schedule
from tests.factories import ClubFactory, CourtFactory, ReservationFactory
from datetime import datetime, date, time, timedelta
from django.utils import timezone

class AvailabilityServiceTest(TestCase):
    """Test availability calculation service"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club)
        self.service = AvailabilityService()
        
        # Set club schedule (8 AM to 10 PM every day)
        for day in range(7):
            Schedule.objects.create(
                club=self.club,
                day_of_week=day + 1,
                opening_time="08:00",
                closing_time="22:00"
            )
    
    def test_get_time_slots(self):
        """Test time slot generation"""
        target_date = date(2024, 1, 15)
        
        slots = self.service.get_time_slots(
            self.court,
            target_date,
            slot_duration=60
        )
        
        # Should have 14 slots (8 AM to 9 PM last slot)
        self.assertEqual(len(slots), 14)
        self.assertEqual(slots[0], time(8, 0))
        self.assertEqual(slots[-1], time(21, 0))
    
    def test_get_available_slots(self):
        """Test available slots with existing reservations"""
        target_date = date(2024, 1, 15)
        
        # Create some existing reservations
        ReservationFactory(
            court=self.court,
            start_time=timezone.make_aware(datetime.combine(target_date, time(10, 0))),
            end_time=timezone.make_aware(datetime.combine(target_date, time(11, 0))),
            status='confirmed'
        )
        
        ReservationFactory(
            court=self.court,
            start_time=timezone.make_aware(datetime.combine(target_date, time(14, 0))),
            end_time=timezone.make_aware(datetime.combine(target_date, time(15, 30))),
            status='confirmed'
        )
        
        available = self.service.get_available_slots(
            self.court,
            target_date,
            slot_duration=60
        )
        
        # 10:00 and 14:00 should be unavailable
        slot_10 = next(s for s in available if s['time'] == '10:00')
        slot_14 = next(s for s in available if s['time'] == '14:00')
        
        self.assertFalse(slot_10['available'])
        self.assertFalse(slot_14['available'])
        
        # 9:00 and 12:00 should be available
        slot_9 = next(s for s in available if s['time'] == '09:00')
        slot_12 = next(s for s in available if s['time'] == '12:00')
        
        self.assertTrue(slot_9['available'])
        self.assertTrue(slot_12['available'])
    
    def test_check_availability_for_period(self):
        """Test checking availability for a specific period"""
        target_date = date(2024, 1, 15)
        start_time = timezone.make_aware(datetime.combine(target_date, time(16, 0)))
        end_time = timezone.make_aware(datetime.combine(target_date, time(17, 30)))
        
        # Should be available initially
        is_available = self.service.check_availability(
            self.court,
            start_time,
            end_time
        )
        self.assertTrue(is_available)
        
        # Create overlapping reservation
        ReservationFactory(
            court=self.court,
            start_time=timezone.make_aware(datetime.combine(target_date, time(17, 0))),
            end_time=timezone.make_aware(datetime.combine(target_date, time(18, 0))),
            status='confirmed'
        )
        
        # Should no longer be available
        is_available = self.service.check_availability(
            self.court,
            start_time,
            end_time
        )
        self.assertFalse(is_available)
    
    def test_maintenance_affects_availability(self):
        """Test that maintenance windows affect availability"""
        target_date = date(2024, 1, 15)
        
        # Add maintenance window
        from apps.clubs.models import CourtMaintenance
        CourtMaintenance.objects.create(
            court=self.court,
            start_time=timezone.make_aware(datetime.combine(target_date, time(12, 0))),
            end_time=timezone.make_aware(datetime.combine(target_date, time(14, 0))),
            description="Monthly cleaning"
        )
        
        available = self.service.get_available_slots(
            self.court,
            target_date,
            slot_duration=60
        )
        
        # 12:00 and 13:00 should be unavailable due to maintenance
        slot_12 = next(s for s in available if s['time'] == '12:00')
        slot_13 = next(s for s in available if s['time'] == '13:00')
        
        self.assertFalse(slot_12['available'])
        self.assertEqual(slot_12['reason'], 'maintenance')
        self.assertFalse(slot_13['available'])
```

### 3. Conflict Detection Tests
```python
# backend/tests/unit/reservations/test_conflict_detection.py
from django.test import TestCase
from apps.reservations.services import ConflictDetectionService
from tests.factories import CourtFactory, UserFactory, ReservationFactory
from datetime import datetime, timedelta
from django.utils import timezone

class ConflictDetectionTest(TestCase):
    """Test reservation conflict detection"""
    
    def setUp(self):
        self.court = CourtFactory()
        self.user = UserFactory()
        self.service = ConflictDetectionService()
    
    def test_no_conflict(self):
        """Test when there's no conflict"""
        # Existing reservation: 10-11 AM
        existing = ReservationFactory(
            court=self.court,
            start_time=timezone.now() + timedelta(hours=10),
            end_time=timezone.now() + timedelta(hours=11),
            status='confirmed'
        )
        
        # New reservation: 12-13 PM (no conflict)
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=timezone.now() + timedelta(hours=12),
            end_time=timezone.now() + timedelta(hours=13)
        )
        
        self.assertEqual(len(conflicts), 0)
    
    def test_exact_overlap(self):
        """Test exact time overlap"""
        start = timezone.now() + timedelta(hours=10)
        end = start + timedelta(hours=1)
        
        existing = ReservationFactory(
            court=self.court,
            start_time=start,
            end_time=end,
            status='confirmed'
        )
        
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=start,
            end_time=end
        )
        
        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0].id, existing.id)
    
    def test_partial_overlap_scenarios(self):
        """Test various partial overlap scenarios"""
        base_start = timezone.now() + timedelta(hours=10)
        base_end = base_start + timedelta(hours=2)  # 10 AM - 12 PM
        
        existing = ReservationFactory(
            court=self.court,
            start_time=base_start,
            end_time=base_end,
            status='confirmed'
        )
        
        # Scenario 1: New starts during existing
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=base_start + timedelta(hours=1),  # 11 AM
            end_time=base_end + timedelta(hours=1)       # 1 PM
        )
        self.assertEqual(len(conflicts), 1)
        
        # Scenario 2: New ends during existing
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=base_start - timedelta(hours=1),  # 9 AM
            end_time=base_start + timedelta(hours=1)     # 11 AM
        )
        self.assertEqual(len(conflicts), 1)
        
        # Scenario 3: New completely contains existing
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=base_start - timedelta(hours=1),  # 9 AM
            end_time=base_end + timedelta(hours=1)       # 1 PM
        )
        self.assertEqual(len(conflicts), 1)
        
        # Scenario 4: New is contained within existing
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=base_start + timedelta(minutes=30),  # 10:30 AM
            end_time=base_end - timedelta(minutes=30)       # 11:30 AM
        )
        self.assertEqual(len(conflicts), 1)
    
    def test_cancelled_reservations_ignored(self):
        """Test that cancelled reservations don't cause conflicts"""
        cancelled = ReservationFactory(
            court=self.court,
            start_time=timezone.now() + timedelta(hours=10),
            end_time=timezone.now() + timedelta(hours=11),
            status='cancelled'
        )
        
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=cancelled.start_time,
            end_time=cancelled.end_time
        )
        
        self.assertEqual(len(conflicts), 0)
    
    def test_buffer_time_conflicts(self):
        """Test conflicts with buffer time between reservations"""
        existing = ReservationFactory(
            court=self.court,
            start_time=timezone.now() + timedelta(hours=10),
            end_time=timezone.now() + timedelta(hours=11),
            status='confirmed'
        )
        
        # Without buffer: no conflict
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=existing.end_time,
            end_time=existing.end_time + timedelta(hours=1)
        )
        self.assertEqual(len(conflicts), 0)
        
        # With 15-minute buffer: conflict
        conflicts = self.service.check_conflicts(
            court=self.court,
            start_time=existing.end_time,
            end_time=existing.end_time + timedelta(hours=1),
            buffer_minutes=15
        )
        self.assertEqual(len(conflicts), 1)
```

## 🔌 Integration Tests

### 1. Reservation API Tests
```python
# backend/tests/integration/reservations/test_reservation_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, ClubFactory, CourtFactory, ReservationFactory
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

class ReservationAPITest(APITestCase):
    """Test reservation API endpoints"""
    
    def setUp(self):
        self.user = UserFactory()
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club, price_per_hour=30)
        self.client.force_authenticate(user=self.user)
    
    def test_create_reservation(self):
        """Test creating a reservation"""
        start = (timezone.now() + timedelta(days=1)).replace(hour=10, minute=0)
        end = start + timedelta(hours=1)
        
        data = {
            "court": self.court.id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "players": [self.user.id],
            "notes": "Test reservation"
        }
        
        response = self.client.post('/api/v1/reservations/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['court'], self.court.id)
        self.assertEqual(response.data['user'], self.user.id)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(Decimal(response.data['price']), Decimal('30.00'))
    
    def test_list_user_reservations(self):
        """Test listing user's reservations"""
        # Create reservations for different users
        my_reservations = [
            ReservationFactory(user=self.user, court=self.court)
            for _ in range(3)
        ]
        other_reservations = [
            ReservationFactory(court=self.court)
            for _ in range(2)
        ]
        
        response = self.client.get('/api/v1/reservations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)  # Only user's reservations
        
        returned_ids = [r['id'] for r in response.data['results']]
        for reservation in my_reservations:
            self.assertIn(str(reservation.id), returned_ids)
    
    def test_filter_reservations(self):
        """Test filtering reservations"""
        # Create reservations with different statuses
        confirmed = ReservationFactory(
            user=self.user,
            court=self.court,
            status='confirmed'
        )
        pending = ReservationFactory(
            user=self.user,
            court=self.court,
            status='pending'
        )
        cancelled = ReservationFactory(
            user=self.user,
            court=self.court,
            status='cancelled'
        )
        
        # Filter by status
        response = self.client.get('/api/v1/reservations/', {'status': 'confirmed'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(confirmed.id))
        
        # Filter by date range
        today = timezone.now().date()
        response = self.client.get('/api/v1/reservations/', {
            'start_date': today.isoformat(),
            'end_date': (today + timedelta(days=7)).isoformat()
        })
        # Results depend on factory-generated dates
    
    def test_reservation_conflict_prevention(self):
        """Test that conflicting reservations are prevented"""
        start = (timezone.now() + timedelta(days=1)).replace(hour=14, minute=0)
        end = start + timedelta(hours=1)
        
        # Create existing reservation
        existing = ReservationFactory(
            court=self.court,
            start_time=start,
            end_time=end,
            status='confirmed'
        )
        
        # Try to create overlapping reservation
        data = {
            "court": self.court.id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat()
        }
        
        response = self.client.post('/api/v1/reservations/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conflict', str(response.data).lower())
    
    def test_update_reservation(self):
        """Test updating a reservation"""
        reservation = ReservationFactory(
            user=self.user,
            court=self.court,
            status='pending'
        )
        
        # Update notes
        data = {"notes": "Updated notes"}
        response = self.client.patch(
            f'/api/v1/reservations/{reservation.id}/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['notes'], "Updated notes")
        
        # Cannot update confirmed reservation times
        reservation.status = 'confirmed'
        reservation.save()
        
        new_start = reservation.start_time + timedelta(hours=1)
        data = {"start_time": new_start.isoformat()}
        response = self.client.patch(
            f'/api/v1/reservations/{reservation.id}/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

### 2. Cancellation Flow Tests
```python
# backend/tests/integration/reservations/test_cancellation.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, CourtFactory, ReservationFactory
from apps.finance.models import Payment, Refund
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

class CancellationAPITest(APITestCase):
    """Test reservation cancellation flow"""
    
    def setUp(self):
        self.user = UserFactory()
        self.court = CourtFactory(price_per_hour=30)
        self.client.force_authenticate(user=self.user)
    
    def test_cancel_pending_reservation(self):
        """Test cancelling a pending reservation"""
        reservation = ReservationFactory(
            user=self.user,
            court=self.court,
            status='pending',
            start_time=timezone.now() + timedelta(days=2)
        )
        
        response = self.client.post(
            f'/api/v1/reservations/{reservation.id}/cancel/',
            {"reason": "Changed plans"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'cancelled')
        self.assertEqual(response.data['cancellation_reason'], "Changed plans")
        self.assertIsNotNone(response.data['cancelled_at'])
    
    def test_cancel_paid_reservation_with_refund(self):
        """Test cancelling a paid reservation triggers refund"""
        reservation = ReservationFactory(
            user=self.user,
            court=self.court,
            status='confirmed',
            start_time=timezone.now() + timedelta(days=3),  # 3 days ahead
            price=Decimal("30.00")
        )
        
        # Create payment
        payment = Payment.objects.create(
            reservation=reservation,
            amount=Decimal("30.00"),
            status='completed',
            stripe_payment_intent_id='pi_test_123'
        )
        
        response = self.client.post(
            f'/api/v1/reservations/{reservation.id}/cancel/',
            {"reason": "Cannot attend"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check refund created
        refund = Refund.objects.get(payment=payment)
        self.assertEqual(refund.amount, Decimal("30.00"))  # Full refund
        self.assertEqual(refund.status, 'pending')
    
    def test_cancellation_policy_enforcement(self):
        """Test cancellation policy is enforced"""
        # Reservation starting in 1 hour (too late for free cancellation)
        reservation = ReservationFactory(
            user=self.user,
            court=self.court,
            status='confirmed',
            start_time=timezone.now() + timedelta(hours=1),
            price=Decimal("30.00")
        )
        
        # Create payment
        payment = Payment.objects.create(
            reservation=reservation,
            amount=Decimal("30.00"),
            status='completed'
        )
        
        # Club has 24-hour cancellation policy
        self.court.club.cancellation_hours = 24
        self.court.club.late_cancellation_fee_percentage = 50
        self.court.club.save()
        
        response = self.client.post(
            f'/api/v1/reservations/{reservation.id}/cancel/',
            {"reason": "Last minute change"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check partial refund
        refund = Refund.objects.get(payment=payment)
        self.assertEqual(refund.amount, Decimal("15.00"))  # 50% refund
        self.assertEqual(refund.reason, "Late cancellation - 50% fee applied")
    
    def test_cannot_cancel_past_reservation(self):
        """Test cannot cancel past reservations"""
        reservation = ReservationFactory(
            user=self.user,
            court=self.court,
            status='completed',
            start_time=timezone.now() - timedelta(hours=2),
            end_time=timezone.now() - timedelta(hours=1)
        )
        
        response = self.client.post(
            f'/api/v1/reservations/{reservation.id}/cancel/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('past', str(response.data).lower())
    
    def test_permission_to_cancel(self):
        """Test only reservation owner can cancel"""
        other_user = UserFactory()
        reservation = ReservationFactory(
            user=other_user,
            court=self.court,
            status='confirmed'
        )
        
        response = self.client.post(
            f'/api/v1/reservations/{reservation.id}/cancel/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

### 3. Availability Check Tests
```python
# backend/tests/integration/reservations/test_availability_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import ClubFactory, CourtFactory, ReservationFactory
from apps.clubs.models import Schedule
from datetime import date, time, datetime, timedelta
from django.utils import timezone

class AvailabilityAPITest(APITestCase):
    """Test availability check endpoints"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club)
        
        # Set club schedule
        for day in range(1, 8):
            Schedule.objects.create(
                club=self.club,
                day_of_week=day,
                opening_time="08:00",
                closing_time="22:00"
            )
    
    def test_get_court_availability(self):
        """Test getting court availability for a date"""
        target_date = (timezone.now() + timedelta(days=1)).date()
        
        response = self.client.get(
            f'/api/v1/courts/{self.court.id}/availability/',
            {'date': target_date.isoformat()}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('date', response.data)
        self.assertIn('slots', response.data)
        self.assertEqual(len(response.data['slots']), 14)  # 8 AM to 9 PM
    
    def test_availability_with_duration(self):
        """Test availability check with custom duration"""
        target_date = (timezone.now() + timedelta(days=1)).date()
        
        response = self.client.get(
            f'/api/v1/courts/{self.court.id}/availability/',
            {
                'date': target_date.isoformat(),
                'duration': 90  # 90 minutes
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that slots respect duration
        available_slots = [s for s in response.data['slots'] if s['available']]
        if available_slots:
            # Ensure no slot starts too late for 90-minute session
            last_slot_time = time.fromisoformat(available_slots[-1]['time'])
            self.assertLessEqual(last_slot_time.hour, 20)  # Latest 8:30 PM for 90 min
    
    def test_bulk_availability_check(self):
        """Test checking availability for multiple courts"""
        court2 = CourtFactory(club=self.club)
        court3 = CourtFactory(club=self.club)
        
        target_date = (timezone.now() + timedelta(days=1)).date()
        
        # Create reservation on court2
        ReservationFactory(
            court=court2,
            start_time=timezone.make_aware(datetime.combine(target_date, time(14, 0))),
            end_time=timezone.make_aware(datetime.combine(target_date, time(15, 0))),
            status='confirmed'
        )
        
        response = self.client.post(
            '/api/v1/reservations/check-availability/',
            {
                'courts': [self.court.id, court2.id, court3.id],
                'date': target_date.isoformat(),
                'start_time': '14:00',
                'end_time': '15:00'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # court1 and court3 should be available, court2 not
        availability = response.data['availability']
        self.assertTrue(availability[str(self.court.id)]['available'])
        self.assertFalse(availability[str(court2.id)]['available'])
        self.assertTrue(availability[str(court3.id)]['available'])
```

## 🔄 E2E Flow Tests

### 1. Complete Booking Flow
```python
# backend/tests/e2e/reservations/test_booking_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory, CourtFactory
from apps.finance.models import Payment
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

class CompleteBookingFlowE2ETest(TestCase):
    """Test complete booking flow from search to confirmation"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        
        # Create test club with courts
        self.club = ClubFactory(name="Test Padel Club")
        self.indoor_court = CourtFactory(
            club=self.club,
            name="Indoor Court 1",
            court_type="indoor",
            price_per_hour=35
        )
        self.outdoor_court = CourtFactory(
            club=self.club,
            name="Outdoor Court 1",
            court_type="outdoor",
            price_per_hour=25
        )
    
    def test_complete_booking_flow(self):
        """Test flow: Search → Check availability → Book → Pay → Confirm"""
        
        # Step 1: Search for clubs
        search_response = self.client.get('/api/v1/clubs/', {
            'search': 'Test Padel',
            'has_indoor_courts': True
        })
        self.assertEqual(search_response.status_code, 200)
        self.assertEqual(search_response.data['count'], 1)
        
        club_data = search_response.data['results'][0]
        self.assertEqual(club_data['id'], str(self.club.id))
        
        # Step 2: Get club details with courts
        club_response = self.client.get(f'/api/v1/clubs/{self.club.id}/')
        self.assertEqual(club_response.status_code, 200)
        self.assertEqual(len(club_response.data['courts']), 2)
        
        # Step 3: Check court availability
        target_date = (timezone.now() + timedelta(days=2)).date()
        availability_response = self.client.get(
            f'/api/v1/courts/{self.indoor_court.id}/availability/',
            {'date': target_date.isoformat()}
        )
        self.assertEqual(availability_response.status_code, 200)
        
        # Find available slot
        available_slots = [
            s for s in availability_response.data['slots']
            if s['available'] and s['time'] == '18:00'
        ]
        self.assertTrue(available_slots)
        
        # Step 4: Create reservation
        start_time = timezone.make_aware(
            datetime.combine(target_date, time(18, 0))
        )
        end_time = start_time + timedelta(hours=1)
        
        reservation_data = {
            "court": self.indoor_court.id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "players": [self.user.id],
            "notes": "Looking forward to playing!"
        }
        
        reservation_response = self.client.post(
            '/api/v1/reservations/',
            reservation_data
        )
        self.assertEqual(reservation_response.status_code, 201)
        
        reservation_id = reservation_response.data['id']
        self.assertEqual(reservation_response.data['status'], 'pending')
        self.assertEqual(
            Decimal(reservation_response.data['price']),
            Decimal('35.00')
        )
        
        # Step 5: Create payment intent
        payment_intent_response = self.client.post(
            '/api/v1/payments/create-intent/',
            {"reservation_id": reservation_id}
        )
        self.assertEqual(payment_intent_response.status_code, 200)
        
        payment_intent_id = payment_intent_response.data['payment_intent_id']
        client_secret = payment_intent_response.data['client_secret']
        
        # Step 6: Confirm payment (simulate Stripe confirmation)
        # In real flow, this happens on frontend with Stripe.js
        confirm_response = self.client.post(
            '/api/v1/payments/confirm/',
            {
                "payment_intent_id": payment_intent_id,
                "reservation_id": reservation_id
            }
        )
        self.assertEqual(confirm_response.status_code, 200)
        
        # Step 7: Verify reservation is confirmed
        final_reservation = self.client.get(
            f'/api/v1/reservations/{reservation_id}/'
        )
        self.assertEqual(final_reservation.status_code, 200)
        self.assertEqual(final_reservation.data['status'], 'confirmed')
        self.assertEqual(final_reservation.data['payment_status'], 'paid')
        
        # Step 8: Check payment record
        payment = Payment.objects.get(reservation_id=reservation_id)
        self.assertEqual(payment.amount, Decimal('35.00'))
        self.assertEqual(payment.status, 'completed')
        
        # Step 9: Verify confirmation email was sent
        # (Mock email service would track this)
```

### 2. Recurring Reservation Flow
```python
# backend/tests/e2e/reservations/test_recurring_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory, CourtFactory
from datetime import date, time, timedelta
from django.utils import timezone

class RecurringReservationFlowE2ETest(TestCase):
    """Test recurring reservation flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.court = CourtFactory(price_per_hour=30)
        self.client.force_authenticate(user=self.user)
    
    def test_weekly_recurring_reservation(self):
        """Test creating weekly recurring reservations"""
        
        # Step 1: Check availability for recurring pattern
        start_date = (timezone.now() + timedelta(days=7)).date()
        
        availability_data = {
            "court": self.court.id,
            "start_date": start_date.isoformat(),
            "end_date": (start_date + timedelta(weeks=4)).isoformat(),
            "days_of_week": [1, 3],  # Monday, Wednesday
            "start_time": "19:00",
            "end_time": "20:00"
        }
        
        # Check recurring availability
        check_response = self.client.post(
            '/api/v1/reservations/check-recurring-availability/',
            availability_data
        )
        self.assertEqual(check_response.status_code, 200)
        self.assertTrue(check_response.data['all_available'])
        self.assertEqual(len(check_response.data['conflicts']), 0)
        
        # Step 2: Create recurring reservation
        recurring_data = {
            **availability_data,
            "frequency": "weekly",
            "players": [self.user.id],
            "auto_confirm": False  # Require payment for each
        }
        
        recurring_response = self.client.post(
            '/api/v1/reservations/recurring/',
            recurring_data
        )
        self.assertEqual(recurring_response.status_code, 201)
        
        recurring_id = recurring_response.data['id']
        self.assertEqual(len(recurring_response.data['occurrences']), 8)  # 4 weeks × 2 days
        
        # Step 3: Modify single occurrence
        occurrences = recurring_response.data['occurrences']
        second_occurrence = occurrences[1]
        
        modify_response = self.client.patch(
            f'/api/v1/reservations/{second_occurrence["id"]}/',
            {
                "start_time": "20:00",
                "end_time": "21:00",
                "modify_series": False  # Only this instance
            }
        )
        self.assertEqual(modify_response.status_code, 200)
        
        # Step 4: Cancel one occurrence
        third_occurrence = occurrences[2]
        
        cancel_response = self.client.post(
            f'/api/v1/reservations/{third_occurrence["id"]}/cancel/',
            {
                "reason": "Holiday",
                "cancel_series": False
            }
        )
        self.assertEqual(cancel_response.status_code, 200)
        
        # Step 5: Verify series status
        series_response = self.client.get(
            f'/api/v1/reservations/recurring/{recurring_id}/'
        )
        self.assertEqual(series_response.status_code, 200)
        
        # Check modified occurrence
        modified = next(
            o for o in series_response.data['occurrences']
            if o['id'] == second_occurrence['id']
        )
        self.assertEqual(modified['start_time'], '20:00')
        
        # Check cancelled occurrence
        cancelled = next(
            o for o in series_response.data['occurrences']
            if o['id'] == third_occurrence['id']
        )
        self.assertEqual(cancelled['status'], 'cancelled')
```

### 3. Group Booking Flow
```python
# backend/tests/e2e/reservations/test_group_booking.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, CourtFactory
from datetime import datetime, timedelta
from django.utils import timezone

class GroupBookingFlowE2ETest(TestCase):
    """Test group booking with multiple players"""
    
    def setUp(self):
        self.client = APIClient()
        self.organizer = UserFactory()
        self.players = [UserFactory() for _ in range(3)]
        self.court = CourtFactory(price_per_hour=40)
        self.client.force_authenticate(user=self.organizer)
    
    def test_group_booking_with_split_payment(self):
        """Test group booking with payment split among players"""
        
        # Step 1: Create group reservation
        start_time = timezone.now() + timedelta(days=3, hours=2)
        end_time = start_time + timedelta(hours=2)  # 2-hour session
        
        all_players = [self.organizer.id] + [p.id for p in self.players]
        
        reservation_data = {
            "court": self.court.id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "players": all_players,
            "split_payment": True,
            "notes": "Weekly doubles match"
        }
        
        reservation_response = self.client.post(
            '/api/v1/reservations/',
            reservation_data
        )
        self.assertEqual(reservation_response.status_code, 201)
        
        reservation = reservation_response.data
        self.assertEqual(len(reservation['players']), 4)
        self.assertEqual(Decimal(reservation['price']), Decimal('80.00'))  # 2 hours × 40
        self.assertEqual(
            Decimal(reservation['price_per_player']),
            Decimal('20.00')  # 80 / 4 players
        )
        
        # Step 2: Send payment invitations
        invite_response = self.client.post(
            f'/api/v1/reservations/{reservation["id"]}/invite-payment/'
        )
        self.assertEqual(invite_response.status_code, 200)
        self.assertEqual(len(invite_response.data['invitations']), 3)  # Excluding organizer
        
        # Step 3: Simulate players accepting and paying
        for i, player in enumerate(self.players):
            # Switch to player's session
            player_client = APIClient()
            player_client.force_authenticate(user=player)
            
            # Accept invitation
            accept_response = player_client.post(
                f'/api/v1/reservations/{reservation["id"]}/accept-share/',
                {"player_id": player.id}
            )
            self.assertEqual(accept_response.status_code, 200)
            
            # Create payment
            payment_response = player_client.post(
                '/api/v1/payments/create-intent/',
                {
                    "reservation_id": reservation["id"],
                    "amount": "20.00"  # Their share
                }
            )
            self.assertEqual(payment_response.status_code, 200)
        
        # Step 4: Organizer pays their share
        organizer_payment = self.client.post(
            '/api/v1/payments/create-intent/',
            {
                "reservation_id": reservation["id"],
                "amount": "20.00"
            }
        )
        self.assertEqual(organizer_payment.status_code, 200)
        
        # Step 5: Verify reservation is confirmed after all payments
        final_reservation = self.client.get(
            f'/api/v1/reservations/{reservation["id"]}/'
        )
        self.assertEqual(final_reservation.status_code, 200)
        self.assertEqual(final_reservation.data['status'], 'confirmed')
        self.assertEqual(final_reservation.data['payment_status'], 'paid')
        self.assertEqual(
            len(final_reservation.data['payments']),
            4  # One per player
        )
```

## 🔒 Security Tests

### Reservation Security Tests
```python
# backend/tests/security/reservations/test_security.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, CourtFactory, ReservationFactory
from datetime import datetime, timedelta
from django.utils import timezone

class ReservationSecurityTest(TestCase):
    """Test reservation security features"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.court = CourtFactory()
    
    def test_cannot_access_others_reservations(self):
        """Test users cannot access other users' reservations"""
        # Create reservation for other user
        other_reservation = ReservationFactory(
            user=self.other_user,
            court=self.court
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Try to access
        response = self.client.get(
            f'/api/v1/reservations/{other_reservation.id}/'
        )
        self.assertEqual(response.status_code, 404)  # Hidden as 404
        
        # Try to modify
        response = self.client.patch(
            f'/api/v1/reservations/{other_reservation.id}/',
            {"notes": "Hacked"}
        )
        self.assertEqual(response.status_code, 404)
    
    def test_prevent_double_booking_race_condition(self):
        """Test prevention of double booking in race conditions"""
        from django.db import transaction
        from threading import Thread
        import threading
        
        start_time = timezone.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=1)
        
        results = []
        
        def try_book(user):
            client = APIClient()
            client.force_authenticate(user=user)
            
            try:
                with transaction.atomic():
                    response = client.post('/api/v1/reservations/', {
                        "court": self.court.id,
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat()
                    })
                    results.append((user.id, response.status_code))
            except Exception as e:
                results.append((user.id, 'error'))
        
        # Create two threads trying to book same slot
        user1 = UserFactory()
        user2 = UserFactory()
        
        thread1 = Thread(target=try_book, args=(user1,))
        thread2 = Thread(target=try_book, args=(user2,))
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Only one should succeed
        success_count = sum(1 for _, status in results if status == 201)
        self.assertEqual(success_count, 1)
```

## 📊 Performance Tests

### Reservation Performance Tests
```python
# backend/tests/performance/reservations/test_performance.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, CourtFactory, ReservationFactory
from datetime import datetime, timedelta, date
from django.utils import timezone
import time

class ReservationPerformanceTest(TestCase):
    """Test reservation system performance"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        self.club = ClubFactory()
        self.courts = [
            CourtFactory(club=self.club) for _ in range(10)
        ]
    
    def test_availability_check_performance(self):
        """Test performance of availability checking"""
        court = self.courts[0]
        
        # Create 100 reservations across 30 days
        base_date = timezone.now()
        for i in range(100):
            day_offset = i % 30
            hour_offset = (i % 10) + 8  # 8 AM to 6 PM
            
            ReservationFactory(
                court=court,
                start_time=base_date + timedelta(days=day_offset, hours=hour_offset),
                end_time=base_date + timedelta(days=day_offset, hours=hour_offset + 1),
                status='confirmed'
            )
        
        # Test availability check performance
        target_date = (base_date + timedelta(days=15)).date()
        
        start = time.time()
        response = self.client.get(
            f'/api/v1/courts/{court.id}/availability/',
            {'date': target_date.isoformat()}
        )
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 0.1)  # Should complete in under 100ms
    
    def test_bulk_reservation_creation(self):
        """Test performance of creating multiple reservations"""
        court = self.courts[0]
        
        # Create 20 reservations in sequence
        start = time.time()
        
        for i in range(20):
            start_time = timezone.now() + timedelta(days=i+1, hours=10)
            response = self.client.post('/api/v1/reservations/', {
                "court": court.id,
                "start_time": start_time.isoformat(),
                "end_time": (start_time + timedelta(hours=1)).isoformat()
            })
            self.assertEqual(response.status_code, 201)
        
        duration = time.time() - start
        
        # Should complete in reasonable time (< 2 seconds for 20 reservations)
        self.assertLess(duration, 2.0)
        
        # Average time per reservation
        avg_time = duration / 20
        self.assertLess(avg_time, 0.1)  # < 100ms per reservation
```

## 🎯 Test Execution Commands

### Run All Reservation Tests
```bash
# Unit tests only
pytest tests/unit/reservations/ -v

# Integration tests
pytest tests/integration/reservations/ -v

# E2E tests
pytest tests/e2e/reservations/ -v

# All reservation tests
pytest tests/ -k reservations -v

# With coverage
pytest tests/ -k reservations --cov=apps.reservations --cov-report=html
```

### Run Specific Test Categories
```bash
# Availability tests
pytest tests/ -k "availability" -v

# Cancellation tests
pytest tests/ -k "cancel" -v

# Recurring reservation tests
pytest tests/ -k "recurring" -v

# Performance tests
pytest tests/performance/reservations/ -v
```

---

**Siguiente**: [Finance Payments Tests](10-Finance-Payments-Tests.md) →