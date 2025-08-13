#!/usr/bin/env python3
"""Test authentication directly"""
import os
import sys

import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import authenticate, get_user_model

from apps.authentication.serializers import LoginSerializer

User = get_user_model()

# Test data
test_data = {"email": "test@example.com", "password": "TEST_PASSWORD", "device_type": "web"}

print("Testing authentication...")

# Test 1: Direct authentication
user = authenticate(username="test@example.com", password="TEST_PASSWORD")
print(f"Direct auth result: {user}")

# Test 2: Try with serializer
serializer = LoginSerializer(data=test_data)
if serializer.is_valid():
    print("Serializer is valid")
    print(f"User from serializer: {serializer.validated_data.get('user')}")
else:
    print("Serializer errors:", serializer.errors)

# Test 3: Check user directly
try:
    user = User.objects.get(email="test@example.com")
    print(f"User exists: {user.email}")
    print(f"Password check: {user.check_password('Test123!')}")
    print(f"Is active: {user.is_active}")
except User.DoesNotExist:
    print("User does not exist")
