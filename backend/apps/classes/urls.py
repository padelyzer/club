"""
URLs for classes module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from apps.classes.views import (
    CalendarViewSet,
    ClassAttendanceViewSet,
    ClassEnrollmentViewSet,
    ClassLevelViewSet,
    ClassPackageViewSet,
    ClassScheduleViewSet,
    ClassSearchViewSet,
    ClassSessionViewSet,
    ClassTypeViewSet,
    InstructorEvaluationViewSet,
    InstructorViewSet,
    StudentHistoryViewSet,
    StudentPackageViewSet,
)

app_name = "classes"

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r"levels", ClassLevelViewSet, basename="class-level")
router.register(r"types", ClassTypeViewSet, basename="class-type")
router.register(r"instructors", InstructorViewSet, basename="instructor")
router.register(r"schedules", ClassScheduleViewSet, basename="class-schedule")
router.register(r"sessions", ClassSessionViewSet, basename="class-session")
router.register(r"enrollments", ClassEnrollmentViewSet, basename="class-enrollment")
router.register(r"attendance", ClassAttendanceViewSet, basename="class-attendance")
router.register(
    r"evaluations", InstructorEvaluationViewSet, basename="instructor-evaluation"
)
router.register(r"packages", ClassPackageViewSet, basename="class-package")
router.register(r"student-packages", StudentPackageViewSet, basename="student-package")
router.register(r"calendar", CalendarViewSet, basename="calendar")
router.register(r"history", StudentHistoryViewSet, basename="student-history")
router.register(r"search", ClassSearchViewSet, basename="class-search")

urlpatterns = [
    path("", include(router.urls)),
]
