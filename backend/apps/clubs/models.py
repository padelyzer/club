"""
EMERGENCY RECOVERY - Clean clubs models for production.
"""

from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.models import BaseModel

User = get_user_model()


class Club(BaseModel):
    """
    Model representing a padel club - EMERGENCY RECOVERY VERSION.
    """

    # Basic Information
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)

    # Organization relationship
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="clubs"
    )

    # Contact Information
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    website = models.URLField(blank=True)

    # Address
    address = models.JSONField(default=dict, help_text="Full address as JSON")
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )

    # Schedule
    opening_time = models.TimeField(default="07:00")
    closing_time = models.TimeField(default="23:00")
    days_open = models.JSONField(
        default=list, help_text="List of days open (0=Monday, 6=Sunday)"
    )

    # Features
    features = models.JSONField(
        default=list, help_text="List of features: parking, restaurant, shop, etc."
    )

    # Settings
    settings = models.JSONField(default=dict)

    # Branding
    logo_url = models.URLField(blank=True)
    cover_image_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#1E88E5")

    # Metrics
    total_courts = models.IntegerField(default=0)
    total_members = models.IntegerField(default=0)
    
    # Onboarding and Setup
    onboarding_completed = models.BooleanField(default=False)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Multi-location support
    parent_club = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='locations', help_text="For multi-location clubs"
    )
    is_main_location = models.BooleanField(default=True)
    location_code = models.CharField(max_length=10, blank=True, help_text="Internal location identifier")
    
    # Subscription and billing
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('trial', 'Trial'),
            ('active', 'Active'),
            ('past_due', 'Past Due'),
            ('cancelled', 'Cancelled'),
            ('suspended', 'Suspended')
        ],
        default='trial'
    )
    subscription_plan = models.CharField(
        max_length=50, 
        default='basic',
        help_text="Subscription plan type"
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    
    # Staff and permissions
    max_staff_count = models.IntegerField(default=5)
    
    # Analytics preferences
    analytics_enabled = models.BooleanField(default=True)
    public_analytics = models.BooleanField(default=False)
    
    # Mobile app features
    mobile_checkin_enabled = models.BooleanField(default=True)
    push_notifications_enabled = models.BooleanField(default=True)
    offline_mode_enabled = models.BooleanField(default=True)
    
    # Business rules
    advance_booking_days = models.IntegerField(default=30)
    cancellation_deadline_hours = models.IntegerField(default=24)
    min_booking_duration_minutes = models.IntegerField(default=60)
    max_booking_duration_minutes = models.IntegerField(default=180)
    
    # Integration settings
    weather_integration_enabled = models.BooleanField(default=False)
    calendar_sync_enabled = models.BooleanField(default=False)
    
    # Customization
    theme_color_secondary = models.CharField(max_length=7, default="#43A047")
    theme_color_accent = models.CharField(max_length=7, default="#FF5722")
    custom_css = models.TextField(blank=True)
    
    # SEO and social
    meta_title = models.CharField(max_length=60, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    social_facebook = models.URLField(blank=True)
    social_instagram = models.URLField(blank=True)
    social_twitter = models.URLField(blank=True)
    social_whatsapp = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["organization", "slug"]),
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            
            # Ensure slug uniqueness
            while Club.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def full_address(self):
        """Get formatted address."""
        addr = self.address
        parts = [
            addr.get("street", ""),
            addr.get("number", ""),
            addr.get("colony", ""),
            addr.get("city", ""),
            addr.get("state", ""),
            f"CP {addr.get('postal_code', '')}" if addr.get("postal_code") else "",
            addr.get("country", "México"),
        ]
        return ", ".join(filter(None, parts))

    def get_active_courts_count(self):
        """Get count of active courts."""
        return self.courts.filter(is_active=True).count()

    def get_subscription_status_display(self):
        """Get human-readable subscription status."""
        status_map = {
            'trial': 'Trial Period',
            'active': 'Active Subscription',
            'past_due': 'Payment Past Due',
            'cancelled': 'Cancelled',
            'suspended': 'Suspended'
        }
        return status_map.get(self.subscription_status, self.subscription_status.title())
    
    def is_trial_expired(self):
        """Check if trial period has expired."""
        if self.subscription_status != 'trial' or not self.trial_ends_at:
            return False
        from django.utils import timezone
        return timezone.now() > self.trial_ends_at
    
    def get_staff_count(self):
        """Get current staff count."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(club=self, is_active=True).count()
    
    def can_add_staff(self):
        """Check if club can add more staff."""
        return self.get_staff_count() < self.max_staff_count
    
    def get_child_locations(self):
        """Get all child locations for multi-location clubs."""
        if self.is_main_location:
            return self.locations.filter(is_active=True)
        return Club.objects.none()
    
    def get_main_location(self):
        """Get main location for child clubs."""
        if not self.is_main_location and self.parent_club:
            return self.parent_club
        return self
    
    def get_total_courts_all_locations(self):
        """Get total courts across all locations."""
        if self.is_main_location:
            total = self.get_active_courts_count()
            for location in self.get_child_locations():
                total += location.get_active_courts_count()
            return total
        return self.get_active_courts_count()
    
    def get_business_rules(self):
        """Get club business rules as dict for mobile apps."""
        return {
            'advance_booking_days': self.advance_booking_days,
            'cancellation_deadline_hours': self.cancellation_deadline_hours,
            'min_booking_duration_minutes': self.min_booking_duration_minutes,
            'max_booking_duration_minutes': self.max_booking_duration_minutes,
            'mobile_checkin_enabled': self.mobile_checkin_enabled,
            'push_notifications_enabled': self.push_notifications_enabled,
            'offline_mode_enabled': self.offline_mode_enabled,
        }
    
    def get_theme_colors(self):
        """Get all theme colors as dict."""
        return {
            'primary': self.primary_color,
            'secondary': self.theme_color_secondary,
            'accent': self.theme_color_accent,
        }
    
    def get_social_links(self):
        """Get all social media links."""
        return {
            'facebook': self.social_facebook,
            'instagram': self.social_instagram,
            'twitter': self.social_twitter,
            'whatsapp': self.social_whatsapp,
        }


class Court(BaseModel):
    """
    Model representing a court in a club - EMERGENCY RECOVERY VERSION.
    """

    SURFACE_CHOICES = [
        ("glass", "Cristal"),
        ("wall", "Pared"),
        ("mesh", "Malla"),
        ("mixed", "Mixta"),
    ]

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="courts")
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="courts"
    )

    # Basic Information
    name = models.CharField(max_length=100)
    number = models.IntegerField()
    surface_type = models.CharField(
        max_length=20, choices=SURFACE_CHOICES, default="glass"
    )

    # Features
    has_lighting = models.BooleanField(default=True)
    has_heating = models.BooleanField(default=False)
    has_roof = models.BooleanField(default=False)

    # Status
    is_maintenance = models.BooleanField(default=False)
    maintenance_notes = models.TextField(blank=True)

    # Pricing (simple version)
    price_per_hour = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    # Dynamic pricing settings
    dynamic_pricing_enabled = models.BooleanField(default=False)
    peak_hours_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    weekend_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    
    # Court specifications
    dimensions = models.JSONField(
        default=dict,
        help_text="Court dimensions in meters: {width: 10, length: 20, height: 6}"
    )
    court_type = models.CharField(
        max_length=20,
        choices=[
            ('indoor', 'Interior'),
            ('outdoor', 'Exterior'),
            ('covered', 'Techado'),
            ('semi_covered', 'Semi-techado')
        ],
        default='indoor'
    )
    
    # Equipment and amenities
    equipment_included = models.JSONField(
        default=list,
        help_text="List of included equipment: rackets, balls, towels, etc."
    )
    amenities = models.JSONField(
        default=list,
        help_text="List of amenities: shower, lockers, parking, etc."
    )
    
    # Weather integration
    weather_dependent = models.BooleanField(default=False)
    min_temperature = models.IntegerField(null=True, blank=True, help_text="Minimum temperature in Celsius")
    max_temperature = models.IntegerField(null=True, blank=True, help_text="Maximum temperature in Celsius")
    
    # Utilization and analytics
    utilization_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Current utilization rate percentage"
    )
    last_utilization_update = models.DateTimeField(null=True, blank=True)
    
    # Booking restrictions
    advance_booking_days = models.IntegerField(
        null=True, blank=True,
        help_text="Override club setting for this court"
    )
    min_booking_duration = models.IntegerField(
        null=True, blank=True,
        help_text="Minimum booking duration in minutes"
    )
    max_booking_duration = models.IntegerField(
        null=True, blank=True,
        help_text="Maximum booking duration in minutes"
    )
    
    # Access control
    member_only = models.BooleanField(default=False)
    requires_approval = models.BooleanField(default=False)
    skill_level_required = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Principiante'),
            ('intermediate', 'Intermedio'),
            ('advanced', 'Avanzado'),
            ('professional', 'Profesional'),
            ('any', 'Cualquier nivel')
        ],
        default='any'
    )
    
    # Quality and ratings
    quality_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0,
        help_text="Average quality rating from 0-5"
    )
    total_ratings = models.IntegerField(default=0)
    
    # Images
    images = models.JSONField(
        default=list, 
        help_text="List of court image URLs with metadata"
    )
    
    # Availability template
    availability_template = models.JSONField(
        default=dict,
        help_text="Weekly availability template with time slots"
    )

    class Meta:
        ordering = ["club", "number"]
        unique_together = ["club", "number"]
        indexes = [
            models.Index(fields=["club", "is_active"]),
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self):
        return f"{self.club.name} - Cancha {self.number}"
    
    def get_effective_price(self, date_time=None, is_member=False):
        """Calculate effective price considering dynamic pricing and special pricing."""
        if not date_time:
            from django.utils import timezone
            date_time = timezone.now()
        
        # Check for special pricing first
        special_price = CourtSpecialPricing.get_effective_price_for_court_datetime(
            self, date_time.date(), date_time.time()
        )
        if special_price != self.price_per_hour:
            return special_price
        
        # Apply dynamic pricing
        price = self.price_per_hour
        if self.dynamic_pricing_enabled:
            # Peak hours (6pm-10pm)
            if 18 <= date_time.hour < 22:
                price *= self.peak_hours_multiplier
            
            # Weekend pricing (Saturday, Sunday)
            if date_time.weekday() >= 5:
                price *= self.weekend_multiplier
        
        # Member discount could be applied here
        # if is_member:
        #     price *= Decimal('0.9')  # 10% member discount
        
        return price
    
    def get_utilization_rate(self, start_date=None, end_date=None):
        """Calculate court utilization rate for a period."""
        if not start_date:
            from datetime import date, timedelta
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
        
        try:
            from apps.reservations.models import Reservation
            
            # Total possible hours (assuming 12 hours/day operation)
            total_days = (end_date - start_date).days + 1
            total_possible_hours = total_days * 12
            
            # Calculate actual booked hours
            reservations = Reservation.objects.filter(
                court=self,
                date__gte=start_date,
                date__lte=end_date,
                status__in=['confirmed', 'completed']
            )
            
            total_booked_minutes = sum(
                (r.end_time.hour * 60 + r.end_time.minute) - 
                (r.start_time.hour * 60 + r.start_time.minute)
                for r in reservations
            )
            
            total_booked_hours = total_booked_minutes / 60
            utilization = (total_booked_hours / total_possible_hours) * 100 if total_possible_hours > 0 else 0
            
            return round(utilization, 2)
        except ImportError:
            return 0
    
    def update_utilization_rate(self):
        """Update the stored utilization rate."""
        from django.utils import timezone
        self.utilization_rate = self.get_utilization_rate()
        self.last_utilization_update = timezone.now()
        self.save(update_fields=['utilization_rate', 'last_utilization_update'])
    
    def is_weather_suitable(self, temperature=None, weather_condition=None):
        """Check if weather conditions are suitable for outdoor courts."""
        if not self.weather_dependent or self.court_type == 'indoor':
            return True
        
        if temperature is not None:
            if self.min_temperature and temperature < self.min_temperature:
                return False
            if self.max_temperature and temperature > self.max_temperature:
                return False
        
        # Weather condition checks could be added here
        unsuitable_conditions = ['rain', 'storm', 'snow']
        if weather_condition and weather_condition.lower() in unsuitable_conditions:
            return False
        
        return True
    
    def get_booking_restrictions(self):
        """Get booking restrictions for this court."""
        club_rules = self.club.get_business_rules()
        
        return {
            'advance_booking_days': self.advance_booking_days or club_rules['advance_booking_days'],
            'min_booking_duration': self.min_booking_duration or club_rules['min_booking_duration_minutes'],
            'max_booking_duration': self.max_booking_duration or club_rules['max_booking_duration_minutes'],
            'member_only': self.member_only,
            'requires_approval': self.requires_approval,
            'skill_level_required': self.skill_level_required,
        }
    
    def can_be_booked_by(self, user, date_time=None):
        """Check if a user can book this court."""
        restrictions = self.get_booking_restrictions()
        
        # Check if court is active
        if not self.is_active or self.is_maintenance:
            return False, "Court is not available"
        
        # Check member-only restriction
        if restrictions['member_only']:
            # Would check user membership status
            pass
        
        # Check skill level requirement
        if restrictions['skill_level_required'] != 'any':
            # Would check user skill level
            pass
        
        # Check weather conditions for outdoor courts
        if self.weather_dependent and date_time:
            # Would integrate with weather API
            pass
        
        return True, "Available"
    
    def get_availability_template_for_day(self, weekday):
        """Get availability template for a specific weekday (0=Monday)."""
        if not self.availability_template:
            return []
        
        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        day_name = weekdays[weekday]
        
        return self.availability_template.get(day_name, [])
    
    def add_rating(self, rating_value):
        """Add a new rating and update average."""
        if 0 <= rating_value <= 5:
            total_score = (self.quality_rating * self.total_ratings) + rating_value
            self.total_ratings += 1
            self.quality_rating = total_score / self.total_ratings
            self.save(update_fields=['quality_rating', 'total_ratings'])


class Schedule(BaseModel):
    """
    Model for club schedule - EMERGENCY RECOVERY VERSION.
    """

    WEEKDAYS = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miércoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sábado"),
        (6, "Domingo"),
    ]

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="schedules")
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="schedules"
    )

    weekday = models.IntegerField(choices=WEEKDAYS)
    opening_time = models.TimeField()
    closing_time = models.TimeField()

    # Special settings for this day
    is_closed = models.BooleanField(default=False)
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = ["club", "weekday"]
        ordering = ["club", "weekday"]

    def __str__(self):
        return f"{self.club.name} - {self.get_weekday_display()}"


class CourtSpecialPricing(BaseModel):
    """
    Special pricing periods for courts - allows different pricing for specific date ranges.
    These override the regular price_per_hour during their active periods.
    """

    PERIOD_TYPES = [
        ("holiday", "Feriado"),
        ("peak_season", "Temporada Alta"),
        ("low_season", "Temporada Baja"),
        ("special_event", "Evento Especial"),
        ("promotion", "Promoción"),
        ("weekend", "Fin de Semana"),
        ("custom", "Personalizado"),
    ]

    court = models.ForeignKey(
        Court, on_delete=models.CASCADE, related_name="special_pricing_periods"
    )
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="special_pricing_periods"
    )

    # Basic Information
    name = models.CharField(max_length=200, help_text="Name for this pricing period (e.g., 'Christmas Holiday', 'Summer Peak')")
    description = models.TextField(blank=True, help_text="Optional description of this pricing period")
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPES, default="custom")

    # Date Range
    start_date = models.DateField(help_text="Start date for this pricing period")
    end_date = models.DateField(help_text="End date for this pricing period")

    # Time Range (optional - applies to all day if not specified)
    start_time = models.TimeField(null=True, blank=True, help_text="Optional start time for daily application")
    end_time = models.TimeField(null=True, blank=True, help_text="Optional end time for daily application")

    # Days of week filter (optional - applies to all days if empty)
    days_of_week = models.JSONField(
        default=list, 
        help_text="List of weekdays (0=Monday, 6=Sunday). Empty means all days."
    )

    # Pricing
    price_per_hour = models.DecimalField(
        max_digits=8, 
        decimal_places=2,
        help_text="Special price per hour during this period"
    )

    # Priority for overlapping periods (higher number = higher priority)
    priority = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Priority when multiple special periods overlap (1-10, higher wins)"
    )

    class Meta:
        ordering = ["court", "-priority", "start_date"]
        indexes = [
            models.Index(fields=["court", "start_date", "end_date"]),
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["start_date", "end_date", "is_active"]),
        ]

    def __str__(self):
        return f"{self.court.name} - {self.name} ({self.start_date} to {self.end_date})"

    def clean(self):
        """Validate the special pricing period."""
        from django.core.exceptions import ValidationError
        from django.utils import timezone

        # Validate date range
        if self.end_date < self.start_date:
            raise ValidationError("End date must be after start date")

        # Validate time range if both are provided
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError("End time must be after start time")

        # Validate days of week
        if self.days_of_week:
            if not isinstance(self.days_of_week, list):
                raise ValidationError("Days of week must be a list")
            for day in self.days_of_week:
                if not isinstance(day, int) or day < 0 or day > 6:
                    raise ValidationError("Days of week must be integers between 0 and 6")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def is_applicable_for_datetime(self, date, time=None):
        """
        Check if this pricing period applies to a specific date and time.
        
        Args:
            date: Date to check
            time: Optional time to check
            
        Returns:
            bool: True if this pricing period applies
        """
        # Check if within date range
        if not (self.start_date <= date <= self.end_date):
            return False

        # Check days of week filter
        if self.days_of_week:
            weekday = date.weekday()  # Monday is 0, Sunday is 6
            if weekday not in self.days_of_week:
                return False

        # Check time range if specified and time provided
        if self.start_time and self.end_time and time:
            if not (self.start_time <= time <= self.end_time):
                return False

        return True

    @classmethod
    def get_active_pricing_for_court_datetime(cls, court, date, time=None):
        """
        Get the highest priority active special pricing for a court at a specific date/time.
        
        Args:
            court: Court instance
            date: Date to check
            time: Optional time to check
            
        Returns:
            CourtSpecialPricing instance or None
        """
        # Get all active special pricing periods for this court
        pricing_periods = cls.objects.filter(
            court=court,
            is_active=True,
            start_date__lte=date,
            end_date__gte=date
        ).order_by('-priority', '-created_at')

        # Find the first (highest priority) applicable period
        for period in pricing_periods:
            if period.is_applicable_for_datetime(date, time):
                return period

        return None

    @classmethod
    def get_effective_price_for_court_datetime(cls, court, date, time=None):
        """
        Get the effective price for a court at a specific date/time.
        This considers special pricing periods and falls back to regular pricing.
        
        Args:
            court: Court instance
            date: Date to check
            time: Optional time to check
            
        Returns:
            Decimal: The effective price per hour
        """
        special_pricing = cls.get_active_pricing_for_court_datetime(court, date, time)
        if special_pricing:
            return special_pricing.price_per_hour
        return court.price_per_hour


class Announcement(BaseModel):
    """
    Club announcements - EMERGENCY RECOVERY VERSION.
    """

    ANNOUNCEMENT_TYPES = [
        ("general", "General"),
        ("maintenance", "Mantenimiento"),
        ("event", "Evento"),
        ("promotion", "Promoción"),
    ]

    club = models.ForeignKey(
        Club, on_delete=models.CASCADE, related_name="announcements"
    )
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="announcements"
    )

    title = models.CharField(max_length=200)
    content = models.TextField()
    announcement_type = models.CharField(
        max_length=20, choices=ANNOUNCEMENT_TYPES, default="general"
    )

    # Scheduling
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    # Display settings
    is_priority = models.BooleanField(default=False)
    show_on_app = models.BooleanField(default=True)
    show_on_website = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_priority", "-starts_at"]
        indexes = [
            models.Index(fields=["club", "starts_at", "ends_at"]),
        ]

    def __str__(self):
        return f"{self.club.name} - {self.title}"

    def is_active(self):
        """Check if announcement is currently active."""
        from django.utils import timezone

        now = timezone.now()
        return self.starts_at <= now <= self.ends_at and self.is_active


class MaintenanceType(BaseModel):
    """
    Predefined maintenance types for courts.
    """
    
    CATEGORY_CHOICES = [
        ("preventive", "Preventivo"),
        ("corrective", "Correctivo"),
        ("improvement", "Mejora"),
        ("cleaning", "Limpieza"),
    ]
    
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="maintenance_types"
    )
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="preventive")
    description = models.TextField(blank=True)
    
    # Estimated duration and cost
    estimated_duration_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(24)]
    )
    estimated_cost = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Estimated cost in local currency"
    )
    
    # Frequency for preventive maintenance
    frequency_days = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="Days between preventive maintenance (null for on-demand)"
    )
    
    # Required materials/tools
    required_materials = models.JSONField(
        default=list, 
        help_text="List of required materials and tools"
    )
    
    # Safety requirements
    safety_requirements = models.TextField(
        blank=True,
        help_text="Safety requirements and precautions"
    )
    
    class Meta:
        ordering = ["category", "name"]
        unique_together = ["organization", "name"]
        indexes = [
            models.Index(fields=["organization", "category"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class MaintenanceRecord(BaseModel):
    """
    Record of completed or ongoing maintenance work on courts.
    """
    
    STATUS_CHOICES = [
        ("scheduled", "Programado"),
        ("in_progress", "En progreso"),
        ("completed", "Completado"),
        ("cancelled", "Cancelado"),
        ("on_hold", "En pausa"),
    ]
    
    PRIORITY_CHOICES = [
        ("low", "Baja"),
        ("medium", "Media"),
        ("high", "Alta"),
        ("urgent", "Urgente"),
    ]
    
    # Relationships
    club = models.ForeignKey(
        Club, on_delete=models.CASCADE, related_name="maintenance_records"
    )
    court = models.ForeignKey(
        Court, on_delete=models.CASCADE, related_name="maintenance_records"
    )
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="maintenance_records"
    )
    maintenance_type = models.ForeignKey(
        MaintenanceType, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="records"
    )
    
    # Scheduling
    scheduled_date = models.DateTimeField(db_index=True)
    scheduled_end_date = models.DateTimeField(null=True, blank=True)
    
    # Actual execution times
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Details
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    
    # Personnel
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_maintenance"
    )
    completed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="completed_maintenance"
    )
    
    # Cost tracking
    estimated_cost = models.DecimalField(
        max_digits=8, decimal_places=2, default=0
    )
    actual_cost = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    
    # Materials and labor
    materials_used = models.JSONField(
        default=list,
        help_text="List of materials used with quantities and costs"
    )
    labor_hours = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )
    
    # Quality and follow-up
    quality_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Quality rating from 1-5"
    )
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True)
    
    # Documentation
    before_photos = models.JSONField(
        default=list,
        help_text="URLs of before photos"
    )
    after_photos = models.JSONField(
        default=list,
        help_text="URLs of after photos"
    )
    additional_notes = models.TextField(blank=True)
    
    # Created by
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name="created_maintenance"
    )
    
    class Meta:
        ordering = ["-scheduled_date"]
        indexes = [
            models.Index(fields=["court", "scheduled_date"]),
            models.Index(fields=["club", "status", "scheduled_date"]),
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["assigned_to", "status"]),
        ]
    
    def __str__(self):
        return f"{self.court.name} - {self.title} ({self.scheduled_date.date()})"
    
    def clean(self):
        """Validate maintenance record data."""
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        
        if self.scheduled_end_date and self.scheduled_end_date <= self.scheduled_date:
            raise ValidationError("End date must be after start date")
        
        if self.started_at and self.completed_at:
            if self.completed_at <= self.started_at:
                raise ValidationError("Completion time must be after start time")
        
        # Validate status transitions
        if self.pk:  # Only for existing records
            old_record = MaintenanceRecord.objects.get(pk=self.pk)
            if old_record.status == "completed" and self.status != "completed":
                raise ValidationError("Cannot change status of completed maintenance")
    
    def save(self, *args, **kwargs):
        """Override save to handle status changes."""
        from django.utils import timezone
        
        # Auto-set timestamps based on status
        if self.status == "in_progress" and not self.started_at:
            self.started_at = timezone.now()
        elif self.status == "completed" and not self.completed_at:
            self.completed_at = timezone.now()
        
        # Calculate actual duration
        if self.started_at and self.completed_at:
            duration = self.completed_at - self.started_at
            self.labor_hours = duration.total_seconds() / 3600
        
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Update court maintenance status
        self._update_court_maintenance_status()
    
    def _update_court_maintenance_status(self):
        """Update the court's maintenance status based on active maintenance."""
        has_active_maintenance = self.court.maintenance_records.filter(
            status__in=["scheduled", "in_progress"],
            scheduled_date__lte=timezone.now() + timezone.timedelta(hours=24)
        ).exists()
        
        if self.court.is_maintenance != has_active_maintenance:
            self.court.is_maintenance = has_active_maintenance
            self.court.save(update_fields=["is_maintenance"])
    
    def get_duration_hours(self):
        """Get actual or estimated duration in hours."""
        if self.started_at and self.completed_at:
            duration = self.completed_at - self.started_at
            return round(duration.total_seconds() / 3600, 1)
        elif self.maintenance_type:
            return float(self.maintenance_type.estimated_duration_hours)
        else:
            return 1.0
    
    def get_cost_variance(self):
        """Get cost variance between estimated and actual."""
        if self.actual_cost is not None:
            return float(self.actual_cost) - float(self.estimated_cost)
        return None
    
    def blocks_reservations(self, reservation_date=None, reservation_start_time=None, reservation_end_time=None):
        """Check if this maintenance blocks a specific reservation time."""
        from django.utils import timezone
        from datetime import datetime, date
        
        if self.status in ["cancelled", "completed"]:
            return False
        
        # Default to the maintenance scheduled time if no specific reservation time provided
        if reservation_date is None:
            return True
        
        maintenance_start = self.scheduled_date
        maintenance_end = self.scheduled_end_date or (
            self.scheduled_date + timezone.timedelta(hours=self.get_duration_hours())
        )
        
        # Convert reservation time to datetime
        if isinstance(reservation_date, date):
            if reservation_start_time and reservation_end_time:
                reservation_start = timezone.make_aware(
                    datetime.combine(reservation_date, reservation_start_time)
                )
                reservation_end = timezone.make_aware(
                    datetime.combine(reservation_date, reservation_end_time)
                )
            else:
                # If no specific times, check if dates overlap
                return reservation_date == maintenance_start.date()
        else:
            reservation_start = reservation_date
            reservation_end = reservation_start_time  # Assuming this is end_datetime
        
        # Check for overlap
        return not (reservation_end <= maintenance_start or reservation_start >= maintenance_end)


class MaintenanceSchedule(BaseModel):
    """
    Recurring maintenance schedules for courts.
    """
    
    FREQUENCY_CHOICES = [
        ("daily", "Diario"),
        ("weekly", "Semanal"), 
        ("monthly", "Mensual"),
        ("quarterly", "Trimestral"),
        ("yearly", "Anual"),
        ("custom", "Personalizado"),
    ]
    
    WEEKDAY_CHOICES = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miércoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sábado"),
        (6, "Domingo"),
    ]
    
    # Relationships
    club = models.ForeignKey(
        Club, on_delete=models.CASCADE, related_name="maintenance_schedules"
    )
    court = models.ForeignKey(
        Court, on_delete=models.CASCADE, related_name="maintenance_schedules",
        null=True, blank=True, help_text="If null, applies to all courts"
    )
    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="maintenance_schedules"
    )
    maintenance_type = models.ForeignKey(
        MaintenanceType, on_delete=models.CASCADE, related_name="schedules"
    )
    
    # Schedule details
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Frequency settings
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    custom_frequency_days = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="Number of days for custom frequency"
    )
    
    # Time settings
    preferred_time = models.TimeField(help_text="Preferred time for maintenance")
    duration_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(24)]
    )
    
    # Day-of-week settings (for weekly frequency)
    preferred_weekday = models.IntegerField(
        choices=WEEKDAY_CHOICES, null=True, blank=True
    )
    
    # Start and end dates
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    # Auto-generation settings
    auto_generate = models.BooleanField(
        default=True,
        help_text="Automatically generate maintenance records"
    )
    generate_days_ahead = models.IntegerField(
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="How many days ahead to generate maintenance"
    )
    
    # Assignment
    default_assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="default_maintenance_schedules"
    )
    
    # Last generation tracking
    last_generated_date = models.DateField(null=True, blank=True)
    
    # Created by
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name="created_maintenance_schedules"
    )
    
    class Meta:
        ordering = ["club", "court", "preferred_time"]
        indexes = [
            models.Index(fields=["club", "is_active"]),
            models.Index(fields=["court", "is_active"]),
            models.Index(fields=["organization", "auto_generate"]),
        ]
    
    def __str__(self):
        court_name = self.court.name if self.court else "Todas las canchas"
        return f"{court_name} - {self.title} ({self.get_frequency_display()})"
    
    def get_next_occurrence_date(self, from_date=None):
        """Calculate the next occurrence date based on frequency."""
        from datetime import date, timedelta
        
        if from_date is None:
            from_date = date.today()
        
        if self.frequency == "daily":
            return from_date + timedelta(days=1)
        elif self.frequency == "weekly":
            days_ahead = self.preferred_weekday - from_date.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return from_date + timedelta(days=days_ahead)
        elif self.frequency == "monthly":
            if from_date.month == 12:
                return date(from_date.year + 1, 1, min(from_date.day, 31))
            else:
                next_month = from_date.month + 1
                # Handle day overflow (e.g., Jan 31 -> Feb 28)
                import calendar
                max_day = calendar.monthrange(from_date.year, next_month)[1]
                return date(from_date.year, next_month, min(from_date.day, max_day))
        elif self.frequency == "quarterly":
            return from_date + timedelta(days=90)
        elif self.frequency == "yearly":
            return date(from_date.year + 1, from_date.month, from_date.day)
        elif self.frequency == "custom":
            return from_date + timedelta(days=self.custom_frequency_days or 30)
        
        return from_date + timedelta(days=1)
    
    def generate_maintenance_records(self, days_ahead=None):
        """Generate maintenance records based on this schedule."""
        from datetime import date, datetime, timedelta
        from django.utils import timezone
        
        if not self.auto_generate:
            return []
        
        days_ahead = days_ahead or self.generate_days_ahead
        target_date = date.today() + timedelta(days=days_ahead)
        
        # Start from last generated date or start date
        current_date = self.last_generated_date or self.start_date
        if current_date < date.today():
            current_date = date.today()
        
        generated_records = []
        
        while current_date <= target_date:
            if self.end_date and current_date > self.end_date:
                break
            
            # Check if record already exists
            scheduled_datetime = timezone.make_aware(
                datetime.combine(current_date, self.preferred_time)
            )
            
            courts_to_schedule = [self.court] if self.court else self.club.courts.filter(is_active=True)
            
            for court in courts_to_schedule:
                if not MaintenanceRecord.objects.filter(
                    court=court,
                    scheduled_date=scheduled_datetime,
                    status__in=["scheduled", "in_progress"]
                ).exists():
                    
                    record = MaintenanceRecord.objects.create(
                        club=self.club,
                        court=court,
                        organization=self.organization,
                        maintenance_type=self.maintenance_type,
                        scheduled_date=scheduled_datetime,
                        scheduled_end_date=scheduled_datetime + timedelta(hours=float(self.duration_hours)),
                        title=self.title,
                        description=self.description,
                        estimated_cost=self.maintenance_type.estimated_cost if self.maintenance_type else 0,
                        assigned_to=self.default_assigned_to,
                        created_by=self.created_by,
                    )
                    generated_records.append(record)
            
            current_date = self.get_next_occurrence_date(current_date)
        
        # Update last generated date
        self.last_generated_date = target_date
        self.save(update_fields=["last_generated_date"])
        
        return generated_records
