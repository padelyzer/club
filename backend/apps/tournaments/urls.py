"""
URL configuration for tournaments module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    MatchViewSet,
    PrizeViewSet,
    TournamentCategoryViewSet,
    TournamentRegistrationViewSet,
    TournamentRulesViewSet,
    TournamentStatsViewSet,
    TournamentViewSet,
    BracketViewSet,
    MatchScheduleViewSet,
    ProgressionViewSet,
)

app_name = "tournaments"

# Create router for viewsets
router = DefaultRouter()
router.register(r"categories", TournamentCategoryViewSet, basename="categories")
router.register(r"", TournamentViewSet, basename="tournaments")  # Sin prefijo para usar directamente /tournaments/
router.register(
    r"registrations", TournamentRegistrationViewSet, basename="registrations"
)
router.register(r"matches", MatchViewSet, basename="matches")
router.register(r"prizes", PrizeViewSet, basename="prizes")
router.register(r"rules", TournamentRulesViewSet, basename="rules")
router.register(r"stats", TournamentStatsViewSet, basename="stats")
router.register(r"brackets", BracketViewSet, basename="brackets")
router.register(r"schedules", MatchScheduleViewSet, basename="schedules")

# League scheduling endpoints removed - use leagues app instead

# ProgressionViewSet uses custom actions, so we add it separately
urlpatterns = [
    path("", include(router.urls)),
    # Progression endpoints
    path("progression/matches/<uuid:match_id>/result/", 
         ProgressionViewSet.as_view({'post': 'submit_result'}), 
         name="progression-submit-result"),
    path("progression/tournaments/<uuid:tournament_id>/standings/", 
         ProgressionViewSet.as_view({'get': 'get_standings'}), 
         name="progression-standings"),
    path("progression/tournaments/<uuid:tournament_id>/next-matches/", 
         ProgressionViewSet.as_view({'get': 'get_next_matches'}), 
         name="progression-next-matches"),
]
