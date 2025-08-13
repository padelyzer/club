# Generated manually for payment models update

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import uuid
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
        ('root', '0001_initial'),
        ('clubs', '0001_initial'),
        ('reservations', '0001_initial'),
        ('auth', '0001_initial'),
    ]

    operations = [
        # Create new Payment model
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('currency', models.CharField(default='MXN', max_length=3)),
                ('payment_type', models.CharField(choices=[('reservation', 'Reserva de Cancha'), ('membership', 'Membresía'), ('class', 'Clase'), ('tournament', 'Torneo'), ('product', 'Producto'), ('service', 'Servicio'), ('penalty', 'Penalización'), ('other', 'Otro')], max_length=20)),
                ('payment_method', models.CharField(choices=[('cash', 'Efectivo'), ('card', 'Tarjeta'), ('transfer', 'Transferencia'), ('stripe', 'Stripe'), ('paypal', 'PayPal'), ('oxxo', 'OXXO'), ('spei', 'SPEI'), ('credit', 'Crédito'), ('courtesy', 'Cortesía')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pendiente'), ('processing', 'Procesando'), ('completed', 'Completado'), ('failed', 'Fallido'), ('cancelled', 'Cancelado'), ('refunded', 'Reembolsado'), ('partial_refund', 'Reembolso Parcial'), ('disputed', 'Disputado')], default='pending', max_length=20)),
                ('reference_number', models.CharField(blank=True, help_text='Internal reference number', max_length=100)),
                ('external_transaction_id', models.CharField(blank=True, help_text='Payment gateway transaction ID', max_length=200)),
                ('gateway', models.CharField(blank=True, help_text='Payment gateway used (stripe, paypal, etc)', max_length=50)),
                ('gateway_response', models.JSONField(blank=True, default=dict, help_text='Full gateway response data')),
                ('card_last4', models.CharField(blank=True, max_length=4)),
                ('card_brand', models.CharField(blank=True, max_length=20)),
                ('card_country', models.CharField(blank=True, max_length=2)),
                ('billing_name', models.CharField(blank=True, max_length=200)),
                ('billing_email', models.EmailField(blank=True, max_length=254)),
                ('billing_phone', models.CharField(blank=True, max_length=20)),
                ('billing_address', models.TextField(blank=True)),
                ('billing_rfc', models.CharField(blank=True, help_text='RFC for invoice', max_length=13)),
                ('requires_invoice', models.BooleanField(default=False)),
                ('invoice_id', models.CharField(blank=True, max_length=100)),
                ('invoice_url', models.URLField(blank=True)),
                ('invoice_sent_at', models.DateTimeField(blank=True, null=True)),
                ('is_refundable', models.BooleanField(default=True)),
                ('refund_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('refund_reason', models.TextField(blank=True)),
                ('refunded_at', models.DateTimeField(blank=True, null=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('failed_at', models.DateTimeField(blank=True, null=True)),
                ('failure_reason', models.TextField(blank=True)),
                ('description', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Additional payment metadata')),
                ('processing_fee', models.DecimalField(decimal_places=2, default=0, help_text='Gateway processing fee', max_digits=10)),
                ('net_amount', models.DecimalField(decimal_places=2, default=0, help_text='Amount after fees', max_digits=10)),
                ('reconciled', models.BooleanField(default=False)),
                ('reconciled_at', models.DateTimeField(blank=True, null=True)),
                ('reconciliation_notes', models.TextField(blank=True)),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='clients.clientprofile')),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='clubs.club')),
                # ('membership', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='finance.membership')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='finance_payments', to='root.organization')),
                ('refunded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='refunds_processed', to='auth.user')),
                ('reservation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='reservations.reservation')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='auth.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        
        # Create PaymentRefund model
        migrations.CreateModel(
            name='PaymentRefund',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pendiente'), ('processing', 'Procesando'), ('completed', 'Completado'), ('failed', 'Fallido')], default='pending', max_length=20)),
                ('gateway_refund_id', models.CharField(blank=True, max_length=200)),
                ('gateway_response', models.JSONField(blank=True, default=dict)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('failed_at', models.DateTimeField(blank=True, null=True)),
                ('failure_reason', models.TextField(blank=True)),
                ('payment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='refunds', to='finance.payment')),
                ('processed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='refunds_created', to='auth.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        
        # Create PaymentIntent model
        migrations.CreateModel(
            name='PaymentIntent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('intent_id', models.CharField(editable=False, max_length=100, unique=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('currency', models.CharField(default='MXN', max_length=3)),
                ('status', models.CharField(choices=[('requires_payment_method', 'Requiere Método de Pago'), ('requires_confirmation', 'Requiere Confirmación'), ('requires_action', 'Requiere Acción'), ('processing', 'Procesando'), ('requires_capture', 'Requiere Captura'), ('cancelled', 'Cancelado'), ('succeeded', 'Exitoso')], default='requires_payment_method', max_length=30)),
                ('customer_email', models.EmailField(max_length=254)),
                ('customer_name', models.CharField(max_length=200)),
                ('customer_phone', models.CharField(blank=True, max_length=20)),
                ('payment_method_types', models.JSONField(default=list, help_text='Allowed payment method types')),
                ('reservation_data', models.JSONField(blank=True, help_text='Reservation data if payment is for reservation', null=True)),
                ('gateway', models.CharField(default='stripe', max_length=50)),
                ('gateway_intent_id', models.CharField(blank=True, max_length=200)),
                ('client_secret', models.CharField(blank=True, max_length=200)),
                ('expires_at', models.DateTimeField()),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        
        # Create Revenue model
        migrations.CreateModel(
            name='Revenue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('date', models.DateField()),
                ('concept', models.CharField(max_length=50)),
                ('description', models.TextField()),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_method', models.CharField(max_length=20)),
                ('reference', models.CharField(max_length=100)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revenues', to='root.organization')),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revenues', to='clubs.club')),
                ('payment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='revenue_records', to='finance.payment')),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        
        # Update existing PaymentMethod model
        migrations.RemoveField(
            model_name='paymentmethod',
            name='is_enabled',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='requires_approval',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='processing_fee_percentage',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='processing_fee_fixed',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='min_amount',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='max_amount',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='available_days',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='available_hours',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='gateway_config',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='instructions',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='display_order',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='payment_type',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='name',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='description',
        ),
        migrations.RemoveField(
            model_name='paymentmethod',
            name='club',
        ),
        
        migrations.AddField(
            model_name='paymentmethod',
            name='type',
            field=models.CharField(choices=[('card', 'Tarjeta'), ('bank_account', 'Cuenta Bancaria'), ('paypal', 'PayPal')], max_length=20, default='card'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='is_default',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='card_last4',
            field=models.CharField(blank=True, max_length=4),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='card_brand',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='card_exp_month',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='card_exp_year',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='card_country',
            field=models.CharField(blank=True, max_length=2),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='account_last4',
            field=models.CharField(blank=True, max_length=4),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='account_holder_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='gateway',
            field=models.CharField(max_length=50, default='stripe'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='gateway_customer_id',
            field=models.CharField(max_length=200, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='gateway_payment_method_id',
            field=models.CharField(max_length=200, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='paymentmethod',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_methods', to='auth.user', null=True),
            preserve_default=False,
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['organization', 'status', 'created_at'], name='finance_pay_organiz_f4e8e8_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['club', 'payment_type', 'created_at'], name='finance_pay_club_id_3e8d1f_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['reference_number'], name='finance_pay_referen_c7b9d9_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['external_transaction_id'], name='finance_pay_externa_e43c3f_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['status', 'processed_at'], name='finance_pay_status_8f7e8d_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentintent',
            index=models.Index(fields=['intent_id'], name='finance_pay_intent__6a2e4f_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentintent',
            index=models.Index(fields=['status', 'expires_at'], name='finance_pay_status_f2d8a9_idx'),
        ),
    ]