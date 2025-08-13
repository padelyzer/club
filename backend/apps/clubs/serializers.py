"""
Serializers for clubs module - EMERGENCY RECOVERY VERSION.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

from apps.shared.validators import InputValidators, phone_regex, rfc_regex

from .models import Announcement, Club, Court, Schedule, CourtSpecialPricing


class ScheduleSerializer(serializers.ModelSerializer):
    """Serializer for Schedule model - EMERGENCY RECOVERY VERSION."""

    weekday_display = serializers.CharField(
        source="get_weekday_display", read_only=True
    )

    class Meta:
        model = Schedule
        fields = [
            "id",
            "club",
            "weekday",
            "weekday_display",
            "opening_time",
            "closing_time",
            "is_closed",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        """Validate that closing time is after opening time."""
        if data.get("closing_time") and data.get("opening_time"):
            if data["closing_time"] <= data["opening_time"]:
                raise serializers.ValidationError(
                    "Closing time must be after opening time."
                )
        return data


class CourtSerializer(serializers.ModelSerializer):
    """Serializer for Court model - EMERGENCY RECOVERY VERSION."""

    club_name = serializers.CharField(source="club.name", read_only=True)
    surface_type_display = serializers.CharField(
        source="get_surface_type_display", read_only=True
    )

    class Meta:
        model = Court
        fields = [
            "id",
            "club",
            "club_name",
            "organization",
            "name",
            "number",
            "surface_type",
            "surface_type_display",
            "has_lighting",
            "has_heating",
            "has_roof",
            "is_maintenance",
            "maintenance_notes",
            "price_per_hour",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "club_name",
            "surface_type_display",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        """Ensure proper serialization format for frontend."""
        data = super().to_representation(instance)
        
        # Ensure UUIDs are returned as strings
        if data.get('id'):
            data['id'] = str(data['id'])
        if data.get('club'):
            data['club'] = str(data['club'])
        if data.get('organization'):
            data['organization'] = str(data['organization'])
        
        # Ensure decimal fields are strings
        if data.get('price_per_hour'):
            data['price_per_hour'] = str(data['price_per_hour'])
        
        return data

    def validate_name(self, value):
        """Validate and sanitize court name."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Court name is required")
        sanitized = InputValidators.sanitize_input(value)
        if len(sanitized) > 100:
            raise serializers.ValidationError("Court name cannot exceed 100 characters")
        return sanitized

    def validate_number(self, value):
        """Validate court number."""
        validated = InputValidators.validate_court_number(value)
        # Check uniqueness within club
        if self.instance:
            # Update case - exclude current court
            exists = (
                Court.objects.filter(club=self.instance.club, number=validated)
                .exclude(id=self.instance.id)
                .exists()
            )
        else:
            # Create case
            club = self.initial_data.get("club")
            if club:
                exists = Court.objects.filter(club_id=club, number=validated).exists()
            else:
                exists = False

        if exists:
            raise serializers.ValidationError(
                f"Court number {validated} already exists in this club"
            )

        return validated

    def validate_price_per_hour(self, value):
        """Validate price."""
        return InputValidators.validate_price(value)

    def validate_maintenance_notes(self, value):
        """Sanitize maintenance notes."""
        if value:
            sanitized = InputValidators.sanitize_input(value)
            if len(sanitized) > 500:
                raise serializers.ValidationError(
                    "Maintenance notes cannot exceed 500 characters"
                )
            return sanitized
        return value

    def validate(self, data):
        """Additional cross-field validation."""
        # If court is under maintenance, notes are recommended
        if data.get("is_maintenance", False) and not data.get("maintenance_notes"):
            raise serializers.ValidationError(
                {
                    "maintenance_notes": "Please provide maintenance details when marking court as under maintenance"
                }
            )

        return data


class CourtImageSerializer(serializers.Serializer):
    """Serializer for court image objects."""
    id = serializers.IntegerField()
    url = serializers.URLField()
    alt_text = serializers.CharField(required=False, allow_blank=True)
    is_primary = serializers.BooleanField()


class CourtEquipmentSerializer(serializers.Serializer):
    """Serializer for court equipment objects."""
    name = serializers.CharField()
    quantity = serializers.IntegerField()
    condition = serializers.ChoiceField(choices=['excellent', 'good', 'fair', 'poor'])


class CourtDimensionsSerializer(serializers.Serializer):
    """Serializer for court dimensions."""
    length = serializers.FloatField()
    width = serializers.FloatField()
    height = serializers.FloatField(required=False, allow_null=True)


class DayOperatingHoursSerializer(serializers.Serializer):
    """Serializer for daily operating hours."""
    start = serializers.CharField()  # Time as string (HH:MM)
    end = serializers.CharField()    # Time as string (HH:MM)
    closed = serializers.BooleanField()


class CourtOperatingHoursSerializer(serializers.Serializer):
    """Serializer for court operating hours."""
    monday = DayOperatingHoursSerializer()
    tuesday = DayOperatingHoursSerializer()
    wednesday = DayOperatingHoursSerializer()
    thursday = DayOperatingHoursSerializer()
    friday = DayOperatingHoursSerializer()
    saturday = DayOperatingHoursSerializer()
    sunday = DayOperatingHoursSerializer()


class CourtPricingSerializer(serializers.Serializer):
    """Serializer for court pricing information."""
    id = serializers.CharField()  # UUID as string
    court_id = serializers.CharField()  # UUID as string
    name = serializers.CharField()
    price_per_hour = serializers.FloatField()
    currency = serializers.CharField()
    time_slots = serializers.ListField(child=serializers.DictField())
    valid_from = serializers.CharField()  # Date as string
    valid_to = serializers.CharField(required=False, allow_null=True)  # Date as string
    is_default = serializers.BooleanField()
    is_active = serializers.BooleanField()
    created_at = serializers.CharField()  # DateTime as string
    updated_at = serializers.CharField()  # DateTime as string


class CourtDetailSerializer(CourtSerializer):
    """Extended serializer for detailed court information matching TypeScript CourtDetail interface."""
    
    # Additional fields for CourtDetail
    description = serializers.CharField(required=False, allow_blank=True)
    dimensions = CourtDimensionsSerializer(required=False)
    facilities = serializers.ListField(child=serializers.CharField(), default=list)
    equipment = CourtEquipmentSerializer(many=True, default=list)
    last_maintenance_date = serializers.SerializerMethodField()
    next_maintenance_date = serializers.SerializerMethodField()
    operating_hours = CourtOperatingHoursSerializer(required=False)
    images = CourtImageSerializer(many=True, default=list)
    current_pricing = CourtPricingSerializer(required=False, allow_null=True)
    occupancy_rate_last_30_days = serializers.SerializerMethodField()
    revenue_last_30_days = serializers.SerializerMethodField()
    
    # Maintenance information
    maintenance_status = serializers.SerializerMethodField()
    upcoming_maintenance = serializers.SerializerMethodField()
    maintenance_history_summary = serializers.SerializerMethodField()

    class Meta(CourtSerializer.Meta):
        fields = CourtSerializer.Meta.fields + [
            'description',
            'dimensions',
            'facilities',
            'equipment',
            'last_maintenance_date',
            'next_maintenance_date',
            'operating_hours',
            'images',
            'current_pricing',
            'occupancy_rate_last_30_days',
            'revenue_last_30_days',
            'maintenance_status',
            'upcoming_maintenance',
            'maintenance_history_summary',
        ]

    def get_last_maintenance_date(self, obj):
        """Get the date of the last completed maintenance."""
        last_maintenance = obj.maintenance_records.filter(
            status='completed'
        ).order_by('-completed_at').first()
        
        if last_maintenance:
            return last_maintenance.completed_at.date().isoformat()
        return None
    
    def get_next_maintenance_date(self, obj):
        """Get the date of the next scheduled maintenance."""
        next_maintenance = obj.maintenance_records.filter(
            status='scheduled',
            scheduled_date__gte=timezone.now()
        ).order_by('scheduled_date').first()
        
        if next_maintenance:
            return next_maintenance.scheduled_date.date().isoformat()
        return None
    
    def get_maintenance_status(self, obj):
        """Get current maintenance status with details."""
        from django.utils import timezone
        
        # Check for active (in-progress) maintenance
        active_maintenance = obj.maintenance_records.filter(
            status='in_progress'
        ).first()
        
        if active_maintenance:
            return {
                'status': 'in_progress',
                'title': active_maintenance.title,
                'started_at': active_maintenance.started_at.isoformat() if active_maintenance.started_at else None,
                'estimated_completion': (
                    active_maintenance.scheduled_end_date.isoformat() 
                    if active_maintenance.scheduled_end_date else None
                ),
                'assigned_to': (
                    active_maintenance.assigned_to.get_full_name() 
                    if active_maintenance.assigned_to else None
                ),
            }
        
        # Check for scheduled maintenance today
        today = timezone.now().date()
        today_maintenance = obj.maintenance_records.filter(
            status='scheduled',
            scheduled_date__date=today
        ).first()
        
        if today_maintenance:
            return {
                'status': 'scheduled_today',
                'title': today_maintenance.title,
                'scheduled_time': today_maintenance.scheduled_date.time().isoformat(),
                'assigned_to': (
                    today_maintenance.assigned_to.get_full_name() 
                    if today_maintenance.assigned_to else None
                ),
            }
        
        # Check general maintenance flag
        if obj.is_maintenance:
            return {
                'status': 'general_maintenance',
                'notes': obj.maintenance_notes,
            }
        
        return {
            'status': 'operational',
        }
    
    def get_upcoming_maintenance(self, obj):
        """Get upcoming maintenance in the next 30 days."""
        from django.utils import timezone
        from datetime import timedelta
        
        upcoming = obj.maintenance_records.filter(
            status='scheduled',
            scheduled_date__gte=timezone.now(),
            scheduled_date__lte=timezone.now() + timedelta(days=30)
        ).order_by('scheduled_date')[:5]
        
        return [{
            'id': str(record.id),
            'title': record.title,
            'scheduled_date': record.scheduled_date.isoformat(),
            'priority': record.priority,
            'maintenance_type': record.maintenance_type.name if record.maintenance_type else None,
            'estimated_duration': record.get_duration_hours(),
        } for record in upcoming]
    
    def get_maintenance_history_summary(self, obj):
        """Get maintenance history summary for the last 6 months."""
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count, Avg
        
        six_months_ago = timezone.now() - timedelta(days=180)
        
        history = obj.maintenance_records.filter(
            status='completed',
            completed_at__gte=six_months_ago
        )
        
        summary = history.aggregate(
            total_count=Count('id'),
            average_rating=Avg('quality_rating')
        )
        
        # Count by category
        categories = history.values(
            'maintenance_type__category'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        return {
            'total_completed': summary['total_count'] or 0,
            'average_quality_rating': round(summary['average_rating'] or 0, 2),
            'most_common_categories': [
                {
                    'category': cat['maintenance_type__category'],
                    'count': cat['count']
                }
                for cat in categories[:3]
            ]
        }

    def get_occupancy_rate_last_30_days(self, obj):
        """Calculate occupancy rate for last 30 days."""
        from django.utils import timezone
        from datetime import timedelta, datetime
        
        # Get reservations from last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        reservations = obj.reservations.filter(
            date__gte=thirty_days_ago.date(),
            status='confirmed'
        )
        
        # Calculate total reserved hours
        total_reserved_hours = sum([
            (datetime.combine(r.date, r.end_time) - datetime.combine(r.date, r.start_time)).seconds / 3600
            for r in reservations
        ])
        
        # Calculate total available hours (approximate)
        # Assuming 14 hours per day (7 AM to 9 PM) for 30 days
        total_available_hours = 30 * 14  # Simplified calculation
        
        if total_available_hours > 0:
            return round((total_reserved_hours / total_available_hours) * 100, 2)
        return 0.0

    def get_revenue_last_30_days(self, obj):
        """Calculate revenue for last 30 days."""
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Sum
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get total revenue from reservations
        revenue = obj.reservations.filter(
            date__gte=thirty_days_ago.date(),
            status='confirmed',
            payment_status='paid'
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        return float(revenue)

    def to_representation(self, instance):
        """Custom representation for CourtDetail fields."""
        data = super().to_representation(instance)
        
        # Provide default values for fields not in the model
        if 'description' not in data or data['description'] is None:
            data['description'] = ""
        
        if 'dimensions' not in data or data['dimensions'] is None:
            data['dimensions'] = {
                'length': 20.0,
                'width': 10.0,
                'height': None
            }
        
        if 'facilities' not in data or data['facilities'] is None:
            data['facilities'] = []
        
        if 'equipment' not in data or data['equipment'] is None:
            data['equipment'] = []
        
        if 'operating_hours' not in data or data['operating_hours'] is None:
            # Default operating hours based on club schedule
            default_hours = {
                'start': '07:00',
                'end': '23:00',
                'closed': False
            }
            data['operating_hours'] = {
                'monday': default_hours.copy(),
                'tuesday': default_hours.copy(),
                'wednesday': default_hours.copy(),
                'thursday': default_hours.copy(),
                'friday': default_hours.copy(),
                'saturday': default_hours.copy(),
                'sunday': default_hours.copy(),
            }
        
        if 'images' not in data or data['images'] is None:
            data['images'] = []
        
        # Format dates as strings
        if data.get('last_maintenance_date'):
            data['last_maintenance_date'] = str(data['last_maintenance_date'])
        
        if data.get('next_maintenance_date'):
            data['next_maintenance_date'] = str(data['next_maintenance_date'])
        
        return data


class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for Announcement model - EMERGENCY RECOVERY VERSION."""

    announcement_type_display = serializers.CharField(
        source="get_announcement_type_display", read_only=True
    )

    class Meta:
        model = Announcement
        fields = [
            "id",
            "club",
            "title",
            "content",
            "announcement_type",
            "announcement_type_display",
            "starts_at",
            "ends_at",
            "is_priority",
            "show_on_app",
            "show_on_website",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ClubSerializer(serializers.ModelSerializer):
    """Serializer for Club model - EMERGENCY RECOVERY VERSION."""

    full_address = serializers.ReadOnlyField()
    courts_count = serializers.IntegerField(source="courts.count", read_only=True)
    active_courts_count = serializers.SerializerMethodField()

    # Add validation fields
    phone = serializers.CharField(
        validators=[phone_regex], required=False, allow_blank=True
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = Club
        fields = [
            "id",
            "organization",
            "name",
            "slug",
            "description",
            "email",
            "phone",
            "website",
            "address",
            "full_address",
            "latitude",
            "longitude",
            "opening_time",
            "closing_time",
            "days_open",
            "features",
            "settings",
            "logo_url",
            "cover_image_url",
            "primary_color",
            "total_courts",
            "courts_count",
            "active_courts_count",
            "total_members",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def validate_name(self, value):
        """Validate and sanitize club name."""
        return InputValidators.sanitize_input(value)

    def validate_description(self, value):
        """Validate and sanitize description."""
        if value:
            return InputValidators.sanitize_input(value)
        return value

    def validate_phone(self, value):
        """Validate Mexican phone number."""
        if value:
            return InputValidators.validate_phone_mx(value)
        return value

    def validate_email(self, value):
        """Validate email with Mexican context."""
        return InputValidators.validate_email_mx(value)

    def validate(self, data):
        """Validate closing time is after opening time."""
        if data.get("closing_time") and data.get("opening_time"):
            if data["closing_time"] <= data["opening_time"]:
                raise serializers.ValidationError(
                    "Closing time must be after opening time."
                )
        return data

    def get_active_courts_count(self, obj):
        """Get count of active courts."""
        return obj.courts.filter(is_active=True, is_maintenance=False).count()

    def create(self, validated_data):
        """Create club and generate slug."""
        if not validated_data.get("slug"):
            from django.utils.text import slugify

            base_slug = slugify(validated_data["name"])
            slug = base_slug
            counter = 1
            while Club.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data["slug"] = slug

        return super().create(validated_data)


class TimeSlotSerializer(serializers.Serializer):
    """Serializer for individual time slots in availability responses."""
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    is_available = serializers.BooleanField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)


class DayAvailabilitySerializer(serializers.Serializer):
    """Serializer for daily availability data."""
    date = serializers.DateField()
    is_closed = serializers.BooleanField()
    time_slots = TimeSlotSerializer(many=True)


class CourtAvailabilitySerializer(serializers.Serializer):
    """Serializer for court availability response."""
    court_id = serializers.UUIDField()
    court_name = serializers.CharField()
    availability = DayAvailabilitySerializer(many=True)


class WeeklyPatternDaySerializer(serializers.Serializer):
    """Serializer for weekly pattern day data."""
    is_closed = serializers.BooleanField()
    opening_time = serializers.TimeField(allow_null=True)
    closing_time = serializers.TimeField(allow_null=True)
    typical_occupancy = serializers.FloatField()


class CourtWeeklyAvailabilitySerializer(serializers.Serializer):
    """Serializer for court weekly availability response."""
    court_id = serializers.UUIDField()
    court_name = serializers.CharField()
    weekly_pattern = serializers.DictField(child=WeeklyPatternDaySerializer())


class BulkAvailabilitySlotSerializer(serializers.Serializer):
    """Serializer for bulk availability slot input."""
    date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    is_available = serializers.BooleanField(default=True)


class BulkAvailabilityRequestSerializer(serializers.Serializer):
    """Serializer for bulk availability update request."""
    slots = BulkAvailabilitySlotSerializer(many=True)
    
    def validate_slots(self, value):
        """Validate that slots are provided."""
        if not value:
            raise serializers.ValidationError("At least one slot is required.")
        return value


class BulkAvailabilityErrorSerializer(serializers.Serializer):
    """Serializer for bulk availability errors."""
    slot = serializers.DictField()
    error = serializers.CharField()


class BulkAvailabilityResponseSerializer(serializers.Serializer):
    """Serializer for bulk availability response."""
    court_id = serializers.UUIDField()
    updated_slots = serializers.IntegerField()
    errors = BulkAvailabilityErrorSerializer(many=True)


class CourtSpecialPricingSerializer(serializers.ModelSerializer):
    """Serializer for CourtSpecialPricing model."""

    period_type_display = serializers.CharField(
        source="get_period_type_display", read_only=True
    )
    court_name = serializers.CharField(source="court.name", read_only=True)
    club_name = serializers.CharField(source="court.club.name", read_only=True)

    class Meta:
        model = CourtSpecialPricing
        fields = [
            "id",
            "court",
            "court_name",
            "club_name",
            "organization",
            "name",
            "description",
            "period_type",
            "period_type_display",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "days_of_week",
            "price_per_hour",
            "priority",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "court_name",
            "club_name",
            "period_type_display",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        """Validate and sanitize name."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Name is required")
        sanitized = InputValidators.sanitize_input(value)
        if len(sanitized) > 200:
            raise serializers.ValidationError("Name cannot exceed 200 characters")
        return sanitized

    def validate_description(self, value):
        """Validate and sanitize description."""
        if value:
            sanitized = InputValidators.sanitize_input(value)
            if len(sanitized) > 1000:
                raise serializers.ValidationError("Description cannot exceed 1000 characters")
            return sanitized
        return value

    def validate_price_per_hour(self, value):
        """Validate price."""
        return InputValidators.validate_price(value)

    def validate_priority(self, value):
        """Validate priority range."""
        if value < 1 or value > 10:
            raise serializers.ValidationError("Priority must be between 1 and 10")
        return value

    def validate_days_of_week(self, value):
        """Validate days of week."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Days of week must be a list")
        
        for day in value:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise serializers.ValidationError("Days of week must be integers between 0 and 6")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_days = []
        for day in value:
            if day not in seen:
                seen.add(day)
                unique_days.append(day)
        
        return unique_days

    def validate(self, data):
        """Cross-field validation."""
        # Validate date range
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError("End date must be after start date")

        # Validate time range
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError("End time must be after start time")

        # If one time is provided, both should be provided
        if (start_time and not end_time) or (end_time and not start_time):
            raise serializers.ValidationError("Both start_time and end_time must be provided if using time restrictions")

        return data

    def to_representation(self, instance):
        """Custom representation."""
        data = super().to_representation(instance)
        
        # Ensure UUIDs are strings
        if data.get('id'):
            data['id'] = str(data['id'])
        if data.get('court'):
            data['court'] = str(data['court'])
        if data.get('organization'):
            data['organization'] = str(data['organization'])
        
        # Ensure price is string
        if data.get('price_per_hour'):
            data['price_per_hour'] = str(data['price_per_hour'])
        
        # Format dates and times
        if data.get('start_date'):
            data['start_date'] = str(data['start_date'])
        if data.get('end_date'):
            data['end_date'] = str(data['end_date'])
        if data.get('start_time'):
            data['start_time'] = str(data['start_time'])
        if data.get('end_time'):
            data['end_time'] = str(data['end_time'])
        
        return data


class CourtSpecialPricingCreateSerializer(CourtSpecialPricingSerializer):
    """Serializer for creating special pricing periods with additional validation."""
    
    def validate(self, data):
        """Additional validation for creation."""
        data = super().validate(data)
        
        # Check for overlapping periods with same priority
        court = data.get('court')
        priority = data.get('priority', 1)
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if court and start_date and end_date:
            overlapping = CourtSpecialPricing.objects.filter(
                court=court,
                priority=priority,
                is_active=True,
                start_date__lte=end_date,
                end_date__gte=start_date
            )
            
            # Exclude current instance for updates
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
            
            if overlapping.exists():
                raise serializers.ValidationError(
                    f"A special pricing period with priority {priority} already exists for this court "
                    f"during the specified date range. Consider using a different priority level."
                )
        
        return data


class SpecialPricingPeriodSummarySerializer(serializers.Serializer):
    """Serializer for special pricing period summary in pricing responses."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    period_type = serializers.CharField()
    period_type_display = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_time = serializers.TimeField(allow_null=True)
    end_time = serializers.TimeField(allow_null=True)
    days_of_week = serializers.ListField(child=serializers.IntegerField())
    price_per_hour = serializers.DecimalField(max_digits=8, decimal_places=2)
    priority = serializers.IntegerField()
    is_active_now = serializers.SerializerMethodField()
    
    def get_is_active_now(self, obj):
        """Check if this period is currently active."""
        from django.utils import timezone
        now = timezone.now()
        today = now.date()
        current_time = now.time()
        
        return obj.is_applicable_for_datetime(today, current_time)


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for MaintenanceRecord model."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    maintenance_type_name = serializers.CharField(source='maintenance_type.name', read_only=True)
    
    class Meta:
        from .models import MaintenanceRecord
        model = MaintenanceRecord
        fields = [
            'id', 'title', 'description', 'status', 'status_display',
            'priority', 'priority_display', 'scheduled_date', 'scheduled_end_date',
            'started_at', 'completed_at', 'assigned_to', 'assigned_to_name',
            'completed_by', 'completed_by_name', 'created_by', 'created_by_name',
            'maintenance_type', 'maintenance_type_name', 'estimated_cost', 'actual_cost',
            'materials_used', 'labor_hours', 'quality_rating', 'follow_up_required',
            'follow_up_date', 'follow_up_notes', 'before_photos', 'after_photos',
            'additional_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class MaintenanceRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating MaintenanceRecord instances."""
    
    class Meta:
        from .models import MaintenanceRecord
        model = MaintenanceRecord
        fields = [
            'title', 'description', 'status', 'priority', 'scheduled_date',
            'scheduled_end_date', 'assigned_to', 'maintenance_type',
            'estimated_cost', 'materials_used', 'labor_hours',
            'follow_up_required', 'follow_up_date', 'follow_up_notes',
            'additional_notes'
        ]
    
    def validate(self, data):
        """Validate maintenance record data."""
        scheduled_date = data.get('scheduled_date')
        scheduled_end_date = data.get('scheduled_end_date')
        
        if scheduled_end_date and scheduled_date and scheduled_end_date <= scheduled_date:
            raise serializers.ValidationError({
                'scheduled_end_date': 'End date must be after start date'
            })
        
        return data


# Mobile-Optimized Serializers for the Clubs Module

class ClubMobileSerializer(serializers.ModelSerializer):
    """Mobile-optimized club serializer with minimal data for mobile apps."""
    
    subscription_status_display = serializers.CharField(source='get_subscription_status_display', read_only=True)
    business_rules = serializers.SerializerMethodField()
    theme_colors = serializers.SerializerMethodField()
    social_links = serializers.SerializerMethodField()
    is_trial_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'slug', 'email', 'phone', 'website',
            'opening_time', 'closing_time', 'days_open',
            'logo_url', 'primary_color', 'total_courts', 'total_members',
            'subscription_status', 'subscription_status_display',
            'mobile_checkin_enabled', 'push_notifications_enabled',
            'offline_mode_enabled', 'business_rules', 'theme_colors',
            'social_links', 'is_trial_expired'
        ]
        read_only_fields = ['id', 'slug', 'total_courts', 'total_members']
    
    def get_business_rules(self, obj):
        """Get mobile-optimized business rules."""
        return obj.get_business_rules()
    
    def get_theme_colors(self, obj):
        """Get theme colors for mobile app styling."""
        return obj.get_theme_colors()
    
    def get_social_links(self, obj):
        """Get social media links."""
        return obj.get_social_links()
    
    def get_is_trial_expired(self, obj):
        """Check if trial has expired."""
        return obj.is_trial_expired()


class CourtMobileSerializer(serializers.ModelSerializer):
    """Mobile-optimized court serializer."""
    
    current_price = serializers.SerializerMethodField()
    is_weather_suitable = serializers.SerializerMethodField()
    booking_restrictions = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Court
        fields = [
            'id', 'name', 'number', 'surface_type', 'court_type',
            'has_lighting', 'has_roof', 'is_maintenance',
            'price_per_hour', 'current_price', 'quality_rating',
            'utilization_rate', 'is_weather_suitable', 
            'booking_restrictions', 'availability_status'
        ]
        read_only_fields = ['id']
    
    def get_current_price(self, obj):
        """Get current effective price."""
        from django.utils import timezone
        return float(obj.get_effective_price(timezone.now()))
    
    def get_is_weather_suitable(self, obj):
        """Check if weather is suitable (would integrate with weather API)."""
        return obj.is_weather_suitable()
    
    def get_booking_restrictions(self, obj):
        """Get simplified booking restrictions for mobile."""
        restrictions = obj.get_booking_restrictions()
        return {
            'advance_days': restrictions['advance_booking_days'],
            'min_duration': restrictions['min_booking_duration'],
            'max_duration': restrictions['max_booking_duration'],
            'member_only': restrictions['member_only'],
            'requires_approval': restrictions['requires_approval']
        }
    
    def get_availability_status(self, obj):
        """Get current availability status."""
        if not obj.is_active:
            return 'inactive'
        elif obj.is_maintenance:
            return 'maintenance'
        else:
            return 'available'


class ClubOnboardingSerializer(serializers.Serializer):
    """Club onboarding data serializer."""
    
    business_hours = serializers.DictField(required=False)
    contact_info = serializers.DictField(required=False) 
    features = serializers.DictField(required=False)
    branding = serializers.DictField(required=False)
    
    def validate_business_hours(self, value):
        """Validate business hours format."""
        if value:
            required_fields = ['opening_time', 'closing_time', 'days_open']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"Missing required field: {field}")
        return value
    
    def validate_contact_info(self, value):
        """Validate contact information."""
        if value:
            if 'email' in value:
                from django.core.validators import EmailValidator
                validator = EmailValidator()
                validator(value['email'])
            
            if 'phone' in value:
                # Validate phone format
                phone = value['phone']
                if not phone.replace('+', '').replace('-', '').replace(' ', '').isdigit():
                    raise serializers.ValidationError("Invalid phone number format")
        return value


class NotificationCreateSerializer(serializers.Serializer):
    """Create notification serializer."""
    
    title = serializers.CharField(max_length=200)
    message = serializers.CharField(max_length=1000)
    target = serializers.ChoiceField(
        choices=[('staff', 'Staff'), ('members', 'Members'), ('all', 'All')],
        default='staff'
    )
    priority = serializers.ChoiceField(
        choices=[('high', 'High'), ('normal', 'Normal'), ('low', 'Low')],
        default='normal'
    )
    
    def validate_title(self, value):
        """Validate title is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty")
        return value.strip()
    
    def validate_message(self, value):
        """Validate message is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty")
        return value.strip()

