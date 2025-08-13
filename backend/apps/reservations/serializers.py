"""
Serializers for reservations module - EMERGENCY RECOVERY VERSION.
Simplified version focusing on core functionality.
"""

from datetime import datetime

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import serializers

from apps.clubs.models import Club, Court

from .models import BlockedSlot, Reservation, ReservationPayment

User = get_user_model()


class ReservationSerializer(serializers.ModelSerializer):
    """Serializer for reservations - EMERGENCY RECOVERY VERSION."""

    club_name = serializers.CharField(source="club.name", read_only=True)
    court_name = serializers.CharField(source="court.name", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    client_name = serializers.CharField(source="client_profile.full_name", read_only=True, allow_null=True)
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "club",
            "club_name",
            "court",
            "court_name",
            "organization",
            "created_by",
            "created_by_name",
            "client_profile",
            "client_name",
            "date",
            "start_time",
            "end_time",
            "duration_hours",
            "player_name",
            "player_email",
            "player_phone",
            "player_count",
            "status",
            "payment_status",
            "price_per_hour",
            "total_price",
            "notes",
            "is_split_payment",
            "split_count",
            "cancelled_at",
            "cancelled_by",
            "cancellation_reason",
            "can_cancel",
            "is_past",
            "is_today",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "duration_hours",
            "total_price",
            "cancelled_at",
            "cancelled_by",
            "is_past",
            "is_today",
            "created_at",
            "updated_at",
        ]

    def get_can_cancel(self, obj):
        """Check if reservation can be cancelled."""
        return obj.can_cancel()

    def validate(self, data):
        """Validate reservation data."""
        # Check if court belongs to club
        if "court" in data and "club" in data:
            if data["court"].club != data["club"]:
                raise serializers.ValidationError(
                    "Court does not belong to the selected club"
                )

        # Validate time slot
        if "date" in data and "start_time" in data:
            # Check if slot is in the future
            start_datetime = datetime.combine(data["date"], data["start_time"])
            if timezone.make_aware(start_datetime) < timezone.now():
                raise serializers.ValidationError(
                    "Cannot create reservations in the past"
                )

            # Check if slot is available
            court = data.get("court")
            if court and self.instance:
                # Updating existing reservation
                conflicting = Reservation.objects.filter(
                    court=court,
                    date=data["date"],
                    start_time__lt=data.get("end_time", data["start_time"]),
                    end_time__gt=data["start_time"],
                    status__in=["pending", "confirmed"],
                ).exclude(id=self.instance.id)
            elif court:
                # Creating new reservation
                conflicting = Reservation.objects.filter(
                    court=court,
                    date=data["date"],
                    start_time__lt=data.get("end_time", data["start_time"]),
                    end_time__gt=data["start_time"],
                    status__in=["pending", "confirmed"],
                )
            else:
                conflicting = None

            if conflicting and conflicting.exists():
                raise serializers.ValidationError("This time slot is not available")

        return data
    
    def create(self, validated_data):
        """Create reservation and split payments if needed."""
        reservation = super().create(validated_data)
        
        # Create split payments if needed
        if reservation.is_split_payment and reservation.split_count > 1:
            reservation.create_split_payments()
        
        return reservation


class ReservationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reservations - EMERGENCY RECOVERY VERSION."""

    price_per_hour = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    # client field will be added dynamically in __init__

    class Meta:
        model = Reservation
        fields = [
            "club",
            "court",
            "client_profile",  # Fixed field name
            "date",
            "start_time",
            "end_time",
            "player_name",
            "player_email",
            "player_phone",
            "player_count",
            "price_per_hour",
            "notes",
            "is_split_payment",
            "split_count",
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import here to avoid circular imports
        from apps.clients.models import ClientProfile
        
        # Add client field dynamically
        if 'context' in kwargs and 'request' in kwargs['context']:
            user = kwargs['context']['request'].user
            if hasattr(user, 'organization') and user.organization:
                queryset = ClientProfile.objects.filter(organization=user.organization)
            else:
                queryset = ClientProfile.objects.none()
        else:
            queryset = ClientProfile.objects.none()
            
        self.fields['client'] = serializers.PrimaryKeyRelatedField(
            queryset=queryset,
            required=False,
            allow_null=True,
            help_text="ID del cliente registrado (opcional)"
        )

    def validate(self, data):
        """Validate creation data."""
        # Set default price if not provided
        if (
            "price_per_hour" not in data or data.get("price_per_hour") is None
        ) and "court" in data:
            data["price_per_hour"] = data["court"].price_per_hour

        # If client is provided, override player info with client data
        if "client" in data and data["client"]:
            client = data["client"]
            data["player_name"] = client.full_name
            data["player_email"] = client.email
            data["player_phone"] = client.phone
        # If no client, ensure visitor info is provided
        elif not data.get("player_name") or not data.get("player_phone"):
            raise serializers.ValidationError(
                "Debe proporcionar un cliente registrado o los datos del visitante (nombre y teléfono)"
            )
        
        # Ensure player_email is not empty string
        if "player_email" in data and data["player_email"] == "":
            data["player_email"] = None

        # Validate split payment fields
        if data.get("is_split_payment", False):
            split_count = data.get("split_count", 1)
            if split_count < 2:
                raise serializers.ValidationError(
                    "Split count must be at least 2 for split payments"
                )
        else:
            # Ensure split_count is 1 if not split payment
            data["split_count"] = 1

        # Validate using parent method
        return super().validate(data)
    
    def create(self, validated_data):
        """Create reservation and split payments if needed."""
        reservation = super().create(validated_data)
        
        # Create split payments if needed
        if reservation.is_split_payment and reservation.split_count > 1:
            reservation.create_split_payments()
        
        return reservation


class BlockedSlotSerializer(serializers.ModelSerializer):
    """Serializer for blocked time slots - EMERGENCY RECOVERY VERSION."""

    club_name = serializers.CharField(source="club.name", read_only=True)
    court_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = BlockedSlot
        fields = [
            "id",
            "club",
            "club_name",
            "court",
            "court_name",
            "organization",
            "block_type",
            "reason",
            "start_datetime",
            "end_datetime",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_court_name(self, obj):
        """Get court name or 'All courts'."""
        return obj.court.name if obj.court else "Todas las canchas"

    def validate(self, data):
        """Validate blocked time slot."""
        if data.get("start_datetime") and data.get("end_datetime"):
            if data["end_datetime"] <= data["start_datetime"]:
                raise serializers.ValidationError(
                    "End datetime must be after start datetime"
                )

        return data


class AvailabilityCheckSerializer(serializers.Serializer):
    """Serializer for checking court availability - EMERGENCY RECOVERY VERSION."""

    club = serializers.PrimaryKeyRelatedField(queryset=Club.objects.all())
    court = serializers.PrimaryKeyRelatedField(
        queryset=Court.objects.all(), required=False
    )
    date = serializers.DateField()

    def validate(self, data):
        """Validate availability check parameters."""
        # Ensure court belongs to club if specified
        if "court" in data and data["court"].club != data["club"]:
            raise serializers.ValidationError(
                "Court does not belong to the selected club"
            )

        return data


class ReservationPaymentSerializer(serializers.ModelSerializer):
    """Serializer for individual reservation payments."""
    
    payment_link = serializers.SerializerMethodField()
    is_paid = serializers.SerializerMethodField()
    can_check_in = serializers.SerializerMethodField()
    
    class Meta:
        model = ReservationPayment
        fields = [
            'id', 'reservation', 'payment_token', 'check_in_code',
            'amount', 'payment_method', 'paid_at', 'payment_link',
            'player_name', 'player_email', 'player_phone',
            'check_in_status', 'checked_in_at', 'is_paid', 'can_check_in',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'payment_token', 'check_in_code', 'payment_link', 
            'is_paid', 'can_check_in', 'created_at', 'updated_at'
        ]
    
    def get_payment_link(self, obj):
        return obj.payment_link
    
    def get_is_paid(self, obj):
        return obj.is_paid
    
    def get_can_check_in(self, obj):
        return obj.can_check_in


class ProcessPaymentSerializer(serializers.Serializer):
    """Serializer for processing a payment."""
    payment_method = serializers.ChoiceField(choices=['card', 'cash', 'transfer'])
    stripe_payment_intent = serializers.CharField(required=False, allow_blank=True)
    player_name = serializers.CharField(max_length=200)
    player_email = serializers.EmailField()
    player_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class CheckInSerializer(serializers.Serializer):
    """Serializer for check-in."""
    check_in_code = serializers.CharField(max_length=6)


class ReservationWithPaymentsSerializer(ReservationSerializer):
    """Reservation serializer with split payments info."""
    split_payments = ReservationPaymentSerializer(many=True, read_only=True)
    payment_progress = serializers.SerializerMethodField()
    check_in_progress = serializers.SerializerMethodField()
    
    class Meta(ReservationSerializer.Meta):
        fields = ReservationSerializer.Meta.fields + [
            'is_split_payment', 'split_count', 'split_payments',
            'payment_progress', 'check_in_progress'
        ]
    
    def get_payment_progress(self, obj):
        return obj.payment_progress
    
    def get_check_in_progress(self, obj):
        return obj.check_in_progress
