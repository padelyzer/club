# Tournament Bracket System API Documentation

## Overview
The Tournament Bracket System provides comprehensive tournament management including bracket generation, match scheduling, and progression tracking for multiple tournament formats.

## Base URL
```
/api/tournaments/
```

## Authentication
All endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <token>
```

## Tournament Formats Supported
- **Single Elimination**: Traditional knockout format
- **Double Elimination**: Winners and losers brackets
- **Round Robin**: All teams play each other
- **Swiss System**: Pairing based on performance

## Core Endpoints

### 1. Bracket Management

#### Generate Tournament Bracket
```http
POST /api/tournaments/brackets/{tournament_id}/generate/
```

**Request Body:**
```json
{
  "seeding_method": "elo",  // Options: "elo", "manual", "random", "geographic"
  "confirm": true
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "tournament": {
    "id": "uuid",
    "name": "Summer Championship 2025"
  },
  "format": "single_elimination",
  "size": 16,
  "current_round": 1,
  "seeding_method": "elo",
  "is_finalized": false,
  "bracket_data": {
    "format": "single_elimination",
    "size": 16,
    "rounds": {
      "round_1": [
        {
          "id": "uuid",
          "position": 0,
          "team1": "Team Alpha",
          "team2": "Team Beta",
          "match_id": "uuid"
        }
      ]
    }
  }
}
```

#### Get Bracket Visualization Data
```http
GET /api/tournaments/brackets/{bracket_id}/visualization_data/
```

**Response (200 OK):**
```json
{
  "format": "single_elimination",
  "size": 16,
  "current_round": 2,
  "rounds": {
    "round_1": [...],
    "round_2": [...],
    "round_3": [...],
    "round_4": [...]
  }
}
```

#### Update Seeding
```http
PUT /api/tournaments/brackets/{bracket_id}/seed/
```

**Request Body:**
```json
{
  "seeding": [
    {
      "registration_id": "uuid",
      "seed": 1
    },
    {
      "registration_id": "uuid",
      "seed": 2
    }
  ]
}
```

### 2. Match Scheduling

#### Generate Match Schedule
```http
POST /api/tournaments/schedules/{tournament_id}/generate/
```

**Response (201 Created):**
```json
[
  {
    "id": "uuid",
    "match": {
      "id": "uuid",
      "round_number": 1,
      "team1": "Team Alpha",
      "team2": "Team Beta"
    },
    "court": {
      "id": "uuid",
      "name": "Center Court"
    },
    "datetime": "2025-02-15T10:00:00Z",
    "duration_minutes": 90,
    "status": "confirmed",
    "priority": 50
  }
]
```

#### Optimize Schedule
```http
POST /api/tournaments/schedules/{tournament_id}/optimize/
```

**Response (200 OK):**
Returns optimized schedule with minimized travel time and maximized court utilization.

#### Check Schedule Conflicts
```http
POST /api/tournaments/schedules/{schedule_id}/check_conflicts/
```

**Response (200 OK):**
```json
{
  "has_conflicts": false,
  "conflict_reason": null
}
```

#### Resolve Conflicts
```http
POST /api/tournaments/schedules/resolve_conflicts/
```

**Request Body:**
```json
{
  "schedule_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### 3. Tournament Progression

#### Submit Match Result
```http
POST /api/tournaments/progression/matches/{match_id}/result/
```

**Request Body:**
```json
{
  "winner_id": "uuid",
  "scores": [
    {
      "team1_games": 6,
      "team2_games": 4
    },
    {
      "team1_games": 6,
      "team2_games": 3
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Match result recorded successfully",
  "match_status": "completed",
  "winner": "Team Alpha",
  "next_match": {
    "id": "uuid",
    "round": 2,
    "scheduled_date": "2025-02-16T14:00:00Z"
  }
}
```

#### Get Tournament Standings
```http
GET /api/tournaments/progression/tournaments/{tournament_id}/standings/
```

**Response (200 OK):**

For Elimination Tournaments:
```json
[
  {
    "team": {
      "id": "uuid",
      "team_name": "Team Alpha"
    },
    "placement": 1,
    "matches_won": 4,
    "matches_lost": 0,
    "last_round": 4
  }
]
```

For Round Robin:
```json
[
  {
    "team": {
      "id": "uuid",
      "team_name": "Team Alpha"
    },
    "placement": 1,
    "matches_played": 7,
    "wins": 6,
    "losses": 1,
    "points": 18,
    "sets_won": 12,
    "sets_lost": 3,
    "sets_difference": 9,
    "games_won": 78,
    "games_lost": 45,
    "games_difference": 33
  }
]
```

#### Get Next Matches
```http
GET /api/tournaments/progression/tournaments/{tournament_id}/next-matches/
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "round_number": 3,
    "match_number": 1,
    "team1": {
      "id": "uuid",
      "team_name": "Team Alpha"
    },
    "team2": {
      "id": "uuid",
      "team_name": "Team Delta"
    },
    "scheduled_date": "2025-02-17T10:00:00Z",
    "court": {
      "id": "uuid",
      "name": "Center Court"
    }
  }
]
```

## Tournament Flow Example

### 1. Create Tournament
```http
POST /api/tournaments/
{
  "name": "Summer Championship 2025",
  "format": "elimination",
  "category": "uuid",
  "start_date": "2025-02-15",
  "end_date": "2025-02-22",
  "max_teams": 16,
  "min_teams": 8
}
```

### 2. Register Teams
```http
POST /api/tournaments/{tournament_id}/register/
{
  "team_name": "Team Alpha",
  "player1": "uuid",
  "player2": "uuid"
}
```

### 3. Generate Bracket (after registration closes)
```http
POST /api/tournaments/brackets/{tournament_id}/generate/
{
  "seeding_method": "elo",
  "confirm": true
}
```

### 4. Generate Schedule
```http
POST /api/tournaments/schedules/{tournament_id}/generate/
```

### 5. Play Matches
```http
POST /api/tournaments/progression/matches/{match_id}/result/
{
  "winner_id": "uuid",
  "scores": [...]
}
```

### 6. Check Standings
```http
GET /api/tournaments/progression/tournaments/{tournament_id}/standings/
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Tournament cannot start yet. Check minimum teams requirement."
}
```

### 404 Not Found
```json
{
  "error": "Tournament not found"
}
```

### 409 Conflict
```json
{
  "error": "Bracket already exists for this tournament"
}
```

## Webhook Events

The system can trigger webhooks for the following events:
- `tournament.started` - When tournament begins
- `match.completed` - When a match result is submitted
- `round.completed` - When all matches in a round are complete
- `tournament.completed` - When tournament finishes

## Performance Considerations

1. **Bracket Generation**: O(n log n) for seeding, O(n) for bracket creation
2. **Match Scheduling**: Uses optimization algorithms, may take longer for large tournaments
3. **Standings Calculation**: Cached and updated incrementally
4. **Concurrent Updates**: Uses database transactions to prevent race conditions

## Best Practices

1. **Seeding**: Always review and adjust seeding before starting tournament
2. **Scheduling**: Generate schedule after bracket to ensure proper court allocation
3. **Progression**: Submit results immediately after match completion
4. **Conflicts**: Check for conflicts before confirming schedule
5. **Monitoring**: Use standings endpoint to track tournament progress