# Generated manually - adds only missing fields
from django.db import migrations, models
import django.db.models.deletion
from django.core.validators import MinValueValidator, MaxValueValidator


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0005_alter_reservation_player_email'),
        ('clients', '0001_initial'),
    ]

    operations = [
        # Add missing fields only - skip fields that already exist
        migrations.AddField(
            model_name='reservation',
            name='duration_minutes',
            field=models.IntegerField(default=60, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='reservation',
            name='reservation_type',
            field=models.CharField(
                choices=[
                    ('single', 'Individual'),
                    ('recurring', 'Recurrente'),
                    ('tournament', 'Torneo'),
                    ('class', 'Clase'),
                    ('maintenance', 'Mantenimiento'),
                    ('blocked', 'Bloqueado')
                ],
                default='single',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='client_profile',
            field=models.ForeignKey(
                blank=True,
                help_text='Cliente registrado (si aplica)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reservations',
                to='clients.clientprofile'
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='guest_count',
            field=models.IntegerField(default=0, help_text='Número de invitados no registrados'),
        ),
        migrations.AddField(
            model_name='reservation',
            name='special_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Precio especial si difiere del estándar',
                max_digits=8,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='discount_percentage',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                validators=[
                    MinValueValidator(0),
                    MaxValueValidator(100)
                ]
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='discount_reason',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='reservation',
            name='cancellation_policy',
            field=models.CharField(
                choices=[
                    ('flexible', 'Flexible - Sin costo hasta 2 horas antes'),
                    ('moderate', 'Moderada - 50% hasta 6 horas antes'),
                    ('strict', 'Estricta - 100% sin reembolso'),
                    ('custom', 'Personalizada')
                ],
                default='flexible',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='cancellation_deadline',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='cancellation_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name='reservation',
            name='requires_invoice',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reservation',
            name='invoice_data',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='invoice_status',
            field=models.CharField(
                choices=[
                    ('not_required', 'No requerida'),
                    ('pending', 'Pendiente'),
                    ('generated', 'Generada'),
                    ('sent', 'Enviada'),
                    ('cancelled', 'Cancelada')
                ],
                default='not_required',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='is_recurring',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reservation',
            name='recurrence_pattern',
            field=models.CharField(
                blank=True,
                choices=[
                    ('daily', 'Diario'),
                    ('weekly', 'Semanal'),
                    ('biweekly', 'Quincenal'),
                    ('monthly', 'Mensual')
                ],
                max_length=20,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='recurrence_end_date',
            field=models.DateField(blank=True, help_text='Fecha de fin para reservas recurrentes', null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='parent_reservation',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='recurring_instances',
                to='reservations.reservation'
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='on_wait_list',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reservation',
            name='wait_list_position',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='no_show',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reservation',
            name='no_show_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name='reservation',
            name='booking_source',
            field=models.CharField(
                choices=[
                    ('web', 'Sitio Web'),
                    ('mobile', 'App Móvil'),
                    ('phone', 'Teléfono'),
                    ('walkin', 'En Persona'),
                    ('admin', 'Administrador'),
                    ('api', 'API Externa')
                ],
                default='web',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='reservation',
            name='confirmation_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reservation',
            name='reminder_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reservation',
            name='checked_in_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='internal_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='additional_services',
            field=models.JSONField(blank=True, default=dict),
        ),
        
        # Update existing fields
        migrations.AlterField(
            model_name='reservation',
            name='player_count',
            field=models.IntegerField(
                default=4,
                validators=[
                    MinValueValidator(1),
                    MaxValueValidator(12)
                ]
            ),
        ),
        
        # Make price_per_hour nullable
        migrations.AlterField(
            model_name='reservation',
            name='price_per_hour',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Precio por hora al momento de la reserva',
                max_digits=8,
                null=True
            ),
        ),
        
        # Update total_price field
        migrations.AlterField(
            model_name='reservation',
            name='total_price',
            field=models.DecimalField(
                decimal_places=2,
                max_digits=8,
                validators=[MinValueValidator(0)]
            ),
        ),
        
        # Update payment_status choices
        migrations.AlterField(
            model_name='reservation',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pendiente'),
                    ('partial', 'Parcial'),
                    ('paid', 'Pagado'),
                    ('refunded', 'Reembolsado'),
                    ('failed', 'Fallido')
                ],
                default='pending',
                max_length=20
            ),
        ),
        
        # Update status choices
        migrations.AlterField(
            model_name='reservation',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pendiente'),
                    ('confirmed', 'Confirmada'),
                    ('completed', 'Completada'),
                    ('cancelled', 'Cancelada'),
                    ('no_show', 'No se presentó')
                ],
                default='pending',
                max_length=20
            ),
        ),
        
        # Update BlockedSlot model
        migrations.AddField(
            model_name='blockedslot',
            name='is_recurring',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='blockedslot',
            name='recurrence_pattern',
            field=models.JSONField(blank=True, help_text='Pattern for recurring blocks', null=True),
        ),
        
        # Add description field to BlockedSlot
        migrations.AddField(
            model_name='blockedslot',
            name='description',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        
        # Remove block_type field if it exists - we'll use reason instead
        migrations.RemoveField(
            model_name='blockedslot',
            name='block_type',
        ),
        
        # Update reason field choices
        migrations.AlterField(
            model_name='blockedslot',
            name='reason',
            field=models.CharField(
                choices=[
                    ('maintenance', 'Mantenimiento'),
                    ('tournament', 'Torneo'),
                    ('private_event', 'Evento Privado'),
                    ('weather', 'Clima'),
                    ('other', 'Otro')
                ],
                max_length=20
            ),
        ),
        
        # Add new indexes
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['club', 'date', 'status'], name='reservatio_club_id_2a9e7f_idx'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['court', 'date', 'start_time'], name='reservatio_court_i_4b1c2a_idx'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['status', 'payment_status'], name='reservatio_status_8c9f1a_idx'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['created_by', 'date'], name='reservatio_created_9f2c8b_idx'),
        ),
        
        # Add constraint
        migrations.AddConstraint(
            model_name='reservation',
            constraint=models.UniqueConstraint(
                condition=models.Q(status__in=['pending', 'confirmed']),
                fields=['court', 'date', 'start_time', 'end_time'],
                name='unique_court_time_slot'
            ),
        ),
    ]