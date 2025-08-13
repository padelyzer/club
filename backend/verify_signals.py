#!/usr/bin/env python
"""
Verify Django signals are properly connected and working.
"""

import os
import sys
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import signals
from django.dispatch import receiver
from apps.clients.models import ClientProfile
from apps.finance.models import Payment, Revenue
# Import what we can
try:
    from apps.clients.signals import create_user_profile
except ImportError:
    create_user_profile = None

try:
    from apps.finance.signals import create_revenue_on_payment_completion
except ImportError:
    create_revenue_on_payment_completion = None

User = get_user_model()


def check_signal_connections():
    """Check which signals are connected."""
    print("🔍 CHECKING SIGNAL CONNECTIONS")
    print("=" * 50)
    
    # Check post_save signals
    print("\n📡 POST_SAVE SIGNALS:")
    print("-" * 30)
    
    # Check User -> ClientProfile signal
    try:
        user_signals = signals.post_save._live_receivers(sender=User)
        print(f"User post_save signals: {len(user_signals)}")
        for idx, sig in enumerate(user_signals):
            try:
                if hasattr(sig, '__name__'):
                    print(f"  [{idx+1}] {sig.__module__}.{sig.__name__}")
                elif callable(sig):
                    print(f"  [{idx+1}] {sig}")
                else:
                    print(f"  [{idx+1}] Unknown signal type: {type(sig)}")
            except Exception as e:
                print(f"  [{idx+1}] Error inspecting signal: {e}")
    except Exception as e:
        print(f"Error getting user signals: {e}")
    
    # Check Payment -> Revenue signal
    try:
        payment_signals = signals.post_save._live_receivers(sender=Payment)
        print(f"\nPayment post_save signals: {len(payment_signals)}")
        for idx, sig in enumerate(payment_signals):
            try:
                if hasattr(sig, '__name__'):
                    print(f"  [{idx+1}] {sig.__module__}.{sig.__name__}")
                elif callable(sig):
                    print(f"  [{idx+1}] {sig}")
                else:
                    print(f"  [{idx+1}] Unknown signal type: {type(sig)}")
            except Exception as e:
                print(f"  [{idx+1}] Error inspecting signal: {e}")
    except Exception as e:
        print(f"Error getting payment signals: {e}")


def test_user_profile_creation():
    """Test if user profile is created automatically."""
    print("\n🧪 TESTING USER PROFILE CREATION:")
    print("-" * 30)
    
    # Create a test user
    test_username = f"signal_test_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    try:
        user = User.objects.create_user(
            username=test_username,
            email=f"{test_username}@test.com",
            password="testpass123"
        )
        print(f"✅ User created: {user.username}")
        
        # Check if profile was created
        if hasattr(user, 'client_profile'):
            print("✅ ClientProfile created automatically!")
            print(f"   Profile ID: {user.client_profile.id}")
        else:
            print("❌ ClientProfile NOT created")
            
            # Try to check if signal is imported
            try:
                from apps.authentication import signals as auth_signals
                print("   Signal module imported successfully")
            except Exception as e:
                print(f"   Error importing signals: {e}")
        
        # Cleanup
        user.delete()
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")


def test_payment_revenue_creation():
    """Test if revenue is created when payment is completed."""
    print("\n🧪 TESTING PAYMENT -> REVENUE SIGNAL:")
    print("-" * 30)
    
    try:
        # Get or create test organization and club
        from apps.root.models import Organization
        from apps.clubs.models import Club
        
        org = Organization.objects.first()
        if not org:
            org = Organization.objects.create(
                business_name="Signal Test Org",
                trade_name="Signal Test",
                rfc="SIGTEST123456",
                primary_email="signal@test.com",
                primary_phone="+521234567890",
                legal_representative="Test Rep"
            )
            print("✅ Created test organization")
        
        club = Club.objects.filter(organization=org).first()
        if not club:
            club = Club.objects.create(
                name="Signal Test Club",
                organization=org,
                address="Test Address",
                email="club@test.com",
                phone="+521234567890"
            )
            print("✅ Created test club")
        
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(
                username="signal_payment_test",
                email="payment@test.com",
                password="test123"
            )
            print("✅ Created test user")
        
        # Create a payment
        payment = Payment.objects.create(
            organization=org,
            club=club,
            user=user,
            amount=500.00,
            payment_type='reservation',
            payment_method='cash',
            status='pending',
            net_amount=500.00,
            description="Signal test payment"
        )
        print(f"✅ Payment created: {payment.id}")
        
        # Check if revenue exists
        revenues_before = Revenue.objects.filter(payment=payment).count()
        print(f"   Revenues before completion: {revenues_before}")
        
        # Complete the payment
        payment.status = 'completed'
        payment.save()
        print("✅ Payment marked as completed")
        
        # Check if revenue was created
        revenues_after = Revenue.objects.filter(payment=payment).count()
        print(f"   Revenues after completion: {revenues_after}")
        
        if revenues_after > revenues_before:
            print("✅ Revenue created automatically!")
            revenue = Revenue.objects.filter(payment=payment).first()
            print(f"   Revenue amount: ${revenue.amount}")
        else:
            print("❌ Revenue NOT created automatically")
        
        # Cleanup
        Revenue.objects.filter(payment=payment).delete()
        payment.delete()
        
    except Exception as e:
        print(f"❌ Error testing payment signal: {e}")
        import traceback
        traceback.print_exc()


def check_apps_config():
    """Check if apps are properly configured to load signals."""
    print("\n📱 CHECKING APPS CONFIGURATION:")
    print("-" * 30)
    
    apps_to_check = [
        'apps.authentication',
        'apps.clients', 
        'apps.finance'
    ]
    
    for app_name in apps_to_check:
        try:
            # Import the app config
            module_path = f"{app_name}.apps"
            import importlib
            app_module = importlib.import_module(module_path)
            
            # Get the config class
            config_classes = [
                attr for attr in dir(app_module) 
                if 'Config' in attr and not attr.startswith('_')
            ]
            
            if config_classes:
                config_class = getattr(app_module, config_classes[0])
                print(f"\n{app_name}:")
                print(f"  Config: {config_classes[0]}")
                
                # Check if ready method exists
                if hasattr(config_class, 'ready'):
                    print("  ✅ Has ready() method")
                    
                    # Try to see what's in ready method
                    import inspect
                    try:
                        source = inspect.getsource(config_class.ready)
                        if 'signals' in source:
                            print("  ✅ Imports signals in ready()")
                        else:
                            print("  ⚠️  No 'signals' import found in ready()")
                    except:
                        pass
                else:
                    print("  ❌ No ready() method")
            
        except Exception as e:
            print(f"\n{app_name}:")
            print(f"  ❌ Error: {e}")


def main():
    """Run all signal verification tests."""
    print("🔧 DJANGO SIGNALS VERIFIER")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check signal connections
    check_signal_connections()
    
    # Check apps configuration
    check_apps_config()
    
    # Test user profile creation
    test_user_profile_creation()
    
    # Test payment revenue creation
    test_payment_revenue_creation()
    
    print("\n" + "=" * 60)
    print("✅ Signal verification completed!")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()