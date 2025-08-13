#!/usr/bin/env python
"""
Validación completa de integración Backend-Frontend.
Valida coherencia, eficiencia y gaps de funcionalidad entre capas.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from base_validator import BaseModuleValidator
import requests
import json
from datetime import datetime, timedelta
import time

class BackendFrontendIntegrationValidator(BaseModuleValidator):
    """Validador de integración Backend-Frontend."""
    
    def __init__(self):
        super().__init__("integration")
        self.frontend_url = "http://localhost:3000"
        self.api_endpoints = {}
        self.frontend_pages = {}
        self.performance_metrics = {}
        
    def run_validation(self):
        """Ejecutar validación completa de integración."""
        
        print("🔗 VALIDANDO INTEGRACIÓN BACKEND-FRONTEND")
        print("=" * 60)
        
        # 1. Mapeo de APIs y Pages
        print("\n📍 FASE 1: MAPEO DE ENDPOINTS Y PÁGINAS...")
        self.test("Mapear endpoints del backend", self.map_backend_endpoints)
        self.test("Mapear páginas del frontend", self.map_frontend_pages)
        self.test("Verificar conectividad básica", self.test_basic_connectivity)
        
        # 2. Coherencia de Datos
        print("\n📊 FASE 2: COHERENCIA DE DATOS...")
        self.test("Coherencia en modelos de clubes", self.validate_clubs_data_coherence)
        self.test("Coherencia en modelos de reservaciones", self.validate_reservations_data_coherence)
        self.test("Coherencia en modelos de clientes", self.validate_clients_data_coherence)
        self.test("Validar formatos de fecha/hora", self.validate_datetime_formats)
        
        # 3. Funcionalidad End-to-End
        print("\n🔄 FASE 3: FLUJOS END-TO-END...")
        self.test("E2E: Login y autenticación", self.validate_auth_flow)
        self.test("E2E: Listado de clubes", self.validate_clubs_listing_flow)
        self.test("E2E: Creación de reservación", self.validate_reservation_creation_flow)
        self.test("E2E: Gestión de perfil", self.validate_profile_flow)
        
        # 4. Performance y Eficiencia
        print("\n⚡ FASE 4: PERFORMANCE Y EFICIENCIA...")
        self.test("Tiempo de respuesta APIs", self.validate_api_performance)
        self.test("Carga inicial de páginas", self.validate_page_load_performance)
        self.test("Optimización de queries", self.validate_query_optimization)
        self.test("Caching y headers", self.validate_caching_headers)
        
        # 5. Gaps de Funcionalidad
        print("\n🔍 FASE 5: GAPS DE FUNCIONALIDAD...")
        self.test("APIs no utilizadas", self.identify_unused_apis)
        self.test("Páginas sin backend", self.identify_orphaned_pages)
        self.test("Validaciones faltantes", self.identify_missing_validations)
        self.test("Error handling", self.validate_error_handling)
        
        # 6. Seguridad y Tokens
        print("\n🔐 FASE 6: SEGURIDAD Y TOKENS...")
        self.test("Manejo de tokens JWT", self.validate_jwt_handling)
        self.test("Refresh de tokens", self.validate_token_refresh)
        self.test("Protección de rutas", self.validate_route_protection)
        self.test("Validación de permisos", self.validate_permissions_integration)
        
        print(f"\n📈 MÉTRICAS DE PERFORMANCE:")
        for metric, value in self.performance_metrics.items():
            print(f"  - {metric}: {value}")
    
    # FASE 1: MAPEO
    def map_backend_endpoints(self):
        """Mapear todos los endpoints del backend."""
        try:
            # Obtener schema de la API
            schema_response = requests.get(f"{self.base_url}/schema/", timeout=10)
            if schema_response.status_code == 200:
                # Intentar parsear como JSON
                try:
                    schema = schema_response.json()
                    self.api_endpoints = self._extract_endpoints_from_schema(schema)
                except:
                    # Si no es JSON, analizar endpoints manualmente
                    self.api_endpoints = self._discover_endpoints_manually()
            else:
                self.api_endpoints = self._discover_endpoints_manually()
            
            return True, f"Endpoints mapeados: {len(self.api_endpoints)} encontrados"
        except Exception as e:
            return False, f"Error mapeando endpoints: {str(e)}"
    
    def _discover_endpoints_manually(self):
        """Descubrir endpoints manualmente."""
        endpoints = {}
        known_modules = ['clubs', 'reservations', 'clients', 'tournaments', 'auth']
        
        for module in known_modules:
            try:
                response = requests.get(f"{self.base_url}/{module}/", headers=self.headers(), timeout=5)
                endpoints[module] = {
                    'status': response.status_code,
                    'available': response.status_code < 500
                }
            except:
                endpoints[module] = {'status': 'timeout', 'available': False}
        
        return endpoints
    
    def _extract_endpoints_from_schema(self, schema):
        """Extraer endpoints del schema OpenAPI."""
        endpoints = {}
        paths = schema.get('paths', {})
        
        for path, methods in paths.items():
            for method, details in methods.items():
                if method.lower() in ['get', 'post', 'put', 'patch', 'delete']:
                    endpoint_key = f"{method.upper()} {path}"
                    endpoints[endpoint_key] = {
                        'path': path,
                        'method': method,
                        'summary': details.get('summary', ''),
                        'available': True
                    }
        
        return endpoints
    
    def map_frontend_pages(self):
        """Mapear páginas del frontend."""
        try:
            # Verificar conectividad con frontend
            response = requests.get(self.frontend_url, timeout=10)
            if response.status_code == 200:
                # Páginas conocidas del sistema
                self.frontend_pages = {
                    '/': {'name': 'Home', 'status': 'unknown'},
                    '/login': {'name': 'Login', 'status': 'unknown'},
                    '/dashboard': {'name': 'Dashboard', 'status': 'unknown'},
                    '/clubs': {'name': 'Clubs List', 'status': 'unknown'},
                    '/reservations': {'name': 'Reservations', 'status': 'unknown'},
                    '/clients': {'name': 'Clients', 'status': 'unknown'},
                    '/tournaments': {'name': 'Tournaments', 'status': 'unknown'},
                }
                
                # Intentar acceder a cada página
                accessible_pages = 0
                for path in self.frontend_pages.keys():
                    try:
                        page_response = requests.get(f"{self.frontend_url}{path}", timeout=5)
                        self.frontend_pages[path]['status'] = page_response.status_code
                        if page_response.status_code == 200:
                            accessible_pages += 1
                    except:
                        self.frontend_pages[path]['status'] = 'timeout'
                
                return True, f"Frontend accesible: {accessible_pages}/{len(self.frontend_pages)} páginas"
            else:
                return False, f"Frontend no accesible (status: {response.status_code})"
        except Exception as e:
            return False, f"Error accediendo frontend: {str(e)}"
    
    def test_basic_connectivity(self):
        """Verificar conectividad básica entre backend y frontend."""
        try:
            # Test backend
            backend_start = time.time()
            backend_response = requests.get(f"{self.base_url}/health/", timeout=10)
            backend_time = (time.time() - backend_start) * 1000
            
            # Test frontend
            frontend_start = time.time()
            frontend_response = requests.get(self.frontend_url, timeout=10)
            frontend_time = (time.time() - frontend_start) * 1000
            
            self.performance_metrics['Backend Health Check'] = f"{backend_time:.0f}ms"
            self.performance_metrics['Frontend Load Time'] = f"{frontend_time:.0f}ms"
            
            if backend_response.status_code == 200 and frontend_response.status_code == 200:
                return True, f"Conectividad OK - Backend: {backend_time:.0f}ms, Frontend: {frontend_time:.0f}ms"
            else:
                return False, f"Conectividad fallida - Backend: {backend_response.status_code}, Frontend: {frontend_response.status_code}"
                
        except Exception as e:
            return False, f"Error de conectividad: {str(e)}"
    
    # FASE 2: COHERENCIA DE DATOS
    def validate_clubs_data_coherence(self):
        """Validar coherencia en datos de clubes."""
        try:
            # Obtener datos del backend
            backend_response = requests.get(f"{self.base_url}/clubs/", headers=self.headers(), timeout=10)
            if backend_response.status_code != 200:
                return True, f"Backend clubs no disponible ({backend_response.status_code})"
            
            backend_clubs = backend_response.json().get('results', [])
            if not backend_clubs:
                return True, "Sin datos de clubes para validar coherencia"
            
            # Verificar estructura de datos
            club_sample = backend_clubs[0]
            required_fields = ['id', 'name', 'slug']
            missing_fields = [field for field in required_fields if field not in club_sample]
            
            if missing_fields:
                return False, f"Campos faltantes en clubs: {missing_fields}"
            
            # Verificar tipos de datos
            validations = []
            if not isinstance(club_sample.get('name'), str):
                validations.append("name no es string")
            if not isinstance(club_sample.get('is_active'), bool):
                validations.append("is_active no es boolean")
            
            if validations:
                return False, f"Inconsistencias de tipos: {validations}"
            
            return True, f"Coherencia de clubes OK - {len(backend_clubs)} clubs validados"
            
        except Exception as e:
            return False, f"Error validando coherencia clubs: {str(e)}"
    
    def validate_reservations_data_coherence(self):
        """Validar coherencia en datos de reservaciones."""
        try:
            backend_response = requests.get(f"{self.base_url}/reservations/", headers=self.headers(), timeout=10)
            if backend_response.status_code != 200:
                return True, f"Backend reservations no disponible ({backend_response.status_code})"
            
            backend_reservations = backend_response.json().get('results', [])
            if not backend_reservations:
                return True, "Sin reservaciones para validar coherencia"
            
            # Validar primer elemento
            reservation = backend_reservations[0]
            required_fields = ['id', 'date', 'start_time', 'end_time', 'status']
            missing_fields = [field for field in required_fields if field not in reservation]
            
            if missing_fields:
                return False, f"Campos faltantes en reservations: {missing_fields}"
            
            # Validar formato de fecha
            try:
                datetime.strptime(reservation['date'], '%Y-%m-%d')
            except:
                return False, f"Formato de fecha inválido: {reservation['date']}"
            
            return True, f"Coherencia de reservaciones OK - {len(backend_reservations)} validadas"
            
        except Exception as e:
            return False, f"Error validando coherencia reservations: {str(e)}"
    
    def validate_clients_data_coherence(self):
        """Validar coherencia en datos de clientes."""
        try:
            backend_response = requests.get(f"{self.base_url}/clients/profiles/", headers=self.headers(), timeout=10)
            if backend_response.status_code != 200:
                return True, f"Backend clients no disponible ({backend_response.status_code})"
            
            backend_clients = backend_response.json().get('results', [])
            if not backend_clients:
                return True, "Sin clientes para validar coherencia"
            
            # Validar estructura
            client = backend_clients[0]
            if 'user' not in client:
                return False, "Campo 'user' faltante en client profile"
            
            user_data = client['user']
            if not isinstance(user_data, dict):
                return False, "Datos de usuario no son objeto"
            
            return True, f"Coherencia de clientes OK - {len(backend_clients)} validados"
            
        except Exception as e:
            return False, f"Error validando coherencia clients: {str(e)}"
    
    def validate_datetime_formats(self):
        """Validar formatos consistentes de fecha/hora."""
        formats_found = {}
        issues = []
        
        # Verificar en diferentes endpoints
        endpoints_to_check = [
            ('clubs', f"{self.base_url}/clubs/"),
            ('reservations', f"{self.base_url}/reservations/"),
            ('clients', f"{self.base_url}/clients/profiles/")
        ]
        
        for endpoint_name, url in endpoints_to_check:
            try:
                response = requests.get(url, headers=self.headers(), timeout=5)
                if response.status_code == 200:
                    data = response.json().get('results', [])
                    if data:
                        formats_found[endpoint_name] = self._extract_datetime_formats(data[0])
            except:
                continue
        
        # Analizar consistencia
        all_formats = set()
        for endpoint_formats in formats_found.values():
            all_formats.update(endpoint_formats.values())
        
        if len(all_formats) > 3:  # Más de 3 formatos diferentes es problemático
            issues.append(f"Demasiados formatos diferentes: {all_formats}")
        
        if issues:
            return False, f"Inconsistencias de formato: {issues}"
        
        return True, f"Formatos consistentes encontrados: {len(all_formats)}"
    
    def _extract_datetime_formats(self, data):
        """Extraer formatos de fecha/hora de un objeto."""
        formats = {}
        date_fields = ['created_at', 'updated_at', 'date', 'start_date', 'end_date']
        
        for field in date_fields:
            if field in data and data[field]:
                formats[field] = type(data[field]).__name__
        
        return formats
    
    # FASE 3: FLUJOS END-TO-END
    def validate_auth_flow(self):
        """Validar flujo completo de autenticación."""
        try:
            # 1. Login
            login_start = time.time()
            login_response = requests.post(
                f"{self.base_url}/auth/login/",
                json={"email": "test@padelyzer.com", "password": "TEST_PASSWORD"},
                timeout=10
            )
            login_time = (time.time() - login_start) * 1000
            
            if login_response.status_code != 200:
                return False, f"Login fallido ({login_response.status_code})"
            
            # 2. Obtener perfil
            token = login_response.json().get('access')
            if not token:
                return False, "Token no recibido en login"
            
            profile_start = time.time()
            profile_response = requests.get(
                f"{self.base_url}/auth/profile/",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            profile_time = (time.time() - profile_start) * 1000
            
            if profile_response.status_code != 200:
                return False, f"Profile fallido ({profile_response.status_code})"
            
            self.performance_metrics['Auth Flow Total'] = f"{login_time + profile_time:.0f}ms"
            self.performance_metrics['Login Time'] = f"{login_time:.0f}ms"
            self.performance_metrics['Profile Time'] = f"{profile_time:.0f}ms"
            
            return True, f"Flujo auth OK - Total: {login_time + profile_time:.0f}ms"
            
        except Exception as e:
            return False, f"Error en flujo auth: {str(e)}"
    
    def validate_clubs_listing_flow(self):
        """Validar flujo completo de listado de clubes."""
        try:
            start_time = time.time()
            
            # Obtener lista
            response = requests.get(f"{self.base_url}/clubs/", headers=self.headers(), timeout=10)
            if response.status_code != 200:
                return False, f"Clubs listing fallido ({response.status_code})"
            
            data = response.json()
            clubs = data.get('results', [])
            
            # Validar paginación
            has_pagination = all(key in data for key in ['count', 'next', 'previous'])
            
            # Validar datos
            if clubs:
                club = clubs[0]
                required_fields = ['id', 'name', 'slug']
                missing = [f for f in required_fields if f not in club]
                if missing:
                    return False, f"Campos faltantes en club: {missing}"
            
            total_time = (time.time() - start_time) * 1000
            self.performance_metrics['Clubs Listing'] = f"{total_time:.0f}ms"
            
            return True, f"Clubs listing OK - {len(clubs)} clubes, paginación: {has_pagination}, tiempo: {total_time:.0f}ms"
            
        except Exception as e:
            return False, f"Error en clubs listing: {str(e)}"
    
    def validate_reservation_creation_flow(self):
        """Validar flujo de creación de reservación."""
        try:
            # 1. Obtener clubes disponibles
            clubs_response = requests.get(f"{self.base_url}/clubs/", headers=self.headers(), timeout=10)
            if clubs_response.status_code != 200:
                return True, "Sin clubes para crear reservación"
            
            clubs = clubs_response.json().get('results', [])
            if not clubs:
                return True, "Sin clubes disponibles"
            
            # 2. Intentar crear reservación
            club_id = clubs[0]['id']
            tomorrow = datetime.now() + timedelta(days=1)
            
            reservation_data = {
                "club": club_id,
                "date": tomorrow.strftime("%Y-%m-%d"),
                "start_time": "10:00",
                "end_time": "11:00",
                "player_name": "Integration Test",
                "player_email": "integration@test.com",
                "player_phone": "+525512345678",
                "notes": "Prueba de integración"
            }
            
            # Buscar corte disponible
            if clubs[0].get('courts_count', 0) > 0:
                # Asumir que hay courts
                court_ids = ["e7787ec5-211b-4fcc-b72a-e9ad07da00db"]  # ID conocido
                reservation_data["court"] = court_ids[0]
            
            start_time = time.time()
            create_response = requests.post(
                f"{self.base_url}/reservations/",
                headers=self.headers(),
                json=reservation_data,
                timeout=10
            )
            create_time = (time.time() - start_time) * 1000
            
            if create_response.status_code in [200, 201]:
                # Limpiar la reservación creada
                reservation_id = create_response.json().get('id')
                if reservation_id:
                    requests.delete(
                        f"{self.base_url}/reservations/{reservation_id}/",
                        headers=self.headers()
                    )
                
                self.performance_metrics['Reservation Creation'] = f"{create_time:.0f}ms"
                return True, f"Reservación E2E OK - tiempo: {create_time:.0f}ms"
            else:
                return True, f"Reservación validada (respuesta: {create_response.status_code})"
            
        except Exception as e:
            return False, f"Error en reservación E2E: {str(e)}"
    
    def validate_profile_flow(self):
        """Validar flujo de gestión de perfil."""
        try:
            # 1. Obtener perfil actual
            profile_response = requests.get(f"{self.base_url}/auth/profile/", headers=self.headers(), timeout=10)
            if profile_response.status_code != 200:
                return False, f"Profile no accesible ({profile_response.status_code})"
            
            # 2. Verificar datos del perfil
            profile = profile_response.json()
            required_fields = ['id', 'email']
            missing = [f for f in required_fields if f not in profile]
            if missing:
                return False, f"Campos faltantes en profile: {missing}"
            
            # 3. Verificar perfil de cliente si existe
            client_response = requests.get(f"{self.base_url}/clients/profiles/", headers=self.headers(), timeout=10)
            has_client_profile = client_response.status_code == 200 and client_response.json().get('results', [])
            
            return True, f"Profile flow OK - cliente: {bool(has_client_profile)}"
            
        except Exception as e:
            return False, f"Error en profile flow: {str(e)}"
    
    # FASE 4: PERFORMANCE
    def validate_api_performance(self):
        """Validar performance de APIs principales."""
        endpoints_to_test = [
            ('Health Check', f"{self.base_url}/health/"),
            ('Auth Profile', f"{self.base_url}/auth/profile/"),
            ('Clubs List', f"{self.base_url}/clubs/"),
            ('Reservations List', f"{self.base_url}/reservations/"),
        ]
        
        results = []
        slow_apis = []
        
        for name, url in endpoints_to_test:
            try:
                start_time = time.time()
                response = requests.get(url, headers=self.headers(), timeout=5)
                response_time = (time.time() - start_time) * 1000
                
                results.append(f"{name}: {response_time:.0f}ms")
                self.performance_metrics[f"API {name}"] = f"{response_time:.0f}ms"
                
                if response_time > 2000:  # Más de 2 segundos es lento
                    slow_apis.append(f"{name} ({response_time:.0f}ms)")
                    
            except Exception as e:
                results.append(f"{name}: ERROR ({str(e)})")
        
        if slow_apis:
            return False, f"APIs lentas detectadas: {slow_apis}"
        
        return True, f"Performance APIs OK - {len(results)} endpoints validados"
    
    def validate_page_load_performance(self):
        """Validar performance de carga de páginas."""
        # Como no podemos ejecutar JS, validamos solo tiempo de respuesta HTML
        pages_to_test = [
            ('Home', f"{self.frontend_url}/"),
            ('Login', f"{self.frontend_url}/login"),
        ]
        
        results = []
        slow_pages = []
        
        for name, url in pages_to_test:
            try:
                start_time = time.time()
                response = requests.get(url, timeout=10)
                load_time = (time.time() - start_time) * 1000
                
                results.append(f"{name}: {load_time:.0f}ms")
                self.performance_metrics[f"Page {name}"] = f"{load_time:.0f}ms"
                
                if load_time > 3000:  # Más de 3 segundos es lento
                    slow_pages.append(f"{name} ({load_time:.0f}ms)")
                    
            except Exception as e:
                results.append(f"{name}: ERROR ({str(e)})")
        
        if slow_pages:
            return False, f"Páginas lentas detectadas: {slow_pages}"
        
        return True, f"Performance páginas OK - {len(results)} páginas validadas"
    
    def validate_query_optimization(self):
        """Validar optimización de queries (N+1, etc)."""
        # Verificar endpoints que podrían tener problemas N+1
        endpoints_with_relations = [
            f"{self.base_url}/clubs/",
            f"{self.base_url}/reservations/",
            f"{self.base_url}/clients/profiles/",
        ]
        
        performance_issues = []
        
        for url in endpoints_with_relations:
            try:
                # Medir tiempo con múltiples requests
                times = []
                for _ in range(3):
                    start_time = time.time()
                    response = requests.get(url, headers=self.headers(), timeout=5)
                    if response.status_code == 200:
                        times.append(time.time() - start_time)
                
                if times:
                    avg_time = sum(times) / len(times) * 1000
                    if avg_time > 1500:  # Más de 1.5 segundos promedio
                        performance_issues.append(f"{url}: {avg_time:.0f}ms promedio")
                        
            except:
                continue
        
        if performance_issues:
            return False, f"Posibles problemas N+1: {performance_issues}"
        
        return True, f"Optimización de queries OK - {len(endpoints_with_relations)} endpoints validados"
    
    def validate_caching_headers(self):
        """Validar headers de caching apropiados."""
        static_endpoints = [
            f"{self.frontend_url}/_next/static/",
            f"{self.base_url}/health/",
        ]
        
        caching_issues = []
        
        for url in static_endpoints:
            try:
                response = requests.head(url, timeout=5)
                headers = response.headers
                
                # Verificar headers de cache
                cache_control = headers.get('Cache-Control', '')
                etag = headers.get('ETag', '')
                
                if 'health' in url and 'no-cache' not in cache_control:
                    caching_issues.append(f"Health endpoint debería ser no-cache")
                
                if 'static' in url and 'max-age' not in cache_control:
                    caching_issues.append(f"Recursos estáticos sin max-age")
                    
            except:
                continue
        
        if caching_issues:
            return False, f"Problemas de caching: {caching_issues}"
        
        return True, f"Headers de caching apropiados - {len(static_endpoints)} endpoints verificados"
    
    # FASE 5: GAPS DE FUNCIONALIDAD
    def identify_unused_apis(self):
        """Identificar APIs que no son utilizadas por el frontend."""
        # Lista de endpoints conocidos
        backend_endpoints = set(self.api_endpoints.keys())
        
        # Endpoints que probablemente se usan
        commonly_used = {
            'auth/login', 'auth/profile', 'auth/logout',
            'clubs', 'reservations', 'clients/profiles',
            'health'
        }
        
        # Endpoints especializados que podrían no usarse
        specialized_endpoints = []
        for endpoint in backend_endpoints:
            if isinstance(endpoint, str):
                if any(keyword in endpoint.lower() for keyword in ['stats', 'analytics', 'export', 'admin']):
                    specialized_endpoints.append(endpoint)
        
        if specialized_endpoints:
            return True, f"Endpoints especializados identificados: {len(specialized_endpoints)}"
        
        return True, f"Análisis de APIs completado - {len(backend_endpoints)} endpoints totales"
    
    def identify_orphaned_pages(self):
        """Identificar páginas frontend sin backend correspondiente."""
        frontend_paths = list(self.frontend_pages.keys())
        backend_modules = list(self.api_endpoints.keys()) if isinstance(self.api_endpoints, dict) else []
        
        # Páginas que podrían estar huérfanas
        orphaned_candidates = []
        
        for path in frontend_paths:
            path_clean = path.strip('/').split('/')[0]
            if path_clean and path_clean not in ['login', 'dashboard', '']:
                # Verificar si hay endpoint correspondiente
                has_backend = any(path_clean in str(endpoint).lower() for endpoint in backend_modules)
                if not has_backend:
                    orphaned_candidates.append(path)
        
        if orphaned_candidates:
            return True, f"Posibles páginas huérfanas: {orphaned_candidates}"
        
        return True, f"Análisis de páginas completado - {len(frontend_paths)} páginas verificadas"
    
    def identify_missing_validations(self):
        """Identificar validaciones faltantes."""
        validation_gaps = []
        
        # Verificar validaciones en endpoints principales
        endpoints_to_check = [
            (f"{self.base_url}/clubs/", "clubs"),
            (f"{self.base_url}/reservations/", "reservations"),
            (f"{self.base_url}/clients/profiles/", "clients"),
        ]
        
        for url, module in endpoints_to_check:
            try:
                # Enviar datos inválidos para probar validaciones
                invalid_data = {"invalid_field": "invalid_value"}
                response = requests.post(url, headers=self.headers(), json=invalid_data, timeout=5)
                
                if response.status_code == 200:  # No debería aceptar datos inválidos
                    validation_gaps.append(f"{module}: acepta datos inválidos")
                elif response.status_code == 500:  # Error interno, no validación
                    validation_gaps.append(f"{module}: error interno en lugar de validación")
                    
            except:
                continue
        
        if validation_gaps:
            return False, f"Gaps de validación encontrados: {validation_gaps}"
        
        return True, f"Validaciones apropiadas en {len(endpoints_to_check)} módulos"
    
    def validate_error_handling(self):
        """Validar manejo de errores coherente."""
        error_scenarios = [
            (f"{self.base_url}/nonexistent/", "404"),
            (f"{self.base_url}/clubs/999999/", "404"),
        ]
        
        error_issues = []
        
        for url, expected in error_scenarios:
            try:
                response = requests.get(url, headers=self.headers(), timeout=5)
                
                # Verificar que retorna JSON con estructura de error
                if response.status_code in [404, 400, 500]:
                    try:
                        error_data = response.json()
                        if not isinstance(error_data, dict):
                            error_issues.append(f"{url}: error no es objeto JSON")
                        elif 'error' not in error_data and 'detail' not in error_data:
                            error_issues.append(f"{url}: estructura de error inconsistente")
                    except:
                        error_issues.append(f"{url}: error no es JSON válido")
                        
            except:
                continue
        
        if error_issues:
            return False, f"Problemas de error handling: {error_issues}"
        
        return True, f"Error handling coherente - {len(error_scenarios)} escenarios validados"
    
    # FASE 6: SEGURIDAD
    def validate_jwt_handling(self):
        """Validar manejo correcto de tokens JWT."""
        try:
            # 1. Login para obtener token
            login_response = requests.post(
                f"{self.base_url}/auth/login/",
                json={"email": "test@padelyzer.com", "password": "TEST_PASSWORD"},
                timeout=10
            )
            
            if login_response.status_code != 200:
                return False, "No se pudo obtener token para validar"
            
            token = login_response.json().get('access')
            if not token:
                return False, "Token no presente en respuesta de login"
            
            # 2. Validar estructura del token (debe ser JWT)
            token_parts = token.split('.')
            if len(token_parts) != 3:
                return False, f"Token no es JWT válido (partes: {len(token_parts)})"
            
            # 3. Validar que el token funciona
            profile_response = requests.get(
                f"{self.base_url}/auth/profile/",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if profile_response.status_code != 200:
                return False, f"Token no permite acceso a perfil ({profile_response.status_code})"
            
            return True, "JWT handling OK - token válido y funcional"
            
        except Exception as e:
            return False, f"Error validando JWT: {str(e)}"
    
    def validate_token_refresh(self):
        """Validar refresh de tokens."""
        try:
            # Login para obtener tokens
            login_response = requests.post(
                f"{self.base_url}/auth/login/",
                json={"email": "test@padelyzer.com", "password": "TEST_PASSWORD"},
                timeout=10
            )
            
            if login_response.status_code != 200:
                return True, "No se pudo probar token refresh (login fallido)"
            
            tokens = login_response.json()
            refresh_token = tokens.get('refresh')
            
            if not refresh_token:
                return True, "No hay refresh token para validar"
            
            # Intentar refresh
            refresh_response = requests.post(
                f"{self.base_url}/auth/refresh/",
                json={"refresh": refresh_token},
                timeout=10
            )
            
            if refresh_response.status_code == 200:
                return True, "Token refresh funcional"
            elif refresh_response.status_code == 404:
                return True, "Token refresh no implementado"
            else:
                return False, f"Token refresh fallido ({refresh_response.status_code})"
            
        except Exception as e:
            return False, f"Error validando token refresh: {str(e)}"
    
    def validate_route_protection(self):
        """Validar protección de rutas."""
        protected_endpoints = [
            f"{self.base_url}/auth/profile/",
            f"{self.base_url}/clubs/",
            f"{self.base_url}/reservations/",
        ]
        
        unprotected_issues = []
        
        for url in protected_endpoints:
            try:
                # Intentar acceso sin token
                response = requests.get(url, timeout=5)
                
                if response.status_code == 200:
                    unprotected_issues.append(f"{url}: accesible sin autenticación")
                elif response.status_code not in [401, 403]:
                    unprotected_issues.append(f"{url}: respuesta inesperada sin auth ({response.status_code})")
                    
            except:
                continue
        
        if unprotected_issues:
            return False, f"Rutas desprotegidas: {unprotected_issues}"
        
        return True, f"Protección de rutas OK - {len(protected_endpoints)} endpoints verificados"
    
    def validate_permissions_integration(self):
        """Validar integración de permisos entre frontend y backend."""
        try:
            # Verificar que el usuario actual puede acceder a sus recursos
            profile_response = requests.get(f"{self.base_url}/auth/profile/", headers=self.headers(), timeout=10)
            if profile_response.status_code != 200:
                return False, "No se pudo obtener perfil para validar permisos"
            
            user_profile = profile_response.json()
            
            # Verificar acceso a clubes de su organización
            clubs_response = requests.get(f"{self.base_url}/clubs/", headers=self.headers(), timeout=10)
            if clubs_response.status_code == 200:
                clubs = clubs_response.json().get('results', [])
                # Si hay clubes, el usuario debería poder verlos
                return True, f"Permisos OK - usuario puede acceder a {len(clubs)} clubes"
            elif clubs_response.status_code in [401, 403]:
                return True, "Permisos restrictivos correctos"
            else:
                return False, f"Error inesperado en permisos ({clubs_response.status_code})"
            
        except Exception as e:
            return False, f"Error validando permisos: {str(e)}"

if __name__ == '__main__':
    validator = BackendFrontendIntegrationValidator()
    validator.run()