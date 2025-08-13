"""
Fixed admin configuration for reservations module.
"""

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import BlockedSlot, Reservation, ReservationPayment


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    """Admin for reservations."""

    list_display = [
        "date",
        "time_slot",
        "club_name",
        "court_name",
        "player_name",
        "status_badge",
        "payment_status_badge",
        "total_price",
        "reservation_type",
    ]
    list_filter = [
        "status",
        "payment_status",
        "reservation_type",
        "club",
        "date",
        "created_at"
    ]
    search_fields = ["player_name", "player_email", "created_by__email", "notes"]
    date_hierarchy = "date"
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "duration_minutes",
        "total_price",
        "cancelled_at",
        "is_past",
        "payment_progress",
        "cancellation_deadline",
    ]
    fieldsets = [
        (
            "Reservation Information",
            {
                "fields": [
                    "club",
                    "court",
                    "date",
                    "start_time",
                    "end_time",
                    "duration_minutes",
                    "reservation_type",
                ]
            },
        ),
        (
            "Player Information",
            {
                "fields": [
                    "player_name",
                    "player_email",
                    "player_phone",
                    "player_count",
                    "guest_count",
                    "client_profile",
                ]
            },
        ),
        (
            "Pricing",
            {
                "fields": [
                    "price_per_hour",
                    "total_price",
                    "special_price",
                    "discount_percentage",
                    "discount_reason",
                ]
            },
        ),
        (
            "Payment",
            {
                "fields": [
                    "payment_status",
                    "payment_method",
                    "payment_amount",
                    "paid_at",
                    "is_split_payment",
                    "split_count",
                ]
            },
        ),
        (
            "Status",
            {
                "fields": [
                    "status",
                    "cancellation_policy",
                    "cancellation_deadline",
                    "cancellation_fee",
                    "cancellation_reason",
                    "cancelled_at",
                    "cancelled_by",
                ]
            },
        ),
        (
            "Invoice",
            {
                "fields": [
                    "requires_invoice",
                    "invoice_data",
                    "invoice_status",
                ]
            },
        ),
        (
            "Additional Information",
            {
                "fields": [
                    "notes",
                    "internal_notes",
                    "booking_source",
                    "confirmation_sent",
                    "reminder_sent",
                    "created_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]

    def time_slot(self, obj):
        """Display time slot."""
        return f"{obj.start_time:%H:%M} - {obj.end_time:%H:%M}"

    time_slot.short_description = "Time"

    def club_name(self, obj):
        """Display club name."""
        return obj.club.name if obj.club else "-"

    club_name.short_description = "Club"
    club_name.admin_order_field = "club__name"

    def court_name(self, obj):
        """Display court name."""
        return obj.court.name if obj.court else "-"

    court_name.short_description = "Court"
    court_name.admin_order_field = "court__name"

    def status_badge(self, obj):
        """Display status as colored badge."""
        colors = {
            "pending": "#FFA500",
            "confirmed": "#4CAF50",
            "completed": "#2196F3",
            "cancelled": "#F44336",
            "no_show": "#9E9E9E",
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            colors.get(obj.status, "#9E9E9E"),
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def payment_status_badge(self, obj):
        """Display payment status as colored badge."""
        colors = {
            "pending": "#FFA500",
            "partial": "#FF9800",
            "paid": "#4CAF50",
            "refunded": "#2196F3",
            "failed": "#F44336",
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            colors.get(obj.payment_status, "#9E9E9E"),
            obj.get_payment_status_display(),
        )

    payment_status_badge.short_description = "Payment"

    actions = ["mark_as_confirmed", "mark_as_cancelled", "mark_as_no_show"]

    def mark_as_confirmed(self, request, queryset):
        """Mark selected reservations as confirmed."""
        updated = queryset.filter(status="pending").update(status="confirmed")
        self.message_user(request, f"{updated} reservations marked as confirmed.")

    mark_as_confirmed.short_description = "Mark as confirmed"

    def mark_as_cancelled(self, request, queryset):
        """Mark selected reservations as cancelled."""
        for reservation in queryset.filter(status__in=["pending", "confirmed"]):
            reservation.cancel(user=request.user, reason="Cancelled by admin")
        self.message_user(request, f"{queryset.count()} reservations cancelled.")

    mark_as_cancelled.short_description = "Cancel reservations"

    def mark_as_no_show(self, request, queryset):
        """Mark selected reservations as no-show."""
        for reservation in queryset.filter(status="confirmed", is_past=True):
            reservation.mark_no_show()
        self.message_user(request, "Reservations marked as no-show.")

    mark_as_no_show.short_description = "Mark as no-show"


@admin.register(ReservationPayment)
class ReservationPaymentAdmin(admin.ModelAdmin):
    """Admin for split payments."""
    
    list_display = [
        "reservation",
        "player_name",
        "player_email",
        "amount",
        "is_paid",
        "paid_at",
        "check_in_code",
    ]
    list_filter = ["is_paid", "is_checked_in", "created_at"]
    search_fields = ["player_email", "player_name", "check_in_code", "payment_token"]
    readonly_fields = [
        "payment_token",
        "check_in_code",
        "paid_at",
        "checked_in_at",
        "payment_link_sent_at",
        "payment_link_accessed_at",
    ]


@admin.register(BlockedSlot)
class BlockedSlotAdmin(admin.ModelAdmin):
    """Admin for blocked slots."""

    list_display = [
        "club_name",
        "court_name",
        "reason",
        "start_datetime",
        "end_datetime",
        "is_active",
        "created_by",
    ]
    list_filter = ["reason", "club", "is_active", "created_at"]
    search_fields = ["description", "club__name", "court__name"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    fieldsets = [
        (
            "Location",
            {
                "fields": ["organization", "club", "court"]
            },
        ),
        (
            "Time Period",
            {
                "fields": ["start_datetime", "end_datetime"]
            },
        ),
        (
            "Details",
            {
                "fields": ["reason", "description", "is_active"]
            },
        ),
        (
            "Recurrence",
            {
                "fields": ["is_recurring", "recurrence_pattern"]
            },
        ),
        (
            "Metadata",
            {
                "fields": ["created_by", "created_at", "updated_at"]
            },
        ),
    ]

    def club_name(self, obj):
        """Display club name."""
        return obj.club.name if obj.club else "-"

    club_name.short_description = "Club"
    club_name.admin_order_field = "club__name"

    def court_name(self, obj):
        """Display court name."""
        return obj.court.name if obj.court else "All courts"

    court_name.short_description = "Court"
    court_name.admin_order_field = "court__name"

    def save_model(self, request, obj, form, change):
        """Set created_by on save."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)