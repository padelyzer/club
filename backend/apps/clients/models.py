"""
Models for clients module.
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel, MultiTenantModel

from .managers import ClientProfileManager, MultiTenantManager, PartnerRequestManager
from .validators import mexican_phone_regex, validate_email_unique_in_organization

User = get_user_model()


class PlayerLevel(BaseModel):
    """
    Player skill levels for categorizing players.
    """

    LEVEL_CHOICES = [
        ("beginner", "Principiante"),
        ("intermediate", "Intermedio"),
        ("advanced", "Avanzado"),
        ("professional", "Profesional"),
    ]

    name = models.CharField(max_length=50, choices=LEVEL_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    min_rating = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(1000)]
    )
    max_rating = models.IntegerField(
        default=1000, validators=[MinValueValidator(0), MaxValueValidator(1000)]
    )
    color = models.CharField(
        max_length=7, default="#000000", help_text="Hex color code"
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or name")

    class Meta:
        ordering = ["min_rating"]
        verbose_name = "Player Level"
        verbose_name_plural = "Player Levels"

    def __str__(self):
        return self.display_name


class ClientProfile(MultiTenantModel):
    """
    Extended profile for players/clients.
    Inherits organization and club fields from MultiTenantModel.
    """

    HAND_CHOICES = [
        ("right", "Diestra"),
        ("left", "Zurda"),
        ("ambidextrous", "Ambidiestra"),
    ]

    POSITION_CHOICES = [
        ("right", "Derecha"),
        ("left", "Izquierda"),
        ("both", "Ambas"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="client_profile"
    )

    # Player info
    level = models.ForeignKey(
        PlayerLevel,
        on_delete=models.PROTECT,
        related_name="players",
        null=True,
        blank=True,
    )
    rating = models.IntegerField(
        default=500,
        validators=[MinValueValidator(0), MaxValueValidator(1000)],
        help_text="Player rating (0-1000)",
    )
    dominant_hand = models.CharField(
        max_length=20, choices=HAND_CHOICES, default="right"
    )
    preferred_position = models.CharField(
        max_length=10, choices=POSITION_CHOICES, default="both"
    )

    # Personal info
    birth_date = models.DateField(null=True, blank=True)
    dni = models.CharField(max_length=20, blank=True, help_text="National ID")
    occupation = models.CharField(max_length=100, blank=True)

    # Physical info
    height = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(100), MaxValueValidator(250)],
        help_text="Height in centimeters",
    )
    weight = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(200)],
        help_text="Weight in kilograms",
    )

    # Game style
    play_style = models.CharField(max_length=50, blank=True)
    strengths = models.TextField(blank=True)
    weaknesses = models.TextField(blank=True)

    # Social
    bio = models.TextField(blank=True)
    instagram = models.CharField(max_length=100, blank=True)
    facebook = models.CharField(max_length=100, blank=True)

    # Settings
    is_public = models.BooleanField(
        default=True, help_text="Profile visible to other players"
    )
    show_in_rankings = models.BooleanField(default=True)
    allow_partner_requests = models.BooleanField(default=True)

    objects = ClientProfileManager()

    class Meta:
        verbose_name = "Client Profile"
        verbose_name_plural = "Client Profiles"

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.level or 'Sin nivel'}"

    def update_level_by_rating(self):
        """Update player level based on current rating."""
        levels = PlayerLevel.objects.filter(
            min_rating__lte=self.rating, max_rating__gte=self.rating, is_active=True
        ).first()

        if levels and levels != self.level:
            self.level = levels
            self.save(update_fields=["level", "updated_at"])


class PlayerStats(MultiTenantModel):
    """
    Player statistics and performance metrics.
    Inherits organization and club fields from MultiTenantModel.
    """

    player = models.OneToOneField(
        ClientProfile, on_delete=models.CASCADE, related_name="stats"
    )

    # Match stats
    matches_played = models.IntegerField(default=0)
    matches_won = models.IntegerField(default=0)
    matches_lost = models.IntegerField(default=0)
    win_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, help_text="Win percentage"
    )

    # Game stats
    sets_won = models.IntegerField(default=0)
    sets_lost = models.IntegerField(default=0)
    games_won = models.IntegerField(default=0)
    games_lost = models.IntegerField(default=0)

    # Streaks
    current_win_streak = models.IntegerField(default=0)
    best_win_streak = models.IntegerField(default=0)

    # Position stats
    matches_as_right = models.IntegerField(default=0)
    matches_as_left = models.IntegerField(default=0)
    wins_as_right = models.IntegerField(default=0)
    wins_as_left = models.IntegerField(default=0)

    # Tournament stats
    tournaments_played = models.IntegerField(default=0)
    tournaments_won = models.IntegerField(default=0)
    tournament_finals = models.IntegerField(default=0)
    tournament_semifinals = models.IntegerField(default=0)

    # Class stats
    classes_attended = models.IntegerField(default=0)
    classes_missed = models.IntegerField(default=0)

    # Time stats
    total_play_time = models.IntegerField(
        default=0, help_text="Total play time in minutes"
    )
    average_match_duration = models.IntegerField(
        default=0, help_text="Average match duration in minutes"
    )

    # Ranking
    club_ranking = models.IntegerField(null=True, blank=True)
    regional_ranking = models.IntegerField(null=True, blank=True)
    national_ranking = models.IntegerField(null=True, blank=True)

    # Last activity
    last_match_date = models.DateTimeField(null=True, blank=True)
    last_tournament_date = models.DateTimeField(null=True, blank=True)
    last_class_date = models.DateTimeField(null=True, blank=True)

    objects = MultiTenantManager()

    class Meta:
        verbose_name = "Player Statistics"
        verbose_name_plural = "Player Statistics"

    def __str__(self):
        return f"Stats for {self.player}"

    def update_win_rate(self):
        """Update win rate percentage."""
        if self.matches_played > 0:
            self.win_rate = (self.matches_won / self.matches_played) * 100
        else:
            self.win_rate = 0
        self.save(update_fields=["win_rate", "updated_at"])

    def record_match(self, won, position, duration_minutes=0):
        """Record a match result."""
        self.matches_played += 1
        self.last_match_date = timezone.now()

        if won:
            self.matches_won += 1
            self.current_win_streak += 1
            if self.current_win_streak > self.best_win_streak:
                self.best_win_streak = self.current_win_streak
        else:
            self.matches_lost += 1
            self.current_win_streak = 0

        # Position stats
        if position == "right":
            self.matches_as_right += 1
            if won:
                self.wins_as_right += 1
        else:
            self.matches_as_left += 1
            if won:
                self.wins_as_left += 1

        # Time stats
        if duration_minutes > 0:
            self.total_play_time += duration_minutes
            self.average_match_duration = self.total_play_time // self.matches_played

        self.update_win_rate()
        self.save()


class EmergencyContact(MultiTenantModel):
    """
    Emergency contact information for players.
    Inherits organization and club fields from MultiTenantModel.
    """

    RELATIONSHIP_CHOICES = [
        ("spouse", "Cónyuge"),
        ("parent", "Padre/Madre"),
        ("sibling", "Hermano/a"),
        ("child", "Hijo/a"),
        ("friend", "Amigo/a"),
        ("other", "Otro"),
    ]

    player = models.ForeignKey(
        ClientProfile, on_delete=models.CASCADE, related_name="emergency_contacts"
    )

    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    phone = models.CharField(max_length=20)
    phone_alt = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    objects = MultiTenantManager()

    class Meta:
        ordering = ["-is_primary", "name"]
        verbose_name = "Emergency Contact"
        verbose_name_plural = "Emergency Contacts"

    def __str__(self):
        return f"{self.name} ({self.get_relationship_display()}) - {self.player}"

    def save(self, *args, **kwargs):
        # Ensure only one primary contact per player
        if self.is_primary:
            EmergencyContact.objects.filter(
                player=self.player, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class MedicalInfo(MultiTenantModel):
    """
    Medical information relevant for sports activities.
    Inherits organization and club fields from MultiTenantModel.
    """

    BLOOD_TYPE_CHOICES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]

    player = models.OneToOneField(
        ClientProfile, on_delete=models.CASCADE, related_name="medical_info"
    )

    # Basic medical info
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPE_CHOICES, blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)

    # Physical conditions
    injuries = models.TextField(blank=True, help_text="Current or past injuries")
    physical_limitations = models.TextField(blank=True)

    # Insurance
    insurance_company = models.CharField(max_length=100, blank=True)
    insurance_policy_number = models.CharField(max_length=50, blank=True)
    insurance_phone = models.CharField(max_length=20, blank=True)

    # Medical contact
    doctor_name = models.CharField(max_length=100, blank=True)
    doctor_phone = models.CharField(max_length=20, blank=True)
    clinic_hospital = models.CharField(max_length=100, blank=True)

    # Additional info
    special_considerations = models.TextField(blank=True)
    last_medical_check = models.DateField(null=True, blank=True)

    # Consent
    emergency_consent = models.BooleanField(
        default=False, help_text="Consent for emergency medical treatment"
    )
    data_sharing_consent = models.BooleanField(
        default=False,
        help_text="Consent to share medical info with medical personnel if needed",
    )

    objects = MultiTenantManager()

    class Meta:
        verbose_name = "Medical Information"
        verbose_name_plural = "Medical Information"

    def __str__(self):
        return f"Medical info for {self.player}"


class PlayerPreferences(MultiTenantModel):
    """
    Player preferences for matches, notifications, and gameplay.
    Inherits organization and club fields from MultiTenantModel.
    """

    player = models.OneToOneField(
        ClientProfile, on_delete=models.CASCADE, related_name="preferences"
    )

    # Availability
    available_weekday_morning = models.BooleanField(default=False)
    available_weekday_afternoon = models.BooleanField(default=True)
    available_weekday_evening = models.BooleanField(default=True)
    available_weekend_morning = models.BooleanField(default=True)
    available_weekend_afternoon = models.BooleanField(default=True)
    available_weekend_evening = models.BooleanField(default=True)

    # Play preferences
    preferred_court_type = models.CharField(
        max_length=20,
        choices=[
            ("indoor", "Interior"),
            ("outdoor", "Exterior"),
            ("both", "Ambos"),
        ],
        default="both",
    )
    preferred_match_duration = models.IntegerField(
        default=90, help_text="Preferred match duration in minutes"
    )
    preferred_match_format = models.CharField(
        max_length=20,
        choices=[
            ("competitive", "Competitivo"),
            ("friendly", "Amistoso"),
            ("training", "Entrenamiento"),
            ("any", "Cualquiera"),
        ],
        default="any",
    )

    # Partner preferences
    min_partner_level = models.ForeignKey(
        PlayerLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="min_partner_preferences",
    )
    max_partner_level = models.ForeignKey(
        PlayerLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="max_partner_preferences",
    )
    preferred_partners = models.ManyToManyField(
        ClientProfile, blank=True, related_name="preferred_by"
    )
    blocked_players = models.ManyToManyField(
        ClientProfile, blank=True, related_name="blocked_by"
    )

    # Notification preferences
    notify_match_invites = models.BooleanField(default=True)
    notify_tournament_updates = models.BooleanField(default=True)
    notify_class_reminders = models.BooleanField(default=True)
    notify_partner_requests = models.BooleanField(default=True)
    notify_club_news = models.BooleanField(default=True)
    notify_ranking_changes = models.BooleanField(default=True)

    # Notification methods
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)

    # Privacy
    share_contact_info = models.BooleanField(default=False)
    share_stats = models.BooleanField(default=True)
    share_availability = models.BooleanField(default=True)

    # Other preferences
    language = models.CharField(
        max_length=5, default="es-mx", help_text="Preferred language code"
    )
    distance_radius = models.IntegerField(
        default=10, help_text="Maximum distance in km for match searches"
    )
    auto_accept_known_partners = models.BooleanField(default=False)

    objects = MultiTenantManager()

    class Meta:
        verbose_name = "Player Preferences"
        verbose_name_plural = "Player Preferences"

    def __str__(self):
        return f"Preferences for {self.player}"

    def is_available_at(self, datetime_obj):
        """Check if player is available at given datetime."""
        hour = datetime_obj.hour
        is_weekend = datetime_obj.weekday() >= 5

        # Define time ranges
        is_morning = 6 <= hour < 12
        is_afternoon = 12 <= hour < 18
        is_evening = 18 <= hour < 23

        if is_weekend:
            if is_morning:
                return self.available_weekend_morning
            elif is_afternoon:
                return self.available_weekend_afternoon
            elif is_evening:
                return self.available_weekend_evening
        else:
            if is_morning:
                return self.available_weekday_morning
            elif is_afternoon:
                return self.available_weekday_afternoon
            elif is_evening:
                return self.available_weekday_evening

        return False


class PartnerRequest(MultiTenantModel):
    """
    Partner requests between players.
    Inherits organization and club fields from MultiTenantModel.
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("accepted", "Aceptada"),
        ("rejected", "Rechazada"),
        ("cancelled", "Cancelada"),
    ]

    from_player = models.ForeignKey(
        ClientProfile, on_delete=models.CASCADE, related_name="partner_requests_sent"
    )
    to_player = models.ForeignKey(
        ClientProfile,
        on_delete=models.CASCADE,
        related_name="partner_requests_received",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    message = models.TextField(blank=True)

    # For specific match/tournament
    match_date = models.DateTimeField(null=True, blank=True)
    # tournament = models.ForeignKey(
    #     'tournaments.Tournament',
    #     on_delete=models.CASCADE,
    #     null=True,
    #     blank=True
    # )

    responded_at = models.DateTimeField(null=True, blank=True)
    response_message = models.TextField(blank=True)

    objects = PartnerRequestManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["from_player", "to_player", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.from_player} -> {self.to_player} ({self.get_status_display()})"
    
    def accept(self, message=''):
        """Accept the partner request."""
        if self.status != 'pending':
            raise ValidationError('Only pending requests can be accepted.')
        
        self.status = 'accepted'
        self.response_message = message
        self.responded_at = timezone.now()
        self.save()
    
    def reject(self, message=''):
        """Reject the partner request."""
        if self.status != 'pending':
            raise ValidationError('Only pending requests can be rejected.')
        
        self.status = 'rejected'
        self.response_message = message
        self.responded_at = timezone.now()
        self.save()
    
    def cancel(self):
        """Cancel the partner request (by sender)."""
        if self.status != 'pending':
            raise ValidationError('Only pending requests can be cancelled.')
        
        self.status = 'cancelled'
        self.responded_at = timezone.now()
        self.save()
