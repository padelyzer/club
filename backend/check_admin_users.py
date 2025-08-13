#!/usr/bin/env python3
import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model

from apps.clubs.models import Club

User = get_user_model()

print("=== ADMIN USERS ===")
print()

# Check for superusers
superusers = User.objects.filter(is_superuser=True)
if superusers.exists():
    print("SUPERUSERS:")
    for user in superusers:
        print(f"  - Username: {user.username}")
        print(f"    Email: {user.email}")
        print(f"    Is Active: {user.is_active}")
        print()
else:
    print("No superusers found.")
    print()

# Check for staff users
staff_users = User.objects.filter(is_staff=True, is_superuser=False)
if staff_users.exists():
    print("STAFF USERS:")
    for user in staff_users:
        print(f"  - Username: {user.username}")
        print(f"    Email: {user.email}")
        print(f"    Is Active: {user.is_active}")
        print()

# Check for club admins/owners
print("=== CLUB ADMINS/OWNERS ===")
print()

clubs = Club.objects.all()
for club in clubs:
    print(f"Club: {club.name}")

    # Check for owner
    if hasattr(club, "owner") and club.owner:
        print(f"  Owner: {club.owner.username} ({club.owner.email})")

    # Check for staff members with admin role
    if hasattr(club, "staff_members"):
        admins = club.staff_members.filter(role__in=["admin", "owner"]).select_related(
            "user"
        )
        for staff in admins:
            print(
                f"  Admin: {staff.user.username} ({staff.user.email}) - Role: {staff.role}"
            )

    # Check for memberships with admin role
    if hasattr(club, "memberships"):
        admin_members = club.memberships.filter(
            role__in=["admin", "owner"]
        ).select_related("user")
        for membership in admin_members:
            print(
                f"  Member Admin: {membership.user.username} ({membership.user.email}) - Role: {membership.role}"
            )

    print()

# Create a test admin user if none exist
if not superusers.exists():
    print("=== CREATING TEST ADMIN USER ===")
    admin_user = User.objects.create_superuser(
        username="admin", email="admin@padelyzer.com", password="admin123456"
    )
    print(f"Created superuser: {admin_user.username}")
    print(f"Password: admin123456")
    print()

# Also create a club admin user
print("=== CREATING TEST CLUB ADMIN ===")
try:
    club_admin = User.objects.create_user(
        username="clubadmin",
        email="clubadmin@padelyzer.com",
        password="clubadmin123",
        is_staff=True,
    )
    print(f"Created club admin: {club_admin.username}")
    print(f"Password: clubadmin123")

    # Assign to first club if exists
    if clubs.exists():
        first_club = clubs.first()
        # Try to create membership
        try:
            from apps.clubs.models import ClubMembership

            membership = ClubMembership.objects.create(
                user=club_admin, club=first_club, role="admin"
            )
            print(f"Assigned to club: {first_club.name} as admin")
        except Exception as e:
            print(f"Could not create membership: {e}")
except Exception as e:
    if "already exists" in str(e):
        print("Club admin user already exists")
        club_admin = User.objects.get(username="clubadmin")
        print(f"Existing club admin: {club_admin.username}")
        print(f"Password: clubadmin123")
    else:
        print(f"Error creating club admin: {e}")
