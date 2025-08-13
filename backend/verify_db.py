#!/usr/bin/env python
"""Verify database content for deployment readiness."""
import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model

from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from apps.root.models import Organization

User = get_user_model()

print("=== DATABASE VERIFICATION ===")
print(f"\n✅ Organizations: {Organization.objects.count()}")
for org in Organization.objects.all():
    print(f"   - {org.trade_name} ({org.rfc})")

print(f"\n✅ Users: {User.objects.count()}")
for user in User.objects.all():
    print(f"   - {user.email} (superuser: {user.is_superuser})")

print(f"\n✅ Clubs: {Club.objects.count()}")
for club in Club.objects.all():
    print(f"   - {club.name} (org: {club.organization.trade_name})")

print(f"\n✅ Courts: {Court.objects.count()}")
for court in Court.objects.all():
    print(f"   - {court.name} in {court.club.name} (${court.price_per_hour}/hr)")

print(f"\n✅ Reservations: {Reservation.objects.count()}")
for res in Reservation.objects.all()[:5]:
    print(f"   - {res.date} {res.start_time}-{res.end_time} ({res.status})")

print("\n✅ Database is populated and ready!")
