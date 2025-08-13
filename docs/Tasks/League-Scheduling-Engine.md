# 📅 League Scheduling Engine - Implementation Task

> **Priority**: 🟡 HIGH | **Sprint**: 16 | **Estimated**: 4-5 days

## 🎯 Objective
Build an intelligent league scheduling engine that automatically generates optimal match schedules considering court availability, player preferences, geographic constraints, and league rules while minimizing conflicts and travel time.

## 📋 Requirements

### Core Features
1. **Schedule Generation**
   - Round-robin leagues (everyone plays everyone)
   - Multi-division leagues with promotion/relegation
   - Home/away match distribution
   - Configurable match frequency (weekly, bi-weekly)
   - Season duration constraints

2. **Intelligent Constraints**
   - Court availability integration
   - Player availability windows
   - Geographic clustering (minimize travel)
   - Weather considerations for outdoor courts
   - Holiday and blackout dates

3. **Optimization Goals**
   - Minimize total travel distance
   - Maximize prime-time slot usage
   - Even distribution of home/away matches
   - Avoid back-to-back matches
   - Fair rest periods between matches

4. **Flexibility & Adjustments**
   - Manual override capabilities
   - Automatic rescheduling for conflicts
   - Rain date management
   - Mid-season player additions/drops
   - Schedule compression/expansion

## 🏗️ Implementation Plan

### Phase 1: Core Models
```python
# File: backend/apps/tournaments/models.py
# Add these models:
class League(models.Model):
    name = models.CharField(max_length=100)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    format = models.CharField(choices=LEAGUE_FORMATS)
    divisions = models.IntegerField(default=1)
    matches_per_pair = models.IntegerField(default=1)
    
class LeagueSchedule(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    round_number = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    
class ScheduleConstraint(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    constraint_type = models.CharField(choices=CONSTRAINT_TYPES)
    parameters = models.JSONField()
```

### Phase 2: Scheduling Engine Core
```python
# File: backend/apps/tournaments/league_scheduler.py
from typing import List, Dict, Tuple
import numpy as np
from datetime import datetime, timedelta

class LeagueScheduler:
    """Main scheduling engine using constraint satisfaction"""
    
    def __init__(self, league: League):
        self.league = league
        self.constraints = ScheduleConstraint.objects.filter(league=league)
        
    def generate_schedule(self) -> LeagueSchedule:
        """Generate optimal schedule using genetic algorithm"""
        players = self.get_league_players()
        matches = self.generate_match_pairs(players)
        time_slots = self.get_available_time_slots()
        
        # Use genetic algorithm for optimization
        schedule = self.optimize_schedule(matches, time_slots)
        return self.save_schedule(schedule)
    
    def generate_match_pairs(self, players: List[Player]) -> List[Tuple[Player, Player]]:
        """Generate all match pairs for round-robin format"""
        # Berger tables algorithm for round-robin
        pass
    
    def optimize_schedule(self, matches, time_slots):
        """Optimize using genetic algorithm or constraint solver"""
        from ortools.sat.python import cp_model
        
        model = cp_model.CpModel()
        # Define variables and constraints
        # Minimize travel distance and conflicts
        pass
```

### Phase 3: Constraint Management
```python
# File: backend/apps/tournaments/constraints.py
class ConstraintEvaluator:
    """Evaluate and enforce scheduling constraints"""
    
    def evaluate_court_availability(self, match, time_slot):
        """Check if courts are available"""
        pass
    
    def evaluate_player_availability(self, player, time_slot):
        """Check player's availability preferences"""
        pass
    
    def evaluate_travel_distance(self, player, venue):
        """Calculate travel burden"""
        pass
    
    def evaluate_rest_period(self, player, previous_match, next_match):
        """Ensure adequate rest between matches"""
        pass

class GeographicOptimizer:
    """Optimize schedules based on geographic constraints"""
    
    def cluster_players_by_location(self, players):
        """Group players to minimize travel"""
        from sklearn.cluster import KMeans
        pass
    
    def assign_home_venues(self, players, venues):
        """Assign optimal home venues to players"""
        pass
```

### Phase 4: Rescheduling Engine
```python
# File: backend/apps/tournaments/rescheduler.py
class MatchRescheduler:
    """Handle dynamic rescheduling needs"""
    
    def reschedule_match(self, match, reason):
        """Reschedule a single match"""
        available_slots = self.find_alternative_slots(match)
        optimal_slot = self.select_optimal_slot(available_slots)
        return self.update_schedule(match, optimal_slot)
    
    def handle_weather_cancellation(self, date, affected_courts):
        """Bulk reschedule for weather events"""
        pass
    
    def compress_schedule(self, league, target_end_date):
        """Compress schedule to finish earlier"""
        pass
```

## 🧪 Testing Strategy

### Unit Tests
```python
# File: backend/apps/tournaments/tests/test_league_scheduler.py
class TestLeagueScheduler:
    def test_round_robin_generation(self):
        """Test correct match pair generation"""
        pass
    
    def test_constraint_satisfaction(self):
        """Test all constraints are respected"""
        pass
    
    def test_optimization_quality(self):
        """Test schedule quality metrics"""
        pass
    
    def test_edge_cases(self):
        """Test odd number of players, dropouts, etc."""
        pass
```

### Performance Tests
```python
# File: backend/apps/tournaments/tests/test_scheduler_performance.py
def test_large_league_scheduling():
    """Test scheduling for 100+ player league"""
    # Should complete in < 10 seconds
    pass

def test_multi_division_scheduling():
    """Test complex multi-division leagues"""
    pass
```

## 🔗 API Endpoints

### Schedule Management
```python
# File: backend/apps/tournaments/views.py
class LeagueScheduleViewSet(viewsets.ModelViewSet):
    @action(methods=['post'], detail=True)
    def generate_schedule(self, request, pk=None):
        """Generate optimal schedule for league"""
        pass
    
    @action(methods=['post'], detail=True)
    def optimize_existing(self, request, pk=None):
        """Re-optimize existing schedule"""
        pass
    
    @action(methods=['get'], detail=True)
    def schedule_quality_report(self, request, pk=None):
        """Get metrics on schedule quality"""
        pass

class ReschedulingViewSet(viewsets.ViewSet):
    @action(methods=['post'], detail=False)
    def reschedule_match(self, request):
        """Reschedule individual match"""
        pass
    
    @action(methods=['post'], detail=False)
    def bulk_reschedule(self, request):
        """Handle weather/emergency rescheduling"""
        pass
```

## 🎨 Frontend Components

### Schedule Visualization
```typescript
// File: frontend/src/components/leagues/ScheduleCalendar.tsx
interface ScheduleCalendarProps {
  league: League;
  view: 'month' | 'week' | 'list';
  playerFilter?: string[];
}

// Interactive calendar with:
// - Drag-and-drop rescheduling
// - Conflict warnings
// - Travel distance indicators
// - Court availability overlay
```

### Schedule Generator UI
```typescript
// File: frontend/src/components/leagues/ScheduleGenerator.tsx
interface ScheduleGeneratorProps {
  league: League;
  constraints: Constraint[];
}

// Configuration interface for:
// - Setting constraints
// - Preview generated schedule
// - Compare multiple schedule options
// - Manual adjustments
```

## 🚀 Implementation Steps

### Day 1: Foundation
1. **Create Models**
   - League and schedule models
   - Constraint definitions
   - Migration files

2. **Basic Algorithm**
   - Round-robin pair generation
   - Simple time slot assignment
   - Initial constraint framework

### Day 2-3: Optimization Engine
1. **Implement Constraint Solver**
   - Integrate OR-Tools
   - Define optimization objectives
   - Implement genetic algorithm fallback

2. **Geographic Optimization**
   - Player clustering
   - Travel distance calculation
   - Home venue assignment

### Day 4: Rescheduling & API
1. **Dynamic Rescheduling**
   - Single match rescheduling
   - Bulk weather rescheduling
   - Schedule compression

2. **REST API**
   - All endpoints implementation
   - Serializers and permissions
   - API documentation

### Day 5: Testing & Polish
1. **Comprehensive Testing**
   - Unit tests for all components
   - Performance benchmarks
   - Edge case handling

2. **Documentation**
   - Algorithm documentation
   - API usage guide
   - Configuration examples

## 📊 Success Metrics

### Schedule Quality Metrics
```python
class ScheduleQualityMetrics:
    def calculate_travel_burden(self, schedule):
        """Total km traveled by all players"""
        pass
    
    def calculate_time_slot_utilization(self, schedule):
        """% of prime time slots used"""
        pass
    
    def calculate_fairness_index(self, schedule):
        """Distribution of home/away matches"""
        pass
    
    def calculate_conflict_rate(self, schedule):
        """% of matches with conflicts"""
        pass
```

### Performance Targets
- Generate 50-player league schedule: <5 seconds
- Generate 200-player league schedule: <30 seconds
- Reschedule single match: <500ms
- Schedule quality score: >85/100

## 🔧 Configuration Options

```yaml
# League scheduling configuration
scheduling:
  algorithm: "genetic"  # or "constraint_solver"
  optimization_iterations: 1000
  
  constraints:
    min_days_between_matches: 3
    max_matches_per_week: 2
    preferred_time_slots:
      - weekday_evening: 0.4
      - weekend_morning: 0.3
      - weekend_afternoon: 0.3
    
  geographic:
    max_travel_distance_km: 50
    clustering_algorithm: "kmeans"
    home_venue_assignment: "nearest"
    
  quality_thresholds:
    min_quality_score: 80
    max_travel_burden: 1000  # total km
    max_conflict_rate: 0.05
```

## 🔍 Advanced Features (Future)
1. **Machine Learning Integration**
   - Predict optimal time slots based on history
   - Learn player preferences automatically
   - Forecast weather-related cancellations

2. **Multi-Sport Scheduling**
   - Coordinate with other sports at same venue
   - Shared facility optimization

3. **Dynamic Pricing Integration**
   - Adjust court prices based on demand
   - Incentivize off-peak matches

---
**Agent**: general-purpose (algorithm focus)
**Status**: Ready to implement
**Dependencies**: Tournament module, Court availability system