"""
Global pytest configuration and fixtures for Padelyzer backend.
"""

from typing import Any, Dict, Generator

from django.contrib.auth import get_user_model
from django.test import Client

from rest_framework.test import APIClient

import factory
import pytest
from faker import Faker
from rest_framework_simplejwt.tokens import RefreshToken

fake = Faker("es_MX")
User = get_user_model()


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Set up test database."""
    with django_db_blocker.unblock():
        # Add any global test database setup here
        pass


@pytest.fixture
def api_client() -> APIClient:
    """Return an API client instance."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client: APIClient, user: User) -> APIClient:
    """Return an authenticated API client."""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def admin_client(api_client: APIClient, admin_user: User) -> APIClient:
    """Return an authenticated admin API client."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def user(db) -> User:
    """Create a regular user."""
    return User.objects.create_user(
        username=fake.user_name(),
        email=fake.email(),
        password="testpass123",
        first_name=fake.first_name(),
        last_name=fake.last_name(),
        phone=fake.phone_number(),
        is_active=True,
        email_verified=True,
    )


@pytest.fixture
def admin_user(db) -> User:
    """Create an admin user."""
    return User.objects.create_superuser(
        username="admin",
        email="admin@padelyzer.com",
        password="adminpass123",
        first_name="Admin",
        last_name="User",
    )


@pytest.fixture
def organization(db):
    """Create a test organization."""
    from apps.root.models import Organization

    return Organization.objects.create(
        business_name=fake.company() + " S.A. de C.V.",
        trade_name=fake.company(),
        rfc=fake.lexify("???######???").upper(),
        primary_email=fake.company_email(),
        primary_phone=fake.phone_number(),
        legal_representative=fake.name(),
        is_active=True,
    )


@pytest.fixture
def club(db, organization):
    """Create a test club."""
    from apps.clubs.models import Club

    return Club.objects.create(
        organization=organization,
        name=fake.company() + " Padel Club",
        slug=fake.slug(),
        email=fake.email(),
        phone=fake.phone_number(),
        address=fake.address(),
        description=fake.text(max_nb_chars=200),
        is_active=True,
    )


@pytest.fixture
def court(db, club):
    """Create a test court."""
    from apps.clubs.models import Court

    return Court.objects.create(
        club=club,
        name=f"Court {fake.random_int(1, 10)}",
        court_type="indoor",
        surface_type="synthetic_grass",
        is_active=True,
        price_per_hour=500.00,
    )


@pytest.fixture
def client_user(db, club):
    """Create a client user."""
    from apps.clients.models import Client

    user = User.objects.create_user(
        username=fake.user_name(),
        email=fake.email(),
        password="clientpass123",
        first_name=fake.first_name(),
        last_name=fake.last_name(),
    )

    return Client.objects.create(
        user=user,
        club=club,
        phone=fake.phone_number(),
        skill_level="intermediate",
        preferred_position="right",
        is_active=True,
    )


@pytest.fixture
def api_headers() -> Dict[str, str]:
    """Common API headers."""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@pytest.fixture
def mock_stripe(mocker):
    """Mock Stripe API calls."""
    stripe_mock = mocker.patch("stripe.Customer.create")
    stripe_mock.return_value = mocker.Mock(id="cus_test123")

    payment_intent_mock = mocker.patch("stripe.PaymentIntent.create")
    payment_intent_mock.return_value = mocker.Mock(
        id="pi_test123",
        client_secret="pi_test123_secret",
        status="requires_payment_method",
    )

    return {"customer": stripe_mock, "payment_intent": payment_intent_mock}


@pytest.fixture
def mock_email(mocker):
    """Mock email sending."""
    return mocker.patch("django.core.mail.send_mail", return_value=1)


@pytest.fixture
def mock_sms(mocker):
    """Mock SMS sending."""
    return mocker.patch("twilio.rest.Client", autospec=True)


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Give all tests access to the database.
    This is useful when you have tests that don't explicitly use the db fixture.
    """
    pass


@pytest.fixture
def api_request_factory():
    """Factory for creating API request data."""

    class APIRequestFactory:
        @staticmethod
        def create_user_data(**kwargs) -> Dict[str, Any]:
            """Create user registration data."""
            data = {
                "email": fake.email(),
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "phone": fake.phone_number(),
            }
            data.update(kwargs)
            return data

        @staticmethod
        def create_club_data(**kwargs) -> Dict[str, Any]:
            """Create club data."""
            data = {
                "name": fake.company() + " Padel Club",
                "email": fake.email(),
                "phone": fake.phone_number(),
                "address": fake.address(),
                "description": fake.text(max_nb_chars=200),
            }
            data.update(kwargs)
            return data

        @staticmethod
        def create_reservation_data(court_id: int, **kwargs) -> Dict[str, Any]:
            """Create reservation data."""
            from datetime import datetime, timedelta

            start_time = datetime.now() + timedelta(days=1, hours=10)
            data = {
                "court": court_id,
                "start_time": start_time.isoformat(),
                "duration_minutes": 90,
                "payment_method": "card",
            }
            data.update(kwargs)
            return data

    return APIRequestFactory()


# Performance monitoring fixture
@pytest.fixture
def performance_monitor(request):
    """Monitor test performance."""
    import time

    start_time = time.time()

    yield

    duration = time.time() - start_time
    print(f"\n⏱️  Test '{request.node.name}' took {duration:.2f} seconds")

    # Fail if test is too slow (configurable)
    max_duration = getattr(request.node.get_closest_marker("slow"), "args", [5])[0]
    if duration > max_duration:
        pytest.fail(f"Test exceeded maximum duration of {max_duration} seconds")


# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_media_files(request):
    """Clean up media files after tests."""
    yield

    # Add cleanup logic for test media files if needed
    import shutil
    from django.conf import settings

    test_media_root = settings.MEDIA_ROOT / "test"
    if test_media_root.exists():
        shutil.rmtree(test_media_root)
