"""
Query optimization utilities for Padelyzer.
Provides mixins and utilities to optimize database queries across the application.
"""

from django.db import models
from django.db.models import Prefetch, Q


class OptimizedQueryMixin:
    """
    Mixin providing optimized querysets for common models.
    Reduces N+1 queries by using select_related and prefetch_related appropriately.
    """
    
    def get_optimized_reservations_queryset(self):
        """Get optimized queryset for Reservations."""
        from apps.reservations.models import Reservation
        
        return Reservation.objects.select_related(
            'club',
            'club__organization',
            'court',
            'created_by',
            'organization',
            'client_profile',
            'client_profile__user',
            'client_profile__level'
        ).prefetch_related(
            'split_payments',
            'payments'
        )
    
    def get_optimized_tournaments_queryset(self):
        """Get optimized queryset for Tournaments."""
        from apps.tournaments.models import Tournament, TournamentRegistration
        
        # Create optimized prefetch for registrations
        registrations_prefetch = Prefetch(
            'registrations',
            queryset=TournamentRegistration.objects.select_related(
                'player1__user',
                'player1__level',
                'player2__user', 
                'player2__level',
                'substitute1__user',
                'substitute2__user'
            )
        )
        
        return Tournament.objects.select_related(
            'category',
            'organizer',
            'club',
            'club__organization',
            'organization'
        ).prefetch_related(
            registrations_prefetch,
            'prizes',
            'tournament_rules'
        )
    
    def get_optimized_matches_queryset(self):
        """Get optimized queryset for Matches."""
        from apps.tournaments.models import Match
        
        return Match.objects.select_related(
            'tournament',
            'tournament__organization',
            'tournament__club',
            'team1__player1__user',
            'team1__player1__level',
            'team1__player2__user',
            'team1__player2__level',
            'team2__player1__user',
            'team2__player1__level',
            'team2__player2__user',
            'team2__player2__level',
            'winner',
            'court',
            'court__club',
            'referee',
            'organization',
            'club'
        )
    
    def get_optimized_payments_queryset(self):
        """Get optimized queryset for Payments."""
        from apps.finance.models import Payment
        
        return Payment.objects.select_related(
            'organization',
            'club',
            'user',
            'client',
            'client__user',
            'reservation',
            'reservation__court',
            'reservation__club',
            'membership',
            'refunded_by'
        ).prefetch_related(
            'refunds',
            'revenue_records'
        )
    
    def get_optimized_clients_queryset(self):
        """Get optimized queryset for ClientProfiles."""
        from apps.clients.models import ClientProfile
        
        return ClientProfile.objects.select_related(
            'user',
            'level',
            'stats',
            'medical_info',
            'preferences',
            'organization',
            'club'
        ).prefetch_related(
            'emergency_contacts',
            'partner_requests_sent__to_player__user',
            'partner_requests_received__from_player__user'
        )
    
    def get_optimized_classes_queryset(self):
        """Get optimized queryset for ClassSessions."""
        from apps.classes.models import ClassSession
        
        return ClassSession.objects.select_related(
            'schedule',
            'schedule__class_type',
            'schedule__level',
            'instructor__user',
            'substitute_instructor__user',
            'court',
            'court__club',
            'organization',
            'club'
        ).prefetch_related(
            'enrollments__student__user',
            'attendance_records'
        )


class ReservationQueryOptimizer:
    """Specific optimizations for reservation-related queries."""
    
    @staticmethod
    def get_dashboard_reservations(club, date_filter=None):
        """Get optimized reservations for dashboard views."""
        from apps.reservations.models import Reservation
        
        queryset = Reservation.objects.filter(
            club=club
        ).select_related(
            'court',
            'created_by',
            'client_profile__user'
        )
        
        if date_filter:
            queryset = queryset.filter(date=date_filter)
        
        return queryset
    
    @staticmethod
    def get_user_reservations(user, include_past=False):
        """Get optimized reservations for a specific user."""
        from apps.reservations.models import Reservation
        from django.utils import timezone
        
        queryset = Reservation.objects.filter(
            created_by=user
        ).select_related(
            'club',
            'court',
            'organization'
        ).prefetch_related(
            'split_payments'
        )
        
        if not include_past:
            queryset = queryset.filter(date__gte=timezone.now().date())
        
        return queryset.order_by('date', 'start_time')


class TournamentQueryOptimizer:
    """Specific optimizations for tournament-related queries."""
    
    @staticmethod
    def get_tournament_with_full_data(tournament_id):
        """Get tournament with all related data optimized."""
        from apps.tournaments.models import Tournament, TournamentRegistration, Match
        
        # Optimize registrations prefetch
        registrations_prefetch = Prefetch(
            'registrations',
            queryset=TournamentRegistration.objects.select_related(
                'player1__user',
                'player1__level',
                'player2__user',
                'player2__level',
                'substitute1__user',
                'substitute2__user'
            ).filter(status='confirmed')
        )
        
        # Optimize matches prefetch
        matches_prefetch = Prefetch(
            'tournament_matches',
            queryset=Match.objects.select_related(
                'team1__player1__user',
                'team1__player2__user',
                'team2__player1__user',
                'team2__player2__user',
                'winner',
                'court',
                'referee'
            ).order_by('round_number', 'match_number')
        )
        
        return Tournament.objects.select_related(
            'category',
            'organizer',
            'club',
            'organization'
        ).prefetch_related(
            registrations_prefetch,
            matches_prefetch,
            'brackets__team1',
            'brackets__team2',
            'brackets__match',
            'prizes',
            'tournament_rules'
        ).get(id=tournament_id)
    
    @staticmethod
    def get_player_tournament_history(player_profile):
        """Get optimized tournament history for a player."""
        from apps.tournaments.models import TournamentRegistration
        
        return TournamentRegistration.objects.filter(
            Q(player1=player_profile) | Q(player2=player_profile)
        ).select_related(
            'tournament',
            'tournament__category',
            'tournament__club',
            'player1__user',
            'player2__user'
        ).prefetch_related(
            'won_matches',
            'prizes_won'
        ).order_by('-tournament__start_date')


class FinanceQueryOptimizer:
    """Specific optimizations for finance-related queries."""
    
    @staticmethod
    def get_club_revenue_data(club, start_date=None, end_date=None):
        """Get optimized revenue data for a club."""
        from apps.finance.models import Revenue
        
        queryset = Revenue.objects.filter(
            club=club
        ).select_related(
            'payment',
            'payment__user',
            'payment__reservation',
            'payment__reservation__court'
        )
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('-date')
    
    @staticmethod
    def get_pending_payments(organization):
        """Get optimized pending payments for an organization."""
        from apps.finance.models import Payment
        
        return Payment.objects.filter(
            organization=organization,
            status='pending'
        ).select_related(
            'club',
            'user',
            'client__user',
            'reservation__court'
        ).order_by('-created_at')


class ClientQueryOptimizer:
    """Specific optimizations for client-related queries."""
    
    @staticmethod
    def get_clients_with_stats(organization):
        """Get clients with their statistics optimized."""
        from apps.clients.models import ClientProfile
        
        return ClientProfile.objects.filter(
            organization=organization
        ).select_related(
            'user',
            'level',
            'stats',
            'preferences'
        ).prefetch_related(
            'partner_requests_sent__to_player__user',
            'partner_requests_received__from_player__user'
        ).annotate(
            total_reservations=models.Count('reservations', distinct=True),
            total_matches=models.Count('player1_registrations', distinct=True) + 
                         models.Count('player2_registrations', distinct=True)
        )
    
    @staticmethod
    def get_partner_suggestions(player_profile, limit=10):
        """Get optimized partner suggestions for a player."""
        from apps.clients.models import ClientProfile, PartnerRequest
        
        # Get existing partners to exclude
        existing_partners = PartnerRequest.objects.filter(
            Q(from_player=player_profile, status='accepted') |
            Q(to_player=player_profile, status='accepted')
        ).values_list('from_player_id', 'to_player_id')
        
        exclude_ids = set()
        for from_id, to_id in existing_partners:
            exclude_ids.add(from_id if from_id != player_profile.id else to_id)
        exclude_ids.add(player_profile.id)
        
        # Get suggestions based on similar level and preferences
        return ClientProfile.objects.filter(
            organization=player_profile.organization,
            level=player_profile.level,
            is_active=True
        ).exclude(
            id__in=exclude_ids
        ).select_related(
            'user',
            'level',
            'stats',
            'preferences'
        ).order_by('-stats__elo_rating')[:limit]


# Decorator for automatic query optimization
def optimize_queries(model_name):
    """
    Decorator to automatically apply query optimizations to a view method.
    
    Usage:
        @optimize_queries('reservations')
        def get_queryset(self):
            return super().get_queryset()
    """
    def decorator(func):
        def wrapper(self, *args, **kwargs):
            queryset = func(self, *args, **kwargs)
            
            # Apply optimizations based on model
            optimizations = {
                'reservations': lambda q: q.select_related(
                    'club', 'court', 'created_by', 'organization'
                ).prefetch_related('split_payments'),
                
                'tournaments': lambda q: q.select_related(
                    'category', 'organizer', 'club', 'organization'
                ).prefetch_related('registrations'),
                
                'payments': lambda q: q.select_related(
                    'organization', 'club', 'user', 'client', 'reservation'
                ).prefetch_related('refunds'),
                
                'clients': lambda q: q.select_related(
                    'user', 'level', 'stats', 'medical_info', 'preferences'
                ).prefetch_related('emergency_contacts'),
                
                'classes': lambda q: q.select_related(
                    'schedule__class_type', 'schedule__level', 'instructor__user', 'court'
                ).prefetch_related('enrollments__student__user')
            }
            
            if model_name in optimizations:
                queryset = optimizations[model_name](queryset)
            
            return queryset
        
        return wrapper
    return decorator