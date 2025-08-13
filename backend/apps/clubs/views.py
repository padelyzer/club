"""
Views for clubs module - EMERGENCY RECOVERY VERSION.
"""

import datetime
from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.db.models import Count, Q, Sum, F, DurationField
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrganizationMember, IsOwnerOrReadOnly, HasClubAccessBySlug
from core.pagination import StandardResultsSetPagination

from .court_actions import CourtActionsMixin
from .models import Announcement, Club, Court, Schedule, CourtSpecialPricing
from .optimizations import (
    CourtAvailabilityOptimizer, 
    ClubRevenueOptimizer, 
    WeatherIntegrationOptimizer,
    MaintenanceScheduleOptimizer
)
from .serializers import (
    AnnouncementSerializer,
    ClubSerializer,
    CourtSerializer,
    CourtDetailSerializer,
    ScheduleSerializer,
    CourtSpecialPricingSerializer,
    CourtSpecialPricingCreateSerializer,
    SpecialPricingPeriodSummarySerializer,
)


class ClubViewSet(viewsets.ModelViewSet):
    """ViewSet for managing clubs - EMERGENCY RECOVERY VERSION."""

    serializer_class = ClubSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    lookup_field = "slug"
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Filter clubs by user's club membership."""
        user = self.request.user

        # Base queryset
        queryset = Club.objects.select_related("organization").prefetch_related(
            "courts", "schedules"
        )

        # Filter by user's club membership
        if user.is_superuser:
            # Superusers can see all clubs
            pass
        elif user.club:
            # Users can only see their own club
            queryset = queryset.filter(id=user.club.id)
        elif hasattr(user, "organization") and user.organization:
            # Legacy: Users can see clubs from their organization OR clubs they own by email
            queryset = queryset.filter(
                Q(organization=user.organization) | Q(email=user.email)
            )
        else:
            # No club and no organization = only clubs owned by email
            queryset = queryset.filter(email=user.email)

        # Apply filters
        if self.request.query_params.get("is_active"):
            queryset = queryset.filter(
                is_active=self.request.query_params.get("is_active") == "true"
            )

        # Search
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # Filter by email (for club owners)
        email = self.request.query_params.get("email")
        if email:
            queryset = queryset.filter(email=email)

        return queryset

    @action(detail=False, methods=["get"], url_path="by-slug/(?P<slug>[^/.]+)")
    def get_by_slug(self, request, slug=None):
        """Get club by slug."""
        try:
            club = self.get_queryset().get(slug=slug)
            serializer = self.get_serializer(club)
            return Response(serializer.data)
        except Club.DoesNotExist:
            return Response(
                {"error": "Club not found"}, status=status.HTTP_404_NOT_FOUND
            )

    def perform_create(self, serializer):
        """Ensure club belongs to user's organization."""
        if not self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You must belong to an organization to create clubs."
            )
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=["get"], url_path="dashboard-stats", 
            permission_classes=[IsAuthenticated, HasClubAccessBySlug])
    def dashboard_stats(self, request, slug=None):
        """Get dashboard statistics for a specific club."""
        club = self.get_object()
        today = timezone.now().date()
        
        # Import here to avoid circular imports
        from apps.reservations.models import Reservation
        from apps.finance.models import Transaction
        from apps.clients.models import ClientProfile
        
        try:
            # Today's reservations count
            today_reservations = Reservation.objects.filter(
                club=club,
                date=today,
                status__in=['confirmed', 'pending']
            ).count()
            
            # Calculate percentage change vs last month
            last_month_start = today.replace(day=1) - timedelta(days=1)
            last_month_start = last_month_start.replace(day=1)
            last_month_end = today.replace(day=1) - timedelta(days=1)
            
            last_month_reservations = Reservation.objects.filter(
                club=club,
                date__gte=last_month_start,
                date__lte=last_month_end,
                status__in=['confirmed', 'pending']
            ).count()
            
            # Calculate daily average for last month
            days_in_last_month = (last_month_end - last_month_start).days + 1
            last_month_daily_avg = last_month_reservations / days_in_last_month if days_in_last_month > 0 else 0
            
            # Calculate percentage change
            if last_month_daily_avg > 0:
                reservations_change = ((today_reservations - last_month_daily_avg) / last_month_daily_avg) * 100
            else:
                reservations_change = 100 if today_reservations > 0 else 0
            
            # Upcoming reservations (next 2-3 reservations)
            upcoming_reservations = Reservation.objects.filter(
                club=club,
                date__gte=today,
                status__in=['confirmed', 'pending']
            ).select_related('court').order_by('date', 'start_time')[:3]
            
            upcoming_data = []
            for reservation in upcoming_reservations:
                upcoming_data.append({
                    'id': reservation.id,
                    'player_name': reservation.player_name,
                    'court': reservation.court.name,
                    'date': reservation.date.isoformat(),
                    'start_time': reservation.start_time.strftime('%H:%M'),
                    'end_time': reservation.end_time.strftime('%H:%M'),
                    'status': reservation.status,
                    'player_count': reservation.player_count
                })
            
            # Recent activity (last 5 activities)
            recent_activities = []
            
            # Recent reservations
            recent_reservations = Reservation.objects.filter(
                club=club,
                created_at__gte=today - timedelta(days=7)
            ).select_related('court').order_by('-created_at')[:3]
            
            for reservation in recent_reservations:
                recent_activities.append({
                    'type': 'reservation',
                    'description': f'Nueva reserva de {reservation.player_name} para {reservation.court.name}',
                    'timestamp': reservation.created_at.isoformat(),
                    'user': reservation.player_name,
                    'details': {
                        'court': reservation.court.name,
                        'date': reservation.date.isoformat(),
                        'time': reservation.start_time.strftime('%H:%M')
                    }
                })
            
            # Recent payments
            recent_payments = Transaction.objects.filter(
                club=club,
                transaction_type='income',
                status='completed',
                transaction_date__gte=timezone.now() - timedelta(days=7)
            ).order_by('-transaction_date')[:2]
            
            for payment in recent_payments:
                recent_activities.append({
                    'type': 'payment',
                    'description': f'Pago recibido: ${float(payment.amount):.2f}',
                    'timestamp': payment.transaction_date.isoformat(),
                    'user': payment.user.get_full_name() if payment.user else 'Cliente',
                    'details': {
                        'amount': float(payment.amount),
                        'payment_method': payment.payment_method.name if payment.payment_method else 'N/A',
                        'category': payment.get_category_display()
                    }
                })
            
            # Recent client registrations (if any)
            recent_clients = ClientProfile.objects.filter(
                club=club,
                created_at__gte=today - timedelta(days=7)
            ).select_related('user').order_by('-created_at')[:2]
            
            for client in recent_clients:
                recent_activities.append({
                    'type': 'client_registration',
                    'description': f'Nuevo cliente registrado: {client.user.get_full_name()}',
                    'timestamp': client.created_at.isoformat(),
                    'user': client.user.get_full_name(),
                    'details': {
                        'level': client.level.display_name if client.level else 'Sin nivel',
                        'email': client.user.email
                    }
                })
            
            # Sort recent activities by timestamp (most recent first)
            recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
            recent_activities = recent_activities[:5]  # Limit to 5 most recent
            
            # Get active courts count
            total_courts = club.get_active_courts_count()
            
            # Get active members count and calculate change
            from apps.clients.models import ClientProfile
            current_members = ClientProfile.objects.filter(
                organization=club.organization,
                is_active=True
            ).distinct().count()
            
            # Calculate active members change vs last month
            previous_month_start = last_month_start
            previous_month_end = last_month_end
            
            # Get members who were active last month
            last_month_members = ClientProfile.objects.filter(
                organization=club.organization,
                is_active=True,
                created_at__lte=previous_month_end
            ).distinct().count()
            
            # Calculate percentage change in active members
            if last_month_members > 0:
                active_members_change = ((current_members - last_month_members) / last_month_members) * 100
            else:
                active_members_change = 100 if current_members > 0 else 0
            
            # Calculate occupancy for today and last month comparison
            total_court_hours = total_courts * 12  # Assuming 12 hours of operation
            
            # Today's occupancy
            reserved_hours_today = Reservation.objects.filter(
                club=club,
                date=today,
                status__in=['confirmed', 'pending']
            ).aggregate(
                total_hours=models.Sum(
                    models.F('end_time') - models.F('start_time'),
                    output_field=models.DurationField()
                )
            )['total_hours']
            
            if reserved_hours_today and total_court_hours > 0:
                # Convert duration to hours
                reserved_hours_float = reserved_hours_today.total_seconds() / 3600
                average_occupancy = (reserved_hours_float / total_court_hours) * 100
            else:
                average_occupancy = 0
            
            # Last month's average occupancy
            last_month_reservations = Reservation.objects.filter(
                club=club,
                date__gte=last_month_start,
                date__lte=last_month_end,
                status__in=['confirmed', 'pending']
            ).aggregate(
                total_hours=models.Sum(
                    models.F('end_time') - models.F('start_time'),
                    output_field=models.DurationField()
                )
            )['total_hours']
            
            if last_month_reservations:
                last_month_hours_float = last_month_reservations.total_seconds() / 3600
                last_month_daily_occupancy = (last_month_hours_float / (days_in_last_month * total_court_hours)) * 100 if (days_in_last_month * total_court_hours) > 0 else 0
                
                # Calculate occupancy change
                if last_month_daily_occupancy > 0:
                    occupancy_change = ((average_occupancy - last_month_daily_occupancy) / last_month_daily_occupancy) * 100
                else:
                    occupancy_change = 100 if average_occupancy > 0 else 0
            else:
                occupancy_change = 100 if average_occupancy > 0 else 0
            
            # Calculate revenue metrics
            current_month_start = today.replace(day=1)
            current_month_revenue = Transaction.objects.filter(
                club=club,
                transaction_type='income',
                status='completed',
                transaction_date__gte=current_month_start,
                transaction_date__lte=today
            ).aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')
            
            last_month_revenue = Transaction.objects.filter(
                club=club,
                transaction_type='income',
                status='completed',
                transaction_date__gte=last_month_start,
                transaction_date__lte=last_month_end
            ).aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')
            
            # Calculate revenue change
            if last_month_revenue > 0:
                # Normalize to daily average for comparison
                current_days = (today - current_month_start).days + 1
                last_month_days = (last_month_end - last_month_start).days + 1
                
                current_daily_avg = current_month_revenue / current_days if current_days > 0 else Decimal('0')
                last_month_daily_avg = last_month_revenue / last_month_days if last_month_days > 0 else Decimal('0')
                
                if last_month_daily_avg > 0:
                    revenue_change = float(((current_daily_avg - last_month_daily_avg) / last_month_daily_avg) * 100)
                else:
                    revenue_change = 100 if current_daily_avg > 0 else 0
            else:
                revenue_change = 100 if current_month_revenue > 0 else 0
            
            return Response({
                'today_reservations': today_reservations,
                'today_reservations_change': round(reservations_change, 1),
                'total_courts': total_courts,
                'active_members': current_members,
                'active_members_change': round(active_members_change, 1),
                'average_occupancy': round(average_occupancy, 1),
                'occupancy_change': round(occupancy_change, 1),
                'current_month_revenue': float(current_month_revenue),
                'revenue_change': round(revenue_change, 1),
                'last_month_revenue': float(last_month_revenue),
                'upcoming_reservations': upcoming_data,
                'recent_activity': recent_activities,
                'generated_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error generating dashboard stats: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"], url_path="mobile-dashboard")
    def mobile_dashboard(self, request, pk=None):
        """
        Mobile-optimized club dashboard with essential data only.
        
        Returns key metrics, upcoming events, and notifications in a
        format optimized for mobile consumption.
        """
        club = self.get_object()
        today = timezone.now().date()
        now = timezone.now()
        
        try:
            # Import models
            from apps.reservations.models import Reservation
            from apps.finance.models import Transaction
            
            # Essential mobile data only
            mobile_data = {
                'club': {
                    'id': str(club.id),
                    'name': club.name,
                    'slug': club.slug,
                    'phone': club.phone,
                    'opening_time': club.opening_time.strftime('%H:%M') if club.opening_time else None,
                    'closing_time': club.closing_time.strftime('%H:%M') if club.closing_time else None,
                },
                'today_stats': {
                    'reservations_count': Reservation.objects.filter(
                        club=club,
                        date=today,
                        status__in=['confirmed', 'pending']
                    ).count(),
                    'active_courts': club.courts.filter(is_active=True).count(),
                    'occupancy_rate': 0,  # Will be calculated
                },
                'notifications': [],  # Placeholder for push notifications
                'quick_actions': [
                    {'action': 'view_reservations', 'label': 'View Today\'s Bookings'},
                    {'action': 'court_status', 'label': 'Court Status'},
                    {'action': 'member_checkin', 'label': 'Member Check-in'},
                ],
                'last_updated': now.isoformat()
            }
            
            return Response(mobile_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error loading mobile dashboard: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def send_notification(self, request, pk=None):
        """
        Send push notification to club staff and members.
        
        Payload:
        {
            "title": "Notification title",
            "message": "Notification body",
            "target": "staff|members|all",
            "priority": "high|normal|low"
        }
        """
        club = self.get_object()
        
        title = request.data.get('title', '')
        message = request.data.get('message', '')
        target = request.data.get('target', 'staff')
        priority = request.data.get('priority', 'normal')
        
        if not title or not message:
            return Response(
                {'error': 'Title and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create notification record
            from apps.notifications.models import Notification
            
            notification = Notification.objects.create(
                title=title,
                message=message,
                club=club,
                sender=request.user,
                target_audience=target,
                priority=priority,
                created_at=timezone.now()
            )
            
            # TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
            # This would send actual push notifications to mobile devices
            
            return Response({
                'notification_id': str(notification.id),
                'status': 'sent',
                'target': target,
                'sent_at': notification.created_at.isoformat()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error sending notification: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def analytics_summary(self, request, pk=None):
        """
        Club analytics summary optimized for mobile display.
        
        Returns key performance indicators and trends.
        """
        club = self.get_object()
        
        # Date range (default: last 30 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        try:
            from apps.reservations.models import Reservation
            from apps.finance.models import Transaction
            
            # Key metrics
            reservations = Reservation.objects.filter(
                club=club,
                created_at__gte=start_date,
                created_at__lte=end_date
            )
            
            revenue = Transaction.objects.filter(
                club=club,
                transaction_type='income',
                status='completed',
                transaction_date__gte=start_date.date(),
                transaction_date__lte=end_date.date()
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            analytics_data = {
                'period': {
                    'start_date': start_date.date().isoformat(),
                    'end_date': end_date.date().isoformat(),
                    'days': 30
                },
                'kpis': {
                    'total_bookings': reservations.count(),
                    'confirmed_bookings': reservations.filter(status='confirmed').count(),
                    'cancelled_bookings': reservations.filter(status='cancelled').count(),
                    'total_revenue': float(revenue),
                    'avg_booking_value': float(revenue / reservations.count() if reservations.count() > 0 else 0),
                },
                'trends': {
                    'booking_trend': 'up',  # Simplified - would calculate actual trend
                    'revenue_trend': 'up',
                    'occupancy_trend': 'stable'
                },
                'top_courts': list(
                    reservations.values('court__name')
                    .annotate(booking_count=models.Count('id'))
                    .order_by('-booking_count')[:3]
                ),
                'generated_at': timezone.now().isoformat()
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error generating analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def member_management(self, request, pk=None):
        """
        Member management interface data for club staff.
        
        Returns member stats, recent activity, and management tools.
        """
        club = self.get_object()
        
        try:
            from apps.clients.models import ClientProfile
            from apps.reservations.models import Reservation
            
            # Get club members (users with recent reservations)
            recent_date = timezone.now() - timedelta(days=90)  # 3 months
            
            active_members = ClientProfile.objects.filter(
                user__reservations__club=club,
                user__reservations__created_at__gte=recent_date
            ).distinct()
            
            member_data = {
                'stats': {
                    'total_active_members': active_members.count(),
                    'new_members_this_month': active_members.filter(
                        created_at__gte=timezone.now() - timedelta(days=30)
                    ).count(),
                    'member_retention_rate': 85,  # Placeholder - would calculate actual
                },
                'recent_activity': list(
                    Reservation.objects.filter(
                        club=club,
                        created_at__gte=timezone.now() - timedelta(days=7)
                    ).select_related('user')
                    .values(
                        'user__email',
                        'user__first_name',
                        'user__last_name',
                        'created_at',
                        'status'
                    ).order_by('-created_at')[:10]
                ),
                'member_tools': [
                    {'action': 'member_search', 'label': 'Search Members'},
                    {'action': 'send_announcement', 'label': 'Send Announcement'},
                    {'action': 'membership_reports', 'label': 'Membership Reports'},
                    {'action': 'member_checkin', 'label': 'Check-in Members'},
                ]
            }
            
            return Response(member_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error loading member data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def financial_summary(self, request, pk=None):
        """
        Financial summary for club management.
        
        Returns revenue, costs, and profitability metrics.
        """
        club = self.get_object()
        
        # Date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        try:
            from apps.finance.models import Transaction
            
            # Revenue calculation
            revenue_data = Transaction.objects.filter(
                club=club,
                transaction_type='income',
                status='completed',
                transaction_date__gte=start_date.date(),
                transaction_date__lte=end_date.date()
            ).aggregate(
                total_revenue=models.Sum('amount'),
                transaction_count=models.Count('id'),
                avg_transaction=models.Avg('amount')
            )
            
            # Cost calculation (placeholder - would integrate with expense tracking)
            estimated_costs = float(revenue_data['total_revenue'] or 0) * 0.3  # 30% of revenue
            
            financial_data = {
                'period': {
                    'start_date': start_date.date().isoformat(),
                    'end_date': end_date.date().isoformat()
                },
                'revenue': {
                    'total': float(revenue_data['total_revenue'] or 0),
                    'transactions': revenue_data['transaction_count'] or 0,
                    'average_transaction': float(revenue_data['avg_transaction'] or 0),
                },
                'costs': {
                    'estimated_total': estimated_costs,
                    'breakdown': {
                        'staff': estimated_costs * 0.6,
                        'maintenance': estimated_costs * 0.2,
                        'utilities': estimated_costs * 0.15,
                        'other': estimated_costs * 0.05,
                    }
                },
                'profitability': {
                    'gross_profit': float(revenue_data['total_revenue'] or 0) - estimated_costs,
                    'margin_percentage': ((float(revenue_data['total_revenue'] or 0) - estimated_costs) / 
                                        float(revenue_data['total_revenue'] or 1)) * 100,
                },
                'generated_at': timezone.now().isoformat()
            }
            
            return Response(financial_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error generating financial summary: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def setup_onboarding(self, request, pk=None):
        """
        Complete club onboarding setup.
        
        Handles initial configuration for new clubs.
        """
        club = self.get_object()
        
        try:
            onboarding_data = request.data
            
            # Update club with onboarding information
            if 'business_hours' in onboarding_data:
                hours = onboarding_data['business_hours']
                club.opening_time = hours.get('opening_time', club.opening_time)
                club.closing_time = hours.get('closing_time', club.closing_time)
                club.days_open = hours.get('days_open', club.days_open)
            
            if 'contact_info' in onboarding_data:
                contact = onboarding_data['contact_info']
                club.email = contact.get('email', club.email)
                club.phone = contact.get('phone', club.phone)
                club.website = contact.get('website', club.website)
            
            if 'features' in onboarding_data:
                features = onboarding_data['features']
                club.features = {**club.features, **features}
            
            club.onboarding_completed = True
            club.onboarding_completed_at = timezone.now()
            club.save()
            
            return Response({
                'status': 'completed',
                'club_id': str(club.id),
                'onboarding_completed_at': club.onboarding_completed_at.isoformat(),
                'next_steps': [
                    'Add courts to your club',
                    'Configure pricing',
                    'Invite staff members',
                    'Test booking system'
                ]
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error completing onboarding: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def offline_data(self, request, pk=None):
        """
        Essential data for offline mobile app functionality.
        
        Returns minimal data set that mobile apps can cache for offline use.
        """
        club = self.get_object()
        
        try:
            # Essential offline data
            offline_data = {
                'club_info': {
                    'id': str(club.id),
                    'name': club.name,
                    'slug': club.slug,
                    'phone': club.phone,
                    'email': club.email,
                    'address': club.address,
                    'opening_time': club.opening_time.strftime('%H:%M') if club.opening_time else None,
                    'closing_time': club.closing_time.strftime('%H:%M') if club.closing_time else None,
                    'days_open': club.days_open,
                },
                'courts': list(
                    club.courts.filter(is_active=True).values(
                        'id', 'name', 'court_type', 'hourly_rate', 'features'
                    )
                ),
                'pricing_rules': {
                    'base_rates': {},  # Would populate with actual pricing
                    'special_rates': {},
                    'member_discounts': {},
                },
                'business_rules': {
                    'advance_booking_days': 30,
                    'cancellation_hours': 24,
                    'min_booking_duration': 60,
                    'max_booking_duration': 180,
                },
                'last_sync': timezone.now().isoformat(),
                'data_version': 1  # For cache invalidation
            }
            
            return Response(offline_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error generating offline data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def court_availability_optimization(self, request, pk=None):
        """
        Get optimized court availability suggestions.
        
        Query params:
        - date: Target date (YYYY-MM-DD, default: tomorrow)
        - duration: Booking duration in minutes (default: 90)
        """
        club = self.get_object()
        
        # Parse query parameters
        date_str = request.query_params.get('date')
        duration = int(request.query_params.get('duration', 90))
        
        try:
            if date_str:
                target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = timezone.now().date() + timedelta(days=1)
            
            optimizer = CourtAvailabilityOptimizer(club)
            suggestions = optimizer.suggest_availability_slots(target_date, duration)
            
            return Response({
                'target_date': target_date.isoformat(),
                'duration_minutes': duration,
                'suggestions': suggestions,
                'total_suggestions': len(suggestions),
                'generated_at': timezone.now().isoformat()
            })
            
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating availability optimization: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def revenue_optimization_analysis(self, request, pk=None):
        """
        Get revenue optimization analysis for the club.
        
        Query params:
        - days: Number of days to analyze (default: 30)
        """
        club = self.get_object()
        
        try:
            days = int(request.query_params.get('days', 30))
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days)
            
            revenue_optimizer = ClubRevenueOptimizer(club)
            analysis = revenue_optimizer.calculate_revenue_potential((start_date, end_date))
            
            return Response(analysis)
            
        except ValueError:
            return Response(
                {'error': 'Invalid days parameter. Must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating revenue analysis: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def weather_impact_analysis(self, request, pk=None):
        """
        Get weather impact analysis for outdoor courts.
        
        Query params:
        - date: Target date (YYYY-MM-DD, default: today)
        """
        club = self.get_object()
        
        try:
            date_str = request.query_params.get('date')
            
            if date_str:
                target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = timezone.now().date()
            
            weather_optimizer = WeatherIntegrationOptimizer(club)
            
            # In a real implementation, you would fetch weather data from an API
            weather_data = {
                'temperature': 25,
                'condition': 'clear',
                'humidity': 60,
                'wind_speed': 5
            }
            
            analysis = weather_optimizer.get_weather_adjusted_availability(target_date, weather_data)
            
            return Response(analysis)
            
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating weather analysis: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def maintenance_optimization(self, request, pk=None):
        """
        Get optimal maintenance windows for club courts.
        
        Query params:
        - court_id: Specific court ID (optional)
        - duration: Maintenance duration in hours (default: 4)
        - days: Number of days to analyze (default: 14)
        """
        club = self.get_object()
        
        try:
            court_id = request.query_params.get('court_id')
            duration = int(request.query_params.get('duration', 4))
            days = int(request.query_params.get('days', 14))
            
            end_date = timezone.now().date() + timedelta(days=days)
            start_date = timezone.now().date()
            
            maintenance_optimizer = MaintenanceScheduleOptimizer(club)
            
            if court_id:
                try:
                    court = club.courts.get(id=court_id)
                    windows = maintenance_optimizer.find_optimal_maintenance_windows(
                        court, duration, (start_date, end_date)
                    )
                    
                    return Response({
                        'court_id': str(court.id),
                        'court_name': court.name,
                        'maintenance_duration_hours': duration,
                        'analysis_period': {
                            'start_date': start_date.isoformat(),
                            'end_date': end_date.isoformat()
                        },
                        'optimal_windows': windows[:10],  # Top 10 recommendations
                        'generated_at': timezone.now().isoformat()
                    })
                    
                except Court.DoesNotExist:
                    return Response(
                        {'error': 'Court not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Analyze all courts
                all_courts_analysis = {}
                
                for court in club.courts.filter(is_active=True):
                    windows = maintenance_optimizer.find_optimal_maintenance_windows(
                        court, duration, (start_date, end_date)
                    )
                    
                    all_courts_analysis[str(court.id)] = {
                        'court_name': court.name,
                        'top_windows': windows[:5],  # Top 5 per court
                    }
                
                return Response({
                    'maintenance_duration_hours': duration,
                    'analysis_period': {
                        'start_date': start_date.isoformat(),
                        'end_date': end_date.isoformat()
                    },
                    'courts_analysis': all_courts_analysis,
                    'generated_at': timezone.now().isoformat()
                })
            
        except ValueError:
            return Response(
                {'error': 'Invalid parameter values. Check duration and days.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating maintenance optimization: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CourtViewSet(CourtActionsMixin, viewsets.ModelViewSet):
    """ViewSet for managing courts - EMERGENCY RECOVERY VERSION."""

    serializer_class = CourtSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == 'retrieve':
            return CourtDetailSerializer
        return CourtSerializer

    def get_queryset(self):
        """Filter courts by organization and club."""
        user = self.request.user

        # Base queryset
        queryset = Court.objects.select_related("club")

        # Filter by organization
        if user.is_superuser:
            # Superusers can see all courts
            pass
        else:
            # Get user's organization from various sources
            user_org = None
            
            # Try client_profile first
            if hasattr(user, 'client_profile') and user.client_profile and user.client_profile.organization:
                user_org = user.client_profile.organization
            # Try direct organization attribute
            elif hasattr(user, "organization") and user.organization:
                user_org = user.organization
            
            if user_org:
                queryset = queryset.filter(club__organization=user_org)
            else:
                # For staff users without org, show all courts for testing
                if user.is_staff:
                    pass  # Show all courts
                else:
                    # No organization = no courts
                    queryset = queryset.none()

        # Filter by club
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by active status
        if self.request.query_params.get("is_active"):
            queryset = queryset.filter(
                is_active=self.request.query_params.get("is_active") == "true"
            )

        return queryset

    def perform_create(self, serializer):
        """Ensure club belongs to user's organization."""
        club = serializer.validated_data["club"]
        if not self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You must belong to an organization to create courts."
            )
        if club.organization != self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You can only create courts for clubs in your organization."
            )
        serializer.save(organization=self.request.user.organization)

        # Update club's court count
        club.total_courts = club.courts.filter(is_active=True).count()
        club.save(update_fields=["total_courts"])

    @action(detail=True, methods=["post"])
    def toggle_maintenance(self, request, pk=None):
        """Toggle maintenance mode for a court."""
        court = self.get_object()
        court.is_maintenance = not court.is_maintenance
        court.maintenance_notes = request.data.get("reason", "")
        court.save(update_fields=["is_maintenance", "maintenance_notes", "updated_at"])

        return Response(CourtSerializer(court).data)


class ScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing schedules - EMERGENCY RECOVERY VERSION."""

    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        """Filter schedules by organization and club."""
        if not self.request.user.organization:
            return Schedule.objects.none()

        queryset = Schedule.objects.filter(
            club__organization=self.request.user.organization
        ).select_related("club")

        # Filter by club
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        return queryset

    def perform_create(self, serializer):
        """Ensure club belongs to user's organization."""
        club = serializer.validated_data["club"]
        if not self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You must belong to an organization to create schedules."
            )
        if club.organization != self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You can only create schedules for clubs in your organization."
            )
        serializer.save(organization=self.request.user.organization)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for managing club announcements - EMERGENCY RECOVERY VERSION."""

    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        """Filter announcements by organization and club."""
        if not self.request.user.organization:
            return Announcement.objects.none()

        queryset = Announcement.objects.filter(
            club__organization=self.request.user.organization
        ).select_related("club")

        # Filter by club
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by active announcements
        if self.request.query_params.get("active_only") == "true":
            now = timezone.now()
            queryset = queryset.filter(starts_at__lte=now, ends_at__gte=now)

        return queryset

    def perform_create(self, serializer):
        """Ensure club belongs to user's organization."""
        club = serializer.validated_data["club"]
        if not self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You must belong to an organization to create announcements."
            )
        if club.organization != self.request.user.organization:
            from rest_framework import serializers

            raise serializers.ValidationError(
                "You can only create announcements for clubs in your organization."
            )
        serializer.save(organization=self.request.user.organization)


class UserClubsView(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet that returns only clubs the authenticated user has access to.
    This is used by the frontend auth context to get the user's accessible clubs.
    """
    serializer_class = ClubSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Return only clubs the user has access to."""
        user = self.request.user

        # Superusers can see all clubs
        if user.is_superuser:
            return Club.objects.select_related("organization").prefetch_related(
                "courts", "schedules"
            ).filter(is_active=True)

        # Users with organization access can see their organization's clubs
        if hasattr(user, "organization") and user.organization:
            return Club.objects.select_related("organization").prefetch_related(
                "courts", "schedules"
            ).filter(
                organization=user.organization,
                is_active=True
            )

        # Users without organization cannot see any clubs
        return Club.objects.none()

    def list(self, request, *args, **kwargs):
        """List user's accessible clubs."""
        queryset = self.get_queryset()
        
        # Apply search filter if provided
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # Use pagination if enabled, otherwise return all results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "clubs": serializer.data,
            "count": len(serializer.data)
        })

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get summary information about user's clubs."""
        queryset = self.get_queryset()
        
        total_clubs = queryset.count()
        total_courts = sum(club.get_active_courts_count() for club in queryset)
        
        return Response({
            "total_clubs": total_clubs,
            "total_courts": total_courts,
            "organization": {
                "id": request.user.organization.id,
                "name": request.user.organization.trade_name,
                "type": request.user.organization.type
            } if hasattr(request.user, "organization") and request.user.organization else None
        })


class CourtSpecialPricingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing court special pricing periods."""

    serializer_class = CourtSpecialPricingSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        """Filter special pricing by organization and court."""
        user = self.request.user

        # Base queryset
        queryset = CourtSpecialPricing.objects.select_related(
            "court", "court__club", "organization"
        )

        # Filter by organization
        if user.is_superuser:
            # Superusers can see all special pricing
            pass
        elif hasattr(user, "organization") and user.organization:
            queryset = queryset.filter(organization=user.organization)
        else:
            # No organization = no special pricing
            queryset = queryset.none()

        # Filter by court
        court_id = self.request.query_params.get("court")
        if court_id:
            queryset = queryset.filter(court_id=court_id)

        # Filter by club
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(court__club_id=club_id)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter by period type
        period_type = self.request.query_params.get("period_type")
        if period_type:
            queryset = queryset.filter(period_type=period_type)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            try:
                from datetime import datetime
                start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
                queryset = queryset.filter(end_date__gte=start_date)
            except ValueError:
                pass
        if end_date:
            try:
                from datetime import datetime
                end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
                queryset = queryset.filter(start_date__lte=end_date)
            except ValueError:
                pass

        # Filter by currently active periods
        currently_active = self.request.query_params.get("currently_active")
        if currently_active and currently_active.lower() == "true":
            today = timezone.now().date()
            queryset = queryset.filter(
                is_active=True,
                start_date__lte=today,
                end_date__gte=today
            )

        return queryset.order_by("court__club__name", "court__name", "-priority", "start_date")

    def get_serializer_class(self):
        """Use different serializers for create/update vs read operations."""
        if self.action in ["create", "update", "partial_update"]:
            return CourtSpecialPricingCreateSerializer
        return CourtSpecialPricingSerializer

    def perform_create(self, serializer):
        """Ensure special pricing belongs to user's organization."""
        court = serializer.validated_data["court"]
        if not self.request.user.organization:
            from rest_framework import serializers
            raise serializers.ValidationError(
                "You must belong to an organization to create special pricing."
            )
        if court.organization != self.request.user.organization:
            from rest_framework import serializers
            raise serializers.ValidationError(
                "You can only create special pricing for courts in your organization."
            )
        serializer.save(organization=self.request.user.organization)

    def perform_update(self, serializer):
        """Ensure updates maintain organization consistency."""
        instance = self.get_object()
        if instance.organization != self.request.user.organization:
            from rest_framework import serializers
            raise serializers.ValidationError(
                "You can only update special pricing for courts in your organization."
            )
        serializer.save()

    @action(detail=False, methods=["get"], url_path="by-court/(?P<court_id>[^/.]+)")
    def by_court(self, request, court_id=None):
        """Get all special pricing periods for a specific court."""
        try:
            # Verify court exists and user has access
            court = Court.objects.get(id=court_id)
            if not request.user.is_superuser and court.organization != request.user.organization:
                return Response(
                    {"error": "Court not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get all special pricing for this court
            pricing_periods = self.get_queryset().filter(court=court)
            
            # Apply additional filters
            include_inactive = request.query_params.get("include_inactive", "false").lower() == "true"
            if not include_inactive:
                pricing_periods = pricing_periods.filter(is_active=True)

            serializer = self.get_serializer(pricing_periods, many=True)
            
            return Response({
                "court_id": str(court.id),
                "court_name": court.name,
                "special_pricing_periods": serializer.data,
                "count": len(serializer.data)
            })
        except Court.DoesNotExist:
            return Response(
                {"error": "Court not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["get"])
    def active_periods(self, request):
        """Get all currently active special pricing periods for the user's organization."""
        today = timezone.now().date()
        current_time = timezone.now().time()
        
        active_periods = self.get_queryset().filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        )

        # Filter by current time if specified
        filter_by_time = request.query_params.get("filter_by_time", "false").lower() == "true"
        if filter_by_time:
            # Only periods that apply to current time or have no time restrictions
            active_now = []
            for period in active_periods:
                if period.is_applicable_for_datetime(today, current_time):
                    active_now.append(period)
            
            serializer = SpecialPricingPeriodSummarySerializer(active_now, many=True)
            return Response({
                "active_periods": serializer.data,
                "count": len(active_now),
                "current_date": str(today),
                "current_time": str(current_time)
            })
        
        serializer = self.get_serializer(active_periods, many=True)
        return Response({
            "active_periods": serializer.data,
            "count": len(serializer.data),
            "current_date": str(today)
        })

    @action(detail=False, methods=["post"])
    def bulk_create(self, request):
        """Create multiple special pricing periods at once."""
        if not isinstance(request.data, list):
            return Response(
                {"error": "Expected a list of special pricing periods"},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_periods = []
        errors = []

        for i, period_data in enumerate(request.data):
            try:
                serializer = CourtSpecialPricingCreateSerializer(data=period_data)
                if serializer.is_valid():
                    # Check permissions
                    court = serializer.validated_data["court"]
                    if not request.user.organization:
                        errors.append({
                            "index": i,
                            "error": "You must belong to an organization to create special pricing"
                        })
                        continue
                    if court.organization != request.user.organization:
                        errors.append({
                            "index": i,
                            "error": "You can only create special pricing for courts in your organization"
                        })
                        continue
                    
                    # Create the period
                    period = serializer.save(organization=request.user.organization)
                    created_periods.append(CourtSpecialPricingSerializer(period).data)
                else:
                    errors.append({
                        "index": i,
                        "errors": serializer.errors
                    })
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": str(e)
                })

        return Response({
            "created_periods": created_periods,
            "created_count": len(created_periods),
            "errors": errors,
            "error_count": len(errors)
        }, status=status.HTTP_201_CREATED if created_periods else status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate a special pricing period with new date range."""
        original_period = self.get_object()
        
        new_start_date = request.data.get("start_date")
        new_end_date = request.data.get("end_date")
        
        if not new_start_date or not new_end_date:
            return Response(
                {"error": "Both start_date and end_date are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from datetime import datetime
            new_start_date = datetime.strptime(new_start_date, "%Y-%m-%d").date()
            new_end_date = datetime.strptime(new_end_date, "%Y-%m-%d").date()
            
            if new_end_date < new_start_date:
                return Response(
                    {"error": "End date must be after start date"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create duplicate with new dates
        duplicate_data = {
            "court": original_period.court.id,
            "name": f"{original_period.name} (Copy)",
            "description": original_period.description,
            "period_type": original_period.period_type,
            "start_date": new_start_date,
            "end_date": new_end_date,
            "start_time": original_period.start_time,
            "end_time": original_period.end_time,
            "days_of_week": original_period.days_of_week,
            "price_per_hour": original_period.price_per_hour,
            "priority": original_period.priority,
        }

        serializer = CourtSpecialPricingCreateSerializer(data=duplicate_data)
        if serializer.is_valid():
            duplicate_period = serializer.save(organization=request.user.organization)
            return Response(CourtSpecialPricingSerializer(duplicate_period).data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

