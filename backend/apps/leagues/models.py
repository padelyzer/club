"""
Models for leagues module.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel, MultiTenantModel

User = get_user_model()


class League(MultiTenantModel):
    """
    Main league model for organizing round-robin competitions.
    """

    FORMAT_CHOICES = [
        ("round_robin", "Todos contra Todos"),
        ("round_robin_double", "Doble Rueda"),
        ("group_stage", "Fase de Grupos"),
    ]

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("published", "Publicada"),
        ("registration_open", "Inscripciones Abiertas"),
        ("registration_closed", "Inscripciones Cerradas"),
        ("in_progress", "En Progreso"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
        ("paused", "Pausada"),
    ]

    DIVISION_CHOICES = [
        ("primera", "Primera División"),
        ("segunda", "Segunda División"),
        ("tercera", "Tercera División"),
        ("mixta", "División Mixta"),
        ("open", "Abierta"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField()
    slug = models.SlugField(max_length=200, unique=True)

    # League Configuration
    format = models.CharField(
        max_length=30, choices=FORMAT_CHOICES, default="round_robin"
    )
    division = models.CharField(max_length=20, choices=DIVISION_CHOICES, default="open")

    # Capacity and Participation
    max_teams = models.IntegerField(
        validators=[MinValueValidator(4), MaxValueValidator(32)], default=16
    )
    min_teams = models.IntegerField(
        default=4, validators=[MinValueValidator(2), MaxValueValidator(16)]
    )

    # Registration Settings
    registration_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    requires_payment = models.BooleanField(default=False)
    auto_generate_schedule = models.BooleanField(default=True)

    # Visibility and Access
    is_public = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=False)
    allow_substitutes = models.BooleanField(default=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Organizer Information
    organizer = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="organized_leagues"
    )
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)

    # League Rules and Configuration
    allow_playoffs = models.BooleanField(default=True)
    playoff_teams_count = models.IntegerField(
        default=4, validators=[MinValueValidator(2), MaxValueValidator(8)]
    )
    allow_promotion_relegation = models.BooleanField(default=False)
    promotion_spots = models.IntegerField(
        default=2, validators=[MinValueValidator(1), MaxValueValidator(4)]
    )
    relegation_spots = models.IntegerField(
        default=2, validators=[MinValueValidator(1), MaxValueValidator(4)]
    )

    # Images and Media
    logo_image = models.URLField(blank=True)
    banner_image = models.URLField(blank=True)

    # Metadata
    tags = models.JSONField(default=list, blank=True)
    external_url = models.URLField(blank=True)
    rules_document = models.URLField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["club", "status", "created_at"]),
            models.Index(fields=["division", "status"]),
            models.Index(fields=["organizer", "status"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.division}"

    def clean(self):
        if self.min_teams > self.max_teams:
            raise ValidationError("Min teams cannot be greater than max teams")

        if self.allow_playoffs and self.playoff_teams_count > self.max_teams:
            raise ValidationError("Playoff teams count cannot exceed max teams")

    @property
    def current_season(self):
        """Get the current active season."""
        return self.seasons.filter(status__in=["active", "in_progress"]).first()

    @property
    def current_teams_count(self):
        """Get current number of registered teams."""
        current_season = self.current_season
        if current_season:
            return current_season.teams.filter(status="active").count()
        return 0

    @property
    def can_start_season(self):
        """Check if a new season can start."""
        return (
            self.status == "registration_closed"
            and self.current_teams_count >= self.min_teams
        )


class LeagueSeason(BaseModel):
    """
    Individual season within a league.
    """

    STATUS_CHOICES = [
        ("upcoming", "Próxima"),
        ("active", "Activa"),
        ("in_progress", "En Progreso"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
        ("paused", "Pausada"),
    ]

    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="seasons")

    # Season Information
    name = models.CharField(max_length=200)
    season_number = models.IntegerField(default=1)

    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    registration_start = models.DateTimeField()
    registration_end = models.DateTimeField()

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="upcoming")
    current_matchday = models.IntegerField(default=0)
    total_matchdays = models.IntegerField(default=0)

    # Configuration
    matches_per_team = models.IntegerField(default=0)
    total_matches = models.IntegerField(default=0)

    # Playoff Configuration
    playoff_enabled = models.BooleanField(default=False)
    playoff_start_date = models.DateField(null=True, blank=True)
    playoff_teams = models.IntegerField(
        default=4, validators=[MinValueValidator(2), MaxValueValidator(8)]
    )

    class Meta:
        ordering = ["-season_number"]
        unique_together = ["league", "season_number"]
        indexes = [
            models.Index(fields=["league", "status"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self):
        return f"{self.league.name} - {self.name}"

    def clean(self):
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")

        if self.registration_end > timezone.make_aware(
            timezone.datetime.combine(self.start_date, timezone.datetime.min.time())
        ):
            raise ValidationError("Registration must end before season starts")

        if (
            self.playoff_enabled
            and self.playoff_start_date
            and self.playoff_start_date < self.start_date
        ):
            raise ValidationError(
                "Playoff start date cannot be before season start date"
            )

    @property
    def is_registration_open(self):
        """Check if registration is currently open."""
        now = timezone.now()
        return (
            self.status in ["upcoming", "active"]
            and self.registration_start <= now <= self.registration_end
        )

    @property
    def teams_count(self):
        """Get number of teams in this season."""
        return self.teams.filter(status="active").count()

    def calculate_total_matchdays(self):
        """Calculate total matchdays based on format and teams."""
        teams_count = self.teams_count

        if self.league.format == "round_robin":
            return teams_count - 1
        elif self.league.format == "round_robin_double":
            return (teams_count - 1) * 2
        else:
            return teams_count - 1

    def start_season(self):
        """Start the season and generate fixtures."""
        if self.teams_count < self.league.min_teams:
            raise ValidationError("Not enough teams to start season")

        self.status = "in_progress"
        self.total_matchdays = self.calculate_total_matchdays()
        self.current_matchday = 1

        # Calculate matches per team and total matches
        teams_count = self.teams_count
        if self.league.format == "round_robin":
            self.matches_per_team = teams_count - 1
            self.total_matches = (teams_count * (teams_count - 1)) // 2
        elif self.league.format == "round_robin_double":
            self.matches_per_team = (teams_count - 1) * 2
            self.total_matches = teams_count * (teams_count - 1)

        self.save()

        # Generate fixtures
        self.generate_fixtures()

    def generate_fixtures(self):
        """Generate league fixtures."""
        from .services import LeagueFixtureGenerator

        generator = LeagueFixtureGenerator(self)
        generator.generate()


class LeagueTeam(BaseModel):
    """
    Team/pair participating in a league season.
    """

    STATUS_CHOICES = [
        ("active", "Activo"),
        ("inactive", "Inactivo"),
        ("withdrawn", "Retirado"),
        ("banned", "Sancionado"),
    ]

    season = models.ForeignKey(
        LeagueSeason, on_delete=models.CASCADE, related_name="teams"
    )

    # Team Information
    team_name = models.CharField(max_length=100)

    # Players
    player1 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="league_teams_p1",
    )
    player2 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="league_teams_p2",
    )

    # Substitutes
    substitute1 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.SET_NULL,
        related_name="league_substitutions_s1",
        null=True,
        blank=True,
    )
    substitute2 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.SET_NULL,
        related_name="league_substitutions_s2",
        null=True,
        blank=True,
    )

    # Team Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    # Contact Information
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField()

    # Payment
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pendiente"),
            ("paid", "Pagado"),
            ("refunded", "Reembolsado"),
        ],
        default="pending",
    )
    payment_reference = models.CharField(max_length=100, blank=True)

    # Registration
    registration_date = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_league_teams",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["season", "team_name"]
        unique_together = [
            ["season", "player1", "player2"],
            ["season", "team_name"],
        ]
        indexes = [
            models.Index(fields=["season", "status"]),
            models.Index(fields=["player1", "player2"]),
        ]

    def __str__(self):
        return f"{self.team_name} - {self.season.name}"

    def clean(self):
        if self.player1 == self.player2:
            raise ValidationError("Player 1 and Player 2 cannot be the same")

    @property
    def team_display_name(self):
        """Get display name for the team."""
        if self.team_name:
            return self.team_name
        return (
            f"{self.player1.user.get_full_name()} / {self.player2.user.get_full_name()}"
        )

    @property
    def current_standing(self):
        """Get current standing for this team."""
        return self.standings.filter(season=self.season).first()


class LeagueMatch(BaseModel):
    """
    Individual matches in league play.
    """

    STATUS_CHOICES = [
        ("scheduled", "Programado"),
        ("confirmed", "Confirmado"),
        ("in_progress", "En Progreso"),
        ("completed", "Completado"),
        ("walkover", "Walkover"),
        ("cancelled", "Cancelado"),
        ("postponed", "Pospuesto"),
        ("no_show", "No se presentaron"),
    ]

    season = models.ForeignKey(
        LeagueSeason, on_delete=models.CASCADE, related_name="matches"
    )

    # Match Details
    matchday = models.IntegerField()
    match_number = models.IntegerField()

    # Teams
    home_team = models.ForeignKey(
        LeagueTeam, on_delete=models.CASCADE, related_name="home_matches"
    )
    away_team = models.ForeignKey(
        LeagueTeam, on_delete=models.CASCADE, related_name="away_matches"
    )

    # Scheduling
    scheduled_date = models.DateTimeField()
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.SET_NULL,
        related_name="league_matches",
        null=True,
        blank=True,
    )

    # Status
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="scheduled"
    )

    # Results
    home_score = models.JSONField(
        default=list, help_text="List of set scores for home team"
    )
    away_score = models.JSONField(
        default=list, help_text="List of set scores for away team"
    )
    winner = models.ForeignKey(
        LeagueTeam,
        on_delete=models.SET_NULL,
        related_name="won_league_matches",
        null=True,
        blank=True,
    )

    # Timing
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    # Officials and Confirmation
    confirmed_by_home = models.BooleanField(default=False)
    confirmed_by_away = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)
    walkover_reason = models.TextField(blank=True)

    # Rescheduling
    reschedule_requests = models.IntegerField(default=0)
    original_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["season", "matchday", "match_number"]
        unique_together = ["season", "matchday", "match_number"]
        indexes = [
            models.Index(fields=["season", "status"]),
            models.Index(fields=["scheduled_date", "court"]),
            models.Index(fields=["home_team", "away_team"]),
            models.Index(fields=["matchday"]),
        ]

    def __str__(self):
        return f"J{self.matchday} - {self.home_team.team_display_name} vs {self.away_team.team_display_name}"

    def clean(self):
        if self.home_team == self.away_team:
            raise ValidationError("Home and away teams cannot be the same")

        if self.home_team.season != self.away_team.season:
            raise ValidationError("Both teams must be from the same season")

    @property
    def home_sets_won(self):
        """Get number of sets won by home team."""
        if not self.home_score or not self.away_score:
            return 0

        sets_won = 0
        for home, away in zip(self.home_score, self.away_score):
            if home > away:
                sets_won += 1
        return sets_won

    @property
    def away_sets_won(self):
        """Get number of sets won by away team."""
        if not self.home_score or not self.away_score:
            return 0

        sets_won = 0
        for home, away in zip(self.home_score, self.away_score):
            if away > home:
                sets_won += 1
        return sets_won

    @property
    def is_confirmed(self):
        """Check if match result is confirmed by both teams."""
        return self.confirmed_by_home and self.confirmed_by_away

    def determine_winner(self):
        """Determine match winner based on sets won."""
        home_sets = self.home_sets_won
        away_sets = self.away_sets_won

        if home_sets > away_sets:
            self.winner = self.home_team
        elif away_sets > home_sets:
            self.winner = self.away_team
        else:
            self.winner = None

        if self.winner and self.is_confirmed:
            self.status = "completed"

        self.save()

        # Update standings
        if self.winner:
            self.update_standings()

    def record_set_score(self, home_games, away_games):
        """Record score for a set."""
        if not self.home_score:
            self.home_score = []
        if not self.away_score:
            self.away_score = []

        self.home_score.append(home_games)
        self.away_score.append(away_games)
        self.save()

    def update_standings(self):
        """Update league standings after match completion."""
        if not self.winner or not self.is_confirmed:
            return

        from .services import LeagueStandingsService

        service = LeagueStandingsService(self.season)
        service.update_standings_for_match(self)


class LeagueStanding(BaseModel):
    """
    League standings/table for teams in a season.
    """

    season = models.ForeignKey(
        LeagueSeason, on_delete=models.CASCADE, related_name="standings"
    )
    team = models.ForeignKey(
        LeagueTeam, on_delete=models.CASCADE, related_name="standings"
    )

    # Position
    position = models.IntegerField(default=0)

    # Match Statistics
    matches_played = models.IntegerField(default=0)
    matches_won = models.IntegerField(default=0)
    matches_drawn = models.IntegerField(default=0)
    matches_lost = models.IntegerField(default=0)

    # Set Statistics
    sets_won = models.IntegerField(default=0)
    sets_lost = models.IntegerField(default=0)
    sets_difference = models.IntegerField(default=0)

    # Game Statistics
    games_won = models.IntegerField(default=0)
    games_lost = models.IntegerField(default=0)
    games_difference = models.IntegerField(default=0)

    # Points
    points = models.IntegerField(default=0)

    # Additional Statistics
    home_wins = models.IntegerField(default=0)
    away_wins = models.IntegerField(default=0)
    walkovers_for = models.IntegerField(default=0)
    walkovers_against = models.IntegerField(default=0)

    # Streaks
    current_streak = models.CharField(
        max_length=10, blank=True, help_text="W/L/D streak"
    )
    longest_win_streak = models.IntegerField(default=0)

    # Form (last 5 matches)
    form = models.JSONField(default=list, help_text="Last 5 match results")

    class Meta:
        ordering = ["-points", "-sets_difference", "-games_difference"]
        unique_together = ["season", "team"]
        indexes = [
            models.Index(fields=["season", "position"]),
            models.Index(fields=["season", "-points"]),
        ]

    def __str__(self):
        return f"{self.position}. {self.team.team_display_name} - {self.points} pts"

    @property
    def win_percentage(self):
        """Calculate win percentage."""
        if self.matches_played == 0:
            return 0
        return round((self.matches_won / self.matches_played) * 100, 2)

    def update_form(self, result):
        """Update form with latest match result."""
        if not self.form:
            self.form = []

        self.form.append(result)
        if len(self.form) > 5:
            self.form = self.form[-5:]

        self.save(update_fields=["form"])


class LeagueRules(BaseModel):
    """
    Specific rules and point system for leagues.
    """

    RULE_TYPE_CHOICES = [
        ("scoring", "Puntuación"),
        ("conduct", "Conducta"),
        ("scheduling", "Programación"),
        ("equipment", "Equipamiento"),
        ("substitution", "Sustituciones"),
        ("playoffs", "Playoffs"),
        ("promotion", "Promoción/Descenso"),
        ("general", "General"),
    ]

    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="rules")

    # Rule Information
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    order = models.IntegerField(default=0)

    # Point System
    points_for_win = models.IntegerField(default=3)
    points_for_draw = models.IntegerField(default=1)
    points_for_loss = models.IntegerField(default=0)
    points_for_walkover_win = models.IntegerField(default=3)
    points_for_walkover_loss = models.IntegerField(default=-1)

    # Enforcement
    is_mandatory = models.BooleanField(default=True)
    penalty_points = models.IntegerField(default=0)
    penalty_description = models.TextField(blank=True)

    # Tiebreaker Rules
    tiebreaker_criteria = models.JSONField(
        default=list,
        help_text="List of criteria for breaking ties: head_to_head, set_difference, etc.",
    )

    class Meta:
        ordering = ["league", "rule_type", "order"]
        unique_together = ["league", "rule_type", "order"]

    def __str__(self):
        return f"{self.league.name} - {self.title}"


class LeagueSchedule(BaseModel):
    """
    Schedule configuration for league matches.
    """

    SCHEDULE_TYPE_CHOICES = [
        ("weekly", "Semanal"),
        ("biweekly", "Quincenal"),
        ("custom", "Personalizado"),
    ]

    DAY_CHOICES = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miércoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sábado"),
        (6, "Domingo"),
    ]

    season = models.ForeignKey(
        LeagueSeason, on_delete=models.CASCADE, related_name="schedules"
    )

    # Schedule Configuration
    schedule_type = models.CharField(
        max_length=20, choices=SCHEDULE_TYPE_CHOICES, default="weekly"
    )

    # Time Slots
    preferred_days = models.JSONField(
        default=list, help_text="List of preferred days (0=Monday, 6=Sunday)"
    )
    start_time = models.TimeField()
    end_time = models.TimeField()

    # Court Preferences
    preferred_courts = models.ManyToManyField(
        "clubs.Court", blank=True, related_name="league_schedules"
    )

    # Constraints
    max_matches_per_day = models.IntegerField(default=4)
    min_rest_days = models.IntegerField(
        default=3, help_text="Minimum days between team matches"
    )

    # Automatic Scheduling
    auto_schedule = models.BooleanField(default=True)
    allow_reschedule = models.BooleanField(default=True)
    reschedule_deadline_hours = models.IntegerField(default=24)

    # Holiday Configuration
    exclude_holidays = models.BooleanField(default=True)
    custom_excluded_dates = models.JSONField(
        default=list, help_text="List of excluded dates in YYYY-MM-DD format"
    )

    class Meta:
        ordering = ["season", "start_time"]
        indexes = [
            models.Index(fields=["season", "auto_schedule"]),
        ]

    def __str__(self):
        return f"{self.season.name} - {self.get_schedule_type_display()}"

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")

    @property
    def duration_hours(self):
        """Calculate duration in hours."""
        from datetime import datetime, timedelta

        start = datetime.combine(datetime.today(), self.start_time)
        end = datetime.combine(datetime.today(), self.end_time)
        duration = end - start
        return duration.total_seconds() / 3600

    def is_day_available(self, date):
        """Check if a specific date is available for scheduling."""
        # Check if it's a preferred day
        if self.preferred_days and date.weekday() not in self.preferred_days:
            return False

        # Check excluded dates
        if self.exclude_holidays:
            # Add holiday checking logic here
            pass

        if self.custom_excluded_dates:
            date_str = date.strftime("%Y-%m-%d")
            if date_str in self.custom_excluded_dates:
                return False

        return True
