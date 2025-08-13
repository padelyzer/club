"""
Admin configuration for classes module.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

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


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    """Admin for ClassLevel model."""

    list_display = ["display_name", "name", "order", "color_display", "is_active"]
    list_filter = ["is_active", "name"]
    search_fields = ["display_name", "description"]
    ordering = ["order"]

    def color_display(self, obj):
        return format_html(
            '<div style="width: 20px; height: 20px; background-color: {}; border: 1px solid #ccc;"></div>',
            obj.color,
        )

    color_display.short_description = "Color"


@admin.register(ClassType)
class ClassTypeAdmin(admin.ModelAdmin):
    """Admin for ClassType model."""

    list_display = [
        "display_name",
        "name",
        "organization",
        "club",
        "min_participants",
        "max_participants",
        "base_price",
        "is_active",
    ]
    list_filter = ["organization", "club", "name", "is_active"]
    search_fields = ["display_name", "description"]
    ordering = ["organization", "display_name"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("organization", "club", "name", "display_name", "description")},
        ),
        (
            "Capacity Settings",
            {
                "fields": (
                    "min_participants",
                    "max_participants",
                    "default_duration_minutes",
                )
            },
        ),
        ("Pricing", {"fields": ("base_price", "price_per_participant")}),
        (
            "Settings",
            {
                "fields": (
                    "allow_drop_in",
                    "requires_package",
                    "allow_waitlist",
                    "is_active",
                )
            },
        ),
    )


@admin.register(Instructor)
class InstructorAdmin(admin.ModelAdmin):
    """Admin for Instructor model."""

    list_display = [
        "full_name",
        "organization",
        "club",
        "rating_display",
        "years_experience",
        "is_active",
    ]
    list_filter = ["organization", "club", "is_active", "years_experience"]
    search_fields = ["user__first_name", "user__last_name", "user__email"]
    filter_horizontal = ["specialties"]
    ordering = ["user__first_name", "user__last_name"]

    fieldsets = (
        ("Basic Information", {"fields": ("organization", "club", "user")}),
        (
            "Professional Info",
            {"fields": ("bio", "specialties", "certifications", "years_experience")},
        ),
        (
            "Availability",
            {"fields": ("available_days", "available_from", "available_until")},
        ),
        (
            "Settings",
            {"fields": ("is_active", "accepts_substitutions", "max_weekly_hours")},
        ),
        ("Profile", {"fields": ("photo_url", "instagram")}),
    )

    def full_name(self, obj):
        return obj.user.get_full_name()

    full_name.short_description = "Full Name"

    def rating_display(self, obj):
        return f"{obj.rating:.2f} ({obj.total_ratings} reviews)"

    rating_display.short_description = "Rating"


class ClassSessionInline(admin.TabularInline):
    """Inline for ClassSession model."""

    model = ClassSession
    extra = 0
    fields = [
        "scheduled_datetime",
        "instructor",
        "status",
        "enrolled_count",
        "max_participants",
    ]
    readonly_fields = ["enrolled_count"]


@admin.register(ClassSchedule)
class ClassScheduleAdmin(admin.ModelAdmin):
    """Admin for ClassSchedule model."""

    list_display = [
        "name",
        "class_type",
        "instructor",
        "start_date",
        "recurrence",
        "is_published",
        "is_active",
    ]
    list_filter = [
        "organization",
        "club",
        "class_type",
        "level",
        "recurrence",
        "is_published",
        "is_active",
    ]
    search_fields = [
        "name",
        "description",
        "instructor__user__first_name",
        "instructor__user__last_name",
    ]
    date_hierarchy = "start_date"
    inlines = [ClassSessionInline]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("organization", "club", "name", "description")},
        ),
        (
            "Class Details",
            {"fields": ("class_type", "level", "instructor", "court", "location")},
        ),
        (
            "Schedule",
            {"fields": ("start_date", "end_date", "start_time", "duration_minutes")},
        ),
        ("Recurrence", {"fields": ("recurrence", "recurrence_days")}),
        ("Capacity", {"fields": ("min_participants", "max_participants")}),
        (
            "Pricing",
            {"fields": ("price", "member_price", "allow_drop_in", "drop_in_price")},
        ),
        ("Waitlist", {"fields": ("allow_waitlist", "waitlist_size")}),
        (
            "Enrollment",
            {"fields": ("enrollment_opens_days", "enrollment_closes_hours")},
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
                    "is_published",
                    "cancelled",
                    "cancellation_reason",
                )
            },
        ),
    )


class ClassEnrollmentInline(admin.TabularInline):
    """Inline for ClassEnrollment model."""

    model = ClassEnrollment
    extra = 0
    fields = ["student", "status", "enrolled_at", "paid", "checked_in"]
    readonly_fields = ["enrolled_at"]


@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    """Admin for ClassSession model."""

    list_display = [
        "schedule_name",
        "instructor",
        "scheduled_datetime",
        "status",
        "enrolled_count",
        "max_participants",
    ]
    list_filter = ["organization", "club", "status", "instructor", "scheduled_datetime"]
    search_fields = [
        "schedule__name",
        "instructor__user__first_name",
        "instructor__user__last_name",
    ]
    date_hierarchy = "scheduled_datetime"
    inlines = [ClassEnrollmentInline]

    fieldsets = (
        ("Basic Information", {"fields": ("organization", "club", "schedule")}),
        ("Schedule", {"fields": ("scheduled_datetime", "duration_minutes")}),
        ("Actual Times", {"fields": ("actual_start_time", "actual_end_time")}),
        ("Instructor", {"fields": ("instructor", "substitute_instructor")}),
        ("Location", {"fields": ("court", "location")}),
        (
            "Capacity",
            {"fields": ("max_participants", "enrolled_count", "attended_count")},
        ),
        ("Status", {"fields": ("status", "cancellation_reason", "notes")}),
    )

    readonly_fields = ["enrolled_count", "attended_count"]

    def schedule_name(self, obj):
        return obj.schedule.name

    schedule_name.short_description = "Schedule"


@admin.register(ClassEnrollment)
class ClassEnrollmentAdmin(admin.ModelAdmin):
    """Admin for ClassEnrollment model."""

    list_display = [
        "student",
        "session_name",
        "status",
        "enrolled_at",
        "paid",
        "checked_in",
    ]
    list_filter = [
        "status",
        "paid",
        "checked_in",
        "enrolled_at",
        "session__organization",
        "session__club",
    ]
    search_fields = [
        "student__user__first_name",
        "student__user__last_name",
        "session__schedule__name",
    ]
    date_hierarchy = "enrolled_at"

    fieldsets = (
        ("Basic Information", {"fields": ("session", "student")}),
        ("Status", {"fields": ("status", "waitlist_position")}),
        (
            "Timestamps",
            {"fields": ("enrolled_at", "cancelled_at", "cancellation_reason")},
        ),
        (
            "Payment",
            {
                "fields": (
                    "paid",
                    "payment_amount",
                    "payment_method",
                    "payment_reference",
                )
            },
        ),
        ("Check-in", {"fields": ("checked_in", "check_in_time")}),
        ("Notes", {"fields": ("notes",)}),
    )

    readonly_fields = ["enrolled_at"]

    def session_name(self, obj):
        return obj.session.schedule.name

    session_name.short_description = "Session"


@admin.register(ClassAttendance)
class ClassAttendanceAdmin(admin.ModelAdmin):
    """Admin for ClassAttendance model."""

    list_display = [
        "student",
        "session_name",
        "present",
        "arrival_time",
        "performance_rating",
        "student_rating",
    ]
    list_filter = [
        "present",
        "performance_rating",
        "student_rating",
        "session__organization",
        "session__club",
    ]
    search_fields = [
        "student__user__first_name",
        "student__user__last_name",
        "session__schedule__name",
    ]

    fieldsets = (
        ("Basic Information", {"fields": ("session", "enrollment", "student")}),
        ("Attendance", {"fields": ("present", "arrival_time", "departure_time")}),
        ("Performance", {"fields": ("instructor_notes", "performance_rating")}),
        ("Student Feedback", {"fields": ("student_rating", "student_feedback")}),
    )

    def session_name(self, obj):
        return obj.session.schedule.name

    session_name.short_description = "Session"


@admin.register(InstructorEvaluation)
class InstructorEvaluationAdmin(admin.ModelAdmin):
    """Admin for InstructorEvaluation model."""

    list_display = [
        "instructor",
        "student_display",
        "overall_rating",
        "session_name",
        "would_recommend",
        "created_at",
    ]
    list_filter = [
        "overall_rating",
        "would_recommend",
        "is_anonymous",
        "instructor__organization",
        "instructor__club",
    ]
    search_fields = [
        "instructor__user__first_name",
        "instructor__user__last_name",
        "student__user__first_name",
        "student__user__last_name",
        "comments",
    ]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Basic Information", {"fields": ("instructor", "student", "session")}),
        (
            "Ratings",
            {
                "fields": (
                    "overall_rating",
                    "teaching_quality",
                    "punctuality",
                    "communication",
                )
            },
        ),
        ("Feedback", {"fields": ("comments", "would_recommend")}),
        ("Settings", {"fields": ("is_anonymous",)}),
    )

    def student_display(self, obj):
        return "Anonymous" if obj.is_anonymous else str(obj.student)

    student_display.short_description = "Student"

    def session_name(self, obj):
        return obj.session.schedule.name

    session_name.short_description = "Session"


@admin.register(ClassPackage)
class ClassPackageAdmin(admin.ModelAdmin):
    """Admin for ClassPackage model."""

    list_display = [
        "name",
        "organization",
        "club",
        "num_classes",
        "validity_days",
        "price",
        "is_active",
    ]
    list_filter = ["organization", "club", "is_active", "transferable"]
    search_fields = ["name", "description"]
    filter_horizontal = ["class_types"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("organization", "club", "name", "description")},
        ),
        ("Classes", {"fields": ("class_types", "num_classes")}),
        ("Validity", {"fields": ("validity_days",)}),
        ("Pricing", {"fields": ("price",)}),
        ("Settings", {"fields": ("is_active", "transferable")}),
    )


@admin.register(StudentPackage)
class StudentPackageAdmin(admin.ModelAdmin):
    """Admin for StudentPackage model."""

    list_display = [
        "student",
        "package_name",
        "purchased_at",
        "expires_at",
        "classes_remaining",
        "classes_used",
        "is_active",
    ]
    list_filter = ["is_active", "purchased_at", "expires_at"]
    search_fields = [
        "student__user__first_name",
        "student__user__last_name",
        "package__name",
    ]
    date_hierarchy = "purchased_at"

    fieldsets = (
        ("Basic Information", {"fields": ("student", "package")}),
        ("Purchase Info", {"fields": ("purchased_at", "expires_at")}),
        ("Usage", {"fields": ("classes_remaining", "classes_used")}),
        ("Payment", {"fields": ("payment_amount", "payment_reference")}),
        ("Status", {"fields": ("is_active",)}),
    )

    readonly_fields = ["purchased_at"]

    def package_name(self, obj):
        return obj.package.name

    package_name.short_description = "Package"
