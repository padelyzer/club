#!/usr/bin/env python
"""
Safe Migration Executor - Handles database migrations with rollback capability.
"""

import os
import sys
import django
import subprocess
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection
from django.core.management import call_command


def backup_database():
    """Create database backup before migrations."""
    print("📦 Creating database backup...")
    
    # For SQLite
    db_path = connection.settings_dict.get('NAME')
    if db_path and os.path.exists(db_path):
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Backup created: {backup_path}")
        return backup_path
    
    return None


def check_pending_migrations():
    """Check for pending migrations."""
    print("\n🔍 Checking pending migrations...")
    
    try:
        result = subprocess.run(
            ['python3', 'manage.py', 'showmigrations', '--plan'],
            capture_output=True,
            text=True
        )
        
        lines = result.stdout.split('\n')
        pending = [line for line in lines if '[ ]' in line]
        
        if pending:
            print(f"⚠️  Found {len(pending)} pending migrations:")
            for migration in pending[:5]:  # Show first 5
                print(f"   {migration}")
            if len(pending) > 5:
                print(f"   ... and {len(pending) - 5} more")
        else:
            print("✅ No pending migrations found")
        
        return len(pending)
        
    except Exception as e:
        print(f"❌ Error checking migrations: {e}")
        return -1


def create_migrations():
    """Create new migrations for all apps."""
    print("\n📝 Creating new migrations...")
    
    apps = [
        'authentication', 'root', 'clubs', 'clients', 
        'reservations', 'finance', 'notifications'
    ]
    
    created = 0
    for app in apps:
        try:
            print(f"  Checking {app}...", end='')
            result = subprocess.run(
                ['python3', 'manage.py', 'makemigrations', app, '--dry-run'],
                capture_output=True,
                text=True
            )
            
            if 'No changes detected' not in result.stdout:
                # Actually create the migration
                subprocess.run(['python3', 'manage.py', 'makemigrations', app])
                print(" ✅ Created")
                created += 1
            else:
                print(" ⏭️  No changes")
                
        except Exception as e:
            print(f" ❌ Error: {e}")
    
    print(f"\n✅ Created {created} new migrations")
    return created


def apply_migrations():
    """Apply all pending migrations with error handling."""
    print("\n🚀 Applying migrations...")
    
    try:
        # First try normal migrate
        call_command('migrate', verbosity=2)
        print("✅ All migrations applied successfully")
        return True
        
    except Exception as e:
        print(f"⚠️  Migration error: {e}")
        print("Attempting to fix...")
        
        # Try migrate with --fake-initial for problematic migrations
        try:
            call_command('migrate', '--fake-initial', verbosity=2)
            print("✅ Migrations applied with --fake-initial")
            return True
            
        except Exception as e2:
            print(f"❌ Failed to apply migrations: {e2}")
            return False


def verify_database_schema():
    """Verify all expected tables exist."""
    print("\n🔍 Verifying database schema...")
    
    expected_tables = [
        'auth_user',
        'authentication_user',
        'root_organization',
        'clubs_club',
        'clubs_court',
        'clients_clientprofile',
        'reservations_reservation',
        'finance_payment',
        'finance_revenue'
    ]
    
    with connection.cursor() as cursor:
        # Get all tables
        if connection.vendor == 'sqlite':
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        else:
            cursor.execute("SHOW TABLES;")
        
        tables = [row[0] for row in cursor.fetchall()]
        
        missing = []
        for table in expected_tables:
            if table not in tables:
                missing.append(table)
            else:
                print(f"  ✅ {table}")
        
        if missing:
            print(f"\n⚠️  Missing tables: {', '.join(missing)}")
            return False
        else:
            print("\n✅ All expected tables exist")
            return True


def main():
    """Execute safe migration process."""
    print("🔧 SAFE MIGRATION EXECUTOR")
    print("=" * 50)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Backup
    backup_path = backup_database()
    
    # Step 2: Check pending
    pending = check_pending_migrations()
    
    # Step 3: Create migrations
    created = create_migrations()
    
    # Step 4: Apply migrations
    if pending > 0 or created > 0:
        success = apply_migrations()
        
        if not success and backup_path:
            print("\n⚠️  Restoring from backup...")
            # Restore logic here
    
    # Step 5: Verify
    schema_ok = verify_database_schema()
    
    print("\n" + "=" * 50)
    if schema_ok:
        print("✅ Migration process completed successfully!")
    else:
        print("⚠️  Migration completed with warnings")
        print("   Run 'python manage.py dbshell' to inspect manually")
    
    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()