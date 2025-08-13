"""
Views for authentication module.
"""

import logging
from typing import Any, Dict, Optional

from django.contrib.auth import login, logout
from django.db import transaction
from django.http import HttpRequest
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.shared.decorators import (
    api_default_ratelimit,
    login_ratelimit,
    otp_ratelimit,
    password_reset_ratelimit,
    register_ratelimit,
)
from core.services import security

from .models import AuthAuditLog, BlacklistedToken, OTPVerification, Session, User
from .serializers import (
    AuthAuditLogSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    OTPVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetSerializer,
    ProfileSerializer,
    SessionSerializer,
    TwoFactorSettingsSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)
from .services import EmailService, TokenService
from .signals import (
    emit_otp_failed,
    emit_otp_verified,
    emit_session_revoked,
    organization_switched,
    password_changed,
    password_reset_completed,
    password_reset_requested,
    two_factor_disabled,
    two_factor_enabled,
    two_factor_method_changed,
)

logger = logging.getLogger(__name__)


@method_decorator(register_ratelimit, name="create")
class RegisterView(generics.CreateAPIView):
    """View for user registration."""

    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create user
        user = serializer.save()

        # Send welcome email
        EmailService.send_welcome_email(user)

        # Generate tokens
        tokens = TokenService.generate_tokens(user)

        # Create session
        session = Session.create_for_user(user, request)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "message": "Cuenta creada exitosamente. Por favor verifica tu email.",
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(login_ratelimit, name="post")
class LoginView(APIView):
    serializer_class = LoginSerializer
    """View for user login."""

    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        device_type = serializer.validated_data["device_type"]
        device_name = serializer.validated_data.get("device_name", "")

        # Check for suspicious login
        ip_address = self.get_client_ip(request)
        security_check = security.check_suspicious_login(user, ip_address)

        # Log the login attempt using AuthAuditLog
        AuthAuditLog.log_event(
            event_type="login_attempt",
            request=request,
            user=user,
            success=True,
            details={
                "device_type": device_type,
                "device_name": device_name,
                "suspicious": security_check["is_suspicious"],
                "location": security_check["location"],
            },
        )

        # Log suspicious login if detected
        if security_check["is_suspicious"]:
            AuthAuditLog.log_event(
                event_type="suspicious_login",
                request=request,
                user=user,
                success=True,
                details={
                    "location": security_check["location"],
                    "reason": "new_location",
                },
            )

        # Force 2FA if suspicious or if 2FA is enabled
        if user.two_factor_enabled or security_check["is_suspicious"]:
            # Generate and send OTP
            otp = OTPVerification.generate_for_user(
                user=user,
                purpose="login",
                ip_address=ip_address,
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

            message = "Código de verificación enviado a tu email."
            if security_check["is_suspicious"]:
                message += f" Inicio de sesión desde nueva ubicación: {security_check['location'].get('city', 'Unknown')}, {security_check['location'].get('country', 'Unknown')}."

            EmailService.send_otp_email(user, otp.code, "login")

            return Response(
                {
                    "requires_2fa": True,
                    "message": message,
                    "location_info": (
                        security_check.get("location")
                        if security_check["is_suspicious"]
                        else None
                    ),
                }
            )

        # Login without 2FA
        return self._complete_login(user, request, device_type, device_name)

    def _complete_login(
        self, user: "User", request: Request, device_type: str, device_name: str
    ) -> Response:
        """Complete the login process."""
        ip_address = self.get_client_ip(request)

        # Update last login
        user.last_login = timezone.now()
        user.last_login_ip = ip_address
        user.last_login_device = request.META.get("HTTP_USER_AGENT", "")[:200]
        user.save(update_fields=["last_login", "last_login_ip", "last_login_device"])

        # Log successful login is handled by Django signal user_logged_in
        # Additional device info logging
        AuthAuditLog.log_event(
            event_type="login_success",
            request=request,
            user=user,
            success=True,
            device_type=device_type,
            details={"device_name": device_name, "session_created": True},
        )

        # Generate tokens
        tokens = TokenService.generate_tokens(user)

        # Create session
        session = Session.create_for_user(user, request, device_type)
        if device_name:
            session.device_name = device_name
            session.save()

        # Django login (for session-based auth)
        login(request, user)

        return Response(
            {
                "user": ProfileSerializer(user).data,
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "session_id": session.id,
            }
        )

    def get_client_ip(self, request: Request) -> Optional[str]:
        """Get client IP address."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


@method_decorator(otp_ratelimit, name="post")
class RequestOTPView(APIView):
    serializer_class = LoginSerializer
    """View to request a new OTP code."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        phone = request.data.get("phone")
        method = request.data.get("method", "email")
        purpose = request.data.get("purpose", "login")

        if not email:
            return Response(
                {"error": "Email es requerido."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Don't reveal if user exists or not
            return Response(
                {"message": "Si el email existe, recibirás un código de verificación."}
            )

        # Validate method
        if method not in ["email", "sms", "whatsapp"]:
            return Response(
                {"error": "Método de envío inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # For now, only email is supported
        if method != "email":
            return Response(
                {"error": "Solo el envío por email está disponible actualmente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate purpose
        valid_purposes = ["login", "email_verification", "password_reset"]
        if purpose not in valid_purposes:
            purpose = "login"  # Default to login if invalid purpose

        # Map frontend purpose to backend purpose
        purpose_map = {
            "login": "login",
            "email_verification": "email_verify",
            "password_reset": "password_reset",
        }
        backend_purpose = purpose_map.get(purpose, "login")

        # Generate and send OTP
        otp = OTPVerification.generate_for_user(
            user=user,
            purpose=backend_purpose,
            delivery_method=method,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        # Send OTP based on method
        if method == "email":
            EmailService.send_otp_email(user, otp.code, purpose)
        # TODO: Implement SMS and WhatsApp sending when ready

        # Log OTP request
        AuthAuditLog.log_event(
            event_type="otp_requested",
            request=request,
            user=user,
            success=True,
            details={"method": method, "purpose": purpose},
        )

        return Response({"message": "Código de verificación enviado exitosamente."})

    def get_client_ip(self, request: Request) -> Optional[str]:
        """Get client IP address."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class VerifyOTPView(APIView):
    serializer_class = LoginSerializer
    """View for OTP verification."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Get user from email in session or request
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email es requerido."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = OTPVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        purpose = serializer.validated_data["purpose"]

        # Verify OTP
        try:
            otp = OTPVerification.objects.filter(
                user=user,
                purpose=purpose,
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).latest("created_at")

            success, message = otp.verify(code)
            if not success:
                # Emit OTP failed signal
                emit_otp_failed(user, purpose, message, request)
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        except OTPVerification.DoesNotExist:
            # Log failed OTP attempt
            emit_otp_failed(user, purpose, "OTP not found", request)
            return Response(
                {"error": "Código inválido o expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Emit OTP verified signal
        emit_otp_verified(user, purpose, request)

        # Handle different purposes
        if purpose == "login":
            # Complete 2FA login
            login_view = LoginView()
            return login_view._complete_login(user, request, "web", "")

        elif purpose == "email_verification":
            # Mark email as verified
            user.email_verified = True
            user.save()

            return Response({"message": "Email verificado exitosamente."})

        return Response({"message": "Código verificado."})


class LogoutView(APIView):
    serializer_class = LoginSerializer
    """View for user logout with token blacklisting."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Extract JWT token from the request
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            # Decode the token to get JTI and expiry
            try:
                from rest_framework_simplejwt.exceptions import TokenError
                from rest_framework_simplejwt.tokens import AccessToken

                # Validate and decode the token
                access_token = AccessToken(token)
                jti = access_token.get("jti")
                exp = access_token.get("exp")

                if jti and exp:
                    # Convert exp to datetime
                    from datetime import datetime

                    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)

                    # Blacklist the token
                    BlacklistedToken.blacklist_token(
                        jti=jti,
                        user=request.user,
                        expires_at=expires_at,
                        reason="logout",
                        request=request,
                    )

                    # Invalidate cache for this token
                    from django.core.cache import cache

                    cache_key = f"blacklisted_token_{jti}"
                    cache.set(cache_key, True, 300)

                    # Log the logout event
                    AuthAuditLog.log_event(
                        event_type="logout",
                        request=request,
                        user=request.user,
                        success=True,
                        details={"jti": jti},
                    )

            except (TokenError, KeyError, ValueError) as e:
                logger.warning(f"Failed to blacklist token during logout: {str(e)}")

        # Revoke current session
        session_id = request.data.get("session_id")
        if session_id:
            try:
                session = Session.objects.get(
                    id=session_id, user=request.user, revoked_at__isnull=True
                )
                session.revoke("logout")
                # Emit session revoked signal
                emit_session_revoked(session, "logout")
            except Session.DoesNotExist:
                pass

        # Django logout
        logout(request)

        return Response({"message": "Sesión cerrada exitosamente."})


class LogoutAllView(APIView):
    serializer_class = LoginSerializer
    """View to logout from all devices with token blacklisting."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Blacklist current token
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        current_jti = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                from rest_framework_simplejwt.exceptions import TokenError
                from rest_framework_simplejwt.tokens import AccessToken

                access_token = AccessToken(token)
                current_jti = access_token.get("jti")
                exp = access_token.get("exp")

                if current_jti and exp:
                    from datetime import datetime

                    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)

                    # Blacklist the current token
                    BlacklistedToken.blacklist_token(
                        jti=current_jti,
                        user=request.user,
                        expires_at=expires_at,
                        reason="logout_all",
                        request=request,
                    )

            except (TokenError, KeyError, ValueError) as e:
                logger.warning(f"Failed to blacklist current token: {str(e)}")

        # Get all active tokens for the user from the blacklist model
        # We'll blacklist all refresh tokens by invalidating the user's token version
        # This is more efficient than tracking all individual access tokens

        # Note: For logout_all, we blacklist the current token and rely on
        # password change or token version increment to invalidate other tokens
        # In a production environment, you might want to track all active tokens

        # Revoke all sessions
        sessions = Session.objects.filter(user=request.user, revoked_at__isnull=True)

        # Emit signal for each session
        for session in sessions:
            emit_session_revoked(session, "logout_all")

        sessions.update(revoked_at=timezone.now(), revoked_reason="logout_all")

        # Log logout all event
        AuthAuditLog.log_event(
            event_type="logout_all",
            request=request,
            user=request.user,
            success=True,
            details={"current_jti": current_jti} if current_jti else {},
        )

        # Django logout
        logout(request)

        return Response({"message": "Todas las sesiones cerradas exitosamente."})


@method_decorator(password_reset_ratelimit, name="post")
class PasswordResetRequestView(APIView):
    serializer_class = LoginSerializer
    """View to request password reset."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get user if exists
        user = getattr(serializer, "user", None)
        if user:
            # Generate and send OTP
            otp = OTPVerification.generate_for_user(
                user=user,
                purpose="password_reset",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

            EmailService.send_otp_email(user, otp.code, "password_reset")

            # Emit password reset requested signal
            password_reset_requested.send(
                sender=self.__class__, user=user, request=request
            )

        # Always return success to prevent email enumeration
        return Response(
            {"message": "Si el email existe, recibirás un código de verificación."}
        )

    def get_client_ip(self, request: Request) -> Optional[str]:
        """Get client IP address."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


@method_decorator(password_reset_ratelimit, name="post")
class PasswordResetView(APIView):
    serializer_class = LoginSerializer
    """View to reset password with OTP."""

    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        new_password = serializer.validated_data["new_password"]

        # Set new password
        user.set_password(new_password)
        user.save()

        # Revoke all sessions
        Session.objects.filter(user=user, revoked_at__isnull=True).update(
            revoked_at=timezone.now(), revoked_reason="password_reset"
        )

        # Send confirmation email
        EmailService.send_password_changed_email(user)

        # Emit password reset completed signal
        password_reset_completed.send(sender=self.__class__, user=user, request=request)

        return Response({"message": "Contraseña actualizada exitosamente."})


class ProfileView(generics.RetrieveUpdateAPIView):
    """View for user profile."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        """Update profile and log the event."""
        instance = serializer.save()

        # Log profile update
        AuthAuditLog.log_event(
            event_type="profile_updated",
            request=self.request,
            user=instance,
            success=True,
            details={"updated_fields": list(serializer.validated_data.keys())},
        )


class ChangePasswordView(APIView):
    serializer_class = LoginSerializer
    """View to change password."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_password = serializer.validated_data["new_password"]

        # Set new password
        user.set_password(new_password)
        user.save()

        # Blacklist current token
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                from datetime import datetime

                from rest_framework_simplejwt.exceptions import TokenError
                from rest_framework_simplejwt.tokens import AccessToken

                access_token = AccessToken(token)
                jti = access_token.get("jti")
                exp = access_token.get("exp")

                if jti and exp:
                    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)

                    # Blacklist the token
                    BlacklistedToken.blacklist_token(
                        jti=jti,
                        user=user,
                        expires_at=expires_at,
                        reason="password_changed",
                        request=request,
                    )

            except (TokenError, KeyError, ValueError) as e:
                logger.warning(
                    f"Failed to blacklist token during password change: {str(e)}"
                )

        # Revoke all sessions except current
        current_session_id = request.data.get("current_session_id")
        sessions_to_revoke = Session.objects.filter(user=user, revoked_at__isnull=True)
        if current_session_id:
            sessions_to_revoke = sessions_to_revoke.exclude(id=current_session_id)

        sessions_to_revoke.update(
            revoked_at=timezone.now(), revoked_reason="password_changed"
        )

        # Send notification email
        EmailService.send_password_changed_email(user)

        # Emit password changed signal
        password_changed.send(
            sender=self.__class__,
            user=user,
            request=request,
            method="change_password_api",
        )

        # Generate new tokens
        tokens = TokenService.generate_tokens(user)

        return Response(
            {
                "message": "Contraseña actualizada exitosamente.",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
            }
        )


class TwoFactorSettingsView(generics.UpdateAPIView):
    """View to manage 2FA settings."""

    serializer_class = TwoFactorSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # If enabling 2FA, send verification code
        if (
            serializer.validated_data.get("two_factor_enabled")
            and not instance.two_factor_enabled
        ):

            otp = OTPVerification.generate_for_user(
                user=instance, purpose="email_verification"
            )
            EmailService.send_otp_email(instance, otp.code, "verification")

            return Response(
                {
                    "message": "Código de verificación enviado. Verifica tu email para activar 2FA.",
                    "requires_verification": True,
                }
            )

        self.perform_update(serializer)

        return Response(
            {"message": "Configuración de 2FA actualizada.", "data": serializer.data}
        )


class SessionViewSet(ReadOnlyModelViewSet):
    """ViewSet for managing user sessions."""

    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Session.objects.none()
        return Session.objects.filter(
            user=self.request.user, revoked_at__isnull=True
        ).order_by("-last_activity")

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        """Revoke a specific session."""
        session = self.get_object()

        # Can't revoke current session
        current_session_id = request.data.get("current_session_id")
        if str(session.id) == current_session_id:
            return Response(
                {"error": "No puedes revocar tu sesión actual."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.revoke("manual")

        return Response({"message": "Sesión revocada exitosamente."})


class SwitchOrganizationView(APIView):
    serializer_class = LoginSerializer
    """View to switch current organization context."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Switch to a different organization."""
        organization_id = request.data.get("organization_id")

        if not organization_id:
            return Response(
                {"error": "organization_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Try to set the organization
        from apps.root.models import Organization

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return Response(
                {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Get the current organization before switching
        from_org = request.user.organization

        # Set the current organization
        if request.user.set_current_organization(organization):
            # Update the session if available
            session_id = request.data.get("session_id")
            if session_id:
                try:
                    session = Session.objects.get(
                        id=session_id, user=request.user, is_active=True
                    )
                    session.organization = organization
                    session.save(update_fields=["organization"])
                except Session.DoesNotExist:
                    pass

            # Emit organization switched signal
            organization_switched.send(
                sender=self.__class__,
                user=request.user,
                from_org=from_org,
                to_org=organization,
                request=request,
            )

            return Response(
                {
                    "message": "Organization switched successfully",
                    "current_organization": {
                        "id": organization.id,
                        "trade_name": organization.trade_name,
                        "business_name": organization.business_name,
                        "type": organization.type,
                        "state": organization.state,
                    },
                }
            )
        else:
            return Response(
                {"error": "You do not have access to this organization"},
                status=status.HTTP_403_FORBIDDEN,
            )


class AuthAuditLogViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for querying authentication audit logs.
    Only accessible by admin users.
    """

    serializer_class = AuthAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["user", "event_type", "success", "organization"]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "attempted_email",
        "ip_address",
    ]
    ordering_fields = ["created_at", "event_type", "user"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Get audit logs with optional date filtering."""
        queryset = AuthAuditLog.objects.select_related("user", "organization")

        # Date range filtering
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            try:
                start_date = timezone.datetime.fromisoformat(start_date)
                queryset = queryset.filter(created_at__gte=start_date)
            except (ValueError, TypeError):
                pass

        if end_date:
            try:
                end_date = timezone.datetime.fromisoformat(end_date)
                queryset = queryset.filter(created_at__lte=end_date)
            except (ValueError, TypeError):
                pass

        # IP address prefix filtering
        ip_prefix = self.request.query_params.get("ip_prefix")
        if ip_prefix:
            queryset = queryset.filter(ip_address__startswith=ip_prefix)

        # Event type filtering (multiple)
        event_types = self.request.query_params.getlist("event_types[]")
        if event_types:
            queryset = queryset.filter(event_type__in=event_types)

        return queryset

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get summary statistics of audit logs."""
        queryset = self.filter_queryset(self.get_queryset())

        # Get event type counts
        from django.db.models import Count

        event_type_counts = (
            queryset.values("event_type").annotate(count=Count("id")).order_by("-count")
        )

        # Get success/failure counts
        success_count = queryset.filter(success=True).count()
        failure_count = queryset.filter(success=False).count()

        # Get top IPs
        top_ips = (
            queryset.values("ip_address")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Get recent suspicious activities
        suspicious_events = queryset.filter(
            event_type__in=["login_failed", "suspicious_login", "2fa_failed"]
        ).order_by("-created_at")[:10]

        return Response(
            {
                "total_events": queryset.count(),
                "success_count": success_count,
                "failure_count": failure_count,
                "event_type_counts": event_type_counts,
                "top_ips": top_ips,
                "recent_suspicious": AuthAuditLogSerializer(
                    suspicious_events, many=True
                ).data,
            }
        )

    @action(detail=False, methods=["get"])
    def user_activity(self, request):
        """Get activity for a specific user."""
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.filter_queryset(self.get_queryset().filter(user_id=user_id))

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class UserPermissionsView(APIView):
    serializer_class = LoginSerializer
    """
    View to get user permissions including global and per-club permissions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get user's global and club permissions."""
        user = request.user
        global_permissions = []
        club_permissions = {}

        # Global permissions
        if user.is_superuser:
            global_permissions.append("superuser")
        if user.is_staff:
            global_permissions.append("staff")

        # Organization permissions
        if hasattr(user, "organization") and user.organization:
            global_permissions.append("organization:member")
            
            # Get organization membership with role
            org_membership = user.organization_memberships.filter(
                organization=user.organization, is_active=True
            ).first()
            
            if org_membership:
                global_permissions.append(f"organization:{org_membership.role}")
                
                # Add custom permissions from the membership
                if org_membership.permissions:
                    for perm_key, perm_value in org_membership.permissions.items():
                        if perm_value:
                            global_permissions.append(f"organization:{perm_key}")

        # Club permissions - get all clubs the user has access to
        from apps.clubs.models import Club
        
        # Get clubs through organization membership
        user_clubs = []
        if hasattr(user, "organization") and user.organization:
            user_clubs = Club.objects.filter(
                organization=user.organization, is_active=True
            ).values_list("id", flat=True)
        
        # Add each club's permissions
        for club_id in user_clubs:
            club_id_str = str(club_id)
            club_permissions[club_id_str] = [
                "club:member",
                "club:view",
                "club:book_court",
                "club:manage_profile"
            ]
            
            # Check if user has admin role in organization (gives club admin rights)
            if org_membership and org_membership.role in ["root_admin", "org_admin"]:
                club_permissions[club_id_str].extend([
                    "club:admin",
                    "club:manage_courts",
                    "club:manage_reservations",
                    "club:view_analytics",
                    "club:manage_clients"
                ])

        return Response({
            "global_permissions": global_permissions,
            "club_permissions": club_permissions
        })
