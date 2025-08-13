"""
Constraint management system for league scheduling.
Defines and manages various scheduling constraints and their evaluation.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from django.utils import timezone
from django.db.models import Q

from .models import League, LeagueTeamRegistration, LeagueMatch, ScheduleConstraint


@dataclass
class ConstraintViolation:
    """Represents a constraint violation."""
    constraint_type: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    message: str
    penalty_score: float
    affected_entities: List[Any]


class BaseConstraint(ABC):
    """Base class for all scheduling constraints."""
    
    def __init__(self, constraint_config: ScheduleConstraint):
        self.config = constraint_config
        self.parameters = constraint_config.parameters
        self.priority = constraint_config.priority
    
    @abstractmethod
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        """Evaluate constraint for given match data."""
        pass
    
    @property
    def penalty_multiplier(self) -> float:
        """Get penalty multiplier based on constraint priority."""
        multipliers = {
            'low': 1.0,
            'medium': 2.0,
            'high': 5.0,
            'critical': 10.0
        }
        return multipliers.get(self.priority, 1.0)


class CourtAvailabilityConstraint(BaseConstraint):
    """Ensures courts are available for scheduled matches."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        court_id = match_data.get('court_id')
        datetime_obj = match_data.get('datetime')
        
        if not court_id or not datetime_obj:
            return violations
        
        # Check for court conflicts with existing reservations
        from apps.reservations.models import Reservation
        
        match_duration = self.parameters.get('match_duration_minutes', 90)
        end_time = datetime_obj + timedelta(minutes=match_duration)
        
        # Check regular reservations
        conflicting_reservations = Reservation.objects.filter(
            court_id=court_id,
            date=datetime_obj.date(),
            status__in=['confirmed', 'in_progress']
        ).filter(
            Q(start_time__lt=end_time.time(), end_time__gt=datetime_obj.time())
        )
        
        if conflicting_reservations.exists():
            violations.append(ConstraintViolation(
                constraint_type='court_availability',
                severity='critical',
                message=f'Court {court_id} not available at {datetime_obj}',
                penalty_score=100 * self.penalty_multiplier,
                affected_entities=[court_id]
            ))
        
        # Check court maintenance windows
        maintenance_windows = self.parameters.get('maintenance_windows', [])
        for window in maintenance_windows:
            start_time = datetime.fromisoformat(window['start'])
            end_time_maint = datetime.fromisoformat(window['end'])
            
            if start_time <= datetime_obj <= end_time_maint:
                violations.append(ConstraintViolation(
                    constraint_type='court_availability',
                    severity='high',
                    message=f'Court {court_id} under maintenance at {datetime_obj}',
                    penalty_score=75 * self.penalty_multiplier,
                    affected_entities=[court_id]
                ))
        
        return violations


class PlayerAvailabilityConstraint(BaseConstraint):
    """Ensures players are available for their matches."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        home_team = match_data.get('home_team')
        away_team = match_data.get('away_team')
        datetime_obj = match_data.get('datetime')
        
        if not all([home_team, away_team, datetime_obj]):
            return violations
        
        # Check availability for both teams
        for team in [home_team, away_team]:
            team_violations = self._check_team_availability(team, datetime_obj)
            violations.extend(team_violations)
        
        return violations
    
    def _check_team_availability(self, team: LeagueTeamRegistration, datetime_obj: datetime) -> List[ConstraintViolation]:
        violations = []
        
        # Get all players in the team
        team_players = team.leagueteamplayer_set.all()
        
        unavailable_players = []
        
        for player_membership in team_players:
            if not self._is_player_available(player_membership, datetime_obj):
                unavailable_players.append(player_membership.player)
        
        # If too many players are unavailable, create violation
        max_unavailable = self.parameters.get('max_unavailable_players', 1)
        if len(unavailable_players) > max_unavailable:
            violations.append(ConstraintViolation(
                constraint_type='player_availability',
                severity='high',
                message=f'Team {team.team_name} has {len(unavailable_players)} unavailable players',
                penalty_score=50 * self.penalty_multiplier,
                affected_entities=unavailable_players
            ))
        
        return violations
    
    def _is_player_available(self, player_membership, datetime_obj: datetime) -> bool:
        """Check if individual player is available."""
        availability_windows = player_membership.availability_windows
        
        # If no availability specified, assume available
        if not availability_windows:
            return True
        
        day_of_week = datetime_obj.weekday()
        time_str = datetime_obj.strftime("%H:%M")
        
        # Check if datetime falls within any availability window
        for window in availability_windows:
            window_day = window.get('day_of_week')
            window_start = window.get('start_time', '00:00')
            window_end = window.get('end_time', '23:59')
            
            if (window_day is None or window_day == day_of_week) and window_start <= time_str <= window_end:
                return True
        
        return False


class TravelDistanceConstraint(BaseConstraint):
    """Minimizes travel distance for teams."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        home_team = match_data.get('home_team')
        away_team = match_data.get('away_team')
        court_id = match_data.get('court_id')
        
        if not all([home_team, away_team, court_id]):
            return violations
        
        max_distance = self.parameters.get('max_distance_km', 50)
        
        # Calculate distances for both teams
        home_distance = self._calculate_team_distance(home_team, court_id)
        away_distance = self._calculate_team_distance(away_team, court_id)
        
        total_distance = home_distance + away_distance
        
        if total_distance > max_distance:
            severity = 'high' if total_distance > max_distance * 1.5 else 'medium'
            violations.append(ConstraintViolation(
                constraint_type='travel_distance',
                severity=severity,
                message=f'Total travel distance {total_distance:.1f}km exceeds limit {max_distance}km',
                penalty_score=total_distance * self.penalty_multiplier,
                affected_entities=[home_team, away_team, court_id]
            ))
        
        return violations
    
    def _calculate_team_distance(self, team: LeagueTeamRegistration, court_id: int) -> float:
        """Calculate distance from team's location to court."""
        # Get team's preferred venue or use captain's location
        team_location = self._get_team_location(team)
        court_location = self._get_court_location(court_id)
        
        # Simple Euclidean distance (in production, use proper geolocation)
        distance = ((team_location['lat'] - court_location['lat']) ** 2 + 
                   (team_location['lng'] - court_location['lng']) ** 2) ** 0.5
        
        # Convert to approximate kilometers (rough approximation)
        return distance * 111  # 1 degree ≈ 111 km
    
    def _get_team_location(self, team: LeagueTeamRegistration) -> Dict[str, float]:
        """Get team's geographic location."""
        if team.preferred_home_venue:
            return {
                'lat': getattr(team.preferred_home_venue, 'latitude', 0),
                'lng': getattr(team.preferred_home_venue, 'longitude', 0)
            }
        
        # Fallback to club location
        return {
            'lat': getattr(team.league.club, 'latitude', 0),
            'lng': getattr(team.league.club, 'longitude', 0)
        }
    
    def _get_court_location(self, court_id: int) -> Dict[str, float]:
        """Get court's geographic location."""
        from apps.clubs.models import Court
        
        try:
            court = Court.objects.get(id=court_id)
            return {
                'lat': getattr(court, 'latitude', 0),
                'lng': getattr(court, 'longitude', 0)
            }
        except Court.DoesNotExist:
            return {'lat': 0, 'lng': 0}


class RestPeriodConstraint(BaseConstraint):
    """Ensures adequate rest between matches for teams."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        home_team = match_data.get('home_team')
        away_team = match_data.get('away_team')
        datetime_obj = match_data.get('datetime')
        
        if not all([home_team, away_team, datetime_obj]):
            return violations
        
        min_rest_hours = self.parameters.get('min_rest_hours', 48)
        
        # Check rest period for both teams
        for team in [home_team, away_team]:
            rest_violations = self._check_team_rest_period(team, datetime_obj, min_rest_hours)
            violations.extend(rest_violations)
        
        return violations
    
    def _check_team_rest_period(self, team: LeagueTeamRegistration, 
                               datetime_obj: datetime, min_rest_hours: int) -> List[ConstraintViolation]:
        violations = []
        
        # Find recent matches for this team
        recent_cutoff = datetime_obj - timedelta(hours=min_rest_hours)
        
        recent_matches = LeagueMatch.objects.filter(
            Q(home_team=team) | Q(away_team=team),
            scheduled_date__gte=recent_cutoff,
            scheduled_date__lt=datetime_obj,
            status__in=['scheduled', 'in_progress', 'completed']
        ).order_by('-scheduled_date')
        
        if recent_matches.exists():
            last_match = recent_matches.first()
            time_diff = datetime_obj - last_match.scheduled_date
            hours_diff = time_diff.total_seconds() / 3600
            
            if hours_diff < min_rest_hours:
                severity = 'critical' if hours_diff < min_rest_hours * 0.5 else 'high'
                violations.append(ConstraintViolation(
                    constraint_type='rest_period',
                    severity=severity,
                    message=f'Team {team.team_name} has only {hours_diff:.1f}h rest (min: {min_rest_hours}h)',
                    penalty_score=(min_rest_hours - hours_diff) * 5 * self.penalty_multiplier,
                    affected_entities=[team, last_match]
                ))
        
        return violations


class BlackoutDatesConstraint(BaseConstraint):
    """Prevents scheduling during blackout periods."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        datetime_obj = match_data.get('datetime')
        
        if not datetime_obj:
            return violations
        
        match_date = datetime_obj.date()
        
        # Check specific blackout dates
        blackout_dates = self.parameters.get('dates', [])
        for blackout_date_str in blackout_dates:
            blackout_date = datetime.fromisoformat(blackout_date_str).date()
            if match_date == blackout_date:
                violations.append(ConstraintViolation(
                    constraint_type='blackout_dates',
                    severity='critical',
                    message=f'Match scheduled on blackout date {match_date}',
                    penalty_score=200 * self.penalty_multiplier,
                    affected_entities=[match_date]
                ))
        
        # Check blackout date ranges
        date_ranges = self.parameters.get('date_ranges', [])
        for date_range in date_ranges:
            start_date = datetime.fromisoformat(date_range['start']).date()
            end_date = datetime.fromisoformat(date_range['end']).date()
            
            if start_date <= match_date <= end_date:
                violations.append(ConstraintViolation(
                    constraint_type='blackout_dates',
                    severity='critical',
                    message=f'Match scheduled in blackout period {start_date} - {end_date}',
                    penalty_score=200 * self.penalty_multiplier,
                    affected_entities=[date_range]
                ))
        
        # Check recurring blackouts (e.g., holidays)
        recurring_blackouts = self.parameters.get('recurring', [])
        for recurring in recurring_blackouts:
            if self._matches_recurring_pattern(match_date, recurring):
                violations.append(ConstraintViolation(
                    constraint_type='blackout_dates',
                    severity='high',
                    message=f'Match scheduled on recurring blackout: {recurring.get("name", "Unknown")}',
                    penalty_score=150 * self.penalty_multiplier,
                    affected_entities=[recurring]
                ))
        
        return violations
    
    def _matches_recurring_pattern(self, date: datetime.date, pattern: Dict) -> bool:
        """Check if date matches a recurring blackout pattern."""
        pattern_type = pattern.get('type')
        
        if pattern_type == 'day_of_week':
            return date.weekday() == pattern.get('day_of_week')
        elif pattern_type == 'day_of_month':
            return date.day == pattern.get('day_of_month')
        elif pattern_type == 'month_day':
            return date.month == pattern.get('month') and date.day == pattern.get('day')
        
        return False


class VenueCapacityConstraint(BaseConstraint):
    """Ensures venue capacity is not exceeded."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        court_id = match_data.get('court_id')
        datetime_obj = match_data.get('datetime')
        
        if not all([court_id, datetime_obj]):
            return violations
        
        # Get expected attendance
        expected_attendance = self._estimate_attendance(match_data)
        court_capacity = self._get_court_capacity(court_id)
        
        if expected_attendance > court_capacity:
            violations.append(ConstraintViolation(
                constraint_type='venue_capacity',
                severity='medium',
                message=f'Expected attendance {expected_attendance} exceeds capacity {court_capacity}',
                penalty_score=(expected_attendance - court_capacity) * 10 * self.penalty_multiplier,
                affected_entities=[court_id]
            ))
        
        return violations
    
    def _estimate_attendance(self, match_data: Dict) -> int:
        """Estimate attendance for a match."""
        base_attendance = self.parameters.get('base_attendance', 20)
        
        # Adjust based on factors
        multiplier = 1.0
        
        # Weekend matches typically have higher attendance
        datetime_obj = match_data.get('datetime')
        if datetime_obj and datetime_obj.weekday() in [5, 6]:
            multiplier *= 1.5
        
        # Evening matches might have higher attendance
        if datetime_obj and 18 <= datetime_obj.hour <= 21:
            multiplier *= 1.2
        
        return int(base_attendance * multiplier)
    
    def _get_court_capacity(self, court_id: int) -> int:
        """Get court seating capacity."""
        from apps.clubs.models import Court
        
        try:
            court = Court.objects.get(id=court_id)
            return getattr(court, 'capacity', 50)  # Default capacity
        except Court.DoesNotExist:
            return 50


class WeatherConstraint(BaseConstraint):
    """Prevents scheduling during poor weather conditions for outdoor courts."""
    
    def evaluate(self, match_data: Dict) -> List[ConstraintViolation]:
        violations = []
        court_id = match_data.get('court_id')
        datetime_obj = match_data.get('datetime')
        
        if not all([court_id, datetime_obj]):
            return violations
        
        # Check if court is outdoor
        if not self._is_outdoor_court(court_id):
            return violations  # Indoor courts not affected by weather
        
        # Check weather forecast (simplified - would integrate with weather API)
        weather_risk = self._assess_weather_risk(datetime_obj)
        
        risk_threshold = self.parameters.get('risk_threshold', 0.3)  # 30% chance of rain
        
        if weather_risk > risk_threshold:
            severity = 'high' if weather_risk > 0.7 else 'medium'
            violations.append(ConstraintViolation(
                constraint_type='weather',
                severity=severity,
                message=f'High weather risk ({weather_risk:.0%}) for outdoor court',
                penalty_score=weather_risk * 100 * self.penalty_multiplier,
                affected_entities=[court_id, datetime_obj]
            ))
        
        return violations
    
    def _is_outdoor_court(self, court_id: int) -> bool:
        """Check if court is outdoor."""
        from apps.clubs.models import Court
        
        try:
            court = Court.objects.get(id=court_id)
            return getattr(court, 'is_outdoor', False)
        except Court.DoesNotExist:
            return False
    
    def _assess_weather_risk(self, datetime_obj: datetime) -> float:
        """Assess weather risk for given datetime."""
        # This would integrate with a weather API
        # For now, return a simple heuristic based on season and time
        
        month = datetime_obj.month
        
        # Higher risk during rainy seasons
        if month in [11, 12, 1, 2]:  # Winter months
            return 0.4
        elif month in [4, 5, 10]:  # Spring/Fall
            return 0.2
        else:  # Summer months
            return 0.1


class ConstraintManager:
    """
    Manages and evaluates all constraints for league scheduling.
    """
    
    CONSTRAINT_CLASSES = {
        'court_availability': CourtAvailabilityConstraint,
        'player_availability': PlayerAvailabilityConstraint,
        'travel_distance': TravelDistanceConstraint,
        'rest_period': RestPeriodConstraint,
        'blackout_dates': BlackoutDatesConstraint,
        'venue_capacity': VenueCapacityConstraint,
        'weather': WeatherConstraint,
    }
    
    def __init__(self, league: League):
        self.league = league
        self.constraints = []
        self._load_constraints()
    
    def _load_constraints(self):
        """Load and instantiate all active constraints for the league."""
        constraint_configs = self.league.constraints.filter(is_active=True)
        
        for config in constraint_configs:
            constraint_class = self.CONSTRAINT_CLASSES.get(config.constraint_type)
            if constraint_class:
                constraint = constraint_class(config)
                self.constraints.append(constraint)
    
    def evaluate_match(self, match_data: Dict) -> List[ConstraintViolation]:
        """Evaluate all constraints for a single match."""
        all_violations = []
        
        for constraint in self.constraints:
            violations = constraint.evaluate(match_data)
            all_violations.extend(violations)
        
        return all_violations
    
    def evaluate_schedule(self, schedule_data: Dict) -> Dict:
        """Evaluate all constraints for an entire schedule."""
        results = {
            'total_violations': 0,
            'total_penalty_score': 0,
            'violations_by_type': {},
            'violations_by_severity': {'low': 0, 'medium': 0, 'high': 0, 'critical': 0},
            'matches_with_violations': 0,
            'detailed_violations': []
        }
        
        matches_with_violations = set()
        
        for i, match in enumerate(schedule_data.get('matches', [])):
            match_violations = self.evaluate_match(match)
            
            if match_violations:
                matches_with_violations.add(i)
                results['detailed_violations'].extend(match_violations)
                
                for violation in match_violations:
                    results['total_violations'] += 1
                    results['total_penalty_score'] += violation.penalty_score
                    
                    # Count by type
                    constraint_type = violation.constraint_type
                    results['violations_by_type'][constraint_type] = \
                        results['violations_by_type'].get(constraint_type, 0) + 1
                    
                    # Count by severity
                    results['violations_by_severity'][violation.severity] += 1
        
        results['matches_with_violations'] = len(matches_with_violations)
        
        return results
    
    def get_constraint_summary(self) -> Dict:
        """Get summary of active constraints."""
        summary = {
            'total_constraints': len(self.constraints),
            'constraints_by_type': {},
            'constraints_by_priority': {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        }
        
        for constraint in self.constraints:
            constraint_type = constraint.config.constraint_type
            priority = constraint.config.priority
            
            summary['constraints_by_type'][constraint_type] = \
                summary['constraints_by_type'].get(constraint_type, 0) + 1
            summary['constraints_by_priority'][priority] += 1
        
        return summary
    
    def suggest_constraint_adjustments(self, evaluation_results: Dict) -> List[Dict]:
        """Suggest adjustments to constraints based on evaluation results."""
        suggestions = []
        
        total_violations = evaluation_results['total_violations']
        critical_violations = evaluation_results['violations_by_severity']['critical']
        
        if critical_violations > 0:
            suggestions.append({
                'type': 'critical_violations',
                'message': f'Found {critical_violations} critical violations that must be resolved',
                'action': 'Review and adjust critical constraints or find alternative slots'
            })
        
        # Suggest relaxing constraints if too many violations
        if total_violations > len(evaluation_results.get('matches', [])) * 0.2:  # >20% of matches have violations
            most_violated_type = max(evaluation_results['violations_by_type'].items(), key=lambda x: x[1])
            suggestions.append({
                'type': 'high_violation_rate',
                'message': f'High violation rate ({total_violations} violations). Most common: {most_violated_type[0]}',
                'action': f'Consider relaxing {most_violated_type[0]} constraints or adding more time slots'
            })
        
        return suggestions