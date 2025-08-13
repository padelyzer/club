#!/usr/bin/env python
"""
Test script for authentication audit log API endpoints.
"""
import json
import os
import sys

import django

import requests

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model

from rest_framework.test import APIClient

from apps.authentication.models import User

User = get_user_model()


def get_admin_token():
    """Get an admin user token for API access."""
    # Create or get admin user
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser(
            username="admin", email="admin@example.com", password="TEST_PASSWORD"
        )

    # Use APIClient to get token
    from django.test import override_settings

    with override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"]):
        client = APIClient()
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "admin@example.com", "password": "TEST_PASSWORD"},
            format="json",
        )

        if response.status_code == 200:
            return response.json().get("access")
        else:
            print(
                f"Failed to get admin token: {response.status_code} - {response.content}"
            )
            return None


def test_audit_log_api():
    """Test the audit log API endpoints."""
    print("=== Testing Audit Log API ===\n")

    # Get admin token
    token = get_admin_token()
    if not token:
        print("❌ Could not obtain admin token")
        return

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # 1. Test listing audit logs
    print("1. Testing audit log listing...")
    response = client.get("/api/v1/auth/audit-logs/")
    if response.status_code == 200:
        print(f"✓ Retrieved {response.data['count']} audit logs")
        if response.data["results"]:
            print("  Sample log:")
            log = response.data["results"][0]
            print(f"    - Event: {log['event_type_display']}")
            print(f"    - User: {log.get('user_email', 'N/A')}")
            print(f"    - IP: {log['ip_address']}")
            print(f"    - Time: {log['created_at']}")
    else:
        print(f"❌ Failed to list audit logs: {response.status_code}")

    # 2. Test filtering by event type
    print("\n2. Testing event type filtering...")
    response = client.get("/api/v1/auth/audit-logs/", {"event_type": "login_success"})
    if response.status_code == 200:
        print(f"✓ Found {response.data['count']} login success events")

    # 3. Test filtering by date range
    print("\n3. Testing date range filtering...")
    response = client.get(
        "/api/v1/auth/audit-logs/",
        {"start_date": "2025-07-29T00:00:00Z", "end_date": "2025-07-30T00:00:00Z"},
    )
    if response.status_code == 200:
        print(f"✓ Found {response.data['count']} events in date range")

    # 4. Test summary endpoint
    print("\n4. Testing summary endpoint...")
    response = client.get("/api/v1/auth/audit-logs/summary/")
    if response.status_code == 200:
        summary = response.data
        print(f"✓ Total events: {summary['total_events']}")
        print(f"  - Successful: {summary['success_count']}")
        print(f"  - Failed: {summary['failure_count']}")
        print("\n  Event type breakdown:")
        for event in summary["event_type_counts"][:5]:
            print(f"    - {event['event_type']}: {event['count']}")
    else:
        print(f"❌ Failed to get summary: {response.status_code}")

    # 5. Test user activity endpoint
    print("\n5. Testing user activity endpoint...")
    # Get a user ID
    user = User.objects.filter(is_active=True).first()
    if user:
        response = client.get(
            "/api/v1/auth/audit-logs/user_activity/", {"user_id": str(user.id)}
        )
        if response.status_code == 200:
            print(
                f"✓ Found {len(response.data.get('results', []))} events for user {user.email}"
            )
        else:
            print(f"❌ Failed to get user activity: {response.status_code}")

    # 6. Test search functionality
    print("\n6. Testing search functionality...")
    response = client.get("/api/v1/auth/audit-logs/", {"search": "admin"})
    if response.status_code == 200:
        print(f"✓ Search found {response.data['count']} results")

    # 7. Test unauthorized access
    print("\n7. Testing unauthorized access...")
    client.credentials()  # Remove auth
    response = client.get("/api/v1/auth/audit-logs/")
    if response.status_code == 401:
        print("✓ Unauthorized access properly blocked")
    else:
        print(
            f"❌ Unexpected status code for unauthorized access: {response.status_code}"
        )

    # 8. Test non-admin access
    print("\n8. Testing non-admin access...")
    # Create regular user
    regular_user = User.objects.create_user(
        username="regular", email="regular@example.com", password="TEST_PASSWORD"
    )

    # Get token for regular user
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "regular@example.com", "password": "TEST_PASSWORD"},
    )

    if response.status_code == 200:
        regular_token = response.data.get("access")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {regular_token}")
        response = client.get("/api/v1/auth/audit-logs/")
        if response.status_code == 403:
            print("✓ Non-admin access properly blocked")
        else:
            print(
                f"❌ Unexpected status code for non-admin access: {response.status_code}"
            )

    # Cleanup
    regular_user.delete()

    print("\n✅ API testing completed!")


if __name__ == "__main__":
    test_audit_log_api()
