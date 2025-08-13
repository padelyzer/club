"""
Models for ROOT module - SaaS management.
"""

import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel
from core.utils import validate_rfc

User = get_user_model()


class Organization(BaseModel):
    """
    Main entity representing a client organization (club, chain, or franchise).
    """

    TYPE_CHOICES = [
        ("club", "Club Individual"),
        ("chain", "Cadena de Clubes"),
        ("franchise", "Franquicia"),
    ]

    STATE_CHOICES = [
        ("trial", "Periodo de Prueba"),
        ("active", "Activo"),
        ("suspended", "Suspendido"),
        ("cancelled", "Cancelado"),
    ]

    # Basic Information
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="club")

    # Legal Information
    business_name = models.CharField(max_length=200, help_text="Razón Social")
    trade_name = models.CharField(max_length=200, help_text="Nombre Comercial")
    rfc = models.CharField(
        max_length=13,
        unique=True,
        validators=[RegexValidator(r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$", "RFC inválido")],
        help_text="RFC con homoclave",
    )
    tax_address = models.JSONField(default=dict)
    legal_representative = models.CharField(max_length=200)

    # Contact Information
    primary_email = models.EmailField()
    primary_phone = models.CharField(max_length=20)

    # Status
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default="trial")
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    # Metrics (calculated fields, updated via signals/tasks)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active_users = models.IntegerField(default=0)
    monthly_reservations = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True, blank=True)
    health_score = models.IntegerField(
        default=100, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    churn_risk = models.CharField(
        max_length=10,
        choices=[("low", "Bajo"), ("medium", "Medio"), ("high", "Alto")],
        default="low",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["state", "is_active"]),
            models.Index(fields=["rfc"]),
            models.Index(fields=["health_score"]),
        ]

    def __str__(self):
        return f"{self.trade_name} ({self.rfc})"

    def suspend(self, reason):
        """Suspend the organization."""
        self.state = "suspended"
        self.suspended_at = timezone.now()
        self.suspended_reason = reason
        self.save()

    def reactivate(self):
        """Reactivate a suspended organization."""
        if self.state == "suspended":
            self.state = "active"
            self.suspended_at = None
            self.suspended_reason = ""
            self.save()

    def cancel(self, reason):
        """Cancel the organization."""
        self.state = "cancelled"
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save()


class Subscription(BaseModel):
    """
    Subscription details for an organization.
    """

    PLAN_CHOICES = [
        ("basic", "Básico (Gratis)"),
        ("competitions", "Competencias"),
        ("finance", "Finanzas"),
        ("bi", "Business Intelligence"),
        ("complete", "Completo"),
        ("custom", "Personalizado"),
    ]

    BILLING_FREQUENCY_CHOICES = [
        ("monthly", "Mensual"),
        ("quarterly", "Trimestral"),
        ("yearly", "Anual"),
    ]

    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="subscription"
    )

    # Plan Details
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="basic")
    custom_modules = models.JSONField(default=list, blank=True)

    # Billing Information
    billing_frequency = models.CharField(
        max_length=20, choices=BILLING_FREQUENCY_CHOICES, default="monthly"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="MXN")
    tax_rate = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal("0.16")
    )

    # Payment Method
    payment_method_type = models.CharField(
        max_length=20,
        choices=[("card", "Tarjeta"), ("transfer", "Transferencia"), ("oxxo", "OXXO")],
        default="card",
    )
    payment_method_details = models.JSONField(default=dict, blank=True)

    # Stripe/MercadoPago IDs
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    mercadopago_customer_id = models.CharField(max_length=100, blank=True)

    # Invoicing
    cfdi_use = models.CharField(max_length=10, default="G03")
    invoice_email = models.EmailField()
    automatic_invoice = models.BooleanField(default=True)

    # Limits
    clubs_allowed = models.IntegerField(default=1)
    users_per_club = models.IntegerField(default=10)
    courts_per_club = models.IntegerField(default=5)
    monthly_reservations_limit = models.IntegerField(default=1000)
    data_retention_days = models.IntegerField(default=365)
    api_calls_per_hour = models.IntegerField(default=1000)

    # Contract
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    minimum_term_months = models.IntegerField(default=1)
    early_termination_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    # Current Period
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    next_billing_date = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["plan", "billing_frequency"]),
            models.Index(fields=["next_billing_date"]),
        ]

    def __str__(self):
        return f"{self.organization.trade_name} - Plan {self.get_plan_display()}"

    def get_total_with_tax(self):
        """Calculate total amount including tax."""
        return self.amount * (1 + self.tax_rate)

    def can_add_club(self):
        """Check if organization can add more clubs."""
        current_clubs = self.organization.clubs.filter(is_active=True).count()
        return current_clubs < self.clubs_allowed

    def can_add_user(self, club):
        """Check if club can add more users."""
        current_users = club.memberships.filter(is_active=True).count()
        return current_users < self.users_per_club


class Invoice(BaseModel):
    """
    Invoice (Factura) for subscription payments.
    """

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("pending", "Pendiente"),
        ("paid", "Pagado"),
        ("overdue", "Vencido"),
        ("cancelled", "Cancelado"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="invoices"
    )
    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="invoices"
    )

    # Invoice Details
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField()
    due_date = models.DateField()

    # Amounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    # Payment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)

    # CFDI
    cfdi_uuid = models.CharField(max_length=100, blank=True)
    cfdi_xml = models.TextField(blank=True)
    cfdi_pdf_url = models.URLField(blank=True)
    cfdi_stamped_at = models.DateTimeField(null=True, blank=True)

    # Billing Period
    period_start = models.DateField()
    period_end = models.DateField()

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-invoice_date", "-created_at"]
        indexes = [
            models.Index(fields=["status", "due_date"]),
            models.Index(fields=["organization", "invoice_date"]),
        ]

    def __str__(self):
        return f"Factura {self.invoice_number} - {self.organization.trade_name}"

    def is_overdue(self):
        """Check if invoice is overdue."""
        return self.status == "pending" and self.due_date < timezone.now().date()

    def mark_as_paid(self, payment_method, reference):
        """Mark invoice as paid."""
        self.status = "paid"
        self.paid_at = timezone.now()
        self.payment_method = payment_method
        self.payment_reference = reference
        self.save()


class Payment(BaseModel):
    """
    Payment transaction record.
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("processing", "Procesando"),
        ("succeeded", "Exitoso"),
        ("failed", "Fallido"),
        ("refunded", "Reembolsado"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="payments"
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )

    # Payment Details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="MXN")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Gateway Information
    gateway = models.CharField(
        max_length=20, choices=[("stripe", "Stripe"), ("mercadopago", "MercadoPago")]
    )
    gateway_payment_id = models.CharField(max_length=100, unique=True)
    gateway_payment_method = models.CharField(max_length=50)

    # Processing
    processed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)

    # Refund
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refund_reason = models.TextField(blank=True)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["gateway", "gateway_payment_id"]),
        ]

    def __str__(self):
        return f"Payment {self.gateway_payment_id} - {self.amount} {self.currency}"


class ClubOnboarding(BaseModel):
    """
    Onboarding process tracking for new organizations.
    """

    STEP_CHOICES = [
        ("legal_info", "Información Legal"),
        ("club_setup", "Configuración de Clubes"),
        ("technical_setup", "Configuración Técnica"),
        ("training", "Capacitación"),
        ("payment", "Método de Pago"),
        ("golive", "Puesta en Marcha"),
    ]

    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="onboarding"
    )

    # Assignment
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="assigned_onboardings"
    )

    # Progress
    current_step = models.CharField(
        max_length=20, choices=STEP_CHOICES, default="legal_info"
    )
    steps_completed = models.JSONField(default=dict)

    # Dates
    target_launch_date = models.DateField()
    actual_launch_date = models.DateField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)

    # Checklist
    checklist = models.JSONField(default=dict)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Onboarding - {self.organization.trade_name}"

    def complete_step(self, step, data=None):
        """Mark a step as completed."""
        self.steps_completed[step] = {
            "completed": True,
            "completed_at": timezone.now().isoformat(),
            "data": data or {},
        }

        # Move to next step
        steps = [choice[0] for choice in self.STEP_CHOICES]
        current_index = steps.index(self.current_step)
        if current_index < len(steps) - 1:
            self.current_step = steps[current_index + 1]

        self.save()

    def is_complete(self):
        """Check if onboarding is complete."""
        required_steps = [choice[0] for choice in self.STEP_CHOICES]
        for step in required_steps:
            if not self.steps_completed.get(step, {}).get("completed"):
                return False
        return True


class AuditLog(BaseModel):
    """
    Audit log for ROOT module actions.
    """

    ACTION_CHOICES = [
        ("create", "Crear"),
        ("update", "Actualizar"),
        ("delete", "Eliminar"),
        ("suspend", "Suspender"),
        ("reactivate", "Reactivar"),
        ("cancel", "Cancelar"),
        ("payment", "Pago"),
        ("invoice", "Facturar"),
        ("impersonate", "Impersonar"),
    ]

    # Actor
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="root_audit_logs"
    )
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()

    # Action
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=50)
    object_repr = models.CharField(max_length=200)

    # Changes
    changes = models.JSONField(default=dict)

    # Organization context
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["organization", "created_at"]),
        ]

    def __str__(self):
        return f"{self.action} - {self.object_repr} by {self.user}"
