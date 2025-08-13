#!/usr/bin/env python
"""
Test script for image upload functionality.
Run this script to test the image upload system.
"""

import os
import sys
import django
from io import BytesIO
from PIL import Image

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.core.files.base import ContentFile
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from apps.clubs.models import Club, Court
from apps.root.models import Organization
from core.image_utils import ImageValidator, ImageStorageManager, validate_and_process_image

User = get_user_model()


def create_test_image(width=800, height=600, format='JPEG'):
    """Create a test image for uploading."""
    image = Image.new('RGB', (width, height), color='red')
    buffer = BytesIO()
    image.save(buffer, format=format)
    buffer.seek(0)
    
    return ContentFile(buffer.getvalue(), name=f'test_image.{format.lower()}')


def test_image_validation():
    """Test image validation functionality."""
    print("🧪 Testing image validation...")
    
    # Test valid image
    test_image = create_test_image(400, 400, 'JPEG')
    
    try:
        result = ImageValidator.validate_image_file(test_image, 'club_logo')
        print(f"✅ Valid image validation: {result['valid']}")
        
        if result['valid']:
            print(f"   - Format: {result['image_info']['format']}")
            print(f"   - Size: {result['image_info']['size']}")
            print(f"   - File size: {result['image_info']['file_size']} bytes")
    except Exception as e:
        print(f"❌ Image validation failed: {e}")
    
    # Test oversized image
    large_image = create_test_image(5000, 5000, 'JPEG')
    
    try:
        result = ImageValidator.validate_image_file(large_image, 'club_logo')
        print(f"⚠️  Large image validation: {result['valid']} (expected: False)")
        if result['errors']:
            print(f"   - Errors: {result['errors']}")
    except Exception as e:
        print(f"✅ Large image correctly rejected: {e}")


def test_image_storage():
    """Test image storage functionality."""
    print("\n📁 Testing image storage...")
    
    test_image = create_test_image(300, 300, 'PNG')
    
    try:
        # Test saving image
        image_url = ImageStorageManager.save_image(
            test_image, 
            'club_logo', 
            organization_id=1,
            entity_id=1
        )
        print(f"✅ Image saved successfully: {image_url}")
        
        # Test thumbnail generation
        thumbnail_url = ImageStorageManager.generate_thumbnail(image_url, (150, 150))
        if thumbnail_url:
            print(f"✅ Thumbnail generated: {thumbnail_url}")
        else:
            print("⚠️  Thumbnail generation failed (expected for simulation)")
            
    except Exception as e:
        print(f"❌ Image storage failed: {e}")


def test_complete_pipeline():
    """Test complete image processing pipeline."""
    print("\n🔄 Testing complete pipeline...")
    
    test_image = create_test_image(600, 600, 'JPEG')
    
    try:
        result = validate_and_process_image(
            image_file=test_image,
            image_type='club_logo',
            organization_id=1,
            entity_id=1
        )
        
        if result['valid']:
            print("✅ Complete pipeline successful!")
            print(f"   - Image URL: {result.get('image_url', 'N/A')}")
            print(f"   - Thumbnail URL: {result.get('thumbnail_url', 'N/A')}")
            if result.get('warnings'):
                print(f"   - Warnings: {result['warnings']}")
        else:
            print(f"❌ Pipeline failed: {result['errors']}")
            
    except Exception as e:
        print(f"❌ Complete pipeline failed: {e}")


def test_model_integration():
    """Test model integration (requires database)."""
    print("\n🗄️ Testing model integration...")
    
    try:
        # Check if we have test data
        org = Organization.objects.first()
        if not org:
            print("⚠️  No organization found - skipping model integration test")
            return
            
        club = Club.objects.filter(organization=org).first()
        if not club:
            print("⚠️  No club found - skipping model integration test")
            return
            
        print(f"✅ Found test club: {club.name}")
        print(f"   - Current logo URL: {club.logo_url or 'None'}")
        print(f"   - Current cover URL: {club.cover_image_url or 'None'}")
        
        # Test court images
        court = Court.objects.filter(club=club).first()
        if court:
            print(f"✅ Found test court: {court.name}")
            print(f"   - Current images: {len(court.images) if court.images else 0}")
        else:
            print("⚠️  No court found for testing")
            
    except Exception as e:
        print(f"❌ Model integration test failed: {e}")


def run_all_tests():
    """Run all tests."""
    print("🚀 Starting image upload system tests...\n")
    
    test_image_validation()
    test_image_storage()
    test_complete_pipeline()
    test_model_integration()
    
    print("\n✨ Image upload tests completed!")
    print("\nNext steps:")
    print("1. Run Django migrations: python manage.py migrate")
    print("2. Start the development server: python manage.py runserver")
    print("3. Test the upload endpoints with the frontend")


if __name__ == '__main__':
    run_all_tests()