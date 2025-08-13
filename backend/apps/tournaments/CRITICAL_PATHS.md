# Tournament Module Critical Paths

This document identifies the critical paths and failure points in tournament operations that must be protected to ensure competitive integrity.

## Overview

Tournament operations involve complex state transitions and bracket manipulations that, if corrupted, can ruin entire competitions. This document maps the critical paths that require the highest level of protection and monitoring.

## Critical Path Classification

### Level 1: TOURNAMENT ENDING (Immediate competitive impact)
Operations that can immediately ruin a tournament competition.

### Level 2: DATA CORRUPTION (Delayed competitive impact)  
Operations that corrupt tournament data but don't immediately end competition.

### Level 3: USER DISRUPTION (Operational impact)
Operations that disrupt user experience but don't affect competitive integrity.

## Level 1 Critical Paths: TOURNAMENT ENDING

### 1. Bracket Generation and Modification

**Critical Operation**: `Tournament.generate_bracket()` and bracket manipulation

**Failure Impact**: Invalid bracket structure makes tournament impossible to complete

**Protection Mechanisms**:
```python
# From mixins.py - TournamentSafetyMixin
with self.tournament_bracket_context(tournament, 'generate_bracket'):
    # Atomic bracket generation with rollback protection
    bracket_data = self._generate_bracket_atomic(tournament)
    self._validate_post_operation_state(tournament, 'generate_bracket')
```

**Critical Validations**:
- Power of 2 team validation for elimination tournaments
- Bye placement for non-power-of-2 team counts
- Advancement path consistency validation
- No circular references in bracket structure

**Circuit Breaker**: `BracketGenerationCircuitBreaker`
- Threshold: 3 failures (lower than other operations)
- Timeout: 10 minutes (longer for complex brackets)

### 2. Match Result Recording and Winner Advancement

**Critical Operation**: `Match.determine_winner()` and winner advancement

**Failure Impact**: Incorrect winner advancement corrupts entire tournament bracket

**Protection Mechanisms**:
```python
# From mixins.py - MatchResultMixin
def record_match_result_atomic(self, match, team1_score, team2_score, user=None):
    with transaction.atomic():
        # Lock match for exclusive update
        locked_match = match.__class__.objects.select_for_update().get(id=match.id)
        
        # Validate scores with zero tolerance
        self._validate_match_scores(team1_score, team2_score, locked_match.tournament)
        
        # Record result and determine winner atomically
        locked_match.team1_score = team1_score
        locked_match.team2_score = team2_score
        locked_match.determine_winner()
        locked_match.save()
        
        # Advance winner automatically
        if locked_match.winner:
            self._advance_match_winner(locked_match)
```

**Critical Validations**:
- Score format validation (arrays must match length)
- No negative scores allowed
- Winner determination logic validation
- Advancement path verification

**Circuit Breaker**: `ResultProcessingCircuitBreaker`
- Threshold: 7 failures (higher since results come frequently)
- Rate limit: 20 results per minute per tournament

### 3. Tournament State Transitions

**Critical Operation**: Tournament status changes (`draft` → `published` → `registration_open` → `registration_closed` → `in_progress` → `completed`)

**Failure Impact**: Invalid state transitions can make tournament non-functional

**Protection Mechanisms**:
```python
# From mixins.py - State validation before any operation
def _validate_tournament_state(self, tournament, operation_type: str):
    state_requirements = {
        'register_team': ['draft', 'published', 'registration_open'],
        'start_tournament': ['registration_closed'],
        'advance_winner': ['in_progress'],
        'record_match_result': ['in_progress'],
    }
    
    required_states = state_requirements.get(operation_type, [])
    if required_states and tournament.status not in required_states:
        raise ValidationError(f"Invalid state '{tournament.status}' for operation '{operation_type}'")
```

**Critical Validations**:
- State transition validity
- Minimum team count before tournament start
- Registration window validation
- Date consistency checks

## Level 2 Critical Paths: DATA CORRUPTION

### 4. Team Registration and Duplicate Prevention

**Critical Operation**: `TournamentRegistration.create()` with duplicate detection

**Failure Impact**: Duplicate registrations corrupt team counts and bracket generation

**Protection Mechanisms**:
```python
# From mixins.py - Atomic registration with duplicate checking
def _register_team_atomic(self, tournament, operation_data: Dict[str, Any], user):
    with transaction.atomic():
        # Lock tournament to prevent race conditions
        locked_tournament = tournament.__class__.objects.select_for_update().get(id=tournament.id)
        
        # Double-check capacity after lock
        if locked_tournament.is_full:
            raise ValidationError("Tournament reached capacity during registration")
        
        # Check for duplicate registrations
        existing = locked_tournament.registrations.filter(
            Q(player1_id=operation_data['player1']) | Q(player1_id=operation_data['player2']) |
            Q(player2_id=operation_data['player1']) | Q(player2_id=operation_data['player2'])
        ).exists()
        
        if existing:
            raise ValidationError("One or both players are already registered")
```

**Critical Validations**:
- Player eligibility for tournament category
- No duplicate player registrations
- Tournament capacity limits
- Registration window enforcement

**Circuit Breaker**: `InscriptionCircuitBreaker`
- Threshold: 5 failures
- Rate limit: 10 registrations per minute per tournament

### 5. Prize Distribution and Financial Integrity

**Critical Operation**: Prize award processing with financial transactions

**Failure Impact**: Incorrect prize distribution affects competitive fairness and legal compliance

**Protection Mechanisms**:
```python
# From validators.py - Prize distribution validation
def _validate_prize_structure(self, tournament) -> List[str]:
    prizes = tournament.prizes.all()
    total_cash_prizes = sum(p.cash_value for p in prizes if p.cash_value)
    
    # Validate against registration fees
    if tournament.registration_fee > 0:
        max_prize_pool = tournament.max_teams * tournament.registration_fee
        
        if total_cash_prizes > max_prize_pool:
            errors.append(f"Prize money exceeds possible pool: {total_cash_prizes} > {max_prize_pool}")
```

**Critical Validations**:
- Prize positions within valid range (1 to max_teams)
- Total prize money ≤ registration fees collected
- No duplicate prize positions
- Winner prize ≥ 40% of total prizes

### 6. Bracket Integrity Maintenance

**Critical Operation**: Bracket consistency validation across all tournament operations

**Failure Impact**: Bracket corruption makes tournament results invalid

**Protection Mechanisms**:
```python
# From validators.py - Comprehensive bracket validation
def validate_bracket_consistency(self, tournament) -> Dict[str, Any]:
    # Check for orphan matches
    orphan_issues = self._check_orphan_matches(tournament, matches, brackets)
    
    # Check bracket advancement paths
    advancement_issues = self._check_advancement_paths(brackets)
    
    # Check winner progression
    winner_issues = self._check_winner_progression(matches, brackets)
    
    # Overall consistency
    validation_report['is_consistent'] = len(validation_report['errors']) == 0
```

**Critical Validations**:
- No orphaned matches without bracket positions
- Valid advancement paths (round n → round n+1)
- Completed match winners properly advanced
- Position consistency in bracket hierarchy

## Level 3 Critical Paths: USER DISRUPTION

### 7. Real-time Updates and Cache Consistency

**Critical Operation**: WebSocket updates and cache invalidation

**Failure Impact**: Users see outdated tournament information

**Protection Mechanisms**:
```python
# Cache invalidation on tournament updates
def invalidate_tournament_caches(self, tournament_id):
    cache_patterns = [
        f"tournament_{tournament_id}",
        f"tournament_brackets_{tournament_id}",
        f"tournament_matches_{tournament_id}",
        f"tournament_registrations_{tournament_id}"
    ]
    
    for pattern in cache_patterns:
        cache.delete(pattern)
```

### 8. Notification Delivery

**Critical Operation**: Tournament notification dispatch

**Failure Impact**: Players miss critical tournament information

**Protection Mechanisms**:
- Retry logic for failed notifications
- Multiple delivery channels (email, SMS, push)
- Notification queue with dead letter handling

## Critical Path Monitoring

### Health Checks

**Automated Monitoring**:
```python
# From health.py - Critical path health monitoring
def _check_bracket_integrity(self) -> Dict[str, Any]:
    # Check tournaments with bracket formats
    bracket_tournaments = Tournament.objects.filter(
        format__in=['elimination', 'double_elimination'],
        status__in=['in_progress', 'completed']
    )
    
    for tournament in bracket_tournaments:
        bracket_result = validator.validate_bracket_consistency(tournament)
        if not bracket_result['is_consistent']:
            bracket_health['inconsistent_brackets'] += 1
```

**Alert Thresholds**:
- Bracket inconsistency ratio > 5% triggers critical alert
- Circuit breaker open state triggers immediate alert  
- Registration success rate < 95% triggers warning
- Match result processing failures > 10% triggers warning

### Performance Monitoring

**Critical Metrics**:
- Bracket generation time (should be < 5 seconds for 64 teams)
- Match result recording time (should be < 1 second)
- Registration processing time (should be < 2 seconds)
- Database query response time (should be < 500ms)

**Performance Thresholds**:
```python
# From health.py - Performance validation
if query_time > MAX_HEALTHY_RESPONSE_TIME:
    db_health['status'] = 'slow'
    db_health['issues'].append(f"Slow database response: {query_time:.3f}s")
```

## Failure Recovery Procedures

### Bracket Corruption Recovery

1. **Detection**: Automated bracket consistency validation
2. **Isolation**: Lock tournament for exclusive access
3. **Assessment**: Determine extent of corruption
4. **Recovery**: 
   - Minor issues: Automated repair using validation results
   - Major issues: Manual intervention with tournament organizer
   - Critical issues: Tournament suspension pending review

### Database Corruption Recovery

1. **Detection**: Database integrity checks fail
2. **Isolation**: Circuit breakers open to prevent further damage
3. **Recovery**: 
   - Restore from latest consistent backup
   - Replay valid transactions from audit log
   - Re-validate all tournament data

### Circuit Breaker Recovery

1. **Detection**: Circuit breaker enters OPEN state
2. **Analysis**: Identify root cause of failures
3. **Resolution**: Fix underlying issue
4. **Recovery**: Gradual circuit breaker reset with monitoring

## Testing Critical Paths

### Unit Tests for Critical Operations

```python
# From test_tournament_integrity.py
def test_bracket_generation_consistency(self):
    """Test that bracket generation creates valid structure."""
    
def test_match_result_atomic_processing(self):
    """Test that match results are processed atomically."""
    
def test_duplicate_registration_prevention(self):
    """Test that duplicate registrations are prevented."""
```

### Integration Tests

```python
def test_complete_tournament_workflow(self):
    """Test complete tournament from registration to completion."""
    # 1. Register teams
    # 2. Start tournament (generate bracket)
    # 3. Record match results
    # 4. Validate bracket consistency throughout
```

### Load Tests

- Concurrent registration attempts (race condition testing)
- Simultaneous match result submissions
- Bracket generation under high load
- Circuit breaker threshold validation

## Documentation and Training

### Developer Guidelines

1. **Always use tournament safety mixins** for critical operations
2. **Never bypass validation** even in emergency situations
3. **Test bracket operations** in isolated environment first
4. **Monitor circuit breakers** during high-activity periods
5. **Validate tournament state** before any operation

### Operator Procedures

1. **Daily bracket integrity checks** for active tournaments
2. **Weekly circuit breaker status review**
3. **Monthly tournament data audit**
4. **Emergency response plan** for tournament corruption

### Emergency Contacts

- **Tournament System Administrator**: Immediate bracket issues
- **Database Administrator**: Data corruption incidents  
- **Development Team Lead**: Circuit breaker configuration
- **Competition Director**: Tournament rule interpretation