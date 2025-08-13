"""
Serializers for classes module.
"""

from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

from rest_framework import serializers

from apps.classes.models import (
    ClassAttendance,
    ClassEnrollment,
    ClassLevel,
    ClassPackage,
    ClassSchedule,
    ClassSession,
    ClassType,
    Instructor,
    InstructorEvaluation,
    StudentPackage,
)

# Avoid circular imports - will import where needed
ClientProfile = None
Court = None

User = get_user_model()


# Simple serializers to avoid circular imports
class ClientProfileSerializer(serializers.ModelSerializer):
    """Simple ClientProfile serializer for classes module."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        from apps.clients.models import ClientProfile

        model = ClientProfile
        fields = ["id", "user", "user_email", "full_name", "level", "rating"]
        read_only_fields = ["id", "user_email", "full_name"]

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class CourtSerializer(serializers.ModelSerializer):
    """Simple Court serializer for classes module."""

    club_name = serializers.CharField(source="club.name", read_only=True)

    class Meta:
        from apps.clubs.models import Court

        model = Court
        fields = ["id", "club", "club_name", "name", "number", "surface_type"]
        read_only_fields = ["id", "club_name"]


class ClassLevelSerializer(serializers.ModelSerializer):
    """Serializer for ClassLevel model."""

    class Meta:
        model = ClassLevel
        fields = [
            "id",
            "name",
            "display_name",
            "description",
            "order",
            "color",
            "icon",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ClassTypeSerializer(serializers.ModelSerializer):
    """Serializer for ClassType model."""

    class Meta:
        model = ClassType
        fields = [
            "id",
            "organization",
            "club",
            "name",
            "display_name",
            "description",
            "min_participants",
            "max_participants",
            "default_duration_minutes",
            "base_price",
            "price_per_participant",
            "allow_drop_in",
            "requires_package",
            "allow_waitlist",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InstructorSerializer(serializers.ModelSerializer):
    """Serializer for Instructor model."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    full_name = serializers.SerializerMethodField()
    specialties = ClassTypeSerializer(many=True, read_only=True)
    specialty_ids = serializers.PrimaryKeyRelatedField(
        queryset=ClassType.objects.all(),
        many=True,
        write_only=True,
        source="specialties",
    )

    class Meta:
        model = Instructor
        fields = [
            "id",
            "organization",
            "club",
            "user",
            "user_email",
            "user_first_name",
            "user_last_name",
            "full_name",
            "bio",
            "specialties",
            "specialty_ids",
            "certifications",
            "years_experience",
            "available_days",
            "available_from",
            "available_until",
            "rating",
            "total_ratings",
            "is_active",
            "accepts_substitutions",
            "max_weekly_hours",
            "photo_url",
            "instagram",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "user_first_name",
            "user_last_name",
            "full_name",
            "rating",
            "total_ratings",
            "created_at",
            "updated_at",
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class ClassScheduleSerializer(serializers.ModelSerializer):
    """Serializer for ClassSchedule model."""

    class_type = ClassTypeSerializer(read_only=True)
    class_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassType.objects.all(), write_only=True, source="class_type"
    )
    level = ClassLevelSerializer(read_only=True)
    level_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassLevel.objects.all(), write_only=True, source="level"
    )
    instructor = InstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=Instructor.objects.all(), write_only=True, source="instructor"
    )
    court = CourtSerializer(read_only=True)
    court_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassSchedule.objects.none(),  # Will be set in __init__
        write_only=True,
        source="court",
        required=False,
    )
    upcoming_sessions_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassSchedule
        fields = [
            "id",
            "organization",
            "club",
            "name",
            "description",
            "class_type",
            "class_type_id",
            "level",
            "level_id",
            "instructor",
            "instructor_id",
            "court",
            "court_id",
            "location",
            "start_date",
            "end_date",
            "start_time",
            "duration_minutes",
            "recurrence",
            "recurrence_days",
            "min_participants",
            "max_participants",
            "price",
            "member_price",
            "allow_drop_in",
            "drop_in_price",
            "allow_waitlist",
            "waitlist_size",
            "enrollment_opens_days",
            "enrollment_closes_hours",
            "is_active",
            "is_published",
            "cancelled",
            "cancellation_reason",
            "upcoming_sessions_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "upcoming_sessions_count", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import Court here to avoid circular import
        from apps.clubs.models import Court

        self.fields["court_id"].queryset = Court.objects.all()

    def get_upcoming_sessions_count(self, obj):
        return obj.sessions.filter(
            scheduled_datetime__gte=timezone.now(), status="scheduled"
        ).count()

    def validate(self, data):
        """Validate schedule data."""
        # Ensure court or location is provided
        if not data.get("court") and not data.get("location"):
            raise serializers.ValidationError(
                "Either court or location must be provided."
            )

        # Validate recurrence days for weekly/biweekly
        if data.get("recurrence") in ["weekly", "biweekly"]:
            if not data.get("recurrence_days"):
                raise serializers.ValidationError(
                    "Recurrence days must be provided for weekly/biweekly schedules."
                )

        # Validate min/max participants
        if data.get("min_participants", 1) > data.get("max_participants", 1):
            raise serializers.ValidationError(
                "Minimum participants cannot be greater than maximum participants."
            )

        return data


class ClassSessionSerializer(serializers.ModelSerializer):
    """Serializer for ClassSession model."""

    schedule = ClassScheduleSerializer(read_only=True)
    schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassSchedule.objects.all(), write_only=True, source="schedule"
    )
    instructor = InstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=Instructor.objects.all(), write_only=True, source="instructor"
    )
    substitute_instructor = InstructorSerializer(read_only=True)
    substitute_instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=Instructor.objects.all(),
        write_only=True,
        source="substitute_instructor",
        required=False,
        allow_null=True,
    )
    court = CourtSerializer(read_only=True)
    court_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassSession.objects.none(),  # Will be set in __init__
        write_only=True,
        source="court",
        required=False,
        allow_null=True,
    )
    is_full = serializers.BooleanField(read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    can_enroll = serializers.SerializerMethodField()

    class Meta:
        model = ClassSession
        fields = [
            "id",
            "organization",
            "club",
            "schedule",
            "schedule_id",
            "scheduled_datetime",
            "actual_start_time",
            "actual_end_time",
            "duration_minutes",
            "instructor",
            "instructor_id",
            "substitute_instructor",
            "substitute_instructor_id",
            "court",
            "court_id",
            "location",
            "max_participants",
            "enrolled_count",
            "attended_count",
            "status",
            "cancellation_reason",
            "notes",
            "is_full",
            "available_spots",
            "can_enroll",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "enrolled_count",
            "attended_count",
            "is_full",
            "available_spots",
            "can_enroll",
            "created_at",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import Court here to avoid circular import
        from apps.clubs.models import Court

        self.fields["court_id"].queryset = Court.objects.all()

    def get_can_enroll(self, obj):
        """Check if current user can enroll."""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            can_enroll, reason = obj.can_enroll(request.user)
            return {"allowed": can_enroll, "reason": reason}
        return {"allowed": False, "reason": "Usuario no autenticado"}


class ClassEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for ClassEnrollment model."""

    session = ClassSessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassSession.objects.all(), write_only=True, source="session"
    )
    student = ClientProfileSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassEnrollment.objects.none(),  # Will be set in __init__
        write_only=True,
        source="student",
    )

    class Meta:
        model = ClassEnrollment
        fields = [
            "id",
            "session",
            "session_id",
            "student",
            "student_id",
            "status",
            "waitlist_position",
            "enrolled_at",
            "cancelled_at",
            "cancellation_reason",
            "paid",
            "payment_amount",
            "payment_method",
            "payment_reference",
            "checked_in",
            "check_in_time",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "enrolled_at",
            "cancelled_at",
            "waitlist_position",
            "created_at",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import ClientProfile here to avoid circular import
        from apps.clients.models import ClientProfile

        self.fields["student_id"].queryset = ClientProfile.objects.all()

    def create(self, validated_data):
        """Create enrollment and handle waitlist."""
        session = validated_data["session"]
        student = validated_data["student"]

        # Check if can enroll
        can_enroll, reason = session.can_enroll(student.user)
        if not can_enroll:
            raise serializers.ValidationError(reason)

        # Determine if enrollment or waitlist
        if session.is_full:
            validated_data["status"] = "waitlisted"
            # Calculate waitlist position
            last_position = (
                session.enrollments.filter(status="waitlisted").aggregate(
                    max_position=models.Max("waitlist_position")
                )["max_position"]
                or 0
            )
            validated_data["waitlist_position"] = last_position + 1
        else:
            validated_data["status"] = "enrolled"

        enrollment = super().create(validated_data)

        # Update session enrolled count
        session.enrolled_count = session.enrollments.filter(status="enrolled").count()
        session.save()

        return enrollment


class ClassAttendanceSerializer(serializers.ModelSerializer):
    """Serializer for ClassAttendance model."""

    session = ClassSessionSerializer(read_only=True)
    enrollment = ClassEnrollmentSerializer(read_only=True)
    student = ClientProfileSerializer(read_only=True)

    class Meta:
        model = ClassAttendance
        fields = [
            "id",
            "session",
            "enrollment",
            "student",
            "present",
            "arrival_time",
            "departure_time",
            "instructor_notes",
            "performance_rating",
            "student_rating",
            "student_feedback",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InstructorEvaluationSerializer(serializers.ModelSerializer):
    """Serializer for InstructorEvaluation model."""

    instructor = InstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=Instructor.objects.all(), write_only=True, source="instructor"
    )
    student = ClientProfileSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassEnrollment.objects.none(),  # Will be set in __init__
        write_only=True,
        source="student",
    )
    session = ClassSessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassSession.objects.all(), write_only=True, source="session"
    )

    class Meta:
        model = InstructorEvaluation
        fields = [
            "id",
            "instructor",
            "instructor_id",
            "student",
            "student_id",
            "session",
            "session_id",
            "overall_rating",
            "teaching_quality",
            "punctuality",
            "communication",
            "comments",
            "would_recommend",
            "is_anonymous",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        """Validate evaluation data."""
        # Ensure student was enrolled in the session
        enrollment = ClassEnrollment.objects.filter(
            session=data["session"], student=data["student"]
        ).first()

        if not enrollment:
            raise serializers.ValidationError(
                "Student was not enrolled in this session."
            )

        # Ensure session is completed
        if data["session"].status != "completed":
            raise serializers.ValidationError("Can only evaluate completed sessions.")

        return data


class ClassPackageSerializer(serializers.ModelSerializer):
    """Serializer for ClassPackage model."""

    class_types = ClassTypeSerializer(many=True, read_only=True)
    class_type_ids = serializers.PrimaryKeyRelatedField(
        queryset=ClassType.objects.all(),
        many=True,
        write_only=True,
        source="class_types",
    )

    class Meta:
        model = ClassPackage
        fields = [
            "id",
            "organization",
            "club",
            "name",
            "description",
            "class_types",
            "class_type_ids",
            "num_classes",
            "validity_days",
            "price",
            "is_active",
            "transferable",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StudentPackageSerializer(serializers.ModelSerializer):
    """Serializer for StudentPackage model."""

    student = ClientProfileSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassEnrollment.objects.none(),  # Will be set in __init__
        write_only=True,
        source="student",
    )
    package = ClassPackageSerializer(read_only=True)
    package_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassPackage.objects.all(), write_only=True, source="package"
    )

    class Meta:
        model = StudentPackage
        fields = [
            "id",
            "student",
            "student_id",
            "package",
            "package_id",
            "purchased_at",
            "expires_at",
            "classes_remaining",
            "classes_used",
            "payment_amount",
            "payment_reference",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "purchased_at",
            "classes_used",
            "created_at",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import ClientProfile here to avoid circular import
        from apps.clients.models import ClientProfile

        self.fields["student_id"].queryset = ClientProfile.objects.all()

    def create(self, validated_data):
        """Create student package with expiration date."""
        package = validated_data["package"]

        # Calculate expiration date
        validated_data["expires_at"] = timezone.now() + timezone.timedelta(
            days=package.validity_days
        )

        # Set initial classes
        validated_data["classes_remaining"] = package.num_classes

        return super().create(validated_data)


# Remove circular import - these are already imported correctly above
