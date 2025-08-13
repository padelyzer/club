"""
Base admin classes for multi-tenant support.
"""

from django.contrib import admin


class MultiTenantAdminMixin:
    """Mixin to add multi-tenant filtering to admin classes."""

    def get_queryset(self, request):
        """Filter queryset by user's organization."""
        qs = super().get_queryset(request)

        # Superusers see everything
        if request.user.is_superuser:
            return qs

        # Staff users see only their organization's data
        if hasattr(qs.model.objects, "for_user"):
            return qs.model.objects.for_user(request.user)

        # Fallback to filtering by organization if available
        if hasattr(qs.model, "organization"):
            return qs.filter(organization_id=request.user.current_organization_id)

        return qs

    def save_model(self, request, obj, form, change):
        """Set organization and club on save."""
        if not change and hasattr(obj, "organization_id") and not obj.organization_id:
            obj.organization_id = request.user.current_organization_id
            if hasattr(obj, "club") and not obj.club:
                obj.club = request.user.club

        super().save_model(request, obj, form, change)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter foreign key choices by organization."""
        # Filter related objects by organization
        if hasattr(db_field.remote_field.model, "organization"):
            if not request.user.is_superuser:
                kwargs["queryset"] = db_field.remote_field.model.objects.filter(
                    organization_id=request.user.current_organization_id
                )

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class MultiTenantModelAdmin(MultiTenantAdminMixin, admin.ModelAdmin):
    """ModelAdmin class with multi-tenant support."""

    pass


class MultiTenantTabularInline(MultiTenantAdminMixin, admin.TabularInline):
    """TabularInline class with multi-tenant support."""

    pass


class MultiTenantStackedInline(MultiTenantAdminMixin, admin.StackedInline):
    """StackedInline class with multi-tenant support."""

    pass
