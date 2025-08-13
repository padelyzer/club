"""
Business validators for comprehensive edge case handling.
"""

from datetime import datetime, timedelta, time
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.reservations.models import Reservation
from apps.finance.models import Payment, Revenue
from apps.clubs.models import Club, Court
from apps.clients.models import ClientProfile


class ReservationBusinessValidator:
    """Business logic validator for reservations."""
    
    @staticmethod
    def validate_reservation_business_rules(reservation_data, user=None):
        """
        Validate all business rules for reservation creation.
        
        Args:
            reservation_data: Dict with reservation data
            user: User making the reservation
            
        Raises:
            ValidationError: If any business rule is violated
        """
        errors = []
        
        # Extract data
        club = reservation_data.get('club')
        court = reservation_data.get('court')
        date = reservation_data.get('date')
        start_time = reservation_data.get('start_time')
        end_time = reservation_data.get('end_time')
        player_count = reservation_data.get('player_count', 4)
        client_profile = reservation_data.get('client_profile')
        
        # Rule 1: Court belongs to club
        if court and club and court.club_id != club.id:
            errors.append("La cancha no pertenece al club seleccionado")
        
        # Rule 2: Club is active and accepting reservations
        if club and not club.is_active:
            errors.append("El club no está activo")
        
        if club and hasattr(club, 'accepts_reservations') and not club.accepts_reservations:
            errors.append("El club no está aceptando reservas en este momento")
        
        # Rule 3: Court is active and not under maintenance
        if court and not court.is_active:
            errors.append("La cancha no está disponible")
        
        if court and hasattr(court, 'is_maintenance') and court.is_maintenance:
            errors.append("La cancha está en mantenimiento")
        
        # Rule 4: Date and time validations
        if date and start_time and end_time:
            # Cannot book in the past
            now = timezone.now()
            booking_datetime = timezone.make_aware(datetime.combine(date, start_time))
            
            if booking_datetime < now:
                errors.append("No se pueden crear reservas en el pasado")
            
            # Check minimum advance time (30 minutes)
            min_advance = timedelta(minutes=30)
            if booking_datetime < now + min_advance:
                errors.append("Las reservas deben hacerse con al menos 30 minutos de anticipación")
            
            # Check maximum advance time (90 days)
            max_advance = timedelta(days=90)
            if booking_datetime > now + max_advance:
                errors.append("No se pueden hacer reservas con más de 90 días de anticipación")
        
        # Rule 5: Club operating hours
        if club and start_time and end_time:
            club_open = getattr(club, 'opening_time', time(6, 0))
            club_close = getattr(club, 'closing_time', time(23, 0))
            
            if start_time < club_open:
                errors.append(f"El club abre a las {club_open.strftime('%H:%M')}")
            
            if end_time > club_close:
                errors.append(f"El club cierra a las {club_close.strftime('%H:%M')}")
        
        # Rule 6: Duration limits
        if start_time and end_time:
            duration_minutes = (
                datetime.combine(date, end_time) - 
                datetime.combine(date, start_time)
            ).total_seconds() / 60
            
            if duration_minutes < 30:
                errors.append("La duración mínima es de 30 minutos")
            
            if duration_minutes > 240:  # 4 hours
                errors.append("La duración máxima es de 4 horas")
        
        # Rule 7: Player count validation
        if court:
            min_players = getattr(court, 'min_players', 2)
            max_players = getattr(court, 'max_players', 12)
            
            if player_count < min_players:
                errors.append(f"Mínimo {min_players} jugadores para esta cancha")
            
            if player_count > max_players:
                errors.append(f"Máximo {max_players} jugadores para esta cancha")
        
        # Rule 8: User limits and permissions
        if user and date:
            # Check daily limit
            user_reservations_today = Reservation.objects.filter(
                created_by=user,
                date=date,
                status__in=['pending', 'confirmed']
            ).count()
            
            daily_limit = 3  # Max 3 reservations per day
            if user_reservations_today >= daily_limit:
                errors.append(f"Has alcanzado el límite de {daily_limit} reservas por día")
            
            # Check weekly limit
            week_start = date - timedelta(days=date.weekday())
            week_end = week_start + timedelta(days=6)
            
            user_reservations_week = Reservation.objects.filter(
                created_by=user,
                date__range=[week_start, week_end],
                status__in=['pending', 'confirmed']
            ).count()
            
            weekly_limit = 10  # Max 10 reservations per week
            if user_reservations_week >= weekly_limit:
                errors.append(f"Has alcanzado el límite de {weekly_limit} reservas por semana")
        
        # Rule 9: Client profile validations
        if client_profile:
            if not client_profile.is_active:
                errors.append("El perfil del cliente no está activo")
            
            # Check if client has outstanding debts
            if hasattr(client_profile, 'outstanding_balance'):
                if client_profile.outstanding_balance > 0:
                    errors.append("El cliente tiene deudas pendientes")
        
        # Rule 10: Peak hour restrictions
        if date and start_time and user:
            # Weekend peak hours (9 AM - 6 PM)
            is_weekend = date.weekday() >= 5
            is_peak_hour = time(9, 0) <= start_time <= time(18, 0)
            
            if is_weekend and is_peak_hour:
                # Check if user has premium membership
                if not getattr(user, 'has_premium_membership', False):
                    # Limit non-premium users to 1 hour in peak times
                    if start_time and end_time:
                        duration_hours = (
                            datetime.combine(date, end_time) - 
                            datetime.combine(date, start_time)
                        ).total_seconds() / 3600
                        
                        if duration_hours > 1:
                            errors.append("En horarios pico de fin de semana, los usuarios estándar pueden reservar máximo 1 hora")
        
        # Raise all errors at once
        if errors:
            raise ValidationError(errors)
        
        return True
    
    @staticmethod
    def validate_cancellation_business_rules(reservation, user=None):
        """
        Validate business rules for reservation cancellation.
        
        Args:
            reservation: Reservation instance
            user: User requesting cancellation
            
        Raises:
            ValidationError: If cancellation is not allowed
        """
        errors = []
        now = timezone.now()
        
        # Rule 1: Only certain statuses can be cancelled
        if reservation.status not in ['pending', 'confirmed']:
            errors.append(f"No se puede cancelar una reserva con estado '{reservation.get_status_display()}'")
        
        # Rule 2: Check cancellation deadline
        if hasattr(reservation, 'cancellation_deadline') and reservation.cancellation_deadline:
            if now > reservation.cancellation_deadline:
                errors.append("Ha pasado el plazo límite para cancelar esta reserva")
        else:
            # Default: 2 hours before start time
            reservation_start = timezone.make_aware(
                datetime.combine(reservation.date, reservation.start_time)
            )
            if now > reservation_start - timedelta(hours=2):
                errors.append("Las reservas deben cancelarse con al menos 2 horas de anticipación")
        
        # Rule 3: Check if reservation has started
        reservation_start = timezone.make_aware(
            datetime.combine(reservation.date, reservation.start_time)
        )
        if now >= reservation_start:
            errors.append("No se puede cancelar una reserva que ya ha comenzado")
        
        # Rule 4: User permissions
        if user:
            # Only owner, admin, or staff can cancel
            if not (
                reservation.created_by == user or
                user.is_staff or
                getattr(user, 'is_club_admin', False)
            ):
                errors.append("No tienes permisos para cancelar esta reserva")
        
        # Rule 5: Payment status considerations
        if reservation.payment_status == 'paid':
            # Check refund policy
            if hasattr(reservation, 'is_refundable') and not reservation.is_refundable:
                errors.append("Esta reserva no es reembolsable")
        
        if errors:
            raise ValidationError(errors)
        
        return True


class PaymentBusinessValidator:
    """Business logic validator for payments."""
    
    @staticmethod
    def validate_payment_business_rules(payment_data, user=None):
        """
        Validate business rules for payment processing.
        
        Args:
            payment_data: Dict with payment data
            user: User making the payment
            
        Raises:
            ValidationError: If any business rule is violated
        """
        errors = []
        
        # Extract data
        amount = payment_data.get('amount')
        payment_method = payment_data.get('payment_method')
        club = payment_data.get('club')
        reservation = payment_data.get('reservation')
        
        # Rule 1: Amount validations
        if amount:
            if amount <= 0:
                errors.append("El monto debe ser mayor a 0")
            
            if amount > Decimal('50000'):  # $50,000 MXN limit
                errors.append("El monto excede el límite máximo de $50,000 MXN")
            
            # Minimum amounts by payment method
            min_amounts = {
                'card': Decimal('10'),
                'stripe': Decimal('10'),
                'oxxo': Decimal('10'),
                'spei': Decimal('100')
            }
            
            min_amount = min_amounts.get(payment_method, Decimal('1'))
            if amount < min_amount:
                errors.append(f"Monto mínimo para {payment_method}: ${min_amount}")
        
        # Rule 2: Payment method availability
        if club and payment_method:
            # Check if payment method is enabled for this club
            if hasattr(club, 'enabled_payment_methods'):
                if payment_method not in club.enabled_payment_methods:
                    errors.append(f"El método de pago {payment_method} no está disponible en este club")
        
        # Rule 3: Reservation-specific validations
        if reservation:
            # Cannot pay for cancelled or completed reservations
            if reservation.status in ['cancelled', 'completed', 'no_show']:
                errors.append(f"No se puede pagar una reserva con estado '{reservation.get_status_display()}'")
            
            # Cannot pay twice
            if reservation.payment_status == 'paid':
                errors.append("Esta reserva ya ha sido pagada")
            
            # Amount should match reservation total
            if amount and hasattr(reservation, 'total_price'):
                if abs(amount - reservation.total_price) > Decimal('0.01'):
                    errors.append("El monto no coincide con el total de la reserva")
        
        # Rule 4: Daily payment limits per user
        if user and amount:
            today = timezone.now().date()
            daily_payments = Payment.objects.filter(
                user=user,
                created_at__date=today,
                status='completed'
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
            
            daily_limit = Decimal('10000')  # $10,000 MXN per day
            if daily_payments + amount > daily_limit:
                errors.append(f"Has excedido el límite diario de pagos: ${daily_limit}")
        
        # Rule 5: Business hours for certain payment methods
        if payment_method in ['cash', 'transfer']:
            now = timezone.now().time()
            business_start = time(8, 0)
            business_end = time(20, 0)
            
            if not (business_start <= now <= business_end):
                errors.append(f"Los pagos en {payment_method} solo se procesan en horario comercial (8:00 AM - 8:00 PM)")
        
        if errors:
            raise ValidationError(errors)
        
        return True
    
    @staticmethod
    def validate_refund_business_rules(payment, refund_amount=None, reason=None):
        """
        Validate business rules for payment refunds.
        
        Args:
            payment: Payment instance
            refund_amount: Amount to refund (optional, defaults to full)
            reason: Refund reason
            
        Raises:
            ValidationError: If refund is not allowed
        """
        errors = []
        
        # Rule 1: Only completed payments can be refunded
        if payment.status != 'completed':
            errors.append("Solo los pagos completados pueden ser reembolsados")
        
        # Rule 2: Check if payment is refundable
        if not payment.is_refundable:
            errors.append("Este pago no es reembolsable según la política")
        
        # Rule 3: Time limits
        if payment.processed_at:
            days_since_payment = (timezone.now() - payment.processed_at).days
            
            # Different limits by payment method
            time_limits = {
                'card': 90,      # 90 days for cards
                'stripe': 90,    # 90 days for Stripe
                'cash': 30,      # 30 days for cash
                'transfer': 60,  # 60 days for transfers
                'oxxo': 30,      # 30 days for OXXO
                'spei': 60       # 60 days for SPEI
            }
            
            limit = time_limits.get(payment.payment_method, 30)
            if days_since_payment > limit:
                errors.append(f"El plazo para reembolsos de {payment.payment_method} es de {limit} días")
        
        # Rule 4: Refund amount validations
        if refund_amount:
            available_for_refund = payment.amount - payment.refund_amount
            
            if refund_amount > available_for_refund:
                errors.append(f"Monto máximo disponible para reembolso: ${available_for_refund}")
            
            if refund_amount <= 0:
                errors.append("El monto del reembolso debe ser mayor a 0")
        
        # Rule 5: Require reason for large refunds
        if refund_amount and refund_amount > Decimal('1000') and not reason:
            errors.append("Los reembolsos mayores a $1,000 requieren especificar una razón")
        
        # Rule 6: Reservation-specific rules
        if payment.reservation:
            reservation = payment.reservation
            
            # Cannot refund if reservation was used (checked in)
            if hasattr(reservation, 'checked_in_at') and reservation.checked_in_at:
                # Allow partial refund only
                if refund_amount and refund_amount >= payment.amount:
                    errors.append("Las reservas utilizadas solo pueden tener reembolsos parciales")
        
        if errors:
            raise ValidationError(errors)
        
        return True


class ClubBusinessValidator:
    """Business logic validator for club operations."""
    
    @staticmethod
    def validate_club_capacity(club, date, start_time, end_time):
        """
        Validate if club has capacity for new reservations.
        
        Args:
            club: Club instance
            date: Reservation date
            start_time: Start time
            end_time: End time
            
        Raises:
            ValidationError: If club is at capacity
        """
        errors = []
        
        # Count active reservations for the time slot
        overlapping_reservations = Reservation.objects.filter(
            club=club,
            date=date,
            status__in=['pending', 'confirmed'],
            start_time__lt=end_time,
            end_time__gt=start_time
        ).count()
        
        # Check against club capacity
        total_courts = club.courts.filter(is_active=True).count()
        
        if overlapping_reservations >= total_courts:
            errors.append("El club no tiene canchas disponibles en este horario")
        
        # Check maximum reservations per hour
        hour_reservations = Reservation.objects.filter(
            club=club,
            date=date,
            start_time__hour=start_time.hour,
            status__in=['pending', 'confirmed']
        ).count()
        
        # Limit: 80% of courts can be reserved in the same hour
        max_hourly = int(total_courts * 0.8)
        if hour_reservations >= max_hourly:
            errors.append(f"Máximo {max_hourly} reservas permitidas a las {start_time.strftime('%H:%M')}")
        
        if errors:
            raise ValidationError(errors)
        
        return True


class RevenueBusinessValidator:
    """Business logic validator for revenue operations."""
    
    @staticmethod
    def validate_revenue_integrity(date, club):
        """
        Validate revenue data integrity for a given date/club.
        
        Args:
            date: Date to validate
            club: Club to validate
            
        Returns:
            Dict with validation results
        """
        issues = []
        
        # Get all payments for the date
        payments = Payment.objects.filter(
            club=club,
            processed_at__date=date,
            status='completed'
        )
        
        # Get all revenues for the date
        revenues = Revenue.objects.filter(
            club=club,
            date=date
        )
        
        # Rule 1: Every completed payment should have a revenue record
        payments_without_revenue = []
        for payment in payments:
            if not payment.revenue_records.exists():
                payments_without_revenue.append(payment.id)
        
        if payments_without_revenue:
            issues.append({
                'type': 'missing_revenue',
                'message': f"{len(payments_without_revenue)} pagos sin registro de ingreso",
                'payment_ids': payments_without_revenue
            })
        
        # Rule 2: Revenue amounts should match payment net amounts
        revenue_total = revenues.aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        payment_total = payments.aggregate(total=models.Sum('net_amount'))['total'] or Decimal('0')
        
        if abs(revenue_total - payment_total) > Decimal('0.01'):
            issues.append({
                'type': 'amount_mismatch',
                'message': f"Discrepancia: Ingresos ${revenue_total} vs Pagos netos ${payment_total}",
                'difference': revenue_total - payment_total
            })
        
        # Rule 3: No orphaned revenues (revenues without payments)
        orphaned_revenues = revenues.filter(payment__isnull=True).count()
        if orphaned_revenues > 0:
            issues.append({
                'type': 'orphaned_revenue',
                'message': f"{orphaned_revenues} registros de ingreso sin pago asociado"
            })
        
        return {
            'date': date,
            'club': club.name,
            'is_valid': len(issues) == 0,
            'issues': issues,
            'summary': {
                'total_payments': payments.count(),
                'total_revenues': revenues.count(),
                'payment_amount': payment_total,
                'revenue_amount': revenue_total
            }
        }
