"""
Tournament integrity validators for ABSOLUTE bracket consistency and tournament validity.
Prevents tournament corruption, orphan matches, and invalid tournament states.

CRITICAL: This module ensures tournament competitive integrity.
Every validation has been designed to prevent tournament manipulation or corruption.
"""

import logging
import math
from decimal import Decimal
from typing import Dict, List, Tuple, Any, Optional, Set
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q, Count, F

# Configure validation logger
logger = logging.getLogger('tournaments.validation')

# Tournament validation constants
MAX_TOURNAMENT_DURATION_DAYS = 30
MIN_REGISTRATION_WINDOW_HOURS = 1
MAX_REGISTRATION_WINDOW_DAYS = 60
MAX_TEAMS_PER_TOURNAMENT = 256
MIN_TEAMS_PER_TOURNAMENT = 4

# Prize distribution limits
MAX_TOTAL_PRIZE_PERCENTAGE = Decimal('1.0')  # 100% of registration fees
MIN_WINNER_PRIZE_PERCENTAGE = Decimal('0.4')  # At least 40% to winner


class TournamentIntegrityValidator:
    """
    CRITICAL: Main validator for tournament integrity and consistency.
    Ensures tournaments are valid, brackets are consistent, and no corruption exists.
    """
    
    @staticmethod
    def validate_tournament_structure(tournament) -> Dict[str, Any]:
        """
        CRITICAL: Comprehensive tournament structure validation.
        
        Validates:
        - Basic tournament data integrity
        - Date consistency and logic
        - Team capacity and limits
        - Prize structure validity
        - Registration rules compliance
        
        Returns:
            Dict with validation results and detailed findings
        """
        validation_report = {
            'tournament_id': str(tournament.id),
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'info': [],
            'validation_timestamp': timezone.now().isoformat()
        }
        
        try:
            # Basic data validation
            basic_errors = TournamentIntegrityValidator._validate_basic_data(tournament)
            validation_report['errors'].extend(basic_errors)
            
            # Date validation
            date_errors = TournamentIntegrityValidator._validate_dates(tournament)
            validation_report['errors'].extend(date_errors)
            
            # Capacity validation
            capacity_warnings = TournamentIntegrityValidator._validate_capacity(tournament)
            validation_report['warnings'].extend(capacity_warnings)
            
            # Prize validation
            prize_errors = TournamentIntegrityValidator._validate_prize_structure(tournament)
            validation_report['errors'].extend(prize_errors)
            
            # Category and rules validation
            category_errors = TournamentIntegrityValidator._validate_category_rules(tournament)
            validation_report['errors'].extend(category_errors)
            
            # Registration validation
            registration_errors = TournamentIntegrityValidator._validate_registration_rules(tournament)
            validation_report['errors'].extend(registration_errors)
            
            # Overall validity
            validation_report['is_valid'] = len(validation_report['errors']) == 0
            
            if not validation_report['is_valid']:
                logger.error(
                    f"Tournament {tournament.id} failed structure validation: "
                    f"{len(validation_report['errors'])} errors"
                )
            else:
                validation_report['info'].append("Tournament structure validation passed")
            
            return validation_report
            
        except Exception as e:
            logger.critical(f"Tournament structure validation crashed for {tournament.id}: {e}")
            validation_report['is_valid'] = False
            validation_report['errors'].append(f"Validation system error: {str(e)}")
            return validation_report
    
    @staticmethod
    def _validate_basic_data(tournament) -> List[str]:
        """Validate basic tournament data integrity."""
        errors = []
        
        # Required fields
        if not tournament.name or len(tournament.name.strip()) < 3:
            errors.append("Tournament name must be at least 3 characters")
        
        if not tournament.description or len(tournament.description.strip()) < 10:
            errors.append("Tournament description must be at least 10 characters")
        
        if not tournament.format:
            errors.append("Tournament format is required")
        
        if not tournament.category:
            errors.append("Tournament category is required")
        
        if not tournament.organizer:
            errors.append("Tournament organizer is required")
        
        # Format validation
        valid_formats = ['elimination', 'double_elimination', 'round_robin', 'swiss']
        if tournament.format not in valid_formats:
            errors.append(f"Invalid tournament format: {tournament.format}")
        
        # Contact information
        if not tournament.contact_email:
            errors.append("Contact email is required")
        
        if tournament.contact_email and '@' not in tournament.contact_email:
            errors.append("Invalid contact email format")
        
        return errors
    
    @staticmethod
    def _validate_dates(tournament) -> List[str]:
        """Validate tournament date logic and consistency."""
        errors = []
        
        now = timezone.now()
        
        # Date existence
        if not tournament.start_date or not tournament.end_date:
            errors.append("Start date and end date are required")
            return errors
        
        if not tournament.registration_start or not tournament.registration_end:
            errors.append("Registration start and end dates are required")
            return errors
        
        # Date logic
        if tournament.start_date > tournament.end_date:
            errors.append("Start date cannot be after end date")
        
        if tournament.registration_start > tournament.registration_end:
            errors.append("Registration start cannot be after registration end")
        
        if tournament.registration_end > timezone.make_aware(
            timezone.datetime.combine(tournament.start_date, timezone.datetime.min.time())
        ):
            errors.append("Registration must end before tournament starts")
        
        # Date ranges
        tournament_duration = tournament.end_date - tournament.start_date
        if tournament_duration.days > MAX_TOURNAMENT_DURATION_DAYS:
            errors.append(f"Tournament duration cannot exceed {MAX_TOURNAMENT_DURATION_DAYS} days")
        
        registration_duration = tournament.registration_end - tournament.registration_start
        if registration_duration.total_seconds() < MIN_REGISTRATION_WINDOW_HOURS * 3600:
            errors.append(f"Registration window must be at least {MIN_REGISTRATION_WINDOW_HOURS} hours")
        
        if registration_duration.days > MAX_REGISTRATION_WINDOW_DAYS:
            errors.append(f"Registration window cannot exceed {MAX_REGISTRATION_WINDOW_DAYS} days")
        
        # Past date validation (only for active tournaments)
        if tournament.status in ['draft', 'published'] and tournament.start_date <= now.date():
            errors.append("Tournament start date cannot be in the past")
        
        return errors
    
    @staticmethod
    def _validate_capacity(tournament) -> List[str]:
        """Validate tournament team capacity settings."""
        warnings = []
        
        # Capacity limits
        if tournament.min_teams < MIN_TEAMS_PER_TOURNAMENT:
            warnings.append(f"Minimum teams below recommended minimum ({MIN_TEAMS_PER_TOURNAMENT})")
        
        if tournament.max_teams > MAX_TEAMS_PER_TOURNAMENT:
            warnings.append(f"Maximum teams above recommended maximum ({MAX_TEAMS_PER_TOURNAMENT})")
        
        if tournament.min_teams > tournament.max_teams:
            warnings.append("Minimum teams cannot exceed maximum teams")
        
        # Format-specific capacity validation
        if tournament.format == 'elimination':
            # Check if max_teams is reasonable for elimination bracket
            if tournament.max_teams > 0:
                rounds_needed = math.ceil(math.log2(tournament.max_teams))
                if rounds_needed > 8:  # More than 8 rounds is excessive
                    warnings.append(f"Large elimination tournament ({rounds_needed} rounds) may be difficult to manage")
        
        elif tournament.format == 'round_robin':
            # Round robin becomes impractical with too many teams
            if tournament.max_teams > 16:
                total_matches = (tournament.max_teams * (tournament.max_teams - 1)) // 2
                warnings.append(f"Round robin with {tournament.max_teams} teams requires {total_matches} matches")
        
        return warnings
    
    @staticmethod
    def _validate_prize_structure(tournament) -> List[str]:
        """Validate tournament prize structure and distribution."""
        errors = []
        
        try:
            prizes = tournament.prizes.all()
            
            if prizes.exists():
                total_cash_prizes = sum(
                    p.cash_value for p in prizes if p.cash_value
                )
                
                # Validate against registration fees
                if tournament.registration_fee > 0:
                    max_prize_pool = tournament.max_teams * tournament.registration_fee
                    
                    if total_cash_prizes > max_prize_pool:
                        errors.append(
                            f"Total prize money (€{total_cash_prizes}) exceeds maximum possible pool "
                            f"(€{max_prize_pool})"
                        )
                    
                    # Check if prize distribution is reasonable
                    if total_cash_prizes > 0:
                        winner_prize = next((p.cash_value for p in prizes if p.position == 1), 0)
                        
                        if winner_prize and winner_prize / total_cash_prizes < MIN_WINNER_PRIZE_PERCENTAGE:
                            errors.append(
                                f"Winner prize ({winner_prize}) should be at least "
                                f"{MIN_WINNER_PRIZE_PERCENTAGE*100}% of total prizes"
                            )
                
                # Check position consistency
                positions = [p.position for p in prizes]
                if len(positions) != len(set(positions)):
                    errors.append("Duplicate prize positions found")
                
                if positions and min(positions) < 1:
                    errors.append("Prize positions must start from 1")
                
                if positions and max(positions) > tournament.max_teams:
                    errors.append("Prize positions exceed maximum teams")
        
        except Exception as e:
            errors.append(f"Error validating prize structure: {str(e)}")
        
        return errors
    
    @staticmethod
    def _validate_category_rules(tournament) -> List[str]:
        """Validate tournament category and rules consistency."""
        errors = []
        
        if not tournament.category:
            return ['Tournament category is required']
        
        try:
            category = tournament.category
            
            # Age restrictions validation
            if category.min_age and category.max_age:
                if category.min_age > category.max_age:
                    errors.append("Category minimum age cannot exceed maximum age")
                
                age_range = category.max_age - category.min_age
                if age_range > 50:
                    errors.append(f"Age range ({age_range} years) is unusually large")
            
            # Level restrictions validation
            if category.min_level and category.max_level:
                if hasattr(category.min_level, 'min_rating') and hasattr(category.max_level, 'max_rating'):
                    if category.min_level.min_rating > category.max_level.max_rating:
                        errors.append("Category minimum level cannot exceed maximum level")
            
            # Gender restrictions
            valid_genders = ['male', 'female', 'mixed', 'any']
            if category.gender not in valid_genders:
                errors.append(f"Invalid category gender: {category.gender}")
        
        except Exception as e:
            errors.append(f"Error validating category rules: {str(e)}")
        
        return errors
    
    @staticmethod
    def _validate_registration_rules(tournament) -> List[str]:
        """Validate tournament registration rules and settings."""
        errors = []
        
        # Payment requirements
        if tournament.requires_payment and tournament.registration_fee <= 0:
            errors.append("Registration fee required when payment is mandatory")
        
        if tournament.registration_fee < 0:
            errors.append("Registration fee cannot be negative")
        
        if tournament.registration_fee > 10000:  # Sanity check
            errors.append("Registration fee seems unreasonably high")
        
        # Substitute settings
        if tournament.max_substitutes_per_team < 0:
            errors.append("Maximum substitutes cannot be negative")
        
        if tournament.max_substitutes_per_team > 5:
            errors.append("Too many substitutes per team (max recommended: 5)")
        
        # Visibility and approval
        valid_visibility = ['public', 'private', 'members_only']
        if tournament.visibility not in valid_visibility:
            errors.append(f"Invalid visibility setting: {tournament.visibility}")
        
        return errors
    
    @staticmethod
    def validate_bracket_consistency(tournament) -> Dict[str, Any]:
        """
        CRITICAL: Validate complete bracket structure and consistency.
        
        This is the most important validation for competitive integrity.
        Ensures no orphan matches, proper advancement paths, and valid bracket structure.
        """
        validation_report = {
            'tournament_id': str(tournament.id),
            'format': tournament.format,
            'is_consistent': True,
            'errors': [],
            'warnings': [],
            'bracket_stats': {},
            'validation_timestamp': timezone.now().isoformat()
        }
        
        try:
            # Only validate bracket formats
            if tournament.format not in ['elimination', 'double_elimination']:
                validation_report['bracket_stats']['note'] = 'Non-bracket format - skipping bracket validation'
                return validation_report
            
            # Get tournament data
            brackets = list(tournament.brackets.select_related('advances_to', 'match', 'team1', 'team2').all())
            matches = list(tournament.matches.select_related('team1', 'team2', 'winner').all())
            registrations = list(tournament.registrations.filter(status='confirmed'))
            
            validation_report['bracket_stats'] = {
                'total_brackets': len(brackets),
                'total_matches': len(matches),
                'confirmed_teams': len(registrations)
            }
            
            # Core bracket validations
            bracket_errors = TournamentIntegrityValidator._validate_bracket_structure(
                tournament, brackets, matches, registrations
            )
            validation_report['errors'].extend(bracket_errors)
            
            # Match-bracket relationship validation
            relationship_errors = TournamentIntegrityValidator._validate_match_bracket_relationships(
                brackets, matches
            )
            validation_report['errors'].extend(relationship_errors)
            
            # Advancement path validation
            advancement_errors = TournamentIntegrityValidator._validate_advancement_paths(
                brackets, tournament.format
            )
            validation_report['errors'].extend(advancement_errors)
            
            # Winner progression validation
            progression_errors = TournamentIntegrityValidator._validate_winner_progression(
                matches, brackets
            )
            validation_report['errors'].extend(progression_errors)
            
            # Bye handling validation
            bye_warnings = TournamentIntegrityValidator._validate_bye_handling(
                brackets, len(registrations), tournament.format
            )
            validation_report['warnings'].extend(bye_warnings)
            
            # Overall consistency
            validation_report['is_consistent'] = len(validation_report['errors']) == 0
            
            if not validation_report['is_consistent']:
                logger.error(
                    f"Bracket consistency validation failed for tournament {tournament.id}: "
                    f"{len(validation_report['errors'])} errors"
                )
            else:
                logger.info(f"Bracket consistency validation passed for tournament {tournament.id}")
            
            return validation_report
            
        except Exception as e:
            logger.critical(f"Bracket validation crashed for tournament {tournament.id}: {e}")
            validation_report['is_consistent'] = False
            validation_report['errors'].append(f"Bracket validation system error: {str(e)}")
            return validation_report
    
    @staticmethod
    def _validate_bracket_structure(tournament, brackets, matches, registrations) -> List[str]:
        """Validate the basic bracket structure."""
        errors = []
        
        if not brackets and tournament.status in ['in_progress', 'completed']:
            errors.append("Tournament in progress should have bracket structure")
            return errors
        
        if not brackets:
            return []  # No bracket to validate yet
        
        # Round structure validation
        rounds = {}
        for bracket in brackets:
            round_num = bracket.round_number
            if round_num not in rounds:
                rounds[round_num] = []
            rounds[round_num].append(bracket)
        
        # Check round numbering
        if rounds:
            round_numbers = sorted(rounds.keys())
            
            # Should start from 1
            if round_numbers[0] != 1:
                errors.append(f"Bracket rounds should start from 1, found: {round_numbers[0]}")
            
            # Should be consecutive
            for i in range(len(round_numbers) - 1):
                if round_numbers[i+1] != round_numbers[i] + 1:
                    errors.append(f"Non-consecutive round numbers: {round_numbers[i]} -> {round_numbers[i+1]}")
        
        # Position validation within rounds
        for round_num, round_brackets in rounds.items():
            positions = [b.position for b in round_brackets]
            
            # Positions should start from 0 or 1 and be consecutive
            positions.sort()
            expected_positions = list(range(len(positions)))
            
            if positions != expected_positions and positions != [i+1 for i in expected_positions]:
                errors.append(f"Round {round_num} has invalid position sequence: {positions}")
        
        return errors
    
    @staticmethod
    def _validate_match_bracket_relationships(brackets, matches) -> List[str]:
        """Validate relationships between matches and bracket positions."""
        errors = []
        
        # Every match should have a bracket position
        match_ids_in_brackets = {str(b.match.id) for b in brackets if b.match}
        match_ids = {str(m.id) for m in matches}
        
        orphaned_matches = match_ids - match_ids_in_brackets
        if orphaned_matches:
            errors.append(f"Found {len(orphaned_matches)} orphaned matches without bracket positions")
        
        # Every bracket with a match should have valid match data
        for bracket in brackets:
            if bracket.match:
                match = bracket.match
                
                # Match teams should match bracket teams
                if bracket.team1 and match.team1 != bracket.team1:
                    errors.append(f"Bracket {bracket.id} team1 mismatch with match {match.id}")
                
                if bracket.team2 and match.team2 != bracket.team2:
                    errors.append(f"Bracket {bracket.id} team2 mismatch with match {match.id}")
                
                # Round numbers should match
                if match.round_number != bracket.round_number:
                    errors.append(
                        f"Round number mismatch: bracket {bracket.id} round {bracket.round_number}, "
                        f"match {match.id} round {match.round_number}"
                    )
        
        return errors
    
    @staticmethod
    def _validate_advancement_paths(brackets, tournament_format: str) -> List[str]:
        """Validate that advancement paths in bracket are correct."""
        errors = []
        
        if tournament_format not in ['elimination', 'double_elimination']:
            return []
        
        # Build advancement map
        advancement_map = {}
        for bracket in brackets:
            if bracket.advances_to:
                advancement_map[bracket.id] = bracket.advances_to.id
        
        # Validate advancement logic
        for bracket in brackets:
            if bracket.advances_to:
                next_bracket = bracket.advances_to
                
                # Next bracket should be in next round
                if next_bracket.round_number != bracket.round_number + 1:
                    errors.append(
                        f"Invalid advancement: bracket {bracket.id} round {bracket.round_number} "
                        f"advances to round {next_bracket.round_number}"
                    )
                
                # Position logic for elimination tournaments
                if tournament_format == 'elimination':
                    expected_next_position = bracket.position // 2
                    if next_bracket.position != expected_next_position:
                        errors.append(
                            f"Invalid position advancement: bracket {bracket.id} position {bracket.position} "
                            f"should advance to position {expected_next_position}, "
                            f"found {next_bracket.position}"
                        )
        
        # Check for circular references
        visited = set()
        for start_bracket in brackets:
            current_id = start_bracket.id
            path = []
            
            while current_id and current_id not in visited:
                if current_id in path:
                    errors.append(f"Circular advancement path detected: {' -> '.join(map(str, path + [current_id]))}")
                    break
                
                path.append(current_id)
                current_id = advancement_map.get(current_id)
            
            visited.update(path)
        
        return errors
    
    @staticmethod
    def _validate_winner_progression(matches, brackets) -> List[str]:
        """Validate that match winners have been properly advanced."""
        errors = []
        
        # Check completed matches with winners
        completed_matches = [m for m in matches if m.status == 'completed' and m.winner]
        
        for match in completed_matches:
            # Find bracket for this match
            bracket = next((b for b in brackets if b.match and b.match.id == match.id), None)
            
            if not bracket:
                errors.append(f"Completed match {match.id} has no bracket position")
                continue
            
            if bracket.advances_to:
                next_bracket = bracket.advances_to
                
                # Winner should be in next bracket
                winner_advanced = (
                    next_bracket.team1 == match.winner or 
                    next_bracket.team2 == match.winner
                )
                
                if not winner_advanced:
                    errors.append(
                        f"Winner of match {match.id} ({match.winner.team_display_name}) "
                        f"not found in next bracket {next_bracket.id}"
                    )
        
        return errors
    
    @staticmethod
    def _validate_bye_handling(brackets, teams_count: int, tournament_format: str) -> List[str]:
        """Validate bye handling in tournament brackets."""
        warnings = []
        
        if tournament_format != 'elimination' or teams_count == 0:
            return []
        
        # Check if we need byes (not a power of 2)
        is_power_of_2 = teams_count > 0 and (teams_count & (teams_count - 1)) == 0
        
        if not is_power_of_2:
            # We should have byes
            first_round_brackets = [b for b in brackets if b.round_number == 1]
            byes_count = sum(1 for b in first_round_brackets if not b.team1 or not b.team2)
            
            if byes_count == 0:
                warnings.append(
                    f"Tournament with {teams_count} teams (not power of 2) should have byes"
                )
            else:
                # Calculate expected byes
                next_power_of_2 = 2 ** math.ceil(math.log2(teams_count))
                expected_byes = next_power_of_2 - teams_count
                
                if byes_count != expected_byes:
                    warnings.append(
                        f"Expected {expected_byes} byes for {teams_count} teams, found {byes_count}"
                    )
        
        return warnings
    
    @staticmethod
    def validate_registration_eligibility(tournament, registration_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        CRITICAL: Validate registration eligibility and prevent invalid registrations.
        
        Args:
            tournament: Tournament object
            registration_data: Dict with registration information
            
        Returns:
            Dict with validation results
        """
        validation_result = {
            'is_eligible': True,
            'errors': [],
            'warnings': [],
            'validation_timestamp': timezone.now().isoformat()
        }
        
        try:
            # Basic registration validation
            basic_errors = TournamentIntegrityValidator._validate_basic_registration(
                tournament, registration_data
            )
            validation_result['errors'].extend(basic_errors)
            
            # Player eligibility validation
            if 'player1' in registration_data and 'player2' in registration_data:
                player_errors = TournamentIntegrityValidator._validate_player_eligibility(
                    tournament, registration_data['player1'], registration_data['player2']
                )
                validation_result['errors'].extend(player_errors)
            
            # Duplicate registration check
            duplicate_errors = TournamentIntegrityValidator._validate_no_duplicate_registration(
                tournament, registration_data
            )
            validation_result['errors'].extend(duplicate_errors)
            
            # Tournament capacity check
            capacity_errors = TournamentIntegrityValidator._validate_tournament_capacity(tournament)
            validation_result['errors'].extend(capacity_errors)
            
            # Registration window check
            timing_errors = TournamentIntegrityValidator._validate_registration_timing(tournament)
            validation_result['errors'].extend(timing_errors)
            
            # Overall eligibility
            validation_result['is_eligible'] = len(validation_result['errors']) == 0
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Registration eligibility validation failed: {e}")
            validation_result['is_eligible'] = False
            validation_result['errors'].append(f"Validation error: {str(e)}")
            return validation_result
    
    @staticmethod
    def _validate_basic_registration(tournament, registration_data: Dict[str, Any]) -> List[str]:
        """Validate basic registration data."""
        errors = []
        
        required_fields = ['team_name', 'player1', 'player2', 'contact_email']
        for field in required_fields:
            if field not in registration_data or not registration_data[field]:
                errors.append(f"Required field missing: {field}")
        
        # Team name validation
        if 'team_name' in registration_data:
            team_name = registration_data['team_name'].strip()
            if len(team_name) < 2:
                errors.append("Team name must be at least 2 characters")
            if len(team_name) > 100:
                errors.append("Team name cannot exceed 100 characters")
        
        # Email validation
        if 'contact_email' in registration_data:
            email = registration_data['contact_email']
            if '@' not in email or '.' not in email:
                errors.append("Invalid email format")
        
        return errors
    
    @staticmethod
    def _validate_player_eligibility(tournament, player1_id, player2_id) -> List[str]:
        """Validate player eligibility for tournament category."""
        errors = []
        
        try:
            from apps.clients.models import ClientProfile
            
            # Get player profiles
            try:
                player1 = ClientProfile.objects.get(id=player1_id)
                player2 = ClientProfile.objects.get(id=player2_id)
            except ClientProfile.DoesNotExist:
                errors.append("Invalid player profile provided")
                return errors
            
            # Same player check
            if player1 == player2:
                errors.append("Player 1 and Player 2 cannot be the same")
            
            # Category eligibility
            if tournament.category:
                if not tournament.category.is_player_eligible(player1):
                    errors.append(f"Player {player1.user.get_full_name()} is not eligible for this category")
                
                if not tournament.category.is_player_eligible(player2):
                    errors.append(f"Player {player2.user.get_full_name()} is not eligible for this category")
            
            return errors
            
        except Exception as e:
            return [f"Error validating player eligibility: {str(e)}"]
    
    @staticmethod
    def _validate_no_duplicate_registration(tournament, registration_data: Dict[str, Any]) -> List[str]:
        """Check for duplicate registrations."""
        errors = []
        
        try:
            if 'player1' not in registration_data or 'player2' not in registration_data:
                return []
            
            player1_id = registration_data['player1']
            player2_id = registration_data['player2']
            
            # Check if either player is already registered
            existing = tournament.registrations.filter(
                Q(player1_id=player1_id) | Q(player1_id=player2_id) |
                Q(player2_id=player1_id) | Q(player2_id=player2_id)
            ).exists()
            
            if existing:
                errors.append("One or both players are already registered in this tournament")
            
            # Check team name uniqueness
            if 'team_name' in registration_data:
                team_name = registration_data['team_name']
                if tournament.registrations.filter(team_name=team_name).exists():
                    errors.append(f"Team name '{team_name}' is already taken")
            
            return errors
            
        except Exception as e:
            return [f"Error checking for duplicate registration: {str(e)}"]
    
    @staticmethod
    def _validate_tournament_capacity(tournament) -> List[str]:
        """Check tournament capacity."""
        errors = []
        
        try:
            current_teams = tournament.current_teams_count
            
            if current_teams >= tournament.max_teams:
                errors.append("Tournament is at maximum capacity")
            
            return errors
            
        except Exception as e:
            return [f"Error checking tournament capacity: {str(e)}"]
    
    @staticmethod
    def _validate_registration_timing(tournament) -> List[str]:
        """Validate registration timing."""
        errors = []
        
        now = timezone.now()
        
        if now < tournament.registration_start:
            errors.append("Registration has not opened yet")
        
        if now > tournament.registration_end:
            errors.append("Registration period has ended")
        
        if tournament.status not in ['published', 'registration_open']:
            errors.append(f"Tournament registration not available (status: {tournament.status})")
        
        return errors


# Helper functions for easy validation
def validate_tournament(tournament) -> bool:
    """
    Quick tournament validation check.
    
    Returns:
        True if tournament is valid, False otherwise
    """
    validator = TournamentIntegrityValidator()
    result = validator.validate_tournament_structure(tournament)
    return result['is_valid']


def validate_bracket(tournament) -> bool:
    """
    Quick bracket validation check.
    
    Returns:
        True if bracket is consistent, False otherwise
    """
    validator = TournamentIntegrityValidator()
    result = validator.validate_bracket_consistency(tournament)
    return result['is_consistent']


def can_register_team(tournament, registration_data: Dict[str, Any]) -> bool:
    """
    Quick registration eligibility check.
    
    Returns:
        True if registration is allowed, False otherwise
    """
    validator = TournamentIntegrityValidator()
    result = validator.validate_registration_eligibility(tournament, registration_data)
    return result['is_eligible']


def get_validation_errors(tournament) -> List[str]:
    """
    Get all validation errors for a tournament.
    
    Returns:
        List of error messages
    """
    validator = TournamentIntegrityValidator()
    structure_result = validator.validate_tournament_structure(tournament)
    
    errors = structure_result['errors'].copy()
    
    # Add bracket errors if tournament has brackets
    if tournament.format in ['elimination', 'double_elimination']:
        bracket_result = validator.validate_bracket_consistency(tournament)
        errors.extend(bracket_result['errors'])
    
    return errors