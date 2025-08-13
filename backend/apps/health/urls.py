from django.urls import path
from .views import HealthCheckView, SyncValidationView

app_name = 'health'

urlpatterns = [
    path('check/', HealthCheckView.as_view(), name='health-check'),
    path('validate-sync/', SyncValidationView.as_view(), name='validate-sync'),
]