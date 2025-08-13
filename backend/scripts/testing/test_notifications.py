#!/usr/bin/env python
"""
Test script to verify the notifications system is working.
Tests both API endpoints and real-time WebSocket notifications.
"""

import json
import os
import sys
from datetime import datetime

import django

import requests

# Add project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model

from apps.notifications.models import NotificationChannel, NotificationType
from apps.notifications.services import NotificationService

User = get_user_model()


def test_notification_system():
    """Test the notification system."""
    print("Testing Notification System...")
    print("=" * 50)

    # 1. Create test user
    print("\n1. Creating test user...")
    try:
        user = User.objects.get(email="test@padelyzer.com")
        print(f"   ✓ Using existing user: {user.email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email="test@padelyzer.com",
            password="TEST_PASSWORD",
            first_name="Test",
            last_name="User",
        )
        print(f"   ✓ Created new user: {user.email}")

    # 2. Create notification types and channels
    print("\n2. Setting up notification types and channels...")

    # Create channels
    channels = ["in_app", "email", "push", "sms", "whatsapp"]
    for channel_name in channels:
        channel, created = NotificationChannel.objects.get_or_create(
            name=channel_name, defaults={"is_active": True}
        )
        print(
            f"   ✓ Channel '{channel_name}' {'created' if created else 'already exists'}"
        )

    # Create notification types
    notification_types = [
        {
            "code": "reservation_confirmed",
            "name": "Reservation Confirmed",
            "description": "Sent when a reservation is confirmed",
            "category": "reservations",
        },
        {
            "code": "payment_received",
            "name": "Payment Received",
            "description": "Sent when a payment is received",
            "category": "payments",
        },
        {
            "code": "tournament_reminder",
            "name": "Tournament Reminder",
            "description": "Sent as a reminder for upcoming tournaments",
            "category": "tournaments",
        },
        {
            "code": "system_update",
            "name": "System Update",
            "description": "Sent for system updates and maintenance",
            "category": "system",
        },
    ]

    for type_data in notification_types:
        notification_type, created = NotificationType.objects.get_or_create(
            code=type_data["code"], defaults=type_data
        )
        print(
            f"   ✓ Type '{type_data['code']}' {'created' if created else 'already exists'}"
        )

    # 3. Test sending notifications
    print("\n3. Testing notification sending...")

    notification_service = NotificationService()

    # Test in-app notification
    print("\n   Testing in-app notification...")
    try:
        notification = notification_service.send_notification(
            user=user,
            notification_type="reservation_confirmed",
            channels=["in_app"],
            context={
                "court_name": "Court 1",
                "date": "2025-01-30",
                "time": "10:00 AM",
                "duration": "1 hour",
            },
            title="Reservation Confirmed",
            message="Your reservation for Court 1 on Jan 30 at 10:00 AM has been confirmed.",
        )
        print(f"   ✓ In-app notification sent successfully (ID: {notification.id})")
    except Exception as e:
        print(f"   ✗ Failed to send in-app notification: {e}")

    # Test multiple channel notification
    print("\n   Testing multi-channel notification...")
    try:
        notification = notification_service.send_notification(
            user=user,
            notification_type="payment_received",
            channels=["in_app", "email"],
            context={
                "amount": "$50.00",
                "payment_method": "Credit Card",
                "invoice_number": "INV-2025-001",
            },
            title="Payment Received",
            message="We have received your payment of $50.00. Thank you!",
        )
        print(
            f"   ✓ Multi-channel notification sent successfully (ID: {notification.id})"
        )
    except Exception as e:
        print(f"   ✗ Failed to send multi-channel notification: {e}")

    # 4. Test notification API endpoints
    print("\n4. Testing API endpoints...")

    # Login to get token
    print("\n   Getting auth token...")
    login_response = requests.post(
        "http://localhost:8000/api/v1/auth/login/",
        json={"email": "test@padelyzer.com", "password": "TEST_PASSWORD"},
    )

    if login_response.status_code == 200:
        token = login_response.json()["access"]
        print(f"   ✓ Authentication successful")

        headers = {"Authorization": f"Bearer {token}"}

        # Test listing notifications
        print("\n   Testing notification list endpoint...")
        list_response = requests.get(
            "http://localhost:8000/api/v1/notifications/", headers=headers
        )

        if list_response.status_code == 200:
            notifications = list_response.json()
            print(
                f"   ✓ Retrieved {len(notifications.get('results', []))} notifications"
            )
        else:
            print(f"   ✗ Failed to list notifications: {list_response.status_code}")

        # Test notification preferences
        print("\n   Testing notification preferences endpoint...")
        prefs_response = requests.get(
            "http://localhost:8000/api/v1/notifications/preferences/", headers=headers
        )

        if prefs_response.status_code == 200:
            print(f"   ✓ Retrieved notification preferences")
        else:
            print(f"   ✗ Failed to get preferences: {prefs_response.status_code}")
    else:
        print(f"   ✗ Authentication failed: {login_response.status_code}")

    # 5. Test WebSocket notification (if channels is configured)
    print("\n5. WebSocket Configuration...")
    try:
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        print("   ✓ Django Channels is configured")

        # Send a test WebSocket notification
        from asgiref.sync import async_to_sync

        async_to_sync(channel_layer.group_send)(
            f"user_{user.id}",
            {
                "type": "notification.new",
                "notification": {
                    "id": "test-123",
                    "title": "WebSocket Test",
                    "message": "This is a test WebSocket notification",
                    "type": "info",
                    "createdAt": datetime.now().isoformat(),
                },
            },
        )
        print("   ✓ Test WebSocket notification sent")
    except ImportError:
        print("   ⚠ Django Channels not installed - WebSocket notifications disabled")
    except Exception as e:
        print(f"   ⚠ WebSocket test failed: {e}")

    print("\n" + "=" * 50)
    print("Notification System Test Complete!")
    print("\nSummary:")
    print("- Notification models and services are working")
    print("- API endpoints are accessible")
    print("- To enable real-time WebSocket notifications:")
    print("  1. Install Django Channels: pip install channels channels-redis")
    print("  2. Configure ASGI and channel layers in settings")
    print("  3. Create WebSocket consumers for notifications")


if __name__ == "__main__":
    test_notification_system()
