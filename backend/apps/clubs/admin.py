"""
EMERGENCY RECOVERY - Clean admin configuration for clubs module.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import Announcement, Club, Court, Schedule, CourtSpecialPricing


class CourtInline(admin.TabularInline):
    """Inline admin for Courts in Club."""

    model = Court
    extra = 1
    fields = [
        "name",
        "number",
        "surface_type",
        "has_lighting",
        "price_per_hour",
        "is_active",
    ]


class ScheduleInline(admin.TabularInline):
    """Inline admin for Schedule in Club."""

    model = Schedule
    extra = 0
    fields = ["weekday", "opening_time", "closing_time", "is_closed"]


class CourtSpecialPricingInline(admin.TabularInline):
    """Inline admin for Special Pricing in Court."""

    model = CourtSpecialPricing
    extra = 0
    fields = [
        "name",
        "period_type",
        "start_date",
        "end_date",
        "price_per_hour",
        "priority",
        "is_active",
    ]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    """Admin for Club model - EMERGENCY RECOVERY VERSION."""

    list_display = [
        "name",
        "organization",
        "email",
        "phone",
        "total_courts",
        "get_active_courts_count",
        "is_active",
        "created_at",
    ]
    list_filter = ["organization", "is_active", "created_at"]
    search_fields = ["name", "email", "phone", "description"]
    readonly_fields = ["slug", "created_at", "updated_at", "get_active_courts_count"]
    inlines = [CourtInline, ScheduleInline]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("organization", "name", "slug", "description")},
        ),
        ("Contact Information", {"fields": ("email", "phone", "website")}),
        ("Location", {"fields": ("address", "latitude", "longitude")}),
        ("Schedule", {"fields": ("opening_time", "closing_time", "days_open")}),
        ("Branding", {"fields": ("logo_url", "cover_image_url", "primary_color")}),
        ("Features & Settings", {"fields": ("features", "settings")}),
        (
            "Metrics",
            {"fields": ("total_courts", "total_members", "get_active_courts_count")},
        ),
        ("Status", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("organization")


@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    """Admin for Court model - EMERGENCY RECOVERY VERSION."""

    list_display = [
        "name",
        "club",
        "number",
        "surface_type",
        "price_per_hour",
        "has_lighting",
        "is_maintenance",
        "is_active",
    ]
    list_filter = [
        "club",
        "surface_type",
        "has_lighting",
        "has_heating",
        "has_roof",
        "is_maintenance",
        "is_active",
    ]
    search_fields = ["name", "club__name"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [CourtSpecialPricingInline]

    fieldsets = (
        ("Basic Information", {"fields": ("club", "organization", "name", "number")}),
        (
            "Specifications",
            {"fields": ("surface_type", "has_lighting", "has_heating", "has_roof")},
        ),
        ("Pricing", {"fields": ("price_per_hour",)}),
        ("Maintenance", {"fields": ("is_maintenance", "maintenance_notes")}),
        ("Status", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("club", "organization")


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    """Admin for Schedule model - EMERGENCY RECOVERY VERSION."""

    list_display = [
        "club",
        "get_weekday_display",
        "opening_time",
        "closing_time",
        "is_closed",
        "is_active",
    ]
    list_filter = ["club", "weekday", "is_closed", "is_active"]
    search_fields = ["club__name", "notes"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Club", {"fields": ("club", "organization")}),
        (
            "Schedule",
            {"fields": ("weekday", "opening_time", "closing_time", "is_closed")},
        ),
        ("Notes", {"fields": ("notes",)}),
        ("Status", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("club", "organization")


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    """Admin for Announcement model - EMERGENCY RECOVERY VERSION."""

    list_display = [
        "title",
        "club",
        "announcement_type",
        "is_priority",
        "starts_at",
        "ends_at",
        "show_on_app",
    ]
    list_filter = [
        "club",
        "announcement_type",
        "is_priority",
        "show_on_app",
        "show_on_website",
        "starts_at",
    ]
    search_fields = ["title", "content", "club__name"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "starts_at"

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "club",
                    "organization",
                    "title",
                    "content",
                    "announcement_type",
                )
            },
        ),
        ("Scheduling", {"fields": ("starts_at", "ends_at")}),
        (
            "Display Settings",
            {"fields": ("is_priority", "show_on_app", "show_on_website")},
        ),
        ("Status", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("club", "organization")




