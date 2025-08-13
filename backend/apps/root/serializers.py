"""
Serializers for ROOT module.
"""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

from apps.clubs.models import Club
from apps.clubs.serializers import ClubSerializer
from core.utils import validate_rfc

from .models import (
    AuditLog,
    ClubOnboarding,
    Invoice,
    Organization,
    Payment,
    Subscription,
)


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model."""

    total_with_tax = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True, source="get_total_with_tax"
    )
    can_add_club = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "id",
            "plan",
            "custom_modules",
            "billing_frequency",
            "amount",
            "currency",
            "tax_rate",
            "total_with_tax",
            "payment_method_type",
            "cfdi_use",
            "invoice_email",
            "automatic_invoice",
            "clubs_allowed",
            "users_per_club",
            "courts_per_club",
            "monthly_reservations_limit",
            "data_retention_days",
            "api_calls_per_hour",
            "start_date",
            "end_date",
            "auto_renew",
            "minimum_term_months",
            "early_termination_fee",
            "current_period_start",
            "current_period_end",
            "next_billing_date",
            "can_add_club",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "total_with_tax",
            "can_add_club",
            "created_at",
            "current_period_start",
            "current_period_end",
        ]

    def get_can_add_club(self, obj):
        return obj.can_add_club()


class OrganizationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for organization lists."""

    subscription_plan = serializers.CharField(
        source="subscription.plan", read_only=True
    )

    class Meta:
        model = Organization
        fields = [
            "id",
            "type",
            "business_name",
            "trade_name",
            "rfc",
            "state",
            "subscription_plan",
            "total_revenue",
            "active_users",
            "health_score",
            "churn_risk",
            "created_at",
            "last_activity",
        ]


class OrganizationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for organization."""

    subscription = SubscriptionSerializer(read_only=True)
    clubs_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "type",
            "business_name",
            "trade_name",
            "rfc",
            "tax_address",
            "legal_representative",
            "primary_email",
            "primary_phone",
            "state",
            "trial_ends_at",
            "suspended_at",
            "suspended_reason",
            "cancelled_at",
            "cancellation_reason",
            "total_revenue",
            "active_users",
            "monthly_reservations",
            "last_activity",
            "health_score",
            "churn_risk",
            "subscription",
            "clubs_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_revenue",
            "active_users",
            "monthly_reservations",
            "last_activity",
            "health_score",
            "churn_risk",
            "clubs_count",
            "created_at",
            "updated_at",
        ]

    def get_clubs_count(self, obj):
        return obj.clubs.filter(is_active=True).count()

    def validate_rfc(self, value):
        """Validate Mexican RFC."""
        if not validate_rfc(value):
            raise serializers.ValidationError("RFC inválido")
        return value.upper()


class OrganizationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating organizations with subscription."""

    plan = serializers.ChoiceField(
        choices=[choice[0] for choice in Subscription.PLAN_CHOICES], write_only=True
    )
    billing_frequency = serializers.ChoiceField(
        choices=[choice[0] for choice in Subscription.BILLING_FREQUENCY_CHOICES],
        write_only=True,
        default="monthly",
    )

    class Meta:
        model = Organization
        fields = [
            "type",
            "business_name",
            "trade_name",
            "rfc",
            "tax_address",
            "legal_representative",
            "primary_email",
            "primary_phone",
            "plan",
            "billing_frequency",
        ]

    def validate_rfc(self, value):
        """Validate Mexican RFC."""
        if not validate_rfc(value):
            raise serializers.ValidationError("RFC inválido")
        return value.upper()

    @transaction.atomic
    def create(self, validated_data):
        # Extract subscription data
        plan = validated_data.pop("plan")
        billing_frequency = validated_data.pop("billing_frequency")

        # Create organization
        organization = Organization.objects.create(**validated_data)

        # Set trial period for non-basic plans
        if plan != "basic":
            organization.trial_ends_at = timezone.now() + timezone.timedelta(days=14)
            organization.save()

        # Create subscription
        subscription = Subscription.objects.create(
            organization=organization,
            plan=plan,
            billing_frequency=billing_frequency,
            amount=self._get_plan_price(plan, billing_frequency),
            start_date=timezone.now().date(),
            current_period_start=timezone.now(),
            current_period_end=self._calculate_period_end(billing_frequency),
            next_billing_date=self._calculate_next_billing_date(billing_frequency),
            invoice_email=organization.primary_email,
        )

        # Create onboarding
        ClubOnboarding.objects.create(
            organization=organization,
            target_launch_date=timezone.now().date() + timezone.timedelta(days=7),
        )

        return organization

    def _get_plan_price(self, plan, frequency):
        """Get plan price based on plan and frequency."""
        # Base monthly prices
        prices = {
            "basic": 0,
            "competitions": 1500,
            "finance": 1000,
            "bi": 1500,
            "complete": 3500,
        }

        base_price = prices.get(plan, 0)

        # Apply frequency discounts
        if frequency == "quarterly":
            return base_price * 3 * Decimal("0.95")  # 5% discount
        elif frequency == "yearly":
            return base_price * 12 * Decimal("0.85")  # 15% discount

        return base_price

    def _calculate_period_end(self, frequency):
        """Calculate subscription period end date."""
        now = timezone.now()
        if frequency == "monthly":
            return now + timezone.timedelta(days=30)
        elif frequency == "quarterly":
            return now + timezone.timedelta(days=90)
        elif frequency == "yearly":
            return now + timezone.timedelta(days=365)

    def _calculate_next_billing_date(self, frequency):
        """Calculate next billing date."""
        # Same as period end for now
        return self._calculate_period_end(frequency)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model."""

    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "organization",
            "organization_name",
            "subscription",
            "invoice_number",
            "invoice_date",
            "due_date",
            "subtotal",
            "tax_amount",
            "total",
            "status",
            "paid_at",
            "payment_method",
            "payment_reference",
            "cfdi_uuid",
            "cfdi_pdf_url",
            "cfdi_stamped_at",
            "period_start",
            "period_end",
            "notes",
            "is_overdue",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "organization_name",
            "invoice_number",
            "cfdi_uuid",
            "cfdi_pdf_url",
            "cfdi_stamped_at",
            "is_overdue",
            "created_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""

    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "organization",
            "organization_name",
            "invoice",
            "amount",
            "currency",
            "status",
            "gateway",
            "gateway_payment_id",
            "gateway_payment_method",
            "processed_at",
            "failed_at",
            "failure_reason",
            "refunded_amount",
            "refunded_at",
            "refund_reason",
            "metadata",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "organization_name",
            "gateway_payment_id",
            "processed_at",
            "failed_at",
            "refunded_at",
            "created_at",
        ]


class OnboardingStepSerializer(serializers.Serializer):
    """Serializer for onboarding step updates."""

    step = serializers.ChoiceField(
        choices=[choice[0] for choice in ClubOnboarding.STEP_CHOICES]
    )
    data = serializers.JSONField(required=False)

    def validate(self, attrs):
        """Validate step progression."""
        instance = self.context.get("instance")
        if instance:
            steps = [choice[0] for choice in ClubOnboarding.STEP_CHOICES]
            current_index = steps.index(instance.current_step)
            new_index = steps.index(attrs["step"])

            # Can only update current or previous steps
            if new_index > current_index + 1:
                raise serializers.ValidationError(
                    "No se puede saltar pasos en el onboarding"
                )

        return attrs


class ClubOnboardingSerializer(serializers.ModelSerializer):
    """Serializer for ClubOnboarding model."""

    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    progress_percentage = serializers.SerializerMethodField()
    is_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = ClubOnboarding
        fields = [
            "id",
            "organization",
            "organization_name",
            "assigned_to",
            "assigned_to_name",
            "current_step",
            "steps_completed",
            "target_launch_date",
            "actual_launch_date",
            "notes",
            "checklist",
            "progress_percentage",
            "is_complete",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization_name",
            "assigned_to_name",
            "progress_percentage",
            "is_complete",
            "created_at",
            "updated_at",
        ]

    def get_progress_percentage(self, obj):
        """Calculate onboarding progress percentage."""
        total_steps = len(ClubOnboarding.STEP_CHOICES)
        completed_steps = len(
            [step for step in obj.steps_completed.values() if step.get("completed")]
        )
        return int((completed_steps / total_steps) * 100)


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""

    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "ip_address",
            "user_agent",
            "action",
            "model_name",
            "object_id",
            "object_repr",
            "changes",
            "organization",
            "organization_name",
            "created_at",
        ]
        read_only_fields = fields


class DashboardMetricsSerializer(serializers.Serializer):
    """Serializer for ROOT dashboard metrics."""

    mrr = serializers.DecimalField(max_digits=12, decimal_places=2)
    arr = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_organizations = serializers.IntegerField()
    active_organizations = serializers.IntegerField()
    total_clubs = serializers.IntegerField()
    active_users = serializers.IntegerField()

    growth = serializers.DictField(child=serializers.FloatField())
    revenue_by_plan = serializers.DictField(
        child=serializers.DecimalField(max_digits=12, decimal_places=2)
    )

    alerts = serializers.ListField(child=serializers.DictField())
    recent_signups = OrganizationListSerializer(many=True)
    high_churn_risk = OrganizationListSerializer(many=True)


class RootClubSerializer(ClubSerializer):
    """Serializer for clubs with ROOT admin details."""

    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )
    organization_state = serializers.CharField(
        source="organization.state", read_only=True
    )
    subscription_plan = serializers.CharField(
        source="organization.subscription.plan", read_only=True
    )
    monthly_revenue = serializers.SerializerMethodField()
    total_reservations = serializers.SerializerMethodField()
    health_metrics = serializers.SerializerMethodField()

    class Meta(ClubSerializer.Meta):
        fields = ClubSerializer.Meta.fields + [
            "organization_name",
            "organization_state",
            "subscription_plan",
            "monthly_revenue",
            "total_reservations",
            "health_metrics",
        ]

    def get_monthly_revenue(self, obj):
        """Calculate monthly revenue for the club."""
        from datetime import datetime, timedelta

        from django.db.models import Sum

        from apps.reservations.models import Reservation

        # Calculate revenue for the last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)

        revenue = (
            Reservation.objects.filter(
                club=obj,
                status="completed",
                payment_status="paid",
                created_at__gte=thirty_days_ago,
            ).aggregate(total=Sum("total_price"))["total"]
            or 0
        )

        return float(revenue)

    def get_total_reservations(self, obj):
        """Get total reservations for the club."""
        from apps.reservations.models import Reservation

        return Reservation.objects.filter(
            club=obj, status__in=["confirmed", "completed"]
        ).count()

    def get_health_metrics(self, obj):
        """Calculate health metrics for the club."""
        from datetime import datetime, timedelta

        from django.db.models import Count, Q

        from apps.reservations.models import Reservation

        # Calculate occupancy rate for the last 7 days
        seven_days_ago = datetime.now() - timedelta(days=7)
        total_courts = obj.courts.filter(is_active=True).count()

        if total_courts > 0:
            # Assume 14 hours of operation per day (7am to 9pm)
            total_slots = total_courts * 14 * 7  # courts * hours/day * days

            reservations_last_week = Reservation.objects.filter(
                club=obj,
                status__in=["confirmed", "completed"],
                date__gte=seven_days_ago.date(),
            ).count()

            occupancy_rate = min(int((reservations_last_week / total_slots) * 100), 100)
        else:
            occupancy_rate = 0

        # Get last activity
        last_reservation = (
            Reservation.objects.filter(club=obj).order_by("-created_at").first()
        )

        last_activity = (
            last_reservation.created_at.isoformat() if last_reservation else None
        )

        return {
            "occupancy_rate": occupancy_rate,
            "active_members": obj.total_members,
            "courts_operational": obj.courts.filter(
                is_active=True, is_maintenance=False
            ).count(),
            "last_activity": last_activity,
        }


class RootClubCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating clubs from ROOT admin."""

    organization_id = serializers.UUIDField(write_only=True)

    # Owner/Administrator fields
    owner = serializers.DictField(write_only=True, required=False)
    slug = serializers.CharField(write_only=True, required=False, max_length=50)
    courts_count = serializers.IntegerField(
        write_only=True, required=False, min_value=1, max_value=50
    )
    subscription = serializers.DictField(write_only=True, required=False)

    class Meta:
        model = Club
        fields = [
            "organization_id",
            "name",
            "description",
            "email",
            "phone",
            "website",
            "address",
            "latitude",
            "longitude",
            "opening_time",
            "closing_time",
            "days_open",
            "features",
            "logo_url",
            "cover_image_url",
            "primary_color",
            "owner",
            "slug",
            "courts_count",
            "subscription",
        ]

    def validate_organization_id(self, value):
        """Validate organization exists and can add clubs."""
        try:
            org = Organization.objects.get(id=value, is_active=True)

            # Check if organization has a subscription, create one if it doesn't
            try:
                subscription = org.subscription
            except Subscription.DoesNotExist:
                # Create a basic subscription for organizations without one
                from datetime import datetime, timedelta

                from django.utils import timezone

                subscription = Subscription.objects.create(
                    organization=org,
                    plan="basic",
                    billing_frequency="monthly",
                    amount=0,
                    start_date=timezone.now().date(),
                    current_period_start=timezone.now(),
                    current_period_end=timezone.now() + timedelta(days=30),
                    next_billing_date=timezone.now() + timedelta(days=30),
                    invoice_email=org.primary_email,
                    clubs_allowed=10,  # Basic plan allows 10 clubs
                    users_per_club=100,
                    courts_per_club=20,
                    monthly_reservations_limit=5000,
                )

            # Now check if organization can add clubs
            if not subscription.can_add_club():
                raise serializers.ValidationError(
                    "La organización ha alcanzado el límite de clubes permitidos"
                )
            return org
        except Organization.DoesNotExist:
            raise serializers.ValidationError("Organización no encontrada")

    def create(self, validated_data):
        import secrets
        import string

        from django.contrib.auth.hashers import make_password
        from django.utils.text import slugify

        from apps.authentication.models import User

        # Extract special fields
        org = validated_data.pop("organization_id")
        owner_data = validated_data.pop("owner", None)
        slug = validated_data.pop("slug", None)
        courts_count = validated_data.pop("courts_count", 1)
        subscription_data = validated_data.pop("subscription", None)

        # Generate slug if not provided
        if not slug:
            base_slug = slugify(validated_data["name"])
            slug = base_slug
            counter = 1
            while Club.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

        # Create the club
        validated_data["slug"] = slug
        club = Club.objects.create(organization=org, **validated_data)

        # Create owner/administrator user if provided
        if owner_data:
            # Generate password if not provided
            password = owner_data.get("password")
            if not password or owner_data.get("generate_password", False):
                # Generate secure password
                alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
                password = "".join(secrets.choice(alphabet) for _ in range(12))

            # Create user
            user_data = {
                "username": owner_data.get("email", "").split("@")[0],
                "email": owner_data.get("email"),
                "first_name": owner_data.get("first_name", ""),
                "last_name": owner_data.get("last_name", ""),
                "phone": owner_data.get("phone", ""),
                "password": make_password(password),
                "is_active": True,
                "email_verified": True,
            }

            # Ensure unique username
            base_username = user_data["username"]
            counter = 1
            while User.objects.filter(username=user_data["username"]).exists():
                user_data["username"] = f"{base_username}{counter}"
                counter += 1

            # Check if user with email already exists
            existing_user = User.objects.filter(email=user_data["email"]).first()
            if existing_user:
                admin_user = existing_user
                # Update password for existing user
                admin_user.password = make_password(password)
                admin_user.save()
            else:
                admin_user = User.objects.create(**user_data)

            # Store the generated password and user info for response
            club._created_admin_user = admin_user
            club._generated_password = password
            club._club_url = f"https://app.padelyzer.com/{slug}"

        # Create courts if specified
        if courts_count and courts_count > 0:
            from apps.clubs.models import Court

            for i in range(1, courts_count + 1):
                Court.objects.create(
                    club=club,
                    organization=club.organization,
                    name=f"Cancha {i}",
                    number=i,
                    surface_type="glass",
                    is_active=True,
                    price_per_hour=500.00,  # Default rate
                )

            # Update club's court count
            club.total_courts = courts_count
            club.save()

        return club
