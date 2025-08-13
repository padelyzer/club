"""
Optimized views specifically for BFF endpoints.
These views are designed for minimal latency and maximum performance.
"""

import logging
from datetime import datetime, timedelta

from django.core.cache import cache
from django.db.models import Avg, Count, F, Max, Min, Prefetch, Q, Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clients.models import ClientProfile
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from core.permissions import IsOrganizationMember

logger = logging.getLogger(__name__)


def get_user_organization(user):
    """Helper function to get user's organization from memberships."""
    return (
        user.organization_memberships.first().organization
        if user.organization_memberships.exists()
        else None
    )


@api_view(["POST", "GET"])
@permission_classes([IsAuthenticated, IsOrganizationMember])
def optimized_club_analytics(request):
    """
    Optimized endpoint specifically for BFF dashboard analytics.
    Target: < 200ms response time with aggressive caching and query optimization.

    Replaces: /bi/analytics/club/?club=${clubId}
    """
    try:
        # Get parameters
        club_id = request.query_params.get("club") or request.data.get("club")
        if not club_id:
            return Response(
                {"error": "club parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle both GET and POST
        if request.method == "GET":
            period = request.query_params.get("period", "month")
            include_revenue = (
                request.query_params.get("include_revenue", "true").lower() == "true"
            )
            include_occupancy = (
                request.query_params.get("include_occupancy", "true").lower() == "true"
            )
            include_customers = (
                request.query_params.get("include_customers", "true").lower() == "true"
            )
            compare_previous = (
                request.query_params.get("compare_previous", "true").lower() == "true"
            )
        else:
            period = request.data.get("period", "month")
            include_revenue = request.data.get("include_revenue", True)
            include_occupancy = request.data.get("include_occupancy", True)
            include_customers = request.data.get("include_customers", True)
            compare_previous = request.data.get("compare_previous", True)

        # Get user organization for security
        user_org = get_user_organization(request.user)
        if not user_org:
            return Response(
                {"error": "User not associated with organization"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check cache first (5 minute TTL)
        from utils.bff_cache import BFFCacheManager

        cache_key = BFFCacheManager.get_dashboard_key(
            club_id,
            period,
            include_revenue=include_revenue,
            include_occupancy=include_occupancy,
            include_customers=include_customers,
            compare_previous=compare_previous,
        )
        cached_result = BFFCacheManager.get_data_only(cache_key)
        if cached_result:
            return Response(cached_result)

        # Verify club access and get with optimized query
        try:
            club = (
                Club.objects.select_related("organization")
                .prefetch_related(
                    Prefetch("courts", queryset=Court.objects.filter(is_active=True))
                )
                .get(id=club_id, organization=user_org)
            )
        except Club.DoesNotExist:
            return Response(
                {"error": "Club not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Calculate date ranges
        end_date = timezone.now()
        if period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        # Previous period for comparison
        period_duration = end_date - start_date
        prev_start = start_date - period_duration
        prev_end = start_date

        # Initialize response
        analytics_data = {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "club": {"id": str(club.id), "name": club.name},
            "generated_at": timezone.now().isoformat(),
        }

        # OPTIMIZED: Single query for all reservation data we need
        base_reservations = Reservation.objects.filter(
            club=club, date__gte=start_date.date(), date__lte=end_date.date()
        ).select_related("created_by", "court")

        confirmed_reservations = base_reservations.filter(
            status__in=["confirmed", "completed"]
        )

        # Get all data we need in optimized queries
        if include_occupancy:
            # Single aggregated query for occupancy metrics
            occupancy_stats = confirmed_reservations.aggregate(
                total_reservations=Count("id"),
                unique_courts=Count("court", distinct=True),
            )

            courts_count = club.courts.filter(is_active=True).count()
            days_count = (end_date.date() - start_date.date()).days + 1
            hours_per_day = 12  # Configurable

            total_slots = courts_count * days_count * hours_per_day
            occupancy_rate = (
                (occupancy_stats["total_reservations"] / total_slots) * 100
                if total_slots > 0
                else 0
            )

            # Previous period occupancy for comparison
            prev_occupancy = 0
            if compare_previous:
                prev_reservations = Reservation.objects.filter(
                    club=club,
                    date__gte=prev_start.date(),
                    date__lte=prev_end.date(),
                    status__in=["confirmed", "completed"],
                ).count()

                prev_days = (prev_end.date() - prev_start.date()).days + 1
                prev_total_slots = courts_count * prev_days * hours_per_day
                prev_occupancy = (
                    (prev_reservations / prev_total_slots) * 100
                    if prev_total_slots > 0
                    else 0
                )

            analytics_data["occupancy"] = {
                "total_reservations": occupancy_stats["total_reservations"],
                "total_slots": total_slots,
                "occupancy_rate": round(occupancy_rate, 2),
                "comparison": (
                    {
                        "previous_rate": round(prev_occupancy, 2),
                        "change": round(occupancy_rate - prev_occupancy, 2),
                        "change_percent": (
                            round(
                                ((occupancy_rate - prev_occupancy) / prev_occupancy)
                                * 100,
                                2,
                            )
                            if prev_occupancy > 0
                            else 0
                        ),
                    }
                    if compare_previous
                    else None
                ),
            }

        # OPTIMIZED: Customer analytics with single query
        if include_customers:
            # Get unique users who made confirmed reservations
            current_customer_ids = confirmed_reservations.values_list(
                "created_by", flat=True
            ).distinct()

            active_customers = len(set(current_customer_ids))

            # New customers (created during this period)
            new_customers = ClientProfile.objects.filter(
                user__in=current_customer_ids, created_at__gte=start_date
            ).count()

            # Previous period comparison
            prev_customers = 0
            if compare_previous:
                prev_customer_ids = (
                    Reservation.objects.filter(
                        club=club,
                        date__gte=prev_start.date(),
                        date__lte=prev_end.date(),
                        status__in=["confirmed", "completed"],
                    )
                    .values_list("created_by", flat=True)
                    .distinct()
                )

                prev_customers = len(set(prev_customer_ids))

            analytics_data["customers"] = {
                "active_customers": active_customers,
                "new_customers": new_customers,
                "comparison": (
                    {
                        "previous_active": prev_customers,
                        "change": active_customers - prev_customers,
                        "change_percent": (
                            round(
                                ((active_customers - prev_customers) / prev_customers)
                                * 100,
                                2,
                            )
                            if prev_customers > 0
                            else 0
                        ),
                    }
                    if compare_previous
                    else None
                ),
            }

        # Revenue analytics (simplified since Transaction model might not be available)
        if include_revenue:
            # For now, we'll estimate revenue based on court pricing and reservations
            # This is a simplified calculation - in production you'd use actual transaction data

            revenue_estimate = 0
            prev_revenue_estimate = 0

            # Calculate estimated revenue from confirmed reservations
            for reservation in confirmed_reservations:
                if reservation.court and reservation.court.price_per_hour:
                    # Assume 1-hour slots for simplicity
                    revenue_estimate += float(reservation.court.price_per_hour)

            # Previous period estimate
            if compare_previous:
                prev_confirmed = Reservation.objects.filter(
                    club=club,
                    date__gte=prev_start.date(),
                    date__lte=prev_end.date(),
                    status__in=["confirmed", "completed"],
                ).select_related("court")

                for reservation in prev_confirmed:
                    if reservation.court and reservation.court.price_per_hour:
                        prev_revenue_estimate += float(reservation.court.price_per_hour)

            analytics_data["revenue"] = {
                "estimated_total": revenue_estimate,
                "note": "Estimated based on court pricing and confirmed reservations",
                "comparison": (
                    {
                        "previous_estimated": prev_revenue_estimate,
                        "change": revenue_estimate - prev_revenue_estimate,
                        "change_percent": (
                            round(
                                (
                                    (revenue_estimate - prev_revenue_estimate)
                                    / prev_revenue_estimate
                                )
                                * 100,
                                2,
                            )
                            if prev_revenue_estimate > 0
                            else 0
                        ),
                    }
                    if compare_previous
                    else None
                ),
            }

        # OPTIMIZED: Add performance metrics for monitoring
        analytics_data["_performance"] = {
            "cache_key": cache_key,
            "query_optimized": True,
            "generated_in_ms": "tracked_by_middleware",
        }

        # Cache the result for 5 minutes
        BFFCacheManager.set_with_ttl(cache_key, analytics_data, "dashboard_analytics")

        return Response(analytics_data)

    except Exception as e:
        logger.error(f"Error in optimized_club_analytics: {str(e)}")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def bulk_availability_check(request):
    """
    Optimized bulk availability check for BFF reservations.
    Target: < 100ms response time.

    Enhanced version of /reservations/reservations/check_availability/
    """
    try:
        club_id = request.query_params.get("club")
        date_str = request.query_params.get("date")
        court_ids = request.query_params.getlist("courts[]")  # Multiple courts

        if not club_id or not date_str:
            return Response(
                {"error": "club and date parameters required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse date
        try:
            check_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cache key for availability (1 minute TTL for real-time accuracy)
        from utils.bff_cache import BFFCacheManager

        cache_key = BFFCacheManager.get_availability_key(club_id, date_str, court_ids)
        cached_result = BFFCacheManager.get_data_only(cache_key)
        if cached_result:
            return Response(cached_result)

        # Get user organization
        user_org = get_user_organization(request.user)
        if not user_org:
            return Response(
                {"error": "User not associated with organization"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get club with courts in single query
        try:
            club = (
                Club.objects.select_related("organization")
                .prefetch_related(
                    Prefetch(
                        "courts",
                        queryset=Court.objects.filter(
                            is_active=True,
                            is_maintenance=False,
                            **({"id__in": court_ids} if court_ids else {}),
                        ).order_by("name"),
                    ),
                    "schedules",
                )
                .get(id=club_id, organization=user_org)
            )
        except Club.DoesNotExist:
            return Response(
                {"error": "Club not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get all reservations for the date in single query
        existing_reservations = list(
            Reservation.objects.filter(
                club=club, date=check_date, status__in=["pending", "confirmed"]
            )
            .select_related("court")
            .values("court_id", "start_time", "end_time")
        )

        # Get club schedule for the day
        day_of_week = check_date.weekday()
        schedule = club.schedules.filter(weekday=day_of_week, is_active=True).first()

        if schedule and not schedule.is_closed:
            opening_time = schedule.opening_time
            closing_time = schedule.closing_time
        else:
            opening_time = (
                club.opening_time or datetime.strptime("08:00", "%H:%M").time()
            )
            closing_time = (
                club.closing_time or datetime.strptime("22:00", "%H:%M").time()
            )

        # Build availability response
        availability_data = {
            "date": date_str,
            "club": {
                "id": str(club.id),
                "name": club.name,
                "opening_time": opening_time.strftime("%H:%M"),
                "closing_time": closing_time.strftime("%H:%M"),
            },
            "courts": [],
        }

        # Process each court
        for court in club.courts.all():
            # Get reservations for this court
            court_reservations = [
                r for r in existing_reservations if r["court_id"] == court.id
            ]

            # Generate time slots (1-hour increments)
            slots = []
            current_time = datetime.combine(check_date, opening_time)
            end_time = datetime.combine(check_date, closing_time)

            while current_time < end_time:
                slot_end = current_time + timedelta(hours=1)

                # Check availability
                is_available = True
                reason = None

                # Check if in the past
                current_aware = timezone.make_aware(
                    current_time, timezone.get_current_timezone()
                )
                if current_aware < timezone.now():
                    is_available = False
                    reason = "past"

                # Check against existing reservations
                if is_available:
                    for reservation in court_reservations:
                        res_start = datetime.combine(
                            check_date, reservation["start_time"]
                        )
                        res_end = datetime.combine(check_date, reservation["end_time"])

                        if current_time < res_end and slot_end > res_start:
                            is_available = False
                            reason = "reserved"
                            break

                slots.append(
                    {
                        "start_time": current_time.time().strftime("%H:%M"),
                        "end_time": slot_end.time().strftime("%H:%M"),
                        "is_available": is_available,
                        "reason": reason,
                        "price": (
                            float(court.price_per_hour) if court.price_per_hour else 0.0
                        ),
                    }
                )

                current_time = slot_end

            availability_data["courts"].append(
                {
                    "id": str(court.id),
                    "name": court.name,
                    "price_per_hour": (
                        float(court.price_per_hour) if court.price_per_hour else 0.0
                    ),
                    "slots": slots,
                }
            )

        # Add performance tracking
        availability_data["_performance"] = {
            "cache_key": cache_key,
            "courts_processed": len(club.courts.all()),
            "reservations_checked": len(existing_reservations),
        }

        # Cache for 1 minute (balance between freshness and performance)
        BFFCacheManager.set_with_ttl(cache_key, availability_data, "availability")

        return Response(availability_data)

    except Exception as e:
        logger.error(f"Error in bulk_availability_check: {str(e)}")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
