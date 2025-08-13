
import os
import sys
import django

sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

try:
    django.setup()
    print("✅ Django setup successful")
    
    # Try to import User model
    from django.contrib.auth import get_user_model
    User = get_user_model()
    print(f"✅ User model imported: {User}")
    
    # Try to import problematic models
    from apps.leagues.models import League
    print("✅ League model from leagues app imported")
    
    from apps.tournaments.models import Tournament
    print("✅ Tournament model imported")
    
    from apps.clients.models import ClientProfile
    print("✅ ClientProfile model imported")
    
    print("✅ All critical models imported successfully")
    
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    sys.exit(1)
