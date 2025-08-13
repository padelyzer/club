"""
Admin configuration for leagues module.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    League,
    LeagueMatch,
    LeagueRules,
    LeagueSchedule,
    LeagueSeason,
    LeagueStanding,
    LeagueTeam,
)


@admin.register(League)
class LeagueAdmin(admin.ModelAdmin):
    """Admin for League model."""

    list_display = [
        "name",
        "organization",
        "club",
        "division",
        "format",
        "status",
        "current_teams_count",
        "max_teams",
        "is_public",
        "created_at",
    ]
    list_filter = [
        "organization",
        "club",
        "division",
        "format",
        "status",
        "is_public",
        "requires_approval",
        "allow_playoffs",
        "created_at",
    ]
    search_fields = [
        "name",
        "description",
        "organizer__first_name",
        "organizer__last_name",
    ]
    readonly_fields = [
        "slug",
        "current_teams_count",
        "can_start_season",
        "created_at",
        "updated_at",
    ]
    # Removed filter_horizontal as tags is a JSONField, not ManyToMany

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("organization", "club", "name", "slug", "description")},
        ),
        (
            "League Configuration",
            {"fields": ("format", "division", "max_teams", "min_teams")},
        ),
        (
            "Registration Settings",
            {
                "fields": (
                    "registration_fee",
                    "requires_payment",
                    "auto_generate_schedule",
                )
            },
        ),
        (
            "Access & Visibility",
            {"fields": ("is_public", "requires_approval", "allow_substitutes")},
        ),
        ("Status", {"fields": ("status",)}),
        (
            "Organizer Information",
            {"fields": ("organizer", "contact_email", "contact_phone")},
        ),
        (
            "Competition Rules",
            {
                "fields": (
                    "allow_playoffs",
                    "playoff_teams_count",
                    "allow_promotion_relegation",
                    "promotion_spots",
                    "relegation_spots",
                )
            },
        ),
        (
            "Media & External",
            {
                "fields": (
                    "logo_image",
                    "banner_image",
                    "tags",
                    "external_url",
                    "rules_document",
                )
            },
        ),
        ("Statistics", {"fields": ("current_teams_count", "can_start_season")}),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return (
            super()
            .get_queryset(request)
            .select_related("organization", "club", "organizer")
        )

    def current_teams_count(self, obj):
        """Display current teams count."""
        count = obj.current_teams_count
        if obj.max_teams:
            percentage = (count / obj.max_teams) * 100
            color = (
                "green" if percentage < 80 else "orange" if percentage < 100 else "red"
            )
            return format_html(
                '<span style="color: {};">{}/{}</span>', color, count, obj.max_teams
            )
        return count

    current_teams_count.short_description = "Teams"


@admin.register(LeagueSeason)
class LeagueSeasonAdmin(admin.ModelAdmin):
    """Admin for LeagueSeason model."""

    list_display = [
        "name",
        "league",
        "season_number",
        "status",
        "start_date",
        "end_date",
        "teams_count",
        "current_matchday",
        "total_matchdays",
        "playoff_enabled",
    ]
    list_filter = ["league", "status", "playoff_enabled", "start_date", "created_at"]
    search_fields = ["name", "league__name"]
    readonly_fields = [
        "season_number",
        "teams_count",
        "current_matchday",
        "total_matchdays",
        "matches_per_team",
        "total_matches",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        ("Basic Information", {"fields": ("league", "name", "season_number")}),
        (
            "Schedule",
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
            "Status & Progress",
            {"fields": ("status", "current_matchday", "total_matchdays")},
        ),
        ("Match Configuration", {"fields": ("matches_per_team", "total_matches")}),
        (
            "Playoff Configuration",
            {"fields": ("playoff_enabled", "playoff_start_date", "playoff_teams")},
        ),
        ("Statistics", {"fields": ("teams_count",)}),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("league")


@admin.register(LeagueTeam)
class LeagueTeamAdmin(admin.ModelAdmin):
    """Admin for LeagueTeam model."""

    list_display = [
        "team_display_name",
        "season",
        "status",
        "payment_status",
        "registration_date",
        "approved_by",
        "player_names",
    ]
    list_filter = [
        "season__league",
        "season",
        "status",
        "payment_status",
        "registration_date",
        "approved_at",
    ]
    search_fields = [
        "team_name",
        "player1__user__first_name",
        "player1__user__last_name",
        "player2__user__first_name",
        "player2__user__last_name",
        "contact_email",
        "contact_phone",
    ]
    readonly_fields = ["registration_date", "approved_at", "created_at", "updated_at"]

    fieldsets = (
        ("Team Information", {"fields": ("season", "team_name")}),
        ("Players", {"fields": ("player1", "player2", "substitute1", "substitute2")}),
        ("Status", {"fields": ("status", "approved_by", "approved_at")}),
        ("Contact Information", {"fields": ("contact_phone", "contact_email")}),
        ("Payment", {"fields": ("payment_status", "payment_reference")}),
        ("Registration", {"fields": ("registration_date",)}),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return (
            super()
            .get_queryset(request)
            .select_related(
                "season",
                "season__league",
                "player1",
                "player2",
                "substitute1",
                "substitute2",
                "approved_by",
            )
        )

    def player_names(self, obj):
        """Display player names."""
        return (
            f"{obj.player1.user.get_full_name()} / {obj.player2.user.get_full_name()}"
        )

    player_names.short_description = "Players"


@admin.register(LeagueMatch)
class LeagueMatchAdmin(admin.ModelAdmin):
    """Admin for LeagueMatch model."""

    list_display = [
        "match_info",
        "season",
        "matchday",
        "scheduled_date",
        "status",
        "score_display",
        "winner_display",
        "confirmed_status",
    ]
    list_filter = [
        "season__league",
        "season",
        "matchday",
        "status",
        "scheduled_date",
        "confirmed_by_home",
        "confirmed_by_away",
    ]
    search_fields = [
        "home_team__team_name",
        "away_team__team_name",
        "season__name",
        "season__league__name",
    ]
    readonly_fields = [
        "match_number",
        "home_sets_won",
        "away_sets_won",
        "is_confirmed",
        "duration_minutes",
        "confirmed_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        ("Match Information", {"fields": ("season", "matchday", "match_number")}),
        ("Teams", {"fields": ("home_team", "away_team", "winner")}),
        (
            "Scheduling",
            {
                "fields": (
                    "scheduled_date",
                    "court",
                    "original_date",
                    "reschedule_requests",
                )
            },
        ),
        ("Status", {"fields": ("status",)}),
        (
            "Results",
            {"fields": ("home_score", "away_score", "home_sets_won", "away_sets_won")},
        ),
        (
            "Timing",
            {"fields": ("actual_start_time", "actual_end_time", "duration_minutes")},
        ),
        (
            "Confirmation",
            {
                "fields": (
                    "confirmed_by_home",
                    "confirmed_by_away",
                    "is_confirmed",
                    "confirmed_at",
                )
            },
        ),
        ("Notes", {"fields": ("notes", "walkover_reason")}),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return (
            super()
            .get_queryset(request)
            .select_related(
                "season", "season__league", "home_team", "away_team", "winner", "court"
            )
        )

    def match_info(self, obj):
        """Display match information."""
        return f"J{obj.matchday} - {obj.home_team.team_display_name} vs {obj.away_team.team_display_name}"

    match_info.short_description = "Match"

    def score_display(self, obj):
        """Display match score."""
        if obj.home_score and obj.away_score:
            home_sets = obj.home_sets_won
            away_sets = obj.away_sets_won
            return format_html(
                "<strong>{}–{}</strong><br><small>{} vs {}</small>",
                home_sets,
                away_sets,
                "-".join(map(str, obj.home_score)),
                "-".join(map(str, obj.away_score)),
            )
        return "-"

    score_display.short_description = "Score"

    def winner_display(self, obj):
        """Display winner with formatting."""
        if obj.winner:
            color = "green" if obj.is_confirmed else "orange"
            return format_html(
                '<span style="color: {};">{}</span>',
                color,
                obj.winner.team_display_name,
            )
        return "-"

    winner_display.short_description = "Winner"

    def confirmed_status(self, obj):
        """Display confirmation status."""
        if obj.is_confirmed:
            return format_html('<span style="color: green;">✓ Confirmed</span>')
        elif obj.confirmed_by_home or obj.confirmed_by_away:
            return format_html('<span style="color: orange;">Partial</span>')
        return format_html('<span style="color: red;">Pending</span>')

    confirmed_status.short_description = "Confirmed"


@admin.register(LeagueStanding)
class LeagueStandingAdmin(admin.ModelAdmin):
    """Admin for LeagueStanding model."""

    list_display = [
        "position_display",
        "team",
        "season",
        "points",
        "matches_played",
        "win_loss_record",
        "sets_difference",
        "games_difference",
        "form_display",
    ]
    list_filter = ["season__league", "season"]
    search_fields = ["team__team_name", "team__player1__user__first_name"]
    readonly_fields = [
        "position",
        "matches_played",
        "matches_won",
        "matches_drawn",
        "matches_lost",
        "sets_won",
        "sets_lost",
        "sets_difference",
        "games_won",
        "games_lost",
        "games_difference",
        "points",
        "home_wins",
        "away_wins",
        "walkovers_for",
        "walkovers_against",
        "current_streak",
        "longest_win_streak",
        "form",
        "win_percentage",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        ("Team & Position", {"fields": ("season", "team", "position")}),
        (
            "Match Statistics",
            {
                "fields": (
                    "matches_played",
                    "matches_won",
                    "matches_drawn",
                    "matches_lost",
                )
            },
        ),
        ("Set Statistics", {"fields": ("sets_won", "sets_lost", "sets_difference")}),
        (
            "Game Statistics",
            {"fields": ("games_won", "games_lost", "games_difference")},
        ),
        ("Points & Performance", {"fields": ("points", "win_percentage")}),
        (
            "Additional Statistics",
            {
                "fields": (
                    "home_wins",
                    "away_wins",
                    "walkovers_for",
                    "walkovers_against",
                )
            },
        ),
        (
            "Form & Streaks",
            {"fields": ("current_streak", "longest_win_streak", "form")},
        ),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return (
            super()
            .get_queryset(request)
            .select_related("season", "season__league", "team")
            .order_by("season", "position")
        )

    def position_display(self, obj):
        """Display position with medal icons."""
        position = obj.position
        if position == 1:
            return format_html('<span style="color: gold;">🥇 1st</span>')
        elif position == 2:
            return format_html('<span style="color: silver;">🥈 2nd</span>')
        elif position == 3:
            return format_html('<span style="color: #CD7F32;">🥉 3rd</span>')
        else:
            return f"{position}th"

    position_display.short_description = "Position"

    def win_loss_record(self, obj):
        """Display win-loss record."""
        return f"{obj.matches_won}-{obj.matches_lost}"

    win_loss_record.short_description = "W-L"

    def form_display(self, obj):
        """Display recent form."""
        if obj.form:
            form_display = "".join(obj.form[-5:])  # Last 5 matches
            return format_html("<code>{}</code>", form_display)
        return "-"

    form_display.short_description = "Form"


@admin.register(LeagueRules)
class LeagueRulesAdmin(admin.ModelAdmin):
    """Admin for LeagueRules model."""

    list_display = [
        "title",
        "league",
        "rule_type",
        "order",
        "points_display",
        "is_mandatory",
        "penalty_points",
        "is_active",
    ]
    list_filter = ["league", "rule_type", "is_mandatory", "is_active"]
    search_fields = ["title", "description", "league__name"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Rule Information",
            {"fields": ("league", "rule_type", "title", "description", "order")},
        ),
        (
            "Point System",
            {
                "fields": (
                    "points_for_win",
                    "points_for_draw",
                    "points_for_loss",
                    "points_for_walkover_win",
                    "points_for_walkover_loss",
                )
            },
        ),
        (
            "Enforcement",
            {"fields": ("is_mandatory", "penalty_points", "penalty_description")},
        ),
        ("Tiebreaker", {"fields": ("tiebreaker_criteria",)}),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("league")

    def points_display(self, obj):
        """Display point system."""
        return f"W:{obj.points_for_win} D:{obj.points_for_draw} L:{obj.points_for_loss}"

    points_display.short_description = "Points (W-D-L)"


@admin.register(LeagueSchedule)
class LeagueScheduleAdmin(admin.ModelAdmin):
    """Admin for LeagueSchedule model."""

    list_display = [
        "season",
        "schedule_type",
        "time_display",
        "preferred_days_display",
        "auto_schedule",
        "allow_reschedule",
        "max_matches_per_day",
        "is_active",
    ]
    list_filter = [
        "season__league",
        "schedule_type",
        "auto_schedule",
        "allow_reschedule",
        "exclude_holidays",
        "is_active",
    ]
    search_fields = ["season__name", "season__league__name"]
    readonly_fields = ["duration_hours", "created_at", "updated_at"]
    filter_horizontal = ["preferred_courts"]

    fieldsets = (
        ("Season", {"fields": ("season",)}),
        (
            "Schedule Configuration",
            {
                "fields": (
                    "schedule_type",
                    "preferred_days",
                    "start_time",
                    "end_time",
                    "duration_hours",
                )
            },
        ),
        ("Court Preferences", {"fields": ("preferred_courts",)}),
        ("Constraints", {"fields": ("max_matches_per_day", "min_rest_days")}),
        (
            "Automatic Scheduling",
            {
                "fields": (
                    "auto_schedule",
                    "allow_reschedule",
                    "reschedule_deadline_hours",
                )
            },
        ),
        (
            "Holiday Configuration",
            {"fields": ("exclude_holidays", "custom_excluded_dates")},
        ),
        ("Timestamps", {"fields": ("is_active", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return (
            super()
            .get_queryset(request)
            .select_related("season", "season__league")
            .prefetch_related("preferred_courts")
        )

    def time_display(self, obj):
        """Display time range."""
        return f"{obj.start_time} - {obj.end_time} ({obj.duration_hours:.1f}h)"

    time_display.short_description = "Time Range"

    def preferred_days_display(self, obj):
        """Display preferred days."""
        if obj.preferred_days:
            day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            days = [day_names[day] for day in obj.preferred_days if 0 <= day <= 6]
            return ", ".join(days)
        return "All days"

    preferred_days_display.short_description = "Preferred Days"


# Inline admins for related models
class LeagueSeasonInline(admin.TabularInline):
    """Inline admin for league seasons."""

    model = LeagueSeason
    extra = 0
    readonly_fields = ["season_number", "teams_count", "current_matchday"]
    fields = [
        "name",
        "season_number",
        "start_date",
        "end_date",
        "status",
        "teams_count",
    ]


class LeagueRulesInline(admin.TabularInline):
    """Inline admin for league rules."""

    model = LeagueRules
    extra = 0
    fields = [
        "rule_type",
        "title",
        "order",
        "points_for_win",
        "points_for_draw",
        "is_mandatory",
    ]


# Add inlines to League admin
LeagueAdmin.inlines = [LeagueSeasonInline, LeagueRulesInline]
