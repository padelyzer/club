"""
URL configuration for finance module.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentViewSet,
    PaymentMethodViewSet,
    PaymentIntentViewSet,
    RevenueViewSet,
    MembershipViewSet
)
from .webhooks import stripe_webhook
from .revenue_views import (
    daily_revenue_report,
    monthly_revenue_report,
    court_utilization_report,
    payment_method_analysis
)

app_name = "finance"

router = DefaultRouter()
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"payment-methods", PaymentMethodViewSet, basename="payment-method")
router.register(r"payment-intents", PaymentIntentViewSet, basename="payment-intent")
router.register(r"revenues", RevenueViewSet, basename="revenue")
router.register(r"memberships", MembershipViewSet, basename="membership")

urlpatterns = [
    path("", include(router.urls)),
    path("webhooks/stripe/", stripe_webhook, name="stripe-webhook"),
    path("reports/daily/", daily_revenue_report, name="daily-revenue-report"),
    path("reports/monthly/", monthly_revenue_report, name="monthly-revenue-report"),
    path("reports/court-utilization/", court_utilization_report, name="court-utilization-report"),
    path("reports/payment-analysis/", payment_method_analysis, name="payment-method-analysis"),
]