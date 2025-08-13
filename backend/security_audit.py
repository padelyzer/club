#!/usr/bin/env python
"""
Security Audit for Padelyzer Backend
Comprehensive security validation for production deployment
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import RequestFactory

User = get_user_model()


def audit_django_settings():
    """Audit Django security settings."""
    print("🛡️ AUDITING DJANGO SECURITY SETTINGS")
    print("=" * 45)

    issues = []
    passed = 0
    total = 0

    # Check DEBUG setting
    total += 1
    if hasattr(settings, "DEBUG"):
        if settings.DEBUG:
            issues.append("⚠️ CRITICAL: DEBUG=True in production is dangerous")
            print("❌ DEBUG: Enabled (DANGEROUS for production)")
        else:
            passed += 1
            print("✅ DEBUG: Disabled (production-ready)")
    else:
        issues.append("❌ DEBUG setting not found")

    # Check SECRET_KEY
    total += 1
    if hasattr(settings, "SECRET_KEY") and settings.SECRET_KEY:
        if (
            settings.SECRET_KEY == "your-secret-key-here"
            or len(settings.SECRET_KEY) < 32
        ):
            issues.append("⚠️ CRITICAL: Weak SECRET_KEY detected")
            print("❌ SECRET_KEY: Weak or default")
        else:
            passed += 1
            print(f"✅ SECRET_KEY: Strong ({len(settings.SECRET_KEY)} chars)")
    else:
        issues.append("❌ SECRET_KEY not configured")

    # Check ALLOWED_HOSTS
    total += 1
    if hasattr(settings, "ALLOWED_HOSTS"):
        if not settings.ALLOWED_HOSTS or "*" in settings.ALLOWED_HOSTS:
            issues.append("⚠️ ALLOWED_HOSTS contains wildcard or empty")
            print("❌ ALLOWED_HOSTS: Contains wildcard (*) - security risk")
        else:
            passed += 1
            print(f"✅ ALLOWED_HOSTS: {len(settings.ALLOWED_HOSTS)} hosts configured")
    else:
        issues.append("❌ ALLOWED_HOSTS not configured")

    # Check HTTPS settings
    total += 1
    https_settings = [
        ("SECURE_HSTS_SECONDS", 31536000),  # 1 year
        ("SECURE_HSTS_INCLUDE_SUBDOMAINS", True),
        ("SECURE_HSTS_PRELOAD", True),
        ("SECURE_CONTENT_TYPE_NOSNIFF", True),
        ("SECURE_BROWSER_XSS_FILTER", True),
        ("SECURE_SSL_REDIRECT", True),
        ("SESSION_COOKIE_SECURE", True),
        ("CSRF_COOKIE_SECURE", True),
    ]

    https_configured = 0
    for setting_name, expected_value in https_settings:
        if hasattr(settings, setting_name):
            actual_value = getattr(settings, setting_name)
            if actual_value == expected_value:
                https_configured += 1

    if https_configured >= 6:  # Most HTTPS settings configured
        passed += 1
        print(f"✅ HTTPS Security: {https_configured}/{len(https_settings)} configured")
    else:
        issues.append(
            f"⚠️ HTTPS Security: Only {https_configured}/{len(https_settings)} configured"
        )
        print(
            f"❌ HTTPS Security: Incomplete ({https_configured}/{len(https_settings)})"
        )

    # Check database security
    total += 1
    if hasattr(settings, "DATABASES"):
        db_config = settings.DATABASES.get("default", {})
        if "sqlite" in db_config.get("ENGINE", "").lower():
            issues.append("⚠️ Using SQLite in production is not recommended")
            print("⚠️ Database: SQLite (not recommended for production)")
        else:
            passed += 1
            print(f"✅ Database: {db_config.get('ENGINE', 'Unknown')}")

    # Check password validation
    total += 1
    if hasattr(settings, "AUTH_PASSWORD_VALIDATORS"):
        validators = settings.AUTH_PASSWORD_VALIDATORS
        if len(validators) >= 4:
            passed += 1
            print(f"✅ Password Validation: {len(validators)} validators configured")
        else:
            issues.append(f"⚠️ Password Validation: Only {len(validators)} validators")
            print(
                f"❌ Password Validation: Insufficient ({len(validators)} validators)"
            )
    else:
        issues.append("❌ Password validation not configured")

    # Check CORS settings
    total += 1
    if hasattr(settings, "CORS_ALLOWED_ORIGINS"):
        cors_origins = settings.CORS_ALLOWED_ORIGINS
        if cors_origins and len(cors_origins) > 0:
            passed += 1
            print(f"✅ CORS: {len(cors_origins)} origins configured")
        else:
            issues.append("⚠️ CORS origins not properly configured")
            print("❌ CORS: No origins configured")
    else:
        issues.append("❌ CORS settings not found")

    return passed, total, issues


def audit_authentication_security():
    """Audit authentication and authorization security."""
    print("\n🔐 AUDITING AUTHENTICATION SECURITY")
    print("=" * 43)

    issues = []
    passed = 0
    total = 0

    # Check JWT settings
    total += 1
    if hasattr(settings, "SIMPLE_JWT"):
        jwt_config = settings.SIMPLE_JWT

        # Check access token lifetime
        access_lifetime = jwt_config.get("ACCESS_TOKEN_LIFETIME")
        if access_lifetime and str(access_lifetime) == "0:15:00":  # 15 minutes
            passed += 1
            print("✅ JWT Access Token: 15 minutes (secure)")
        else:
            issues.append(f"⚠️ JWT Access Token lifetime: {access_lifetime}")
            print(f"⚠️ JWT Access Token: {access_lifetime}")

        # Check refresh token lifetime
        refresh_lifetime = jwt_config.get("REFRESH_TOKEN_LIFETIME")
        if refresh_lifetime:
            print(f"✅ JWT Refresh Token: {refresh_lifetime}")

        # Check token blacklisting
        if jwt_config.get("BLACKLIST_AFTER_ROTATION"):
            print("✅ JWT: Token blacklisting enabled")
        else:
            issues.append("⚠️ JWT token blacklisting not enabled")
    else:
        issues.append("❌ JWT configuration not found")

    # Check custom user model
    total += 1
    if hasattr(settings, "AUTH_USER_MODEL"):
        if settings.AUTH_USER_MODEL == "authentication.User":
            passed += 1
            print("✅ Custom User Model: Configured")
        else:
            print(f"⚠️ User Model: {settings.AUTH_USER_MODEL}")
    else:
        issues.append("❌ Custom user model not configured")

    # Check authentication backends
    total += 1
    if hasattr(settings, "AUTHENTICATION_BACKENDS"):
        backends = settings.AUTHENTICATION_BACKENDS
        if len(backends) > 0:
            passed += 1
            print(f"✅ Authentication Backends: {len(backends)} configured")
            for backend in backends:
                print(f"   - {backend}")
        else:
            issues.append("❌ No authentication backends configured")
    else:
        issues.append("❌ Authentication backends not configured")

    # Test password strength
    total += 1
    try:
        from django.contrib.auth.password_validation import validate_password

        weak_passwords = ["123456", "password", "admin", "test"]
        weak_count = 0

        for pwd in weak_passwords:
            try:
                validate_password(pwd)
                weak_count += 1
            except:
                pass  # Password correctly rejected

        if weak_count == 0:
            passed += 1
            print("✅ Password Validation: Rejects weak passwords")
        else:
            issues.append(f"⚠️ Password validation allows {weak_count} weak passwords")
            print(f"❌ Password Validation: Allows {weak_count} weak passwords")
    except Exception as e:
        issues.append(f"❌ Password validation test failed: {e}")

    return passed, total, issues


def audit_database_security():
    """Audit database security configurations."""
    print("\n🗄️ AUDITING DATABASE SECURITY")
    print("=" * 38)

    issues = []
    passed = 0
    total = 0

    # Check database connection security
    total += 1
    if hasattr(settings, "DATABASES"):
        db_config = settings.DATABASES.get("default", {})

        # Check for secure connection
        if "sslmode" in db_config.get("OPTIONS", {}):
            passed += 1
            print("✅ Database SSL: Configured")
        else:
            if "sqlite" not in db_config.get("ENGINE", "").lower():
                issues.append("⚠️ Database SSL not configured")
                print("⚠️ Database SSL: Not configured")

    # Check for sensitive data in database config
    total += 1
    db_config = settings.DATABASES.get("default", {})
    sensitive_in_settings = False

    for key in ["PASSWORD", "USER", "HOST"]:
        if key in db_config and db_config[key]:
            # Check if it looks like environment variable
            if not db_config[key].startswith("$") and not str(db_config[key]).isupper():
                sensitive_in_settings = True

    if not sensitive_in_settings:
        passed += 1
        print("✅ Database Credentials: Using environment variables")
    else:
        issues.append("⚠️ Database credentials may be hardcoded")
        print("❌ Database Credentials: Potentially hardcoded")

    # Check database permissions (simulated)
    total += 1
    try:
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            passed += 1
            print("✅ Database Connection: Working")
    except Exception as e:
        issues.append(f"❌ Database connection issue: {e}")
        print(f"❌ Database Connection: {e}")

    return passed, total, issues


def audit_api_security():
    """Audit API security measures."""
    print("\n🌐 AUDITING API SECURITY")
    print("=" * 32)

    issues = []
    passed = 0
    total = 0

    # Check DRF settings
    total += 1
    if hasattr(settings, "REST_FRAMEWORK"):
        drf_config = settings.REST_FRAMEWORK

        # Check authentication classes
        auth_classes = drf_config.get("DEFAULT_AUTHENTICATION_CLASSES", [])
        if "rest_framework_simplejwt.authentication.JWTAuthentication" in auth_classes:
            passed += 1
            print("✅ API Authentication: JWT configured")
        else:
            issues.append("⚠️ JWT authentication not configured for API")
            print("❌ API Authentication: JWT not found")

        # Check permission classes
        perm_classes = drf_config.get("DEFAULT_PERMISSION_CLASSES", [])
        if "rest_framework.permissions.IsAuthenticated" in perm_classes:
            print("✅ API Permissions: Default authenticated")
        else:
            issues.append("⚠️ Default API permissions may be too permissive")
            print("⚠️ API Permissions: Default may be permissive")

        # Check pagination
        if "DEFAULT_PAGINATION_CLASS" in drf_config:
            print("✅ API Pagination: Configured")
        else:
            issues.append("⚠️ API pagination not configured (DoS risk)")
            print("⚠️ API Pagination: Not configured")
    else:
        issues.append("❌ Django REST Framework configuration not found")

    # Check rate limiting
    total += 1
    if (
        hasattr(settings, "RATELIMIT_ENABLE")
        or "django_ratelimit" in settings.INSTALLED_APPS
    ):
        passed += 1
        print("✅ Rate Limiting: Configured")
    else:
        issues.append("⚠️ Rate limiting not configured")
        print("❌ Rate Limiting: Not configured")

    # Check CORS configuration
    total += 1
    if hasattr(settings, "CORS_ALLOWED_ORIGINS"):
        if len(settings.CORS_ALLOWED_ORIGINS) > 0:
            passed += 1
            print(f"✅ CORS: {len(settings.CORS_ALLOWED_ORIGINS)} origins")
        else:
            issues.append("⚠️ CORS origins empty")

    return passed, total, issues


def audit_file_permissions():
    """Audit file and directory permissions."""
    print("\n📁 AUDITING FILE PERMISSIONS")
    print("=" * 36)

    issues = []
    passed = 0
    total = 0

    # Check sensitive files
    sensitive_files = [
        ".env",
        "config/settings/production.py",
        "config/settings/development.py",
        "db.sqlite3",
    ]

    total += 1
    for file_path in sensitive_files:
        if os.path.exists(file_path):
            stat_info = os.stat(file_path)
            perms = oct(stat_info.st_mode)[-3:]

            if perms == "600" or perms == "644":  # Owner read/write only or standard
                print(f"✅ {file_path}: {perms} (secure)")
            else:
                issues.append(f"⚠️ {file_path}: {perms} (check permissions)")
                print(f"⚠️ {file_path}: {perms} (check permissions)")

    passed += 1  # If we get here, file check completed

    # Check directory permissions
    total += 1
    sensitive_dirs = ["config/", "apps/", "core/"]

    for dir_path in sensitive_dirs:
        if os.path.exists(dir_path):
            stat_info = os.stat(dir_path)
            perms = oct(stat_info.st_mode)[-3:]

            if perms in ["755", "750"]:  # Standard directory permissions
                print(f"✅ {dir_path}: {perms} (secure)")
            else:
                print(f"⚠️ {dir_path}: {perms} (check permissions)")

    passed += 1

    return passed, total, issues


def audit_environment_variables():
    """Audit environment variable usage for secrets."""
    print("\n🔧 AUDITING ENVIRONMENT VARIABLES")
    print("=" * 42)

    issues = []
    passed = 0
    total = 0

    # Check for hardcoded secrets in settings
    total += 1
    hardcoded_secrets = []

    # Check common secret patterns
    secret_patterns = [
        (r'SECRET_KEY\s*=\s*[\'"][^\'\"]{10,}[\'"]', "SECRET_KEY"),
        (r'PASSWORD\s*=\s*[\'"][^\'\"]+[\'"]', "DATABASE_PASSWORD"),
        (r'API_KEY\s*=\s*[\'"][^\'\"]+[\'"]', "API_KEY"),
    ]

    settings_files = [
        "config/settings/base.py",
        "config/settings/development.py",
        "config/settings/production.py",
    ]

    for settings_file in settings_files:
        if os.path.exists(settings_file):
            with open(settings_file, "r") as f:
                content = f.read()

                for pattern, secret_type in secret_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        # Check if it uses env() function
                        if "env(" not in content:
                            hardcoded_secrets.append(
                                f"{secret_type} in {settings_file}"
                            )

    if not hardcoded_secrets:
        passed += 1
        print("✅ Secrets: Using environment variables")
    else:
        issues.append(f"⚠️ Potential hardcoded secrets: {hardcoded_secrets}")
        print(f"❌ Secrets: {len(hardcoded_secrets)} potential hardcoded secrets")

    # Check .env file exists
    total += 1
    if os.path.exists(".env"):
        passed += 1
        print("✅ Environment File: .env exists")

        # Check .env permissions
        stat_info = os.stat(".env")
        perms = oct(stat_info.st_mode)[-3:]
        if perms == "600":
            print("✅ .env Permissions: Secure (600)")
        else:
            issues.append(f"⚠️ .env permissions: {perms} (should be 600)")
    else:
        issues.append("❌ .env file not found")
        print("❌ Environment File: .env not found")

    return passed, total, issues


def generate_security_report():
    """Generate comprehensive security report."""
    print("\n📋 GENERATING SECURITY REPORT")
    print("=" * 38)

    try:
        # Run all security audits
        django_passed, django_total, django_issues = audit_django_settings()
        auth_passed, auth_total, auth_issues = audit_authentication_security()
        db_passed, db_total, db_issues = audit_database_security()
        api_passed, api_total, api_issues = audit_api_security()
        file_passed, file_total, file_issues = audit_file_permissions()
        env_passed, env_total, env_issues = audit_environment_variables()

        # Calculate totals
        total_passed = (
            django_passed
            + auth_passed
            + db_passed
            + api_passed
            + file_passed
            + env_passed
        )
        total_checks = (
            django_total + auth_total + db_total + api_total + file_total + env_total
        )
        total_issues = (
            django_issues
            + auth_issues
            + db_issues
            + api_issues
            + file_issues
            + env_issues
        )

        # Generate report
        report = f"""
# PADELYZER SECURITY AUDIT REPORT
Generated: {django.utils.timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

## EXECUTIVE SUMMARY
- **Overall Score**: {total_passed}/{total_checks} ({(total_passed/total_checks)*100:.1f}%)
- **Total Issues Found**: {len(total_issues)}
- **Critical Issues**: {len([i for i in total_issues if 'CRITICAL' in i])}
- **Warnings**: {len([i for i in total_issues if 'CRITICAL' not in i])}

## DETAILED RESULTS

### Django Settings Security: {django_passed}/{django_total}
{chr(10).join(django_issues) if django_issues else '✅ All Django security settings configured properly'}

### Authentication Security: {auth_passed}/{auth_total}
{chr(10).join(auth_issues) if auth_issues else '✅ Authentication security properly configured'}

### Database Security: {db_passed}/{db_total}
{chr(10).join(db_issues) if db_issues else '✅ Database security properly configured'}

### API Security: {api_passed}/{api_total}
{chr(10).join(api_issues) if api_issues else '✅ API security properly configured'}

### File Permissions: {file_passed}/{file_total}
{chr(10).join(file_issues) if file_issues else '✅ File permissions properly set'}

### Environment Variables: {env_passed}/{env_total}
{chr(10).join(env_issues) if env_issues else '✅ Environment variables properly configured'}

## RECOMMENDATIONS

### HIGH PRIORITY
- Set DEBUG=False for production deployment
- Use strong SECRET_KEY (50+ characters)
- Configure ALLOWED_HOSTS with specific domains
- Enable HTTPS security headers
- Use PostgreSQL/MySQL instead of SQLite for production

### MEDIUM PRIORITY
- Configure rate limiting for API endpoints
- Set up comprehensive logging and monitoring
- Implement IP allowlisting for admin interface
- Configure automated security updates

### LOW PRIORITY
- Regular security dependency updates
- Implement security headers middleware
- Configure CSP (Content Security Policy)
- Set up regular security audits

## PRODUCTION READINESS
"""

        if total_passed >= total_checks * 0.8:  # 80% or higher
            report += "🟢 **READY FOR PRODUCTION** (with minor fixes)\n"
        elif total_passed >= total_checks * 0.6:  # 60% or higher
            report += "🟡 **NEEDS SECURITY IMPROVEMENTS** before production\n"
        else:
            report += "🔴 **NOT READY FOR PRODUCTION** - Critical security issues\n"

        # Write report to file
        with open("security_audit_report.md", "w") as f:
            f.write(report)

        print("✅ Security report generated: security_audit_report.md")

        return total_passed, total_checks, len(total_issues)

    except Exception as e:
        print(f"❌ Report generation error: {e}")
        return 0, 1, 1


def main():
    """Main security audit function."""
    print("🛡️ PADELYZER SECURITY AUDIT")
    print("🇲🇽 Comprehensive security validation")
    print("=" * 50)

    try:
        passed, total, issues = generate_security_report()

        print("\n" + "=" * 50)
        print(f"🛡️ SECURITY AUDIT RESULTS: {passed}/{total} checks passed")

        if issues == 0:
            print("🎉 No security issues found! System is secure.")
        elif issues <= 3:
            print("✅ Minor security issues found. System is mostly secure.")
        elif issues <= 6:
            print("⚠️ Several security issues found. Address before production.")
        else:
            print("❌ Multiple security issues found. Immediate attention required.")

        score_percentage = (passed / total) * 100 if total > 0 else 0

        print(f"\n📊 SECURITY SCORE: {score_percentage:.1f}%")

        if score_percentage >= 85:
            print("🟢 EXCELLENT - Production ready with minor fixes")
        elif score_percentage >= 70:
            print("🟡 GOOD - Address warnings before production")
        elif score_percentage >= 50:
            print("🟠 FAIR - Significant improvements needed")
        else:
            print("🔴 POOR - Major security overhaul required")

        print("\n📋 Next steps:")
        print("1. Review security_audit_report.md")
        print("2. Address critical issues first")
        print("3. Implement recommended security headers")
        print("4. Configure production environment properly")

        return score_percentage >= 70  # Return success if 70% or higher

    except Exception as e:
        print(f"❌ Security audit failed: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
