"""
Models for tournaments module.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel, MultiTenantModel
from apps.leagues.models import League

User = get_user_model()


class TournamentCategory(BaseModel):
    """
    Tournament categories for organizing players by skill/age/gender.
    """

    CATEGORY_TYPE_CHOICES = [
        ("level", "Por Nivel"),
        ("age", "Por Edad"),
        ("gender", "Por Género"),
        ("mixed", "Mixta"),
        ("open", "Abierta"),
    ]

    GENDER_CHOICES = [
        ("male", "Masculino"),
        ("female", "Femenino"),
        ("mixed", "Mixto"),
        ("any", "Cualquiera"),
    ]

    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES)
    description = models.TextField(blank=True)

    # Age restrictions
    min_age = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(5), MaxValueValidator(80)]
    )
    max_age = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(5), MaxValueValidator(80)]
    )

    # Level restrictions
    min_level = models.ForeignKey(
        "clients.PlayerLevel",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tournament_categories_min",
    )
    max_level = models.ForeignKey(
        "clients.PlayerLevel",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tournament_categories_max",
    )

    # Gender restrictions
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="any")

    # Display
    color = models.CharField(max_length=7, default="#3498db")
    icon = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Tournament Category"
        verbose_name_plural = "Tournament Categories"

    def __str__(self):
        return self.name

    def clean(self):
        if self.min_age and self.max_age and self.min_age > self.max_age:
            raise ValidationError("Min age cannot be greater than max age")

    def is_player_eligible(self, player_profile):
        """Check if a player is eligible for this category."""
        # Check age
        if self.min_age or self.max_age:
            if not player_profile.birth_date:
                return False
            age = (timezone.now().date() - player_profile.birth_date).days // 365
            if self.min_age and age < self.min_age:
                return False
            if self.max_age and age > self.max_age:
                return False

        # Check level
        if self.min_level and player_profile.level:
            if player_profile.level.min_rating < self.min_level.min_rating:
                return False
        if self.max_level and player_profile.level:
            if player_profile.level.max_rating > self.max_level.max_rating:
                return False

        # Check gender
        if self.gender != "any":
            user_gender = getattr(player_profile.user, "gender", None)
            if self.gender == "mixed":
                return True  # Mixed allows any gender
            elif self.gender != user_gender:
                return False

        return True


class Tournament(MultiTenantModel):
    """
    Main tournament model.
    """

    FORMAT_CHOICES = [
        ("elimination", "Eliminación"),
        ("round_robin", "Todos contra Todos"),
        ("swiss", "Sistema Suizo"),
        ("double_elimination", "Doble Eliminación"),
    ]

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("published", "Publicado"),
        ("registration_open", "Inscripciones Abiertas"),
        ("registration_closed", "Inscripciones Cerradas"),
        ("in_progress", "En Progreso"),
        ("completed", "Completado"),
        ("cancelled", "Cancelado"),
    ]

    VISIBILITY_CHOICES = [
        ("public", "Público"),
        ("private", "Privado"),
        ("members_only", "Solo Miembros"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField()
    slug = models.SlugField(max_length=200, unique=True)

    # Tournament Configuration
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES)
    category = models.ForeignKey(
        TournamentCategory, on_delete=models.PROTECT, related_name="tournaments"
    )

    # Dates and Times
    start_date = models.DateField()
    end_date = models.DateField()
    registration_start = models.DateTimeField()
    registration_end = models.DateTimeField()

    # Capacity
    max_teams = models.IntegerField(
        validators=[MinValueValidator(4), MaxValueValidator(256)]
    )
    min_teams = models.IntegerField(
        default=4, validators=[MinValueValidator(2), MaxValueValidator(64)]
    )

    # Registration Settings
    registration_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    requires_payment = models.BooleanField(default=False)
    allow_substitutes = models.BooleanField(default=True)
    max_substitutes_per_team = models.IntegerField(default=1)

    # Visibility and Access
    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default="public"
    )
    requires_approval = models.BooleanField(default=False)

    # Status and Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    current_round = models.IntegerField(default=0)
    total_rounds = models.IntegerField(default=0)

    # Organizer Information
    organizer = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="organized_tournaments"
    )
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)

    # Tournament Rules
    rules = models.TextField(blank=True)
    match_format = models.CharField(
        max_length=50,
        default="best_of_3",
        help_text="Format for matches (e.g., best_of_3, best_of_5)",
    )

    # Images and Media
    banner_image = models.URLField(blank=True)
    logo_image = models.URLField(blank=True)

    # Metadata
    tags = models.JSONField(default=list, blank=True)
    external_url = models.URLField(blank=True)

    class Meta:
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["club", "status", "start_date"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["organizer", "status"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.start_date}"

    def clean(self):
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")
        if self.registration_end > timezone.make_aware(
            timezone.datetime.combine(self.start_date, timezone.datetime.min.time())
        ):
            raise ValidationError("Registration must end before tournament starts")
        if self.min_teams > self.max_teams:
            raise ValidationError("Min teams cannot be greater than max teams")

    @property
    def is_registration_open(self):
        """Check if registration is currently open."""
        now = timezone.now()
        return (
            self.status in ["published", "registration_open"]
            and self.registration_start <= now <= self.registration_end
        )

    @property
    def current_teams_count(self):
        """Get current number of registered teams."""
        return self.registrations.filter(status="confirmed").count()

    @property
    def is_full(self):
        """Check if tournament is at capacity."""
        return self.current_teams_count >= self.max_teams

    @property
    def can_start(self):
        """Check if tournament can start."""
        return (
            self.status == "registration_closed"
            and self.current_teams_count >= self.min_teams
        )

    def calculate_total_rounds(self):
        """Calculate total rounds based on format and teams."""
        teams_count = self.current_teams_count

        if self.format == "elimination":
            import math

            return math.ceil(math.log2(teams_count))
        elif self.format == "double_elimination":
            import math

            return (math.ceil(math.log2(teams_count)) * 2) - 1
        elif self.format == "round_robin":
            return teams_count - 1
        elif self.format == "swiss":
            import math

            return math.ceil(math.log2(teams_count))

        return 0

    def start_tournament(self):
        """Start the tournament and generate initial bracket."""
        if not self.can_start:
            raise ValidationError("Tournament cannot start yet")

        self.status = "in_progress"
        self.total_rounds = self.calculate_total_rounds()
        self.current_round = 1
        self.save()

        # Generate bracket
        self.generate_bracket()

    def generate_bracket(self):
        """Generate tournament bracket based on format."""
        from .services import TournamentBracketGenerator

        generator = TournamentBracketGenerator(self)
        generator.generate()


class TournamentRegistration(BaseModel):
    """
    Team registration for tournaments.
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("confirmed", "Confirmada"),
        ("waitlist", "Lista de Espera"),
        ("rejected", "Rechazada"),
        ("cancelled", "Cancelada"),
    ]

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="registrations"
    )

    # Team Information
    team_name = models.CharField(max_length=100)

    # Players
    player1 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="tournament_registrations_p1",
    )
    player2 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="tournament_registrations_p2",
    )

    # Substitutes
    substitute1 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="tournament_substitutions_s1",
        null=True,
        blank=True,
    )
    substitute2 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="tournament_substitutions_s2",
        null=True,
        blank=True,
    )

    # Registration Details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    seed = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

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

    # Contact
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField()

    class Meta:
        ordering = ["tournament", "created_at"]
        unique_together = [
            ["tournament", "player1", "player2"],
            ["tournament", "team_name"],
        ]
        indexes = [
            models.Index(fields=["tournament", "status"]),
            models.Index(fields=["player1", "tournament"]),
            models.Index(fields=["player2", "tournament"]),
        ]

    def __str__(self):
        return f"{self.team_name} - {self.tournament.name}"

    def clean(self):
        if self.player1 == self.player2:
            raise ValidationError("Player 1 and Player 2 cannot be the same")

        # Check if players are eligible for tournament category
        if not self.tournament.category.is_player_eligible(self.player1):
            raise ValidationError(f"{self.player1} is not eligible for this category")
        if not self.tournament.category.is_player_eligible(self.player2):
            raise ValidationError(f"{self.player2} is not eligible for this category")

    @property
    def team_display_name(self):
        """Get display name for the team."""
        if self.team_name:
            return self.team_name
        return (
            f"{self.player1.user.get_full_name()} / {self.player2.user.get_full_name()}"
        )

    def confirm_registration(self):
        """Confirm the registration."""
        if self.status == "pending":
            if self.tournament.is_full:
                self.status = "waitlist"
            else:
                self.status = "confirmed"
            self.save()


class TournamentBracket(BaseModel):
    """
    Tournament bracket structure.
    """

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="brackets"
    )

    # Bracket Information
    round_number = models.IntegerField()
    position = models.IntegerField()

    # Teams/Players
    team1 = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.CASCADE,
        related_name="bracket_team1",
        null=True,
        blank=True,
    )
    team2 = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.CASCADE,
        related_name="bracket_team2",
        null=True,
        blank=True,
    )

    # Winner advances to
    advances_to = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="previous_matches",
    )

    # Match reference
    match = models.OneToOneField(
        "Match",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bracket_position",
    )

    # For losers bracket (double elimination)
    is_losers_bracket = models.BooleanField(default=False)

    class Meta:
        ordering = ["tournament", "round_number", "position"]
        unique_together = [
            "tournament",
            "round_number",
            "position",
            "is_losers_bracket",
        ]
        indexes = [
            models.Index(fields=["tournament", "round_number"]),
        ]

    def __str__(self):
        bracket_type = "Losers" if self.is_losers_bracket else "Winners"
        return f"{self.tournament.name} - R{self.round_number} P{self.position} ({bracket_type})"


class Match(MultiTenantModel):
    """
    Individual matches in tournaments.
    """

    STATUS_CHOICES = [
        ("scheduled", "Programado"),
        ("in_progress", "En Progreso"),
        ("completed", "Completado"),
        ("walkover", "Walkover"),
        ("cancelled", "Cancelado"),
        ("postponed", "Pospuesto"),
    ]

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="tournament_matches"
    )

    # Match Details
    round_number = models.IntegerField()
    match_number = models.IntegerField()

    # Teams
    team1 = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.CASCADE,
        related_name="matches_as_team1",
    )
    team2 = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.CASCADE,
        related_name="matches_as_team2",
    )

    # Scheduling
    scheduled_date = models.DateTimeField()
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.PROTECT,
        related_name="tournament_court_matches",
        null=True,
        blank=True,
    )

    # Status
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="scheduled"
    )

    # Results
    team1_score = models.JSONField(
        default=list, help_text="List of set scores for team1"
    )
    team2_score = models.JSONField(
        default=list, help_text="List of set scores for team2"
    )
    winner = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.CASCADE,
        related_name="won_matches",
        null=True,
        blank=True,
    )

    # Timing
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    # Officials
    referee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refereed_matches",
    )

    # Notes
    notes = models.TextField(blank=True)
    walkover_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["tournament", "round_number", "match_number"]
        unique_together = ["tournament", "round_number", "match_number"]
        indexes = [
            models.Index(fields=["tournament", "status"]),
            models.Index(fields=["scheduled_date", "court"]),
            models.Index(fields=["team1", "team2"]),
        ]

    def __str__(self):
        return f"{self.tournament.name} - R{self.round_number}M{self.match_number}: {self.team1.team_display_name} vs {self.team2.team_display_name}"

    def clean(self):
        if self.team1 == self.team2:
            raise ValidationError("Teams cannot be the same")

    @property
    def team1_sets_won(self):
        """Get number of sets won by team1."""
        if not self.team1_score or not self.team2_score:
            return 0

        sets_won = 0
        for i, (score1, score2) in enumerate(zip(self.team1_score, self.team2_score)):
            if score1 > score2:
                sets_won += 1
        return sets_won

    @property
    def team2_sets_won(self):
        """Get number of sets won by team2."""
        if not self.team1_score or not self.team2_score:
            return 0

        sets_won = 0
        for i, (score1, score2) in enumerate(zip(self.team1_score, self.team2_score)):
            if score2 > score1:
                sets_won += 1
        return sets_won

    def determine_winner(self):
        """Determine match winner based on sets won."""
        team1_sets = self.team1_sets_won
        team2_sets = self.team2_sets_won

        if team1_sets > team2_sets:
            self.winner = self.team1
        elif team2_sets > team1_sets:
            self.winner = self.team2
        else:
            self.winner = None

        if self.winner:
            self.status = "completed"

        self.save()

    def record_set_score(self, team1_games, team2_games):
        """Record score for a set."""
        if not self.team1_score:
            self.team1_score = []
        if not self.team2_score:
            self.team2_score = []

        self.team1_score.append(team1_games)
        self.team2_score.append(team2_games)
        self.save()

        # Check if match is complete
        format_sets = 3 if self.tournament.match_format == "best_of_3" else 5
        if (
            len(self.team1_score) >= format_sets
            or max(self.team1_sets_won, self.team2_sets_won) > format_sets // 2
        ):
            self.determine_winner()


class Prize(BaseModel):
    """
    Prize structure for tournaments.
    """

    PRIZE_TYPE_CHOICES = [
        ("cash", "Efectivo"),
        ("trophy", "Trofeo"),
        ("medal", "Medalla"),
        ("merchandise", "Mercancía"),
        ("points", "Puntos"),
        ("other", "Otro"),
    ]

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="prizes"
    )

    # Prize Details
    position = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    prize_type = models.CharField(max_length=20, choices=PRIZE_TYPE_CHOICES)

    # Value
    cash_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    points_value = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(0)]
    )

    # Winners
    awarded_to = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes_won",
    )
    awarded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["tournament", "position"]
        unique_together = ["tournament", "position"]

    def __str__(self):
        return f"{self.tournament.name} - {self.position}° lugar: {self.name}"

    def award_to_team(self, team):
        """Award prize to a team."""
        self.awarded_to = team
        self.awarded_at = timezone.now()
        self.save()


class TournamentRules(BaseModel):
    """
    Specific rules for tournaments.
    """

    RULE_TYPE_CHOICES = [
        ("scoring", "Puntuación"),
        ("format", "Formato"),
        ("conduct", "Conducta"),
        ("equipment", "Equipamiento"),
        ("time", "Tiempo"),
        ("other", "Otro"),
    ]

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="tournament_rules"
    )

    # Rule Details
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    order = models.IntegerField(default=0)

    # Enforcement
    is_mandatory = models.BooleanField(default=True)
    penalty_description = models.TextField(blank=True)

    class Meta:
        ordering = ["tournament", "rule_type", "order"]

    def __str__(self):
        return f"{self.tournament.name} - {self.title}"


class TournamentStats(BaseModel):
    """
    Tournament statistics and analytics.
    """

    tournament = models.OneToOneField(
        Tournament, on_delete=models.CASCADE, related_name="stats"
    )

    # Participation Stats
    total_registrations = models.IntegerField(default=0)
    confirmed_teams = models.IntegerField(default=0)
    waitlist_teams = models.IntegerField(default=0)
    cancelled_registrations = models.IntegerField(default=0)

    # Match Stats
    total_matches = models.IntegerField(default=0)
    completed_matches = models.IntegerField(default=0)
    walkover_matches = models.IntegerField(default=0)
    cancelled_matches = models.IntegerField(default=0)

    # Time Stats
    average_match_duration = models.IntegerField(
        default=0, help_text="Average match duration in minutes"
    )
    total_play_time = models.IntegerField(
        default=0, help_text="Total play time in minutes"
    )

    # Revenue Stats
    total_registration_fees = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    total_prize_money = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Tournament Statistics"
        verbose_name_plural = "Tournament Statistics"

    def __str__(self):
        return f"Stats for {self.tournament.name}"

    def update_stats(self):
        """Update all tournament statistics."""
        # Registration stats
        registrations = self.tournament.registrations.all()
        self.total_registrations = registrations.count()
        self.confirmed_teams = registrations.filter(status="confirmed").count()
        self.waitlist_teams = registrations.filter(status="waitlist").count()
        self.cancelled_registrations = registrations.filter(status="cancelled").count()

        # Match stats
        matches = self.tournament.matches.all()
        self.total_matches = matches.count()
        self.completed_matches = matches.filter(status="completed").count()
        self.walkover_matches = matches.filter(status="walkover").count()
        self.cancelled_matches = matches.filter(status="cancelled").count()

        # Time stats
        completed_matches_with_duration = matches.filter(
            status="completed", duration_minutes__isnull=False
        )
        if completed_matches_with_duration.exists():
            self.average_match_duration = (
                completed_matches_with_duration.aggregate(
                    avg_duration=models.Avg("duration_minutes")
                )["avg_duration"]
                or 0
            )
            self.total_play_time = (
                completed_matches_with_duration.aggregate(
                    total_duration=models.Sum("duration_minutes")
                )["total_duration"]
                or 0
            )

        # Revenue stats
        self.total_registration_fees = registrations.filter(
            status__in=["confirmed", "waitlist"], payment_status="paid"
        ).aggregate(total=models.Sum("tournament__registration_fee"))[
            "total"
        ] or Decimal(
            "0.00"
        )

        self.total_prize_money = self.tournament.prizes.aggregate(
            total=models.Sum("cash_value")
        )["total"] or Decimal("0.00")

        self.save()


class Bracket(BaseModel):
    """
    Tournament bracket structure for tracking tournament progression.
    Supports multiple tournament formats and maintains the bracket tree.
    """
    
    BRACKET_FORMAT_CHOICES = [
        ("single_elimination", "Single Elimination"),
        ("double_elimination", "Double Elimination"),
        ("round_robin", "Round Robin"),
        ("swiss", "Swiss System"),
        ("hybrid", "Hybrid (Groups + Knockout)"),
    ]
    
    tournament = models.OneToOneField(
        Tournament, on_delete=models.CASCADE, related_name="bracket_structure"
    )
    format = models.CharField(max_length=20, choices=BRACKET_FORMAT_CHOICES)
    size = models.IntegerField(
        help_text="Number of participants (teams/players)",
        validators=[MinValueValidator(2), MaxValueValidator(256)]
    )
    current_round = models.IntegerField(default=1)
    
    # Seeding configuration
    seeding_method = models.CharField(
        max_length=20,
        choices=[
            ("elo", "ELO Rating"),
            ("manual", "Manual Seeding"),
            ("random", "Random"),
            ("geographic", "Geographic Distribution"),
        ],
        default="elo"
    )
    
    # Bracket state
    is_finalized = models.BooleanField(default=False)
    bracket_data = models.JSONField(
        default=dict,
        help_text="Serialized bracket structure for visualization"
    )
    
    class Meta:
        ordering = ["-tournament__start_date"]
        indexes = [
            models.Index(fields=["tournament", "current_round"]),
        ]
    
    def __str__(self):
        return f"{self.tournament.name} - {self.get_format_display()}"


class BracketNode(BaseModel):
    """
    Individual node in the tournament bracket tree.
    Represents a match position in the bracket structure.
    """
    
    bracket = models.ForeignKey(
        Bracket, on_delete=models.CASCADE, related_name="nodes"
    )
    
    # Position in bracket
    position = models.IntegerField(
        help_text="Position identifier within the round"
    )
    round = models.IntegerField(
        help_text="Round number (1 = first round, increasing)"
    )
    
    # Match association
    match = models.OneToOneField(
        Match,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bracket_node"
    )
    
    # Parent nodes (where winners come from)
    parent_node_1 = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_nodes_1"
    )
    parent_node_2 = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_nodes_2"
    )
    
    # For double elimination
    is_losers_bracket = models.BooleanField(default=False)
    
    # Bye handling
    has_bye = models.BooleanField(default=False)
    bye_team = models.ForeignKey(
        TournamentRegistration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bye_nodes"
    )
    
    class Meta:
        ordering = ["bracket", "round", "position"]
        unique_together = ["bracket", "round", "position", "is_losers_bracket"]
        indexes = [
            models.Index(fields=["bracket", "round"]),
            models.Index(fields=["match"]),
        ]
    
    def __str__(self):
        bracket_type = "Losers" if self.is_losers_bracket else "Winners"
        return f"{self.bracket} - R{self.round} P{self.position} ({bracket_type})"


class MatchSchedule(BaseModel):
    """
    Schedule information for tournament matches.
    Handles court assignments and time slot optimization.
    """
    
    SCHEDULE_STATUS_CHOICES = [
        ("tentative", "Tentative"),
        ("confirmed", "Confirmed"),
        ("conflict", "Has Conflict"),
        ("rescheduled", "Rescheduled"),
    ]
    
    match = models.OneToOneField(
        Match, on_delete=models.CASCADE, related_name="schedule"
    )
    
    # Court assignment
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_matches"
    )
    
    # Timing
    datetime = models.DateTimeField()
    duration_minutes = models.IntegerField(
        default=90,
        help_text="Expected match duration in minutes"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=SCHEDULE_STATUS_CHOICES,
        default="tentative"
    )
    
    # Optimization metadata
    priority = models.IntegerField(
        default=0,
        help_text="Higher priority matches get better time slots"
    )
    constraints = models.JSONField(
        default=list,
        help_text="Scheduling constraints (player availability, etc.)"
    )
    
    # Conflict tracking
    has_conflict = models.BooleanField(default=False)
    conflict_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ["datetime", "court"]
        indexes = [
            models.Index(fields=["datetime", "court"]),
            models.Index(fields=["match", "status"]),
            models.Index(fields=["court", "datetime"]),
        ]
    
    def __str__(self):
        return f"{self.match} - {self.datetime} at {self.court}"
    
    def check_conflicts(self):
        """Check for scheduling conflicts."""
        # Check court availability
        overlapping = MatchSchedule.objects.filter(
            court=self.court,
            status__in=["confirmed", "tentative"]
        ).exclude(pk=self.pk)
        
        # Check time overlap
        for schedule in overlapping:
            if (self.datetime <= schedule.datetime < self.datetime + timezone.timedelta(minutes=self.duration_minutes) or
                schedule.datetime <= self.datetime < schedule.datetime + timezone.timedelta(minutes=schedule.duration_minutes)):
                self.has_conflict = True
                self.conflict_reason = f"Court conflict with {schedule.match}"
                return False
        
        self.has_conflict = False
        self.conflict_reason = ""
        return True


