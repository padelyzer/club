"""
Test utilities for club tests.
"""

from django.contrib.auth import get_user_model
from apps.authentication.models import OrganizationMembership
from apps.root.models import Organization

User = get_user_model()


def create_test_organization(name_suffix=""):
    """Create a test organization with proper required fields."""
    suffix = f" {name_suffix}" if name_suffix else ""
    return Organization.objects.create(
        business_name=f"Test Organization Business{suffix}",
        trade_name=f"Test Organization{suffix}",
        rfc=f"TST123456{'ABC' if not name_suffix else 'XYZ'}",
        primary_email=f"test{name_suffix.lower().replace(' ', '')}@organization.com",
        primary_phone=f"555123456{len(name_suffix)}",
        legal_representative=f"Test Representative{suffix}"
    )


def create_test_user_with_org(username="testuser", email="testuser@example.com", organization=None):
    """Create a test user with organization membership."""
    if not organization:
        organization = create_test_organization()
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password="TEST_PASSWORD"
    )
    
    # Create organization membership
    OrganizationMembership.objects.create(
        user=user,
        organization=organization,
        role="org_admin"
    )
    
    # Set current organization
    user.current_organization_id = organization.id
    user.save()
    
    return user, organization