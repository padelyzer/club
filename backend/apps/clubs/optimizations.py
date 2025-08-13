"""
Court availability optimization algorithms for clubs module.
These algorithms help optimize court utilization, pricing, and scheduling.
"""

import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.db.models import Avg, Count, Q, Sum
from .models import Club, Court, CourtSpecialPricing


class CourtAvailabilityOptimizer:
    """Optimize court availability and utilization."""
    
    def __init__(self, club: Club):
        self.club = club
        self.courts = club.courts.filter(is_active=True)
    
    def get_optimal_pricing(
        self, 
        court: Court, 
        date: datetime.date, 
        time: datetime.time
    ) -> Decimal:
        """Calculate optimal pricing based on demand and utilization."""
        base_price = court.price_per_hour
        
        if not court.dynamic_pricing_enabled:
            return base_price
        
        # Get historical utilization for this time slot
        utilization = self._get_time_slot_utilization(court, time)
        
        # Apply demand-based pricing
        if utilization > 0.8:  # High demand
            multiplier = Decimal('1.5')
        elif utilization > 0.6:  # Medium demand
            multiplier = Decimal('1.2')
        elif utilization < 0.3:  # Low demand
            multiplier = Decimal('0.8')
        else:  # Normal demand
            multiplier = Decimal('1.0')
        
        # Apply time-based multipliers
        datetime_obj = timezone.make_aware(datetime.datetime.combine(date, time))
        
        # Peak hours multiplier (already in model)
        if 18 <= datetime_obj.hour < 22:
            multiplier *= court.peak_hours_multiplier
        
        # Weekend multiplier (already in model)
        if datetime_obj.weekday() >= 5:
            multiplier *= court.weekend_multiplier
        
        # Weather adjustment for outdoor courts
        if court.court_type in ['outdoor', 'semi_covered']:
            weather_multiplier = self._get_weather_pricing_adjustment(date)
            multiplier *= weather_multiplier
        
        return base_price * multiplier
    
    def _get_time_slot_utilization(
        self, 
        court: Court, 
        time: datetime.time,
        days_back: int = 30
    ) -> float:
        """Get historical utilization for a specific time slot."""
        try:
            from apps.reservations.models import Reservation
            
            end_date = timezone.now().date()
            start_date = end_date - datetime.timedelta(days=days_back)
            
            # Get reservations for this time slot in the last 30 days
            reservations = Reservation.objects.filter(
                court=court,
                date__gte=start_date,
                date__lte=end_date,
                start_time__lte=time,
                end_time__gt=time,
                status__in=['confirmed', 'completed']
            )
            
            # Calculate utilization percentage
            total_days = (end_date - start_date).days + 1
            utilized_days = reservations.count()
            
            return utilized_days / total_days if total_days > 0 else 0
            
        except ImportError:
            return 0.5  # Default utilization if reservations app not available
    
    def _get_weather_pricing_adjustment(self, date: datetime.date) -> Decimal:
        """Get pricing adjustment based on weather conditions."""
        # This would integrate with weather API
        # For now, return default multiplier
        return Decimal('1.0')
    
    def suggest_availability_slots(
        self, 
        date: datetime.date,
        duration_minutes: int = 90
    ) -> List[Dict]:
        """Suggest optimal availability slots for a given date."""
        suggestions = []
        
        for court in self.courts:
            if court.is_maintenance:
                continue
                
            # Get existing reservations for this court on this date
            reserved_slots = self._get_reserved_slots(court, date)
            
            # Generate potential time slots
            potential_slots = self._generate_time_slots(
                court, date, duration_minutes, reserved_slots
            )
            
            for slot in potential_slots:
                price = self.get_optimal_pricing(court, date, slot['start_time'])
                utilization = self._get_time_slot_utilization(court, slot['start_time'])
                
                suggestions.append({
                    'court_id': str(court.id),
                    'court_name': court.name,
                    'start_time': slot['start_time'],
                    'end_time': slot['end_time'],
                    'price': float(price),
                    'utilization_score': utilization,
                    'demand_level': self._get_demand_level(utilization),
                    'weather_suitable': court.is_weather_suitable(),
                })
        
        # Sort by utilization score and price
        return sorted(
            suggestions, 
            key=lambda x: (x['utilization_score'], -x['price']),
            reverse=False  # Prefer lower utilization (more available)
        )
    
    def _get_reserved_slots(self, court: Court, date: datetime.date) -> List[Tuple]:
        """Get reserved time slots for a court on a specific date."""
        try:
            from apps.reservations.models import Reservation
            
            reservations = Reservation.objects.filter(
                court=court,
                date=date,
                status__in=['confirmed', 'pending']
            )
            
            return [(r.start_time, r.end_time) for r in reservations]
            
        except ImportError:
            return []
    
    def _generate_time_slots(
        self, 
        court: Court, 
        date: datetime.date,
        duration_minutes: int,
        reserved_slots: List[Tuple]
    ) -> List[Dict]:
        """Generate available time slots for a court."""
        slots = []
        
        # Get court operating hours
        start_hour = self.club.opening_time.hour if self.club.opening_time else 7
        end_hour = self.club.closing_time.hour if self.club.closing_time else 23
        
        # Generate 30-minute intervals
        current_time = datetime.time(start_hour, 0)
        end_time = datetime.time(end_hour, 0)
        
        while current_time < end_time:
            slot_end = (
                datetime.datetime.combine(date, current_time) + 
                datetime.timedelta(minutes=duration_minutes)
            ).time()
            
            if slot_end <= end_time:
                # Check if this slot conflicts with reserved slots
                if not self._slot_conflicts_with_reservations(
                    current_time, slot_end, reserved_slots
                ):
                    slots.append({
                        'start_time': current_time,
                        'end_time': slot_end,
                    })
            
            # Move to next 30-minute interval
            current_time = (
                datetime.datetime.combine(date, current_time) + 
                datetime.timedelta(minutes=30)
            ).time()
        
        return slots
    
    def _slot_conflicts_with_reservations(
        self,
        start_time: datetime.time,
        end_time: datetime.time,
        reserved_slots: List[Tuple]
    ) -> bool:
        """Check if a time slot conflicts with existing reservations."""
        for reserved_start, reserved_end in reserved_slots:
            if (start_time < reserved_end and end_time > reserved_start):
                return True
        return False
    
    def _get_demand_level(self, utilization: float) -> str:
        """Convert utilization score to demand level."""
        if utilization > 0.8:
            return 'high'
        elif utilization > 0.6:
            return 'medium'
        elif utilization > 0.3:
            return 'normal'
        else:
            return 'low'
    
    def get_weekly_utilization_pattern(self, court: Court) -> Dict[str, float]:
        """Get weekly utilization pattern for a court."""
        try:
            from apps.reservations.models import Reservation
            
            end_date = timezone.now().date()
            start_date = end_date - datetime.timedelta(days=28)  # 4 weeks
            
            reservations = Reservation.objects.filter(
                court=court,
                date__gte=start_date,
                date__lte=end_date,
                status__in=['confirmed', 'completed']
            )
            
            # Group by weekday
            weekday_counts = {}
            weekday_names = ['monday', 'tuesday', 'wednesday', 'thursday', 
                           'friday', 'saturday', 'sunday']
            
            for i in range(7):
                weekday_reservations = reservations.filter(date__week_day=i+2)  # Django weekday
                total_slots = 4 * 14  # 4 weeks * 14 slots per day (7am-9pm in 30min intervals)
                utilization = weekday_reservations.count() / total_slots if total_slots > 0 else 0
                weekday_counts[weekday_names[i]] = round(utilization, 3)
            
            return weekday_counts
            
        except ImportError:
            # Default pattern if reservations not available
            return {
                'monday': 0.6,
                'tuesday': 0.7,
                'wednesday': 0.8,
                'thursday': 0.8,
                'friday': 0.9,
                'saturday': 0.95,
                'sunday': 0.85
            }
    
    def optimize_court_schedule(self, court: Court) -> Dict:
        """Optimize court schedule based on historical data."""
        utilization_pattern = self.get_weekly_utilization_pattern(court)
        
        recommendations = {
            'maintenance_windows': [],
            'price_adjustments': [],
            'schedule_changes': []
        }
        
        # Suggest maintenance windows during low utilization
        for day, utilization in utilization_pattern.items():
            if utilization < 0.4:  # Low utilization
                recommendations['maintenance_windows'].append({
                    'day': day,
                    'utilization': utilization,
                    'recommended_time': '07:00-09:00',
                    'reason': 'Low utilization period suitable for maintenance'
                })
        
        # Suggest dynamic pricing adjustments
        for day, utilization in utilization_pattern.items():
            if utilization > 0.8:  # High utilization
                recommendations['price_adjustments'].append({
                    'day': day,
                    'utilization': utilization,
                    'suggested_multiplier': 1.3,
                    'reason': 'High demand - increase pricing to optimize revenue'
                })
            elif utilization < 0.4:  # Low utilization
                recommendations['price_adjustments'].append({
                    'day': day,
                    'utilization': utilization,
                    'suggested_multiplier': 0.8,
                    'reason': 'Low demand - reduce pricing to increase utilization'
                })
        
        return recommendations


class ClubRevenueOptimizer:
    """Optimize club revenue through pricing and scheduling strategies."""
    
    def __init__(self, club: Club):
        self.club = club
        self.availability_optimizer = CourtAvailabilityOptimizer(club)
    
    def calculate_revenue_potential(
        self, 
        date_range: Tuple[datetime.date, datetime.date]
    ) -> Dict:
        """Calculate revenue potential for a date range."""
        start_date, end_date = date_range
        
        total_potential = Decimal('0')
        current_revenue = Decimal('0')
        courts_analysis = []
        
        for court in self.club.courts.filter(is_active=True):
            court_potential = self._calculate_court_revenue_potential(
                court, start_date, end_date
            )
            
            courts_analysis.append(court_potential)
            total_potential += court_potential['potential_revenue']
            current_revenue += court_potential['current_revenue']
        
        optimization_gap = total_potential - current_revenue
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': (end_date - start_date).days + 1
            },
            'current_revenue': float(current_revenue),
            'potential_revenue': float(total_potential),
            'optimization_gap': float(optimization_gap),
            'optimization_percentage': float(
                (optimization_gap / current_revenue * 100) if current_revenue > 0 else 0
            ),
            'courts_analysis': courts_analysis,
            'recommendations': self._generate_revenue_recommendations(courts_analysis)
        }
    
    def _calculate_court_revenue_potential(
        self,
        court: Court,
        start_date: datetime.date,
        end_date: datetime.date
    ) -> Dict:
        """Calculate revenue potential for a single court."""
        days = (end_date - start_date).days + 1
        
        # Assume 14 bookable hours per day (7am-9pm)
        total_possible_hours = days * 14
        
        # Get average hourly rate with optimization
        optimized_rate = self._get_average_optimized_rate(court)
        
        # Calculate utilization rates
        current_utilization = court.get_utilization_rate(start_date, end_date) / 100
        potential_utilization = min(current_utilization + 0.2, 0.85)  # Max 85% utilization
        
        current_revenue = total_possible_hours * current_utilization * court.price_per_hour
        potential_revenue = total_possible_hours * potential_utilization * optimized_rate
        
        return {
            'court_id': str(court.id),
            'court_name': court.name,
            'current_utilization': current_utilization,
            'potential_utilization': potential_utilization,
            'current_rate': float(court.price_per_hour),
            'optimized_rate': float(optimized_rate),
            'current_revenue': float(current_revenue),
            'potential_revenue': float(potential_revenue),
            'optimization_gap': float(potential_revenue - current_revenue)
        }
    
    def _get_average_optimized_rate(self, court: Court) -> Decimal:
        """Get average optimized rate for a court."""
        if not court.dynamic_pricing_enabled:
            return court.price_per_hour
        
        # Sample different times and calculate average optimized price
        sample_times = [
            datetime.time(8, 0),   # Morning
            datetime.time(12, 0),  # Noon
            datetime.time(18, 0),  # Evening peak
            datetime.time(20, 0),  # Peak
        ]
        
        tomorrow = timezone.now().date() + datetime.timedelta(days=1)
        total_price = Decimal('0')
        
        for time in sample_times:
            price = self.availability_optimizer.get_optimal_pricing(court, tomorrow, time)
            total_price += price
        
        return total_price / len(sample_times)
    
    def _generate_revenue_recommendations(self, courts_analysis: List[Dict]) -> List[Dict]:
        """Generate revenue optimization recommendations."""
        recommendations = []
        
        for court_data in courts_analysis:
            if court_data['optimization_gap'] > 100:  # Significant gap
                recommendations.append({
                    'type': 'pricing',
                    'court_name': court_data['court_name'],
                    'current_issue': f"Utilization: {court_data['current_utilization']:.1%}",
                    'recommendation': (
                        f"Enable dynamic pricing and increase peak hour rates by "
                        f"{((court_data['optimized_rate'] / court_data['current_rate']) - 1) * 100:.0f}%"
                    ),
                    'potential_gain': float(court_data['optimization_gap']),
                    'priority': 'high' if court_data['optimization_gap'] > 500 else 'medium'
                })
            
            if court_data['current_utilization'] < 0.5:  # Low utilization
                recommendations.append({
                    'type': 'utilization',
                    'court_name': court_data['court_name'],
                    'current_issue': f"Low utilization: {court_data['current_utilization']:.1%}",
                    'recommendation': "Consider promotional pricing during off-peak hours",
                    'potential_gain': float(court_data['optimization_gap'] * 0.3),
                    'priority': 'medium'
                })
        
        return sorted(recommendations, key=lambda x: x['potential_gain'], reverse=True)


class WeatherIntegrationOptimizer:
    """Optimize court availability based on weather conditions."""
    
    def __init__(self, club: Club):
        self.club = club
    
    def get_weather_adjusted_availability(
        self,
        date: datetime.date,
        weather_data: Optional[Dict] = None
    ) -> Dict:
        """Get court availability adjusted for weather conditions."""
        if not weather_data:
            weather_data = self._get_default_weather()
        
        outdoor_courts = self.club.courts.filter(
            is_active=True,
            court_type__in=['outdoor', 'semi_covered']
        )
        
        indoor_courts = self.club.courts.filter(
            is_active=True,
            court_type__in=['indoor', 'covered']
        )
        
        weather_impact = {
            'outdoor_courts_affected': 0,
            'indoor_courts_affected': 0,
            'pricing_adjustments': [],
            'availability_changes': []
        }
        
        temperature = weather_data.get('temperature', 25)
        condition = weather_data.get('condition', 'clear')
        
        for court in outdoor_courts:
            is_suitable = court.is_weather_suitable(temperature, condition)
            
            if not is_suitable:
                weather_impact['outdoor_courts_affected'] += 1
                weather_impact['availability_changes'].append({
                    'court_id': str(court.id),
                    'court_name': court.name,
                    'status': 'unavailable',
                    'reason': f"Weather unsuitable: {condition}, {temperature}°C"
                })
            else:
                # Adjust pricing based on weather desirability
                if condition in ['sunny', 'clear'] and 20 <= temperature <= 28:
                    # Perfect weather - premium pricing
                    weather_impact['pricing_adjustments'].append({
                        'court_id': str(court.id),
                        'court_name': court.name,
                        'multiplier': 1.2,
                        'reason': 'Perfect weather conditions'
                    })
        
        return {
            'date': date.isoformat(),
            'weather_conditions': weather_data,
            'impact_summary': weather_impact,
            'outdoor_courts_available': len(outdoor_courts) - weather_impact['outdoor_courts_affected'],
            'indoor_courts_available': len(indoor_courts),
            'total_available_courts': (
                len(outdoor_courts) + len(indoor_courts) - 
                weather_impact['outdoor_courts_affected']
            )
        }
    
    def _get_default_weather(self) -> Dict:
        """Get default weather conditions (would integrate with weather API)."""
        return {
            'temperature': 25,
            'condition': 'clear',
            'humidity': 60,
            'wind_speed': 5
        }


class MaintenanceScheduleOptimizer:
    """Optimize maintenance scheduling to minimize revenue impact."""
    
    def __init__(self, club: Club):
        self.club = club
        self.availability_optimizer = CourtAvailabilityOptimizer(club)
    
    def find_optimal_maintenance_windows(
        self,
        court: Court,
        maintenance_duration_hours: int,
        date_range: Tuple[datetime.date, datetime.date]
    ) -> List[Dict]:
        """Find optimal maintenance windows with minimal revenue impact."""
        start_date, end_date = date_range
        windows = []
        
        current_date = start_date
        while current_date <= end_date:
            # Skip if court already has maintenance scheduled
            if self._has_scheduled_maintenance(court, current_date):
                current_date += datetime.timedelta(days=1)
                continue
            
            # Get utilization pattern for this day
            weekday = current_date.weekday()
            utilization_pattern = self.availability_optimizer.get_weekly_utilization_pattern(court)
            weekday_names = ['monday', 'tuesday', 'wednesday', 'thursday', 
                           'friday', 'saturday', 'sunday']
            day_utilization = utilization_pattern.get(weekday_names[weekday], 0.5)
            
            # Calculate potential revenue loss
            avg_hourly_rate = court.price_per_hour
            revenue_loss = maintenance_duration_hours * avg_hourly_rate * Decimal(str(day_utilization))
            
            windows.append({
                'date': current_date,
                'weekday': weekday_names[weekday],
                'utilization_score': day_utilization,
                'estimated_revenue_loss': float(revenue_loss),
                'recommended_time': '07:00' if day_utilization < 0.6 else '06:00',
                'suitability_score': 1 - day_utilization,  # Lower utilization = higher suitability
            })
            
            current_date += datetime.timedelta(days=1)
        
        # Sort by suitability (lowest revenue impact first)
        return sorted(windows, key=lambda x: x['suitability_score'], reverse=True)
    
    def _has_scheduled_maintenance(self, court: Court, date: datetime.date) -> bool:
        """Check if court has maintenance scheduled on a given date."""
        try:
            from .models import MaintenanceRecord
            return MaintenanceRecord.objects.filter(
                court=court,
                scheduled_date__date=date,
                status__in=['scheduled', 'in_progress']
            ).exists()
        except:
            return False