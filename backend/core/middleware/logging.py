"""
Middleware de logging avanzado para detectar problemas de sincronización
"""

import json
import time
import logging
import traceback
from typing import Dict, Any
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
import uuid

logger = logging.getLogger('padelyzer.api')


class APILoggingMiddleware(MiddlewareMixin):
    """
    Middleware que registra todas las peticiones y respuestas API
    para detectar problemas de sincronización
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
    def process_request(self, request):
        """Registra información de la petición entrante"""
        request.api_log = {
            'request_id': str(uuid.uuid4()),
            'start_time': time.time(),
            'method': request.method,
            'path': request.path,
            'user': str(request.user) if request.user.is_authenticated else 'anonymous',
            'ip': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }
        
        # Log del body si es JSON
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if request.content_type == 'application/json':
                    request.api_log['request_body'] = json.loads(request.body.decode('utf-8'))
            except:
                request.api_log['request_body'] = 'Unable to parse body'
                
        logger.info(f"API Request: {request.api_log['request_id']} - {request.method} {request.path}")
        
        return None
        
    def process_response(self, request, response):
        """Registra información de la respuesta"""
        if hasattr(request, 'api_log'):
            request.api_log['response_time'] = time.time() - request.api_log['start_time']
            request.api_log['status_code'] = response.status_code
            
            # Detectar respuestas lentas
            if request.api_log['response_time'] > 1.0:  # Más de 1 segundo
                logger.warning(
                    f"Slow API response: {request.api_log['request_id']} - "
                    f"{request.api_log['response_time']:.2f}s - "
                    f"{request.method} {request.path}"
                )
                
            # Log del response body si es JSON y hay errores
            if response.status_code >= 400:
                try:
                    if response.get('Content-Type', '').startswith('application/json'):
                        response_data = json.loads(response.content.decode('utf-8'))
                        request.api_log['response_body'] = response_data
                        
                        # Detectar problemas comunes de sincronización
                        self._detect_sync_issues(request, response_data)
                except:
                    pass
                    
            # Log completo para debugging
            if settings.DEBUG or response.status_code >= 400:
                logger.info(f"API Response: {json.dumps(request.api_log, indent=2)}")
                
        return response
        
    def process_exception(self, request, exception):
        """Registra excepciones no manejadas"""
        if hasattr(request, 'api_log'):
            request.api_log['exception'] = {
                'type': type(exception).__name__,
                'message': str(exception),
                'traceback': traceback.format_exc()
            }
            
            logger.error(
                f"API Exception: {request.api_log['request_id']} - "
                f"{type(exception).__name__}: {str(exception)}\n"
                f"{traceback.format_exc()}"
            )
            
        # Retornar respuesta de error estándar
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(exception) if settings.DEBUG else 'An error occurred',
            'request_id': request.api_log.get('request_id') if hasattr(request, 'api_log') else None
        }, status=500)
        
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
        
    def _detect_sync_issues(self, request, response_data):
        """Detecta problemas comunes de sincronización"""
        issues = []
        
        # Detectar campos con valores null inesperados
        if isinstance(response_data, dict):
            for key, value in response_data.items():
                if value is None and key not in ['deleted_at', 'updated_by']:
                    issues.append(f"Unexpected null value for field: {key}")
                    
        # Detectar respuestas de validación con campos snake_case/camelCase mezclados
        if response_data.get('errors') or response_data.get('validation_errors'):
            errors = response_data.get('errors', response_data.get('validation_errors', {}))
            if isinstance(errors, dict):
                has_snake = any('_' in key for key in errors.keys())
                has_camel = any(key[0].islower() and any(c.isupper() for c in key) for key in errors.keys())
                
                if has_snake and has_camel:
                    issues.append("Mixed snake_case and camelCase in error fields")
                    
        # Detectar tipos de datos incorrectos comunes
        if 'id' in response_data and not isinstance(response_data['id'], (int, str)):
            issues.append(f"Invalid ID type: {type(response_data['id']).__name__}")
            
        if issues:
            logger.warning(
                f"Sync issues detected in {request.path}: {', '.join(issues)}"
            )
            

class DatabaseQueryLoggingMiddleware(MiddlewareMixin):
    """
    Middleware para detectar queries lentas y problemas N+1
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
    def process_request(self, request):
        """Inicia el tracking de queries"""
        from django.db import connection
        request._db_queries_start = len(connection.queries)
        return None
        
    def process_response(self, request, response):
        """Analiza las queries ejecutadas"""
        from django.db import connection
        
        if hasattr(request, '_db_queries_start'):
            queries_count = len(connection.queries) - request._db_queries_start
            
            # Detectar posibles problemas N+1
            if queries_count > 10:
                logger.warning(
                    f"High query count detected: {queries_count} queries for {request.path}"
                )
                
                # En debug, mostrar las queries
                if settings.DEBUG:
                    queries = connection.queries[request._db_queries_start:]
                    similar_queries = {}
                    
                    for query in queries:
                        # Simplificar query para agrupar similares
                        simplified = query['sql'].split('WHERE')[0].strip()
                        similar_queries[simplified] = similar_queries.get(simplified, 0) + 1
                        
                    # Detectar queries repetidas (N+1)
                    for query, count in similar_queries.items():
                        if count > 5:
                            logger.error(
                                f"Possible N+1 query problem: {count} similar queries:\n{query}"
                            )
                            
        return response