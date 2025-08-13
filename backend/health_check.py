#!/usr/bin/env python
# Health check script for Railway

import os
import sys

import django
from django.core.management import execute_from_command_line

import requests

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.railway")


def check_health():
    print("🏥 Checking application health...")

    try:
        # Check database
        django.setup()
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Database connection: OK")

        # Check cache
        from django.core.cache import cache

        cache.set("health_check", "ok", timeout=60)
        if cache.get("health_check") == "ok":
            print("✅ Redis cache: OK")
        else:
            print("❌ Redis cache: FAIL")
            return False

        # Check critical models
        from apps.authentication.models import User

        user_count = User.objects.count()
        print(f"✅ User model: {user_count} users")

        print("🎉 Health check passed!")
        return True

    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


if __name__ == "__main__":
    success = check_health()
    sys.exit(0 if success else 1)
