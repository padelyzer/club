#!/usr/bin/env python
"""
Test script for authentication audit logging functionality.
"""
import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import json

from django.test import RequestFactory
from django.utils import timezone

from apps.authentication.models import AuthAuditLog, User
from apps.authentication.signals import (
    organization_switched,
    password_changed,
    password_reset_requested,
    two_factor_enabled,
)


def test_audit_log_creation():
    """Test direct audit log creation."""
    print("\n1. Testing direct audit log creation...")

    # Create a test user
    user = User.objects.filter(email="test@example.com").first()
    if not user:
        user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

    # Create a mock request
    factory = RequestFactory()
    request = factory.post(
        "/login", {"email": "test@example.com", "password": "TEST_PASSWORD"}
    )
    request.META["HTTP_USER_AGENT"] = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    )
    request.META["REMOTE_ADDR"] = "192.168.1.100"

    # Test login attempt log
    log = AuthAuditLog.log_event(
        event_type="login_attempt",
        request=request,
        user=user,
        success=True,
        details={"device_type": "web"},
    )
    print(f"✓ Created login attempt log: {log}")

    # Test failed login log
    failed_log = AuthAuditLog.log_event(
        event_type="login_failed",
        request=request,
        success=False,
        attempted_email="wrong@example.com",
        details={"reason": "invalid_credentials"},
    )
    print(f"✓ Created failed login log: {failed_log}")

    # Test suspicious login log
    suspicious_log = AuthAuditLog.log_event(
        event_type="suspicious_login",
        request=request,
        user=user,
        success=True,
        details={
            "location": {"city": "Unknown", "country": "Unknown"},
            "reason": "new_location",
        },
    )
    print(f"✓ Created suspicious login log: {suspicious_log}")


def test_signal_based_logging():
    """Test signal-based audit logging."""
    print("\n2. Testing signal-based audit logging...")

    user = User.objects.filter(email="test@example.com").first()
    if not user:
        return

    # Create a mock request
    factory = RequestFactory()
    request = factory.post("/change-password")
    request.META["HTTP_USER_AGENT"] = "Mozilla/5.0"
    request.META["REMOTE_ADDR"] = "192.168.1.100"

    # Test password changed signal
    password_changed.send(sender=None, user=user, request=request, method="api")
    print("✓ Sent password_changed signal")

    # Test password reset requested signal
    password_reset_requested.send(sender=None, user=user, request=request)
    print("✓ Sent password_reset_requested signal")

    # Test 2FA enabled signal
    two_factor_enabled.send(sender=None, user=user, method="email", request=request)
    print("✓ Sent two_factor_enabled signal")


def test_audit_log_queries():
    """Test querying audit logs."""
    print("\n3. Testing audit log queries...")

    # Get all logs
    total_logs = AuthAuditLog.objects.count()
    print(f"Total audit logs: {total_logs}")

    # Get logs by event type
    login_logs = AuthAuditLog.objects.filter(event_type="login_attempt").count()
    print(f"Login attempt logs: {login_logs}")

    # Get failed logs
    failed_logs = AuthAuditLog.objects.filter(success=False).count()
    print(f"Failed event logs: {failed_logs}")

    # Get recent logs
    recent_logs = AuthAuditLog.objects.order_by("-created_at")[:5]
    print("\nRecent audit logs:")
    for log in recent_logs:
        print(
            f"  - {log.created_at}: {log.get_event_type_display()} - "
            f"User: {log.user.email if log.user else log.attempted_email or 'N/A'} - "
            f"Success: {log.success}"
        )

    # Get logs by IP
    ip_logs = AuthAuditLog.objects.filter(ip_address="192.168.1.100")
    print(f"\nLogs from IP 192.168.1.100: {ip_logs.count()}")

    # Test event type choices
    print("\nAvailable event types:")
    for event_type, display in AuthAuditLog.EVENT_TYPES:
        count = AuthAuditLog.objects.filter(event_type=event_type).count()
        if count > 0:
            print(f"  - {display} ({event_type}): {count} logs")


def display_sample_log():
    """Display a sample log entry in detail."""
    print("\n4. Sample audit log entry details:")

    sample_log = AuthAuditLog.objects.filter(details__isnull=False).first()
    if sample_log:
        print(f"ID: {sample_log.id}")
        print(
            f"Event Type: {sample_log.get_event_type_display()} ({sample_log.event_type})"
        )
        print(f"User: {sample_log.user.email if sample_log.user else 'None'}")
        print(f"Attempted Email: {sample_log.attempted_email or 'N/A'}")
        print(f"IP Address: {sample_log.ip_address}")
        print(f"User Agent: {sample_log.user_agent[:50]}...")
        print(f"Browser: {sample_log.browser or 'Unknown'}")
        print(f"OS: {sample_log.os or 'Unknown'}")
        print(f"Success: {sample_log.success}")
        print(
            f"Organization: {sample_log.organization.trade_name if sample_log.organization else 'None'}"
        )
        print(f"Created At: {sample_log.created_at}")
        print(f"Details: {json.dumps(sample_log.details, indent=2)}")
    else:
        print("No audit logs with details found.")


def cleanup_test_data():
    """Clean up test data."""
    print("\n5. Cleaning up test data...")

    # Delete test logs
    test_logs = AuthAuditLog.objects.filter(ip_address="192.168.1.100").delete()
    print(f"✓ Deleted {test_logs[0]} test audit logs")

    # Optionally delete test user
    # User.objects.filter(email='test@example.com').delete()


if __name__ == "__main__":
    print("=== Authentication Audit Log Test ===")

    try:
        test_audit_log_creation()
        test_signal_based_logging()
        test_audit_log_queries()
        display_sample_log()
        # cleanup_test_data()  # Uncomment to clean up

        print("\n✅ All tests completed successfully!")

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback

        traceback.print_exc()
