"""
Integration tests for complete tournament flow.
"""

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.clubs.models import Club, Organization, Court
from apps.clients.models import ClientProfile
from apps.tournaments.models import (
    Tournament, TournamentCategory, TournamentRegistration,
    Bracket, Match
)
from apps.tournaments.bracket_generator import BracketGenerator
from apps.tournaments.match_scheduler import MatchScheduler
from apps.tournaments.progression_engine import ProgressionEngine

User = get_user_model()


class CompleteTournamentFlowTestCase(APITestCase):
    """Test complete tournament flow from creation to completion."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization and club
        self.org = Organization.objects.create(name="Padel Org")
        self.club = Club.objects.create(
            name="Padel Club",
            organization=self.org,
            subdomain="padel-club"
        )
        
        # Create courts
        self.courts = []
        for i in range(3):
            court = Court.objects.create(
                club=self.club,
                name=f"Court {i+1}",
                surface_type="hard",
                is_active=True,
                display_order=i+1
            )
            self.courts.append(court)
        
        # Create users
        self.organizer = User.objects.create_user(
            username="organizer",
            email="organizer@test.com",
            password="testpass123"
        )
        self.organizer.organization = self.org
        self.organizer.club = self.club
        self.organizer.save()
        
        # Create players
        self.players = []
        for i in range(16):
            user = User.objects.create_user(
                username=f"player{i}",
                email=f"player{i}@test.com",
                password="testpass123"
            )
            user.organization = self.org
            user.club = self.club
            user.save()
            
            profile = ClientProfile.objects.create(
                user=user,
                phone=f"+123456789{i:02d}",
                birth_date="1990-01-01"
            )
            profile.rating = 1200 + (i * 50)  # Varying ratings
            profile.save()
            self.players.append(profile)
        
        # Authenticate as organizer
        self.client.force_authenticate(user=self.organizer)
        
        # Create category
        self.category = TournamentCategory.objects.create(
            name="Open Singles",
            category_type="open",
            description="Open category for all levels"
        )
    
    def test_complete_tournament_flow(self):
        """Test creating, running, and completing a tournament."""
        # Step 1: Create tournament
        tournament_data = {
            "name": "Summer Championship 2025",
            "description": "Annual summer tournament",
            "category": self.category.id,
            "format": "elimination",
            "start_date": (timezone.now() + timezone.timedelta(days=14)).date(),
            "end_date": (timezone.now() + timezone.timedelta(days=21)).date(),
            "registration_start": timezone.now(),
            "registration_end": timezone.now() + timezone.timedelta(days=7),
            "max_teams": 8,
            "min_teams": 4,
            "registration_fee": "25.00",
            "requires_payment": False,
            "visibility": "public",
            "contact_email": "tournament@padel.com",
            "rules": "Standard padel rules apply"
        }
        
        response = self.client.post('/api/tournaments/', tournament_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tournament_id = response.data['id']
        
        # Step 2: Register teams
        for i in range(0, 16, 2):
            registration_data = {
                "tournament": tournament_id,
                "team_name": f"Team {i//2 + 1}",
                "player1": self.players[i].id,
                "player2": self.players[i+1].id,
                "contact_phone": "+1234567890",
                "contact_email": f"team{i//2}@test.com"
            }
            
            response = self.client.post(
                f'/api/tournaments/{tournament_id}/register/',
                registration_data
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 3: Close registration and generate bracket
        tournament = Tournament.objects.get(id=tournament_id)
        tournament.status = "registration_closed"
        tournament.save()
        
        response = self.client.post(
            f'/api/tournaments/brackets/{tournament_id}/generate/',
            {"confirm": True}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify bracket created
        bracket = Bracket.objects.get(tournament=tournament)
        self.assertEqual(bracket.size, 8)
        self.assertEqual(bracket.format, "single_elimination")
        
        # Step 4: Generate match schedule
        response = self.client.post(
            f'/api/tournaments/schedules/{tournament_id}/generate/'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify matches scheduled
        matches = Match.objects.filter(tournament=tournament)
        self.assertGreater(matches.count(), 0)
        
        for match in matches.filter(round_number=1):
            self.assertTrue(hasattr(match, 'schedule'))
            self.assertIsNotNone(match.schedule.court)
            self.assertIsNotNone(match.schedule.datetime)
        
        # Step 5: Play matches and advance tournament
        # Simulate first round results
        first_round_matches = matches.filter(round_number=1)
        for match in first_round_matches:
            # Team 1 wins all first round matches
            winner = match.team1
            
            # Submit match result
            result_data = {
                "winner_id": str(winner.id),
                "scores": [
                    {"team1_games": 6, "team2_games": 4},
                    {"team1_games": 6, "team2_games": 3}
                ]
            }
            
            response = self.client.post(
                f'/api/tournaments/progression/matches/{match.id}/result/',
                result_data
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Verify match completed
            match.refresh_from_db()
            self.assertEqual(match.status, "completed")
            self.assertEqual(match.winner, winner)
        
        # Step 6: Check standings
        response = self.client.get(
            f'/api/tournaments/progression/tournaments/{tournament_id}/standings/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        standings = response.data
        self.assertIsInstance(standings, list)
        self.assertGreater(len(standings), 0)
        
        # Step 7: Get next matches (semifinals)
        response = self.client.get(
            f'/api/tournaments/progression/tournaments/{tournament_id}/next-matches/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        next_matches = response.data
        
        # Should have semifinals
        self.assertEqual(len(next_matches), 2)  # 2 semifinal matches
        
        # Continue playing until tournament complete
        while next_matches:
            for match_data in next_matches:
                match = Match.objects.get(id=match_data['id'])
                winner = match.team1  # Team 1 always wins for simplicity
                
                result_data = {
                    "winner_id": str(winner.id),
                    "scores": [
                        {"team1_games": 6, "team2_games": 2},
                        {"team1_games": 6, "team2_games": 3}
                    ]
                }
                
                response = self.client.post(
                    f'/api/tournaments/progression/matches/{match.id}/result/',
                    result_data
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Get next round matches
            response = self.client.get(
                f'/api/tournaments/progression/tournaments/{tournament_id}/next-matches/'
            )
            next_matches = response.data
        
        # Verify tournament completed
        tournament.refresh_from_db()
        self.assertEqual(tournament.status, "completed")
        
        # Check final standings
        response = self.client.get(
            f'/api/tournaments/progression/tournaments/{tournament_id}/standings/'
        )
        final_standings = response.data
        
        # Winner should be first
        self.assertEqual(final_standings[0]['placement'], 1)
        self.assertGreater(final_standings[0]['matches_won'], 0)


class MatchSchedulingWithCourtsTestCase(TestCase):
    """Test match scheduling with court integration."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(name="Test Org")
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            subdomain="test"
        )
        
        # Create courts with different quality
        self.center_court = Court.objects.create(
            club=self.club,
            name="Center Court",
            surface_type="grass",
            is_active=True,
            display_order=1
        )
        
        self.court2 = Court.objects.create(
            club=self.club,
            name="Court 2",
            surface_type="hard",
            is_active=True,
            display_order=2
        )
        
        # Create tournament
        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            organization=self.org,
            club=self.club,
            category=TournamentCategory.objects.create(
                name="Open",
                category_type="open"
            ),
            format="elimination",
            start_date=timezone.now().date() + timezone.timedelta(days=1),
            end_date=timezone.now().date() + timezone.timedelta(days=3),
            registration_start=timezone.now(),
            registration_end=timezone.now(),
            max_teams=4,
            min_teams=4,
            organizer=User.objects.create_user("org", "org@test.com"),
            contact_email="org@test.com",
            status="in_progress",
            total_rounds=2
        )
        
        # Create matches
        self.matches = []
        
        # Create teams
        teams = []
        for i in range(4):
            user1 = User.objects.create_user(f"p{i*2}", f"p{i*2}@test.com")
            user2 = User.objects.create_user(f"p{i*2+1}", f"p{i*2+1}@test.com")
            
            team = TournamentRegistration.objects.create(
                tournament=self.tournament,
                team_name=f"Team {i+1}",
                player1=ClientProfile.objects.create(user=user1, phone="+123"),
                player2=ClientProfile.objects.create(user=user2, phone="+123"),
                status="confirmed",
                contact_phone="+123",
                contact_email=f"team{i}@test.com"
            )
            teams.append(team)
        
        # Create semifinal matches
        for i in range(2):
            match = Match.objects.create(
                tournament=self.tournament,
                club=self.club,
                round_number=1,
                match_number=i,
                team1=teams[i*2],
                team2=teams[i*2+1],
                scheduled_date=timezone.now() + timezone.timedelta(days=1),
                status="scheduled"
            )
            self.matches.append(match)
        
        # Create final match (no teams yet)
        final = Match.objects.create(
            tournament=self.tournament,
            club=self.club,
            round_number=2,
            match_number=0,
            team1=None,
            team2=None,
            scheduled_date=timezone.now() + timezone.timedelta(days=2),
            status="scheduled"
        )
        self.matches.append(final)
    
    def test_match_scheduling_with_courts(self):
        """Test scheduling matches on available courts."""
        scheduler = MatchScheduler(self.tournament)
        schedules = scheduler.schedule_matches(self.matches[:2])  # Just semifinals
        
        self.assertEqual(len(schedules), 2)
        
        for schedule in schedules:
            self.assertIsNotNone(schedule.court)
            self.assertIsNotNone(schedule.datetime)
            self.assertEqual(schedule.status, 'confirmed')
            
            # Check no conflicts
            self.assertFalse(schedule.has_conflict)
    
    def test_progression_with_walkovers(self):
        """Test tournament progression with walkovers."""
        engine = ProgressionEngine(self.tournament)
        
        # First match is a walkover
        match1 = self.matches[0]
        match1.status = "walkover"
        match1.winner = match1.team1
        match1.walkover_reason = "Team 2 didn't show up"
        match1.save()
        
        # Advance winner
        next_node = engine.advance_winner(match1, match1.team1)
        
        # Check final match updated
        final = Match.objects.get(round_number=2)
        self.assertIn(match1.team1, [final.team1, final.team2])
    
    def test_bracket_visualization_data(self):
        """Test bracket data structure for visualization."""
        # Create bracket
        bracket = Bracket.objects.create(
            tournament=self.tournament,
            format="single_elimination",
            size=4
        )
        
        generator = BracketGenerator(self.tournament)
        bracket.bracket_data = generator._serialize_bracket_structure(bracket)
        bracket.save()
        
        # Check data structure
        data = bracket.bracket_data
        self.assertIn('format', data)
        self.assertIn('rounds', data)
        self.assertEqual(data['format'], 'single_elimination')
        self.assertEqual(data['size'], 4)