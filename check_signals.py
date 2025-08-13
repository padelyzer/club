#!/usr/bin/env python3
"""
Check the status of Django signals.
"""

import os
import sys
import django

# Add backend to path
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

django.setup()

from django.db.models import signals
from django.contrib.auth import get_user_model

User = get_user_model()

def check_signal_receivers():
    """Check which signals are connected."""
    print("📡 Checking Django signal receivers...")
    print("=" * 50)
    
    # Check post_save signals for User model
    post_save_receivers = signals.post_save._live_receivers(sender=User)
    print(f"User post_save receivers: {len(post_save_receivers)}")
    
    for receiver in post_save_receivers:
        func_name = getattr(receiver, '__name__', 'unknown')
        module = getattr(receiver, '__module__', 'unknown')
        print(f"  - {module}.{func_name}")
    
    print("\n" + "=" * 50)
    print("✅ Signal check completed")

if __name__ == "__main__":
    check_signal_receivers()
