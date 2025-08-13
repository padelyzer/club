#!/usr/bin/env python
"""
Check current model structure to understand the schema.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.root.models import Organization
from apps.clubs.models import Club, Court
from apps.authentication.models import User
from apps.clients.models import ClientProfile
from apps.reservations.models import Reservation
from apps.finance.models import Payment, Revenue

def check_models():
    """Check model fields and requirements."""
    
    print("🔍 CHECKING MODEL STRUCTURE")
    print("=" * 60)
    
    # Check Organization
    print("\n📋 ORGANIZATION MODEL:")
    org_fields = [f.name for f in Organization._meta.get_fields()]
    print(f"Fields: {', '.join(org_fields[:10])}...")
    
    # Check User model
    print("\n👤 USER MODEL:")
    user_fields = [f.name for f in User._meta.get_fields()]
    print(f"Fields: {', '.join(user_fields[:10])}...")
    print(f"USERNAME_FIELD: {User.USERNAME_FIELD}")
    print(f"REQUIRED_FIELDS: {User.REQUIRED_FIELDS}")
    
    # Check Club model
    print("\n🏢 CLUB MODEL:")
    club_fields = [f.name for f in Club._meta.get_fields()]
    print(f"Fields: {', '.join(club_fields[:10])}...")
    
    # Check Court model
    print("\n🎾 COURT MODEL:")
    court_fields = [f.name for f in Court._meta.get_fields()]
    print(f"Fields: {', '.join(court_fields[:10])}...")
    
    # Check if models have required fields
    print("\n✅ FIELD CHECKS:")
    print(f"Organization has 'name': {'name' in org_fields}")
    print(f"Organization has 'business_name': {'business_name' in org_fields}")
    print(f"Court has 'court_type': {'court_type' in court_fields}")
    print(f"Court has 'surface_type': {'surface_type' in court_fields}")
    
    # Try creating test objects
    print("\n🧪 CREATION TESTS:")
    
    try:
        # Create org
        org = Organization.objects.create(
            business_name="Test Org",
            trade_name="Test Org",
            rfc="TEST010101AAA",
            primary_email="test@example.com",
            primary_phone="+521234567890",
            legal_representative="Test Rep",
            is_active=True
        )
        print("✅ Organization created successfully")
        
        # Create club
        club = Club.objects.create(
            name="Test Club",
            organization=org,
            address="Test Address",
            email="club@example.com",
            phone="+521234567890",
            is_active=True
        )
        print("✅ Club created successfully")
        
        # Create court
        court = Court.objects.create(
            club=club,
            organization=org,
            name="Test Court",
            number=1,
            surface_type="glass",
            is_active=True
        )
        print("✅ Court created successfully")
        
        # Create user
        user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpass123"
        )
        print("✅ User created successfully")
        
        # Check if profile was created
        if hasattr(user, 'client_profile'):
            print("✅ Client profile exists")
        else:
            print("❌ Client profile NOT created automatically")
            
            # Check if we need to set organization/club on user
            user_org_field = None
            user_club_field = None
            
            for field in User._meta.get_fields():
                if field.name in ['organization', 'organization_id', 'current_organization']:
                    user_org_field = field.name
                if field.name in ['club', 'club_id', 'current_club']:
                    user_club_field = field.name
            
            print(f"  User organization field: {user_org_field}")
            print(f"  User club field: {user_club_field}")
        
        # Cleanup
        user.delete()
        court.delete()
        club.delete()
        org.delete()
        
        print("\n✅ All basic model operations successful")
        
    except Exception as e:
        print(f"❌ Error during tests: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    check_models()