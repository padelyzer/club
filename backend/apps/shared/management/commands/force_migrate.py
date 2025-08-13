"""
Force migration command for production troubleshooting.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection, transaction


class Command(BaseCommand):
    help = 'Force run migrations and show detailed information'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== FORCE MIGRATION TOOL ===\n'))
        
        # 1. Check database connection
        self.stdout.write('1. Checking database connection...')
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                self.stdout.write(self.style.SUCCESS(f'   ✓ Connected to: {version}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Database error: {e}'))
            return
        
        # 2. List current tables
        self.stdout.write('\n2. Current tables in database:')
        try:
            with connection.cursor() as cursor:
                if 'postgresql' in connection.vendor:
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        ORDER BY table_name;
                    """)
                else:
                    cursor.execute("""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' 
                        ORDER BY name;
                    """)
                
                tables = cursor.fetchall()
                for table in tables:
                    self.stdout.write(f'   - {table[0]}')
                self.stdout.write(f'   Total tables: {len(tables)}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   Error listing tables: {e}'))
        
        # 3. Check migration status
        self.stdout.write('\n3. Checking migration status:')
        try:
            call_command('showmigrations', '--list')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   Error checking migrations: {e}'))
        
        # 4. Force apply migrations
        self.stdout.write('\n4. Applying all migrations...')
        try:
            call_command('migrate', '--noinput', verbosity=2)
            self.stdout.write(self.style.SUCCESS('   ✓ Migrations applied successfully'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Migration error: {e}'))
            
            # Try to create tables manually if needed
            self.stdout.write('\n5. Attempting manual table creation...')
            try:
                call_command('migrate', 'contenttypes', '--noinput')
                call_command('migrate', 'auth', '--noinput')
                call_command('migrate', 'authentication', '--noinput')
                self.stdout.write(self.style.SUCCESS('   ✓ Core tables created'))
            except Exception as e2:
                self.stdout.write(self.style.ERROR(f'   ✗ Manual creation failed: {e2}'))
        
        # 5. Verify authentication tables
        self.stdout.write('\n6. Verifying authentication tables:')
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'authentication_user'
                    );
                """)
                exists = cursor.fetchone()[0]
                if exists:
                    self.stdout.write(self.style.SUCCESS('   ✓ authentication_user table exists'))
                else:
                    self.stdout.write(self.style.ERROR('   ✗ authentication_user table NOT FOUND'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   Error checking auth tables: {e}'))
        
        self.stdout.write(self.style.SUCCESS('\n=== MIGRATION TOOL COMPLETE ==='))