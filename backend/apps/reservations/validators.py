"""
Defensive validators for reservation module.
Provides comprehensive validation with fallback mechanisms and logging.
Based on the successful clubs module stabilization pattern.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

logger = logging.getLogger('reservations.validators')


def validate_reservation_time(date, start_time, end_time, club):
    """Validate reservation time against club schedule."""
    # Check if date is not in past
    if date < timezone.now().date():
        raise ValidationError("No se pueden crear reservas en fechas pasadas")
    
    # Check if start time is before end time
    if start_time >= end_time:
        raise ValidationError("La hora de fin debe ser posterior a la hora de inicio")
    
    # Check club operating hours
    if hasattr(club, 'opening_time') and hasattr(club, 'closing_time'):
        if start_time < club.opening_time:
            raise ValidationError(f"El club abre a las {club.opening_time}")
        if end_time > club.closing_time:
            raise ValidationError(f"El club cierra a las {club.closing_time}")
    
    # Check minimum duration (30 minutes)
    start_dt = datetime.combine(date, start_time)
    end_dt = datetime.combine(date, end_time)
    duration = (end_dt - start_dt).total_seconds() / 60
    
    if duration < 30:
        raise ValidationError("La duración mínima es de 30 minutos")
    
    # Check maximum duration (4 hours)
    if duration > 240:
        raise ValidationError("La duración máxima es de 4 horas")


def validate_advance_booking(date, club):
    """Validate advance booking limits."""
    days_advance = (date - timezone.now().date()).days
    
    # Check minimum advance (2 hours)
    if days_advance == 0:
        # Same day booking - check hours
        now = timezone.now()
        booking_time = datetime.combine(date, datetime.min.time())
        hours_advance = (booking_time - now).total_seconds() / 3600
        
        if hours_advance < 2:
            raise ValidationError("Las reservas deben hacerse con al menos 2 horas de anticipación")
    
    # Check maximum advance (90 days)
    max_advance_days = getattr(club, 'max_advance_booking_days', 90)
    if days_advance > max_advance_days:
        raise ValidationError(f"No se pueden hacer reservas con más de {max_advance_days} días de anticipación")


def validate_court_availability(court, date, start_time, end_time, exclude_reservation=None):
    """Check if court is available for the time slot."""
    from apps.reservations.models import Reservation, BlockedSlot
    
    # Check for existing reservations
    reservations = Reservation.objects.filter(
        court=court,
        date=date,
        status__in=['pending', 'confirmed', 'completed']
    )
    
    if exclude_reservation:
        reservations = reservations.exclude(pk=exclude_reservation.pk)
    
    for reservation in reservations:
        # Check time overlap
        if (start_time < reservation.end_time and end_time > reservation.start_time):
            raise ValidationError(
                f"La cancha ya está reservada de {reservation.start_time} a {reservation.end_time}"
            )
    
    # Check for blocked slots
    slot_start = timezone.make_aware(datetime.combine(date, start_time))
    slot_end = timezone.make_aware(datetime.combine(date, end_time))
    
    blocked_slots = BlockedSlot.objects.filter(
        club=court.club,
        is_active=True,
        start_datetime__lt=slot_end,
        end_datetime__gt=slot_start
    ).filter(
        models.Q(court=court) | models.Q(court__isnull=True)
    )
    
    if blocked_slots.exists():
        blocked = blocked_slots.first()
        raise ValidationError(
            f"La cancha está bloqueada: {blocked.get_reason_display()} - {blocked.description}"
        )


def validate_player_count(player_count, court):
    """Validate player count for court type."""
    if player_count < 1:
        raise ValidationError("Debe haber al menos 1 jugador")
    
    # Padel is typically 4 players, but allow flexibility
    max_players = getattr(court, 'max_players', 12)
    if player_count > max_players:
        raise ValidationError(f"Máximo {max_players} jugadores por reserva")
    
    # Warning for non-standard counts
    if player_count not in [2, 4]:
        # This is just a warning, not an error
        pass


def calculate_cancellation_fee(reservation):
    """Calculate cancellation fee based on policy and timing."""
    if not reservation.cancellation_deadline:
        return Decimal('0')
    
    now = timezone.now()
    
    # If before deadline, no fee
    if now < reservation.cancellation_deadline:
        return Decimal('0')
    
    # Calculate fee based on policy
    if reservation.cancellation_policy == 'flexible':
        # No fee even after deadline for flexible
        return Decimal('0')
    elif reservation.cancellation_policy == 'moderate':
        # 50% after deadline
        return reservation.total_price * Decimal('0.5')
    elif reservation.cancellation_policy == 'strict':
        # 100% after deadline
        return reservation.total_price
    else:
        # Custom policy - needs specific implementation
        return Decimal('0')


def validate_recurring_reservation(start_date, end_date, pattern):
    """Validate recurring reservation parameters."""
    if not end_date:
        raise ValidationError("Las reservas recurrentes deben tener fecha de fin")
    
    if end_date <= start_date:
        raise ValidationError("La fecha de fin debe ser posterior a la fecha de inicio")
    
    # Check maximum recurrence period
    max_days = 365  # 1 year
    if (end_date - start_date).days > max_days:
        raise ValidationError(f"Las reservas recurrentes no pueden exceder {max_days} días")
    
    # Check pattern validity
    valid_patterns = ['daily', 'weekly', 'biweekly', 'monthly']
    if pattern not in valid_patterns:
        raise ValidationError(f"Patrón de recurrencia inválido: {pattern}")
    
    # Estimate number of instances
    if pattern == 'daily':
        instances = (end_date - start_date).days
    elif pattern == 'weekly':
        instances = (end_date - start_date).days // 7
    elif pattern == 'biweekly':
        instances = (end_date - start_date).days // 14
    else:  # monthly
        instances = ((end_date.year - start_date.year) * 12 + 
                    (end_date.month - start_date.month))
    
    # Limit number of instances
    max_instances = 52  # 1 year of weekly
    if instances > max_instances:
        raise ValidationError(f"Demasiadas instancias recurrentes ({instances}). Máximo: {max_instances}")


class ReservationIntegrityValidator:
    """
    Comprehensive validator for reservation data integrity and business rules.
    Based on ClubIntegrityValidator pattern but specific to reservations.
    """
    
    def __init__(self, reservation=None):
        self.reservation = reservation
        self.errors = []
        self.warnings = []
        
    def validate_all(self) -> Dict[str, Any]:
        """
        Perform all validation checks on the reservation.
        
        Returns:
            Dict with validation results and detailed information
        """
        try:
            logger.info(f'Starting comprehensive validation for reservation {self.reservation.id if self.reservation else "new"}')
            
            # Core validations
            self._validate_temporal_constraints()
            self._validate_resource_constraints()
            self._validate_business_rules()
            self._validate_payment_constraints()
            self._validate_multi_tenant_constraints()
            self._validate_concurrent_booking_prevention()
            
            # Advanced validations
            self._validate_recurring_patterns()
            self._validate_cancellation_policies()
            self._validate_notification_requirements()
            
            is_valid = len(self.errors) == 0
            
            result = {
                'is_valid': is_valid,
                'errors': self.errors,
                'warnings': self.warnings,
                'validation_timestamp': timezone.now().isoformat(),
                'reservation_id': str(self.reservation.id) if self.reservation else None,
                'validation_summary': self._generate_validation_summary()
            }
            
            log_level = logging.INFO if is_valid else logging.ERROR
            logger.log(log_level, f'Reservation validation completed: {len(self.errors)} errors, {len(self.warnings)} warnings')
            
            return result
            
        except Exception as e:
            logger.error(f'Unexpected error during reservation validation: {e}')
            return {
                'is_valid': False,
                'errors': [f'Validation system error: {str(e)}'],
                'warnings': [],
                'validation_timestamp': timezone.now().isoformat(),
                'reservation_id': str(self.reservation.id) if self.reservation else None
            }
    
    def _validate_temporal_constraints(self):
        """Validate time-related constraints."""
        if not self.reservation:
            return
            
        try:
            # Check if reservation is in the past
            now = timezone.now()
            if self.reservation.datetime_start <= now:
                self.errors.append('Reservation cannot be in the past')
            
            # Check duration constraints
            duration = self.reservation.datetime_end - self.reservation.datetime_start
            min_duration = timedelta(minutes=30)
            max_duration = timedelta(hours=6)
            
            if duration < min_duration:
                self.errors.append(f'Duration too short: {duration} (minimum: {min_duration})')
            
            if duration > max_duration:
                self.warnings.append(f'Long duration: {duration} (maximum recommended: {max_duration})')
            
            # Check advance booking limits
            advance_time = self.reservation.datetime_start - now
            min_advance = timedelta(hours=1)
            max_advance = timedelta(days=90)
            
            if advance_time < min_advance:
                self.errors.append(f'Insufficient advance booking time: {advance_time}')
            
            if advance_time > max_advance:
                self.warnings.append(f'Very far advance booking: {advance_time}')
            
            logger.debug(f'Temporal validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in temporal validation: {e}')
            self.errors.append(f'Temporal validation error: {str(e)}')
    
    def _validate_resource_constraints(self):
        """Validate court and resource availability."""
        if not self.reservation:
            return
            
        try:
            # Check court exists and is active
            if not hasattr(self.reservation, 'court') or not self.reservation.court:
                self.errors.append('Reservation must have a valid court')
                return
            
            court = self.reservation.court
            
            # Check court is active
            if hasattr(court, 'is_active') and not court.is_active:
                self.errors.append('Court is not active')
            
            # Check court maintenance schedule
            if hasattr(court, 'maintenance_start') and hasattr(court, 'maintenance_end'):
                if (court.maintenance_start and court.maintenance_end and 
                    court.maintenance_start <= self.reservation.datetime_start.time() <= court.maintenance_end):
                    self.errors.append('Court is under maintenance during requested time')
            
            # Check club operating hours
            club = court.club
            start_time = self.reservation.datetime_start.time()
            end_time = self.reservation.datetime_end.time()
            
            club_open = getattr(club, 'opening_time', datetime.min.time())
            club_close = getattr(club, 'closing_time', datetime.max.time())
            
            if start_time < club_open or end_time > club_close:
                self.errors.append(f'Reservation outside club hours ({club_open} - {club_close})')
            
            logger.debug(f'Resource validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in resource validation: {e}')
            self.errors.append(f'Resource validation error: {str(e)}')
    
    def _validate_business_rules(self):
        """Validate business-specific rules."""
        if not self.reservation:
            return
            
        try:
            # Check player count constraints
            if hasattr(self.reservation, 'player_count'):
                player_count = self.reservation.player_count
                
                if player_count < 1:
                    self.errors.append('Must have at least 1 player')
                
                max_players = getattr(self.reservation.court, 'max_players', 8)
                if player_count > max_players:
                    self.errors.append(f'Too many players: {player_count} (max: {max_players})')
                
                # Warning for unusual player counts
                if player_count not in [2, 4] and self.reservation.court.sport_type == 'padel':
                    self.warnings.append(f'Unusual player count for padel: {player_count}')
            
            # Check reservation type constraints
            if hasattr(self.reservation, 'reservation_type'):
                reservation_type = self.reservation.reservation_type
                
                # Tournament reservations need special validation
                if reservation_type == 'tournament':
                    if not hasattr(self.reservation, 'tournament') or not self.reservation.tournament:
                        self.errors.append('Tournament reservation must be linked to a tournament')
                
                # Class reservations need instructor
                if reservation_type == 'class':
                    if not hasattr(self.reservation, 'instructor') or not self.reservation.instructor:
                        self.warnings.append('Class reservation should have an assigned instructor')
            
            logger.debug(f'Business rules validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in business rules validation: {e}')
            self.errors.append(f'Business rules validation error: {str(e)}')
    
    def _validate_payment_constraints(self):
        """Validate payment-related constraints."""
        if not self.reservation:
            return
            
        try:
            # Check price consistency
            if hasattr(self.reservation, 'total_amount') and self.reservation.total_amount:
                if self.reservation.total_amount < Decimal('0'):
                    self.errors.append('Total amount cannot be negative')
                
                if self.reservation.total_amount > Decimal('1000'):  # Sanity check
                    self.warnings.append(f'Very high reservation amount: €{self.reservation.total_amount}')
            
            # Check payment status consistency
            if hasattr(self.reservation, 'payment_status'):
                payment_status = self.reservation.payment_status
                reservation_status = self.reservation.status
                
                # Completed reservations should have payment
                if reservation_status == 'completed' and payment_status in ['pending', 'failed']:
                    self.warnings.append('Completed reservation with pending/failed payment')
                
                # Cancelled reservations with refund should be marked as refunded
                if reservation_status == 'cancelled' and hasattr(self.reservation, 'refund_amount'):
                    if self.reservation.refund_amount and payment_status != 'refunded':
                        self.warnings.append('Cancelled reservation with refund amount but not marked as refunded')
            
            logger.debug(f'Payment validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in payment validation: {e}')
            self.errors.append(f'Payment validation error: {str(e)}')
    
    def _validate_multi_tenant_constraints(self):
        """Validate multi-tenant data consistency."""
        if not self.reservation:
            return
            
        try:
            # Check organization consistency
            if hasattr(self.reservation, 'organization') and hasattr(self.reservation, 'club'):
                if self.reservation.organization and self.reservation.club:
                    if self.reservation.club.organization != self.reservation.organization:
                        self.errors.append('Club and organization mismatch')
            
            # Check court-club consistency
            if hasattr(self.reservation, 'court') and hasattr(self.reservation, 'club'):
                if self.reservation.court and self.reservation.club:
                    if self.reservation.court.club != self.reservation.club:
                        self.errors.append('Court and club mismatch')
            
            # Check user-organization access
            if hasattr(self.reservation, 'user') and hasattr(self.reservation, 'organization'):
                if self.reservation.user and self.reservation.organization:
                    # This would need to be implemented based on your user-organization model
                    pass
            
            logger.debug(f'Multi-tenant validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in multi-tenant validation: {e}')
            self.errors.append(f'Multi-tenant validation error: {str(e)}')
    
    def _validate_concurrent_booking_prevention(self):
        """Validate against concurrent bookings (double booking prevention)."""
        if not self.reservation:
            return
            
        try:
            from apps.reservations.models import Reservation
            
            # Check for overlapping reservations
            overlapping_query = models.Q(
                court=self.reservation.court,
                status__in=['confirmed', 'pending'],
                datetime_start__lt=self.reservation.datetime_end,
                datetime_end__gt=self.reservation.datetime_start
            )
            
            # Exclude current reservation if it exists (for updates)
            if self.reservation.id:
                overlapping_query &= ~models.Q(id=self.reservation.id)
            
            overlapping_reservations = Reservation.objects.filter(overlapping_query)
            
            if overlapping_reservations.exists():
                overlapping = overlapping_reservations.first()
                self.errors.append(
                    f'Overlapping reservation exists: {overlapping.id} '
                    f'({overlapping.datetime_start} - {overlapping.datetime_end})'
                )
            
            logger.debug(f'Concurrent booking validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in concurrent booking validation: {e}')
            self.errors.append(f'Concurrent booking validation error: {str(e)}')
    
    def _validate_recurring_patterns(self):
        """Validate recurring reservation patterns."""
        if not self.reservation or not hasattr(self.reservation, 'is_recurring'):
            return
            
        try:
            if getattr(self.reservation, 'is_recurring', False):
                # Check pattern validity
                pattern = getattr(self.reservation, 'recurrence_pattern', None)
                if not pattern:
                    self.errors.append('Recurring reservation must have a recurrence pattern')
                
                # Check end date
                end_date = getattr(self.reservation, 'recurrence_end_date', None)
                if not end_date:
                    self.errors.append('Recurring reservation must have an end date')
                elif end_date <= self.reservation.datetime_start.date():
                    self.errors.append('Recurrence end date must be after start date')
                
                # Check reasonable limits
                if end_date and (end_date - self.reservation.datetime_start.date()).days > 365:
                    self.warnings.append('Very long recurring reservation period (>1 year)')
            
            logger.debug(f'Recurring pattern validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in recurring pattern validation: {e}')
            self.errors.append(f'Recurring pattern validation error: {str(e)}')
    
    def _validate_cancellation_policies(self):
        """Validate cancellation policy constraints."""
        if not self.reservation:
            return
            
        try:
            if hasattr(self.reservation, 'cancellation_policy'):
                policy = self.reservation.cancellation_policy
                
                # Check if cancellation deadline is consistent with policy
                if hasattr(self.reservation, 'cancellation_deadline'):
                    deadline = self.reservation.cancellation_deadline
                    
                    if deadline and deadline > self.reservation.datetime_start:
                        self.errors.append('Cancellation deadline cannot be after reservation start')
                    
                    # Check policy-specific constraints
                    if policy == 'flexible' and deadline:
                        time_diff = self.reservation.datetime_start - deadline
                        if time_diff < timedelta(hours=2):
                            self.warnings.append('Flexible policy with very short cancellation window')
                    
                    elif policy == 'strict' and deadline:
                        time_diff = self.reservation.datetime_start - deadline
                        if time_diff > timedelta(days=7):
                            self.warnings.append('Strict policy with very long cancellation window')
            
            logger.debug(f'Cancellation policy validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in cancellation policy validation: {e}')
            self.errors.append(f'Cancellation policy validation error: {str(e)}')
    
    def _validate_notification_requirements(self):
        """Validate notification and communication requirements."""
        if not self.reservation:
            return
            
        try:
            # Check user contact information
            if hasattr(self.reservation, 'user') and self.reservation.user:
                user = self.reservation.user
                
                if not hasattr(user, 'email') or not user.email:
                    self.warnings.append('User has no email for notifications')
                
                # Check if user has valid profile
                if hasattr(user, 'profile'):
                    profile = user.profile
                    if not hasattr(profile, 'phone') or not profile.phone:
                        self.warnings.append('User has no phone for SMS notifications')
            
            # Check notification preferences
            if hasattr(self.reservation, 'notification_preferences'):
                prefs = self.reservation.notification_preferences
                if not prefs:
                    self.warnings.append('No notification preferences set')
            
            logger.debug(f'Notification validation completed for reservation {self.reservation.id}')
            
        except Exception as e:
            logger.error(f'Error in notification validation: {e}')
            self.warnings.append(f'Notification validation error: {str(e)}')
    
    def _generate_validation_summary(self) -> Dict[str, Any]:
        """Generate a summary of validation results."""
        return {
            'total_errors': len(self.errors),
            'total_warnings': len(self.warnings),
            'error_categories': self._categorize_issues(self.errors),
            'warning_categories': self._categorize_issues(self.warnings),
            'critical_issues': [error for error in self.errors if 'payment' in error.lower() or 'booking' in error.lower()],
            'recommendation': self._get_recommendation()
        }
    
    def _categorize_issues(self, issues: List[str]) -> Dict[str, int]:
        """Categorize issues by type."""
        categories = {
            'temporal': 0,
            'resource': 0,
            'business': 0,
            'payment': 0,
            'system': 0
        }
        
        for issue in issues:
            issue_lower = issue.lower()
            if any(word in issue_lower for word in ['time', 'date', 'duration', 'advance']):
                categories['temporal'] += 1
            elif any(word in issue_lower for word in ['court', 'club', 'resource', 'maintenance']):
                categories['resource'] += 1
            elif any(word in issue_lower for word in ['player', 'tournament', 'class', 'policy']):
                categories['business'] += 1
            elif any(word in issue_lower for word in ['payment', 'amount', 'refund']):
                categories['payment'] += 1
            else:
                categories['system'] += 1
        
        return categories
    
    def _get_recommendation(self) -> str:
        """Get recommendation based on validation results."""
        if len(self.errors) == 0:
            return 'Reservation is valid and can be processed'
        
        if any('payment' in error.lower() for error in self.errors):
            return 'Fix payment-related issues before processing'
        
        if any('booking' in error.lower() or 'overlap' in error.lower() for error in self.errors):
            return 'Fix booking conflicts before processing'
        
        if len(self.errors) > 5:
            return 'Multiple critical issues - comprehensive review needed'
        
        return 'Fix identified issues before processing'


class ReservationBusinessRuleValidator:
    """
    Specialized validator for complex business rules specific to reservations.
    """
    
    def __init__(self, reservation):
        self.reservation = reservation
        self.violations = []
    
    def validate_peak_hours_policy(self) -> bool:
        """Validate peak hours booking policies."""
        try:
            if not self.reservation:
                return True
            
            start_hour = self.reservation.datetime_start.hour
            
            # Peak hours definition (18:00-22:00)
            if 18 <= start_hour < 22:
                # Check if user has peak hours access
                if hasattr(self.reservation, 'user') and self.reservation.user:
                    user = self.reservation.user
                    
                    # Premium members get priority
                    if hasattr(user, 'membership_type'):
                        if user.membership_type not in ['premium', 'gold', 'platinum']:
                            self.violations.append('Non-premium members have limited peak hours access')
                            return False
                
                # Check advance booking for peak hours
                advance_time = self.reservation.datetime_start - timezone.now()
                if advance_time < timedelta(days=1):
                    self.violations.append('Peak hours require at least 24 hours advance booking')
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f'Error validating peak hours policy: {e}')
            self.violations.append(f'Peak hours validation error: {str(e)}')
            return False
    
    def validate_loyalty_program_rules(self) -> bool:
        """Validate loyalty program specific rules."""
        try:
            if not hasattr(self.reservation, 'user') or not self.reservation.user:
                return True
            
            user = self.reservation.user
            
            # Check loyalty points usage
            if hasattr(self.reservation, 'points_used') and self.reservation.points_used:
                points_used = self.reservation.points_used
                
                # Check if user has enough points
                if hasattr(user, 'loyalty_points'):
                    if user.loyalty_points < points_used:
                        self.violations.append(f'Insufficient loyalty points: {user.loyalty_points} < {points_used}')
                        return False
                
                # Check points usage limits
                if hasattr(self.reservation, 'total_amount') and self.reservation.total_amount:
                    max_points_value = self.reservation.total_amount * Decimal('0.5')  # Max 50% with points
                    points_value = points_used * Decimal('0.01')  # 1 point = 1 cent
                    
                    if points_value > max_points_value:
                        self.violations.append(f'Points usage exceeds 50% limit')
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f'Error validating loyalty program rules: {e}')
            self.violations.append(f'Loyalty program validation error: {str(e)}')
            return False
    
    def validate_group_booking_rules(self) -> bool:
        """Validate group booking specific rules."""
        try:
            if not hasattr(self.reservation, 'player_count'):
                return True
            
            player_count = self.reservation.player_count
            
            # Group booking threshold
            if player_count >= 8:  # Group booking
                # Check advance booking requirement
                advance_time = self.reservation.datetime_start - timezone.now()
                if advance_time < timedelta(days=3):
                    self.violations.append('Group bookings require at least 3 days advance notice')
                    return False
                
                # Check if group deposit is required
                if hasattr(self.reservation, 'deposit_amount'):
                    if not self.reservation.deposit_amount or self.reservation.deposit_amount <= 0:
                        self.violations.append('Group bookings require a deposit')
                        return False
                
                # Check maximum group size
                if player_count > 20:
                    self.violations.append('Maximum group size is 20 players')
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f'Error validating group booking rules: {e}')
            self.violations.append(f'Group booking validation error: {str(e)}')
            return False
