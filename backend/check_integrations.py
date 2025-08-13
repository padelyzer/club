#!/usr/bin/env python
"""
Script to check if all external service integrations are properly configured.
"""
import os
import sys

import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.conf import settings

from colorama import Fore, Style, init

init()  # Initialize colorama


def check_env_var(var_name, required=True):
    """Check if environment variable is set."""
    value = getattr(settings, var_name, None) or os.environ.get(var_name)

    if value and value not in ["", "your_" + var_name.lower()]:
        print(f"{Fore.GREEN}✓{Style.RESET_ALL} {var_name}: Configured")
        return True
    else:
        if required:
            print(f"{Fore.RED}✗{Style.RESET_ALL} {var_name}: Not configured")
        else:
            print(
                f"{Fore.YELLOW}⚠{Style.RESET_ALL} {var_name}: Not configured (optional)"
            )
        return False


def main():
    """Check all integrations."""
    print("\nPadelyzer Integration Status Check")
    print("=" * 50)

    # Database
    print(f"\n{Fore.CYAN}Database:{Style.RESET_ALL}")
    try:
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print(f"{Fore.GREEN}✓{Style.RESET_ALL} PostgreSQL: Connected")
    except Exception as e:
        print(f"{Fore.RED}✗{Style.RESET_ALL} PostgreSQL: {str(e)}")

    # Payment Providers
    print(f"\n{Fore.CYAN}Payment Providers:{Style.RESET_ALL}")
    check_env_var("STRIPE_SECRET_KEY")
    check_env_var("STRIPE_PUBLISHABLE_KEY")
    check_env_var("STRIPE_WEBHOOK_SECRET", required=False)
    check_env_var("MERCADOPAGO_ACCESS_TOKEN")
    check_env_var("MERCADOPAGO_PUBLIC_KEY")

    # CFDI
    print(f"\n{Fore.CYAN}CFDI (Facturapi):{Style.RESET_ALL}")
    check_env_var("FACTURAPI_SECRET_KEY")

    # Communication Services
    print(f"\n{Fore.CYAN}Communication Services:{Style.RESET_ALL}")
    check_env_var("RESEND_API_KEY")
    check_env_var("RESEND_FROM_EMAIL")
    check_env_var("TWILIO_ACCOUNT_SID")
    check_env_var("TWILIO_AUTH_TOKEN")
    check_env_var("TWILIO_PHONE_NUMBER")
    check_env_var("WHATSAPP_API_KEY", required=False)

    # Firebase
    print(f"\n{Fore.CYAN}Firebase:{Style.RESET_ALL}")
    check_env_var("FIREBASE_CREDENTIALS_PATH", required=False)
    check_env_var("FIREBASE_PROJECT_ID", required=False)

    # Analytics & Monitoring
    print(f"\n{Fore.CYAN}Analytics & Monitoring:{Style.RESET_ALL}")
    check_env_var("MIXPANEL_TOKEN", required=False)
    check_env_var("SENTRY_DSN", required=False)
    check_env_var("IPINFO_TOKEN", required=False)

    # Storage
    print(f"\n{Fore.CYAN}Storage:{Style.RESET_ALL}")
    check_env_var("GS_BUCKET_NAME", required=False)
    check_env_var("GS_PROJECT_ID", required=False)

    # Redis
    print(f"\n{Fore.CYAN}Redis:{Style.RESET_ALL}")
    try:
        from django.core.cache import cache

        cache.set("test_key", "test_value", 1)
        if cache.get("test_key") == "test_value":
            print(f"{Fore.GREEN}✓{Style.RESET_ALL} Redis: Connected")
        else:
            print(f"{Fore.RED}✗{Style.RESET_ALL} Redis: Connection failed")
    except Exception as e:
        print(f"{Fore.RED}✗{Style.RESET_ALL} Redis: {str(e)}")

    # Test imports
    print(f"\n{Fore.CYAN}Python Package Imports:{Style.RESET_ALL}")
    packages = [
        ("stripe", "Stripe SDK"),
        ("mercadopago", "MercadoPago SDK"),
        ("twilio", "Twilio SDK"),
        ("resend", "Resend SDK"),
        ("firebase_admin", "Firebase Admin SDK"),
        ("requests", "Requests library"),
    ]

    for package, name in packages:
        try:
            __import__(package)
            print(f"{Fore.GREEN}✓{Style.RESET_ALL} {name}: Available")
        except ImportError:
            print(f"{Fore.RED}✗{Style.RESET_ALL} {name}: Not installed")

    print("\n" + "=" * 50)
    print("Check complete!\n")


if __name__ == "__main__":
    main()
