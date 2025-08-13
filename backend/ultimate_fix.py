#!/usr/bin/env python3
"""
Ultimate fix for authentication app issue.
This manually ensures the app is loaded before migrations.
"""

import os
import sys
import django
from django.db import connection

print("🔧 Ultimate Authentication Fix")
print("=" * 50)

# Setup environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

# Import settings before Django setup
from django.conf import settings

# Force authentication app to be in INSTALLED_APPS
installed_apps = list(settings.INSTALLED_APPS)
if 'apps.authentication' not in installed_apps:
    # Insert right after django.contrib.auth
    auth_index = installed_apps.index('django.contrib.auth')
    installed_apps.insert(auth_index + 1, 'apps.authentication')
    settings.INSTALLED_APPS = tuple(installed_apps)

# Now setup Django
django.setup()

# Verify the app is loaded
from django.apps import apps
try:
    auth_app = apps.get_app_config('authentication')
    print(f"✅ Authentication app loaded: {auth_app.label}")
except LookupError:
    print("❌ Authentication app still not recognized!")
    sys.exit(1)

# Now create the tables manually if needed
print("\n📊 Checking database state...")

with connection.cursor() as cursor:
    # Check if auth_user table exists (Django's built-in)
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'auth_user'
        );
    """)
    auth_user_exists = cursor.fetchone()[0]
    
    # Check if authentication_user table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'authentication_user'
        );
    """)
    custom_user_exists = cursor.fetchone()[0]
    
    print(f"Django auth_user table exists: {auth_user_exists}")
    print(f"Custom authentication_user table exists: {custom_user_exists}")

# If tables don't exist, create them
if not custom_user_exists:
    print("\n🔨 Creating authentication_user table...")
    
    # Create the custom user table
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS authentication_user (
                id BIGSERIAL PRIMARY KEY,
                password VARCHAR(128) NOT NULL,
                last_login TIMESTAMP WITH TIME ZONE,
                is_superuser BOOLEAN NOT NULL DEFAULT false,
                username VARCHAR(150) UNIQUE NOT NULL,
                first_name VARCHAR(150) NOT NULL DEFAULT '',
                last_name VARCHAR(150) NOT NULL DEFAULT '',
                is_staff BOOLEAN NOT NULL DEFAULT false,
                is_active BOOLEAN NOT NULL DEFAULT true,
                date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                email VARCHAR(254) UNIQUE NOT NULL,
                phone VARCHAR(20) DEFAULT '',
                phone_verified BOOLEAN NOT NULL DEFAULT false,
                email_verified BOOLEAN NOT NULL DEFAULT false,
                two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
                two_factor_method VARCHAR(10) NOT NULL DEFAULT 'email',
                avatar_url VARCHAR(200) DEFAULT '',
                language VARCHAR(5) NOT NULL DEFAULT 'es-mx',
                timezone VARCHAR(50) NOT NULL DEFAULT 'America/Mexico_City',
                current_organization_id UUID,
                last_login_ip INET,
                last_login_device VARCHAR(200) DEFAULT ''
            );
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS authentication_user_email_idx ON authentication_user(email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS authentication_user_phone_idx ON authentication_user(phone);")
        
        # Create the many-to-many tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS authentication_user_groups (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES authentication_user(id) ON DELETE CASCADE,
                group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
                UNIQUE(user_id, group_id)
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS authentication_user_user_permissions (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES authentication_user(id) ON DELETE CASCADE,
                permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
                UNIQUE(user_id, permission_id)
            );
        """)
        
    print("✅ Tables created successfully!")

# Now update django_migrations to mark authentication as migrated
print("\n📝 Updating migration records...")
from django.core.management import call_command

# First, let's fake the authentication migration
try:
    call_command('migrate', 'authentication', '0001_initial', '--fake', verbosity=0)
    print("✅ Authentication migration marked as applied")
except Exception as e:
    print(f"⚠️  Could not fake migration: {e}")

# Now run all migrations
print("\n🚀 Running all migrations...")
try:
    call_command('migrate', verbosity=1)
    print("✅ All migrations completed!")
except Exception as e:
    print(f"❌ Migration error: {e}")
    sys.exit(1)

print("\n✅ Ultimate fix completed!")