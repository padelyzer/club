#!/usr/bin/env python
"""
Test script for real Stripe API connectivity
This script tests the actual Stripe API with the provided test keys.
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.conf import settings

import stripe


def test_stripe_api_connectivity():
    """Test real Stripe API connectivity."""
    print("🔌 Testing Stripe API connectivity...")

    try:
        # Set the API key
        stripe.api_key = settings.STRIPE_SECRET_KEY

        print(f"   🔑 Using secret key: {settings.STRIPE_SECRET_KEY[:7]}...")
        print(f"   🔑 Using publishable key: {settings.STRIPE_PUBLISHABLE_KEY[:7]}...")

        # Test API connectivity by retrieving account info
        account = stripe.Account.retrieve()

        print(f"   ✅ Connected to Stripe account: {account.get('id', 'N/A')}")
        print(f"   ✅ Account type: {account.get('type', 'N/A')}")
        print(f"   ✅ Country: {account.get('country', 'N/A')}")
        print(f"   ✅ Default currency: {account.get('default_currency', 'N/A')}")
        print(f"   ✅ Charges enabled: {account.get('charges_enabled', 'N/A')}")
        print(f"   ✅ Payouts enabled: {account.get('payouts_enabled', 'N/A')}")

        return True

    except stripe.error.AuthenticationError as e:
        print(f"   ❌ Authentication failed: {e}")
        return False
    except stripe.error.APIConnectionError as e:
        print(f"   ❌ API connection failed: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False


def test_create_payment_intent():
    """Test creating a payment intent."""
    print("\n💳 Testing payment intent creation...")

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY

        # Create a test payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=2000,  # $20.00 in cents
            currency="mxn",
            payment_method_types=["card"],
            metadata={
                "reservation_id": "test_reservation_123",
                "club_id": "test_club_456",
            },
        )

        print(f"   ✅ Payment intent created: {payment_intent.id}")
        print(
            f"   ✅ Amount: ${payment_intent.amount / 100:.2f} {payment_intent.currency.upper()}"
        )
        print(f"   ✅ Status: {payment_intent.status}")
        print(f"   ✅ Client secret: {payment_intent.client_secret[:20]}...")

        # Cancel the payment intent to clean up
        stripe.PaymentIntent.cancel(payment_intent.id)
        print(f"   ✅ Payment intent cancelled (cleanup)")

        return True

    except Exception as e:
        print(f"   ❌ Error creating payment intent: {e}")
        return False


def test_webhook_endpoints():
    """Test webhook endpoint configuration."""
    print("\n🎣 Testing webhook endpoints...")

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY

        # List existing webhook endpoints
        webhook_endpoints = stripe.WebhookEndpoint.list(limit=10)

        print(f"   📊 Found {len(webhook_endpoints.data)} webhook endpoints")

        for endpoint in webhook_endpoints.data:
            print(f"   🌐 Endpoint: {endpoint.url}")
            print(f"      Status: {endpoint.status}")
            print(f"      Events: {', '.join(endpoint.enabled_events[:3])}...")

        if len(webhook_endpoints.data) == 0:
            print("   ⚠️ No webhook endpoints configured in Stripe Dashboard")
            print("   📝 You'll need to add webhook endpoints manually")

        return True

    except Exception as e:
        print(f"   ❌ Error checking webhook endpoints: {e}")
        return False


def test_currencies_and_payment_methods():
    """Test supported currencies and payment methods."""
    print("\n💱 Testing currencies and payment methods...")

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY

        # Get account info to check supported features
        account = stripe.Account.retrieve()

        default_currency = account.get("default_currency", "usd")
        print(f"   💰 Default currency: {default_currency.upper()}")

        # Test creating payment intent with MXN (Mexican Peso)
        test_intent = stripe.PaymentIntent.create(
            amount=1000, currency="mxn", payment_method_types=["card"]  # $10.00 MXN
        )

        print(f"   ✅ MXN currency supported")
        print(f"   ✅ Card payments supported")

        # Cancel test intent
        stripe.PaymentIntent.cancel(test_intent.id)

        # Test USD as well
        test_intent_usd = stripe.PaymentIntent.create(
            amount=1000, currency="usd", payment_method_types=["card"]  # $10.00 USD
        )

        print(f"   ✅ USD currency supported")

        # Cancel test intent
        stripe.PaymentIntent.cancel(test_intent_usd.id)

        return True

    except Exception as e:
        print(f"   ❌ Error testing currencies: {e}")
        return False


def main():
    """Main test function."""
    print("💳 STRIPE REAL API CONNECTIVITY TEST")
    print("=" * 50)

    tests = [
        test_stripe_api_connectivity,
        test_create_payment_intent,
        test_webhook_endpoints,
        test_currencies_and_payment_methods,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 50)
    print(f"📊 TEST RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 Stripe integration is fully functional!")
        print("\n📋 READY FOR:")
        print("✅ Creating payment intents")
        print("✅ Processing Mexican Peso (MXN) payments")
        print("✅ Processing US Dollar (USD) payments")
        print("✅ Handling webhooks (when configured)")
        print("\n📝 NEXT STEPS:")
        print("1. Configure webhook endpoint in Stripe Dashboard")
        print("2. Test with real card numbers in test mode")
        print("3. Integrate with frontend payment flow")
    else:
        print("❌ Some tests failed. Please check configuration.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
