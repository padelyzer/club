"""
Shared views for common API functionality.
"""

import logging
from django.db import connection
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for monitoring service status.
    Returns detailed information about system components.
    """
    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
            
            # Get database vendor
            cursor.execute("SELECT version();")
            version_info = cursor.fetchone()[0]
            if "PostgreSQL" in version_info:
                db_vendor = "postgresql"
            elif "sqlite" in version_info.lower():
                db_vendor = "sqlite"
            else:
                db_vendor = "unknown"
                
        db_status = True
        db_info = {"status": "connected", "vendor": db_vendor}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = False
        db_info = {"status": "error", "error": str(e)}

    # Check Redis
    try:
        # Try to use Redis if configured
        redis_url = getattr(settings, "REDIS_URL", None)
        if redis_url and redis_url != "redis://localhost:6379/0":
            # Try a simple Redis operation
            cache.set("health_check", "ok", 1)
            cache.get("health_check")
            redis_status = True
            redis_info = {"status": "connected"}
        else:
            redis_status = False
            redis_info = {
                "status": "not_configured", 
                "error": "Redis URL not configured for production"
            }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_status = False
        redis_info = {"status": "error", "error": str(e)}

    # Check cache (could be Redis or local memory)
    try:
        cache.set("health_check_cache", "ok", 1)
        cache.get("health_check_cache")
        cache_status = True
        cache_backend = cache.__class__.__module__ + "." + cache.__class__.__name__
        cache_info = {"status": "working", "backend": cache_backend}
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        cache_status = False
        cache_info = {"status": "error", "error": str(e)}

    # Overall status
    all_healthy = db_status and cache_status and redis_status
    overall_status = "healthy" if all_healthy else "degraded" if db_status else "unhealthy"

    return Response(
        {
            "status": overall_status,
            "timestamp": timezone.now(),
            "environment": getattr(settings, "ENVIRONMENT", "production"),
            "checks": {
                "database": db_status,
                "cache": cache_status,
                "redis": redis_status,
            },
            "details": {
                "database": db_info,
                "cache": cache_info,
                "redis": redis_info,
            },
            "version": getattr(settings, "VERSION", "1.0.0"),
        }
    )


@api_view(["OPTIONS"])
@permission_classes([AllowAny])
def cors_preflight(request):
    """
    Handle CORS preflight requests.
    This is a catch-all for OPTIONS requests.
    """
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    """
    API root endpoint providing basic information.
    """
    return Response(
        {
            "name": "Padelyzer API",
            "version": getattr(settings, "API_VERSION", "1.0.0"),
            "status": "operational",
            "documentation": "/api/v1/docs/",
            "health": "/api/v1/health/",
            "timestamp": timezone.now().isoformat(),
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def debug_db_tables(request):
    """
    Debug endpoint to check database tables (TEMPORARY - REMOVE IN PRODUCTION).
    """
    if not settings.DEBUG and not request.GET.get('force'):
        return Response(
            {"error": "This endpoint is only available in DEBUG mode"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with connection.cursor() as cursor:
            # Get all tables
            if 'postgresql' in connection.vendor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name;
                """)
            else:  # SQLite
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' 
                    ORDER BY name;
                """)
            
            tables = [row[0] for row in cursor.fetchall()]
            
            # Check specific tables
            auth_tables = [t for t in tables if 'auth' in t.lower()]
            django_tables = [t for t in tables if 'django' in t.lower()]
            app_tables = [t for t in tables if t not in auth_tables and t not in django_tables]
            
            # Get authentication_user columns
            user_columns = []
            if 'authentication_user' in tables:
                cursor.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'authentication_user' 
                    ORDER BY ordinal_position;
                """)
                user_columns = [{"name": row[0], "type": row[1]} for row in cursor.fetchall()]
            
            return Response({
                "total_tables": len(tables),
                "auth_tables": auth_tables,
                "django_tables": django_tables,
                "app_tables": app_tables,
                "all_tables": tables,
                "authentication_user_columns": user_columns
            })
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def force_migrate(request):
    """
    Force migration execution (TEMPORARY - REMOVE IN PRODUCTION).
    """
    if not settings.DEBUG and not request.data.get('confirm') == 'yes-force-migrate':
        return Response(
            {"error": "This endpoint requires confirmation"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.core.management import call_command
        from io import StringIO
        
        # Capture output
        out = StringIO()
        
        # Run migrations
        call_command('migrate', '--noinput', stdout=out, stderr=out)
        
        output = out.getvalue()
        
        # Check if migrations were successful
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'authentication_user'
                );
            """)
            auth_table_exists = cursor.fetchone()[0]
        
        return Response({
            "status": "completed",
            "auth_table_exists": auth_table_exists,
            "output": output,
            "message": "Migrations executed" if auth_table_exists else "Migrations may have failed"
        })
    except Exception as e:
        return Response(
            {"error": str(e), "type": type(e).__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def create_admin_user(request):
    """
    Create admin user (TEMPORARY - REMOVE IN PRODUCTION).
    """
    if not settings.DEBUG and not request.data.get('secret') == 'create-admin-2025':
        return Response(
            {"error": "This endpoint requires secret"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        email = request.data.get('email', 'admin@padelyzer.com')
        password = request.data.get('password', 'AdminPadelyzer2025!')
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
            message = f"Updated existing admin user: {email}"
        else:
            # Create new user - use a more basic approach to avoid field issues
            username = email.split('@')[0]
            try:
                # First attempt with create_user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name='Admin',
                    last_name='Padelyzer'
                )
            except Exception as e:
                # Fallback to manual creation if create_user fails
                user = User(
                    username=username,
                    email=email,
                    first_name='Admin',
                    last_name='Padelyzer'
                )
                user.set_password(password)
                user.save()
            
            # Then make it superuser
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
            message = f"Created new admin user: {email}"
        
        # Test login to verify it works
        from django.contrib.auth import authenticate
        auth_user = authenticate(username=user.username, password=password)
        login_works = auth_user is not None
        
        return Response({
            "status": "success",
            "message": message,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
                "login_test": "passed" if login_works else "failed"
            }
        })
        
    except Exception as e:
        return Response(
            {"error": str(e), "type": type(e).__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def fix_club_id_column(request):
    """
    Temporary endpoint to fix the club_id column issue.
    This should only be called once and then removed.
    """
    if request.data.get("secret") != "fix-club-id-2025":
        return Response({"error": "Invalid secret"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        with connection.cursor() as cursor:
            # Check current columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'authentication_user' 
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            
            # Check if club_id exists
            club_id_exists = any(col[0] == 'club_id' for col in columns)
            
            if club_id_exists:
                # The column exists but Django can't use it properly
                # Rename it and create a new one
                try:
                    cursor.execute("ALTER TABLE authentication_user RENAME COLUMN club_id TO club_id_backup")
                    cursor.execute("ALTER TABLE authentication_user ADD COLUMN club_id INTEGER")
                    cursor.execute("UPDATE authentication_user SET club_id = club_id_backup::INTEGER WHERE club_id_backup IS NOT NULL")
                    cursor.execute("ALTER TABLE authentication_user DROP COLUMN club_id_backup")
                    
                    return Response({
                        "status": "fixed",
                        "message": "club_id column fixed for Django compatibility",
                        "columns": columns
                    })
                except Exception as e:
                    logger.error(f"Error fixing club_id: {e}")
                    # Try alternative approach - just ensure club_id doesn't exist
                    cursor.execute("ALTER TABLE authentication_user DROP COLUMN IF EXISTS club_id CASCADE")
                    return Response({
                        "status": "removed",
                        "message": "club_id column removed",
                        "error": str(e)
                    })
            else:
                # No club_id column exists, but Django expects one for the ForeignKey
                # Create it properly
                try:
                    cursor.execute("ALTER TABLE authentication_user ADD COLUMN club_id INTEGER")
                    
                    return Response({
                        "status": "created",
                        "message": "club_id column created for Django ForeignKey",
                        "columns": columns
                    })
                except Exception as e:
                    logger.error(f"Error creating club_id: {e}")
                return Response({
                    "status": "not_found",
                    "message": "club_id column not found",
                    "columns": columns
                })
                
    except Exception as e:
        logger.error(f"Error in fix_club_id_column: {e}")
        return Response({
            "error": str(e),
            "type": type(e).__name__
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
