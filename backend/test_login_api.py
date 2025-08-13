import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import authenticate
from apps.authentication.models import User

print("=== TEST LOGIN API ===")

# Get user
user = User.objects.get(email='admin@padelyzer.com')
print(f"User found: {user.email}")
print(f"Username: {user.username}")
print(f"Is active: {user.is_active}")

# Test direct authentication
print("\n1. Testing authenticate with email:")
auth1 = authenticate(username='admin@padelyzer.com', password='TEST_PASSWORD')
print(f"   Result: {auth1}")

print("\n2. Testing authenticate with username:")
auth2 = authenticate(username='admin', password='TEST_PASSWORD')
print(f"   Result: {auth2}")

# Test password check
print("\n3. Testing password directly:")
print(f"   check_password result: {user.check_password('admin123456')}")

# Test with wrong password
print("\n4. Testing with wrong password:")
auth3 = authenticate(username='admin@padelyzer.com', password='TEST_PASSWORD')
print(f"   Result: {auth3}")

# Check authentication backends
from django.conf import settings
print("\n5. Authentication backends:")
for backend in settings.AUTHENTICATION_BACKENDS:
    print(f"   - {backend}")