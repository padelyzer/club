#!/usr/bin/env python3
"""
Handle migrations safely for deployment.
This script will create initial migrations for apps that need them.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

# Configure Django before importing anything else
django.setup()

from django.core.management import call_command
from django.db import connection

def create_migrations_if_needed():
    """Create migrations for apps that need them."""
    
    apps_to_check = [
        'authentication',
        'clients',
        'leagues', 
        'tournaments',
    ]
    
    print("Checking and creating migrations...")
    
    for app_name in apps_to_check:
        try:
            # Try to create migrations
            print(f"\nChecking {app_name}...")
            call_command('makemigrations', app_name, verbosity=0)
            print(f"✅ {app_name} migrations ready")
        except Exception as e:
            print(f"⚠️  {app_name}: {e}")
    
    print("\nApplying migrations...")
    try:
        call_command('migrate', '--noinput', verbosity=1)
        print("✅ All migrations applied successfully!")
    except Exception as e:
        print(f"❌ Migration error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_migrations_if_needed()