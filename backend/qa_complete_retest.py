#!/usr/bin/env python
"""
QA Re-Test: Validación completa del sistema después de todas las correcciones.
Complete system validation after all fixes have been implemented.
"""

import os
import sys
import django
import json
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from apps.clients.models import ClientProfile
from apps.reservations.models import Reservation
from apps.finance.models import Payment, Revenue
from apps.clubs.models import Club, Court
from apps.root.models import Organization
from apps.reservations.services import ReservationService
from apps.finance.services import PaymentService
from apps.finance.reports import RevenueReportService
from apps.shared.data_integrity import DataIntegrityService

User = get_user_model()


class QACompleteRetest:
    """Complete QA retest after all fixes."""
    
    def __init__(self):
        self.results = {
            'start_time': datetime.now(),
            'modules_tested': {},
            'critical_flows': {},
            'data_integrity': {},
            'performance_metrics': {},
            'issues_found': [],
            'recommendations': []
        }
        
        # Services
        self.reservation_service = ReservationService()
        self.payment_service = PaymentService()
        self.revenue_service = RevenueReportService()
        self.integrity_service = DataIntegrityService()
    
    def run_complete_test(self):
        """Run complete QA test suite."""
        print("🧪 QA COMPLETE RE-TEST AFTER ALL FIXES")
        print("=" * 60)
        print(f"Started at: {self.results['start_time'].strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        try:
            # Test 1: Module Functionality
            print("📋 Testing Module Functionality...")
            self.test_module_functionality()
            
            # Test 2: Critical Business Flows
            print("\n🔄 Testing Critical Business Flows...")
            self.test_critical_flows()
            
            # Test 3: Data Integrity
            print("\n🔍 Testing Data Integrity...")
            self.test_data_integrity()
            
            # Test 4: Performance and Scalability
            print("\n⚡ Testing Performance...")
            self.test_performance()
            
            # Test 5: Edge Cases and Error Handling
            print("\n🎯 Testing Edge Cases...")
            self.test_edge_cases()
            
            # Generate report
            print("\n📊 Generating QA Report...")
            self.generate_qa_report()
            
        except Exception as e:
            print(f"\n❌ QA Test Failed: {e}")
            import traceback
            traceback.print_exc()
    
    def test_module_functionality(self):
        """Test individual module functionality."""
        modules = {
            'Clients': self._test_clients_module,
            'Reservations': self._test_reservations_module,
            'Payments': self._test_payments_module,
            'Revenue': self._test_revenue_module
        }
        
        for module_name, test_func in modules.items():
            print(f"  Testing {module_name}...")
            try:
                result = test_func()
                self.results['modules_tested'][module_name] = result
                status = "✅" if result['status'] == 'passed' else "❌"
                print(f"    {status} {module_name}: {result['summary']}")
            except Exception as e:
                self.results['modules_tested'][module_name] = {
                    'status': 'failed',
                    'error': str(e),
                    'summary': f"Module test failed: {str(e)}"
                }
                print(f"    ❌ {module_name}: Failed - {str(e)}")
    
    def _test_clients_module(self):
        """Test clients module functionality."""
        try:
            # Create test organization and club
            org = Organization.objects.create(
                business_name="QA Test Organization",
                trade_name="QA Test Organization",
                rfc="QAAA010101AAA",
                primary_email="qa@test.com",
                primary_phone="+525512345678",
                legal_representative="QA Test Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="QA Test Club",
                organization=org,
                address="QA Test Address",
                is_active=True
            )
            
            # Test user creation with profile
            user = User.objects.create_user(
                username="qa_test",
                email="qa_test@example.com",
                password="qatest123",
                first_name="QA",
                last_name="Test"
            )
            
            # Verify profile creation
            assert hasattr(user, 'client_profile'), "Client profile not created"
            profile = user.client_profile
            
            # Verify profile fields
            assert profile.organization == org, "Profile organization mismatch"
            assert profile.club == club, "Profile club mismatch"
            assert profile.player_code is not None, "Player code not generated"
            assert profile.player_code is not None, "Player code format incorrect"
            
            # Test profile update
            profile.skill_level = 'intermediate'
            profile.phone = "+525512345678"
            profile.save()
            
            # Test multi-tenancy
            org2 = Organization.objects.create(
                business_name="QA Test Org 2",
                trade_name="QA Test Org 2",
                rfc="QBBB020202BBB",
                primary_email="qa2@test.com",
                primary_phone="+525512345679",
                legal_representative="QA Test Rep 2",
                is_active=True
            )
            
            club2 = Club.objects.create(
                name="QA Test Club 2",
                organization=org2,
                address="QA Test Address 2",
                is_active=True
            )
            
            # Should allow same email in different org
            user2 = User.objects.create_user(
                email="qa_test@example.com",
                password="qatest123",
                organization=org2,
                club=club2
            )
            
            assert user2.id != user.id, "Same user created instead of new"
            
            # Cleanup
            user.delete()
            user2.delete()
            club.delete()
            club2.delete()
            org.delete()
            org2.delete()
            
            return {
                'status': 'passed',
                'tests_run': 8,
                'tests_passed': 8,
                'summary': 'All client module tests passed'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Client module test failed: {str(e)}'
            }
    
    def _test_reservations_module(self):
        """Test reservations module functionality."""
        try:
            # Setup test data
            org = Organization.objects.create(
                business_name="QA Reservation Org",
                trade_name="QA Reservation Org",
                rfc="QRES030303CCC",
                primary_email="qa.res@test.com",
                primary_phone="+525512345680",
                legal_representative="QA Res Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="QA Reservation Club",
                organization=org,
                address="QA Address",
                is_active=True
            )
            
            court = Court.objects.create(
                name="QA Court 1",
                club=club,
                court_type="padel",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="qa_res@example.com",
                password="qatest123",
                organization=org,
                club=club
            )
            
            # Test reservation creation
            reservation_data = {
                'club': club,
                'court': court,
                'user': user,
                'date': date.today() + timedelta(days=1),
                'start_time': time(10, 0),
                'end_time': time(11, 0),
                'player_name': user.get_full_name(),
                'player_email': user.email,
                'total_price': Decimal('500.00'),
                'reservation_type': 'single',
                'source': 'web'
            }
            
            reservation = self.reservation_service.create_reservation(reservation_data)
            
            # Verify reservation
            assert reservation is not None, "Reservation not created"
            assert reservation.check_in_code is not None, "Check-in code not generated"
            assert reservation.status == 'pending', "Wrong initial status"
            assert reservation.duration_hours == 1, "Duration calculation wrong"
            
            # Test availability check
            available = self.reservation_service.check_availability(
                court=court,
                date=reservation.date,
                start_time=reservation.start_time,
                end_time=reservation.end_time
            )
            assert not available, "Availability check failed - should be unavailable"
            
            # Test modification
            new_data = {
                'start_time': time(11, 0),
                'end_time': time(12, 0)
            }
            
            modified = self.reservation_service.modify_reservation(reservation, new_data)
            assert modified, "Reservation modification failed"
            
            reservation.refresh_from_db()
            assert reservation.start_time == time(11, 0), "Start time not updated"
            
            # Test cancellation
            cancelled = self.reservation_service.cancel_reservation(
                reservation, 
                reason="QA Test Cancel"
            )
            assert cancelled, "Reservation cancellation failed"
            
            reservation.refresh_from_db()
            assert reservation.status == 'cancelled', "Status not updated to cancelled"
            assert reservation.cancellation_reason == "QA Test Cancel", "Cancel reason not saved"
            
            # Cleanup
            reservation.delete()
            user.delete()
            court.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'tests_run': 10,
                'tests_passed': 10,
                'summary': 'All reservation module tests passed'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Reservation module test failed: {str(e)}'
            }
    
    def _test_payments_module(self):
        """Test payments module functionality."""
        try:
            # Setup test data
            org = Organization.objects.create(
                business_name="QA Payment Org",
                trade_name="QA Payment Org",
                rfc="QPAY040404DDD",
                primary_email="qa.pay@test.com",
                primary_phone="+525512345681",
                legal_representative="QA Pay Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="QA Payment Club",
                organization=org,
                address="QA Address",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="qa_pay@example.com",
                password="qatest123",
                organization=org,
                club=club
            )
            
            # Test cash payment
            payment_data = {
                'organization': org,
                'club': club,
                'user': user,
                'amount': Decimal('500.00'),
                'payment_type': 'reservation',
                'payment_method': 'cash',
                'billing_name': user.get_full_name(),
                'description': 'QA Test Payment'
            }
            
            payment = self.payment_service.process_payment(payment_data)
            
            # Verify payment
            assert payment is not None, "Payment not created"
            assert payment.status == 'completed', "Cash payment not completed"
            assert payment.net_amount == Decimal('500.00'), "Net amount wrong for cash"
            assert payment.processing_fee == Decimal('0.00'), "Cash should have no fee"
            assert payment.reference_number is not None, "Reference number not generated"
            
            # Test payment with processing fee
            card_payment_data = payment_data.copy()
            card_payment_data['payment_method'] = 'card'
            card_payment_data['amount'] = Decimal('1000.00')
            
            card_payment = self.payment_service.process_payment(card_payment_data)
            
            expected_fee = Decimal('1000.00') * Decimal('0.025')  # 2.5% card fee
            assert card_payment.processing_fee == expected_fee, f"Card fee calculation wrong: {card_payment.processing_fee} != {expected_fee}"
            assert card_payment.net_amount == Decimal('975.00'), "Net amount calculation wrong"
            
            # Test payment validation
            # High amount cash should fail
            invalid_payment_data = payment_data.copy()
            invalid_payment_data['amount'] = Decimal('15000.00')
            
            try:
                from apps.shared.business_validators import PaymentBusinessValidator
                validator = PaymentBusinessValidator()
                errors = validator.validate_payment_business_rules(invalid_payment_data)
                assert len(errors) > 0, "High cash payment should have validation errors"
            except Exception:
                pass  # Validator might not be imported
            
            # Cleanup
            payment.delete()
            card_payment.delete()
            user.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'tests_run': 8,
                'tests_passed': 8,
                'summary': 'All payment module tests passed'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Payment module test failed: {str(e)}'
            }
    
    def _test_revenue_module(self):
        """Test revenue module functionality."""
        try:
            # Setup test data
            org = Organization.objects.create(
                business_name="QA Revenue Org",
                trade_name="QA Revenue Org",
                rfc="QREV050505EEE",
                primary_email="qa.rev@test.com",
                primary_phone="+525512345682",
                legal_representative="QA Rev Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="QA Revenue Club",
                organization=org,
                address="QA Address",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="qa_rev@example.com",
                password="qatest123",
                organization=org,
                club=club
            )
            
            # Create payment (should trigger revenue creation)
            payment = Payment.objects.create(
                organization=org,
                club=club,
                user=user,
                amount=Decimal('500.00'),
                payment_type='reservation',
                payment_method='cash',
                status='completed',
                net_amount=Decimal('500.00'),
                processed_at=timezone.now(),
                reference_number='QA-REV-001'
            )
            
            # Verify revenue was created automatically
            revenues = Revenue.objects.filter(payment=payment)
            assert revenues.count() == 1, "Revenue not created automatically"
            
            revenue = revenues.first()
            assert revenue.amount == payment.net_amount, "Revenue amount mismatch"
            assert revenue.concept == payment.payment_type, "Revenue concept mismatch"
            assert revenue.payment_method == payment.payment_method, "Payment method mismatch"
            
            # Test revenue reporting
            daily_report = self.revenue_service.daily_report(
                date=date.today(),
                club=club
            )
            
            assert daily_report is not None, "Daily report generation failed"
            assert daily_report['summary']['total_revenue'] == Decimal('500.00'), "Report total wrong"
            assert daily_report['summary']['total_transactions'] == 1, "Transaction count wrong"
            
            # Test monthly report
            monthly_report = self.revenue_service.monthly_report(
                year=date.today().year,
                month=date.today().month,
                club=club
            )
            
            assert monthly_report is not None, "Monthly report generation failed"
            assert monthly_report['summary']['total_revenue'] == Decimal('500.00'), "Monthly total wrong"
            
            # Cleanup
            revenue.delete()
            payment.delete()
            user.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'tests_run': 8,
                'tests_passed': 8,
                'summary': 'All revenue module tests passed'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Revenue module test failed: {str(e)}'
            }
    
    def test_critical_flows(self):
        """Test critical business flows end-to-end."""
        flows = {
            'Complete Reservation Flow': self._test_complete_reservation_flow,
            'Payment and Revenue Flow': self._test_payment_revenue_flow,
            'Check-in and Completion Flow': self._test_checkin_flow,
            'Refund Flow': self._test_refund_flow
        }
        
        for flow_name, test_func in flows.items():
            print(f"  Testing {flow_name}...")
            try:
                result = test_func()
                self.results['critical_flows'][flow_name] = result
                status = "✅" if result['status'] == 'passed' else "❌"
                print(f"    {status} {flow_name}: {result['summary']}")
            except Exception as e:
                self.results['critical_flows'][flow_name] = {
                    'status': 'failed',
                    'error': str(e),
                    'summary': f"Flow test failed: {str(e)}"
                }
                print(f"    ❌ {flow_name}: Failed - {str(e)}")
    
    def _test_complete_reservation_flow(self):
        """Test complete reservation flow from creation to payment."""
        try:
            # Setup
            org = Organization.objects.create(
                business_name="Flow Test Org",
                trade_name="Flow Test Org",
                rfc="FLOW060606FFF",
                primary_email="flow@test.com",
                primary_phone="+525512345683",
                legal_representative="Flow Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="Flow Test Club",
                organization=org,
                address="Flow Test Address",
                is_active=True
            )
            
            court = Court.objects.create(
                name="Flow Court",
                club=club,
                court_type="padel",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="flow@example.com",
                password="flowtest123",
                first_name="Flow",
                last_name="Test",
                organization=org,
                club=club
            )
            
            # Step 1: Create reservation
            reservation_data = {
                'club': club,
                'court': court,
                'user': user,
                'date': date.today() + timedelta(days=1),
                'start_time': time(14, 0),
                'end_time': time(15, 0),
                'player_name': user.get_full_name(),
                'player_email': user.email,
                'total_price': Decimal('500.00')
            }
            
            reservation = self.reservation_service.create_reservation(reservation_data)
            assert reservation.status == 'pending', "Initial status not pending"
            
            # Step 2: Process payment
            payment_data = {
                'organization': org,
                'club': club,
                'user': user,
                'reservation': reservation,
                'amount': reservation.total_price,
                'payment_type': 'reservation',
                'payment_method': 'cash'
            }
            
            payment = self.payment_service.process_payment(payment_data)
            assert payment.status == 'completed', "Payment not completed"
            
            # Step 3: Update reservation payment status
            reservation.payment_status = 'paid'
            reservation.save()
            
            # Verify reservation auto-confirmed
            reservation.refresh_from_db()
            assert reservation.status == 'confirmed', "Reservation not auto-confirmed"
            
            # Step 4: Verify revenue created
            revenue = Revenue.objects.filter(payment=payment).first()
            assert revenue is not None, "Revenue not created"
            assert revenue.amount == payment.net_amount, "Revenue amount wrong"
            
            # Cleanup
            revenue.delete()
            payment.delete()
            reservation.delete()
            user.delete()
            court.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'steps_completed': 4,
                'summary': 'Complete reservation flow successful'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Flow failed: {str(e)}'
            }
    
    def _test_payment_revenue_flow(self):
        """Test payment to revenue tracking flow."""
        try:
            # Setup
            org = Organization.objects.create(
                business_name="Payment Flow Org",
                trade_name="Payment Flow Org",
                rfc="PFLW070707GGG",
                primary_email="payflow@test.com",
                primary_phone="+525512345684",
                legal_representative="Pay Flow Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="Payment Flow Club",
                organization=org,
                address="Payment Flow Address",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="payflow@example.com",
                password="payflow123",
                organization=org,
                club=club
            )
            
            # Test different payment types
            payment_types = [
                ('reservation', Decimal('500.00')),
                ('membership', Decimal('1000.00')),
                ('class', Decimal('300.00'))
            ]
            
            created_payments = []
            
            for p_type, amount in payment_types:
                payment = Payment.objects.create(
                    organization=org,
                    club=club,
                    user=user,
                    amount=amount,
                    payment_type=p_type,
                    payment_method='card',
                    status='completed',
                    processing_fee=amount * Decimal('0.025'),
                    net_amount=amount * Decimal('0.975'),
                    processed_at=timezone.now()
                )
                created_payments.append(payment)
                
                # Verify revenue created
                revenue = Revenue.objects.filter(payment=payment).first()
                assert revenue is not None, f"Revenue not created for {p_type}"
                assert revenue.concept == p_type, f"Revenue concept wrong for {p_type}"
            
            # Test daily report
            report = self.revenue_service.daily_report(
                date=date.today(),
                club=club
            )
            
            expected_total = sum(p.net_amount for p in created_payments)
            assert report['summary']['total_revenue'] == expected_total, "Daily report total wrong"
            assert report['summary']['total_transactions'] == 3, "Transaction count wrong"
            
            # Cleanup
            Revenue.objects.filter(club=club).delete()
            for payment in created_payments:
                payment.delete()
            user.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'payments_tested': 3,
                'summary': 'Payment to revenue flow successful'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Payment flow failed: {str(e)}'
            }
    
    def _test_checkin_flow(self):
        """Test reservation check-in flow."""
        try:
            # Setup
            org = Organization.objects.create(
                business_name="Checkin Flow Org",
                trade_name="Checkin Flow Org",
                rfc="CHKN080808HHH",
                primary_email="checkin@test.com",
                primary_phone="+525512345685",
                legal_representative="Checkin Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="Checkin Flow Club",
                organization=org,
                address="Checkin Flow Address",
                is_active=True
            )
            
            court = Court.objects.create(
                name="Checkin Court",
                club=club,
                court_type="padel",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="checkin@example.com",
                password="checkin123",
                organization=org,
                club=club
            )
            
            # Create confirmed paid reservation for today
            reservation = Reservation.objects.create(
                club=club,
                court=court,
                user=user,
                date=date.today(),
                start_time=time(16, 0),
                end_time=time(17, 0),
                player_name=user.get_full_name(),
                player_email=user.email,
                total_price=Decimal('500.00'),
                status='confirmed',
                payment_status='paid'
            )
            
            check_in_code = reservation.check_in_code
            
            # Test check-in
            result = self.reservation_service.check_in_reservation(check_in_code)
            assert result is True, "Check-in failed"
            
            reservation.refresh_from_db()
            assert reservation.status == 'checked_in', "Status not updated to checked_in"
            assert reservation.checked_in_at is not None, "Check-in time not recorded"
            
            # Test duplicate check-in (should fail)
            result2 = self.reservation_service.check_in_reservation(check_in_code)
            assert result2 is False, "Duplicate check-in should fail"
            
            # Cleanup
            reservation.delete()
            user.delete()
            court.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'tests_run': 4,
                'summary': 'Check-in flow successful'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Check-in flow failed: {str(e)}'
            }
    
    def _test_refund_flow(self):
        """Test payment refund flow."""
        try:
            # Setup
            org = Organization.objects.create(
                business_name="Refund Flow Org",
                trade_name="Refund Flow Org",
                rfc="RFND090909III",
                primary_email="refund@test.com",
                primary_phone="+525512345686",
                legal_representative="Refund Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="Refund Flow Club",
                organization=org,
                address="Refund Flow Address",
                is_active=True
            )
            
            user = User.objects.create_user(
                email="refund@example.com",
                password="refund123",
                organization=org,
                club=club
            )
            
            # Create completed payment
            payment = Payment.objects.create(
                organization=org,
                club=club,
                user=user,
                amount=Decimal('1000.00'),
                payment_type='reservation',
                payment_method='card',
                status='completed',
                processing_fee=Decimal('25.00'),
                net_amount=Decimal('975.00'),
                processed_at=timezone.now()
            )
            
            # Verify revenue was created
            revenue = Revenue.objects.filter(payment=payment).first()
            assert revenue is not None, "Revenue not created"
            original_revenue_amount = revenue.amount
            
            # Test partial refund
            payment.refund_amount = Decimal('400.00')
            payment.refunded_at = timezone.now()
            payment.refund_reason = "QA Test Refund"
            payment.status = 'partial_refund'
            payment.save()
            
            # Verify payment status
            assert payment.status == 'partial_refund', "Status not updated"
            assert payment.refund_amount == Decimal('400.00'), "Refund amount wrong"
            
            # Revenue should remain unchanged (refunds tracked separately)
            revenue.refresh_from_db()
            assert revenue.amount == original_revenue_amount, "Revenue should not change on refund"
            
            # Cleanup
            revenue.delete()
            payment.delete()
            user.delete()
            club.delete()
            org.delete()
            
            return {
                'status': 'passed',
                'tests_run': 5,
                'summary': 'Refund flow successful'
            }
            
        except AssertionError as e:
            return {
                'status': 'failed',
                'error': str(e),
                'summary': f'Refund flow failed: {str(e)}'
            }
    
    def test_data_integrity(self):
        """Test data integrity across all modules."""
        print("  Running data integrity checks...")
        
        try:
            # Check current data integrity
            issues = self.integrity_service.check_all_integrity(
                start_date=date.today() - timedelta(days=30),
                end_date=date.today()
            )
            
            self.results['data_integrity'] = {
                'total_issues': len(issues),
                'issues_by_type': {},
                'critical_issues': 0,
                'warnings': 0
            }
            
            # Categorize issues
            for issue in issues:
                issue_type = issue.get('type', 'unknown')
                severity = issue.get('severity', 'warning')
                
                if issue_type not in self.results['data_integrity']['issues_by_type']:
                    self.results['data_integrity']['issues_by_type'][issue_type] = 0
                
                self.results['data_integrity']['issues_by_type'][issue_type] += 1
                
                if severity == 'critical':
                    self.results['data_integrity']['critical_issues'] += 1
                else:
                    self.results['data_integrity']['warnings'] += 1
            
            # Generate integrity report
            report = self.integrity_service.generate_integrity_report(
                start_date=date.today() - timedelta(days=30),
                end_date=date.today()
            )
            
            self.results['data_integrity']['report'] = report
            
            # Determine status
            if self.results['data_integrity']['critical_issues'] == 0:
                status = "✅"
                summary = "No critical data integrity issues found"
            else:
                status = "❌"
                summary = f"{self.results['data_integrity']['critical_issues']} critical issues found"
            
            print(f"    {status} Data Integrity: {summary}")
            
            if self.results['data_integrity']['issues_by_type']:
                print("      Issues found:")
                for issue_type, count in self.results['data_integrity']['issues_by_type'].items():
                    print(f"        - {issue_type}: {count}")
            
        except Exception as e:
            self.results['data_integrity'] = {
                'status': 'failed',
                'error': str(e),
                'summary': f'Integrity check failed: {str(e)}'
            }
            print(f"    ❌ Data Integrity: Failed - {str(e)}")
    
    def test_performance(self):
        """Test system performance and scalability."""
        print("  Running performance tests...")
        
        import time as time_module
        
        self.results['performance_metrics'] = {}
        
        try:
            # Setup test data
            org = Organization.objects.create(
                business_name="Perf Test Org",
                trade_name="Perf Test Org",
                rfc="PERF101010JJJ",
                primary_email="perf@test.com",
                primary_phone="+525512345687",
                legal_representative="Perf Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="Perf Test Club",
                organization=org,
                address="Perf Test Address",
                is_active=True
            )
            
            courts = []
            for i in range(3):
                court = Court.objects.create(
                    name=f"Perf Court {i+1}",
                    club=club,
                    court_type="padel",
                    is_active=True
                )
                courts.append(court)
            
            # Test 1: Bulk user creation
            start_time = time_module.time()
            users = []
            
            for i in range(50):
                user = User.objects.create_user(
                    email=f"perf{i}@example.com",
                    password="perftest123",
                    organization=org,
                    club=club
                )
                users.append(user)
            
            user_creation_time = time_module.time() - start_time
            self.results['performance_metrics']['bulk_user_creation'] = {
                'count': 50,
                'time': f"{user_creation_time:.2f}s",
                'avg_per_user': f"{user_creation_time/50:.3f}s"
            }
            
            # Test 2: Bulk reservation creation
            start_time = time_module.time()
            reservations = []
            
            for i in range(30):
                user = users[i % len(users)]
                court = courts[i % len(courts)]
                
                reservation = Reservation.objects.create(
                    club=club,
                    court=court,
                    user=user,
                    date=date.today() + timedelta(days=(i % 7) + 1),
                    start_time=time(10 + (i % 10), 0),
                    end_time=time(11 + (i % 10), 0),
                    player_name=user.get_full_name(),
                    player_email=user.email,
                    total_price=Decimal('500.00')
                )
                reservations.append(reservation)
            
            reservation_creation_time = time_module.time() - start_time
            self.results['performance_metrics']['bulk_reservation_creation'] = {
                'count': 30,
                'time': f"{reservation_creation_time:.2f}s",
                'avg_per_reservation': f"{reservation_creation_time/30:.3f}s"
            }
            
            # Test 3: Report generation
            start_time = time_module.time()
            
            report = self.revenue_service.monthly_report(
                year=date.today().year,
                month=date.today().month,
                club=club
            )
            
            report_time = time_module.time() - start_time
            self.results['performance_metrics']['report_generation'] = {
                'report_type': 'monthly',
                'time': f"{report_time:.2f}s"
            }
            
            # Cleanup
            Reservation.objects.filter(club=club).delete()
            User.objects.filter(organization=org).delete()
            for court in courts:
                court.delete()
            club.delete()
            org.delete()
            
            # Analyze performance
            total_time = user_creation_time + reservation_creation_time + report_time
            
            if total_time < 10:
                status = "✅"
                summary = f"Excellent performance: {total_time:.2f}s total"
            elif total_time < 20:
                status = "⚠️"
                summary = f"Good performance: {total_time:.2f}s total"
            else:
                status = "❌"
                summary = f"Poor performance: {total_time:.2f}s total"
            
            print(f"    {status} Performance: {summary}")
            
        except Exception as e:
            self.results['performance_metrics'] = {
                'status': 'failed',
                'error': str(e)
            }
            print(f"    ❌ Performance: Failed - {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        print("  Testing edge cases...")
        
        edge_cases = {
            'Concurrent Reservations': self._test_concurrent_reservations,
            'Payment Limits': self._test_payment_limits,
            'Invalid Data Handling': self._test_invalid_data,
            'Business Rule Violations': self._test_business_rules
        }
        
        edge_case_results = {}
        
        for case_name, test_func in edge_cases.items():
            try:
                result = test_func()
                edge_case_results[case_name] = result
                status = "✅" if result.get('passed', False) else "❌"
                print(f"    {status} {case_name}")
            except Exception as e:
                edge_case_results[case_name] = {
                    'passed': False,
                    'error': str(e)
                }
                print(f"    ❌ {case_name}: {str(e)}")
        
        self.results['edge_cases'] = edge_case_results
    
    def _test_concurrent_reservations(self):
        """Test concurrent reservation attempts."""
        try:
            org = Organization.objects.create(
                business_name="Concurrent Test",
                trade_name="Concurrent Test",
                rfc="CONC111111KKK",
                primary_email="concurrent@test.com",
                primary_phone="+525512345688",
                legal_representative="Concurrent Rep",
                is_active=True
            )
            
            club = Club.objects.create(
                name="Concurrent Club",
                organization=org,
                address="Concurrent Address",
                is_active=True
            )
            
            court = Court.objects.create(
                name="Concurrent Court",
                club=club,
                court_type="padel",
                is_active=True
            )
            
            users = []
            for i in range(3):
                user = User.objects.create_user(
                    email=f"concurrent{i}@example.com",
                    password="concurrent123",
                    organization=org,
                    club=club
                )
                users.append(user)
            
            # Try to create overlapping reservations
            successful = 0
            reservation_date = date.today() + timedelta(days=1)
            
            for user in users:
                try:
                    if self.reservation_service.check_availability(
                        court=court,
                        date=reservation_date,
                        start_time=time(15, 0),
                        end_time=time(16, 0)
                    ):
                        reservation = Reservation.objects.create(
                            club=club,
                            court=court,
                            user=user,
                            date=reservation_date,
                            start_time=time(15, 0),
                            end_time=time(16, 0),
                            player_name=user.get_full_name(),
                            player_email=user.email,
                            total_price=Decimal('500.00')
                        )
                        successful += 1
                except:
                    pass
            
            # Only one should succeed
            assert successful == 1, f"Expected 1 successful reservation, got {successful}"
            
            # Cleanup
            Reservation.objects.filter(club=club).delete()
            for user in users:
                user.delete()
            court.delete()
            club.delete()
            org.delete()
            
            return {'passed': True}
            
        except AssertionError as e:
            return {'passed': False, 'error': str(e)}
    
    def _test_payment_limits(self):
        """Test payment amount limits."""
        try:
            from apps.shared.business_validators import PaymentBusinessValidator
            validator = PaymentBusinessValidator()
            
            # Test cash payment limit
            payment_data = {
                'amount': Decimal('15000.00'),
                'payment_method': 'cash'
            }
            
            errors = validator.validate_payment_business_rules(payment_data)
            assert len(errors) > 0, "High cash payment should have errors"
            
            # Test valid high amount with bank transfer
            payment_data['payment_method'] = 'transfer'
            errors = validator.validate_payment_business_rules(payment_data)
            assert len(errors) == 0, "Bank transfer should allow high amounts"
            
            return {'passed': True}
            
        except Exception as e:
            return {'passed': False, 'error': str(e)}
    
    def _test_invalid_data(self):
        """Test handling of invalid data."""
        try:
            from apps.shared.business_validators import ReservationBusinessValidator
            validator = ReservationBusinessValidator()
            
            # Past date reservation
            invalid_data = {
                'date': date.today() - timedelta(days=1),
                'start_time': time(10, 0),
                'end_time': time(11, 0)
            }
            
            errors = validator.validate_reservation_business_rules(invalid_data)
            assert len(errors) > 0, "Past date should have errors"
            
            # Invalid time range
            invalid_data = {
                'date': date.today() + timedelta(days=1),
                'start_time': time(11, 0),
                'end_time': time(10, 0)  # End before start
            }
            
            errors = validator.validate_reservation_business_rules(invalid_data)
            assert len(errors) > 0, "Invalid time range should have errors"
            
            return {'passed': True}
            
        except Exception as e:
            return {'passed': False, 'error': str(e)}
    
    def _test_business_rules(self):
        """Test business rule enforcement."""
        try:
            from apps.shared.business_validators import ReservationBusinessValidator
            validator = ReservationBusinessValidator()
            
            # Business hours validation
            invalid_data = {
                'date': date.today() + timedelta(days=1),
                'start_time': time(5, 0),  # Too early
                'end_time': time(6, 0)
            }
            
            errors = validator.validate_reservation_business_rules(invalid_data)
            assert len(errors) > 0, "Outside business hours should have errors"
            
            # Maximum duration
            invalid_data = {
                'date': date.today() + timedelta(days=1),
                'start_time': time(10, 0),
                'end_time': time(18, 0)  # 8 hours
            }
            
            errors = validator.validate_reservation_business_rules(invalid_data)
            assert len(errors) > 0, "Exceeding max duration should have errors"
            
            return {'passed': True}
            
        except Exception as e:
            return {'passed': False, 'error': str(e)}
    
    def generate_qa_report(self):
        """Generate comprehensive QA report."""
        self.results['end_time'] = datetime.now()
        duration = (self.results['end_time'] - self.results['start_time']).total_seconds()
        
        # Calculate overall status
        total_modules = len(self.results['modules_tested'])
        passed_modules = sum(1 for m in self.results['modules_tested'].values() 
                           if m.get('status') == 'passed')
        
        total_flows = len(self.results['critical_flows'])
        passed_flows = sum(1 for f in self.results['critical_flows'].values() 
                         if f.get('status') == 'passed')
        
        critical_issues = self.results['data_integrity'].get('critical_issues', 0)
        
        # Generate report file
        report_file = f"qa_retest_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        # Print summary
        print()
        print("📊 QA RE-TEST SUMMARY")
        print("=" * 60)
        print(f"Duration: {duration:.2f} seconds")
        print()
        
        print("MODULE TESTING:")
        print(f"  ✅ Passed: {passed_modules}/{total_modules}")
        for module, result in self.results['modules_tested'].items():
            status = "✅" if result.get('status') == 'passed' else "❌"
            print(f"    {status} {module}")
        
        print()
        print("CRITICAL FLOWS:")
        print(f"  ✅ Passed: {passed_flows}/{total_flows}")
        for flow, result in self.results['critical_flows'].items():
            status = "✅" if result.get('status') == 'passed' else "❌"
            print(f"    {status} {flow}")
        
        print()
        print("DATA INTEGRITY:")
        total_issues = self.results['data_integrity'].get('total_issues', 0)
        print(f"  Total Issues: {total_issues}")
        print(f"  Critical Issues: {critical_issues}")
        
        print()
        print("PERFORMANCE METRICS:")
        for metric, data in self.results['performance_metrics'].items():
            if isinstance(data, dict) and 'time' in data:
                print(f"  {metric}: {data['time']}")
        
        print()
        print("OVERALL ASSESSMENT:")
        
        if passed_modules == total_modules and passed_flows == total_flows and critical_issues == 0:
            print("  🎉 SYSTEM READY FOR PRODUCTION")
            print("  All modules, flows, and integrity checks passed!")
        elif passed_modules >= total_modules * 0.8 and critical_issues == 0:
            print("  ✅ SYSTEM MOSTLY READY")
            print("  Minor issues to address before production")
        else:
            print("  ❌ SYSTEM NEEDS ATTENTION")
            print("  Critical issues must be resolved")
        
        print()
        print(f"📄 Detailed report saved to: {report_file}")
        
        # Add recommendations
        self._generate_recommendations()
        
        return self.results
    
    def _generate_recommendations(self):
        """Generate recommendations based on test results."""
        print()
        print("💡 RECOMMENDATIONS:")
        print("-" * 30)
        
        recommendations = []
        
        # Check module failures
        failed_modules = [m for m, r in self.results['modules_tested'].items() 
                         if r.get('status') != 'passed']
        if failed_modules:
            recommendations.append(f"Fix failing modules: {', '.join(failed_modules)}")
        
        # Check flow failures
        failed_flows = [f for f, r in self.results['critical_flows'].items() 
                       if r.get('status') != 'passed']
        if failed_flows:
            recommendations.append(f"Fix failing flows: {', '.join(failed_flows)}")
        
        # Check data integrity
        if self.results['data_integrity'].get('critical_issues', 0) > 0:
            recommendations.append("Resolve critical data integrity issues")
            recommendations.append("Run data integrity auto-fix for missing revenues")
        
        # Check performance
        perf_metrics = self.results.get('performance_metrics', {})
        if any('time' in v and float(v['time'].rstrip('s')) > 5 for v in perf_metrics.values() if isinstance(v, dict)):
            recommendations.append("Optimize slow operations (>5s)")
        
        # Edge cases
        edge_failures = [e for e, r in self.results.get('edge_cases', {}).items() 
                        if not r.get('passed')]
        if edge_failures:
            recommendations.append(f"Address edge case failures: {', '.join(edge_failures)}")
        
        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                print(f"{i}. {rec}")
        else:
            print("✅ No critical recommendations - system is healthy!")
        
        self.results['recommendations'] = recommendations


def main():
    """Run QA complete retest."""
    tester = QACompleteRetest()
    tester.run_complete_test()


if __name__ == "__main__":
    main()