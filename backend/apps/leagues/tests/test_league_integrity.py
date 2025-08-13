"""
Comprehensive tests for league integrity and data consistency.
Tests season transitions, standings calculations, and promotion/relegation logic.

CRITICAL: These tests ensure league operations maintain data integrity.
All test scenarios have been designed to catch potential corruption.
"""

import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock

from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.leagues.models import (
    League, LeagueSeason, LeagueTeam, LeagueMatch, 
    LeagueStanding, LeagueRules
)
from apps.leagues.mixins import LeagueSafetyMixin, HistoricalDataMixin
from apps.leagues.validators import (
    LeagueIntegrityValidator, validate_season_consistency,
    validate_promotion_demotion_rules
)
from apps.leagues.health import LeagueModuleHealth, HealthStatus
from apps.leagues.circuit_breakers import (
    LeagueCircuitBreaker, LeagueRateLimiter, protected_league_operation
)
from apps.clubs.models import Club
from apps.clients.models import ClientProfile

User = get_user_model()


class LeagueIntegrityTestCase(TestCase):
    """Test case for league data integrity operations."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create organization and club (using mock if needed)
        self.club = Mock()
        self.club.id = 1
        self.club.name = "Test Club"
        
        self.league = League.objects.create(
            name="Test League",
            description="Test league for integrity testing",
            slug="test-league",
            format="round_robin",
            division="open",
            max_teams=16,
            min_teams=4,
            organizer=self.user,
            contact_email="test@example.com",
            club=self.club,
            organization=None  # Will be set by signals if needed
        )
        
        self.season = LeagueSeason.objects.create(
            league=self.league,
            name="Test Season 2024",
            season_number=1,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            registration_start=timezone.now() - timedelta(days=10),
            registration_end=timezone.now() + timedelta(days=20)
        )
        
        # Create test client profiles
        self.client1 = Mock()
        self.client1.id = 1
        self.client1.user = Mock()
        self.client1.user.get_full_name.return_value = "Player 1"
        
        self.client2 = Mock()
        self.client2.id = 2
        self.client2.user = Mock()
        self.client2.user.get_full_name.return_value = "Player 2"
        
        self.client3 = Mock()
        self.client3.id = 3
        self.client3.user = Mock()
        self.client3.user.get_full_name.return_value = "Player 3"
        
        self.client4 = Mock()
        self.client4.id = 4
        self.client4.user = Mock()
        self.client4.user.get_full_name.return_value = "Player 4"
    
    def test_season_transition_integrity(self):
        """Test safe season transition maintains data integrity."""
        mixin = LeagueSafetyMixin()
        
        # Create teams for the season
        team1 = LeagueTeam.objects.create(
            season=self.season,
            team_name="Team 1",
            player1=self.client1,
            player2=self.client2,
            contact_email="team1@test.com",
            contact_phone="123456789",
            status='active'
        )
        
        team2 = LeagueTeam.objects.create(
            season=self.season,
            team_name="Team 2",
            player1=self.client3,
            player2=self.client4,
            contact_email="team2@test.com",
            contact_phone="987654321",
            status='active'
        )
        
        # Create standings
        LeagueStanding.objects.create(
            season=self.season,
            team=team1,
            position=1,
            matches_played=10,
            matches_won=8,
            matches_lost=2,
            points=24,
            sets_won=20,
            sets_lost=8,
            sets_difference=12
        )
        
        LeagueStanding.objects.create(
            season=self.season,
            team=team2,
            position=2,
            matches_played=10,
            matches_won=2,
            matches_lost=8,
            points=6,
            sets_won=8,
            sets_lost=20,
            sets_difference=-12
        )
        
        # Set season to in_progress
        self.season.status = 'in_progress'
        self.season.save()
        
        # Test safe season transition
        result = mixin.safe_season_transition(self.season, 'natural_end', self.user)
        
        # Verify transition results
        self.assertIn('completed_season_id', result)
        self.assertIn('final_standings_count', result)
        self.assertIn('historical_record_id', result)
        self.assertEqual(result['final_standings_count'], 2)
        
        # Verify season is marked as completed
        self.season.refresh_from_db()
        self.assertEqual(self.season.status, 'completed')
    
    def test_standings_update_atomicity(self):
        """Test atomic standings updates prevent corruption."""
        mixin = LeagueSafetyMixin()
        
        # Create teams and standings
        team1 = LeagueTeam.objects.create(
            season=self.season,
            team_name="Team 1",
            player1=self.client1,
            player2=self.client2,
            contact_email="team1@test.com",
            contact_phone="123456789",
            status='active'
        )
        
        team2 = LeagueTeam.objects.create(
            season=self.season,
            team_name="Team 2",
            player1=self.client3,
            player2=self.client4,
            contact_email="team2@test.com",
            contact_phone="987654321",
            status='active'
        )
        
        standing1 = LeagueStanding.objects.create(
            season=self.season,
            team=team1,
            position=1,
            matches_played=5,
            matches_won=3,
            matches_lost=2,
            points=9,
            sets_won=10,
            sets_lost=8,
            sets_difference=2
        )
        
        standing2 = LeagueStanding.objects.create(
            season=self.season,
            team=team2,
            position=2,
            matches_played=5,
            matches_won=2,
            matches_lost=3,
            points=6,
            sets_won=8,
            sets_lost=10,
            sets_difference=-2
        )
        
        # Create a match result
        match_result = {
            'match_id': 'test_match_1',
            'home_team_id': team1.id,
            'away_team_id': team2.id,
            'winner_id': team1.id,
            'home_sets_won': 2,
            'away_sets_won': 1,
            'home_games': [6, 6],
            'away_games': [4, 3]
        }
        
        # Test atomic standings update
        result = mixin.update_standings_atomic(self.season, match_result, self.user)
        
        # Verify update results
        self.assertIn('updated_teams', result)
        self.assertIn('operation_id', result)
        
        # Verify standings were updated
        standing1.refresh_from_db()
        standing2.refresh_from_db()
        
        # Team 1 should have one more win
        self.assertEqual(standing1.matches_played, 6)
        self.assertEqual(standing1.matches_won, 4)
    
    def test_promotion_relegation_validation(self):
        """Test promotion/relegation rules validation."""
        # Enable promotion/relegation
        self.league.allow_promotion_relegation = True
        self.league.promotion_spots = 2
        self.league.relegation_spots = 2
        self.league.save()
        
        # Create 8 teams with standings
        teams = []
        for i in range(8):
            team = LeagueTeam.objects.create(
                season=self.season,
                team_name=f"Team {i+1}",
                player1=Mock(id=i*2+1),
                player2=Mock(id=i*2+2),
                contact_email=f"team{i+1}@test.com",
                contact_phone="123456789",
                status='active'
            )
            teams.append(team)
            
            # Create standing with position
            LeagueStanding.objects.create(
                season=self.season,
                team=team,
                position=i+1,
                matches_played=10,
                matches_won=8-i,  # Descending order
                matches_lost=i+2,
                points=(8-i)*3,
                sets_difference=20-i*5
            )
        
        # Test valid promotion/relegation
        promoted_teams = teams[:2]  # Top 2 teams
        relegated_teams = teams[-2:]  # Bottom 2 teams
        
        result = validate_promotion_demotion_rules(
            self.league, promoted_teams, relegated_teams
        )
        
        self.assertTrue(result['is_valid'])
        self.assertEqual(len(result['errors']), 0)
        
        # Test invalid promotion/relegation (wrong teams)
        invalid_promoted = [teams[4], teams[5]]  # Mid-table teams
        
        result = validate_promotion_demotion_rules(
            self.league, invalid_promoted, relegated_teams
        )
        
        self.assertFalse(result['is_valid'])
        self.assertIn('warnings', result)
    
    def test_concurrent_standings_updates(self):
        """Test concurrent standings updates are handled safely."""
        mixin = LeagueSafetyMixin()
        
        # Create team and standing
        team = LeagueTeam.objects.create(
            season=self.season,
            team_name="Test Team",
            player1=self.client1,
            player2=self.client2,
            contact_email="test@test.com",
            contact_phone="123456789",
            status='active'
        )
        
        LeagueStanding.objects.create(
            season=self.season,
            team=team,
            position=1,
            matches_played=5,
            matches_won=3,
            matches_lost=2,
            points=9
        )
        
        # Simulate concurrent update attempts
        match_result1 = {
            'match_id': 'match_1',
            'home_team_id': team.id,
            'away_team_id': 999,  # Mock opponent
            'winner_id': team.id,
            'home_sets_won': 2,
            'away_sets_won': 0
        }
        
        match_result2 = {
            'match_id': 'match_2',
            'home_team_id': team.id,
            'away_team_id': 998,  # Mock opponent
            'winner_id': team.id,
            'home_sets_won': 2,
            'away_sets_won': 1
        }
        
        # Both updates should succeed due to atomic operations
        result1 = mixin.update_standings_atomic(self.season, match_result1, self.user)
        result2 = mixin.update_standings_atomic(self.season, match_result2, self.user)
        
        self.assertIn('operation_id', result1)
        self.assertIn('operation_id', result2)
        self.assertNotEqual(result1['operation_id'], result2['operation_id'])
    
    def test_ascension_descension_calculations(self):
        """Test promotion/relegation calculations are accurate."""
        # Test with different league sizes and percentages
        test_cases = [
            (16, 2, 2),  # 16 teams, 2 up, 2 down
            (12, 1, 1),  # 12 teams, 1 up, 1 down
            (20, 3, 3),  # 20 teams, 3 up, 3 down
        ]
        
        validator = LeagueIntegrityValidator()
        
        for teams_count, promotion_spots, relegation_spots in test_cases:
            with self.subTest(teams=teams_count, up=promotion_spots, down=relegation_spots):
                # Create temporary league
                temp_league = League.objects.create(
                    name=f"Test League {teams_count}",
                    description="Temporary test league",
                    slug=f"test-league-{teams_count}",
                    format="round_robin",
                    max_teams=teams_count,
                    min_teams=teams_count,
                    allow_promotion_relegation=True,
                    promotion_spots=promotion_spots,
                    relegation_spots=relegation_spots,
                    organizer=self.user,
                    contact_email="test@example.com",
                    club=self.club
                )
                
                temp_season = LeagueSeason.objects.create(
                    league=temp_league,
                    name=f"Temp Season {teams_count}",
                    season_number=1,
                    start_date=date.today() + timedelta(days=30),
                    end_date=date.today() + timedelta(days=120),
                    registration_start=timezone.now() - timedelta(days=10),
                    registration_end=timezone.now() + timedelta(days=20)
                )
                
                # Create teams for the season
                for i in range(teams_count):
                    LeagueTeam.objects.create(
                        season=temp_season,
                        team_name=f"Team {i+1}",
                        player1=Mock(id=i*100+1),
                        player2=Mock(id=i*100+2),
                        contact_email=f"team{i+1}@test.com",
                        contact_phone="123456789",
                        status='active'
                    )
                
                # Test promotion/relegation validation
                result = validator.validate_promotion_relegation_rules(
                    temp_league, promotion_spots, relegation_spots
                )
                
                if promotion_spots <= teams_count * 0.25:  # Valid percentage
                    self.assertTrue(result['is_valid'])
                else:
                    self.assertFalse(result['is_valid'])
                
                # Clean up
                temp_league.delete()


class LeagueValidationTestCase(TestCase):
    """Test case for league validation operations."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='validator_test',
            email='validator@example.com',
            password='testpass123'
        )
        
        self.validator = LeagueIntegrityValidator()
    
    def test_league_creation_validation(self):
        """Test league creation data validation."""
        # Valid league data
        valid_data = {
            'name': 'Test League',
            'description': 'A test league',
            'format': 'round_robin',
            'min_teams': 4,
            'max_teams': 16,
            'organizer': self.user,
            'contact_email': 'test@example.com',
            'division': 'open',
            'registration_fee': Decimal('25.00')
        }
        
        result = self.validator.validate_league_creation(valid_data)
        self.assertTrue(result['is_valid'])
        self.assertEqual(len(result['errors']), 0)
        
        # Invalid league data
        invalid_data = {
            'name': '',  # Missing name
            'format': 'invalid_format',  # Invalid format
            'min_teams': 2,  # Below minimum
            'max_teams': 50,  # Above maximum
            'registration_fee': -10  # Negative fee
        }
        
        result = self.validator.validate_league_creation(invalid_data)
        self.assertFalse(result['is_valid'])
        self.assertGreater(len(result['errors']), 0)
    
    def test_season_consistency_validation(self):
        """Test season data consistency validation."""
        # Create league
        league = League.objects.create(
            name="Validation Test League",
            description="Test league for validation",
            slug="validation-test-league",
            format="round_robin",
            max_teams=16,
            min_teams=4,
            organizer=self.user,
            contact_email="test@example.com",
            club=Mock(id=1),
        )
        
        # Valid season
        valid_season = LeagueSeason.objects.create(
            league=league,
            name="Valid Season",
            season_number=1,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=20)
        )
        
        result = self.validator.validate_season_consistency(valid_season)
        self.assertTrue(result['is_valid'])
        
        # Invalid season (start after end)
        invalid_season = LeagueSeason.objects.create(
            league=league,
            name="Invalid Season",
            season_number=2,
            start_date=date.today() + timedelta(days=120),
            end_date=date.today() + timedelta(days=30),  # End before start
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=20)
        )
        
        result = self.validator.validate_season_consistency(invalid_season)
        self.assertFalse(result['is_valid'])
        self.assertGreater(len(result['errors']), 0)
    
    def test_match_schedule_validation(self):
        """Test match schedule validation."""
        # Create league and season
        league = League.objects.create(
            name="Schedule Test League",
            description="Test league for schedule validation",
            slug="schedule-test-league",
            format="round_robin",
            max_teams=8,
            min_teams=4,
            organizer=self.user,
            contact_email="test@example.com",
            club=Mock(id=1),
        )
        
        season = LeagueSeason.objects.create(
            league=league,
            name="Schedule Test Season",
            season_number=1,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=20),
            status='in_progress',
            total_matchdays=7
        )
        
        # Create teams
        teams = []
        for i in range(4):
            team = LeagueTeam.objects.create(
                season=season,
                team_name=f"Schedule Team {i+1}",
                player1=Mock(id=i*10+1),
                player2=Mock(id=i*10+2),
                contact_email=f"team{i+1}@test.com",
                contact_phone="123456789",
                status='active'
            )
            teams.append(team)
        
        # Create valid matches
        match_date = season.start_date + timedelta(days=7)
        for i in range(2):
            LeagueMatch.objects.create(
                season=season,
                matchday=i+1,
                match_number=i+1,
                home_team=teams[i*2],
                away_team=teams[i*2+1],
                scheduled_date=timezone.make_aware(
                    datetime.combine(match_date + timedelta(days=i*7), datetime.min.time())
                ),
                status='scheduled'
            )
        
        result = self.validator.validate_match_schedule(season)
        self.assertTrue(result['is_valid'])
        
        # Create invalid match (outside season dates)
        invalid_match = LeagueMatch.objects.create(
            season=season,
            matchday=8,
            match_number=8,
            home_team=teams[0],
            away_team=teams[1],
            scheduled_date=timezone.make_aware(
                datetime.combine(season.end_date + timedelta(days=10), datetime.min.time())
            ),
            status='scheduled'
        )
        
        result = self.validator.validate_match_schedule(season)
        self.assertFalse(result['is_valid'])
        self.assertGreater(len(result['errors']), 0)


class LeagueHealthTestCase(TestCase):
    """Test case for league health monitoring."""
    
    def test_health_check_execution(self):
        """Test health check execution and results."""
        health_monitor = LeagueModuleHealth()
        
        # Run health check
        report = health_monitor.run_full_health_check()
        
        # Verify report structure
        self.assertIn('overall_status', report)
        self.assertIn('check_results', report)
        self.assertIn('summary', report)
        self.assertIn('recommendations', report)
        self.assertIn('timestamp', report)
        
        # Verify all checks ran
        expected_checks = [
            'database_connectivity',
            'standings_integrity',
            'season_consistency',
            'match_scheduling',
            'performance_metrics',
            'circuit_breakers'
        ]
        
        for check_name in expected_checks:
            self.assertIn(check_name, report['check_results'])
    
    def test_standings_integrity_check(self):
        """Test specific standings integrity check."""
        health_monitor = LeagueModuleHealth()
        
        # Create test data with valid standings
        user = User.objects.create_user(
            username='health_test',
            email='health@example.com',
            password='testpass123'
        )
        
        league = League.objects.create(
            name="Health Test League",
            description="Test league for health checks",
            slug="health-test-league",
            format="round_robin",
            max_teams=8,
            min_teams=4,
            organizer=user,
            contact_email="test@example.com",
            club=Mock(id=1),
        )
        
        season = LeagueSeason.objects.create(
            league=league,
            name="Health Test Season",
            season_number=1,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=20),
            status='in_progress'
        )
        
        # Create team with valid standing
        team = LeagueTeam.objects.create(
            season=season,
            team_name="Health Test Team",
            player1=Mock(id=1),
            player2=Mock(id=2),
            contact_email="team@test.com",
            contact_phone="123456789",
            status='active'
        )
        
        LeagueStanding.objects.create(
            season=season,
            team=team,
            position=1,
            matches_played=10,
            matches_won=6,
            matches_drawn=2,
            matches_lost=2,
            points=20,  # 6*3 + 2*1 = 20
            sets_won=18,
            sets_lost=10,
            sets_difference=8
        )
        
        # Run standings integrity check
        health_monitor._check_standings_integrity()
        
        self.assertIn('standings_integrity', health_monitor.check_results)
        result = health_monitor.check_results['standings_integrity']
        
        # Should be healthy with valid data
        self.assertEqual(result.status, HealthStatus.HEALTHY)


class LeagueCircuitBreakerTestCase(TestCase):
    """Test case for league circuit breaker functionality."""
    
    def test_circuit_breaker_operation(self):
        """Test circuit breaker opening and closing."""
        cb = LeagueCircuitBreaker(failure_threshold=2, recovery_timeout=1, name="test_cb")
        
        # Mock function that fails
        def failing_function():
            raise Exception("Test failure")
        
        # Function should fail but circuit stays closed
        with self.assertRaises(Exception):
            cb._call_with_circuit_breaker(failing_function)
        
        # Second failure should still work
        with self.assertRaises(Exception):
            cb._call_with_circuit_breaker(failing_function)
        
        # Third failure should open circuit
        with self.assertRaises(ValidationError):
            cb._call_with_circuit_breaker(failing_function)
        
        # Stats should show open circuit
        stats = cb.get_stats()
        self.assertEqual(stats['state'], 'open')
        self.assertEqual(stats['failure_count'], 2)
    
    def test_rate_limiter_operation(self):
        """Test rate limiter functionality."""
        rate_limiter = LeagueRateLimiter(max_requests=2, window_seconds=1, name="test_limiter")
        
        def test_function():
            return "success"
        
        # First two calls should succeed
        result1 = rate_limiter._call_with_rate_limit(test_function)
        result2 = rate_limiter._call_with_rate_limit(test_function)
        
        self.assertEqual(result1, "success")
        self.assertEqual(result2, "success")
        
        # Third call should fail due to rate limit
        with self.assertRaises(ValidationError):
            rate_limiter._call_with_rate_limit(test_function)
    
    def test_protected_league_operation_decorator(self):
        """Test protected league operation decorator."""
        @protected_league_operation('test_operation')
        def test_operation():
            return "protected operation success"
        
        # Should succeed normally
        result = test_operation()
        self.assertEqual(result, "protected operation success")


class HistoricalDataPreservationTestCase(TestCase):
    """Test case for historical data preservation."""
    
    def test_season_snapshot_creation(self):
        """Test creation of season snapshots."""
        mixin = HistoricalDataMixin()
        
        # Create test season with data
        user = User.objects.create_user(
            username='history_test',
            email='history@example.com',
            password='testpass123'
        )
        
        league = League.objects.create(
            name="History Test League",
            description="Test league for history",
            slug="history-test-league",
            format="round_robin",
            max_teams=8,
            min_teams=4,
            organizer=user,
            contact_email="test@example.com",
            club=Mock(id=1),
        )
        
        season = LeagueSeason.objects.create(
            league=league,
            name="History Test Season",
            season_number=1,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            registration_start=timezone.now() - timedelta(days=30),
            registration_end=timezone.now() - timedelta(days=10),
            status='completed'
        )
        
        # Create team and standings
        team = LeagueTeam.objects.create(
            season=season,
            team_name="History Test Team",
            player1=Mock(id=1),
            player2=Mock(id=2),
            contact_email="team@test.com",
            contact_phone="123456789",
            status='active'
        )
        
        LeagueStanding.objects.create(
            season=season,
            team=team,
            position=1,
            matches_played=5,
            matches_won=4,
            matches_lost=1,
            points=12,
            sets_difference=6
        )
        
        # Create snapshot
        result = mixin.preserve_season_snapshot(season)
        
        self.assertIn('snapshot_id', result)
        self.assertIn('teams_preserved', result)
        self.assertEqual(result['teams_preserved'], 1)
        
        # Retrieve snapshot
        snapshot = mixin.retrieve_historical_data(result['snapshot_id'])
        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot['season_id'], str(season.id))
        self.assertEqual(len(snapshot['teams']), 1)
        
        # Validate integrity
        is_valid = mixin.validate_historical_integrity(snapshot)
        self.assertTrue(is_valid)
    
    def test_historical_integrity_validation(self):
        """Test historical data integrity validation."""
        mixin = HistoricalDataMixin()
        
        # Valid snapshot data
        valid_snapshot = {
            'snapshot_id': 'test_id',
            'timestamp': timezone.now().isoformat(),
            'season_id': '1',
            'league_id': '1',
            'teams': [{'id': 1, 'name': 'Team 1'}],
            'matches': [{'id': 1, 'home_team': 1, 'away_team': 2}],
            'teams_count': 1,
            'matches_count': 1
        }
        
        self.assertTrue(mixin.validate_historical_integrity(valid_snapshot))
        
        # Invalid snapshot data (missing required field)
        invalid_snapshot = {
            'snapshot_id': 'test_id',
            'teams': [],
            'matches': [],
            'teams_count': 1  # Mismatch with actual teams
        }
        
        self.assertFalse(mixin.validate_historical_integrity(invalid_snapshot))


# Performance and stress tests
class LeaguePerformanceTestCase(TransactionTestCase):
    """Test case for league performance under load."""
    
    def test_concurrent_standings_updates_performance(self):
        """Test performance of concurrent standings updates."""
        # This test would normally use threading/multiprocessing
        # For now, we'll test sequential performance
        
        from django.test.utils import override_settings
        
        # Create large league with many teams
        user = User.objects.create_user(
            username='perf_test',
            email='perf@example.com',
            password='testpass123'
        )
        
        league = League.objects.create(
            name="Performance Test League",
            description="Large league for performance testing",
            slug="performance-test-league",
            format="round_robin",
            max_teams=32,
            min_teams=16,
            organizer=user,
            contact_email="test@example.com",
            club=Mock(id=1),
        )
        
        season = LeagueSeason.objects.create(
            league=league,
            name="Performance Test Season",
            season_number=1,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            registration_start=timezone.now() - timedelta(days=30),
            registration_end=timezone.now() - timedelta(days=10),
            status='in_progress'
        )
        
        # Create 16 teams with standings
        teams = []
        for i in range(16):
            team = LeagueTeam.objects.create(
                season=season,
                team_name=f"Perf Team {i+1}",
                player1=Mock(id=i*2+1),
                player2=Mock(id=i*2+2),
                contact_email=f"perfteam{i+1}@test.com",
                contact_phone="123456789",
                status='active'
            )
            teams.append(team)
            
            LeagueStanding.objects.create(
                season=season,
                team=team,
                position=i+1,
                matches_played=i,
                matches_won=i//2,
                matches_lost=i-i//2,
                points=i//2 * 3
            )
        
        mixin = LeagueSafetyMixin()
        
        # Time multiple standings updates
        import time
        start_time = time.time()
        
        for i in range(10):
            match_result = {
                'match_id': f'perf_match_{i}',
                'home_team_id': teams[i % 16].id,
                'away_team_id': teams[(i+1) % 16].id,
                'winner_id': teams[i % 16].id,
                'home_sets_won': 2,
                'away_sets_won': 1
            }
            
            result = mixin.update_standings_atomic(season, match_result, user)
            self.assertIn('operation_id', result)
        
        duration = time.time() - start_time
        
        # Should complete within reasonable time (10 updates in < 5 seconds)
        self.assertLess(duration, 5.0, f"Standings updates took too long: {duration:.2f}s")
        
        print(f"Performance test: 10 standings updates in {duration:.2f} seconds")
    
    def test_large_league_health_check_performance(self):
        """Test health check performance on large league."""
        # Create league with substantial data
        user = User.objects.create_user(
            username='health_perf_test',
            email='healthperf@example.com',
            password='testpass123'
        )
        
        # Create multiple leagues and seasons
        for league_num in range(3):
            league = League.objects.create(
                name=f"Health Perf League {league_num+1}",
                description="Large league for health performance testing",
                slug=f"health-perf-league-{league_num+1}",
                format="round_robin",
                max_teams=16,
                min_teams=8,
                organizer=user,
                contact_email="test@example.com",
                club=Mock(id=league_num+1),
            )
            
            for season_num in range(2):
                season = LeagueSeason.objects.create(
                    league=league,
                    name=f"Health Perf Season {season_num+1}",
                    season_number=season_num+1,
                    start_date=date.today() - timedelta(days=90*season_num),
                    end_date=date.today() - timedelta(days=90*season_num-60),
                    registration_start=timezone.now() - timedelta(days=120),
                    registration_end=timezone.now() - timedelta(days=100),
                    status='in_progress' if season_num == 1 else 'completed'
                )
                
                # Create teams and standings for active season
                if season.status == 'in_progress':
                    for team_num in range(8):
                        team = LeagueTeam.objects.create(
                            season=season,
                            team_name=f"Health Team {team_num+1}",
                            player1=Mock(id=league_num*100+season_num*10+team_num*2+1),
                            player2=Mock(id=league_num*100+season_num*10+team_num*2+2),
                            contact_email=f"healthteam{team_num+1}@test.com",
                            contact_phone="123456789",
                            status='active'
                        )
                        
                        LeagueStanding.objects.create(
                            season=season,
                            team=team,
                            position=team_num+1,
                            matches_played=5,
                            matches_won=5-team_num,
                            matches_lost=team_num,
                            points=(5-team_num)*3
                        )
        
        # Run health check and time it
        health_monitor = LeagueModuleHealth()
        
        import time
        start_time = time.time()
        report = health_monitor.run_full_health_check()
        duration = time.time() - start_time
        
        # Verify health check completed
        self.assertIn('overall_status', report)
        self.assertIn('check_results', report)
        
        # Should complete in reasonable time (< 10 seconds for moderate data)
        self.assertLess(duration, 10.0, f"Health check took too long: {duration:.2f}s")
        
        print(f"Health check performance: completed in {duration:.2f} seconds")


if __name__ == '__main__':
    pytest.main([__file__])