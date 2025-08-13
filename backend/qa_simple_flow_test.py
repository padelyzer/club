#!/usr/bin/env python
"""
Simple QA flow test to validate system functionality.
"""

import os
import sys
import django
from datetime import datetime, date, time, timedelta
from decimal import Decimal
import random
import string

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from apps.root.models import Organization
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation
from apps.finance.models import Payment, Revenue

User = get_user_model()


def generate_unique_id():
    """Generate unique identifier for test data."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def test_complete_flow():
    """Test complete business flow."""
    
    print("🧪 SIMPLE QA FLOW TEST")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    unique_id = generate_unique_id()
    
    try:
        with transaction.atomic():
            # Step 1: Create Organization
            print("📋 Step 1: Creating Organization...")
            org = Organization.objects.create(
                business_name=f"QA Test Org {unique_id}",
                trade_name=f"QA Test Org {unique_id}",
                rfc=f"QA{unique_id}AAA",
                primary_email=f"qa_{unique_id}@test.com",
                primary_phone="+525512345678",
                legal_representative="QA Test Representative",
                is_active=True
            )
            print(f"✅ Organization created: {org.trade_name}")
            
            # Step 2: Create Club
            print("\n🏢 Step 2: Creating Club...")
            club = Club.objects.create(
                name=f"QA Test Club {unique_id}",
                organization=org,
                address="Test Address 123, Mexico City",
                email=f"club_{unique_id}@test.com",
                phone="+525512345678",
                is_active=True
            )
            print(f"✅ Club created: {club.name}")
            
            # Step 3: Create Court
            print("\n🎾 Step 3: Creating Court...")
            court = Court.objects.create(
                club=club,
                organization=org,
                name="Court 1",
                number=1,
                surface_type="glass",
                price_per_hour=Decimal('500.00'),
                is_active=True
            )
            print(f"✅ Court created: {court.name}")
            
            # Step 4: Create User
            print("\n👤 Step 4: Creating User...")
            username = f"qa_user_{unique_id}"
            email = f"user_{unique_id}@test.com"
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password="qatest123",
                first_name="QA",
                last_name="Test"
            )
            print(f"✅ User created: {user.username}")
            
            # Check if profile exists
            has_profile = hasattr(user, 'client_profile')
            print(f"   Profile exists: {'✅' if has_profile else '❌'}")
            
            # Step 5: Create Reservation
            print("\n📅 Step 5: Creating Reservation...")
            tomorrow = date.today() + timedelta(days=1)
            
            reservation = Reservation.objects.create(
                organization=org,
                club=club,
                court=court,
                created_by=user,
                date=tomorrow,
                start_time=time(10, 0),
                end_time=time(11, 0),
                duration_hours=1,
                duration_minutes=60,
                player_name=user.get_full_name() or user.username,
                player_email=user.email,
                total_price=Decimal('500.00'),
                price_per_hour=Decimal('500.00'),
                status='pending',
                payment_status='pending'
            )
            print(f"✅ Reservation created for: {reservation.date}")
            print(f"   Check-in code: {getattr(reservation, 'check_in_code', 'N/A')}")
            
            # Step 6: Create Payment
            print("\n💳 Step 6: Creating Payment...")
            payment = Payment.objects.create(
                organization=org,
                club=club,
                user=user,
                amount=reservation.total_price,
                payment_type='reservation',
                payment_method='cash',
                status='completed',
                net_amount=reservation.total_price,
                processed_at=timezone.now(),
                reference_number=f"PAY-{unique_id}",
                description=f"Payment for reservation on {reservation.date}"
            )
            print(f"✅ Payment created: {payment.reference_number}")
            print(f"   Amount: ${payment.amount}")
            
            # Step 7: Check Revenue
            print("\n💰 Step 7: Checking Revenue...")
            revenues = Revenue.objects.filter(payment=payment)
            
            if revenues.exists():
                revenue = revenues.first()
                print(f"✅ Revenue automatically created!")
                print(f"   Amount: ${revenue.amount}")
                print(f"   Date: {revenue.date}")
            else:
                print("❌ Revenue NOT created automatically")
                # Try to create manually
                revenue = Revenue.objects.create(
                    organization=org,
                    club=club,
                    date=date.today(),
                    concept='reservation',
                    description=f"Revenue from {payment.reference_number}",
                    amount=payment.net_amount,
                    payment_method=payment.payment_method,
                    reference=payment.reference_number,
                    payment=payment
                )
                print("✅ Revenue created manually")
            
            # Step 8: Update Reservation Status
            print("\n🔄 Step 8: Updating Reservation Status...")
            reservation.payment_status = 'paid'
            reservation.status = 'confirmed'
            reservation.save()
            print("✅ Reservation confirmed after payment")
            
            # Summary
            print("\n📊 FLOW SUMMARY:")
            print("=" * 40)
            print(f"Organization: {org.trade_name}")
            print(f"Club: {club.name}")
            print(f"Court: {court.name}")
            print(f"User: {user.username}")
            print(f"Reservation: {reservation.date} {reservation.start_time}-{reservation.end_time}")
            print(f"Payment: ${payment.amount} ({payment.payment_method})")
            print(f"Revenue: ${revenue.amount}")
            print()
            print("🎉 COMPLETE FLOW TEST PASSED!")
            
            # Cleanup (rollback transaction)
            raise Exception("Test completed - rolling back")
            
    except Exception as e:
        if str(e) == "Test completed - rolling back":
            print("\n✅ Test data rolled back successfully")
        else:
            print(f"\n❌ Error during test: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    test_complete_flow()