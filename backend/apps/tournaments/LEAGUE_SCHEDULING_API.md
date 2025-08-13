# League Scheduling Engine API Documentation

## Overview
The League Scheduling Engine provides intelligent scheduling for padel leagues using constraint satisfaction and optimization algorithms. It supports round-robin, multi-division, and Swiss system formats with automatic conflict resolution and quality optimization.

## Key Features
- **Intelligent Scheduling**: Uses genetic algorithms and OR-Tools constraint solver
- **Geographic Optimization**: Minimizes travel distance using K-means clustering
- **Flexible Constraints**: Court availability, player preferences, blackout dates, etc.
- **Dynamic Rescheduling**: Weather cancellations and conflict resolution
- **Quality Metrics**: Comprehensive schedule evaluation and reporting

---

## API Endpoints

### 1. Seasons Management

#### GET /api/tournaments/seasons/
List all seasons.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Spring 2024",
    "year": 2024,
    "start_date": "2024-03-01",
    "end_date": "2024-08-31",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### POST /api/tournaments/seasons/
Create a new season.

**Request:**
```json
{
  "name": "Fall 2024",
  "year": 2024,
  "start_date": "2024-09-01",
  "end_date": "2025-02-28",
  "is_active": true
}
```

---

### 2. League Management

#### GET /api/tournaments/leagues/
List all leagues for the club.

**Query Parameters:**
- `season`: Filter by season ID
- `format`: Filter by format (round_robin, multi_division, swiss)
- `status`: Filter by status (planning, registration_open, in_progress, etc.)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Monday Night League",
    "description": "Weekly evening matches",
    "season": 1,
    "season_name": "Spring 2024",
    "format": "round_robin",
    "status": "registration_open",
    "divisions": 1,
    "start_date": "2024-04-01",
    "end_date": "2024-06-30",
    "organizer_name": "John Doe",
    "teams_count": 8,
    "created_at": "2024-02-01T10:00:00Z"
  }
]
```

#### POST /api/tournaments/leagues/
Create a new league.

**Request:**
```json
{
  "name": "Summer Evening League",
  "description": "Competitive summer league for advanced players",
  "season": 1,
  "format": "round_robin",
  "divisions": 1,
  "matches_per_pair": 1,
  "match_frequency": "weekly",
  "preferred_days": [1, 2, 3, 4, 5],
  "preferred_times": ["18:00", "19:00", "20:00"],
  "start_date": "2024-06-01",
  "end_date": "2024-08-31",
  "registration_start": "2024-04-01T00:00:00Z",
  "registration_end": "2024-05-15T23:59:59Z",
  "max_teams": 12,
  "min_teams": 6
}
```

#### GET /api/tournaments/leagues/{id}/
Get detailed league information.

**Response:**
```json
{
  "id": 1,
  "name": "Monday Night League",
  "description": "Weekly evening matches",
  "season": 1,
  "season_name": "Spring 2024",
  "format": "round_robin",
  "status": "registration_closed",
  "divisions": 1,
  "matches_per_pair": 1,
  "match_frequency": "weekly",
  "preferred_days": [1, 2, 3, 4, 5],
  "preferred_times": ["18:00", "19:00", "20:00"],
  "start_date": "2024-04-01",
  "end_date": "2024-06-30",
  "registration_start": "2024-02-01T00:00:00Z",
  "registration_end": "2024-03-15T23:59:59Z",
  "max_teams": 12,
  "min_teams": 6,
  "current_round": 0,
  "total_rounds": 0,
  "organizer_name": "John Doe",
  "teams_count": 10,
  "constraints_count": 3,
  "schedule_generated": false,
  "current_round_info": null
}
```

---

### 3. Schedule Generation

#### POST /api/tournaments/leagues/{id}/generate_schedule/
Generate optimal schedule for a league.

**Prerequisites:**
- League status must be `registration_closed`
- Minimum number of teams must be registered

**Request:**
```json
{
  "algorithm": "genetic",
  "optimization_iterations": 500,
  "use_geographic_clustering": true,
  "respect_player_availability": true,
  "minimize_travel_distance": true
}
```

**Response:**
```json
{
  "message": "Schedule generated successfully",
  "schedule": {
    "id": 1,
    "league": 1,
    "league_name": "Monday Night League",
    "generated_at": "2024-03-16T10:30:00Z",
    "algorithm_used": "genetic",
    "quality_score": 87.5,
    "total_travel_distance": 245.8,
    "matches_count": 45,
    "rounds_count": 9
  }
}
```

#### GET /api/tournaments/leagues/{id}/schedule_quality_report/
Get detailed quality metrics for league schedule.

**Response:**
```json
{
  "overall_score": 87.5,
  "total_travel_distance": 245.8,
  "algorithm_used": "genetic",
  "generated_at": "2024-03-16T10:30:00Z",
  "constraint_violations": {
    "total_violations": 3,
    "total_penalty_score": 45.0,
    "violations_by_type": {
      "travel_distance": 2,
      "rest_period": 1
    },
    "violations_by_severity": {
      "low": 1,
      "medium": 2,
      "high": 0,
      "critical": 0
    },
    "matches_with_violations": 3
  },
  "recommendations": [
    {
      "type": "travel_optimization",
      "message": "Consider adding more courts closer to player locations",
      "action": "Review court distribution and consider partner venues"
    }
  ]
}
```

#### POST /api/tournaments/leagues/{id}/optimize_existing/
Re-optimize existing schedule with updated parameters.

**Response:**
```json
{
  "message": "Schedule optimized successfully",
  "schedule": {
    "id": 1,
    "quality_score": 91.2,
    "total_travel_distance": 198.4
  },
  "improvement": {
    "previous_score": 87.5,
    "new_score": 91.2,
    "improvement": 3.7
  }
}
```

---

### 4. Team Registration

#### GET /api/tournaments/league-teams/
List team registrations.

**Query Parameters:**
- `league`: Filter by league ID
- `status`: Filter by status (pending, confirmed, withdrawn)
- `division`: Filter by division number

**Response:**
```json
[
  {
    "id": 1,
    "league": 1,
    "team_name": "Thunder Bolts",
    "captain_name": "Alice Johnson",
    "status": "confirmed",
    "division": 1,
    "contact_email": "alice@email.com",
    "contact_phone": "555-0123",
    "preferred_home_venue": 2,
    "venue_name": "Court A",
    "players_detail": [
      {
        "player_name": "Alice Johnson",
        "role": "captain",
        "availability_windows": [
          {
            "day_of_week": 1,
            "start_time": "18:00",
            "end_time": "21:00"
          }
        ]
      }
    ]
  }
]
```

#### POST /api/tournaments/league-teams/
Register a new team.

**Request:**
```json
{
  "league": 1,
  "team_name": "Lightning Strikes",
  "captain": 123,
  "contact_email": "captain@email.com",
  "contact_phone": "555-0456",
  "preferred_home_venue": 3
}
```

#### POST /api/tournaments/league-teams/{id}/confirm/
Confirm a pending team registration.

#### POST /api/tournaments/league-teams/{id}/withdraw/
Withdraw a team from the league.

---

### 5. Schedule Viewing

#### GET /api/tournaments/league-schedules/
List league schedules.

**Response:**
```json
[
  {
    "id": 1,
    "league": 1,
    "league_name": "Monday Night League",
    "generated_at": "2024-03-16T10:30:00Z",
    "algorithm_used": "genetic",
    "quality_score": 87.5,
    "matches_count": 45,
    "rounds_count": 9
  }
]
```

#### GET /api/tournaments/league-schedules/{id}/matches_by_round/
Get matches organized by round.

**Response:**
```json
{
  "round_1": {
    "round_number": 1,
    "start_date": "2024-04-01",
    "end_date": "2024-04-07",
    "is_active": true,
    "is_completed": false,
    "matches": [
      {
        "id": 1,
        "home_team_name": "Thunder Bolts",
        "away_team_name": "Lightning Strikes",
        "scheduled_date": "2024-04-01T19:00:00Z",
        "court_name": "Court A",
        "status": "scheduled"
      }
    ]
  }
}
```

#### GET /api/tournaments/league-schedules/{id}/calendar_view/
Get schedule in calendar format.

**Response:**
```json
{
  "2024-04-01": [
    {
      "id": 1,
      "home_team_name": "Thunder Bolts",
      "away_team_name": "Lightning Strikes",
      "scheduled_date": "2024-04-01T19:00:00Z",
      "court_name": "Court A",
      "status": "scheduled",
      "time": "19:00"
    }
  ],
  "2024-04-02": [
    {
      "id": 2,
      "home_team_name": "Storm Eagles",
      "away_team_name": "Fire Hawks",
      "scheduled_date": "2024-04-02T18:30:00Z",
      "court_name": "Court B",
      "status": "scheduled",
      "time": "18:30"
    }
  ]
}
```

---

### 6. Match Rescheduling

#### POST /api/tournaments/rescheduling/reschedule_match/
Reschedule an individual match.

**Request:**
```json
{
  "match_id": 123,
  "reason": "Player unavailable due to injury"
}
```

**Response:**
```json
{
  "message": "Match rescheduled successfully",
  "match": {
    "id": 123,
    "scheduled_date": "2024-04-03T19:00:00Z",
    "court_name": "Court C"
  }
}
```

#### POST /api/tournaments/rescheduling/bulk_reschedule/
Handle bulk rescheduling for weather cancellations.

**Request:**
```json
{
  "date": "2024-04-05",
  "court_ids": [1, 2],
  "reason": "Heavy rain - outdoor courts unavailable"
}
```

**Response:**
```json
{
  "message": "Bulk rescheduling completed",
  "results": {
    "rescheduled": 6,
    "failed": 1,
    "total": 7
  }
}
```

---

### 7. Constraint Management

#### GET /api/tournaments/constraints/
List scheduling constraints for leagues.

**Response:**
```json
[
  {
    "id": 1,
    "league": 1,
    "league_name": "Monday Night League",
    "constraint_type": "travel_distance",
    "constraint_type_display": "Travel Distance",
    "priority": "medium",
    "priority_display": "Medium",
    "parameters": {
      "max_distance_km": 30
    },
    "is_active": true
  }
]
```

#### POST /api/tournaments/constraints/
Create a new constraint.

**Request:**
```json
{
  "league": 1,
  "constraint_type": "blackout_dates",
  "priority": "critical",
  "parameters": {
    "dates": ["2024-07-04", "2024-12-25"],
    "date_ranges": [
      {
        "start": "2024-07-01",
        "end": "2024-07-07",
        "name": "Independence Week"
      }
    ]
  },
  "is_active": true
}
```

#### GET /api/tournaments/constraints/available_types/
Get available constraint types.

**Response:**
```json
[
  {
    "value": "court_availability",
    "label": "Court Availability",
    "description": "Ensures courts are available and not double-booked"
  },
  {
    "value": "travel_distance",
    "label": "Travel Distance", 
    "description": "Minimizes total travel distance for all teams"
  }
]
```

#### POST /api/tournaments/constraints/{id}/test_constraint/
Test a constraint against sample match data.

**Request:**
```json
{
  "match_data": {
    "home_team_id": 1,
    "away_team_id": 2,
    "datetime": "2024-04-01T19:00:00Z",
    "court_id": 1
  }
}
```

**Response:**
```json
{
  "constraint_satisfied": false,
  "violations": [
    {
      "constraint_type": "travel_distance",
      "severity": "medium",
      "message": "Total travel distance 45.2km exceeds limit 30km",
      "penalty_score": 15.2
    }
  ],
  "total_penalty": 15.2
}
```

---

## Constraint Types Reference

### 1. Court Availability
Ensures courts are not double-booked and respects maintenance windows.

**Parameters:**
```json
{
  "maintenance_windows": [
    {
      "start": "2024-04-15T09:00:00Z",
      "end": "2024-04-15T12:00:00Z"
    }
  ],
  "match_duration_minutes": 90
}
```

### 2. Player Availability
Respects player availability windows and preferences.

**Parameters:**
```json
{
  "max_unavailable_players": 1
}
```

### 3. Travel Distance
Minimizes total travel burden for all teams.

**Parameters:**
```json
{
  "max_distance_km": 50
}
```

### 4. Rest Period
Ensures adequate rest between matches for teams.

**Parameters:**
```json
{
  "min_rest_hours": 48
}
```

### 5. Blackout Dates
Prevents scheduling during specific dates or periods.

**Parameters:**
```json
{
  "dates": ["2024-12-25", "2024-01-01"],
  "date_ranges": [
    {
      "start": "2024-07-01",
      "end": "2024-07-07",
      "name": "Holiday Week"
    }
  ],
  "recurring": [
    {
      "type": "day_of_week",
      "day_of_week": 0,
      "name": "No Monday matches"
    }
  ]
}
```

### 6. Venue Capacity
Ensures venue capacity matches expected attendance.

**Parameters:**
```json
{
  "base_attendance": 25,
  "capacity_buffer": 0.8
}
```

### 7. Weather
Considers weather conditions for outdoor courts.

**Parameters:**
```json
{
  "risk_threshold": 0.3
}
```

---

## Error Responses

All endpoints return standard HTTP status codes and error responses:

```json
{
  "error": "League must be in registration_closed status to generate schedule",
  "detail": "Current status is 'registration_open'"
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden 
- `404`: Not Found
- `500`: Internal Server Error

---

## Usage Examples

### Creating a Complete League Setup

1. **Create Season:**
```bash
POST /api/tournaments/seasons/
{
  "name": "Summer 2024",
  "year": 2024,
  "start_date": "2024-06-01",
  "end_date": "2024-09-30"
}
```

2. **Create League:**
```bash
POST /api/tournaments/leagues/
{
  "name": "Tuesday Night Championship",
  "season": 1,
  "format": "round_robin",
  "max_teams": 10,
  "preferred_days": [1, 2],
  "preferred_times": ["19:00", "20:00"]
}
```

3. **Add Constraints:**
```bash
POST /api/tournaments/constraints/
{
  "league": 1,
  "constraint_type": "travel_distance",
  "priority": "medium",
  "parameters": {"max_distance_km": 25}
}
```

4. **Generate Schedule:**
```bash
POST /api/tournaments/leagues/1/generate_schedule/
{
  "algorithm": "genetic",
  "optimization_iterations": 1000
}
```

5. **View Schedule:**
```bash
GET /api/tournaments/league-schedules/1/calendar_view/
```

This comprehensive API enables full control over league scheduling with intelligent optimization and constraint management.