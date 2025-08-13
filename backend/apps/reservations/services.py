"""
Services for reservation operations.
"""

from datetime import datetime, timedelta, time
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.reservations.models import Reservation, ReservationPayment, BlockedSlot
from apps.reservations.validators import (
    validate_reservation_time,
    validate_advance_booking,
    validate_court_availability,
    validate_player_count,
    validate_recurring_reservation
)
from apps.clients.models import ClientProfile
import logging

logger = logging.getLogger(__name__)


class ReservationService:
    """Service for reservation operations."""
    
    @staticmethod
    @transaction.atomic
    def create_reservation(reservation_data, user=None):
        """
        Create a new reservation with all validations.
        
        Args:
            reservation_data: Dict with reservation information
            user: User creating the reservation
            
        Returns:
            Reservation instance
        """
        # Extract main data
        club = reservation_data['club']
        court = reservation_data['court']
        date = reservation_data['date']
        start_time = reservation_data['start_time']
        end_time = reservation_data['end_time']
        
        # Validations
        validate_reservation_time(date, start_time, end_time, club)
        validate_advance_booking(date, club)
        validate_court_availability(court, date, start_time, end_time)
        validate_player_count(reservation_data.get('player_count', 4), court)
        
        # Set organization from club
        reservation_data['organization'] = club.organization
        
        # Set created_by
        if user:
            reservation_data['created_by'] = user
        
        # Calculate price if not provided
        if 'total_price' not in reservation_data:
            duration_hours = (
                datetime.combine(date, end_time) - 
                datetime.combine(date, start_time)
            ).total_seconds() / 3600
            
            base_price = court.price_per_hour * Decimal(str(duration_hours))
            
            # Apply any discounts
            discount = reservation_data.get('discount_percentage', 0)
            if discount > 0:
                reservation_data['total_price'] = base_price * (1 - Decimal(str(discount)) / 100)
            else:
                reservation_data['total_price'] = base_price
        
        # Link to client profile if user is registered
        if user and hasattr(user, 'client_profile'):
            reservation_data['client_profile'] = user.client_profile
        
        # Create reservation
        reservation = Reservation(**reservation_data)
        reservation.save()
        
        # Handle split payments
        if reservation.is_split_payment and reservation.split_count > 1:
            ReservationService.create_split_payments(reservation)
        
        # Handle recurring reservations
        if reservation.is_recurring:
            reservation.create_recurring_instances()
        
        # Send confirmation
        ReservationService.send_confirmation(reservation)
        
        logger.info(f"Created reservation {reservation.id} for {reservation.player_email}")
        
        return reservation
    
    @staticmethod
    def create_split_payments(reservation):
        """Create split payment records."""
        if not reservation.is_split_payment:
            return
        
        amount_per_person = reservation.total_price / reservation.split_count
        
        payments = []
        for i in range(reservation.split_count):
            payment = ReservationPayment(
                reservation=reservation,
                amount=amount_per_person,
                # Player info will be filled when they access payment link
            )
            payments.append(payment)
        
        ReservationPayment.objects.bulk_create(payments)
        
        # Send payment links
        for payment in reservation.split_payments.all():
            ReservationService.send_payment_link(payment)
    
    @staticmethod
    def check_availability(club, date, court=None, duration_minutes=60):
        """
        Check court availability for a given date.
        
        Returns:
            List of available time slots with pricing
        """
        available_slots = []
        
        # Get courts to check
        if court:
            courts = [court]
        else:
            courts = club.courts.filter(is_active=True, is_maintenance=False)
        
        # Get club schedule
        opening_time = club.opening_time or time(6, 0)
        closing_time = club.closing_time or time(23, 0)
        
        # Generate time slots
        current_time = datetime.combine(date, opening_time)
        end_of_day = datetime.combine(date, closing_time)
        slot_duration = timedelta(minutes=duration_minutes)
        
        while current_time + slot_duration <= end_of_day:
            slot_start = current_time.time()
            slot_end = (current_time + slot_duration).time()
            
            # Check each court
            for court in courts:
                try:
                    validate_court_availability(court, date, slot_start, slot_end)
                    
                    # Calculate price for this slot
                    # TODO: Implement dynamic pricing based on time/day
                    price = court.price_per_hour * (duration_minutes / 60)
                    
                    available_slots.append({
                        'court': court,
                        'date': date,
                        'start_time': slot_start,
                        'end_time': slot_end,
                        'price': price,
                        'is_peak': ReservationService.is_peak_time(date, slot_start),
                    })
                    
                except ValidationError:
                    # Slot not available
                    pass
            
            current_time += timedelta(minutes=30)  # Check every 30 minutes
        
        return available_slots
    
    @staticmethod
    def is_peak_time(date, time):
        """Check if given date/time is peak hours."""
        # Weekend
        if date.weekday() >= 5:  # Saturday or Sunday
            return True
        
        # Weekday peak hours (6 PM - 10 PM)
        if time >= time(18, 0) and time <= time(22, 0):
            return True
        
        return False
    
    @staticmethod
    @transaction.atomic
    def cancel_reservation(reservation, user=None, reason=''):
        """Cancel a reservation with proper validations."""
        if not reservation.can_cancel():
            raise ValidationError("Esta reserva no puede ser cancelada")
        
        # Calculate cancellation fee
        from apps.reservations.validators import calculate_cancellation_fee
        cancellation_fee = calculate_cancellation_fee(reservation)
        
        # Cancel the reservation
        reservation.cancel(user=user, reason=reason)
        
        # Process refund if needed
        if reservation.payment_status == 'paid' and cancellation_fee < reservation.total_price:
            refund_amount = reservation.total_price - cancellation_fee
            ReservationService.process_refund(reservation, refund_amount)
        
        # Cancel recurring instances if parent
        if reservation.is_recurring:
            reservation.recurring_instances.filter(
                date__gte=timezone.now().date(),
                status='pending'
            ).update(status='cancelled', cancellation_reason='Parent reservation cancelled')
        
        logger.info(f"Cancelled reservation {reservation.id} with fee {cancellation_fee}")
        
        return reservation
    
    @staticmethod
    def process_refund(reservation, amount):
        """Process refund for cancelled reservation."""
        # TODO: Implement actual refund processing with payment gateway
        reservation.payment_status = 'refunded'
        reservation.save()
        
        logger.info(f"Processed refund of {amount} for reservation {reservation.id}")
    
    @staticmethod
    def send_confirmation(reservation):
        """Send reservation confirmation."""
        # TODO: Implement actual email/SMS sending
        reservation.confirmation_sent = True
        reservation.save()
        
        logger.info(f"Sent confirmation for reservation {reservation.id}")
    
    @staticmethod
    def send_payment_link(payment):
        """Send payment link for split payment."""
        # TODO: Implement actual payment link sending
        payment.payment_link_sent_at = timezone.now()
        payment.save()
        
        logger.info(f"Sent payment link for {payment.id}")
    
    @staticmethod
    def send_reminder(reservation):
        """Send reservation reminder."""
        # TODO: Implement actual reminder sending
        reservation.reminder_sent = True
        reservation.save()
        
        logger.info(f"Sent reminder for reservation {reservation.id}")
    
    @staticmethod
    @transaction.atomic
    def process_no_shows():
        """Process no-shows for past reservations."""
        # Get confirmed reservations that are past their time
        cutoff_time = timezone.now() - timedelta(minutes=30)  # 30 min grace period
        
        no_shows = Reservation.objects.filter(
            status='confirmed',
            date__lte=cutoff_time.date()
        )
        
        for reservation in no_shows:
            reservation_time = timezone.make_aware(
                datetime.combine(reservation.date, reservation.end_time)
            )
            
            if reservation_time < cutoff_time:
                reservation.mark_no_show()
                logger.info(f"Marked reservation {reservation.id} as no-show")
    
    @staticmethod
    def get_wait_list_position(court, date, time_slot):
        """Get current wait list position for a slot."""
        return Reservation.objects.filter(
            court=court,
            date=date,
            start_time=time_slot,
            on_wait_list=True,
            status='pending'
        ).count() + 1


class BlockedSlotService:
    """Service for managing blocked slots."""
    
    @staticmethod
    @transaction.atomic
    def create_blocked_slot(data, user):
        """Create a blocked slot for maintenance or events."""
        # Set creator
        data['created_by'] = user
        
        # Validate times
        if data['start_datetime'] >= data['end_datetime']:
            raise ValidationError("End time must be after start time")
        
        # Check for conflicts with existing reservations
        if data.get('court'):
            conflicts = Reservation.objects.filter(
                court=data['court'],
                date__range=[
                    data['start_datetime'].date(),
                    data['end_datetime'].date()
                ],
                status__in=['confirmed', 'pending']
            )
            
            if conflicts.exists():
                raise ValidationError(
                    f"Hay {conflicts.count()} reservas confirmadas en este periodo"
                )
        
        blocked_slot = BlockedSlot.objects.create(**data)
        
        logger.info(f"Created blocked slot {blocked_slot.id}")
        
        return blocked_slot
    
    @staticmethod
    def get_blocked_slots(club, start_date, end_date):
        """Get blocked slots for a date range."""
        return BlockedSlot.objects.filter(
            club=club,
            start_datetime__date__lte=end_date,
            end_datetime__date__gte=start_date,
            is_active=True
        ).order_by('start_datetime')
