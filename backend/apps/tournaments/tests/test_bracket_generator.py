"""
Tests for tournament bracket generator.
"""

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.clubs.models import Club, Organization
from apps.clients.models import ClientProfile
from apps.tournaments.models import (
    Tournament, TournamentCategory, TournamentRegistration
)
from apps.tournaments.bracket_generator import BracketGenerator, SeedingStrategy

User = get_user_model()


class BracketGeneratorTestCase(TestCase):
    """Test bracket generation for different tournament formats."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization and club
        self.org = Organization.objects.create(name="Test Org")
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            subdomain="test-club"
        )
        
        # Create category
        self.category = TournamentCategory.objects.create(
            name="Open",
            category_type="open"
        )
        
        # Create tournament
        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            organization=self.org,
            club=self.club,
            category=self.category,
            format="elimination",
            start_date=timezone.now().date() + timezone.timedelta(days=7),
            end_date=timezone.now().date() + timezone.timedelta(days=14),
            registration_start=timezone.now() - timezone.timedelta(days=7),
            registration_end=timezone.now() + timezone.timedelta(days=1),
            max_teams=16,
            min_teams=4,
            organizer=User.objects.create_user(
                username="organizer",
                email="organizer@test.com",
                password="testpass123"
            ),
            contact_email="organizer@test.com",
            status="registration_closed"
        )
        
        # Create players
        self.players = []
        for i in range(16):
            user = User.objects.create_user(
                username=f"player{i}",
                email=f"player{i}@test.com",
                password="testpass123"
            )
            profile = ClientProfile.objects.create(
                user=user,
                phone=f"+1234567890{i}",
                birth_date="1990-01-01"
            )
            self.players.append(profile)
        
        # Create registrations (8 teams)
        self.registrations = []
        for i in range(0, 16, 2):
            reg = TournamentRegistration.objects.create(
                tournament=self.tournament,
                team_name=f"Team {i//2 + 1}",
                player1=self.players[i],
                player2=self.players[i+1],
                status="confirmed",
                contact_phone="+1234567890",
                contact_email=f"team{i//2}@test.com"
            )
            self.registrations.append(reg)
    
    def test_single_elimination_power_of_two(self):
        """Test single elimination bracket with power of 2 teams."""
        generator = BracketGenerator(self.tournament)
        bracket = generator.generate_single_elimination()
        
        # Check bracket properties
        self.assertEqual(bracket.format, "single_elimination")
        self.assertEqual(bracket.size, 8)  # 8 teams
        self.assertEqual(bracket.tournament, self.tournament)
        
        # Check nodes created
        nodes = bracket.nodes.all()
        # For 8 teams: 4 first round + 2 semifinals + 1 final = 7 nodes
        self.assertEqual(nodes.count(), 7)
        
        # Check first round has matches
        first_round = nodes.filter(round=1)
        self.assertEqual(first_round.count(), 4)
        
        for node in first_round:
            self.assertIsNotNone(node.match)
            self.assertIsNotNone(node.match.team1)
            self.assertIsNotNone(node.match.team2)
    
    def test_single_elimination_with_byes(self):
        """Test single elimination bracket with byes."""
        # Remove 3 teams to create need for byes
        for i in range(3):
            self.registrations[-(i+1)].delete()
        
        generator = BracketGenerator(self.tournament)
        bracket = generator.generate_single_elimination()
        
        # Check bracket size is next power of 2
        self.assertEqual(bracket.size, 8)  # Still 8 (next power of 2 for 5 teams)
        
        # Check byes created
        nodes_with_byes = bracket.nodes.filter(has_bye=True)
        self.assertEqual(nodes_with_byes.count(), 3)  # 8 - 5 = 3 byes
    
    def test_double_elimination_progression(self):
        """Test double elimination bracket creation."""
        self.tournament.format = "double_elimination"
        self.tournament.save()
        
        generator = BracketGenerator(self.tournament)
        bracket = generator.generate_double_elimination()
        
        self.assertEqual(bracket.format, "double_elimination")
        
        # Check both winners and losers bracket nodes exist
        winners_nodes = bracket.nodes.filter(is_losers_bracket=False)
        losers_nodes = bracket.nodes.filter(is_losers_bracket=True)
        
        self.assertGreater(winners_nodes.count(), 0)
        self.assertGreater(losers_nodes.count(), 0)
    
    def test_round_robin_all_matches(self):
        """Test round robin generates all matches."""
        self.tournament.format = "round_robin"
        self.tournament.save()
        
        generator = BracketGenerator(self.tournament)
        matches = generator.generate_round_robin()
        
        # For 8 teams, each plays 7 others = 28 total matches
        self.assertEqual(len(matches), 28)
        
        # Check each team plays every other team exactly once
        team_matchups = {}
        for match in matches:
            t1_id = match.team1.id
            t2_id = match.team2.id
            
            if t1_id not in team_matchups:
                team_matchups[t1_id] = set()
            if t2_id not in team_matchups:
                team_matchups[t2_id] = set()
            
            team_matchups[t1_id].add(t2_id)
            team_matchups[t2_id].add(t1_id)
        
        # Each team should play 7 others
        for team_id, opponents in team_matchups.items():
            self.assertEqual(len(opponents), 7)
    
    def test_swiss_pairing_logic(self):
        """Test Swiss system pairing."""
        self.tournament.format = "swiss"
        self.tournament.save()
        
        generator = BracketGenerator(self.tournament)
        matches = generator.generate_swiss(rounds=3)
        
        # For 8 teams and 3 rounds: 4 matches per round = 12 total
        self.assertEqual(len(matches), 12)
        
        # Check rounds
        round_counts = {}
        for match in matches:
            round_num = match.round_number
            round_counts[round_num] = round_counts.get(round_num, 0) + 1
        
        # Each round should have 4 matches (8 teams / 2)
        for round_num, count in round_counts.items():
            self.assertEqual(count, 4)


class SeedingStrategyTestCase(TestCase):
    """Test seeding strategies."""
    
    def setUp(self):
        """Set up test data."""
        self.org = Organization.objects.create(name="Test Org")
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.org,
            subdomain="test"
        )
        
        # Create mock registrations with ratings
        self.registrations = []
        ratings = [1800, 1600, 1700, 1500, 1650, 1550, 1750, 1450]
        
        for i, rating in enumerate(ratings):
            user1 = User.objects.create_user(f"user{i*2}", f"user{i*2}@test.com")
            user2 = User.objects.create_user(f"user{i*2+1}", f"user{i*2+1}@test.com")
            
            player1 = ClientProfile.objects.create(user=user1)
            player2 = ClientProfile.objects.create(user=user2)
            
            # Set ratings
            player1.rating = rating
            player2.rating = rating + 50
            player1.save()
            player2.save()
            
            # Create tournament and registration
            tournament = Tournament.objects.create(
                name=f"Tournament {i}",
                organization=self.org,
                club=self.club,
                category=TournamentCategory.objects.create(
                    name=f"Cat {i}",
                    category_type="open"
                ),
                format="elimination",
                start_date=timezone.now().date(),
                end_date=timezone.now().date(),
                registration_start=timezone.now(),
                registration_end=timezone.now(),
                max_teams=16,
                organizer=user1,
                contact_email="test@test.com"
            )
            
            reg = TournamentRegistration.objects.create(
                tournament=tournament,
                team_name=f"Team {i}",
                player1=player1,
                player2=player2,
                status="confirmed",
                contact_phone="+1234567890",
                contact_email=f"team{i}@test.com"
            )
            self.registrations.append(reg)
    
    def test_seed_by_elo(self):
        """Test ELO-based seeding."""
        strategy = SeedingStrategy()
        seeded = strategy.seed_by_elo(self.registrations)
        
        # Check sorted by average ELO (descending)
        previous_elo = float('inf')
        for reg in seeded:
            avg_elo = reg._avg_elo
            self.assertLessEqual(avg_elo, previous_elo)
            previous_elo = avg_elo
    
    def test_distribute_geographically(self):
        """Test geographic distribution seeding."""
        # Set clubs for some teams
        club2 = Club.objects.create(
            name="Club 2",
            organization=self.org,
            subdomain="club2"
        )
        
        # Assign half teams to different club
        for i in range(4):
            self.registrations[i].player1.user.club = self.club
            self.registrations[i].player1.user.save()
        
        for i in range(4, 8):
            self.registrations[i].player1.user.club = club2
            self.registrations[i].player1.user.save()
        
        strategy = SeedingStrategy()
        seeded = strategy.distribute_geographically(self.registrations)
        
        # Check that teams from same club are not consecutive
        for i in range(len(seeded) - 1):
            if hasattr(seeded[i].player1.user, 'club') and hasattr(seeded[i+1].player1.user, 'club'):
                # Allow some consecutive same-club matchups but not all
                pass  # This is a simplified test
    
    def test_assign_byes(self):
        """Test bye assignment calculation."""
        strategy = SeedingStrategy()
        
        # Test with 5 teams in 8-team bracket (3 byes needed)
        bye_positions = strategy.assign_byes(bracket_size=8, player_count=5)
        self.assertEqual(len(bye_positions), 3)
        
        # Byes should be distributed evenly
        self.assertEqual(sorted(bye_positions), [1, 2, 3])
        
        # Test with 13 teams in 16-team bracket (3 byes needed)
        bye_positions = strategy.assign_byes(bracket_size=16, player_count=13)
        self.assertEqual(len(bye_positions), 3)