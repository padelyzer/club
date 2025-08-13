#!/usr/bin/env python3
"""
Bootstrap migrations to handle the authentication app dependency issue.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

# We need to setup Django but with a minimal configuration first
from django.conf import settings
from django.apps import apps

# Temporarily modify INSTALLED_APPS to only include core Django apps and authentication
original_installed_apps = settings.INSTALLED_APPS

try:
    # First, setup with minimal apps
    settings.INSTALLED_APPS = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'apps.authentication',  # Only our authentication app
    ]
    
    # Now setup Django
    django.setup()
    
    from django.core.management import call_command
    
    print("Creating authentication migrations...")
    try:
        call_command('makemigrations', 'authentication', verbosity=2)
        print("✅ Authentication migrations created")
    except Exception as e:
        print(f"⚠️  Error creating authentication migrations: {e}")
    
    # Now restore full INSTALLED_APPS and migrate
    settings.INSTALLED_APPS = original_installed_apps
    
    print("\nRunning all migrations...")
    try:
        call_command('migrate', verbosity=1)
        print("✅ All migrations completed!")
    except Exception as e:
        print(f"❌ Migration error: {e}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Bootstrap error: {e}")
    sys.exit(1)