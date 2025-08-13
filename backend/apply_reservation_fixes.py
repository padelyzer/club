#!/usr/bin/env python3
"""
Apply reservation model fixes and migrations.
"""

import os
import shutil


def update_reservation_model():
    """Update the reservation model file."""
    print("Updating reservation model...")
    
    # Backup original
    original = "apps/reservations/models.py"
    backup = "apps/reservations/models_backup.py"
    
    if os.path.exists(original):
        shutil.copy(original, backup)
        print(f"✅ Backed up original to {backup}")
    
    # Copy new model
    new_model = "apps/reservations/models_updated.py"
    if os.path.exists(new_model):
        shutil.copy(new_model, original)
        print(f"✅ Updated {original}")
        
        # Remove temporary file
        os.remove(new_model)
    else:
        print("❌ Updated model file not found")


def main():
    """Main function."""
    print("🚀 Applying Reservation Model Fixes...")
    print("=" * 50)
    
    # Change to backend directory
    if os.path.exists("backend"):
        os.chdir("backend")
    
    # Update model
    update_reservation_model()
    
    print("\nNext steps:")
    print("1. Review the changes in apps/reservations/models.py")
    print("2. Run: python manage.py makemigrations reservations")
    print("3. Run: python manage.py migrate")
    print("4. Run: pytest tests/test_reservations_complete.py -v")


if __name__ == "__main__":
    main()
