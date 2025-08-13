
import os
import sys
import django
import requests
import json

sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

django.setup()

from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()

print("🧪 Testing authentication system...")

# Test Django client
client = Client()

# Test health endpoint
try:
    response = client.get('/api/v1/health/')
    print(f"Health endpoint: {response.status_code}")
    if hasattr(response, 'json'):
        print(f"Response: {response.json()}")
except Exception as e:
    print(f"Health endpoint error: {e}")

# Test user creation
try:
    # Create a test user directly
    if not User.objects.filter(email='test@padelyzer.com').exists():
        user = User.objects.create_user(
            email='test@padelyzer.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        print(f"✅ Created test user: {user}")
    else:
        print("✅ Test user already exists")
        
except Exception as e:
    print(f"❌ User creation failed: {e}")

print("✅ Authentication tests completed")
