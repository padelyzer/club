"""
Comprehensive validation system for clubs module.
Provides integrity validators with cascade checking for related models.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger('clubs.validators')


class ClubIntegrityValidator:
    """
    Master validator for Club model and all its related entities.
    Performs comprehensive cascade validation to ensure data integrity.
    """
    
    def __init__(self, club):
        self.club = club
        self.errors = []
        self.warnings = []
        
    def validate_all(self) -> Dict[str, any]:
        """
        Run all validation checks and return comprehensive report.
        """
        logger.info(f"Starting comprehensive validation for Club {self.club.id}: {self.club.name}")
        
        # Reset error lists
        self.errors = []
        self.warnings = []
        
        try:
            # Core club validation
            self._validate_club_core()
            
            # Related entities validation
            self._validate_organization_consistency()
            self._validate_courts_integrity()
            self._validate_reservations_consistency()
            self._validate_clients_consistency()
            self._validate_schedules_integrity()
            self._validate_maintenance_consistency()
            self._validate_financial_integrity()
            
            # Business rules validation
            self._validate_business_rules()
            
            # Performance validation
            self._validate_performance_metrics()
            
        except Exception as e:
            logger.error(f"Unexpected error during validation: {e}")
            self.errors.append(f"Validation system error: {str(e)}")
        
        result = {
            'club_id': self.club.id,
            'club_name': self.club.name,
            'validation_timestamp': timezone.now(),
            'is_valid': len(self.errors) == 0,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': self.errors,
            'warnings': self.warnings,
            'status': 'VALID' if len(self.errors) == 0 else 'INVALID'
        }
        
        if result['is_valid']:
            logger.info(f"✅ Club {self.club.id} passed all validation checks")
        else:
            logger.error(f"❌ Club {self.club.id} failed validation with {len(self.errors)} errors")
            
        return result
    
    def _validate_club_core(self):
        """
        Validate core Club model fields and constraints.
        """
        # Required fields validation
        if not self.club.name or len(self.club.name.strip()) < 2:
            self.errors.append("Club name is required and must be at least 2 characters")
        
        if not self.club.slug:
            self.errors.append("Club slug is required")
        elif not self.club.slug.isidentifier():
            self.warnings.append("Club slug should follow identifier naming conventions")
        
        if not self.club.email:
            self.errors.append("Club email is required")
        elif '@' not in self.club.email:
            self.errors.append("Club email format is invalid")
        
        if not self.club.phone:
            self.warnings.append("Club phone number is recommended")
        
        # Schedule validation
        if hasattr(self.club, 'opening_time') and hasattr(self.club, 'closing_time'):
            if self.club.opening_time >= self.club.closing_time:
                self.errors.append("Opening time must be before closing time")
        
        # Geographic validation
        if self.club.latitude is not None:
            if not (-90 <= float(self.club.latitude) <= 90):
                self.errors.append("Latitude must be between -90 and 90")
        
        if self.club.longitude is not None:
            if not (-180 <= float(self.club.longitude) <= 180):
                self.errors.append("Longitude must be between -180 and 180")
        
        # Metrics validation
        if self.club.total_courts < 0:
            self.errors.append("Total courts cannot be negative")
        
        if self.club.total_members < 0:
            self.errors.append("Total members cannot be negative")
    
    def _validate_organization_consistency(self):
        """
        Validate organization relationship and multi-tenant consistency.
        """
        if not self.club.organization:
            self.errors.append("Club must belong to an organization")
            return
        
        if not self.club.organization.is_active:
            self.errors.append("Club cannot be active if organization is inactive")
        
        # Check for orphaned relationships
        try:
            org = self.club.organization
            if not hasattr(org, 'clubs') or self.club not in org.clubs.all():
                self.errors.append("Club-Organization relationship is inconsistent")
        except Exception as e:
            self.errors.append(f"Cannot validate organization relationship: {e}")
    
    def _validate_courts_integrity(self):
        """
        Validate all courts belonging to this club.
        """
        courts = self.club.courts.all()
        
        if not courts.exists():
            self.warnings.append("Club has no courts defined")
            return
        
        active_courts = courts.filter(is_active=True)
        if not active_courts.exists():
            self.warnings.append("Club has no active courts")
        
        # Validate court numbers are unique
        court_numbers = list(courts.values_list('number', flat=True))
        if len(court_numbers) != len(set(court_numbers)):
            self.errors.append("Court numbers must be unique within the club")
        
        # Validate each court
        for court in courts:
            self._validate_single_court(court)
        
        # Update total_courts metric
        actual_court_count = courts.count()
        if self.club.total_courts != actual_court_count:
            self.warnings.append(f"Total courts metric ({self.club.total_courts}) doesn't match actual count ({actual_court_count})")
    
    def _validate_single_court(self, court):
        """
        Validate individual court integrity.
        """
        # Organization consistency
        if court.organization != self.club.organization:
            self.errors.append(f"Court {court.id} organization mismatch with club")
        
        # Price validation
        if court.price_per_hour < 0:
            self.errors.append(f"Court {court.id} cannot have negative price")
        elif court.price_per_hour == 0:
            self.warnings.append(f"Court {court.id} has zero price - confirm this is intentional")
        
        # Special pricing validation
        if hasattr(court, 'special_pricing_periods'):
            for pricing in court.special_pricing_periods.filter(is_active=True):
                if pricing.price_per_hour < 0:
                    self.errors.append(f"Court {court.id} special pricing cannot be negative")
                if pricing.end_date < pricing.start_date:
                    self.errors.append(f"Court {court.id} special pricing has invalid date range")
    
    def _validate_reservations_consistency(self):
        """
        Validate reservations related to this club.
        """
        # Get all reservations for this club
        reservations = self._get_club_reservations()
        
        if not reservations.exists():
            self.warnings.append("Club has no reservations")
            return
        
        # Validate reservation integrity
        for reservation in reservations.select_related('court', 'club'):
            self._validate_single_reservation(reservation)
        
        # Check for overlapping reservations
        self._validate_reservation_overlaps()
        
        # Validate pricing consistency
        self._validate_reservation_pricing()
    
    def _get_club_reservations(self):
        """
        Get all reservations for this club's courts.
        """
        from apps.reservations.models import Reservation
        return Reservation.objects.filter(club=self.club)
    
    def _validate_single_reservation(self, reservation):
        """
        Validate individual reservation integrity.
        """
        # Basic field validation
        if reservation.start_time >= reservation.end_time:
            self.errors.append(f"Reservation {reservation.id} has invalid time range")
        
        # Organization consistency
        if reservation.organization != self.club.organization:
            self.errors.append(f"Reservation {reservation.id} organization mismatch")
        
        # Court belongs to club validation
        if reservation.court.club != self.club:
            self.errors.append(f"Reservation {reservation.id} court doesn't belong to this club")
        
        # Price validation
        if reservation.total_price < 0:
            self.errors.append(f"Reservation {reservation.id} cannot have negative price")
        
        # Status validation
        if reservation.status not in ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']:
            self.errors.append(f"Reservation {reservation.id} has invalid status: {reservation.status}")
    
    def _validate_reservation_overlaps(self):
        """
        Check for overlapping reservations on the same court.
        """
        reservations = self._get_club_reservations().filter(
            status__in=['pending', 'confirmed']
        ).order_by('court', 'date', 'start_time')
        
        court_reservations = {}
        for reservation in reservations:
            court_id = reservation.court_id
            if court_id not in court_reservations:
                court_reservations[court_id] = []
            court_reservations[court_id].append(reservation)
        
        for court_id, court_reservations_list in court_reservations.items():
            for i in range(len(court_reservations_list) - 1):
                current = court_reservations_list[i]
                next_reservation = court_reservations_list[i + 1]
                
                # Check if same date and overlapping times
                if (current.date == next_reservation.date and
                    current.end_time > next_reservation.start_time):
                    self.errors.append(
                        f"Overlapping reservations: {current.id} and {next_reservation.id} "
                        f"on court {court_id} on {current.date}"
                    )
    
    def _validate_reservation_pricing(self):
        """
        Validate reservation pricing consistency with court prices.
        """
        reservations = self._get_club_reservations().select_related('court')
        
        for reservation in reservations:
            if reservation.price_per_hour and reservation.court.price_per_hour:
                # Allow for special pricing, but warn about significant discrepancies
                price_diff = abs(reservation.price_per_hour - reservation.court.price_per_hour)
                if price_diff > reservation.court.price_per_hour * Decimal('0.5'):  # 50% difference
                    self.warnings.append(
                        f"Reservation {reservation.id} price significantly differs from court price"
                    )
    
    def _validate_clients_consistency(self):
        """
        Validate clients related to this club.
        """
        from apps.clients.models import ClientProfile
        
        try:
            clients = ClientProfile.objects.filter(club=self.club)
            
            if not clients.exists():
                self.warnings.append("Club has no registered clients")
                return
            
            # Validate client integrity
            for client in clients.select_related('user', 'organization'):
                self._validate_single_client(client)
            
            # Update total_members metric
            actual_client_count = clients.count()
            if self.club.total_members != actual_client_count:
                self.warnings.append(
                    f"Total members metric ({self.club.total_members}) "
                    f"doesn't match actual count ({actual_client_count})"
                )
                
        except ImportError:
            self.warnings.append("Cannot validate clients - clients module not available")
        except Exception as e:
            self.errors.append(f"Error validating clients: {e}")
    
    def _validate_single_client(self, client):
        """
        Validate individual client profile integrity.
        """
        # Organization consistency
        if hasattr(client, 'organization') and client.organization != self.club.organization:
            self.errors.append(f"Client {client.id} organization mismatch")
        
        # User relationship validation
        if not client.user:
            self.errors.append(f"Client {client.id} must have associated user")
        elif not client.user.is_active:
            self.warnings.append(f"Client {client.id} has inactive user account")
    
    def _validate_schedules_integrity(self):
        """
        Validate club schedules and hours.
        """
        if not hasattr(self.club, 'schedules'):
            return
            
        schedules = self.club.schedules.all()
        
        if not schedules.exists():
            self.warnings.append("Club has no detailed schedules defined")
            return
        
        # Check for duplicate weekdays
        weekdays = list(schedules.values_list('weekday', flat=True))
        if len(weekdays) != len(set(weekdays)):
            self.errors.append("Duplicate weekday schedules found")
        
        # Validate individual schedules
        for schedule in schedules:
            if schedule.opening_time >= schedule.closing_time:
                self.errors.append(f"Invalid schedule for {schedule.get_weekday_display()}")
            
            if schedule.organization != self.club.organization:
                self.errors.append(f"Schedule organization mismatch for {schedule.get_weekday_display()}")
    
    def _validate_maintenance_consistency(self):
        """
        Validate maintenance records and schedules.
        """
        if not hasattr(self.club, 'maintenance_records'):
            return
            
        maintenance_records = self.club.maintenance_records.all()
        
        for record in maintenance_records:
            # Basic validation
            if record.scheduled_date and record.scheduled_end_date:
                if record.scheduled_end_date <= record.scheduled_date:
                    self.errors.append(f"Maintenance record {record.id} has invalid time range")
            
            # Organization consistency
            if record.organization != self.club.organization:
                self.errors.append(f"Maintenance record {record.id} organization mismatch")
            
            # Court belongs to club
            if record.court and record.court.club != self.club:
                self.errors.append(f"Maintenance record {record.id} court doesn't belong to this club")
    
    def _validate_financial_integrity(self):
        """
        Validate financial data consistency.
        """
        try:
            # Validate reservation payments
            reservations = self._get_club_reservations()
            
            total_expected_revenue = sum(
                r.total_price for r in reservations 
                if r.status in ['confirmed', 'completed'] and r.total_price
            )
            
            total_paid_revenue = sum(
                r.payment_amount for r in reservations 
                if r.payment_status == 'paid' and r.payment_amount
            )
            
            if total_paid_revenue > total_expected_revenue:
                self.errors.append("Paid revenue exceeds expected revenue - possible data corruption")
            
            # Check for negative prices
            negative_price_count = reservations.filter(total_price__lt=0).count()
            if negative_price_count > 0:
                self.errors.append(f"{negative_price_count} reservations have negative prices")
                
        except Exception as e:
            self.warnings.append(f"Could not validate financial integrity: {e}")
    
    def _validate_business_rules(self):
        """
        Validate business-specific rules.
        """
        # Club must have at least one active court to accept reservations
        if self.club.is_active:
            active_courts = self.club.courts.filter(is_active=True).count()
            if active_courts == 0:
                self.warnings.append("Active club should have at least one active court")
        
        # Reservations shouldn't exist for inactive clubs (except historical)
        if not self.club.is_active:
            future_reservations = self._get_club_reservations().filter(
                date__gt=timezone.now().date(),
                status__in=['pending', 'confirmed']
            ).count()
            
            if future_reservations > 0:
                self.warnings.append(
                    f"Inactive club has {future_reservations} future reservations"
                )
        
        # Check for maintenance overlaps
        self._validate_maintenance_overlaps()
    
    def _validate_maintenance_overlaps(self):
        """
        Check for overlapping maintenance schedules.
        """
        if not hasattr(self.club, 'maintenance_records'):
            return
            
        maintenance_records = self.club.maintenance_records.filter(
            status__in=['scheduled', 'in_progress']
        ).order_by('court', 'scheduled_date')
        
        court_maintenance = {}
        for record in maintenance_records:
            court_id = record.court_id
            if court_id not in court_maintenance:
                court_maintenance[court_id] = []
            court_maintenance[court_id].append(record)
        
        for court_id, maintenance_list in court_maintenance.items():
            for i in range(len(maintenance_list) - 1):
                current = maintenance_list[i]
                next_maintenance = maintenance_list[i + 1]
                
                current_end = current.scheduled_end_date or (
                    current.scheduled_date + timedelta(hours=current.get_duration_hours())
                )
                
                if current_end > next_maintenance.scheduled_date:
                    self.warnings.append(
                        f"Overlapping maintenance schedules for court {court_id}: "
                        f"records {current.id} and {next_maintenance.id}"
                    )
    
    def _validate_performance_metrics(self):
        """
        Validate system performance indicators.
        """
        # Check for data volume that might affect performance
        courts_count = self.club.courts.count()
        if courts_count > 50:
            self.warnings.append(f"Club has {courts_count} courts - consider performance optimization")
        
        # Check reservation volume
        reservations_count = self._get_club_reservations().count()
        if reservations_count > 10000:
            self.warnings.append(f"Club has {reservations_count} reservations - consider archiving old data")
        
        # Check for missing indexes (placeholder - would need actual DB introspection)
        self.warnings.append("Consider running database index optimization")


class ReservationIntegrityValidator:
    """
    Specialized validator for reservation integrity within club context.
    """
    
    def __init__(self, reservation):
        self.reservation = reservation
        self.errors = []
        self.warnings = []
    
    def validate_availability_integrity(self) -> Dict[str, any]:
        """
        Validate that reservation doesn't conflict with availability rules.
        """
        court = self.reservation.court
        
        # Use defensive availability check from mixins
        if hasattr(court, 'defensive_is_available'):
            is_available, reason = court.defensive_is_available(
                self.reservation.date,
                self.reservation.start_time,
                self.reservation.end_time,
                exclude_reservation_id=self.reservation.id
            )
            
            if not is_available:
                self.errors.append(f"Court not available: {reason}")
        else:
            self.warnings.append("Court availability check method not available")
        
        return {
            'is_valid': len(self.errors) == 0,
            'errors': self.errors,
            'warnings': self.warnings
        }


class CourtPricingValidator:
    """
    Validator for court pricing integrity and special pricing rules.
    """
    
    def __init__(self, court):
        self.court = court
        self.errors = []
        self.warnings = []
    
    def validate_pricing_integrity(self) -> Dict[str, any]:
        """
        Validate pricing rules and special pricing periods.
        """
        # Base price validation
        if self.court.price_per_hour <= 0:
            self.errors.append("Court must have positive base price")
        
        # Special pricing validation
        if hasattr(self.court, 'special_pricing_periods'):
            special_pricing = self.court.special_pricing_periods.filter(is_active=True)
            
            for pricing in special_pricing:
                # Date range validation
                if pricing.end_date < pricing.start_date:
                    self.errors.append(f"Special pricing {pricing.id} has invalid date range")
                
                # Price validation
                if pricing.price_per_hour <= 0:
                    self.errors.append(f"Special pricing {pricing.id} must have positive price")
                
                # Priority validation
                if not 1 <= pricing.priority <= 10:
                    self.errors.append(f"Special pricing {pricing.id} priority must be 1-10")
            
            # Check for overlapping high-priority periods
            self._validate_pricing_overlaps(special_pricing)
        
        return {
            'is_valid': len(self.errors) == 0,
            'errors': self.errors,
            'warnings': self.warnings
        }
    
    def _validate_pricing_overlaps(self, pricing_periods):
        """
        Validate special pricing period overlaps and priorities.
        """
        periods = list(pricing_periods.order_by('-priority', 'start_date'))
        
        for i in range(len(periods)):
            for j in range(i + 1, len(periods)):
                period1, period2 = periods[i], periods[j]
                
                # Check date overlap
                if (period1.start_date <= period2.end_date and 
                    period1.end_date >= period2.start_date):
                    
                    # Same priority = problem
                    if period1.priority == period2.priority:
                        self.errors.append(
                            f"Overlapping special pricing with same priority: "
                            f"{period1.id} and {period2.id}"
                        )
                    else:
                        self.warnings.append(
                            f"Overlapping special pricing (different priorities): "
                            f"{period1.id} (priority {period1.priority}) and "
                            f"{period2.id} (priority {period2.priority})"
                        )