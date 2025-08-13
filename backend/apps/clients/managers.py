"""
Managers for clients module with multi-tenant support.
"""

from django.db import models
from django.db.models import Q


class MultiTenantQuerySet(models.QuerySet):
    """QuerySet that filters by organization and optionally by club."""

    def for_organization(self, organization):
        """Filter by organization."""
        return self.filter(organization=organization)

    def for_club(self, club):
        """Filter by club (also filters by organization)."""
        if club:
            return self.filter(organization=club.organization, club=club)
        return self.none()

    def for_user(self, user):
        """Filter based on user's current organization and club."""
        if not user or not user.is_authenticated:
            return self.none()

        # For client users, get organization/club from client_profile
        if hasattr(user, "client_profile"):
            profile = user.client_profile
            filters = Q(organization=profile.organization)
            if profile.club:
                filters &= Q(club=profile.club)
            return self.filter(filters)

        # Legacy: Get user's organization directly
        if not hasattr(user, "organization"):
            return self.none()

        filters = Q(organization=user.organization)
        
        # Get user's club if available
        club = None
        if hasattr(user, "clubs") and user.clubs.exists():
            club = user.clubs.first()
        elif hasattr(user, "memberships") and user.memberships.exists():
            club = user.memberships.first().club
            
        if club:
            filters &= Q(club=club)

        return self.filter(filters)

    def active(self):
        """Filter only active records."""
        return self.filter(is_active=True)


class MultiTenantManager(models.Manager):
    """Manager that provides multi-tenant filtering methods."""

    def get_queryset(self):
        return MultiTenantQuerySet(self.model, using=self._db)

    def for_organization(self, organization):
        return self.get_queryset().for_organization(organization)

    def for_club(self, club):
        return self.get_queryset().for_club(club)

    def for_user(self, user):
        return self.get_queryset().for_user(user)

    def active(self):
        return self.get_queryset().active()


class ClientProfileManager(MultiTenantManager):
    """Manager for ClientProfile with additional methods."""

    def with_stats(self):
        """Prefetch related stats."""
        return self.get_queryset().select_related("stats", "user")

    def search(self, query):
        """Search clients by name, email, or DNI."""
        if not query:
            return self.get_queryset()

        return self.get_queryset().filter(
            Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(user__email__icontains=query)
            | Q(dni__icontains=query)
        )

    def by_level(self, level):
        """Filter by player level."""
        return self.get_queryset().filter(level=level)

    def by_rating_range(self, min_rating=None, max_rating=None):
        """Filter by rating range."""
        qs = self.get_queryset()
        if min_rating is not None:
            qs = qs.filter(rating__gte=min_rating)
        if max_rating is not None:
            qs = qs.filter(rating__lte=max_rating)
        return qs


class PartnerRequestQuerySet(MultiTenantQuerySet):
    """QuerySet for PartnerRequest with additional methods."""

    def pending(self):
        """Get pending requests."""
        return self.filter(status="pending")

    def for_player(self, player):
        """Get requests involving a specific player."""
        return self.filter(Q(from_player=player) | Q(to_player=player))

    def sent_by(self, player):
        """Get requests sent by a player."""
        return self.filter(from_player=player)

    def received_by(self, player):
        """Get requests received by a player."""
        return self.filter(to_player=player)


class PartnerRequestManager(MultiTenantManager):
    """Manager for PartnerRequest with additional methods."""

    def get_queryset(self):
        return PartnerRequestQuerySet(self.model, using=self._db)

    def pending(self):
        """Get pending requests."""
        return self.get_queryset().pending()

    def for_player(self, player):
        """Get requests involving a specific player."""
        return self.get_queryset().for_player(player)

    def sent_by(self, player):
        """Get requests sent by a player."""
        return self.get_queryset().sent_by(player)

    def received_by(self, player):
        """Get requests received by a player."""
        return self.get_queryset().received_by(player)
