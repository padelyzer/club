"""
Defensive mixins for reservations module.
Provides logging, retry logic, and data validation for stable reservation operations.
Based on the successful clubs module stabilization pattern.
"""

import functools
import logging
import time
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, OperationalError, transaction
from django.db.models import Q, F
from django.utils import timezone

# Configure module logger
logger = logging.getLogger('reservations.defensive')


class DefensiveReservationMixin:
    """
    Mixin that provides defensive database operations for reservations
    with retry logic, caching, and comprehensive logging.
    """
    
    MAX_RETRIES = 3
    RETRY_DELAY = 0.5  # seconds
    CACHE_TIMEOUT = 300  # 5 minutes
    
    def defensive_get_reservation(self, **kwargs):
        """
        Safely get reservation with retry logic and proper error handling.
        """
        cache_key = f"defensive_reservation_{hash(str(sorted(kwargs.items())))}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for reservation.get({kwargs})")
            return cached_result
            
        retries = 0
        last_exception = None
        
        while retries < self.MAX_RETRIES:
            try:
                logger.debug(f"Attempting reservation.get({kwargs}) - Attempt {retries + 1}")
                result = self.get(**kwargs)
                
                # Cache successful result
                cache.set(cache_key, result, self.CACHE_TIMEOUT)
                logger.debug(f"Successfully retrieved and cached reservation: {kwargs}")
                return result
                
            except (OperationalError, IntegrityError) as e:
                last_exception = e
                retries += 1
                
                if retries < self.MAX_RETRIES:
                    sleep_time = self.RETRY_DELAY * (2 ** (retries - 1))  # exponential backoff
                    logger.warning(f"Database error on attempt {retries}, retrying in {sleep_time}s: {e}")
                    time.sleep(sleep_time)
                else:
                    logger.error(f"Failed to retrieve reservation after {self.MAX_RETRIES} attempts: {e}")
                    
            except Exception as e:
                logger.error(f"Non-retryable error retrieving reservation: {e}")
                raise
                
        raise last_exception
    
    def defensive_filter_reservations(self, **kwargs):
        """
        Safely filter reservations with retry logic and caching.
        """
        cache_key = f"defensive_filter_reservations_{hash(str(sorted(kwargs.items())))}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Cache hit for reservations filter: {kwargs}")
            return cached_result
            
        retries = 0
        last_exception = None
        
        while retries < self.MAX_RETRIES:
            try:
                logger.debug(f"Attempting reservations filter({kwargs}) - Attempt {retries + 1}")
                queryset = self.filter(**kwargs)
                result = list(queryset)  # Evaluate queryset
                
                # Cache successful result
                cache.set(cache_key, result, self.CACHE_TIMEOUT)
                logger.debug(f"Successfully filtered and cached {len(result)} reservations")
                return result
                
            except (OperationalError, IntegrityError) as e:
                last_exception = e
                retries += 1
                
                if retries < self.MAX_RETRIES:
                    sleep_time = self.RETRY_DELAY * (2 ** (retries - 1))
                    logger.warning(f"Database error on attempt {retries}, retrying in {sleep_time}s: {e}")
                    time.sleep(sleep_time)
                else:
                    logger.error(f"Failed to filter reservations after {self.MAX_RETRIES} attempts: {e}")
                    
            except Exception as e:
                logger.error(f"Non-retryable error filtering reservations: {e}")
                raise
                
        raise last_exception


class ReservationSafetyMixin:
    """
    Main safety mixin based on ClubSafetyMixin pattern.
    Provides comprehensive safety features for reservation operations.
    """
    
    def get_reservation_safe(self, reservation_id, user=None):
        """
        Safely obtain reservation with permission validation.
        
        Args:
            reservation_id: UUID of the reservation
            user: User requesting access (for permission validation)
            
        Returns:
            Reservation object or None if not found/no permission
        """
        try:
            from apps.reservations.models import Reservation
            
            reservation = Reservation.objects.select_related(
                'club', 'court', 'user', 'organization', 'created_by'
            ).get(id=reservation_id)
            
            # Validate permissions if user is provided
            if user and reservation.user != user:
                # Check if user has permission to view any reservation
                if not user.has_perm('reservations.view_reservation'):
                    # Check if user is club admin for this reservation's club
                    if hasattr(user, 'profile') and user.profile.club != reservation.club:
                        logger.warning(f'User {user.id} tried to access reservation {reservation_id} without permission')
                        return None
                        
            logger.info(f'Successfully retrieved reservation {reservation_id} for user {user.id if user else "system"}')
            return reservation
            
        except Reservation.DoesNotExist:
            logger.error(f'Reservation {reservation_id} not found')
            return None
        except Exception as e:
            logger.error(f'Unexpected error retrieving reservation {reservation_id}: {e}')
            return None
    
    def prevent_double_booking(self, court, datetime_start, datetime_end, exclude_reservation=None):
        """
        Prevent double booking with optimistic locking and atomic operations.
        
        Args:
            court: Court object
            datetime_start: Start datetime
            datetime_end: End datetime  
            exclude_reservation: Reservation to exclude (for updates)
            
        Returns:
            True if slot is available, raises ValidationError otherwise
            
        Raises:
            ValidationError: If court is already booked for this time
        """
        try:
            with transaction.atomic():
                from apps.reservations.models import Reservation
                
                # Lock the court for update to prevent race conditions
                from apps.clubs.models import Court
                locked_court = Court.objects.select_for_update().get(id=court.id)
                
                # Build query for overlapping reservations
                overlapping_query = Q(
                    court=locked_court,
                    status__in=['confirmed', 'pending'],  # Only confirmed and pending reservations
                    datetime_start__lt=datetime_end,
                    datetime_end__gt=datetime_start
                )
                
                # Exclude current reservation if provided (for updates)
                if exclude_reservation:
                    overlapping_query &= ~Q(id=exclude_reservation.id)
                
                overlapping_reservations = Reservation.objects.filter(overlapping_query)
                
                if overlapping_reservations.exists():
                    overlapping = overlapping_reservations.first()
                    logger.error(
                        f'Double booking prevented: Court {court.id} already booked '
                        f'from {overlapping.datetime_start} to {overlapping.datetime_end} '
                        f'(reservation {overlapping.id})'
                    )
                    raise ValidationError(
                        f'Court {court.name} is already booked from '
                        f'{overlapping.datetime_start.strftime("%H:%M")} to '
                        f'{overlapping.datetime_end.strftime("%H:%M")}'
                    )
                
                logger.info(f'Slot available: Court {court.id} from {datetime_start} to {datetime_end}')
                return True
                
        except Exception as e:
            logger.error(f'Error checking availability for court {court.id}: {e}')
            raise
    
    def calculate_reservation_price_safe(self, court, datetime_start, datetime_end, player_count=2):
        """
        Safely calculate reservation price with fallback logic.
        
        Args:
            court: Court object
            datetime_start: Start datetime
            datetime_end: End datetime
            player_count: Number of players
            
        Returns:
            Dict with price information or safe defaults
        """
        try:
            duration_hours = (datetime_end - datetime_start).total_seconds() / 3600
            
            # Get base price from court
            base_price = getattr(court, 'price_per_hour', Decimal('50.00'))
            if not base_price:
                base_price = Decimal('50.00')  # Safe default
                logger.warning(f'Using default price for court {court.id}')
            
            # Calculate base cost
            base_cost = base_price * Decimal(str(duration_hours))
            
            # Apply time-based multipliers
            hour = datetime_start.hour
            multiplier = Decimal('1.0')
            
            # Peak hours (18:00-22:00) - 20% surcharge
            if 18 <= hour < 22:
                multiplier = Decimal('1.2')
                logger.debug(f'Applying peak hours multiplier: {multiplier}')
            
            # Weekend surcharge - 10%
            if datetime_start.weekday() >= 5:  # Saturday, Sunday
                multiplier += Decimal('0.1')
                logger.debug(f'Applying weekend surcharge, total multiplier: {multiplier}')
            
            total_price = base_cost * multiplier
            
            # Player-based adjustments (if applicable)
            if player_count > 2:
                player_surcharge = Decimal('5.00') * (player_count - 2)
                total_price += player_surcharge
                logger.debug(f'Added player surcharge: {player_surcharge}')
            
            price_info = {
                'base_price': base_price,
                'duration_hours': duration_hours,
                'base_cost': base_cost,
                'multiplier': multiplier,
                'player_count': player_count,
                'total_price': total_price,
                'currency': 'EUR'
            }
            
            logger.info(f'Calculated price for court {court.id}: €{total_price}')
            return price_info
            
        except Exception as e:
            logger.error(f'Error calculating price for court {court.id}: {e}')
            # Return safe default pricing
            return {
                'base_price': Decimal('50.00'),
                'duration_hours': 1.0,
                'base_cost': Decimal('50.00'),
                'multiplier': Decimal('1.0'),
                'player_count': player_count,
                'total_price': Decimal('50.00'),
                'currency': 'EUR',
                'error': 'Used default pricing due to calculation error'
            }
    
    def validate_reservation_time_safe(self, court, datetime_start, datetime_end):
        """
        Safely validate reservation time constraints.
        
        Args:
            court: Court object
            datetime_start: Start datetime
            datetime_end: End datetime
            
        Returns:
            Dict with validation results
        """
        try:
            errors = []
            warnings = []
            
            # Check if in the past
            now = timezone.now()
            if datetime_start <= now:
                errors.append('Cannot create reservation in the past')
            
            # Check duration
            duration = datetime_end - datetime_start
            min_duration = timedelta(hours=1)
            max_duration = timedelta(hours=4)
            
            if duration < min_duration:
                errors.append(f'Minimum reservation duration is {min_duration}')
            
            if duration > max_duration:
                warnings.append(f'Long reservation duration: {duration}')
            
            # Check court operating hours
            start_time = datetime_start.time()
            end_time = datetime_end.time()
            
            court_open = getattr(court, 'opening_time', time(6, 0))  # Default 6:00 AM
            court_close = getattr(court, 'closing_time', time(23, 0))  # Default 11:00 PM
            
            if start_time < court_open or end_time > court_close:
                errors.append(f'Court operating hours: {court_open} - {court_close}')
            
            # Check advance booking limits
            advance_days = (datetime_start.date() - now.date()).days
            max_advance = getattr(court.club, 'max_advance_booking_days', 30)
            
            if advance_days > max_advance:
                errors.append(f'Maximum advance booking is {max_advance} days')
            
            is_valid = len(errors) == 0
            
            result = {
                'is_valid': is_valid,
                'errors': errors,
                'warnings': warnings,
                'duration': duration,
                'advance_days': advance_days
            }
            
            if is_valid:
                logger.info(f'Reservation time validation passed for court {court.id}')
            else:
                logger.warning(f'Reservation time validation failed for court {court.id}: {errors}')
            
            return result
            
        except Exception as e:
            logger.error(f'Error validating reservation time for court {court.id}: {e}')
            return {
                'is_valid': False,
                'errors': [f'Validation error: {str(e)}'],
                'warnings': [],
                'duration': None,
                'advance_days': None
            }
    
    def create_reservation_atomic(self, reservation_data):
        """
        Create reservation atomically with comprehensive validation.
        
        Args:
            reservation_data: Dictionary with reservation information
            
        Returns:
            Created reservation object or raises ValidationError
        """
        try:
            with transaction.atomic():
                from apps.reservations.models import Reservation
                
                # Extract required data
                court = reservation_data['court']
                datetime_start = reservation_data['datetime_start']
                datetime_end = reservation_data['datetime_end']
                
                # Validate time constraints
                time_validation = self.validate_reservation_time_safe(court, datetime_start, datetime_end)
                if not time_validation['is_valid']:
                    raise ValidationError(time_validation['errors'])
                
                # Prevent double booking
                self.prevent_double_booking(court, datetime_start, datetime_end)
                
                # Calculate pricing
                price_info = self.calculate_reservation_price_safe(
                    court, datetime_start, datetime_end, 
                    reservation_data.get('player_count', 2)
                )
                
                # Create reservation with calculated data
                reservation_data['total_amount'] = price_info['total_price']
                reservation_data['price_calculation'] = price_info
                
                reservation = Reservation.objects.create(**reservation_data)
                
                # Invalidate related caches
                self.invalidate_reservation_caches(court, datetime_start.date())
                
                logger.info(f'Successfully created reservation {reservation.id}')
                return reservation
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f'Unexpected error creating reservation: {e}')
            raise ValidationError(f'Unable to create reservation: {str(e)}')
    
    def cancel_reservation_safe(self, reservation, reason='user_requested', refund_amount=None):
        """
        Safely cancel reservation with proper cleanup and audit trail.
        
        Args:
            reservation: Reservation object
            reason: Cancellation reason
            refund_amount: Amount to refund (if applicable)
            
        Returns:
            Updated reservation object
        """
        try:
            with transaction.atomic():
                # Lock reservation for update
                from apps.reservations.models import Reservation
                locked_reservation = Reservation.objects.select_for_update().get(id=reservation.id)
                
                if locked_reservation.status in ['cancelled', 'completed']:
                    raise ValidationError(f'Cannot cancel reservation with status: {locked_reservation.status}')
                
                # Store original status for audit
                original_status = locked_reservation.status
                
                # Update reservation status
                locked_reservation.status = 'cancelled'
                locked_reservation.cancelled_at = timezone.now()
                locked_reservation.cancellation_reason = reason
                
                if refund_amount is not None:
                    locked_reservation.refund_amount = refund_amount
                    locked_reservation.payment_status = 'refunded'
                
                locked_reservation.save()
                
                # Invalidate caches
                self.invalidate_reservation_caches(locked_reservation.court, locked_reservation.datetime_start.date())
                
                logger.info(
                    f'Successfully cancelled reservation {reservation.id} '
                    f'(was {original_status}, reason: {reason})'
                )
                
                return locked_reservation
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f'Error cancelling reservation {reservation.id}: {e}')
            raise ValidationError(f'Unable to cancel reservation: {str(e)}')
    
    def invalidate_reservation_caches(self, court, date):
        """
        Invalidate all relevant caches for a court and date.
        
        Args:
            court: Court object
            date: Date object
        """
        try:
            cache_patterns = [
                f"court_availability_{court.id}_{date}",
                f"court_reservations_{court.id}_{date}",
                f"club_availability_{court.club.id}_{date}",
                f"defensive_filter_reservations_*court*{court.id}*",
                f"defensive_reservation_*court*{court.id}*"
            ]
            
            # Clear specific caches
            for pattern in cache_patterns:
                if '*' in pattern:
                    # For patterns with wildcards, we'd need a more sophisticated cache clearing
                    # For now, just clear the basic ones
                    continue
                cache.delete(pattern)
            
            # Clear general availability cache
            cache.delete(f"availability_{court.club.slug}_{date}")
            
            logger.debug(f'Invalidated caches for court {court.id} on {date}')
            
        except Exception as e:
            logger.error(f'Error invalidating caches for court {court.id}: {e}')


class ReservationAuditMixin:
    """
    Mixin for audit trail and logging of critical reservation operations.
    """
    
    def audit_reservation_change(self, reservation, action, user=None, metadata=None):
        """
        Create audit entry for reservation changes.
        
        Args:
            reservation: Reservation object
            action: Action performed (create, update, cancel, etc.)
            user: User performing the action
            metadata: Additional metadata dict
        """
        try:
            audit_data = {
                'reservation_id': str(reservation.id),
                'action': action,
                'user_id': user.id if user else None,
                'timestamp': timezone.now().isoformat(),
                'club_id': str(reservation.club.id),
                'court_id': str(reservation.court.id),
                'status': reservation.status,
                'metadata': metadata or {}
            }
            
            # Log audit entry
            logger.info(f'AUDIT: {action} reservation {reservation.id} by user {user.id if user else "system"}')
            
            # Here you could also save to an audit table if needed
            # AuditLog.objects.create(**audit_data)
            
        except Exception as e:
            logger.error(f'Error creating audit entry for reservation {reservation.id}: {e}')


class ReservationHealthMixin:
    """
    Mixin for health checks and monitoring of reservation operations.
    """
    
    def check_reservation_health(self):
        """
        Perform health checks on reservation system.
        
        Returns:
            Dict with health status information
        """
        health_status = {
            'overall_healthy': True,
            'checks': {},
            'timestamp': timezone.now().isoformat()
        }
        
        try:
            from apps.reservations.models import Reservation
            from django.db import connection
            
            # Check database connectivity
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                health_status['checks']['database'] = {'status': 'healthy', 'response_time_ms': None}
            except Exception as e:
                health_status['checks']['database'] = {'status': 'unhealthy', 'error': str(e)}
                health_status['overall_healthy'] = False
            
            # Check if we can query reservations
            try:
                count = Reservation.objects.count()
                health_status['checks']['reservation_queries'] = {
                    'status': 'healthy',
                    'total_reservations': count
                }
            except Exception as e:
                health_status['checks']['reservation_queries'] = {'status': 'unhealthy', 'error': str(e)}
                health_status['overall_healthy'] = False
            
            # Check for recent reservations (system activity)
            try:
                recent_count = Reservation.objects.filter(
                    created_at__gte=timezone.now() - timedelta(hours=24)
                ).count()
                health_status['checks']['recent_activity'] = {
                    'status': 'healthy',
                    'reservations_last_24h': recent_count
                }
            except Exception as e:
                health_status['checks']['recent_activity'] = {'status': 'unhealthy', 'error': str(e)}
                health_status['overall_healthy'] = False
            
            return health_status
            
        except Exception as e:
            logger.error(f'Error performing reservation health check: {e}')
            return {
                'overall_healthy': False,
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }


# Helper function for easy import
def get_reservation_safe(reservation_id, user=None):
    """
    Convenience function to safely get a reservation.
    """
    mixin = ReservationSafetyMixin()
    return mixin.get_reservation_safe(reservation_id, user)