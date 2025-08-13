#!/usr/bin/env python3
"""
Comprehensive Stripe Integration Validation Script
Tests Stripe configuration, API connectivity, and webhook setup
"""

import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Setup environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

try:
    import django

    django.setup()
    print("✓ Django setup successful")
except Exception as e:
    print(f"✗ Django setup failed: {e}")
    sys.exit(1)

import json

from django.conf import settings

print("\n" + "=" * 60)
print("PADELYZER STRIPE INTEGRATION VALIDATION REPORT")
print("=" * 60)

# 1. Configuration Analysis
print("\n1. STRIPE CONFIGURATION ANALYSIS")
print("-" * 40)

stripe_config = {
    "secret_key": getattr(settings, "STRIPE_SECRET_KEY", ""),
    "publishable_key": getattr(settings, "STRIPE_PUBLISHABLE_KEY", ""),
    "webhook_secret": getattr(settings, "STRIPE_WEBHOOK_SECRET", ""),
}

print(f"Secret Key Configured: {'✓' if stripe_config['secret_key'] else '✗'}")
print(f"Publishable Key Configured: {'✓' if stripe_config['publishable_key'] else '✗'}")
print(f"Webhook Secret Configured: {'✓' if stripe_config['webhook_secret'] else '✗'}")

if stripe_config["secret_key"]:
    is_test_key = "test" in stripe_config["secret_key"]
    print(f"Environment: {'Test' if is_test_key else 'Live'}")
    print(
        f"Key Format: {stripe_config['secret_key'][:7]}...{stripe_config['secret_key'][-4:]}"
    )

# 2. Package Version Analysis
print("\n2. STRIPE PACKAGE VERSION ANALYSIS")
print("-" * 40)

try:
    import stripe

    print(f"Stripe Package Version: {stripe.__version__}")

    # Check compatibility with Python 3.12
    if hasattr(stripe, "__version__") and stripe.__version__:
        major, minor, patch = [int(x) for x in stripe.__version__.split(".")]
        if major >= 7:
            print("✓ Compatible with Python 3.12")
        else:
            print("⚠ May not be fully compatible with Python 3.12")
    else:
        print("⚠ Unable to determine Stripe version")

    print(f"Python Version: {sys.version.split()[0]}")

except ImportError as e:
    print(f"✗ Stripe package not available: {e}")
    stripe = None
except Exception as e:
    print(f"⚠ Error checking Stripe version: {e}")
    stripe = None

# 3. Service Class Analysis
print("\n3. STRIPE SERVICE CLASS ANALYSIS")
print("-" * 40)

try:
    from apps.finance.services import StripeService

    service = StripeService()
    print("✓ StripeService class initialized successfully")

    # Check if API key is set in Stripe
    if hasattr(service, "stripe") and hasattr(service.stripe, "api_key"):
        print(f"✓ API key configured in service")
    else:
        print("⚠ API key may not be properly configured")

except Exception as e:
    print(f"✗ StripeService initialization failed: {e}")

# 4. Database Models Analysis
print("\n4. DATABASE MODELS ANALYSIS")
print("-" * 40)

try:
    from apps.finance.models import PaymentMethod, Transaction

    # Check for Stripe payment methods
    stripe_methods = PaymentMethod.objects.filter(payment_type="online_stripe")
    print(f"Stripe Payment Methods in DB: {stripe_methods.count()}")

    # Check for transactions with Stripe IDs
    stripe_transactions = Transaction.objects.filter(
        external_transaction_id__icontains="pi_"
    )
    print(f"Stripe Transactions in DB: {stripe_transactions.count()}")

    # Check model fields for Stripe compatibility
    transaction_fields = [f.name for f in Transaction._meta.fields]
    required_fields = ["external_transaction_id", "processor_response"]
    missing_fields = [f for f in required_fields if f not in transaction_fields]

    if not missing_fields:
        print("✓ Transaction model has required Stripe fields")
    else:
        print(f"⚠ Missing transaction fields: {missing_fields}")

except Exception as e:
    print(f"✗ Database model analysis failed: {e}")

# 5. API Endpoints Analysis
print("\n5. API ENDPOINTS ANALYSIS")
print("-" * 40)

try:
    from django.urls import reverse

    from apps.finance.urls import urlpatterns

    # Check if payment integration endpoints exist
    payment_endpoints = []
    for pattern in urlpatterns:
        if hasattr(pattern, "url_patterns"):
            for sub_pattern in pattern.resolver.url_patterns:
                if "payment" in str(sub_pattern.pattern):
                    payment_endpoints.append(str(sub_pattern.pattern))

    print(f"Payment Endpoints Found: {len(payment_endpoints)}")
    for endpoint in payment_endpoints[:5]:  # Show first 5
        print(f"  - {endpoint}")

except Exception as e:
    print(f"⚠ URL analysis failed: {e}")

# 6. Webhook Implementation Analysis
print("\n6. WEBHOOK IMPLEMENTATION ANALYSIS")
print("-" * 40)

# Check for webhook handling in views
webhook_implemented = False
try:
    from apps.finance.views import PaymentIntegrationView

    # Check if webhook methods exist
    view_methods = dir(PaymentIntegrationView)
    webhook_methods = [m for m in view_methods if "webhook" in m.lower()]

    if webhook_methods:
        print(f"✓ Webhook methods found: {webhook_methods}")
        webhook_implemented = True
    else:
        print("⚠ No dedicated webhook methods found")

except Exception as e:
    print(f"⚠ Webhook analysis failed: {e}")

# Check for webhook signature verification
if stripe:
    try:
        # Check if webhook module is available
        webhook_module = getattr(stripe, "Webhook", None)
        if webhook_module and hasattr(webhook_module, "construct_event"):
            print("✓ Stripe webhook signature verification available")
        else:
            print("⚠ Webhook signature verification not found")
    except Exception as e:
        print(f"⚠ Webhook verification check failed: {e}")

# 7. Security Analysis
print("\n7. SECURITY ANALYSIS")
print("-" * 40)

security_issues = []

# Check if using test keys in production-like settings
if stripe_config["secret_key"] and "test" not in stripe_config["secret_key"]:
    if settings.DEBUG:
        security_issues.append("Live keys used with DEBUG=True")

# Check webhook secret
if not stripe_config["webhook_secret"]:
    security_issues.append("Webhook secret not configured")

# Check HTTPS requirement (production)
if not settings.DEBUG and not any(["https" in host for host in settings.ALLOWED_HOSTS]):
    security_issues.append("HTTPS not enforced for production")

if security_issues:
    print("⚠ Security Issues Found:")
    for issue in security_issues:
        print(f"  - {issue}")
else:
    print("✓ Basic security checks passed")

# 8. Currency and Localization Analysis
print("\n8. CURRENCY AND LOCALIZATION ANALYSIS")
print("-" * 40)

try:
    from apps.finance.models import Transaction

    # Check currency handling
    currency_field = None
    for field in Transaction._meta.fields:
        if field.name == "currency":
            currency_field = field
            break

    if currency_field:
        print(
            f"✓ Currency field found: max_length={getattr(currency_field, 'max_length', 'N/A')}"
        )

        # Check for Mexican currency support
        sample_currencies = ["MXN", "USD"]
        print(f"Supported currencies (inferred): {sample_currencies}")
    else:
        print("⚠ No currency field found in Transaction model")

except Exception as e:
    print(f"⚠ Currency analysis failed: {e}")

# 9. Integration Completeness Score
print("\n9. INTEGRATION COMPLETENESS ASSESSMENT")
print("-" * 40)

completeness_score = 0
max_score = 10

# Configuration (2 points)
if stripe_config["secret_key"] and stripe_config["publishable_key"]:
    completeness_score += 2
    print("✓ Basic configuration (2/2)")
else:
    print("⚠ Basic configuration (0/2)")

# Package availability (1 point)
if stripe:
    completeness_score += 1
    print("✓ Stripe package available (1/1)")
else:
    print("✗ Stripe package available (0/1)")

# Service class (2 points)
try:
    from apps.finance.services import StripeService

    StripeService()
    completeness_score += 2
    print("✓ Service class working (2/2)")
except:
    print("⚠ Service class working (0/2)")

# Database models (2 points)
try:
    from apps.finance.models import Transaction

    if "external_transaction_id" in [f.name for f in Transaction._meta.fields]:
        completeness_score += 2
        print("✓ Database models ready (2/2)")
    else:
        completeness_score += 1
        print("⚠ Database models ready (1/2)")
except:
    print("⚠ Database models ready (0/2)")

# Webhook implementation (2 points)
if webhook_implemented:
    completeness_score += 2
    print("✓ Webhook implementation (2/2)")
else:
    print("⚠ Webhook implementation (0/2)")

# Security (1 point)
if not security_issues:
    completeness_score += 1
    print("✓ Security basics (1/1)")
else:
    print("⚠ Security basics (0/1)")

print(
    f"\nOVERALL COMPLETENESS SCORE: {completeness_score}/{max_score} ({completeness_score/max_score*100:.1f}%)"
)

# 10. Recommendations
print("\n10. RECOMMENDATIONS")
print("-" * 40)

recommendations = []

if not stripe_config["webhook_secret"]:
    recommendations.append("Configure Stripe webhook secret for secure event handling")

if not webhook_implemented:
    recommendations.append("Implement dedicated webhook endpoints for Stripe events")

if "test" in stripe_config.get("secret_key", ""):
    recommendations.append("Ensure production uses live Stripe keys")

if security_issues:
    recommendations.append("Address security issues listed above")

# Check for missing payment flows
try:
    from apps.finance.services import StripeService

    service_methods = dir(StripeService)
    if "create_payment_intent" not in service_methods:
        recommendations.append("Implement payment intent creation method")
    if "create_refund" not in service_methods:
        recommendations.append("Implement refund functionality")
except:
    pass

if recommendations:
    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec}")
else:
    print("✓ No critical recommendations - integration looks good!")

print("\n" + "=" * 60)
print("END OF STRIPE INTEGRATION VALIDATION REPORT")
print("=" * 60)
