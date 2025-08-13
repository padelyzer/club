"""
URL configuration for clubs module - EMERGENCY RECOVERY VERSION.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, ClubViewSet, CourtViewSet, ScheduleViewSet, UserClubsView, CourtSpecialPricingViewSet
from .image_views import ClubImageUploadView, CourtImageUploadView, bulk_image_upload, generate_thumbnail

app_name = "clubs"

router = DefaultRouter()
# Register more specific paths first
router.register(r"user-clubs", UserClubsView, basename="user-clubs")
router.register(r"courts", CourtViewSet, basename="court")
router.register(r"special-pricing", CourtSpecialPricingViewSet, basename="special-pricing")
router.register(r"schedules", ScheduleViewSet, basename="schedule")
router.register(r"announcements", AnnouncementViewSet, basename="announcement")
# Register the catch-all pattern last
router.register(r"", ClubViewSet, basename="club")

urlpatterns = [
    path("", include(router.urls)),
    # Image upload endpoints
    path("<int:club_id>/upload-image/", ClubImageUploadView.as_view(), name="club-image-upload"),
    path("<int:club_id>/courts/<int:court_id>/upload-image/", CourtImageUploadView.as_view(), name="court-image-upload"),
    path("bulk-image-upload/", bulk_image_upload, name="bulk-image-upload"),
    path("generate-thumbnail/", generate_thumbnail, name="generate-thumbnail"),
]
