"""
Filters for tournaments module.
"""

from django.db.models import F, Q

import django_filters

from .models import Match, Tournament


class TournamentFilter(django_filters.FilterSet):
    """Filter set for tournaments."""

    start_date_from = django_filters.DateFilter(
        field_name="start_date", lookup_expr="gte"
    )
    start_date_to = django_filters.DateFilter(
        field_name="start_date", lookup_expr="lte"
    )
    registration_open = django_filters.BooleanFilter(method="filter_registration_open")
    category_type = django_filters.CharFilter(field_name="category__category_type")
    organizer = django_filters.UUIDFilter(field_name="organizer__id")
    my_tournaments = django_filters.BooleanFilter(method="filter_my_tournaments")
    has_spaces = django_filters.BooleanFilter(method="filter_has_spaces")

    class Meta:
        model = Tournament
        fields = {
            "format": ["exact"],
            "status": ["exact", "in"],
            "visibility": ["exact"],
            "requires_approval": ["exact"],
            "registration_fee": ["exact", "gt", "lt"],
            "max_teams": ["exact", "gte", "lte"],
        }

    def filter_registration_open(self, queryset, name, value):
        """Filter by registration open status."""
        if value:
            from django.utils import timezone

            now = timezone.now()
            return queryset.filter(
                status__in=["published", "registration_open"],
                registration_start__lte=now,
                registration_end__gte=now,
            )
        return queryset

    def filter_my_tournaments(self, queryset, name, value):
        """Filter tournaments where user is involved."""
        if value and self.request and self.request.user.is_authenticated:
            return queryset.filter(
                Q(organizer=self.request.user)
                | Q(registrations__player1__user=self.request.user)
                | Q(registrations__player2__user=self.request.user)
            ).distinct()
        return queryset

    def filter_has_spaces(self, queryset, name, value):
        """Filter tournaments that have available spaces."""
        if value:
            from django.db.models import Count

            return queryset.annotate(
                confirmed_count=Count(
                    "registrations", filter=Q(registrations__status="confirmed")
                )
            ).filter(confirmed_count__lt=F("max_teams"))
        return queryset


class MatchFilter(django_filters.FilterSet):
    """Filter set for matches."""

    scheduled_date_from = django_filters.DateTimeFilter(
        field_name="scheduled_date", lookup_expr="gte"
    )
    scheduled_date_to = django_filters.DateTimeFilter(
        field_name="scheduled_date", lookup_expr="lte"
    )
    tournament_format = django_filters.CharFilter(field_name="tournament__format")
    my_matches = django_filters.BooleanFilter(method="filter_my_matches")
    today = django_filters.BooleanFilter(method="filter_today")
    upcoming = django_filters.BooleanFilter(method="filter_upcoming")

    class Meta:
        model = Match
        fields = {
            "tournament": ["exact"],
            "round_number": ["exact", "gte", "lte"],
            "status": ["exact", "in"],
            "court": ["exact"],
            "referee": ["exact"],
        }

    def filter_my_matches(self, queryset, name, value):
        """Filter matches where user is involved."""
        if value and self.request and self.request.user.is_authenticated:
            return queryset.filter(
                Q(team1__player1__user=self.request.user)
                | Q(team1__player2__user=self.request.user)
                | Q(team2__player1__user=self.request.user)
                | Q(team2__player2__user=self.request.user)
                | Q(referee=self.request.user)
            ).distinct()
        return queryset

    def filter_today(self, queryset, name, value):
        """Filter matches scheduled for today."""
        if value:
            from django.utils import timezone

            today = timezone.now().date()
            return queryset.filter(scheduled_date__date=today)
        return queryset

    def filter_upcoming(self, queryset, name, value):
        """Filter upcoming matches."""
        if value:
            from django.utils import timezone

            return queryset.filter(
                scheduled_date__gte=timezone.now(),
                status__in=["scheduled", "in_progress"],
            )
        return queryset
