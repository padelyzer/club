"""
Admin configuration for ROOT module.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    AuditLog,
    ClubOnboarding,
    Invoice,
    Organization,
    Payment,
    Subscription,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = [
        "trade_name",
        "rfc",
        "type",
        "state",
        "subscription_plan",
        "health_score_badge",
        "churn_risk_badge",
        "created_at",
    ]
    list_filter = ["type", "state", "churn_risk", "created_at"]
    search_fields = ["business_name", "trade_name", "rfc", "primary_email"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "total_revenue",
        "active_users",
        "monthly_reservations",
        "last_activity",
    ]

    fieldsets = [
        ("Información Básica", {"fields": ["type", "business_name", "trade_name"]}),
        (
            "Información Legal",
            {"fields": ["rfc", "tax_address", "legal_representative"]},
        ),
        ("Contacto", {"fields": ["primary_email", "primary_phone"]}),
        (
            "Estado",
            {
                "fields": [
                    "state",
                    "trial_ends_at",
                    "suspended_at",
                    "suspended_reason",
                    "cancelled_at",
                    "cancellation_reason",
                ]
            },
        ),
        (
            "Métricas",
            {
                "fields": [
                    "total_revenue",
                    "active_users",
                    "monthly_reservations",
                    "last_activity",
                    "health_score",
                    "churn_risk",
                ]
            },
        ),
        ("Metadatos", {"fields": ["id", "created_at", "updated_at", "is_active"]}),
    ]

    def subscription_plan(self, obj):
        if hasattr(obj, "subscription"):
            return obj.subscription.get_plan_display()
        return "-"

    subscription_plan.short_description = "Plan"

    def health_score_badge(self, obj):
        if obj.health_score >= 80:
            color = "green"
        elif obj.health_score >= 60:
            color = "orange"
        else:
            color = "red"
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.health_score,
        )

    health_score_badge.short_description = "Salud"

    def churn_risk_badge(self, obj):
        colors = {"low": "green", "medium": "orange", "high": "red"}
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.churn_risk, "gray"),
            obj.get_churn_risk_display(),
        )

    churn_risk_badge.short_description = "Riesgo Churn"


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "organization",
        "plan",
        "billing_frequency",
        "amount",
        "next_billing_date",
        "created_at",
    ]
    list_filter = ["plan", "billing_frequency", "auto_renew"]
    search_fields = ["organization__trade_name", "organization__rfc"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = [
        ("Organización", {"fields": ["organization"]}),
        ("Plan", {"fields": ["plan", "custom_modules"]}),
        (
            "Facturación",
            {
                "fields": [
                    "billing_frequency",
                    "amount",
                    "currency",
                    "tax_rate",
                    "payment_method_type",
                    "payment_method_details",
                ]
            },
        ),
        (
            "Integración Pagos",
            {
                "fields": [
                    "stripe_customer_id",
                    "stripe_subscription_id",
                    "mercadopago_customer_id",
                ]
            },
        ),
        ("CFDI", {"fields": ["cfdi_use", "invoice_email", "automatic_invoice"]}),
        (
            "Límites",
            {
                "fields": [
                    "clubs_allowed",
                    "users_per_club",
                    "courts_per_club",
                    "monthly_reservations_limit",
                    "data_retention_days",
                    "api_calls_per_hour",
                ]
            },
        ),
        (
            "Contrato",
            {
                "fields": [
                    "start_date",
                    "end_date",
                    "auto_renew",
                    "minimum_term_months",
                    "early_termination_fee",
                ]
            },
        ),
        (
            "Periodo Actual",
            {
                "fields": [
                    "current_period_start",
                    "current_period_end",
                    "next_billing_date",
                ]
            },
        ),
    ]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "invoice_number",
        "organization",
        "total",
        "status",
        "invoice_date",
        "due_date",
        "cfdi_status",
    ]
    list_filter = ["status", "invoice_date", "due_date"]
    search_fields = [
        "invoice_number",
        "organization__trade_name",
        "organization__rfc",
        "cfdi_uuid",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "subtotal",
        "tax_amount",
        "total",
    ]
    date_hierarchy = "invoice_date"

    actions = ["mark_as_paid", "generate_cfdi"]

    def cfdi_status(self, obj):
        if obj.cfdi_uuid:
            return format_html('<span style="color: green;">✓ Timbrado</span>')
        return format_html('<span style="color: orange;">Pendiente</span>')

    cfdi_status.short_description = "CFDI"

    def mark_as_paid(self, request, queryset):
        count = 0
        for invoice in queryset.filter(status="pending"):
            invoice.mark_as_paid("manual", f"Admin: {request.user}")
            count += 1
        self.message_user(request, f"{count} facturas marcadas como pagadas.")

    mark_as_paid.short_description = "Marcar como pagadas"

    def generate_cfdi(self, request, queryset):
        # TODO: Implement CFDI generation
        self.message_user(request, "Generación de CFDI pendiente de implementación.")

    generate_cfdi.short_description = "Generar CFDI"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "gateway_payment_id",
        "organization",
        "amount",
        "status",
        "gateway",
        "created_at",
    ]
    list_filter = ["status", "gateway", "created_at"]
    search_fields = [
        "gateway_payment_id",
        "organization__trade_name",
        "organization__rfc",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "processed_at",
        "failed_at",
        "refunded_at",
    ]
    date_hierarchy = "created_at"


@admin.register(ClubOnboarding)
class ClubOnboardingAdmin(admin.ModelAdmin):
    list_display = [
        "organization",
        "current_step",
        "assigned_to",
        "progress_bar",
        "target_launch_date",
        "created_at",
    ]
    list_filter = ["current_step", "created_at"]
    search_fields = ["organization__trade_name", "organization__rfc"]
    readonly_fields = ["id", "created_at", "updated_at", "steps_completed"]

    def progress_bar(self, obj):
        total_steps = 6  # Total number of onboarding steps
        completed = len([s for s in obj.steps_completed.values() if s.get("completed")])
        percentage = (completed / total_steps) * 100

        return format_html(
            '<div style="width: 100px; background-color: #f0f0f0;">'
            '<div style="width: {}%; background-color: #4CAF50; height: 20px;">'
            "</div></div> {}%",
            percentage,
            int(percentage),
        )

    progress_bar.short_description = "Progreso"


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "created_at",
        "user",
        "action",
        "model_name",
        "object_repr",
        "organization",
    ]
    list_filter = ["action", "model_name", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "object_repr",
        "organization__trade_name",
    ]
    readonly_fields = [
        "id",
        "user",
        "ip_address",
        "user_agent",
        "action",
        "model_name",
        "object_id",
        "object_repr",
        "changes",
        "organization",
        "created_at",
    ]
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
