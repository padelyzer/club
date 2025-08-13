"""
Views for tournaments module.
"""

from django.db.models import Avg, Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from core.mixins import MultiTenantViewMixin
from core.permissions import IsClubMemberOrReadOnly

from .filters import MatchFilter, TournamentFilter
from .models import (
    Match,
    Prize,
    Tournament,
    TournamentBracket,
    TournamentCategory,
    TournamentRegistration,
    TournamentRules,
    TournamentStats,
    Bracket,
    BracketNode,
    MatchSchedule,
    League,
    LeagueTeamRegistration,
    LeagueSchedule,
    LeagueRound,
    LeagueMatch,
    Season,
    ScheduleConstraint,
)
from .serializers import (
    MatchDetailSerializer,
    MatchListSerializer,
    MatchScoreUpdateSerializer,
    PrizeSerializer,
    TournamentBracketSerializer,
    TournamentCategorySerializer,
    TournamentDetailSerializer,
    TournamentListSerializer,
    TournamentRegistrationCreateSerializer,
    TournamentRegistrationDetailSerializer,
    TournamentRulesSerializer,
    TournamentScheduleSerializer,
    TournamentStartSerializer,
    TournamentStatsSerializer,
)
from .services import MatchService, TournamentService
from .bracket_generator import BracketGenerator
from .match_scheduler import MatchScheduler
from .progression_engine import ProgressionEngine
from .league_scheduler import LeagueScheduler
from .geographic_optimizer import GeographicOptimizer
from .rescheduler import MatchRescheduler, RescheduleReason


class TournamentCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tournament categories.
    """

    queryset = TournamentCategory.objects.all()
    serializer_class = TournamentCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    filterset_fields = ["category_type", "gender", "is_active"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


class TournamentViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for tournaments.
    """

    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TournamentFilter
    search_fields = [
        "name",
        "description",
        "organizer__first_name",
        "organizer__last_name",
    ]
    ordering_fields = ["start_date", "registration_start", "created_at", "name"]
    ordering = ["-start_date"]

    def get_queryset(self):
        queryset = (
            Tournament.objects.filter(
                organization=self.get_organization(), club=self.get_club()
            )
            .select_related("category", "organizer", "club")
            .prefetch_related("registrations")
        )

        # Filter by user access
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(visibility="public")
                | Q(organizer=self.request.user)
                | Q(registrations__player1__user=self.request.user)
                | Q(registrations__player2__user=self.request.user)
            ).distinct()

        return queryset

    def get_serializer_class(self):
        if self.action in ["list"]:
            return TournamentListSerializer
        return TournamentDetailSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(
            {"organization": self.get_organization(), "club": self.get_club()}
        )
        return context

    def perform_create(self, serializer):
        serializer.save(
            organization=self.get_organization(),
            club=self.get_club(),
            organizer=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start a tournament."""
        tournament = self.get_object()
        serializer = TournamentStartSerializer(data=request.data)

        if serializer.is_valid():
            try:
                tournament.start_tournament()
                return Response(
                    {
                        "message": "Tournament started successfully",
                        "status": tournament.status,
                        "current_round": tournament.current_round,
                        "total_rounds": tournament.total_rounds,
                    }
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def bracket(self, request, pk=None):
        """Get tournament bracket."""
        tournament = self.get_object()
        brackets = (
            TournamentBracket.objects.filter(tournament=tournament)
            .select_related("team1", "team2", "match", "advances_to")
            .order_by("round_number", "position")
        )

        serializer = TournamentBracketSerializer(brackets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def matches(self, request, pk=None):
        """Get tournament matches."""
        tournament = self.get_object()
        matches = (
            Match.objects.filter(tournament=tournament)
            .select_related("team1", "team2", "winner", "court", "referee")
            .order_by("round_number", "match_number")
        )

        serializer = MatchListSerializer(matches, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def registrations(self, request, pk=None):
        """Get tournament registrations."""
        tournament = self.get_object()
        registrations = (
            TournamentRegistration.objects.filter(tournament=tournament)
            .select_related(
                "player1__user",
                "player2__user",
                "substitute1__user",
                "substitute2__user",
            )
            .order_by("created_at")
        )

        serializer = TournamentRegistrationDetailSerializer(registrations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def register(self, request, pk=None):
        """Register for a tournament."""
        tournament = self.get_object()
        data = request.data.copy()
        data["tournament"] = tournament.id

        serializer = TournamentRegistrationCreateSerializer(data=data)
        if serializer.is_valid():
            registration = serializer.save()
            detail_serializer = TournamentRegistrationDetailSerializer(registration)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def standings(self, request, pk=None):
        """Get tournament standings."""
        tournament = self.get_object()
        service = TournamentService(tournament)
        standings = service.get_standings()
        return Response(standings)

    @action(detail=True, methods=["get"])
    def schedule(self, request, pk=None):
        """Get tournament schedule."""
        tournament = self.get_object()
        matches = (
            Match.objects.filter(tournament=tournament)
            .select_related("team1", "team2", "court")
            .order_by("scheduled_date")
        )

        schedule_data = {}
        for match in matches:
            date_str = match.scheduled_date.date().isoformat()
            if date_str not in schedule_data:
                schedule_data[date_str] = []

            schedule_data[date_str].append(
                {
                    "match": MatchListSerializer(match).data,
                    "time": match.scheduled_date.time().isoformat(),
                }
            )

        return Response(schedule_data)

    @action(detail=True, methods=["post"])
    def generate_schedule(self, request, pk=None):
        """Generate tournament schedule."""
        tournament = self.get_object()
        serializer = TournamentScheduleSerializer(data=request.data)

        if serializer.is_valid():
            try:
                service = TournamentService(tournament)
                service.generate_schedule(
                    start_time=serializer.validated_data["start_time"],
                    match_duration=serializer.validated_data["match_duration_minutes"],
                    break_time=serializer.validated_data["break_between_matches"],
                    court_ids=serializer.validated_data["courts"],
                    dates=serializer.validated_data["dates"],
                )
                return Response({"message": "Schedule generated successfully"})
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get tournament statistics."""
        tournament = self.get_object()
        stats, created = TournamentStats.objects.get_or_create(tournament=tournament)
        stats.update_stats()

        serializer = TournamentStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def prizes(self, request, pk=None):
        """Get tournament prizes."""
        tournament = self.get_object()
        prizes = Prize.objects.filter(tournament=tournament).order_by("position")
        serializer = PrizeSerializer(prizes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def rules(self, request, pk=None):
        """Get tournament rules."""
        tournament = self.get_object()
        rules = TournamentRules.objects.filter(tournament=tournament).order_by(
            "rule_type", "order"
        )
        serializer = TournamentRulesSerializer(rules, many=True)
        return Response(serializer.data)


class TournamentRegistrationViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for tournament registrations.
    """

    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["tournament", "status", "payment_status"]
    search_fields = [
        "team_name",
        "player1__user__first_name",
        "player2__user__first_name",
    ]
    ordering_fields = ["created_at", "team_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = TournamentRegistration.objects.filter(
            tournament__organization=self.get_organization(),
            tournament__club=self.get_club(),
        ).select_related(
            "tournament",
            "player1__user",
            "player2__user",
            "substitute1__user",
            "substitute2__user",
        )

        # Filter by user access
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(player1__user=self.request.user)
                | Q(player2__user=self.request.user)
                | Q(tournament__organizer=self.request.user)
            )

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return TournamentRegistrationCreateSerializer
        return TournamentRegistrationDetailSerializer

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Confirm a registration."""
        registration = self.get_object()
        registration.confirm_registration()
        serializer = TournamentRegistrationDetailSerializer(registration)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a registration."""
        registration = self.get_object()
        if registration.status in ["pending", "confirmed", "waitlist"]:
            registration.status = "cancelled"
            registration.save()
            return Response({"message": "Registration cancelled successfully"})

        return Response(
            {"error": "Cannot cancel registration in current status"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class MatchViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for matches.
    """

    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = MatchFilter
    search_fields = ["team1__team_name", "team2__team_name", "tournament__name"]
    ordering_fields = ["scheduled_date", "round_number", "match_number"]
    ordering = ["scheduled_date"]

    def get_queryset(self):
        queryset = Match.objects.filter(
            organization=self.get_organization(), club=self.get_club()
        ).select_related("tournament", "team1", "team2", "winner", "court", "referee")

        # Filter by user access
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(team1__player1__user=self.request.user)
                | Q(team1__player2__user=self.request.user)
                | Q(team2__player1__user=self.request.user)
                | Q(team2__player2__user=self.request.user)
                | Q(tournament__organizer=self.request.user)
                | Q(referee=self.request.user)
            )

        return queryset

    def get_serializer_class(self):
        if self.action in ["list"]:
            return MatchListSerializer
        return MatchDetailSerializer

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start a match."""
        match = self.get_object()
        if match.status == "scheduled":
            match.status = "in_progress"
            match.actual_start_time = timezone.now()
            match.save()
            return Response({"message": "Match started successfully"})

        return Response(
            {"error": "Match cannot be started in current status"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        """Finish a match."""
        match = self.get_object()
        if match.status == "in_progress":
            match.status = "completed"
            match.actual_end_time = timezone.now()

            if match.actual_start_time:
                duration = match.actual_end_time - match.actual_start_time
                match.duration_minutes = int(duration.total_seconds() / 60)

            match.determine_winner()
            match.save()

            # Update player stats
            service = MatchService(match)
            service.update_player_stats()

            return Response({"message": "Match finished successfully"})

        return Response(
            {"error": "Match cannot be finished in current status"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def record_score(self, request, pk=None):
        """Record a set score."""
        match = self.get_object()
        serializer = MatchScoreUpdateSerializer(data=request.data)

        if serializer.is_valid():
            match.record_set_score(
                serializer.validated_data["team1_games"],
                serializer.validated_data["team2_games"],
            )
            detail_serializer = MatchDetailSerializer(match)
            return Response(detail_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def walkover(self, request, pk=None):
        """Record a walkover."""
        match = self.get_object()
        winner_id = request.data.get("winner_id")
        reason = request.data.get("reason", "")

        if not winner_id:
            return Response(
                {"error": "Winner ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        if winner_id == str(match.team1.id):
            match.winner = match.team1
        elif winner_id == str(match.team2.id):
            match.winner = match.team2
        else:
            return Response(
                {"error": "Invalid winner ID"}, status=status.HTTP_400_BAD_REQUEST
            )

        match.status = "walkover"
        match.walkover_reason = reason
        match.save()

        return Response({"message": "Walkover recorded successfully"})


class PrizeViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for prizes.
    """

    serializer_class = PrizeSerializer
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["tournament", "prize_type", "position"]
    ordering_fields = ["tournament", "position", "created_at"]
    ordering = ["tournament", "position"]

    def get_queryset(self):
        return Prize.objects.filter(
            tournament__organization=self.get_organization(),
            tournament__club=self.get_club(),
        ).select_related("tournament", "awarded_to")

    @action(detail=True, methods=["post"])
    def award(self, request, pk=None):
        """Award prize to a team."""
        prize = self.get_object()
        team_id = request.data.get("team_id")

        if not team_id:
            return Response(
                {"error": "Team ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            team = TournamentRegistration.objects.get(
                id=team_id, tournament=prize.tournament
            )
            prize.award_to_team(team)
            serializer = PrizeSerializer(prize)
            return Response(serializer.data)
        except TournamentRegistration.DoesNotExist:
            return Response(
                {"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND
            )


class TournamentRulesViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for tournament rules.
    """

    serializer_class = TournamentRulesSerializer
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["tournament", "rule_type", "is_mandatory"]
    ordering_fields = ["tournament", "rule_type", "order"]
    ordering = ["tournament", "rule_type", "order"]

    def get_queryset(self):
        return TournamentRules.objects.filter(
            tournament__organization=self.get_organization(),
            tournament__club=self.get_club(),
        ).select_related("tournament")


class TournamentStatsViewSet(MultiTenantViewMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for tournament statistics (read-only).
    """

    serializer_class = TournamentStatsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TournamentStats.objects.filter(
            tournament__organization=self.get_organization(),
            tournament__club=self.get_club(),
        ).select_related("tournament")

    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        """Refresh tournament statistics."""
        stats = self.get_object()
        stats.update_stats()
        serializer = TournamentStatsSerializer(stats)
        return Response(serializer.data)


class BracketViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for tournament bracket management.
    Notion ref: Tournament Bracket System
    
    GET /tournaments/{id}/bracket - Get bracket structure
    POST /tournaments/{id}/generate-bracket - Generate bracket
    PUT /tournaments/{id}/bracket/seed - Update seeding
    """
    
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering = ['-tournament__start_date']
    
    def get_queryset(self):
        return Bracket.objects.filter(
            tournament__organization=self.get_organization(),
            tournament__club=self.get_club()
        ).select_related('tournament').prefetch_related('nodes')
    
    def get_serializer_class(self):
        # We'll need to create these serializers
        from .serializers import BracketSerializer, BracketGenerateSerializer
        if self.action == 'generate':
            return BracketGenerateSerializer
        return BracketSerializer
    
    @action(detail=False, methods=['post'], url_path='(?P<tournament_id>[^/.]+)/generate')
    def generate(self, request, tournament_id=None):
        """Generate tournament bracket based on registered teams."""
        tournament = get_object_or_404(
            Tournament, 
            id=tournament_id,
            organization=self.get_organization(),
            club=self.get_club()
        )
        
        # Check if bracket already exists
        if hasattr(tournament, 'bracket_structure'):
            return Response(
                {"error": "Bracket already exists for this tournament"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if tournament can start
        if not tournament.can_start:
            return Response(
                {"error": "Tournament cannot start yet. Check minimum teams requirement."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate bracket
            generator = BracketGenerator(tournament)
            bracket = generator.generate()
            
            # Start tournament
            tournament.start_tournament()
            
            # Serialize and return
            from .serializers import BracketSerializer
            serializer = BracketSerializer(bracket)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['put'], url_path='seed')
    def update_seeding(self, request, pk=None):
        """Update bracket seeding before tournament starts."""
        bracket = self.get_object()
        
        if bracket.tournament.status != 'registration_closed':
            return Response(
                {"error": "Can only update seeding before tournament starts"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get new seeding order from request
        seeding_data = request.data.get('seeding', [])
        
        try:
            # Update registration seeds
            for seed_info in seeding_data:
                registration = TournamentRegistration.objects.get(
                    id=seed_info['registration_id'],
                    tournament=bracket.tournament
                )
                registration.seed = seed_info['seed']
                registration.save()
            
            # Regenerate bracket with new seeding
            generator = BracketGenerator(bracket.tournament)
            new_bracket = generator.generate()
            
            from .serializers import BracketSerializer
            serializer = BracketSerializer(new_bracket)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def visualization_data(self, request, pk=None):
        """Get bracket data formatted for frontend visualization."""
        bracket = self.get_object()
        return Response(bracket.bracket_data)


class MatchScheduleViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for match scheduling.
    
    GET /tournaments/{id}/schedule - Get match schedule
    POST /tournaments/{id}/schedule/optimize - Optimize schedule
    PUT /matches/{id}/schedule - Reschedule match
    """
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['match__tournament', 'court', 'status', 'datetime']
    ordering_fields = ['datetime', 'court', 'priority']
    ordering = ['datetime']
    
    def get_queryset(self):
        return MatchSchedule.objects.filter(
            match__tournament__organization=self.get_organization(),
            match__tournament__club=self.get_club()
        ).select_related(
            'match__tournament',
            'match__team1',
            'match__team2',
            'court'
        )
    
    def get_serializer_class(self):
        from .serializers import MatchScheduleSerializer, MatchRescheduleSerializer
        if self.action in ['update', 'partial_update', 'reschedule']:
            return MatchRescheduleSerializer
        return MatchScheduleSerializer
    
    @action(detail=False, methods=['post'], url_path='(?P<tournament_id>[^/.]+)/generate')
    def generate_schedule(self, request, tournament_id=None):
        """Generate optimized match schedule for tournament."""
        tournament = get_object_or_404(
            Tournament,
            id=tournament_id,
            organization=self.get_organization(),
            club=self.get_club()
        )
        
        # Get matches without schedule
        matches = Match.objects.filter(
            tournament=tournament,
            schedule__isnull=True
        ).order_by('round_number', 'match_number')
        
        if not matches:
            return Response(
                {"message": "All matches already scheduled"},
                status=status.HTTP_200_OK
            )
        
        try:
            # Create scheduler and generate schedule
            scheduler = MatchScheduler(tournament)
            schedules = scheduler.schedule_matches(list(matches))
            
            from .serializers import MatchScheduleSerializer
            serializer = MatchScheduleSerializer(schedules, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='(?P<tournament_id>[^/.]+)/optimize')
    def optimize_schedule(self, request, tournament_id=None):
        """Optimize existing tournament schedule."""
        tournament = get_object_or_404(
            Tournament,
            id=tournament_id,
            organization=self.get_organization(),
            club=self.get_club()
        )
        
        schedules = list(
            MatchSchedule.objects.filter(
                match__tournament=tournament
            ).select_related('match', 'court')
        )
        
        if not schedules:
            return Response(
                {"error": "No schedules to optimize"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            scheduler = MatchScheduler(tournament)
            optimized = scheduler.optimize_schedule(schedules)
            
            from .serializers import MatchScheduleSerializer
            serializer = MatchScheduleSerializer(optimized, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def check_conflicts(self, request, pk=None):
        """Check for scheduling conflicts."""
        schedule = self.get_object()
        has_conflicts = not schedule.check_conflicts()
        
        return Response({
            'has_conflicts': has_conflicts,
            'conflict_reason': schedule.conflict_reason if has_conflicts else None
        })
    
    @action(detail=False, methods=['post'])
    def resolve_conflicts(self, request):
        """Resolve scheduling conflicts."""
        conflict_ids = request.data.get('schedule_ids', [])
        
        schedules = MatchSchedule.objects.filter(
            id__in=conflict_ids,
            match__tournament__organization=self.get_organization()
        )
        
        conflicts = [{'schedule': s} for s in schedules if s.has_conflict]
        
        if not conflicts:
            return Response(
                {"message": "No conflicts found"},
                status=status.HTTP_200_OK
            )
        
        try:
            scheduler = MatchScheduler(schedules.first().match.tournament)
            resolved = scheduler.resolve_conflicts(conflicts)
            
            from .serializers import MatchScheduleSerializer
            serializer = MatchScheduleSerializer(resolved, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProgressionViewSet(viewsets.ViewSet):
    """
    ViewSet for tournament progression management.
    
    POST /matches/{id}/result - Submit match result
    GET /tournaments/{id}/standings - Get current standings
    GET /tournaments/{id}/next-matches - Get upcoming matches
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='matches/(?P<match_id>[^/.]+)/result')
    def submit_result(self, request, match_id=None):
        """Submit match result and advance tournament."""
        match = get_object_or_404(
            Match,
            id=match_id,
            tournament__organization=request.user.organization,
            tournament__club=request.user.club
        )
        
        if match.status == 'completed':
            return Response(
                {"error": "Match already completed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate winner
        winner_id = request.data.get('winner_id')
        if not winner_id:
            return Response(
                {"error": "winner_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            winner = TournamentRegistration.objects.get(
                id=winner_id,
                tournament=match.tournament
            )
            
            if winner not in [match.team1, match.team2]:
                return Response(
                    {"error": "Winner must be one of the match teams"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Submit scores if provided
            scores = request.data.get('scores', [])
            for score_set in scores:
                match.record_set_score(
                    score_set['team1_games'],
                    score_set['team2_games']
                )
            
            # Advance winner
            engine = ProgressionEngine(match.tournament)
            next_node = engine.advance_winner(match, winner)
            
            # Update bracket if exists
            if hasattr(match.tournament, 'bracket_structure'):
                engine.update_bracket(
                    match.tournament.bracket_structure,
                    {'match_id': match.id, 'winner_id': winner.id}
                )
            
            response_data = {
                "message": "Match result recorded successfully",
                "match_status": match.status,
                "winner": winner.team_display_name
            }
            
            if next_node and next_node.match:
                response_data["next_match"] = {
                    "id": next_node.match.id,
                    "round": next_node.round,
                    "scheduled_date": next_node.match.scheduled_date
                }
            
            return Response(response_data)
            
        except TournamentRegistration.DoesNotExist:
            return Response(
                {"error": "Invalid winner_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='tournaments/(?P<tournament_id>[^/.]+)/standings')
    def get_standings(self, request, tournament_id=None):
        """Get current tournament standings."""
        tournament = get_object_or_404(
            Tournament,
            id=tournament_id,
            organization=request.user.organization,
            club=request.user.club
        )
        
        engine = ProgressionEngine(tournament)
        standings = engine.calculate_standings()
        
        return Response(standings)
    
    @action(detail=False, methods=['get'], url_path='tournaments/(?P<tournament_id>[^/.]+)/next-matches')
    def get_next_matches(self, request, tournament_id=None):
        """Get upcoming matches that are ready to be played."""
        tournament = get_object_or_404(
            Tournament,
            id=tournament_id,
            organization=request.user.organization,
            club=request.user.club
        )
        
        engine = ProgressionEngine(tournament)
        next_matches = engine.determine_next_matches()
        
        from .serializers import MatchListSerializer
        serializer = MatchListSerializer(next_matches, many=True)
        
        return Response(serializer.data)


# League Scheduling ViewSets
class LeagueViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for league management.
    Handles CRUD operations for leagues and basic league operations.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['format', 'is_active', 'frequency']
    ordering_fields = ['start_date', 'name', 'created_at']
    ordering = ['-start_date']
    
    def get_queryset(self):
        return League.objects.filter(
            organization=self.get_organization(),
            club=self.get_club()
        ).prefetch_related('teams', 'constraints', 'schedules')
    
    def get_serializer_class(self):
        from .serializers import LeagueSerializer, LeagueDetailSerializer
        if self.action == 'list':
            return LeagueSerializer
        return LeagueDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.get_organization(),
            club=self.get_club()
        )
    
    @action(detail=True, methods=['get'])
    def teams(self, request, pk=None):
        """Get teams registered for the league."""
        league = self.get_object()
        teams = league.teams.all().select_related(
            'player1__user', 'player2__user', 'home_venue'
        )
        
        from .serializers import LeagueTeamSerializer
        serializer = LeagueTeamSerializer(teams, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def register_team(self, request, pk=None):
        """Register a team for the league."""
        league = self.get_object()
        data = request.data.copy()
        data['league'] = league.id
        
        from .serializers import LeagueTeamCreateSerializer
        serializer = LeagueTeamCreateSerializer(data=data)
        
        if serializer.is_valid():
            team = serializer.save()
            detail_serializer = LeagueTeamSerializer(team)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
        """Get matches for the league."""
        league = self.get_object()
        matches = league.matches.all().select_related(
            'home_team', 'away_team', 'winner', 'court'
        ).order_by('round_number', 'match_number')
        
        from .serializers import LeagueMatchSerializer
        serializer = LeagueMatchSerializer(matches, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def standings(self, request, pk=None):
        """Get current league standings."""
        league = self.get_object()
        
        # Calculate standings
        teams = league.teams.all()
        standings = []
        
        for team in teams:
            home_wins = team.home_matches.filter(winner=team).count()
            away_wins = team.away_matches.filter(winner=team).count()
            total_wins = home_wins + away_wins
            
            home_matches = team.home_matches.filter(status='completed').count()
            away_matches = team.away_matches.filter(status='completed').count()
            total_matches = home_matches + away_matches
            
            standings.append({
                'team': {
                    'id': team.id,
                    'name': team.name,
                    'division': team.division
                },
                'matches_played': total_matches,
                'wins': total_wins,
                'losses': total_matches - total_wins,
                'points': team.current_points,
                'win_percentage': (total_wins / total_matches * 100) if total_matches > 0 else 0
            })
        
        # Sort by points, then by win percentage
        standings.sort(key=lambda x: (x['points'], x['win_percentage']), reverse=True)
        
        return Response(standings)
    
    @action(detail=True, methods=['get'])
    def constraints(self, request, pk=None):
        """Get scheduling constraints for the league."""
        league = self.get_object()
        constraints = league.constraints.filter(is_active=True)
        
        from .serializers import ScheduleConstraintSerializer
        serializer = ScheduleConstraintSerializer(constraints, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_constraint(self, request, pk=None):
        """Add a scheduling constraint to the league."""
        league = self.get_object()
        data = request.data.copy()
        data['league'] = league.id
        
        from .serializers import ScheduleConstraintCreateSerializer
        serializer = ScheduleConstraintCreateSerializer(data=data)
        
        if serializer.is_valid():
            constraint = serializer.save()
            detail_serializer = ScheduleConstraintSerializer(constraint)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeagueScheduleViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for league schedule generation and optimization.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['league', 'status', 'algorithm_used']
    ordering_fields = ['generation_timestamp', 'quality_score']
    ordering = ['-generation_timestamp']
    
    def get_queryset(self):
        return LeagueSchedule.objects.filter(
            league__organization=self.get_organization(),
            league__club=self.get_club()
        ).select_related('league')
    
    def get_serializer_class(self):
        from .serializers import LeagueScheduleSerializer
        return LeagueScheduleSerializer
    
    @action(detail=False, methods=['post'], url_path='(?P<league_id>[^/.]+)/generate')
    def generate_schedule(self, request, league_id=None):
        """Generate optimal schedule for a league."""
        league = get_object_or_404(
            League,
            id=league_id,
            organization=self.get_organization(),
            club=self.get_club()
        )
        
        # Check if league has enough teams
        team_count = league.teams.count()
        if team_count < 4:
            return Response(
                {"error": "League needs at least 4 teams to generate schedule"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get algorithm preference from request
        algorithm = request.data.get('algorithm', 'auto')
        
        try:
            scheduler = LeagueScheduler(league)
            league_schedule = scheduler.generate_schedule(algorithm=algorithm)
            
            from .serializers import LeagueScheduleSerializer
            serializer = LeagueScheduleSerializer(league_schedule)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def quality_report(self, request, pk=None):
        """Get detailed quality metrics for the schedule."""
        schedule = self.get_object()
        
        # Get optimization run data
        latest_optimization = schedule.league.optimizations.filter(
            status='completed'
        ).order_by('-start_time').first()
        
        report = {
            'schedule_id': schedule.id,
            'quality_score': schedule.quality_score,
            'algorithm_used': schedule.algorithm_used,
            'generation_time': schedule.generation_timestamp,
            'total_matches': schedule.league.matches.count(),
        }
        
        if latest_optimization:
            report.update({
                'optimization_duration': latest_optimization.duration_seconds,
                'travel_burden_score': latest_optimization.travel_burden_score,
                'time_slot_utilization': latest_optimization.time_slot_utilization,
                'fairness_index': latest_optimization.fairness_index,
                'conflict_count': latest_optimization.conflict_count,
                'detailed_results': latest_optimization.results_data
            })
        
        return Response(report)
    
    @action(detail=False, methods=['post'], url_path='(?P<league_id>[^/.]+)/optimize-existing')
    def optimize_existing(self, request, league_id=None):
        """Re-optimize an existing league schedule."""
        league = get_object_or_404(
            League,
            id=league_id,
            organization=self.get_organization(),
            club=self.get_club()
        )
        
        # Check if league has existing matches
        existing_matches = league.matches.filter(
            status__in=['scheduled', 'postponed']
        )
        
        if not existing_matches.exists():
            return Response(
                {"error": "No existing schedule to optimize"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            scheduler = LeagueScheduler(league)
            # This would implement re-optimization of existing schedule
            # For now, generate a new schedule
            league_schedule = scheduler.generate_schedule(algorithm='genetic')
            
            from .serializers import LeagueScheduleSerializer
            serializer = LeagueScheduleSerializer(league_schedule)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReschedulingViewSet(viewsets.ViewSet):
    """
    ViewSet for match rescheduling operations.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='matches/(?P<match_id>[^/.]+)/reschedule')
    def reschedule_match(self, request, match_id=None):
        """Reschedule a single league match."""
        try:
            match = LeagueMatch.objects.get(
                id=match_id,
                league__organization=request.user.organization,
                league__club=request.user.club
            )
        except LeagueMatch.DoesNotExist:
            return Response(
                {"error": "Match not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse reason and preferences from request
        reason_data = request.data.get('reason', {})
        reason = RescheduleReason(
            type=reason_data.get('type', 'request'),
            description=reason_data.get('description', 'Manual reschedule'),
            priority=reason_data.get('priority', 3)
        )
        
        preferred_datetime = None
        if 'preferred_datetime' in request.data:
            from datetime import datetime
            preferred_datetime = datetime.fromisoformat(
                request.data['preferred_datetime'].replace('Z', '+00:00')
            )
        
        try:
            rescheduler = MatchRescheduler(match.league)
            success = rescheduler.reschedule_match(match, reason, preferred_datetime)
            
            if success:
                # Reload match to get updated data
                match.refresh_from_db()
                from .serializers import LeagueMatchSerializer
                serializer = LeagueMatchSerializer(match)
                return Response({
                    'message': 'Match rescheduled successfully',
                    'match': serializer.data
                })
            else:
                return Response(
                    {"error": "Could not find suitable alternative slot"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='leagues/(?P<league_id>[^/.]+)/bulk-reschedule')
    def bulk_reschedule(self, request, league_id=None):
        """Bulk reschedule multiple matches (e.g., weather cancellation)."""
        try:
            league = League.objects.get(
                id=league_id,
                organization=request.user.organization,
                club=request.user.club
            )
        except League.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        match_ids = request.data.get('match_ids', [])
        matches = list(league.matches.filter(id__in=match_ids))
        
        if not matches:
            return Response(
                {"error": "No valid matches found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse reason
        reason_data = request.data.get('reason', {})
        reason = RescheduleReason(
            type=reason_data.get('type', 'bulk'),
            description=reason_data.get('description', 'Bulk reschedule'),
            priority=reason_data.get('priority', 2),
            affects_multiple=True
        )
        
        try:
            rescheduler = MatchRescheduler(league)
            results = rescheduler.bulk_reschedule(matches, reason)
            
            return Response({
                'message': f"Rescheduled {len(results['successfully_rescheduled'])} matches",
                'results': {
                    'successful_count': len(results['successfully_rescheduled']),
                    'failed_count': len(results['failed_to_reschedule']),
                    'manual_intervention_count': len(results['requires_manual_intervention']),
                    'successful_matches': [m.id for m in results['successfully_rescheduled']],
                    'failed_matches': [m.id for m in results['failed_to_reschedule']],
                    'manual_intervention_matches': [m.id for m in results['requires_manual_intervention']]
                }
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='leagues/(?P<league_id>[^/.]+)/weather-cancellation')
    def handle_weather_cancellation(self, request, league_id=None):
        """Handle weather-related match cancellations."""
        try:
            league = League.objects.get(
                id=league_id,
                organization=request.user.organization,
                club=request.user.club
            )
        except League.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse date and weather info
        date_str = request.data.get('date')
        weather_type = request.data.get('weather_type', 'rain')
        court_ids = request.data.get('affected_court_ids', [])
        
        if not date_str:
            return Response(
                {"error": "Date is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from datetime import datetime
        try:
            date = datetime.fromisoformat(date_str).date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use ISO format (YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get affected courts if specified
        affected_courts = None
        if court_ids:
            from apps.clubs.models import Court
            affected_courts = Court.objects.filter(id__in=court_ids)
        
        try:
            rescheduler = MatchRescheduler(league)
            results = rescheduler.handle_weather_cancellation(
                date, affected_courts, weather_type
            )
            
            return Response({
                'message': f"Handled weather cancellation for {date}",
                'weather_type': weather_type,
                'results': {
                    'successful_count': len(results['successfully_rescheduled']),
                    'failed_count': len(results['failed_to_reschedule']),
                    'manual_intervention_count': len(results['requires_manual_intervention'])
                }
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='leagues/(?P<league_id>[^/.]+)/compress-schedule')
    def compress_schedule(self, request, league_id=None):
        """Compress league schedule to finish by target date."""
        try:
            league = League.objects.get(
                id=league_id,
                organization=request.user.organization,
                club=request.user.club
            )
        except League.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        target_date_str = request.data.get('target_end_date')
        max_matches_per_day = request.data.get('max_matches_per_day', 5)
        
        if not target_date_str:
            return Response(
                {"error": "target_end_date is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from datetime import datetime
        try:
            target_date = datetime.fromisoformat(target_date_str).date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use ISO format (YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rescheduler = MatchRescheduler(league)
            success = rescheduler.compress_schedule(target_date, max_matches_per_day)
            
            if success:
                return Response({
                    'message': f"Schedule compressed to end by {target_date}",
                    'new_end_date': target_date.isoformat()
                })
            else:
                return Response(
                    {"error": "Could not compress schedule to target date"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class GeographicOptimizationViewSet(viewsets.ViewSet):
    """
    ViewSet for geographic optimization operations.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='leagues/(?P<league_id>[^/.]+)/cluster-teams')
    def cluster_teams(self, request, league_id=None):
        """Cluster teams by geographic location."""
        try:
            league = League.objects.get(
                id=league_id,
                organization=request.user.organization,
                club=request.user.club
            )
        except League.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        num_clusters = request.data.get('num_clusters')
        
        try:
            optimizer = GeographicOptimizer(league)
            clusters = optimizer.cluster_teams_by_location(num_clusters)
            
            # Format response
            cluster_data = {}
            for cluster_id, team_locations in clusters.items():
                cluster_data[cluster_id] = {
                    'team_count': len(team_locations),
                    'teams': [
                        {
                            'id': tl.team.id,
                            'name': tl.team.name,
                            'location': {
                                'lat': tl.location.lat,
                                'lng': tl.location.lng,
                                'name': tl.location.name
                            }
                        }
                        for tl in team_locations
                    ]
                }
            
            return Response({
                'league_id': league.id,
                'total_clusters': len(clusters),
                'clusters': cluster_data
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='leagues/(?P<league_id>[^/.]+)/travel-report')
    def travel_report(self, request, league_id=None):
        """Generate comprehensive travel analysis report."""
        try:
            league = League.objects.get(
                id=league_id,
                organization=request.user.organization,
                club=request.user.club
            )
        except League.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            optimizer = GeographicOptimizer(league)
            report = optimizer.generate_travel_report()
            
            return Response(report)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='leagues/(?P<league_id>[^/.]+)/suggest-divisions')
    def suggest_divisions(self, request, league_id=None):
        """Suggest optimal division structure based on geography."""
        try:
            league = League.objects.get(
                id=league_id,
                organization=request.user.organization,
                club=request.user.club
            )
        except League.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        max_teams_per_division = request.data.get('max_teams_per_division', 12)
        
        try:
            optimizer = GeographicOptimizer(league)
            suggested_divisions = optimizer.suggest_optimal_divisions(max_teams_per_division)
            
            # Format response
            divisions_data = []
            for i, division_teams in enumerate(suggested_divisions, 1):
                divisions_data.append({
                    'division_number': i,
                    'team_count': len(division_teams),
                    'teams': [
                        {
                            'id': team.id,
                            'name': team.name,
                            'current_division': team.division
                        }
                        for team in division_teams
                    ]
                })
            
            return Response({
                'league_id': league.id,
                'suggested_divisions': len(suggested_divisions),
                'divisions': divisions_data,
                'max_teams_per_division': max_teams_per_division
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# League Scheduling ViewSets

class SeasonViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing seasons.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['year', 'is_active']
    ordering_fields = ['year', 'start_date', 'name']
    ordering = ['-year', '-start_date']
    
    def get_queryset(self):
        return Season.objects.all().order_by('-year')
    
    def get_serializer_class(self):
        from .serializers import SeasonSerializer
        return SeasonSerializer


class LeagueViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing leagues.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['season', 'format', 'status', 'divisions']
    ordering_fields = ['start_date', 'created_at', 'name']
    ordering = ['-start_date']
    
    def get_queryset(self):
        return League.objects.filter(
            club=self.get_club()
        ).select_related('season', 'organizer').prefetch_related(
            'team_registrations', 'constraints'
        )
    
    def get_serializer_class(self):
        from .serializers import LeagueSerializer, LeagueDetailSerializer
        if self.action in ['list']:
            return LeagueSerializer
        return LeagueDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            club=self.get_club(),
            organizer=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def generate_schedule(self, request, pk=None):
        """Generate optimal schedule for league."""
        league = self.get_object()
        
        if league.status not in ['registration_closed']:
            return Response(
                {"error": "League must be in registration_closed status to generate schedule"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            scheduler = LeagueScheduler(league)
            schedule = scheduler.generate_schedule()
            
            from .serializers import LeagueScheduleSerializer
            serializer = LeagueScheduleSerializer(schedule)
            
            return Response({
                "message": "Schedule generated successfully",
                "schedule": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def schedule_quality_report(self, request, pk=None):
        """Get metrics on schedule quality."""
        league = self.get_object()
        
        try:
            schedule = league.schedule
        except LeagueSchedule.DoesNotExist:
            return Response(
                {"error": "No schedule found for this league"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate quality metrics
        matches = league.league_matches.all()
        constraint_manager = ConstraintManager(league)
        
        schedule_data = {
            'matches': [
                {
                    'home_team': match.home_team,
                    'away_team': match.away_team,
                    'datetime': match.scheduled_date,
                    'court_id': match.court.id if match.court else None,
                }
                for match in matches
            ]
        }
        
        evaluation_results = constraint_manager.evaluate_schedule(schedule_data)
        
        quality_report = {
            'overall_score': schedule.quality_score,
            'total_travel_distance': schedule.total_travel_distance,
            'algorithm_used': schedule.algorithm_used,
            'generated_at': schedule.generated_at,
            'constraint_violations': evaluation_results,
            'recommendations': constraint_manager.suggest_constraint_adjustments(evaluation_results)
        }
        
        return Response(quality_report)
    
    @action(detail=True, methods=['post'])
    def optimize_existing(self, request, pk=None):
        """Re-optimize existing schedule."""
        league = self.get_object()
        
        try:
            schedule = league.schedule
        except LeagueSchedule.DoesNotExist:
            return Response(
                {"error": "No existing schedule to optimize"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Generate new optimized schedule
            scheduler = LeagueScheduler(league)
            new_schedule = scheduler.generate_schedule()
            
            from .serializers import LeagueScheduleSerializer
            serializer = LeagueScheduleSerializer(new_schedule)
            
            return Response({
                "message": "Schedule optimized successfully",
                "schedule": serializer.data,
                "improvement": {
                    "previous_score": schedule.quality_score,
                    "new_score": new_schedule.quality_score,
                    "improvement": new_schedule.quality_score - (schedule.quality_score or 0)
                }
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class LeagueTeamRegistrationViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing league team registrations.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['team_name', 'captain__user__first_name', 'captain__user__last_name']
    filterset_fields = ['league', 'status', 'division']
    ordering_fields = ['created_at', 'team_name', 'division']
    ordering = ['league', 'division', 'team_name']
    
    def get_queryset(self):
        return LeagueTeamRegistration.objects.filter(
            league__club=self.get_club()
        ).select_related(
            'league', 'captain__user', 'preferred_home_venue'
        ).prefetch_related('players')
    
    def get_serializer_class(self):
        from .serializers import LeagueTeamRegistrationSerializer
        return LeagueTeamRegistrationSerializer
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a team registration."""
        registration = self.get_object()
        
        if registration.status != 'pending':
            return Response(
                {"error": "Can only confirm pending registrations"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration.status = 'confirmed'
        registration.save()
        
        serializer = self.get_serializer(registration)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Withdraw team from league."""
        registration = self.get_object()
        
        if registration.status in ['withdrawn']:
            return Response(
                {"error": "Registration already withdrawn"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if league has started
        if registration.league.status in ['in_progress', 'completed']:
            return Response(
                {"error": "Cannot withdraw after league has started"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration.status = 'withdrawn'
        registration.save()
        
        return Response({"message": "Team withdrawn successfully"})


class ReschedulingViewSet(viewsets.ViewSet):
    """
    ViewSet for handling match rescheduling.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def reschedule_match(self, request):
        """Reschedule individual league match."""
        match_id = request.data.get('match_id')
        reason = request.data.get('reason', '')
        
        if not match_id:
            return Response(
                {"error": "match_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            match = LeagueMatch.objects.get(
                id=match_id,
                league__club=request.user.club
            )
            
            rescheduler = MatchRescheduler(match.league)
            success = rescheduler.reschedule_match(match, reason)
            
            if success:
                from .serializers import LeagueMatchSerializer
                serializer = LeagueMatchSerializer(match)
                return Response({
                    "message": "Match rescheduled successfully",
                    "match": serializer.data
                })
            else:
                return Response(
                    {"error": "Could not find alternative time slot"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except LeagueMatch.DoesNotExist:
            return Response(
                {"error": "Match not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def bulk_reschedule(self, request):
        """Handle weather/emergency rescheduling."""
        date = request.data.get('date')
        court_ids = request.data.get('court_ids', [])
        reason = request.data.get('reason', 'Weather cancellation')
        
        if not date:
            return Response(
                {"error": "date is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            date_obj = datetime.fromisoformat(date).date()
            
            # Find a league to use the rescheduler (any league with affected matches)
            affected_match = LeagueMatch.objects.filter(
                scheduled_date__date=date_obj,
                court_id__in=court_ids if court_ids else [],
                league__club=request.user.club
            ).first()
            
            if not affected_match:
                return Response(
                    {"message": "No affected matches found"},
                    status=status.HTTP_200_OK
                )
            
            rescheduler = MatchRescheduler(affected_match.league)
            results = rescheduler.handle_weather_cancellation(date_obj, court_ids)
            
            return Response({
                "message": "Bulk rescheduling completed",
                "results": results
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class LeagueScheduleViewSet(MultiTenantViewMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing league schedules.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['league', 'algorithm_used']
    ordering_fields = ['generated_at', 'quality_score']
    ordering = ['-generated_at']
    
    def get_queryset(self):
        return LeagueSchedule.objects.filter(
            league__club=self.get_club()
        ).select_related('league')
    
    def get_serializer_class(self):
        from .serializers import LeagueScheduleSerializer
        return LeagueScheduleSerializer
    
    @action(detail=True, methods=['get'])
    def matches_by_round(self, request, pk=None):
        """Get matches organized by round."""
        schedule = self.get_object()
        
        rounds_data = {}
        for round_obj in schedule.league.rounds.all().order_by('round_number'):
            matches = round_obj.matches.select_related(
                'home_team', 'away_team', 'court'
            ).order_by('scheduled_date')
            
            from .serializers import LeagueMatchSerializer
            serializer = LeagueMatchSerializer(matches, many=True)
            
            rounds_data[f"round_{round_obj.round_number}"] = {
                'round_number': round_obj.round_number,
                'start_date': round_obj.start_date,
                'end_date': round_obj.end_date,
                'is_active': round_obj.is_active,
                'is_completed': round_obj.is_completed,
                'matches': serializer.data
            }
        
        return Response(rounds_data)
    
    @action(detail=True, methods=['get'])
    def calendar_view(self, request, pk=None):
        """Get schedule in calendar format."""
        schedule = self.get_object()
        
        matches = LeagueMatch.objects.filter(
            league=schedule.league
        ).select_related(
            'home_team', 'away_team', 'court', 'round'
        ).order_by('scheduled_date')
        
        calendar_data = {}
        
        for match in matches:
            date_str = match.scheduled_date.date().isoformat()
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            
            from .serializers import LeagueMatchSerializer
            serializer = LeagueMatchSerializer(match)
            
            calendar_data[date_str].append({
                **serializer.data,
                'time': match.scheduled_date.time().strftime('%H:%M'),
            })
        
        return Response(calendar_data)


class ConstraintViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing scheduling constraints.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['league', 'constraint_type', 'priority', 'is_active']
    ordering_fields = ['league', 'constraint_type', 'priority']
    ordering = ['league', 'priority', 'constraint_type']
    
    def get_queryset(self):
        return ScheduleConstraint.objects.filter(
            league__club=self.get_club()
        ).select_related('league')
    
    def get_serializer_class(self):
        from .serializers import ScheduleConstraintSerializer
        return ScheduleConstraintSerializer
    
    @action(detail=False, methods=['get'])
    def available_types(self, request):
        """Get available constraint types."""
        from .constraints import ConstraintManager
        
        constraint_types = [
            {
                'value': choice[0],
                'label': choice[1],
                'description': self._get_constraint_description(choice[0])
            }
            for choice in ScheduleConstraint.CONSTRAINT_TYPE_CHOICES
        ]
        
        return Response(constraint_types)
    
    def _get_constraint_description(self, constraint_type):
        descriptions = {
            'court_availability': 'Ensures courts are available and not double-booked',
            'player_availability': 'Respects player availability windows and preferences',
            'travel_distance': 'Minimizes total travel distance for all teams',
            'rest_period': 'Ensures adequate rest time between matches for teams',
            'blackout_dates': 'Prevents scheduling during holidays or blackout periods',
            'venue_capacity': 'Ensures venue capacity is adequate for expected attendance',
            'weather': 'Considers weather conditions for outdoor courts',
        }
        return descriptions.get(constraint_type, '')
    
    @action(detail=True, methods=['post'])
    def test_constraint(self, request, pk=None):
        """Test constraint against sample match data."""
        constraint_obj = self.get_object()
        match_data = request.data.get('match_data', {})
        
        if not match_data:
            return Response(
                {"error": "match_data is required for testing"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .constraints import ConstraintManager
            
            constraint_class = ConstraintManager.CONSTRAINT_CLASSES.get(constraint_obj.constraint_type)
            if not constraint_class:
                return Response(
                    {"error": f"Unknown constraint type: {constraint_obj.constraint_type}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            constraint = constraint_class(constraint_obj)
            violations = constraint.evaluate(match_data)
            
            violations_data = [
                {
                    'constraint_type': v.constraint_type,
                    'severity': v.severity,
                    'message': v.message,
                    'penalty_score': v.penalty_score,
                }
                for v in violations
            ]
            
            return Response({
                'constraint_satisfied': len(violations) == 0,
                'violations': violations_data,
                'total_penalty': sum(v.penalty_score for v in violations)
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
