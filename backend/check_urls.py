#!/usr/bin/env python3
"""
Check URL patterns and routing.
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.urls import reverse
from rest_framework.routers import DefaultRouter
from apps.clients.views import PartnerRequestViewSet, ClientProfileViewSet, PlayerPreferencesViewSet

# Create router to check patterns
router = DefaultRouter()
router.register(r"profiles", ClientProfileViewSet, basename="clientprofile")
router.register(r"preferences", PlayerPreferencesViewSet, basename="playerpreferences")
router.register(r"partner-requests", PartnerRequestViewSet, basename="partnerrequest")

print("=== Router URL patterns ===")
for pattern in router.urls:
    print(f"{pattern.pattern} -> {pattern.name}")

print("\n=== Testing reverse URLs ===")
try:
    print(f"partnerrequest-respond: {reverse('clients:partnerrequest-respond', kwargs={'pk': 'test-id'})}")
except Exception as e:
    print(f"partnerrequest-respond error: {e}")

try:
    print(f"clientprofile-recent-partners: {reverse('clients:clientprofile-recent-partners', kwargs={'pk': 'test-id'})}")
except Exception as e:
    print(f"clientprofile-recent-partners error: {e}")

try:
    print(f"playerpreferences-add-preferred-partner: {reverse('clients:playerpreferences-add-preferred-partner', kwargs={'pk': 'test-id'})}")
except Exception as e:
    print(f"playerpreferences-add-preferred-partner error: {e}")