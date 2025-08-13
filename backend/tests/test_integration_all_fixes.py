#!/usr/bin/env python
"""
FIX-6: Tests de integración completos para todas las correcciones.
Integration tests for all fixes: FIX-1 through FIX-5.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from apps.clients.models import ClientProfile
from apps.reservations.models import Reservation
from apps.finance.models import Payment, Revenue
from apps.clubs.models import Club, Court
from apps.root.models import Organization
from apps.reservations.services import ReservationService
from apps.finance.services import PaymentService
from apps.finance.reports import RevenueReportService
from apps.shared.business_validators import (
    ReservationBusinessValidator,
    PaymentBusinessValidator
)
from apps.shared.data_integrity import DataIntegrityService

User = get_user_model()


class TestCompleteBusinessFlow(TransactionTestCase):
    """Test complete business flow: User Creation → Reservation → Payment → Revenue."""
    
    def setUp(self):
        """Set up test data."""
        # Create organization and club
        self.organization = Organization.objects.create(
            name="Integration Test Organization",
            slug="integration-test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Integration Test Club",
            organization=self.organization,
            address="Test Address, Mexico City",
            phone="+525512345678",
            email="club@example.com",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            hourly_rate=Decimal('500.00'),
            is_active=True
        )
        
        # Services
        self.reservation_service = ReservationService()
        self.payment_service = PaymentService()
        self.report_service = RevenueReportService()
        self.integrity_service = DataIntegrityService()
    
    def test_complete_user_to_revenue_flow(self):
        """Test complete flow from user creation to revenue tracking."""
        # Step 1: Create user (FIX-1: Client Profile)
        user = User.objects.create_user(
            email="integration@example.com",
            password="testpass123",
            first_name="Integration",
            last_name="Test",
            organization=self.organization,
            club=self.club
        )
        
        # Verify client profile was created automatically
        self.assertTrue(hasattr(user, 'client_profile'))
        profile = user.client_profile
        
        # Verify profile data
        self.assertEqual(profile.organization, self.organization)
        self.assertEqual(profile.club, self.club)
        self.assertEqual(profile.full_name, "Integration Test")
        self.assertIsNotNone(profile.player_code)
        
        # Step 2: Create reservation (FIX-2: Reservation System)
        reservation_date = date.today() + timedelta(days=1)
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': user,
            'date': reservation_date,
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': user.get_full_name(),
            'player_email': user.email,
            'total_price': Decimal('500.00'),
            'reservation_type': 'single',
            'source': 'web'
        }
        
        # Validate business rules
        validator = ReservationBusinessValidator()
        errors = validator.validate_reservation_business_rules(reservation_data, user)
        self.assertEqual(len(errors), 0, f"Reservation validation errors: {errors}")
        
        # Create reservation
        reservation = self.reservation_service.create_reservation(reservation_data)
        
        # Verify reservation
        self.assertIsInstance(reservation, Reservation)
        self.assertEqual(reservation.status, 'pending')
        self.assertEqual(reservation.payment_status, 'pending')
        self.assertIsNotNone(reservation.check_in_code)
        
        # Step 3: Process payment (FIX-3: Payment System)
        payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': user,
            'reservation': reservation,
            'amount': reservation.total_price,
            'payment_type': 'reservation',
            'payment_method': 'cash',
            'billing_name': user.get_full_name(),
            'billing_email': user.email,
            'description': f'Payment for reservation {reservation.check_in_code}'
        }
        
        # Validate payment rules
        payment_validator = PaymentBusinessValidator()
        payment_errors = payment_validator.validate_payment_business_rules(payment_data)
        self.assertEqual(len(payment_errors), 0, f"Payment validation errors: {payment_errors}")
        
        # Process payment
        payment = self.payment_service.process_payment(payment_data)
        
        # Verify payment
        self.assertIsInstance(payment, Payment)
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.amount, Decimal('500.00'))
        self.assertEqual(payment.net_amount, Decimal('500.00'))  # No fees for cash
        
        # Step 4: Verify revenue creation (FIX-4: Revenue Integration)
        # Revenue should be created automatically via signals
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 1)
        
        revenue = revenues.first()
        self.assertEqual(revenue.organization, self.organization)
        self.assertEqual(revenue.club, self.club)
        self.assertEqual(revenue.amount, payment.net_amount)
        self.assertEqual(revenue.concept, payment.payment_type)
        self.assertEqual(revenue.payment_method, payment.payment_method)
        
        # Step 5: Update reservation status
        reservation.payment_status = 'paid'
        reservation.save()
        
        # Verify reservation was updated via signals
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'confirmed')
        
        # Step 6: Check data integrity (FIX-5: Business Validations)
        integrity_issues = self.integrity_service.check_all_integrity(
            start_date=date.today(),
            end_date=date.today()
        )
        
        # Should have no integrity issues for this clean flow
        payment_revenue_issues = [
            issue for issue in integrity_issues 
            if issue['type'] in ['missing_revenue', 'revenue_mismatch']
        ]
        self.assertEqual(len(payment_revenue_issues), 0)
        
        # Step 7: Generate revenue report
        daily_report = self.report_service.daily_report(
            date=date.today(),
            club=self.club
        )
        
        # Verify report data
        self.assertGreater(daily_report['summary']['total_revenue'], 0)
        self.assertGreater(daily_report['summary']['total_transactions'], 0)
        
        # Check payment method breakdown
        cash_transactions = [
            method for method in daily_report['by_payment_method']
            if method['payment_method'] == 'cash'
        ]
        self.assertGreater(len(cash_transactions), 0)
    
    def test_stripe_payment_integration_flow(self):
        """Test complete flow with Stripe payment integration."""
        # Create user
        user = User.objects.create_user(
            email="stripe@example.com",
            password="testpass123",
            first_name="Stripe",
            last_name="User",
            organization=self.organization,
            club=self.club
        )
        
        # Create reservation
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=user,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(15, 0),
            player_name=user.get_full_name(),
            player_email=user.email,
            total_price=Decimal('500.00'),
            status='pending'
        )
        
        # Mock Stripe payment intent creation
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(
                id='pi_test_integration',
                client_secret='pi_test_integration_secret',
                status='requires_payment_method',
                amount=50000,  # 500.00 in cents
                currency='mxn'
            )
            
            # Create payment intent
            intent = self.payment_service.create_payment_intent(
                amount=reservation.total_price,
                currency='MXN',
                customer_email=user.email,
                metadata={
                    'reservation_id': str(reservation.id),
                    'user_id': str(user.id)
                }
            )
            
            # Verify intent creation
            self.assertEqual(intent.amount, Decimal('500.00'))
            self.assertEqual(intent.customer_email, user.email)
            
        # Mock Stripe payment confirmation
        with patch('stripe.PaymentIntent.confirm') as mock_confirm:
            mock_confirm.return_value = MagicMock(
                id='pi_stripe_integration',
                status='succeeded',
                charges=MagicMock(
                    data=[MagicMock(
                        payment_method_details=MagicMock(
                            card=MagicMock(
                                last4='4242',
                                brand='visa',
                                country='MX'
                            )
                        ),
                        billing_details=MagicMock(
                            name=user.get_full_name(),
                            email=user.email
                        )
                    )]
                )
            )
            
            # Confirm payment
            payment = self.payment_service.confirm_payment_intent(
                intent_id=intent.intent_id,
                payment_method_id='pm_test_card'
            )
            
            # Verify payment completion
            self.assertEqual(payment.status, 'completed')
            self.assertEqual(payment.card_last4, '4242')
            self.assertEqual(payment.card_brand, 'visa')
            self.assertEqual(payment.amount, Decimal('500.00'))
            
            # Verify processing fee calculation
            expected_fee = Decimal('500.00') * Decimal('0.03') + Decimal('3.00')
            self.assertEqual(payment.processing_fee, expected_fee)
            
            expected_net = Decimal('500.00') - expected_fee
            self.assertEqual(payment.net_amount, expected_net)
        
        # Verify revenue was created
        revenue = Revenue.objects.get(payment=payment)
        self.assertEqual(revenue.amount, payment.net_amount)
        self.assertEqual(revenue.payment_method, 'stripe')
    
    def test_error_handling_and_rollback(self):
        """Test error handling and transaction rollback."""
        user = User.objects.create_user(
            email="error@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        # Create reservation
        reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(16, 0),
            'end_time': time(17, 0),
            'player_name': user.get_full_name(),
            'player_email': user.email,
            'total_price': Decimal('500.00')
        }
        
        reservation = self.reservation_service.create_reservation(reservation_data)
        
        # Mock payment service to fail
        with patch.object(self.payment_service, 'process_payment') as mock_payment:
            mock_payment.side_effect = Exception("Payment processing failed")
            
            # Attempt to process payment
            with self.assertRaises(Exception):
                self.payment_service.process_payment({
                    'organization': self.organization,
                    'club': self.club,
                    'user': user,
                    'reservation': reservation,
                    'amount': reservation.total_price,
                    'payment_type': 'reservation',
                    'payment_method': 'card'
                })
        
        # Verify no payment was created
        self.assertEqual(Payment.objects.filter(reservation=reservation).count(), 0)
        
        # Verify no revenue was created
        self.assertEqual(Revenue.objects.filter(club=self.club).count(), 0)
        
        # Reservation should still exist but remain pending
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'pending')
        self.assertEqual(reservation.payment_status, 'pending')
    
    def test_concurrent_operations_handling(self):
        """Test handling of concurrent operations."""
        # Create multiple users
        users = []
        for i in range(3):
            user = User.objects.create_user(
                email=f"concurrent{i}@example.com",
                password="testpass123",
                first_name=f"User{i}",
                last_name="Concurrent",
                organization=self.organization,
                club=self.club
            )
            users.append(user)
        
        # Try to create reservations for same court slot concurrently
        reservation_date = date.today() + timedelta(days=2)
        start_time = time(18, 0)
        end_time = time(19, 0)
        
        successful_reservations = []
        
        for user in users:
            try:
                # Check availability first
                if self.reservation_service.check_availability(
                    court=self.court,
                    date=reservation_date,
                    start_time=start_time,
                    end_time=end_time
                ):
                    reservation = self.reservation_service.create_reservation({
                        'club': self.club,
                        'court': self.court,
                        'user': user,
                        'date': reservation_date,
                        'start_time': start_time,
                        'end_time': end_time,
                        'player_name': user.get_full_name(),
                        'player_email': user.email,
                        'total_price': Decimal('500.00')
                    })
                    successful_reservations.append(reservation)
            except Exception as e:
                # Expected for overlapping reservations
                pass
        
        # Only one reservation should succeed
        self.assertEqual(len(successful_reservations), 1)
        
        # Verify no duplicate reservations exist in database
        reservations = Reservation.objects.filter(
            court=self.court,
            date=reservation_date,
            start_time=start_time,
            end_time=end_time,
            status='pending'
        )
        self.assertEqual(reservations.count(), 1)
    
    def test_data_consistency_across_modules(self):
        """Test data consistency across all modules."""
        # Create comprehensive test scenario
        users = []
        reservations = []
        payments = []
        
        # Create 5 users with profiles
        for i in range(5):
            user = User.objects.create_user(
                email=f"consistency{i}@example.com",
                password="testpass123",
                first_name=f"User{i}",
                last_name="Consistency",
                organization=self.organization,
                club=self.club
            )
            users.append(user)
            
            # Verify profile creation
            self.assertTrue(hasattr(user, 'client_profile'))
            self.assertEqual(user.client_profile.organization, self.organization)
        
        # Create reservations for different dates
        for i, user in enumerate(users):
            reservation = Reservation.objects.create(
                club=self.club,
                court=self.court,
                user=user,
                date=date.today() + timedelta(days=i + 1),
                start_time=time(10 + i, 0),
                end_time=time(11 + i, 0),
                player_name=user.get_full_name(),
                player_email=user.email,
                total_price=Decimal('500.00') + (i * 100),
                status='confirmed'
            )
            reservations.append(reservation)
        
        # Create payments for reservations
        payment_methods = ['cash', 'stripe', 'card', 'transfer', 'oxxo']
        for i, reservation in enumerate(reservations):
            payment = Payment.objects.create(
                organization=self.organization,
                club=self.club,
                user=reservation.user,
                reservation=reservation,
                amount=reservation.total_price,
                payment_type='reservation',
                payment_method=payment_methods[i],
                status='completed',
                net_amount=reservation.total_price - (Decimal('15.00') if payment_methods[i] == 'stripe' else Decimal('0')),
                processed_at=timezone.now()
            )
            payments.append(payment)
        
        # Verify revenues were created automatically
        revenues = Revenue.objects.filter(club=self.club)
        self.assertEqual(revenues.count(), len(payments))
        
        # Check data integrity
        integrity_issues = self.integrity_service.check_all_integrity(
            start_date=date.today(),
            end_date=date.today() + timedelta(days=10)
        )
        
        # Should have minimal or no issues
        critical_issues = [
            issue for issue in integrity_issues
            if issue.get('severity') == 'critical'
        ]
        self.assertEqual(len(critical_issues), 0)
        
        # Generate comprehensive revenue report
        monthly_report = self.report_service.monthly_report(
            year=date.today().year,
            month=date.today().month,
            club=self.club
        )
        
        # Verify report completeness
        self.assertGreater(monthly_report['summary']['total_revenue'], 0)
        self.assertGreater(monthly_report['summary']['total_transactions'], 0)
        self.assertGreater(len(monthly_report['by_payment_method']), 0)
        self.assertGreater(len(monthly_report['by_concept']), 0)
    
    def test_business_rules_integration(self):
        """Test integration of all business rules and validations."""
        user = User.objects.create_user(
            email="businessrules@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        # Test 1: Valid reservation within business rules
        valid_reservation_data = {
            'club': self.club,
            'court': self.court,
            'user': user,
            'date': date.today() + timedelta(days=1),
            'start_time': time(10, 0),
            'end_time': time(11, 0),
            'player_name': user.get_full_name(),
            'player_email': user.email,
            'total_price': Decimal('500.00')
        }
        
        reservation_validator = ReservationBusinessValidator()
        errors = reservation_validator.validate_reservation_business_rules(valid_reservation_data, user)
        self.assertEqual(len(errors), 0)
        
        # Create the reservation
        reservation = Reservation.objects.create(**valid_reservation_data)
        
        # Test 2: Valid payment within business rules
        valid_payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': user,
            'reservation': reservation,
            'amount': Decimal('500.00'),
            'payment_type': 'reservation',
            'payment_method': 'cash'
        }
        
        payment_validator = PaymentBusinessValidator()
        payment_errors = payment_validator.validate_payment_business_rules(valid_payment_data)
        self.assertEqual(len(payment_errors), 0)
        
        # Test 3: Invalid scenarios should fail validation
        
        # Past date reservation
        invalid_reservation_data = valid_reservation_data.copy()
        invalid_reservation_data['date'] = date.today() - timedelta(days=1)
        
        errors = reservation_validator.validate_reservation_business_rules(invalid_reservation_data, user)
        self.assertGreater(len(errors), 0)
        
        # High amount cash payment
        invalid_payment_data = {
            'organization': self.organization,
            'club': self.club,
            'user': user,
            'amount': Decimal('15000.00'),  # Above cash limit
            'payment_type': 'reservation',
            'payment_method': 'cash'
        }
        
        payment_errors = payment_validator.validate_payment_business_rules(invalid_payment_data)
        self.assertGreater(len(payment_errors), 0)
        
        # Test 4: Edge cases
        
        # Maximum duration reservation
        edge_reservation_data = valid_reservation_data.copy()
        edge_reservation_data['start_time'] = time(8, 0)
        edge_reservation_data['end_time'] = time(14, 0)  # 6 hours (at limit)
        edge_reservation_data['total_price'] = Decimal('3000.00')
        
        errors = reservation_validator.validate_reservation_business_rules(edge_reservation_data, user)
        # Should be valid at the limit
        duration_errors = [e for e in errors if 'duration' in str(e)]
        self.assertEqual(len(duration_errors), 0)
        
        # Exceeding maximum duration
        edge_reservation_data['end_time'] = time(15, 0)  # 7 hours (exceeds limit)
        
        errors = reservation_validator.validate_reservation_business_rules(edge_reservation_data, user)
        duration_errors = [e for e in errors if 'duration' in str(e)]
        self.assertGreater(len(duration_errors), 0)


@pytest.mark.django_db
class TestSystemPerformanceIntegration:
    """Test system performance under various loads."""
    
    def test_bulk_operations_performance(self):
        """Test system performance with bulk operations."""
        organization = Organization.objects.create(
            name="Performance Test Organization",
            slug="performance-test-org",
            is_active=True
        )
        
        club = Club.objects.create(
            name="Performance Test Club",
            organization=organization,
            address="Test Address",
            is_active=True
        )
        
        courts = []
        for i in range(5):
            court = Court.objects.create(
                name=f"Court {i+1}",
                club=club,
                court_type="padel",
                is_active=True
            )
            courts.append(court)
        
        # Create many users
        users = []
        for i in range(50):
            user = User.objects.create_user(
                email=f"perf{i}@example.com",
                password="testpass123",
                first_name=f"User{i}",
                last_name="Performance",
                organization=organization,
                club=club
            )
            users.append(user)
        
        # Measure time for bulk reservations
        import time as time_module
        start_time = time_module.time()
        
        reservations_created = 0
        
        # Create reservations across different courts and times
        for i, user in enumerate(users):
            court = courts[i % len(courts)]
            hour = 8 + (i % 12)  # 8 AM to 7 PM
            reservation_date = date.today() + timedelta(days=(i % 7) + 1)
            
            # Check if slot is available
            existing = Reservation.objects.filter(
                court=court,
                date=reservation_date,
                start_time=time(hour, 0),
                end_time=time(hour + 1, 0)
            ).exists()
            
            if not existing:
                reservation = Reservation.objects.create(
                    club=club,
                    court=court,
                    user=user,
                    date=reservation_date,
                    start_time=time(hour, 0),
                    end_time=time(hour + 1, 0),
                    player_name=user.get_full_name(),
                    player_email=user.email,
                    total_price=Decimal('500.00'),
                    status='confirmed'
                )
                reservations_created += 1
        
        end_time = time_module.time()
        reservation_time = end_time - start_time
        
        # Should create many reservations quickly
        assert reservations_created > 0
        assert reservation_time < 30  # Should complete in under 30 seconds
        
        # Test bulk payment processing
        start_time = time_module.time()
        
        reservations = Reservation.objects.filter(club=club)[:20]  # Process 20 payments
        payments_created = 0
        
        for reservation in reservations:
            payment = Payment.objects.create(
                organization=organization,
                club=club,
                user=reservation.user,
                reservation=reservation,
                amount=reservation.total_price,
                payment_type='reservation',
                payment_method='cash',
                status='completed',
                net_amount=reservation.total_price,
                processed_at=timezone.now()
            )
            payments_created += 1
        
        end_time = time_module.time()
        payment_time = end_time - start_time
        
        assert payments_created == 20
        assert payment_time < 10  # Should complete in under 10 seconds
        
        # Verify revenues were created (via signals)
        revenues_count = Revenue.objects.filter(club=club).count()
        assert revenues_count == payments_created
    
    def test_concurrent_data_integrity_checks(self):
        """Test data integrity checks under concurrent operations."""
        organization = Organization.objects.create(
            name="Concurrent Test Organization",
            slug="concurrent-test-org",
            is_active=True
        )
        
        club = Club.objects.create(
            name="Concurrent Test Club",
            organization=organization,
            address="Test Address",
            is_active=True
        )
        
        user = User.objects.create_user(
            email="concurrent@example.com",
            password="testpass123",
            organization=organization,
            club=club
        )
        
        # Create data with some inconsistencies
        payment = Payment.objects.create(
            organization=organization,
            club=club,
            user=user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='cash',
            status='completed',
            net_amount=Decimal('500.00'),
            processed_at=timezone.now()
        )
        
        # Don't create revenue for this payment (create inconsistency)
        
        service = DataIntegrityService()
        
        # Run integrity check
        issues = service.check_all_integrity(
            start_date=date.today(),
            end_date=date.today()
        )
        
        # Should find the missing revenue issue
        missing_revenue_issues = [
            issue for issue in issues 
            if issue['type'] == 'missing_revenue'
        ]
        
        assert len(missing_revenue_issues) > 0
        
        # Test auto-fix
        fixed_count = service.auto_fix_missing_revenues(
            start_date=date.today(),
            end_date=date.today()
        )
        
        assert fixed_count == 1
        
        # Verify revenue was created
        revenue = Revenue.objects.get(payment=payment)
        assert revenue.amount == payment.net_amount


if __name__ == '__main__':
    pytest.main([__file__])