"""
Serializers for authentication module.
"""

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

from django_recaptcha.fields import ReCaptchaField

from .models import AuthAuditLog, OrganizationMembership, OTPVerification, Session, User
from .services import EmailService


class CaptchaField(serializers.CharField):
    """Custom CAPTCHA field that validates reCAPTCHA token."""

    def __init__(self, **kwargs):
        kwargs["write_only"] = True
        kwargs["required"] = settings.ENABLE_CAPTCHA
        kwargs["allow_blank"] = not settings.ENABLE_CAPTCHA
        super().__init__(**kwargs)

    def validate(self, value):
        """Validate reCAPTCHA token."""
        if not settings.ENABLE_CAPTCHA:
            return value

        if not value:
            raise serializers.ValidationError("CAPTCHA es requerido.")

        # Validate with Google reCAPTCHA
        import requests

        verify_url = "https://www.google.com/recaptcha/api/siteverify"
        data = {"secret": settings.RECAPTCHA_PRIVATE_KEY, "response": value}

        try:
            response = requests.post(verify_url, data=data, timeout=5)
            result = response.json()

            if not result.get("success", False):
                errors = result.get("error-codes", [])
                if "timeout-or-duplicate" in errors:
                    raise serializers.ValidationError(
                        "El CAPTCHA ha expirado. Por favor, inténtalo de nuevo."
                    )
                else:
                    raise serializers.ValidationError("Verificación CAPTCHA fallida.")

        except requests.RequestException:
            raise serializers.ValidationError(
                "Error al verificar CAPTCHA. Por favor, inténtalo de nuevo."
            )

        return value


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    club = serializers.SerializerMethodField(read_only=True)

    def get_club(self, obj) -> str:
        """Get user's assigned club information."""
        if obj.club:
            return {
                "id": str(obj.club.id),
                "name": obj.club.name,
                "slug": obj.club.slug,
            }
        return None

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "email_verified",
            "phone_verified",
            "two_factor_enabled",
            "avatar_url",
            "language",
            "timezone",
            "club",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "username",
            "email_verified",
            "phone_verified",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "last_login",
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    captcha = CaptchaField()

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone",
            "captcha",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta con este correo electrónico."
            )
        return value.lower()

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        validated_data.pop("captcha", None)  # Remove captcha field

        # Create user
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data.get("phone", ""),
        )

        # Send verification email
        otp = OTPVerification.generate_for_user(user=user, purpose="email_verification")

        # Send email (async task in production)
        EmailService.send_otp_email(user, otp.code, "verification")

        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField()
    password = serializers.CharField()
    device_type = serializers.ChoiceField(
        choices=["web", "mobile", "tablet"], default="web"
    )
    device_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        email = attrs.get("email").lower()
        password = attrs.get("password")

        # Authenticate user
        user = authenticate(username=email, password=password)

        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")

        if not user.is_active:
            raise serializers.ValidationError("Esta cuenta está desactivada.")

        attrs["user"] = user
        return attrs


class OTPVerificationSerializer(serializers.Serializer):
    """Serializer for OTP verification."""

    code = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.ChoiceField(
        choices=["login", "email_verification", "password_reset"]
    )

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("El código debe contener solo números.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            # Don't reveal if email exists
            pass
        return value.lower()


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset."""

    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Las contraseñas no coinciden."}
            )

        # Verify OTP
        try:
            user = User.objects.get(email__iexact=attrs["email"])
            otp = OTPVerification.objects.filter(
                user=user,
                purpose="password_reset",
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).latest("created_at")

            if not otp.verify(attrs["code"]):
                raise serializers.ValidationError(
                    {"code": "Código inválido o expirado."}
                )

            attrs["user"] = user
            attrs["otp"] = otp

        except (User.DoesNotExist, OTPVerification.DoesNotExist):
            raise serializers.ValidationError({"code": "Código inválido o expirado."})

        return attrs


class SessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions."""

    device_display = serializers.SerializerMethodField()
    location_display = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            "id",
            "device_type",
            "device_name",
            "device_display",
            "location_display",
            "browser",
            "os",
            "last_activity",
            "created_at",
        ]

    def get_device_display(self, obj) -> str:
        if obj.device_name:
            return obj.device_name
        return f"{obj.browser or 'Unknown'} en {obj.os or 'Unknown'}"

    def get_location_display(self, obj) -> str:
        if obj.city and obj.country:
            return f"{obj.city}, {obj.country}"
        return obj.ip_address


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    """Serializer for organization memberships."""

    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "organization",
            "organization_name",
            "role",
            "permissions",
            "joined_at",
        ]
        read_only_fields = ["id", "joined_at"]


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile with memberships."""

    organization_memberships = OrganizationMembershipSerializer(
        many=True, read_only=True
    )
    current_organization = serializers.SerializerMethodField()
    club = serializers.SerializerMethodField(read_only=True)

    def get_club(self, obj) -> str:
        """Get user's assigned club information."""
        if obj.club:
            return {
                "id": str(obj.club.id),
                "name": obj.club.name,
                "slug": obj.club.slug,
            }
        return None

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "email_verified",
            "phone_verified",
            "two_factor_enabled",
            "two_factor_method",
            "avatar_url",
            "language",
            "timezone",
            "organization_memberships",
            "current_organization",
            "current_organization_id",
            "club",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "email_verified",
            "phone_verified",
            "date_joined",
            "last_login",
            "is_staff",
            "is_superuser",
            "is_active",
            "current_organization",
        ]

    def get_current_organization(self, obj) -> str:
        """Get the user's current organization details."""
        org = obj.organization
        if org:
            return {
                "id": org.id,
                "trade_name": org.trade_name,
                "business_name": org.business_name,
                "type": org.type,
                "state": org.state,
            }
        return None


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""

    current_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Las contraseñas no coinciden."}
            )
        return attrs

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value


class TwoFactorSettingsSerializer(serializers.ModelSerializer):
    """Serializer for 2FA settings."""

    class Meta:
        model = User
        fields = ["two_factor_enabled", "two_factor_method"]

    def update(self, instance, validated_data):
        # If enabling 2FA, verify email is confirmed
        if validated_data.get("two_factor_enabled") and not instance.email_verified:
            raise serializers.ValidationError(
                {"two_factor_enabled": "Debes verificar tu email antes de activar 2FA."}
            )

        return super().update(instance, validated_data)


class AuthAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for authentication audit logs."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    organization_name = serializers.CharField(
        source="organization.trade_name", read_only=True
    )
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )

    class Meta:
        model = AuthAuditLog
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "event_type",
            "event_type_display",
            "ip_address",
            "user_agent",
            "success",
            "details",
            "organization",
            "organization_name",
            "attempted_email",
            "country",
            "city",
            "device_type",
            "browser",
            "os",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# Additional serializers for API documentation
class LogoutSerializer(serializers.Serializer):
    """Serializer for logout requests."""
    session_id = serializers.UUIDField(required=False, help_text="Session ID to revoke")

class OTPRequestSerializer(serializers.Serializer):
    """Serializer for OTP requests."""
    email = serializers.EmailField()
    method = serializers.ChoiceField(choices=['email', 'sms', 'whatsapp'], default='email')
    purpose = serializers.ChoiceField(choices=['login', 'email_verification', 'password_reset'], default='login')

class SwitchOrganizationSerializer(serializers.Serializer):
    """Serializer for organization switching."""
    organization_id = serializers.UUIDField()
    session_id = serializers.UUIDField(required=False)

class UserPermissionsSerializer(serializers.Serializer):
    """Serializer for user permissions response."""
    global_permissions = serializers.ListField(child=serializers.CharField())
    club_permissions = serializers.DictField()
