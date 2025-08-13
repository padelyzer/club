"""
DRF Spectacular extensions for authentication.
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from .authentication import JWTAuthenticationWithBlacklist


class JWTAuthenticationWithBlacklistExtension(OpenApiAuthenticationExtension):
    """Extension for JWT authentication with blacklist support."""
    
    target_class = JWTAuthenticationWithBlacklist
    name = "JWTAuthenticationWithBlacklist"
    priority = -1  # Low priority to ensure it's used as fallback
    
    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
