#!/usr/bin/env python
"""
Script to ensure admin user has superuser/staff privileges
Run with: python make_root_user.py
"""
import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.authentication.models import User


def main():
    print("🔐 Setting up ROOT user privileges...")
    print("-" * 50)

    # Find the admin user
    try:
        admin_user = User.objects.get(email="admin@padelyzer.com")
        print(f"✅ Found user: {admin_user.email}")

        # Update privileges
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        print(f"✅ Updated privileges:")
        print(f"   - is_staff: {admin_user.is_staff}")
        print(f"   - is_superuser: {admin_user.is_superuser}")
        print(f"   - is_active: {admin_user.is_active}")

    except User.DoesNotExist:
        print("❌ Admin user not found. Creating one...")
        admin_user = User.objects.create_superuser(
            username="admin@padelyzer.com",
            email="admin@padelyzer.com",
            password="admin123",
            first_name="Root",
            last_name="Admin",
        )
        print(f"✅ Created superuser: {admin_user.email}")

    # List all superusers
    print("\n📋 All superusers in the system:")
    print("-" * 50)
    superusers = User.objects.filter(is_superuser=True)
    for su in superusers:
        print(f"  - {su.email} (staff: {su.is_staff}, active: {su.is_active})")

    print("\n✅ Done! You can now login with:")
    print(f"   Email: admin@padelyzer.com")
    print(f"   Password: admin123")
    print("\nThis user has full ROOT access to the system.")


if __name__ == "__main__":
    main()
