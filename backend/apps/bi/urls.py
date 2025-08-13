"""
URL configuration for Business Intelligence module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AlertViewSet,
    AnalyticsView,
    DashboardViewSet,
    DataSourceViewSet,
    MetricViewSet,
    ReportViewSet,
    WidgetViewSet,
)

app_name = "bi"

# Create router and register viewsets
router = DefaultRouter()
router.register(r"data-sources", DataSourceViewSet, basename="datasource")
router.register(r"metrics", MetricViewSet, basename="metric")
router.register(r"widgets", WidgetViewSet, basename="widget")
router.register(r"dashboards", DashboardViewSet, basename="dashboard")
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"alerts", AlertViewSet, basename="alert")
router.register(r"analytics", AnalyticsView, basename="analytics")

from .views import DashboardOverviewView

urlpatterns = [
    # Include router URLs
    path("", include(router.urls)),
    # Dashboard overview endpoint for quick access
    path('dashboard/', DashboardOverviewView.as_view(), name='dashboard-overview'),
    # Direct analytics endpoints for faster access
    path('kpis/', AnalyticsView.as_view({'get': 'kpis'}), name='kpis'),
    path('revenue/', AnalyticsView.as_view({'get': 'revenue'}), name='revenue'),
    path('usage/', AnalyticsView.as_view({'get': 'usage'}), name='usage'),
    path('growth/', AnalyticsView.as_view({'get': 'growth'}), name='growth'),
]
