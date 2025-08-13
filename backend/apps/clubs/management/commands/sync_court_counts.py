"""
Django management command to sync court counts for all clubs.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.clubs.models import Club


class Command(BaseCommand):
    help = "Syncs court counts for all clubs to ensure data consistency"

    def handle(self, *args, **options):
        with transaction.atomic():
            updated_count = 0
            
            self.stdout.write("Syncing court counts for all clubs...")
            self.stdout.write("=" * 50)
            
            for club in Club.objects.all():
                actual_count = club.courts.filter(is_active=True).count()
                stored_count = club.total_courts
                
                if actual_count != stored_count:
                    club.total_courts = actual_count
                    club.save(update_fields=["total_courts"])
                    updated_count += 1
                    
                    self.stdout.write(
                        f"Updated {club.name}: {stored_count} → {actual_count} courts"
                    )
                else:
                    self.stdout.write(
                        f"✓ {club.name}: {actual_count} courts (already synced)"
                    )
            
            self.stdout.write("=" * 50)
            
            if updated_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully updated {updated_count} clubs"
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS("All clubs were already synced!")
                )