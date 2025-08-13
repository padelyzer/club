"""
Example implementations of cached views and viewsets.
Shows how to use caching utilities in Padelyzer views.
"""

from datetime import timedelta
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.cache_utils import (
    cache_queryset, cache_method_result, cache_dashboard_stats,
    cache_tournament_standings, cache_revenue_report, CacheKeyBuilder,
    QueryCacheManager
)
from core.query_optimizations import OptimizedQueryMixin


class CachedDashboardViewSet(OptimizedQueryMixin, viewsets.ViewSet):
    """Example of cached dashboard implementation."""
    
    @action(detail=False, methods=['get'])
    @cache_dashboard_stats(timeout=300)  # 5 minutes
    def stats(self, request):
        """Get cached dashboard statistics."""
        club_id = request.query_params.get('club_id')
        if not club_id:
            return Response({'error': 'club_id required'}, status=400)
        
        today = timezone.now().date()
        
        # These queries will be cached
        stats = {
            'today_reservations': self._get_today_reservations_count(club_id, today),
            'week_revenue': self._get_week_revenue(club_id),
            'month_growth': self._get_month_growth(club_id),
            'occupancy_rate': self._get_occupancy_rate(club_id, today),
            'top_clients': self._get_top_clients(club_id),
            'court_usage': self._get_court_usage_stats(club_id)
        }
        
        return Response(stats)
    
    def _get_today_reservations_count(self, club_id, date):
        """Get today's reservation count with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'today_reservations',
            club_id=club_id,
            date=str(date)
        )
        
        from apps.reservations.models import Reservation
        queryset = Reservation.objects.filter(
            club_id=club_id,
            date=date,
            status__in=['confirmed', 'pending']
        )
        
        return QueryCacheManager.cache_count(cache_key, queryset, timeout=300)
    
    def _get_week_revenue(self, club_id):
        """Get week's revenue with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'week_revenue',
            club_id=club_id,
            week=timezone.now().isocalendar()[1]
        )
        
        from apps.finance.models import Revenue
        start_date = timezone.now().date() - timedelta(days=7)
        
        queryset = Revenue.objects.filter(
            club_id=club_id,
            date__gte=start_date
        )
        
        aggregation = {'total': Sum('amount')}
        result = QueryCacheManager.cache_aggregation(
            cache_key, queryset, aggregation, timeout=600
        )
        
        return float(result['total'] or 0)
    
    def _get_month_growth(self, club_id):
        """Calculate month-over-month growth with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'month_growth',
            club_id=club_id,
            month=timezone.now().month,
            year=timezone.now().year
        )
        
        from django.core.cache import cache
        growth = cache.get(cache_key)
        
        if growth is None:
            # Calculate growth (expensive operation)
            from apps.reservations.models import Reservation
            
            current_month_start = timezone.now().replace(day=1).date()
            last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
            
            current_count = Reservation.objects.filter(
                club_id=club_id,
                date__gte=current_month_start,
                status='confirmed'
            ).count()
            
            last_count = Reservation.objects.filter(
                club_id=club_id,
                date__gte=last_month_start,
                date__lt=current_month_start,
                status='confirmed'
            ).count()
            
            if last_count > 0:
                growth = ((current_count - last_count) / last_count) * 100
            else:
                growth = 0
            
            cache.set(cache_key, growth, 3600)  # 1 hour
        
        return growth
    
    def _get_occupancy_rate(self, club_id, date):
        """Calculate occupancy rate with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'occupancy_rate',
            club_id=club_id,
            date=str(date)
        )
        
        from django.core.cache import cache
        rate = cache.get(cache_key)
        
        if rate is None:
            from apps.reservations.models import Reservation
            from apps.clubs.models import Court
            
            # Get total available slots
            courts = Court.objects.filter(club_id=club_id, is_active=True).count()
            # Assume 14 slots per day (7am-9pm, 1-hour slots)
            total_slots = courts * 14
            
            # Get occupied slots
            occupied = Reservation.objects.filter(
                club_id=club_id,
                date=date,
                status__in=['confirmed', 'pending']
            ).count()
            
            rate = (occupied / total_slots * 100) if total_slots > 0 else 0
            cache.set(cache_key, rate, 300)  # 5 minutes
        
        return rate
    
    def _get_top_clients(self, club_id):
        """Get top clients with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'top_clients',
            club_id=club_id,
            month=timezone.now().month
        )
        
        from django.core.cache import cache
        top_clients = cache.get(cache_key)
        
        if top_clients is None:
            from apps.reservations.models import Reservation
            from django.db.models import Count
            
            top_clients = list(
                Reservation.objects.filter(
                    club_id=club_id,
                    date__month=timezone.now().month,
                    status='confirmed'
                ).values('created_by__first_name', 'created_by__last_name')
                .annotate(total=Count('id'))
                .order_by('-total')[:5]
            )
            
            cache.set(cache_key, top_clients, 1800)  # 30 minutes
        
        return top_clients
    
    def _get_court_usage_stats(self, club_id):
        """Get court usage statistics with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'court_usage',
            club_id=club_id,
            week=timezone.now().isocalendar()[1]
        )
        
        from django.core.cache import cache
        usage_stats = cache.get(cache_key)
        
        if usage_stats is None:
            from apps.reservations.models import Reservation
            from django.db.models import Count
            
            start_date = timezone.now().date() - timedelta(days=7)
            
            usage_stats = list(
                Reservation.objects.filter(
                    club_id=club_id,
                    date__gte=start_date,
                    status='confirmed'
                ).values('court__name')
                .annotate(usage_count=Count('id'))
                .order_by('-usage_count')
            )
            
            cache.set(cache_key, usage_stats, 600)  # 10 minutes
        
        return usage_stats


class CachedTournamentViewSet(OptimizedQueryMixin, viewsets.ModelViewSet):
    """Example of cached tournament operations."""
    
    @action(detail=True, methods=['get'])
    @cache_tournament_standings(timeout=600)  # 10 minutes
    def standings(self, request, pk=None):
        """Get cached tournament standings."""
        tournament = self.get_object()
        
        # This expensive calculation will be cached
        standings = self._calculate_standings(tournament)
        
        return Response({
            'tournament_id': tournament.id,
            'standings': standings,
            'last_updated': timezone.now()
        })
    
    def _calculate_standings(self, tournament):
        """Calculate tournament standings (expensive operation)."""
        from apps.tournaments.models import TournamentRegistration, Match
        
        registrations = TournamentRegistration.objects.filter(
            tournament=tournament,
            status='confirmed'
        ).select_related('player1__user', 'player2__user')
        
        standings = []
        
        for registration in registrations:
            wins = Match.objects.filter(
                tournament=tournament,
                winner=registration,
                status='completed'
            ).count()
            
            losses = Match.objects.filter(
                Q(team1=registration) | Q(team2=registration),
                tournament=tournament,
                status='completed'
            ).exclude(winner=registration).count()
            
            standings.append({
                'team': registration.team_display_name,
                'wins': wins,
                'losses': losses,
                'win_percentage': (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
            })
        
        # Sort by wins, then win percentage
        standings.sort(key=lambda x: (x['wins'], x['win_percentage']), reverse=True)
        
        return standings
    
    @action(detail=True, methods=['get'])
    def bracket_cached(self, request, pk=None):
        """Get tournament bracket with caching."""
        tournament = self.get_object()
        
        cache_key = CacheKeyBuilder.build_key(
            'tournament_bracket',
            tournament_id=tournament.id,
            round=tournament.current_round
        )
        
        from django.core.cache import cache
        bracket_data = cache.get(cache_key)
        
        if bracket_data is None:
            # Build bracket data
            from apps.tournaments.models import TournamentBracket
            
            brackets = TournamentBracket.objects.filter(
                tournament=tournament
            ).select_related(
                'team1__player1__user',
                'team1__player2__user',
                'team2__player1__user',
                'team2__player2__user',
                'match'
            ).order_by('round_number', 'position')
            
            bracket_data = []
            for bracket in brackets:
                bracket_data.append({
                    'round': bracket.round_number,
                    'position': bracket.position,
                    'team1': bracket.team1.team_display_name if bracket.team1 else None,
                    'team2': bracket.team2.team_display_name if bracket.team2 else None,
                    'match_id': bracket.match.id if bracket.match else None,
                    'winner': bracket.match.winner.team_display_name if bracket.match and bracket.match.winner else None
                })
            
            cache.set(cache_key, bracket_data, 300)  # 5 minutes
        
        return Response({
            'tournament_id': tournament.id,
            'bracket': bracket_data
        })


class CachedRevenueViewSet(OptimizedQueryMixin, viewsets.ViewSet):
    """Example of cached revenue reports."""
    
    @action(detail=False, methods=['get'])
    @cache_revenue_report(timeout=1800)  # 30 minutes
    def monthly_report(self, request):
        """Get cached monthly revenue report."""
        club_id = request.query_params.get('club_id')
        if not club_id:
            return Response({'error': 'club_id required'}, status=400)
        
        # These calculations will be cached
        report = {
            'summary': self._get_monthly_summary(club_id),
            'by_category': self._get_revenue_by_category(club_id),
            'daily_trend': self._get_daily_trend(club_id),
            'payment_methods': self._get_payment_method_breakdown(club_id),
            'top_services': self._get_top_revenue_services(club_id)
        }
        
        return Response(report)
    
    def _get_monthly_summary(self, club_id):
        """Get monthly revenue summary with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'monthly_revenue_summary',
            club_id=club_id,
            month=timezone.now().month,
            year=timezone.now().year
        )
        
        from apps.finance.models import Revenue
        from django.db.models import Sum, Count, Avg
        
        queryset = Revenue.objects.filter(
            club_id=club_id,
            date__month=timezone.now().month,
            date__year=timezone.now().year
        )
        
        aggregation = {
            'total': Sum('amount'),
            'count': Count('id'),
            'average': Avg('amount')
        }
        
        return QueryCacheManager.cache_aggregation(
            cache_key, queryset, aggregation, timeout=1800
        )
    
    def _get_revenue_by_category(self, club_id):
        """Get revenue breakdown by category with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'revenue_by_category',
            club_id=club_id,
            month=timezone.now().month
        )
        
        from django.core.cache import cache
        categories = cache.get(cache_key)
        
        if categories is None:
            from apps.finance.models import Revenue
            from django.db.models import Sum
            
            categories = list(
                Revenue.objects.filter(
                    club_id=club_id,
                    date__month=timezone.now().month
                ).values('concept')
                .annotate(total=Sum('amount'))
                .order_by('-total')
            )
            
            cache.set(cache_key, categories, 1800)  # 30 minutes
        
        return categories
    
    def _get_daily_trend(self, club_id):
        """Get daily revenue trend with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'daily_revenue_trend',
            club_id=club_id,
            month=timezone.now().month
        )
        
        from django.core.cache import cache
        trend = cache.get(cache_key)
        
        if trend is None:
            from apps.finance.models import Revenue
            from django.db.models import Sum
            
            trend = list(
                Revenue.objects.filter(
                    club_id=club_id,
                    date__month=timezone.now().month
                ).values('date')
                .annotate(total=Sum('amount'))
                .order_by('date')
            )
            
            cache.set(cache_key, trend, 3600)  # 1 hour
        
        return trend
    
    def _get_payment_method_breakdown(self, club_id):
        """Get payment method breakdown with caching."""
        from django.core.cache import cache
        
        cache_key = CacheKeyBuilder.build_key(
            'payment_methods',
            club_id=club_id,
            month=timezone.now().month
        )
        
        breakdown = cache.get(cache_key)
        
        if breakdown is None:
            from apps.finance.models import Payment
            from django.db.models import Count, Sum
            
            breakdown = list(
                Payment.objects.filter(
                    club_id=club_id,
                    created_at__month=timezone.now().month,
                    status='completed'
                ).values('payment_method')
                .annotate(
                    count=Count('id'),
                    total=Sum('amount')
                )
            )
            
            cache.set(cache_key, breakdown, 1800)
        
        return breakdown
    
    def _get_top_revenue_services(self, club_id):
        """Get top revenue generating services with caching."""
        cache_key = CacheKeyBuilder.build_key(
            'top_revenue_services',
            club_id=club_id,
            month=timezone.now().month
        )
        
        from django.core.cache import cache
        services = cache.get(cache_key)
        
        if services is None:
            from apps.finance.models import Payment
            from django.db.models import Sum, Count
            
            services = list(
                Payment.objects.filter(
                    club_id=club_id,
                    created_at__month=timezone.now().month,
                    status='completed'
                ).values('payment_type')
                .annotate(
                    revenue=Sum('amount'),
                    count=Count('id')
                )
                .order_by('-revenue')[:5]
            )
            
            cache.set(cache_key, services, 1800)
        
        return services


# Signal handlers for cache invalidation

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender='reservations.Reservation')
def invalidate_reservation_cache(sender, instance, **kwargs):
    """Invalidate caches when reservation is saved."""
    from core.cache_utils import CacheInvalidator
    
    if instance.club_id:
        CacheInvalidator.invalidate_club_cache(instance.club_id)
    
    # Invalidate specific dashboard stats
    cache_keys = [
        CacheKeyBuilder.build_key('today_reservations', club_id=instance.club_id, date=str(instance.date)),
        CacheKeyBuilder.build_key('occupancy_rate', club_id=instance.club_id, date=str(instance.date))
    ]
    
    from django.core.cache import cache
    for key in cache_keys:
        cache.delete(key)


@receiver(post_save, sender='finance.Payment')
@receiver(post_save, sender='finance.Revenue')
def invalidate_finance_cache(sender, instance, **kwargs):
    """Invalidate caches when payment/revenue is saved."""
    from core.cache_utils import CacheInvalidator
    
    if instance.club_id:
        CacheInvalidator.invalidate_club_cache(instance.club_id)
    
    # Invalidate revenue reports
    cache.delete_pattern(f"revenue_report:*:club_id:{instance.club_id}*")
    cache.delete_pattern(f"monthly_revenue*:club_id:{instance.club_id}*")


@receiver(post_save, sender='tournaments.Match')
def invalidate_tournament_cache(sender, instance, **kwargs):
    """Invalidate tournament caches when match is saved."""
    from core.cache_utils import CacheInvalidator
    
    if instance.tournament_id:
        CacheInvalidator.invalidate_tournament_cache(instance.tournament_id)
    
    # Invalidate standings
    cache.delete_pattern(f"tournament_standings:*:tournament_id:{instance.tournament_id}*")