#!/usr/bin/env python3
"""
Internal test for pagination functionality using Django ORM directly.
"""
import os
import django
import sys

# Add the backend directory to Python path
sys.path.append('/Users/ja/PZR4/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.clubs.models import Club
from apps.clubs.serializers import ClubSerializer
from apps.shared.pagination import StandardResultsSetPagination
from django.core.paginator import Paginator
from django.contrib.auth import get_user_model

User = get_user_model()

def test_pagination_internal():
    """Test pagination functionality using Django internals."""
    print("Testing pagination functionality internally...")
    
    # Check if we have any clubs
    total_clubs = Club.objects.count()
    print(f"Total clubs in database: {total_clubs}")
    
    if total_clubs == 0:
        print("No clubs found. Creating test clubs...")
        
        # Get or create a test user
        try:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                user = User.objects.create_superuser('test', 'test@test.com', 'test123')
            
            # Get or create test organization
            from apps.root.models import Organization
            org, created = Organization.objects.get_or_create(
                trade_name='Test Organization',
                defaults={
                    'business_name': 'Test Organization Inc.',
                    'type': 'standard',
                    'email': 'test@org.com'
                }
            )
            
            # Create test clubs
            for i in range(25):  # Create 25 test clubs to test pagination
                Club.objects.get_or_create(
                    name=f'Test Club {i+1}',
                    defaults={
                        'description': f'Test club number {i+1}',
                        'email': f'club{i+1}@test.com',
                        'organization': org,
                        'slug': f'test-club-{i+1}'
                    }
                )
            total_clubs = Club.objects.count()
            print(f"Created test clubs. Total clubs now: {total_clubs}")
            
        except Exception as e:
            print(f"Error creating test data: {e}")
            return
    
    # Test StandardResultsSetPagination
    print("\n--- Testing StandardResultsSetPagination ---")
    
    # Create a mock request
    class MockRequest:
        def __init__(self, page=1, page_size=20):
            self.GET = {'page': str(page), 'page_size': str(page_size)}
            self.query_params = self.GET
    
    paginator = StandardResultsSetPagination()
    
    # Test page 1
    request = MockRequest(page=1, page_size=10)
    queryset = Club.objects.all()
    
    # This is how Django REST Framework would paginate
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = ClubSerializer(page, many=True)
        # Test pagination metadata without links
        print(f"✓ Page 1 (page_size=10):")
        print(f"  - Count: {paginator.page.paginator.count}")
        print(f"  - Current page: {paginator.page.number}")
        print(f"  - Total pages: {paginator.page.paginator.num_pages}")
        print(f"  - Page size: {paginator.get_page_size(request)}")
        print(f"  - Results: {len(serializer.data)}")
        print(f"  - Has next: {paginator.page.has_next()}")
        print(f"  - Has previous: {paginator.page.has_previous()}")
    
    # Test page 2
    if total_clubs > 10:
        request = MockRequest(page=2, page_size=10)
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = ClubSerializer(page, many=True)
            
            print(f"\n✓ Page 2 (page_size=10):")
            print(f"  - Current page: {paginator.page.number}")
            print(f"  - Results: {len(serializer.data)}")
            print(f"  - Has next: {'Yes' if paginator.page.has_next() else 'No'}")
            print(f"  - Has previous: {'Yes' if paginator.page.has_previous() else 'No'}")
    
    # Test different page sizes
    print(f"\n--- Testing different page sizes ---")
    for page_size in [5, 20, 50]:
        request = MockRequest(page=1, page_size=page_size)
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = ClubSerializer(page, many=True)
            
            print(f"✓ Page size {page_size}:")
            print(f"  - Results on page: {len(serializer.data)}")
            print(f"  - Total pages: {paginator.page.paginator.num_pages}")
    
    print(f"\n--- Test completed successfully ---")

if __name__ == "__main__":
    test_pagination_internal()