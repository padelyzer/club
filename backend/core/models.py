"""
Base models for Padelyzer.
"""

import uuid

from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """
    Abstract base model with common fields.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def soft_delete(self):
        """Soft delete the object."""
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])

    def restore(self):
        """Restore a soft deleted object."""
        self.is_active = True
        self.save(update_fields=["is_active", "updated_at"])


class MultiTenantModel(BaseModel):
    """
    Abstract model for multi-tenant data.
    """

    organization = models.ForeignKey(
        "root.Organization", on_delete=models.CASCADE, related_name="%(class)s_set"
    )
    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.CASCADE,
        related_name="%(class)s_set",
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["club", "is_active"]),
        ]
