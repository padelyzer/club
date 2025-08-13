"""
Tests for leagues module.
"""

from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.clubs.models import Club
from apps.root.models import Organization

from .models import League, LeagueMatch, LeagueSeason, LeagueStanding, LeagueTeam
from .services import LeagueFixtureGenerator, LeagueStandingsService

User = get_user_model()


class LeagueModelTestCase(TestCase):
    """Test cases for League model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org"
        )

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            email="club@example.com",
            phone="1234567890",
        )

        self.user.organization = self.organization
        self.user.save()

    def test_league_creation(self):
        """Test creating a league."""
        league = League.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test League",
            description="Test Description",
            organizer=self.user,
            contact_email="organizer@example.com",
        )

        self.assertEqual(league.name, "Test League")
        self.assertEqual(league.status, "draft")
        self.assertEqual(league.organizer, self.user)
        self.assertTrue(league.slug)

    def test_league_team_count(self):
        """Test league team count property."""
        league = League.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test League",
            description="Test Description",
            organizer=self.user,
            contact_email="organizer@example.com",
        )

        season = LeagueSeason.objects.create(
            league=league,
            name="Test Season",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=30),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=7),
            status="active",
        )

        self.assertEqual(league.current_teams_count, 0)

        # Create some teams would require ClientProfile setup
        # This is a basic structure test


class LeagueSeasonTestCase(TestCase):
    """Test cases for LeagueSeason model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org"
        )

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            email="club@example.com",
            phone="1234567890",
        )

        self.user.organization = self.organization
        self.user.save()

        self.league = League.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test League",
            description="Test Description",
            organizer=self.user,
            contact_email="organizer@example.com",
        )

    def test_season_creation(self):
        """Test creating a league season."""
        season = LeagueSeason.objects.create(
            league=self.league,
            name="Test Season 2024",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=30),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=7),
        )

        self.assertEqual(season.name, "Test Season 2024")
        self.assertEqual(season.season_number, 1)
        self.assertEqual(season.status, "upcoming")

    def test_registration_open_property(self):
        """Test is_registration_open property."""
        # Registration not started
        season = LeagueSeason.objects.create(
            league=self.league,
            name="Future Season",
            start_date=timezone.now().date() + timedelta(days=30),
            end_date=timezone.now().date() + timedelta(days=60),
            registration_start=timezone.now() + timedelta(days=10),
            registration_end=timezone.now() + timedelta(days=20),
            status="upcoming",
        )

        self.assertFalse(season.is_registration_open)

        # Registration open
        season.registration_start = timezone.now() - timedelta(days=1)
        season.registration_end = timezone.now() + timedelta(days=1)
        season.status = "active"
        season.save()

        self.assertTrue(season.is_registration_open)


class LeagueServiceTestCase(TestCase):
    """Test cases for League services."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org"
        )

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            email="club@example.com",
            phone="1234567890",
        )

        self.user.organization = self.organization
        self.user.save()

        self.league = League.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test League",
            description="Test Description",
            organizer=self.user,
            contact_email="organizer@example.com",
        )

        self.season = LeagueSeason.objects.create(
            league=self.league,
            name="Test Season",
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=30),
            registration_start=timezone.now(),
            registration_end=timezone.now() + timedelta(days=7),
            status="active",
        )

    def test_fixture_generator_initialization(self):
        """Test fixture generator initialization."""
        generator = LeagueFixtureGenerator(self.season)

        self.assertEqual(generator.season, self.season)
        self.assertEqual(generator.league, self.league)
        self.assertEqual(generator.teams_count, 0)  # No teams yet

    def test_standings_service_initialization(self):
        """Test standings service initialization."""
        service = LeagueStandingsService(self.season)

        self.assertEqual(service.season, self.season)
        self.assertEqual(service.league, self.league)


# Additional tests would require more complex setup with ClientProfile, Courts, etc.
# This provides a basic testing structure for the leagues module.
