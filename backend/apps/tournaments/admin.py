"""
Admin configuration for tournaments module.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    Match,
    Prize,
    Tournament,
    TournamentBracket,
    TournamentCategory,
    TournamentRegistration,
    TournamentRules,
    TournamentStats,
)


@admin.register(TournamentCategory)
class TournamentCategoryAdmin(admin.ModelAdmin):
    """Admin for tournament categories."""

    list_display = [
        "name",
        "category_type",
        "gender",
        "age_range",
        "level_range",
        "color_badge",
        "is_active",
        "created_at",
    ]
    list_filter = ["category_type", "gender", "is_active", "created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "category_type", "description")}),
        (
            "Restrictions",
            {"fields": ("min_age", "max_age", "min_level", "max_level", "gender")},
        ),
        ("Display", {"fields": ("color", "icon")}),
        ("Status", {"fields": ("is_active",)}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def age_range(self, obj):
        """Display age range."""
        if obj.min_age and obj.max_age:
            return f"{obj.min_age}-{obj.max_age} años"
        elif obj.min_age:
            return f"{obj.min_age}+ años"
        elif obj.max_age:
            return f"≤{obj.max_age} años"
        return "Sin restricción"

    age_range.short_description = "Rango de Edad"

    def level_range(self, obj):
        """Display level range."""
        if obj.min_level and obj.max_level:
            return f"{obj.min_level.display_name} - {obj.max_level.display_name}"
        elif obj.min_level:
            return f"{obj.min_level.display_name}+"
        elif obj.max_level:
            return f"≤{obj.max_level.display_name}"
        return "Sin restricción"

    level_range.short_description = "Rango de Nivel"

    def color_badge(self, obj):
        """Display color badge."""
        return format_html(
            '<span style="background-color: {}; width: 20px; height: 20px; '
            'display: inline-block; border-radius: 3px;"></span>',
            obj.color,
        )

    color_badge.short_description = "Color"


class TournamentRegistrationInline(admin.TabularInline):
    """Inline for tournament registrations."""

    model = TournamentRegistration
    extra = 0
    readonly_fields = ["team_display_name", "created_at"]
    fields = [
        "team_name",
        "player1",
        "player2",
        "status",
        "payment_status",
        "seed",
        "created_at",
    ]


class MatchInline(admin.TabularInline):
    """Inline for tournament matches."""

    model = Match
    extra = 0
    readonly_fields = ["team1_sets_won", "team2_sets_won", "duration_minutes"]
    fields = [
        "round_number",
        "match_number",
        "team1",
        "team2",
        "status",
        "winner",
        "scheduled_date",
        "court",
    ]


class PrizeInline(admin.TabularInline):
    """Inline for tournament prizes."""

    model = Prize
    extra = 0
    fields = ["position", "name", "prize_type", "cash_value", "awarded_to"]


class TournamentRulesInline(admin.TabularInline):
    """Inline for tournament rules."""

    model = TournamentRules
    extra = 0
    fields = ["rule_type", "title", "order", "is_mandatory"]


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    """Admin for tournaments."""

    list_display = [
        "name",
        "format",
        "category",
        "start_date",
        "status",
        "teams_count",
        "organizer",
        "club",
        "registration_fee",
        "created_at",
    ]
    list_filter = [
        "format",
        "status",
        "visibility",
        "category",
        "club",
        "start_date",
        "created_at",
    ]
    search_fields = [
        "name",
        "description",
        "organizer__first_name",
        "organizer__last_name",
        "organizer__email",
    ]
    readonly_fields = [
        "id",
        "slug",
        "current_teams_count",
        "is_registration_open",
        "is_full",
        "can_start",
        "created_at",
        "updated_at",
    ]
    inlines = [
        TournamentRegistrationInline,
        MatchInline,
        PrizeInline,
        TournamentRulesInline,
    ]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "slug", "description", "format", "category")},
        ),
        (
            "Dates & Schedule",
            {
                "fields": (
                    "start_date",
                    "end_date",
                    "registration_start",
                    "registration_end",
                )
            },
        ),
        (
            "Capacity & Registration",
            {
                "fields": (
                    "max_teams",
                    "min_teams",
                    "registration_fee",
                    "requires_payment",
                    "allow_substitutes",
                    "max_substitutes_per_team",
                )
            },
        ),
        ("Visibility & Access", {"fields": ("visibility", "requires_approval")}),
        (
            "Tournament Progress",
            {"fields": ("status", "current_round", "total_rounds")},
        ),
        (
            "Organizer Information",
            {"fields": ("organizer", "contact_email", "contact_phone")},
        ),
        ("Rules & Format", {"fields": ("rules", "match_format")}),
        ("Media", {"fields": ("banner_image", "logo_image"), "classes": ("collapse",)}),
        (
            "Additional Information",
            {"fields": ("tags", "external_url"), "classes": ("collapse",)},
        ),
        (
            "Status Information",
            {
                "fields": (
                    "current_teams_count",
                    "is_registration_open",
                    "is_full",
                    "can_start",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("id", "organization", "club", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def teams_count(self, obj):
        """Display current teams count."""
        return f"{obj.current_teams_count}/{obj.max_teams}"

    teams_count.short_description = "Equipos"

    actions = ["start_tournament", "cancel_tournament"]

    def start_tournament(self, request, queryset):
        """Action to start tournaments."""
        for tournament in queryset:
            if tournament.can_start:
                tournament.start_tournament()
                self.message_user(
                    request, f"Tournament '{tournament.name}' started successfully."
                )
            else:
                self.message_user(
                    request,
                    f"Tournament '{tournament.name}' cannot be started.",
                    level="WARNING",
                )

    start_tournament.short_description = "Iniciar torneos seleccionados"

    def cancel_tournament(self, request, queryset):
        """Action to cancel tournaments."""
        updated = queryset.update(status="cancelled")
        self.message_user(request, f"{updated} tournaments cancelled.")

    cancel_tournament.short_description = "Cancelar torneos seleccionados"


@admin.register(TournamentRegistration)
class TournamentRegistrationAdmin(admin.ModelAdmin):
    """Admin for tournament registrations."""

    list_display = [
        "team_display_name",
        "tournament",
        "status",
        "payment_status",
        "seed",
        "created_at",
    ]
    list_filter = [
        "status",
        "payment_status",
        "tournament__club",
        "tournament__format",
        "created_at",
    ]
    search_fields = [
        "team_name",
        "player1__user__first_name",
        "player1__user__last_name",
        "player2__user__first_name",
        "player2__user__last_name",
        "tournament__name",
    ]
    readonly_fields = ["id", "team_display_name", "created_at", "updated_at"]

    fieldsets = (
        (
            "Tournament & Team",
            {"fields": ("tournament", "team_name", "team_display_name")},
        ),
        ("Players", {"fields": ("player1", "player2", "substitute1", "substitute2")}),
        ("Registration Status", {"fields": ("status", "seed", "notes")}),
        ("Payment", {"fields": ("payment_status", "payment_reference")}),
        ("Contact Information", {"fields": ("contact_phone", "contact_email")}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    actions = ["confirm_registrations", "cancel_registrations"]

    def confirm_registrations(self, request, queryset):
        """Action to confirm registrations."""
        for registration in queryset:
            registration.confirm_registration()
        self.message_user(request, f"{queryset.count()} registrations confirmed.")

    confirm_registrations.short_description = "Confirmar inscripciones seleccionadas"

    def cancel_registrations(self, request, queryset):
        """Action to cancel registrations."""
        updated = queryset.update(status="cancelled")
        self.message_user(request, f"{updated} registrations cancelled.")

    cancel_registrations.short_description = "Cancelar inscripciones seleccionadas"


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    """Admin for matches."""

    list_display = [
        "match_identifier",
        "tournament",
        "teams_display",
        "status",
        "scheduled_date",
        "court",
        "winner",
        "duration_display",
    ]
    list_filter = [
        "status",
        "tournament__club",
        "tournament__format",
        "round_number",
        "scheduled_date",
        "court",
    ]
    search_fields = [
        "tournament__name",
        "team1__team_name",
        "team2__team_name",
        "team1__player1__user__first_name",
        "team1__player2__user__first_name",
        "team2__player1__user__first_name",
        "team2__player2__user__first_name",
    ]
    readonly_fields = [
        "id",
        "team1_sets_won",
        "team2_sets_won",
        "duration_minutes",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        (
            "Match Information",
            {
                "fields": (
                    "tournament",
                    "round_number",
                    "match_number",
                    "team1",
                    "team2",
                )
            },
        ),
        ("Scheduling", {"fields": ("scheduled_date", "court", "referee")}),
        ("Status & Results", {"fields": ("status", "winner")}),
        (
            "Scores",
            {
                "fields": (
                    "team1_score",
                    "team2_score",
                    "team1_sets_won",
                    "team2_sets_won",
                )
            },
        ),
        (
            "Timing",
            {"fields": ("actual_start_time", "actual_end_time", "duration_minutes")},
        ),
        (
            "Additional Information",
            {"fields": ("notes", "walkover_reason"), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {
                "fields": ("id", "organization", "club", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def match_identifier(self, obj):
        """Display match identifier."""
        return f"R{obj.round_number}M{obj.match_number}"

    match_identifier.short_description = "ID"

    def teams_display(self, obj):
        """Display teams."""
        return f"{obj.team1.team_display_name} vs {obj.team2.team_display_name}"

    teams_display.short_description = "Equipos"

    def duration_display(self, obj):
        """Display match duration."""
        if obj.duration_minutes:
            hours = obj.duration_minutes // 60
            minutes = obj.duration_minutes % 60
            if hours:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"
        return "-"

    duration_display.short_description = "Duración"

    actions = ["mark_completed", "mark_cancelled"]

    def mark_completed(self, request, queryset):
        """Action to mark matches as completed."""
        updated = queryset.update(status="completed")
        self.message_user(request, f"{updated} matches marked as completed.")

    mark_completed.short_description = "Marcar como completados"

    def mark_cancelled(self, request, queryset):
        """Action to mark matches as cancelled."""
        updated = queryset.update(status="cancelled")
        self.message_user(request, f"{updated} matches marked as cancelled.")

    mark_cancelled.short_description = "Marcar como cancelados"


@admin.register(TournamentBracket)
class TournamentBracketAdmin(admin.ModelAdmin):
    """Admin for tournament brackets."""

    list_display = [
        "tournament",
        "round_number",
        "position",
        "team1",
        "team2",
        "match_status",
        "bracket_type",
    ]
    list_filter = [
        "tournament",
        "round_number",
        "is_losers_bracket",
        "tournament__club",
        "tournament__format",
    ]
    search_fields = ["tournament__name", "team1__team_name", "team2__team_name"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            "Bracket Position",
            {"fields": ("tournament", "round_number", "position", "is_losers_bracket")},
        ),
        ("Teams", {"fields": ("team1", "team2")}),
        ("Match & Advancement", {"fields": ("match", "advances_to")}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def match_status(self, obj):
        """Display match status."""
        if obj.match:
            return obj.match.get_status_display()
        return "Sin partido"

    match_status.short_description = "Estado del Partido"

    def bracket_type(self, obj):
        """Display bracket type."""
        return "Perdedores" if obj.is_losers_bracket else "Ganadores"

    bracket_type.short_description = "Tipo de Llave"


@admin.register(Prize)
class PrizeAdmin(admin.ModelAdmin):
    """Admin for prizes."""

    list_display = [
        "tournament",
        "position",
        "name",
        "prize_type",
        "value_display",
        "awarded_to",
        "awarded_at",
    ]
    list_filter = [
        "prize_type",
        "tournament__club",
        "tournament__format",
        "position",
        "awarded_at",
    ]
    search_fields = ["tournament__name", "name", "description"]
    readonly_fields = ["id", "awarded_at", "created_at", "updated_at"]

    fieldsets = (
        (
            "Prize Information",
            {"fields": ("tournament", "position", "name", "description", "prize_type")},
        ),
        ("Value", {"fields": ("cash_value", "points_value")}),
        ("Award Status", {"fields": ("awarded_to", "awarded_at")}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def value_display(self, obj):
        """Display prize value."""
        values = []
        if obj.cash_value:
            values.append(f"${obj.cash_value}")
        if obj.points_value:
            values.append(f"{obj.points_value} pts")
        return " + ".join(values) if values else "-"

    value_display.short_description = "Valor"


@admin.register(TournamentRules)
class TournamentRulesAdmin(admin.ModelAdmin):
    """Admin for tournament rules."""

    list_display = ["tournament", "rule_type", "title", "order", "is_mandatory"]
    list_filter = [
        "rule_type",
        "is_mandatory",
        "tournament__club",
        "tournament__format",
    ]
    search_fields = ["tournament__name", "title", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            "Rule Information",
            {"fields": ("tournament", "rule_type", "title", "description")},
        ),
        ("Settings", {"fields": ("order", "is_mandatory", "penalty_description")}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(TournamentStats)
class TournamentStatsAdmin(admin.ModelAdmin):
    """Admin for tournament statistics."""

    list_display = [
        "tournament",
        "total_registrations",
        "confirmed_teams",
        "total_matches",
        "completed_matches",
        "completion_percentage",
    ]
    list_filter = ["tournament__club", "tournament__format", "tournament__status"]
    search_fields = ["tournament__name"]
    readonly_fields = [
        "id",
        "total_registrations",
        "confirmed_teams",
        "waitlist_teams",
        "cancelled_registrations",
        "total_matches",
        "completed_matches",
        "walkover_matches",
        "cancelled_matches",
        "average_match_duration",
        "total_play_time",
        "total_registration_fees",
        "total_prize_money",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        ("Tournament", {"fields": ("tournament",)}),
        (
            "Registration Statistics",
            {
                "fields": (
                    "total_registrations",
                    "confirmed_teams",
                    "waitlist_teams",
                    "cancelled_registrations",
                )
            },
        ),
        (
            "Match Statistics",
            {
                "fields": (
                    "total_matches",
                    "completed_matches",
                    "walkover_matches",
                    "cancelled_matches",
                )
            },
        ),
        ("Time Statistics", {"fields": ("average_match_duration", "total_play_time")}),
        (
            "Financial Statistics",
            {"fields": ("total_registration_fees", "total_prize_money")},
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def completion_percentage(self, obj):
        """Display completion percentage."""
        if obj.total_matches == 0:
            return "0%"
        percentage = (obj.completed_matches / obj.total_matches) * 100
        return f"{percentage:.1f}%"

    completion_percentage.short_description = "% Completado"

    actions = ["refresh_stats"]

    def refresh_stats(self, request, queryset):
        """Action to refresh statistics."""
        for stats in queryset:
            stats.update_stats()
        self.message_user(request, f"{queryset.count()} statistics refreshed.")

    refresh_stats.short_description = "Actualizar estadísticas"
