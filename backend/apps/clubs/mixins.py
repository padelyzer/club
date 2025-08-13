"""
Defensive mixins for clubs module.
Provides logging, retry logic, and data validation for stable operations.
"""

import functools
import logging
import time
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, OperationalError, transaction
from django.db.models import Q
from django.utils import timezone

# Configure module logger
logger = logging.getLogger('clubs.defensive')


class DefensiveQueryMixin:
    """
    Mixin that provides defensive database operations with retry logic and logging.
    """
    
    MAX_RETRIES = 3
    RETRY_DELAY = 0.5  # seconds
    CACHE_TIMEOUT = 300  # 5 minutes
    
    def defensive_get(self, **kwargs):
        """
        Safely get object with retry logic and proper error handling.
        """
        cache_key = f"defensive_get_{self.__class__.__name__}_{hash(str(sorted(kwargs.items())))}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for {self.__class__.__name__}.get({kwargs})")
            return cached_result
            
        retries = 0
        last_exception = None
        
        while retries < self.MAX_RETRIES:
            try:
                logger.debug(f"Attempting {self.__class__.__name__}.get({kwargs}) - Attempt {retries + 1}")
                result = self.get(**kwargs)
                
                # Cache successful result
                cache.set(cache_key, result, self.CACHE_TIMEOUT)
                
                if retries > 0:
                    logger.info(f"Successful recovery on attempt {retries + 1} for {self.__class__.__name__}.get({kwargs})")
                
                return result
                
            except (OperationalError, IntegrityError) as e:
                last_exception = e
                retries += 1
                if retries < self.MAX_RETRIES:
                    logger.warning(f"Database error on attempt {retries}, retrying in {self.RETRY_DELAY}s: {e}")
                    time.sleep(self.RETRY_DELAY * retries)  # Exponential backoff
                else:
                    logger.error(f"All retry attempts failed for {self.__class__.__name__}.get({kwargs}): {e}")
            except Exception as e:
                # Don't retry for other exceptions
                logger.error(f"Non-retryable error for {self.__class__.__name__}.get({kwargs}): {e}")
                raise
        
        # All retries failed
        raise last_exception
    
    def defensive_filter(self, **kwargs):
        """
        Safely filter objects with error handling and caching.
        """
        cache_key = f"defensive_filter_{self.__class__.__name__}_{hash(str(sorted(kwargs.items())))}"
        
        # Try cache first for expensive queries
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Cache hit for {self.__class__.__name__}.filter({kwargs})")
            return cached_result
            
        try:
            logger.debug(f"Executing {self.__class__.__name__}.filter({kwargs})")
            result = list(self.filter(**kwargs))  # Evaluate queryset
            
            # Cache result for shorter time than get operations
            cache.set(cache_key, result, self.CACHE_TIMEOUT // 2)
            
            return result
            
        except (OperationalError, IntegrityError) as e:
            logger.error(f"Database error in {self.__class__.__name__}.filter({kwargs}): {e}")
            # Return empty list as fallback
            return []
        except Exception as e:
            logger.error(f"Unexpected error in {self.__class__.__name__}.filter({kwargs}): {e}")
            raise


class DefensiveModelMixin:
    """
    Mixin for models that provides defensive save/delete operations with validation and logging.
    """
    
    def defensive_save(self, *args, **kwargs):
        """
        Save with comprehensive validation and error handling.
        """
        logger.debug(f"Defensive save initiated for {self.__class__.__name__} id={getattr(self, 'id', 'new')}")
        
        try:
            # Pre-save validation
            self.full_clean()
            
            # Custom validation hook
            if hasattr(self, 'defensive_validate'):
                self.defensive_validate()
            
            # Perform save with transaction
            with transaction.atomic():
                result = super().save(*args, **kwargs)
                
                # Clear related caches
                self._clear_defensive_cache()
                
                logger.info(f"Successful defensive save for {self.__class__.__name__} id={self.id}")
                return result
                
        except ValidationError as e:
            logger.warning(f"Validation error in defensive save for {self.__class__.__name__}: {e}")
            raise
        except IntegrityError as e:
            logger.error(f"Integrity error in defensive save for {self.__class__.__name__}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in defensive save for {self.__class__.__name__}: {e}")
            raise
    
    def defensive_delete(self, *args, **kwargs):
        """
        Delete with safety checks and proper logging.
        """
        logger.warning(f"Defensive delete initiated for {self.__class__.__name__} id={self.id}")
        
        try:
            # Pre-delete validation
            if hasattr(self, 'can_be_deleted'):
                if not self.can_be_deleted():
                    raise ValidationError("Object cannot be deleted due to business rules")
            
            # Backup critical data
            if hasattr(self, 'create_deletion_backup'):
                self.create_deletion_backup()
            
            # Perform delete with transaction
            with transaction.atomic():
                result = super().delete(*args, **kwargs)
                
                # Clear related caches
                self._clear_defensive_cache()
                
                logger.warning(f"Successful defensive delete for {self.__class__.__name__} id={self.id}")
                return result
                
        except ValidationError as e:
            logger.error(f"Validation error in defensive delete for {self.__class__.__name__}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in defensive delete for {self.__class__.__name__}: {e}")
            raise
    
    def _clear_defensive_cache(self):
        """
        Clear related cache entries when object is modified.
        """
        try:
            # Clear object-specific cache patterns
            cache_patterns = [
                f"defensive_get_{self.__class__.__name__}_*",
                f"defensive_filter_{self.__class__.__name__}_*",
            ]
            
            # Add custom cache patterns if defined
            if hasattr(self, 'get_cache_patterns'):
                cache_patterns.extend(self.get_cache_patterns())
                
            # Note: In a real implementation, you'd use cache.delete_many or similar
            # For now, we log the patterns that should be cleared
            logger.debug(f"Cache patterns to clear: {cache_patterns}")
            
        except Exception as e:
            logger.warning(f"Error clearing cache for {self.__class__.__name__}: {e}")


class AvailabilityMixin:
    """
    Mixin for Court model to provide defensive availability checking.
    """
    
    @contextmanager
    def availability_check_context(self, date, start_time, end_time):
        """
        Context manager for availability checks with proper error handling.
        """
        check_id = f"availability_check_{self.id}_{date}_{start_time}_{end_time}"
        logger.debug(f"Starting availability check: {check_id}")
        
        try:
            # Acquire distributed lock if needed (placeholder)
            # In production, you'd use Redis or similar
            yield
            logger.debug(f"Completed availability check: {check_id}")
        except Exception as e:
            logger.error(f"Error in availability check {check_id}: {e}")
            raise
        finally:
            # Release locks, cleanup, etc.
            pass
    
    def defensive_is_available(self, date, start_time, end_time, exclude_reservation_id=None):
        """
        Comprehensive availability check with all edge cases handled.
        """
        with self.availability_check_context(date, start_time, end_time):
            try:
                # Basic checks
                if not self.is_active:
                    logger.debug(f"Court {self.id} is inactive")
                    return False, "Court is inactive"
                
                if self.is_maintenance:
                    logger.debug(f"Court {self.id} is under maintenance")
                    return False, "Court is under maintenance"
                
                # Check maintenance schedules
                if hasattr(self, 'maintenance_records'):
                    blocking_maintenance = self.maintenance_records.filter(
                        status__in=['scheduled', 'in_progress'],
                        scheduled_date__date=date
                    ).first()
                    
                    if blocking_maintenance and blocking_maintenance.blocks_reservations(date, start_time, end_time):
                        logger.debug(f"Court {self.id} blocked by maintenance: {blocking_maintenance.id}")
                        return False, f"Court blocked by maintenance: {blocking_maintenance.title}"
                
                # Check reservation conflicts
                conflicting_reservations = self.reservations.filter(
                    date=date,
                    status__in=['pending', 'confirmed']
                ).exclude(id=exclude_reservation_id) if exclude_reservation_id else self.reservations.filter(
                    date=date,
                    status__in=['pending', 'confirmed']
                )
                
                for reservation in conflicting_reservations:
                    if (start_time < reservation.end_time and end_time > reservation.start_time):
                        logger.debug(f"Court {self.id} blocked by reservation: {reservation.id}")
                        return False, f"Court blocked by reservation: {reservation.id}"
                
                # Check blocked slots
                if hasattr(self, 'blocked_slots'):
                    from datetime import datetime
                    start_datetime = timezone.make_aware(datetime.combine(date, start_time))
                    end_datetime = timezone.make_aware(datetime.combine(date, end_time))
                    
                    blocking_slots = self.blocked_slots.filter(
                        start_datetime__lt=end_datetime,
                        end_datetime__gt=start_datetime,
                        is_active=True
                    )
                    
                    if blocking_slots.exists():
                        blocking_slot = blocking_slots.first()
                        logger.debug(f"Court {self.id} blocked by slot: {blocking_slot.id}")
                        return False, f"Court blocked: {blocking_slot.reason}"
                
                logger.debug(f"Court {self.id} is available for {date} {start_time}-{end_time}")
                return True, "Available"
                
            except Exception as e:
                logger.error(f"Error checking availability for court {self.id}: {e}")
                return False, f"Error checking availability: {str(e)}"


class PricingMixin:
    """
    Mixin for Court model to provide defensive pricing calculations.
    """
    
    def defensive_calculate_price(self, date, start_time, end_time, duration_minutes=None):
        """
        Calculate price with all edge cases and validation.
        """
        try:
            # Calculate duration if not provided
            if duration_minutes is None:
                from datetime import datetime
                start_datetime = datetime.combine(date, start_time)
                end_datetime = datetime.combine(date, end_time)
                duration_minutes = int((end_datetime - start_datetime).total_seconds() / 60)
            
            if duration_minutes <= 0:
                logger.error(f"Invalid duration for pricing: {duration_minutes}")
                raise ValidationError("Duration must be positive")
            
            # Get base price
            base_price = self.price_per_hour or Decimal('0.00')
            
            # Check for special pricing
            special_price = None
            if hasattr(self, 'special_pricing_periods'):
                from .models import CourtSpecialPricing
                special_pricing = CourtSpecialPricing.get_active_pricing_for_court_datetime(
                    self, date, start_time
                )
                if special_pricing:
                    special_price = special_pricing.price_per_hour
                    logger.debug(f"Applied special pricing {special_pricing.id}: ${special_price}/hour")
            
            # Calculate total price
            effective_price = special_price or base_price
            total_price = (effective_price * Decimal(duration_minutes)) / Decimal('60')
            
            # Round to 2 decimal places
            total_price = total_price.quantize(Decimal('0.01'))
            
            logger.debug(f"Calculated price for court {self.id}: ${total_price} ({duration_minutes}min @ ${effective_price}/hour)")
            
            return {
                'base_price': base_price,
                'special_price': special_price,
                'effective_price': effective_price,
                'duration_minutes': duration_minutes,
                'total_price': total_price,
                'special_pricing_applied': special_price is not None
            }
            
        except Exception as e:
            logger.error(f"Error calculating price for court {self.id}: {e}")
            raise ValidationError(f"Error calculating price: {str(e)}")


class IntegrityValidationMixin:
    """
    Mixin that provides comprehensive data integrity validations.
    """
    
    def validate_multi_tenant_consistency(self):
        """
        Validate that organization/club relationships are consistent.
        """
        if hasattr(self, 'organization') and hasattr(self, 'club'):
            if self.club and self.organization != self.club.organization:
                raise ValidationError(
                    f"Organization mismatch: {self.organization} != {self.club.organization}"
                )
        
    def validate_business_rules(self):
        """
        Hook for model-specific business rule validation.
        Override in specific models.
        """
        pass
    
    def defensive_validate(self):
        """
        Comprehensive validation including multi-tenancy and business rules.
        """
        try:
            self.validate_multi_tenant_consistency()
            self.validate_business_rules()
            logger.debug(f"Defensive validation passed for {self.__class__.__name__} id={getattr(self, 'id', 'new')}")
        except ValidationError as e:
            logger.warning(f"Defensive validation failed for {self.__class__.__name__}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in defensive validation for {self.__class__.__name__}: {e}")
            raise ValidationError(f"Validation error: {str(e)}")


def defensive_method(max_retries=3, retry_delay=0.5, log_errors=True):
    """
    Decorator for methods that need defensive execution with retry logic.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            last_exception = None
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except (OperationalError, IntegrityError) as e:
                    last_exception = e
                    retries += 1
                    if retries < max_retries:
                        if log_errors:
                            logger.warning(f"Retryable error in {func.__name__} (attempt {retries}): {e}")
                        time.sleep(retry_delay * retries)
                    else:
                        if log_errors:
                            logger.error(f"All retry attempts failed for {func.__name__}: {e}")
                except Exception as e:
                    if log_errors:
                        logger.error(f"Non-retryable error in {func.__name__}: {e}")
                    raise
            
            raise last_exception
        return wrapper
    return decorator


def cache_result(timeout=300, key_prefix=""):
    """
    Decorator to cache method results with automatic cache invalidation.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}{self.__class__.__name__}_{func.__name__}_{self.id}_{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return result
            
            # Execute function
            result = func(self, *args, **kwargs)
            
            # Cache result
            cache.set(cache_key, result, timeout)
            logger.debug(f"Cached result for {func.__name__}")
            
            return result
        return wrapper
    return decorator


class AuditMixin:
    """
    Mixin that provides audit trail functionality for critical operations.
    """
    
    def create_audit_log(self, action, details=None, user=None):
        """
        Create audit log entry for critical operations.
        """
        try:
            audit_data = {
                'timestamp': timezone.now().isoformat(),
                'model': self.__class__.__name__,
                'object_id': getattr(self, 'id', None),
                'action': action,
                'details': details or {},
                'user_id': getattr(user, 'id', None) if user else None,
            }
            
            logger.info(f"AUDIT: {audit_data}")
            
            # In production, you'd save this to a dedicated audit table
            # For now, we're just logging it
            
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")
    
    def create_deletion_backup(self):
        """
        Create backup of object data before deletion.
        """
        try:
            backup_data = {
                'model': self.__class__.__name__,
                'object_id': self.id,
                'data': self.__dict__.copy(),
                'timestamp': timezone.now().isoformat(),
            }
            
            # Remove non-serializable items
            for key in list(backup_data['data'].keys()):
                if key.startswith('_'):
                    del backup_data['data'][key]
            
            logger.warning(f"DELETION_BACKUP: {backup_data}")
            
            # In production, you'd save this to a backup table or external storage
            
        except Exception as e:
            logger.error(f"Error creating deletion backup: {e}")


class ClubSafetyMixin:
    """
    Safety mixin for club operations with validation and error handling.
    """
    
    def get_club_safe(self, club_id, user=None):
        """
        Safely get club with permission validation.
        """
        try:
            from .models import Club
            
            if user and hasattr(user, 'organization'):
                # Filter by user's organization for multi-tenant safety
                club = Club.objects.filter(
                    id=club_id,
                    organization=user.organization
                ).first()
                
                if not club:
                    logger.warning(f"Club {club_id} not found or not accessible by user {user.id}")
                    return None
                    
                return club
            else:
                # Fallback without user context
                club = Club.objects.filter(id=club_id).first()
                if not club:
                    logger.warning(f"Club {club_id} not found")
                
                return club
                
        except Exception as e:
            logger.error(f"Error getting club {club_id}: {e}")
            return None
    
    def validate_club_access(self, club, user):
        """
        Validate user has access to club.
        """
        if not club:
            return False, "Club not found"
            
        if not user or not user.is_authenticated:
            return False, "Authentication required"
            
        # Check organization match for multi-tenant safety
        if hasattr(user, 'organization') and club.organization != user.organization:
            return False, "Access denied to this club"
            
        return True, "Access granted"