"""
Management command to clean up expired blacklisted tokens.
"""

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.authentication.models import BlacklistedToken

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Remove expired tokens from the blacklist table"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed information about the cleanup process",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        verbose = options.get("verbose", False)

        # Get expired tokens
        expired_tokens = BlacklistedToken.objects.filter(
            token_expires_at__lt=timezone.now()
        )

        expired_count = expired_tokens.count()

        if expired_count == 0:
            self.stdout.write(self.style.SUCCESS("No expired tokens to clean up."))
            return

        if verbose:
            self.stdout.write(
                self.style.WARNING(f"Found {expired_count} expired tokens")
            )

            # Show some details
            for token in expired_tokens[:10]:  # Show first 10
                self.stdout.write(
                    f"  - User: {token.user.email}, "
                    f"Expired: {token.token_expires_at}, "
                    f"Reason: {token.get_reason_display()}"
                )

            if expired_count > 10:
                self.stdout.write(f"  ... and {expired_count - 10} more")

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN: Would delete {expired_count} expired tokens"
                )
            )
        else:
            # Delete expired tokens
            deleted_count = expired_tokens.delete()[0]

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {deleted_count} expired tokens"
                )
            )

            # Log the cleanup
            logger.info(f"Cleaned up {deleted_count} expired blacklisted tokens")

        # Show statistics
        if verbose:
            remaining_count = BlacklistedToken.objects.count()
            self.stdout.write(
                f"\nBlacklist statistics:"
                f"\n  - Tokens remaining: {remaining_count}"
                f"\n  - Tokens by reason:"
            )

            from django.db.models import Count

            reason_counts = (
                BlacklistedToken.objects.values("reason")
                .annotate(count=Count("id"))
                .order_by("-count")
            )

            for item in reason_counts:
                reason_display = dict(BlacklistedToken.BLACKLIST_REASONS).get(
                    item["reason"], item["reason"]
                )
                self.stdout.write(f"    - {reason_display}: {item['count']}")
