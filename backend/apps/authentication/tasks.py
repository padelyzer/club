"""
Async tasks for authentication module.
"""

import logging

from django.utils import timezone

from celery import shared_task

from .models import BlacklistedToken

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_blacklisted_tokens():
    """
    Periodic task to clean up expired blacklisted tokens.
    Should be run daily.
    """
    try:
        expired_count = BlacklistedToken.cleanup_expired()
        logger.info(f"Cleaned up {expired_count} expired blacklisted tokens")
        return f"Cleaned up {expired_count} tokens"
    except Exception as e:
        logger.error(f"Error cleaning up blacklisted tokens: {str(e)}")
        raise


@shared_task
def cleanup_expired_sessions():
    """
    Periodic task to clean up expired sessions.
    Should be run daily.
    """
    from .models import Session

    try:
        expired_sessions = Session.objects.filter(
            expires_at__lt=timezone.now(), is_active=True
        )

        count = expired_sessions.update(
            is_active=False, revoked_at=timezone.now(), revoked_reason="expired"
        )

        logger.info(f"Marked {count} expired sessions as inactive")
        return f"Cleaned up {count} sessions"
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}")
        raise


@shared_task
def generate_auth_report():
    """
    Generate daily authentication report.
    """
    from datetime import timedelta

    from django.db.models import Count, Q

    from .models import AuthAuditLog

    # Get yesterday's data
    yesterday = timezone.now() - timedelta(days=1)
    start_time = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    end_time = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Get audit logs for yesterday
    logs = AuthAuditLog.objects.filter(
        created_at__gte=start_time, created_at__lte=end_time
    )

    # Generate statistics
    stats = {
        "date": yesterday.date(),
        "total_events": logs.count(),
        "successful_logins": logs.filter(event_type="login_success").count(),
        "failed_logins": logs.filter(event_type="login_failed").count(),
        "suspicious_logins": logs.filter(event_type="suspicious_login").count(),
        "password_changes": logs.filter(event_type="password_change").count(),
        "logouts": logs.filter(event_type="logout").count(),
        "unique_users": logs.values("user").distinct().count(),
        "unique_ips": logs.values("ip_address").distinct().count(),
    }

    # Log the report
    logger.info(f"Auth report for {stats['date']}: {stats}")

    # In production, you might want to:
    # - Send this report via email
    # - Store it in a reporting database
    # - Send to monitoring service

    return stats
