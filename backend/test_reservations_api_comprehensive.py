#!/usr/bin/env python3
"""
Comprehensive Reservations API Test Suite
=========================================

This script tests all reservation-related API endpoints to identify issues
and verify functionality for the Padelyzer system.

Test Scenarios:
1. Authentication and Health Check
2. Court Availability Endpoint
3. Court Listing and Data Structure
4. Club Context and Organization Relationships
5. Reservation Creation with Visitor Data
6. Error Handling and Validation

Usage:
    python test_reservations_api_comprehensive.py
"""

import json
import requests
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import traceback

# Test Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials from previous analysis
TEST_CREDENTIALS = [
    {"username": "admin@test.com", "password": "TEST_PASSWORD"},
    {"username": "admin", "password": "TEST_PASSWORD"},
    {"username": "admin", "password": "TEST_PASSWORD"},
    {"username": "testuser@example.com", "password": "TEST_PASSWORD"},
]

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.organization_data = None
        self.club_data = None
        self.test_results = {}
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Padelyzer-API-Tester/1.0'
        })

    def log_test(self, test_name: str, status: str, details: Dict[str, Any]):
        """Log test results with structured data"""
        self.test_results[test_name] = {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"\n{status_emoji} {test_name}: {status}")
        
        if details.get('response_data'):
            print(f"   Response: {json.dumps(details['response_data'], indent=2)[:200]}...")
        if details.get('error'):
            print(f"   Error: {details['error']}")

    def test_health_check(self) -> bool:
        """Test 1: API Server Health Check"""
        try:
            response = self.session.get(f"{BASE_URL}/health/")
            
            if response.status_code == 200:
                self.log_test("API_HEALTH_CHECK", "PASS", {
                    'status_code': response.status_code,
                    'response_data': response.json() if response.text else "Empty response",
                    'response_time': response.elapsed.total_seconds()
                })
                return True
            else:
                # Try alternative health endpoints
                alternatives = [f"{BASE_URL}/", f"{API_BASE}/", f"{BASE_URL}/admin/"]
                
                for alt_url in alternatives:
                    try:
                        alt_response = self.session.get(alt_url, timeout=5)
                        if alt_response.status_code in [200, 301, 302]:
                            self.log_test("API_HEALTH_CHECK", "PASS", {
                                'status_code': alt_response.status_code,
                                'url': alt_url,
                                'note': 'Alternative endpoint responded'
                            })
                            return True
                    except:
                        continue
                
                self.log_test("API_HEALTH_CHECK", "FAIL", {
                    'status_code': response.status_code,
                    'error': f"Health check failed: {response.text[:200]}"
                })
                return False
                
        except Exception as e:
            self.log_test("API_HEALTH_CHECK", "FAIL", {
                'error': f"Connection failed: {str(e)}"
            })
            return False

    def test_authentication(self) -> bool:
        """Test 2: Authentication with multiple credential sets"""
        
        for i, creds in enumerate(TEST_CREDENTIALS):
            try:
                # Try login endpoint
                login_url = f"{API_BASE}/auth/login/"
                response = self.session.post(login_url, json=creds)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if 'access' in data:
                        self.auth_token = data['access']
                        self.session.headers['Authorization'] = f'Bearer {self.auth_token}'
                        
                        self.log_test("AUTHENTICATION", "PASS", {
                            'credentials_set': i + 1,
                            'username': creds['username'],
                            'token_preview': self.auth_token[:20] + "...",
                            'response_keys': list(data.keys())
                        })
                        
                        # Test token validation
                        self.test_token_validation()
                        return True
                    
                self.log_test(f"AUTH_ATTEMPT_{i+1}", "FAIL", {
                    'credentials': creds['username'],
                    'status_code': response.status_code,
                    'response': response.text[:200]
                })
                
            except Exception as e:
                self.log_test(f"AUTH_ATTEMPT_{i+1}", "ERROR", {
                    'credentials': creds['username'],
                    'error': str(e)
                })
        
        self.log_test("AUTHENTICATION", "FAIL", {
            'error': 'All credential sets failed'
        })
        return False

    def test_token_validation(self):
        """Test token validation and user context"""
        try:
            # Test user profile/context endpoint
            profile_endpoints = [
                f"{API_BASE}/auth/user/",
                f"{API_BASE}/auth/profile/",
                f"{API_BASE}/auth/me/",
                f"{API_BASE}/users/profile/",
            ]
            
            for endpoint in profile_endpoints:
                try:
                    response = self.session.get(endpoint)
                    if response.status_code == 200:
                        self.user_data = response.json()
                        
                        self.log_test("TOKEN_VALIDATION", "PASS", {
                            'endpoint': endpoint,
                            'user_id': self.user_data.get('id'),
                            'username': self.user_data.get('username'),
                            'organization': self.user_data.get('organization'),
                            'club': self.user_data.get('club'),
                            'permissions': self.user_data.get('user_permissions', [])[:3]
                        })
                        return True
                        
                except Exception as e:
                    continue
            
            self.log_test("TOKEN_VALIDATION", "FAIL", {
                'error': 'No profile endpoint responded successfully'
            })
            
        except Exception as e:
            self.log_test("TOKEN_VALIDATION", "ERROR", {
                'error': str(e)
            })

    def test_club_context(self) -> bool:
        """Test 3: Club Context and Organization Relationships"""
        try:
            # Test club listing
            clubs_response = self.session.get(f"{API_BASE}/clubs/")
            
            if clubs_response.status_code == 200:
                clubs_data = clubs_response.json()
                
                if isinstance(clubs_data, dict) and 'results' in clubs_data:
                    clubs_list = clubs_data['results']
                elif isinstance(clubs_data, list):
                    clubs_list = clubs_data
                else:
                    clubs_list = []
                
                if clubs_list:
                    self.club_data = clubs_list[0]  # Use first club for testing
                    
                    self.log_test("CLUB_CONTEXT", "PASS", {
                        'clubs_count': len(clubs_list),
                        'first_club_id': self.club_data.get('id'),
                        'first_club_name': self.club_data.get('name'),
                        'organization_id': self.club_data.get('organization'),
                        'sample_club_fields': list(self.club_data.keys())[:10]
                    })
                    return True
                else:
                    self.log_test("CLUB_CONTEXT", "FAIL", {
                        'error': 'No clubs found',
                        'response_structure': type(clubs_data).__name__
                    })
                    return False
            else:
                self.log_test("CLUB_CONTEXT", "FAIL", {
                    'status_code': clubs_response.status_code,
                    'error': clubs_response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_test("CLUB_CONTEXT", "ERROR", {
                'error': str(e),
                'traceback': traceback.format_exc()[:500]
            })
            return False

    def test_courts_listing(self) -> bool:
        """Test 4: Courts Listing and Required Fields"""
        try:
            # Test courts endpoint
            courts_response = self.session.get(f"{API_BASE}/courts/")
            
            if courts_response.status_code == 200:
                courts_data = courts_response.json()
                
                # Handle paginated response
                if isinstance(courts_data, dict) and 'results' in courts_data:
                    courts_list = courts_data['results']
                elif isinstance(courts_data, list):
                    courts_list = courts_data
                else:
                    courts_list = []
                
                if courts_list:
                    sample_court = courts_list[0]
                    required_fields = ['id', 'name', 'club', 'price_per_hour']
                    missing_fields = [field for field in required_fields if field not in sample_court]
                    
                    self.log_test("COURTS_LISTING", "PASS", {
                        'courts_count': len(courts_list),
                        'sample_court_fields': list(sample_court.keys()),
                        'required_fields_present': len(missing_fields) == 0,
                        'missing_fields': missing_fields,
                        'sample_court_data': {k: v for k, v in sample_court.items() if k in ['id', 'name', 'club', 'price_per_hour']}
                    })
                    return True
                else:
                    self.log_test("COURTS_LISTING", "FAIL", {
                        'error': 'No courts found',
                        'response_structure': type(courts_data).__name__
                    })
                    return False
            else:
                self.log_test("COURTS_LISTING", "FAIL", {
                    'status_code': courts_response.status_code,
                    'error': courts_response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_test("COURTS_LISTING", "ERROR", {
                'error': str(e)
            })
            return False

    def test_availability_endpoint(self) -> bool:
        """Test 5: Court Availability Endpoint"""
        try:
            if not self.club_data:
                self.log_test("AVAILABILITY_ENDPOINT", "SKIP", {
                    'error': 'No club data available for testing'
                })
                return False
            
            # Test availability endpoint with different parameters
            club_id = self.club_data.get('id')
            test_date = datetime.now().date()
            
            availability_endpoints = [
                f"{API_BASE}/reservations/reservations/check_availability/",
                f"{API_BASE}/reservations/check_availability/",
                f"{API_BASE}/courts/availability/",
            ]
            
            test_params = {
                'club_id': club_id,
                'date': test_date.isoformat(),
                'club': club_id,
            }
            
            for endpoint in availability_endpoints:
                try:
                    # Try GET request first
                    response = self.session.get(endpoint, params=test_params)
                    
                    if response.status_code == 200:
                        availability_data = response.json()
                        
                        self.log_test("AVAILABILITY_ENDPOINT", "PASS", {
                            'endpoint': endpoint,
                            'method': 'GET',
                            'params': test_params,
                            'response_type': type(availability_data).__name__,
                            'response_keys': list(availability_data.keys()) if isinstance(availability_data, dict) else 'list',
                            'data_preview': str(availability_data)[:200]
                        })
                        return True
                    
                    # Try POST request
                    response = self.session.post(endpoint, json=test_params)
                    
                    if response.status_code in [200, 201]:
                        availability_data = response.json()
                        
                        self.log_test("AVAILABILITY_ENDPOINT", "PASS", {
                            'endpoint': endpoint,
                            'method': 'POST',
                            'params': test_params,
                            'response_type': type(availability_data).__name__,
                            'data_preview': str(availability_data)[:200]
                        })
                        return True
                        
                except Exception as e:
                    continue
            
            self.log_test("AVAILABILITY_ENDPOINT", "FAIL", {
                'error': 'No availability endpoint responded successfully',
                'tested_endpoints': availability_endpoints,
                'test_params': test_params
            })
            return False
            
        except Exception as e:
            self.log_test("AVAILABILITY_ENDPOINT", "ERROR", {
                'error': str(e)
            })
            return False

    def test_reservation_creation(self) -> bool:
        """Test 6: Reservation Creation with Visitor Data"""
        try:
            if not self.club_data:
                self.log_test("RESERVATION_CREATION", "SKIP", {
                    'error': 'No club data available for testing'
                })
                return False
            
            # Get courts first
            courts_response = self.session.get(f"{API_BASE}/courts/")
            if courts_response.status_code != 200:
                self.log_test("RESERVATION_CREATION", "FAIL", {
                    'error': 'Cannot fetch courts for reservation test'
                })
                return False
            
            courts_data = courts_response.json()
            if isinstance(courts_data, dict) and 'results' in courts_data:
                courts_list = courts_data['results']
            elif isinstance(courts_data, list):
                courts_list = courts_data
            else:
                courts_list = []
            
            if not courts_list:
                self.log_test("RESERVATION_CREATION", "FAIL", {
                    'error': 'No courts available for reservation test'
                })
                return False
            
            court = courts_list[0]
            
            # Create test reservation data
            reservation_data = {
                'court': court['id'],
                'date': (datetime.now() + timedelta(days=1)).date().isoformat(),
                'start_time': '10:00:00',
                'end_time': '11:00:00',
                'visitor_name': 'Test Visitor',
                'visitor_email': 'visitor@test.com',
                'visitor_phone': '+1234567890',
                'notes': 'API Test Reservation'
            }
            
            # Try reservation creation endpoints
            reservation_endpoints = [
                f"{API_BASE}/reservations/reservations/",
                f"{API_BASE}/reservations/",
            ]
            
            for endpoint in reservation_endpoints:
                try:
                    response = self.session.post(endpoint, json=reservation_data)
                    
                    if response.status_code in [200, 201]:
                        created_reservation = response.json()
                        
                        self.log_test("RESERVATION_CREATION", "PASS", {
                            'endpoint': endpoint,
                            'reservation_id': created_reservation.get('id'),
                            'court': created_reservation.get('court'),
                            'visitor_name': created_reservation.get('visitor_name'),
                            'status': created_reservation.get('status'),
                            'created_fields': list(created_reservation.keys())
                        })
                        return True
                    else:
                        # Log validation errors for analysis
                        error_data = response.json() if response.text else {}
                        self.log_test(f"RESERVATION_CREATION_ATTEMPT", "FAIL", {
                            'endpoint': endpoint,
                            'status_code': response.status_code,
                            'validation_errors': error_data,
                            'request_data': reservation_data
                        })
                        
                except Exception as e:
                    continue
            
            self.log_test("RESERVATION_CREATION", "FAIL", {
                'error': 'No reservation endpoint accepted the creation request',
                'tested_endpoints': reservation_endpoints
            })
            return False
            
        except Exception as e:
            self.log_test("RESERVATION_CREATION", "ERROR", {
                'error': str(e)
            })
            return False

    def test_error_scenarios(self):
        """Test 7: Error Handling and Edge Cases"""
        try:
            error_tests = []
            
            # Test invalid authentication
            temp_headers = self.session.headers.copy()
            self.session.headers['Authorization'] = 'Bearer invalid_token'
            
            response = self.session.get(f"{API_BASE}/clubs/")
            error_tests.append({
                'test': 'invalid_auth',
                'status_code': response.status_code,
                'expected': 401,
                'passed': response.status_code == 401
            })
            
            # Restore headers
            self.session.headers = temp_headers
            
            # Test invalid endpoints
            response = self.session.get(f"{API_BASE}/nonexistent_endpoint/")
            error_tests.append({
                'test': 'invalid_endpoint',
                'status_code': response.status_code,
                'expected': 404,
                'passed': response.status_code == 404
            })
            
            passed_tests = sum(1 for test in error_tests if test['passed'])
            
            self.log_test("ERROR_HANDLING", "PASS" if passed_tests == len(error_tests) else "PARTIAL", {
                'tests_run': len(error_tests),
                'tests_passed': passed_tests,
                'test_results': error_tests
            })
            
        except Exception as e:
            self.log_test("ERROR_HANDLING", "ERROR", {
                'error': str(e)
            })

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Comprehensive Reservations API Test Suite")
        print("=" * 60)
        
        # Test sequence
        test_sequence = [
            ("Health Check", self.test_health_check),
            ("Authentication", self.test_authentication),
            ("Club Context", self.test_club_context),
            ("Courts Listing", self.test_courts_listing),
            ("Availability Endpoint", self.test_availability_endpoint),
            ("Reservation Creation", self.test_reservation_creation),
            ("Error Scenarios", self.test_error_scenarios),
        ]
        
        results_summary = {}
        
        for test_name, test_func in test_sequence:
            try:
                print(f"\n📋 Running {test_name}...")
                
                if hasattr(test_func, '__call__'):
                    if test_func.__name__ == 'test_error_scenarios':
                        test_func()  # No return value expected
                        results_summary[test_name] = "COMPLETED"
                    else:
                        result = test_func()
                        results_summary[test_name] = "PASS" if result else "FAIL"
                else:
                    results_summary[test_name] = "SKIP"
                    
            except Exception as e:
                results_summary[test_name] = f"ERROR: {str(e)}"
                print(f"❌ {test_name} encountered an error: {e}")
        
        # Generate final report
        self.generate_final_report(results_summary)

    def generate_final_report(self, results_summary: Dict[str, str]):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("📊 FINAL TEST REPORT")
        print("=" * 60)
        
        # Summary
        total_tests = len(results_summary)
        passed_tests = sum(1 for result in results_summary.values() if result == "PASS")
        failed_tests = sum(1 for result in results_summary.values() if result == "FAIL")
        error_tests = sum(1 for result in results_summary.values() if result.startswith("ERROR"))
        
        print(f"\n📈 Test Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests} ✅")
        print(f"   Failed: {failed_tests} ❌")
        print(f"   Errors: {error_tests} ⚠️")
        print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print(f"\n📋 Detailed Results:")
        for test_name, result in results_summary.items():
            status_emoji = "✅" if result == "PASS" else "❌" if result == "FAIL" else "⚠️"
            print(f"   {status_emoji} {test_name}: {result}")
        
        # Key findings
        print(f"\n🔍 Key Findings:")
        
        if self.auth_token:
            print("   ✅ Authentication is working")
        else:
            print("   ❌ Authentication failed - this will block all other operations")
        
        if self.user_data:
            org_status = "✅" if self.user_data.get('organization') else "❌"
            print(f"   {org_status} User organization context: {self.user_data.get('organization', 'Missing')}")
        
        if self.club_data:
            print(f"   ✅ Club data available: {self.club_data.get('name', 'Unknown')}")
        else:
            print("   ❌ No club data found - reservations may not work")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        
        if not self.auth_token:
            print("   1. Fix authentication system - check credentials and login endpoint")
        
        if self.user_data and not self.user_data.get('organization'):
            print("   2. Ensure users have proper organization relationships")
        
        if not self.club_data:
            print("   3. Create test clubs and verify club listing endpoints")
        
        if results_summary.get("Availability Endpoint") == "FAIL":
            print("   4. Fix court availability endpoint - critical for reservations")
        
        if results_summary.get("Reservation Creation") == "FAIL":
            print("   5. Review reservation creation validation and data requirements")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"/Users/ja/PZR4/backend/reservations_api_test_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'summary': results_summary,
                'detailed_results': self.test_results,
                'user_data': self.user_data,
                'club_data': self.club_data,
                'recommendations': [
                    "Fix authentication if failing",
                    "Ensure organization relationships",
                    "Verify court availability endpoint",
                    "Test reservation creation flow"
                ]
            }, f, indent=2, default=str)
        
        print(f"\n💾 Detailed results saved to: {results_file}")


def main():
    """Main execution function"""
    tester = APITester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()