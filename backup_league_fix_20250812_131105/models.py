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
        Tournament, on_delete=models.CASCADE, related_name="matches"
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
        related_name="tournament_matches",
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


# League Models for Scheduling Engine
class League(MultiTenantModel):
    """
    League model for organizing recurring matches between teams/players.
    """
    
    FORMAT_CHOICES = [
        ("round_robin", "Round Robin"),
        ("double_round_robin", "Double Round Robin"),
        ("multi_division", "Multi-Division"),
        ("promotion_relegation", "Promotion/Relegation"),
    ]
    
    FREQUENCY_CHOICES = [
        ("weekly", "Weekly"),
        ("biweekly", "Bi-weekly"),
        ("monthly", "Monthly"),
        ("custom", "Custom"),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # League Configuration
    format = models.CharField(max_length=25, choices=FORMAT_CHOICES)
    divisions = models.IntegerField(default=1)
    matches_per_pair = models.IntegerField(
        default=1,
        help_text="Number of matches between each pair of teams"
    )
    
    # Scheduling Settings
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Time preferences
    preferred_start_hour = models.TimeField(default="19:00")
    preferred_end_hour = models.TimeField(default="22:00")
    weekend_play = models.BooleanField(default=True)
    weekday_play = models.BooleanField(default=True)
    
    # Competition settings
    home_away = models.BooleanField(
        default=True,
        help_text="Whether to have home/away matches"
    )
    max_travel_distance = models.IntegerField(
        default=50,
        help_text="Maximum travel distance in kilometers"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    registration_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=0
    )
    
    class Meta:
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["club", "is_active"]),
            models.Index(fields=["start_date", "end_date"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_format_display()})"


class LeagueSchedule(BaseModel):
    """
    Generated schedule for a league.
    """
    
    SCHEDULE_STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    ]
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="schedules"
    )
    round_number = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Optimization metadata
    generation_timestamp = models.DateTimeField(auto_now_add=True)
    algorithm_used = models.CharField(max_length=50, default="genetic_algorithm")
    quality_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Schedule quality score (0-100)"
    )
    
    # Schedule data
    schedule_data = models.JSONField(
        default=dict,
        help_text="Complete schedule data with optimization metadata"
    )
    
    status = models.CharField(
        max_length=20,
        choices=SCHEDULE_STATUS_CHOICES,
        default="draft"
    )
    
    class Meta:
        ordering = ["league", "round_number"]
        unique_together = ["league", "round_number"]
        indexes = [
            models.Index(fields=["league", "status"]),
            models.Index(fields=["start_date", "end_date"]),
        ]
    
    def __str__(self):
        return f"{self.league.name} - Round {self.round_number}"


class ScheduleConstraint(BaseModel):
    """
    Scheduling constraints for league optimization.
    """
    
    CONSTRAINT_TYPE_CHOICES = [
        ("court_availability", "Court Availability"),
        ("player_availability", "Player Availability"),
        ("travel_distance", "Travel Distance"),
        ("rest_period", "Rest Period Between Matches"),
        ("venue_preference", "Venue Preference"),
        ("time_preference", "Time Preference"),
        ("weather_restriction", "Weather Restriction"),
        ("blackout_dates", "Blackout Dates"),
    ]
    
    PRIORITY_CHOICES = [
        (1, "Critical - Must satisfy"),
        (2, "High - Strongly preferred"),
        (3, "Medium - Preferred"),
        (4, "Low - Nice to have"),
    ]
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="constraints"
    )
    constraint_type = models.CharField(
        max_length=25, choices=CONSTRAINT_TYPE_CHOICES
    )
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    
    # Constraint parameters (flexible JSON structure)
    parameters = models.JSONField(
        default=dict,
        help_text="Constraint-specific parameters"
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ["league", "priority", "constraint_type"]
        indexes = [
            models.Index(fields=["league", "is_active"]),
        ]
    
    def __str__(self):
        return f"{self.league.name} - {self.get_constraint_type_display()}"


class LeagueTeam(BaseModel):
    """
    Team registration for a league.
    """
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="teams"
    )
    
    # Team details
    name = models.CharField(max_length=100)
    player1 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="league_teams_p1"
    )
    player2 = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="league_teams_p2"
    )
    
    # League-specific data
    division = models.IntegerField(default=1)
    home_venue = models.ForeignKey(
        "clubs.Club",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_teams"
    )
    
    # Geographic info for optimization
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    
    # Availability preferences
    availability_preferences = models.JSONField(
        default=dict,
        help_text="Team availability preferences"
    )
    
    # Performance tracking
    current_points = models.IntegerField(default=0)
    matches_played = models.IntegerField(default=0)
    matches_won = models.IntegerField(default=0)
    
    class Meta:
        ordering = ["league", "division", "name"]
        unique_together = ["league", "name"]
        indexes = [
            models.Index(fields=["league", "division"]),
            models.Index(fields=["player1", "league"]),
            models.Index(fields=["player2", "league"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.league.name})"


class LeagueMatch(MultiTenantModel):
    """
    Individual match in a league.
    """
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="matches"
    )
    
    # Match details
    round_number = models.IntegerField()
    match_number = models.IntegerField()
    
    home_team = models.ForeignKey(
        LeagueTeam,
        on_delete=models.CASCADE,
        related_name="home_matches"
    )
    away_team = models.ForeignKey(
        LeagueTeam,
        on_delete=models.CASCADE,
        related_name="away_matches"
    )
    
    # Scheduling (can be null during optimization)
    scheduled_datetime = models.DateTimeField(null=True, blank=True)
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="league_matches"
    )
    
    # Match results
    status = models.CharField(
        max_length=20,
        choices=Match.STATUS_CHOICES,
        default="scheduled"
    )
    home_score = models.JSONField(default=list)
    away_score = models.JSONField(default=list)
    winner = models.ForeignKey(
        LeagueTeam,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_league_matches"
    )
    
    # Optimization metadata
    travel_distance = models.FloatField(
        null=True,
        blank=True,
        help_text="Travel distance for away team (km)"
    )
    scheduling_priority = models.IntegerField(
        default=0,
        help_text="Higher values get priority in scheduling"
    )
    
    class Meta:
        ordering = ["league", "round_number", "match_number"]
        unique_together = ["league", "round_number", "match_number"]
        indexes = [
            models.Index(fields=["league", "status"]),
            models.Index(fields=["scheduled_datetime", "court"]),
            models.Index(fields=["home_team", "away_team"]),
        ]
    
    def __str__(self):
        return f"{self.league.name} R{self.round_number}M{self.match_number}: {self.home_team.name} vs {self.away_team.name}"


class ScheduleOptimization(BaseModel):
    """
    Track optimization runs and their results.
    """
    
    ALGORITHM_CHOICES = [
        ("genetic", "Genetic Algorithm"),
        ("constraint_solver", "OR-Tools Constraint Solver"),
        ("simulated_annealing", "Simulated Annealing"),
        ("hybrid", "Hybrid Approach"),
    ]
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="optimizations"
    )
    
    # Optimization run metadata
    algorithm = models.CharField(max_length=20, choices=ALGORITHM_CHOICES)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    # Results
    quality_score = models.FloatField(
        null=True,
        help_text="Overall schedule quality score (0-100)"
    )
    travel_burden_score = models.FloatField(null=True, blank=True)
    time_slot_utilization = models.FloatField(null=True, blank=True)
    fairness_index = models.FloatField(null=True, blank=True)
    conflict_count = models.IntegerField(default=0)
    
    # Optimization parameters
    parameters = models.JSONField(
        default=dict,
        help_text="Algorithm-specific parameters used"
    )
    
    # Results metadata
    results_data = models.JSONField(
        default=dict,
        help_text="Detailed optimization results and metrics"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ("running", "Running"),
            ("completed", "Completed"),
            ("failed", "Failed"),
            ("cancelled", "Cancelled"),
        ],
        default="running"
    )
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ["-start_time"]
        indexes = [
            models.Index(fields=["league", "status"]),
            models.Index(fields=["start_time"]),
        ]
    
    def __str__(self):
        return f"{self.league.name} - {self.algorithm} ({self.start_time})"


# League Scheduling Models

class Season(BaseModel):
    """
    Represents a season that can contain multiple leagues.
    """
    name = models.CharField(max_length=100)
    year = models.IntegerField(
        validators=[MinValueValidator(2023), MaxValueValidator(2030)]
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["-year", "-start_date"]
        unique_together = ["name", "year"]
    
    def __str__(self):
        return f"{self.name} {self.year}"
    
    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("Start date must be before end date")


class League(MultiTenantModel):
    """
    League model for organizing multiple teams/players in a structured competition.
    """
    
    FORMAT_CHOICES = [
        ("round_robin", "Round Robin"),
        ("multi_division", "Multi Division"),
        ("swiss", "Swiss System"),
        ("hybrid", "Hybrid (Groups + Playoffs)"),
    ]
    
    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("registration_open", "Registration Open"),
        ("registration_closed", "Registration Closed"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]
    
    # Basic information
    name = models.CharField(max_length=200)
    description = models.TextField()
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="leagues")
    
    # League configuration
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="round_robin")
    divisions = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    matches_per_pair = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Number of matches each pair of teams plays"
    )
    
    # Scheduling preferences
    match_frequency = models.CharField(
        max_length=20,
        choices=[
            ("weekly", "Weekly"),
            ("biweekly", "Bi-weekly"),
            ("monthly", "Monthly"),
        ],
        default="weekly"
    )
    preferred_days = models.JSONField(
        default=list,
        help_text="List of preferred weekdays (0=Monday, 6=Sunday)"
    )
    preferred_times = models.JSONField(
        default=list,
        help_text="List of preferred time slots"
    )
    
    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    registration_start = models.DateTimeField()
    registration_end = models.DateTimeField()
    
    # Capacity and rules
    max_teams = models.IntegerField(
        validators=[MinValueValidator(4), MaxValueValidator(100)]
    )
    min_teams = models.IntegerField(
        default=4,
        validators=[MinValueValidator(2), MaxValueValidator(50)]
    )
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planning")
    current_round = models.IntegerField(default=0)
    total_rounds = models.IntegerField(default=0)
    
    # Organizer
    organizer = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="organized_leagues"
    )
    
    class Meta:
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["club", "status", "start_date"]),
            models.Index(fields=["season", "status"]),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.season}"
    
    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("Start date must be before end date")
        if self.min_teams > self.max_teams:
            raise ValidationError("Min teams cannot be greater than max teams")
    
    @property
    def current_teams_count(self):
        """Get current number of registered teams."""
        return self.team_registrations.filter(status="confirmed").count()
    
    @property
    def can_start(self):
        """Check if league can start."""
        return (
            self.status == "registration_closed" and
            self.current_teams_count >= self.min_teams
        )


class LeagueTeamRegistration(BaseModel):
    """
    Team registration for leagues.
    """
    
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("waitlist", "Waitlist"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="team_registrations"
    )
    
    # Team info
    team_name = models.CharField(max_length=100)
    captain = models.ForeignKey(
        "clients.ClientProfile",
        on_delete=models.CASCADE,
        related_name="captained_league_teams"
    )
    
    # Players - flexible roster size
    players = models.ManyToManyField(
        "clients.ClientProfile",
        through="LeagueTeamPlayer",
        related_name="league_teams"
    )
    
    # Registration details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    division = models.IntegerField(
        null=True, blank=True,
        help_text="Division number (1-based, null if not assigned)"
    )
    
    # Contact
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    
    # Home venue preference
    preferred_home_venue = models.ForeignKey(
        "clubs.Court",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_league_teams"
    )
    
    class Meta:
        ordering = ["league", "division", "team_name"]
        unique_together = ["league", "team_name"]
        indexes = [
            models.Index(fields=["league", "status"]),
            models.Index(fields=["captain", "league"]),
        ]
    
    def __str__(self):
        return f"{self.team_name} - {self.league.name}"


class LeagueTeamPlayer(BaseModel):
    """
    Player membership in league teams.
    """
    
    ROLE_CHOICES = [
        ("captain", "Captain"),
        ("player", "Player"),
        ("substitute", "Substitute"),
    ]
    
    team = models.ForeignKey(LeagueTeamRegistration, on_delete=models.CASCADE)
    player = models.ForeignKey("clients.ClientProfile", on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="player")
    
    # Player availability
    availability_windows = models.JSONField(
        default=list,
        help_text="List of availability windows for the player"
    )
    
    class Meta:
        unique_together = ["team", "player"]
        indexes = [
            models.Index(fields=["team", "role"]),
            models.Index(fields=["player", "team"]),
        ]
    
    def __str__(self):
        return f"{self.player.user.get_full_name()} - {self.team.team_name} ({self.role})"


class LeagueSchedule(BaseModel):
    """
    Overall schedule structure for a league.
    """
    
    league = models.OneToOneField(
        League, on_delete=models.CASCADE, related_name="schedule"
    )
    
    # Schedule configuration
    round_duration_days = models.IntegerField(
        default=7,
        help_text="Number of days each round lasts"
    )
    
    # Generation metadata
    generated_at = models.DateTimeField(null=True, blank=True)
    algorithm_used = models.CharField(
        max_length=50,
        choices=[
            ("genetic", "Genetic Algorithm"),
            ("constraint_solver", "Constraint Solver"),
            ("greedy", "Greedy Assignment"),
        ],
        default="genetic"
    )
    
    # Quality metrics
    quality_score = models.FloatField(
        null=True, blank=True,
        help_text="Overall schedule quality score (0-100)"
    )
    total_travel_distance = models.FloatField(
        null=True, blank=True,
        help_text="Total travel distance in kilometers"
    )
    
    class Meta:
        ordering = ["-generated_at"]
    
    def __str__(self):
        return f"Schedule for {self.league.name}"


class LeagueRound(BaseModel):
    """
    Individual round within a league schedule.
    """
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="rounds"
    )
    round_number = models.IntegerField()
    
    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Status
    is_active = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    
    class Meta:
        ordering = ["league", "round_number"]
        unique_together = ["league", "round_number"]
        indexes = [
            models.Index(fields=["league", "round_number"]),
            models.Index(fields=["start_date", "end_date"]),
        ]
    
    def __str__(self):
        return f"{self.league.name} - Round {self.round_number}"


class LeagueMatch(MultiTenantModel):
    """
    Individual match in a league.
    """
    
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("postponed", "Postponed"),
        ("cancelled", "Cancelled"),
        ("forfeit", "Forfeit"),
    ]
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="league_matches"
    )
    round = models.ForeignKey(
        LeagueRound, on_delete=models.CASCADE, related_name="matches"
    )
    
    # Teams
    home_team = models.ForeignKey(
        LeagueTeamRegistration,
        on_delete=models.CASCADE,
        related_name="home_matches"
    )
    away_team = models.ForeignKey(
        LeagueTeamRegistration,
        on_delete=models.CASCADE,
        related_name="away_matches"
    )
    
    # Scheduling
    scheduled_date = models.DateTimeField()
    court = models.ForeignKey(
        "clubs.Court",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="league_matches"
    )
    
    # Status and results
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    winner = models.ForeignKey(
        LeagueTeamRegistration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_league_matches"
    )
    
    # Match details
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["league", "round__round_number", "scheduled_date"]
        unique_together = ["round", "home_team", "away_team"]
        indexes = [
            models.Index(fields=["league", "status"]),
            models.Index(fields=["scheduled_date", "court"]),
            models.Index(fields=["home_team", "away_team"]),
        ]
    
    def __str__(self):
        return f"{self.home_team.team_name} vs {self.away_team.team_name} - R{self.round.round_number}"
    
    def clean(self):
        if self.home_team == self.away_team:
            raise ValidationError("Teams cannot play against themselves")


class ScheduleConstraint(BaseModel):
    """
    Scheduling constraints for league optimization.
    """
    
    CONSTRAINT_TYPE_CHOICES = [
        ("court_availability", "Court Availability"),
        ("player_availability", "Player Availability"),
        ("travel_distance", "Travel Distance"),
        ("rest_period", "Rest Period"),
        ("blackout_dates", "Blackout Dates"),
        ("venue_capacity", "Venue Capacity"),
        ("weather", "Weather Conditions"),
    ]
    
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="constraints"
    )
    constraint_type = models.CharField(max_length=30, choices=CONSTRAINT_TYPE_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    
    # Constraint parameters (flexible JSON structure)
    parameters = models.JSONField(default=dict)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["league", "priority", "constraint_type"]
        indexes = [
            models.Index(fields=["league", "constraint_type"]),
            models.Index(fields=["league", "is_active"]),
        ]
    
    def __str__(self):
        return f"{self.league.name} - {self.get_constraint_type_display()} ({self.priority})"
