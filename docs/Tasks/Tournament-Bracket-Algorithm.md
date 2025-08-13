# 🏆 Tournament Bracket Algorithm - Implementation Task

> **Priority**: 🔴 HIGH | **Sprint**: 16 | **Estimated**: 3-4 days

## 🎯 Objective
Implement a robust tournament bracket generation system that supports multiple tournament formats (single elimination, double elimination, round robin, Swiss system) with automatic match scheduling and progression tracking.

## 📋 Requirements

### Core Features
1. **Bracket Generation**
   - Single elimination brackets (2, 4, 8, 16, 32, 64 players)
   - Double elimination with losers bracket
   - Round robin for group stages
   - Swiss system for large tournaments
   - Hybrid formats (groups + knockout)

2. **Seeding & Placement**
   - ELO-based seeding
   - Manual seeding override
   - Geographic distribution (avoid same club in early rounds)
   - Bye assignment for non-power-of-2 participants

3. **Match Scheduling**
   - Court availability integration
   - Time slot optimization
   - Player availability checking
   - Conflict resolution

4. **Progression Logic**
   - Automatic winner advancement
   - Score validation
   - Walkover handling
   - Third place playoffs

## 🏗️ Implementation Plan

### Phase 1: Core Models & Structure
```python
# File: backend/apps/tournaments/models.py
# Add these models:
- Bracket (tournament, format, size, current_round)
- BracketNode (position, round, match, parent_nodes)
- MatchSchedule (match, court, datetime, status)
```

### Phase 2: Bracket Generator
```python
# File: backend/apps/tournaments/bracket_generator.py
class BracketGenerator:
    def generate_single_elimination(self, players: List[Player]) -> Bracket
    def generate_double_elimination(self, players: List[Player]) -> Bracket
    def generate_round_robin(self, players: List[Player]) -> List[Match]
    def generate_swiss(self, players: List[Player], rounds: int) -> List[Match]
    
class SeedingStrategy:
    def seed_by_elo(self, players: List[Player]) -> List[Player]
    def distribute_geographically(self, players: List[Player]) -> List[Player]
    def assign_byes(self, bracket_size: int, player_count: int) -> List[int]
```

### Phase 3: Match Scheduler
```python
# File: backend/apps/tournaments/match_scheduler.py
class MatchScheduler:
    def schedule_matches(self, matches: List[Match], courts: List[Court]) -> List[MatchSchedule]
    def check_player_availability(self, player: Player, datetime: DateTime) -> bool
    def optimize_schedule(self, schedules: List[MatchSchedule]) -> List[MatchSchedule]
    def resolve_conflicts(self, conflicts: List[Conflict]) -> List[MatchSchedule]
```

### Phase 4: Progression Engine
```python
# File: backend/apps/tournaments/progression_engine.py
class ProgressionEngine:
    def advance_winner(self, match: Match, winner: Player) -> BracketNode
    def update_bracket(self, bracket: Bracket, match_result: MatchResult) -> None
    def calculate_standings(self, bracket: Bracket) -> List[Standing]
    def determine_next_matches(self, bracket: Bracket) -> List[Match]
```

## 🧪 Testing Requirements

### Unit Tests
```python
# File: backend/apps/tournaments/tests/test_bracket_generator.py
- test_single_elimination_power_of_two
- test_single_elimination_with_byes
- test_double_elimination_progression
- test_round_robin_all_matches
- test_swiss_pairing_logic
```

### Integration Tests
```python
# File: backend/apps/tournaments/tests/test_tournament_flow.py
- test_complete_tournament_flow
- test_match_scheduling_with_courts
- test_progression_with_walkovers
- test_bracket_visualization_data
```

## 🔗 API Endpoints

### New ViewSets
```python
# File: backend/apps/tournaments/views.py
class BracketViewSet(viewsets.ModelViewSet):
    # GET /tournaments/{id}/bracket - Get bracket structure
    # POST /tournaments/{id}/generate-bracket - Generate bracket
    # PUT /tournaments/{id}/bracket/seed - Update seeding

class MatchScheduleViewSet(viewsets.ModelViewSet):
    # GET /tournaments/{id}/schedule - Get match schedule
    # POST /tournaments/{id}/schedule/optimize - Optimize schedule
    # PUT /matches/{id}/schedule - Reschedule match

class ProgressionViewSet(viewsets.ViewSet):
    # POST /matches/{id}/result - Submit match result
    # GET /tournaments/{id}/standings - Get current standings
    # GET /tournaments/{id}/next-matches - Get upcoming matches
```

## 🎨 Frontend Components Needed

### Bracket Visualization
```typescript
// File: frontend/src/components/tournaments/BracketViewer.tsx
- Interactive bracket tree
- Match results display
- Live score updates
- Mobile responsive design
```

### Schedule Management
```typescript
// File: frontend/src/components/tournaments/ScheduleManager.tsx
- Calendar view of matches
- Drag-and-drop rescheduling
- Court assignment interface
- Conflict warnings
```

## 🚀 Implementation Steps

1. **Day 1: Core Models & Database**
   - Create bracket-related models
   - Add migrations
   - Set up model relationships

2. **Day 2: Bracket Generation**
   - Implement all bracket formats
   - Add seeding algorithms
   - Handle edge cases (byes, odd numbers)

3. **Day 3: Scheduling & Progression**
   - Build match scheduler
   - Implement progression logic
   - Add conflict resolution

4. **Day 4: API & Testing**
   - Create ViewSets
   - Write comprehensive tests
   - Integration testing

## 📊 Success Metrics
- Generate 64-player bracket in <100ms
- Schedule 100 matches without conflicts
- 100% test coverage for bracket logic
- Support for 4 tournament formats

## 🔍 References
- Swiss system: https://en.wikipedia.org/wiki/Swiss-system_tournament
- ELO rating: Use existing player.rating field
- Court availability: Integration with reservations module

## ⚠️ Important Considerations
1. **Performance**: Use database-efficient queries for large brackets
2. **Concurrency**: Handle simultaneous match result submissions
3. **Flexibility**: Design for easy addition of new tournament formats
4. **Visualization**: Ensure bracket data structure supports frontend rendering

---
**Agent**: padelyzer-frontend-orchestrator (for frontend components)
**Status**: Ready to implement
**Dependencies**: Tournament module must be active