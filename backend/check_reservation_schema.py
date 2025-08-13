#!/usr/bin/env python3
"""
Check current reservation model schema in database.
"""
import os
import sys
import django

# Add the backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

def check_reservation_fields():
    """Check which fields exist in the reservation table."""
    with connection.cursor() as cursor:
        # Get table info
        cursor.execute("PRAGMA table_info(reservations_reservation);")
        columns = cursor.fetchall()
        
        print("Current Reservation table fields:")
        print("-" * 50)
        existing_fields = []
        for col in columns:
            # col[1] is the column name
            existing_fields.append(col[1])
            print(f"- {col[1]} ({col[2]})")
        
        print("\n" + "=" * 50)
        
        # List of new fields we want to add
        new_fields = [
            'duration_minutes',
            'reservation_type',
            'client_profile_id',
            'guest_count',
            'special_price',
            'discount_percentage',
            'discount_reason',
            'payment_method',
            'is_split_payment',
            'split_count',
            'cancellation_policy',
            'cancellation_deadline',
            'cancellation_fee',
            'cancellation_reason',
            'requires_invoice',
            'invoice_data',
            'invoice_status',
            'is_recurring',
            'recurrence_pattern',
            'recurrence_end_date',
            'parent_reservation_id',
            'on_wait_list',
            'wait_list_position',
            'no_show',
            'no_show_fee',
            'booking_source',
            'confirmation_sent',
            'reminder_sent',
            'checked_in_at',
            'internal_notes',
            'additional_services'
        ]
        
        print("\nFields to add:")
        missing_fields = []
        for field in new_fields:
            if field not in existing_fields:
                missing_fields.append(field)
                print(f"✗ {field}")
            else:
                print(f"✓ {field} (already exists)")
        
        print(f"\nTotal missing fields: {len(missing_fields)}")
        
        # Check ReservationPayment table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reservations_reservationpayment';")
        if cursor.fetchone():
            print("\n✓ ReservationPayment table exists")
        else:
            print("\n✗ ReservationPayment table does NOT exist")
        
        return missing_fields

if __name__ == "__main__":
    check_reservation_fields()