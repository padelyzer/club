"""
Admin configuration for clients module.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from core.admin import (
    MultiTenantModelAdmin,
    MultiTenantStackedInline,
    MultiTenantTabularInline,
)

from .models import (
    ClientProfile,
    EmergencyContact,
    MedicalInfo,
    PartnerRequest,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)


@admin.register(PlayerLevel)
class PlayerLevelAdmin(admin.ModelAdmin):
    list_display = [
        "display_name",
        "name",
        "min_rating",
        "max_rating",
        "color_display",
        "is_active",
    ]
    list_filter = ["is_active", "name"]
    search_fields = ["display_name", "description"]
    ordering = ["min_rating"]

    def color_display(self, obj):
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            obj.color,
            obj.color,
        )

    color_display.short_description = "Color"


class EmergencyContactInline(MultiTenantTabularInline):
    model = EmergencyContact
    extra = 0
    fields = ["name", "relationship", "phone", "email", "is_primary"]


class MedicalInfoInline(MultiTenantStackedInline):
    model = MedicalInfo
    extra = 0
    fields = [
        ("blood_type", "last_medical_check"),
        "allergies",
        "chronic_conditions",
        "current_medications",
        "injuries",
        ("insurance_company", "insurance_policy_number"),
        ("emergency_consent", "data_sharing_consent"),
    ]


class PlayerPreferencesInline(MultiTenantStackedInline):
    model = PlayerPreferences
    extra = 0
    fieldsets = (
        (
            "Availability",
            {
                "fields": (
                    (
                        "available_weekday_morning",
                        "available_weekday_afternoon",
                        "available_weekday_evening",
                    ),
                    (
                        "available_weekend_morning",
                        "available_weekend_afternoon",
                        "available_weekend_evening",
                    ),
                )
            },
        ),
        (
            "Play Preferences",
            {
                "fields": (
                    "preferred_court_type",
                    "preferred_match_duration",
                    "preferred_match_format",
                    ("min_partner_level", "max_partner_level"),
                )
            },
        ),
        (
            "Notifications",
            {
                "fields": (
                    ("email_notifications", "sms_notifications", "push_notifications"),
                    ("notify_match_invites", "notify_tournament_updates"),
                    ("notify_class_reminders", "notify_partner_requests"),
                    ("notify_club_news", "notify_ranking_changes"),
                )
            },
        ),
    )


@admin.register(ClientProfile)
class ClientProfileAdmin(MultiTenantModelAdmin):
    list_display = [
        "user_link",
        "level",
        "rating",
        "dominant_hand",
        "preferred_position",
        "is_public",
        "is_active",
    ]
    list_filter = [
        "is_active",
        "is_public",
        "level",
        "dominant_hand",
        "preferred_position",
        "show_in_rankings",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "dni",
        "bio",
    ]
    readonly_fields = ["created_at", "updated_at", "user_link", "stats_summary"]
    inlines = [EmergencyContactInline, MedicalInfoInline, PlayerPreferencesInline]

    fieldsets = (
        (
            "User Information",
            {"fields": ("user", "user_link", "dni", "birth_date", "occupation")},
        ),
        (
            "Player Information",
            {
                "fields": (
                    ("level", "rating"),
                    ("dominant_hand", "preferred_position"),
                    ("height", "weight"),
                    "play_style",
                    "strengths",
                    "weaknesses",
                )
            },
        ),
        ("Profile", {"fields": ("bio", "instagram", "facebook")}),
        (
            "Settings",
            {
                "fields": (
                    ("is_public", "show_in_rankings", "allow_partner_requests"),
                    "is_active",
                )
            },
        ),
        ("Statistics", {"fields": ("stats_summary",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def user_link(self, obj):
        url = reverse("admin:auth_user_change", args=[obj.user.id])
        return format_html(
            '<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.username
        )

    user_link.short_description = "User"

    def stats_summary(self, obj):
        if hasattr(obj, "stats"):
            stats = obj.stats
            return format_html(
                """
                <div style="line-height: 1.8;">
                    <strong>Matches:</strong> {} played, {} won ({:.1f}% win rate)<br>
                    <strong>Current Streak:</strong> {} wins<br>
                    <strong>Best Streak:</strong> {} wins<br>
                    <strong>Tournaments:</strong> {} played, {} won<br>
                    <strong>Classes:</strong> {} attended
                </div>
                """,
                stats.matches_played,
                stats.matches_won,
                stats.win_rate,
                stats.current_win_streak,
                stats.best_win_streak,
                stats.tournaments_played,
                stats.tournaments_won,
                stats.classes_attended,
            )
        return "No statistics available"

    stats_summary.short_description = "Statistics Summary"


@admin.register(PlayerStats)
class PlayerStatsAdmin(MultiTenantModelAdmin):
    list_display = [
        "player",
        "matches_played",
        "matches_won",
        "win_rate",
        "current_win_streak",
        "tournaments_played",
        "classes_attended",
    ]
    list_filter = ["last_match_date", "last_tournament_date"]
    search_fields = ["player__user__username", "player__user__email"]
    readonly_fields = [
        "player",
        "matches_played",
        "matches_won",
        "matches_lost",
        "win_rate",
        "sets_won",
        "sets_lost",
        "games_won",
        "games_lost",
        "current_win_streak",
        "best_win_streak",
        "matches_as_right",
        "matches_as_left",
        "wins_as_right",
        "wins_as_left",
        "tournaments_played",
        "tournaments_won",
        "tournament_finals",
        "tournament_semifinals",
        "classes_attended",
        "classes_missed",
        "total_play_time",
        "average_match_duration",
        "last_match_date",
        "last_tournament_date",
        "last_class_date",
    ]

    fieldsets = (
        ("Player", {"fields": ("player",)}),
        (
            "Match Statistics",
            {
                "fields": (
                    ("matches_played", "matches_won", "matches_lost", "win_rate"),
                    ("sets_won", "sets_lost"),
                    ("games_won", "games_lost"),
                    ("current_win_streak", "best_win_streak"),
                )
            },
        ),
        (
            "Position Statistics",
            {
                "fields": (
                    ("matches_as_right", "wins_as_right"),
                    ("matches_as_left", "wins_as_left"),
                )
            },
        ),
        (
            "Tournament Statistics",
            {
                "fields": (
                    ("tournaments_played", "tournaments_won"),
                    ("tournament_finals", "tournament_semifinals"),
                )
            },
        ),
        ("Class Statistics", {"fields": (("classes_attended", "classes_missed"),)}),
        (
            "Time Statistics",
            {"fields": (("total_play_time", "average_match_duration"),)},
        ),
        (
            "Rankings",
            {"fields": (("club_ranking", "regional_ranking", "national_ranking"),)},
        ),
        (
            "Last Activity",
            {
                "fields": (
                    "last_match_date",
                    "last_tournament_date",
                    "last_class_date",
                )
            },
        ),
    )

    def has_add_permission(self, request):
        return False


@admin.register(PartnerRequest)
class PartnerRequestAdmin(MultiTenantModelAdmin):
    list_display = [
        "from_player",
        "to_player",
        "status",
        "match_date",
        "created_at",
        "responded_at",
    ]
    list_filter = ["status", "created_at", "responded_at"]
    search_fields = [
        "from_player__user__username",
        "from_player__user__email",
        "to_player__user__username",
        "to_player__user__email",
        "message",
        "response_message",
    ]
    readonly_fields = ["created_at", "updated_at", "responded_at"]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Request Information",
            {
                "fields": (
                    ("from_player", "to_player"),
                    "status",
                    "message",
                    "match_date",
                )
            },
        ),
        (
            "Response",
            {
                "fields": (
                    "responded_at",
                    "response_message",
                )
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


# Register remaining models with basic admin
admin.site.register(EmergencyContact)
admin.site.register(MedicalInfo)
