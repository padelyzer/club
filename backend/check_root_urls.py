"""
Script para verificar las URLs del módulo root.
Run with: python manage.py shell < check_root_urls.py
"""

import re

from django.urls import get_resolver, resolve, reverse

print("=" * 60)
print("🌐 URLs DEL MÓDULO ROOT")
print("=" * 60)

# Base URL for API
base_api = "/api/v1"

# Root module URLs
root_urls = [
    f"{base_api}/root/",
    f"{base_api}/root/organizations/",
    f"{base_api}/root/subscriptions/",
    f"{base_api}/root/invoices/",
    f"{base_api}/root/onboarding/",
    f"{base_api}/root/audit-logs/",
]

print("\n📍 URLs principales del módulo ROOT:")
print("-" * 40)
for url in root_urls:
    print(f"  • {url}")

# Organization specific URLs
print("\n\n📍 URLs específicas de Organization:")
print("-" * 40)
org_id = "1"  # Example ID
org_specific_urls = [
    f"{base_api}/root/organizations/",  # List all organizations
    f"{base_api}/root/organizations/{org_id}/",  # Get specific organization
    f"{base_api}/root/organizations/{org_id}/suspend/",  # Suspend organization
    f"{base_api}/root/organizations/{org_id}/reactivate/",  # Reactivate organization
    f"{base_api}/root/organizations/{org_id}/metrics/",  # Get metrics
    f"{base_api}/root/organizations/{org_id}/revenue/",  # Revenue data
]

for url in org_specific_urls:
    print(f"  • {url}")

# Check authentication URLs
print("\n\n🔐 URLs de autenticación:")
print("-" * 40)
auth_urls = [
    f"{base_api}/auth/login/",
    f"{base_api}/auth/logout/",
    f"{base_api}/auth/token/",
    f"{base_api}/auth/token/refresh/",
    f"{base_api}/auth/password/reset/",
]

for url in auth_urls:
    print(f"  • {url}")

# Print access example
print("\n\n💡 EJEMPLO DE ACCESO:")
print("-" * 40)
print("Para acceder al módulo root desde el frontend:")
print(f"  Base URL: http://localhost:9200{base_api}/root/")
print(f"  Organizations: http://localhost:9200{base_api}/root/organizations/")
print("\nHeaders requeridos:")
print("  Authorization: Bearer <token>")
print("  Content-Type: application/json")

print("\n" + "=" * 60)
