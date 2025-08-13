"""
Serializers for tournaments module.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import serializers

from apps.clients.serializers import (
    ClientProfileDetailSerializer as ClientProfileSerializer,
)
from apps.clubs.serializers import CourtSerializer

from .models import (
    Match,
    Prize,
    Tournament,
    TournamentBracket,
    TournamentCategory,
    TournamentRegistration,
    TournamentRules,
    TournamentStats,
    Bracket,
    BracketNode,
    MatchSchedule,
)

# Import League models from leagues app
from apps.leagues.models import League

User = get_user_model()


class TournamentCategorySerializer(serializers.ModelSerializer):
    """Serializer for tournament categories."""

    min_level_display = serializers.CharField(
        source="min_level.display_name", read_only=True
    )
    max_level_display = serializers.CharField(
        source="max_level.display_name", read_only=True
    )
    category_type_display = serializers.CharField(
        source="get_category_type_display", read_only=True
    )
    gender_display = serializers.CharField(source="get_gender_display", read_only=True)

    class Meta:
        model = TournamentCategory
        fields = [
            "id",
            "name",
            "category_type",
            "category_type_display",
            "description",
            "min_age",
            "max_age",
            "min_level",
            "min_level_display",
            "max_level",
            "max_level_display",
            "gender",
            "gender_display",
            "color",
            "icon",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TournamentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for tournament lists."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    organizer_name = serializers.CharField(
        source="organizer.get_full_name", read_only=True
    )
    club_name = serializers.CharField(source="club.name", read_only=True)
    current_teams_count = serializers.IntegerField(read_only=True)
    is_registration_open = serializers.BooleanField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    format_display = serializers.CharField(source="get_format_display", read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "format",
            "format_display",
            "category_name",
            "start_date",
            "end_date",
            "registration_start",
            "registration_end",
            "max_teams",
            "min_teams",
            "registration_fee",
            "status",
            "status_display",
            "visibility",
            "organizer_name",
            "club_name",
            "current_teams_count",
            "is_registration_open",
            "is_full",
            "banner_image",
            "logo_image",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "current_teams_count",
            "is_registration_open",
            "is_full",
            "created_at",
        ]


class TournamentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for tournament details."""

    category = TournamentCategorySerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True)
    organizer_name = serializers.CharField(
        source="organizer.get_full_name", read_only=True
    )
    club_name = serializers.CharField(source="club.name", read_only=True)
    current_teams_count = serializers.IntegerField(read_only=True)
    is_registration_open = serializers.BooleanField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    can_start = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    format_display = serializers.CharField(source="get_format_display", read_only=True)
    visibility_display = serializers.CharField(
        source="get_visibility_display", read_only=True
    )

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "format",
            "format_display",
            "category",
            "category_id",
            "start_date",
            "end_date",
            "registration_start",
            "registration_end",
            "max_teams",
            "min_teams",
            "registration_fee",
            "requires_payment",
            "allow_substitutes",
            "max_substitutes_per_team",
            "visibility",
            "visibility_display",
            "requires_approval",
            "status",
            "status_display",
            "current_round",
            "total_rounds",
            "organizer",
            "organizer_name",
            "contact_email",
            "contact_phone",
            "club_name",
            "rules",
            "match_format",
            "banner_image",
            "logo_image",
            "tags",
            "external_url",
            "current_teams_count",
            "is_registration_open",
            "is_full",
            "can_start",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "current_round",
            "total_rounds",
            "current_teams_count",
            "is_registration_open",
            "is_full",
            "can_start",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        # Extract category_id and set category
        category_id = validated_data.pop("category_id")
        validated_data["category_id"] = category_id

        # Set organizer from request user
        validated_data["organizer"] = self.context["request"].user

        # Set organization and club from context
        validated_data["organization"] = self.context["organization"]
        validated_data["club"] = self.context["club"]

        return super().create(validated_data)


class TournamentRegistrationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for tournament registrations."""

    player1 = ClientProfileSerializer(read_only=True)
    player2 = ClientProfileSerializer(read_only=True)
    substitute1 = ClientProfileSerializer(read_only=True)
    substitute2 = ClientProfileSerializer(read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    team_display_name = serializers.CharField(read_only=True)

    class Meta:
        model = TournamentRegistration
        fields = [
            "id",
            "tournament",
            "tournament_name",
            "team_name",
            "team_display_name",
            "player1",
            "player2",
            "substitute1",
            "substitute2",
            "status",
            "status_display",
            "seed",
            "notes",
            "payment_status",
            "payment_status_display",
            "payment_reference",
            "contact_phone",
            "contact_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "seed",
            "team_display_name",
            "created_at",
            "updated_at",
        ]


class TournamentRegistrationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tournament registrations."""

    player1_id = serializers.UUIDField(write_only=True)
    player2_id = serializers.UUIDField(write_only=True)
    substitute1_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )
    substitute2_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = TournamentRegistration
        fields = [
            "tournament",
            "team_name",
            "player1_id",
            "player2_id",
            "substitute1_id",
            "substitute2_id",
            "notes",
            "contact_phone",
            "contact_email",
        ]

    def create(self, validated_data):
        # Extract player IDs and set actual players
        player1_id = validated_data.pop("player1_id")
        player2_id = validated_data.pop("player2_id")
        substitute1_id = validated_data.pop("substitute1_id", None)
        substitute2_id = validated_data.pop("substitute2_id", None)

        validated_data["player1_id"] = player1_id
        validated_data["player2_id"] = player2_id
        if substitute1_id:
            validated_data["substitute1_id"] = substitute1_id
        if substitute2_id:
            validated_data["substitute2_id"] = substitute2_id

        return super().create(validated_data)

    def validate(self, data):
        # Check if tournament registration is open
        tournament = data["tournament"]
        if not tournament.is_registration_open:
            raise serializers.ValidationError(
                "Registration is not open for this tournament"
            )

        # Check if tournament is full
        if tournament.is_full:
            raise serializers.ValidationError("Tournament is full")

        # Check if players are different
        if data["player1_id"] == data["player2_id"]:
            raise serializers.ValidationError("Player 1 and Player 2 must be different")

        return data


class TournamentBracketSerializer(serializers.ModelSerializer):
    """Serializer for tournament brackets."""

    team1_name = serializers.CharField(source="team1.team_display_name", read_only=True)
    team2_name = serializers.CharField(source="team2.team_display_name", read_only=True)
    match_status = serializers.CharField(source="match.status", read_only=True)
    match_result = serializers.SerializerMethodField()

    class Meta:
        model = TournamentBracket
        fields = [
            "id",
            "tournament",
            "round_number",
            "position",
            "team1",
            "team1_name",
            "team2",
            "team2_name",
            "advances_to",
            "match",
            "match_status",
            "match_result",
            "is_losers_bracket",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_match_result(self, obj):
        """Get match result if available."""
        if obj.match and obj.match.status == "completed":
            return {
                "winner": (
                    obj.match.winner.team_display_name if obj.match.winner else None
                ),
                "team1_score": obj.match.team1_score,
                "team2_score": obj.match.team2_score,
                "team1_sets": obj.match.team1_sets_won,
                "team2_sets": obj.match.team2_sets_won,
            }
        return None


class MatchListSerializer(serializers.ModelSerializer):
    """Simplified serializer for match lists."""

    team1_name = serializers.CharField(source="team1.team_display_name", read_only=True)
    team2_name = serializers.CharField(source="team2.team_display_name", read_only=True)
    winner_name = serializers.CharField(
        source="winner.team_display_name", read_only=True
    )
    court_name = serializers.CharField(source="court.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "tournament_name",
            "round_number",
            "match_number",
            "team1",
            "team1_name",
            "team2",
            "team2_name",
            "scheduled_date",
            "court",
            "court_name",
            "status",
            "status_display",
            "winner",
            "winner_name",
            "duration_minutes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MatchDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for matches."""

    team1 = TournamentRegistrationDetailSerializer(read_only=True)
    team2 = TournamentRegistrationDetailSerializer(read_only=True)
    winner = TournamentRegistrationDetailSerializer(read_only=True)
    court = CourtSerializer(read_only=True)
    referee_name = serializers.CharField(source="referee.get_full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)
    team1_sets_won = serializers.IntegerField(read_only=True)
    team2_sets_won = serializers.IntegerField(read_only=True)

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "tournament_name",
            "round_number",
            "match_number",
            "team1",
            "team2",
            "scheduled_date",
            "court",
            "status",
            "status_display",
            "team1_score",
            "team2_score",
            "team1_sets_won",
            "team2_sets_won",
            "winner",
            "actual_start_time",
            "actual_end_time",
            "duration_minutes",
            "referee",
            "referee_name",
            "notes",
            "walkover_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "team1_sets_won",
            "team2_sets_won",
            "created_at",
            "updated_at",
        ]


class MatchScoreUpdateSerializer(serializers.Serializer):
    """Serializer for updating match scores."""

    team1_games = serializers.IntegerField(min_value=0, max_value=7)
    team2_games = serializers.IntegerField(min_value=0, max_value=7)

    def validate(self, data):
        team1_games = data["team1_games"]
        team2_games = data["team2_games"]

        # Basic padel scoring validation
        if team1_games == team2_games == 6:
            raise serializers.ValidationError("Sets cannot end 6-6, must go to 7")

        if team1_games > 6 or team2_games > 6:
            if abs(team1_games - team2_games) < 1:
                raise serializers.ValidationError(
                    "When games > 6, winner must win by at least 1"
                )

        return data


class PrizeSerializer(serializers.ModelSerializer):
    """Serializer for tournament prizes."""

    prize_type_display = serializers.CharField(
        source="get_prize_type_display", read_only=True
    )
    awarded_to_name = serializers.CharField(
        source="awarded_to.team_display_name", read_only=True
    )

    class Meta:
        model = Prize
        fields = [
            "id",
            "tournament",
            "position",
            "name",
            "description",
            "prize_type",
            "prize_type_display",
            "cash_value",
            "points_value",
            "awarded_to",
            "awarded_to_name",
            "awarded_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "awarded_at", "created_at", "updated_at"]


class TournamentRulesSerializer(serializers.ModelSerializer):
    """Serializer for tournament rules."""

    rule_type_display = serializers.CharField(
        source="get_rule_type_display", read_only=True
    )

    class Meta:
        model = TournamentRules
        fields = [
            "id",
            "tournament",
            "rule_type",
            "rule_type_display",
            "title",
            "description",
            "order",
            "is_mandatory",
            "penalty_description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TournamentStatsSerializer(serializers.ModelSerializer):
    """Serializer for tournament statistics."""

    completion_percentage = serializers.SerializerMethodField()
    average_registration_fee = serializers.SerializerMethodField()

    class Meta:
        model = TournamentStats
        fields = [
            "id",
            "tournament",
            "total_registrations",
            "confirmed_teams",
            "waitlist_teams",
            "cancelled_registrations",
            "total_matches",
            "completed_matches",
            "walkover_matches",
            "cancelled_matches",
            "completion_percentage",
            "average_match_duration",
            "total_play_time",
            "total_registration_fees",
            "average_registration_fee",
            "total_prize_money",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_completion_percentage(self, obj):
        """Calculate tournament completion percentage."""
        if obj.total_matches == 0:
            return 0
        return round((obj.completed_matches / obj.total_matches) * 100, 2)

    def get_average_registration_fee(self, obj):
        """Calculate average registration fee per confirmed team."""
        if obj.confirmed_teams == 0:
            return 0
        return round(obj.total_registration_fees / obj.confirmed_teams, 2)


class TournamentScheduleSerializer(serializers.Serializer):
    """Serializer for tournament schedule generation."""

    start_time = serializers.TimeField()
    match_duration_minutes = serializers.IntegerField(
        min_value=60, max_value=180, default=90
    )
    break_between_matches = serializers.IntegerField(
        min_value=0, max_value=60, default=15
    )
    courts = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    dates = serializers.ListField(child=serializers.DateField(), min_length=1)


class TournamentStartSerializer(serializers.Serializer):
    """Serializer for starting tournaments."""

    confirm = serializers.BooleanField(default=False)

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must confirm to start the tournament"
            )
        return value


class BracketNodeSerializer(serializers.ModelSerializer):
    """Serializer for bracket nodes."""
    
    match = MatchListSerializer(read_only=True)
    bye_team = TournamentRegistrationDetailSerializer(read_only=True)
    
    class Meta:
        model = BracketNode
        fields = [
            "id",
            "position",
            "round",
            "match",
            "parent_node_1",
            "parent_node_2",
            "is_losers_bracket",
            "has_bye",
            "bye_team",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BracketSerializer(serializers.ModelSerializer):
    """Serializer for tournament brackets."""
    
    tournament = TournamentListSerializer(read_only=True)
    nodes = BracketNodeSerializer(many=True, read_only=True)
    format_display = serializers.CharField(source="get_format_display", read_only=True)
    seeding_method_display = serializers.CharField(source="get_seeding_method_display", read_only=True)
    
    class Meta:
        model = Bracket
        fields = [
            "id",
            "tournament",
            "format",
            "format_display",
            "size",
            "current_round",
            "seeding_method",
            "seeding_method_display",
            "is_finalized",
            "bracket_data",
            "nodes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "bracket_data", "nodes"]


class BracketGenerateSerializer(serializers.Serializer):
    """Serializer for bracket generation."""
    
    seeding_method = serializers.ChoiceField(
        choices=["elo", "manual", "random", "geographic"],
        default="elo"
    )
    confirm = serializers.BooleanField(default=False)
    
    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm to generate the bracket")
        return value


class MatchScheduleSerializer(serializers.ModelSerializer):
    """Serializer for match schedules."""
    
    match = MatchListSerializer(read_only=True)
    court = CourtSerializer(read_only=True)
    court_id = serializers.UUIDField(write_only=True, required=False)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    
    class Meta:
        model = MatchSchedule
        fields = [
            "id",
            "match",
            "court",
            "court_id",
            "datetime",
            "duration_minutes",
            "status",
            "status_display",
            "priority",
            "constraints",
            "has_conflict",
            "conflict_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "has_conflict", "conflict_reason"]
    
    def validate(self, data):
        """Validate schedule data."""
        if self.instance:
            # Update existing schedule
            if 'datetime' in data:
                # Check for conflicts
                schedule = self.instance
                schedule.datetime = data['datetime']
                if 'court_id' in data:
                    schedule.court_id = data['court_id']
                
                if not schedule.check_conflicts():
                    raise serializers.ValidationError(
                        f"Schedule conflict: {schedule.conflict_reason}"
                    )
        
        return data


class MatchRescheduleSerializer(serializers.Serializer):
    """Serializer for rescheduling matches."""
    
    datetime = serializers.DateTimeField()
    court_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=200, required=False)
    
    def validate(self, data):
        """Validate reschedule data."""
        # Check court exists
        from apps.clubs.models import Court
        try:
            court = Court.objects.get(id=data['court_id'])
            data['court'] = court
        except Court.DoesNotExist:
            raise serializers.ValidationError("Invalid court ID")
        
        # Check datetime is in the future
        if data['datetime'] <= timezone.now():
            raise serializers.ValidationError("Schedule datetime must be in the future")
        
        return data


