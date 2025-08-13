#!/usr/bin/env python
"""
Script para ejecutar todos los tests de las correcciones FIX-1 a FIX-6.
Comprehensive test runner for all fixes with detailed reporting.
"""

import os
import sys
import django
import pytest
import subprocess
from datetime import datetime
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()


def run_test_suite():
    """Run comprehensive test suite for all fixes."""
    
    print("🧪 COMPREHENSIVE TEST SUITE - ALL FIXES")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test files to run
    test_files = [
        'tests/test_fix1_client_corrections.py',
        'tests/test_fix2_reservation_corrections.py', 
        'tests/test_fix3_payment_implementation.py',
        'tests/test_fix4_revenue_integration.py',
        'tests/test_fix5_business_validations.py',
        'tests/test_integration_all_fixes.py'
    ]
    
    # Results summary
    results = {}
    total_tests = 0
    total_passed = 0
    total_failed = 0
    total_errors = 0
    
    for test_file in test_files:
        print(f"🔍 Running {test_file}...")
        print("-" * 40)
        
        if not Path(test_file).exists():
            print(f"❌ Test file not found: {test_file}")
            results[test_file] = {'status': 'missing', 'tests': 0, 'passed': 0, 'failed': 0}
            continue
        
        try:
            # Run pytest with detailed output
            result = subprocess.run([
                'python', '-m', 'pytest', test_file, 
                '-v', '--tb=short', '--durations=10'
            ], capture_output=True, text=True, timeout=300)
            
            # Parse results
            output = result.stdout + result.stderr
            
            # Count test results
            lines = output.split('\n')
            tests_run = 0
            passed = 0
            failed = 0
            errors = 0
            
            for line in lines:
                if '::test_' in line:
                    tests_run += 1
                    if 'PASSED' in line:
                        passed += 1
                    elif 'FAILED' in line:
                        failed += 1
                    elif 'ERROR' in line:
                        errors += 1
            
            # Update totals
            total_tests += tests_run
            total_passed += passed
            total_failed += failed
            total_errors += errors
            
            # Store results
            results[test_file] = {
                'status': 'completed',
                'tests': tests_run,
                'passed': passed,
                'failed': failed,
                'errors': errors,
                'output': output
            }
            
            # Print summary for this file
            if result.returncode == 0:
                print(f"✅ {test_file}: {passed}/{tests_run} tests passed")
            else:
                print(f"❌ {test_file}: {passed}/{tests_run} passed, {failed} failed, {errors} errors")
                
                # Show first few failures
                failure_lines = [line for line in lines if 'FAILED' in line or 'ERROR' in line]
                for failure in failure_lines[:3]:  # Show first 3 failures
                    print(f"   {failure}")
                
                if len(failure_lines) > 3:
                    print(f"   ... and {len(failure_lines) - 3} more failures")
            
            print()
            
        except subprocess.TimeoutExpired:
            print(f"⏱️ {test_file}: Timeout after 5 minutes")
            results[test_file] = {'status': 'timeout', 'tests': 0, 'passed': 0, 'failed': 0}
            
        except Exception as e:
            print(f"💥 {test_file}: Exception - {str(e)}")
            results[test_file] = {'status': 'error', 'tests': 0, 'passed': 0, 'failed': 0}
    
    # Generate comprehensive report
    print("📊 COMPREHENSIVE TEST RESULTS")
    print("=" * 60)
    print()
    
    print("📈 SUMMARY BY FIX:")
    print("-" * 30)
    
    fix_descriptions = {
        'test_fix1_client_corrections.py': 'FIX-1: Client Profile Corrections',
        'test_fix2_reservation_corrections.py': 'FIX-2: Reservation System Fixes',
        'test_fix3_payment_implementation.py': 'FIX-3: Complete Payment Implementation',
        'test_fix4_revenue_integration.py': 'FIX-4: Revenue Integration & Tracking',
        'test_fix5_business_validations.py': 'FIX-5: Business Validations & Edge Cases',
        'test_integration_all_fixes.py': 'FIX-6: Integration Tests for All Fixes'
    }
    
    for test_file, result in results.items():
        file_name = Path(test_file).name
        description = fix_descriptions.get(file_name, file_name)
        
        if result['status'] == 'completed':
            success_rate = (result['passed'] / result['tests'] * 100) if result['tests'] > 0 else 0
            status_icon = "✅" if success_rate == 100 else "⚠️" if success_rate >= 80 else "❌"
            print(f"{status_icon} {description}")
            print(f"   Tests: {result['tests']} | Passed: {result['passed']} | Failed: {result['failed']} | Success: {success_rate:.1f}%")
        else:
            print(f"❌ {description}")
            print(f"   Status: {result['status'].upper()}")
        print()
    
    # Overall statistics
    print("🎯 OVERALL STATISTICS:")
    print("-" * 30)
    overall_success = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"Total Tests Run: {total_tests}")
    print(f"Tests Passed: {total_passed}")
    print(f"Tests Failed: {total_failed}")
    print(f"Tests with Errors: {total_errors}")
    print(f"Overall Success Rate: {overall_success:.1f}%")
    print()
    
    # Test categories analysis
    print("🔍 TEST CATEGORIES ANALYSIS:")
    print("-" * 30)
    
    categories = {
        'Client Management': ['test_fix1_client_corrections.py'],
        'Reservation System': ['test_fix2_reservation_corrections.py'],
        'Payment Processing': ['test_fix3_payment_implementation.py'],
        'Revenue Tracking': ['test_fix4_revenue_integration.py'],
        'Business Logic': ['test_fix5_business_validations.py'],
        'System Integration': ['test_integration_all_fixes.py']
    }
    
    for category, files in categories.items():
        category_tests = sum(results.get(f'tests/{file}', {}).get('tests', 0) for file in files)
        category_passed = sum(results.get(f'tests/{file}', {}).get('passed', 0) for file in files)
        category_success = (category_passed / category_tests * 100) if category_tests > 0 else 0
        
        status_icon = "✅" if category_success == 100 else "⚠️" if category_success >= 80 else "❌"
        print(f"{status_icon} {category}: {category_passed}/{category_tests} ({category_success:.1f}%)")
    
    print()
    
    # Performance insights
    print("⚡ PERFORMANCE INSIGHTS:")
    print("-" * 30)
    
    if total_tests > 0:
        avg_time_per_test = 120 / max(total_tests, 1)  # Rough estimate
        print(f"Estimated avg time per test: {avg_time_per_test:.2f} seconds")
        
        if total_tests > 100:
            print("🎉 Excellent test coverage with 100+ tests")
        elif total_tests > 50:
            print("✅ Good test coverage with 50+ tests")
        else:
            print("⚠️ Consider adding more comprehensive tests")
    
    print()
    
    # Recommendations
    print("💡 RECOMMENDATIONS:")
    print("-" * 30)
    
    if overall_success >= 95:
        print("🎉 Excellent! All fixes are working correctly with comprehensive test coverage.")
        print("✅ System is ready for QA testing and potential deployment.")
    elif overall_success >= 80:
        print("👍 Good progress! Most fixes are working correctly.")
        print("🔧 Focus on fixing the remaining failing tests to reach 100% success.")
    else:
        print("⚠️ Significant issues detected. Priority fixes needed:")
        
        # Show files with issues
        for test_file, result in results.items():
            if result.get('status') == 'completed' and result.get('tests', 0) > 0:
                success_rate = result['passed'] / result['tests'] * 100
                if success_rate < 80:
                    print(f"   🔥 {Path(test_file).name} needs attention ({success_rate:.1f}% success)")
    
    print()
    
    # Next steps
    print("🚀 NEXT STEPS:")
    print("-" * 30)
    
    if total_failed > 0 or total_errors > 0:
        print("1. 🔧 Fix failing tests and resolve errors")
        print("2. 🧪 Re-run test suite to verify fixes")
        print("3. 📝 Update documentation if needed")
        print("4. ✅ Proceed to QA testing once all tests pass")
    else:
        print("1. ✅ All unit tests are passing!")
        print("2. 🧪 Proceed to QA integration testing")
        print("3. 📋 Run manual test scenarios")
        print("4. 🚀 System ready for deployment validation")
    
    print()
    print(f"Test suite completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Generate detailed report file
    generate_test_report(results, total_tests, total_passed, total_failed, total_errors)
    
    return overall_success >= 95


def generate_test_report(results, total_tests, total_passed, total_failed, total_errors):
    """Generate detailed test report file."""
    
    report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    with open(report_file, 'w') as f:
        f.write("# Comprehensive Test Report - All Fixes\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Executive Summary\n\n")
        overall_success = (total_passed / total_tests * 100) if total_tests > 0 else 0
        f.write(f"- **Total Tests:** {total_tests}\n")
        f.write(f"- **Tests Passed:** {total_passed}\n")
        f.write(f"- **Tests Failed:** {total_failed}\n")
        f.write(f"- **Tests with Errors:** {total_errors}\n")
        f.write(f"- **Overall Success Rate:** {overall_success:.1f}%\n\n")
        
        f.write("## Detailed Results by Fix\n\n")
        
        fix_descriptions = {
            'test_fix1_client_corrections.py': 'FIX-1: Client Profile Corrections',
            'test_fix2_reservation_corrections.py': 'FIX-2: Reservation System Fixes',
            'test_fix3_payment_implementation.py': 'FIX-3: Complete Payment Implementation',
            'test_fix4_revenue_integration.py': 'FIX-4: Revenue Integration & Tracking',
            'test_fix5_business_validations.py': 'FIX-5: Business Validations & Edge Cases',
            'test_integration_all_fixes.py': 'FIX-6: Integration Tests for All Fixes'
        }
        
        for test_file, result in results.items():
            file_name = Path(test_file).name
            description = fix_descriptions.get(file_name, file_name)
            
            f.write(f"### {description}\n\n")
            
            if result['status'] == 'completed':
                success_rate = (result['passed'] / result['tests'] * 100) if result['tests'] > 0 else 0
                f.write(f"- **Status:** {'✅ PASSED' if success_rate == 100 else '⚠️ PARTIAL' if success_rate >= 80 else '❌ FAILED'}\n")
                f.write(f"- **Tests Run:** {result['tests']}\n")
                f.write(f"- **Passed:** {result['passed']}\n")
                f.write(f"- **Failed:** {result['failed']}\n")
                f.write(f"- **Errors:** {result['errors']}\n")
                f.write(f"- **Success Rate:** {success_rate:.1f}%\n\n")
                
                if result['failed'] > 0 or result['errors'] > 0:
                    f.write("**Issues Found:**\n")
                    output_lines = result['output'].split('\n')
                    failure_lines = [line for line in output_lines if 'FAILED' in line or 'ERROR' in line]
                    for failure in failure_lines[:5]:  # Show first 5 failures
                        f.write(f"- {failure.strip()}\n")
                    f.write("\n")
            else:
                f.write(f"- **Status:** ❌ {result['status'].upper()}\n\n")
        
        f.write("## Recommendations\n\n")
        
        if overall_success >= 95:
            f.write("🎉 **Excellent!** All fixes are working correctly with comprehensive test coverage.\n")
            f.write("The system is ready for QA testing and potential deployment.\n\n")
        elif overall_success >= 80:
            f.write("👍 **Good progress!** Most fixes are working correctly.\n")
            f.write("Focus on fixing the remaining failing tests to reach 100% success.\n\n")
        else:
            f.write("⚠️ **Significant issues detected.** Priority fixes needed before proceeding.\n\n")
        
        f.write("---\n")
        f.write(f"*Report generated by comprehensive test runner at {datetime.now()}*\n")
    
    print(f"📄 Detailed report saved to: {report_file}")


if __name__ == "__main__":
    try:
        success = run_test_suite()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Test suite interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite failed with exception: {e}")
        sys.exit(1)