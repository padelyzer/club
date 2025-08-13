"""
Database indexes specifically optimized for BFF endpoint queries.
These indexes target the exact query patterns used by the optimized BFF views.
"""
from django.db import migrations


class Migration(migrations.Migration):
    """
    Migration to add targeted indexes for BFF endpoints.
    Only adds indexes for query patterns actually used by BFF endpoints.
    """
    
    dependencies = [
        ('reservations', '0001_initial'),
        ('clubs', '0001_initial'),
        ('clients', '0001_initial'),
        ('authentication', '0007_rename_authentica_jti_e7b8a9_idx_authenticat_jti_d59cf6_idx_and_more'),
        ('root', '0001_initial'),
    ]

    operations = [
        # 1. RESERVATIONS BFF INDEXES
        # For availability checking and analytics
        migrations.RunSQL(
            # Composite index for reservation availability queries
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_reservations_availability 
            ON reservations_reservation (club_id, date, status, court_id);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_reservations_availability;
            """
        ),
        
        migrations.RunSQL(
            # Index for reservation analytics by date range
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_reservations_analytics 
            ON reservations_reservation (club_id, status, date, created_by_id);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_reservations_analytics;
            """
        ),
        
        migrations.RunSQL(
            # Index for reservation time slot queries
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_reservations_time_slots 
            ON reservations_reservation (court_id, date, start_time, end_time)
            WHERE status IN ('pending', 'confirmed');
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_reservations_time_slots;
            """
        ),

        # 2. CLUBS BFF INDEXES
        # For club data and court availability
        migrations.RunSQL(
            # Index for club organization filtering
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_clubs_organization 
            ON clubs_club (organization_id, is_active);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_clubs_organization;
            """
        ),
        
        migrations.RunSQL(
            # Index for courts by club (used in availability checks)
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_courts_club_active 
            ON clubs_court (club_id, is_active, is_maintenance);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_courts_club_active;
            """
        ),

        # 3. AUTHENTICATION BFF INDEXES
        # For auth context queries
        migrations.RunSQL(
            # Index for user organization memberships
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_user_org_memberships 
            ON authentication_user (organization_id, is_active, last_login);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_user_org_memberships;
            """
        ),
        
        migrations.RunSQL(
            # Index for session queries (user sessions endpoint)
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_sessions_user_active 
            ON authentication_session (user_id, revoked_at, last_activity);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_sessions_user_active;
            """
        ),

        # 4. CLIENT PROFILES BFF INDEXES
        # For customer analytics
        migrations.RunSQL(
            # Index for client profiles in analytics
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_clients_created_active 
            ON clients_clientprofile (created_at, user_id);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_clients_created_active;
            """
        ),

        # 5. ORGANIZATION BFF INDEXES
        # For multi-tenant filtering
        migrations.RunSQL(
            # Index for organization membership queries
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_org_memberships 
            ON root_organizationmembership (user_id, organization_id, is_active, role);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_org_memberships;
            """
        ),
        
        migrations.RunSQL(
            # Index for club memberships (user clubs endpoint)
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_club_memberships 
            ON clubs_clubmembership (user_id, club_id, is_active, role);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_club_memberships;
            """
        ),

        # 6. BLOCKED SLOTS BFF INDEXES
        # For availability checking
        migrations.RunSQL(
            # Index for blocked slots affecting availability
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_blocked_slots_availability 
            ON reservations_blockedslot (club_id, court_id, start_datetime, end_datetime, is_active);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_blocked_slots_availability;
            """
        ),

        # 7. CLUB SCHEDULES BFF INDEXES
        # For operating hours in availability checks
        migrations.RunSQL(
            # Index for club schedules
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_club_schedules 
            ON clubs_clubschedule (club_id, weekday, is_active);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_club_schedules;
            """
        ),

        # 8. PERFORMANCE MONITORING INDEXES
        # For tracking query performance
        migrations.RunSQL(
            # Index for audit logs (performance monitoring)
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_audit_logs_performance 
            ON authentication_autauditlog (created_at, event_type, user_id)
            WHERE event_type IN ('api_call', 'slow_query');
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_audit_logs_performance;
            """
        ),
    ]


class Migration(migrations.Migration):
    """
    Additional specialized indexes for complex BFF queries.
    """
    
    dependencies = [
        ('0001_add_bff_indexes', '0001_add_bff_indexes'),
    ]

    operations = [
        # Composite indexes for complex analytical queries
        migrations.RunSQL(
            # Multi-column index for reservation analytics with date partitioning
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_reservations_analytics_composite 
            ON reservations_reservation (organization_id, club_id, date, status, created_by_id)
            WHERE status IN ('confirmed', 'completed');
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_reservations_analytics_composite;
            """
        ),
        
        migrations.RunSQL(
            # Covering index for availability checks (includes commonly needed columns)
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_availability_covering 
            ON reservations_reservation (club_id, date, court_id, status) 
            INCLUDE (start_time, end_time, created_by_id)
            WHERE status IN ('pending', 'confirmed');
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_availability_covering;
            """
        ),
        
        migrations.RunSQL(
            # Partial index for active user context queries
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            idx_bff_active_users_context 
            ON authentication_user (id, organization_id, last_login, is_active) 
            WHERE is_active = true;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_bff_active_users_context;
            """
        ),
    ]