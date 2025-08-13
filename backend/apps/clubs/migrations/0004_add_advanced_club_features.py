# Generated migration for advanced club features
# This migration adds all the new fields for mobile app support,
# multi-location management, subscription handling, and advanced features

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clubs', '0003_court_images'),
    ]

    operations = [
        # Add advanced Club fields
        migrations.AddField(
            model_name='club',
            name='onboarding_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='club',
            name='onboarding_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='club',
            name='parent_club',
            field=models.ForeignKey(
                blank=True,
                help_text='For multi-location clubs',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='locations',
                to='clubs.club'
            ),
        ),
        migrations.AddField(
            model_name='club',
            name='is_main_location',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='club',
            name='location_code',
            field=models.CharField(
                blank=True, 
                help_text='Internal location identifier', 
                max_length=10
            ),
        ),
        migrations.AddField(
            model_name='club',
            name='subscription_status',
            field=models.CharField(
                choices=[
                    ('trial', 'Trial'),
                    ('active', 'Active'),
                    ('past_due', 'Past Due'),
                    ('cancelled', 'Cancelled'),
                    ('suspended', 'Suspended')
                ],
                default='trial',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='club',
            name='subscription_plan',
            field=models.CharField(
                default='basic',
                help_text='Subscription plan type',
                max_length=50
            ),
        ),
        migrations.AddField(
            model_name='club',
            name='trial_ends_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='club',
            name='max_staff_count',
            field=models.IntegerField(default=5),
        ),
        migrations.AddField(
            model_name='club',
            name='analytics_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='club',
            name='public_analytics',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='club',
            name='mobile_checkin_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='club',
            name='push_notifications_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='club',
            name='offline_mode_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='club',
            name='advance_booking_days',
            field=models.IntegerField(default=30),
        ),
        migrations.AddField(
            model_name='club',
            name='cancellation_deadline_hours',
            field=models.IntegerField(default=24),
        ),
        migrations.AddField(
            model_name='club',
            name='min_booking_duration_minutes',
            field=models.IntegerField(default=60),
        ),
        migrations.AddField(
            model_name='club',
            name='max_booking_duration_minutes',
            field=models.IntegerField(default=180),
        ),
        migrations.AddField(
            model_name='club',
            name='weather_integration_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='club',
            name='calendar_sync_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='club',
            name='theme_color_secondary',
            field=models.CharField(default='#43A047', max_length=7),
        ),
        migrations.AddField(
            model_name='club',
            name='theme_color_accent',
            field=models.CharField(default='#FF5722', max_length=7),
        ),
        migrations.AddField(
            model_name='club',
            name='custom_css',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='club',
            name='meta_title',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='club',
            name='meta_description',
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name='club',
            name='social_facebook',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='club',
            name='social_instagram',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='club',
            name='social_twitter',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='club',
            name='social_whatsapp',
            field=models.CharField(blank=True, max_length=20),
        ),
        
        # Add advanced Court fields
        migrations.AddField(
            model_name='court',
            name='dynamic_pricing_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='court',
            name='peak_hours_multiplier',
            field=models.DecimalField(decimal_places=2, default=1.0, max_digits=4),
        ),
        migrations.AddField(
            model_name='court',
            name='weekend_multiplier',
            field=models.DecimalField(decimal_places=2, default=1.0, max_digits=4),
        ),
        migrations.AddField(
            model_name='court',
            name='dimensions',
            field=models.JSONField(
                default=dict,
                help_text='Court dimensions in meters: {width: 10, length: 20, height: 6}'
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='court_type',
            field=models.CharField(
                choices=[
                    ('indoor', 'Interior'),
                    ('outdoor', 'Exterior'),
                    ('covered', 'Techado'),
                    ('semi_covered', 'Semi-techado')
                ],
                default='indoor',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='equipment_included',
            field=models.JSONField(
                default=list,
                help_text='List of included equipment: rackets, balls, towels, etc.'
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='amenities',
            field=models.JSONField(
                default=list,
                help_text='List of amenities: shower, lockers, parking, etc.'
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='weather_dependent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='court',
            name='min_temperature',
            field=models.IntegerField(
                blank=True,
                help_text='Minimum temperature in Celsius',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='max_temperature',
            field=models.IntegerField(
                blank=True,
                help_text='Maximum temperature in Celsius',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='utilization_rate',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Current utilization rate percentage',
                max_digits=5
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='last_utilization_update',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='court',
            name='advance_booking_days',
            field=models.IntegerField(
                blank=True,
                help_text='Override club setting for this court',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='min_booking_duration',
            field=models.IntegerField(
                blank=True,
                help_text='Minimum booking duration in minutes',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='max_booking_duration',
            field=models.IntegerField(
                blank=True,
                help_text='Maximum booking duration in minutes',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='member_only',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='court',
            name='requires_approval',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='court',
            name='skill_level_required',
            field=models.CharField(
                choices=[
                    ('beginner', 'Principiante'),
                    ('intermediate', 'Intermedio'),
                    ('advanced', 'Avanzado'),
                    ('professional', 'Profesional'),
                    ('any', 'Cualquier nivel')
                ],
                default='any',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='quality_rating',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Average quality rating from 0-5',
                max_digits=3
            ),
        ),
        migrations.AddField(
            model_name='court',
            name='total_ratings',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='court',
            name='availability_template',
            field=models.JSONField(
                default=dict,
                help_text='Weekly availability template with time slots'
            ),
        ),
    ]