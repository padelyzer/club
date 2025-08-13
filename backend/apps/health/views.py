from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from django.views import View
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import logging
import time
from typing import Dict, List, Any
import psutil
import os

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Vista de health check completa para detectar problemas de sincronización
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        start_time = time.time()
        checks = {
            'status': 'healthy',
            'timestamp': int(time.time()),
            'checks': {}
        }
        
        # 1. Database Check
        db_check = self._check_database()
        checks['checks']['database'] = db_check
        if not db_check['healthy']:
            checks['status'] = 'unhealthy'
            
        # 2. Cache Check
        cache_check = self._check_cache()
        checks['checks']['cache'] = cache_check
        if not cache_check['healthy']:
            checks['status'] = 'degraded'
            
        # 3. API Response Format Check
        api_check = self._check_api_format()
        checks['checks']['api_format'] = api_check
        if not api_check['healthy']:
            checks['status'] = 'degraded'
            
        # 4. Model Integrity Check
        model_check = self._check_model_integrity()
        checks['checks']['model_integrity'] = model_check
        if not model_check['healthy']:
            checks['status'] = 'unhealthy'
            
        # 5. System Resources
        system_check = self._check_system_resources()
        checks['checks']['system'] = system_check
        if not system_check['healthy']:
            checks['status'] = 'degraded'
            
        # Response time
        checks['response_time_ms'] = int((time.time() - start_time) * 1000)
        
        status_code = status.HTTP_200_OK if checks['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(checks, status=status_code)
    
    def _check_database(self) -> Dict[str, Any]:
        """Verifica conexión y sincronización de base de datos"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
                
            # Verificar tablas críticas
            critical_tables = [
                'authentication_user',
                'clubs_club',
                'reservations_reservation',
                'finance_payment'
            ]
            
            missing_tables = []
            with connection.cursor() as cursor:
                for table in critical_tables:
                    cursor.execute(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)",
                        [table]
                    )
                    if not cursor.fetchone()[0]:
                        missing_tables.append(table)
                        
            if missing_tables:
                return {
                    'healthy': False,
                    'message': f'Missing tables: {", ".join(missing_tables)}',
                    'details': {'missing_tables': missing_tables}
                }
                
            return {
                'healthy': True,
                'message': 'Database connection OK',
                'details': {
                    'backend': connection.vendor,
                    'tables_checked': len(critical_tables)
                }
            }
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                'healthy': False,
                'message': f'Database error: {str(e)}',
                'details': {'error': str(e)}
            }
    
    def _check_cache(self) -> Dict[str, Any]:
        """Verifica funcionamiento del cache"""
        try:
            test_key = 'health_check_test'
            test_value = str(time.time())
            
            # Set
            cache.set(test_key, test_value, 30)
            
            # Get
            retrieved = cache.get(test_key)
            
            # Delete
            cache.delete(test_key)
            
            if retrieved != test_value:
                return {
                    'healthy': False,
                    'message': 'Cache read/write mismatch',
                    'details': {
                        'expected': test_value,
                        'retrieved': retrieved
                    }
                }
                
            return {
                'healthy': True,
                'message': 'Cache operational',
                'details': {'backend': 'redis'}
            }
        except Exception as e:
            logger.warning(f"Cache health check failed: {str(e)}")
            return {
                'healthy': False,
                'message': f'Cache error: {str(e)}',
                'details': {'error': str(e)}
            }
    
    def _check_api_format(self) -> Dict[str, Any]:
        """Verifica consistencia en formato de respuestas API"""
        issues = []
        
        # Verificar que todos los ViewSets usen los mismos serializers
        from django.apps import apps
        
        for app_config in apps.get_app_configs():
            if app_config.name.startswith('apps.'):
                try:
                    # Intentar importar views
                    views_module = __import__(f'{app_config.name}.views', fromlist=['*'])
                    
                    # Verificar que los ViewSets tengan pagination_class
                    for attr_name in dir(views_module):
                        attr = getattr(views_module, attr_name)
                        if hasattr(attr, 'queryset') and not hasattr(attr, 'pagination_class'):
                            issues.append(f'{app_config.name}.{attr_name} missing pagination_class')
                            
                except ImportError:
                    pass
                    
        if issues:
            return {
                'healthy': False,
                'message': 'API format inconsistencies detected',
                'details': {'issues': issues}
            }
            
        return {
            'healthy': True,
            'message': 'API format consistent',
            'details': {'checked_apps': len(apps.get_app_configs())}
        }
    
    def _check_model_integrity(self) -> Dict[str, Any]:
        """Verifica integridad de modelos y relaciones"""
        from django.apps import apps
        issues = []
        
        # Verificar foreign keys y relaciones
        for model in apps.get_models():
            # Verificar que ForeignKeys tengan on_delete
            for field in model._meta.get_fields():
                if hasattr(field, 'remote_field') and field.remote_field:
                    if not hasattr(field, 'on_delete'):
                        issues.append(f'{model.__name__}.{field.name} missing on_delete')
                        
                # Verificar índices en campos de búsqueda frecuente
                if field.name in ['email', 'phone', 'document_number']:
                    if not field.db_index and not field.unique:
                        issues.append(f'{model.__name__}.{field.name} should have db_index')
                        
        if issues:
            return {
                'healthy': False,
                'message': 'Model integrity issues found',
                'details': {'issues': issues[:10]}  # Limitar a 10 para no sobrecargar
            }
            
        return {
            'healthy': True,
            'message': 'Model integrity OK',
            'details': {'models_checked': apps.get_models().__len__()}
        }
    
    def _check_system_resources(self) -> Dict[str, Any]:
        """Verifica recursos del sistema"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            issues = []
            
            if cpu_percent > 80:
                issues.append(f'High CPU usage: {cpu_percent}%')
            if memory.percent > 85:
                issues.append(f'High memory usage: {memory.percent}%')
            if disk.percent > 90:
                issues.append(f'Low disk space: {disk.percent}% used')
                
            if issues:
                return {
                    'healthy': False,
                    'message': 'System resource issues',
                    'details': {
                        'issues': issues,
                        'cpu_percent': cpu_percent,
                        'memory_percent': memory.percent,
                        'disk_percent': disk.percent
                    }
                }
                
            return {
                'healthy': True,
                'message': 'System resources OK',
                'details': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'disk_percent': disk.percent
                }
            }
        except Exception as e:
            return {
                'healthy': True,  # No fallar por esto
                'message': 'System check unavailable',
                'details': {'error': str(e)}
            }


class SyncValidationView(APIView):
    """
    Endpoint para validar sincronización entre frontend y backend
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Recibe tipos del frontend y valida contra modelos Django
        """
        frontend_types = request.data.get('types', {})
        validation_results = []
        
        from django.apps import apps
        
        for model in apps.get_models():
            if model._meta.app_label.startswith('apps'):
                model_name = model.__name__
                frontend_type = frontend_types.get(model_name)
                
                if not frontend_type:
                    validation_results.append({
                        'model': model_name,
                        'status': 'missing',
                        'message': f'No TypeScript type found for {model_name}'
                    })
                    continue
                    
                # Validar campos
                field_issues = []
                for field in model._meta.get_fields():
                    field_name = field.name
                    camel_case_name = self._to_camel_case(field_name)
                    
                    if field_name not in frontend_type and camel_case_name not in frontend_type:
                        field_issues.append({
                            'field': field_name,
                            'issue': 'missing in frontend'
                        })
                        
                if field_issues:
                    validation_results.append({
                        'model': model_name,
                        'status': 'mismatch',
                        'field_issues': field_issues
                    })
                else:
                    validation_results.append({
                        'model': model_name,
                        'status': 'ok'
                    })
                    
        return Response({
            'validation_results': validation_results,
            'summary': {
                'total_models': len(validation_results),
                'ok': len([r for r in validation_results if r['status'] == 'ok']),
                'issues': len([r for r in validation_results if r['status'] != 'ok'])
            }
        })
    
    def _to_camel_case(self, snake_str: str) -> str:
        components = snake_str.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])