# 📚 API Documentation Tests

## 📋 Resumen

Esta guía detalla los tests para la documentación de API, incluyendo validación de OpenAPI/Swagger, ejemplos de código, contratos de API y documentación interactiva.

## 🎯 Objetivos de Testing

### Cobertura Target: 100%
- **Schema Validation**: 100% - Todos los endpoints documentados
- **Example Testing**: 90% - Ejemplos funcionales
- **Contract Testing**: 95% - Validación de contratos
- **Documentation Quality**: 85% - Claridad y completitud

### Componentes a Cubrir
- ✅ OpenAPI/Swagger Schema
- ✅ API Examples
- ✅ Request/Response Validation
- ✅ Authentication Documentation
- ✅ Error Response Documentation
- ✅ Versioning Documentation
- ✅ Rate Limiting Documentation
- ✅ SDK Generation Testing

## 🧪 Unit Tests

### 1. Schema Validation Tests
```python
# backend/tests/unit/docs/test_schema_validation.py
from django.test import TestCase
from rest_framework.test import APIRequestFactory
from apps.api.schema import SchemaGenerator, SchemaValidator
from openapi_spec_validator import validate_spec
import yaml
import json

class OpenAPISchemaTest(TestCase):
    """Test OpenAPI schema generation and validation"""
    
    def setUp(self):
        self.generator = SchemaGenerator()
        self.validator = SchemaValidator()
        
    def test_generate_valid_openapi_schema(self):
        """Test that generated schema is valid OpenAPI 3.0"""
        schema = self.generator.get_schema()
        
        # Validate against OpenAPI 3.0 spec
        try:
            validate_spec(schema)
        except Exception as e:
            self.fail(f"Schema validation failed: {e}")
            
        # Check required fields
        self.assertIn('openapi', schema)
        self.assertIn('info', schema)
        self.assertIn('paths', schema)
        self.assertIn('components', schema)
        
        # Verify version
        self.assertEqual(schema['openapi'], '3.0.3')
        
    def test_all_endpoints_documented(self):
        """Test that all API endpoints are documented"""
        from django.urls import get_resolver
        from rest_framework.views import APIView
        
        # Get all URL patterns
        resolver = get_resolver()
        url_patterns = self._get_all_patterns(resolver)
        
        # Get documented paths
        schema = self.generator.get_schema()
        documented_paths = set(schema['paths'].keys())
        
        # Check all API endpoints are documented
        api_patterns = [p for p in url_patterns if p.startswith('/api/')]
        undocumented = []
        
        for pattern in api_patterns:
            # Convert Django URL pattern to OpenAPI path
            openapi_path = self._convert_to_openapi_path(pattern)
            if openapi_path not in documented_paths:
                undocumented.append(pattern)
                
        self.assertEqual(
            len(undocumented), 
            0, 
            f"Undocumented endpoints: {undocumented}"
        )
        
    def test_schema_completeness(self):
        """Test schema completeness for each endpoint"""
        schema = self.generator.get_schema()
        
        for path, methods in schema['paths'].items():
            for method, operation in methods.items():
                # Check operation ID
                self.assertIn(
                    'operationId', 
                    operation,
                    f"{method.upper()} {path} missing operationId"
                )
                
                # Check summary and description
                self.assertIn(
                    'summary',
                    operation,
                    f"{method.upper()} {path} missing summary"
                )
                
                # Check parameters
                if method in ['get', 'delete']:
                    if '{' in path:  # Has path parameters
                        self.assertIn('parameters', operation)
                        
                # Check request body for POST/PUT/PATCH
                if method in ['post', 'put', 'patch']:
                    self.assertIn(
                        'requestBody',
                        operation,
                        f"{method.upper()} {path} missing requestBody"
                    )
                    
                # Check responses
                self.assertIn('responses', operation)
                self.assertIn('200', operation['responses'])

class SchemaComponentTest(TestCase):
    """Test schema components and definitions"""
    
    def test_model_schemas(self):
        """Test model schema definitions"""
        schema = SchemaGenerator().get_schema()
        components = schema['components']['schemas']
        
        # Check core models are defined
        required_models = [
            'User', 'Club', 'Court', 'Reservation',
            'Payment', 'Tournament', 'Class'
        ]
        
        for model in required_models:
            self.assertIn(model, components)
            
            # Check model has required fields
            model_schema = components[model]
            self.assertIn('type', model_schema)
            self.assertIn('properties', model_schema)
            
            if 'required' in model_schema:
                self.assertIsInstance(model_schema['required'], list)
                
    def test_enum_definitions(self):
        """Test enum definitions in schema"""
        schema = SchemaGenerator().get_schema()
        components = schema['components']['schemas']
        
        # Check enums
        enums = {
            'ReservationStatus': ['pending', 'confirmed', 'cancelled', 'completed'],
            'PaymentStatus': ['pending', 'processing', 'completed', 'failed', 'refunded'],
            'UserRole': ['player', 'coach', 'staff', 'admin']
        }
        
        for enum_name, values in enums.items():
            self.assertIn(enum_name, components)
            enum_schema = components[enum_name]
            self.assertEqual(enum_schema['type'], 'string')
            self.assertEqual(set(enum_schema['enum']), set(values))
            
    def test_response_schemas(self):
        """Test response schema definitions"""
        schema = SchemaGenerator().get_schema()
        components = schema['components']['schemas']
        
        # Check common response schemas
        response_schemas = [
            'ErrorResponse',
            'PaginatedResponse',
            'ValidationErrorResponse',
            'SuccessResponse'
        ]
        
        for response_schema in response_schemas:
            self.assertIn(response_schema, components)
            
        # Verify error response structure
        error_schema = components['ErrorResponse']
        self.assertIn('error', error_schema['properties'])
        self.assertIn('message', error_schema['properties']['error']['properties'])
        self.assertIn('code', error_schema['properties']['error']['properties'])
```

### 2. Example Validation Tests
```python
# backend/tests/unit/docs/test_examples.py
from django.test import TestCase
from apps.api.docs import ExampleValidator, ExampleGenerator
import json

class APIExampleTest(TestCase):
    """Test API documentation examples"""
    
    def setUp(self):
        self.validator = ExampleValidator()
        self.generator = ExampleGenerator()
        
    def test_request_examples_valid(self):
        """Test that all request examples are valid"""
        schema = SchemaGenerator().get_schema()
        
        for path, methods in schema['paths'].items():
            for method, operation in methods.items():
                if 'requestBody' in operation:
                    content = operation['requestBody'].get('content', {})
                    
                    for media_type, media_schema in content.items():
                        if 'example' in media_schema:
                            example = media_schema['example']
                            
                            # Validate example against schema
                            is_valid, errors = self.validator.validate_example(
                                example,
                                media_schema.get('schema')
                            )
                            
                            self.assertTrue(
                                is_valid,
                                f"Invalid example for {method.upper()} {path}: {errors}"
                            )
                            
    def test_response_examples_valid(self):
        """Test that all response examples are valid"""
        schema = SchemaGenerator().get_schema()
        
        for path, methods in schema['paths'].items():
            for method, operation in methods.items():
                responses = operation.get('responses', {})
                
                for status_code, response in responses.items():
                    content = response.get('content', {})
                    
                    for media_type, media_schema in content.items():
                        if 'example' in media_schema:
                            example = media_schema['example']
                            
                            # Validate example
                            is_valid, errors = self.validator.validate_example(
                                example,
                                media_schema.get('schema')
                            )
                            
                            self.assertTrue(
                                is_valid,
                                f"Invalid response example for {method.upper()} {path} ({status_code}): {errors}"
                            )
                            
    def test_example_completeness(self):
        """Test examples cover all fields"""
        schema = SchemaGenerator().get_schema()
        
        # Check model examples
        for model_name, model_schema in schema['components']['schemas'].items():
            if model_schema.get('type') == 'object':
                example = self.generator.generate_example(model_schema)
                
                # Verify all required fields are in example
                required_fields = model_schema.get('required', [])
                for field in required_fields:
                    self.assertIn(
                        field,
                        example,
                        f"Required field '{field}' missing in {model_name} example"
                    )
                    
    def test_realistic_examples(self):
        """Test examples use realistic data"""
        examples = {
            'User': {
                'email': 'john.doe@example.com',
                'first_name': 'John',
                'last_name': 'Doe'
            },
            'Reservation': {
                'date': '2023-12-15',
                'start_time': '10:00',
                'duration': 90
            },
            'Payment': {
                'amount': 35.50,
                'currency': 'EUR',
                'status': 'completed'
            }
        }
        
        schema = SchemaGenerator().get_schema()
        
        for model_name, expected_fields in examples.items():
            model_examples = self._find_model_examples(schema, model_name)
            
            for example in model_examples:
                for field, expected_pattern in expected_fields.items():
                    if field in example:
                        # Check realistic values
                        if field == 'email':
                            self.assertRegex(
                                example[field],
                                r'^[\w\.-]+@[\w\.-]+\.\w+$'
                            )
                        elif field == 'date':
                            self.assertRegex(
                                example[field],
                                r'^\d{4}-\d{2}-\d{2}$'
                            )
```

### 3. Contract Testing
```python
# backend/tests/unit/docs/test_contracts.py
from django.test import TestCase
from apps.api.contracts import ContractValidator, ContractGenerator

class APIContractTest(TestCase):
    """Test API contract validation"""
    
    def setUp(self):
        self.validator = ContractValidator()
        
    def test_backwards_compatibility(self):
        """Test API maintains backwards compatibility"""
        # Load previous version schema
        with open('docs/api/v1/schema.json', 'r') as f:
            v1_schema = json.load(f)
            
        # Get current schema
        current_schema = SchemaGenerator().get_schema()
        
        # Check backwards compatibility
        breaking_changes = self.validator.find_breaking_changes(
            v1_schema,
            current_schema
        )
        
        self.assertEqual(
            len(breaking_changes),
            0,
            f"Breaking changes detected: {breaking_changes}"
        )
        
    def test_response_field_consistency(self):
        """Test response fields are consistent across endpoints"""
        schema = SchemaGenerator().get_schema()
        
        # Check common fields across similar endpoints
        user_endpoints = [
            '/api/v1/users/{id}/',
            '/api/v1/users/me/',
            '/api/v1/auth/register/'
        ]
        
        user_fields = {}
        
        for endpoint in user_endpoints:
            if endpoint in schema['paths']:
                response_schema = self._get_response_schema(
                    schema,
                    endpoint,
                    'get' if 'me' in endpoint or '{id}' in endpoint else 'post'
                )
                
                if response_schema:
                    fields = set(response_schema.get('properties', {}).keys())
                    user_fields[endpoint] = fields
                    
        # Verify common fields exist in all
        if len(user_fields) > 1:
            common_fields = set.intersection(*user_fields.values())
            expected_common = {'id', 'email', 'first_name', 'last_name'}
            
            self.assertTrue(
                expected_common.issubset(common_fields),
                "User endpoints missing common fields"
            )
            
    def test_error_response_consistency(self):
        """Test error responses are consistent"""
        schema = SchemaGenerator().get_schema()
        
        error_responses = []
        
        for path, methods in schema['paths'].items():
            for method, operation in methods.items():
                responses = operation.get('responses', {})
                
                # Check 4xx and 5xx responses
                for status_code in ['400', '401', '403', '404', '500']:
                    if status_code in responses:
                        error_schema = self._get_response_schema_for_status(
                            responses[status_code]
                        )
                        if error_schema:
                            error_responses.append({
                                'endpoint': f"{method.upper()} {path}",
                                'status': status_code,
                                'schema': error_schema
                            })
                            
        # Verify all error responses have consistent structure
        for error_resp in error_responses:
            schema = error_resp['schema']
            self.assertIn('error', schema.get('properties', {}))
            
            error_props = schema['properties']['error'].get('properties', {})
            self.assertIn('message', error_props)
            self.assertIn('code', error_props)
```

## 🔌 Integration Tests

### 1. Documentation Generation Tests
```python
# backend/tests/integration/docs/test_doc_generation.py
from rest_framework.test import APITestCase
from django.urls import reverse

class DocumentationGenerationTest(APITestCase):
    """Test API documentation generation"""
    
    def test_swagger_ui_accessible(self):
        """Test Swagger UI is accessible"""
        response = self.client.get('/api/docs/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('swagger', response.content.decode().lower())
        
    def test_openapi_json_endpoint(self):
        """Test OpenAPI JSON endpoint"""
        response = self.client.get('/api/schema/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        
        schema = response.json()
        self.assertEqual(schema['openapi'], '3.0.3')
        
    def test_redoc_documentation(self):
        """Test ReDoc documentation"""
        response = self.client.get('/api/redoc/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('redoc', response.content.decode().lower())
        
    def test_downloadable_schema(self):
        """Test schema can be downloaded"""
        # JSON format
        response = self.client.get('/api/schema/?format=json&download=true')
        self.assertEqual(response.status_code, 200)
        self.assertIn(
            'attachment',
            response.get('Content-Disposition', '')
        )
        
        # YAML format
        response = self.client.get('/api/schema/?format=yaml&download=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response['Content-Type'],
            'application/x-yaml'
        )

class APIExampleExecutionTest(APITestCase):
    """Test executing API examples from documentation"""
    
    def setUp(self):
        self.schema = SchemaGenerator().get_schema()
        self.create_test_data()
        
    def create_test_data(self):
        """Create data for example execution"""
        self.user = UserFactory()
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club)
        
    def test_execute_documented_examples(self):
        """Test executing examples from documentation"""
        # Get all examples from schema
        examples = self._extract_all_examples(self.schema)
        
        for example in examples:
            if example['type'] == 'request':
                # Skip authenticated endpoints for now
                if self._requires_auth(example['path'], example['method']):
                    self.client.force_authenticate(user=self.user)
                    
                # Execute request
                response = self._execute_example(example)
                
                # Verify response matches documented status
                expected_status = self._get_expected_status(
                    self.schema,
                    example['path'],
                    example['method']
                )
                
                self.assertIn(
                    response.status_code,
                    expected_status,
                    f"Unexpected status for {example['method'].upper()} {example['path']}"
                )
                
    def test_response_matches_schema(self):
        """Test actual responses match documented schema"""
        test_endpoints = [
            ('GET', '/api/v1/clubs/', None),
            ('GET', f'/api/v1/clubs/{self.club.id}/', None),
            ('GET', '/api/v1/courts/', {'club_id': self.club.id}),
        ]
        
        for method, path, params in test_endpoints:
            response = self.client.generic(
                method,
                path,
                data=params
            )
            
            # Get expected schema
            response_schema = self._get_response_schema(
                self.schema,
                path,
                method.lower(),
                str(response.status_code)
            )
            
            if response_schema:
                # Validate response
                is_valid, errors = self.validator.validate_response(
                    response.json(),
                    response_schema
                )
                
                self.assertTrue(
                    is_valid,
                    f"Response validation failed for {method} {path}: {errors}"
                )
```

### 2. SDK Generation Tests
```python
# backend/tests/integration/docs/test_sdk_generation.py
class SDKGenerationTest(TestCase):
    """Test SDK generation from OpenAPI schema"""
    
    def test_generate_python_sdk(self):
        """Test Python SDK generation"""
        from openapi_python_client import generate
        
        schema = SchemaGenerator().get_schema()
        
        # Generate Python client
        result = generate(
            url=None,
            path=None,
            custom_template_path=None,
            meta=schema
        )
        
        self.assertTrue(result.success)
        
        # Verify generated files
        expected_files = [
            'client.py',
            'models.py',
            'api/default_api.py',
            'requirements.txt'
        ]
        
        for file in expected_files:
            self.assertTrue(
                (result.output_dir / file).exists(),
                f"Expected file {file} not generated"
            )
            
    def test_generate_typescript_sdk(self):
        """Test TypeScript SDK generation"""
        import subprocess
        
        # Save schema
        schema_path = '/tmp/openapi.json'
        with open(schema_path, 'w') as f:
            json.dump(SchemaGenerator().get_schema(), f)
            
        # Generate TypeScript client
        result = subprocess.run([
            'npx',
            'openapi-generator-cli',
            'generate',
            '-i', schema_path,
            '-g', 'typescript-axios',
            '-o', '/tmp/ts-sdk'
        ], capture_output=True)
        
        self.assertEqual(result.returncode, 0)
        
        # Verify generated files
        import os
        generated_files = os.listdir('/tmp/ts-sdk')
        
        self.assertIn('api.ts', generated_files)
        self.assertIn('configuration.ts', generated_files)
        self.assertIn('index.ts', generated_files)
```

## 🔄 E2E Flow Tests

### 1. Interactive Documentation Test
```python
# backend/tests/e2e/docs/test_interactive_docs.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

class InteractiveDocsE2ETest(TestCase):
    """Test interactive API documentation"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = webdriver.Chrome()
        cls.wait = WebDriverWait(cls.driver, 10)
        
    def test_swagger_ui_interaction(self):
        """Test Swagger UI interactive features"""
        # Navigate to Swagger UI
        self.driver.get(f"{self.live_server_url}/api/docs/")
        
        # Wait for Swagger UI to load
        self.wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "swagger-ui"))
        )
        
        # Expand authentication section
        auth_section = self.driver.find_element(
            By.XPATH,
            "//span[contains(text(), 'Authentication')]"
        )
        auth_section.click()
        
        # Find login endpoint
        login_endpoint = self.driver.find_element(
            By.XPATH,
            "//span[@class='opblock-summary-path' and contains(text(), '/auth/login/')]"
        )
        login_endpoint.click()
        
        # Click "Try it out"
        try_button = self.driver.find_element(
            By.CLASS_NAME,
            "try-out__btn"
        )
        try_button.click()
        
        # Fill in example request
        request_body = self.driver.find_element(
            By.CLASS_NAME,
            "body-param__text"
        )
        request_body.clear()
        request_body.send_keys(json.dumps({
            "email": "test@example.com",
            "password": "testpass123"
        }))
        
        # Execute request
        execute_button = self.driver.find_element(
            By.CLASS_NAME,
            "execute"
        )
        execute_button.click()
        
        # Wait for response
        self.wait.until(
            EC.presence_of_element_located(
                (By.CLASS_NAME, "response-col_status")
            )
        )
        
        # Verify response displayed
        response_code = self.driver.find_element(
            By.CLASS_NAME,
            "response-col_status"
        ).text
        
        self.assertIn("200", response_code)
        
    def test_api_key_authentication_in_docs(self):
        """Test API key authentication in documentation"""
        self.driver.get(f"{self.live_server_url}/api/docs/")
        
        # Click authorize button
        auth_button = self.driver.find_element(
            By.CLASS_NAME,
            "authorize"
        )
        auth_button.click()
        
        # Enter API key
        api_key_input = self.driver.find_element(
            By.NAME,
            "apiKey"
        )
        api_key_input.send_keys("test-api-key-12345")
        
        # Submit
        authorize_button = self.driver.find_element(
            By.XPATH,
            "//button[contains(text(), 'Authorize')]"
        )
        authorize_button.click()
        
        # Verify authorized
        self.wait.until(
            EC.text_to_be_present_in_element(
                (By.CLASS_NAME, "authorized"),
                "Authorized"
            )
        )
```

### 2. Documentation Search Test
```python
# backend/tests/e2e/docs/test_doc_search.py
class DocumentationSearchE2ETest(TestCase):
    """Test documentation search functionality"""
    
    def test_search_in_documentation(self):
        """Test searching within API documentation"""
        self.driver.get(f"{self.live_server_url}/api/redoc/")
        
        # Wait for ReDoc to load
        self.wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "menu-content"))
        )
        
        # Use search
        search_box = self.driver.find_element(
            By.CLASS_NAME,
            "search-input"
        )
        search_box.send_keys("reservation")
        
        # Wait for search results
        self.wait.until(
            EC.presence_of_element_located(
                (By.CLASS_NAME, "search-results")
            )
        )
        
        # Verify results
        results = self.driver.find_elements(
            By.CLASS_NAME,
            "search-result"
        )
        
        self.assertGreater(len(results), 0)
        
        # Click first result
        results[0].click()
        
        # Verify navigation to reservation section
        self.wait.until(
            EC.url_contains("#tag/reservations")
        )
```

### 3. Multi-Language Documentation Test
```python
# backend/tests/e2e/docs/test_multilang_docs.py
class MultiLanguageDocsE2ETest(TestCase):
    """Test multi-language documentation support"""
    
    def test_documentation_language_switching(self):
        """Test switching documentation languages"""
        languages = ['en', 'es', 'fr']
        
        for lang in languages:
            # Access docs with language parameter
            response = self.client.get(
                f'/api/docs/?lang={lang}',
                HTTP_ACCEPT_LANGUAGE=f'{lang}'
            )
            
            self.assertEqual(response.status_code, 200)
            
            # Verify language-specific content
            content = response.content.decode()
            
            if lang == 'es':
                self.assertIn('Autenticación', content)
                self.assertIn('Respuesta', content)
            elif lang == 'fr':
                self.assertIn('Authentification', content)
                self.assertIn('Réponse', content)
            else:  # English
                self.assertIn('Authentication', content)
                self.assertIn('Response', content)
```

## 🔒 Security Tests

### Documentation Security Tests
```python
# backend/tests/security/docs/test_security.py
class DocumentationSecurityTest(TestCase):
    """Test documentation security"""
    
    def test_sensitive_data_not_exposed(self):
        """Test sensitive data is not exposed in examples"""
        schema = SchemaGenerator().get_schema()
        
        sensitive_patterns = [
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Real emails
            r'\b(?:\d{4}[-\s]?){3}\d{4}\b',  # Credit cards
            r'[A-Za-z0-9]{32,}',  # API keys/tokens
            r'password.*:.*\w+',  # Passwords
        ]
        
        # Check all examples
        examples = self._extract_all_examples(schema)
        
        for example in examples:
            example_str = json.dumps(example)
            
            for pattern in sensitive_patterns:
                matches = re.findall(pattern, example_str)
                
                # Filter out obvious test data
                real_matches = [
                    m for m in matches 
                    if not any(test in m.lower() for test in ['test', 'example', 'demo'])
                ]
                
                self.assertEqual(
                    len(real_matches),
                    0,
                    f"Potential sensitive data found: {real_matches}"
                )
                
    def test_internal_endpoints_not_documented(self):
        """Test internal endpoints are not in public docs"""
        schema = SchemaGenerator().get_schema()
        paths = schema['paths'].keys()
        
        internal_patterns = [
            r'/api/v\d+/internal/',
            r'/api/v\d+/admin/',
            r'/api/v\d+/debug/',
            r'/api/v\d+/_'
        ]
        
        for path in paths:
            for pattern in internal_patterns:
                self.assertNotRegex(
                    path,
                    pattern,
                    f"Internal endpoint {path} should not be documented"
                )
                
    def test_cors_headers_documented(self):
        """Test CORS configuration is documented"""
        schema = SchemaGenerator().get_schema()
        
        # Check servers section includes CORS info
        self.assertIn('servers', schema)
        
        # Check security schemes
        self.assertIn('components', schema)
        self.assertIn('securitySchemes', schema['components'])
        
        # Verify CORS is mentioned in description
        api_description = schema['info'].get('description', '')
        self.assertIn('cors', api_description.lower())
```

## 📊 Performance Tests

### Documentation Performance Tests
```python
# backend/tests/performance/docs/test_performance.py
class DocumentationPerformanceTest(TestCase):
    """Test documentation performance"""
    
    def test_schema_generation_performance(self):
        """Test schema generation performance"""
        import time
        
        # Warm up
        SchemaGenerator().get_schema()
        
        # Measure generation time
        start = time.time()
        schema = SchemaGenerator().get_schema()
        duration = time.time() - start
        
        # Should generate quickly even for large APIs
        self.assertLess(duration, 2.0)  # 2 seconds max
        
        # Verify schema size is reasonable
        schema_size = len(json.dumps(schema))
        self.assertLess(
            schema_size, 
            1024 * 1024,  # 1MB max
            "Schema too large, consider splitting"
        )
        
    def test_documentation_page_load_time(self):
        """Test documentation page load performance"""
        import requests
        import time
        
        endpoints = [
            '/api/docs/',
            '/api/redoc/',
            '/api/schema/'
        ]
        
        for endpoint in endpoints:
            start = time.time()
            response = requests.get(f"http://localhost:8000{endpoint}")
            duration = time.time() - start
            
            self.assertEqual(response.status_code, 200)
            self.assertLess(
                duration,
                3.0,
                f"{endpoint} took too long to load"
            )
            
    def test_example_validation_performance(self):
        """Test example validation performance"""
        schema = SchemaGenerator().get_schema()
        validator = ExampleValidator()
        
        # Extract all examples
        examples = self._extract_all_examples(schema)
        
        # Measure validation time
        start = time.time()
        
        for example in examples[:100]:  # Test first 100
            validator.validate_example(
                example.get('data'),
                example.get('schema')
            )
            
        duration = time.time() - start
        avg_time = duration / min(len(examples), 100)
        
        # Should validate quickly
        self.assertLess(avg_time, 0.01)  # 10ms per example max
```

## 🎯 Test Execution Commands

### Run All Documentation Tests
```bash
# Unit tests only
pytest tests/unit/docs/ -v

# Integration tests
pytest tests/integration/docs/ -v

# E2E tests
pytest tests/e2e/docs/ -v

# All documentation tests
pytest tests/ -k "doc" -v

# With coverage
pytest tests/ -k "doc" --cov=apps.api.docs --cov-report=html
```

### Run Specific Test Categories
```bash
# Schema validation tests
pytest tests/ -k "schema" -v

# Example tests
pytest tests/ -k "example" -v

# Contract tests
pytest tests/ -k "contract" -v

# SDK generation tests
pytest tests/ -k "sdk" -v
```

---

**Siguiente**: [Performance Optimization Tests](18-Performance-Optimization-Tests.md) →