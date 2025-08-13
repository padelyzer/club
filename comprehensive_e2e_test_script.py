#!/usr/bin/env python3
"""
Padelyzer E2E Testing Script
============================

This script performs comprehensive end-to-end testing of the Padelyzer system
without relying on complex authentication setups. It validates both backend API
endpoints and frontend page accessibility.

Author: Claude Code Assistant
Date: August 13, 2025
"""

import json
import requests
import time
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
DEFAULT_TIMEOUT = 10

class Color:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class TestResult:
    """Container for test results"""
    def __init__(self, name: str, endpoint: str, status: str, 
                 response_time: float, details: str = "", 
                 status_code: Optional[int] = None):
        self.name = name
        self.endpoint = endpoint
        self.status = status  # 'PASS', 'FAIL', 'WARN'
        self.response_time = response_time
        self.details = details
        self.status_code = status_code
        self.timestamp = datetime.now()

class E2ETestRunner:
    """Main test runner class"""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.auth_token: Optional[str] = None
        self.auth_cookies: Optional[str] = None
        
    def print_header(self, text: str):
        """Print formatted header"""
        print(f"\n{Color.BOLD}{Color.BLUE}{'='*60}{Color.END}")
        print(f"{Color.BOLD}{Color.BLUE}{text.center(60)}{Color.END}")
        print(f"{Color.BOLD}{Color.BLUE}{'='*60}{Color.END}")
    
    def print_status(self, name: str, status: str, details: str = ""):
        """Print test status"""
        if status == "PASS":
            symbol = f"{Color.GREEN}✓{Color.END}"
            status_text = f"{Color.GREEN}PASS{Color.END}"
        elif status == "FAIL":
            symbol = f"{Color.RED}✗{Color.END}"
            status_text = f"{Color.RED}FAIL{Color.END}"
        else:  # WARN
            symbol = f"{Color.YELLOW}⚠{Color.END}"
            status_text = f"{Color.YELLOW}WARN{Color.END}"
        
        print(f"{symbol} {name:<40} {status_text}")
        if details:
            print(f"   {Color.CYAN}Details:{Color.END} {details}")
    
    def make_request(self, method: str, url: str, headers: Dict = None, 
                    data: Dict = None, timeout: int = DEFAULT_TIMEOUT) -> requests.Response:
        """Make HTTP request with error handling"""
        try:
            start_time = time.time()
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.response_time = time.time() - start_time
            return response
            
        except requests.RequestException as e:
            # Create a mock response object for failed requests
            response = requests.Response()
            response.status_code = 0
            response._content = str(e).encode()
            response.response_time = time.time() - start_time
            return response
    
    def test_backend_health(self) -> TestResult:
        """Test backend health endpoint"""
        print(f"\n{Color.CYAN}Testing Backend Health...{Color.END}")
        
        response = self.make_request('GET', f"{BACKEND_URL}/health/")
        
        if response.status_code == 200:
            try:
                data = response.json()
                status = "PASS" if data.get('status') == 'healthy' else "WARN"
                details = f"Status: {data.get('status')}, Checks: {len(data.get('checks', {}))}"
            except json.JSONDecodeError:
                status = "WARN"
                details = "Invalid JSON response"
        else:
            status = "FAIL"
            details = f"Status code: {response.status_code}"
        
        result = TestResult("Backend Health Check", "/health/", status, 
                          response.response_time, details, response.status_code)
        self.results.append(result)
        self.print_status(result.name, result.status, result.details)
        return result
    
    def test_api_root(self) -> TestResult:
        """Test API root endpoint"""
        print(f"\n{Color.CYAN}Testing API Root...{Color.END}")
        
        response = self.make_request('GET', f"{BACKEND_URL}/api/v1/")
        
        if response.status_code == 200:
            try:
                data = response.json()
                status = "PASS" if data.get('name') == 'Padelyzer API' else "WARN"
                details = f"API: {data.get('name')}, Version: {data.get('version')}"
            except json.JSONDecodeError:
                status = "WARN"
                details = "Invalid JSON response"
        else:
            status = "FAIL"
            details = f"Status code: {response.status_code}"
        
        result = TestResult("API Root Endpoint", "/api/v1/", status,
                          response.response_time, details, response.status_code)
        self.results.append(result)
        self.print_status(result.name, result.status, result.details)
        return result
    
    def test_authentication(self) -> TestResult:
        """Test authentication endpoint and get token"""
        print(f"\n{Color.CYAN}Testing Authentication...{Color.END}")
        
        # First, set up admin user password
        self.setup_test_user()
        
        auth_data = {
            "email": "admin@padelyzer.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', f"{BACKEND_URL}/api/v1/auth/login/", 
                                   headers={"Content-Type": "application/json"},
                                   data=auth_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.auth_token = data.get('access')
                status = "PASS" if self.auth_token else "WARN"
                details = f"Token received, User: {data.get('user', {}).get('email', 'Unknown')}"
            except json.JSONDecodeError:
                status = "WARN"
                details = "Invalid JSON response"
        else:
            status = "FAIL"
            details = f"Status code: {response.status_code}, Response: {response.text[:100]}"
        
        result = TestResult("User Authentication", "/api/v1/auth/login/", status,
                          response.response_time, details, response.status_code)
        self.results.append(result)
        self.print_status(result.name, result.status, result.details)
        return result
    
    def setup_test_user(self):
        """Setup test user with known credentials"""
        try:
            cmd = [
                'python3', 'manage.py', 'shell', '-c',
                '''
from apps.authentication.models import User
try:
    admin = User.objects.get(email='admin@padelyzer.com')
    admin.set_password('admin123')
    admin.save()
    print("Admin password reset successfully")
except User.DoesNotExist:
    print("Admin user not found")
except Exception as e:
    print(f"Error: {e}")
                '''
            ]
            
            # Change to backend directory and activate venv
            subprocess.run(['bash', '-c', 'cd /Users/ja/PZR4/backend && source venv/bin/activate && ' + ' '.join(cmd)], 
                         capture_output=True, text=True, cwd='/Users/ja/PZR4/backend')
        except Exception as e:
            print(f"Warning: Could not setup test user: {e}")
    
    def test_protected_endpoints(self) -> List[TestResult]:
        """Test protected API endpoints with authentication"""
        print(f"\n{Color.CYAN}Testing Protected Endpoints...{Color.END}")
        
        if not self.auth_token:
            result = TestResult("Protected Endpoints", "Multiple", "FAIL",
                              0, "No auth token available")
            self.results.append(result)
            self.print_status(result.name, result.status, result.details)
            return [result]
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        endpoints = [
            ("/api/v1/clubs/", "Clubs List"),
            ("/api/v1/reservations/", "Reservations List"),
            ("/api/v1/clients/", "Clients List"),
        ]
        
        results = []
        for endpoint, name in endpoints:
            response = self.make_request('GET', f"{BACKEND_URL}{endpoint}", headers=headers)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    count = data.get('count', 0)
                    status = "PASS"
                    details = f"Retrieved {count} items"
                except json.JSONDecodeError:
                    status = "WARN"
                    details = "Invalid JSON response"
            elif response.status_code == 401:
                status = "FAIL"
                details = "Authentication failed"
            else:
                status = "FAIL"
                details = f"Status code: {response.status_code}"
            
            result = TestResult(name, endpoint, status,
                              response.response_time, details, response.status_code)
            results.append(result)
            self.results.append(result)
            self.print_status(result.name, result.status, result.details)
        
        return results
    
    def test_frontend_pages(self) -> List[TestResult]:
        """Test frontend page accessibility"""
        print(f"\n{Color.CYAN}Testing Frontend Pages...{Color.END}")
        
        # Test public pages
        public_pages = [
            ("/es/login", "Login Page"),
            ("/", "Home Page"),
        ]
        
        results = []
        for path, name in public_pages:
            response = self.make_request('GET', f"{FRONTEND_URL}{path}")
            
            if response.status_code == 200:
                status = "PASS"
                details = f"Page loads successfully ({len(response.content)} bytes)"
            elif response.status_code == 307:  # Redirect
                status = "PASS"
                details = f"Redirected (expected behavior)"
            else:
                status = "FAIL" 
                details = f"Status code: {response.status_code}"
            
            result = TestResult(name, path, status,
                              response.response_time, details, response.status_code)
            results.append(result)
            self.results.append(result)
            self.print_status(result.name, result.status, result.details)
        
        return results
    
    def test_frontend_protected_pages(self) -> List[TestResult]:
        """Test protected frontend pages"""
        print(f"\n{Color.CYAN}Testing Protected Frontend Pages...{Color.END}")
        
        if not self.auth_token:
            result = TestResult("Protected Frontend Pages", "Multiple", "FAIL",
                              0, "No auth token available")
            self.results.append(result)
            self.print_status(result.name, result.status, result.details)
            return [result]
        
        # Set up cookies for authenticated requests
        cookie_header = f"access_token={self.auth_token}; preferred_club=api-test-padel-club"
        headers = {"Cookie": cookie_header}
        
        protected_pages = [
            ("/es/dashboard-produccion", "Dashboard"),
            ("/es/api-test-padel-club", "Club Page"),
            ("/es/api-test-padel-club/reservations", "Reservations Page"),
        ]
        
        results = []
        for path, name in protected_pages:
            response = self.make_request('GET', f"{FRONTEND_URL}{path}", headers=headers)
            
            if response.status_code == 200:
                status = "PASS"
                details = f"Page loads successfully ({len(response.content)} bytes)"
            elif response.status_code == 307:  # Redirect to login
                status = "WARN"
                details = "Redirected to login (auth may have failed)"
            else:
                status = "FAIL"
                details = f"Status code: {response.status_code}"
            
            result = TestResult(name, path, status,
                              response.response_time, details, response.status_code)
            results.append(result)
            self.results.append(result)
            self.print_status(result.name, result.status, result.details)
        
        return results
    
    def test_database_connectivity(self) -> TestResult:
        """Test database connectivity through health check"""
        print(f"\n{Color.CYAN}Testing Database Connectivity...{Color.END}")
        
        response = self.make_request('GET', f"{BACKEND_URL}/health/")
        
        if response.status_code == 200:
            try:
                data = response.json()
                db_check = data.get('checks', {}).get('database', {})
                db_status = db_check.get('status')
                
                if db_status == 'ok':
                    status = "PASS"
                    details = f"DB response time: {db_check.get('response_time_ms', 0)}ms"
                else:
                    status = "FAIL"
                    details = f"Database status: {db_status}"
            except (json.JSONDecodeError, KeyError):
                status = "WARN"
                details = "Could not parse database status"
        else:
            status = "FAIL"
            details = f"Health check failed: {response.status_code}"
        
        result = TestResult("Database Connectivity", "/health/", status,
                          response.response_time, details, response.status_code)
        self.results.append(result)
        self.print_status(result.name, result.status, result.details)
        return result
    
    def test_system_performance(self) -> List[TestResult]:
        """Test basic system performance"""
        print(f"\n{Color.CYAN}Testing System Performance...{Color.END}")
        
        results = []
        
        # Test response times
        response = self.make_request('GET', f"{BACKEND_URL}/api/v1/")
        
        if response.status_code == 200:
            if response.response_time < 1.0:
                status = "PASS"
                details = f"Response time: {response.response_time:.3f}s"
            elif response.response_time < 3.0:
                status = "WARN"
                details = f"Slow response: {response.response_time:.3f}s"
            else:
                status = "FAIL"
                details = f"Very slow response: {response.response_time:.3f}s"
        else:
            status = "FAIL"
            details = f"Request failed: {response.status_code}"
        
        result = TestResult("API Response Time", "/api/v1/", status,
                          response.response_time, details, response.status_code)
        results.append(result)
        self.results.append(result)
        self.print_status(result.name, result.status, result.details)
        
        # Test frontend response time
        response = self.make_request('GET', f"{FRONTEND_URL}/es/login")
        
        if response.status_code == 200:
            if response.response_time < 2.0:
                status = "PASS"
                details = f"Response time: {response.response_time:.3f}s"
            elif response.response_time < 5.0:
                status = "WARN"
                details = f"Slow response: {response.response_time:.3f}s"
            else:
                status = "FAIL"
                details = f"Very slow response: {response.response_time:.3f}s"
        else:
            status = "FAIL"
            details = f"Request failed: {response.status_code}"
        
        result = TestResult("Frontend Response Time", "/es/login", status,
                          response.response_time, details, response.status_code)
        results.append(result)
        self.results.append(result)
        self.print_status(result.name, result.status, result.details)
        
        return results
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.results)
        passed = len([r for r in self.results if r.status == "PASS"])
        failed = len([r for r in self.results if r.status == "FAIL"])
        warned = len([r for r in self.results if r.status == "WARN"])
        
        avg_response_time = sum(r.response_time for r in self.results) / total_tests if total_tests > 0 else 0
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed": passed,
                "failed": failed,
                "warnings": warned,
                "success_rate": (passed / total_tests * 100) if total_tests > 0 else 0,
                "average_response_time": avg_response_time
            },
            "system_status": "HEALTHY" if failed == 0 else "DEGRADED" if passed > failed else "CRITICAL",
            "critical_paths": {
                "backend_api": "PASS" if any(r.name == "API Root Endpoint" and r.status == "PASS" for r in self.results) else "FAIL",
                "authentication": "PASS" if any(r.name == "User Authentication" and r.status == "PASS" for r in self.results) else "FAIL",
                "frontend_login": "PASS" if any(r.name == "Login Page" and r.status == "PASS" for r in self.results) else "FAIL",
                "database": "PASS" if any(r.name == "Database Connectivity" and r.status == "PASS" for r in self.results) else "FAIL"
            },
            "detailed_results": [
                {
                    "name": r.name,
                    "endpoint": r.endpoint,
                    "status": r.status,
                    "response_time": r.response_time,
                    "details": r.details,
                    "status_code": r.status_code,
                    "timestamp": r.timestamp.isoformat()
                }
                for r in self.results
            ]
        }
        
        return report
    
    def print_summary(self, report: Dict[str, Any]):
        """Print test summary"""
        summary = report["summary"]
        
        self.print_header("TEST SUMMARY")
        
        # Overall status
        status = report["system_status"]
        if status == "HEALTHY":
            status_color = Color.GREEN
        elif status == "DEGRADED":
            status_color = Color.YELLOW
        else:
            status_color = Color.RED
        
        print(f"\n{Color.BOLD}System Status:{Color.END} {status_color}{status}{Color.END}")
        print(f"{Color.BOLD}Success Rate:{Color.END} {summary['success_rate']:.1f}%")
        
        # Test counts
        print(f"\n{Color.BOLD}Test Results:{Color.END}")
        print(f"  {Color.GREEN}✓ Passed:{Color.END} {summary['passed']}")
        print(f"  {Color.RED}✗ Failed:{Color.END} {summary['failed']}")
        print(f"  {Color.YELLOW}⚠ Warnings:{Color.END} {summary['warnings']}")
        print(f"  {Color.CYAN}Total Tests:{Color.END} {summary['total_tests']}")
        
        # Performance
        print(f"\n{Color.BOLD}Performance:{Color.END}")
        print(f"  Average Response Time: {summary['average_response_time']:.3f}s")
        
        # Critical paths
        print(f"\n{Color.BOLD}Critical Paths Status:{Color.END}")
        critical = report["critical_paths"]
        for path, status in critical.items():
            color = Color.GREEN if status == "PASS" else Color.RED
            print(f"  {path.replace('_', ' ').title()}: {color}{status}{Color.END}")
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return report"""
        self.print_header("PADELYZER E2E TESTING")
        print(f"{Color.CYAN}Starting comprehensive system validation...{Color.END}")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Frontend URL: {FRONTEND_URL}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run all test suites
        self.test_backend_health()
        self.test_api_root()
        self.test_authentication()
        self.test_database_connectivity()
        self.test_protected_endpoints()
        self.test_frontend_pages()
        self.test_frontend_protected_pages()
        self.test_system_performance()
        
        # Generate and display report
        report = self.generate_report()
        self.print_summary(report)
        
        return report

def main():
    """Main function"""
    runner = E2ETestRunner()
    
    try:
        report = runner.run_all_tests()
        
        # Save report to file
        report_filename = f"/Users/ja/PZR4/e2e_test_report_{int(time.time())}.json"
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n{Color.BOLD}{Color.BLUE}Report saved to:{Color.END} {report_filename}")
        
        # Return appropriate exit code
        if report["system_status"] == "CRITICAL":
            return 2
        elif report["system_status"] == "DEGRADED":
            return 1
        else:
            return 0
            
    except KeyboardInterrupt:
        print(f"\n{Color.YELLOW}Tests interrupted by user{Color.END}")
        return 130
    except Exception as e:
        print(f"\n{Color.RED}Test execution failed: {e}{Color.END}")
        return 1

if __name__ == "__main__":
    exit(main())