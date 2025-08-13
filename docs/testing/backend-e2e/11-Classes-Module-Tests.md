# 🎾 Classes Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de clases, cubriendo gestión de clases grupales, inscripciones, instructores, horarios, paquetes y seguimiento de asistencia.

## 🎯 Objetivos de Testing

### Cobertura Target: 85%
- **Unit Tests**: 60% - Lógica de capacidad y horarios
- **Integration Tests**: 30% - APIs de clases
- **E2E Tests**: 10% - Flujos completos de inscripción

### Endpoints a Cubrir
- ✅ GET `/api/v1/classes/`
- ✅ POST `/api/v1/classes/`
- ✅ GET `/api/v1/classes/{id}/`
- ✅ PUT `/api/v1/classes/{id}/`
- ✅ DELETE `/api/v1/classes/{id}/`
- ✅ POST `/api/v1/classes/{id}/enroll/`
- ✅ POST `/api/v1/classes/{id}/unenroll/`
- ✅ GET `/api/v1/classes/{id}/students/`
- ✅ POST `/api/v1/classes/{id}/attendance/`
- ✅ GET `/api/v1/instructors/`

## 🧪 Unit Tests

### 1. Class Model Tests
```python
# backend/tests/unit/classes/test_models.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.classes.models import Class, ClassSchedule, Enrollment, ClassPackage
from apps.authentication.models import User
from tests.factories import UserFactory, ClassFactory, InstructorFactory
from decimal import Decimal
from datetime import datetime, time, timedelta
from django.utils import timezone

class ClassModelTest(TestCase):
    """Test Class model functionality"""
    
    def setUp(self):
        self.instructor = InstructorFactory()
        self.club = self.instructor.club
    
    def test_class_creation(self):
        """Test basic class creation"""
        padel_class = Class.objects.create(
            name="Beginner Padel Class",
            club=self.club,
            instructor=self.instructor,
            class_type="group",
            level="beginner",
            duration_minutes=60,
            max_students=8,
            price=Decimal("15.00"),
            description="Perfect for beginners"
        )
        
        self.assertEqual(str(padel_class), "Beginner Padel Class")
        self.assertEqual(padel_class.available_spots, 8)
        self.assertTrue(padel_class.is_active)
    
    def test_capacity_validation(self):
        """Test class capacity constraints"""
        # Group class must have 2-12 students
        with self.assertRaises(ValidationError):
            class_invalid = Class(
                name="Invalid Class",
                club=self.club,
                instructor=self.instructor,
                class_type="group",
                max_students=1  # Too few for group
            )
            class_invalid.full_clean()
        
        # Private class must have 1-2 students
        with self.assertRaises(ValidationError):
            private_invalid = Class(
                name="Invalid Private",
                club=self.club,
                instructor=self.instructor,
                class_type="private",
                max_students=3  # Too many for private
            )
            private_invalid.full_clean()
    
    def test_available_spots_calculation(self):
        """Test available spots calculation"""
        padel_class = ClassFactory(max_students=6)
        
        # Initially all spots available
        self.assertEqual(padel_class.available_spots, 6)
        
        # Add enrollments
        for i in range(4):
            Enrollment.objects.create(
                class_instance=padel_class,
                student=UserFactory(),
                status='confirmed'
            )
        
        self.assertEqual(padel_class.available_spots, 2)
        
        # Add waitlist enrollment (shouldn't count)
        Enrollment.objects.create(
            class_instance=padel_class,
            student=UserFactory(),
            status='waitlisted'
        )
        
        self.assertEqual(padel_class.available_spots, 2)
    
    def test_recurring_schedule(self):
        """Test recurring class schedule"""
        padel_class = ClassFactory()
        
        # Create weekly schedule
        schedule = ClassSchedule.objects.create(
            class_template=padel_class,
            day_of_week=1,  # Monday
            start_time=time(18, 0),
            end_time=time(19, 0),
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(weeks=4)
        )
        
        # Generate class instances
        instances = schedule.generate_instances()
        
        # Should have 4 instances (4 weeks)
        self.assertEqual(len(instances), 4)
        
        # All should be on Monday at 6 PM
        for instance in instances:
            self.assertEqual(instance.start_time.weekday(), 0)  # 0 = Monday
            self.assertEqual(instance.start_time.hour, 18)

class EnrollmentModelTest(TestCase):
    """Test Enrollment model functionality"""
    
    def setUp(self):
        self.student = UserFactory()
        self.class_instance = ClassFactory(max_students=4)
    
    def test_enrollment_creation(self):
        """Test student enrollment"""
        enrollment = Enrollment.objects.create(
            class_instance=self.class_instance,
            student=self.student,
            status='pending'
        )
        
        self.assertEqual(enrollment.student, self.student)
        self.assertEqual(enrollment.status, 'pending')
        self.assertIsNotNone(enrollment.enrolled_at)
    
    def test_enrollment_uniqueness(self):
        """Test student can't enroll twice in same class"""
        Enrollment.objects.create(
            class_instance=self.class_instance,
            student=self.student,
            status='confirmed'
        )
        
        # Try to enroll again
        with self.assertRaises(ValidationError):
            duplicate = Enrollment(
                class_instance=self.class_instance,
                student=self.student,
                status='confirmed'
            )
            duplicate.full_clean()
    
    def test_automatic_waitlist(self):
        """Test automatic waitlisting when class is full"""
        # Fill the class
        for i in range(self.class_instance.max_students):
            Enrollment.objects.create(
                class_instance=self.class_instance,
                student=UserFactory(),
                status='confirmed'
            )
        
        # Next enrollment should be waitlisted
        enrollment = Enrollment.objects.create(
            class_instance=self.class_instance,
            student=self.student
        )
        
        self.assertEqual(enrollment.status, 'waitlisted')
        self.assertEqual(enrollment.waitlist_position, 1)
    
    def test_waitlist_promotion(self):
        """Test promoting from waitlist when spot opens"""
        # Fill class and add waitlist
        confirmed_enrollments = []
        for i in range(self.class_instance.max_students):
            enrollment = Enrollment.objects.create(
                class_instance=self.class_instance,
                student=UserFactory(),
                status='confirmed'
            )
            confirmed_enrollments.append(enrollment)
        
        # Add waitlisted students
        waitlisted1 = Enrollment.objects.create(
            class_instance=self.class_instance,
            student=UserFactory(),
            status='waitlisted'
        )
        waitlisted2 = Enrollment.objects.create(
            class_instance=self.class_instance,
            student=UserFactory(),
            status='waitlisted'
        )
        
        # Cancel one confirmed enrollment
        confirmed_enrollments[0].cancel()
        
        # First waitlisted should be promoted
        waitlisted1.refresh_from_db()
        self.assertEqual(waitlisted1.status, 'confirmed')
        
        # Second should remain waitlisted but position updated
        waitlisted2.refresh_from_db()
        self.assertEqual(waitlisted2.status, 'waitlisted')
        self.assertEqual(waitlisted2.waitlist_position, 1)

class ClassPackageTest(TestCase):
    """Test class package functionality"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.student = UserFactory()
    
    def test_package_creation(self):
        """Test creating class packages"""
        package = ClassPackage.objects.create(
            club=self.club,
            name="10 Class Bundle",
            class_credits=10,
            price=Decimal("120.00"),
            validity_days=60,
            class_types=['group', 'workshop']
        )
        
        self.assertEqual(package.price_per_class, Decimal("12.00"))
        self.assertTrue(package.is_active)
    
    def test_package_purchase(self):
        """Test purchasing and using package"""
        package = ClassPackage.objects.create(
            club=self.club,
            name="5 Class Bundle",
            class_credits=5,
            price=Decimal("65.00"),
            validity_days=30
        )
        
        # Purchase package
        purchase = package.purchase(self.student)
        
        self.assertEqual(purchase.credits_remaining, 5)
        self.assertTrue(purchase.is_valid)
        self.assertIsNotNone(purchase.expires_at)
        
        # Use credit
        padel_class = ClassFactory(club=self.club)
        enrollment = purchase.use_credit(padel_class)
        
        self.assertEqual(purchase.credits_remaining, 4)
        self.assertEqual(enrollment.payment_type, 'package')
        self.assertEqual(enrollment.package_used, purchase)
```

### 2. Instructor Management Tests
```python
# backend/tests/unit/classes/test_instructors.py
from django.test import TestCase
from apps.classes.models import Instructor, InstructorAvailability, Certification
from tests.factories import UserFactory, ClubFactory, InstructorFactory
from datetime import time, date, timedelta
from django.utils import timezone

class InstructorModelTest(TestCase):
    """Test instructor management"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.user = UserFactory()
    
    def test_instructor_creation(self):
        """Test creating an instructor"""
        instructor = Instructor.objects.create(
            user=self.user,
            club=self.club,
            title="Head Coach",
            bio="10 years of experience",
            hourly_rate=Decimal("50.00"),
            specialties=['beginner', 'competition']
        )
        
        self.assertEqual(str(instructor), f"{self.user.get_full_name()} - Head Coach")
        self.assertTrue(instructor.is_active)
        self.assertIn('beginner', instructor.specialties)
    
    def test_instructor_certifications(self):
        """Test instructor certification tracking"""
        instructor = InstructorFactory()
        
        # Add certifications
        cert1 = Certification.objects.create(
            instructor=instructor,
            name="RPT Level 2",
            issuing_body="Spanish Padel Federation",
            issue_date=date.today() - timedelta(days=365),
            expiry_date=date.today() + timedelta(days=365)
        )
        
        cert2 = Certification.objects.create(
            instructor=instructor,
            name="First Aid",
            issuing_body="Red Cross",
            issue_date=date.today() - timedelta(days=180),
            expiry_date=date.today() + timedelta(days=185)
        )
        
        # Check active certifications
        active_certs = instructor.active_certifications()
        self.assertEqual(len(active_certs), 2)
        
        # Check expiring soon
        expiring = instructor.certifications_expiring_soon(days=200)
        self.assertEqual(len(expiring), 1)
        self.assertEqual(expiring[0], cert2)
    
    def test_instructor_availability(self):
        """Test instructor availability management"""
        instructor = InstructorFactory()
        
        # Set weekly availability
        availability = InstructorAvailability.objects.create(
            instructor=instructor,
            day_of_week=1,  # Monday
            start_time=time(9, 0),
            end_time=time(17, 0)
        )
        
        # Check if available
        monday_10am = timezone.make_aware(
            datetime.combine(
                date(2024, 1, 15),  # A Monday
                time(10, 0)
            )
        )
        self.assertTrue(instructor.is_available_at(monday_10am))
        
        # Check if unavailable
        monday_8am = timezone.make_aware(
            datetime.combine(
                date(2024, 1, 15),
                time(8, 0)
            )
        )
        self.assertFalse(instructor.is_available_at(monday_8am))
    
    def test_instructor_schedule_conflicts(self):
        """Test detecting schedule conflicts"""
        instructor = InstructorFactory()
        
        # Create existing class
        existing_class = ClassFactory(
            instructor=instructor,
            start_time=timezone.now() + timedelta(days=1, hours=2),
            end_time=timezone.now() + timedelta(days=1, hours=3)
        )
        
        # Check for conflicts
        conflict_start = existing_class.start_time - timedelta(minutes=30)
        conflict_end = existing_class.end_time - timedelta(minutes=30)
        
        has_conflict = instructor.has_conflict(conflict_start, conflict_end)
        self.assertTrue(has_conflict)
        
        # Check no conflict
        no_conflict_start = existing_class.end_time + timedelta(hours=1)
        no_conflict_end = no_conflict_start + timedelta(hours=1)
        
        has_conflict = instructor.has_conflict(no_conflict_start, no_conflict_end)
        self.assertFalse(has_conflict)
```

### 3. Class Scheduling Tests
```python
# backend/tests/unit/classes/test_scheduling.py
from django.test import TestCase
from apps.classes.services import ClassSchedulingService
from tests.factories import ClassFactory, InstructorFactory, CourtFactory
from datetime import datetime, date, time, timedelta
from django.utils import timezone

class ClassSchedulingServiceTest(TestCase):
    """Test class scheduling service"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.instructor = InstructorFactory(club=self.club)
        self.court = CourtFactory(club=self.club)
        self.service = ClassSchedulingService()
    
    def test_schedule_validation(self):
        """Test class schedule validation"""
        # Valid schedule
        valid_schedule = {
            'instructor': self.instructor,
            'court': self.court,
            'start_time': timezone.now() + timedelta(days=2),
            'duration_minutes': 60
        }
        
        errors = self.service.validate_schedule(**valid_schedule)
        self.assertEqual(len(errors), 0)
        
        # Past schedule
        past_schedule = {
            'instructor': self.instructor,
            'court': self.court,
            'start_time': timezone.now() - timedelta(days=1),
            'duration_minutes': 60
        }
        
        errors = self.service.validate_schedule(**past_schedule)
        self.assertIn('past', str(errors).lower())
    
    def test_recurring_class_generation(self):
        """Test generating recurring class instances"""
        template = ClassFactory(
            instructor=self.instructor,
            club=self.club
        )
        
        # Generate weekly classes for 4 weeks
        instances = self.service.generate_recurring_classes(
            template=template,
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=29),
            days_of_week=[1, 3, 5],  # Mon, Wed, Fri
            time_slot=time(18, 0),
            court=self.court
        )
        
        # Should generate 12 instances (4 weeks × 3 days)
        self.assertEqual(len(instances), 12)
        
        # Verify all instances
        for instance in instances:
            self.assertEqual(instance.instructor, self.instructor)
            self.assertEqual(instance.start_time.hour, 18)
            self.assertIn(instance.start_time.weekday(), [0, 2, 4])
    
    def test_class_cancellation_handling(self):
        """Test handling class cancellations"""
        class_instance = ClassFactory(
            max_students=6,
            start_time=timezone.now() + timedelta(days=2)
        )
        
        # Add enrollments
        enrollments = []
        for i in range(4):
            enrollment = Enrollment.objects.create(
                class_instance=class_instance,
                student=UserFactory(),
                status='confirmed'
            )
            enrollments.append(enrollment)
        
        # Cancel class
        notifications = self.service.cancel_class(
            class_instance,
            reason="Instructor unavailable",
            notify_students=True
        )
        
        # Check class cancelled
        class_instance.refresh_from_db()
        self.assertEqual(class_instance.status, 'cancelled')
        
        # Check enrollments cancelled
        for enrollment in enrollments:
            enrollment.refresh_from_db()
            self.assertEqual(enrollment.status, 'cancelled')
        
        # Check notifications sent
        self.assertEqual(len(notifications), 4)
```

## 🔌 Integration Tests

### 1. Class CRUD Tests
```python
# backend/tests/integration/classes/test_class_crud.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, ClubFactory, InstructorFactory
from apps.classes.models import Class
from decimal import Decimal

class ClassCRUDTest(APITestCase):
    """Test class CRUD operations"""
    
    def setUp(self):
        self.club_owner = UserFactory()
        self.club = ClubFactory()
        self.club.owners.add(self.club_owner)
        self.instructor = InstructorFactory(club=self.club)
        self.client.force_authenticate(user=self.club_owner)
    
    def test_create_class(self):
        """Test creating a new class"""
        data = {
            "name": "Advanced Tactics Class",
            "instructor": self.instructor.id,
            "class_type": "group",
            "level": "advanced",
            "duration_minutes": 90,
            "max_students": 6,
            "price": "25.00",
            "description": "Master advanced padel tactics",
            "equipment_needed": ["racket", "balls"]
        }
        
        response = self.client.post('/api/v1/classes/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], "Advanced Tactics Class")
        self.assertEqual(response.data['instructor']['id'], str(self.instructor.id))
        self.assertEqual(Decimal(response.data['price']), Decimal("25.00"))
    
    def test_list_classes_with_filters(self):
        """Test listing classes with filters"""
        # Create various classes
        ClassFactory.create_batch(
            3,
            club=self.club,
            level="beginner"
        )
        ClassFactory.create_batch(
            2,
            club=self.club,
            level="advanced"
        )
        
        # Filter by level
        response = self.client.get('/api/v1/classes/', {'level': 'beginner'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        
        # Filter by instructor
        instructor_class = ClassFactory(
            club=self.club,
            instructor=self.instructor
        )
        
        response = self.client.get('/api/v1/classes/', {
            'instructor': self.instructor.id
        })
        self.assertEqual(response.data['count'], 1)
    
    def test_update_class(self):
        """Test updating class details"""
        padel_class = ClassFactory(club=self.club)
        
        data = {
            "max_students": 10,
            "price": "30.00"
        }
        
        response = self.client.patch(
            f'/api/v1/classes/{padel_class.id}/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['max_students'], 10)
        self.assertEqual(Decimal(response.data['price']), Decimal("30.00"))
    
    def test_class_schedule_creation(self):
        """Test creating class schedules"""
        padel_class = ClassFactory(club=self.club)
        
        data = {
            "class_id": padel_class.id,
            "schedules": [
                {
                    "day_of_week": 1,
                    "start_time": "18:00",
                    "court_id": CourtFactory(club=self.club).id
                },
                {
                    "day_of_week": 3,
                    "start_time": "18:00",
                    "court_id": CourtFactory(club=self.club).id
                }
            ],
            "start_date": (timezone.now() + timedelta(days=1)).date().isoformat(),
            "end_date": (timezone.now() + timedelta(days=30)).date().isoformat()
        }
        
        response = self.client.post(
            f'/api/v1/classes/{padel_class.id}/schedule/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['instances']), 8)  # ~4 weeks × 2 days
```

### 2. Enrollment Tests
```python
# backend/tests/integration/classes/test_enrollment.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, ClassFactory
from apps.classes.models import Enrollment
from datetime import timedelta
from django.utils import timezone

class EnrollmentAPITest(APITestCase):
    """Test class enrollment functionality"""
    
    def setUp(self):
        self.student = UserFactory()
        self.class_instance = ClassFactory(
            max_students=4,
            price=Decimal("20.00"),
            start_time=timezone.now() + timedelta(days=3)
        )
        self.client.force_authenticate(user=self.student)
    
    def test_enroll_in_class(self):
        """Test enrolling in a class"""
        response = self.client.post(
            f'/api/v1/classes/{self.class_instance.id}/enroll/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['student']['id'], str(self.student.id))
        
        # Check enrollment created
        enrollment = Enrollment.objects.get(
            class_instance=self.class_instance,
            student=self.student
        )
        self.assertEqual(enrollment.status, 'pending')
    
    def test_enrollment_with_payment(self):
        """Test enrollment with immediate payment"""
        response = self.client.post(
            f'/api/v1/classes/{self.class_instance.id}/enroll/',
            {"payment_method_id": "pm_test_visa"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('payment_intent_id', response.data)
        self.assertEqual(response.data['amount'], "20.00")
    
    def test_waitlist_when_full(self):
        """Test automatic waitlisting when class is full"""
        # Fill the class
        for i in range(self.class_instance.max_students):
            Enrollment.objects.create(
                class_instance=self.class_instance,
                student=UserFactory(),
                status='confirmed'
            )
        
        # Try to enroll
        response = self.client.post(
            f'/api/v1/classes/{self.class_instance.id}/enroll/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'waitlisted')
        self.assertEqual(response.data['waitlist_position'], 1)
    
    def test_unenroll_from_class(self):
        """Test unenrolling from a class"""
        # Create enrollment
        enrollment = Enrollment.objects.create(
            class_instance=self.class_instance,
            student=self.student,
            status='confirmed'
        )
        
        response = self.client.post(
            f'/api/v1/classes/{self.class_instance.id}/unenroll/',
            {"reason": "Schedule conflict"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        enrollment.refresh_from_db()
        self.assertEqual(enrollment.status, 'cancelled')
        self.assertEqual(enrollment.cancellation_reason, "Schedule conflict")
    
    def test_list_student_enrollments(self):
        """Test listing student's enrollments"""
        # Create multiple enrollments
        for i in range(3):
            class_instance = ClassFactory()
            Enrollment.objects.create(
                class_instance=class_instance,
                student=self.student,
                status='confirmed'
            )
        
        response = self.client.get('/api/v1/enrollments/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
```

### 3. Attendance Tests
```python
# backend/tests/integration/classes/test_attendance.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory, ClassFactory, InstructorFactory
from apps.classes.models import Enrollment, Attendance

class AttendanceAPITest(APITestCase):
    """Test attendance tracking functionality"""
    
    def setUp(self):
        self.instructor = InstructorFactory()
        self.class_instance = ClassFactory(
            instructor=self.instructor,
            start_time=timezone.now() - timedelta(hours=1)  # Class happened
        )
        
        # Create enrolled students
        self.students = []
        for i in range(4):
            student = UserFactory()
            Enrollment.objects.create(
                class_instance=self.class_instance,
                student=student,
                status='confirmed'
            )
            self.students.append(student)
    
    def test_mark_attendance_as_instructor(self):
        """Test instructor marking attendance"""
        self.client.force_authenticate(user=self.instructor.user)
        
        data = {
            "attendance": [
                {"student_id": self.students[0].id, "status": "present"},
                {"student_id": self.students[1].id, "status": "present"},
                {"student_id": self.students[2].id, "status": "absent"},
                {"student_id": self.students[3].id, "status": "late"}
            ]
        }
        
        response = self.client.post(
            f'/api/v1/classes/{self.class_instance.id}/attendance/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify attendance records
        attendance_records = Attendance.objects.filter(
            class_instance=self.class_instance
        )
        self.assertEqual(attendance_records.count(), 4)
        
        present_count = attendance_records.filter(status='present').count()
        self.assertEqual(present_count, 2)
    
    def test_attendance_statistics(self):
        """Test getting attendance statistics"""
        # Mark some attendance
        for i, student in enumerate(self.students[:3]):
            Attendance.objects.create(
                class_instance=self.class_instance,
                student=student,
                status='present' if i < 2 else 'absent'
            )
        
        self.client.force_authenticate(user=self.instructor.user)
        
        response = self.client.get(
            f'/api/v1/classes/{self.class_instance.id}/attendance-stats/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data
        self.assertEqual(stats['total_enrolled'], 4)
        self.assertEqual(stats['present'], 2)
        self.assertEqual(stats['absent'], 1)
        self.assertEqual(stats['unmarked'], 1)
        self.assertEqual(stats['attendance_rate'], 50.0)  # 2/4 * 100
```

## 🔄 E2E Flow Tests

### 1. Complete Class Enrollment Flow
```python
# backend/tests/e2e/classes/test_enrollment_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClubFactory, InstructorFactory
from apps.classes.models import Class, Enrollment, ClassPackage
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

class ClassEnrollmentFlowE2ETest(TestCase):
    """Test complete class enrollment flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.student = UserFactory()
        self.club = ClubFactory()
        self.instructor = InstructorFactory(club=self.club)
        self.client.force_authenticate(user=self.student)
    
    def test_browse_enroll_attend_flow(self):
        """Test flow: Browse → Enroll → Pay → Attend → Feedback"""
        
        # Step 1: Browse available classes
        browse_response = self.client.get('/api/v1/classes/', {
            'club': self.club.id,
            'level': 'intermediate',
            'available': True
        })
        self.assertEqual(browse_response.status_code, 200)
        
        # Create a class for testing
        start_time = timezone.now() + timedelta(days=3, hours=2)
        padel_class = Class.objects.create(
            name="Intermediate Tactics",
            club=self.club,
            instructor=self.instructor,
            class_type="group",
            level="intermediate",
            duration_minutes=60,
            max_students=6,
            price=Decimal("20.00"),
            start_time=start_time,
            court=CourtFactory(club=self.club)
        )
        
        # Step 2: Get class details
        detail_response = self.client.get(f'/api/v1/classes/{padel_class.id}/')
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data['available_spots'], 6)
        
        # Step 3: Enroll in class
        enroll_response = self.client.post(
            f'/api/v1/classes/{padel_class.id}/enroll/',
            {"payment_method_id": "pm_test_visa"}
        )
        self.assertEqual(enroll_response.status_code, 201)
        enrollment_id = enroll_response.data['id']
        
        # Step 4: Complete payment (mocked)
        payment_response = self.client.post(
            '/api/v1/payments/confirm/',
            {
                "payment_intent_id": enroll_response.data['payment_intent_id'],
                "enrollment_id": enrollment_id
            }
        )
        self.assertEqual(payment_response.status_code, 200)
        
        # Verify enrollment confirmed
        enrollment = Enrollment.objects.get(id=enrollment_id)
        enrollment.status = 'confirmed'  # Mock payment confirmation
        enrollment.save()
        
        # Step 5: View my classes
        my_classes_response = self.client.get('/api/v1/enrollments/')
        self.assertEqual(my_classes_response.status_code, 200)
        self.assertEqual(my_classes_response.data['count'], 1)
        
        # Step 6: Attend class (instructor marks attendance)
        instructor_client = APIClient()
        instructor_client.force_authenticate(user=self.instructor.user)
        
        # Simulate class has happened
        padel_class.start_time = timezone.now() - timedelta(hours=1)
        padel_class.save()
        
        attendance_response = instructor_client.post(
            f'/api/v1/classes/{padel_class.id}/attendance/',
            {
                "attendance": [
                    {"student_id": self.student.id, "status": "present"}
                ]
            },
            format='json'
        )
        self.assertEqual(attendance_response.status_code, 200)
        
        # Step 7: Leave feedback
        feedback_response = self.client.post(
            f'/api/v1/classes/{padel_class.id}/feedback/',
            {
                "rating": 5,
                "comment": "Excellent class! Learned a lot."
            }
        )
        self.assertEqual(feedback_response.status_code, 201)
        
        # Step 8: View attendance history
        history_response = self.client.get('/api/v1/students/me/attendance/')
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(history_response.data['total_classes'], 1)
        self.assertEqual(history_response.data['attendance_rate'], 100.0)
```

### 2. Package Purchase Flow
```python
# backend/tests/e2e/classes/test_package_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from apps.classes.models import ClassPackage, PackagePurchase
from tests.factories import UserFactory, ClubFactory, ClassFactory

class PackagePurchaseFlowE2ETest(TestCase):
    """Test class package purchase and usage flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.student = UserFactory()
        self.club = ClubFactory()
        self.client.force_authenticate(user=self.student)
    
    def test_package_purchase_and_usage(self):
        """Test flow: Browse packages → Purchase → Use credits → Track usage"""
        
        # Step 1: View available packages
        packages_response = self.client.get(
            f'/api/v1/clubs/{self.club.id}/class-packages/'
        )
        self.assertEqual(packages_response.status_code, 200)
        
        # Create test package
        package = ClassPackage.objects.create(
            club=self.club,
            name="10 Class Bundle",
            class_credits=10,
            price=Decimal("150.00"),
            validity_days=60,
            class_types=['group', 'workshop'],
            description="Save 25% on classes"
        )
        
        # Step 2: Purchase package
        purchase_response = self.client.post(
            f'/api/v1/class-packages/{package.id}/purchase/',
            {"payment_method_id": "pm_test_visa"}
        )
        self.assertEqual(purchase_response.status_code, 201)
        purchase_id = purchase_response.data['id']
        
        # Mock payment completion
        purchase = PackagePurchase.objects.get(id=purchase_id)
        purchase.payment_status = 'completed'
        purchase.save()
        
        # Step 3: View my packages
        my_packages_response = self.client.get('/api/v1/students/me/packages/')
        self.assertEqual(my_packages_response.status_code, 200)
        self.assertEqual(my_packages_response.data[0]['credits_remaining'], 10)
        
        # Step 4: Use package credit for class enrollment
        padel_class = ClassFactory(
            club=self.club,
            class_type='group',
            price=Decimal("20.00")
        )
        
        enroll_response = self.client.post(
            f'/api/v1/classes/{padel_class.id}/enroll/',
            {"use_package": True, "package_id": purchase_id}
        )
        self.assertEqual(enroll_response.status_code, 201)
        self.assertEqual(enroll_response.data['payment_type'], 'package')
        
        # Step 5: Check remaining credits
        purchase.refresh_from_db()
        self.assertEqual(purchase.credits_remaining, 9)
        
        # Step 6: View package usage history
        usage_response = self.client.get(
            f'/api/v1/packages/{purchase_id}/usage/'
        )
        self.assertEqual(usage_response.status_code, 200)
        self.assertEqual(len(usage_response.data['usage']), 1)
        self.assertEqual(usage_response.data['credits_used'], 1)
        self.assertEqual(usage_response.data['credits_remaining'], 9)
```

### 3. Instructor Management Flow
```python
# backend/tests/e2e/classes/test_instructor_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from apps.classes.models import Instructor, Class
from tests.factories import UserFactory, ClubFactory

class InstructorManagementFlowE2ETest(TestCase):
    """Test instructor management flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.club_owner = UserFactory()
        self.club = ClubFactory()
        self.club.owners.add(self.club_owner)
        self.client.force_authenticate(user=self.club_owner)
    
    def test_instructor_onboarding_flow(self):
        """Test flow: Add instructor → Set availability → Assign classes → Track performance"""
        
        # Step 1: Create instructor profile
        instructor_user = UserFactory()
        
        instructor_data = {
            "user": instructor_user.id,
            "title": "Senior Instructor",
            "bio": "Former professional player with 10 years teaching experience",
            "hourly_rate": "45.00",
            "specialties": ["advanced", "competition", "tactics"],
            "languages": ["Spanish", "English"]
        }
        
        create_response = self.client.post(
            f'/api/v1/clubs/{self.club.id}/instructors/',
            instructor_data,
            format='json'
        )
        self.assertEqual(create_response.status_code, 201)
        instructor_id = create_response.data['id']
        
        # Step 2: Add certifications
        cert_response = self.client.post(
            f'/api/v1/instructors/{instructor_id}/certifications/',
            {
                "name": "RPT Level 3",
                "issuing_body": "Royal Spanish Tennis Federation",
                "issue_date": "2020-01-15",
                "expiry_date": "2025-01-15",
                "certificate_file": "cert.pdf"
            }
        )
        self.assertEqual(cert_response.status_code, 201)
        
        # Step 3: Set availability
        availability_data = {
            "availability": [
                {
                    "day_of_week": 1,
                    "start_time": "09:00",
                    "end_time": "14:00"
                },
                {
                    "day_of_week": 3,
                    "start_time": "16:00",
                    "end_time": "21:00"
                },
                {
                    "day_of_week": 5,
                    "start_time": "09:00",
                    "end_time": "14:00"
                }
            ]
        }
        
        availability_response = self.client.post(
            f'/api/v1/instructors/{instructor_id}/availability/',
            availability_data,
            format='json'
        )
        self.assertEqual(availability_response.status_code, 200)
        
        # Step 4: Create class templates
        class_data = {
            "name": "Competition Training",
            "instructor": instructor_id,
            "class_type": "group",
            "level": "advanced",
            "duration_minutes": 90,
            "max_students": 4,
            "price": "35.00"
        }
        
        class_response = self.client.post('/api/v1/classes/', class_data)
        self.assertEqual(class_response.status_code, 201)
        class_id = class_response.data['id']
        
        # Step 5: Generate schedule
        schedule_response = self.client.post(
            f'/api/v1/classes/{class_id}/generate-schedule/',
            {
                "start_date": (timezone.now() + timedelta(days=1)).date().isoformat(),
                "end_date": (timezone.now() + timedelta(days=30)).date().isoformat(),
                "time_slots": [
                    {"day_of_week": 1, "start_time": "10:00"},
                    {"day_of_week": 3, "start_time": "18:00"}
                ]
            }
        )
        self.assertEqual(schedule_response.status_code, 201)
        
        # Step 6: View instructor dashboard
        instructor_client = APIClient()
        instructor_client.force_authenticate(user=instructor_user)
        
        dashboard_response = instructor_client.get(
            '/api/v1/instructors/me/dashboard/'
        )
        self.assertEqual(dashboard_response.status_code, 200)
        
        dashboard = dashboard_response.data
        self.assertIn('upcoming_classes', dashboard)
        self.assertIn('total_students', dashboard)
        self.assertIn('this_week_hours', dashboard)
        self.assertIn('ratings', dashboard)
```

## 🔒 Security Tests

### Class Security Tests
```python
# backend/tests/security/classes/test_security.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory, ClassFactory, EnrollmentFactory

class ClassSecurityTest(TestCase):
    """Test class module security"""
    
    def setUp(self):
        self.client = APIClient()
        self.student = UserFactory()
        self.other_student = UserFactory()
        self.instructor = InstructorFactory()
    
    def test_enrollment_privacy(self):
        """Test students cannot see others' enrollment details"""
        # Create enrollment for other student
        other_enrollment = EnrollmentFactory(student=self.other_student)
        
        self.client.force_authenticate(user=self.student)
        
        # Try to access other's enrollment
        response = self.client.get(
            f'/api/v1/enrollments/{other_enrollment.id}/'
        )
        self.assertEqual(response.status_code, 404)
    
    def test_instructor_data_protection(self):
        """Test instructor sensitive data protection"""
        self.client.force_authenticate(user=self.student)
        
        response = self.client.get(
            f'/api/v1/instructors/{self.instructor.id}/'
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Check sensitive data not exposed
        self.assertNotIn('hourly_rate', response.data)
        self.assertNotIn('personal_email', response.data)
        self.assertNotIn('phone_number', response.data)
    
    def test_attendance_modification_protection(self):
        """Test only instructors can modify attendance"""
        class_instance = ClassFactory(instructor=self.instructor)
        
        # Student tries to mark attendance
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(
            f'/api/v1/classes/{class_instance.id}/attendance/',
            {"attendance": [{"student_id": self.student.id, "status": "present"}]}
        )
        
        self.assertEqual(response.status_code, 403)
```

## 📊 Performance Tests

### Class Performance Tests
```python
# backend/tests/performance/classes/test_performance.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import ClassFactory, UserFactory, EnrollmentFactory
import time

class ClassPerformanceTest(TestCase):
    """Test class module performance"""
    
    def setUp(self):
        self.client = APIClient()
        self.club = ClubFactory()
        
        # Create test data
        self.classes = ClassFactory.create_batch(50, club=self.club)
        
    def test_class_listing_performance(self):
        """Test performance of class listing with enrollments"""
        # Add enrollments to classes
        for cls in self.classes[:30]:
            EnrollmentFactory.create_batch(
                cls.max_students - 1,
                class_instance=cls,
                status='confirmed'
            )
        
        start = time.time()
        response = self.client.get('/api/v1/classes/', {
            'club': self.club.id,
            'available': True
        })
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 0.2)  # Should complete within 200ms
    
    def test_enrollment_check_performance(self):
        """Test performance of checking enrollment availability"""
        class_instance = self.classes[0]
        
        # Add many enrollments
        for i in range(class_instance.max_students - 1):
            EnrollmentFactory(
                class_instance=class_instance,
                status='confirmed'
            )
        
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        start = time.time()
        response = self.client.get(
            f'/api/v1/classes/{class_instance.id}/can-enroll/'
        )
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 0.05)  # Should be very fast
```

## 🎯 Test Execution Commands

### Run All Class Tests
```bash
# Unit tests only
pytest tests/unit/classes/ -v

# Integration tests
pytest tests/integration/classes/ -v

# E2E tests
pytest tests/e2e/classes/ -v

# All class tests
pytest tests/ -k classes -v

# With coverage
pytest tests/ -k classes --cov=apps.classes --cov-report=html
```

### Run Specific Test Categories
```bash
# Enrollment tests
pytest tests/ -k "enrollment" -v

# Instructor tests
pytest tests/ -k "instructor" -v

# Package tests
pytest tests/ -k "package" -v

# Attendance tests
pytest tests/ -k "attendance" -v
```

---

**Siguiente**: [Tournaments Tests](12-Tournaments-Tests.md) →