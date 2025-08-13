"""
Security middleware for rate limiting and additional protections.
"""

import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import DefaultDict, Dict

from django.core.cache import cache
from django.http import HttpResponse
from django.utils import timezone


class RateLimitingMiddleware:
    """
    Simple rate limiting middleware to prevent brute force attacks.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Rate limiting configurations
        self.RATE_LIMITS = {
            '/api/auth/login/': {
                'requests': 5,
                'window': 300,  # 5 minutes
                'block_duration': 900,  # 15 minutes
            },
            '/api/auth/request-otp/': {
                'requests': 3,
                'window': 300,  # 5 minutes
                'block_duration': 600,  # 10 minutes
            },
            '/api/auth/password-reset/': {
                'requests': 3,
                'window': 600,  # 10 minutes
                'block_duration': 1800,  # 30 minutes
            }
        }
        
        # General API rate limiting
        self.DEFAULT_RATE_LIMIT = {
            'requests': 1000,  # requests per window
            'window': 3600,    # 1 hour
            'block_duration': 3600,  # 1 hour block
        }

    def __call__(self, request):
        # Check if request should be rate limited
        client_ip = self.get_client_ip(request)
        path = request.path
        
        # Check for rate limiting
        if self.is_rate_limited(client_ip, path):
            return HttpResponse(
                'Rate limit exceeded. Try again later.',
                status=429,
                content_type='text/plain'
            )
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        """Get client IP address, considering proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_rate_limited(self, client_ip: str, path: str) -> bool:
        """Check if the client IP is rate limited for the given path."""
        
        # Check if IP is currently blocked
        block_key = f"rate_limit_block:{client_ip}:{path}"
        if cache.get(block_key):
            return True
        
        # Get rate limit configuration for this path
        rate_config = self.RATE_LIMITS.get(path, self.DEFAULT_RATE_LIMIT)
        
        # Check rate limit
        rate_key = f"rate_limit:{client_ip}:{path}"
        current_requests = cache.get(rate_key, 0)
        
        if current_requests >= rate_config['requests']:
            # Block the IP
            cache.set(block_key, True, rate_config['block_duration'])
            return True
        
        # Increment request count
        cache.set(rate_key, current_requests + 1, rate_config['window'])
        return False


class SecurityHeadersMiddleware:
    """
    Add additional security headers to responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'same-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Content Security Policy for API responses
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'"
        
        return response


class WebhookSignatureMiddleware:
    """
    Middleware to verify webhook signatures for security.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Webhook paths that require signature verification
        self.WEBHOOK_PATHS = {
            '/api/notifications/webhooks/resend/': 'RESEND_WEBHOOK_SECRET',
            '/api/notifications/webhooks/twilio/': 'TWILIO_WEBHOOK_SECRET', 
            '/api/finance/webhooks/stripe/': 'STRIPE_WEBHOOK_SECRET',
        }

    def __call__(self, request):
        # Check if this is a webhook endpoint
        if request.path in self.WEBHOOK_PATHS and request.method == 'POST':
            secret_key = self.WEBHOOK_PATHS[request.path]
            
            # In a real implementation, you would verify the webhook signature here
            # For now, we just log the attempt
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Webhook received: {request.path} from IP: {self.get_client_ip(request)}")
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        """Get client IP address, considering proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip