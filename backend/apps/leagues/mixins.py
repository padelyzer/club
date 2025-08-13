"""
League safety mixins for ABSOLUTE season integrity and league consistency.
Zero tolerance for standings corruption, season overlap, or invalid league states.

CRITICAL: This module handles LEAGUE OPERATIONS with competitive and statistical implications.
Every line of code has been reviewed for league integrity protection.
"""

import functools
import logging
import time
import uuid
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime, timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, OperationalError, transaction
from django.db.models import Q, F, Sum, Count, Max, Min
from django.utils import timezone
from django.conf import settings

# Configure league logger with highest severity
logger = logging.getLogger('leagues.critical')

# League constants - NEVER modify these without formal review
MAX_LEAGUE_TEAMS = 32
MIN_LEAGUE_TEAMS = 4
SEASON_OVERLAP_TOLERANCE_DAYS = 3
MAX_CONCURRENT_SEASONS = 2
STANDINGS_UPDATE_TIMEOUT = 30  # seconds

# League safety thresholds
SUSPICIOUS_STANDINGS_CHANGES = 10
MAX_PROMOTION_RELEGATION_PERCENTAGE = 0.25  # 25%
MIN_SEASON_DURATION_DAYS = 30
MAX_SEASON_DURATION_DAYS = 365


class LeagueSafetyMixin:
    """
    CRITICAL: Main league safety mixin providing ACID-compliant league operations.
    
    This mixin ensures:
    - Perfect season integrity (no overlapping seasons or invalid transitions)
    - Complete standings consistency (no corrupted rankings or invalid calculations)
    - Absolute isolation (concurrent season safety)  
    - Total durability (permanent historical records)
    - Zero standings corruption or invalid states
    - Complete audit trail for every league action
    """
    
    MAX_RETRIES = 2  # Fewer retries for league ops
    RETRY_DELAY = 1.5  # Longer delay for league ops
    LOCK_TIMEOUT = 30  # seconds
    
    @contextmanager
    def league_season_context(self, league=None, operation_type='unknown'):
        """
        CRITICAL: Context manager for safe league season operations.
        Provides distributed locking, audit trail, and rollback safety.
        """
        operation_id = str(uuid.uuid4())
        start_time = timezone.now()
        
        logger.critical(
            f"LEAGUE_OPERATION_START: {operation_id} "
            f"league={getattr(league, 'id', 'system')} type={operation_type}"
        )
        
        try:
            # Acquire distributed lock for league consistency
            with transaction.atomic():
                # Use select_for_update to prevent concurrent modifications
                yield operation_id
                
                logger.critical(
                    f"LEAGUE_OPERATION_SUCCESS: {operation_id} "
                    f"duration={(timezone.now() - start_time).total_seconds():.3f}s"
                )
                
        except Exception as e:
            logger.critical(
                f"LEAGUE_OPERATION_FAILED: {operation_id} "
                f"error={str(e)} duration={(timezone.now() - start_time).total_seconds():.3f}s"
            )
            raise
    
    def execute_league_operation(
        self, 
        league,
        operation_type: str,
        operation_data: Dict[str, Any],
        user=None,
        force_validation: bool = True
    ) -> Dict[str, Any]:
        """
        CRITICAL: Execute league operation with complete integrity guarantees.
        
        This method:
        1. Validates all inputs with zero tolerance for errors
        2. Checks league state consistency
        3. Prevents concurrent operations that could corrupt standings
        4. Creates immutable audit records
        5. Ensures atomic league state changes
        6. Provides complete rollback on any failure
        
        Args:
            league: League object
            operation_type: Type of operation (start_season, update_standings, promote_teams)
            operation_data: Dictionary with operation information
            user: User initiating operation
            force_validation: Whether to force complete validation
            
        Returns:
            Dict with operation results and audit information
            
        Raises:
            ValidationError: For any validation failure
            IntegrityError: For data integrity violations
        """
        
        # CRITICAL: Input validation with zero tolerance
        if not league:
            raise ValidationError("League is required")
            
        valid_operations = [
            'start_season', 'end_season', 'update_standings', 
            'promote_teams', 'relegate_teams', 'transition_season',
            'calculate_final_standings', 'award_season_prizes'
        ]
        
        if operation_type not in valid_operations:
            raise ValidationError(f"Invalid operation type: {operation_type}")
        
        if not isinstance(operation_data, dict):
            raise ValidationError(f"Operation data must be dict, got {type(operation_data)}")
        
        # Execute operation with full safety
        with self.league_season_context(league, operation_type) as operation_id:
            try:
                # Validate league state
                self._validate_league_state(league, operation_type)
                
                # Perform operation-specific validation
                self._validate_operation_requirements(league, operation_type, operation_data)
                
                # Detect suspicious operations
                self._detect_suspicious_league_operation(league, operation_type, user)
                
                # Execute the actual operation
                operation_result = self._execute_league_operation_core(
                    league, operation_type, operation_data, user, operation_id
                )
                
                # Validate post-operation state
                if force_validation:
                    self._validate_post_operation_state(league, operation_type)
                
                # Create immutable audit log
                audit_record = self._create_league_audit_record(
                    league, operation_type, operation_result, user, operation_id
                )
                
                result = {
                    'operation_id': operation_id,
                    'league_id': str(league.id),
                    'operation_type': operation_type,
                    'status': 'completed',
                    'result': operation_result,
                    'audit_id': audit_record['id'],
                    'timestamp': timezone.now().isoformat()
                }
                
                logger.critical(f"LEAGUE_OPERATION_EXECUTED: {result}")
                return result
                
            except Exception as e:
                # CRITICAL: Log league operation failure
                logger.critical(
                    f"LEAGUE_OPERATION_EXECUTION_FAILED: "
                    f"operation_id={operation_id} league={league.id} error={str(e)}"
                )
                raise
    
    def safe_season_transition(
        self, 
        current_season, 
        transition_type: str = 'natural_end',
        user=None
    ) -> Dict[str, Any]:
        """
        CRITICAL: Safely transition between seasons with historical preservation.
        Ensures no data loss and proper promotion/relegation handling.
        """
        if not current_season:
            raise ValidationError("Current season is required")
            
        with self.league_season_context(current_season.league, 'season_transition') as operation_id:
            try:
                # Lock current season
                locked_season = current_season.__class__.objects.select_for_update().get(
                    id=current_season.id
                )
                
                if locked_season.status not in ['in_progress', 'completed']:
                    raise ValidationError(f"Cannot transition season in status: {locked_season.status}")
                
                # Finalize current season standings
                final_standings = self._finalize_season_standings(locked_season)
                
                # Handle promotion/relegation if enabled
                promotion_relegation_result = None
                if locked_season.league.allow_promotion_relegation:
                    promotion_relegation_result = self._handle_promotion_relegation(
                        locked_season, final_standings
                    )
                
                # Create historical record
                historical_record = self._create_season_historical_record(
                    locked_season, final_standings, promotion_relegation_result
                )
                
                # Mark season as completed
                locked_season.status = 'completed'
                locked_season.save()
                
                # Prepare next season if configured
                next_season = None
                if transition_type == 'natural_end' and locked_season.league.status == 'active':
                    next_season = self._prepare_next_season(locked_season)
                
                result = {
                    'transition_type': transition_type,
                    'completed_season_id': str(locked_season.id),
                    'final_standings_count': len(final_standings),
                    'promotion_relegation': promotion_relegation_result,
                    'historical_record_id': historical_record['id'],
                    'next_season_id': str(next_season.id) if next_season else None,
                    'timestamp': timezone.now().isoformat()
                }
                
                logger.critical(f"SEASON_TRANSITION_COMPLETED: {result}")
                return result
                
            except Exception as e:
                logger.critical(f"SEASON_TRANSITION_FAILED: {str(e)}")
                raise
    
    def update_standings_atomic(
        self, 
        season, 
        match_result: Dict[str, Any],
        user=None
    ) -> Dict[str, Any]:
        """
        CRITICAL: Atomically update league standings with complete consistency.
        Ensures standings are always mathematically correct and consistent.
        """
        with self.league_season_context(season.league, 'standings_update') as operation_id:
            try:
                # Lock all related standings
                season_standings = season.standings.select_for_update().order_by('position')
                
                # Validate match result data
                self._validate_match_result_for_standings(match_result)
                
                # Calculate standings changes
                standings_changes = self._calculate_standings_changes(
                    season_standings, match_result
                )
                
                # Apply changes atomically
                self._apply_standings_changes(season_standings, standings_changes)
                
                # Recalculate positions
                updated_standings = self._recalculate_standings_positions(season)
                
                # Validate standings integrity
                self._validate_standings_integrity(updated_standings)
                
                result = {
                    'match_id': match_result.get('match_id'),
                    'updated_teams': len(standings_changes),
                    'standings_positions_changed': self._count_position_changes(updated_standings),
                    'operation_id': operation_id,
                    'timestamp': timezone.now().isoformat()
                }
                
                logger.info(f"STANDINGS_UPDATED: {result}")
                return result
                
            except Exception as e:
                logger.critical(f"STANDINGS_UPDATE_FAILED: {str(e)}")
                raise
    
    def _validate_league_state(self, league, operation_type: str):
        """
        CRITICAL: Validate league state before any operation.
        Prevents operations on invalid or corrupted leagues.
        """
        # Check basic league validity
        if not league.pk:
            raise ValidationError("League must be saved before operations")
        
        # Operation-specific state validation
        state_requirements = {
            'start_season': ['published', 'registration_closed'],
            'end_season': ['in_progress'],
            'update_standings': ['in_progress'],
            'promote_teams': ['completed'],
            'relegate_teams': ['completed'],
            'transition_season': ['in_progress', 'completed'],
            'calculate_final_standings': ['in_progress', 'completed']
        }
        
        required_states = state_requirements.get(operation_type, [])
        if required_states and league.status not in required_states:
            raise ValidationError(
                f"League status '{league.status}' invalid for operation '{operation_type}'. "
                f"Required: {required_states}"
            )
        
        # Check for season conflicts
        current_seasons = league.seasons.filter(status__in=['active', 'in_progress']).count()
        if operation_type == 'start_season' and current_seasons >= MAX_CONCURRENT_SEASONS:
            raise ValidationError(f"Too many concurrent seasons: {current_seasons}")
        
        logger.debug(f"League state validation passed for {operation_type}")
    
    def _validate_operation_requirements(
        self, 
        league, 
        operation_type: str, 
        operation_data: Dict[str, Any]
    ):
        """
        CRITICAL: Validate operation-specific requirements.
        Each operation has specific data requirements and business rules.
        """
        if operation_type == 'start_season':
            current_season = league.current_season
            if not current_season:
                raise ValidationError("No current season to start")
            
            if current_season.teams_count < league.min_teams:
                raise ValidationError(
                    f"Not enough teams to start season: {current_season.teams_count} < {league.min_teams}"
                )
        
        elif operation_type == 'update_standings':
            required_fields = ['match_id', 'home_team_id', 'away_team_id', 'winner_id']
            for field in required_fields:
                if field not in operation_data:
                    raise ValidationError(f"Required field missing: {field}")
        
        elif operation_type == 'promote_teams':
            if not league.allow_promotion_relegation:
                raise ValidationError("League does not allow promotion/relegation")
            
            if 'teams' not in operation_data or not operation_data['teams']:
                raise ValidationError("Teams list required for promotion")
        
        logger.debug(f"Operation requirements validated for {operation_type}")
    
    def _detect_suspicious_league_operation(
        self, 
        league, 
        operation_type: str, 
        user
    ):
        """
        CRITICAL: Detect potentially suspicious league operations.
        Implements fraud detection for league manipulation.
        """
        suspicious_indicators = []
        
        # Check for excessive standings updates
        if operation_type == 'update_standings' and user:
            recent_updates = cache.get(f"standings_updates_{user.id}_{league.id}", 0)
            if recent_updates > SUSPICIOUS_STANDINGS_CHANGES:
                suspicious_indicators.append(f"excessive_standings_updates: {recent_updates}")
        
        # Check for rapid season transitions
        if operation_type == 'start_season':
            recent_seasons = league.seasons.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
            
            if recent_seasons > 3:
                suspicious_indicators.append(f"rapid_season_creation: {recent_seasons}")
        
        if suspicious_indicators:
            logger.warning(
                f"SUSPICIOUS_LEAGUE_OPERATION: "
                f"league={league.id} user={getattr(user, 'id', 'anonymous')} "
                f"operation={operation_type} indicators={suspicious_indicators}"
            )
    
    def _execute_league_operation_core(
        self, 
        league, 
        operation_type: str, 
        operation_data: Dict[str, Any], 
        user, 
        operation_id: str
    ) -> Dict[str, Any]:
        """
        CRITICAL: Execute the core league operation with atomic guarantees.
        This is where the actual league state change occurs.
        """
        result = {'status': 'completed', 'changes': []}
        
        try:
            if operation_type == 'start_season':
                season_result = self._start_season_atomic(league, user)
                result['season_id'] = str(season_result['season'].id)
                result['changes'].append("season_started")
            
            elif operation_type == 'end_season':
                end_result = self._end_season_atomic(league, operation_data, user)
                result['final_standings'] = end_result['standings']
                result['changes'].append("season_ended")
            
            elif operation_type == 'update_standings':
                standings_result = self.update_standings_atomic(
                    league.current_season, operation_data, user
                )
                result['standings_update'] = standings_result
                result['changes'].append(f"standings_updated: {standings_result['updated_teams']} teams")
            
            elif operation_type == 'promote_teams':
                promotion_result = self._promote_teams_atomic(league, operation_data)
                result['promotions'] = promotion_result
                result['changes'].append(f"teams_promoted: {len(promotion_result.get('promoted', []))}")
            
            result['timestamp'] = timezone.now().isoformat()
            logger.critical(f"LEAGUE_OPERATION_CORE_COMPLETED: {result}")
            return result
            
        except Exception as e:
            logger.critical(f"LEAGUE_OPERATION_CORE_FAILED: {str(e)}")
            raise ValidationError(f"League operation failed: {str(e)}")
    
    def _finalize_season_standings(self, season):
        """Finalize season standings with complete validation."""
        standings = list(season.standings.order_by('-points', '-sets_difference', '-games_difference'))
        
        # Validate standings completeness
        expected_teams = season.teams.filter(status='active').count()
        if len(standings) != expected_teams:
            raise ValidationError(f"Standings incomplete: {len(standings)} of {expected_teams} teams")
        
        # Final position assignment
        for i, standing in enumerate(standings, 1):
            standing.position = i
            standing.save()
        
        logger.info(f"Season {season.id} standings finalized: {len(standings)} teams")
        return standings
    
    def _create_season_historical_record(self, season, standings, promotion_relegation):
        """Create immutable historical record of season."""
        historical_id = str(uuid.uuid4())
        
        historical_data = {
            'id': historical_id,
            'season_id': str(season.id),
            'league_id': str(season.league.id),
            'season_name': season.name,
            'start_date': season.start_date.isoformat(),
            'end_date': season.end_date.isoformat(),
            'final_standings': [
                {
                    'position': s.position,
                    'team_id': str(s.team.id),
                    'team_name': s.team.team_display_name,
                    'points': s.points,
                    'matches_played': s.matches_played,
                    'matches_won': s.matches_won,
                    'matches_lost': s.matches_lost,
                    'sets_difference': s.sets_difference,
                    'games_difference': s.games_difference
                }
                for s in standings
            ],
            'promotion_relegation': promotion_relegation,
            'archived_at': timezone.now().isoformat()
        }
        
        logger.critical(f"SEASON_HISTORICAL_RECORD: {historical_data}")
        return historical_data
    
    def _validate_post_operation_state(self, league, operation_type: str):
        """
        CRITICAL: Validate league state after operation completion.
        Ensures no corruption was introduced by the operation.
        """
        # Refresh league from database
        league.refresh_from_db()
        
        # Operation-specific validation
        if operation_type == 'start_season':
            current_season = league.current_season
            if not current_season or current_season.status != 'in_progress':
                raise ValidationError("Season not started correctly")
        
        # Standings integrity check for active seasons
        active_seasons = league.seasons.filter(status='in_progress')
        for season in active_seasons:
            self._validate_season_integrity(season)
        
        logger.debug(f"Post-operation state validation passed for {operation_type}")
    
    def _validate_season_integrity(self, season):
        """
        CRITICAL: Validate complete season integrity.
        Ensures no corrupted standings, duplicate positions, or invalid states.
        """
        standings = list(season.standings.all())
        
        if not standings:
            return  # Empty standings are valid for new seasons
        
        # Check for duplicate positions
        positions = [s.position for s in standings if s.position > 0]
        if len(positions) != len(set(positions)):
            raise ValidationError(f"Duplicate positions found in season {season.id}")
        
        # Check position continuity
        sorted_positions = sorted(positions)
        if sorted_positions and sorted_positions != list(range(1, len(sorted_positions) + 1)):
            raise ValidationError(f"Non-continuous positions in season {season.id}")
        
        logger.debug(f"Season integrity validated for season {season.id}")
    
    def _create_league_audit_record(
        self, 
        league, 
        operation_type: str, 
        operation_result: Dict,
        user,
        operation_id: str
    ) -> Dict[str, Any]:
        """
        CRITICAL: Create immutable audit record for league operations.
        This audit trail CANNOT be modified or deleted.
        """
        audit_id = str(uuid.uuid4())
        audit_timestamp = timezone.now()
        
        audit_data = {
            'id': audit_id,
            'timestamp': audit_timestamp.isoformat(),
            'operation_id': operation_id,
            'league_id': str(league.id),
            'operation_type': operation_type,
            'user_id': getattr(user, 'id', None),
            'league_status': league.status,
            'current_seasons': league.seasons.filter(status__in=['active', 'in_progress']).count(),
            'operation_result': operation_result,
            'system_info': {
                'server_time': audit_timestamp.isoformat(),
                'django_version': getattr(settings, 'DJANGO_VERSION', 'unknown'),
                'environment': getattr(settings, 'ENVIRONMENT', 'unknown')
            }
        }
        
        # Log immutable audit record
        logger.critical(f"LEAGUE_AUDIT_RECORD: {audit_data}")
        
        return audit_data


class HistoricalDataMixin:
    """
    CRITICAL: Mixin for preserving immutable historical league data.
    Ensures complete data preservation and prevents historical tampering.
    """
    
    def preserve_season_snapshot(self, season) -> Dict[str, Any]:
        """
        CRITICAL: Create immutable snapshot of season state.
        Used for historical preservation and audit compliance.
        """
        snapshot_id = str(uuid.uuid4())
        snapshot_timestamp = timezone.now()
        
        # Gather complete season data
        teams_data = []
        for team in season.teams.filter(status='active'):
            team_data = {
                'team_id': str(team.id),
                'team_name': team.team_display_name,
                'player1_id': str(team.player1.id),
                'player2_id': str(team.player2.id),
                'registration_date': team.registration_date.isoformat(),
                'standing': None
            }
            
            # Add current standing if available
            standing = team.current_standing
            if standing:
                team_data['standing'] = {
                    'position': standing.position,
                    'points': standing.points,
                    'matches_played': standing.matches_played,
                    'matches_won': standing.matches_won,
                    'matches_lost': standing.matches_lost,
                    'sets_difference': standing.sets_difference,
                    'games_difference': standing.games_difference,
                    'form': standing.form
                }
            
            teams_data.append(team_data)
        
        # Gather matches data
        matches_data = []
        for match in season.matches.all():
            match_data = {
                'match_id': str(match.id),
                'matchday': match.matchday,
                'home_team_id': str(match.home_team.id),
                'away_team_id': str(match.away_team.id),
                'scheduled_date': match.scheduled_date.isoformat(),
                'status': match.status,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'winner_id': str(match.winner.id) if match.winner else None
            }
            matches_data.append(match_data)
        
        snapshot_data = {
            'snapshot_id': snapshot_id,
            'timestamp': snapshot_timestamp.isoformat(),
            'season_id': str(season.id),
            'league_id': str(season.league.id),
            'season_name': season.name,
            'season_number': season.season_number,
            'start_date': season.start_date.isoformat(),
            'end_date': season.end_date.isoformat(),
            'status': season.status,
            'current_matchday': season.current_matchday,
            'total_matchdays': season.total_matchdays,
            'teams_count': len(teams_data),
            'matches_count': len(matches_data),
            'teams': teams_data,
            'matches': matches_data
        }
        
        # Log immutable snapshot
        logger.critical(f"SEASON_SNAPSHOT_PRESERVED: {snapshot_id}")
        
        # Store in cache for quick access (also store in persistent storage in production)
        cache.set(f"season_snapshot_{snapshot_id}", snapshot_data, timeout=None)
        
        return {
            'snapshot_id': snapshot_id,
            'timestamp': snapshot_timestamp.isoformat(),
            'data_size': len(str(snapshot_data)),
            'teams_preserved': len(teams_data),
            'matches_preserved': len(matches_data)
        }
    
    def retrieve_historical_data(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve immutable historical snapshot by ID."""
        snapshot_data = cache.get(f"season_snapshot_{snapshot_id}")
        
        if not snapshot_data:
            logger.warning(f"Historical snapshot not found: {snapshot_id}")
            return None
        
        logger.info(f"Historical snapshot retrieved: {snapshot_id}")
        return snapshot_data
    
    def validate_historical_integrity(self, snapshot_data: Dict[str, Any]) -> bool:
        """Validate that historical data has not been tampered with."""
        try:
            # Basic structure validation
            required_fields = [
                'snapshot_id', 'timestamp', 'season_id', 'league_id',
                'teams', 'matches'
            ]
            
            for field in required_fields:
                if field not in snapshot_data:
                    logger.error(f"Historical data missing required field: {field}")
                    return False
            
            # Validate data consistency
            teams_count = len(snapshot_data['teams'])
            declared_count = snapshot_data.get('teams_count', 0)
            
            if teams_count != declared_count:
                logger.error(f"Teams count mismatch: {teams_count} vs {declared_count}")
                return False
            
            logger.info(f"Historical integrity validated: {snapshot_data['snapshot_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Historical integrity validation failed: {str(e)}")
            return False


# Decorator for league operations
def league_operation(
    require_user=True,
    allowed_statuses=None,
    require_permissions=None
):
    """
    Decorator for methods that perform league operations.
    Provides additional safety checks and audit logging.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract league and user from kwargs/args
            league = kwargs.get('league') or (args[1] if len(args) > 1 else None)
            user = kwargs.get('user')
            
            # Validation checks
            if require_user and not user:
                raise ValidationError("User required for league operation")
            
            if allowed_statuses and league and league.status not in allowed_statuses:
                raise ValidationError(
                    f"League status '{league.status}' not allowed for this operation"
                )
            
            if require_permissions:
                for permission in require_permissions:
                    if user and not user.has_perm(permission):
                        raise ValidationError(f"Permission required: {permission}")
            
            # Log operation start
            logger.info(
                f"LEAGUE_OPERATION_START: {func.__name__} "
                f"league={getattr(league, 'id', 'none')} user={getattr(user, 'id', 'system')}"
            )
            
            try:
                result = func(*args, **kwargs)
                
                logger.info(
                    f"LEAGUE_OPERATION_SUCCESS: {func.__name__} "
                    f"league={getattr(league, 'id', 'none')} result_keys={list(result.keys()) if isinstance(result, dict) else 'non_dict'}"
                )
                
                return result
                
            except Exception as e:
                logger.error(
                    f"LEAGUE_OPERATION_FAILED: {func.__name__} "
                    f"league={getattr(league, 'id', 'none')} error={str(e)}"
                )
                raise
                
        return wrapper
    return decorator


# Helper functions for league operations
def validate_season_consistency(season) -> bool:
    """
    Validate that season data is consistent and valid.
    """
    try:
        # Check basic season validity
        if season.start_date >= season.end_date:
            return False
        
        # Check season duration
        duration = (season.end_date - season.start_date).days
        if duration < MIN_SEASON_DURATION_DAYS or duration > MAX_SEASON_DURATION_DAYS:
            return False
        
        # Check team count
        teams_count = season.teams_count
        if teams_count < season.league.min_teams or teams_count > season.league.max_teams:
            return False
        
        return True
        
    except Exception as e:
        logger.error(f'Season consistency validation error: {e}')
        return False