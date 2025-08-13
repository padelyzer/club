# Tournament Module Dependencies

This document outlines the critical dependencies and integration points for the tournament module stabilization system.

## Core Dependencies

### Internal App Dependencies

#### Required Apps
- **clubs**: Tournament organization and court assignments
- **clients**: Player profiles and eligibility validation
- **authentication**: User management and permissions
- **notifications**: Tournament updates and match notifications
- **finance**: Registration fees and prize distribution

#### Optional Apps
- **bi**: Tournament analytics and reporting
- **reservations**: Court booking integration

### Database Dependencies

#### Critical Models
- `Tournament`: Main tournament entity
- `TournamentCategory`: Player eligibility rules
- `TournamentRegistration`: Team registrations
- `TournamentBracket`: Bracket structure for elimination formats
- `Match`: Individual matches and results
- `Prize`: Prize structure and awards

#### Foreign Key Relationships
```
Tournament -> Club (required)
Tournament -> Category (required)  
Tournament -> Organizer (User, required)
Tournament -> Organization (optional)

Registration -> Tournament (required)
Registration -> Player1 (ClientProfile, required)
Registration -> Player2 (ClientProfile, required)

Bracket -> Tournament (required)
Bracket -> Team1 (Registration, optional)
Bracket -> Team2 (Registration, optional)
Bracket -> Match (optional)
Bracket -> AdvancesTo (self-reference, optional)

Match -> Tournament (required)
Match -> Team1 (Registration, required)
Match -> Team2 (Registration, required)
Match -> Winner (Registration, optional)
Match -> Court (optional)
Match -> Referee (User, optional)

Prize -> Tournament (required)
Prize -> AwardedTo (Registration, optional)
```

### Python Package Dependencies

#### Core Packages
- `django>=4.2`: Web framework
- `djangorestframework>=3.14`: API framework
- `celery>=5.3`: Background task processing
- `redis>=4.5`: Caching and task queue
- `psycopg2>=2.9`: PostgreSQL adapter

#### Tournament-Specific Packages
- `uuid`: Operation tracking and audit trails
- `decimal`: Precise financial calculations
- `datetime`: Tournament scheduling and validation
- `math`: Bracket calculations and round determinations

#### Optional Packages
- `channels`: WebSocket support for real-time updates
- `django-rq`: Alternative task queue
- `sentry-sdk`: Error tracking and monitoring

## Integration Points

### Authentication Integration

#### Required Permissions
- `tournaments.add_tournament`: Create tournaments
- `tournaments.change_tournament`: Modify tournaments
- `tournaments.delete_tournament`: Delete tournaments
- `tournaments.view_tournament`: View tournament details
- `tournaments.can_register_team`: Register teams
- `tournaments.can_manage_brackets`: Manage bracket operations
- `tournaments.can_record_results`: Record match results

#### User Context Requirements
```python
# Tournament operations require user context
user = request.user
if not user.has_perm('tournaments.add_tournament'):
    raise PermissionDenied

# Club-level permissions
if hasattr(user, 'profile'):
    user_club = user.profile.club
    if tournament.club != user_club:
        raise PermissionDenied
```

### Club Integration

#### Required Club Features
- Club must have `organization` relationship
- Club must have courts for tournament matches
- Club must support member management

#### Tournament-Club Relationship
```python
# Tournament inherits organizational context from club
tournament.organization = tournament.club.organization

# Court assignments for matches
match.court = tournament.club.courts.filter(is_active=True).first()
```

### Client Integration

#### Player Eligibility Validation
```python
from apps.clients.models import ClientProfile

# Validate player eligibility for tournament category
def validate_player_eligibility(tournament, player_profile):
    return tournament.category.is_player_eligible(player_profile)
```

#### Required ClientProfile Fields
- `user`: User relationship
- `birth_date`: Age-based category eligibility
- `level`: Skill-based category eligibility
- `gender`: Gender-based category eligibility (via user)

### Finance Integration

#### Registration Fee Processing
```python
from apps.finance.models import Payment
from apps.tournaments.mixins import TournamentSafetyMixin

# Process registration payment
mixin = TournamentSafetyMixin()
result = mixin.execute_financial_transaction(
    amount=tournament.registration_fee,
    transaction_type='payment',
    reference_id=str(registration.id),
    user=user
)
```

#### Prize Distribution
```python
# Award prizes require financial transaction validation
def award_prize(prize, registration):
    if prize.cash_value:
        # Create financial transaction for prize payout
        create_financial_transaction(
            amount=prize.cash_value,
            transaction_type='prize_payout',
            destination_account=registration.player1.financial_account
        )
```

### Notification Integration

#### Tournament Events
- Registration confirmations
- Tournament start notifications  
- Match scheduling updates
- Result announcements
- Prize award notifications

#### WebSocket Channels
```python
# Real-time tournament updates
channel_layer.group_send(
    f"tournament_{tournament.id}",
    {
        "type": "tournament_update",
        "tournament": tournament_data,
        "event": "status_change"
    }
)
```

## Service Dependencies

### External Services

#### Required Services
- **Database**: PostgreSQL for data persistence
- **Cache**: Redis for session management and circuit breakers
- **Queue**: Celery/Redis for background processing

#### Optional Services
- **WebSocket**: Real-time bracket updates
- **Email**: Tournament notifications
- **SMS**: Match reminders (via notification service)
- **Analytics**: Tournament performance metrics

### Background Tasks

#### Critical Tasks
```python
# Tournament bracket generation (CPU intensive)
@shared_task(bind=True, max_retries=3)
def generate_tournament_bracket(self, tournament_id):
    # Bracket generation logic with safety checks
    pass

# Match result processing (requires atomicity)  
@shared_task(bind=True, max_retries=2)
def process_match_result(self, match_id, result_data):
    # Result processing with winner advancement
    pass

# Prize distribution (financial operations)
@shared_task(bind=True, max_retries=1)
def distribute_tournament_prizes(self, tournament_id):
    # Prize payout with financial safety
    pass
```

## Environment Dependencies

### Development Environment
```bash
# Required environment variables
DJANGO_SETTINGS_MODULE=config.settings.development
CELERY_BROKER_URL=redis://localhost:6379/0
CACHE_URL=redis://localhost:6379/1

# Tournament-specific settings
TOURNAMENT_MAX_TEAMS=256
TOURNAMENT_CIRCUIT_BREAKER_TIMEOUT=300
TOURNAMENT_CACHE_TIMEOUT=300
```

### Production Environment
```bash
# Required production variables
DJANGO_SETTINGS_MODULE=config.settings.production
DATABASE_URL=postgres://...
REDIS_URL=redis://...

# Tournament production settings
TOURNAMENT_ENABLE_REALTIME=true
TOURNAMENT_AUDIT_LEVEL=critical
TOURNAMENT_BACKUP_BRACKETS=true
```

### Cache Configuration
```python
# Redis configuration for tournament operations
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'tournaments',
        'TIMEOUT': 300,  # 5 minutes for tournament data
    }
}
```

## Deployment Dependencies

### Database Migrations
```bash
# Run tournament migrations in correct order
python manage.py migrate clubs
python manage.py migrate clients  
python manage.py migrate authentication
python manage.py migrate tournaments
```

### Static Assets
- Tournament bracket visualization components
- Match result input forms
- Prize distribution templates

### Background Workers
```bash
# Start Celery workers for tournament tasks
celery -A config worker -Q tournaments,default -l info

# Start Celery beat for scheduled tasks
celery -A config beat -l info
```

## Monitoring Dependencies

### Health Check Dependencies
- Database connectivity validation
- Redis/cache availability
- Tournament data integrity checks
- Circuit breaker status monitoring

### Logging Dependencies
```python
# Tournament logging configuration
LOGGING = {
    'loggers': {
        'tournaments.critical': {
            'handlers': ['file', 'console'],
            'level': 'CRITICAL',
            'propagate': False,
        },
        'tournaments.circuit_breaker': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'tournaments.validation': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        }
    }
}
```

### Metrics Dependencies
- Tournament creation rates
- Registration success rates
- Bracket generation performance
- Match completion rates
- Circuit breaker trip frequency

## Security Dependencies

### Permission System
- Django's built-in permission framework
- Custom tournament-specific permissions
- Club-level access controls
- Organizer role verification

### Data Protection
- Tournament data encryption at rest
- Secure bracket generation algorithms
- Audit trail immutability
- Financial transaction integrity

### API Security
- Authentication required for all operations
- Rate limiting on registration endpoints
- CSRF protection for web interface
- Input validation and sanitization

## Version Compatibility

### Minimum Versions
- Python 3.8+
- Django 4.2+
- PostgreSQL 12+
- Redis 6.0+

### Tested Versions
- Python 3.11
- Django 4.2.7
- PostgreSQL 15
- Redis 7.0

### Breaking Changes
- Circuit breaker implementation requires Redis
- Bracket validation requires specific model relationships
- Financial integration requires apps.finance module
- Real-time updates require WebSocket infrastructure