"""
Circuit breakers for tournament operations.
Prevents system overload and protects against tournament corruption during high load.

Based on finance module circuit breaker pattern but adapted for tournament-specific operations.
Higher thresholds than finance since tournaments are less critical than money operations.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from contextlib import contextmanager

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone

logger = logging.getLogger('tournaments.circuit_breaker')

# Circuit breaker thresholds - Higher than finance since tournaments are less critical
DEFAULT_FAILURE_THRESHOLD = 5  # Allow more failures before opening
DEFAULT_SUCCESS_THRESHOLD = 3  # Require more successes to close
DEFAULT_TIMEOUT = 300  # 5 minutes timeout (vs 2 minutes for finance)
DEFAULT_HALF_OPEN_TIMEOUT = 60  # 1 minute for half-open state

# Tournament-specific thresholds
INSCRIPTION_RATE_LIMIT = 10  # Max 10 inscriptions per minute per tournament
BRACKET_GENERATION_RATE_LIMIT = 2  # Max 2 bracket generations per minute per tournament
RESULT_PROCESSING_RATE_LIMIT = 20  # Max 20 result submissions per minute per tournament


class TournamentCircuitBreakerError(Exception):
    """Exception raised when circuit breaker is open."""
    pass


class BaseTournamentCircuitBreaker:
    """
    Base circuit breaker for tournament operations.
    Adapted from finance circuit breaker with tournament-specific logic.
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
        success_threshold: int = DEFAULT_SUCCESS_THRESHOLD,
        timeout: int = DEFAULT_TIMEOUT,
        half_open_timeout: int = DEFAULT_HALF_OPEN_TIMEOUT
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout
        self.half_open_timeout = half_open_timeout
        
        # Cache keys
        self.state_key = f"tournament_cb_state_{name}"
        self.failure_count_key = f"tournament_cb_failures_{name}"
        self.success_count_key = f"tournament_cb_successes_{name}"
        self.last_failure_time_key = f"tournament_cb_last_failure_{name}"
        self.rate_limit_key = f"tournament_cb_rate_limit_{name}"
    
    def get_state(self) -> str:
        """Get current circuit breaker state."""
        return cache.get(self.state_key, 'closed')
    
    def set_state(self, state: str):
        """Set circuit breaker state."""
        cache.set(self.state_key, state, timeout=3600)  # 1 hour cache
        logger.info(f"Tournament circuit breaker '{self.name}' state changed to: {state}")
    
    def get_failure_count(self) -> int:
        """Get current failure count."""
        return cache.get(self.failure_count_key, 0)
    
    def increment_failure_count(self):
        """Increment failure count."""
        current_failures = self.get_failure_count()
        cache.set(self.failure_count_key, current_failures + 1, timeout=3600)
        cache.set(self.last_failure_time_key, time.time(), timeout=3600)
        
        logger.warning(
            f"Tournament circuit breaker '{self.name}' failure count: {current_failures + 1}"
        )
    
    def get_success_count(self) -> int:
        """Get current success count in half-open state."""
        return cache.get(self.success_count_key, 0)
    
    def increment_success_count(self):
        """Increment success count."""
        current_successes = self.get_success_count()
        cache.set(self.success_count_key, current_successes + 1, timeout=3600)
    
    def reset_counts(self):
        """Reset all counts."""
        cache.delete(self.failure_count_key)
        cache.delete(self.success_count_key)
        cache.delete(self.last_failure_time_key)
    
    def should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset from open state."""
        state = self.get_state()
        if state != 'open':
            return False
        
        last_failure_time = cache.get(self.last_failure_time_key, 0)
        return time.time() - last_failure_time > self.timeout
    
    def check_rate_limit(self, operation_key: str, rate_limit: int, window_seconds: int = 60) -> bool:
        """
        Check if operation is within rate limits.
        
        Args:
            operation_key: Unique key for this operation type/context
            rate_limit: Maximum operations per window
            window_seconds: Time window in seconds
            
        Returns:
            True if within limits, False if rate limited
        """
        rate_key = f"{self.rate_limit_key}_{operation_key}"
        current_count = cache.get(rate_key, 0)
        
        if current_count >= rate_limit:
            logger.warning(
                f"Rate limit exceeded for '{self.name}' operation '{operation_key}': "
                f"{current_count}/{rate_limit} in {window_seconds}s"
            )
            return False
        
        # Increment counter with sliding window
        cache.set(rate_key, current_count + 1, timeout=window_seconds)
        return True
    
    @contextmanager
    def call(self, operation_key: Optional[str] = None, rate_limit: Optional[int] = None):
        """
        Execute operation with circuit breaker protection.
        
        Args:
            operation_key: Optional key for rate limiting
            rate_limit: Optional rate limit for this operation
        """
        state = self.get_state()
        
        # Check if circuit breaker is open
        if state == 'open':
            if self.should_attempt_reset():
                self.set_state('half_open')
                self.reset_counts()
                logger.info(f"Tournament circuit breaker '{self.name}' moved to half-open")
            else:
                logger.error(f"Tournament circuit breaker '{self.name}' is OPEN - blocking operation")
                raise TournamentCircuitBreakerError(
                    f"Tournament operation '{self.name}' temporarily unavailable"
                )
        
        # Check rate limits if specified
        if operation_key and rate_limit:
            if not self.check_rate_limit(operation_key, rate_limit):
                raise TournamentCircuitBreakerError(
                    f"Rate limit exceeded for tournament operation '{self.name}'"
                )
        
        # Execute operation
        start_time = time.time()
        try:
            yield
            
            # Operation succeeded
            execution_time = time.time() - start_time
            
            if state == 'half_open':
                self.increment_success_count()
                if self.get_success_count() >= self.success_threshold:
                    self.set_state('closed')
                    self.reset_counts()
                    logger.info(f"Tournament circuit breaker '{self.name}' CLOSED after recovery")
            
            logger.debug(
                f"Tournament operation '{self.name}' succeeded in {execution_time:.3f}s"
            )
            
        except Exception as e:
            # Operation failed
            execution_time = time.time() - start_time
            self.increment_failure_count()
            
            if self.get_failure_count() >= self.failure_threshold:
                self.set_state('open')
                logger.error(
                    f"Tournament circuit breaker '{self.name}' OPENED after "
                    f"{self.get_failure_count()} failures"
                )
            
            logger.error(
                f"Tournament operation '{self.name}' failed in {execution_time:.3f}s: {e}"
            )
            raise
    
    def get_status(self) -> Dict[str, Any]:
        """Get circuit breaker status information."""
        state = self.get_state()
        last_failure_time = cache.get(self.last_failure_time_key, 0)
        
        return {
            'name': self.name,
            'state': state,
            'failure_count': self.get_failure_count(),
            'success_count': self.get_success_count() if state == 'half_open' else 0,
            'failure_threshold': self.failure_threshold,
            'success_threshold': self.success_threshold,
            'last_failure_ago_seconds': int(time.time() - last_failure_time) if last_failure_time else None,
            'timeout_seconds': self.timeout,
            'healthy': state == 'closed'
        }


class InscriptionCircuitBreaker(BaseTournamentCircuitBreaker):
    """
    Circuit breaker for tournament inscription/registration operations.
    Prevents tournament overload during high registration periods.
    """
    
    def __init__(self):
        super().__init__(
            name="tournament_inscription",
            failure_threshold=5,  # Allow more failures since registrations are less critical
            success_threshold=3,
            timeout=300,  # 5 minute timeout
            half_open_timeout=60
        )
    
    def register_team(self, tournament_id: str, registration_data: Dict[str, Any]):
        """
        Register team with circuit breaker protection and rate limiting.
        
        Args:
            tournament_id: Tournament identifier
            registration_data: Registration information
        """
        operation_key = f"register_{tournament_id}"
        
        with self.call(operation_key=operation_key, rate_limit=INSCRIPTION_RATE_LIMIT):
            # The actual registration logic would be called here
            logger.info(f"Processing registration for tournament {tournament_id}")
            
            # Validate registration data
            self._validate_registration_data(registration_data)
            
            # Additional tournament-specific checks
            self._check_tournament_capacity(tournament_id)
            
            # If we get here, registration can proceed
            return {"status": "success", "message": "Registration validated"}
    
    def _validate_registration_data(self, registration_data: Dict[str, Any]):
        """Validate registration data format."""
        required_fields = ['team_name', 'player1', 'player2', 'contact_email']
        
        for field in required_fields:
            if field not in registration_data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Additional validation
        if len(registration_data.get('team_name', '')) < 2:
            raise ValidationError("Team name too short")
        
        # Email validation (basic)
        email = registration_data.get('contact_email', '')
        if '@' not in email:
            raise ValidationError("Invalid email format")
    
    def _check_tournament_capacity(self, tournament_id: str):
        """Check if tournament has capacity for new registration."""
        # This would normally query the database
        # For circuit breaker testing, we'll simulate capacity check
        
        # Simulate occasional capacity issues
        import random
        if random.random() < 0.1:  # 10% chance of capacity issue
            raise ValidationError(f"Tournament {tournament_id} is at capacity")


class BracketGenerationCircuitBreaker(BaseTournamentCircuitBreaker):
    """
    Circuit breaker for tournament bracket generation operations.
    Protects against bracket corruption during high load.
    """
    
    def __init__(self):
        super().__init__(
            name="bracket_generation",
            failure_threshold=3,  # Lower threshold since bracket corruption is serious
            success_threshold=2,
            timeout=600,  # 10 minute timeout (longer for complex brackets)
            half_open_timeout=120
        )
    
    def generate_bracket(self, tournament_id: str, tournament_format: str, teams_count: int):
        """
        Generate tournament bracket with circuit breaker protection.
        
        Args:
            tournament_id: Tournament identifier
            tournament_format: Format (elimination, double_elimination, etc.)
            teams_count: Number of registered teams
        """
        operation_key = f"bracket_{tournament_id}"
        
        with self.call(operation_key=operation_key, rate_limit=BRACKET_GENERATION_RATE_LIMIT):
            logger.info(f"Generating {tournament_format} bracket for {teams_count} teams")
            
            # Validate bracket generation parameters
            self._validate_bracket_parameters(tournament_format, teams_count)
            
            # Simulate bracket generation complexity
            self._simulate_bracket_generation(tournament_format, teams_count)
            
            return {
                "status": "success",
                "tournament_id": tournament_id,
                "format": tournament_format,
                "teams": teams_count,
                "matches_created": self._calculate_matches_count(tournament_format, teams_count)
            }
    
    def _validate_bracket_parameters(self, tournament_format: str, teams_count: int):
        """Validate bracket generation parameters."""
        valid_formats = ['elimination', 'double_elimination', 'round_robin', 'swiss']
        
        if tournament_format not in valid_formats:
            raise ValidationError(f"Invalid tournament format: {tournament_format}")
        
        if teams_count < 4:
            raise ValidationError("Minimum 4 teams required for bracket generation")
        
        if teams_count > 256:
            raise ValidationError("Maximum 256 teams supported")
        
        # For elimination tournaments, check if we can create a valid bracket
        if tournament_format in ['elimination', 'double_elimination']:
            if teams_count > 0 and teams_count < 4:
                raise ValidationError("Elimination format requires at least 4 teams")
    
    def _simulate_bracket_generation(self, tournament_format: str, teams_count: int):
        """Simulate bracket generation complexity."""
        import time
        import random
        
        # Simulate processing time based on complexity
        if tournament_format == 'double_elimination':
            processing_time = teams_count * 0.01  # More complex
        elif tournament_format == 'round_robin':
            processing_time = (teams_count * (teams_count - 1)) * 0.001  # Very complex for large tournaments
        else:
            processing_time = teams_count * 0.005  # Standard elimination
        
        time.sleep(min(processing_time, 2.0))  # Cap at 2 seconds for testing
        
        # Simulate occasional failures (database locks, etc.)
        if random.random() < 0.05:  # 5% chance of failure
            raise Exception("Simulated bracket generation failure")
    
    def _calculate_matches_count(self, tournament_format: str, teams_count: int) -> int:
        """Calculate expected number of matches."""
        if tournament_format == 'elimination':
            return teams_count - 1
        elif tournament_format == 'double_elimination':
            return (teams_count * 2) - 2
        elif tournament_format == 'round_robin':
            return (teams_count * (teams_count - 1)) // 2
        else:
            return teams_count  # Default estimate


class ResultProcessingCircuitBreaker(BaseTournamentCircuitBreaker):
    """
    Circuit breaker for match result processing operations.
    Prevents result corruption during concurrent result submissions.
    """
    
    def __init__(self):
        super().__init__(
            name="result_processing",
            failure_threshold=7,  # Higher threshold since results come frequently
            success_threshold=5,
            timeout=180,  # 3 minute timeout
            half_open_timeout=30
        )
    
    def process_match_result(
        self, 
        match_id: str, 
        result_data: Dict[str, Any],
        user_id: Optional[str] = None
    ):
        """
        Process match result with circuit breaker protection.
        
        Args:
            match_id: Match identifier
            result_data: Match result information
            user_id: User submitting the result
        """
        operation_key = f"result_{match_id}"
        
        with self.call(operation_key=operation_key, rate_limit=RESULT_PROCESSING_RATE_LIMIT):
            logger.info(f"Processing result for match {match_id}")
            
            # Validate result data
            self._validate_result_data(result_data)
            
            # Check for result conflicts
            self._check_result_conflicts(match_id, result_data)
            
            # Simulate result processing
            self._simulate_result_processing(result_data)
            
            return {
                "status": "success",
                "match_id": match_id,
                "winner": self._determine_winner(result_data),
                "processed_by": user_id,
                "timestamp": timezone.now().isoformat()
            }
    
    def _validate_result_data(self, result_data: Dict[str, Any]):
        """Validate match result data."""
        required_fields = ['team1_score', 'team2_score']
        
        for field in required_fields:
            if field not in result_data:
                raise ValidationError(f"Missing required field: {field}")
        
        team1_score = result_data['team1_score']
        team2_score = result_data['team2_score']
        
        # Validate score format
        if not isinstance(team1_score, list) or not isinstance(team2_score, list):
            raise ValidationError("Scores must be lists of set scores")
        
        if len(team1_score) != len(team2_score):
            raise ValidationError("Score arrays must have same length")
        
        if len(team1_score) == 0:
            raise ValidationError("At least one set score required")
        
        # Validate individual set scores
        for i, (score1, score2) in enumerate(zip(team1_score, team2_score)):
            if not isinstance(score1, int) or not isinstance(score2, int):
                raise ValidationError(f"Set {i+1} scores must be integers")
            
            if score1 < 0 or score2 < 0:
                raise ValidationError(f"Set {i+1} scores cannot be negative")
    
    def _check_result_conflicts(self, match_id: str, result_data: Dict[str, Any]):
        """Check for conflicting result submissions."""
        # In a real system, this would check if match already has a result
        # For testing, simulate occasional conflicts
        import random
        
        if random.random() < 0.02:  # 2% chance of conflict
            raise ValidationError(f"Match {match_id} result already exists")
    
    def _simulate_result_processing(self, result_data: Dict[str, Any]):
        """Simulate result processing complexity."""
        import time
        import random
        
        # Simulate processing time
        time.sleep(0.1)  # Brief processing delay
        
        # Simulate occasional database errors
        if random.random() < 0.03:  # 3% chance of database error
            raise Exception("Database timeout during result processing")
    
    def _determine_winner(self, result_data: Dict[str, Any]) -> str:
        """Determine match winner from scores."""
        team1_score = result_data['team1_score']
        team2_score = result_data['team2_score']
        
        team1_sets = sum(1 for s1, s2 in zip(team1_score, team2_score) if s1 > s2)
        team2_sets = sum(1 for s1, s2 in zip(team1_score, team2_score) if s2 > s1)
        
        if team1_sets > team2_sets:
            return "team1"
        elif team2_sets > team1_sets:
            return "team2"
        else:
            return "tie"  # Shouldn't happen with proper validation


# Circuit breaker instances - Singleton pattern
inscription_circuit_breaker = InscriptionCircuitBreaker()
bracket_generation_circuit_breaker = BracketGenerationCircuitBreaker()
result_processing_circuit_breaker = ResultProcessingCircuitBreaker()


def get_all_tournament_circuit_breakers() -> Dict[str, BaseTournamentCircuitBreaker]:
    """Get all tournament circuit breaker instances."""
    return {
        'inscription': inscription_circuit_breaker,
        'bracket_generation': bracket_generation_circuit_breaker,
        'result_processing': result_processing_circuit_breaker
    }


def get_tournament_circuit_breaker_status() -> Dict[str, Any]:
    """Get status of all tournament circuit breakers."""
    status = {
        'timestamp': timezone.now().isoformat(),
        'overall_healthy': True,
        'breakers': {}
    }
    
    for name, breaker in get_all_tournament_circuit_breakers().items():
        breaker_status = breaker.get_status()
        status['breakers'][name] = breaker_status
        
        if not breaker_status['healthy']:
            status['overall_healthy'] = False
    
    return status


def reset_all_tournament_circuit_breakers():
    """Reset all tournament circuit breakers - USE WITH CAUTION."""
    logger.warning("Resetting all tournament circuit breakers")
    
    for name, breaker in get_all_tournament_circuit_breakers().items():
        breaker.set_state('closed')
        breaker.reset_counts()
        logger.info(f"Reset tournament circuit breaker: {name}")


# Context manager for multiple circuit breaker operations
@contextmanager
def tournament_circuit_protection(operations: List[str]):
    """
    Context manager for operations requiring multiple circuit breakers.
    
    Args:
        operations: List of operation names ('inscription', 'bracket_generation', 'result_processing')
    """
    breakers = get_all_tournament_circuit_breakers()
    active_breakers = []
    
    # Validate all requested breakers are available
    for op in operations:
        if op not in breakers:
            raise ValueError(f"Unknown tournament circuit breaker: {op}")
        active_breakers.append(breakers[op])
    
    # Check all breakers before proceeding
    for breaker in active_breakers:
        state = breaker.get_state()
        if state == 'open' and not breaker.should_attempt_reset():
            raise TournamentCircuitBreakerError(
                f"Tournament operation blocked by '{breaker.name}' circuit breaker"
            )
    
    logger.info(f"Tournament operations protected by: {operations}")
    
    try:
        yield
        
        # All operations succeeded
        for breaker in active_breakers:
            if breaker.get_state() == 'half_open':
                breaker.increment_success_count()
                if breaker.get_success_count() >= breaker.success_threshold:
                    breaker.set_state('closed')
                    breaker.reset_counts()
        
    except Exception as e:
        # Operations failed
        for breaker in active_breakers:
            breaker.increment_failure_count()
            if breaker.get_failure_count() >= breaker.failure_threshold:
                breaker.set_state('open')
        
        logger.error(f"Tournament operations failed: {operations} - {e}")
        raise