"""
URL patterns for clients module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    ClientProfileViewSet,
    EmergencyContactViewSet,
    MedicalInfoViewSet,
    PartnerRequestViewSet,
    PlayerLevelViewSet,
    PlayerPreferencesViewSet,
    PlayerStatsViewSet,
)

router = DefaultRouter()
router.register(r"levels", PlayerLevelViewSet, basename="playerlevel")
router.register(r"profiles", ClientProfileViewSet, basename="clientprofile")
router.register(
    r"emergency-contacts", EmergencyContactViewSet, basename="emergencycontact"
)
router.register(r"medical-info", MedicalInfoViewSet, basename="medicalinfo")
router.register(r"preferences", PlayerPreferencesViewSet, basename="playerpreferences")
router.register(r"partner-requests", PartnerRequestViewSet, basename="partnerrequest")
router.register(r"stats", PlayerStatsViewSet, basename="playerstats")

app_name = "clients"

urlpatterns = [
    path("", include(router.urls)),
]
