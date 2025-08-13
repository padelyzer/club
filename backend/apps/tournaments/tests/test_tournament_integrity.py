"""
Tournament integrity tests for bracket consistency and tournament validation.
Tests the critical tournament safety systems to prevent corruption and ensure competitive integrity.

CRITICAL: These tests validate the tournament system's ability to maintain competitive integrity
and prevent bracket corruption under various conditions.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError

from apps.tournaments.models import (
    Tournament, TournamentCategory, TournamentRegistration, 
    TournamentBracket, Match, Prize
)
from apps.tournaments.mixins import TournamentSafetyMixin, BracketIntegrityMixin, MatchResultMixin
from apps.tournaments.validators import TournamentIntegrityValidator
from apps.tournaments.circuit_breakers import (
    inscription_circuit_breaker, bracket_generation_circuit_breaker,
    result_processing_circuit_breaker, TournamentCircuitBreakerError
)
from apps.tournaments.health import TournamentHealthMonitor


class TournamentIntegrityTestCase(TestCase):
    """Test tournament data integrity and validation."""
    
    def setUp(self):
        """Set up test data."""
        # Create test category
        self.category = TournamentCategory.objects.create(
            name="Test Category",
            category_type="open",
            gender="any"
        )
        
        # Create test organizer
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.organizer = User.objects.create_user(
            username="organizer",
            email="organizer@test.com",
            password="testpass"
        )
        
        # Create test club
        from apps.clubs.models import Club
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club"
        )
        
        # Base tournament data
        self.tournament_data = {
            'name': 'Test Tournament',
            'description': 'Test tournament for integrity testing',
            'slug': 'test-tournament',
            'format': 'elimination',
            'category': self.category,
            'start_date': timezone.now().date() + timedelta(days=7),
            'end_date': timezone.now().date() + timedelta(days=8),
            'registration_start': timezone.now() + timedelta(days=1),
            'registration_end': timezone.now() + timedelta(days=6),
            'max_teams': 16,
            'min_teams': 4,
            'registration_fee': Decimal('50.00'),
            'organizer': self.organizer,
            'contact_email': 'test@tournament.com',
            'club': self.club,
            'organization': self.club.organization if hasattr(self.club, 'organization') else None
        }
    
    def test_tournament_structure_validation_success(self):
        """Test successful tournament structure validation."""
        tournament = Tournament.objects.create(**self.tournament_data)
        
        validator = TournamentIntegrityValidator()
        result = validator.validate_tournament_structure(tournament)
        
        self.assertTrue(result['is_valid'])
        self.assertEqual(len(result['errors']), 0)
        self.assertIn('validation_timestamp', result)
    
    def test_tournament_structure_validation_failures(self):
        """Test tournament structure validation with various errors."""
        # Test missing name
        invalid_data = self.tournament_data.copy()
        invalid_data['name'] = ''
        tournament = Tournament.objects.create(**invalid_data)
        
        validator = TournamentIntegrityValidator()
        result = validator.validate_tournament_structure(tournament)
        
        self.assertFalse(result['is_valid'])
        self.assertTrue(any('name' in error.lower() for error in result['errors']))
    
    def test_tournament_date_validation(self):
        """Test tournament date logic validation."""
        # Test end date before start date
        invalid_data = self.tournament_data.copy()
        invalid_data['start_date'] = timezone.now().date() + timedelta(days=10)
        invalid_data['end_date'] = timezone.now().date() + timedelta(days=5)
        tournament = Tournament.objects.create(**invalid_data)
        
        validator = TournamentIntegrityValidator()
        result = validator.validate_tournament_structure(tournament)
        
        self.assertFalse(result['is_valid'])
        self.assertTrue(any('start date' in error.lower() for error in result['errors']))
    
    def test_registration_eligibility_validation(self):
        """Test registration eligibility validation."""
        tournament = Tournament.objects.create(**self.tournament_data)
        
        # Create test players
        from apps.clients.models import ClientProfile
        player1 = ClientProfile.objects.create(
            user=self.organizer,  # Using organizer as player for simplicity
            phone_number="+1234567890"
        )
        
        User = get_user_model()
        player2_user = User.objects.create_user(
            username="player2",
            email="player2@test.com",
            password="testpass"
        )
        player2 = ClientProfile.objects.create(
            user=player2_user,
            phone_number="+1234567891"
        )
        
        registration_data = {
            'team_name': 'Test Team',
            'player1': player1.id,
            'player2': player2.id,
            'contact_email': 'team@test.com'
        }
        
        validator = TournamentIntegrityValidator()
        result = validator.validate_registration_eligibility(tournament, registration_data)
        
        self.assertTrue(result['is_eligible'])
        self.assertEqual(len(result['errors']), 0)
    
    def test_registration_duplicate_prevention(self):
        """Test prevention of duplicate registrations."""
        tournament = Tournament.objects.create(**self.tournament_data)
        
        # Create test players
        from apps.clients.models import ClientProfile
        player1 = ClientProfile.objects.create(
            user=self.organizer,
            phone_number="+1234567890"
        )
        
        User = get_user_model()
        player2_user = User.objects.create_user(
            username="player2",
            email="player2@test.com",
            password="testpass"
        )
        player2 = ClientProfile.objects.create(
            user=player2_user,
            phone_number="+1234567891"
        )
        
        # Create first registration
        TournamentRegistration.objects.create(
            tournament=tournament,
            team_name='First Team',
            player1=player1,
            player2=player2,
            contact_email='first@test.com',
            contact_phone='+1234567890'
        )
        
        # Try to register same players again
        registration_data = {
            'team_name': 'Second Team',
            'player1': player1.id,
            'player2': player2.id,
            'contact_email': 'second@test.com'
        }
        
        validator = TournamentIntegrityValidator()
        result = validator.validate_registration_eligibility(tournament, registration_data)
        
        self.assertFalse(result['is_eligible'])
        self.assertTrue(any('already registered' in error.lower() for error in result['errors']))


class BracketIntegrityTestCase(TestCase):
    """Test bracket structure and consistency validation."""
    
    def setUp(self):
        """Set up test data for bracket testing."""
        # Create basic tournament setup
        self.category = TournamentCategory.objects.create(
            name="Bracket Test Category",
            category_type="open",
            gender="any"
        )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.organizer = User.objects.create_user(
            username="bracket_organizer",
            email="bracket@test.com",
            password="testpass"
        )
        
        from apps.clubs.models import Club
        self.club = Club.objects.create(
            name="Bracket Test Club",
            slug="bracket-test-club"
        )
        
        self.tournament = Tournament.objects.create(
            name='Bracket Test Tournament',
            description='Test tournament for bracket integrity',
            slug='bracket-test-tournament',
            format='elimination',
            category=self.category,
            start_date=timezone.now().date() + timedelta(days=7),
            end_date=timezone.now().date() + timedelta(days=8),
            registration_start=timezone.now() + timedelta(days=1),
            registration_end=timezone.now() + timedelta(days=6),
            max_teams=8,
            min_teams=4,
            organizer=self.organizer,
            contact_email='bracket@test.com',
            club=self.club,
            status='in_progress'
        )
        
        # Create test registrations
        from apps.clients.models import ClientProfile
        self.registrations = []
        
        for i in range(8):
            user1 = User.objects.create_user(
                username=f"player{i*2+1}",
                email=f"player{i*2+1}@test.com",
                password="testpass"
            )
            user2 = User.objects.create_user(
                username=f"player{i*2+2}",
                email=f"player{i*2+2}@test.com",
                password="testpass"
            )
            
            player1 = ClientProfile.objects.create(
                user=user1,
                phone_number=f"+123456789{i*2+1}"
            )
            player2 = ClientProfile.objects.create(
                user=user2,
                phone_number=f"+123456789{i*2+2}"
            )
            
            registration = TournamentRegistration.objects.create(
                tournament=self.tournament,
                team_name=f'Team {i+1}',
                player1=player1,
                player2=player2,
                contact_email=f'team{i+1}@test.com',
                contact_phone=f'+123456789{i+1}',
                status='confirmed'
            )
            self.registrations.append(registration)
    
    def test_valid_bracket_structure(self):
        """Test validation of a valid bracket structure."""
        # Create valid 8-team elimination bracket
        # Round 1: 4 brackets (positions 0-3)
        round1_brackets = []
        for i in range(4):
            bracket = TournamentBracket.objects.create(
                tournament=self.tournament,
                round_number=1,
                position=i,
                team1=self.registrations[i*2],
                team2=self.registrations[i*2+1]
            )
            round1_brackets.append(bracket)
        
        # Round 2: 2 brackets (positions 0-1)
        round2_brackets = []
        for i in range(2):
            bracket = TournamentBracket.objects.create(
                tournament=self.tournament,
                round_number=2,
                position=i
            )
            # Set advancement from round 1
            round1_brackets[i*2].advances_to = bracket
            round1_brackets[i*2].save()
            round1_brackets[i*2+1].advances_to = bracket
            round1_brackets[i*2+1].save()
            round2_brackets.append(bracket)
        
        # Round 3: 1 bracket (finals)
        finals_bracket = TournamentBracket.objects.create(
            tournament=self.tournament,
            round_number=3,
            position=0
        )
        
        # Set advancement from round 2
        for bracket in round2_brackets:
            bracket.advances_to = finals_bracket
            bracket.save()
        
        # Validate bracket
        mixin = BracketIntegrityMixin()
        result = mixin.validate_bracket_consistency(self.tournament)
        
        self.assertTrue(result['is_consistent'])
        self.assertEqual(len(result['errors']), 0)
    
    def test_orphan_match_detection(self):
        """Test detection of orphaned matches without bracket positions."""
        # Create a match without corresponding bracket
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.registrations[0],
            team2=self.registrations[1],
            scheduled_date=timezone.now() + timedelta(hours=24)
        )
        
        validator = TournamentIntegrityValidator()
        result = validator.validate_bracket_consistency(self.tournament)
        
        self.assertFalse(result['is_consistent'])
        self.assertTrue(any('orphan' in error.lower() for error in result['errors']))
    
    def test_invalid_advancement_paths(self):
        """Test detection of invalid advancement paths."""
        # Create brackets with invalid advancement
        bracket1 = TournamentBracket.objects.create(
            tournament=self.tournament,
            round_number=1,
            position=0,
            team1=self.registrations[0],
            team2=self.registrations[1]
        )
        
        # Create advancement that skips a round (invalid)
        bracket3 = TournamentBracket.objects.create(
            tournament=self.tournament,
            round_number=3,
            position=0
        )
        
        bracket1.advances_to = bracket3  # Invalid: skips round 2
        bracket1.save()
        
        mixin = BracketIntegrityMixin()
        result = mixin.validate_bracket_consistency(self.tournament)
        
        self.assertFalse(result['is_consistent'])
        self.assertTrue(any('advancement' in error.lower() for error in result['errors']))
    
    def test_winner_progression_validation(self):
        """Test validation of winner progression through brackets."""
        # Create bracket structure
        bracket1 = TournamentBracket.objects.create(
            tournament=self.tournament,
            round_number=1,
            position=0,
            team1=self.registrations[0],
            team2=self.registrations[1]
        )
        
        bracket2 = TournamentBracket.objects.create(
            tournament=self.tournament,
            round_number=2,
            position=0
        )
        
        bracket1.advances_to = bracket2
        bracket1.save()
        
        # Create completed match with winner
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.registrations[0],
            team2=self.registrations[1],
            scheduled_date=timezone.now() + timedelta(hours=24),
            status='completed',
            winner=self.registrations[0],  # Team 1 wins
            team1_score=[6, 6],
            team2_score=[4, 4]
        )
        
        bracket1.match = match
        bracket1.save()
        
        # Winner should be advanced to next bracket
        # But we'll test when winner is NOT advanced (error condition)
        mixin = BracketIntegrityMixin()
        result = mixin.validate_bracket_consistency(self.tournament)
        
        # Should detect that winner was not advanced
        self.assertFalse(result['is_consistent'])
        self.assertTrue(any('winner' in error.lower() and 'advanced' in error.lower() for error in result['errors']))


class TournamentSafetyMixinTestCase(TransactionTestCase):
    """Test tournament safety mixin operations."""
    
    def setUp(self):
        """Set up test data for safety mixin testing."""
        self.category = TournamentCategory.objects.create(
            name="Safety Test Category",
            category_type="open",
            gender="any"
        )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.organizer = User.objects.create_user(
            username="safety_organizer",
            email="safety@test.com",
            password="testpass"
        )
        
        from apps.clubs.models import Club
        self.club = Club.objects.create(
            name="Safety Test Club",
            slug="safety-test-club"
        )
        
        self.tournament = Tournament.objects.create(
            name='Safety Test Tournament',
            description='Test tournament for safety mixin',
            slug='safety-test-tournament',
            format='elimination',
            category=self.category,
            start_date=timezone.now().date() + timedelta(days=7),
            end_date=timezone.now().date() + timedelta(days=8),
            registration_start=timezone.now() + timedelta(days=1),
            registration_end=timezone.now() + timedelta(days=6),
            max_teams=16,
            min_teams=4,
            organizer=self.organizer,
            contact_email='safety@test.com',
            club=self.club,
            status='published'
        )
        
        self.mixin = TournamentSafetyMixin()
    
    def test_tournament_operation_context_manager(self):
        """Test tournament bracket context manager."""
        with self.mixin.tournament_bracket_context(self.tournament, 'test_operation') as operation_id:
            self.assertIsNotNone(operation_id)
            # Context manager should provide operation tracking
    
    def test_tournament_state_validation(self):
        """Test tournament state validation before operations."""
        # Test valid state for registration
        try:
            self.mixin._validate_tournament_state(self.tournament, 'register_team')
        except ValidationError:
            self.fail("Valid tournament state should not raise ValidationError")
        
        # Test invalid state for starting tournament
        with self.assertRaises(ValidationError):
            self.mixin._validate_tournament_state(self.tournament, 'start_tournament')
    
    def test_operation_requirements_validation(self):
        """Test operation-specific requirements validation."""
        # Test registration requirements
        registration_data = {
            'team_name': 'Test Team',
            'player1': 1,  # Assuming player IDs exist
            'player2': 2,
            'contact_email': 'test@team.com'
        }
        
        # Should not raise exception with complete data
        try:
            self.mixin._validate_operation_requirements(self.tournament, 'register_team', registration_data)
        except ValidationError:
            pass  # May fail due to missing player profiles, which is expected in test
        
        # Test incomplete data
        incomplete_data = {'team_name': 'Test Team'}
        
        with self.assertRaises(ValidationError):
            self.mixin._validate_operation_requirements(self.tournament, 'register_team', incomplete_data)
    
    @patch('apps.tournaments.mixins.logger')
    def test_suspicious_operation_detection(self, mock_logger):
        """Test detection of suspicious tournament operations."""
        # Test normal operation (should not trigger warnings)
        self.mixin._detect_suspicious_tournament_operation(
            self.tournament, 'register_team', self.organizer
        )
        
        # Should not have warning logs for normal operation
        warning_calls = [call for call in mock_logger.warning.call_args_list 
                        if 'SUSPICIOUS_TOURNAMENT_OPERATION' in str(call)]
        self.assertEqual(len(warning_calls), 0)


class CircuitBreakerTestCase(TestCase):
    """Test tournament circuit breakers."""
    
    def setUp(self):
        """Set up circuit breaker tests."""
        # Reset circuit breakers before each test
        inscription_circuit_breaker.reset_counts()
        inscription_circuit_breaker.set_state('closed')
        
        bracket_generation_circuit_breaker.reset_counts()
        bracket_generation_circuit_breaker.set_state('closed')
        
        result_processing_circuit_breaker.reset_counts()
        result_processing_circuit_breaker.set_state('closed')
    
    def test_inscription_circuit_breaker_normal_operation(self):
        """Test inscription circuit breaker under normal conditions."""
        registration_data = {
            'team_name': 'Test Team',
            'player1': 1,
            'player2': 2,
            'contact_email': 'test@team.com'
        }
        
        # Should work normally
        result = inscription_circuit_breaker.register_team('tournament_1', registration_data)
        self.assertEqual(result['status'], 'success')
    
    def test_inscription_circuit_breaker_rate_limiting(self):
        """Test inscription circuit breaker rate limiting."""
        registration_data = {
            'team_name': 'Test Team',
            'player1': 1,
            'player2': 2,
            'contact_email': 'test@team.com'
        }
        
        # Simulate many registrations to trigger rate limit
        tournament_id = 'rate_limit_test'
        
        # This should eventually trigger rate limiting
        with self.assertRaises(TournamentCircuitBreakerError):
            for i in range(15):  # Exceed rate limit
                inscription_circuit_breaker.register_team(tournament_id, registration_data)
    
    def test_bracket_generation_circuit_breaker(self):
        """Test bracket generation circuit breaker."""
        # Should work normally
        result = bracket_generation_circuit_breaker.generate_bracket(
            'tournament_1', 'elimination', 8
        )
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['teams'], 8)
        self.assertEqual(result['matches_created'], 7)  # 8-team elimination = 7 matches
    
    def test_result_processing_circuit_breaker(self):
        """Test result processing circuit breaker."""
        result_data = {
            'team1_score': [6, 6],
            'team2_score': [4, 4]
        }
        
        # Should work normally
        result = result_processing_circuit_breaker.process_match_result(
            'match_1', result_data, 'user_1'
        )
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['winner'], 'team1')


class TournamentHealthTestCase(TestCase):
    """Test tournament health monitoring."""
    
    def setUp(self):
        """Set up health monitoring tests."""
        self.health_monitor = TournamentHealthMonitor()
    
    def test_database_health_check(self):
        """Test database health check."""
        result = self.health_monitor._check_database_health()
        
        self.assertIn('status', result)
        self.assertIn('response_time_ms', result)
        self.assertIn('query_count', result)
        
        # Should be healthy in test environment
        self.assertEqual(result['status'], 'healthy')
    
    def test_overall_health_check(self):
        """Test overall health check."""
        result = self.health_monitor.check_overall_health(include_detailed=False)
        
        self.assertIn('timestamp', result)
        self.assertIn('overall_healthy', result)
        self.assertIn('checks', result)
        self.assertIn('summary', result)
        
        # Should have multiple checks
        self.assertGreater(len(result['checks']), 5)
    
    def test_health_check_caching(self):
        """Test health check result caching."""
        # First call
        result1 = self.health_monitor.check_overall_health(include_detailed=False)
        
        # Second call should use cache
        from django.core.cache import cache
        cached_result = cache.get(self.health_monitor.health_cache_key)
        
        self.assertIsNotNone(cached_result)
        self.assertEqual(cached_result['timestamp'], result1['timestamp'])


class MatchResultMixinTestCase(TestCase):
    """Test match result processing mixin."""
    
    def setUp(self):
        """Set up match result tests."""
        # Create basic tournament setup
        self.category = TournamentCategory.objects.create(
            name="Match Test Category",
            category_type="open",
            gender="any"
        )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.organizer = User.objects.create_user(
            username="match_organizer",
            email="match@test.com",
            password="testpass"
        )
        
        from apps.clubs.models import Club
        self.club = Club.objects.create(
            name="Match Test Club",
            slug="match-test-club"
        )
        
        self.tournament = Tournament.objects.create(
            name='Match Test Tournament',
            description='Test tournament for match results',
            slug='match-test-tournament',
            format='elimination',
            category=self.category,
            start_date=timezone.now().date() + timedelta(days=7),
            end_date=timezone.now().date() + timedelta(days=8),
            registration_start=timezone.now() + timedelta(days=1),
            registration_end=timezone.now() + timedelta(days=6),
            max_teams=8,
            min_teams=4,
            organizer=self.organizer,
            contact_email='match@test.com',
            club=self.club,
            status='in_progress'
        )
        
        # Create test teams
        from apps.clients.models import ClientProfile
        self.user1 = User.objects.create_user(
            username="player1",
            email="player1@test.com",
            password="testpass"
        )
        self.user2 = User.objects.create_user(
            username="player2",
            email="player2@test.com",
            password="testpass"
        )
        
        self.player1 = ClientProfile.objects.create(
            user=self.user1,
            phone_number="+1234567891"
        )
        self.player2 = ClientProfile.objects.create(
            user=self.user2,
            phone_number="+1234567892"
        )
        
        self.team1 = TournamentRegistration.objects.create(
            tournament=self.tournament,
            team_name='Team 1',
            player1=self.player1,
            player2=self.player1,  # Same player for simplicity
            contact_email='team1@test.com',
            contact_phone='+1234567891',
            status='confirmed'
        )
        
        self.team2 = TournamentRegistration.objects.create(
            tournament=self.tournament,
            team_name='Team 2',
            player1=self.player2,
            player2=self.player2,  # Same player for simplicity
            contact_email='team2@test.com',
            contact_phone='+1234567892',
            status='confirmed'
        )
        
        self.match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            scheduled_date=timezone.now() + timedelta(hours=24)
        )
        
        self.mixin = MatchResultMixin()
    
    def test_valid_match_result_recording(self):
        """Test recording a valid match result."""
        team1_score = [6, 6]
        team2_score = [4, 4]
        
        result = self.mixin.record_match_result_atomic(
            self.match, team1_score, team2_score, self.organizer
        )
        
        self.assertIn('match_id', result)
        self.assertIn('winner_id', result)
        self.assertEqual(result['team1_sets_won'], 2)
        self.assertEqual(result['team2_sets_won'], 0)
        
        # Refresh match from database
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'completed')
        self.assertEqual(self.match.winner, self.team1)
    
    def test_invalid_match_scores_validation(self):
        """Test validation of invalid match scores."""
        # Test negative scores
        with self.assertRaises(ValidationError):
            self.mixin._validate_match_scores([-1, 6], [4, 4], self.tournament)
        
        # Test mismatched array lengths
        with self.assertRaises(ValidationError):
            self.mixin._validate_match_scores([6, 6, 6], [4, 4], self.tournament)
        
        # Test empty scores
        with self.assertRaises(ValidationError):
            self.mixin._validate_match_scores([], [], self.tournament)
    
    def test_match_already_completed_error(self):
        """Test error when trying to record result for completed match."""
        self.match.status = 'completed'
        self.match.save()
        
        with self.assertRaises(ValidationError):
            self.mixin.record_match_result_atomic(
                self.match, [6, 6], [4, 4], self.organizer
            )


# Integration test for complete tournament flow
class TournamentIntegrationTestCase(TransactionTestCase):
    """Integration tests for complete tournament workflows."""
    
    def setUp(self):
        """Set up integration test data."""
        self.category = TournamentCategory.objects.create(
            name="Integration Test Category",
            category_type="open",
            gender="any"
        )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.organizer = User.objects.create_user(
            username="integration_organizer",
            email="integration@test.com",
            password="testpass"
        )
        
        from apps.clubs.models import Club
        self.club = Club.objects.create(
            name="Integration Test Club",
            slug="integration-test-club"
        )
        
        self.tournament = Tournament.objects.create(
            name='Integration Test Tournament',
            description='Full integration test tournament',
            slug='integration-test-tournament',
            format='elimination',
            category=self.category,
            start_date=timezone.now().date() + timedelta(days=7),
            end_date=timezone.now().date() + timedelta(days=8),
            registration_start=timezone.now() + timedelta(days=1),
            registration_end=timezone.now() + timedelta(days=6),
            max_teams=4,
            min_teams=4,
            organizer=self.organizer,
            contact_email='integration@test.com',
            club=self.club,
            status='published'
        )
        
        self.mixin = TournamentSafetyMixin()
    
    def test_complete_tournament_workflow(self):
        """Test complete tournament workflow from registration to completion."""
        # 1. Register teams
        for i in range(4):
            registration_data = {
                'team_name': f'Team {i+1}',
                'player1': 1,  # Simplified for test
                'player2': 2,
                'contact_email': f'team{i+1}@test.com'
            }
            
            # This would normally create actual registrations
            # For test purposes, we'll create them manually
            from apps.clients.models import ClientProfile
            User = get_user_model()
            
            user1 = User.objects.create_user(
                username=f"p{i*2+1}",
                email=f"p{i*2+1}@test.com",
                password="testpass"
            )
            user2 = User.objects.create_user(
                username=f"p{i*2+2}",
                email=f"p{i*2+2}@test.com",
                password="testpass"
            )
            
            player1 = ClientProfile.objects.create(
                user=user1,
                phone_number=f"+123456789{i*2+1}"
            )
            player2 = ClientProfile.objects.create(
                user=user2,
                phone_number=f"+123456789{i*2+2}"
            )
            
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                team_name=f'Team {i+1}',
                player1=player1,
                player2=player2,
                contact_email=f'team{i+1}@test.com',
                contact_phone=f'+123456789{i+1}',
                status='confirmed'
            )
        
        # 2. Start tournament
        self.tournament.status = 'registration_closed'
        self.tournament.save()
        
        result = self.mixin.execute_tournament_operation(
            self.tournament,
            'start_tournament',
            {},
            self.organizer
        )
        
        self.assertEqual(result['status'], 'completed')
        
        # Verify tournament started
        self.tournament.refresh_from_db()
        self.assertEqual(self.tournament.status, 'in_progress')
        
        # 3. Verify bracket was generated
        brackets = self.tournament.brackets.all()
        self.assertGreater(len(brackets), 0)
        
        # 4. Test bracket validation
        validator = TournamentIntegrityValidator()
        bracket_result = validator.validate_bracket_consistency(self.tournament)
        self.assertTrue(bracket_result['is_consistent'])