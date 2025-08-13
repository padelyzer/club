"""
Custom permissions for Padelyzer.
"""

from django.contrib.auth import get_user_model

from rest_framework import permissions

User = get_user_model()


class HasClubAccessBySlug(permissions.BasePermission):
    """
    Permission to check if user has access to a specific club by slug.
    User must belong to the club to access it.
    """

    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user.is_authenticated:
            return False
            
        # Superusers have access to all clubs
        if request.user.is_superuser:
            return True
        
        club_slug = view.kwargs.get("club_slug") or view.kwargs.get("slug")
        if not club_slug:
            return False
        
        # Import Club model here to avoid circular imports
        from apps.clubs.models import Club
        
        try:
            club = Club.objects.get(slug=club_slug)
            
            # Check if user belongs to this specific club
            if request.user.club and request.user.club.id == club.id:
                return True
            
            # No access if user doesn't belong to this club
            return False
            
        except Club.DoesNotExist:
            return False


def get_user_permissions(user):
    """
    Get all permissions for a user including club and organization permissions.
    """
    permissions_list = []

    if user.is_superuser:
        permissions_list.append("superuser")

    if user.is_staff:
        permissions_list.append("staff")

    # Organization permissions
    if hasattr(user, "organization"):
        permissions_list.append("organization:member")

        # Check organization role
        org_membership = user.organization_memberships.filter(
            organization=user.organization, is_active=True
        ).first()

        if org_membership:
            permissions_list.append(f"organization:{org_membership.role}")

    # Club permissions
    for membership in user.club_memberships.filter(is_active=True):
        permissions_list.append(f"club:{membership.club.id}:member")
        permissions_list.append(f"club:{membership.club.id}:{membership.role}")

    return permissions_list


class IsOrganizationOwner(permissions.BasePermission):
    """
    Permission to check if user is organization owner.
    """

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "organization"):
            return request.user.organizations.filter(
                id=obj.organization.id, membership__role="owner"
            ).exists()
        return False


class IsClubStaff(permissions.BasePermission):
    """
    Permission to check if user is club staff (admin or owner).
    """

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "club"):
            return request.user.club_memberships.filter(
                club=obj.club, role__in=["owner", "admin", "staff"]
            ).exists()
        return False


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission for Padelyzer super admins only.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        if hasattr(obj, "user"):
            return obj.user == request.user
        elif hasattr(obj, "created_by"):
            return obj.created_by == request.user
        return False


class HasClubAccess(permissions.BasePermission):
    """
    Permission to check if user has access to a specific club.
    """

    def has_permission(self, request, view):
        club_id = view.kwargs.get("club_id") or request.data.get("club")
        if not club_id:
            return False

        return request.user.club_memberships.filter(
            club_id=club_id, is_active=True
        ).exists()


class IsClubStaffOrOwner(permissions.BasePermission):
    """
    Permission to check if user is club staff or owner.
    Allows access to users with owner, admin, or staff roles.
    """

    def has_permission(self, request, view):
        # For list views, we'll filter in the viewset
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Allow read for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # For write operations, check if user is staff
        if hasattr(obj, "club"):
            club = obj.club
        elif hasattr(obj, "reservation"):
            club = obj.reservation.club
        else:
            return False

        return request.user.club_memberships.filter(
            club=club, role__in=["owner", "admin", "staff"], is_active=True
        ).exists()


class IsAuthenticated(permissions.BasePermission):
    """
    Permission that checks if user is authenticated.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsOrganizationMember(permissions.BasePermission):
    """
    Permission to check if user belongs to the organization.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Allow superusers
        if request.user.is_superuser:
            return True
        # Check if user has organization
        return hasattr(request.user, "organization")

    def has_object_permission(self, request, view, obj):
        # Allow superusers
        if request.user.is_superuser:
            return True
        if hasattr(obj, "organization") and hasattr(request.user, "organization"):
            return request.user.organization == obj.organization
        return False


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permission to check if user is owner or staff member.
    """

    def has_object_permission(self, request, view, obj):
        # Allow if user is staff
        if request.user.is_staff:
            return True

        # Allow if user owns the object
        if hasattr(obj, "user"):
            return obj.user == request.user
        elif hasattr(obj, "created_by"):
            return obj.created_by == request.user
        return False


class IsClubMemberOrStaff(permissions.BasePermission):
    """
    Permission to check if user is a club member or staff.
    """

    def has_permission(self, request, view):
        # Staff always has permission
        if request.user.is_staff:
            return True

        # Check club membership
        club_id = view.kwargs.get("club_id") or request.data.get("club")
        if not club_id:
            return False

        return request.user.club_memberships.filter(
            club_id=club_id, is_active=True
        ).exists()

    def has_object_permission(self, request, view, obj):
        # Staff always has permission
        if request.user.is_staff:
            return True

        # Check if user is club member
        if hasattr(obj, "club"):
            return request.user.club_memberships.filter(
                club=obj.club, is_active=True
            ).exists()
        return False


class IsClubMemberOrReadOnly(permissions.BasePermission):
    """
    Permission to check if user is a club member for write operations.
    Read permissions are allowed to any authenticated user.
    """

    def has_permission(self, request, view):
        # Allow read for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated

        # For write operations, check club membership
        club_id = view.kwargs.get("club_id") or request.data.get("club")
        if not club_id:
            return False

        return request.user.club_memberships.filter(
            club_id=club_id, is_active=True
        ).exists()

    def has_object_permission(self, request, view, obj):
        # Allow read for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated

        # For write operations, check if user is club member
        if hasattr(obj, "club"):
            return request.user.club_memberships.filter(
                club=obj.club, is_active=True
            ).exists()
        return False


class HasClubAccessBySlug(permissions.BasePermission):
    """
    Permission to check if user has access to a specific club by slug.
    """

    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user.is_authenticated:
            return False
            
        # Superusers have access to all clubs
        if request.user.is_superuser:
            return True

        club_slug = view.kwargs.get("club_slug") or view.kwargs.get("slug")
        if not club_slug:
            return False

        # Import Club model here to avoid circular imports
        from apps.clubs.models import Club

        try:
            club = Club.objects.get(slug=club_slug)

            # Check if user belongs to the club's organization
            if (
                hasattr(request.user, "organization")
                and request.user.organization
                and club.organization == request.user.organization
            ):
                return True

            # Check if user has specific club membership
            if hasattr(request.user, "club_memberships"):
                return request.user.club_memberships.filter(
                    club=club, is_active=True
                ).exists()
                
            # For users without organization or club memberships
            # Allow access if the club is public or if user owns the club
            if club.email == request.user.email:
                return True
                
            return False
        except Club.DoesNotExist:
            return False
