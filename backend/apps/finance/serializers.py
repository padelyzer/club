"""
Serializers for finance module.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Payment,
    PaymentRefund,
    PaymentMethod,
    PaymentIntent,
    Membership,
    Revenue
)


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for PaymentMethod model."""
    
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id',
            'type',
            'type_display',
            'is_default',
            'card_last4',
            'card_brand',
            'card_exp_month',
            'card_exp_year',
            'bank_name',
            'account_last4',
            'display_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_display_name(self, obj):
        return str(obj)


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    
    payment_type_display = serializers.CharField(
        source='get_payment_type_display',
        read_only=True
    )
    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    user_email = serializers.EmailField(
        source='user.email',
        read_only=True
    )
    club_name = serializers.CharField(
        source='club.name',
        read_only=True
    )
    can_refund = serializers.SerializerMethodField()
    refund_available = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id',
            'reference_number',
            'amount',
            'currency',
            'payment_type',
            'payment_type_display',
            'payment_method',
            'payment_method_display',
            'status',
            'status_display',
            'description',
            'club',
            'club_name',
            'user',
            'user_email',
            'client',
            'reservation',
            'external_transaction_id',
            'card_last4',
            'card_brand',
            'billing_name',
            'billing_email',
            'requires_invoice',
            'invoice_id',
            'is_refundable',
            'refund_amount',
            'can_refund',
            'refund_available',
            'processing_fee',
            'net_amount',
            'processed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'reference_number',
            'external_transaction_id',
            'net_amount',
            'processed_at',
            'created_at',
            'updated_at'
        ]
    
    def get_can_refund(self, obj):
        return obj.can_refund()
    
    def get_refund_available(self, obj):
        if obj.status == 'completed':
            return obj.amount - obj.refund_amount
        return Decimal('0')


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments."""
    
    class Meta:
        model = Payment
        fields = [
            'amount',
            'currency',
            'payment_type',
            'payment_method',
            'description',
            'client',
            'reservation',
            'membership',
            # 'class_enrollment',
            # 'tournament_registration',
            'billing_name',
            'billing_email',
            'billing_phone',
            'billing_address',
            'billing_rfc',
            'requires_invoice',
            'metadata'
        ]
    
    def validate(self, attrs):
        # Ensure at least one related object is provided
        related_fields = [
            'reservation',
            'membership',
            # 'class_enrollment',
            # 'tournament_registration'
        ]
        
        if not any(attrs.get(field) for field in related_fields):
            if attrs.get('payment_type') != 'other':
                raise serializers.ValidationError(
                    "Debe especificar el objeto relacionado al pago"
                )
        
        return attrs
    
    def create(self, validated_data):
        # Set organization and club from request context
        request = self.context.get('request')
        if request and hasattr(request, 'club'):
            validated_data['club'] = request.club
            validated_data['organization'] = request.club.organization
        
        # Set user
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        return super().create(validated_data)


class ProcessPaymentSerializer(serializers.Serializer):
    """Serializer for processing payment."""
    
    payment_method_id = serializers.CharField(
        required=False,
        help_text="ID del método de pago guardado"
    )
    gateway_token = serializers.CharField(
        required=False,
        help_text="Token del gateway de pago"
    )
    save_payment_method = serializers.BooleanField(
        default=False,
        help_text="Guardar método de pago para uso futuro"
    )


class RefundSerializer(serializers.Serializer):
    """Serializer for refund requests."""
    
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text="Monto a reembolsar (default: total)"
    )
    reason = serializers.CharField(
        required=True,
        help_text="Razón del reembolso"
    )


class PaymentRefundSerializer(serializers.ModelSerializer):
    """Serializer for PaymentRefund model."""
    
    payment_reference = serializers.CharField(
        source='payment.reference_number',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    processed_by_email = serializers.EmailField(
        source='processed_by.email',
        read_only=True
    )
    
    class Meta:
        model = PaymentRefund
        fields = [
            'id',
            'payment',
            'payment_reference',
            'amount',
            'reason',
            'status',
            'status_display',
            'gateway_refund_id',
            'processed_by',
            'processed_by_email',
            'processed_at',
            'failed_at',
            'failure_reason',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'status',
            'gateway_refund_id',
            'processed_at',
            'failed_at',
            'failure_reason',
            'created_at'
        ]


class PaymentIntentSerializer(serializers.ModelSerializer):
    """Serializer for PaymentIntent model."""
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = PaymentIntent
        fields = [
            'id',
            'intent_id',
            'amount',
            'currency',
            'status',
            'status_display',
            'customer_email',
            'customer_name',
            'customer_phone',
            'payment_method_types',
            'client_secret',
            'expires_at',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'intent_id',
            'status',
            'client_secret',
            'expires_at',
            'created_at'
        ]


class PaymentIntentCreateSerializer(serializers.Serializer):
    """Serializer for creating payment intent."""
    
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True
    )
    currency = serializers.CharField(
        default='MXN',
        required=False
    )
    customer_email = serializers.EmailField(required=True)
    customer_name = serializers.CharField(required=True)
    customer_phone = serializers.CharField(required=False)
    payment_method_types = serializers.ListField(
        child=serializers.CharField(),
        default=['card', 'oxxo', 'spei'],
        required=False
    )
    reservation_data = serializers.JSONField(
        required=False,
        help_text="Datos de la reserva si aplica"
    )
    metadata = serializers.JSONField(
        required=False,
        help_text="Metadata adicional"
    )


class RevenueSerializer(serializers.ModelSerializer):
    """Serializer for Revenue model."""
    
    club_name = serializers.CharField(
        source='club.name',
        read_only=True
    )
    payment_reference = serializers.CharField(
        source='payment.reference_number',
        read_only=True
    )
    
    class Meta:
        model = Revenue
        fields = [
            'id',
            'date',
            'concept',
            'description',
            'amount',
            'payment_method',
            'reference',
            'club',
            'club_name',
            'payment',
            'payment_reference',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MembershipSerializer(serializers.ModelSerializer):
    """Serializer for Membership model."""
    
    club_name = serializers.CharField(
        source='club.name',
        read_only=True
    )
    
    class Meta:
        model = Membership
        fields = [
            'id',
            'name',
            'club',
            'club_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']