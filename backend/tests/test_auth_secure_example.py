"""
Example test showing secure password handling
"""
import pytest
from django.urls import reverse

class TestAuthSecure:
    """Test authentication with secure password handling."""
    
    def test_login_with_fixture(self, client, test_user_credentials):
        """Test login using fixture credentials."""
        response = client.post(reverse('auth:login'), {
            'email': test_user_credentials['email'],
            'password': test_user_credentials['password']
        })
        assert response.status_code == 200
        
    def test_login_with_env_var(self, client, test_user):
        """Test login using environment variables."""
        import os
        response = client.post(reverse('auth:login'), {
            'email': test_user.email,
            'password': os.environ.get('TEST_USER_PASSWORD', 'fallback_password')
        })
        assert response.status_code == 200
        
    def test_authenticated_request(self, authenticated_client):
        """Test authenticated request using fixture."""
        response = authenticated_client.get(reverse('auth:profile'))
        assert response.status_code == 200
