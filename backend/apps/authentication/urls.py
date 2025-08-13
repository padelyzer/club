"""
URL configuration for authentication module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AuthAuditLogViewSet,
    ChangePasswordView,
    LoginView,
    LogoutAllView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetView,
    ProfileView,
    RegisterView,
    RequestOTPView,
    SessionViewSet,
    SwitchOrganizationView,
    TwoFactorSettingsView,
    UserPermissionsView,
    VerifyOTPView,
)

app_name = "auth"

router = DefaultRouter()
router.register(r"sessions", SessionViewSet, basename="session")
router.register(r"audit-logs", AuthAuditLogViewSet, basename="audit-log")

urlpatterns = [
    # Authentication
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("logout-all/", LogoutAllView.as_view(), name="logout-all"),
    # Token management
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # OTP verification
    path("request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    # Password reset
    path(
        "password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetView.as_view(),
        name="password-reset-confirm",
    ),
    # Profile management
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("2fa-settings/", TwoFactorSettingsView.as_view(), name="2fa-settings"),
    # Organization management
    path(
        "switch-organization/",
        SwitchOrganizationView.as_view(),
        name="switch-organization",
    ),
    # Permissions
    path("permissions/", UserPermissionsView.as_view(), name="permissions"),
    # Session management
    path("", include(router.urls)),
]
