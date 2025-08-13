"""
Views for clients module.
"""

from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Avg, Count, F, Q
from django.http import Http404
from django.utils import timezone

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOwnerOrReadOnly

from .mixins import MultiTenantViewMixin
from .models import (
    ClientProfile,
    EmergencyContact,
    MedicalInfo,
    PartnerRequest,
    PlayerLevel,
    PlayerPreferences,
    PlayerStats,
)
from .serializers import (
    ClientProfileCreateSerializer,
    ClientProfileDetailSerializer,
    ClientProfileListSerializer,
    EmergencyContactSerializer,
    MedicalInfoSerializer,
    PartnerRequestResponseSerializer,
    PartnerRequestSerializer,
    PlayerLevelSerializer,
    PlayerPreferencesSerializer,
    PlayerRankingSerializer,
    PlayerSearchSerializer,
    PlayerStatsSerializer,
)

User = get_user_model()


class PlayerLevelViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for player levels (read-only)."""

    queryset = PlayerLevel.objects.filter(is_active=True)
    serializer_class = PlayerLevelSerializer
    permission_classes = [IsAuthenticated]
    ordering = ["min_rating"]




class ClientProfileViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """ViewSet for client profiles with multi-tenant support."""

    queryset = ClientProfile.objects.all()  # Base queryset required
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__first_name", "user__last_name", "user__email", "dni"]
    ordering_fields = ["rating", "created_at", "user__first_name"]
    ordering = ["-rating"]

    def get_queryset(self):
        # Use multi-tenant filtering from mixin
        queryset = super().get_queryset().active()

        # Only show public profiles unless viewing own profile
        if self.action == "list":
            queryset = queryset.filter(Q(is_public=True) | Q(user=self.request.user))

        return queryset.select_related(
            "user", "level", "stats", "medical_info", "preferences"
        ).prefetch_related("emergency_contacts")

    def get_serializer_class(self):
        if self.action == "list":
            return ClientProfileListSerializer
        elif self.action == "create":
            return ClientProfileCreateSerializer
        return ClientProfileDetailSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Get current user's profile."""
        try:
            profile = ClientProfile.objects.get(user=request.user)
            serializer = ClientProfileDetailSerializer(profile)
            return Response(serializer.data)
        except ClientProfile.DoesNotExist:
            return Response(
                {"detail": "Profile not found for current user."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"])
    def search_by_phone(self, request):
        """Search clients by phone number."""
        phone = request.query_params.get("phone")
        if not phone:
            return Response(
                {"detail": "Phone parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use multi-tenant filtering from mixin
        queryset = super().get_queryset().active()
        
        # Search by phone in user model and phone_number in profile
        clients = queryset.filter(
            Q(user__username__icontains=phone) |
            Q(phone_number__icontains=phone)
        ).select_related("user", "level")[:5]  # Limit to 5 results

        serializer = ClientProfileListSerializer(clients, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def update_rating(self, request, pk=None):
        """Update player rating (admin only)."""
        if not request.user.is_staff:
            return Response(
                {"detail": "Only staff can update ratings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = self.get_object()
        new_rating = request.data.get("rating")

        if new_rating is None:
            return Response(
                {"detail": "Rating is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_rating = int(new_rating)
            if not 0 <= new_rating <= 1000:
                raise ValueError
        except ValueError:
            return Response(
                {"detail": "Rating must be between 0 and 1000."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.rating = new_rating
        profile.save()
        profile.update_level_by_rating()

        return Response({"detail": "Rating updated successfully."})

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def create_with_user(self, request):
        """Create a new user and client profile atomically (admin/staff only)."""
        # Check permissions - only staff can create clients
        if not request.user.is_staff:
            return Response(
                {"detail": "Only staff can create new clients."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate input data
        required_fields = ["email", "first_name", "last_name"]
        for field in required_fields:
            if field not in request.data:
                return Response(
                    {"detail": f"{field} is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        email = request.data["email"]
        first_name = request.data["first_name"]
        last_name = request.data["last_name"]
        phone = request.data.get("phone_number", "")
        dni = request.data.get("dni")
        birth_date = request.data.get("birth_date")

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from django.db import transaction

            with transaction.atomic():
                # Create user with temporary password
                temp_password = f"{email.split('@')[0]}_temp2024"
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=temp_password,
                    phone=phone,
                    role="CLIENT",
                )

                # Create client profile with organization
                profile = ClientProfile.objects.create(
                    user=user,
                    organization=self.request.user.organization,
                    club=self.request.user.club,
                    dni=dni,
                    birth_date=birth_date,
                    rating=500,  # Default rating
                    dominant_hand="right",  # Default
                    preferred_position="both",  # Default
                    is_public=True,
                    show_in_rankings=True,
                    allow_partner_requests=True,
                )

                # Create related objects with organization
                PlayerStats.objects.create(
                    player=profile,
                    organization=profile.organization,
                    club=profile.club,
                )
                PlayerPreferences.objects.create(
                    player=profile,
                    organization=profile.organization,
                    club=profile.club,
                )

                # Send welcome email with instructions
                from apps.authentication.services import EmailService

                EmailService.send_welcome_email(user)

                # Return the created profile
                serializer = ClientProfileDetailSerializer(profile)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"detail": f"Error creating client: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["post"])
    def search(self, request):
        """Search for players with filters."""
        serializer = PlayerSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        filters = serializer.validated_data
        queryset = self.get_queryset()

        # Apply filters
        if "level_id" in filters:
            queryset = queryset.filter(level_id=filters["level_id"])

        if "min_rating" in filters:
            queryset = queryset.filter(rating__gte=filters["min_rating"])

        if "max_rating" in filters:
            queryset = queryset.filter(rating__lte=filters["max_rating"])

        if "dominant_hand" in filters:
            queryset = queryset.filter(dominant_hand=filters["dominant_hand"])

        if "preferred_position" in filters:
            queryset = queryset.filter(preferred_position=filters["preferred_position"])

        if filters.get("only_public", True):
            queryset = queryset.filter(is_public=True)

        if filters.get("exclude_blocked", True) and hasattr(
            request.user, "client_profile"
        ):
            blocked_ids = (
                request.user.client_profile.preferences.blocked_players.values_list(
                    "id", flat=True
                )
            )
            queryset = queryset.exclude(id__in=blocked_ids)

        if filters.get("available_now"):
            # Check current availability
            now = timezone.now()
            hour = now.hour
            is_weekend = now.weekday() >= 5

            if 6 <= hour < 12:  # Morning
                if is_weekend:
                    queryset = queryset.filter(
                        preferences__available_weekend_morning=True
                    )
                else:
                    queryset = queryset.filter(
                        preferences__available_weekday_morning=True
                    )
            elif 12 <= hour < 18:  # Afternoon
                if is_weekend:
                    queryset = queryset.filter(
                        preferences__available_weekend_afternoon=True
                    )
                else:
                    queryset = queryset.filter(
                        preferences__available_weekday_afternoon=True
                    )
            elif 18 <= hour < 23:  # Evening
                if is_weekend:
                    queryset = queryset.filter(
                        preferences__available_weekend_evening=True
                    )
                else:
                    queryset = queryset.filter(
                        preferences__available_weekday_evening=True
                    )

        # TODO: Implement distance filtering when location data is available

        serializer = ClientProfileListSerializer(queryset[:50], many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def rankings(self, request):
        """Get player rankings."""
        ranking_type = request.query_params.get("type", "club")
        limit = int(request.query_params.get("limit", 100))

        queryset = (
            ClientProfile.objects.for_user(request.user)
            .filter(
                is_active=True,
                show_in_rankings=True,
                stats__matches_played__gte=5,  # Minimum matches for ranking
            )
            .select_related("user", "level", "stats")
        )

        # Order by rating and win rate
        queryset = queryset.annotate(
            weighted_score=F("rating") * 0.7 + F("stats__win_rate") * 3
        ).order_by("-weighted_score")[:limit]

        serializer = PlayerRankingSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def recent_partners(self, request, pk=None):
        """Get recent partners for a specific player."""
        try:
            profile = self.get_object()
        except Http404:
            return Response(
                {"detail": "Player profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get recent matches/reservations where this player participated
        # For now, we'll use partner requests as a proxy
        recent_partners = ClientProfile.objects.filter(
            Q(partner_requests_sent__to_player=profile, partner_requests_sent__status='accepted') |
            Q(partner_requests_received__from_player=profile, partner_requests_received__status='accepted')
        ).distinct().annotate(
            last_interaction=models.Max(
                models.Case(
                    models.When(partner_requests_sent__to_player=profile, then='partner_requests_sent__responded_at'),
                    models.When(partner_requests_received__from_player=profile, then='partner_requests_received__responded_at'),
                )
            ),
            matches_together=models.Count('id')  # Simplified - would need actual match data
        ).order_by('-last_interaction')[:10]
        
        # Format response
        result = []
        for partner in recent_partners:
            result.append({
                'player': ClientProfileDetailSerializer(partner).data,
                'last_match_date': partner.last_interaction.isoformat() if partner.last_interaction else None,
                'matches_together': partner.matches_together,
                'win_rate': 0.5  # Placeholder - would calculate from actual match data
            })
        
        return Response(result)
    
    @action(detail=True, methods=["get"])
    def suggested_partners(self, request, pk=None):
        """Get suggested partners based on preferences and availability."""
        try:
            profile = self.get_object()
        except Http404:
            return Response(
                {"detail": "Player profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        match_date = request.query_params.get('match_date')
        
        # Get player preferences
        if not hasattr(profile, 'preferences'):
            return Response(
                {"detail": "Player has no preferences configured."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        preferences = profile.preferences
        
        # Base queryset
        queryset = ClientProfile.objects.for_user(request.user).filter(
            is_active=True,
            is_public=True,
            allow_partner_requests=True
        ).exclude(id=profile.id)
        
        # Exclude blocked players
        if preferences.blocked_players.exists():
            queryset = queryset.exclude(
                id__in=preferences.blocked_players.values_list('id', flat=True)
            )
        
        # Filter by level preferences
        if preferences.min_partner_level:
            queryset = queryset.filter(
                rating__gte=preferences.min_partner_level.min_rating
            )
        if preferences.max_partner_level:
            queryset = queryset.filter(
                rating__lte=preferences.max_partner_level.max_rating
            )
        
        # Filter by availability for the match date/time if provided
        if match_date:
            try:
                match_datetime = datetime.fromisoformat(match_date)
                hour = match_datetime.hour
                is_weekend = match_datetime.weekday() >= 5
                
                if 6 <= hour < 12:  # Morning
                    if is_weekend:
                        queryset = queryset.filter(preferences__available_weekend_morning=True)
                    else:
                        queryset = queryset.filter(preferences__available_weekday_morning=True)
                elif 12 <= hour < 18:  # Afternoon
                    if is_weekend:
                        queryset = queryset.filter(preferences__available_weekend_afternoon=True)
                    else:
                        queryset = queryset.filter(preferences__available_weekday_afternoon=True)
                elif 18 <= hour < 23:  # Evening
                    if is_weekend:
                        queryset = queryset.filter(preferences__available_weekend_evening=True)
                    else:
                        queryset = queryset.filter(preferences__available_weekday_evening=True)
            except (ValueError, TypeError):
                pass
        
        # Score and rank suggestions
        queryset = queryset.annotate(
            # Players with similar rating get higher score
            rating_diff=models.Func(
                models.F('rating') - profile.rating,
                function='ABS'
            ),
            # Players we've played with before get bonus
            previous_matches=models.Count(
                'partner_requests_received',
                filter=Q(
                    partner_requests_received__from_player=profile,
                    partner_requests_received__status='accepted'
                )
            )
        ).annotate(
            suggestion_score=models.F('previous_matches') * 10 - models.F('rating_diff')
        ).order_by('-suggestion_score')[:20]
        
        serializer = ClientProfileDetailSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def partner_history(self, request, pk=None, partner_id=None):
        """Get history between two players."""
        try:
            profile = self.get_object()
        except Http404:
            return Response(
                {"detail": "Player profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        partner_id = request.query_params.get('partner_id') or partner_id
        if not partner_id:
            return Response(
                {"detail": "partner_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            partner = ClientProfile.objects.get(id=partner_id)
        except ClientProfile.DoesNotExist:
            return Response(
                {"detail": "Partner profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check partner request history
        requests = PartnerRequest.objects.filter(
            Q(from_player=profile, to_player=partner) |
            Q(from_player=partner, to_player=profile)
        ).order_by('-created_at')
        
        accepted_count = requests.filter(status='accepted').count()
        last_request = requests.first()
        
        return Response({
            'have_played_together': accepted_count > 0,
            'matches_count': accepted_count,
            'last_match_date': last_request.responded_at.isoformat() if last_request and last_request.responded_at else None,
            'win_rate': 0.5  # Placeholder - would calculate from actual match data
        })
    
    @action(detail=True, methods=["get"])
    def pending_requests_count(self, request, pk=None):
        """Get count of pending partner requests."""
        try:
            profile = self.get_object()
        except Http404:
            return Response(
                {"detail": "Player profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        count = PartnerRequest.objects.filter(
            to_player=profile,
            status='pending'
        ).count()
        
        return Response({'count': count})

    @action(detail=False, methods=["get"])
    def recommendations(self, request):
        """Get player recommendations based on current user's preferences."""
        if not hasattr(request.user, "client_profile"):
            return Response(
                {"detail": "User must have a client profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        profile = request.user.client_profile
        if not hasattr(profile, "preferences"):
            return Response(
                {"detail": "User must have preferences configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        preferences = profile.preferences
        
        # Base queryset excluding self and blocked players
        queryset = (
            ClientProfile.objects.for_user(request.user)
            .filter(is_active=True, is_public=True)
            .exclude(id=profile.id)
        )
        
        # Exclude blocked players
        if preferences.blocked_players.exists():
            queryset = queryset.exclude(id__in=preferences.blocked_players.values_list("id", flat=True))
        
        # Filter by preferred level range
        if preferences.min_partner_level:
            queryset = queryset.filter(level__min_rating__gte=preferences.min_partner_level.min_rating)
        if preferences.max_partner_level:
            queryset = queryset.filter(level__max_rating__lte=preferences.max_partner_level.max_rating)
        
        # Filter by similar availability
        now = timezone.now()
        hour = now.hour
        is_weekend = now.weekday() >= 5
        
        if 6 <= hour < 12:  # Morning
            if is_weekend and preferences.available_weekend_morning:
                queryset = queryset.filter(preferences__available_weekend_morning=True)
            elif not is_weekend and preferences.available_weekday_morning:
                queryset = queryset.filter(preferences__available_weekday_morning=True)
        elif 12 <= hour < 18:  # Afternoon
            if is_weekend and preferences.available_weekend_afternoon:
                queryset = queryset.filter(preferences__available_weekend_afternoon=True)
            elif not is_weekend and preferences.available_weekday_afternoon:
                queryset = queryset.filter(preferences__available_weekday_afternoon=True)
        elif 18 <= hour < 23:  # Evening
            if is_weekend and preferences.available_weekend_evening:
                queryset = queryset.filter(preferences__available_weekend_evening=True)
            elif not is_weekend and preferences.available_weekday_evening:
                queryset = queryset.filter(preferences__available_weekday_evening=True)
        
        # Order by rating similarity
        queryset = queryset.annotate(
            rating_diff=models.functions.Abs(F("rating") - profile.rating)
        ).order_by("rating_diff")[:10]
        
        serializer = ClientProfileListSerializer(queryset, many=True)
        return Response(serializer.data)


class EmergencyContactViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """ViewSet for emergency contacts with multi-tenant support."""

    queryset = EmergencyContact.objects.all()  # Base queryset required
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        # Use multi-tenant filtering and limit to own contacts
        queryset = super().get_queryset()
        if hasattr(self.request.user, "client_profile"):
            return queryset.filter(
                player=self.request.user.client_profile, is_active=True
            )
        return queryset.none()

    def perform_create(self, serializer):
        if hasattr(self.request.user, "client_profile"):
            # Set player and organization/club
            profile = self.request.user.client_profile
            super().perform_create(serializer)
            serializer.save(player=profile)
        else:
            raise ValidationError("User must have a client profile.")


class MedicalInfoViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """ViewSet for medical information with multi-tenant support."""

    queryset = MedicalInfo.objects.all()  # Base queryset required
    serializer_class = MedicalInfoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "put", "patch"]  # No create/delete

    def get_queryset(self):
        # Use multi-tenant filtering and limit to own info
        queryset = super().get_queryset()
        if hasattr(self.request.user, "client_profile"):
            return queryset.filter(player=self.request.user.client_profile)
        return queryset.none()

    def get_object(self):
        # Get or create medical info for current user
        if hasattr(self.request.user, "client_profile"):
            profile = self.request.user.client_profile
            obj, created = MedicalInfo.objects.get_or_create(
                player=profile,
                defaults={
                    "organization": profile.organization,
                    "club": profile.club,
                },
            )
            return obj
        raise Http404


class PlayerPreferencesViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """ViewSet for player preferences with multi-tenant support."""

    queryset = PlayerPreferences.objects.all()  # Base queryset required
    serializer_class = PlayerPreferencesSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "put", "patch", "post"]  # Include post for actions

    def get_queryset(self):
        # Use multi-tenant filtering and limit to own preferences
        queryset = super().get_queryset()
        if hasattr(self.request.user, "client_profile"):
            return queryset.filter(player=self.request.user.client_profile)
        return queryset.none()

    def get_object(self):
        # Get or create preferences for current user
        if hasattr(self.request.user, "client_profile"):
            profile = self.request.user.client_profile
            obj, created = PlayerPreferences.objects.get_or_create(
                player=profile,
                defaults={
                    "organization": profile.organization,
                    "club": profile.club,
                },
            )
            return obj
        raise Http404

    @action(detail=True, methods=["post"])
    def add_preferred_partner(self, request, pk=None):
        """Add a preferred partner."""
        preferences = self.get_object()
        partner_id = request.data.get("partner_id")

        try:
            partner = ClientProfile.objects.get(id=partner_id)
            preferences.preferred_partners.add(partner)
            return Response({"detail": "Partner added to preferences."})
        except ClientProfile.DoesNotExist:
            return Response(
                {"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"])
    def remove_preferred_partner(self, request, pk=None):
        """Remove a preferred partner."""
        preferences = self.get_object()
        partner_id = request.data.get("partner_id")

        try:
            partner = ClientProfile.objects.get(id=partner_id)
            preferences.preferred_partners.remove(partner)
            return Response({"detail": "Partner removed from preferences."})
        except ClientProfile.DoesNotExist:
            return Response(
                {"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"])
    def block_player(self, request, pk=None):
        """Block a player."""
        preferences = self.get_object()
        player_id = request.data.get("player_id")

        try:
            player = ClientProfile.objects.get(id=player_id)
            preferences.blocked_players.add(player)
            # Remove from preferred partners if exists
            preferences.preferred_partners.remove(player)
            return Response({"detail": "Player blocked successfully."})
        except ClientProfile.DoesNotExist:
            return Response(
                {"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"])
    def unblock_player(self, request, pk=None):
        """Unblock a player."""
        preferences = self.get_object()
        player_id = request.data.get("player_id")

        try:
            player = ClientProfile.objects.get(id=player_id)
            preferences.blocked_players.remove(player)
            return Response({"detail": "Player unblocked successfully."})
        except ClientProfile.DoesNotExist:
            return Response(
                {"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND
            )


class PartnerRequestViewSet(MultiTenantViewMixin, viewsets.ModelViewSet):
    """ViewSet for partner requests with multi-tenant support."""

    queryset = PartnerRequest.objects.all()  # Base queryset required
    serializer_class = PartnerRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "match_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Use multi-tenant filtering
        queryset = super().get_queryset()

        if not hasattr(self.request.user, "client_profile"):
            return queryset.none()

        profile = self.request.user.client_profile

        # Show sent and received requests
        return queryset.filter(
            Q(from_player=profile) | Q(to_player=profile), is_active=True
        ).select_related(
            "from_player__user",
            "from_player__level",
            "to_player__user",
            "to_player__level",
        )

    def perform_create(self, serializer):
        # Set from_player to current user's profile
        if hasattr(self.request.user, "client_profile"):
            profile = self.request.user.client_profile
            serializer.save(
                from_player=profile,
                organization=profile.organization,
                club=profile.club
            )
        else:
            raise ValidationError("User must have a client profile.")

    @action(detail=False, methods=["get"])
    def sent(self, request):
        """Get sent partner requests."""
        if not hasattr(request.user, "client_profile"):
            return Response([])

        queryset = self.get_queryset().filter(from_player=request.user.client_profile)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def received(self, request):
        """Get received partner requests."""
        if not hasattr(request.user, "client_profile"):
            return Response([])

        queryset = self.get_queryset().filter(to_player=request.user.client_profile)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Get pending partner requests."""
        if not hasattr(request.user, "client_profile"):
            return Response([])

        queryset = self.get_queryset().filter(
            to_player=request.user.client_profile, status="pending"
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """Respond to a partner request."""
        partner_request = self.get_object()

        # Check if user is the recipient
        if partner_request.to_player.user != request.user:
            return Response(
                {"detail": "You can only respond to requests sent to you."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if already responded
        if partner_request.status != "pending":
            return Response(
                {"detail": "This request has already been responded to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PartnerRequestResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        message = serializer.validated_data.get("message", "")

        if action == "accept":
            partner_request.accept(message)
        else:
            partner_request.reject(message)

        return Response({"detail": f"Partner request {action}ed successfully."})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a partner request."""
        partner_request = self.get_object()

        # Check if user is the sender
        if partner_request.from_player.user != request.user:
            return Response(
                {"detail": "You can only cancel requests you sent."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if can be cancelled
        if partner_request.status != "pending":
            return Response(
                {"detail": "Only pending requests can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        partner_request.cancel()
        return Response({"detail": "Partner request cancelled successfully."})


class PlayerStatsViewSet(MultiTenantViewMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for player statistics (read-only) with multi-tenant support."""

    serializer_class = PlayerStatsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Use multi-tenant filtering and show public profiles or own
        queryset = super().get_queryset()
        return queryset.filter(
            Q(player__is_public=True) | Q(player__user=self.request.user),
            player__is_active=True,
        ).select_related("player__user", "player__level")

    @action(detail=False, methods=["get"])
    def my_stats(self, request):
        """Get current user's statistics."""
        if not hasattr(request.user, "client_profile"):
            return Response(
                {"detail": "Profile not found for current user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            stats = PlayerStats.objects.get(player=request.user.client_profile)
            serializer = self.get_serializer(stats)
            return Response(serializer.data)
        except PlayerStats.DoesNotExist:
            return Response(
                {"detail": "Statistics not found."}, status=status.HTTP_404_NOT_FOUND
            )
