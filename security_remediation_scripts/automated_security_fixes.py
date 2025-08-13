#!/usr/bin/env python3
"""
AUTOMATED SECURITY FIXES SCRIPT
Script automatizado para aplicar fixes de seguridad críticos en Padelyzer
"""

import os
import re
import shutil
import subprocess
from pathlib import Path
from datetime import datetime
import json

class SecurityRemediator:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.backup_dir = self.root_dir / f"security_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.fixes_applied = []
        self.errors = []
        
    def backup_critical_files(self):
        """Backup files before making changes."""
        print("📦 Creating backup of critical files...")
        critical_files = [
            "backend/config/settings/base.py",
            "backend/config/settings/production.py",
            "backend/config/settings/development.py",
            "frontend/package.json",
            "frontend/next.config.mjs",
            "backend/requirements/base.txt",
            "backend/requirements/production.txt",
        ]
        
        self.backup_dir.mkdir(exist_ok=True)
        
        for file_path in critical_files:
            src = self.root_dir / file_path
            if src.exists():
                dst = self.backup_dir / file_path
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                print(f"  ✅ Backed up: {file_path}")
        
        print(f"\n💾 Backup created at: {self.backup_dir}")
        
    def fix_django_security_settings(self):
        """Apply Django security hardening."""
        print("\n🔒 Applying Django security settings...")
        
        # Production settings to add
        security_settings = '''
# Security Settings - Added by Security Remediation
# Generated on: {timestamp}

# HTTPS and Security Headers
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)

# Cookie Security
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Strict"

# Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "data:", "https:", "blob:")
CSP_CONNECT_SRC = ("'self'", "https://api.stripe.com", "wss://")

# Session Security
SESSION_COOKIE_AGE = 60 * 60 * 2  # 2 hours
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# Additional Security
SECURE_REFERRER_POLICY = "same-origin"
PERMISSIONS_POLICY = {{
    "accelerometer": [],
    "ambient-light-sensor": [],
    "autoplay": [],
    "camera": [],
    "display-capture": [],
    "document-domain": [],
    "encrypted-media": [],
    "fullscreen": ["self"],
    "geolocation": [],
    "gyroscope": [],
    "interest-cohort": [],
    "magnetometer": [],
    "microphone": [],
    "midi": [],
    "payment": ["self"],
    "picture-in-picture": [],
    "publickey-credentials-get": [],
    "sync-xhr": [],
    "usb": [],
    "xr-spatial-tracking": [],
}}
'''.format(timestamp=datetime.now().isoformat())
        
        try:
            # Update production.py
            prod_settings_path = self.root_dir / "backend/config/settings/production.py"
            if prod_settings_path.exists():
                with open(prod_settings_path, 'a') as f:
                    f.write("\n\n" + security_settings)
                self.fixes_applied.append("Django production security settings")
                print("  ✅ Updated production.py with security settings")
            
            # Fix base.py DEBUG setting
            base_settings_path = self.root_dir / "backend/config/settings/base.py"
            if base_settings_path.exists():
                content = base_settings_path.read_text()
                # Ensure DEBUG is from env
                content = re.sub(
                    r'DEBUG\s*=\s*True',
                    'DEBUG = env.bool("DEBUG", default=False)',
                    content
                )
                base_settings_path.write_text(content)
                self.fixes_applied.append("Django DEBUG setting fixed")
                print("  ✅ Fixed DEBUG setting in base.py")
                
        except Exception as e:
            self.errors.append(f"Django settings error: {str(e)}")
            print(f"  ❌ Error: {e}")
            
    def fix_cors_configuration(self):
        """Fix CORS configuration to be restrictive."""
        print("\n🌐 Fixing CORS configuration...")
        
        cors_config = '''
# CORS Configuration - Restrictive
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "https://padelyzer.com",
        "https://www.padelyzer.com",
        "https://app.padelyzer.com",
    ]
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOWED_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
'''
        
        try:
            # Update development.py to remove CORS_ALLOW_ALL_ORIGINS = True
            dev_settings_path = self.root_dir / "backend/config/settings/development.py"
            if dev_settings_path.exists():
                content = dev_settings_path.read_text()
                content = re.sub(r'CORS_ALLOW_ALL_ORIGINS\s*=\s*True', '', content)
                content += "\n\n" + cors_config
                dev_settings_path.write_text(content)
                self.fixes_applied.append("CORS configuration fixed")
                print("  ✅ Fixed CORS configuration")
                
        except Exception as e:
            self.errors.append(f"CORS configuration error: {str(e)}")
            print(f"  ❌ Error: {e}")
            
    def update_nextjs_version(self):
        """Update Next.js to secure version."""
        print("\n📦 Updating Next.js to secure version...")
        
        try:
            os.chdir(self.root_dir / "frontend")
            
            # Update package.json
            package_json_path = Path("package.json")
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            # Update Next.js version
            if "dependencies" in package_data:
                package_data["dependencies"]["next"] = "^14.2.31"
                
            with open(package_json_path, 'w') as f:
                json.dump(package_data, f, indent=2)
            
            print("  📝 Updated package.json")
            
            # Run npm update
            print("  🔄 Running npm update...")
            result = subprocess.run(["npm", "update", "next"], capture_output=True, text=True)
            if result.returncode == 0:
                self.fixes_applied.append("Next.js updated to 14.2.31")
                print("  ✅ Next.js updated successfully")
            else:
                raise Exception(f"npm update failed: {result.stderr}")
                
        except Exception as e:
            self.errors.append(f"Next.js update error: {str(e)}")
            print(f"  ❌ Error: {e}")
        finally:
            os.chdir(self.root_dir)
            
    def remove_unsafe_dependencies(self):
        """Remove or replace unsafe dependencies."""
        print("\n🗑️  Removing unsafe dependencies...")
        
        try:
            os.chdir(self.root_dir / "frontend")
            
            # Remove xlsx package
            print("  🔄 Removing xlsx package...")
            result = subprocess.run(["npm", "uninstall", "xlsx"], capture_output=True, text=True)
            if result.returncode == 0:
                self.fixes_applied.append("Removed vulnerable xlsx package")
                print("  ✅ Removed xlsx package")
                
                # Install safe alternative
                print("  📦 Installing safe alternative (exceljs)...")
                result = subprocess.run(["npm", "install", "exceljs"], capture_output=True, text=True)
                if result.returncode == 0:
                    print("  ✅ Installed exceljs as safe alternative")
                    
        except Exception as e:
            self.errors.append(f"Dependency removal error: {str(e)}")
            print(f"  ❌ Error: {e}")
        finally:
            os.chdir(self.root_dir)
            
    def create_env_template(self):
        """Create secure .env template."""
        print("\n📋 Creating secure environment template...")
        
        env_template = '''# Padelyzer Production Environment Variables
# SECURITY: Never commit actual values to version control

# Django Configuration
SECRET_KEY=<generate-strong-secret-key>
DEBUG=False
ALLOWED_HOSTS=padelyzer.com,www.padelyzer.com,app.padelyzer.com

# Database (Use strong passwords)
DATABASE_URL=postgres://user:password@host:port/database

# Security Settings
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000

# CORS Configuration  
CORS_ALLOWED_ORIGINS=https://padelyzer.com,https://www.padelyzer.com,https://app.padelyzer.com

# Redis
REDIS_URL=redis://:<password>@<host>:6379/0

# Email (Use secure SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<smtp-username>
EMAIL_HOST_PASSWORD=<smtp-password>

# Payment Providers (Use restricted keys)
STRIPE_PUBLISHABLE_KEY=<production-publishable-key>
STRIPE_SECRET_KEY=<production-secret-key>
STRIPE_WEBHOOK_SECRET=<webhook-secret>

# Security Features
ENABLE_CAPTCHA=True
RECAPTCHA_PUBLIC_KEY=<production-recaptcha-public>
RECAPTCHA_PRIVATE_KEY=<production-recaptcha-private>

# Monitoring
SENTRY_DSN=<production-sentry-dsn>

# Feature Flags
ENABLE_2FA=True
ENABLE_AUDIT_LOG=True
ENABLE_RATE_LIMITING=True
'''
        
        try:
            env_prod_path = self.root_dir / "backend/.env.production.template"
            env_prod_path.write_text(env_template)
            self.fixes_applied.append("Created secure .env template")
            print(f"  ✅ Created: {env_prod_path}")
            
        except Exception as e:
            self.errors.append(f"Env template error: {str(e)}")
            print(f"  ❌ Error: {e}")
            
    def add_security_middleware(self):
        """Add security middleware to Django."""
        print("\n🛡️  Adding security middleware...")
        
        middleware_code = '''
# Security Middleware
class SecurityHeadersMiddleware:
    """Add security headers to all responses."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        response = self.get_response(request)
        
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'same-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Remove server header
        if 'Server' in response:
            del response['Server']
            
        return response
'''
        
        try:
            middleware_path = self.root_dir / "backend/apps/shared/middleware/security_headers.py"
            middleware_path.parent.mkdir(parents=True, exist_ok=True)
            middleware_path.write_text(middleware_code)
            self.fixes_applied.append("Added security headers middleware")
            print("  ✅ Created security headers middleware")
            
        except Exception as e:
            self.errors.append(f"Middleware error: {str(e)}")
            print(f"  ❌ Error: {e}")
            
    def run_security_audit(self):
        """Run security audit after fixes."""
        print("\n🔍 Running security audit...")
        
        try:
            # Django check
            os.chdir(self.root_dir / "backend")
            result = subprocess.run(
                ["python3", "manage.py", "check", "--deploy"],
                capture_output=True,
                text=True
            )
            
            if "WARNINGS" in result.stderr:
                remaining_warnings = len(re.findall(r'\?: \(security\.\w+\)', result.stderr))
                print(f"  ⚠️  Remaining security warnings: {remaining_warnings}")
            else:
                print("  ✅ Django security check passed")
                
            # npm audit
            os.chdir(self.root_dir / "frontend")
            result = subprocess.run(
                ["npm", "audit", "--json"],
                capture_output=True,
                text=True
            )
            
            if result.stdout:
                audit_data = json.loads(result.stdout)
                vulns = audit_data.get("metadata", {}).get("vulnerabilities", {})
                critical = vulns.get("critical", 0)
                high = vulns.get("high", 0)
                
                if critical > 0 or high > 0:
                    print(f"  ⚠️  Remaining vulnerabilities - Critical: {critical}, High: {high}")
                else:
                    print("  ✅ No critical/high vulnerabilities")
                    
        except Exception as e:
            print(f"  ❌ Audit error: {e}")
        finally:
            os.chdir(self.root_dir)
            
    def generate_report(self):
        """Generate remediation report."""
        print("\n📊 Generating remediation report...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "fixes_applied": self.fixes_applied,
            "errors_encountered": self.errors,
            "backup_location": str(self.backup_dir),
            "next_steps": [
                "Review and test all changes",
                "Run full test suite",
                "Perform security testing",
                "Update environment variables",
                "Deploy to staging for validation"
            ]
        }
        
        report_path = self.root_dir / "security_remediation_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n📄 Report saved to: {report_path}")
        print(f"\n✅ Fixes applied: {len(self.fixes_applied)}")
        print(f"❌ Errors encountered: {len(self.errors)}")
        
        if self.fixes_applied:
            print("\n🎯 Successfully applied:")
            for fix in self.fixes_applied:
                print(f"  • {fix}")
                
        if self.errors:
            print("\n⚠️  Errors encountered:")
            for error in self.errors:
                print(f"  • {error}")
                
    def run(self):
        """Run all security fixes."""
        print("🛡️  STARTING SECURITY REMEDIATION")
        print("=" * 50)
        
        # Create backup first
        self.backup_critical_files()
        
        # Apply fixes
        self.fix_django_security_settings()
        self.fix_cors_configuration()
        self.update_nextjs_version()
        self.remove_unsafe_dependencies()
        self.create_env_template()
        self.add_security_middleware()
        
        # Run audit
        self.run_security_audit()
        
        # Generate report
        self.generate_report()
        
        print("\n🏁 SECURITY REMEDIATION COMPLETED")
        print("=" * 50)
        print("\n⚠️  IMPORTANT: Review all changes before committing!")
        print("📋 Next steps:")
        print("  1. Review the changes in your code editor")
        print("  2. Run the full test suite")
        print("  3. Test in a staging environment")
        print("  4. Get security team approval")
        print("  5. Deploy with confidence")

if __name__ == "__main__":
    remediator = SecurityRemediator()
    remediator.run()