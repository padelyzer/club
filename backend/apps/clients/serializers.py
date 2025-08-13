"""
Serializers for clients module.
"""

from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import serializers

from .models import (
    ClientProfile,
    EmergencyContact,
    MedicalInfo,
    PartnerRequest,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)

User = get_user_model()


class PlayerLevelSerializer(serializers.ModelSerializer):
    """Serializer for player levels."""

    class Meta:
        model = PlayerLevel
        fields = [
            "id",
            "name",
            "display_name",
            "description",
            "min_rating",
            "max_rating",
            "color",
            "icon",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlayerStatsSerializer(serializers.ModelSerializer):
    """Serializer for player statistics."""

    class Meta:
        model = PlayerStats
        fields = [
            "id",
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
            "club_ranking",
            "regional_ranking",
            "national_ranking",
            "last_match_date",
            "last_tournament_date",
            "last_class_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "win_rate"]


class EmergencyContactSerializer(serializers.ModelSerializer):
    """Serializer for emergency contacts."""

    class Meta:
        model = EmergencyContact
        fields = [
            "id",
            "name",
            "relationship",
            "phone",
            "phone_alt",
            "email",
            "is_primary",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MedicalInfoSerializer(serializers.ModelSerializer):
    """Serializer for medical information."""

    class Meta:
        model = MedicalInfo
        fields = [
            "id",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "current_medications",
            "injuries",
            "physical_limitations",
            "insurance_company",
            "insurance_policy_number",
            "insurance_phone",
            "doctor_name",
            "doctor_phone",
            "clinic_hospital",
            "special_considerations",
            "last_medical_check",
            "emergency_consent",
            "data_sharing_consent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlayerPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for player preferences."""

    min_partner_level = PlayerLevelSerializer(read_only=True)
    max_partner_level = PlayerLevelSerializer(read_only=True)
    min_partner_level_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )
    max_partner_level_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )
    preferred_partners_count = serializers.SerializerMethodField()
    blocked_players_count = serializers.SerializerMethodField()

    class Meta:
        model = PlayerPreferences
        fields = [
            "id",
            # Availability
            "available_weekday_morning",
            "available_weekday_afternoon",
            "available_weekday_evening",
            "available_weekend_morning",
            "available_weekend_afternoon",
            "available_weekend_evening",
            # Play preferences
            "preferred_court_type",
            "preferred_match_duration",
            "preferred_match_format",
            # Partner preferences
            "min_partner_level",
            "max_partner_level",
            "min_partner_level_id",
            "max_partner_level_id",
            "preferred_partners_count",
            "blocked_players_count",
            # Notifications
            "notify_match_invites",
            "notify_tournament_updates",
            "notify_class_reminders",
            "notify_partner_requests",
            "notify_club_news",
            "notify_ranking_changes",
            "email_notifications",
            "sms_notifications",
            "push_notifications",
            # Privacy
            "share_contact_info",
            "share_stats",
            "share_availability",
            # Other
            "language",
            "distance_radius",
            "auto_accept_known_partners",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "preferred_partners_count",
            "blocked_players_count",
        ]

    def get_preferred_partners_count(self, obj):
        return obj.preferred_partners.count()

    def get_blocked_players_count(self, obj):
        return obj.blocked_players.count()


class ClientProfileListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for client profile lists."""

    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    level_name = serializers.CharField(source="level.display_name", read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user_full_name",
            "user_email",
            "level_name",
            "rating",
            "dominant_hand",
            "preferred_position",
            "is_public",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ClientProfileDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for client profiles."""

    user = serializers.SerializerMethodField()
    level = PlayerLevelSerializer(read_only=True)
    level_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    stats = PlayerStatsSerializer(read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    medical_info = MedicalInfoSerializer(read_only=True)
    preferences = PlayerPreferencesSerializer(read_only=True)
    age = serializers.SerializerMethodField()

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "level",
            "level_id",
            "rating",
            "dominant_hand",
            "preferred_position",
            "birth_date",
            "age",
            "dni",
            "occupation",
            "height",
            "weight",
            "play_style",
            "strengths",
            "weaknesses",
            "bio",
            "instagram",
            "facebook",
            "is_public",
            "show_in_rankings",
            "allow_partner_requests",
            "stats",
            "emergency_contacts",
            "medical_info",
            "preferences",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "age", "user"]

    def get_user(self, obj):
        return {
            "id": str(obj.user.id),
            "username": obj.user.username,
            "email": obj.user.email,
            "full_name": obj.user.get_full_name(),
            "phone": obj.user.phone,
            "avatar_url": obj.user.avatar_url,
        }

    def get_age(self, obj):
        if obj.birth_date:
            from datetime import date

            today = date.today()
            age = today.year - obj.birth_date.year
            if today.month < obj.birth_date.month or (
                today.month == obj.birth_date.month and today.day < obj.birth_date.day
            ):
                age -= 1
            return age
        return None

    @transaction.atomic
    def create(self, validated_data):
        level_id = validated_data.pop("level_id", None)
        if level_id:
            validated_data["level"] = PlayerLevel.objects.get(id=level_id)

        # Create profile
        profile = super().create(validated_data)

        # Create related objects
        PlayerStats.objects.create(player=profile)
        PlayerPreferences.objects.create(player=profile)

        return profile

    @transaction.atomic
    def update(self, instance, validated_data):
        level_id = validated_data.pop("level_id", None)
        if level_id:
            validated_data["level"] = PlayerLevel.objects.get(id=level_id)

        # Update profile
        profile = super().update(instance, validated_data)

        # Update level based on rating if needed
        if "rating" in validated_data:
            profile.update_level_by_rating()

        return profile


class ClientProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating client profiles."""

    user_id = serializers.IntegerField(write_only=True)
    level_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ClientProfile
        fields = [
            "user_id",
            "level_id",
            "rating",
            "dominant_hand",
            "preferred_position",
            "birth_date",
            "dni",
            "occupation",
            "height",
            "weight",
            "play_style",
            "bio",
            "is_public",
            "show_in_rankings",
            "allow_partner_requests",
        ]

    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
            if hasattr(user, "client_profile"):
                raise serializers.ValidationError(
                    "This user already has a client profile."
                )
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

    @transaction.atomic
    def create(self, validated_data):
        user_id = validated_data.pop("user_id")
        level_id = validated_data.pop("level_id", None)

        user = User.objects.get(id=user_id)
        if level_id:
            validated_data["level"] = PlayerLevel.objects.get(id=level_id)

        # Create profile
        profile = ClientProfile.objects.create(user=user, **validated_data)

        # Create related objects
        PlayerStats.objects.create(player=profile)
        PlayerPreferences.objects.create(player=profile)

        return profile


class PartnerRequestSerializer(serializers.ModelSerializer):
    """Serializer for partner requests."""

    from_player = ClientProfileListSerializer(read_only=True)
    to_player = ClientProfileListSerializer(read_only=True)
    to_player_id = serializers.UUIDField(write_only=True, required=False)
    # tournament_name = serializers.CharField(source='tournament.name', read_only=True)

    class Meta:
        model = PartnerRequest
        fields = [
            "id",
            "from_player",
            "to_player",
            "to_player_id",
            "status",
            "message",
            "match_date",
            "responded_at",
            "response_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "responded_at",
            "response_message",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        to_player_id = data.get("to_player_id")
        
        if not to_player_id:
            raise serializers.ValidationError("to_player_id is required.")

        # Check if player exists
        try:
            to_player = ClientProfile.objects.get(id=to_player_id)
        except ClientProfile.DoesNotExist:
            raise serializers.ValidationError("Player not found.")

        # Check if to_player allows partner requests
        if not to_player.allow_partner_requests:
            raise serializers.ValidationError(
                "This player is not accepting partner requests."
            )

        # Note: from_player validation will be done in the view
        # since we get it from the request.user
        
        data['to_player'] = to_player
        return data

    def create(self, validated_data):
        to_player = validated_data.pop("to_player", None)
        to_player_id = validated_data.pop("to_player_id", None)
        
        if to_player:
            validated_data["to_player"] = to_player
        elif to_player_id:
            validated_data["to_player_id"] = to_player_id

        return super().create(validated_data)


class PartnerRequestResponseSerializer(serializers.Serializer):
    """Serializer for responding to partner requests."""

    action = serializers.ChoiceField(choices=["accept", "reject"])
    message = serializers.CharField(required=False, allow_blank=True)


class PlayerSearchSerializer(serializers.Serializer):
    """Serializer for player search filters."""

    level_id = serializers.UUIDField(required=False)
    min_rating = serializers.IntegerField(required=False, min_value=0, max_value=1000)
    max_rating = serializers.IntegerField(required=False, min_value=0, max_value=1000)
    dominant_hand = serializers.ChoiceField(
        choices=["right", "left", "ambidextrous"], required=False
    )
    preferred_position = serializers.ChoiceField(
        choices=["right", "left", "both"], required=False
    )
    available_now = serializers.BooleanField(required=False)
    distance_km = serializers.IntegerField(required=False, min_value=1, max_value=100)
    exclude_blocked = serializers.BooleanField(default=True)
    only_public = serializers.BooleanField(default=True)


class PlayerRankingSerializer(serializers.ModelSerializer):
    """Serializer for player rankings."""

    player_name = serializers.CharField(source="user.get_full_name", read_only=True)
    level_name = serializers.CharField(source="level.display_name", read_only=True)
    matches_played = serializers.IntegerField(
        source="stats.matches_played", read_only=True
    )
    win_rate = serializers.DecimalField(
        source="stats.win_rate", max_digits=5, decimal_places=2, read_only=True
    )

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "player_name",
            "level_name",
            "rating",
            "matches_played",
            "win_rate",
        ]
