"""
URL configuration for notifications module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    NotificationBatchViewSet,
    NotificationChannelViewSet,
    NotificationDeliveryViewSet,
    NotificationEventViewSet,
    NotificationTemplateViewSet,
    NotificationTypeViewSet,
    NotificationViewSet,
    NotificationWebhookView,
    UserNotificationPreferenceViewSet,
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r"types", NotificationTypeViewSet, basename="notification-types")
router.register(
    r"channels", NotificationChannelViewSet, basename="notification-channels"
)
router.register(
    r"templates", NotificationTemplateViewSet, basename="notification-templates"
)
router.register(r"notifications", NotificationViewSet, basename="notifications")
router.register(r"batches", NotificationBatchViewSet, basename="notification-batches")
router.register(
    r"preferences",
    UserNotificationPreferenceViewSet,
    basename="notification-preferences",
)
router.register(
    r"deliveries", NotificationDeliveryViewSet, basename="notification-deliveries"
)
router.register(r"events", NotificationEventViewSet, basename="notification-events")
router.register(r"webhooks", NotificationWebhookView, basename="notification-webhooks")

app_name = "notifications"

urlpatterns = [
    # API endpoints
    path("api/", include(router.urls)),
    # Additional webhook endpoints (for easier provider configuration)
    path(
        "webhooks/resend/",
        NotificationWebhookView.as_view({"post": "resend_webhook"}),
        name="resend-webhook",
    ),
    path(
        "webhooks/twilio/",
        NotificationWebhookView.as_view({"post": "twilio_webhook"}),
        name="twilio-webhook",
    ),
]
