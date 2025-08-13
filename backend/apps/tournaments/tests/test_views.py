"""
Tests for tournament views.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import ClientProfile
from apps.clubs.models import Club
from apps.root.models import Organization
from apps.tournaments.models import (
    Match,
    Prize,
    Tournament,
    TournamentCategory,
    TournamentRegistration,
)

User = get_user_model()


class TournamentViewSetTest(APITestCase):
    """Test tournament viewset."""

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Org", slug="test-org"
        )
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            organization=self.organization,
            email="club@example.com",
            phone="1234567890",
        )
        self.category = TournamentCategory.objects.create(
            name="Open", category_type="open"
        )
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.client.force_authenticate(user=self.user)

        # Mock get_organization and get_club methods by adding them to user
        self.user.get_organization = lambda: self.organization
        self.user.get_club = lambda: self.club

    def test_list_tournaments(self):
        """Test listing tournaments."""
        Tournament.objects.create(
            name="Test Tournament",
            description="A test tournament",
            slug="test-tournament",
            format="elimination",
            category=self.category,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=5),
            max_teams=16,
            organizer=self.user,
            contact_email="organizer@example.com",
            organization=self.organization,
            club=self.club,
        )

        url = reverse("tournaments:tournaments-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Test Tournament")

    def test_create_tournament(self):
        """Test creating a tournament."""
        url = reverse("tournaments:tournaments-list")
        data = {
            "name": "New Tournament",
            "description": "A new tournament",
            "format": "elimination",
            "category_id": str(self.category.id),
            "start_date": (date.today() + timedelta(days=7)).isoformat(),
            "end_date": (date.today() + timedelta(days=9)).isoformat(),
            "registration_start": (timezone.now()).isoformat(),
            "registration_end": (timezone.now() + timedelta(days=5)).isoformat(),
            "max_teams": 16,
            "contact_email": "organizer@example.com",
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Tournament.objects.count(), 1)
        tournament = Tournament.objects.first()
        self.assertEqual(tournament.name, "New Tournament")
        self.assertEqual(tournament.organizer, self.user)

    def test_tournament_detail(self):
        """Test retrieving tournament details."""
        tournament = Tournament.objects.create(
            name="Test Tournament",
            description="A test tournament",
            slug="test-tournament",
            format="elimination",
            category=self.category,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=5),
            max_teams=16,
            organizer=self.user,
            contact_email="organizer@example.com",
            organization=self.organization,
            club=self.club,
        )

        url = reverse("tournaments:tournaments-detail", kwargs={"pk": tournament.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Tournament")
        self.assertEqual(response.data["format"], "elimination")

    def test_tournament_registration(self):
        """Test tournament registration endpoint."""
        tournament = Tournament.objects.create(
            name="Test Tournament",
            description="A test tournament",
            slug="test-tournament",
            format="elimination",
            category=self.category,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=5),
            max_teams=16,
            organizer=self.user,
            contact_email="organizer@example.com",
            organization=self.organization,
            club=self.club,
            status="registration_open",
        )

        # Create players
        user1 = User.objects.create_user(
            username="player1", email="player1@example.com"
        )
        user2 = User.objects.create_user(
            username="player2", email="player2@example.com"
        )
        profile1 = ClientProfile.objects.create(user=user1)
        profile2 = ClientProfile.objects.create(user=user2)

        url = reverse("tournaments:tournaments-register", kwargs={"pk": tournament.id})
        data = {
            "team_name": "Dream Team",
            "player1_id": str(profile1.id),
            "player2_id": str(profile2.id),
            "contact_phone": "1234567890",
            "contact_email": "team@example.com",
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TournamentRegistration.objects.count(), 1)
        registration = TournamentRegistration.objects.first()
        self.assertEqual(registration.team_name, "Dream Team")


class TournamentRegistrationViewSetTest(APITestCase):
    """Test tournament registration viewset."""

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Org", slug="test-org"
        )
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            organization=self.organization,
            email="club@example.com",
            phone="1234567890",
        )
        self.category = TournamentCategory.objects.create(
            name="Open", category_type="open"
        )
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.profile = ClientProfile.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)

        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            description="A test tournament",
            slug="test-tournament",
            format="elimination",
            category=self.category,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=5),
            max_teams=16,
            organizer=self.user,
            contact_email="organizer@example.com",
            organization=self.organization,
            club=self.club,
        )

        # Create partner
        self.partner_user = User.objects.create_user(
            username="partner", email="partner@example.com"
        )
        self.partner_profile = ClientProfile.objects.create(user=self.partner_user)

        self.registration = TournamentRegistration.objects.create(
            tournament=self.tournament,
            team_name="Test Team",
            player1=self.profile,
            player2=self.partner_profile,
            contact_phone="1234567890",
            contact_email="team@example.com",
        )

        # Mock get_organization and get_club methods
        self.user.get_organization = lambda: self.organization
        self.user.get_club = lambda: self.club

    def test_list_registrations(self):
        """Test listing registrations."""
        url = reverse("tournaments:registrations-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["team_name"], "Test Team")

    def test_confirm_registration(self):
        """Test confirming a registration."""
        url = reverse(
            "tournaments:registrations-confirm", kwargs={"pk": self.registration.id}
        )
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, "confirmed")

    def test_cancel_registration(self):
        """Test cancelling a registration."""
        url = reverse(
            "tournaments:registrations-cancel", kwargs={"pk": self.registration.id}
        )
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, "cancelled")


class MatchViewSetTest(APITestCase):
    """Test match viewset."""

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Org", slug="test-org"
        )
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            organization=self.organization,
            email="club@example.com",
            phone="1234567890",
        )
        self.category = TournamentCategory.objects.create(
            name="Open", category_type="open"
        )
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.client.force_authenticate(user=self.user)

        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            description="A test tournament",
            slug="test-tournament",
            format="elimination",
            category=self.category,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=5),
            max_teams=16,
            organizer=self.user,
            contact_email="organizer@example.com",
            organization=self.organization,
            club=self.club,
        )

        # Create teams
        user1 = User.objects.create_user(username="p1", email="p1@example.com")
        user2 = User.objects.create_user(username="p2", email="p2@example.com")
        user3 = User.objects.create_user(username="p3", email="p3@example.com")
        user4 = User.objects.create_user(username="p4", email="p4@example.com")

        profile1 = ClientProfile.objects.create(user=user1)
        profile2 = ClientProfile.objects.create(user=user2)
        profile3 = ClientProfile.objects.create(user=user3)
        profile4 = ClientProfile.objects.create(user=user4)

        self.team1 = TournamentRegistration.objects.create(
            tournament=self.tournament,
            team_name="Team 1",
            player1=profile1,
            player2=profile2,
            contact_phone="1234567890",
            contact_email="team1@example.com",
        )
        self.team2 = TournamentRegistration.objects.create(
            tournament=self.tournament,
            team_name="Team 2",
            player1=profile3,
            player2=profile4,
            contact_phone="1234567890",
            contact_email="team2@example.com",
        )

        self.match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            scheduled_date=timezone.now() + timedelta(days=1),
            organization=self.organization,
            club=self.club,
        )

        # Mock get_organization and get_club methods
        self.user.get_organization = lambda: self.organization
        self.user.get_club = lambda: self.club

    def test_list_matches(self):
        """Test listing matches."""
        url = reverse("tournaments:matches-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_start_match(self):
        """Test starting a match."""
        url = reverse("tournaments:matches-start", kwargs={"pk": self.match.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, "in_progress")
        self.assertIsNotNone(self.match.actual_start_time)

    def test_record_score(self):
        """Test recording a set score."""
        self.match.status = "in_progress"
        self.match.save()

        url = reverse("tournaments:matches-record-score", kwargs={"pk": self.match.id})
        data = {"team1_games": 6, "team2_games": 4}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.team1_score, [6])
        self.assertEqual(self.match.team2_score, [4])

    def test_walkover(self):
        """Test recording a walkover."""
        url = reverse("tournaments:matches-walkover", kwargs={"pk": self.match.id})
        data = {"winner_id": str(self.team1.id), "reason": "Team 2 did not show up"}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, "walkover")
        self.assertEqual(self.match.winner, self.team1)
        self.assertEqual(self.match.walkover_reason, "Team 2 did not show up")


class PrizeViewSetTest(APITestCase):
    """Test prize viewset."""

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Org", slug="test-org"
        )
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            organization=self.organization,
            email="club@example.com",
            phone="1234567890",
        )
        self.category = TournamentCategory.objects.create(
            name="Open", category_type="open"
        )
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )
        self.client.force_authenticate(user=self.user)

        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            description="A test tournament",
            slug="test-tournament",
            format="elimination",
            category=self.category,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=5),
            max_teams=16,
            organizer=self.user,
            contact_email="organizer@example.com",
            organization=self.organization,
            club=self.club,
        )

        self.prize = Prize.objects.create(
            tournament=self.tournament,
            position=1,
            name="First Place",
            prize_type="cash",
            cash_value=Decimal("1000.00"),
        )

        # Create a team
        user1 = User.objects.create_user(username="p1", email="p1@example.com")
        user2 = User.objects.create_user(username="p2", email="p2@example.com")
        profile1 = ClientProfile.objects.create(user=user1)
        profile2 = ClientProfile.objects.create(user=user2)

        self.team = TournamentRegistration.objects.create(
            tournament=self.tournament,
            team_name="Winners",
            player1=profile1,
            player2=profile2,
            contact_phone="1234567890",
            contact_email="winners@example.com",
        )

        # Mock get_organization and get_club methods
        self.user.get_organization = lambda: self.organization
        self.user.get_club = lambda: self.club

    def test_list_prizes(self):
        """Test listing prizes."""
        url = reverse("tournaments:prizes-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "First Place")

    def test_award_prize(self):
        """Test awarding a prize."""
        url = reverse("tournaments:prizes-award", kwargs={"pk": self.prize.id})
        data = {"team_id": str(self.team.id)}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.prize.refresh_from_db()
        self.assertEqual(self.prize.awarded_to, self.team)
        self.assertIsNotNone(self.prize.awarded_at)
