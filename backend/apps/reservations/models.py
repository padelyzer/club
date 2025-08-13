"""
Reservation models with complete functionality.
"""

import uuid
from datetime import datetime, timedelta, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.models import BaseModel

User = get_user_model()


class Reservation(BaseModel):
    """
    Complete reservation model with all business scenarios.
    """
    
    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("confirmed", "Confirmada"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
        ("no_show", "No se presentó"),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("partial", "Parcial"),
        ("paid", "Pagado"),
        ("refunded", "Reembolsado"),
        ("failed", "Fallido"),
    ]
    
    RESERVATION_TYPE_CHOICES = [
        ('single', 'Individual'),
        ('recurring', 'Recurrente'),
        ('tournament', 'Torneo'),
        ('class', 'Clase'),
        ('maintenance', 'Mantenimiento'),
        ('blocked', 'Bloqueado')
    ]
    
    CANCELLATION_POLICY_CHOICES = [
        ('flexible', 'Flexible - Sin costo hasta 2 horas antes'),
        ('moderate', 'Moderada - 50% hasta 6 horas antes'),
        ('strict', 'Estricta - 100% sin reembolso'),
        ('custom', 'Personalizada')
    ]
    
    BOOKING_SOURCE_CHOICES = [
        ('web', 'Sitio Web'),
        ('mobile', 'App Móvil'),
        ('phone', 'Teléfono'),
        ('walkin', 'En Persona'),
        ('admin', 'Administrador'),
        ('api', 'API Externa')
    ]

    # IDs
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="reservations"
    )
    club = models.ForeignKey(
        "clubs.Club", on_delete=models.CASCADE, related_name="reservations"
    )
    court = models.ForeignKey(
        "clubs.Court", on_delete=models.CASCADE, related_name="reservations"
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_reservations"
    )
    
    # Linked to registered client (optional)
    client_profile = models.ForeignKey(
        'clients.ClientProfile',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reservations',
        help_text="Cliente registrado (si aplica)"
    )
    
    # Date and time
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField(editable=False)
    
    # Type
    reservation_type = models.CharField(
        max_length=20,
        choices=RESERVATION_TYPE_CHOICES,
        default='single'
    )
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    
    # Player information (for guests or quick bookings)
    player_name = models.CharField(max_length=200)
    player_email = models.EmailField()
    player_phone = models.CharField(max_length=20, blank=True)
    player_count = models.IntegerField(
        default=4,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    guest_count = models.IntegerField(
        default=0,
        help_text="Número de invitados no registrados"
    )
    
    # Pricing - Fixed field issue here
    price_per_hour = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Precio por hora al momento de la reserva"
    )
    total_price = models.DecimalField(
        max_digits=8, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    special_price = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Precio especial si difiere del estándar"
    )
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    discount_reason = models.CharField(max_length=100, blank=True)
    
    # Payment
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending"
    )
    payment_method = models.CharField(max_length=50, blank=True)
    payment_amount = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Split payment
    is_split_payment = models.BooleanField(default=False)
    split_count = models.IntegerField(default=1)
    
    # Cancellation
    cancellation_policy = models.CharField(
        max_length=20,
        choices=CANCELLATION_POLICY_CHOICES,
        default='flexible'
    )
    cancellation_deadline = models.DateTimeField(null=True, blank=True)
    cancellation_fee = models.DecimalField(
        max_digits=8, decimal_places=2,
        default=0
    )
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name="cancelled_reservations", blank=True
    )
    
    # Invoice
    requires_invoice = models.BooleanField(default=False)
    invoice_data = models.JSONField(null=True, blank=True)
    invoice_status = models.CharField(
        max_length=20,
        choices=[
            ('not_required', 'No requerida'),
            ('pending', 'Pendiente'),
            ('generated', 'Generada'),
            ('sent', 'Enviada'),
            ('cancelled', 'Cancelada')
        ],
        default='not_required'
    )
    
    # Recurring
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(
        max_length=20,
        choices=[
            ('daily', 'Diario'),
            ('weekly', 'Semanal'),
            ('biweekly', 'Quincenal'),
            ('monthly', 'Mensual')
        ],
        null=True, blank=True
    )
    recurrence_end_date = models.DateField(null=True, blank=True)
    parent_reservation = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='recurring_instances'
    )
    
    # Wait list
    on_wait_list = models.BooleanField(default=False)
    wait_list_position = models.IntegerField(null=True, blank=True)
    
    # No-show
    no_show = models.BooleanField(default=False)
    no_show_fee = models.DecimalField(
        max_digits=8, decimal_places=2,
        default=0
    )
    
    # Tracking
    booking_source = models.CharField(
        max_length=20,
        choices=BOOKING_SOURCE_CHOICES,
        default='web'
    )
    confirmation_sent = models.BooleanField(default=False)
    reminder_sent = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    
    # Additional
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    additional_services = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ["-date", "-start_time"]
        indexes = [
            models.Index(fields=["club", "date", "status"]),
            models.Index(fields=["court", "date", "start_time"]),
            models.Index(fields=["status", "payment_status"]),
            models.Index(fields=["created_by", "date"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["court", "date", "start_time", "end_time"],
                condition=models.Q(status__in=["pending", "confirmed"]),
                name="unique_court_time_slot"
            )
        ]

    def __str__(self):
        return f"{self.court.name} - {self.date} {self.start_time}"

    def clean(self):
        """Validate reservation data."""
        super().clean()
        
        # Validate time
        if self.start_time >= self.end_time:
            raise ValidationError("La hora de fin debe ser posterior a la hora de inicio")
        
        # Validate date not in past
        if self.date < timezone.now().date():
            raise ValidationError("No se pueden crear reservas en fechas pasadas")
        
        # Check court availability
        if not self.check_court_availability():
            raise ValidationError("La cancha no está disponible en este horario")
    
    def save(self, *args, **kwargs):
        """Save with calculated fields."""
        # Calculate duration
        start_datetime = datetime.combine(self.date, self.start_time)
        end_datetime = datetime.combine(self.date, self.end_time)
        self.duration_minutes = int((end_datetime - start_datetime).total_seconds() / 60)
        
        # Set price_per_hour from court if not set
        if self.price_per_hour is None and self.court:
            self.price_per_hour = self.court.price_per_hour
        
        # Calculate total price if not set
        if not self.total_price:
            self.calculate_total_price()
        
        # Set cancellation deadline based on policy
        if not self.cancellation_deadline:
            self.set_cancellation_deadline()
        
        # Update invoice status
        if self.requires_invoice and self.invoice_status == 'not_required':
            self.invoice_status = 'pending'
        
        # Validate before saving
        self.full_clean()
        
        super().save(*args, **kwargs)
    
    def calculate_total_price(self):
        """Calculate total price with all factors - using integer math."""
        if not self.price_per_hour:
            return
        
        # Convert price_per_hour to cents (integer) to avoid decimal issues
        price_per_hour_cents = int(self.price_per_hour * 100)
        
        # Base calculation using integer math
        total_cents = (price_per_hour_cents * self.duration_minutes) // 60
        
        # Apply special price if set
        if self.special_price:
            total_cents = int(self.special_price * 100)
        
        # Apply discount
        if self.discount_percentage > 0:
            discount_cents = (total_cents * self.discount_percentage) // 100
            total_cents = total_cents - discount_cents
        
        # Add additional services
        if self.additional_services:
            for service, details in self.additional_services.items():
                if isinstance(details, dict) and 'price' in details:
                    total_cents += int(float(details['price']) * 100)
        
        # Convert back to decimal (dollars)
        self.total_price = Decimal(total_cents) / 100
    
    def set_cancellation_deadline(self):
        """Set cancellation deadline based on policy."""
        reservation_datetime = datetime.combine(self.date, self.start_time)
        
        if self.cancellation_policy == 'flexible':
            # 2 hours before
            self.cancellation_deadline = reservation_datetime - timedelta(hours=2)
        elif self.cancellation_policy == 'moderate':
            # 6 hours before
            self.cancellation_deadline = reservation_datetime - timedelta(hours=6)
        elif self.cancellation_policy == 'strict':
            # 24 hours before
            self.cancellation_deadline = reservation_datetime - timedelta(hours=24)
    
    def check_court_availability(self):
        """Check if court is available for this time slot."""
        # Skip check for maintenance and blocked types
        if self.reservation_type in ['maintenance', 'blocked']:
            return True
        
        # Check for conflicts
        conflicts = Reservation.objects.filter(
            court=self.court,
            date=self.date,
            status__in=['pending', 'confirmed', 'completed']
        ).exclude(pk=self.pk)
        
        for reservation in conflicts:
            # Check time overlap
            if (self.start_time < reservation.end_time and 
                self.end_time > reservation.start_time):
                return False
        
        return True
    
    def can_cancel(self):
        """Check if reservation can be cancelled."""
        if self.status in ['cancelled', 'completed', 'no_show']:
            return False
        
        # Check deadline
        if self.cancellation_deadline:
            return timezone.now() < self.cancellation_deadline
        
        return True
    
    def calculate_cancellation_fee(self):
        """Calculate cancellation fee based on policy and timing."""
        if not self.can_cancel():
            return self.total_price  # Full charge if past deadline
        
        hours_until = (datetime.combine(self.date, self.start_time) - datetime.now()).total_seconds() / 3600
        
        if self.cancellation_policy == 'flexible':
            return Decimal('0')  # No fee if within deadline
        elif self.cancellation_policy == 'moderate':
            if hours_until < 6:
                return self.total_price * Decimal('0.5')  # 50% fee
            return Decimal('0')
        elif self.cancellation_policy == 'strict':
            return self.total_price  # Always full fee
        
        return Decimal('0')
    
    @transaction.atomic
    def cancel(self, user=None, reason=''):
        """Cancel reservation with proper fee handling."""
        if not self.can_cancel() and self.status != 'pending':
            raise ValidationError("Esta reserva no puede ser cancelada")
        
        self.cancellation_fee = self.calculate_cancellation_fee()
        self.status = 'cancelled'
        self.cancellation_reason = reason
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        
        # Handle refunds
        if self.payment_status == 'paid':
            refund_amount = self.payment_amount - self.cancellation_fee
            if refund_amount > 0:
                self.payment_status = 'refunded'
                # TODO: Process actual refund through payment gateway
        
        self.save()
        
        # Cancel recurring instances if this is parent
        if self.is_recurring and not self.parent_reservation:
            self.recurring_instances.filter(
                date__gte=self.date,
                status='pending'
            ).update(
                status='cancelled',
                cancellation_reason='Reserva recurrente cancelada',
                cancelled_at=timezone.now(),
                cancelled_by=user
            )
    
    def confirm(self):
        """Confirm a pending reservation."""
        if self.status != 'pending':
            raise ValidationError("Solo las reservas pendientes pueden ser confirmadas")
        
        self.status = 'confirmed'
        self.save()
        
        # Send confirmation
        # TODO: Send confirmation email/SMS
        self.confirmation_sent = True
        self.save(update_fields=['confirmation_sent'])
    
    def check_in(self):
        """Check in for the reservation."""
        if self.status != 'confirmed':
            raise ValidationError("Solo las reservas confirmadas pueden hacer check-in")
        
        if not self.is_today:
            raise ValidationError("Solo se puede hacer check-in el día de la reserva")
        
        self.checked_in_at = timezone.now()
        self.save(update_fields=['checked_in_at'])
    
    def complete(self):
        """Mark reservation as completed."""
        if self.status != 'confirmed':
            raise ValidationError("Solo las reservas confirmadas pueden completarse")
        
        self.status = 'completed'
        self.save()
    
    def mark_no_show(self):
        """Mark reservation as no-show."""
        if self.status != 'confirmed':
            raise ValidationError("Solo las reservas confirmadas pueden marcarse como no-show")
        
        if not self.is_past:
            raise ValidationError("Solo las reservas pasadas pueden marcarse como no-show")
        
        self.status = 'no_show'
        self.no_show = True
        self.no_show_fee = self.total_price  # Full charge for no-show
        self.save()
    
    @transaction.atomic
    def create_recurring_instances(self):
        """Create recurring reservation instances."""
        if not self.is_recurring or self.parent_reservation:
            return
        
        instances = []
        current_date = self.date
        
        while current_date <= self.recurrence_end_date:
            # Skip the parent date
            if current_date > self.date:
                instance = Reservation(
                    organization=self.organization,
                    club=self.club,
                    court=self.court,
                    date=current_date,
                    start_time=self.start_time,
                    end_time=self.end_time,
                    player_name=self.player_name,
                    player_email=self.player_email,
                    player_phone=self.player_phone,
                    player_count=self.player_count,
                    price_per_hour=self.price_per_hour,
                    total_price=self.total_price,
                    created_by=self.created_by,
                    parent_reservation=self,
                    is_recurring=False,
                    reservation_type='recurring',
                    status='pending'
                )
                instances.append(instance)
            
            # Calculate next date
            if self.recurrence_pattern == 'daily':
                current_date += timedelta(days=1)
            elif self.recurrence_pattern == 'weekly':
                current_date += timedelta(weeks=1)
            elif self.recurrence_pattern == 'biweekly':
                current_date += timedelta(weeks=2)
            elif self.recurrence_pattern == 'monthly':
                # Add month (approximate)
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        
        # Bulk create instances
        Reservation.objects.bulk_create(instances)
    
    @property
    def is_past(self):
        """Check if reservation is in the past."""
        reservation_datetime = datetime.combine(self.date, self.end_time)
        return timezone.now() > timezone.make_aware(reservation_datetime)
    
    @property
    def is_today(self):
        """Check if reservation is today."""
        return self.date == timezone.now().date()
    
    @property
    def is_future(self):
        """Check if reservation is in the future."""
        return self.date > timezone.now().date()
    
    @property
    def duration_hours(self):
        """Get duration in hours."""
        return self.duration_minutes / 60
    
    @property
    def time_slot(self):
        """Get formatted time slot."""
        return f"{self.start_time:%H:%M} - {self.end_time:%H:%M}"
    
    @property
    def payment_progress(self):
        """Get payment progress percentage."""
        if self.payment_status == 'paid':
            return 100
        elif self.payment_status == 'partial' and self.payment_amount:
            return int((self.payment_amount / self.total_price) * 100)
        return 0


class ReservationPayment(BaseModel):
    """
    Split payment tracking for reservations.
    """
    
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name='split_payments'
    )
    
    player_name = models.CharField(max_length=200)
    player_email = models.EmailField()
    amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    
    # Payment link
    payment_token = models.CharField(max_length=100, unique=True, editable=False)
    payment_link_sent_at = models.DateTimeField(null=True, blank=True)
    payment_link_accessed_at = models.DateTimeField(null=True, blank=True)
    
    # Check-in
    is_checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    check_in_code = models.CharField(max_length=6, blank=True)
    
    class Meta:
        ordering = ['player_name']
    
    def __str__(self):
        return f"{self.player_name} - ${self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.payment_token:
            self.payment_token = str(uuid.uuid4())
        
        if not self.check_in_code:
            # Generate 6-digit code
            import random
            self.check_in_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        super().save(*args, **kwargs)
    
    def mark_paid(self, payment_method='', transaction_id=''):
        """Mark this split payment as paid."""
        self.is_paid = True
        self.paid_at = timezone.now()
        self.payment_method = payment_method
        self.transaction_id = transaction_id
        self.save()
        
        # Update reservation payment status
        self.reservation.update_payment_status()
    
    def check_in(self):
        """Check in this player."""
        if not self.is_paid:
            raise ValidationError("El pago debe estar completado antes del check-in")
        
        self.is_checked_in = True
        self.checked_in_at = timezone.now()
        self.save()


class BlockedSlot(BaseModel):
    """
    Blocked time slots for maintenance or other reasons.
    """
    
    REASON_CHOICES = [
        ('maintenance', 'Mantenimiento'),
        ('tournament', 'Torneo'),
        ('private_event', 'Evento Privado'),
        ('weather', 'Clima'),
        ('other', 'Otro')
    ]
    
    organization = models.ForeignKey(
        "root.Organization",
        on_delete=models.CASCADE,
        related_name="blocked_slots"
    )
    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.CASCADE,
        related_name="blocked_slots"
    )
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="blocked_slots",
        help_text="Dejar vacío para bloquear todas las canchas"
    )
    
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_blocked_slots"
    )
    
    # Recurring blocks
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.JSONField(
        null=True, blank=True,
        help_text="Pattern for recurring blocks"
    )
    
    class Meta:
        ordering = ['-start_datetime']
        indexes = [
            models.Index(fields=['club', 'start_datetime', 'end_datetime']),
            models.Index(fields=['court', 'start_datetime', 'end_datetime']),
        ]
    
    def __str__(self):
        court_name = self.court.name if self.court else "Todas las canchas"
        return f"{court_name} - {self.get_reason_display()} - {self.start_datetime}"
    
    def clean(self):
        """Validate blocked slot."""
        if self.start_datetime >= self.end_datetime:
            raise ValidationError("La fecha/hora de fin debe ser posterior a la de inicio")
    
    def affects_reservation(self, reservation):
        """Check if this block affects a given reservation."""
        # Check club
        if self.club != reservation.club:
            return False
        
        # Check court (if specific)
        if self.court and self.court != reservation.court:
            return False
        
        # Check time overlap
        res_start = datetime.combine(reservation.date, reservation.start_time)
        res_end = datetime.combine(reservation.date, reservation.end_time)
        
        # Make timezone aware if needed
        if timezone.is_naive(res_start):
            res_start = timezone.make_aware(res_start)
        if timezone.is_naive(res_end):
            res_end = timezone.make_aware(res_end)
        
        return (
            res_start < self.end_datetime and
            res_end > self.start_datetime
        )