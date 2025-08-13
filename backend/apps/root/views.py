"""
Views for ROOT module.
"""

import logging
from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from apps.clubs.models import Club
from core.mixins import AuditLogMixin
from core.permissions import IsSuperAdmin

from .models import (
    AuditLog,
    ClubOnboarding,
    Invoice,
    Organization,
    Payment,
    Subscription,
)
from .serializers import (
    AuditLogSerializer,
    ClubOnboardingSerializer,
    DashboardMetricsSerializer,
    InvoiceSerializer,
    OnboardingStepSerializer,
    OrganizationCreateSerializer,
    OrganizationDetailSerializer,
    OrganizationListSerializer,
    PaymentSerializer,
    RootClubCreateSerializer,
    RootClubSerializer,
    SubscriptionSerializer,
)

logger = logging.getLogger(__name__)


# Health check endpoints
import os
import sys
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Basic health check endpoint."""
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'padelyzer-backend',
        'version': '1.0.0'
    })


@csrf_exempt
@require_http_methods(["GET"])
def health_ready(request):
    """Readiness probe for Kubernetes."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return JsonResponse({
            'status': 'ready',
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=503)


@csrf_exempt
@require_http_methods(["GET"])
def health_live(request):
    """Liveness probe for Kubernetes."""
    return JsonResponse({
        'status': 'alive',
        'timestamp': timezone.now().isoformat(),
        'uptime': timezone.now().timestamp()
    })


class OrganizationViewSet(viewsets.ModelViewSet, AuditLogMixin):
    """
    ViewSet for managing organizations.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["business_name", "trade_name", "rfc", "primary_email"]
    ordering_fields = ["created_at", "total_revenue", "health_score"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Organization.objects.filter(is_active=True)

        # Filter by state
        state = self.request.query_params.get("state")
        if state:
            queryset = queryset.filter(state=state)

        # Filter by churn risk
        churn_risk = self.request.query_params.get("churn_risk")
        if churn_risk:
            queryset = queryset.filter(churn_risk=churn_risk)

        # Filter by plan
        plan = self.request.query_params.get("plan")
        if plan:
            queryset = queryset.filter(subscription__plan=plan)

        return queryset.select_related("subscription")

    def get_serializer_class(self):
        if self.action == "list":
            return OrganizationListSerializer
        elif self.action == "create":
            return OrganizationCreateSerializer
        return OrganizationDetailSerializer

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        """Suspend an organization."""
        organization = self.get_object()
        reason = request.data.get("reason", "")

        if not reason:
            return Response(
                {"error": "Suspension reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if organization.state == "suspended":
            return Response(
                {"error": "Organization is already suspended"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization.suspend(reason)

        # Log the action
        self.log_action(
            action="suspend", organization=organization, changes={"reason": reason}
        )

        serializer = self.get_serializer(organization)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        """Reactivate a suspended organization."""
        organization = self.get_object()

        if organization.state != "suspended":
            return Response(
                {"error": "Organization is not suspended"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization.reactivate()

        # Log the action
        self.log_action(action="reactivate", organization=organization)

        serializer = self.get_serializer(organization)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """Get ROOT dashboard metrics."""
        # Calculate MRR (Monthly Recurring Revenue)
        active_subscriptions = Subscription.objects.filter(
            organization__state="active", organization__is_active=True
        )

        mrr = active_subscriptions.filter(billing_frequency="monthly").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        # Add quarterly and yearly normalized to monthly
        quarterly_mrr = active_subscriptions.filter(
            billing_frequency="quarterly"
        ).aggregate(total=Sum(F("amount") / 3))["total"] or Decimal("0")

        yearly_mrr = active_subscriptions.filter(billing_frequency="yearly").aggregate(
            total=Sum(F("amount") / 12)
        )["total"] or Decimal("0")

        total_mrr = mrr + quarterly_mrr + yearly_mrr
        arr = total_mrr * 12

        # Organization metrics
        org_metrics = Organization.objects.aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(state="active")),
            trial=Count("id", filter=Q(state="trial")),
            suspended=Count("id", filter=Q(state="suspended")),
        )

        # User and club metrics
        total_clubs = Club.objects.filter(is_active=True).count()
        active_clubs_by_org = Club.objects.filter(
            is_active=True, organization__state="active"
        ).count()

        active_users = (
            Organization.objects.filter(state="active").aggregate(
                total=Sum("active_users")
            )["total"]
            or 0
        )

        # Growth metrics (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        sixty_days_ago = timezone.now() - timezone.timedelta(days=60)
        new_orgs_count = Organization.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()

        # Calculate MRR growth (current month vs previous month)
        # Previous month MRR
        previous_month_subscriptions = Subscription.objects.filter(
            is_active=True,
            created_at__lt=thirty_days_ago,
            created_at__gte=sixty_days_ago,
        )

        prev_monthly_mrr = previous_month_subscriptions.filter(
            billing_frequency="monthly"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        prev_quarterly_mrr = previous_month_subscriptions.filter(
            billing_frequency="quarterly"
        ).aggregate(total=Sum(F("amount") / 3))["total"] or Decimal("0")

        prev_yearly_mrr = previous_month_subscriptions.filter(
            billing_frequency="yearly"
        ).aggregate(total=Sum(F("amount") / 12))["total"] or Decimal("0")

        previous_mrr = prev_monthly_mrr + prev_quarterly_mrr + prev_yearly_mrr

        # Calculate growth percentage
        mrr_growth = 0
        if previous_mrr > 0:
            mrr_growth = float(((total_mrr - previous_mrr) / previous_mrr) * 100)

        # Revenue by plan
        revenue_by_plan = {}
        for plan_choice in Subscription.PLAN_CHOICES:
            plan_code = plan_choice[0]
            plan_revenue = active_subscriptions.filter(plan=plan_code).aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0")
            revenue_by_plan[plan_code] = plan_revenue

        # Alerts
        alerts = []

        # Payment failures (last 7 days)
        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        failed_payments = Payment.objects.filter(
            status="failed", created_at__gte=seven_days_ago
        ).count()

        if failed_payments > 0:
            alerts.append(
                {
                    "type": "payment_failure",
                    "severity": "high",
                    "message": f"{failed_payments} failed payments in last 7 days",
                    "count": failed_payments,
                }
            )

        # High churn risk organizations
        high_churn_orgs = Organization.objects.filter(churn_risk="high", state="active")

        if high_churn_orgs.exists():
            alerts.append(
                {
                    "type": "churn_risk",
                    "severity": "medium",
                    "message": f"{high_churn_orgs.count()} organizations at high churn risk",
                    "count": high_churn_orgs.count(),
                }
            )

        # Recent signups (last 7 days)
        recent_signups = Organization.objects.filter(
            created_at__gte=seven_days_ago
        ).order_by("-created_at")[:5]

        # Recent clubs created
        recent_clubs = (
            Club.objects.filter(created_at__gte=seven_days_ago)
            .select_related("organization")
            .order_by("-created_at")[:5]
        )

        # Add alert for inactive clubs
        inactive_clubs = Club.objects.filter(is_active=True, total_members=0).count()

        if inactive_clubs > 0:
            alerts.append(
                {
                    "type": "inactive_clubs",
                    "severity": "low",
                    "message": f"{inactive_clubs} clubs without members",
                    "count": inactive_clubs,
                }
            )

        data = {
            "mrr": total_mrr,
            "arr": arr,
            "total_organizations": org_metrics["total"],
            "active_organizations": org_metrics["active"],
            "trial_organizations": org_metrics["trial"],
            "suspended_organizations": org_metrics["suspended"],
            "total_clubs": total_clubs,
            "active_clubs": active_clubs_by_org,
            "active_users": active_users,
            "growth": {
                "new_organizations": new_orgs_count,
                "new_clubs": Club.objects.filter(
                    created_at__gte=thirty_days_ago
                ).count(),
                "mrr_growth": round(mrr_growth, 2),
            },
            "revenue_by_plan": revenue_by_plan,
            "alerts": alerts,
            "recent_signups": recent_signups,
            "recent_clubs": recent_clubs,
            "high_churn_risk": high_churn_orgs[:5],
        }

        serializer = DashboardMetricsSerializer(data)
        return Response(serializer.data)


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing subscriptions.
    """

    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @action(detail=True, methods=["put"])
    def upgrade(self, request, pk=None):
        """Upgrade subscription plan."""
        subscription = self.get_object()
        new_plan = request.data.get("plan")

        if not new_plan:
            return Response(
                {"error": "New plan is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate plan upgrade path
        plan_hierarchy = ["basic", "competitions", "finance", "bi", "complete"]
        current_index = plan_hierarchy.index(subscription.plan)
        new_index = plan_hierarchy.index(new_plan) if new_plan in plan_hierarchy else -1

        if new_index <= current_index:
            return Response(
                {"error": "Can only upgrade to a higher plan"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update subscription
        subscription.plan = new_plan
        # TODO: Calculate new price and update billing
        subscription.save()

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["put"])
    def downgrade(self, request, pk=None):
        """Downgrade subscription plan."""
        subscription = self.get_object()
        new_plan = request.data.get("plan")

        if not new_plan:
            return Response(
                {"error": "New plan is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if downgrade is allowed
        if subscription.minimum_term_months > 0:
            months_active = (timezone.now().date() - subscription.start_date).days // 30
            if months_active < subscription.minimum_term_months:
                return Response(
                    {
                        "error": f"Minimum term of {subscription.minimum_term_months} months not met"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Update subscription
        subscription.plan = new_plan
        # TODO: Calculate new price and update billing
        subscription.save()

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices.
    """

    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["organization", "status"]
    ordering_fields = ["invoice_date", "due_date", "total"]
    ordering = ["-invoice_date"]

    @action(detail=False, methods=["post"])
    def generate_monthly(self, request):
        """Generate monthly invoices for all active subscriptions."""
        # Get all subscriptions due for billing
        today = timezone.now().date()
        due_subscriptions = Subscription.objects.filter(
            organization__state="active",
            next_billing_date__lte=today,
            plan__in=["competitions", "finance", "bi", "complete"],
        )

        invoices_created = []

        for subscription in due_subscriptions:
            # Create invoice
            invoice = Invoice.objects.create(
                organization=subscription.organization,
                subscription=subscription,
                invoice_number=f"INV-{subscription.organization.id[:8]}-{today.strftime('%Y%m')}",
                invoice_date=today,
                due_date=today + timezone.timedelta(days=10),
                subtotal=subscription.amount,
                tax_amount=subscription.amount * subscription.tax_rate,
                total=subscription.get_total_with_tax(),
                period_start=subscription.current_period_start.date(),
                period_end=subscription.current_period_end.date(),
            )
            invoices_created.append(invoice)

            # Update subscription billing dates
            if subscription.billing_frequency == "monthly":
                days_to_add = 30
            elif subscription.billing_frequency == "quarterly":
                days_to_add = 90
            else:  # yearly
                days_to_add = 365

            subscription.current_period_start = subscription.current_period_end
            subscription.current_period_end = (
                subscription.current_period_end + timezone.timedelta(days=days_to_add)
            )
            subscription.next_billing_date = subscription.current_period_end
            subscription.save()

        return Response(
            {
                "invoices_created": len(invoices_created),
                "total_amount": sum(inv.total for inv in invoices_created),
            }
        )

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        """Mark an invoice as paid."""
        invoice = self.get_object()

        if invoice.status == "paid":
            return Response(
                {"error": "Invoice is already paid"}, status=status.HTTP_400_BAD_REQUEST
            )

        payment_method = request.data.get("payment_method", "manual")
        reference = request.data.get("reference", "")

        invoice.mark_as_paid(payment_method, reference)

        serializer = self.get_serializer(invoice)
        return Response(serializer.data)


class ClubOnboardingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing club onboarding.
    """

    queryset = ClubOnboarding.objects.all()
    serializer_class = ClubOnboardingSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["assigned_to", "current_step"]
    ordering = ["-created_at"]

    @action(detail=True, methods=["put"])
    def update_step(self, request, pk=None):
        """Update onboarding step."""
        onboarding = self.get_object()
        serializer = OnboardingStepSerializer(
            data=request.data, context={"instance": onboarding}
        )
        serializer.is_valid(raise_exception=True)

        step = serializer.validated_data["step"]
        data = serializer.validated_data.get("data", {})

        onboarding.complete_step(step, data)

        return Response(ClubOnboardingSerializer(onboarding).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete the onboarding process."""
        onboarding = self.get_object()

        if not onboarding.is_complete():
            return Response(
                {"error": "All steps must be completed before finishing onboarding"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        onboarding.actual_launch_date = timezone.now().date()
        onboarding.save()

        # Activate organization if in trial
        org = onboarding.organization
        if org.state == "trial":
            org.state = "active"
            org.save()

        return Response({"status": "Onboarding completed successfully"})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs.
    """

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["user", "action", "organization"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset


class RootClubViewSet(viewsets.ModelViewSet, AuditLogMixin):
    """
    ViewSet for managing all clubs from ROOT admin.
    """

    queryset = Club.objects.all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "email", "organization__trade_name"]
    ordering_fields = ["created_at", "name", "total_members"]
    ordering = ["-created_at"]
    filterset_fields = ["organization", "is_active"]

    def get_queryset(self):
        queryset = Club.objects.select_related(
            "organization", "organization__subscription"
        ).prefetch_related("courts")

        # Filter by organization state
        org_state = self.request.query_params.get("organization_state")
        if org_state:
            queryset = queryset.filter(organization__state=org_state)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return RootClubCreateSerializer
        return RootClubSerializer

    def create(self, request, *args, **kwargs):
        """Create club with owner and return comprehensive response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        club = serializer.save()

        # Prepare response data
        response_data = {
            "id": str(club.id),
            "name": club.name,
            "slug": getattr(club, "slug", None),
            "email": club.email,
            "organization": {
                "id": str(club.organization.id),
                "name": club.organization.trade_name,
            },
            "created_at": club.created_at.isoformat() if club.created_at else None,
            "is_active": club.is_active,
            "total_courts": getattr(club, "total_courts", 0),
        }

        # Include admin user information if created
        if hasattr(club, "_created_admin_user"):
            response_data["admin_user"] = {
                "id": str(club._created_admin_user.id),
                "username": club._created_admin_user.username,
                "email": club._created_admin_user.email,
                "first_name": club._created_admin_user.first_name,
                "last_name": club._created_admin_user.last_name,
                "phone": club._created_admin_user.phone,
                "password": club._generated_password,  # Include generated password
                "club_url": club._club_url,
            }

        # Log the creation
        self.log_action(
            action="create",
            organization=club.organization,
            changes={"club_created": club.name},
        )

        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        """Transfer club to another organization."""
        club = self.get_object()
        new_org_id = request.data.get("organization_id")

        if not new_org_id:
            return Response(
                {"error": "organization_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            new_org = Organization.objects.get(id=new_org_id, is_active=True)

            # Check if new organization can add clubs
            if not new_org.subscription.can_add_club():
                return Response(
                    {"error": "Target organization has reached club limit"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Log the transfer
            old_org = club.organization
            self.log_action(
                action="transfer",
                organization=old_org,
                changes={
                    "club": str(club),
                    "from_organization": str(old_org),
                    "to_organization": str(new_org),
                },
            )

            # Transfer the club
            club.organization = new_org
            club.save()

            serializer = self.get_serializer(club)
            return Response(serializer.data)

        except Organization.DoesNotExist:
            return Response(
                {"error": "Target organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get global club statistics."""
        total_clubs = Club.objects.count()
        active_clubs = Club.objects.filter(is_active=True).count()

        # Clubs by organization state
        clubs_by_state = {}
        for state, label in Organization.STATE_CHOICES:
            clubs_by_state[state] = Club.objects.filter(
                organization__state=state
            ).count()

        # Top clubs by members
        top_clubs = (
            Club.objects.filter(is_active=True)
            .order_by("-total_members")[:10]
            .values("id", "name", "total_members", "organization__trade_name")
        )

        return Response(
            {
                "total_clubs": total_clubs,
                "active_clubs": active_clubs,
                "clubs_by_organization_state": clubs_by_state,
                "top_clubs_by_members": list(top_clubs),
                "average_courts_per_club": Club.objects.aggregate(
                    avg=Avg("total_courts")
                )["avg"]
                or 0,
            }
        )

    def perform_create(self, serializer):
        """Create club and log the action."""
        club = serializer.save()
        self.log_action(
            action="create", organization=club.organization, changes={"club": str(club)}
        )

    def perform_destroy(self, instance):
        """Soft delete club and log the action."""
        self.log_action(
            action="delete",
            organization=instance.organization,
            changes={"club": str(instance)},
        )
        instance.is_active = False
        instance.save()


class CurrentOrganizationView(viewsets.ViewSet):
    """
    ViewSet to handle singular organization endpoint for current user's organization.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Get current user's organization information.
        Handles both GET /root/organization/ and /root/organizations/ (for compatibility).
        """
        user = request.user
        
        # Check if user has an organization
        if not hasattr(user, "organization") or not user.organization:
            return Response(
                {"error": "User is not associated with any organization"},
                status=status.HTTP_404_NOT_FOUND
            )

        organization = user.organization
        
        # Get organization membership details
        org_membership = user.organization_memberships.filter(
            organization=organization, is_active=True
        ).first()

        # Get organization subscription details
        subscription = getattr(organization, "subscription", None)

        # Prepare response data
        org_data = {
            "id": organization.id,
            "business_name": organization.business_name,
            "trade_name": organization.trade_name,
            "rfc": organization.rfc,
            "type": organization.type,
            "state": organization.state,
            "primary_email": organization.primary_email,
            "primary_phone": organization.primary_phone,
            "tax_address": organization.tax_address,
            "legal_representative": organization.legal_representative,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            # User's role in the organization
            "user_role": org_membership.role if org_membership else None,
            "user_permissions": org_membership.permissions if org_membership else {},
        }

        # Add subscription details if available
        if subscription:
            org_data["subscription"] = {
                "plan": subscription.plan,
                "state": organization.state,
                "billing_frequency": subscription.billing_frequency,
                "clubs_allowed": subscription.clubs_allowed,
                "users_per_club": subscription.users_per_club,
                "courts_per_club": subscription.courts_per_club,
                "monthly_reservations_limit": subscription.monthly_reservations_limit,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "next_billing_date": subscription.next_billing_date,
            }

        # Add usage statistics
        from apps.clubs.models import Club
        clubs_count = Club.objects.filter(
            organization=organization, is_active=True
        ).count()
        
        org_data["usage"] = {
            "clubs_count": clubs_count,
            "clubs_limit": subscription.clubs_allowed if subscription else 1,
        }

        return Response(org_data)

    def retrieve(self, request, pk=None):
        """
        Get organization by ID (only if it matches current user's organization).
        """
        user = request.user
        
        if not hasattr(user, "organization") or not user.organization:
            return Response(
                {"error": "User is not associated with any organization"},
                status=status.HTTP_404_NOT_FOUND
            )

        if str(user.organization.id) != pk:
            return Response(
                {"error": "Access denied to this organization"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Use the same logic as list() for consistency
        return self.list(request)
