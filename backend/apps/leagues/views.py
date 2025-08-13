"""
Views for leagues module.
"""

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrganizationMember, IsOwnerOrReadOnly

from .models import (
    League,
    LeagueMatch,
    LeagueRules,
    LeagueSchedule,
    LeagueSeason,
    LeagueStanding,
    LeagueTeam,
)
from .serializers import (
    LeagueDetailSerializer,
    LeagueListSerializer,
    LeagueMatchSerializer,
    LeagueRulesSerializer,
    LeagueScheduleSerializer,
    LeagueSeasonSerializer,
    LeagueSerializer,
    LeagueStandingSerializer,
    LeagueStandingsSerializer,
    LeagueTeamRegistrationSerializer,
    LeagueTeamSerializer,
    MatchResultSerializer,
)
from .services import (
    LeagueFixtureGenerator,
    LeagueSchedulingService,
    LeagueStandingsService,
    LeagueStatisticsService,
)


class LeagueViewSet(viewsets.ModelViewSet):
    """ViewSet for managing leagues."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        """Filter leagues by organization."""
        queryset = (
            League.objects.filter(organization=self.request.user.organization)
            .select_related("organizer", "club")
            .prefetch_related("seasons", "rules")
        )

        # Apply filters
        if self.request.query_params.get("status"):
            queryset = queryset.filter(status=self.request.query_params.get("status"))

        if self.request.query_params.get("division"):
            queryset = queryset.filter(
                division=self.request.query_params.get("division")
            )

        if self.request.query_params.get("club"):
            queryset = queryset.filter(club_id=self.request.query_params.get("club"))

        if self.request.query_params.get("is_public"):
            queryset = queryset.filter(
                is_public=self.request.query_params.get("is_public") == "true"
            )

        # Search
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(division__icontains=search)
            )

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == "list":
            return LeagueListSerializer
        elif self.action == "retrieve":
            return LeagueDetailSerializer
        return LeagueSerializer

    def perform_create(self, serializer):
        """Set organization and club when creating a league."""
        serializer.save(
            organization=self.request.user.organization, organizer=self.request.user
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish a league for registration."""
        league = self.get_object()

        if league.status != "draft":
            return Response(
                {"error": "Only draft leagues can be published"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        league.status = "published"
        league.save()

        return Response(
            {"message": "League published successfully", "status": league.status}
        )

    @action(detail=True, methods=["post"])
    def open_registration(self, request, pk=None):
        """Open registration for a league."""
        league = self.get_object()

        if league.status != "published":
            return Response(
                {"error": "League must be published before opening registration"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        league.status = "registration_open"
        league.save()

        return Response(
            {"message": "Registration opened successfully", "status": league.status}
        )

    @action(detail=True, methods=["post"])
    def close_registration(self, request, pk=None):
        """Close registration for a league."""
        league = self.get_object()

        if league.status != "registration_open":
            return Response(
                {"error": "Registration is not currently open"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        league.status = "registration_closed"
        league.save()

        return Response(
            {"message": "Registration closed successfully", "status": league.status}
        )

    @action(detail=True, methods=["get"])
    def statistics(self, request, pk=None):
        """Get league statistics."""
        league = self.get_object()
        current_season = league.current_season

        if not current_season:
            return Response(
                {"error": "No active season found"}, status=status.HTTP_400_BAD_REQUEST
            )

        service = LeagueStatisticsService(current_season)
        stats = service.get_season_statistics()

        return Response(stats)


class LeagueSeasonViewSet(viewsets.ModelViewSet):
    """ViewSet for managing league seasons."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = LeagueSeasonSerializer

    def get_queryset(self):
        """Filter seasons by organization."""
        return (
            LeagueSeason.objects.filter(
                league__organization=self.request.user.organization
            )
            .select_related("league")
            .prefetch_related("teams", "matches", "standings")
        )

    @action(detail=True, methods=["post"])
    def start_season(self, request, pk=None):
        """Start a league season and generate fixtures."""
        season = self.get_object()

        try:
            with transaction.atomic():
                season.start_season()

            return Response(
                {
                    "message": "Season started successfully",
                    "status": season.status,
                    "total_matchdays": season.total_matchdays,
                    "total_matches": season.total_matches,
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def standings(self, request, pk=None):
        """Get league standings for a season."""
        season = self.get_object()
        service = LeagueStandingsService(season)
        standings = service.get_standings_table()

        serializer = LeagueStandingsSerializer(
            {
                "season": season.id,
                "standings": standings,
                "last_updated": timezone.now(),
            }
        )

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def fixtures(self, request, pk=None):
        """Get fixtures for a season."""
        season = self.get_object()
        matchday = request.query_params.get("matchday")

        matches = season.matches.all()
        if matchday:
            matches = matches.filter(matchday=matchday)

        matches = matches.order_by("matchday", "match_number")
        serializer = LeagueMatchSerializer(matches, many=True)

        return Response(
            {
                "season": season.name,
                "total_matchdays": season.total_matchdays,
                "current_matchday": season.current_matchday,
                "matches": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def register_team(self, request, pk=None):
        """Register a team for the season."""
        season = self.get_object()

        if not season.is_registration_open:
            return Response(
                {"error": "Registration is not open for this season"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LeagueTeamRegistrationSerializer(
            data=request.data, context={"season": season}
        )

        if serializer.is_valid():
            team = serializer.save(season=season)

            # If league doesn't require approval, auto-approve
            if not season.league.requires_approval:
                team.status = "active"
                if not season.league.requires_payment:
                    team.payment_status = "paid"
                team.save()

            return Response(
                LeagueTeamSerializer(team).data, status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def generate_schedule(self, request, pk=None):
        """Generate schedule for season matches."""
        season = self.get_object()

        schedule_config = season.schedules.filter(auto_schedule=True).first()
        if not schedule_config:
            return Response(
                {"error": "No auto-schedule configuration found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = LeagueSchedulingService(season)
        try:
            result = service.generate_schedule(schedule_config)
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LeagueTeamViewSet(viewsets.ModelViewSet):
    """ViewSet for managing league teams."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = LeagueTeamSerializer

    def get_queryset(self):
        """Filter teams by organization."""
        return (
            LeagueTeam.objects.filter(
                season__league__organization=self.request.user.organization
            )
            .select_related(
                "season", "player1", "player2", "substitute1", "substitute2"
            )
            .prefetch_related("standings")
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a team registration."""
        team = self.get_object()

        if team.status != "pending":
            return Response(
                {"error": "Team is not pending approval"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team.status = "active"
        team.approved_by = request.user
        team.approved_at = timezone.now()
        team.save()

        return Response(
            {"message": "Team approved successfully", "status": team.status}
        )

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        """Withdraw a team from the league."""
        team = self.get_object()

        if team.status == "withdrawn":
            return Response(
                {"error": "Team is already withdrawn"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team.status = "withdrawn"
        team.save()

        return Response(
            {"message": "Team withdrawn successfully", "status": team.status}
        )

    @action(detail=True, methods=["get"])
    def statistics(self, request, pk=None):
        """Get team statistics."""
        team = self.get_object()
        service = LeagueStatisticsService(team.season)
        stats = service.get_team_statistics(team)

        return Response(stats)


class LeagueMatchViewSet(viewsets.ModelViewSet):
    """ViewSet for managing league matches."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = LeagueMatchSerializer

    def get_queryset(self):
        """Filter matches by organization."""
        queryset = LeagueMatch.objects.filter(
            season__league__organization=self.request.user.organization
        ).select_related("season", "home_team", "away_team", "winner", "court")

        # Apply filters
        if self.request.query_params.get("season"):
            queryset = queryset.filter(
                season_id=self.request.query_params.get("season")
            )

        if self.request.query_params.get("matchday"):
            queryset = queryset.filter(
                matchday=self.request.query_params.get("matchday")
            )

        if self.request.query_params.get("status"):
            queryset = queryset.filter(status=self.request.query_params.get("status"))

        if self.request.query_params.get("team"):
            team_id = self.request.query_params.get("team")
            queryset = queryset.filter(
                Q(home_team_id=team_id) | Q(away_team_id=team_id)
            )

        return queryset.order_by("matchday", "match_number")

    @action(detail=True, methods=["post"])
    def submit_result(self, request, pk=None):
        """Submit match result."""
        match = self.get_object()

        if match.status not in ["scheduled", "confirmed", "in_progress"]:
            return Response(
                {"error": "Cannot submit result for this match status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MatchResultSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            with transaction.atomic():
                # Update match result
                match.home_score = data["home_score"]
                match.away_score = data["away_score"]
                if data.get("duration_minutes"):
                    match.duration_minutes = data["duration_minutes"]
                if data.get("notes"):
                    match.notes = data["notes"]

                if not match.actual_start_time:
                    match.actual_start_time = timezone.now()
                match.actual_end_time = timezone.now()

                # Determine winner
                match.determine_winner()

                return Response(
                    {
                        "message": "Result submitted successfully",
                        "winner": (
                            match.winner.team_display_name if match.winner else "Draw"
                        ),
                        "status": match.status,
                    }
                )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def confirm_result(self, request, pk=None):
        """Confirm match result by team."""
        match = self.get_object()

        if match.status != "completed":
            return Response(
                {"error": "Match must be completed to confirm result"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine which team is confirming
        user_profile = getattr(request.user, "client_profile", None)
        if not user_profile:
            return Response(
                {"error": "User profile not found"}, status=status.HTTP_400_BAD_REQUEST
            )

        is_home_player = user_profile in [
            match.home_team.player1,
            match.home_team.player2,
        ]
        is_away_player = user_profile in [
            match.away_team.player1,
            match.away_team.player2,
        ]

        if not (is_home_player or is_away_player):
            return Response(
                {"error": "You are not authorized to confirm this match"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if is_home_player:
            match.confirmed_by_home = True
        if is_away_player:
            match.confirmed_by_away = True

        if match.is_confirmed:
            match.confirmed_at = timezone.now()

        match.save()

        return Response(
            {
                "message": "Result confirmed successfully",
                "confirmed_by_home": match.confirmed_by_home,
                "confirmed_by_away": match.confirmed_by_away,
                "fully_confirmed": match.is_confirmed,
            }
        )

    @action(detail=True, methods=["post"])
    def reschedule(self, request, pk=None):
        """Reschedule a match."""
        match = self.get_object()

        new_datetime_str = request.data.get("new_datetime")
        new_court_id = request.data.get("new_court_id")

        if not new_datetime_str:
            return Response(
                {"error": "new_datetime is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            new_datetime = timezone.datetime.fromisoformat(
                new_datetime_str.replace("Z", "+00:00")
            )
            new_court = None

            if new_court_id:
                from apps.clubs.models import Court

                new_court = get_object_or_404(Court, id=new_court_id)

            service = LeagueSchedulingService(match.season)
            success = service.reschedule_match(match, new_datetime, new_court)

            if success:
                return Response(
                    {
                        "message": "Match rescheduled successfully",
                        "new_datetime": match.scheduled_date,
                        "new_court": match.court.name if match.court else None,
                    }
                )
            else:
                return Response(
                    {"error": "Failed to reschedule match"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LeagueStandingViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing league standings."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = LeagueStandingSerializer

    def get_queryset(self):
        """Filter standings by organization."""
        return (
            LeagueStanding.objects.filter(
                season__league__organization=self.request.user.organization
            )
            .select_related("team", "season")
            .order_by("-points", "-sets_difference")
        )


class LeagueRulesViewSet(viewsets.ModelViewSet):
    """ViewSet for managing league rules."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = LeagueRulesSerializer

    def get_queryset(self):
        """Filter rules by organization."""
        return LeagueRules.objects.filter(
            league__organization=self.request.user.organization
        ).select_related("league")

    def perform_create(self, serializer):
        """Set league when creating rules."""
        league_id = self.request.data.get("league")
        if league_id:
            league = get_object_or_404(
                League.objects.filter(organization=self.request.user.organization),
                id=league_id,
            )
            serializer.save(league=league)


class LeagueScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing league schedules."""

    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = LeagueScheduleSerializer

    def get_queryset(self):
        """Filter schedules by organization."""
        return (
            LeagueSchedule.objects.filter(
                season__league__organization=self.request.user.organization
            )
            .select_related("season")
            .prefetch_related("preferred_courts")
        )

    def perform_create(self, serializer):
        """Set season when creating schedule."""
        season_id = self.request.data.get("season")
        if season_id:
            season = get_object_or_404(
                LeagueSeason.objects.filter(
                    league__organization=self.request.user.organization
                ),
                id=season_id,
            )
            serializer.save(season=season)
