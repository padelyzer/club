"""
URL configuration for ROOT module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AuditLogViewSet,
    ClubOnboardingViewSet,
    CurrentOrganizationView,
    InvoiceViewSet,
    OrganizationViewSet,
    RootClubViewSet,
    SubscriptionViewSet,
    health_check,
    health_ready,
    health_live,
)

app_name = "root"

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet, basename="organization")
router.register(r"organization", CurrentOrganizationView, basename="current-organization")
router.register(r"subscriptions", SubscriptionViewSet, basename="subscription")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"onboarding", ClubOnboardingViewSet, basename="onboarding")
router.register(r"audit-logs", AuditLogViewSet, basename="auditlog")
router.register(r"clubs", RootClubViewSet, basename="rootclub")

urlpatterns = [
    path("", include(router.urls)),
    # Health check endpoints
    path("health/", health_check, name="health-check"),
    path("health/ready/", health_ready, name="health-ready"),
    path("health/live/", health_live, name="health-live"),
]
