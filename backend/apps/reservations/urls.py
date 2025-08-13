"""
URL configuration for reservations module - EMERGENCY RECOVERY VERSION.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import BlockedSlotViewSet, ReservationViewSet, ReservationPaymentViewSet

router = DefaultRouter()
router.register(r"", ReservationViewSet, basename="reservation")  # Sin prefijo para usar directamente /reservations/
router.register(r"blocked-slots", BlockedSlotViewSet, basename="blocked-slot")
router.register(r"payments", ReservationPaymentViewSet, basename="reservation-payment")

app_name = "reservations"

urlpatterns = [
    path("", include(router.urls)),
]
