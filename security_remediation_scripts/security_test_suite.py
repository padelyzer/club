#!/usr/bin/env python3
"""
SECURITY TEST SUITE
Comprehensive security tests for validation after fixes
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path
import subprocess
import re

class SecurityTestSuite:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "critical_issues": [],
            "high_issues": [],
            "details": {}
        }
        
    def run_test(self, test_name, test_func):
        """Run a single test and record results."""
        print(f"\n🧪 Testing: {test_name}")
        self.test_results["tests_run"] += 1
        
        try:
            result, details = test_func()
            if result:
                print(f"  ✅ PASSED")
                self.test_results["tests_passed"] += 1
            else:
                print(f"  ❌ FAILED: {details}")
                self.test_results["tests_failed"] += 1
                
            self.test_results["details"][test_name] = {
                "passed": result,
                "details": details
            }
            return result
            
        except Exception as e:
            print(f"  💥 ERROR: {str(e)}")
            self.test_results["tests_failed"] += 1
            self.test_results["details"][test_name] = {
                "passed": False,
                "details": f"Exception: {str(e)}"
            }
            return False
            
    def test_nextjs_version(self):
        """Test if Next.js is updated to secure version."""
        package_json_path = self.root_dir / "frontend/package.json"
        
        if not package_json_path.exists():
            return False, "package.json not found"
            
        with open(package_json_path, 'r') as f:
            package_data = json.load(f)
            
        next_version = package_data.get("dependencies", {}).get("next", "")
        
        # Check if version is 14.2.31 or higher
        if "14.2.31" in next_version or "14.2.32" in next_version or "14.3" in next_version:
            return True, f"Next.js version {next_version} is secure"
        else:
            self.test_results["critical_issues"].append(f"Next.js version {next_version} is vulnerable")
            return False, f"Next.js version {next_version} is still vulnerable"
            
    def test_xlsx_removed(self):
        """Test if vulnerable XLSX package is removed."""
        package_json_path = self.root_dir / "frontend/package.json"
        
        with open(package_json_path, 'r') as f:
            package_data = json.load(f)
            
        dependencies = package_data.get("dependencies", {})
        dev_dependencies = package_data.get("devDependencies", {})
        
        if "xlsx" in dependencies or "xlsx" in dev_dependencies:
            self.test_results["high_issues"].append("XLSX package still present")
            return False, "XLSX package found in dependencies"
        
        # Also check node_modules
        xlsx_path = self.root_dir / "frontend/node_modules/xlsx"
        if xlsx_path.exists():
            return False, "XLSX package found in node_modules"
            
        return True, "XLSX package successfully removed"
        
    def test_django_debug_setting(self):
        """Test if DEBUG is properly set to False in production."""
        prod_settings = self.root_dir / "backend/config/settings/production.py"
        
        if not prod_settings.exists():
            return False, "production.py not found"
            
        content = prod_settings.read_text()
        
        # Check for DEBUG = False
        if re.search(r'DEBUG\s*=\s*False', content):
            return True, "DEBUG is set to False"
        elif re.search(r'DEBUG\s*=\s*True', content):
            self.test_results["critical_issues"].append("DEBUG=True in production")
            return False, "DEBUG is set to True in production!"
        else:
            return True, "DEBUG not explicitly set (defaults to False)"
            
    def test_security_headers(self):
        """Test if security headers are configured."""
        settings_files = list(self.root_dir.glob("backend/config/settings/*.py"))
        
        required_headers = [
            "SECURE_SSL_REDIRECT",
            "SESSION_COOKIE_SECURE",
            "CSRF_COOKIE_SECURE",
            "SECURE_HSTS_SECONDS",
            "X_FRAME_OPTIONS",
            "SECURE_CONTENT_TYPE_NOSNIFF"
        ]
        
        headers_found = []
        
        for settings_file in settings_files:
            content = settings_file.read_text()
            for header in required_headers:
                if header in content:
                    headers_found.append(header)
                    
        headers_found = list(set(headers_found))
        missing_headers = [h for h in required_headers if h not in headers_found]
        
        if not missing_headers:
            return True, f"All {len(required_headers)} security headers configured"
        else:
            self.test_results["high_issues"].extend([f"Missing header: {h}" for h in missing_headers])
            return False, f"Missing headers: {', '.join(missing_headers)}"
            
    def test_cors_configuration(self):
        """Test if CORS is restrictively configured."""
        settings_files = list(self.root_dir.glob("backend/config/settings/*.py"))
        
        cors_permissive = False
        cors_restrictive = False
        
        for settings_file in settings_files:
            content = settings_file.read_text()
            
            if re.search(r'CORS_ALLOW_ALL_ORIGINS\s*=\s*True', content):
                cors_permissive = True
                if "production" in str(settings_file):
                    self.test_results["critical_issues"].append("CORS_ALLOW_ALL_ORIGINS=True in production")
                    
            if re.search(r'CORS_ALLOWED_ORIGINS\s*=\s*\[', content):
                cors_restrictive = True
                
        if cors_permissive and "development" not in str(settings_file):
            return False, "CORS is permissively configured"
        elif cors_restrictive:
            return True, "CORS is restrictively configured"
        else:
            return False, "CORS configuration not found"
            
    def test_console_logs(self):
        """Test if console.logs are removed from production code."""
        console_count = 0
        files_with_console = []
        
        for ext in ['*.js', '*.jsx', '*.ts', '*.tsx']:
            for file_path in self.root_dir.glob(f"frontend/src/**/{ext}"):
                if 'node_modules' in str(file_path) or '__tests__' in str(file_path):
                    continue
                    
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                matches = re.findall(r'console\.\w+\(', content)
                if matches:
                    console_count += len(matches)
                    files_with_console.append(file_path.name)
                    
        if console_count == 0:
            return True, "No console.logs found in production code"
        else:
            return False, f"Found {console_count} console.logs in {len(files_with_console)} files"
            
    def test_environment_template(self):
        """Test if secure environment template exists."""
        env_templates = [
            self.root_dir / "backend/.env.production.template",
            self.root_dir / "backend/.env.example.production"
        ]
        
        template_found = None
        for template_path in env_templates:
            if template_path.exists():
                template_found = template_path
                break
                
        if not template_found:
            return False, "No production environment template found"
            
        content = template_found.read_text()
        
        # Check for secure defaults
        secure_patterns = [
            "DEBUG=False",
            "SECURE_SSL_REDIRECT=True",
            "SESSION_COOKIE_SECURE=True",
            "ENABLE_CAPTCHA=True"
        ]
        
        patterns_found = sum(1 for pattern in secure_patterns if pattern in content)
        
        if patterns_found >= 3:
            return True, f"Secure template with {patterns_found}/4 security settings"
        else:
            return False, f"Template missing security settings ({patterns_found}/4)"
            
    def test_sensitive_data_exposure(self):
        """Test for hardcoded sensitive data."""
        sensitive_patterns = [
            (r'sk_live_[a-zA-Z0-9]{24,}', 'Stripe live key'),
            (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
            (r'["\']password["\']\s*[:=]\s*["\'][^"\']+["\']', 'Hardcoded password'),
        ]
        
        exposures = []
        
        for pattern, description in sensitive_patterns:
            # Check Python files
            for py_file in self.root_dir.glob("backend/**/*.py"):
                if 'migrations' in str(py_file) or '__pycache__' in str(py_file):
                    continue
                    
                content = py_file.read_text(encoding='utf-8', errors='ignore')
                if re.search(pattern, content, re.IGNORECASE):
                    exposures.append(f"{description} in {py_file.name}")
                    
            # Check JS/TS files
            for js_file in self.root_dir.glob("frontend/src/**/*.{js,jsx,ts,tsx}"):
                content = js_file.read_text(encoding='utf-8', errors='ignore')
                if re.search(pattern, content, re.IGNORECASE):
                    exposures.append(f"{description} in {js_file.name}")
                    
        if exposures:
            self.test_results["critical_issues"].extend(exposures)
            return False, f"Found {len(exposures)} sensitive data exposures"
        else:
            return True, "No sensitive data exposures found"
            
    def test_dependencies_audit(self):
        """Test for remaining vulnerabilities in dependencies."""
        issues = []
        
        # Test npm packages
        os.chdir(self.root_dir / "frontend")
        result = subprocess.run(
            ["npm", "audit", "--json"],
            capture_output=True,
            text=True
        )
        
        if result.stdout:
            try:
                audit_data = json.loads(result.stdout)
                vulns = audit_data.get("metadata", {}).get("vulnerabilities", {})
                critical = vulns.get("critical", 0)
                high = vulns.get("high", 0)
                
                if critical > 0:
                    issues.append(f"{critical} critical npm vulnerabilities")
                    self.test_results["critical_issues"].append(f"{critical} critical npm vulnerabilities")
                if high > 0:
                    issues.append(f"{high} high npm vulnerabilities")
                    self.test_results["high_issues"].append(f"{high} high npm vulnerabilities")
                    
            except json.JSONDecodeError:
                pass
                
        os.chdir(self.root_dir)
        
        if not issues:
            return True, "No critical/high vulnerabilities in dependencies"
        else:
            return False, f"Found: {', '.join(issues)}"
            
    def generate_report(self):
        """Generate comprehensive test report."""
        print("\n" + "="*60)
        print("📊 SECURITY TEST REPORT")
        print("="*60)
        
        # Summary
        print(f"\n📈 SUMMARY:")
        print(f"  Total Tests: {self.test_results['tests_run']}")
        print(f"  ✅ Passed: {self.test_results['tests_passed']}")
        print(f"  ❌ Failed: {self.test_results['tests_failed']}")
        
        # Risk Assessment
        total_issues = len(self.test_results["critical_issues"]) + len(self.test_results["high_issues"])
        
        if self.test_results["critical_issues"]:
            risk_level = "🔴 CRITICAL"
        elif self.test_results["high_issues"]:
            risk_level = "🟠 HIGH"
        elif self.test_results["tests_failed"] > 0:
            risk_level = "🟡 MEDIUM"
        else:
            risk_level = "🟢 LOW"
            
        print(f"\n🎯 RISK LEVEL: {risk_level}")
        
        # Critical Issues
        if self.test_results["critical_issues"]:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.test_results['critical_issues'])}):")
            for issue in self.test_results["critical_issues"]:
                print(f"  • {issue}")
                
        # High Issues
        if self.test_results["high_issues"]:
            print(f"\n⚠️  HIGH ISSUES ({len(self.test_results['high_issues'])}):")
            for issue in self.test_results["high_issues"]:
                print(f"  • {issue}")
                
        # Failed Tests Details
        failed_tests = [name for name, details in self.test_results["details"].items() 
                       if not details["passed"]]
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test_name in failed_tests:
                details = self.test_results["details"][test_name]["details"]
                print(f"  • {test_name}: {details}")
                
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if self.test_results["critical_issues"]:
            print("  1. 🚨 Address all critical issues immediately")
            print("  2. 🔒 Do not deploy until critical issues are resolved")
            
        if self.test_results["high_issues"]:
            print("  3. ⚠️  Fix high priority issues before production")
            
        print("  4. 🧪 Re-run tests after fixes")
        print("  5. 📋 Get security team approval")
        
        # Save report
        report_path = self.root_dir / f"security_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(self.test_results, f, indent=2)
            
        print(f"\n💾 Detailed report saved to: {report_path}")
        
        # Exit code
        if self.test_results["critical_issues"]:
            return 2  # Critical issues
        elif self.test_results["tests_failed"] > 0:
            return 1  # Some failures
        else:
            return 0  # All passed
            
    def run(self):
        """Run all security tests."""
        print("🛡️  SECURITY TEST SUITE")
        print("=" * 60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run all tests
        self.run_test("Next.js Version Security", self.test_nextjs_version)
        self.run_test("XLSX Package Removed", self.test_xlsx_removed)
        self.run_test("Django DEBUG Setting", self.test_django_debug_setting)
        self.run_test("Security Headers", self.test_security_headers)
        self.run_test("CORS Configuration", self.test_cors_configuration)
        self.run_test("Console Logs Removed", self.test_console_logs)
        self.run_test("Environment Template", self.test_environment_template)
        self.run_test("Sensitive Data Exposure", self.test_sensitive_data_exposure)
        self.run_test("Dependencies Audit", self.test_dependencies_audit)
        
        # Generate report
        exit_code = self.generate_report()
        
        print("\n" + "="*60)
        print("✅ Security test suite completed!")
        
        return exit_code

if __name__ == "__main__":
    tester = SecurityTestSuite()
    sys.exit(tester.run())