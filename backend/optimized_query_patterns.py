# OPTIMIZED QUERYSET PATTERNS FOR PADELYZER

from django.db.models import Count, F, Prefetch, Q

from apps.authentication.models import User
from apps.clubs.models import Club
from apps.reservations.models import Reservation
from apps.root.models import Organization

# 1. GET ORGANIZATIONS WITH CLUB COUNT (OPTIMIZED)
organizations_with_stats = Organization.objects.annotate(
    club_count=Count("clubs", filter=Q(clubs__is_active=True)),
    total_reservations=Count("reservations"),
).filter(is_active=True)

# 2. GET RESERVATIONS WITH ALL RELATED DATA (OPTIMIZED)
reservations_with_relations = (
    Reservation.objects.select_related("organization", "club", "client")
    .filter(date__gte=timezone.now().date())
    .order_by("date", "start_time")
)

# 3. GET CLUBS WITH RESERVATION STATS (OPTIMIZED)
clubs_with_stats = (
    Club.objects.select_related("organization")
    .annotate(
        total_reservations=Count("reservations"),
        confirmed_reservations=Count(
            "reservations", filter=Q(reservations__status="confirmed")
        ),
        this_month_reservations=Count(
            "reservations",
            filter=Q(
                reservations__date__year=timezone.now().year,
                reservations__date__month=timezone.now().month,
            ),
        ),
    )
    .filter(is_active=True)
)

# 4. GET USERS WITH ORGANIZATION DATA (OPTIMIZED)
users_with_org = User.objects.select_related().filter(
    is_active=True, current_organization_id__isnull=False
)


# 5. COMPLEX DASHBOARD QUERY (OPTIMIZED)
def get_dashboard_data(organization_id):
    """Get dashboard data with minimal queries."""
    from datetime import timedelta

    from django.utils import timezone

    today = timezone.now().date()
    week_ago = today - timedelta(days=7)

    # Single query for club stats
    club_stats = Club.objects.filter(
        organization_id=organization_id, is_active=True
    ).aggregate(
        total_clubs=Count("id"),
        total_reservations=Count("reservations"),
        week_reservations=Count(
            "reservations", filter=Q(reservations__date__gte=week_ago)
        ),
    )

    return club_stats


# 6. SEARCH OPTIMIZATIONS
def search_reservations(
    organization_id, search_term=None, date_from=None, date_to=None
):
    """Optimized reservation search."""
    queryset = Reservation.objects.select_related("club", "client").filter(
        organization_id=organization_id
    )

    if search_term:
        queryset = queryset.filter(
            Q(client__first_name__icontains=search_term)
            | Q(client__last_name__icontains=search_term)
            | Q(club__name__icontains=search_term)
        )

    if date_from:
        queryset = queryset.filter(date__gte=date_from)

    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    return queryset.order_by("-date", "-start_time")


# 7. BULK OPERATIONS (OPTIMIZED)
def bulk_update_reservation_status(reservation_ids, new_status):
    """Bulk update reservation status."""
    return Reservation.objects.filter(id__in=reservation_ids).update(
        status=new_status, updated_at=timezone.now()
    )


# 8. CACHING PATTERNS
from django.core.cache import cache


def get_organization_stats(organization_id):
    """Get organization stats with caching."""
    cache_key = f"org_stats_{organization_id}"
    stats = cache.get(cache_key)

    if stats is None:
        stats = Organization.objects.filter(id=organization_id).aggregate(
            total_clubs=Count("clubs"),
            total_reservations=Count("reservations"),
            active_users=Count("users", filter=Q(users__is_active=True)),
        )

        # Cache for 15 minutes
        cache.set(cache_key, stats, timeout=900)

    return stats
