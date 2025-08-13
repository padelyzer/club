#!/usr/bin/env python3
"""
Diagnose authentication app loading issue
"""

import os
import sys

print("🔍 Authentication App Diagnostic")
print("=" * 50)

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Check if apps directory exists
apps_path = os.path.join(os.path.dirname(__file__), 'apps')
print(f"\n1. Checking apps directory: {apps_path}")
print(f"   Exists: {os.path.exists(apps_path)}")

# Check if authentication directory exists
auth_path = os.path.join(apps_path, 'authentication')
print(f"\n2. Checking authentication directory: {auth_path}")
print(f"   Exists: {os.path.exists(auth_path)}")

if os.path.exists(auth_path):
    # List contents
    print("   Contents:")
    for item in os.listdir(auth_path):
        print(f"   - {item}")

# Check if __init__.py exists
init_path = os.path.join(auth_path, '__init__.py')
print(f"\n3. Checking __init__.py: {init_path}")
print(f"   Exists: {os.path.exists(init_path)}")

# Check if apps.py exists
apps_py_path = os.path.join(auth_path, 'apps.py')
print(f"\n4. Checking apps.py: {apps_py_path}")
print(f"   Exists: {os.path.exists(apps_py_path)}")

if os.path.exists(apps_py_path):
    print("   Content:")
    with open(apps_py_path, 'r') as f:
        for line in f:
            print(f"   {line.rstrip()}")

# Try importing the module
print("\n5. Testing module import:")
try:
    import apps.authentication
    print("   ✅ Module import successful")
    
    # Check if it has apps module
    if hasattr(apps.authentication, 'apps'):
        print("   ✅ Has apps module")
        
        # Try to get the AppConfig
        import importlib
        apps_module = importlib.import_module('apps.authentication.apps')
        
        for attr_name in dir(apps_module):
            if 'Config' in attr_name:
                print(f"   Found config class: {attr_name}")
                config_class = getattr(apps_module, attr_name)
                print(f"   - name: {getattr(config_class, 'name', 'N/A')}")
                print(f"   - label: {getattr(config_class, 'label', 'N/A')}")
                
except ImportError as e:
    print(f"   ❌ Module import failed: {e}")

# Try with Django
print("\n6. Testing with Django:")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

try:
    import django
    from django.conf import settings
    
    print(f"   Django version: {django.get_version()}")
    print(f"   Settings module: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print(f"   AUTH_USER_MODEL: {getattr(settings, 'AUTH_USER_MODEL', 'Not set')}")
    
    # Check INSTALLED_APPS
    print("\n   INSTALLED_APPS (authentication-related):")
    for app in settings.INSTALLED_APPS:
        if 'auth' in app.lower():
            print(f"   - {app}")
    
    # Try to setup Django
    print("\n7. Setting up Django...")
    django.setup()
    
    # Check if app is registered
    from django.apps import apps
    try:
        auth_config = apps.get_app_config('authentication')
        print(f"   ✅ App registered: {auth_config}")
        print(f"   - name: {auth_config.name}")
        print(f"   - label: {auth_config.label}")
        print(f"   - models_module: {auth_config.models_module}")
    except LookupError as e:
        print(f"   ❌ App not registered: {e}")
        
        # List all registered apps
        print("\n   All registered apps:")
        for app_config in apps.get_app_configs():
            print(f"   - {app_config.label}: {app_config.name}")

except Exception as e:
    print(f"   ❌ Django error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 50)
print("Diagnostic complete")