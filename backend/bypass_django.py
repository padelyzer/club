#!/usr/bin/env python3
"""
Bypass Django and create tables directly
"""

import os
import psycopg2
from urllib.parse import urlparse

print("🔧 Direct Database Table Creation")
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
    
    # Check if django_migrations exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'django_migrations'
        );
    """)
    
    if not cur.fetchone()[0]:
        print("📝 Creating django_migrations table...")
        cur.execute("""
            CREATE TABLE django_migrations (
                id SERIAL PRIMARY KEY,
                app VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(app, name)
            );
        """)
    
    # Create authentication_user table
    print("📝 Creating authentication_user table...")
    cur.execute("""
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
    cur.execute("CREATE INDEX IF NOT EXISTS idx_auth_user_email ON authentication_user(email);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_auth_user_phone ON authentication_user(phone);")
    
    # Create related tables
    print("📝 Creating related tables...")
    
    # Ensure auth_group exists first
    cur.execute("""
        CREATE TABLE IF NOT EXISTS auth_group (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) UNIQUE NOT NULL
        );
    """)
    
    # Ensure auth_permission exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS auth_permission (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            content_type_id INTEGER NOT NULL,
            codename VARCHAR(100) NOT NULL
        );
    """)
    
    # Now create the many-to-many tables
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
    
    # Mark authentication as migrated
    print("📝 Marking authentication as migrated...")
    
    # First check if the records already exist
    cur.execute("""
        SELECT COUNT(*) FROM django_migrations 
        WHERE app = 'authentication' AND name IN ('0001_initial', '0002_initial_schema')
    """)
    existing_count = cur.fetchone()[0]
    
    if existing_count < 2:
        # Insert only if they don't exist
        cur.execute("""
            INSERT INTO django_migrations (app, name, applied)
            SELECT 'authentication', '0001_initial', NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM django_migrations 
                WHERE app = 'authentication' AND name = '0001_initial'
            );
        """)
        
        cur.execute("""
            INSERT INTO django_migrations (app, name, applied)
            SELECT 'authentication', '0002_initial_schema', NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM django_migrations 
                WHERE app = 'authentication' AND name = '0002_initial_schema'
            );
        """)
        print("✅ Migration records created")
    
    print("✅ All tables created successfully!")
    
    # Close connection
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Database error: {e}")
    exit(1)

print("\n✅ Direct table creation completed!")