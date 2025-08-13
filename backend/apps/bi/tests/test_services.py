"""
Tests for BI services.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.bi.models import Alert, Metric, Widget
from apps.bi.services import (
    AlertEvaluator,
    ClubAnalyticsService,
    MetricsCalculator,
    WidgetDataService,
)
from apps.clubs.models import Club
from apps.finance.models import PaymentMethod, Transaction
from apps.reservations.models import Reservation
from apps.root.models import Organization

User = get_user_model()


class BiServicesTestCase(TestCase):
    """Test case for BI services."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org"
        )

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            email="club@example.com",
            phone="1234567890",
        )

        # Create payment method for transactions
        self.payment_method = PaymentMethod.objects.create(
            club=self.club, name="Cash", payment_type="cash"
        )

    def test_revenue_metric_calculation(self):
        """Test revenue metric calculation."""
        # Create test transactions
        Transaction.objects.create(
            organization=self.organization,
            club=self.club,
            transaction_type="income",
            category="reservation_payment",
            amount=Decimal("100.00"),
            payment_method=self.payment_method,
            status="completed",
            description="Test transaction 1",
        )

        Transaction.objects.create(
            organization=self.organization,
            club=self.club,
            transaction_type="income",
            category="reservation_payment",
            amount=Decimal("150.00"),
            payment_method=self.payment_method,
            status="completed",
            description="Test transaction 2",
        )

        # Create revenue metric
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Total Revenue",
            metric_type="revenue",
            calculation_type="sum",
        )

        # Calculate metric
        calculator = MetricsCalculator(metric)
        value = calculator.calculate()

        self.assertEqual(value, 250.0)

    def test_customer_metric_calculation(self):
        """Test customer metric calculation."""
        # Create metric
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Active Customers",
            metric_type="customers",
            calculation_type="count",
        )

        # Calculate metric (should be 0 with no transactions)
        calculator = MetricsCalculator(metric)
        value = calculator.calculate()

        self.assertEqual(value, 0)

    def test_alert_evaluation(self):
        """Test alert evaluation."""
        # Create transactions
        Transaction.objects.create(
            organization=self.organization,
            club=self.club,
            transaction_type="income",
            category="reservation_payment",
            amount=Decimal("50.00"),
            payment_method=self.payment_method,
            status="completed",
            description="Low revenue transaction",
        )

        # Create metric
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Revenue",
            metric_type="revenue",
            calculation_type="sum",
        )

        # Create alert with threshold higher than current revenue
        alert = Alert.objects.create(
            organization=self.organization,
            club=self.club,
            name="Low Revenue Alert",
            alert_type="threshold",
            metric=metric,
            condition="less_than",
            threshold_value=Decimal("100.00"),
            severity="high",
        )

        # Evaluate alert
        evaluator = AlertEvaluator(alert)
        result = evaluator.evaluate()

        # Alert should trigger because revenue (50) < threshold (100)
        self.assertIn(result, ["triggered", "already_triggered"])

    def test_widget_data_service(self):
        """Test widget data service."""
        # Create metric
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Revenue",
            metric_type="revenue",
            calculation_type="sum",
        )

        # Create widget
        widget = Widget.objects.create(
            organization=self.organization,
            club=self.club,
            name="Revenue Widget",
            widget_type="metric",
        )
        widget.metrics.add(metric)

        # Get widget data
        service = WidgetDataService(widget)
        data = service.get_data()

        self.assertIn("metrics", data)
        self.assertEqual(len(data["metrics"]), 1)

    def test_club_analytics_service(self):
        """Test club analytics service."""
        # Create test data
        Transaction.objects.create(
            organization=self.organization,
            club=self.club,
            transaction_type="income",
            category="reservation_payment",
            amount=Decimal("200.00"),
            payment_method=self.payment_method,
            status="completed",
            description="Analytics test transaction",
        )

        # Get analytics
        service = ClubAnalyticsService(self.club)
        analytics = service.get_analytics(
            period="month",
            include_revenue=True,
            include_occupancy=True,
            include_customers=True,
        )

        self.assertIn("revenue", analytics)
        self.assertIn("occupancy", analytics)
        self.assertIn("customers", analytics)
        self.assertEqual(analytics["revenue"]["total"], 200.0)

    def test_growth_metric_calculation(self):
        """Test growth metric calculation."""
        # Create current period transaction
        Transaction.objects.create(
            organization=self.organization,
            club=self.club,
            transaction_type="income",
            category="reservation_payment",
            amount=Decimal("100.00"),
            payment_method=self.payment_method,
            status="completed",
            description="Current period transaction",
            transaction_date=timezone.now(),
        )

        # Create previous period transaction
        Transaction.objects.create(
            organization=self.organization,
            club=self.club,
            transaction_type="income",
            category="reservation_payment",
            amount=Decimal("80.00"),
            payment_method=self.payment_method,
            status="completed",
            description="Previous period transaction",
            transaction_date=timezone.now() - timedelta(days=35),
        )

        # Create growth metric
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Revenue Growth",
            metric_type="growth",
            calculation_type="growth_rate",
            calculation_config={"source": "revenue"},
        )

        # Calculate growth
        calculator = MetricsCalculator(metric)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        value = calculator.calculate(start_date, end_date)

        # Should show 25% growth (from 80 to 100)
        expected_growth = 25.0
        self.assertEqual(value, expected_growth)
