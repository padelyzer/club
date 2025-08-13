"""
Test factories for creating test data.
"""

import factory
from factory import faker
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta, time, date
from decimal import Decimal
import uuid

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    """Factory for User model."""
    
    class Meta:
        model = User
        
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = faker.Faker("first_name")
    last_name = faker.Faker("last_name")
    phone = faker.Faker("phone_number")
    is_active = True
    is_staff = False
    is_superuser = False
    email_verified = True
    phone_verified = False
    two_factor_enabled = False
    
    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        if not create:
            return
        obj.set_password(extracted or "testpass123")
        obj.save()

# Organization Factory
try:
    from apps.root.models import Organization
    
    class OrganizationFactory(factory.django.DjangoModelFactory):
        """Factory for Organization model."""
        
        class Meta:
            model = Organization
            
        trade_name = faker.Faker("company")
        business_name = factory.LazyAttribute(lambda obj: f"{obj.trade_name} S.A. de C.V.")
        type = "padel_club"
        state = "active"
        
except ImportError:
    OrganizationFactory = None

# Club Factory  
try:
    from apps.clubs.models import Club
    
    class ClubFactory(factory.django.DjangoModelFactory):
        """Factory for Club model."""
        
        class Meta:
            model = Club
            
        name = faker.Faker("company")
        slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-")[:50])
        email = faker.Faker("email")
        phone = faker.Faker("phone_number")
        organization = factory.SubFactory(OrganizationFactory) if OrganizationFactory else None
        address = factory.LazyFunction(lambda: {
            "street": "Calle Principal",
            "number": "123",
            "colony": "Centro",
            "city": "Ciudad de México",
            "state": "CDMX",
            "postal_code": "01000",
            "country": "México"
        })
        opening_time = time(7, 0)
        closing_time = time(23, 0)
        days_open = [0, 1, 2, 3, 4, 5, 6]  # All days
        features = ["parking", "restaurant", "shop"]
        is_active = True
        
except ImportError:
    ClubFactory = None

# Court Factory
try:
    from apps.clubs.models import Court
    
    class CourtFactory(factory.django.DjangoModelFactory):
        """Factory for Court model."""
        
        class Meta:
            model = Court
            
        name = factory.Sequence(lambda n: f"Court {n}")
        number = factory.Sequence(lambda n: n)
        club = factory.SubFactory(ClubFactory) if ClubFactory else None
        surface_type = "artificial_grass"
        has_roof = False
        lighting = True
        hourly_price = Decimal("300.00")
        is_active = True
        
except ImportError:
    CourtFactory = None

# Player Level Factory
try:
    from apps.clients.models import PlayerLevel
    
    class PlayerLevelFactory(factory.django.DjangoModelFactory):
        """Factory for PlayerLevel model."""
        
        class Meta:
            model = PlayerLevel
            
        name = "intermediate"
        display_name = "Intermedio"
        description = "Jugador con experiencia media"
        min_rating = 300
        max_rating = 600
        color = "#FFA500"
        
except ImportError:
    PlayerLevelFactory = None

# Client Profile Factory
try:
    from apps.clients.models import ClientProfile
    
    class ClientProfileFactory(factory.django.DjangoModelFactory):
        """Factory for ClientProfile model."""
        
        class Meta:
            model = ClientProfile
            
        user = factory.SubFactory(UserFactory)
        organization = factory.SubFactory(OrganizationFactory) if OrganizationFactory else None
        club = factory.SubFactory(ClubFactory) if ClubFactory else None
        level = factory.SubFactory(PlayerLevelFactory) if PlayerLevelFactory else None
        phone = faker.Faker("phone_number")
        date_of_birth = faker.Faker("date_of_birth", minimum_age=18, maximum_age=65)
        gender = "M"
        hand = "right"
        position = "right"
        
except ImportError:
    ClientProfileFactory = None

# Reservation Factory
try:
    from apps.reservations.models import Reservation
    
    class ReservationFactory(factory.django.DjangoModelFactory):
        """Factory for Reservation model."""
        
        class Meta:
            model = Reservation
            
        club = factory.SubFactory(ClubFactory) if ClubFactory else None
        court = factory.SubFactory(CourtFactory) if CourtFactory else None
        organization = factory.SubFactory(OrganizationFactory) if OrganizationFactory else None
        created_by = factory.SubFactory(UserFactory)
        client = factory.SubFactory(ClientProfileFactory) if ClientProfileFactory else None
        date = factory.LazyFunction(lambda: date.today() + timedelta(days=1))
        start_time = time(10, 0)
        end_time = time(11, 30)
        duration_hours = Decimal("1.5")
        player_name = faker.Faker("name")
        player_email = faker.Faker("email")
        player_phone = faker.Faker("phone_number")
        player_count = 4
        status = "confirmed"
        payment_status = "pending"
        total_amount = Decimal("450.00")
        
except ImportError:
    ReservationFactory = None

# Organization Membership Factory
try:
    from apps.authentication.models import OrganizationMembership
    
    class OrganizationMembershipFactory(factory.django.DjangoModelFactory):
        """Factory for OrganizationMembership model."""
        
        class Meta:
            model = OrganizationMembership
            
        user = factory.SubFactory(UserFactory)
        organization = factory.SubFactory(OrganizationFactory) if OrganizationFactory else None
        role = "org_admin"
        permissions = {}
        is_active = True
        
except ImportError:
    OrganizationMembershipFactory = None
