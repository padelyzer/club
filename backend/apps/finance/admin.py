"""
Admin configuration for finance module.
"""

from django.contrib import admin
from django.db.models import Sum
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    Payment,
    PaymentRefund,
    PaymentMethod,
    PaymentIntent
)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Admin configuration for Payment model."""
    
    list_display = [
        'reference_number',
        'payment_type',
        'payment_method',
        'amount_display',
        'status_badge',
        'user',
        'created_at',
        'processed_at'
    ]
    
    list_filter = [
        'status',
        'payment_type',
        'payment_method',
        'club',
        'created_at',
        'processed_at'
    ]
    
    search_fields = [
        'reference_number',
        'external_transaction_id',
        'user__email',
        'user__username',
        'billing_email',
        'billing_name',
        'description'
    ]
    
    readonly_fields = [
        'id',
        'reference_number',
        'external_transaction_id',
        'gateway_response',
        'net_amount',
        'created_at',
        'updated_at',
        'processed_at',
        'failed_at',
        'refunded_at',
        'reconciled_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'id',
                'reference_number',
                'organization',
                'club',
                'user',
                'client',
                'payment_type',
                'payment_method',
                'status'
            )
        }),
        ('Amount Details', {
            'fields': (
                'amount',
                'currency',
                'processing_fee',
                'net_amount'
            )
        }),
        ('Related Objects', {
            'fields': (
                'reservation',
                'membership',
                'class_enrollment',
                'tournament_registration'
            ),
            'classes': ('collapse',)
        }),
        ('Transaction Details', {
            'fields': (
                'external_transaction_id',
                'gateway',
                'gateway_response',
                'card_last4',
                'card_brand'
            ),
            'classes': ('collapse',)
        }),
        ('Billing Information', {
            'fields': (
                'billing_name',
                'billing_email',
                'billing_phone',
                'billing_address',
                'billing_rfc'
            ),
            'classes': ('collapse',)
        }),
        ('Invoice', {
            'fields': (
                'requires_invoice',
                'invoice_id',
                'invoice_url',
                'invoice_sent_at'
            ),
            'classes': ('collapse',)
        }),
        ('Refund Information', {
            'fields': (
                'is_refundable',
                'refund_amount',
                'refund_reason',
                'refunded_at',
                'refunded_by'
            ),
            'classes': ('collapse',)
        }),
        ('Processing Info', {
            'fields': (
                'processed_at',
                'failed_at',
                'failure_reason',
                'reconciled',
                'reconciled_at',
                'reconciliation_notes'
            ),
            'classes': ('collapse',)
        }),
        ('Additional Info', {
            'fields': (
                'description',
                'notes',
                'metadata',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        })
    )
    
    def amount_display(self, obj):
        return f"${obj.amount:,.2f} {obj.currency}"
    amount_display.short_description = "Amount"
    
    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'processing': 'blue',
            'completed': 'green',
            'failed': 'red',
            'cancelled': 'gray',
            'refunded': 'purple',
            'partial_refund': 'purple',
            'disputed': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'organization',
            'club',
            'user',
            'client',
            'reservation',
            'refunded_by'
        )
    
    actions = ['mark_as_reconciled', 'export_to_csv']
    
    def mark_as_reconciled(self, request, queryset):
        """Mark selected payments as reconciled."""
        count = 0
        for payment in queryset.filter(status='completed', reconciled=False):
            payment.reconcile()
            count += 1
        
        self.message_user(
            request,
            f"{count} payment(s) marked as reconciled."
        )
    mark_as_reconciled.short_description = "Mark selected as reconciled"
    
    def export_to_csv(self, request, queryset):
        """Export selected payments to CSV."""
        # TODO: Implement CSV export
        pass
    export_to_csv.short_description = "Export to CSV"


@admin.register(PaymentRefund)
class PaymentRefundAdmin(admin.ModelAdmin):
    """Admin configuration for PaymentRefund model."""
    
    list_display = [
        'payment',
        'amount',
        'status',
        'processed_by',
        'created_at',
        'processed_at'
    ]
    
    list_filter = [
        'status',
        'created_at',
        'processed_at'
    ]
    
    search_fields = [
        'payment__reference_number',
        'gateway_refund_id',
        'reason'
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'processed_at',
        'failed_at'
    ]


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    """Admin configuration for PaymentMethod model."""
    
    list_display = [
        '__str__',
        'user',
        'type',
        'is_default',
        'gateway',
        'created_at'
    ]
    
    list_filter = [
        'type',
        'is_default',
        'gateway',
        'created_at'
    ]
    
    search_fields = [
        'user__email',
        'user__username',
        'card_last4',
        'account_last4'
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at'
    ]


@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    """Admin configuration for PaymentIntent model."""
    
    list_display = [
        'intent_id',
        'amount',
        'status',
        'customer_email',
        'created_at',
        'expires_at'
    ]
    
    list_filter = [
        'status',
        'gateway',
        'created_at',
        'expires_at'
    ]
    
    search_fields = [
        'intent_id',
        'gateway_intent_id',
        'customer_email',
        'customer_name'
    ]
    
    readonly_fields = [
        'intent_id',
        'created_at',
        'updated_at',
        'confirmed_at',
        'cancelled_at'
    ]