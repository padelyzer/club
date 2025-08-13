"""
Models for classes module.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import BaseModel, MultiTenantModel

User = get_user_model()


class ClassLevel(BaseModel):
    """
    Class difficulty levels.
    """

    LEVEL_CHOICES = [
        ("beginner", "Principiante"),
        ("intermediate", "Intermedio"),
        ("advanced", "Avanzado"),
        ("all_levels", "Todos los Niveles"),
    ]

    name = models.CharField(max_length=50, choices=LEVEL_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0, help_text="Order for display")
    color = models.CharField(
        max_length=7, default="#000000", help_text="Hex color code"
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or name")

    class Meta:
        ordering = ["order"]
        verbose_name = "Class Level"
        verbose_name_plural = "Class Levels"

    def __str__(self):
        return self.display_name


class ClassType(MultiTenantModel):
    """
    Types of classes offered (group, individual, clinic, intensive).
    """

    TYPE_CHOICES = [
        ("group", "Grupal"),
        ("individual", "Individual"),
        ("clinic", "Clínica"),
        ("intensive", "Intensivo"),
        ("workshop", "Taller"),
    ]

    name = models.CharField(max_length=50, choices=TYPE_CHOICES)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Capacity settings
    min_participants = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    max_participants = models.IntegerField(
        default=4, validators=[MinValueValidator(1), MaxValueValidator(20)]
    )

    # Duration settings
    default_duration_minutes = models.IntegerField(
        default=60, validators=[MinValueValidator(30), MaxValueValidator(240)]
    )

    # Pricing
    base_price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )
    price_per_participant = models.BooleanField(
        default=False, help_text="If true, price is per participant"
    )

    # Settings
    allow_drop_in = models.BooleanField(default=False)
    requires_package = models.BooleanField(default=False)
    allow_waitlist = models.BooleanField(default=True)

    class Meta:
        ordering = ["organization", "name"]
        unique_together = ["organization", "club", "name"]
        verbose_name = "Class Type"
        verbose_name_plural = "Class Types"

    def __str__(self):
        return f"{self.club.name if self.club else self.organization.name} - {self.display_name}"


class Instructor(MultiTenantModel):
    """
    Instructors who teach classes.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="instructor_profile"
    )

    # Professional info
    bio = models.TextField(blank=True)
    specialties = models.ManyToManyField(
        ClassType, blank=True, related_name="specialized_instructors"
    )
    certifications = models.JSONField(default=list, help_text="List of certifications")
    years_experience = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    # Availability
    available_days = models.JSONField(
        default=list, help_text="List of available days (0=Monday, 6=Sunday)"
    )
    available_from = models.TimeField(default="08:00")
    available_until = models.TimeField(default="20:00")

    # Rating
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    total_ratings = models.IntegerField(default=0)

    # Settings
    is_active = models.BooleanField(default=True)
    accepts_substitutions = models.BooleanField(default=True)
    max_weekly_hours = models.IntegerField(
        default=40, validators=[MinValueValidator(1), MaxValueValidator(60)]
    )

    # Profile
    photo_url = models.URLField(blank=True)
    instagram = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["organization", "user__first_name", "user__last_name"]
        verbose_name = "Instructor"
        verbose_name_plural = "Instructors"

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.club.name if self.club else 'All Clubs'}"

    def update_rating(self, new_rating):
        """Update instructor rating with new rating."""
        total = self.rating * self.total_ratings + new_rating
        self.total_ratings += 1
        self.rating = total / self.total_ratings
        self.save(update_fields=["rating", "total_ratings", "updated_at"])


class ClassSchedule(MultiTenantModel):
    """
    Schedule for classes (recurring or one-time).
    """

    RECURRENCE_CHOICES = [
        ("once", "Una vez"),
        ("daily", "Diario"),
        ("weekly", "Semanal"),
        ("biweekly", "Quincenal"),
        ("monthly", "Mensual"),
    ]

    # Basic info
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    class_type = models.ForeignKey(
        ClassType, on_delete=models.PROTECT, related_name="schedules"
    )
    level = models.ForeignKey(
        ClassLevel, on_delete=models.PROTECT, related_name="schedules"
    )
    instructor = models.ForeignKey(
        Instructor, on_delete=models.PROTECT, related_name="schedules"
    )

    # Location
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.PROTECT,
        related_name="class_schedules",
        null=True,
        blank=True,
    )
    location = models.CharField(
        max_length=100, blank=True, help_text="Alternative location if not on court"
    )

    # Schedule
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField()
    duration_minutes = models.IntegerField(
        validators=[MinValueValidator(30), MaxValueValidator(240)]
    )

    # Recurrence
    recurrence = models.CharField(
        max_length=20, choices=RECURRENCE_CHOICES, default="weekly"
    )
    recurrence_days = models.JSONField(
        default=list,
        help_text="Days of week for weekly recurrence (0=Monday, 6=Sunday)",
    )

    # Capacity
    min_participants = models.IntegerField(validators=[MinValueValidator(1)])
    max_participants = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )

    # Pricing
    price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )
    member_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    # Settings
    allow_drop_in = models.BooleanField(default=False)
    drop_in_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    allow_waitlist = models.BooleanField(default=True)
    waitlist_size = models.IntegerField(default=5, validators=[MinValueValidator(0)])

    # Enrollment
    enrollment_opens_days = models.IntegerField(
        default=30,
        validators=[MinValueValidator(0)],
        help_text="Days before class when enrollment opens",
    )
    enrollment_closes_hours = models.IntegerField(
        default=2,
        validators=[MinValueValidator(0)],
        help_text="Hours before class when enrollment closes",
    )

    # Status
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    cancelled = models.BooleanField(default=False)
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["organization", "start_date", "start_time"]
        indexes = [
            models.Index(fields=["organization", "start_date", "is_active"]),
            models.Index(fields=["instructor", "start_date"]),
            models.Index(fields=["court", "start_date", "start_time"]),
        ]
        verbose_name = "Class Schedule"
        verbose_name_plural = "Class Schedules"

    def __str__(self):
        return f"{self.name} - {self.instructor.user.get_full_name()}"

    def generate_sessions(self, until_date=None):
        """Generate individual class sessions based on schedule."""
        from datetime import date, datetime, timedelta

        if not until_date:
            until_date = self.end_date or (self.start_date + timedelta(days=365))

        current_date = self.start_date
        sessions_created = 0

        while current_date <= until_date:
            # Check if we should create session for this date
            should_create = False

            if self.recurrence == "once" and current_date == self.start_date:
                should_create = True
            elif self.recurrence == "daily":
                should_create = True
            elif (
                self.recurrence == "weekly"
                and current_date.weekday() in self.recurrence_days
            ):
                should_create = True
            elif self.recurrence == "biweekly":
                weeks_diff = (current_date - self.start_date).days // 7
                if (
                    weeks_diff % 2 == 0
                    and current_date.weekday() in self.recurrence_days
                ):
                    should_create = True
            elif (
                self.recurrence == "monthly" and current_date.day == self.start_date.day
            ):
                should_create = True

            if should_create:
                # Check if session already exists
                session_datetime = datetime.combine(current_date, self.start_time)
                if not ClassSession.objects.filter(
                    schedule=self, scheduled_datetime=session_datetime
                ).exists():
                    ClassSession.objects.create(
                        organization=self.organization,
                        club=self.club,
                        schedule=self,
                        scheduled_datetime=session_datetime,
                        duration_minutes=self.duration_minutes,
                        instructor=self.instructor,
                        max_participants=self.max_participants,
                    )
                    sessions_created += 1

            # Move to next date
            if self.recurrence == "once":
                break
            elif self.recurrence == "daily":
                current_date += timedelta(days=1)
            elif self.recurrence == "weekly":
                current_date += timedelta(days=1)
            elif self.recurrence == "biweekly":
                current_date += timedelta(days=1)
            elif self.recurrence == "monthly":
                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(
                        year=current_date.year + 1, month=1
                    )
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        return sessions_created


class ClassSession(MultiTenantModel):
    """
    Individual class session instance.
    """

    STATUS_CHOICES = [
        ("scheduled", "Programada"),
        ("confirmed", "Confirmada"),
        ("in_progress", "En Progreso"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
    ]

    schedule = models.ForeignKey(
        ClassSchedule, on_delete=models.CASCADE, related_name="sessions"
    )

    # DateTime
    scheduled_datetime = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField()

    # Instructor
    instructor = models.ForeignKey(
        Instructor, on_delete=models.PROTECT, related_name="sessions"
    )
    substitute_instructor = models.ForeignKey(
        Instructor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="substitute_sessions",
    )

    # Location
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_sessions",
    )
    location = models.CharField(max_length=100, blank=True)

    # Capacity
    max_participants = models.IntegerField()
    enrolled_count = models.IntegerField(default=0)
    attended_count = models.IntegerField(default=0)

    # Status
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="scheduled"
    )
    cancellation_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["scheduled_datetime"]
        indexes = [
            models.Index(fields=["organization", "scheduled_datetime", "status"]),
            models.Index(fields=["instructor", "scheduled_datetime"]),
            models.Index(fields=["court", "scheduled_datetime"]),
        ]
        unique_together = ["schedule", "scheduled_datetime"]
        verbose_name = "Class Session"
        verbose_name_plural = "Class Sessions"

    def __str__(self):
        return f"{self.schedule.name} - {self.scheduled_datetime}"

    @property
    def is_full(self):
        """Check if class is full."""
        return self.enrolled_count >= self.max_participants

    @property
    def available_spots(self):
        """Get number of available spots."""
        return max(0, self.max_participants - self.enrolled_count)

    def can_enroll(self, user):
        """Check if user can enroll in this session."""
        # Check if session is cancelled
        if self.status == "cancelled":
            return False, "La clase está cancelada"

        # Check if session has already started
        if timezone.now() > self.scheduled_datetime:
            return False, "La clase ya comenzó"

        # Check enrollment deadline
        enrollment_deadline = self.scheduled_datetime - timedelta(
            hours=self.schedule.enrollment_closes_hours
        )
        if timezone.now() > enrollment_deadline:
            return False, "El período de inscripción ha cerrado"

        # Check if already enrolled
        if self.enrollments.filter(
            student__user=user, status__in=["enrolled", "waitlisted"]
        ).exists():
            return False, "Ya estás inscrito en esta clase"

        # Check if class is full
        if self.is_full and not self.schedule.allow_waitlist:
            return False, "La clase está llena"

        return True, "Puede inscribirse"

    def cancel(self, reason=""):
        """Cancel the session."""
        self.status = "cancelled"
        self.cancellation_reason = reason
        self.save()

        # TODO: Send notifications to enrolled students


class ClassEnrollment(BaseModel):
    """
    Student enrollment in class sessions.
    """

    STATUS_CHOICES = [
        ("enrolled", "Inscrito"),
        ("waitlisted", "Lista de Espera"),
        ("cancelled", "Cancelado"),
        ("no_show", "No Asistió"),
    ]

    session = models.ForeignKey(
        ClassSession, on_delete=models.CASCADE, related_name="enrollments"
    )
    student = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="class_enrollments",
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="enrolled")
    waitlist_position = models.IntegerField(null=True, blank=True)

    # Timestamps
    enrolled_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    # Payment
    paid = models.BooleanField(default=False)
    payment_amount = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)

    # Check-in
    checked_in = models.BooleanField(default=False)
    check_in_time = models.DateTimeField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["session__scheduled_datetime", "enrolled_at"]
        unique_together = ["session", "student"]
        indexes = [
            models.Index(fields=["session", "status"]),
            models.Index(fields=["student", "status"]),
        ]
        verbose_name = "Class Enrollment"
        verbose_name_plural = "Class Enrollments"

    def __str__(self):
        return f"{self.student} - {self.session} ({self.get_status_display()})"

    def cancel(self, reason=""):
        """Cancel enrollment."""
        self.status = "cancelled"
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save()

        # Update session enrolled count
        self.session.enrolled_count = self.session.enrollments.filter(
            status="enrolled"
        ).count()
        self.session.save()

        # Promote from waitlist if applicable
        if self.session.schedule.allow_waitlist:
            next_waitlisted = (
                self.session.enrollments.filter(status="waitlisted")
                .order_by("waitlist_position")
                .first()
            )

            if next_waitlisted:
                next_waitlisted.status = "enrolled"
                next_waitlisted.waitlist_position = None
                next_waitlisted.save()

                # Update remaining waitlist positions
                remaining_waitlist = self.session.enrollments.filter(
                    status="waitlisted"
                ).order_by("waitlist_position")
                for i, enrollment in enumerate(remaining_waitlist):
                    enrollment.waitlist_position = i + 1
                    enrollment.save()

    def check_in(self):
        """Check in student for class."""
        self.checked_in = True
        self.check_in_time = timezone.now()
        self.save()


class ClassAttendance(BaseModel):
    """
    Attendance record for class sessions.
    """

    session = models.ForeignKey(
        ClassSession, on_delete=models.CASCADE, related_name="attendance_records"
    )
    enrollment = models.OneToOneField(
        ClassEnrollment, on_delete=models.CASCADE, related_name="attendance"
    )
    student = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="class_attendance",
    )

    # Attendance
    present = models.BooleanField(default=False)
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)

    # Performance
    instructor_notes = models.TextField(blank=True)
    performance_rating = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    # Student feedback
    student_rating = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    student_feedback = models.TextField(blank=True)

    class Meta:
        ordering = ["session__scheduled_datetime"]
        unique_together = ["session", "student"]
        verbose_name = "Class Attendance"
        verbose_name_plural = "Class Attendance Records"

    def __str__(self):
        return f"{self.student} - {self.session} ({'Present' if self.present else 'Absent'})"


class InstructorEvaluation(BaseModel):
    """
    Student evaluation of instructors.
    """

    instructor = models.ForeignKey(
        Instructor, on_delete=models.CASCADE, related_name="evaluations"
    )
    student = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="instructor_evaluations",
    )
    session = models.ForeignKey(
        ClassSession, on_delete=models.CASCADE, related_name="instructor_evaluations"
    )

    # Ratings
    overall_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    teaching_quality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    punctuality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    communication = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    # Feedback
    comments = models.TextField(blank=True)
    would_recommend = models.BooleanField(default=True)

    # Anonymous option
    is_anonymous = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["instructor", "student", "session"]
        verbose_name = "Instructor Evaluation"
        verbose_name_plural = "Instructor Evaluations"

    def __str__(self):
        student_name = "Anonymous" if self.is_anonymous else str(self.student)
        return f"{self.instructor} - {student_name} ({self.overall_rating}/5)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update instructor rating
        self.instructor.update_rating(self.overall_rating)


class ClassPackage(MultiTenantModel):
    """
    Class packages for bulk purchases.
    """

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Classes included
    class_types = models.ManyToManyField(ClassType, related_name="packages")
    num_classes = models.IntegerField(validators=[MinValueValidator(1)])

    # Validity
    validity_days = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Days package is valid after purchase",
    )

    # Pricing
    price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )

    # Settings
    is_active = models.BooleanField(default=True)
    transferable = models.BooleanField(default=False)

    class Meta:
        ordering = ["organization", "name"]
        verbose_name = "Class Package"
        verbose_name_plural = "Class Packages"

    def __str__(self):
        return f"{self.name} - {self.num_classes} classes"


class StudentPackage(BaseModel):
    """
    Student's purchased class packages.
    """

    student = models.ForeignKey(
        "clients.ClientProfile", on_delete=models.CASCADE, related_name="class_packages"
    )
    package = models.ForeignKey(
        ClassPackage, on_delete=models.PROTECT, related_name="student_packages"
    )

    # Purchase info
    purchased_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    # Usage
    classes_remaining = models.IntegerField()
    classes_used = models.IntegerField(default=0)

    # Payment
    payment_amount = models.DecimalField(max_digits=8, decimal_places=2)
    payment_reference = models.CharField(max_length=100)

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-purchased_at"]
        verbose_name = "Student Package"
        verbose_name_plural = "Student Packages"

    def __str__(self):
        return (
            f"{self.student} - {self.package.name} ({self.classes_remaining} remaining)"
        )

    def use_class(self):
        """Use one class from package."""
        if self.classes_remaining > 0:
            self.classes_remaining -= 1
            self.classes_used += 1
            self.save()
            return True
        return False
