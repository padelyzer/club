"""
Business validation error handling middleware.
"""

import logging
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class BusinessValidationMiddleware(MiddlewareMixin):
    """Middleware to handle business validation errors gracefully."""
    
    def process_exception(self, request, exception):
        """Process business validation exceptions."""
        
        if isinstance(exception, ValidationError):
            # Log the validation error
            logger.warning(f"Business validation error: {exception.message_dict if hasattr(exception, 'message_dict') else exception.messages}")
            
            # Return appropriate JSON response for API requests
            if request.content_type == 'application/json' or '/api/' in request.path:
                error_data = {
                    'error': 'Validation Error',
                    'message': 'Los datos proporcionados no cumplen con las reglas de negocio',
                    'details': []
                }
                
                # Extract error messages
                if hasattr(exception, 'message_dict'):
                    for field, messages in exception.message_dict.items():
                        for message in messages:
                            error_data['details'].append({
                                'field': field,
                                'message': message
                            })
                elif hasattr(exception, 'messages'):
                    for message in exception.messages:
                        error_data['details'].append({
                            'field': None,
                            'message': message
                        })
                else:
                    error_data['details'].append({
                        'field': None,
                        'message': str(exception)
                    })
                
                return JsonResponse(error_data, status=400)
        
        # Return None to let Django handle other exceptions
        return None


class BusinessLogicAuditMiddleware(MiddlewareMixin):
    """Middleware to audit critical business operations."""
    
    AUDIT_PATHS = [
        '/api/reservations/',
        '/api/finance/payments/',
        '/api/finance/refunds/',
    ]
    
    def process_request(self, request):
        """Log critical business operations."""
        
        # Only audit specific paths
        if any(path in request.path for path in self.AUDIT_PATHS):
            # Log the request
            logger.info(f"Business operation: {request.method} {request.path}", extra={
                'user_id': request.user.id if request.user.is_authenticated else None,
                'ip_address': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'path': request.path,
                'method': request.method
            })
    
    def process_response(self, request, response):
        """Log business operation results."""
        
        # Only audit specific paths
        if any(path in request.path for path in self.AUDIT_PATHS):
            if response.status_code >= 400:
                logger.error(f"Business operation failed: {request.method} {request.path} - Status {response.status_code}")
            elif request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                logger.info(f"Business operation completed: {request.method} {request.path} - Status {response.status_code}")
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
