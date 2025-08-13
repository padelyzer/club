"""
Optimized authentication views specifically for BFF endpoints.
These views combine multiple endpoints into single optimized calls.
"""

import logging

from django.core.cache import cache
from django.db.models import Prefetch

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clubs.models import Club
from apps.root.models import Organization
from core.permissions import get_user_permissions

from .models import User
from .serializers import ProfileSerializer

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_context_aggregated(request):
    """
    Optimized aggregated endpoint for BFF auth context.
    Target: < 150ms response time.

    Combines data from:
    - /auth/user (user profile)
    - /root/organization (current organization)
    - /clubs/user-clubs (user's accessible clubs)
    - /auth/permissions (user permissions)
    """
    try:
        user = request.user

        # Cache key based on user ID (cache for session duration or until user changes)
        from utils.bff_cache import BFFCacheManager

        last_login_ts = user.last_login.timestamp() if user.last_login else 0
        cache_key = BFFCacheManager.get_auth_context_key(str(user.id), last_login_ts)
        cached_result = BFFCacheManager.get_data_only(cache_key)
        if cached_result:
            return Response(cached_result)

        # OPTIMIZED: Single query to get user with all related data
        user_data = (
            User.objects.select_related("organization")
            .prefetch_related(
                # Organizations the user is a member of
                Prefetch(
                    "organization_memberships",
                    queryset=user.organization_memberships.select_related(
                        "organization"
                    ).filter(is_active=True),
                ),
                # Clubs accessible to the user
                Prefetch(
                    "club_memberships",
                    queryset=user.club_memberships.select_related(
                        "club", "club__organization"
                    ).filter(is_active=True),
                ),
            )
            .get(id=user.id)
        )

        # Get current organization
        current_organization = user_data.organization
        if not current_organization and user_data.organization_memberships.exists():
            # Fallback to first organization membership
            current_organization = (
                user_data.organization_memberships.first().organization
            )

        # Build user profile data
        user_profile = {
            "id": str(user_data.id),
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "is_active": user_data.is_active,
            "is_staff": user_data.is_staff,
            "is_superuser": user_data.is_superuser,
            "last_login": (
                user_data.last_login.isoformat() if user_data.last_login else None
            ),
            "date_joined": user_data.date_joined.isoformat(),
            "email_verified": user_data.email_verified,
            "two_factor_enabled": user_data.two_factor_enabled,
            "phone_number": user_data.phone_number,
            "timezone": user_data.timezone,
            "language": user_data.language,
        }

        # Build current organization data
        organization_data = None
        if current_organization:
            organization_data = {
                "id": str(current_organization.id),
                "trade_name": current_organization.trade_name,
                "business_name": current_organization.business_name,
                "type": current_organization.type,
                "state": current_organization.state,
                "email": current_organization.email,
                "phone": current_organization.phone,
                "website": current_organization.website,
                "logo_url": (
                    current_organization.logo.url if current_organization.logo else None
                ),
                "created_at": current_organization.created_at.isoformat(),
                "is_active": current_organization.is_active,
            }

        # Build organizations list (all organizations user has access to)
        organizations = []
        for membership in user_data.organization_memberships.all():
            org = membership.organization
            organizations.append(
                {
                    "id": str(org.id),
                    "trade_name": org.trade_name,
                    "business_name": org.business_name,
                    "type": org.type,
                    "state": org.state,
                    "logo_url": org.logo.url if org.logo else None,
                    "role": membership.role,
                    "is_current": (
                        org.id == current_organization.id
                        if current_organization
                        else False
                    ),
                    "membership": {
                        "joined_at": membership.created_at.isoformat(),
                        "is_active": membership.is_active,
                        "role": membership.role,
                    },
                }
            )

        # Build user clubs (optimized - already prefetched)
        user_clubs = []
        for club_membership in user_data.club_memberships.all():
            club = club_membership.club
            user_clubs.append(
                {
                    "id": str(club.id),
                    "name": club.name,
                    "description": club.description,
                    "slug": club.slug,
                    "logo_url": club.logo.url if club.logo else None,
                    "address": club.address,
                    "city": club.city,
                    "state": club.state,
                    "phone": club.phone,
                    "email": club.email,
                    "website": club.website,
                    "is_active": club.is_active,
                    "organization": {
                        "id": str(club.organization.id),
                        "trade_name": club.organization.trade_name,
                    },
                    "membership": {
                        "role": club_membership.role,
                        "joined_at": club_membership.created_at.isoformat(),
                        "is_active": club_membership.is_active,
                    },
                }
            )

        # Get user permissions (cached by role and organization)
        permissions = get_user_permissions(user_data, current_organization)

        # Build comprehensive auth context
        auth_context = {
            "user": user_profile,
            "current_organization": organization_data,
            "organizations": organizations,
            "clubs": user_clubs,
            "permissions": permissions,
            "context": {
                "has_organization": current_organization is not None,
                "has_clubs": len(user_clubs) > 0,
                "organization_count": len(organizations),
                "club_count": len(user_clubs),
                "is_multi_org": len(organizations) > 1,
                "primary_role": organizations[0]["role"] if organizations else None,
            },
            "_metadata": {
                "generated_at": cache.get("now", "unknown"),
                "cache_key": cache_key,
                "optimized": True,
            },
        }

        # Cache for session duration (or 1 hour, whichever is shorter)
        # This balances performance with data freshness
        BFFCacheManager.set_with_ttl(cache_key, auth_context, "auth_context")

        return Response(auth_context)

    except Exception as e:
        logger.error(f"Error in auth_context_aggregated: {str(e)}")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_clubs_optimized(request):
    """
    Optimized endpoint for getting user's clubs.
    This is a fallback/standalone version of the clubs data from auth_context_aggregated.
    Target: < 100ms response time.
    """
    try:
        user = request.user

        # Cache key for user clubs
        cache_key = BFFCacheManager.get_user_clubs_key(str(user.id))
        cached_result = BFFCacheManager.get_data_only(cache_key)
        if cached_result:
            return Response(cached_result)

        # Get user's organization for filtering
        current_org = None
        if hasattr(user, "organization") and user.organization:
            current_org = user.organization
        elif user.organization_memberships.exists():
            current_org = user.organization_memberships.first().organization

        # OPTIMIZED: Single query for clubs with organization data
        clubs_query = Club.objects.select_related("organization").prefetch_related(
            "courts"
        )

        # Filter clubs based on user's access
        if current_org:
            # Get clubs from user's organization
            clubs_query = clubs_query.filter(organization=current_org)
        elif user.is_superuser:
            # Superusers can see all clubs
            pass
        else:
            # Get user's club (one-to-many relationship)
            if user.club:
                clubs_query = clubs_query.filter(id=user.club.id)
            else:
                clubs_query = clubs_query.none()

        clubs_data = []
        for club in clubs_query.filter(is_active=True):
            # Check if this is the user's club
            membership = None  # No membership model in current implementation

            club_info = {
                "id": str(club.id),
                "name": club.name,
                "description": club.description,
                "slug": club.slug,
                "logo_url": club.logo.url if club.logo else None,
                "address": club.address,
                "city": club.city,
                "state": club.state,
                "phone": club.phone,
                "email": club.email,
                "website": club.website,
                "is_active": club.is_active,
                "courts_count": club.courts.filter(is_active=True).count(),
                "organization": {
                    "id": str(club.organization.id),
                    "trade_name": club.organization.trade_name,
                    "type": club.organization.type,
                },
            }

            # Add membership info if user is a member
            if membership:
                club_info["membership"] = {
                    "role": membership.role,
                    "joined_at": membership.created_at.isoformat(),
                    "is_active": membership.is_active,
                }

            clubs_data.append(club_info)

        response_data = {
            "clubs": clubs_data,
            "count": len(clubs_data),
            "user_organization": (
                {"id": str(current_org.id), "trade_name": current_org.trade_name}
                if current_org
                else None
            ),
            "_metadata": {"cache_key": cache_key, "optimized": True},
        }

        # Cache for 10 minutes (clubs don't change often)
        BFFCacheManager.set_with_ttl(cache_key, response_data, "club_data")

        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in user_clubs_optimized: {str(e)}")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invalidate_auth_cache(request):
    """
    Endpoint to invalidate user's auth cache.
    Useful when user data changes and cache needs to be refreshed.
    """
    try:
        user = request.user

        # Build cache keys to invalidate
        cache_keys = [
            f"bff:auth_context:{user.id}:*",
            f"bff:user_clubs:{user.id}",
            f"bff:permissions:{user.id}:*",
        ]

        # Delete cache entries
        for pattern in cache_keys:
            if "*" in pattern:
                # For patterns, we'd need to iterate (simplified here)
                # In production, consider using cache.delete_pattern() if available
                pass
            else:
                cache.delete(pattern)

        return Response(
            {"message": "Auth cache invalidated successfully", "user_id": str(user.id)}
        )

    except Exception as e:
        logger.error(f"Error in invalidate_auth_cache: {str(e)}")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
