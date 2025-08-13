"""
Optimized URL configuration for BFF BI endpoints.
These URLs point to optimized views specifically designed for BFF consumption.
"""

from django.urls import path

from .views_optimized import bulk_availability_check, optimized_club_analytics

app_name = "bi_optimized"

urlpatterns = [
    # Optimized club analytics endpoint for BFF dashboard
    path("analytics/club/", optimized_club_analytics, name="optimized-club-analytics"),
    # Bulk availability check for BFF reservations
    path("availability/bulk/", bulk_availability_check, name="bulk-availability-check"),
]
