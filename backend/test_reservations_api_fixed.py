#!/usr/bin/env python3
"""
Fixed Reservations API Test Suite
=================================

This script tests reservation-related API endpoints with corrected authentication
and endpoint URLs based on the actual system configuration.

Key Findings from Initial Test:
1. Authentication expects 'email' field, not 'username'
2. Courts are at /api/v1/clubs/courts/, not /api/v1/courts/
3. Need to use actual user credentials from database

Usage:
    python test_reservations_api_fixed.py
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

# Real credentials from database (updated with correct passwords)
TEST_CREDENTIALS = [
    {"email": "apitest@padelyzer.com", "password": "TEST_PASSWORD"},
    {"email": "admin@padelyzer.com", "password": "TEST_PASSWORD"},
    {"email": "root@padelyzer.com", "password": "TEST_PASSWORD"},  
    {"email": "contact@apitestclub.com", "password": "TEST_PASSWORD"},
]

class ReservationAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.clubs_data = []
        self.courts_data = []
        self.test_results = {}
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Padelyzer-API-Tester/2.0'
        })

    def log_result(self, test_name: str, status: str, details: Dict[str, Any]):
        """Log test results with structured data"""
        self.test_results[test_name] = {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"\n{status_emoji} {test_name}: {status}")
        
        if details.get('data_preview'):
            print(f"   Preview: {details['data_preview']}")
        if details.get('error'):
            print(f"   Error: {details['error']}")
        if details.get('validation_errors'):
            print(f"   Validation: {details['validation_errors']}")

    def authenticate(self) -> bool:
        """Test authentication with corrected email format"""
        print("🔐 Testing Authentication...")
        
        for i, creds in enumerate(TEST_CREDENTIALS):
            try:
                login_url = f"{API_BASE}/auth/login/"
                response = self.session.post(login_url, json=creds)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if 'access' in data:
                        self.auth_token = data['access']
                        self.session.headers['Authorization'] = f'Bearer {self.auth_token}'
                        
                        self.log_result("AUTHENTICATION", "PASS", {
                            'email': creds['email'],
                            'token_length': len(self.auth_token),
                            'user_id': data.get('user', {}).get('id'),
                            'is_staff': data.get('user', {}).get('is_staff'),
                            'club': data.get('user', {}).get('club')
                        })
                        
                        # Store user data
                        self.user_data = data.get('user', {})
                        return True
                
                self.log_result(f"AUTH_ATTEMPT_{i+1}", "FAIL", {
                    'email': creds['email'],
                    'status_code': response.status_code,
                    'response': response.text[:200] if response.text else "Empty response"
                })
                
            except Exception as e:
                self.log_result(f"AUTH_ATTEMPT_{i+1}", "ERROR", {
                    'email': creds['email'],
                    'error': str(e)
                })
        
        self.log_result("AUTHENTICATION", "FAIL", {
            'error': 'All credential sets failed'
        })
        return False

    def get_clubs_data(self) -> bool:
        """Get clubs data with proper authentication"""
        print("🏢 Testing Club Data Access...")
        
        try:
            response = self.session.get(f"{API_BASE}/clubs/")
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle paginated response
                if isinstance(data, dict) and 'results' in data:
                    self.clubs_data = data['results']
                    total_count = data.get('count', len(self.clubs_data))
                elif isinstance(data, list):
                    self.clubs_data = data
                    total_count = len(data)
                else:
                    self.clubs_data = []
                    total_count = 0
                
                self.log_result("CLUBS_DATA", "PASS", {
                    'clubs_count': len(self.clubs_data),
                    'total_count': total_count,
                    'sample_club': {
                        'id': self.clubs_data[0]['id'] if self.clubs_data else None,
                        'name': self.clubs_data[0]['name'] if self.clubs_data else None
                    },
                    'data_preview': f"Found {len(self.clubs_data)} clubs"
                })
                
                return len(self.clubs_data) > 0
                
            else:
                self.log_result("CLUBS_DATA", "FAIL", {
                    'status_code': response.status_code,
                    'error': response.text[:300]
                })
                return False
                
        except Exception as e:
            self.log_result("CLUBS_DATA", "ERROR", {
                'error': str(e)
            })
            return False

    def get_courts_data(self) -> bool:
        """Get courts data using correct endpoint"""
        print("🏟️  Testing Courts Data Access...")
        
        try:
            # Use the correct courts endpoint from clubs module
            response = self.session.get(f"{API_BASE}/clubs/courts/")
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle paginated response
                if isinstance(data, dict) and 'results' in data:
                    self.courts_data = data['results']
                elif isinstance(data, list):
                    self.courts_data = data
                else:
                    self.courts_data = []
                
                if self.courts_data:
                    sample_court = self.courts_data[0]
                    required_fields = ['id', 'name', 'club', 'price_per_hour']
                    present_fields = [field for field in required_fields if field in sample_court]
                    missing_fields = [field for field in required_fields if field not in sample_court]
                    
                    self.log_result("COURTS_DATA", "PASS", {
                        'courts_count': len(self.courts_data),
                        'required_fields_present': present_fields,
                        'missing_fields': missing_fields,
                        'sample_court_fields': list(sample_court.keys())[:10],
                        'sample_pricing': sample_court.get('price_per_hour'),
                        'data_preview': f"Found {len(self.courts_data)} courts"
                    })
                    
                    return True
                else:
                    self.log_result("COURTS_DATA", "FAIL", {
                        'error': 'No courts found in response'
                    })
                    return False
                    
            else:
                self.log_result("COURTS_DATA", "FAIL", {
                    'status_code': response.status_code,
                    'error': response.text[:300]
                })
                return False
                
        except Exception as e:
            self.log_result("COURTS_DATA", "ERROR", {
                'error': str(e)
            })
            return False

    def test_availability_endpoint(self) -> bool:
        """Test various availability endpoint possibilities"""
        print("📅 Testing Court Availability...")
        
        if not self.clubs_data:
            self.log_result("AVAILABILITY", "SKIP", {
                'error': 'No club data for testing availability'
            })
            return False
        
        club_id = self.clubs_data[0]['id']
        test_date = datetime.now().date()
        
        # Test different availability endpoints
        availability_endpoints = [
            f"{API_BASE}/reservations/check_availability/",
            f"{API_BASE}/reservations/reservations/check_availability/",
            f"{API_BASE}/clubs/courts/availability/",
            f"{API_BASE}/reservations/availability/",
        ]
        
        test_params = [
            {'club_id': club_id, 'date': test_date.isoformat()},
            {'club': club_id, 'date': test_date.isoformat()},
            {'club_id': club_id, 'date': str(test_date)},
        ]
        
        for endpoint in availability_endpoints:
            for params in test_params:
                try:
                    # Try GET request
                    response = self.session.get(endpoint, params=params)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        self.log_result("AVAILABILITY", "PASS", {
                            'endpoint': endpoint,
                            'method': 'GET',
                            'params': params,
                            'response_type': type(data).__name__,
                            'data_preview': str(data)[:200] if data else 'Empty response'
                        })
                        return True
                    
                    # Try POST request
                    response = self.session.post(endpoint, json=params)
                    
                    if response.status_code in [200, 201]:
                        data = response.json()
                        
                        self.log_result("AVAILABILITY", "PASS", {
                            'endpoint': endpoint,
                            'method': 'POST',
                            'params': params,
                            'response_type': type(data).__name__,
                            'data_preview': str(data)[:200] if data else 'Empty response'
                        })
                        return True
                        
                except Exception as e:
                    continue
        
        self.log_result("AVAILABILITY", "FAIL", {
            'error': 'No availability endpoint responded successfully',
            'tested_endpoints': availability_endpoints,
            'tested_params': test_params
        })
        return False

    def test_reservation_creation(self) -> bool:
        """Test reservation creation with real court data"""
        print("📝 Testing Reservation Creation...")
        
        if not self.courts_data:
            self.log_result("RESERVATION_CREATE", "SKIP", {
                'error': 'No court data for testing reservation creation'
            })
            return False
        
        court = self.courts_data[0]
        
        # Create comprehensive reservation data
        reservation_data = {
            'court': court['id'],
            'date': (datetime.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'visitor_name': 'API Test User',
            'visitor_email': 'apitest@example.com',
            'visitor_phone': '+1234567890',
            'notes': 'Test reservation from API suite',
            'payment_status': 'pending'
        }
        
        # Alternative data formats
        reservation_alternatives = [
            reservation_data,
            {**reservation_data, 'court_id': court['id']},
            {**reservation_data, 'datetime': f"{reservation_data['date']} {reservation_data['start_time']}"},
        ]
        
        reservation_endpoints = [
            f"{API_BASE}/reservations/reservations/",
            f"{API_BASE}/reservations/",
        ]
        
        for endpoint in reservation_endpoints:
            for i, data in enumerate(reservation_alternatives):
                try:
                    response = self.session.post(endpoint, json=data)
                    
                    if response.status_code in [200, 201]:
                        created_reservation = response.json()
                        
                        self.log_result("RESERVATION_CREATE", "PASS", {
                            'endpoint': endpoint,
                            'data_format': f'Alternative {i+1}',
                            'reservation_id': created_reservation.get('id'),
                            'court': created_reservation.get('court'),
                            'visitor_name': created_reservation.get('visitor_name'),
                            'status': created_reservation.get('status'),
                            'data_preview': f"Created reservation {created_reservation.get('id')}"
                        })
                        return True
                        
                    elif response.status_code in [400, 422]:
                        # Log validation errors for analysis
                        try:
                            error_data = response.json()
                            self.log_result(f"RESERVATION_VALIDATION_{i+1}", "INFO", {
                                'endpoint': endpoint,
                                'status_code': response.status_code,
                                'validation_errors': error_data,
                                'request_data_fields': list(data.keys())
                            })
                        except:
                            pass
                            
                except Exception as e:
                    continue
        
        self.log_result("RESERVATION_CREATE", "FAIL", {
            'error': 'No reservation endpoint accepted the creation request',
            'tested_endpoints': reservation_endpoints,
            'court_used': court['id']
        })
        return False

    def test_reservation_listing(self) -> bool:
        """Test reservation listing endpoints"""
        print("📋 Testing Reservation Listing...")
        
        try:
            endpoints = [
                f"{API_BASE}/reservations/reservations/",
                f"{API_BASE}/reservations/",
            ]
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(endpoint)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Handle paginated response
                        if isinstance(data, dict) and 'results' in data:
                            reservations = data['results']
                            total_count = data.get('count', len(reservations))
                        elif isinstance(data, list):
                            reservations = data
                            total_count = len(data)
                        else:
                            reservations = []
                            total_count = 0
                        
                        self.log_result("RESERVATION_LISTING", "PASS", {
                            'endpoint': endpoint,
                            'reservations_count': len(reservations),
                            'total_count': total_count,
                            'sample_reservation': reservations[0] if reservations else None,
                            'data_preview': f"Found {len(reservations)} reservations"
                        })
                        return True
                        
                except Exception as e:
                    continue
            
            self.log_result("RESERVATION_LISTING", "FAIL", {
                'error': 'No reservation listing endpoint responded successfully'
            })
            return False
            
        except Exception as e:
            self.log_result("RESERVATION_LISTING", "ERROR", {
                'error': str(e)
            })
            return False

    def analyze_api_structure(self):
        """Analyze the overall API structure and data relationships"""
        print("🔍 Analyzing API Structure...")
        
        analysis = {
            'authentication_working': bool(self.auth_token),
            'user_context': bool(self.user_data),
            'user_has_organization': bool(self.user_data and self.user_data.get('organization')),
            'user_has_club': bool(self.user_data and self.user_data.get('club')),
            'clubs_available': len(self.clubs_data),
            'courts_available': len(self.courts_data),
            'pricing_configured': any(
                court.get('price_per_hour') for court in self.courts_data
            ) if self.courts_data else False
        }
        
        issues = []
        recommendations = []
        
        if not analysis['authentication_working']:
            issues.append("Authentication system not working")
            recommendations.append("Fix authentication credentials and login endpoint")
        
        if not analysis['user_has_organization']:
            issues.append("User lacks organization context")
            recommendations.append("Ensure users are properly assigned to organizations")
        
        if analysis['courts_available'] == 0:
            issues.append("No courts available for reservations")
            recommendations.append("Create courts and verify court endpoints")
        
        if not analysis['pricing_configured']:
            issues.append("Court pricing not configured")
            recommendations.append("Configure price_per_hour for courts")
        
        self.log_result("API_ANALYSIS", "INFO", {
            'analysis': analysis,
            'issues_found': issues,
            'recommendations': recommendations,
            'data_preview': f"{analysis['clubs_available']} clubs, {analysis['courts_available']} courts"
        })

    def run_comprehensive_test(self):
        """Run all tests in logical sequence"""
        print("🚀 Starting Fixed Reservations API Test Suite")
        print("=" * 60)
        
        # Test sequence with dependencies
        test_results = {}
        
        # 1. Authentication (required for all other tests)
        if self.authenticate():
            test_results['authentication'] = True
            
            # 2. Get clubs data
            if self.get_clubs_data():
                test_results['clubs'] = True
                
                # 3. Get courts data
                if self.get_courts_data():
                    test_results['courts'] = True
                    
                    # 4. Test availability
                    test_results['availability'] = self.test_availability_endpoint()
                    
                    # 5. Test reservation listing
                    test_results['listing'] = self.test_reservation_listing()
                    
                    # 6. Test reservation creation
                    test_results['creation'] = self.test_reservation_creation()
                else:
                    test_results['courts'] = False
            else:
                test_results['clubs'] = False
        else:
            test_results['authentication'] = False
        
        # 7. Analyze overall structure
        self.analyze_api_structure()
        
        # Generate comprehensive report
        self.generate_report(test_results)

    def generate_report(self, test_results: Dict[str, bool]):
        """Generate final comprehensive report"""
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE API TEST REPORT")
        print("=" * 60)
        
        # Test Results Summary
        total_tests = len(test_results)
        passed_tests = sum(test_results.values())
        
        print(f"\n🎯 Test Results:")
        print(f"   Passed: {passed_tests}/{total_tests} ({(passed_tests/total_tests)*100:.1f}%)")
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {status}: {test_name.title()}")
        
        # Data Summary
        print(f"\n📊 Data Summary:")
        print(f"   Authenticated User: {bool(self.user_data)}")
        print(f"   User Email: {self.user_data.get('email') if self.user_data else 'N/A'}")
        print(f"   User Organization: {self.user_data.get('organization') if self.user_data else 'N/A'}")
        print(f"   User Club: {self.user_data.get('club') if self.user_data else 'N/A'}")
        print(f"   Available Clubs: {len(self.clubs_data)}")
        print(f"   Available Courts: {len(self.courts_data)}")
        
        # Critical Issues
        print(f"\n⚠️  Critical Issues:")
        
        if not test_results.get('authentication'):
            print("   ❌ Authentication failed - blocks all operations")
        
        if not test_results.get('clubs'):
            print("   ❌ No clubs accessible - affects reservation context")
        
        if not test_results.get('courts'):
            print("   ❌ No courts accessible - prevents reservations")
        
        if not any([test_results.get('availability'), test_results.get('listing'), test_results.get('creation')]):
            print("   ❌ All reservation operations failed")
        
        # Frontend Integration Issues
        print(f"\n🔌 Frontend Integration Analysis:")
        
        if self.courts_data:
            sample_court = self.courts_data[0]
            required_fields = ['id', 'name', 'club', 'price_per_hour']
            missing_fields = [f for f in required_fields if f not in sample_court]
            
            if missing_fields:
                print(f"   ⚠️  Court data missing fields: {missing_fields}")
            else:
                print("   ✅ Court data has all required fields")
        
        if self.user_data:
            if not self.user_data.get('club'):
                print("   ⚠️  User not assigned to any club")
        
        # Recommendations
        print(f"\n💡 Recommendations for Frontend Integration:")
        
        if not test_results.get('authentication'):
            print("   1. Fix authentication - verify credentials and API endpoint")
        
        if test_results.get('authentication') and not test_results.get('clubs'):
            print("   2. Check user permissions for club access")
        
        if test_results.get('courts') and not test_results.get('availability'):
            print("   3. Implement court availability endpoint")
        
        if test_results.get('courts') and not test_results.get('creation'):
            print("   4. Review reservation creation validation logic")
        
        print("   5. Ensure frontend uses 'email' field for authentication")
        print("   6. Use '/api/v1/clubs/courts/' for court data")
        print("   7. Verify organization/club context in user sessions")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"/Users/ja/PZR4/backend/fixed_reservations_test_{timestamp}.json"
        
        final_results = {
            'timestamp': datetime.now().isoformat(),
            'test_summary': test_results,
            'detailed_results': self.test_results,
            'user_data': self.user_data,
            'clubs_data': self.clubs_data[:3] if self.clubs_data else [],  # First 3 clubs
            'courts_data': self.courts_data[:3] if self.courts_data else [],  # First 3 courts
            'critical_issues': [
                "Authentication" if not test_results.get('authentication') else None,
                "Club Access" if not test_results.get('clubs') else None,
                "Court Access" if not test_results.get('courts') else None,
            ],
            'frontend_recommendations': [
                "Use email field for authentication",
                "Use /api/v1/clubs/courts/ for court data",
                "Verify user organization context",
                "Check court availability endpoints",
                "Review reservation creation validation"
            ]
        }
        
        # Remove None values
        final_results['critical_issues'] = [i for i in final_results['critical_issues'] if i]
        
        with open(results_file, 'w') as f:
            json.dump(final_results, f, indent=2, default=str)
        
        print(f"\n💾 Detailed results saved to: {results_file}")


def main():
    """Main execution function"""
    tester = ReservationAPITester()
    tester.run_comprehensive_test()


if __name__ == "__main__":
    main()