"""
Views for reservations module - EMERGENCY RECOVERY VERSION.
Simplified version focusing on core functionality.
"""

from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.clubs.models import Club, Court
from core.permissions import IsOrganizationMember

from .models import BlockedSlot, Reservation, ReservationPayment
from .serializers import (
    AvailabilityCheckSerializer,
    BlockedSlotSerializer,
    CheckInSerializer,
    ProcessPaymentSerializer,
    ReservationCreateSerializer,
    ReservationPaymentSerializer,
    ReservationSerializer,
    ReservationWithPaymentsSerializer,
)


class ReservationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing reservations - EMERGENCY RECOVERY VERSION."""

    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        """Filter reservations based on user permissions."""
        user = self.request.user
        queryset = Reservation.objects.select_related(
            "club", "court", "created_by", "organization"
        )

        # Filter by user's organization if available
        if hasattr(user, "organization") and user.organization:
            queryset = queryset.filter(organization=user.organization)
        elif user.is_superuser:
            # Superusers can see all
            pass
        else:
            # Regular users can only see their own reservations
            queryset = queryset.filter(created_by=user)

        # Filter by club if specified
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by date
        date = self.request.query_params.get("date")
        if date:
            queryset = queryset.filter(date=date)

        # Filter by date range
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by court
        court_id = self.request.query_params.get("court")
        if court_id:
            queryset = queryset.filter(court_id=court_id)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == "create":
            return ReservationCreateSerializer
        elif self.action in ["retrieve", "list"] and self.request.query_params.get("include_payments"):
            return ReservationWithPaymentsSerializer
        return ReservationSerializer

    def perform_create(self, serializer):
        """Set created_by and organization when creating reservation."""
        user = self.request.user
        save_kwargs = {"created_by": user}
        
        # Debug print
        print(f"Creating reservation with data: {self.request.data}")
        print(f"User: {user}, Organization: {getattr(user, 'organization', None)}")

        # Set organization if available
        if hasattr(user, "organization") and user.organization:
            save_kwargs["organization"] = user.organization
        elif "club" in serializer.validated_data:
            # Use club's organization
            save_kwargs["organization"] = serializer.validated_data["club"].organization

        try:
            serializer.save(**save_kwargs)
        except Exception as e:
            print(f"Error saving reservation: {e}")
            print(f"Serializer errors: {serializer.errors}")
            raise
    
    def create(self, request, *args, **kwargs):
        """Override create to return full serializer response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return the created object with the appropriate serializer
        instance = serializer.instance
        if instance.is_split_payment and request.query_params.get('include_payments'):
            # Reload with payments
            instance = Reservation.objects.prefetch_related('split_payments').get(id=instance.id)
            output_serializer = ReservationWithPaymentsSerializer(instance)
        else:
            output_serializer = ReservationSerializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a reservation."""
        reservation = self.get_object()

        # Check if reservation can be cancelled
        if not reservation.can_cancel():
            return Response(
                {"error": "Cannot cancel this reservation"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cancel reservation
        reason = request.data.get("reason", "")
        reservation.cancel(request.user, reason)

        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def check_availability(self, request):
        """Check court availability for a specific date and time."""
        serializer = AvailabilityCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        club = data["club"]
        date = data["date"]

        # Get courts
        if "court" in data:
            courts = [data["court"]]
        else:
            courts = Court.objects.filter(
                club=club, is_active=True, is_maintenance=False
            )

        availability = []

        for court in courts:
            # Get existing reservations
            reservations = (
                Reservation.objects.filter(
                    court=court, date=date, status__in=["pending", "confirmed"]
                )
                .order_by("start_time")
                .values("start_time", "end_time")
            )

            # Get blocked slots
            blocked_slots = BlockedSlot.objects.filter(
                start_datetime__date=date, is_active=True
            ).filter(Q(court=court) | Q(court__isnull=True, club=club))

            # Get club schedule for the day
            day_of_week = date.weekday()
            schedule = club.schedules.filter(
                weekday=day_of_week, is_active=True
            ).first()

            if schedule and not schedule.is_closed:
                opening_time = schedule.opening_time
                closing_time = schedule.closing_time
            else:
                opening_time = club.opening_time
                closing_time = club.closing_time

            # Generate time slots
            slots = []
            current_time = datetime.combine(date, opening_time)
            end_time = datetime.combine(date, closing_time)

            while current_time < end_time:
                slot_end = current_time + timedelta(hours=1)

                # Check if slot is available
                is_available = True
                reason = None

                # Check if in the past
                current_aware = timezone.make_aware(
                    current_time, timezone.get_current_timezone()
                )
                if current_aware < timezone.now():
                    is_available = False
                    reason = "past"

                # Check reservations
                if is_available:
                    for reservation in reservations:
                        res_start = datetime.combine(date, reservation["start_time"])
                        res_end = datetime.combine(date, reservation["end_time"])

                        if current_time < res_end and slot_end > res_start:
                            is_available = False
                            reason = "reserved"
                            break

                # Check blocked slots
                if is_available:
                    for blocked in blocked_slots:
                        if blocked.affects_slot(
                            date, current_time.time(), slot_end.time()
                        ):
                            is_available = False
                            reason = f"blocked: {blocked.reason}"
                            break

                slots.append(
                    {
                        "start_time": current_time.time().strftime("%H:%M"),
                        "end_time": slot_end.time().strftime("%H:%M"),
                        "is_available": is_available,
                        "reason": reason,
                        "price": float(court.price_per_hour),
                    }
                )

                current_time = slot_end

            court_availability = {
                "court": {
                    "id": str(court.id),
                    "name": court.name,
                    "price_per_hour": float(court.price_per_hour),
                },
                "slots": slots,
            }

            availability.append(court_availability)

        return Response({"date": date, "availability": availability})

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        """Get reservation calendar for a month."""
        club_id = request.query_params.get("club")
        month = request.query_params.get("month")  # YYYY-MM

        if not club_id or not month:
            return Response(
                {"error": "club and month parameters required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            year, month_num = map(int, month.split("-"))
            start_date = datetime(year, month_num, 1).date()

            # Get last day of month
            if month_num == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month_num + 1, 1).date() - timedelta(days=1)
        except:
            return Response(
                {"error": "Invalid month format. Use YYYY-MM"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get reservation counts by date
        reservations = (
            Reservation.objects.filter(
                club_id=club_id,
                date__gte=start_date,
                date__lte=end_date,
                status__in=["pending", "confirmed"],
            )
            .values("date", "court_id")
            .distinct()
        )

        # Build calendar data
        calendar_data = {}
        current_date = start_date

        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")

            # Count reservations for this date
            day_reservations = [r for r in reservations if r["date"] == current_date]

            calendar_data[date_str] = {
                "date": date_str,
                "day_of_week": current_date.weekday(),
                "reservation_count": len(day_reservations),
                "is_past": current_date < timezone.now().date(),
            }

            current_date += timedelta(days=1)

        return Response(calendar_data)

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        """Check-in a reservation."""
        reservation = self.get_object()

        # Check if reservation can be checked in
        if reservation.status != "confirmed":
            return Response(
                {"error": "Only confirmed reservations can be checked in"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reservation.is_past:
            return Response(
                {"error": "Cannot check in past reservations"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update reservation status
        reservation.status = "completed"
        reservation.save()

        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def register_payment(self, request, pk=None):
        """Register payment for a reservation."""
        reservation = self.get_object()

        # Validate payment data
        payment_method = request.data.get("payment_method")
        payment_amount = request.data.get("payment_amount")

        if not payment_method:
            return Response(
                {"error": "payment_method is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payment_amount = float(payment_amount) if payment_amount else reservation.total_price
        except ValueError:
            return Response(
                {"error": "Invalid payment amount"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update payment status
        reservation.payment_status = "paid"
        reservation.payment_method = payment_method
        reservation.payment_amount = payment_amount
        reservation.paid_at = timezone.now()
        reservation.save()

        serializer = self.get_serializer(reservation)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Confirm a pending reservation."""
        reservation = self.get_object()
        
        # Check if reservation can be confirmed
        if reservation.status != "pending":
            return Response(
                {"error": "Only pending reservations can be confirmed"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Update reservation status
        reservation.status = "confirmed"
        reservation.save()
        
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def check_conflicts(self, request):
        """Check if a time slot has conflicts."""
        court_id = request.data.get("court")
        date = request.data.get("date")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")
        exclude_reservation = request.data.get("exclude_reservation")

        if not all([court_id, date, start_time, end_time]):
            return Response(
                {"error": "court, date, start_time, and end_time are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build query
        conflicts = Reservation.objects.filter(
            court_id=court_id,
            date=date,
            status__in=["pending", "confirmed"],
        )

        if exclude_reservation:
            conflicts = conflicts.exclude(id=exclude_reservation)

        # Check for time overlaps
        conflicting_reservations = []
        for reservation in conflicts:
            # Check if times overlap
            if (
                (start_time >= str(reservation.start_time) and start_time < str(reservation.end_time)) or
                (end_time > str(reservation.start_time) and end_time <= str(reservation.end_time)) or
                (start_time <= str(reservation.start_time) and end_time >= str(reservation.end_time))
            ):
                conflicting_reservations.append(reservation)

        has_conflicts = len(conflicting_reservations) > 0
        
        return Response({
            "has_conflicts": has_conflicts,
            "conflicts": ReservationSerializer(conflicting_reservations, many=True).data
        })


class ReservationPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing split reservation payments."""
    
    serializer_class = ReservationPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'payment_token'
    
    def get_queryset(self):
        """Filter payments based on user permissions."""
        user = self.request.user
        queryset = ReservationPayment.objects.select_related(
            'reservation', 'reservation__club', 'reservation__court'
        )
        
        # Users can see payments for their own reservations
        if not user.is_superuser:
            queryset = queryset.filter(reservation__created_by=user)
        
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def process_payment(self, request, payment_token=None):
        """
        Process a payment using the payment token.
        
        SECURITY NOTE: This endpoint intentionally allows anonymous access
        for payment processing via shared links. The payment_token serves
        as the authentication mechanism.
        """
        try:
            payment = ReservationPayment.objects.get(payment_token=payment_token)
        except ReservationPayment.DoesNotExist:
            return Response(
                {"error": "Invalid payment token"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if payment.is_paid:
            return Response(
                {"error": "This payment has already been processed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProcessPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Update payment info
        payment.player_name = data['player_name']
        payment.player_email = data['player_email']
        payment.player_phone = data.get('player_phone', '')
        payment.payment_link_accessed_at = timezone.now()
        
        # Process payment
        payment.process_payment(
            payment_method=data['payment_method'],
            payment_intent=data.get('stripe_payment_intent')
        )
        
        # Check if all payments are complete
        reservation = payment.reservation
        if reservation.payment_progress['percentage'] == 100:
            reservation.payment_status = 'paid'
            reservation.save()
        
        # Return updated payment info
        output_serializer = ReservationPaymentSerializer(payment)
        return Response(output_serializer.data)
    
    @action(detail=False, methods=['post'])
    def check_in_with_code(self, request):
        """Check in using a 6-digit code."""
        serializer = CheckInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        check_in_code = serializer.validated_data['check_in_code']
        
        try:
            payment = ReservationPayment.objects.get(check_in_code=check_in_code)
        except ReservationPayment.DoesNotExist:
            return Response(
                {"error": "Invalid check-in code"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not payment.can_check_in:
            return Response(
                {"error": "Cannot check in: Payment not completed or already checked in"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process check-in
        payment.check_in(user=request.user)
        
        # Return updated payment info
        output_serializer = ReservationPaymentSerializer(payment)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def payment_info(self, request, payment_token=None):
        """
        Get payment information using payment token (public endpoint).
        
        SECURITY NOTE: This endpoint intentionally allows anonymous access
        for payment info retrieval via shared links. The payment_token serves
        as the authentication mechanism. Only non-sensitive payment data is exposed.
        """
        try:
            payment = ReservationPayment.objects.select_related(
                'reservation', 'reservation__club', 'reservation__court'
            ).get(payment_token=payment_token)
        except ReservationPayment.DoesNotExist:
            return Response(
                {"error": "Invalid payment token"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Mark payment link as accessed
        if not payment.payment_link_accessed_at:
            payment.payment_link_accessed_at = timezone.now()
            payment.save()
        
        # Return payment info
        data = {
            'id': str(payment.id),
            'amount': float(payment.amount),
            'is_paid': payment.is_paid,
            'reservation': {
                'id': str(payment.reservation.id),
                'club_name': payment.reservation.club.name,
                'court_name': payment.reservation.court.name,
                'date': payment.reservation.date,
                'start_time': payment.reservation.start_time.strftime('%H:%M'),
                'end_time': payment.reservation.end_time.strftime('%H:%M'),
                'total_price': float(payment.reservation.total_price),
                'split_count': payment.reservation.split_count
            }
        }
        
        if payment.is_paid:
            data['payment_method'] = payment.payment_method
            data['paid_at'] = payment.paid_at
            data['check_in_code'] = payment.check_in_code
        
        return Response(data)


class BlockedSlotViewSet(viewsets.ModelViewSet):
    """ViewSet for managing blocked time slots - EMERGENCY RECOVERY VERSION."""

    serializer_class = BlockedSlotSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        """Filter blocked time slots."""
        user = self.request.user
        queryset = BlockedSlot.objects.select_related(
            "club", "court", "created_by", "organization"
        )

        # Filter by user's organization if available
        if hasattr(user, "organization") and user.organization:
            queryset = queryset.filter(organization=user.organization)
        elif not user.is_superuser:
            # Non-superusers without organization see nothing
            queryset = queryset.none()

        # Filter by club
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by date range
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(start_datetime__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_datetime__date__lte=date_to)

        return queryset

    def perform_create(self, serializer):
        """Set created_by and organization when creating blocked slot."""
        user = self.request.user
        save_kwargs = {"created_by": user}

        # Set organization if available
        if hasattr(user, "organization") and user.organization:
            save_kwargs["organization"] = user.organization
        elif "club" in serializer.validated_data:
            # Use club's organization
            save_kwargs["organization"] = serializer.validated_data["club"].organization

        serializer.save(**save_kwargs)

