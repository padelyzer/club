"""
Payment models with complete functionality.
"""

import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.models import BaseModel

User = get_user_model()


class Payment(BaseModel):
    """
    Complete payment model for all payment scenarios.
    """
    
    PAYMENT_TYPE_CHOICES = [
        ('reservation', 'Reserva de Cancha'),
        ('membership', 'Membresía'),
        ('class', 'Clase'),
        ('tournament', 'Torneo'),
        ('product', 'Producto'),
        ('service', 'Servicio'),
        ('penalty', 'Penalización'),
        ('other', 'Otro')
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Efectivo'),
        ('card', 'Tarjeta'),
        ('transfer', 'Transferencia'),
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('oxxo', 'OXXO'),
        ('spei', 'SPEI'),
        ('credit', 'Crédito'),
        ('courtesy', 'Cortesía')
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('completed', 'Completado'),
        ('failed', 'Fallido'),
        ('cancelled', 'Cancelado'),
        ('refunded', 'Reembolsado'),
        ('partial_refund', 'Reembolso Parcial'),
        ('disputed', 'Disputado')
    ]
    
    # IDs
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    organization = models.ForeignKey(
        'root.Organization',
        on_delete=models.CASCADE,
        related_name='finance_payments'
    )
    club = models.ForeignKey(
        'clubs.Club',
        on_delete=models.CASCADE,
        related_name='payments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )
    client = models.ForeignKey(
        'clients.ClientProfile',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )
    
    # Payment details
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='MXN')
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Reference to source
    reservation = models.ForeignKey(
        'reservations.Reservation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )
    membership = models.ForeignKey(
        'finance.Membership',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )
    # TODO: Uncomment when models are created
    # class_enrollment = models.ForeignKey(
    #     'classes.Enrollment',
    #     on_delete=models.SET_NULL,
    #     null=True, blank=True,
    #     related_name='payments'
    # )
    # tournament_registration = models.ForeignKey(
    #     'tournaments.Registration',
    #     on_delete=models.SET_NULL,
    #     null=True, blank=True,
    #     related_name='payments'
    # )
    
    # Transaction details
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Internal reference number"
    )
    external_transaction_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="Payment gateway transaction ID"
    )
    
    # Payment gateway data
    gateway = models.CharField(
        max_length=50,
        blank=True,
        help_text="Payment gateway used (stripe, paypal, etc)"
    )
    gateway_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full gateway response data"
    )
    
    # Card details (PCI compliant - only last 4 digits)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_country = models.CharField(max_length=2, blank=True)
    
    # Billing information
    billing_name = models.CharField(max_length=200, blank=True)
    billing_email = models.EmailField(blank=True)
    billing_phone = models.CharField(max_length=20, blank=True)
    billing_address = models.TextField(blank=True)
    billing_rfc = models.CharField(
        max_length=13,
        blank=True,
        help_text="RFC for invoice"
    )
    
    # Invoice
    requires_invoice = models.BooleanField(default=False)
    invoice_id = models.CharField(max_length=100, blank=True)
    invoice_url = models.URLField(blank=True)
    invoice_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Refund information
    is_refundable = models.BooleanField(default=True)
    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    refund_reason = models.TextField(blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='refunds_processed'
    )
    
    # Processing dates
    processed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    
    # Metadata
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional payment metadata"
    )
    
    # Fees
    processing_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Gateway processing fee"
    )
    net_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Amount after fees"
    )
    
    # Reconciliation
    reconciled = models.BooleanField(default=False)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciliation_notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', 'created_at']),
            models.Index(fields=['club', 'payment_type', 'created_at']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['external_transaction_id']),
            models.Index(fields=['status', 'processed_at']),
        ]
    
    def __str__(self):
        return f"{self.reference_number} - ${self.amount} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        """Save with calculated fields."""
        # Generate reference number if not set
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        
        # Calculate net amount
        self.net_amount = self.amount - self.processing_fee
        
        # Set user from client if not set
        if self.client and not self.user:
            self.user = self.client.user
        
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Generate unique reference number."""
        prefix = {
            'reservation': 'RES',
            'membership': 'MEM',
            'class': 'CLS',
            'tournament': 'TRN',
            'product': 'PRD',
            'service': 'SRV',
            'penalty': 'PEN',
            'other': 'OTH'
        }.get(self.payment_type, 'PAY')
        
        date_str = timezone.now().strftime('%Y%m%d')
        count = Payment.objects.filter(
            reference_number__startswith=f"{prefix}-{date_str}"
        ).count() + 1
        
        return f"{prefix}-{date_str}-{count:04d}"
    
    @transaction.atomic
    def process_payment(self, gateway_response=None):
        """Process the payment."""
        if self.status != 'pending':
            raise ValidationError("Solo los pagos pendientes pueden ser procesados")
        
        self.status = 'processing'
        self.save()
        
        try:
            # Here would go actual gateway processing
            # For now, simulate success
            self.status = 'completed'
            self.processed_at = timezone.now()
            
            if gateway_response:
                self.gateway_response = gateway_response
                self.external_transaction_id = gateway_response.get('id', '')
            
            self.save()
            
            # Update related object
            self._update_related_object()
            
            # Create revenue record
            self._create_revenue_record()
            
            return True
            
        except Exception as e:
            self.status = 'failed'
            self.failed_at = timezone.now()
            self.failure_reason = str(e)
            self.save()
            raise
    
    def _update_related_object(self):
        """Update the related object after successful payment."""
        if self.reservation:
            self.reservation.payment_status = 'paid'
            self.reservation.payment_amount = self.amount
            self.reservation.payment_method = self.payment_method
            self.reservation.paid_at = self.processed_at
            self.reservation.save()
        
        # Add similar updates for membership, class, tournament
    
    def _create_revenue_record(self):
        """Create revenue record for accounting."""
        from apps.finance.models import Revenue
        
        Revenue.objects.create(
            organization=self.organization,
            club=self.club,
            date=self.processed_at.date(),
            concept=self.payment_type,
            description=self.description or f"Payment {self.reference_number}",
            amount=self.net_amount,  # Use net amount for revenue
            payment_method=self.payment_method,
            payment=self,
            reference=self.reference_number
        )
    
    @transaction.atomic
    def refund(self, amount=None, reason='', user=None):
        """Process refund for this payment."""
        if self.status != 'completed':
            raise ValidationError("Solo los pagos completados pueden ser reembolsados")
        
        if not self.is_refundable:
            raise ValidationError("Este pago no es reembolsable")
        
        # Default to full refund
        if amount is None:
            amount = self.amount - self.refund_amount
        
        # Validate amount
        if amount <= 0:
            raise ValidationError("El monto del reembolso debe ser mayor a 0")
        
        if amount > (self.amount - self.refund_amount):
            raise ValidationError("El monto del reembolso excede el monto disponible")
        
        # Process refund
        # Here would go actual gateway refund processing
        
        self.refund_amount += amount
        self.refund_reason = reason
        self.refunded_at = timezone.now()
        self.refunded_by = user
        
        if self.refund_amount >= self.amount:
            self.status = 'refunded'
        else:
            self.status = 'partial_refund'
        
        self.save()
        
        # Update related object
        if self.reservation and self.status == 'refunded':
            self.reservation.payment_status = 'refunded'
            self.reservation.save()
        
        # Create refund record
        refund = PaymentRefund.objects.create(
            payment=self,
            amount=amount,
            reason=reason,
            processed_by=user,
            status='completed'
        )
        
        return refund
    
    def can_refund(self):
        """Check if payment can be refunded."""
        if not self.is_refundable:
            return False
        
        if self.status not in ['completed', 'partial_refund']:
            return False
        
        if self.refund_amount >= self.amount:
            return False
        
        # Check time limit (e.g., 90 days)
        if self.processed_at:
            days_passed = (timezone.now() - self.processed_at).days
            if days_passed > 90:
                return False
        
        return True
    
    def send_receipt(self):
        """Send payment receipt to customer."""
        # TODO: Implement email sending
        pass
    
    def reconcile(self, notes=''):
        """Mark payment as reconciled."""
        self.reconciled = True
        self.reconciled_at = timezone.now()
        self.reconciliation_notes = notes
        self.save()


class PaymentRefund(BaseModel):
    """
    Payment refund tracking.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('completed', 'Completado'),
        ('failed', 'Fallido')
    ]
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Gateway information
    gateway_refund_id = models.CharField(max_length=200, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    
    # Processing info
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='refunds_created'
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Refund ${self.amount} for {self.payment.reference_number}"


class PaymentMethod(BaseModel):
    """
    Saved payment methods for customers.
    """
    
    TYPE_CHOICES = [
        ('card', 'Tarjeta'),
        ('bank_account', 'Cuenta Bancaria'),
        ('paypal', 'PayPal')
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    is_default = models.BooleanField(default=False)
    
    # Card details (PCI compliant)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_exp_month = models.IntegerField(null=True, blank=True)
    card_exp_year = models.IntegerField(null=True, blank=True)
    card_country = models.CharField(max_length=2, blank=True)
    
    # Bank account
    bank_name = models.CharField(max_length=100, blank=True)
    account_last4 = models.CharField(max_length=4, blank=True)
    account_holder_name = models.CharField(max_length=200, blank=True)
    
    # Gateway tokens
    gateway = models.CharField(max_length=50)
    gateway_customer_id = models.CharField(max_length=200)
    gateway_payment_method_id = models.CharField(max_length=200)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        if self.type == 'card':
            return f"{self.card_brand} ****{self.card_last4}"
        elif self.type == 'bank_account':
            return f"{self.bank_name} ****{self.account_last4}"
        return f"{self.get_type_display()}"
    
    def save(self, *args, **kwargs):
        # Ensure only one default per user
        if self.is_default:
            PaymentMethod.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)


class PaymentIntent(BaseModel):
    """
    Payment intent for handling payment flow.
    Similar to Stripe's PaymentIntent concept.
    """
    
    STATUS_CHOICES = [
        ('requires_payment_method', 'Requiere Método de Pago'),
        ('requires_confirmation', 'Requiere Confirmación'),
        ('requires_action', 'Requiere Acción'),
        ('processing', 'Procesando'),
        ('requires_capture', 'Requiere Captura'),
        ('cancelled', 'Cancelado'),
        ('succeeded', 'Exitoso')
    ]
    
    # Unique intent ID
    intent_id = models.CharField(
        max_length=100,
        unique=True,
        editable=False
    )
    
    # Amount and currency
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='MXN')
    
    # Status
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='requires_payment_method'
    )
    
    # Customer info
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=20, blank=True)
    
    # Payment details
    payment_method_types = models.JSONField(
        default=list,
        help_text="Allowed payment method types"
    )
    
    # Related objects
    reservation_data = models.JSONField(
        null=True, blank=True,
        help_text="Reservation data if payment is for reservation"
    )
    
    # Gateway data
    gateway = models.CharField(max_length=50, default='stripe')
    gateway_intent_id = models.CharField(max_length=200, blank=True)
    client_secret = models.CharField(max_length=200, blank=True)
    
    # Expiration
    expires_at = models.DateTimeField()
    
    # Confirmation
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['intent_id']),
            models.Index(fields=['status', 'expires_at']),
        ]
    
    def __str__(self):
        return f"{self.intent_id} - ${self.amount} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        if not self.intent_id:
            self.intent_id = self.generate_intent_id()
        
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        
        if not self.payment_method_types:
            self.payment_method_types = ['card', 'oxxo', 'spei']
        
        super().save(*args, **kwargs)
    
    def generate_intent_id(self):
        """Generate unique intent ID."""
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_str = uuid.uuid4().hex[:8]
        return f"pi_{timestamp}_{random_str}"
    
    def confirm(self, payment_method_id=None):
        """Confirm the payment intent."""
        if self.status != 'requires_confirmation':
            raise ValidationError("Intent no requiere confirmación")
        
        self.status = 'processing'
        self.confirmed_at = timezone.now()
        self.save()
        
        # Process payment
        # This would integrate with the payment gateway
        
        return self
    
    def cancel(self):
        """Cancel the payment intent."""
        if self.status in ['succeeded', 'cancelled']:
            raise ValidationError("No se puede cancelar este intent")
        
        self.status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.save()
        
        return self


class Membership(BaseModel):
    """
    Club membership model (referenced in Payment).
    """
    name = models.CharField(max_length=100)
    club = models.ForeignKey('clubs.Club', on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'finance_membership'
    
    def __str__(self):
        return self.name


class Revenue(BaseModel):
    """
    Revenue tracking for accounting.
    """
    
    organization = models.ForeignKey(
        'root.Organization',
        on_delete=models.CASCADE,
        related_name='revenues'
    )
    club = models.ForeignKey(
        'clubs.Club',
        on_delete=models.CASCADE,
        related_name='revenues'
    )
    
    date = models.DateField()
    concept = models.CharField(max_length=50)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revenue_records'
    )
    reference = models.CharField(max_length=100)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.concept} - ${self.amount} ({self.date})"


class Subscription(BaseModel):
    """
    Subscription model for recurring payments.
    """
    
    SUBSCRIPTION_STATUS_CHOICES = [
        ('trialing', 'En período de prueba'),
        ('active', 'Activa'),
        ('past_due', 'Pago vencido'),
        ('paused', 'Pausada'),
        ('canceled', 'Cancelada'),
        ('incomplete', 'Incompleta'),
        ('incomplete_expired', 'Incompleta expirada'),
    ]
    
    # Stripe references
    stripe_subscription_id = models.CharField(
        max_length=200,
        unique=True,
        db_index=True
    )
    stripe_customer_id = models.CharField(max_length=200)
    
    # Relations
    organization = models.ForeignKey(
        'root.Organization',
        on_delete=models.CASCADE,
        related_name='subscriptions',
        null=True
    )
    club = models.ForeignKey(
        'clubs.Club',
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions'
    )
    
    # Subscription details
    status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='active'
    )
    
    # Plan information
    plan_id = models.CharField(max_length=200)
    plan_name = models.CharField(max_length=200, blank=True)
    plan_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    plan_interval = models.CharField(
        max_length=10,
        choices=[
            ('day', 'Diario'),
            ('week', 'Semanal'),
            ('month', 'Mensual'),
            ('year', 'Anual')
        ],
        default='month'
    )
    
    # Billing period
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    
    # Cancellation
    cancel_at_period_end = models.BooleanField(default=False)
    canceled_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Payment tracking
    last_payment_date = models.DateTimeField(null=True, blank=True)
    next_payment_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stripe_subscription_id']),
            models.Index(fields=['status', 'club']),
        ]
    
    def __str__(self):
        return f"{self.club.name} - {self.plan_name} ({self.get_status_display()})"
    
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in ['active', 'trialing']
    
    def cancel(self, at_period_end=True):
        """Cancel the subscription."""
        self.cancel_at_period_end = at_period_end
        self.canceled_at = timezone.now()
        if not at_period_end:
            self.status = 'canceled'
            self.ended_at = timezone.now()
        self.save()


class Invoice(BaseModel):
    """
    Invoice model for subscription billing.
    """
    
    INVOICE_STATUS_CHOICES = [
        ('draft', 'Borrador'),
        ('open', 'Abierta'),
        ('paid', 'Pagada'),
        ('void', 'Anulada'),
        ('uncollectible', 'Incobrable'),
        ('failed', 'Fallida'),
    ]
    
    # Stripe reference
    stripe_invoice_id = models.CharField(
        max_length=200,
        unique=True,
        db_index=True
    )
    
    # Relations
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    
    # Invoice details
    invoice_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=INVOICE_STATUS_CHOICES,
        default='draft'
    )
    
    # Amounts
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    amount_remaining = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Billing period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Dates
    due_date = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    
    # Payment details
    payment_intent_id = models.CharField(max_length=200, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)
    
    # PDF
    invoice_pdf_url = models.URLField(blank=True)
    hosted_invoice_url = models.URLField(blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stripe_invoice_id']),
            models.Index(fields=['status', 'subscription']),
            models.Index(fields=['period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number or self.stripe_invoice_id} - ${self.amount}"
    
    def is_paid(self):
        """Check if invoice is paid."""
        return self.status == 'paid'
    
    def mark_paid(self):
        """Mark invoice as paid."""
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.amount_paid = self.amount
        self.amount_remaining = Decimal('0.00')
        self.save()
