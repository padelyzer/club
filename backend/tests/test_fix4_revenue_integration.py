#!/usr/bin/env python
"""
FIX-4: Tests unitarios para integración de ingresos.
Tests for revenue tracking, signals integration, and reporting.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models.signals import post_save
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from apps.finance.models import Payment, Revenue
from apps.finance.signals import (
    create_revenue_on_payment_completion,
    update_reservation_on_payment
)
from apps.finance.reports import RevenueReportService
from apps.reservations.models import Reservation
from apps.clubs.models import Club, Court
from apps.root.models import Organization

User = get_user_model()


class TestRevenueModel(TestCase):
    """Test Revenue model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        self.payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            net_amount=Decimal('485.00'),
            processed_at=timezone.now()
        )
    
    def test_revenue_creation(self):
        """Test revenue record creation."""
        revenue = Revenue.objects.create(
            organization=self.organization,
            club=self.club,
            date=date.today(),
            concept='reservation',
            description='Court reservation payment',
            amount=Decimal('485.00'),
            payment_method='stripe',
            reference='PAY-TEST-001',
            payment=self.payment
        )
        
        self.assertEqual(revenue.organization, self.organization)
        self.assertEqual(revenue.club, self.club)
        self.assertEqual(revenue.amount, Decimal('485.00'))
        self.assertEqual(revenue.concept, 'reservation')
        self.assertEqual(revenue.payment, self.payment)
    
    def test_revenue_validation_positive_amount(self):
        """Test revenue amount validation."""
        from django.core.exceptions import ValidationError
        
        # Negative amount should raise error
        with self.assertRaises(ValidationError):
            revenue = Revenue(
                organization=self.organization,
                club=self.club,
                date=date.today(),
                concept='reservation',
                description='Test',
                amount=Decimal('-100.00'),
                payment_method='cash',
                reference='REF-001'
            )
            revenue.clean()
        
        # Zero amount should raise error
        with self.assertRaises(ValidationError):
            revenue = Revenue(
                organization=self.organization,
                club=self.club,
                date=date.today(),
                concept='reservation',
                description='Test',
                amount=Decimal('0.00'),
                payment_method='cash',
                reference='REF-001'
            )
            revenue.clean()
    
    def test_revenue_str_representation(self):
        """Test revenue string representation."""
        revenue = Revenue.objects.create(
            organization=self.organization,
            club=self.club,
            date=date.today(),
            concept='reservation',
            description='Court reservation payment',
            amount=Decimal('485.00'),
            payment_method='stripe',
            reference='PAY-TEST-001'
        )
        
        expected = f"Revenue {date.today()} - reservation - $485.00"
        self.assertEqual(str(revenue), expected)
    
    def test_revenue_manager_active_filter(self):
        """Test revenue manager active filter."""
        # Create active revenue
        active_revenue = Revenue.objects.create(
            organization=self.organization,
            club=self.club,
            date=date.today(),
            concept='reservation',
            description='Active revenue',
            amount=Decimal('500.00'),
            payment_method='cash',
            reference='ACTIVE-001',
            is_active=True
        )
        
        # Create inactive revenue
        inactive_revenue = Revenue.objects.create(
            organization=self.organization,
            club=self.club,
            date=date.today(),
            concept='reservation',
            description='Inactive revenue',
            amount=Decimal('300.00'),
            payment_method='cash',
            reference='INACTIVE-001',
            is_active=False
        )
        
        # Test active filter
        active_revenues = Revenue.objects.filter(is_active=True)
        self.assertIn(active_revenue, active_revenues)
        self.assertNotIn(inactive_revenue, active_revenues)


class TestRevenueSignals(TransactionTestCase):
    """Test revenue signal integration."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
    
    def test_revenue_created_on_payment_completion(self):
        """Test that revenue is created when payment is completed."""
        # Create payment with completed status
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            net_amount=Decimal('485.00'),
            processed_at=timezone.now(),
            reference_number='PAY-TEST-001',
            description='Court reservation payment'
        )
        
        # Check that revenue was created
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 1)
        
        revenue = revenues.first()
        self.assertEqual(revenue.organization, self.organization)
        self.assertEqual(revenue.club, self.club)
        self.assertEqual(revenue.amount, payment.net_amount)
        self.assertEqual(revenue.concept, payment.payment_type)
        self.assertEqual(revenue.payment_method, payment.payment_method)
        self.assertEqual(revenue.reference, payment.reference_number)
    
    def test_revenue_not_created_for_pending_payment(self):
        """Test that revenue is not created for pending payments."""
        # Create payment with pending status
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='pending',
            net_amount=Decimal('485.00')
        )
        
        # Check that no revenue was created
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 0)
    
    def test_revenue_not_duplicated_on_payment_update(self):
        """Test that revenue is not duplicated when payment is updated."""
        # Create payment with pending status
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='pending',
            net_amount=Decimal('485.00'),
            processed_at=timezone.now(),
            reference_number='PAY-TEST-001'
        )
        
        # Update payment to completed (should create revenue)
        payment.status = 'completed'
        payment.save()
        
        # Check that one revenue was created
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 1)
        
        # Update payment again (should not create duplicate)
        payment.description = 'Updated description'
        payment.save()
        
        # Check that still only one revenue exists
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 1)
    
    def test_reservation_status_updated_on_payment(self):
        """Test that reservation status is updated when payment is completed."""
        # Create reservation
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='pending',
            payment_status='pending'
        )
        
        # Create payment for reservation
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            reservation=reservation,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='pending'
        )
        
        # Update reservation payment status
        reservation.payment_status = 'paid'
        reservation.save()
        
        # Check that reservation status was updated
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'confirmed')


class TestRevenueReportService(TestCase):
    """Test RevenueReportService functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
        
        # Create test revenues for different dates and methods
        self.revenues = []
        payment_methods = ['cash', 'stripe', 'card']
        concepts = ['reservation', 'membership', 'class']
        
        for i in range(10):
            date_offset = i % 5  # 5 different dates
            payment = Payment.objects.create(
                organization=self.organization,
                club=self.club,
                user=self.user,
                amount=Decimal('500.00') + (i * 50),
                payment_type=concepts[i % 3],
                payment_method=payment_methods[i % 3],
                status='completed',
                net_amount=Decimal('485.00') + (i * 48),
                processed_at=timezone.now() - timedelta(days=date_offset, hours=10 + (i % 12))
            )
            
            revenue = Revenue.objects.create(
                organization=self.organization,
                club=self.club,
                date=date.today() - timedelta(days=date_offset),
                concept=concepts[i % 3],
                description=f'Test revenue {i}',
                amount=payment.net_amount,
                payment_method=payment_methods[i % 3],
                reference=f'REV-{i:03d}',
                payment=payment
            )
            self.revenues.append(revenue)
        
        self.service = RevenueReportService()
    
    def test_daily_report_generation(self):
        """Test daily revenue report generation."""
        report = self.service.daily_report(date=date.today(), club=self.club)
        
        # Check report structure
        self.assertIn('date', report)
        self.assertIn('club', report)
        self.assertIn('summary', report)
        self.assertIn('by_payment_method', report)
        self.assertIn('by_concept', report)
        self.assertIn('hourly_breakdown', report)
        
        # Check summary data
        self.assertIn('total_revenue', report['summary'])
        self.assertIn('total_transactions', report['summary'])
        
        # Verify data types
        self.assertIsInstance(report['summary']['total_revenue'], Decimal)
        self.assertIsInstance(report['summary']['total_transactions'], int)
        self.assertIsInstance(report['by_payment_method'], list)
        self.assertIsInstance(report['by_concept'], list)
        self.assertIsInstance(report['hourly_breakdown'], list)
        
        # Check hourly breakdown structure
        if report['hourly_breakdown']:
            hour_data = report['hourly_breakdown'][0]
            self.assertIn('hour', hour_data)
            self.assertIn('amount', hour_data)
            self.assertIn('count', hour_data)
    
    def test_monthly_report_generation(self):
        """Test monthly revenue report generation."""
        current_date = date.today()
        report = self.service.monthly_report(
            year=current_date.year,
            month=current_date.month,
            club=self.club
        )
        
        # Check report structure
        self.assertIn('year', report)
        self.assertIn('month', report)
        self.assertIn('club', report)
        self.assertIn('date_range', report)
        self.assertIn('summary', report)
        self.assertIn('by_payment_method', report)
        self.assertIn('by_concept', report)
        self.assertIn('daily_breakdown', report)
        self.assertIn('weekly_breakdown', report)
        
        # Check date range
        self.assertIn('start', report['date_range'])
        self.assertIn('end', report['date_range'])
        
        # Check summary includes daily average
        self.assertIn('daily_average', report['summary'])
        
        # Verify weekly breakdown structure
        self.assertIsInstance(report['weekly_breakdown'], list)
        if report['weekly_breakdown']:
            week_data = report['weekly_breakdown'][0]
            self.assertIn('week', week_data)
            self.assertIn('start_date', week_data)
            self.assertIn('end_date', week_data)
            self.assertIn('revenue', week_data)
            self.assertIn('transactions', week_data)
    
    def test_court_utilization_report(self):
        """Test court utilization report generation."""
        # Create reservations for court utilization
        for i in range(3):
            reservation = Reservation.objects.create(
                club=self.club,
                court=self.court,
                user=self.user,
                date=date.today(),
                start_time=time(10 + i, 0),
                end_time=time(11 + i, 0),
                player_name=f'Player {i}',
                player_email=f'player{i}@example.com',
                total_price=Decimal('500.00'),
                payment_status='paid'
            )
        
        report = self.service.court_utilization_report(
            start_date=date.today() - timedelta(days=1),
            end_date=date.today() + timedelta(days=1),
            club=self.club
        )
        
        # Check report structure
        self.assertIn('club', report)
        self.assertIn('date_range', report)
        self.assertIn('courts', report)
        self.assertIn('peak_hours', report)
        self.assertIn('summary', report)
        
        # Check courts data
        self.assertIsInstance(report['courts'], dict)
        if report['courts']:
            court_name = list(report['courts'].keys())[0]
            court_data = report['courts'][court_name]
            self.assertIn('court_id', court_data)
            self.assertIn('total_reservations', court_data)
            self.assertIn('total_revenue', court_data)
            self.assertIn('utilization_rate', court_data)
        
        # Check peak hours
        self.assertIsInstance(report['peak_hours'], dict)
        
        # Check summary
        self.assertIn('total_courts', report['summary'])
        self.assertIn('total_revenue', report['summary'])
        self.assertIn('average_utilization', report['summary'])
    
    def test_payment_method_analysis(self):
        """Test payment method analysis report."""
        report = self.service.payment_method_analysis(
            start_date=date.today() - timedelta(days=5),
            end_date=date.today(),
            club=self.club
        )
        
        # Check report structure
        self.assertIn('date_range', report)
        self.assertIn('club', report)
        self.assertIn('payment_methods', report)
        self.assertIn('failed_payments', report)
        self.assertIn('recommendations', report)
        
        # Check payment methods data
        self.assertIsInstance(report['payment_methods'], dict)
        
        # Check each payment method has required data
        for method, data in report['payment_methods'].items():
            self.assertIn('total_transactions', data)
            self.assertIn('total_amount', data)
            self.assertIn('total_revenue', data)
            self.assertIn('total_fees', data)
            self.assertIn('average_transaction', data)
            self.assertIn('fee_percentage', data)
        
        # Check failed payments structure
        self.assertIn('total_count', report['failed_payments'])
        self.assertIn('total_amount', report['failed_payments'])
        self.assertIn('by_method', report['failed_payments'])
        
        # Check recommendations
        self.assertIsInstance(report['recommendations'], list)
    
    def test_payment_recommendations_generation(self):
        """Test payment method recommendations generation."""
        # Create mock methods data with high fees
        methods_data = {
            'stripe': {
                'total_transactions': 100,
                'total_amount': Decimal('10000.00'),
                'fee_percentage': 3.5  # High fee
            },
            'cash': {
                'total_transactions': 10,
                'total_amount': Decimal('1000.00'),
                'fee_percentage': 0.0  # Low fee, low usage
            }
        }
        
        recommendations = self.service._generate_payment_recommendations(methods_data)
        
        self.assertIsInstance(recommendations, list)
        
        # Check for high fees recommendation
        high_fee_recs = [r for r in recommendations if r['type'] == 'high_fees']
        self.assertGreater(len(high_fee_recs), 0)
        
        # Check for underutilized recommendation
        underutilized_recs = [r for r in recommendations if r['type'] == 'underutilized']
        self.assertGreater(len(underutilized_recs), 0)


class TestRevenueIntegration(TransactionTestCase):
    """Test revenue integration with other modules."""
    
    def setUp(self):
        """Set up test data."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        self.club = Club.objects.create(
            name="Test Club",
            organization=self.organization,
            address="Test Address",
            is_active=True
        )
        
        self.court = Court.objects.create(
            name="Court 1",
            club=self.club,
            court_type="padel",
            is_active=True
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=self.organization,
            club=self.club
        )
    
    def test_full_reservation_to_revenue_workflow(self):
        """Test complete workflow from reservation to revenue tracking."""
        # Step 1: Create reservation
        reservation = Reservation.objects.create(
            club=self.club,
            court=self.court,
            user=self.user,
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            player_name=self.user.get_full_name(),
            player_email=self.user.email,
            total_price=Decimal('500.00'),
            status='pending'
        )
        
        # Step 2: Create payment for reservation
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            reservation=reservation,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='pending',
            net_amount=Decimal('485.00'),
            processing_fee=Decimal('15.00')
        )
        
        # Verify no revenue exists yet
        self.assertEqual(Revenue.objects.filter(payment=payment).count(), 0)
        
        # Step 3: Complete payment (should trigger revenue creation)
        payment.status = 'completed'
        payment.processed_at = timezone.now()
        payment.reference_number = 'PAY-TEST-001'
        payment.save()
        
        # Verify revenue was created
        revenues = Revenue.objects.filter(payment=payment)
        self.assertEqual(revenues.count(), 1)
        
        revenue = revenues.first()
        self.assertEqual(revenue.amount, payment.net_amount)
        self.assertEqual(revenue.concept, 'reservation')
        self.assertEqual(revenue.organization, self.organization)
        self.assertEqual(revenue.club, self.club)
        
        # Step 4: Update reservation payment status (should update reservation)
        reservation.payment_status = 'paid'
        reservation.save()
        
        # Verify reservation status was updated
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'confirmed')
    
    def test_refund_impact_on_revenue(self):
        """Test how refunds affect revenue tracking."""
        # Create completed payment with revenue
        payment = Payment.objects.create(
            organization=self.organization,
            club=self.club,
            user=self.user,
            amount=Decimal('500.00'),
            payment_type='reservation',
            payment_method='stripe',
            status='completed',
            net_amount=Decimal('485.00'),
            processed_at=timezone.now(),
            reference_number='PAY-TEST-001'
        )
        
        # Verify revenue was created
        revenue = Revenue.objects.get(payment=payment)
        self.assertEqual(revenue.amount, Decimal('485.00'))
        
        # Process refund
        payment.refund_amount = Decimal('200.00')
        payment.refunded_at = timezone.now()
        payment.status = 'partial_refund'
        payment.save()
        
        # Revenue should remain the same (refunds are tracked separately)
        revenue.refresh_from_db()
        self.assertEqual(revenue.amount, Decimal('485.00'))
        
        # But payment shows refund amount
        self.assertEqual(payment.refund_amount, Decimal('200.00'))


@pytest.mark.django_db
class TestRevenueSignalIntegration:
    """Test revenue signal integration scenarios."""
    
    def test_signal_with_payment_creation_rollback(self):
        """Test signal behavior during payment creation rollback."""
        organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        club = Club.objects.create(
            name="Test Club",
            organization=organization,
            address="Test Address",
            is_active=True
        )
        
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=organization,
            club=club
        )
        
        # Mock Revenue creation to fail
        with patch('apps.finance.models.Revenue.objects.create') as mock_create:
            mock_create.side_effect = Exception("Revenue creation failed")
            
            with pytest.raises(Exception):
                Payment.objects.create(
                    organization=organization,
                    club=club,
                    user=user,
                    amount=Decimal('500.00'),
                    payment_type='reservation',
                    payment_method='stripe',
                    status='completed',
                    net_amount=Decimal('485.00'),
                    processed_at=timezone.now()
                )
            
            # Payment should not exist due to rollback
            assert not Payment.objects.filter(user=user).exists()
    
    def test_multiple_payments_revenue_tracking(self):
        """Test revenue tracking for multiple payments."""
        organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org",
            is_active=True
        )
        
        club = Club.objects.create(
            name="Test Club",
            organization=organization,
            address="Test Address",
            is_active=True
        )
        
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            organization=organization,
            club=club
        )
        
        # Create multiple payments
        payments = []
        for i in range(3):
            payment = Payment.objects.create(
                organization=organization,
                club=club,
                user=user,
                amount=Decimal('500.00') * (i + 1),
                payment_type='reservation',
                payment_method='stripe',
                status='completed',
                net_amount=Decimal('485.00') * (i + 1),
                processed_at=timezone.now(),
                reference_number=f'PAY-{i:03d}'
            )
            payments.append(payment)
        
        # Verify all revenues were created
        total_revenues = Revenue.objects.filter(
            payment__in=payments
        ).count()
        
        assert total_revenues == 3
        
        # Verify total revenue amount
        total_revenue_amount = sum(
            r.amount for r in Revenue.objects.filter(payment__in=payments)
        )
        expected_total = Decimal('485.00') + Decimal('970.00') + Decimal('1455.00')
        
        assert total_revenue_amount == expected_total


if __name__ == '__main__':
    pytest.main([__file__])