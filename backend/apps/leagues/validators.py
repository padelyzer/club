"""
Comprehensive league validators for data integrity and business rule compliance.
Ensures league operations follow all business rules and maintain data consistency.

CRITICAL: This module validates ALL league operations to prevent corruption.
Every validation rule has been carefully designed for league integrity.
"""

import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union

from django.core.exceptions import ValidationError
from django.db.models import Q, F, Sum, Count, Max, Min
from django.utils import timezone

# Configure validator logger
logger = logging.getLogger('leagues.validators')

# League validation constants
MIN_SEASON_DURATION_DAYS = 30
MAX_SEASON_DURATION_DAYS = 365
MIN_TEAMS_PER_LEAGUE = 4
MAX_TEAMS_PER_LEAGUE = 32
MAX_DIVISIONS_PER_LEAGUE = 5
MIN_MATCHDAYS_PER_SEASON = 3
MAX_MATCHDAYS_PER_SEASON = 50

# Standings validation constants
MAX_POINTS_PER_MATCH = 6  # Double rueda could give 6 points max
MIN_POINTS_PER_MATCH = -3  # Penalty points
MAX_SETS_DIFFERENCE_PER_MATCH = 6
MAX_GAMES_DIFFERENCE_PER_MATCH = 36

# Promotion/relegation validation constants
MAX_PROMOTION_PERCENTAGE = 0.25  # 25% of teams
MIN_PROMOTION_SPOTS = 1
MAX_RELEGATION_PERCENTAGE = 0.25  # 25% of teams
MIN_RELEGATION_SPOTS = 1


class LeagueIntegrityValidator:
    """
    CRITICAL: Main validator for league data integrity and business rules.
    Ensures all league operations maintain consistency and follow business logic.
    """
    
    def __init__(self):
        self.validation_errors = []
        self.validation_warnings = []
    
    def validate_league_creation(self, league_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        CRITICAL: Validate league creation data.
        
        Args:
            league_data: Dictionary containing league creation data
            
        Returns:
            Dict with validation results and any issues found
        """
        self.validation_errors = []
        self.validation_warnings = []
        
        try:
            # Basic field validation
            self._validate_required_league_fields(league_data)
            
            # Team capacity validation
            self._validate_team_capacity(league_data)
            
            # Format and rules validation
            self._validate_league_format(league_data)
            
            # Division and category validation
            self._validate_division_settings(league_data)
            
            # Promotion/relegation validation
            self._validate_promotion_relegation_settings(league_data)
            
            # Financial validation
            self._validate_financial_settings(league_data)
            
            validation_result = {
                'is_valid': len(self.validation_errors) == 0,
                'errors': self.validation_errors,
                'warnings': self.validation_warnings,
                'validation_type': 'league_creation',
                'timestamp': timezone.now().isoformat()
            }
            
            logger.info(f"League creation validation: {len(self.validation_errors)} errors, {len(self.validation_warnings)} warnings")
            return validation_result
            
        except Exception as e:
            logger.critical(f"League creation validation failed: {str(e)}")
            return {
                'is_valid': False,
                'errors': [f"Validation system error: {str(e)}"],
                'warnings': [],
                'validation_type': 'league_creation',
                'timestamp': timezone.now().isoformat()
            }
    
    def validate_season_consistency(self, season) -> Dict[str, Any]:
        """
        CRITICAL: Validate season data consistency.
        
        Args:
            season: LeagueSeason object to validate
            
        Returns:
            Dict with validation results
        """
        self.validation_errors = []
        self.validation_warnings = []
        
        try:
            # Basic season validation
            self._validate_season_dates(season)
            
            # Registration validation
            self._validate_registration_periods(season)
            
            # Team and match validation
            self._validate_season_structure(season)
            
            # Standings validation
            self._validate_season_standings(season)
            
            # Match schedule validation
            self._validate_match_schedule_consistency(season)
            
            validation_result = {
                'is_valid': len(self.validation_errors) == 0,
                'errors': self.validation_errors,
                'warnings': self.validation_warnings,
                'season_id': str(season.id),
                'validation_type': 'season_consistency',
                'timestamp': timezone.now().isoformat()
            }
            
            logger.info(f"Season consistency validation for {season.id}: {len(self.validation_errors)} errors")
            return validation_result
            
        except Exception as e:
            logger.critical(f"Season consistency validation failed: {str(e)}")
            return {
                'is_valid': False,
                'errors': [f"Season validation error: {str(e)}"],
                'warnings': [],
                'season_id': str(season.id) if season else 'unknown',
                'validation_type': 'season_consistency',
                'timestamp': timezone.now().isoformat()
            }
    
    def validate_promotion_relegation_rules(
        self, 
        league, 
        promotion_spots: int, 
        relegation_spots: int
    ) -> Dict[str, Any]:
        """
        CRITICAL: Validate promotion/relegation configuration.
        
        Args:
            league: League object
            promotion_spots: Number of promotion spots
            relegation_spots: Number of relegation spots
            
        Returns:
            Dict with validation results
        """
        self.validation_errors = []
        self.validation_warnings = []
        
        try:
            # Get current season team count
            current_season = league.current_season
            if not current_season:
                self.validation_errors.append("No current season found for promotion/relegation validation")
                return self._build_validation_result('promotion_relegation')
            
            teams_count = current_season.teams_count
            
            # Validate promotion spots
            if promotion_spots < MIN_PROMOTION_SPOTS:
                self.validation_errors.append(f"Promotion spots must be at least {MIN_PROMOTION_SPOTS}")
            
            max_promotion = int(teams_count * MAX_PROMOTION_PERCENTAGE)
            if promotion_spots > max_promotion:
                self.validation_errors.append(
                    f"Promotion spots ({promotion_spots}) exceed maximum allowed "
                    f"({max_promotion} = {MAX_PROMOTION_PERCENTAGE:.0%} of {teams_count} teams)"
                )
            
            # Validate relegation spots
            if relegation_spots < MIN_RELEGATION_SPOTS:
                self.validation_errors.append(f"Relegation spots must be at least {MIN_RELEGATION_SPOTS}")
            
            max_relegation = int(teams_count * MAX_RELEGATION_PERCENTAGE)
            if relegation_spots > max_relegation:
                self.validation_errors.append(
                    f"Relegation spots ({relegation_spots}) exceed maximum allowed "
                    f"({max_relegation} = {MAX_RELEGATION_PERCENTAGE:.0%} of {teams_count} teams)"
                )
            
            # Check total impact
            total_affected = promotion_spots + relegation_spots
            if total_affected > teams_count // 2:
                self.validation_warnings.append(
                    f"High promotion/relegation impact: {total_affected} of {teams_count} teams affected"
                )
            
            return self._build_validation_result('promotion_relegation')
            
        except Exception as e:
            logger.critical(f"Promotion/relegation validation failed: {str(e)}")
            return self._build_validation_result('promotion_relegation', error=str(e))
    
    def validate_match_schedule(self, season) -> Dict[str, Any]:
        """
        CRITICAL: Validate league match schedule consistency.
        
        Args:
            season: LeagueSeason object
            
        Returns:
            Dict with validation results
        """
        self.validation_errors = []
        self.validation_warnings = []
        
        try:
            matches = list(season.matches.all())
            teams = list(season.teams.filter(status='active'))
            
            # Basic schedule validation
            self._validate_schedule_coverage(matches, teams, season)
            
            # Match distribution validation
            self._validate_match_distribution(matches, teams, season)
            
            # Date and venue validation
            self._validate_match_scheduling(matches, season)
            
            # Fairness validation
            self._validate_schedule_fairness(matches, teams)
            
            return self._build_validation_result('match_schedule')
            
        except Exception as e:
            logger.critical(f"Match schedule validation failed: {str(e)}")
            return self._build_validation_result('match_schedule', error=str(e))
    
    def _validate_required_league_fields(self, league_data: Dict[str, Any]):
        """Validate required fields for league creation."""
        required_fields = ['name', 'format', 'min_teams', 'max_teams', 'organizer']
        
        for field in required_fields:
            if field not in league_data or not league_data[field]:
                self.validation_errors.append(f"Required field missing: {field}")
    
    def _validate_team_capacity(self, league_data: Dict[str, Any]):
        """Validate team capacity settings."""
        min_teams = league_data.get('min_teams', 0)
        max_teams = league_data.get('max_teams', 0)
        
        if min_teams < MIN_TEAMS_PER_LEAGUE:
            self.validation_errors.append(f"Minimum teams must be at least {MIN_TEAMS_PER_LEAGUE}")
        
        if max_teams > MAX_TEAMS_PER_LEAGUE:
            self.validation_errors.append(f"Maximum teams cannot exceed {MAX_TEAMS_PER_LEAGUE}")
        
        if min_teams >= max_teams:
            self.validation_errors.append("Minimum teams must be less than maximum teams")
    
    def _validate_league_format(self, league_data: Dict[str, Any]):
        """Validate league format settings."""
        format_type = league_data.get('format')
        valid_formats = ['round_robin', 'round_robin_double', 'group_stage']
        
        if format_type not in valid_formats:
            self.validation_errors.append(f"Invalid format: {format_type}. Must be one of: {valid_formats}")
        
        # Format-specific validation
        if format_type == 'group_stage':
            max_teams = league_data.get('max_teams', 0)
            if max_teams < 8:
                self.validation_warnings.append("Group stage format works best with 8+ teams")
    
    def _validate_division_settings(self, league_data: Dict[str, Any]):
        """Validate division and category settings."""
        division = league_data.get('division')
        valid_divisions = ['primera', 'segunda', 'tercera', 'mixta', 'open']
        
        if division and division not in valid_divisions:
            self.validation_errors.append(f"Invalid division: {division}")
    
    def _validate_promotion_relegation_settings(self, league_data: Dict[str, Any]):
        """Validate promotion/relegation settings."""
        allow_promotion = league_data.get('allow_promotion_relegation', False)
        
        if allow_promotion:
            promotion_spots = league_data.get('promotion_spots', 0)
            relegation_spots = league_data.get('relegation_spots', 0)
            max_teams = league_data.get('max_teams', 0)
            
            if promotion_spots <= 0 or relegation_spots <= 0:
                self.validation_errors.append("Promotion and relegation spots must be positive when enabled")
            
            if promotion_spots + relegation_spots > max_teams // 2:
                self.validation_warnings.append("High promotion/relegation percentage may affect league stability")
    
    def _validate_financial_settings(self, league_data: Dict[str, Any]):
        """Validate financial settings."""
        registration_fee = league_data.get('registration_fee', Decimal('0'))
        
        if not isinstance(registration_fee, Decimal):
            try:
                registration_fee = Decimal(str(registration_fee))
            except:
                self.validation_errors.append("Invalid registration fee format")
                return
        
        if registration_fee < 0:
            self.validation_errors.append("Registration fee cannot be negative")
        
        if registration_fee > 1000:  # Arbitrary high limit
            self.validation_warnings.append(f"High registration fee: {registration_fee}")
    
    def _validate_season_dates(self, season):
        """Validate season date consistency."""
        if season.start_date >= season.end_date:
            self.validation_errors.append("Season start date must be before end date")
        
        duration = (season.end_date - season.start_date).days
        
        if duration < MIN_SEASON_DURATION_DAYS:
            self.validation_errors.append(f"Season too short: {duration} days < {MIN_SEASON_DURATION_DAYS}")
        
        if duration > MAX_SEASON_DURATION_DAYS:
            self.validation_warnings.append(f"Very long season: {duration} days > {MAX_SEASON_DURATION_DAYS}")
        
        # Check for overlapping seasons
        overlapping_seasons = season.league.seasons.filter(
            Q(start_date__lte=season.end_date) & Q(end_date__gte=season.start_date)
        ).exclude(id=season.id)
        
        if overlapping_seasons.exists():
            self.validation_warnings.append("Season dates overlap with existing seasons")
    
    def _validate_registration_periods(self, season):
        """Validate registration period consistency."""
        if season.registration_start >= season.registration_end:
            self.validation_errors.append("Registration start must be before registration end")
        
        if season.registration_end.date() > season.start_date:
            self.validation_errors.append("Registration must end before season starts")
        
        registration_duration = (season.registration_end - season.registration_start).days
        if registration_duration < 3:
            self.validation_warnings.append("Very short registration period")
    
    def _validate_season_structure(self, season):
        """Validate season structural consistency."""
        teams_count = season.teams_count
        
        if teams_count < season.league.min_teams:
            self.validation_errors.append(
                f"Not enough teams: {teams_count} < {season.league.min_teams}"
            )
        
        if teams_count > season.league.max_teams:
            self.validation_errors.append(
                f"Too many teams: {teams_count} > {season.league.max_teams}"
            )
        
        # Validate matchday calculations
        if season.total_matchdays > 0:
            expected_matchdays = self._calculate_expected_matchdays(season)
            if abs(season.total_matchdays - expected_matchdays) > 1:
                self.validation_warnings.append(
                    f"Matchday count mismatch: {season.total_matchdays} vs expected {expected_matchdays}"
                )
    
    def _validate_season_standings(self, season):
        """Validate season standings consistency."""
        standings = list(season.standings.all())
        teams = list(season.teams.filter(status='active'))
        
        if len(standings) > len(teams):
            self.validation_errors.append("More standings entries than active teams")
        
        # Check for duplicate positions
        positions = [s.position for s in standings if s.position > 0]
        if len(positions) != len(set(positions)):
            self.validation_errors.append("Duplicate positions in standings")
        
        # Validate standings data integrity
        for standing in standings:
            self._validate_standing_data(standing)
    
    def _validate_standing_data(self, standing):
        """Validate individual standing data consistency."""
        # Check basic math
        if standing.matches_won + standing.matches_drawn + standing.matches_lost != standing.matches_played:
            self.validation_errors.append(
                f"Matches played inconsistency for team {standing.team.team_display_name}"
            )
        
        # Check points calculation
        expected_points = (
            standing.matches_won * 3 + 
            standing.matches_drawn * 1
        )  # Assuming standard 3-1-0 system
        
        # Allow some variance for penalty points or different scoring systems
        if abs(standing.points - expected_points) > 10:
            self.validation_warnings.append(
                f"Points calculation may be incorrect for team {standing.team.team_display_name}: "
                f"expected ~{expected_points}, got {standing.points}"
            )
        
        # Check set/game differences
        if abs(standing.sets_difference) > standing.matches_played * MAX_SETS_DIFFERENCE_PER_MATCH:
            self.validation_warnings.append(
                f"Unusual sets difference for team {standing.team.team_display_name}: "
                f"{standing.sets_difference}"
            )
        
        if abs(standing.games_difference) > standing.matches_played * MAX_GAMES_DIFFERENCE_PER_MATCH:
            self.validation_warnings.append(
                f"Unusual games difference for team {standing.team.team_display_name}: "
                f"{standing.games_difference}"
            )
    
    def _validate_match_schedule_consistency(self, season):
        """Validate match schedule consistency within season."""
        matches = season.matches.all()
        
        # Check matchday sequence
        matchdays = sorted(set(match.matchday for match in matches))
        if matchdays and matchdays[-1] > season.total_matchdays:
            self.validation_errors.append(
                f"Match scheduled beyond total matchdays: {matchdays[-1]} > {season.total_matchdays}"
            )
        
        # Check for orphaned matches
        season_teams = set(season.teams.filter(status='active'))
        for match in matches:
            if match.home_team not in season_teams or match.away_team not in season_teams:
                self.validation_errors.append(f"Match {match.id} involves non-season teams")
    
    def _validate_schedule_coverage(self, matches, teams, season):
        """Validate that schedule covers all required matchups."""
        if not teams or len(teams) < 2:
            return
        
        # For round robin, each team should play every other team
        if season.league.format in ['round_robin', 'round_robin_double']:
            required_matchups = set()
            for i, team1 in enumerate(teams):
                for team2 in teams[i+1:]:
                    required_matchups.add((team1.id, team2.id))
            
            scheduled_matchups = set()
            for match in matches:
                home_id, away_id = match.home_team.id, match.away_team.id
                matchup = (min(home_id, away_id), max(home_id, away_id))
                scheduled_matchups.add(matchup)
            
            missing_matchups = required_matchups - scheduled_matchups
            if missing_matchups:
                self.validation_warnings.append(
                    f"{len(missing_matchups)} matchups missing from schedule"
                )
    
    def _validate_match_distribution(self, matches, teams, season):
        """Validate fair distribution of matches across teams."""
        if not teams:
            return
        
        team_match_counts = {}
        for team in teams:
            count = sum(1 for match in matches 
                       if match.home_team == team or match.away_team == team)
            team_match_counts[team.id] = count
        
        if team_match_counts:
            min_matches = min(team_match_counts.values())
            max_matches = max(team_match_counts.values())
            
            if max_matches - min_matches > 2:
                self.validation_warnings.append(
                    f"Uneven match distribution: {min_matches}-{max_matches} matches per team"
                )
    
    def _validate_match_scheduling(self, matches, season):
        """Validate match dates and scheduling constraints."""
        for match in matches:
            # Check match is within season dates
            match_date = match.scheduled_date.date()
            if match_date < season.start_date or match_date > season.end_date:
                self.validation_errors.append(
                    f"Match {match.id} scheduled outside season dates"
                )
        
        # Check for venue conflicts (matches at same court/time)
        matches_by_datetime_court = {}
        for match in matches:
            if match.court:
                key = (match.scheduled_date, match.court.id)
                if key in matches_by_datetime_court:
                    self.validation_errors.append(
                        f"Court conflict: matches {matches_by_datetime_court[key]} and {match.id}"
                    )
                else:
                    matches_by_datetime_court[key] = match.id
    
    def _validate_schedule_fairness(self, matches, teams):
        """Validate schedule fairness (home/away balance, rest periods)."""
        if not teams:
            return
        
        # Check home/away balance
        for team in teams:
            home_matches = sum(1 for match in matches if match.home_team == team)
            away_matches = sum(1 for match in matches if match.away_team == team)
            
            if abs(home_matches - away_matches) > 2:
                self.validation_warnings.append(
                    f"Home/away imbalance for team {team.team_display_name}: "
                    f"{home_matches}H/{away_matches}A"
                )
    
    def _calculate_expected_matchdays(self, season):
        """Calculate expected number of matchdays for season."""
        teams_count = season.teams_count
        
        if teams_count < 2:
            return 0
        
        if season.league.format == 'round_robin':
            return teams_count - 1
        elif season.league.format == 'round_robin_double':
            return (teams_count - 1) * 2
        else:
            return teams_count - 1
    
    def _build_validation_result(self, validation_type: str, error: str = None) -> Dict[str, Any]:
        """Build standardized validation result."""
        if error:
            return {
                'is_valid': False,
                'errors': [f"Validation system error: {error}"],
                'warnings': [],
                'validation_type': validation_type,
                'timestamp': timezone.now().isoformat()
            }
        
        return {
            'is_valid': len(self.validation_errors) == 0,
            'errors': self.validation_errors,
            'warnings': self.validation_warnings,
            'validation_type': validation_type,
            'timestamp': timezone.now().isoformat()
        }


# Standalone validation functions
def validate_season_consistency(season) -> bool:
    """
    Quick validation function for season consistency.
    
    Args:
        season: LeagueSeason object
        
    Returns:
        Boolean indicating if season is consistent
    """
    validator = LeagueIntegrityValidator()
    result = validator.validate_season_consistency(season)
    return result['is_valid']


def validate_promotion_demotion_rules(league, promoted_teams: List, relegated_teams: List) -> Dict[str, Any]:
    """
    Validate promotion and relegation team selections.
    
    Args:
        league: League object
        promoted_teams: List of teams to promote
        relegated_teams: List of teams to relegate
        
    Returns:
        Dict with validation results
    """
    errors = []
    warnings = []
    
    try:
        current_season = league.current_season
        if not current_season:
            errors.append("No current season for promotion/relegation validation")
            return {'is_valid': False, 'errors': errors, 'warnings': warnings}
        
        final_standings = list(current_season.standings.order_by('position'))
        total_teams = len(final_standings)
        
        # Validate promotion teams are from top positions
        promotion_positions = []
        for team in promoted_teams:
            standing = next((s for s in final_standings if s.team == team), None)
            if standing:
                promotion_positions.append(standing.position)
            else:
                errors.append(f"Promoted team {team.team_display_name} not in final standings")
        
        if promotion_positions:
            expected_top_positions = list(range(1, len(promoted_teams) + 1))
            if sorted(promotion_positions) != expected_top_positions:
                warnings.append("Promoted teams are not from consecutive top positions")
        
        # Validate relegation teams are from bottom positions
        relegation_positions = []
        for team in relegated_teams:
            standing = next((s for s in final_standings if s.team == team), None)
            if standing:
                relegation_positions.append(standing.position)
            else:
                errors.append(f"Relegated team {team.team_display_name} not in final standings")
        
        if relegation_positions:
            expected_bottom_positions = list(range(total_teams - len(relegated_teams) + 1, total_teams + 1))
            if sorted(relegation_positions) != expected_bottom_positions:
                warnings.append("Relegated teams are not from consecutive bottom positions")
        
        # Check for overlaps
        if set(promoted_teams) & set(relegated_teams):
            errors.append("Teams cannot be both promoted and relegated")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'validation_type': 'promotion_relegation',
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Promotion/relegation validation error: {str(e)}")
        return {
            'is_valid': False,
            'errors': [f"Validation error: {str(e)}"],
            'warnings': warnings,
            'validation_type': 'promotion_relegation',
            'timestamp': timezone.now().isoformat()
        }


def validate_match_schedule(season) -> Dict[str, Any]:
    """
    Validate league match schedule for consistency and fairness.
    
    Args:
        season: LeagueSeason object
        
    Returns:
        Dict with validation results
    """
    validator = LeagueIntegrityValidator()
    return validator.validate_match_schedule(season)