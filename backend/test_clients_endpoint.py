#!/usr/bin/env python3
"""
Test failing clients endpoints
"""
import os
import sys
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
user = User.objects.get(email='test@padelyzer.com')
refresh = RefreshToken.for_user(user)
token = str(refresh.access_token)

# Test the failing endpoints
headers = {'Authorization': f'Bearer {token}'}
base_url = 'http://127.0.0.1:8000/api/v1'

print("🔍 Testing clients endpoints...")

# Test profiles endpoint
response = requests.get(f'{base_url}/clients/profiles/', headers=headers)
print(f'\n📡 GET /clients/profiles/: {response.status_code}')
if response.status_code != 200:
    print(f'   Error: {response.text[:500]}')

# Test recommendations endpoint  
response = requests.get(f'{base_url}/clients/profiles/recommendations/', headers=headers)
print(f'\n📡 GET /clients/profiles/recommendations/: {response.status_code}')
if response.status_code != 200:
    print(f'   Error: {response.text[:500]}')

# Test partner requests endpoint
response = requests.get(f'{base_url}/clients/partner-requests/?type=received', headers=headers)
print(f'\n📡 GET /clients/partner-requests/?type=received: {response.status_code}')
if response.status_code != 200:
    print(f'   Error: {response.text[:500]}')

# Test basic clients endpoint
response = requests.get(f'{base_url}/clients/', headers=headers)
print(f'\n📡 GET /clients/: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    if isinstance(data, dict) and 'results' in data:
        print(f'   ✅ Success: {len(data["results"])} clients')
    elif isinstance(data, list):
        print(f'   ✅ Success: {len(data)} clients')