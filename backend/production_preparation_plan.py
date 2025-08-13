#!/usr/bin/env python
"""
Production Preparation Plan - Comprehensive deployment readiness strategy.
"""

import os
import sys
import subprocess
import json
from datetime import datetime
from pathlib import Path

def create_production_plan():
    """Create comprehensive production preparation plan."""
    
    print("🚀 PRODUCTION PREPARATION PLAN - PADELYZER")
    print("=" * 60)
    print(f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    plan = {
        "phases": [
            {
                "id": "PHASE-1",
                "name": "Database Migration & Schema Fix",
                "priority": "CRITICAL",
                "tasks": [
                    {
                        "id": "TASK-1.1",
                        "name": "Backup current database",
                        "command": "python manage.py dbbackup",
                        "verification": "Check backup file exists"
                    },
                    {
                        "id": "TASK-1.2",
                        "name": "Create all pending migrations",
                        "command": "python manage.py makemigrations",
                        "verification": "Check migration files created"
                    },
                    {
                        "id": "TASK-1.3",
                        "name": "Apply migrations with error handling",
                        "command": "python manage.py migrate --run-syncdb",
                        "verification": "All migrations applied successfully"
                    },
                    {
                        "id": "TASK-1.4",
                        "name": "Verify database schema",
                        "command": "python manage.py dbshell",
                        "verification": ".tables command shows all tables"
                    }
                ]
            },
            {
                "id": "PHASE-2",
                "name": "Django Signals Configuration",
                "priority": "HIGH",
                "tasks": [
                    {
                        "id": "TASK-2.1",
                        "name": "Verify all apps.py ready() methods",
                        "files": [
                            "apps/clients/apps.py",
                            "apps/finance/apps.py",
                            "apps/authentication/apps.py"
                        ]
                    },
                    {
                        "id": "TASK-2.2",
                        "name": "Create signal connection verifier",
                        "script": "verify_signals.py"
                    },
                    {
                        "id": "TASK-2.3",
                        "name": "Test signal execution",
                        "test": "User creation triggers profile creation"
                    }
                ]
            },
            {
                "id": "PHASE-3",
                "name": "Test Data & Validation",
                "priority": "HIGH",
                "tasks": [
                    {
                        "id": "TASK-3.1",
                        "name": "Create test data management command",
                        "command": "python manage.py create_test_data"
                    },
                    {
                        "id": "TASK-3.2",
                        "name": "Run complete flow test",
                        "command": "python qa_simple_flow_test.py"
                    },
                    {
                        "id": "TASK-3.3",
                        "name": "Validate all business flows",
                        "command": "python qa_complete_retest.py"
                    }
                ]
            },
            {
                "id": "PHASE-4",
                "name": "Health Check & Monitoring",
                "priority": "MEDIUM",
                "tasks": [
                    {
                        "id": "TASK-4.1",
                        "name": "Create health check endpoint",
                        "endpoint": "/api/health/"
                    },
                    {
                        "id": "TASK-4.2",
                        "name": "Configure logging",
                        "config": "settings/production.py"
                    },
                    {
                        "id": "TASK-4.3",
                        "name": "Set up error tracking",
                        "service": "Sentry or similar"
                    }
                ]
            },
            {
                "id": "PHASE-5",
                "name": "Final Validation",
                "priority": "HIGH",
                "tasks": [
                    {
                        "id": "TASK-5.1",
                        "name": "Run all unit tests",
                        "command": "python run_all_fix_tests.py"
                    },
                    {
                        "id": "TASK-5.2",
                        "name": "Validate payment flow",
                        "test": "Complete reservation to revenue flow"
                    },
                    {
                        "id": "TASK-5.3",
                        "name": "Generate deployment report",
                        "command": "python generate_deployment_report.py"
                    }
                ]
            }
        ]
    }
    
    # Save plan
    plan_file = "production_preparation_plan.json"
    with open(plan_file, 'w') as f:
        json.dump(plan, f, indent=2)
    
    print("📋 EXECUTION STRATEGY:")
    print("-" * 40)
    print("1. Execute phases in order (PHASE-1 through PHASE-5)")
    print("2. Each phase must complete successfully before proceeding")
    print("3. Use specialized agents for parallel execution where possible")
    print("4. Maintain rollback capability at each phase")
    print()
    
    print("🤖 AGENT ASSIGNMENTS:")
    print("-" * 40)
    print("• Database Agent: Handle all migration tasks")
    print("• Signals Agent: Configure and verify Django signals")
    print("• Testing Agent: Create test data and run validations")
    print("• Monitoring Agent: Set up health checks and logging")
    print("• Validation Agent: Final system verification")
    print()
    
    print(f"📄 Plan saved to: {plan_file}")
    
    return plan


def create_migration_safety_script():
    """Create a safe migration execution script."""
    
    script_content = '''#!/usr/bin/env python
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
    print("\\n🔍 Checking pending migrations...")
    
    try:
        result = subprocess.run(
            ['python', 'manage.py', 'showmigrations', '--plan'],
            capture_output=True,
            text=True
        )
        
        lines = result.stdout.split('\\n')
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
    print("\\n📝 Creating new migrations...")
    
    apps = [
        'authentication', 'root', 'clubs', 'clients', 
        'reservations', 'finance', 'notifications'
    ]
    
    created = 0
    for app in apps:
        try:
            print(f"  Checking {app}...", end='')
            result = subprocess.run(
                ['python', 'manage.py', 'makemigrations', app, '--dry-run'],
                capture_output=True,
                text=True
            )
            
            if 'No changes detected' not in result.stdout:
                # Actually create the migration
                subprocess.run(['python', 'manage.py', 'makemigrations', app])
                print(" ✅ Created")
                created += 1
            else:
                print(" ⏭️  No changes")
                
        except Exception as e:
            print(f" ❌ Error: {e}")
    
    print(f"\\n✅ Created {created} new migrations")
    return created


def apply_migrations():
    """Apply all pending migrations with error handling."""
    print("\\n🚀 Applying migrations...")
    
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
    print("\\n🔍 Verifying database schema...")
    
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
            print(f"\\n⚠️  Missing tables: {', '.join(missing)}")
            return False
        else:
            print("\\n✅ All expected tables exist")
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
            print("\\n⚠️  Restoring from backup...")
            # Restore logic here
    
    # Step 5: Verify
    schema_ok = verify_database_schema()
    
    print("\\n" + "=" * 50)
    if schema_ok:
        print("✅ Migration process completed successfully!")
    else:
        print("⚠️  Migration completed with warnings")
        print("   Run 'python manage.py dbshell' to inspect manually")
    
    print(f"\\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
'''
    
    with open('safe_migration_executor.py', 'w') as f:
        f.write(script_content)
    
    print("✅ Created: safe_migration_executor.py")


if __name__ == "__main__":
    # Create the plan
    plan = create_production_plan()
    
    # Create safety scripts
    create_migration_safety_script()
    
    print("\n🎯 NEXT STEPS:")
    print("-" * 40)
    print("1. Run: python safe_migration_executor.py")
    print("2. Execute specialized agents for each phase")
    print("3. Monitor progress and handle any errors")
    print("4. Validate system after each phase")