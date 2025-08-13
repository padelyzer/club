#!/usr/bin/env python3
"""
Initialize database with proper migration order.
This script ensures authentication app is migrated first.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django.core.management import call_command
from django.db import connection

def init_database():
    """Initialize database with proper migration order."""
    
    print("🚀 Database Initialization")
    print("=" * 50)
    
    # Step 1: Check if we have any tables
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_count = cursor.fetchone()[0]
        print(f"\n📊 Current tables in database: {table_count}")
    
    if table_count == 0:
        print("\n🆕 Fresh database detected!")
        
        # Step 2: Migrate core Django apps first
        print("\n📦 Step 1: Migrating Django core apps...")
        core_apps = ['contenttypes', 'auth', 'sessions', 'admin', 'messages', 'staticfiles']
        for app in core_apps:
            try:
                call_command('migrate', app, verbosity=0)
                print(f"   ✅ {app}")
            except Exception as e:
                print(f"   ⚠️  {app}: {e}")
        
        # Step 3: Create authentication app tables
        print("\n📦 Step 2: Creating authentication app...")
        try:
            # First, create the app's migrations if they don't exist
            call_command('makemigrations', 'authentication', verbosity=0)
            print("   ✅ Authentication migrations created")
        except:
            print("   ℹ️  Authentication migrations already exist")
        
        try:
            call_command('migrate', 'authentication', verbosity=0)
            print("   ✅ Authentication migrated")
        except Exception as e:
            print(f"   ❌ Authentication migration failed: {e}")
            sys.exit(1)
        
        # Step 4: Migrate everything else
        print("\n📦 Step 3: Migrating all remaining apps...")
        try:
            call_command('migrate', verbosity=1)
            print("   ✅ All migrations completed!")
        except Exception as e:
            print(f"   ❌ Migration failed: {e}")
            sys.exit(1)
    else:
        print("\n📊 Existing database detected, running normal migration...")
        try:
            call_command('migrate', verbosity=1)
            print("   ✅ Migrations completed!")
        except Exception as e:
            print(f"   ❌ Migration failed: {e}")
            sys.exit(1)
    
    print("\n✅ Database initialization complete!")

if __name__ == "__main__":
    init_database()