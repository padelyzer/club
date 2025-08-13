"""
Tests for BI views.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APIClient

from apps.bi.models import Alert, Dashboard, DataSource, Metric, Widget
from apps.clubs.models import Club
from apps.root.models import Organization

User = get_user_model()


class BiViewsTestCase(TestCase):
    """Test case for BI views."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TEST_PASSWORD"
        )

        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-org"
        )

        self.user.organization = self.organization
        self.user.save()

        self.club = Club.objects.create(
            organization=self.organization,
            name="Test Club",
            slug="test-club",
            email="club@example.com",
            phone="1234567890",
        )

        # Authenticate user
        self.client.force_authenticate(user=self.user)

    def test_data_source_list(self):
        """Test DataSource list endpoint."""
        DataSource.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Data Source",
            source_type="database",
        )

        url = reverse("bi:datasource-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_metric_creation(self):
        """Test Metric creation endpoint."""
        url = reverse("bi:metric-list")
        data = {
            "name": "Test Metric",
            "metric_type": "revenue",
            "calculation_type": "sum",
            "club": str(self.club.id),
            "unit": "$",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Test Metric")

    def test_widget_creation(self):
        """Test Widget creation endpoint."""
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Metric",
            metric_type="revenue",
            calculation_type="sum",
        )

        url = reverse("bi:widget-list")
        data = {
            "name": "Test Widget",
            "widget_type": "chart",
            "chart_type": "line",
            "club": str(self.club.id),
            "metrics": [str(metric.id)],
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Test Widget")

    def test_dashboard_creation(self):
        """Test Dashboard creation endpoint."""
        url = reverse("bi:dashboard-list")
        data = {
            "name": "Test Dashboard",
            "dashboard_type": "executive",
            "club": str(self.club.id),
            "is_public": True,
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Test Dashboard")

    def test_alert_creation(self):
        """Test Alert creation endpoint."""
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Metric",
            metric_type="revenue",
            calculation_type="sum",
        )

        url = reverse("bi:alert-list")
        data = {
            "name": "Test Alert",
            "alert_type": "threshold",
            "metric": str(metric.id),
            "condition": "less_than",
            "threshold_value": "5000.00",
            "severity": "high",
            "club": str(self.club.id),
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Test Alert")

    def test_metric_calculate(self):
        """Test metric calculation endpoint."""
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Metric",
            metric_type="revenue",
            calculation_type="sum",
        )

        url = reverse("bi:metric-calculate", kwargs={"pk": metric.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("value", response.data)

    def test_widget_get_data(self):
        """Test widget data endpoint."""
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Metric",
            metric_type="revenue",
            calculation_type="sum",
        )

        widget = Widget.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Widget",
            widget_type="chart",
        )
        widget.metrics.add(metric)

        url = reverse("bi:widget-get-data", kwargs={"pk": widget.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)

    def test_dashboard_add_widget(self):
        """Test adding widget to dashboard."""
        metric = Metric.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Metric",
            metric_type="revenue",
            calculation_type="sum",
        )

        widget = Widget.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Widget",
            widget_type="chart",
        )
        widget.metrics.add(metric)

        dashboard = Dashboard.objects.create(
            organization=self.organization,
            club=self.club,
            name="Test Dashboard",
            dashboard_type="executive",
        )

        url = reverse("bi:dashboard-add-widget", kwargs={"pk": dashboard.id})
        data = {
            "widget_id": str(widget.id),
            "position_x": 0,
            "position_y": 0,
            "width": 2,
            "height": 1,
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(dashboard.widgets.count(), 1)

    def test_analytics_dashboard(self):
        """Test dashboard analytics endpoint."""
        url = reverse("bi:analytics-dashboard")
        data = {"period": "month"}

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("metrics", response.data)

    def test_analytics_club(self):
        """Test club analytics endpoint."""
        url = f"{reverse('bi:analytics-club')}?club={self.club.id}"
        data = {"period": "month", "include_revenue": True, "include_occupancy": True}

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("club", response.data)

    def test_unauthorized_access(self):
        """Test unauthorized access to BI endpoints."""
        self.client.force_authenticate(user=None)

        url = reverse("bi:metric-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
