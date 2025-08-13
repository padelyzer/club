"""
Serializers for leagues module.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

from .models import (
    League,
    LeagueMatch,
    LeagueRules,
    LeagueSchedule,
    LeagueSeason,
    LeagueStanding,
    LeagueTeam,
)


class LeagueRulesSerializer(serializers.ModelSerializer):
    """Serializer for LeagueRules model."""

    rule_type_display = serializers.CharField(
        source="get_rule_type_display", read_only=True
    )

    class Meta:
        model = LeagueRules
        fields = [
            "id",
            "rule_type",
            "rule_type_display",
            "title",
            "description",
            "order",
            "points_for_win",
            "points_for_draw",
            "points_for_loss",
            "points_for_walkover_win",
            "points_for_walkover_loss",
            "is_mandatory",
            "penalty_points",
            "penalty_description",
            "tiebreaker_criteria",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeagueScheduleSerializer(serializers.ModelSerializer):
    """Serializer for LeagueSchedule model."""

    schedule_type_display = serializers.CharField(
        source="get_schedule_type_display", read_only=True
    )
    duration_hours = serializers.ReadOnlyField()
    preferred_courts_details = serializers.SerializerMethodField()

    class Meta:
        model = LeagueSchedule
        fields = [
            "id",
            "schedule_type",
            "schedule_type_display",
            "preferred_days",
            "start_time",
            "end_time",
            "duration_hours",
            "preferred_courts",
            "preferred_courts_details",
            "max_matches_per_day",
            "min_rest_days",
            "auto_schedule",
            "allow_reschedule",
            "reschedule_deadline_hours",
            "exclude_holidays",
            "custom_excluded_dates",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_preferred_courts_details(self, obj):
        """Get detailed court information."""
        from apps.clubs.serializers import CourtListSerializer

        return CourtListSerializer(obj.preferred_courts.all(), many=True).data

    def validate(self, data):
        """Validate schedule configuration."""
        if data.get("start_time") and data.get("end_time"):
            if data["start_time"] >= data["end_time"]:
                raise serializers.ValidationError("Start time must be before end time.")

        if data.get("preferred_days"):
            invalid_days = [
                day for day in data["preferred_days"] if day not in range(7)
            ]
            if invalid_days:
                raise serializers.ValidationError(
                    "Preferred days must be between 0 (Monday) and 6 (Sunday)."
                )

        return data


class LeagueStandingSerializer(serializers.ModelSerializer):
    """Serializer for LeagueStanding model."""

    team_name = serializers.CharField(source="team.team_display_name", read_only=True)
    team_details = serializers.SerializerMethodField()
    win_percentage = serializers.ReadOnlyField()

    class Meta:
        model = LeagueStanding
        fields = [
            "id",
            "team",
            "team_name",
            "team_details",
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
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
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
            "created_at",
            "updated_at",
        ]

    def get_team_details(self, obj):
        """Get basic team information."""
        return {
            "id": obj.team.id,
            "team_name": obj.team.team_display_name,
            "player1": {
                "id": obj.team.player1.id,
                "name": obj.team.player1.user.get_full_name(),
                "rating": obj.team.player1.rating,
            },
            "player2": {
                "id": obj.team.player2.id,
                "name": obj.team.player2.user.get_full_name(),
                "rating": obj.team.player2.rating,
            },
        }


class LeagueMatchSerializer(serializers.ModelSerializer):
    """Serializer for LeagueMatch model."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    home_team_name = serializers.CharField(
        source="home_team.team_display_name", read_only=True
    )
    away_team_name = serializers.CharField(
        source="away_team.team_display_name", read_only=True
    )
    court_name = serializers.CharField(source="court.name", read_only=True)
    winner_name = serializers.CharField(
        source="winner.team_display_name", read_only=True
    )
    home_sets_won = serializers.ReadOnlyField()
    away_sets_won = serializers.ReadOnlyField()
    is_confirmed = serializers.ReadOnlyField()

    class Meta:
        model = LeagueMatch
        fields = [
            "id",
            "season",
            "matchday",
            "match_number",
            "home_team",
            "home_team_name",
            "away_team",
            "away_team_name",
            "scheduled_date",
            "court",
            "court_name",
            "status",
            "status_display",
            "home_score",
            "away_score",
            "home_sets_won",
            "away_sets_won",
            "winner",
            "winner_name",
            "actual_start_time",
            "actual_end_time",
            "duration_minutes",
            "confirmed_by_home",
            "confirmed_by_away",
            "is_confirmed",
            "confirmed_at",
            "notes",
            "walkover_reason",
            "reschedule_requests",
            "original_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "match_number",
            "home_sets_won",
            "away_sets_won",
            "is_confirmed",
            "confirmed_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """Validate match data."""
        if data.get("home_team") == data.get("away_team"):
            raise serializers.ValidationError("Home and away teams cannot be the same.")

        if data.get("home_team") and data.get("away_team"):
            if data["home_team"].season != data["away_team"].season:
                raise serializers.ValidationError(
                    "Both teams must be from the same season."
                )

        if data.get("actual_start_time") and data.get("actual_end_time"):
            if data["actual_end_time"] <= data["actual_start_time"]:
                raise serializers.ValidationError("End time must be after start time.")

        return data


class LeagueTeamSerializer(serializers.ModelSerializer):
    """Serializer for LeagueTeam model."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    team_display_name = serializers.ReadOnlyField()
    player1_details = serializers.SerializerMethodField()
    player2_details = serializers.SerializerMethodField()
    substitute1_details = serializers.SerializerMethodField()
    substitute2_details = serializers.SerializerMethodField()
    current_standing = serializers.SerializerMethodField()

    class Meta:
        model = LeagueTeam
        fields = [
            "id",
            "season",
            "team_name",
            "team_display_name",
            "player1",
            "player1_details",
            "player2",
            "player2_details",
            "substitute1",
            "substitute1_details",
            "substitute2",
            "substitute2_details",
            "status",
            "status_display",
            "contact_phone",
            "contact_email",
            "payment_status",
            "payment_status_display",
            "payment_reference",
            "registration_date",
            "approved_by",
            "approved_at",
            "current_standing",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "registration_date",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def get_player1_details(self, obj):
        """Get player 1 details."""
        return {
            "id": obj.player1.id,
            "name": obj.player1.user.get_full_name(),
            "email": obj.player1.user.email,
            "rating": obj.player1.rating,
            "level": obj.player1.level.display_name if obj.player1.level else None,
        }

    def get_player2_details(self, obj):
        """Get player 2 details."""
        return {
            "id": obj.player2.id,
            "name": obj.player2.user.get_full_name(),
            "email": obj.player2.user.email,
            "rating": obj.player2.rating,
            "level": obj.player2.level.display_name if obj.player2.level else None,
        }

    def get_substitute1_details(self, obj):
        """Get substitute 1 details."""
        if not obj.substitute1:
            return None
        return {
            "id": obj.substitute1.id,
            "name": obj.substitute1.user.get_full_name(),
            "email": obj.substitute1.user.email,
            "rating": obj.substitute1.rating,
            "level": (
                obj.substitute1.level.display_name if obj.substitute1.level else None
            ),
        }

    def get_substitute2_details(self, obj):
        """Get substitute 2 details."""
        if not obj.substitute2:
            return None
        return {
            "id": obj.substitute2.id,
            "name": obj.substitute2.user.get_full_name(),
            "email": obj.substitute2.user.email,
            "rating": obj.substitute2.rating,
            "level": (
                obj.substitute2.level.display_name if obj.substitute2.level else None
            ),
        }

    def get_current_standing(self, obj):
        """Get current standing for this team."""
        standing = obj.current_standing
        if standing:
            return LeagueStandingSerializer(standing).data
        return None

    def validate(self, data):
        """Validate team data."""
        if data.get("player1") == data.get("player2"):
            raise serializers.ValidationError(
                "Player 1 and Player 2 cannot be the same."
            )

        return data


class LeagueSeasonSerializer(serializers.ModelSerializer):
    """Serializer for LeagueSeason model."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_registration_open = serializers.ReadOnlyField()
    teams_count = serializers.ReadOnlyField()
    league_name = serializers.CharField(source="league.name", read_only=True)
    standings = LeagueStandingSerializer(many=True, read_only=True)
    schedule_config = LeagueScheduleSerializer(
        source="schedules", many=True, read_only=True
    )

    class Meta:
        model = LeagueSeason
        fields = [
            "id",
            "league",
            "league_name",
            "name",
            "season_number",
            "start_date",
            "end_date",
            "registration_start",
            "registration_end",
            "status",
            "status_display",
            "current_matchday",
            "total_matchdays",
            "matches_per_team",
            "total_matches",
            "playoff_enabled",
            "playoff_start_date",
            "playoff_teams",
            "is_registration_open",
            "teams_count",
            "standings",
            "schedule_config",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "season_number",
            "current_matchday",
            "total_matchdays",
            "matches_per_team",
            "total_matches",
            "teams_count",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """Validate season data."""
        if data.get("start_date") and data.get("end_date"):
            if data["start_date"] > data["end_date"]:
                raise serializers.ValidationError(
                    "Start date cannot be after end date."
                )

        if data.get("registration_start") and data.get("registration_end"):
            if data["registration_end"] <= data["registration_start"]:
                raise serializers.ValidationError(
                    "Registration end must be after registration start."
                )

        if (
            data.get("playoff_enabled")
            and data.get("playoff_start_date")
            and data.get("start_date")
        ):
            if data["playoff_start_date"] < data["start_date"]:
                raise serializers.ValidationError(
                    "Playoff start date cannot be before season start date."
                )

        return data


class LeagueSerializer(serializers.ModelSerializer):
    """Serializer for League model."""

    format_display = serializers.CharField(source="get_format_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    division_display = serializers.CharField(
        source="get_division_display", read_only=True
    )
    current_season = serializers.SerializerMethodField()
    current_teams_count = serializers.ReadOnlyField()
    can_start_season = serializers.ReadOnlyField()
    organizer_name = serializers.CharField(
        source="organizer.get_full_name", read_only=True
    )
    club_name = serializers.CharField(source="club.name", read_only=True)

    class Meta:
        model = League
        fields = [
            "id",
            "organization",
            "club",
            "club_name",
            "name",
            "description",
            "slug",
            "format",
            "format_display",
            "division",
            "division_display",
            "max_teams",
            "min_teams",
            "registration_fee",
            "requires_payment",
            "auto_generate_schedule",
            "is_public",
            "requires_approval",
            "allow_substitutes",
            "status",
            "status_display",
            "organizer",
            "organizer_name",
            "contact_email",
            "contact_phone",
            "allow_playoffs",
            "playoff_teams_count",
            "allow_promotion_relegation",
            "promotion_spots",
            "relegation_spots",
            "logo_image",
            "banner_image",
            "tags",
            "external_url",
            "rules_document",
            "current_season",
            "current_teams_count",
            "can_start_season",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "current_teams_count",
            "can_start_season",
            "created_at",
            "updated_at",
        ]

    def get_current_season(self, obj):
        """Get current season details."""
        current_season = obj.current_season
        if current_season:
            return {
                "id": current_season.id,
                "name": current_season.name,
                "season_number": current_season.season_number,
                "status": current_season.status,
                "status_display": current_season.get_status_display(),
                "start_date": current_season.start_date,
                "end_date": current_season.end_date,
                "teams_count": current_season.teams_count,
            }
        return None

    def validate(self, data):
        """Validate league data."""
        if data.get("min_teams") and data.get("max_teams"):
            if data["min_teams"] > data["max_teams"]:
                raise serializers.ValidationError(
                    "Min teams cannot be greater than max teams."
                )

        if (
            data.get("allow_playoffs")
            and data.get("playoff_teams_count")
            and data.get("max_teams")
        ):
            if data["playoff_teams_count"] > data["max_teams"]:
                raise serializers.ValidationError(
                    "Playoff teams count cannot exceed max teams."
                )

        return data

    def create(self, validated_data):
        """Create league and generate slug."""
        if not validated_data.get("slug"):
            from django.utils.text import slugify

            base_slug = slugify(validated_data["name"])
            slug = base_slug
            counter = 1
            while League.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data["slug"] = slug

        return super().create(validated_data)


class LeagueListSerializer(serializers.ModelSerializer):
    """Light serializer for League listing."""

    format_display = serializers.CharField(source="get_format_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    division_display = serializers.CharField(
        source="get_division_display", read_only=True
    )
    club_name = serializers.CharField(source="club.name", read_only=True)
    current_teams_count = serializers.ReadOnlyField()

    class Meta:
        model = League
        fields = [
            "id",
            "name",
            "slug",
            "format",
            "format_display",
            "division",
            "division_display",
            "status",
            "status_display",
            "club_name",
            "max_teams",
            "current_teams_count",
            "registration_fee",
            "logo_image",
            "is_public",
            "created_at",
        ]


class LeagueDetailSerializer(LeagueSerializer):
    """Detailed serializer for League with related data."""

    seasons = LeagueSeasonSerializer(many=True, read_only=True)
    rules = LeagueRulesSerializer(many=True, read_only=True)
    recent_matches = serializers.SerializerMethodField()

    class Meta(LeagueSerializer.Meta):
        fields = LeagueSerializer.Meta.fields + ["seasons", "rules", "recent_matches"]

    def get_recent_matches(self, obj):
        """Get recent matches from current season."""
        current_season = obj.current_season
        if current_season:
            recent_matches = current_season.matches.filter(
                status__in=["completed", "in_progress"]
            ).order_by("-scheduled_date")[:5]
            return LeagueMatchSerializer(recent_matches, many=True).data
        return []


# Specialized Serializers for Actions


class LeagueTeamRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for team registration in leagues."""

    class Meta:
        model = LeagueTeam
        fields = [
            "team_name",
            "player1",
            "player2",
            "substitute1",
            "substitute2",
            "contact_phone",
            "contact_email",
        ]

    def validate(self, data):
        """Validate team registration."""
        season = self.context.get("season")

        if not season:
            raise serializers.ValidationError("Season context is required.")

        if not season.is_registration_open:
            raise serializers.ValidationError(
                "Registration is not open for this season."
            )

        if season.teams_count >= season.league.max_teams:
            raise serializers.ValidationError("League is full.")

        # Check if players are already registered in this season
        from django.db.models import Q

        if (
            LeagueTeam.objects.filter(season=season)
            .filter(
                Q(player1=data["player1"])
                | Q(player2=data["player1"])
                | Q(player1=data["player2"])
                | Q(player2=data["player2"])
            )
            .exists()
        ):
            raise serializers.ValidationError(
                "One or both players are already registered in this season."
            )

        return super().validate(data)


class MatchResultSerializer(serializers.Serializer):
    """Serializer for submitting match results."""

    home_score = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=15),
        min_length=1,
        max_length=5,
    )
    away_score = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=15),
        min_length=1,
        max_length=5,
    )
    duration_minutes = serializers.IntegerField(min_value=1, required=False)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        """Validate match result."""
        home_score = data["home_score"]
        away_score = data["away_score"]

        if len(home_score) != len(away_score):
            raise serializers.ValidationError(
                "Home and away scores must have the same number of sets."
            )

        # Validate each set
        for i, (home, away) in enumerate(zip(home_score, away_score), 1):
            if home == away:
                raise serializers.ValidationError(
                    f"Set {i} cannot be tied. Scores: {home}-{away}"
                )

            # Standard padel scoring rules
            if max(home, away) < 6:
                raise serializers.ValidationError(
                    f"Set {i} must reach at least 6 games for winner."
                )

            if max(home, away) == 6 and min(home, away) > 4:
                raise serializers.ValidationError(
                    f"Set {i} with 6 games must be won by at least 2 games if opponent has more than 4."
                )

        return data


class LeagueStandingsSerializer(serializers.Serializer):
    """Serializer for league standings table."""

    season = serializers.UUIDField()
    standings = LeagueStandingSerializer(many=True, read_only=True)
    last_updated = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        """Custom representation for standings."""
        season = instance
        standings = season.standings.all()

        return {
            "season": {
                "id": season.id,
                "name": season.name,
                "league_name": season.league.name,
            },
            "standings": LeagueStandingSerializer(standings, many=True).data,
            "last_updated": timezone.now(),
        }
