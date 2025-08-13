#!/usr/bin/env python3
"""
FINAL Reservations API Test Suite - Complete Validation
=======================================================

This script performs the final comprehensive test of the reservations API
with all the fixes and correct data structures identified from previous tests.

Key Findings Applied:
1. Authentication uses 'email' field, not 'username'
2. Courts endpoint is '/api/v1/clubs/courts/'
3. Availability endpoint works at '/api/v1/reservations/reservations/check_availability/'
4. Reservation creation requires 'club' and 'player_name' fields
5. Users need organization membership to access clubs

Usage:
    python test_reservations_final.py
"""

import json
import requests
from datetime import datetime, timedelta
from typing import Dict, Any

# Test Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Working credentials (established from previous tests)
WORKING_CREDENTIALS = {
    "email": "apitest@padelyzer.com", 
    "password": "TEST_PASSWORD"
}

class FinalReservationAPITest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.club_data = None
        self.court_data = None
        self.test_results = {}
        
        # Set headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Padelyzer-Final-API-Test/1.0'
        })

    def log_test(self, test_name: str, status: str, details: Dict[str, Any]):
        """Log test results"""
        self.test_results[test_name] = {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_emoji} {test_name}: {status}")
        
        if details.get('summary'):
            print(f"   {details['summary']}")

    def authenticate(self) -> bool:
        """Authenticate with working credentials"""
        print("🔐 Testing Authentication...")
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login/", json=WORKING_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data['access']
                self.user_data = data.get('user', {})
                self.session.headers['Authorization'] = f'Bearer {self.auth_token}'
                
                self.log_test("AUTHENTICATION", "PASS", {
                    'summary': f"Authenticated as {self.user_data.get('email')}",
                    'user_id': self.user_data.get('id'),
                    'is_staff': self.user_data.get('is_staff')
                })
                return True
            else:
                self.log_test("AUTHENTICATION", "FAIL", {
                    'summary': f"Status {response.status_code}",
                    'error': response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_test("AUTHENTICATION", "FAIL", {
                'summary': f"Exception: {str(e)}"
            })
            return False

    def get_club_data(self) -> bool:
        """Get club data"""
        print("🏢 Testing Club Data Access...")
        
        try:
            response = self.session.get(f"{API_BASE}/clubs/")
            
            if response.status_code == 200:
                data = response.json()
                clubs = data.get('results', data) if isinstance(data, dict) else data
                
                if clubs:
                    self.club_data = clubs[0]
                    
                    self.log_test("CLUB_ACCESS", "PASS", {
                        'summary': f"Found {len(clubs)} clubs",
                        'club_id': self.club_data['id'],
                        'club_name': self.club_data['name']
                    })
                    return True
                else:
                    self.log_test("CLUB_ACCESS", "FAIL", {
                        'summary': "No clubs found"
                    })
                    return False
            else:
                self.log_test("CLUB_ACCESS", "FAIL", {
                    'summary': f"Status {response.status_code}",
                    'error': response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_test("CLUB_ACCESS", "FAIL", {
                'summary': f"Exception: {str(e)}"
            })
            return False

    def get_court_data(self) -> bool:
        """Get court data"""
        print("🏟️  Testing Court Data Access...")
        
        try:
            response = self.session.get(f"{API_BASE}/clubs/courts/")
            
            if response.status_code == 200:
                data = response.json()
                courts = data.get('results', data) if isinstance(data, dict) else data
                
                if courts:
                    self.court_data = courts[0]
                    
                    # Check required fields
                    required_fields = ['id', 'name', 'club', 'price_per_hour']
                    missing_fields = [f for f in required_fields if f not in self.court_data]
                    
                    self.log_test("COURT_ACCESS", "PASS", {
                        'summary': f"Found {len(courts)} courts",
                        'court_id': self.court_data['id'],
                        'court_name': self.court_data['name'],
                        'price_per_hour': self.court_data.get('price_per_hour'),
                        'missing_fields': missing_fields
                    })
                    return True
                else:
                    self.log_test("COURT_ACCESS", "FAIL", {
                        'summary': "No courts found"
                    })
                    return False
            else:
                self.log_test("COURT_ACCESS", "FAIL", {
                    'summary': f"Status {response.status_code}",
                    'error': response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_test("COURT_ACCESS", "FAIL", {
                'summary': f"Exception: {str(e)}"
            })
            return False

    def test_availability(self) -> bool:
        """Test court availability endpoint"""
        print("📅 Testing Court Availability...")
        
        if not self.club_data:
            self.log_test("AVAILABILITY", "SKIP", {
                'summary': "No club data available"
            })
            return False
        
        try:
            test_params = {
                'club': self.club_data['id'],
                'date': datetime.now().date().isoformat()
            }
            
            response = self.session.post(f"{API_BASE}/reservations/reservations/check_availability/", json=test_params)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check availability data structure
                has_date = 'date' in data
                has_availability = 'availability' in data
                courts_available = len(data.get('availability', []))
                
                self.log_test("AVAILABILITY", "PASS", {
                    'summary': f"Available slots for {courts_available} courts",
                    'has_date': has_date,
                    'has_availability': has_availability,
                    'test_date': test_params['date']
                })
                return True
            else:
                self.log_test("AVAILABILITY", "FAIL", {
                    'summary': f"Status {response.status_code}",
                    'error': response.text[:200],
                    'test_params': test_params
                })
                return False
                
        except Exception as e:
            self.log_test("AVAILABILITY", "FAIL", {
                'summary': f"Exception: {str(e)}"
            })
            return False

    def test_reservation_creation(self) -> bool:
        """Test reservation creation with correct field names"""
        print("📝 Testing Reservation Creation...")
        
        if not self.club_data or not self.court_data:
            self.log_test("RESERVATION_CREATE", "SKIP", {
                'summary': "Missing club or court data"
            })
            return False
        
        try:
            # Use correct field names based on validation errors
            reservation_data = {
                'club': self.club_data['id'],  # Required field
                'court': self.court_data['id'],
                'date': (datetime.now() + timedelta(days=1)).date().isoformat(),
                'start_time': '10:00:00',
                'end_time': '11:00:00',
                'player_name': 'API Test Player',  # Required field (not visitor_name)
                'player_email': 'test@example.com',
                'player_phone': '+1234567890',
                'notes': 'Test reservation created via API'
            }
            
            response = self.session.post(f"{API_BASE}/reservations/reservations/", json=reservation_data)
            
            if response.status_code in [200, 201]:
                created_reservation = response.json()
                
                self.log_test("RESERVATION_CREATE", "PASS", {
                    'summary': f"Created reservation {created_reservation.get('id')}",
                    'reservation_id': created_reservation.get('id'),
                    'court': created_reservation.get('court'),
                    'player_name': created_reservation.get('player_name'),
                    'date': created_reservation.get('date'),
                    'status': created_reservation.get('status')
                })
                return True
            else:
                # Show validation errors for analysis
                try:
                    error_data = response.json()
                    self.log_test("RESERVATION_CREATE", "FAIL", {
                        'summary': f"Validation failed (Status {response.status_code})",
                        'validation_errors': error_data,
                        'request_data_keys': list(reservation_data.keys())
                    })
                except:
                    self.log_test("RESERVATION_CREATE", "FAIL", {
                        'summary': f"Status {response.status_code}",
                        'error': response.text[:300]
                    })
                return False
                
        except Exception as e:
            self.log_test("RESERVATION_CREATE", "FAIL", {
                'summary': f"Exception: {str(e)}"
            })
            return False

    def test_reservation_listing(self) -> bool:
        """Test reservation listing"""
        print("📋 Testing Reservation Listing...")
        
        try:
            response = self.session.get(f"{API_BASE}/reservations/reservations/")
            
            if response.status_code == 200:
                data = response.json()
                reservations = data.get('results', data) if isinstance(data, dict) else data
                
                self.log_test("RESERVATION_LIST", "PASS", {
                    'summary': f"Found {len(reservations)} reservations",
                    'total_count': data.get('count', len(reservations)) if isinstance(data, dict) else len(reservations),
                    'sample_reservation_id': reservations[0]['id'] if reservations else None
                })
                return True
            else:
                self.log_test("RESERVATION_LIST", "FAIL", {
                    'summary': f"Status {response.status_code}",
                    'error': response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_test("RESERVATION_LIST", "FAIL", {
                'summary': f"Exception: {str(e)}"
            })
            return False

    def run_final_test(self):
        """Run complete final test sequence"""
        print("🚀 FINAL RESERVATIONS API VALIDATION")
        print("=" * 50)
        
        # Test sequence
        tests = [
            ("Authentication", self.authenticate),
            ("Club Access", self.get_club_data),
            ("Court Access", self.get_court_data),
            ("Availability Check", self.test_availability),
            ("Reservation Listing", self.test_reservation_listing),
            ("Reservation Creation", self.test_reservation_creation),
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            print(f"\n📋 {test_name}...")
            try:
                results[test_name.lower().replace(" ", "_")] = test_func()
            except Exception as e:
                results[test_name.lower().replace(" ", "_")] = False
                print(f"❌ {test_name}: ERROR - {e}")
        
        # Generate Final Report
        self.generate_final_report(results)

    def generate_final_report(self, results: Dict[str, bool]):
        """Generate comprehensive final report"""
        print("\n" + "=" * 60)
        print("📊 FINAL API VALIDATION REPORT")
        print("=" * 60)
        
        # Calculate success metrics
        total_tests = len(results)
        passed_tests = sum(results.values())
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"\n🎯 Overall Results:")
        print(f"   Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        # Individual test results
        print(f"\n📋 Test Results:")
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {status}: {test_name.replace('_', ' ').title()}")
        
        # API Data Summary
        print(f"\n📊 API Data Summary:")
        print(f"   Authentication: {'✅ Working' if self.auth_token else '❌ Failed'}")
        print(f"   User ID: {self.user_data.get('id') if self.user_data else 'N/A'}")
        print(f"   User Email: {self.user_data.get('email') if self.user_data else 'N/A'}")
        print(f"   Club Available: {'✅ Yes' if self.club_data else '❌ No'}")
        print(f"   Club Name: {self.club_data.get('name') if self.club_data else 'N/A'}")
        print(f"   Courts Available: {'✅ Yes' if self.court_data else '❌ No'}")
        print(f"   Court Pricing: ${self.court_data.get('price_per_hour', 'N/A')}/hour" if self.court_data else "   Court Pricing: N/A")
        
        # Critical Issues Analysis
        critical_issues = []
        if not results.get('authentication'):
            critical_issues.append("Authentication system failure")
        if not results.get('club_access'):
            critical_issues.append("Cannot access club data")
        if not results.get('court_access'):
            critical_issues.append("Cannot access court data")
        if not results.get('availability_check'):
            critical_issues.append("Court availability check failing")
        
        if critical_issues:
            print(f"\n⚠️  Critical Issues:")
            for issue in critical_issues:
                print(f"   ❌ {issue}")
        else:
            print(f"\n✅ No Critical Issues Found")
        
        # Frontend Integration Assessment
        print(f"\n🔌 Frontend Integration Assessment:")
        
        # Authentication
        if results.get('authentication'):
            print("   ✅ Authentication: Use 'email' field for login")
        else:
            print("   ❌ Authentication: Fix login credentials")
        
        # Data Access
        if results.get('club_access') and results.get('court_access'):
            print("   ✅ Data Access: Clubs and courts accessible")
        else:
            print("   ❌ Data Access: Check organization membership")
        
        # Core Functionality
        if results.get('availability_check'):
            print("   ✅ Availability: Court availability system working")
        else:
            print("   ❌ Availability: Fix availability endpoint")
        
        # Reservations
        if results.get('reservation_creation'):
            print("   ✅ Reservations: Creation system working")
        else:
            print("   ⚠️  Reservations: Check required fields (club, player_name)")
        
        # Final Recommendations
        print(f"\n💡 Final Recommendations:")
        
        if success_rate >= 90:
            print("   🎉 API is production-ready!")
            print("   - All core functionality working")
            print("   - Minor optimizations may be beneficial")
        elif success_rate >= 75:
            print("   ⚠️  API mostly functional with minor issues:")
            if not results.get('reservation_creation'):
                print("   - Fix reservation creation validation")
            print("   - Address any remaining validation errors")
        else:
            print("   ❌ API needs significant fixes:")
            for test_name, result in results.items():
                if not result:
                    print(f"   - Fix {test_name.replace('_', ' ')}")
        
        # API Endpoint Summary
        print(f"\n🔗 Working API Endpoints:")
        if results.get('authentication'):
            print("   ✅ POST /api/v1/auth/login/ (email, password)")
        if results.get('club_access'):
            print("   ✅ GET /api/v1/clubs/")
        if results.get('court_access'):
            print("   ✅ GET /api/v1/clubs/courts/")
        if results.get('availability_check'):
            print("   ✅ POST /api/v1/reservations/reservations/check_availability/")
        if results.get('reservation_listing'):
            print("   ✅ GET /api/v1/reservations/reservations/")
        if results.get('reservation_creation'):
            print("   ✅ POST /api/v1/reservations/reservations/ (club, court, player_name)")
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"/Users/ja/PZR4/backend/final_api_validation_{timestamp}.json"
        
        final_data = {
            'timestamp': datetime.now().isoformat(),
            'success_rate': success_rate,
            'test_results': results,
            'detailed_logs': self.test_results,
            'user_data': self.user_data,
            'club_data': self.club_data,
            'court_data': self.court_data,
            'critical_issues': critical_issues,
            'api_ready_for_production': success_rate >= 90,
            'frontend_integration_notes': {
                'auth_field': 'email',
                'courts_endpoint': '/api/v1/clubs/courts/',
                'availability_endpoint': '/api/v1/reservations/reservations/check_availability/',
                'reservations_endpoint': '/api/v1/reservations/reservations/',
                'required_reservation_fields': ['club', 'court', 'player_name', 'date', 'start_time', 'end_time']
            }
        }
        
        with open(results_file, 'w') as f:
            json.dump(final_data, f, indent=2, default=str)
        
        print(f"\n💾 Complete results saved to: {results_file}")
        
        return success_rate >= 75  # Return True if API is mostly functional


def main():
    """Main execution"""
    tester = FinalReservationAPITest()
    api_functional = tester.run_final_test()
    
    if api_functional:
        print("\n🎉 API VALIDATION SUCCESSFUL - Ready for frontend integration!")
    else:
        print("\n⚠️  API needs fixes before frontend integration")


if __name__ == "__main__":
    main()