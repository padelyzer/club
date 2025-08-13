#!/usr/bin/env python3
"""
Apply payment module updates.
"""

import os
import sys
import shutil

def apply_payment_updates():
    """Apply all payment module updates."""
    
    print("Applying payment module updates...")
    
    # Backup original files
    files_to_update = [
        "apps/finance/models.py",
        "apps/finance/views.py"
    ]
    
    for file_path in files_to_update:
        if os.path.exists(file_path):
            backup_path = f"{file_path}.backup"
            shutil.copy(file_path, backup_path)
            print(f"✅ Backed up {file_path}")
    
    # Copy updated files
    updates = [
        ("apps/finance/models_updated.py", "apps/finance/models.py"),
        ("apps/finance/views_updated.py", "apps/finance/views.py")
    ]
    
    for src, dst in updates:
        if os.path.exists(src):
            shutil.copy(src, dst)
            print(f"✅ Updated {dst}")
    
    print("\n✅ Payment module updates applied!")
    print("\nNext steps:")
    print("1. Run: python manage.py makemigrations finance")
    print("2. Run: python manage.py migrate")
    print("3. Update your settings with Stripe keys:")
    print("   STRIPE_PUBLISHABLE_KEY = 'pk_test_...'")
    print("   STRIPE_SECRET_KEY = 'sk_test_...'")
    print("   STRIPE_WEBHOOK_SECRET = 'whsec_...'")
    print("4. Add webhook URL to urls.py:")
    print("   path('webhooks/stripe/', stripe_webhook, name='stripe-webhook')")
    print("5. Configure Stripe webhook endpoint in Stripe dashboard")
    print("6. Run tests: pytest tests/test_payments_complete.py -v")

if __name__ == "__main__":
    apply_payment_updates()
