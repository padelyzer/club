#!/usr/bin/env python
"""
Test script for CAPTCHA implementation
"""
import os
import sys

import django
from django.conf import settings
from django.test import TestCase
from django.test.client import Client

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

# Test CAPTCHA serializer
from apps.authentication.serializers import CaptchaField, UserRegistrationSerializer


def test_captcha_field():
    print("Testing CaptchaField...")

    # Test when CAPTCHA is disabled
    settings.ENABLE_CAPTCHA = False
    field = CaptchaField()

    print(f"Required when disabled: {field.required}")
    print(f"Allow blank when disabled: {field.allow_blank}")

    # Test validation when disabled
    try:
        result = field.validate("")
        print("✓ Empty value accepted when CAPTCHA disabled")
    except Exception as e:
        print(f"✗ Error when disabled: {e}")

    # Test when CAPTCHA is enabled
    settings.ENABLE_CAPTCHA = True
    field = CaptchaField()

    print(f"Required when enabled: {field.required}")
    print(f"Allow blank when enabled: {field.allow_blank}")

    # Test validation when enabled
    try:
        result = field.validate("")
        print("✗ Empty value should not be accepted when CAPTCHA enabled")
    except Exception as e:
        print(f"✓ Correctly rejected empty value: {e}")


def test_registration_serializer():
    print("\nTesting UserRegistrationSerializer...")

    # Test serializer fields
    serializer = UserRegistrationSerializer()
    fields = serializer.fields.keys()

    print(f"Serializer fields: {list(fields)}")

    if "captcha" in fields:
        print("✓ CAPTCHA field present in serializer")
    else:
        print("✗ CAPTCHA field missing from serializer")


def test_settings():
    print("\nTesting settings configuration...")

    # Check if settings are properly configured
    try:
        print(f"ENABLE_CAPTCHA: {settings.ENABLE_CAPTCHA}")
        print(f"RECAPTCHA_PUBLIC_KEY: {settings.RECAPTCHA_PUBLIC_KEY[:20]}...")
        print(f"RECAPTCHA_PRIVATE_KEY: {settings.RECAPTCHA_PRIVATE_KEY[:20]}...")
        print("✓ Settings configured correctly")
    except AttributeError as e:
        print(f"✗ Settings error: {e}")


if __name__ == "__main__":
    print("CAPTCHA Implementation Test")
    print("=" * 40)

    test_settings()
    test_captcha_field()
    test_registration_serializer()

    print("\n" + "=" * 40)
    print("Test completed!")
