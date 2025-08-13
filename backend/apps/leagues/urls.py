"""
URL configuration for leagues module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    LeagueMatchViewSet,
    LeagueRulesViewSet,
    LeagueScheduleViewSet,
    LeagueSeasonViewSet,
    LeagueStandingViewSet,
    LeagueTeamViewSet,
    LeagueViewSet,
)

app_name = "leagues"

router = DefaultRouter()
router.register(r"leagues", LeagueViewSet, basename="league")
router.register(r"seasons", LeagueSeasonViewSet, basename="season")
router.register(r"teams", LeagueTeamViewSet, basename="team")
router.register(r"matches", LeagueMatchViewSet, basename="match")
router.register(r"standings", LeagueStandingViewSet, basename="standing")
router.register(r"rules", LeagueRulesViewSet, basename="rule")
router.register(r"schedules", LeagueScheduleViewSet, basename="schedule")

urlpatterns = [
    path("", include(router.urls)),
]
