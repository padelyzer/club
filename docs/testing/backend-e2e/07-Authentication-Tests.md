# 🔐 Authentication Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de autenticación, cubriendo registro, login, JWT tokens, recuperación de contraseña y gestión de sesiones.

## 🎯 Objetivos de Testing

### Cobertura Target: 95%
- **Unit Tests**: 60% - Lógica de negocio y validaciones
- **Integration Tests**: 30% - Endpoints y flujos de API
- **E2E Tests**: 10% - Flujos completos de usuario

### Endpoints a Cubrir
- ✅ POST `/api/v1/auth/register/`
- ✅ POST `/api/v1/auth/login/`
- ✅ POST `/api/v1/auth/logout/`
- ✅ POST `/api/v1/auth/refresh/`
- ✅ POST `/api/v1/auth/verify-email/`
- ✅ POST `/api/v1/auth/reset-password/`
- ✅ POST `/api/v1/auth/change-password/`
- ✅ GET `/api/v1/users/me/`
- ✅ PUT `/api/v1/users/me/`

## 🧪 Unit Tests

### 1. User Model Tests
```python
# backend/tests/unit/authentication/test_models.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from apps.authentication.models import User

User = get_user_model()

class UserModelTest(TestCase):
    """Test User model functionality"""
    
    def test_create_user_with_email(self):
        """Test creating user with email"""
        user = User.objects.create_user(
            email='test@padelyzer.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User'
        )
        
        self.assertEqual(user.email, 'test@padelyzer.com')
        self.assertTrue(user.check_password('TestPass123!'))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_create_user_without_email_fails(self):
        """Test that email is required"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email='',
                password='TestPass123!'
            )
    
    def test_create_superuser(self):
        """Test creating superuser"""
        admin = User.objects.create_superuser(
            email='admin@padelyzer.com',
            password='AdminPass123!'
        )
        
        self.assertTrue(admin.is_active)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
    
    def test_email_normalization(self):
        """Test email is normalized"""
        user = User.objects.create_user(
            email='Test@PADELYZER.COM',
            password='TestPass123!'
        )
        
        self.assertEqual(user.email, 'Test@padelyzer.com')
    
    def test_user_str_representation(self):
        """Test string representation"""
        user = User.objects.create_user(
            email='test@padelyzer.com',
            password='TestPass123!',
            first_name='John',
            last_name='Doe'
        )
        
        self.assertEqual(str(user), 'John Doe (test@padelyzer.com)')
    
    def test_user_full_name(self):
        """Test full name property"""
        user = User(first_name='John', last_name='Doe')
        self.assertEqual(user.get_full_name(), 'John Doe')
        
        user = User(first_name='John')
        self.assertEqual(user.get_full_name(), 'John')
```

### 2. Password Validation Tests
```python
# backend/tests/unit/authentication/test_validators.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.authentication.validators import (
    CustomPasswordValidator,
    validate_phone_number,
    validate_spanish_dni
)

class PasswordValidatorTest(TestCase):
    """Test password validation"""
    
    def setUp(self):
        self.validator = CustomPasswordValidator()
    
    def test_valid_password(self):
        """Test valid passwords pass"""
        valid_passwords = [
            'SecurePass123!',
            'MyP@ssw0rd2023',
            'Complex!ty99',
            'Val1d$Password'
        ]
        
        for password in valid_passwords:
            # Should not raise exception
            self.validator.validate(password)
    
    def test_password_too_short(self):
        """Test short passwords fail"""
        with self.assertRaises(ValidationError):
            self.validator.validate('Short1!')
    
    def test_password_no_uppercase(self):
        """Test passwords without uppercase fail"""
        with self.assertRaises(ValidationError):
            self.validator.validate('lowercase123!')
    
    def test_password_no_lowercase(self):
        """Test passwords without lowercase fail"""
        with self.assertRaises(ValidationError):
            self.validator.validate('UPPERCASE123!')
    
    def test_password_no_digit(self):
        """Test passwords without digits fail"""
        with self.assertRaises(ValidationError):
            self.validator.validate('NoDigitsHere!')
    
    def test_password_no_special_char(self):
        """Test passwords without special chars fail"""
        with self.assertRaises(ValidationError):
            self.validator.validate('NoSpecialChar123')
    
    def test_common_passwords_rejected(self):
        """Test common passwords are rejected"""
        common_passwords = [
            'Password123!',
            'Welcome123!',
            'Admin123!',
            'Qwerty123!'
        ]
        
        for password in common_passwords:
            with self.assertRaises(ValidationError):
                self.validator.validate(password)

class PhoneValidatorTest(TestCase):
    """Test phone number validation"""
    
    def test_valid_spanish_phones(self):
        """Test valid Spanish phone numbers"""
        valid_phones = [
            '+34600000000',
            '+34 600 00 00 00',
            '600000000',
            '600 00 00 00'
        ]
        
        for phone in valid_phones:
            # Should not raise exception
            validate_phone_number(phone)
    
    def test_invalid_phones(self):
        """Test invalid phone numbers"""
        invalid_phones = [
            '123',
            'not-a-phone',
            '+1234567890',  # Non-Spanish
            '500000000'     # Invalid Spanish prefix
        ]
        
        for phone in invalid_phones:
            with self.assertRaises(ValidationError):
                validate_phone_number(phone)
```

### 3. JWT Token Tests
```python
# backend/tests/unit/authentication/test_tokens.py
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.authentication.tokens import CustomTokenObtainPairSerializer
from tests.factories import UserFactory

class JWTTokenTest(TestCase):
    """Test JWT token functionality"""
    
    def setUp(self):
        self.user = UserFactory()
    
    def test_token_generation(self):
        """Test token generation for user"""
        refresh = RefreshToken.for_user(self.user)
        
        # Check refresh token
        self.assertIsNotNone(refresh)
        self.assertEqual(refresh['user_id'], str(self.user.id))
        
        # Check access token
        access = refresh.access_token
        self.assertIsNotNone(access)
        self.assertEqual(access['user_id'], str(self.user.id))
    
    def test_custom_token_claims(self):
        """Test custom claims in token"""
        serializer = CustomTokenObtainPairSerializer()
        refresh = serializer.get_token(self.user)
        
        # Check custom claims
        self.assertEqual(refresh['email'], self.user.email)
        self.assertEqual(refresh['first_name'], self.user.first_name)
        self.assertEqual(refresh['last_name'], self.user.last_name)
    
    def test_token_refresh(self):
        """Test token refresh functionality"""
        refresh = RefreshToken.for_user(self.user)
        old_access = str(refresh.access_token)
        
        # Refresh token
        refresh.set_jti()
        refresh.set_exp()
        new_access = str(refresh.access_token)
        
        # Tokens should be different
        self.assertNotEqual(old_access, new_access)
    
    def test_token_blacklist(self):
        """Test token blacklisting"""
        refresh = RefreshToken.for_user(self.user)
        
        # Blacklist token
        refresh.blacklist()
        
        # Check token is blacklisted
        with self.assertRaises(Exception):
            refresh.check_blacklist()
```

## 🔌 Integration Tests

### 1. Registration Endpoint Tests
```python
# backend/tests/integration/authentication/test_registration.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core import mail

User = get_user_model()

class RegistrationAPITest(APITestCase):
    """Test user registration API"""
    
    def test_successful_registration(self):
        """Test successful user registration"""
        data = {
            'email': 'newuser@padelyzer.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
            'phone': '+34600000000',
            'accept_terms': True
        }
        
        response = self.client.post('/api/v1/auth/register/', data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        
        # Check user created
        user = User.objects.get(email='newuser@padelyzer.com')
        self.assertTrue(user.is_active)
        self.assertFalse(user.email_verified)
        
        # Check verification email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Verify your email', mail.outbox[0].subject)
    
    def test_registration_duplicate_email(self):
        """Test registration with existing email"""
        # Create existing user
        User.objects.create_user(
            email='existing@padelyzer.com',
            password='ExistingPass123!'
        )
        
        data = {
            'email': 'existing@padelyzer.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'first_name': 'Another',
            'last_name': 'User',
            'accept_terms': True
        }
        
        response = self.client.post('/api/v1/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_registration_password_mismatch(self):
        """Test registration with mismatched passwords"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'accept_terms': True
        }
        
        response = self.client.post('/api/v1/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)
    
    def test_registration_weak_password(self):
        """Test registration with weak password"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'weak',
            'password_confirm': 'weak',
            'first_name': 'Test',
            'last_name': 'User',
            'accept_terms': True
        }
        
        response = self.client.post('/api/v1/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_registration_terms_not_accepted(self):
        """Test registration without accepting terms"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'accept_terms': False
        }
        
        response = self.client.post('/api/v1/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('accept_terms', response.data)
```

### 2. Login Endpoint Tests
```python
# backend/tests/integration/authentication/test_login.py
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import UserFactory
from freezegun import freeze_time

class LoginAPITest(APITestCase):
    """Test user login API"""
    
    def setUp(self):
        self.user = UserFactory(
            email='test@padelyzer.com',
            is_active=True
        )
        self.user.set_password('TestPass123!')
        self.user.save()
    
    def test_successful_login(self):
        """Test successful login"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        
        # Check user data
        user_data = response.data['user']
        self.assertEqual(user_data['email'], self.user.email)
        self.assertEqual(user_data['first_name'], self.user.first_name)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'WrongPassword!'
        }
        
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
    
    def test_login_inactive_user(self):
        """Test login with inactive user"""
        self.user.is_active = False
        self.user.save()
        
        data = {
            'email': 'test@padelyzer.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_login_rate_limiting(self):
        """Test login rate limiting"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'WrongPassword!'
        }
        
        # Make multiple failed attempts
        for _ in range(5):
            self.client.post('/api/v1/auth/login/', data)
        
        # Next attempt should be rate limited
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
    
    @freeze_time("2023-01-01 12:00:00")
    def test_login_updates_last_login(self):
        """Test login updates last_login timestamp"""
        data = {
            'email': 'test@padelyzer.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)
        self.assertEqual(
            self.user.last_login.strftime("%Y-%m-%d %H:%M:%S"),
            "2023-01-01 12:00:00"
        )
```

### 3. Token Refresh Tests
```python
# backend/tests/integration/authentication/test_token_refresh.py
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from tests.factories import UserFactory

class TokenRefreshAPITest(APITestCase):
    """Test token refresh functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        self.refresh = RefreshToken.for_user(self.user)
    
    def test_successful_token_refresh(self):
        """Test successful token refresh"""
        data = {
            'refresh': str(self.refresh)
        }
        
        response = self.client.post('/api/v1/auth/refresh/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        
        # New access token should be different
        self.assertNotEqual(
            response.data['access'],
            str(self.refresh.access_token)
        )
    
    def test_refresh_with_invalid_token(self):
        """Test refresh with invalid token"""
        data = {
            'refresh': 'invalid_token'
        }
        
        response = self.client.post('/api/v1/auth/refresh/', data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_refresh_with_blacklisted_token(self):
        """Test refresh with blacklisted token"""
        # Blacklist the token
        self.refresh.blacklist()
        
        data = {
            'refresh': str(self.refresh)
        }
        
        response = self.client.post('/api/v1/auth/refresh/', data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

## 🔄 E2E Flow Tests

### 1. Complete Registration Flow
```python
# backend/tests/e2e/authentication/test_registration_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from django.core import mail
from apps.authentication.models import EmailVerificationToken
import re

class RegistrationFlowE2ETest(TestCase):
    """Test complete registration flow"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_complete_registration_flow(self):
        """Test registration → email verification → login flow"""
        
        # Step 1: Register new user
        registration_data = {
            'email': 'newuser@padelyzer.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
            'phone': '+34600000000',
            'accept_terms': True
        }
        
        response = self.client.post('/api/v1/auth/register/', registration_data)
        self.assertEqual(response.status_code, 201)
        
        # Save tokens
        access_token = response.data['access']
        refresh_token = response.data['refresh']
        
        # Step 2: Check verification email
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('newuser@padelyzer.com', email.to)
        
        # Extract verification token from email
        token_match = re.search(r'verify/([a-zA-Z0-9-]+)', email.body)
        self.assertIsNotNone(token_match)
        verification_token = token_match.group(1)
        
        # Step 3: Verify email
        verify_response = self.client.post(
            '/api/v1/auth/verify-email/',
            {'token': verification_token}
        )
        self.assertEqual(verify_response.status_code, 200)
        
        # Step 4: Access protected endpoint with token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get('/api/v1/users/me/')
        self.assertEqual(profile_response.status_code, 200)
        self.assertTrue(profile_response.data['email_verified'])
        
        # Step 5: Logout
        logout_response = self.client.post(
            '/api/v1/auth/logout/',
            {'refresh': refresh_token}
        )
        self.assertEqual(logout_response.status_code, 200)
        
        # Step 6: Verify token is invalidated
        self.client.credentials()  # Clear credentials
        profile_response = self.client.get('/api/v1/users/me/')
        self.assertEqual(profile_response.status_code, 401)
```

### 2. Password Reset Flow
```python
# backend/tests/e2e/authentication/test_password_reset_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from django.core import mail
from tests.factories import UserFactory
import re

class PasswordResetFlowE2ETest(TestCase):
    """Test complete password reset flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory(
            email='test@padelyzer.com',
            is_active=True
        )
        self.user.set_password('OldPass123!')
        self.user.save()
    
    def test_complete_password_reset_flow(self):
        """Test request reset → email → reset → login flow"""
        
        # Step 1: Request password reset
        response = self.client.post(
            '/api/v1/auth/password-reset/',
            {'email': 'test@padelyzer.com'}
        )
        self.assertEqual(response.status_code, 200)
        
        # Step 2: Check reset email
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('Password Reset', email.subject)
        
        # Extract reset token
        token_match = re.search(r'reset/([a-zA-Z0-9-]+)', email.body)
        self.assertIsNotNone(token_match)
        reset_token = token_match.group(1)
        
        # Step 3: Reset password with token
        new_password = 'NewSecurePass123!'
        reset_response = self.client.post(
            '/api/v1/auth/password-reset-confirm/',
            {
                'token': reset_token,
                'password': new_password,
                'password_confirm': new_password
            }
        )
        self.assertEqual(reset_response.status_code, 200)
        
        # Step 4: Login with old password should fail
        old_login = self.client.post(
            '/api/v1/auth/login/',
            {
                'email': 'test@padelyzer.com',
                'password': 'OldPass123!'
            }
        )
        self.assertEqual(old_login.status_code, 401)
        
        # Step 5: Login with new password should succeed
        new_login = self.client.post(
            '/api/v1/auth/login/',
            {
                'email': 'test@padelyzer.com',
                'password': new_password
            }
        )
        self.assertEqual(new_login.status_code, 200)
        self.assertIn('access', new_login.data)
```

### 3. Multi-Device Session Management
```python
# backend/tests/e2e/authentication/test_multi_device_sessions.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory

class MultiDeviceSessionE2ETest(TestCase):
    """Test multi-device session management"""
    
    def setUp(self):
        self.user = UserFactory()
        self.user.set_password('TestPass123!')
        self.user.save()
        
        # Simulate different devices
        self.mobile_client = APIClient()
        self.web_client = APIClient()
        self.tablet_client = APIClient()
    
    def test_multiple_device_sessions(self):
        """Test login from multiple devices"""
        credentials = {
            'email': self.user.email,
            'password': 'TestPass123!'
        }
        
        # Login from mobile
        mobile_response = self.mobile_client.post(
            '/api/v1/auth/login/', 
            credentials
        )
        self.assertEqual(mobile_response.status_code, 200)
        mobile_access = mobile_response.data['access']
        
        # Login from web
        web_response = self.web_client.post(
            '/api/v1/auth/login/', 
            credentials
        )
        self.assertEqual(web_response.status_code, 200)
        web_access = web_response.data['access']
        
        # Both sessions should work
        self.mobile_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {mobile_access}'
        )
        self.web_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {web_access}'
        )
        
        # Test both can access protected endpoints
        mobile_profile = self.mobile_client.get('/api/v1/users/me/')
        web_profile = self.web_client.get('/api/v1/users/me/')
        
        self.assertEqual(mobile_profile.status_code, 200)
        self.assertEqual(web_profile.status_code, 200)
    
    def test_logout_one_device(self):
        """Test logout from one device doesn't affect others"""
        credentials = {
            'email': self.user.email,
            'password': 'TestPass123!'
        }
        
        # Login from both devices
        mobile_login = self.mobile_client.post(
            '/api/v1/auth/login/', 
            credentials
        )
        web_login = self.web_client.post(
            '/api/v1/auth/login/', 
            credentials
        )
        
        # Logout from mobile
        self.mobile_client.post(
            '/api/v1/auth/logout/',
            {'refresh': mobile_login.data['refresh']}
        )
        
        # Web session should still work
        self.web_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {web_login.data["access"]}'
        )
        web_profile = self.web_client.get('/api/v1/users/me/')
        self.assertEqual(web_profile.status_code, 200)
        
        # Mobile session should fail
        self.mobile_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {mobile_login.data["access"]}'
        )
        mobile_profile = self.mobile_client.get('/api/v1/users/me/')
        self.assertEqual(mobile_profile.status_code, 401)
```

## 🔒 Security Tests

### 1. Authentication Security Tests
```python
# backend/tests/security/authentication/test_security.py
from django.test import TestCase
from rest_framework.test import APIClient
from tests.factories import UserFactory
import time

class AuthenticationSecurityTest(TestCase):
    """Test authentication security features"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.user.set_password('TestPass123!')
        self.user.save()
    
    def test_brute_force_protection(self):
        """Test protection against brute force attacks"""
        # Make failed login attempts
        for i in range(10):
            response = self.client.post(
                '/api/v1/auth/login/',
                {
                    'email': self.user.email,
                    'password': f'WrongPass{i}!'
                }
            )
        
        # Should be rate limited
        response = self.client.post(
            '/api/v1/auth/login/',
            {
                'email': self.user.email,
                'password': 'TestPass123!'  # Even correct password
            }
        )
        
        self.assertEqual(response.status_code, 429)
        self.assertIn('retry-after', response)
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        malicious_inputs = [
            "' OR '1'='1",
            "'; DROP TABLE users;--",
            "admin'--",
            "' UNION SELECT * FROM users--"
        ]
        
        for payload in malicious_inputs:
            response = self.client.post(
                '/api/v1/auth/login/',
                {
                    'email': payload,
                    'password': payload
                }
            )
            
            # Should fail gracefully
            self.assertIn(response.status_code, [400, 401])
            # Should not expose internal errors
            self.assertNotIn('SQL', str(response.data))
    
    def test_timing_attack_resistance(self):
        """Test resistance to timing attacks"""
        # Time valid user
        start = time.time()
        self.client.post(
            '/api/v1/auth/login/',
            {
                'email': self.user.email,
                'password': 'WrongPassword!'
            }
        )
        valid_user_time = time.time() - start
        
        # Time invalid user
        start = time.time()
        self.client.post(
            '/api/v1/auth/login/',
            {
                'email': 'nonexistent@padelyzer.com',
                'password': 'WrongPassword!'
            }
        )
        invalid_user_time = time.time() - start
        
        # Times should be similar (within 50ms)
        time_diff = abs(valid_user_time - invalid_user_time)
        self.assertLess(time_diff, 0.05)
    
    def test_password_not_in_response(self):
        """Test passwords are never exposed in responses"""
        # Register user
        response = self.client.post(
            '/api/v1/auth/register/',
            {
                'email': 'test@padelyzer.com',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
                'first_name': 'Test',
                'last_name': 'User',
                'accept_terms': True
            }
        )
        
        # Check response doesn't contain password
        response_str = str(response.data)
        self.assertNotIn('SecurePass123!', response_str)
        self.assertNotIn('password', response_str.lower())
```

## 📊 Performance Tests

### Authentication Performance Tests
```python
# backend/tests/performance/authentication/test_performance.py
from django.test import TestCase
from rest_framework.test import APIClient
from django.test.utils import override_settings
import time
from concurrent.futures import ThreadPoolExecutor
from tests.factories import UserFactory

class AuthenticationPerformanceTest(TestCase):
    """Test authentication performance"""
    
    def test_login_performance(self):
        """Test login endpoint performance"""
        user = UserFactory()
        user.set_password('TestPass123!')
        user.save()
        
        client = APIClient()
        
        # Warm up
        client.post('/api/v1/auth/login/', {
            'email': user.email,
            'password': 'TestPass123!'
        })
        
        # Measure login time
        start = time.time()
        response = client.post('/api/v1/auth/login/', {
            'email': user.email,
            'password': 'TestPass123!'
        })
        duration = time.time() - start
        
        # Should complete within 200ms
        self.assertLess(duration, 0.2)
        self.assertEqual(response.status_code, 200)
    
    def test_concurrent_logins(self):
        """Test system handles concurrent logins"""
        # Create users
        users = []
        for i in range(10):
            user = UserFactory(email=f'user{i}@padelyzer.com')
            user.set_password('TestPass123!')
            user.save()
            users.append(user)
        
        def login_user(user):
            client = APIClient()
            return client.post('/api/v1/auth/login/', {
                'email': user.email,
                'password': 'TestPass123!'
            })
        
        # Execute concurrent logins
        with ThreadPoolExecutor(max_workers=10) as executor:
            start = time.time()
            futures = [executor.submit(login_user, user) for user in users]
            results = [f.result() for f in futures]
            duration = time.time() - start
        
        # All should succeed
        for result in results:
            self.assertEqual(result.status_code, 200)
        
        # Should complete within reasonable time
        self.assertLess(duration, 2.0)
```

## 🎯 Test Execution Commands

### Run All Authentication Tests
```bash
# Unit tests only
pytest tests/unit/authentication/ -v

# Integration tests
pytest tests/integration/authentication/ -v

# E2E tests
pytest tests/e2e/authentication/ -v

# All authentication tests
pytest tests/ -k authentication -v

# With coverage
pytest tests/ -k authentication --cov=apps.authentication --cov-report=html
```

### Run Specific Test Categories
```bash
# Security tests
pytest tests/security/authentication/ -v

# Performance tests
pytest tests/performance/authentication/ -v

# Run tests in parallel
pytest tests/ -k authentication -n auto
```

---

**Siguiente**: [Clubs Module Tests](08-Clubs-Module-Tests.md) →