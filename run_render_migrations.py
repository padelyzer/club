#!/usr/bin/env python3
"""
Script to run Django migrations on Render production.
Run this after PostgreSQL is connected.
"""

import requests
import time
import json

def main():
    print("🚀 Running migrations on Render production...")
    print("=" * 60)
    
    # Base URL for your backend
    base_url = "https://backend-io1y.onrender.com"
    
    print("\n📋 Step 1: Checking current database status...")
    
    try:
        response = requests.get(f"{base_url}/api/v1/health/", timeout=10)
        health_data = response.json()
        
        if health_data.get('database', {}).get('vendor') == 'postgresql':
            print("✅ PostgreSQL is connected!")
        else:
            print("❌ PostgreSQL not detected. Please check your DATABASE_URL.")
            return
    except Exception as e:
        print(f"❌ Error checking health: {e}")
        return
    
    print("\n📋 Step 2: Migrations must be run from Render Dashboard")
    print("-" * 60)
    print("Please follow these steps:")
    print()
    print("1. Go to https://dashboard.render.com")
    print("2. Click on your 'backend' service")
    print("3. Click on 'Shell' button (top right)")
    print("4. Run these commands one by one:")
    print()
    print("   # Apply initial migrations")
    print("   python manage.py migrate --run-syncdb")
    print()
    print("   # Apply all migrations")
    print("   python manage.py migrate")
    print()
    print("   # Create superuser (follow prompts)")
    print("   python manage.py createsuperuser")
    print()
    print("   # Collect static files")
    print("   python manage.py collectstatic --noinput")
    print()
    print("5. After migrations, test with:")
    print("   python manage.py shell")
    print("   >>> from django.contrib.auth import get_user_model")
    print("   >>> User = get_user_model()")
    print("   >>> User.objects.count()")
    print("   >>> exit()")
    print()
    print("-" * 60)
    
    print("\n📋 Step 3: After running migrations, verify here...")
    input("\nPress Enter when you've completed the migrations in Render Shell...")
    
    # Test authentication endpoint
    print("\n🧪 Testing authentication system...")
    test_data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/auth/register/",
            json=test_data,
            timeout=10
        )
        
        if response.status_code < 500:
            print("✅ Authentication system is responding!")
            print(f"   Status: {response.status_code}")
        else:
            print("❌ Server error - migrations may not have completed")
            print(f"   Status: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing auth: {e}")
    
    # Test clubs endpoint
    print("\n🧪 Testing clubs endpoint...")
    try:
        response = requests.get(f"{base_url}/api/v1/clubs/", timeout=10)
        if response.status_code == 200:
            print("✅ Clubs API is working!")
        else:
            print(f"⚠️  Clubs API returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing clubs: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Migration verification complete!")
    print("\nNext steps:")
    print("1. Login to Django Admin: https://backend-io1y.onrender.com/admin/")
    print("2. Create initial data (clubs, courts, etc.)")
    print("3. Deploy frontend to Vercel")
    
if __name__ == "__main__":
    main()