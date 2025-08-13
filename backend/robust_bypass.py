#!/usr/bin/env python3
"""
Robust bypass Django and create tables directly
Handles existing tables and migration records
"""

import os
import psycopg2
from urllib.parse import urlparse

print("🔧 Robust Direct Database Setup")
print("=" * 50)

# Parse DATABASE_URL
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    print("❌ No DATABASE_URL found!")
    exit(1)

print(f"📊 Connecting to database...")
parsed = urlparse(database_url)

try:
    # Connect to database
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path[1:]
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("✅ Connected to database")
    
    # Step 1: Ensure django_migrations table exists with proper structure
    print("\n1️⃣ Checking django_migrations table...")
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'django_migrations'
        ORDER BY ordinal_position;
    """)
    
    columns = cur.fetchall()
    if columns:
        print("   Table exists with columns:")
        for col in columns:
            print(f"   - {col[0]}: {col[1]}")
    else:
        print("   Creating django_migrations table...")
        cur.execute("""
            CREATE TABLE django_migrations (
                id SERIAL PRIMARY KEY,
                app VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Add unique constraint
        cur.execute("""
            ALTER TABLE django_migrations 
            ADD CONSTRAINT django_migrations_app_name_key UNIQUE (app, name);
        """)
    
    # Step 2: Check authentication_user table
    print("\n2️⃣ Checking authentication_user table...")
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'authentication_user'
        );
    """)
    
    if cur.fetchone()[0]:
        print("   Table already exists, skipping creation")
    else:
        print("   Creating authentication_user table...")
        cur.execute("""
            CREATE TABLE authentication_user (
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
        cur.execute("CREATE INDEX idx_auth_user_email ON authentication_user(email);")
        cur.execute("CREATE INDEX idx_auth_user_phone ON authentication_user(phone);")
    
    # Step 3: Ensure Django auth tables exist
    print("\n3️⃣ Checking Django auth tables...")
    
    # auth_group
    cur.execute("""
        CREATE TABLE IF NOT EXISTS auth_group (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) UNIQUE NOT NULL
        );
    """)
    
    # django_content_type (needed for permissions)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS django_content_type (
            id SERIAL PRIMARY KEY,
            app_label VARCHAR(100) NOT NULL,
            model VARCHAR(100) NOT NULL,
            UNIQUE(app_label, model)
        );
    """)
    
    # auth_permission
    cur.execute("""
        CREATE TABLE IF NOT EXISTS auth_permission (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            content_type_id INTEGER NOT NULL REFERENCES django_content_type(id),
            codename VARCHAR(100) NOT NULL,
            UNIQUE(content_type_id, codename)
        );
    """)
    
    # Step 4: Create many-to-many tables
    print("\n4️⃣ Creating relationship tables...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS authentication_user_groups (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES authentication_user(id) ON DELETE CASCADE,
            group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
            UNIQUE(user_id, group_id)
        );
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS authentication_user_user_permissions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES authentication_user(id) ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
            UNIQUE(user_id, permission_id)
        );
    """)
    
    # Step 5: Mark migrations as applied
    print("\n5️⃣ Recording migration status...")
    
    # Check existing migrations
    cur.execute("""
        SELECT app, name FROM django_migrations 
        WHERE app = 'authentication'
        ORDER BY id;
    """)
    existing_migrations = cur.fetchall()
    
    if existing_migrations:
        print("   Existing authentication migrations:")
        for mig in existing_migrations:
            print(f"   - {mig[0]}.{mig[1]}")
    
    # Add missing migrations
    migrations_to_add = [
        ('contenttypes', '0001_initial'),
        ('contenttypes', '0002_remove_content_type_name'),
        ('auth', '0001_initial'),
        ('auth', '0002_alter_permission_name_max_length'),
        ('auth', '0003_alter_user_email_max_length'),
        ('auth', '0004_alter_user_username_opts'),
        ('auth', '0005_alter_user_last_login_null'),
        ('auth', '0006_require_contenttypes_0002'),
        ('auth', '0007_alter_validators_add_error_messages'),
        ('auth', '0008_alter_user_username_max_length'),
        ('auth', '0009_alter_user_last_name_max_length'),
        ('auth', '0010_alter_group_name_max_length'),
        ('auth', '0011_update_proxy_permissions'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('authentication', '0001_initial'),
        ('authentication', '0002_initial_schema'),
    ]
    
    for app, name in migrations_to_add:
        cur.execute("""
            INSERT INTO django_migrations (app, name)
            SELECT %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM django_migrations 
                WHERE app = %s AND name = %s
            );
        """, (app, name, app, name))
    
    print("   ✅ Migration records updated")
    
    # Step 6: Show final status
    print("\n6️⃣ Final database status:")
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'authentication_user', 
            'django_migrations',
            'auth_group',
            'auth_permission'
        )
        ORDER BY table_name;
    """)
    
    tables = cur.fetchall()
    print("   Tables created:")
    for table in tables:
        print(f"   ✅ {table[0]}")
    
    # Close connection
    cur.close()
    conn.close()
    
    print("\n✅ Database setup completed successfully!")
    
except Exception as e:
    print(f"❌ Database error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)