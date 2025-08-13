"""
Reusable mixins for views and serializers.
"""

from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response


class MultiTenantMixin:
    """
    Mixin to filter queryset by organization/club.
    """

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Super admin sees all
        if user.is_superuser:
            return queryset

        # Filter by user's organizations
        org_ids = user.organizations.values_list("id", flat=True)
        return queryset.filter(organization_id__in=org_ids)


class SoftDeleteMixin:
    """
    Mixin to handle soft delete operations.
    """

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        queryset = super().get_queryset()
        # Only show active records by default
        if not self.request.query_params.get("include_deleted", False):
            queryset = queryset.filter(is_active=True)
        return queryset


class TimestampMixin:
    """
    Mixin to add created/updated by fields.
    """

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class BulkCreateMixin:
    """
    Mixin to handle bulk create operations.
    """

    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)

        if not is_many:
            return super().create(request, *args, **kwargs)

        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        self.perform_bulk_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_bulk_create(self, serializer):
        serializer.save()


class SearchMixin:
    """
    Mixin to add search functionality.
    """

    search_fields = []

    def get_queryset(self):
        queryset = super().get_queryset()
        search_term = self.request.query_params.get("search", None)

        if search_term and self.search_fields:
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search_term})
            queryset = queryset.filter(query)

        return queryset


class FilterByDateMixin:
    """
    Mixin to filter queryset by date range.
    """

    date_field = "created_at"

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(**{f"{self.date_field}__gte": start_date})
        if end_date:
            queryset = queryset.filter(**{f"{self.date_field}__lte": end_date})

        return queryset


# Alias for backwards compatibility
MultiTenantViewMixin = MultiTenantMixin


class AuditLogMixin:
    """
    Mixin to create audit logs for model changes.
    """

    def log_action(self, action, organization=None, changes=None):
        """Create an audit log entry."""
        from apps.root.models import AuditLog

        request = self.request
        obj = getattr(self, "object", None)

        AuditLog.objects.create(
            user=request.user,
            ip_address=self.get_client_ip(),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            action=action,
            model_name=obj.__class__.__name__ if obj else "",
            object_id=str(obj.id) if obj else "",
            object_repr=str(obj) if obj else "",
            changes=changes or {},
            organization=organization,
        )

    def get_client_ip(self):
        """Get client IP address from request."""
        request = self.request
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip
