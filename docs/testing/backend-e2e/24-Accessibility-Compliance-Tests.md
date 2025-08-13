# ♿ Accessibility Compliance Tests

## 📋 Resumen

Esta guía detalla los tests de cumplimiento de accesibilidad (WCAG 2.1), asegurando que la API sea completamente accesible para todos los usuarios.

## 🎯 Objetivos de Testing

### Estándares de Accesibilidad
- **WCAG 2.1 Level AA**: Cumplimiento completo
- **Section 508**: Conformidad total
- **ADA Compliance**: Requisitos cumplidos
- **ARIA Standards**: Implementación correcta
- **API Accessibility**: Endpoints accesibles
- **Error Messages**: Mensajes claros y descriptivos
- **Documentation**: Documentación accesible

### Áreas a Cubrir
- ✅ API Response Formats
- ✅ Error Message Clarity
- ✅ Alternative Content
- ✅ Time Limits
- ✅ Navigation Consistency
- ✅ Input Assistance
- ✅ Language Support
- ✅ Assistive Technology Support

## 🧪 Unit Tests

### 1. API Response Accessibility Tests
```python
# backend/tests/unit/accessibility/test_api_accessibility.py
from django.test import TestCase
from apps.accessibility.validators import AccessibilityValidator
from apps.accessibility.formatters import AccessibleFormatter
import json

class APIResponseAccessibilityTest(TestCase):
    """Test API response accessibility standards"""
    
    def setUp(self):
        self.validator = AccessibilityValidator()
        self.formatter = AccessibleFormatter()
        
    def test_error_message_clarity(self):
        """Test error messages are clear and helpful"""
        # Bad error messages
        bad_errors = [
            {"error": "ERR_001"},
            {"error": "Invalid"},
            {"error": "Failed"},
            {"message": "null"}
        ]
        
        for error in bad_errors:
            result = self.validator.validate_error_message(error)
            self.assertFalse(
                result.is_valid,
                f"Bad error accepted: {error}"
            )
            
        # Good error messages
        good_errors = [
            {
                "error": "validation_error",
                "message": "The email address format is invalid. Please use format: user@example.com",
                "field": "email",
                "suggestion": "Check for typos or missing @ symbol"
            },
            {
                "error": "authentication_failed",
                "message": "Login failed. Please check your email and password.",
                "help_link": "/api/help/authentication"
            }
        ]
        
        for error in good_errors:
            result = self.validator.validate_error_message(error)
            self.assertTrue(
                result.is_valid,
                f"Good error rejected: {error}"
            )
            
    def test_response_structure_consistency(self):
        """Test response structure is consistent and predictable"""
        # All responses should have consistent structure
        response_formats = [
            # List response
            {
                "status": "success",
                "data": {
                    "results": [],
                    "count": 0,
                    "next": None,
                    "previous": None
                },
                "meta": {
                    "timestamp": "2023-12-01T10:00:00Z",
                    "version": "1.0"
                }
            },
            # Detail response
            {
                "status": "success",
                "data": {
                    "id": 1,
                    "type": "club",
                    "attributes": {}
                },
                "meta": {
                    "timestamp": "2023-12-01T10:00:00Z",
                    "version": "1.0"
                }
            },
            # Error response
            {
                "status": "error",
                "errors": [
                    {
                        "code": "VALIDATION_ERROR",
                        "message": "Field is required",
                        "field": "name"
                    }
                ],
                "meta": {
                    "timestamp": "2023-12-01T10:00:00Z",
                    "version": "1.0"
                }
            }
        ]
        
        for response in response_formats:
            result = self.validator.validate_response_structure(response)
            self.assertTrue(result.is_consistent)
            
    def test_language_header_support(self):
        """Test proper language header support"""
        supported_languages = ['en', 'es', 'fr', 'de']
        
        for lang in supported_languages:
            headers = {'Accept-Language': lang}
            
            result = self.formatter.format_response(
                data={'message': 'Success'},
                headers=headers
            )
            
            # Should include language in response
            self.assertEqual(result['meta']['language'], lang)
            
            # Messages should be translated
            if lang == 'es':
                self.assertEqual(result['data']['message'], 'Éxito')
            elif lang == 'fr':
                self.assertEqual(result['data']['message'], 'Succès')
                
    def test_datetime_format_accessibility(self):
        """Test datetime formats are accessible"""
        from datetime import datetime
        
        dt = datetime(2023, 12, 1, 10, 30, 0)
        
        # Test different format preferences
        formats = [
            ('iso8601', '2023-12-01T10:30:00Z'),
            ('human', 'December 1, 2023 at 10:30 AM'),
            ('relative', '2 hours ago'),
            ('unix', 1701428400)
        ]
        
        for format_type, expected in formats:
            result = self.formatter.format_datetime(
                dt,
                format_type=format_type
            )
            
            # Should always include ISO format for machines
            self.assertIn('iso8601', result)
            # Should include requested format
            self.assertIn(format_type, result)

class ContentAlternativesTest(TestCase):
    """Test content alternatives for accessibility"""
    
    def test_image_alt_text_requirements(self):
        """Test image responses include alt text"""
        image_response = {
            "id": 1,
            "url": "https://example.com/court.jpg",
            "alt_text": "Outdoor padel court with blue surface and glass walls",
            "description": "Main court at Madrid Sports Center"
        }
        
        validator = AccessibilityValidator()
        result = validator.validate_image_response(image_response)
        
        self.assertTrue(result.has_alt_text)
        self.assertGreater(len(image_response['alt_text']), 20)
        
    def test_video_content_accessibility(self):
        """Test video content includes accessibility features"""
        video_response = {
            "id": 1,
            "url": "https://example.com/tutorial.mp4",
            "captions": [
                {
                    "language": "en",
                    "url": "https://example.com/tutorial_en.vtt"
                },
                {
                    "language": "es",
                    "url": "https://example.com/tutorial_es.vtt"
                }
            ],
            "transcript": "https://example.com/tutorial_transcript.txt",
            "audio_description": "https://example.com/tutorial_ad.mp3"
        }
        
        validator = AccessibilityValidator()
        result = validator.validate_video_response(video_response)
        
        self.assertTrue(result.has_captions)
        self.assertTrue(result.has_transcript)
        self.assertGreater(len(video_response['captions']), 0)
        
    def test_document_accessibility(self):
        """Test document responses include accessible versions"""
        document_response = {
            "id": 1,
            "title": "Terms of Service",
            "formats": [
                {
                    "type": "pdf",
                    "url": "https://example.com/terms.pdf",
                    "accessible": True,
                    "tagged": True
                },
                {
                    "type": "html",
                    "url": "https://example.com/terms.html",
                    "wcag_level": "AA"
                },
                {
                    "type": "txt",
                    "url": "https://example.com/terms.txt",
                    "plain_text": True
                }
            ]
        }
        
        validator = AccessibilityValidator()
        result = validator.validate_document_response(document_response)
        
        self.assertTrue(result.has_accessible_format)
        self.assertTrue(result.has_text_alternative)
```

### 2. Input Assistance Tests
```python
# backend/tests/unit/accessibility/test_input_assistance.py
class InputAssistanceTest(TestCase):
    """Test input assistance for accessibility"""
    
    def test_field_validation_messages(self):
        """Test field validation provides helpful messages"""
        from apps.accessibility.forms import AccessibleFormValidator
        
        validator = AccessibleFormValidator()
        
        # Test email validation
        email_errors = validator.validate_field(
            'email',
            'invalid.email',
            field_type='email'
        )
        
        self.assertIn('format', email_errors[0]['message'].lower())
        self.assertIn('example', email_errors[0]['suggestion'].lower())
        self.assertEqual(email_errors[0]['field'], 'email')
        
        # Test date validation
        date_errors = validator.validate_field(
            'date',
            '2023-13-45',
            field_type='date'
        )
        
        self.assertIn('invalid month', date_errors[0]['message'].lower())
        self.assertIn('yyyy-mm-dd', date_errors[0]['format_hint'].lower())
        
    def test_input_field_metadata(self):
        """Test input fields include proper metadata"""
        field_metadata = {
            "name": "start_time",
            "type": "time",
            "label": "Reservation Start Time",
            "description": "Select the time you want to start playing",
            "required": True,
            "format": "HH:MM",
            "example": "14:30",
            "min": "09:00",
            "max": "22:00",
            "step": "30",
            "aria_label": "Select reservation start time in 24-hour format",
            "help_text": "Available times are between 9 AM and 10 PM",
            "error_messages": {
                "required": "Start time is required",
                "invalid": "Please enter time in HH:MM format",
                "out_of_range": "Time must be between 09:00 and 22:00"
            }
        }
        
        validator = AccessibilityValidator()
        result = validator.validate_field_metadata(field_metadata)
        
        self.assertTrue(result.has_label)
        self.assertTrue(result.has_description)
        self.assertTrue(result.has_aria_label)
        self.assertTrue(result.has_error_messages)
        self.assertTrue(result.has_help_text)
        
    def test_form_submission_feedback(self):
        """Test form submission provides clear feedback"""
        from apps.accessibility.responses import AccessibleResponseBuilder
        
        builder = AccessibleResponseBuilder()
        
        # Success response
        success_response = builder.build_success_response(
            action='reservation_created',
            data={'id': 123},
            message='Your reservation has been successfully created'
        )
        
        self.assertEqual(success_response['status'], 'success')
        self.assertIn('message', success_response)
        self.assertIn('next_steps', success_response)
        
        # Error response with corrections
        error_response = builder.build_error_response(
            errors=[
                {
                    'field': 'date',
                    'value': '2023-02-30',
                    'message': 'Invalid date',
                    'suggestion': 'February only has 28 days in 2023'
                }
            ]
        )
        
        self.assertEqual(error_response['status'], 'error')
        self.assertIn('suggestion', error_response['errors'][0])
```

### 3. Navigation and Time Limit Tests
```python
# backend/tests/unit/accessibility/test_navigation_time.py
class NavigationAccessibilityTest(TestCase):
    """Test navigation accessibility features"""
    
    def test_api_navigation_consistency(self):
        """Test API navigation is consistent"""
        from apps.accessibility.navigation import NavigationValidator
        
        validator = NavigationValidator()
        
        # Test pagination consistency
        paginated_response = {
            "links": {
                "self": "/api/v1/clubs?page=2",
                "first": "/api/v1/clubs?page=1",
                "prev": "/api/v1/clubs?page=1",
                "next": "/api/v1/clubs?page=3",
                "last": "/api/v1/clubs?page=10"
            },
            "meta": {
                "current_page": 2,
                "total_pages": 10,
                "per_page": 20,
                "total_count": 200
            }
        }
        
        result = validator.validate_pagination(paginated_response)
        
        self.assertTrue(result.has_all_links)
        self.assertTrue(result.has_page_info)
        self.assertTrue(result.is_consistent)
        
    def test_session_timeout_warnings(self):
        """Test session timeout warnings for accessibility"""
        from apps.accessibility.session import SessionAccessibility
        
        session_mgr = SessionAccessibility()
        
        # Test timeout warning
        warning = session_mgr.get_timeout_warning(
            remaining_seconds=120
        )
        
        self.assertIn('2 minutes', warning['message'])
        self.assertIn('extend', warning['actions'])
        self.assertIn('save', warning['actions'])
        
        # Test multiple language support
        warning_es = session_mgr.get_timeout_warning(
            remaining_seconds=120,
            language='es'
        )
        
        self.assertIn('2 minutos', warning_es['message'])
        
    def test_rate_limit_accessibility(self):
        """Test rate limit messages are accessible"""
        rate_limit_response = {
            "error": "rate_limit_exceeded",
            "message": "You have exceeded the rate limit",
            "details": {
                "limit": 100,
                "period": "1 hour",
                "remaining": 0,
                "reset_at": "2023-12-01T11:00:00Z",
                "reset_in_seconds": 1800,
                "reset_in_human": "30 minutes"
            },
            "suggestions": [
                "Wait 30 minutes before making more requests",
                "Consider using batch operations",
                "Contact support if you need higher limits"
            ]
        }
        
        validator = AccessibilityValidator()
        result = validator.validate_rate_limit_response(rate_limit_response)
        
        self.assertTrue(result.has_human_readable_time)
        self.assertTrue(result.has_suggestions)
        self.assertTrue(result.has_reset_info)
```

## 🔌 Integration Tests

### 1. Screen Reader Compatibility Tests
```python
# backend/tests/integration/accessibility/test_screen_reader.py
from rest_framework.test import APITestCase

class ScreenReaderCompatibilityTest(APITestCase):
    """Test API compatibility with screen readers"""
    
    def test_api_documentation_accessibility(self):
        """Test API documentation is screen reader friendly"""
        response = self.client.get('/api/v1/docs/')
        
        # Check HTML structure
        self.assertContains(response, '<h1')
        self.assertContains(response, 'role="navigation"')
        self.assertContains(response, 'aria-label=')
        
        # Check skip links
        self.assertContains(response, 'skip-to-content')
        
    def test_error_announcements(self):
        """Test errors are properly announced"""
        # Make invalid request
        response = self.client.post(
            '/api/v1/reservations/',
            {},
            HTTP_ACCEPT='application/json'
        )
        
        # Should have ARIA live region info
        self.assertIn('aria_live', response.data.get('meta', {}))
        self.assertEqual(
            response.data['meta']['aria_live'],
            'assertive'
        )
        
        # Error summary should be first
        self.assertIn('error_summary', response.data)
        
    def test_api_response_landmarks(self):
        """Test API responses include logical landmarks"""
        response = self.client.get('/api/v1/clubs/')
        
        # Response should have clear sections
        self.assertIn('data', response.data)
        self.assertIn('meta', response.data)
        self.assertIn('links', response.data)
        
        # Meta should include structure hints
        self.assertIn('response_structure', response.data['meta'])
        structure = response.data['meta']['response_structure']
        
        self.assertEqual(structure['main_content'], 'data')
        self.assertEqual(structure['navigation'], 'links')
        self.assertEqual(structure['supplementary'], 'meta')
```

### 2. Keyboard Navigation Tests
```python
# backend/tests/integration/accessibility/test_keyboard_navigation.py
class KeyboardNavigationTest(APITestCase):
    """Test keyboard navigation support"""
    
    def test_api_navigation_shortcuts(self):
        """Test API supports navigation shortcuts"""
        # Test navigation header
        response = self.client.get(
            '/api/v1/clubs/',
            HTTP_X_NAVIGATION_MODE='keyboard'
        )
        
        # Should include navigation aids
        self.assertIn('navigation', response.data['meta'])
        nav = response.data['meta']['navigation']
        
        self.assertIn('shortcuts', nav)
        self.assertIn('focus_order', nav)
        
        # Verify shortcuts
        shortcuts = nav['shortcuts']
        self.assertIn('next_page', shortcuts)
        self.assertIn('previous_page', shortcuts)
        self.assertIn('first_item', shortcuts)
        
    def test_form_field_navigation(self):
        """Test form field navigation information"""
        response = self.client.options('/api/v1/reservations/')
        
        # Should describe field navigation
        actions = response.data['actions']['POST']
        
        for field_name, field_info in actions.items():
            if field_info.get('required'):
                self.assertIn('tab_order', field_info)
                self.assertIn('keyboard_shortcut', field_info)
                
    def test_interactive_element_indicators(self):
        """Test interactive elements are properly indicated"""
        response = self.client.get('/api/v1/clubs/1/')
        
        # Actions should be clearly marked
        if 'available_actions' in response.data:
            for action in response.data['available_actions']:
                self.assertIn('keyboard_accessible', action)
                self.assertIn('shortcut', action)
                self.assertIn('description', action)
```

## 🔄 E2E Flow Tests

### 1. Complete Accessible User Journey
```python
# backend/tests/e2e/accessibility/test_user_journey.py
class AccessibleUserJourneyE2ETest(TestCase):
    """Test complete user journey with accessibility features"""
    
    def test_reservation_flow_with_screen_reader(self):
        """Test reservation flow with screen reader simulation"""
        # Set accessibility preferences
        headers = {
            'X-Accessibility-Mode': 'screen-reader',
            'Accept-Language': 'en',
            'X-Prefer-Contrast': 'high'
        }
        
        # Step 1: Search for clubs
        search_response = self.client.get(
            '/api/v1/clubs/search/',
            {'city': 'Madrid', 'accessible': True},
            **headers
        )
        
        self.assertEqual(search_response.status_code, 200)
        
        # Verify accessible response
        self.assertIn('screen_reader_summary', search_response.data['meta'])
        summary = search_response.data['meta']['screen_reader_summary']
        self.assertIn('10 clubs found', summary)
        
        # Step 2: Select club
        club_id = search_response.data['data'][0]['id']
        club_response = self.client.get(
            f'/api/v1/clubs/{club_id}/',
            **headers
        )
        
        # Should include accessibility info
        club_data = club_response.data['data']
        self.assertIn('accessibility_features', club_data)
        self.assertIn('wheelchair_accessible', club_data['accessibility_features'])
        
        # Step 3: Check court availability
        availability_response = self.client.get(
            f'/api/v1/clubs/{club_id}/courts/availability/',
            {
                'date': '2023-12-15',
                'duration': 60
            },
            **headers
        )
        
        # Should have clear time descriptions
        for slot in availability_response.data['data']:
            self.assertIn('human_readable_time', slot)
            self.assertIn('screen_reader_label', slot)
            
        # Step 4: Create reservation
        reservation_data = {
            'court_id': availability_response.data['data'][0]['court_id'],
            'date': '2023-12-15',
            'start_time': '10:00',
            'duration': 60
        }
        
        reservation_response = self.client.post(
            '/api/v1/reservations/',
            reservation_data,
            **headers
        )
        
        # Should have confirmation for screen reader
        self.assertEqual(reservation_response.status_code, 201)
        self.assertIn(
            'screen_reader_confirmation',
            reservation_response.data['meta']
        )
        
        confirmation = reservation_response.data['meta']['screen_reader_confirmation']
        self.assertIn('successfully created', confirmation.lower())
        self.assertIn('10:00 AM', confirmation)
        
    def test_error_recovery_accessibility(self):
        """Test error recovery with accessibility features"""
        headers = {
            'X-Accessibility-Mode': 'cognitive',
            'X-Prefer-Simplicity': 'high'
        }
        
        # Make request with errors
        response = self.client.post(
            '/api/v1/reservations/',
            {
                'date': '2023-02-30',  # Invalid date
                'time': '25:00'  # Invalid time
            },
            **headers
        )
        
        # Errors should be simple and clear
        self.assertEqual(response.status_code, 400)
        
        errors = response.data['errors']
        for error in errors:
            # Should have simple language
            self.assertLess(len(error['simple_message'].split()), 20)
            # Should have suggestions
            self.assertIn('suggestion', error)
            # Should have examples
            self.assertIn('example', error)
            
    def test_multi_language_accessibility(self):
        """Test accessibility in multiple languages"""
        languages = ['en', 'es', 'fr', 'de']
        
        for lang in languages:
            response = self.client.get(
                '/api/v1/help/accessibility/',
                HTTP_ACCEPT_LANGUAGE=lang
            )
            
            self.assertEqual(response.status_code, 200)
            
            # Verify language
            self.assertEqual(
                response.data['meta']['language'],
                lang
            )
            
            # Verify content is translated
            self.assertIn('title', response.data['data'])
            self.assertIn('content', response.data['data'])
            
            # Verify accessibility terms are properly translated
            if lang == 'es':
                self.assertIn('accesibilidad', response.data['data']['title'].lower())
            elif lang == 'fr':
                self.assertIn('accessibilité', response.data['data']['title'].lower())
```

### 2. Assistive Technology Integration
```python
# backend/tests/e2e/accessibility/test_assistive_tech.py
class AssistiveTechnologyE2ETest(TestCase):
    """Test integration with assistive technologies"""
    
    def test_api_with_voice_control(self):
        """Test API works with voice control systems"""
        # Simulate voice command input
        voice_commands = [
            {
                'intent': 'book_court',
                'parameters': {
                    'date': 'tomorrow',
                    'time': 'morning',
                    'duration': 'one hour'
                }
            }
        ]
        
        response = self.client.post(
            '/api/v1/voice/process/',
            {
                'commands': voice_commands,
                'accessibility_mode': 'voice_control'
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Should return voice-friendly response
        self.assertIn('voice_response', response.data)
        self.assertIn('ssml', response.data)  # Speech Synthesis Markup
        
        # SSML should be properly formatted
        ssml = response.data['ssml']
        self.assertIn('<speak>', ssml)
        self.assertIn('</speak>', ssml)
        
    def test_braille_display_compatibility(self):
        """Test compatibility with braille displays"""
        response = self.client.get(
            '/api/v1/clubs/',
            HTTP_X_OUTPUT_MODE='braille'
        )
        
        # Should provide braille-friendly format
        self.assertIn('braille_format', response.data['meta'])
        
        # Data should be linearized
        for club in response.data['data']:
            self.assertIn('linear_description', club)
            # No nested objects in main content
            for value in club.values():
                self.assertNotIsInstance(value, dict)
                
    def test_switch_control_navigation(self):
        """Test navigation with switch control"""
        response = self.client.get(
            '/api/v1/clubs/',
            HTTP_X_NAVIGATION_MODE='switch'
        )
        
        # Should provide switch-friendly navigation
        nav = response.data['meta']['navigation']
        
        self.assertIn('scan_groups', nav)
        self.assertIn('scan_order', nav)
        
        # Each group should have clear boundaries
        for group in nav['scan_groups']:
            self.assertIn('id', group)
            self.assertIn('label', group)
            self.assertIn('items_count', group)
```

### 3. Compliance Validation
```python
# backend/tests/e2e/accessibility/test_compliance.py
class ComplianceValidationE2ETest(TestCase):
    """Test accessibility compliance validation"""
    
    def test_wcag_21_compliance(self):
        """Test WCAG 2.1 Level AA compliance"""
        from apps.accessibility.validators import WCAGValidator
        
        validator = WCAGValidator(level='AA')
        
        # Test all API endpoints
        endpoints = [
            '/api/v1/clubs/',
            '/api/v1/courts/',
            '/api/v1/reservations/',
            '/api/v1/users/me/'
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            
            result = validator.validate_response(response)
            
            self.assertTrue(
                result.is_compliant,
                f"{endpoint} fails WCAG 2.1 AA: {result.violations}"
            )
            
    def test_section_508_compliance(self):
        """Test Section 508 compliance"""
        from apps.accessibility.validators import Section508Validator
        
        validator = Section508Validator()
        
        # Test form accessibility
        response = self.client.options('/api/v1/reservations/')
        
        result = validator.validate_form_description(response.data)
        
        self.assertTrue(result.is_compliant)
        self.assertEqual(len(result.violations), 0)
        
    def test_automated_accessibility_scan(self):
        """Run automated accessibility scan"""
        from apps.accessibility.scanners import AccessibilityScanner
        
        scanner = AccessibilityScanner()
        
        # Scan API responses
        scan_results = scanner.scan_api(
            base_url='/api/v1/',
            auth_token=self.get_auth_token()
        )
        
        # Check for violations
        critical_violations = [
            v for v in scan_results.violations
            if v.severity == 'critical'
        ]
        
        self.assertEqual(
            len(critical_violations),
            0,
            f"Critical accessibility violations found: {critical_violations}"
        )
        
        # Generate report
        report = scanner.generate_report(scan_results)
        
        self.assertGreater(report.score, 90)  # Target 90+ score
```

## 🔒 Security and Accessibility

### Accessible Security Features
```python
# backend/tests/accessibility/security/test_accessible_security.py
class AccessibleSecurityTest(TestCase):
    """Test security features are accessible"""
    
    def test_accessible_captcha(self):
        """Test CAPTCHA has accessible alternatives"""
        response = self.client.get('/api/v1/auth/captcha/')
        
        captcha_data = response.data
        
        # Should provide multiple formats
        self.assertIn('visual', captcha_data)
        self.assertIn('audio', captcha_data)
        self.assertIn('text_alternative', captcha_data)
        
        # Audio should have transcript
        audio = captcha_data['audio']
        self.assertIn('url', audio)
        self.assertIn('transcript', audio)
        
    def test_accessible_2fa(self):
        """Test 2FA is accessible"""
        # Request 2FA methods
        response = self.client.get('/api/v1/auth/2fa/methods/')
        
        methods = response.data['methods']
        
        # Should have accessible options
        accessible_methods = [
            m for m in methods
            if m.get('accessible', False)
        ]
        
        self.assertGreater(len(accessible_methods), 0)
        
        # Should include non-SMS options
        method_types = [m['type'] for m in methods]
        self.assertIn('totp', method_types)  # Time-based codes
        self.assertIn('email', method_types)  # Email codes
        
    def test_error_message_security(self):
        """Test security errors don't leak info but remain helpful"""
        # Try invalid login
        response = self.client.post(
            '/api/v1/auth/login/',
            {
                'email': 'nonexistent@example.com',
                'password': 'wrongpass'
            }
        )
        
        error = response.data['errors'][0]
        
        # Should not reveal if email exists
        self.assertNotIn('not found', error['message'].lower())
        self.assertNotIn('does not exist', error['message'].lower())
        
        # But should be helpful
        self.assertIn('suggestion', error)
        self.assertIn('help_link', error)
```

## 📊 Accessibility Metrics

### Accessibility Score Calculation
```python
# backend/tests/accessibility/metrics/test_accessibility_metrics.py
class AccessibilityMetricsTest(TestCase):
    """Test accessibility metrics and scoring"""
    
    def test_accessibility_score_calculation(self):
        """Test calculation of accessibility scores"""
        from apps.accessibility.metrics import AccessibilityScorer
        
        scorer = AccessibilityScorer()
        
        # Score a response
        response_data = {
            'data': {'message': 'Success'},
            'meta': {
                'language': 'en',
                'timestamp': '2023-12-01T10:00:00Z'
            },
            'errors': []
        }
        
        score = scorer.calculate_score(response_data)
        
        self.assertIn('total_score', score)
        self.assertIn('categories', score)
        
        # Check category scores
        categories = score['categories']
        self.assertIn('perceivable', categories)
        self.assertIn('operable', categories)
        self.assertIn('understandable', categories)
        self.assertIn('robust', categories)
        
    def test_accessibility_monitoring(self):
        """Test ongoing accessibility monitoring"""
        from apps.accessibility.monitoring import AccessibilityMonitor
        
        monitor = AccessibilityMonitor()
        
        # Record API calls
        for i in range(100):
            monitor.record_request(
                endpoint='/api/v1/clubs/',
                accessibility_mode='screen-reader' if i % 10 == 0 else None,
                response_time=0.1 + (i % 5) * 0.05
            )
            
        # Get statistics
        stats = monitor.get_accessibility_stats()
        
        self.assertIn('accessibility_usage', stats)
        self.assertIn('performance_by_mode', stats)
        self.assertEqual(stats['accessibility_usage']['screen-reader'], 10)
```

## 🎯 Test Execution Commands

### Run All Accessibility Tests
```bash
# Unit tests
pytest tests/unit/accessibility/ -v

# Integration tests
pytest tests/integration/accessibility/ -v

# E2E tests
pytest tests/e2e/accessibility/ -v

# All accessibility tests
pytest tests/ -k accessibility -v

# With coverage
pytest tests/ -k accessibility --cov=apps.accessibility --cov-report=html
```

### Accessibility Validation Commands
```bash
# Run WCAG validation
python manage.py validate_wcag --level=AA

# Run Section 508 compliance check
python manage.py check_508_compliance

# Generate accessibility report
python manage.py accessibility_report --format=html

# Test with screen reader simulation
python manage.py test_screen_reader --endpoint=/api/v1/
```

### Automated Accessibility Scanning
```bash
# Run axe-core tests
npm run test:accessibility

# Run pa11y tests
pa11y http://localhost:8000/api/v1/ --standard WCAG2AA

# Run lighthouse accessibility audit
lighthouse http://localhost:8000 --only-categories=accessibility

# Run comprehensive scan
python manage.py accessibility_scan --comprehensive
```

---

**Siguiente**: [Test Automation and CI/CD](25-Test-Automation-CI-CD.md) →