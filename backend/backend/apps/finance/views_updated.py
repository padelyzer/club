"""
Payment API views.
"""

from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.finance.models import Payment, PaymentIntent, PaymentMethod
from apps.finance.serializers import (
    PaymentSerializer,
    PaymentIntentSerializer,
    PaymentMethodSerializer,
    ProcessPaymentSerializer,
    RefundSerializer
)
from apps.finance.services import PaymentService, ReconciliationService
from apps.shared.permissions import IsOwnerOrStaff


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for payment operations."""
    
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by user's organization."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Filter by organization
        if hasattr(user, 'current_organization'):
            queryset = queryset.filter(organization=user.current_organization)
        
        # Filter by club if specified
        club_id = self.request.query_params.get('club')
        if club_id:
            queryset = queryset.filter(club_id=club_id)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                created_at__date__range=[start_date, end_date]
            )
        
        return queryset.select_related(
            'organization', 'club', 'user', 'client', 'reservation'
        )
    
    @extend_schema(
        request=ProcessPaymentSerializer,
        responses={200: PaymentSerializer}
    )
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process a pending payment."""
        payment = self.get_object()
        
        if payment.status != 'pending':
            return Response(
                {'error': 'Payment is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProcessPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Process payment
        success, message = PaymentService.process_payment(
            payment,
            serializer.validated_data
        )
        
        if success:
            payment.refresh_from_db()
            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        request=RefundSerializer,
        responses={200: {'description': 'Refund processed'}}
    )
    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Refund a payment."""
        payment = self.get_object()
        
        serializer = RefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            refund = PaymentService.refund_payment(
                payment,
                amount=serializer.validated_data.get('amount'),
                reason=serializer.validated_data['reason'],
                user=request.user
            )
            
            return Response(
                {
                    'message': 'Refund processed successfully',
                    'refund_id': str(refund.id),
                    'amount': str(refund.amount)
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get daily payment summary."""
        date = request.query_params.get('date', timezone.now().date())
        club_id = request.query_params.get('club')
        
        payments = Payment.objects.filter(
            processed_at__date=date,
            status='completed'
        )
        
        if club_id:
            payments = payments.filter(club_id=club_id)
        
        if hasattr(request.user, 'current_organization'):
            payments = payments.filter(
                organization=request.user.current_organization
            )
        
        # Calculate summary
        summary = {
            'date': date,
            'total_payments': payments.count(),
            'total_amount': sum(p.amount for p in payments),
            'total_fees': sum(p.processing_fee for p in payments),
            'net_amount': sum(p.net_amount for p in payments),
            'by_method': {},
            'by_type': {}
        }
        
        # Group by payment method
        for payment in payments:
            method = payment.get_payment_method_display()
            if method not in summary['by_method']:
                summary['by_method'][method] = {
                    'count': 0,
                    'amount': Decimal('0')
                }
            summary['by_method'][method]['count'] += 1
            summary['by_method'][method]['amount'] += payment.amount
            
            # Group by type
            ptype = payment.get_payment_type_display()
            if ptype not in summary['by_type']:
                summary['by_type'][ptype] = {
                    'count': 0,
                    'amount': Decimal('0')
                }
            summary['by_type'][ptype]['count'] += 1
            summary['by_type'][ptype]['amount'] += payment.amount
        
        return Response(summary)


class PaymentIntentViewSet(viewsets.ModelViewSet):
    """ViewSet for payment intents."""
    
    queryset = PaymentIntent.objects.all()
    serializer_class = PaymentIntentSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """Create a new payment intent."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create intent
        intent = PaymentService.create_payment_intent(
            amount=serializer.validated_data['amount'],
            customer_email=serializer.validated_data['customer_email'],
            customer_name=serializer.validated_data['customer_name'],
            metadata=serializer.validated_data.get('metadata', {})
        )
        
        return Response(
            PaymentIntentSerializer(intent).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a payment intent."""
        intent = self.get_object()
        
        try:
            intent.confirm(
                payment_method_id=request.data.get('payment_method_id')
            )
            
            return Response(
                PaymentIntentSerializer(intent).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a payment intent."""
        intent = self.get_object()
        
        try:
            intent.cancel()
            
            return Response(
                PaymentIntentSerializer(intent).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """ViewSet for payment methods."""
    
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    
    def get_queryset(self):
        """Get user's payment methods."""
        return self.request.user.payment_methods.filter(is_active=True)
    
    def create(self, request):
        """Save a new payment method."""
        payment_method_id = request.data.get('payment_method_id')
        set_as_default = request.data.get('set_as_default', False)
        
        try:
            payment_method = PaymentService.save_payment_method(
                user=request.user,
                payment_method_id=payment_method_id,
                set_as_default=set_as_default
            )
            
            return Response(
                PaymentMethodSerializer(payment_method).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set payment method as default."""
        payment_method = self.get_object()
        payment_method.is_default = True
        payment_method.save()
        
        return Response(
            PaymentMethodSerializer(payment_method).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def charge(self, request, pk=None):
        """Charge using this payment method."""
        payment_method = self.get_object()
        
        amount = Decimal(request.data.get('amount', '0'))
        description = request.data.get('description', '')
        
        if amount <= 0:
            return Response(
                {'error': 'Invalid amount'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            payment = PaymentService.charge_with_saved_method(
                user=request.user,
                amount=amount,
                payment_method=payment_method,
                description=description,
                organization=request.user.current_organization,
                club_id=request.data.get('club_id')
            )
            
            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
