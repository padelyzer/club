"""
Pytest fixtures for test credentials and common test setup
Use these instead of hardcoding passwords in tests
"""
import os
import pytest
import tempfile
import django
from django.conf import settings

# Configure Django settings for tests
if not settings.configured:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    django.setup()

from django.contrib.auth import get_user_model
from django.test import override_settings

User = get_user_model()

@pytest.fixture
def test_password():
    """Get test password from environment or use default."""
    return os.environ.get('TEST_USER_PASSWORD', 'test_password_fixture')

@pytest.fixture
def test_user_credentials():
    """Get test user credentials."""
    return {
        'email': os.environ.get('TEST_USER_EMAIL', 'test@padelyzer.com'),
        'password': os.environ.get('TEST_USER_PASSWORD', 'test_password_fixture')
    }

@pytest.fixture
def test_admin_credentials():
    """Get test admin credentials."""
    return {
        'email': os.environ.get('TEST_ADMIN_EMAIL', 'admin@padelyzer.com'),
        'password': os.environ.get('TEST_ADMIN_PASSWORD', 'admin_password_fixture')
    }

@pytest.fixture
def test_user(db, test_user_credentials):
    """Create a test user."""
    user = User.objects.create_user(
        email=test_user_credentials['email'],
        password=test_user_credentials['password'],
        first_name='Test',
        last_name='User',
        username=test_user_credentials['email']  # Use email as username
    )
    return user

@pytest.fixture
def test_admin_user(db, test_admin_credentials):
    """Create a test admin user."""
    user = User.objects.create_user(
        email=test_admin_credentials['email'],
        password=test_admin_credentials['password'],
        first_name='Admin',
        last_name='User',
        username=test_admin_credentials['email'],
        is_staff=True,
        is_superuser=True
    )
    return user

@pytest.fixture
def authenticated_client(client, test_user, test_user_credentials):
    """Get an authenticated test client."""
    client.login(
        email=test_user_credentials['email'],
        password=test_user_credentials['password']
    )
    return client

@pytest.fixture
def api_client():
    """Get a DRF API test client."""
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def authenticated_api_client(api_client, test_user):
    """Get an authenticated DRF API test client."""
    api_client.force_authenticate(user=test_user)
    return api_client

@pytest.fixture
def admin_api_client(api_client, test_admin_user):
    """Get an admin authenticated DRF API test client."""
    api_client.force_authenticate(user=test_admin_user)
    return api_client

@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Grant database access to all tests.
    """
    pass

@pytest.fixture(scope="session")
def django_db_setup():
    """
    Ensure test database is set up correctly.
    """
    from django.core.management import call_command
    
    # Run migrations
    call_command('migrate', '--run-syncdb', verbosity=0, interactive=False)

@pytest.fixture
def temp_media_root():
    """
    Create temporary directory for media files during testing.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        with override_settings(MEDIA_ROOT=temp_dir):
            yield temp_dir

@pytest.fixture
def disable_cache():
    """
    Disable caching for tests.
    """
    with override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}):
        yield

@pytest.fixture(autouse=True)
def cleanup_media_files(request):
    """Clean up media files after tests."""
    yield
    # Cleanup is handled by temp_media_root fixture

# Database fixtures for common test objects
@pytest.fixture
def sample_organization(db):
    """Create a sample organization for testing."""
    try:
        from tests.factories import OrganizationFactory
        if OrganizationFactory:
            return OrganizationFactory()
    except (ImportError, AttributeError):
        pass
    return None

@pytest.fixture  
def sample_club(db, sample_organization):
    """Create a sample club for testing."""
    try:
        from tests.factories import ClubFactory
        if ClubFactory and sample_organization:
            return ClubFactory(organization=sample_organization)
    except (ImportError, AttributeError):
        pass
    return None

@pytest.fixture
def sample_court(db, sample_club):
    """Create a sample court for testing."""
    try:
        from tests.factories import CourtFactory
        if CourtFactory and sample_club:
            return CourtFactory(club=sample_club)
    except (ImportError, AttributeError):
        pass
    return None

@pytest.fixture
def sample_client_profile(db, test_user, sample_organization, sample_club):
    """Create a sample client profile for testing."""
    try:
        from tests.factories import ClientProfileFactory
        if ClientProfileFactory:
            return ClientProfileFactory(
                user=test_user,
                organization=sample_organization,
                club=sample_club
            )
    except (ImportError, AttributeError):
        pass
    return None

@pytest.fixture
def sample_reservation(db, sample_club, sample_court, test_user, sample_client_profile):
    """Create a sample reservation for testing."""
    try:
        from tests.factories import ReservationFactory
        if ReservationFactory and all([sample_club, sample_court, sample_client_profile]):
            return ReservationFactory(
                club=sample_club,
                court=sample_court,
                created_by=test_user,
                client=sample_client_profile,
                organization=sample_club.organization if sample_club else None
            )
    except (ImportError, AttributeError):
        pass
    return None
