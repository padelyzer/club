#!/usr/bin/env python3
"""Test health check endpoint configuration."""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.test import RequestFactory

from apps.shared.monitoring import health_check


def test_health_check():
    """Test the health check endpoint."""
    factory = RequestFactory()
    request = factory.get("/health/")

    try:
        response = health_check(request)
        print(f"✅ Health check status: {response.status_code}")

        import json

        data = json.loads(response.content)
        print(f"✅ Health status: {data.get('status', 'unknown')}")
        print(f"✅ Checks performed:")

        for check, result in data.get("checks", {}).items():
            status = (
                result.get("status", "unknown") if isinstance(result, dict) else result
            )
            print(f"   - {check}: {status}")

    except Exception as e:
        print(f"❌ Health check failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    print("🏥 Testing Health Check Endpoint...")
    test_health_check()
