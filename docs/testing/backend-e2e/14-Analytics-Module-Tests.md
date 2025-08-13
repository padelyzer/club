# 📊 Analytics Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de analytics, cubriendo métricas de negocio, dashboards, reportes personalizados y análisis predictivo.

## 🎯 Objetivos de Testing

### Cobertura Target: 85%
- **Unit Tests**: 60% - Cálculos y agregaciones
- **Integration Tests**: 20% - APIs y data pipelines
- **E2E Tests**: 20% - Dashboards completos y reportes

### Componentes a Cubrir
- ✅ Business Metrics Calculation
- ✅ Real-time Dashboards
- ✅ Custom Reports Builder
- ✅ Data Export (CSV, PDF, Excel)
- ✅ Predictive Analytics
- ✅ Performance Monitoring
- ✅ Revenue Analytics
- ✅ User Behavior Analysis

## 🧪 Unit Tests

### 1. Metrics Calculation Tests
```python
# backend/tests/unit/analytics/test_metrics.py
from django.test import TestCase
from datetime import datetime, timedelta
from decimal import Decimal
from apps.analytics.services import (
    RevenueMetrics, OccupancyMetrics, UserMetrics, PerformanceMetrics
)
from tests.factories import ClubFactory, ReservationFactory, PaymentFactory

class RevenueMetricsTest(TestCase):
    """Test revenue metrics calculations"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.metrics = RevenueMetrics(club=self.club)
        self.start_date = datetime(2023, 11, 1)
        self.end_date = datetime(2023, 11, 30)
    
    def test_calculate_total_revenue(self):
        """Test total revenue calculation"""
        # Create payments
        PaymentFactory.create_batch(
            5,
            club=self.club,
            amount=Decimal('50.00'),
            status='completed',
            created_at=self.start_date + timedelta(days=1)
        )
        PaymentFactory(
            club=self.club,
            amount=Decimal('100.00'),
            status='completed',
            created_at=self.start_date + timedelta(days=15)
        )
        # Failed payment should not count
        PaymentFactory(
            club=self.club,
            amount=Decimal('50.00'),
            status='failed',
            created_at=self.start_date + timedelta(days=10)
        )
        
        total = self.metrics.calculate_total_revenue(
            self.start_date,
            self.end_date
        )
        
        self.assertEqual(total, Decimal('350.00'))  # 5*50 + 100
    
    def test_revenue_by_category(self):
        """Test revenue breakdown by category"""
        # Reservations
        PaymentFactory.create_batch(
            3,
            club=self.club,
            amount=Decimal('30.00'),
            type='reservation',
            status='completed'
        )
        # Classes
        PaymentFactory.create_batch(
            2,
            club=self.club,
            amount=Decimal('50.00'),
            type='class',
            status='completed'
        )
        # Tournaments
        PaymentFactory(
            club=self.club,
            amount=Decimal('100.00'),
            type='tournament',
            status='completed'
        )
        
        breakdown = self.metrics.calculate_revenue_by_category(
            self.start_date,
            self.end_date
        )
        
        self.assertEqual(breakdown['reservation'], Decimal('90.00'))
        self.assertEqual(breakdown['class'], Decimal('100.00'))
        self.assertEqual(breakdown['tournament'], Decimal('100.00'))
        self.assertEqual(breakdown['total'], Decimal('290.00'))
    
    def test_revenue_growth_rate(self):
        """Test revenue growth calculation"""
        # Previous period
        PaymentFactory.create_batch(
            5,
            club=self.club,
            amount=Decimal('40.00'),
            status='completed',
            created_at=self.start_date - timedelta(days=15)
        )
        # Current period
        PaymentFactory.create_batch(
            5,
            club=self.club,
            amount=Decimal('50.00'),
            status='completed',
            created_at=self.start_date + timedelta(days=15)
        )
        
        growth = self.metrics.calculate_growth_rate(
            current_start=self.start_date,
            current_end=self.end_date,
            comparison_period='previous_month'
        )
        
        self.assertEqual(growth['current_revenue'], Decimal('250.00'))
        self.assertEqual(growth['previous_revenue'], Decimal('200.00'))
        self.assertEqual(growth['growth_rate'], Decimal('25.00'))  # 25% growth
        self.assertEqual(growth['absolute_change'], Decimal('50.00'))

class OccupancyMetricsTest(TestCase):
    """Test court occupancy metrics"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.courts = CourtFactory.create_batch(3, club=self.club)
        self.metrics = OccupancyMetrics(club=self.club)
    
    def test_calculate_occupancy_rate(self):
        """Test occupancy rate calculation"""
        # Total available hours: 3 courts * 10 hours * 30 days = 900 hours
        # Create reservations
        for court in self.courts:
            ReservationFactory.create_batch(
                20,  # 20 reservations per court
                court=court,
                duration=60,  # 1 hour each
                status='confirmed'
            )
        
        occupancy = self.metrics.calculate_occupancy_rate(
            start_date=datetime(2023, 11, 1),
            end_date=datetime(2023, 11, 30),
            daily_hours=10
        )
        
        self.assertEqual(occupancy['total_available_hours'], 900)
        self.assertEqual(occupancy['total_reserved_hours'], 60)  # 3 courts * 20 hours
        self.assertAlmostEqual(
            float(occupancy['occupancy_rate']), 
            6.67, 
            places=2
        )  # 60/900 * 100
    
    def test_peak_hours_analysis(self):
        """Test peak hours identification"""
        # Create reservations at specific times
        peak_times = ['09:00', '10:00', '18:00', '19:00']
        off_peak_times = ['14:00', '15:00']
        
        for time in peak_times:
            ReservationFactory.create_batch(
                10,
                court=self.courts[0],
                start_time=time,
                status='confirmed'
            )
        
        for time in off_peak_times:
            ReservationFactory.create_batch(
                2,
                court=self.courts[0],
                start_time=time,
                status='confirmed'
            )
        
        peak_analysis = self.metrics.analyze_peak_hours()
        
        # Verify peak hours identified correctly
        top_hours = [h['hour'] for h in peak_analysis['peak_hours'][:4]]
        for peak_time in peak_times:
            hour = int(peak_time.split(':')[0])
            self.assertIn(hour, top_hours)
    
    def test_court_utilization_comparison(self):
        """Test individual court utilization"""
        # Different utilization per court
        ReservationFactory.create_batch(
            30,
            court=self.courts[0],
            status='confirmed'
        )
        ReservationFactory.create_batch(
            20,
            court=self.courts[1],
            status='confirmed'
        )
        ReservationFactory.create_batch(
            10,
            court=self.courts[2],
            status='confirmed'
        )
        
        utilization = self.metrics.calculate_court_utilization()
        
        # Courts should be ordered by utilization
        self.assertEqual(utilization[0]['court_id'], self.courts[0].id)
        self.assertEqual(utilization[0]['reservation_count'], 30)
        self.assertEqual(utilization[2]['court_id'], self.courts[2].id)
        self.assertEqual(utilization[2]['reservation_count'], 10)

class UserMetricsTest(TestCase):
    """Test user behavior metrics"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.metrics = UserMetrics(club=self.club)
    
    def test_calculate_user_retention(self):
        """Test user retention calculation"""
        # Create users with different activity patterns
        # Active users (made reservations in both periods)
        active_users = UserFactory.create_batch(10)
        for user in active_users:
            ReservationFactory(
                user=user,
                club=self.club,
                created_at=datetime(2023, 10, 15),
                status='completed'
            )
            ReservationFactory(
                user=user,
                club=self.club,
                created_at=datetime(2023, 11, 15),
                status='completed'
            )
        
        # Churned users (only in first period)
        churned_users = UserFactory.create_batch(5)
        for user in churned_users:
            ReservationFactory(
                user=user,
                club=self.club,
                created_at=datetime(2023, 10, 15),
                status='completed'
            )
        
        retention = self.metrics.calculate_retention_rate(
            current_month=datetime(2023, 11, 1),
            previous_month=datetime(2023, 10, 1)
        )
        
        self.assertEqual(retention['previous_period_users'], 15)
        self.assertEqual(retention['retained_users'], 10)
        self.assertAlmostEqual(
            float(retention['retention_rate']),
            66.67,
            places=2
        )
    
    def test_user_lifetime_value(self):
        """Test user LTV calculation"""
        user = UserFactory()
        
        # Create payment history
        payments = [
            PaymentFactory(
                user=user,
                club=self.club,
                amount=Decimal('30.00'),
                created_at=datetime.now() - timedelta(days=i*30)
            )
            for i in range(6)  # 6 months of payments
        ]
        
        ltv = self.metrics.calculate_user_ltv(user)
        
        self.assertEqual(ltv['total_revenue'], Decimal('180.00'))
        self.assertEqual(ltv['transaction_count'], 6)
        self.assertEqual(ltv['average_transaction'], Decimal('30.00'))
        self.assertEqual(ltv['months_active'], 6)
        self.assertGreater(ltv['predicted_ltv'], ltv['total_revenue'])
    
    def test_churn_prediction(self):
        """Test churn risk calculation"""
        # Active user
        active_user = UserFactory()
        for i in range(10):
            ReservationFactory(
                user=active_user,
                club=self.club,
                created_at=datetime.now() - timedelta(days=i*3)
            )
        
        # At-risk user (decreasing activity)
        at_risk_user = UserFactory()
        ReservationFactory(
            user=at_risk_user,
            club=self.club,
            created_at=datetime.now() - timedelta(days=60)
        )
        
        active_risk = self.metrics.calculate_churn_risk(active_user)
        at_risk_score = self.metrics.calculate_churn_risk(at_risk_user)
        
        self.assertLess(active_risk['risk_score'], 0.3)  # Low risk
        self.assertGreater(at_risk_score['risk_score'], 0.7)  # High risk
```

### 2. Analytics Aggregation Tests
```python
# backend/tests/unit/analytics/test_aggregations.py
from django.test import TestCase
from apps.analytics.aggregators import (
    TimeSeriesAggregator, GeographicAggregator, DemographicAggregator
)

class TimeSeriesAggregatorTest(TestCase):
    """Test time series data aggregation"""
    
    def setUp(self):
        self.aggregator = TimeSeriesAggregator()
    
    def test_hourly_aggregation(self):
        """Test hourly data aggregation"""
        # Create data points
        data_points = []
        base_time = datetime(2023, 11, 1, 0, 0)
        
        for i in range(48):  # 48 hours
            for j in range(5):  # 5 events per hour
                data_points.append({
                    'timestamp': base_time + timedelta(hours=i, minutes=j*10),
                    'value': 10 + j
                })
        
        hourly = self.aggregator.aggregate_by_hour(data_points)
        
        self.assertEqual(len(hourly), 48)
        self.assertEqual(hourly[0]['count'], 5)
        self.assertEqual(hourly[0]['total'], 60)  # 10+11+12+13+14
        self.assertEqual(hourly[0]['average'], 12)
    
    def test_daily_trend_detection(self):
        """Test trend detection in daily data"""
        # Create trending data
        data = []
        for i in range(30):
            daily_value = 100 + (i * 5)  # Upward trend
            data.append({
                'date': datetime(2023, 11, 1) + timedelta(days=i),
                'value': daily_value + random.randint(-10, 10)  # Add noise
            })
        
        trend = self.aggregator.detect_trend(data, period='daily')
        
        self.assertEqual(trend['direction'], 'increasing')
        self.assertGreater(trend['slope'], 4)  # ~5 per day
        self.assertGreater(trend['r_squared'], 0.8)  # Good fit
    
    def test_seasonality_detection(self):
        """Test seasonality pattern detection"""
        # Create seasonal data (weekly pattern)
        data = []
        for week in range(12):  # 12 weeks
            for day in range(7):
                # Higher on weekends (days 5,6)
                if day in [5, 6]:
                    value = 150 + random.randint(-10, 10)
                else:
                    value = 100 + random.randint(-10, 10)
                
                data.append({
                    'date': datetime(2023, 9, 1) + timedelta(weeks=week, days=day),
                    'value': value
                })
        
        seasonality = self.aggregator.detect_seasonality(data)
        
        self.assertTrue(seasonality['has_weekly_pattern'])
        self.assertEqual(len(seasonality['peak_days']), 2)
        self.assertIn(5, seasonality['peak_days'])  # Saturday
        self.assertIn(6, seasonality['peak_days'])  # Sunday

class DemographicAggregatorTest(TestCase):
    """Test demographic data aggregation"""
    
    def setUp(self):
        self.aggregator = DemographicAggregator()
    
    def test_age_distribution(self):
        """Test age group distribution"""
        users = []
        # Create users with specific age distribution
        age_groups = {
            '18-25': 20,
            '26-35': 40,
            '36-45': 25,
            '46-55': 10,
            '56+': 5
        }
        
        for age_range, count in age_groups.items():
            if age_range == '56+':
                age = 60
            else:
                age = int(age_range.split('-')[0])
            
            for _ in range(count):
                users.append(UserFactory(
                    birth_date=datetime.now().date() - timedelta(days=age*365)
                ))
        
        distribution = self.aggregator.calculate_age_distribution(users)
        
        self.assertEqual(distribution['18-25']['count'], 20)
        self.assertEqual(distribution['26-35']['percentage'], 40.0)
        self.assertEqual(distribution['median_age'], 32)
    
    def test_geographic_clustering(self):
        """Test geographic user clustering"""
        # Create users in specific areas
        madrid_users = UserFactory.create_batch(
            50,
            city='Madrid',
            postal_code='28001'
        )
        barcelona_users = UserFactory.create_batch(
            30,
            city='Barcelona',
            postal_code='08001'
        )
        valencia_users = UserFactory.create_batch(
            20,
            city='Valencia',
            postal_code='46001'
        )
        
        clusters = self.aggregator.calculate_geographic_clusters(
            madrid_users + barcelona_users + valencia_users
        )
        
        self.assertEqual(len(clusters), 3)
        self.assertEqual(clusters[0]['city'], 'Madrid')
        self.assertEqual(clusters[0]['user_count'], 50)
        self.assertEqual(clusters[0]['percentage'], 50.0)
```

### 3. Report Generation Tests
```python
# backend/tests/unit/analytics/test_reports.py
from django.test import TestCase
from apps.analytics.reports import (
    RevenueReport, OccupancyReport, ExecutiveSummaryReport
)

class ReportGenerationTest(TestCase):
    """Test report generation functionality"""
    
    def test_revenue_report_generation(self):
        """Test revenue report creation"""
        club = ClubFactory()
        report = RevenueReport(
            club=club,
            start_date=datetime(2023, 11, 1),
            end_date=datetime(2023, 11, 30)
        )
        
        # Generate report data
        report_data = report.generate()
        
        # Verify report structure
        self.assertIn('summary', report_data)
        self.assertIn('daily_revenue', report_data)
        self.assertIn('category_breakdown', report_data)
        self.assertIn('payment_methods', report_data)
        self.assertIn('top_customers', report_data)
        self.assertIn('growth_metrics', report_data)
    
    def test_executive_summary_completeness(self):
        """Test executive summary includes all KPIs"""
        club = ClubFactory()
        report = ExecutiveSummaryReport(club=club)
        
        summary = report.generate()
        
        required_sections = [
            'revenue_summary',
            'occupancy_summary',
            'user_summary',
            'operational_metrics',
            'key_insights',
            'recommendations'
        ]
        
        for section in required_sections:
            self.assertIn(section, summary)
            self.assertIsNotNone(summary[section])
```

## 🔌 Integration Tests

### 1. Analytics API Tests
```python
# backend/tests/integration/analytics/test_analytics_api.py
from rest_framework.test import APITestCase
from rest_framework import status

class AnalyticsAPITest(APITestCase):
    """Test analytics API endpoints"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.admin = StaffUserFactory(club=self.club)
        self.create_test_data()
    
    def create_test_data(self):
        """Create test data for analytics"""
        # Create reservations
        for i in range(30):
            ReservationFactory(
                club=self.club,
                created_at=datetime.now() - timedelta(days=i),
                status='completed'
            )
        
        # Create payments
        for i in range(20):
            PaymentFactory(
                club=self.club,
                amount=Decimal('50.00'),
                created_at=datetime.now() - timedelta(days=i)
            )
    
    def test_dashboard_metrics_endpoint(self):
        """Test dashboard metrics API"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/v1/analytics/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response structure
        data = response.data
        self.assertIn('revenue', data)
        self.assertIn('occupancy', data)
        self.assertIn('users', data)
        self.assertIn('trends', data)
        
        # Verify data populated
        self.assertGreater(data['revenue']['total'], 0)
        self.assertGreater(data['occupancy']['rate'], 0)
    
    def test_custom_date_range_filtering(self):
        """Test analytics with custom date ranges"""
        self.client.force_authenticate(user=self.admin)
        
        # Last 7 days
        response = self.client.get(
            '/api/v1/analytics/revenue/',
            {
                'start_date': (datetime.now() - timedelta(days=7)).date(),
                'end_date': datetime.now().date()
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify data is within range
        data = response.data
        self.assertEqual(len(data['daily_revenue']), 7)
    
    def test_export_analytics_data(self):
        """Test analytics data export"""
        self.client.force_authenticate(user=self.admin)
        
        # Export as CSV
        response = self.client.get(
            '/api/v1/analytics/export/',
            {
                'format': 'csv',
                'report_type': 'revenue',
                'start_date': '2023-11-01',
                'end_date': '2023-11-30'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Verify CSV content
        content = response.content.decode('utf-8')
        self.assertIn('Date,Revenue,Transactions', content)
    
    def test_real_time_metrics_websocket(self):
        """Test real-time metrics updates"""
        from channels.testing import WebsocketCommunicator
        from apps.analytics.consumers import MetricsConsumer
        
        communicator = WebsocketCommunicator(
            MetricsConsumer.as_asgi(),
            f"/ws/analytics/{self.club.id}/"
        )
        
        # Connect to websocket
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        
        # Create new reservation
        ReservationFactory(club=self.club)
        
        # Should receive update
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'metrics.update')
        self.assertIn('occupancy', response['data'])
        
        await communicator.disconnect()
```

### 2. Report Generation API Tests
```python
# backend/tests/integration/analytics/test_reports_api.py
class ReportGenerationAPITest(APITestCase):
    """Test report generation endpoints"""
    
    def test_generate_monthly_report(self):
        """Test monthly report generation"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.post(
            '/api/v1/analytics/reports/generate/',
            {
                'report_type': 'monthly_summary',
                'month': '2023-11',
                'include_charts': True,
                'format': 'pdf'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        
        # Check task created
        task_id = response.data['task_id']
        self.assertIsNotNone(task_id)
        
        # Poll for completion
        for _ in range(10):
            status_response = self.client.get(
                f'/api/v1/analytics/reports/status/{task_id}/'
            )
            
            if status_response.data['status'] == 'completed':
                # Download report
                download_response = self.client.get(
                    status_response.data['download_url']
                )
                self.assertEqual(download_response.status_code, 200)
                self.assertEqual(
                    download_response['Content-Type'],
                    'application/pdf'
                )
                break
            
            time.sleep(1)
    
    def test_custom_report_builder(self):
        """Test custom report creation"""
        self.client.force_authenticate(user=self.admin)
        
        # Create custom report configuration
        response = self.client.post(
            '/api/v1/analytics/reports/custom/',
            {
                'name': 'Weekend Revenue Analysis',
                'metrics': ['revenue', 'occupancy'],
                'filters': {
                    'day_of_week': [5, 6],  # Saturday, Sunday
                    'time_range': '09:00-20:00'
                },
                'grouping': 'hourly',
                'visualization': 'line_chart'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report_id = response.data['id']
        
        # Execute custom report
        exec_response = self.client.post(
            f'/api/v1/analytics/reports/custom/{report_id}/execute/',
            {
                'start_date': '2023-11-01',
                'end_date': '2023-11-30'
            }
        )
        
        self.assertEqual(exec_response.status_code, status.HTTP_200_OK)
        self.assertIn('data', exec_response.data)
        self.assertIn('chart_url', exec_response.data)
```

## 🔄 E2E Flow Tests

### 1. Complete Analytics Dashboard Flow
```python
# backend/tests/e2e/analytics/test_dashboard_flow.py
from django.test import TestCase
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class AnalyticsDashboardE2ETest(TestCase):
    """Test complete analytics dashboard flow"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = webdriver.Chrome()
        cls.wait = WebDriverWait(cls.driver, 10)
    
    def test_complete_dashboard_interaction(self):
        """Test full dashboard user flow"""
        # Login as admin
        self.driver.get(f"{self.live_server_url}/login")
        self.driver.find_element(By.ID, "email").send_keys("admin@test.com")
        self.driver.find_element(By.ID, "password").send_keys("password")
        self.driver.find_element(By.ID, "submit").click()
        
        # Navigate to analytics
        self.driver.get(f"{self.live_server_url}/analytics/dashboard")
        
        # Wait for dashboard to load
        self.wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "revenue-widget"))
        )
        
        # Test date range selector
        date_selector = self.driver.find_element(By.ID, "date-range-select")
        date_selector.click()
        
        # Select last 30 days
        option = self.driver.find_element(
            By.XPATH, 
            "//option[text()='Last 30 Days']"
        )
        option.click()
        
        # Wait for data refresh
        self.wait.until(
            EC.text_to_be_present_in_element(
                (By.CLASS_NAME, "last-updated"),
                "Just now"
            )
        )
        
        # Verify widgets updated
        revenue_widget = self.driver.find_element(By.CLASS_NAME, "revenue-value")
        self.assertNotEqual(revenue_widget.text, "€0.00")
        
        # Test drill-down
        revenue_widget.click()
        
        # Should navigate to detailed revenue view
        self.wait.until(
            EC.url_contains("/analytics/revenue")
        )
        
        # Verify detailed chart loaded
        chart = self.driver.find_element(By.ID, "revenue-chart")
        self.assertTrue(chart.is_displayed())
        
        # Test export functionality
        export_btn = self.driver.find_element(By.ID, "export-data")
        export_btn.click()
        
        # Select PDF format
        pdf_option = self.driver.find_element(
            By.XPATH,
            "//input[@value='pdf']"
        )
        pdf_option.click()
        
        # Generate report
        generate_btn = self.driver.find_element(By.ID, "generate-report")
        generate_btn.click()
        
        # Wait for download
        self.wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "download-ready"))
        )
```

### 2. Predictive Analytics Flow
```python
# backend/tests/e2e/analytics/test_predictive_flow.py
class PredictiveAnalyticsE2ETest(TestCase):
    """Test predictive analytics features"""
    
    def test_revenue_forecasting_flow(self):
        """Test revenue forecasting complete flow"""
        # Setup historical data
        self._create_historical_revenue_data()
        
        self.client.force_authenticate(user=self.admin)
        
        # Request revenue forecast
        response = self.client.post(
            '/api/v1/analytics/predict/revenue/',
            {
                'forecast_period': 90,  # 90 days
                'confidence_level': 0.95,
                'include_seasonality': True,
                'external_factors': {
                    'holidays': ['2023-12-25', '2024-01-01'],
                    'marketing_campaigns': [
                        {
                            'start': '2023-12-15',
                            'end': '2023-12-31',
                            'impact_factor': 1.2
                        }
                    ]
                }
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        forecast = response.data
        self.assertIn('predictions', forecast)
        self.assertIn('confidence_intervals', forecast)
        self.assertIn('model_accuracy', forecast)
        
        # Verify forecast makes sense
        predictions = forecast['predictions']
        self.assertEqual(len(predictions), 90)  # One per day
        
        # Check seasonality detected
        self.assertTrue(forecast['seasonality_detected'])
        self.assertIn('weekly', forecast['seasonality_patterns'])
        
        # Verify confidence intervals
        for pred in predictions:
            self.assertLess(pred['lower_bound'], pred['forecast'])
            self.assertGreater(pred['upper_bound'], pred['forecast'])
    
    def test_churn_prediction_workflow(self):
        """Test user churn prediction workflow"""
        # Create users with various activity patterns
        self._create_user_activity_patterns()
        
        # Run churn prediction
        response = self.client.post(
            '/api/v1/analytics/predict/churn/',
            {
                'include_all_users': False,
                'min_activity_days': 30,
                'prediction_window': 30  # Predict churn in next 30 days
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        results = response.data
        self.assertIn('at_risk_users', results)
        self.assertIn('risk_factors', results)
        self.assertIn('recommended_actions', results)
        
        # Verify risk scoring
        for user in results['at_risk_users']:
            self.assertIn('user_id', user)
            self.assertIn('risk_score', user)
            self.assertIn('risk_factors', user)
            self.assertBetween(user['risk_score'], 0, 1)
        
        # Test intervention tracking
        high_risk_user = results['at_risk_users'][0]
        
        # Create intervention
        intervention_response = self.client.post(
            '/api/v1/analytics/interventions/',
            {
                'user_id': high_risk_user['user_id'],
                'intervention_type': 'retention_offer',
                'details': {
                    'discount_percentage': 20,
                    'valid_days': 30
                }
            }
        )
        
        self.assertEqual(intervention_response.status_code, 201)
        
        # Track intervention effectiveness
        time.sleep(2)  # Simulate time passing
        
        effectiveness_response = self.client.get(
            f'/api/v1/analytics/interventions/{intervention_response.data["id"]}/effectiveness/'
        )
        
        self.assertEqual(effectiveness_response.status_code, 200)
        self.assertIn('user_retained', effectiveness_response.data)
```

### 3. Custom Analytics Workflow
```python
# backend/tests/e2e/analytics/test_custom_analytics.py
class CustomAnalyticsWorkflowE2ETest(TestCase):
    """Test custom analytics creation and execution"""
    
    def test_create_custom_analytics_pipeline(self):
        """Test creating custom analytics pipeline"""
        self.client.force_authenticate(user=self.admin)
        
        # Step 1: Create custom metric
        metric_response = self.client.post(
            '/api/v1/analytics/metrics/custom/',
            {
                'name': 'Revenue per Active User',
                'formula': 'total_revenue / count(distinct active_users)',
                'aggregation': 'daily',
                'filters': {
                    'user_activity': 'last_30_days',
                    'revenue_type': ['reservation', 'class']
                }
            }
        )
        
        self.assertEqual(metric_response.status_code, 201)
        metric_id = metric_response.data['id']
        
        # Step 2: Create visualization
        viz_response = self.client.post(
            '/api/v1/analytics/visualizations/',
            {
                'name': 'ARPU Trend',
                'metric_id': metric_id,
                'chart_type': 'line',
                'options': {
                    'show_trend': True,
                    'show_forecast': True,
                    'comparison_period': 'previous_month'
                }
            }
        )
        
        self.assertEqual(viz_response.status_code, 201)
        viz_id = viz_response.data['id']
        
        # Step 3: Add to dashboard
        dashboard_response = self.client.post(
            '/api/v1/analytics/dashboards/widgets/',
            {
                'visualization_id': viz_id,
                'position': {'x': 0, 'y': 2, 'w': 6, 'h': 4},
                'refresh_interval': 300  # 5 minutes
            }
        )
        
        self.assertEqual(dashboard_response.status_code, 201)
        
        # Step 4: Execute and verify
        exec_response = self.client.get(
            f'/api/v1/analytics/visualizations/{viz_id}/data/'
        )
        
        self.assertEqual(exec_response.status_code, 200)
        
        data = exec_response.data
        self.assertIn('series', data)
        self.assertIn('trend', data)
        self.assertIn('forecast', data)
        self.assertGreater(len(data['series']), 0)
```

## 🔒 Security Tests

### Analytics Security Tests
```python
# backend/tests/security/analytics/test_security.py
class AnalyticsSecurityTest(TestCase):
    """Test analytics security features"""
    
    def test_data_access_isolation(self):
        """Test clubs cannot access each other's analytics"""
        club1 = ClubFactory()
        club2 = ClubFactory()
        
        admin1 = StaffUserFactory(club=club1)
        admin2 = StaffUserFactory(club=club2)
        
        # Create data for club1
        ReservationFactory.create_batch(10, club=club1)
        PaymentFactory.create_batch(5, club=club1)
        
        # Admin2 tries to access club1 analytics
        self.client.force_authenticate(user=admin2)
        
        response = self.client.get(
            f'/api/v1/analytics/dashboard/?club_id={club1.id}'
        )
        
        # Should be forbidden
        self.assertEqual(response.status_code, 403)
        
        # Verify no data leakage in response
        self.assertNotIn(str(club1.id), str(response.data))
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention in custom queries"""
        self.client.force_authenticate(user=self.admin)
        
        malicious_inputs = [
            "'; DROP TABLE payments; --",
            "1 OR 1=1",
            "' UNION SELECT * FROM users --"
        ]
        
        for payload in malicious_inputs:
            response = self.client.post(
                '/api/v1/analytics/custom-query/',
                {
                    'metric': 'revenue',
                    'filter': payload
                }
            )
            
            # Should handle safely
            self.assertIn(response.status_code, [400, 200])
            
            # Verify tables still exist
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'payments'"
                )
                self.assertEqual(cursor.fetchone()[0], 1)
    
    def test_export_data_sanitization(self):
        """Test exported data is sanitized"""
        # Create reservation with XSS attempt
        ReservationFactory(
            club=self.club,
            notes='<script>alert("XSS")</script>'
        )
        
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(
            '/api/v1/analytics/export/?format=csv&include_notes=true'
        )
        
        content = response.content.decode('utf-8')
        
        # Script tags should be escaped
        self.assertNotIn('<script>', content)
        self.assertIn('&lt;script&gt;', content)
```

## 📊 Performance Tests

### Analytics Performance Tests
```python
# backend/tests/performance/analytics/test_performance.py
class AnalyticsPerformanceTest(TestCase):
    """Test analytics performance with large datasets"""
    
    def test_dashboard_load_time_large_dataset(self):
        """Test dashboard performance with large dataset"""
        # Create large dataset
        club = ClubFactory()
        
        # 10,000 reservations over 1 year
        reservations = []
        for i in range(10000):
            reservations.append(
                Reservation(
                    club=club,
                    court=CourtFactory(club=club),
                    user=UserFactory(),
                    date=datetime.now().date() - timedelta(days=i % 365),
                    start_time=f"{9 + (i % 12)}:00",
                    status='completed'
                )
            )
        Reservation.objects.bulk_create(reservations, batch_size=1000)
        
        # 5,000 payments
        payments = []
        for i in range(5000):
            payments.append(
                Payment(
                    club=club,
                    user=UserFactory(),
                    amount=Decimal('30.00') + (i % 50),
                    created_at=datetime.now() - timedelta(days=i % 365)
                )
            )
        Payment.objects.bulk_create(payments, batch_size=1000)
        
        # Measure dashboard load time
        admin = StaffUserFactory(club=club)
        self.client.force_authenticate(user=admin)
        
        start = time.time()
        response = self.client.get('/api/v1/analytics/dashboard/')
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 2.0)  # Should load within 2 seconds
        
        # Verify all widgets loaded
        data = response.data
        self.assertIsNotNone(data['revenue'])
        self.assertIsNotNone(data['occupancy'])
        self.assertIsNotNone(data['users'])
    
    def test_aggregation_query_optimization(self):
        """Test aggregation queries are optimized"""
        # Create test data
        self._create_large_dataset()
        
        # Test with query logging
        from django.db import connection
        from django.test.utils import override_settings
        
        with override_settings(DEBUG=True):
            queries_before = len(connection.queries)
            
            # Execute complex aggregation
            metrics = RevenueMetrics(club=self.club)
            result = metrics.calculate_monthly_breakdown(
                start_date=datetime(2023, 1, 1),
                end_date=datetime(2023, 12, 31)
            )
            
            queries_after = len(connection.queries)
            query_count = queries_after - queries_before
            
            # Should use efficient queries
            self.assertLess(query_count, 5)  # Maximum 5 queries
            
            # Check for N+1 queries
            for query in connection.queries[queries_before:]:
                self.assertNotIn('SELECT', query['sql'].upper().split('FROM')[0].count('SELECT'))
    
    def test_real_time_updates_performance(self):
        """Test real-time analytics update performance"""
        from channels.testing import WebsocketCommunicator
        from apps.analytics.consumers import MetricsConsumer
        
        # Connect multiple clients
        communicators = []
        for i in range(50):  # 50 concurrent connections
            communicator = WebsocketCommunicator(
                MetricsConsumer.as_asgi(),
                f"/ws/analytics/{self.club.id}/"
            )
            communicators.append(communicator)
        
        # Connect all
        for comm in communicators:
            connected, _ = await comm.connect()
            self.assertTrue(connected)
        
        # Trigger update
        start = time.time()
        ReservationFactory(club=self.club)
        
        # All clients should receive update quickly
        for comm in communicators:
            response = await comm.receive_json_from(timeout=1)
            self.assertEqual(response['type'], 'metrics.update')
        
        duration = time.time() - start
        self.assertLess(duration, 2.0)  # All updates within 2 seconds
        
        # Cleanup
        for comm in communicators:
            await comm.disconnect()
```

## 🎯 Test Execution Commands

### Run All Analytics Tests
```bash
# Unit tests only
pytest tests/unit/analytics/ -v

# Integration tests
pytest tests/integration/analytics/ -v

# E2E tests
pytest tests/e2e/analytics/ -v

# All analytics tests
pytest tests/ -k analytics -v

# With coverage
pytest tests/ -k analytics --cov=apps.analytics --cov-report=html
```

### Run Specific Test Categories
```bash
# Metrics calculation tests
pytest tests/ -k "metrics" -v

# Report generation tests
pytest tests/ -k "report" -v

# Predictive analytics tests
pytest tests/ -k "predict" -v

# Performance tests
pytest tests/performance/analytics/ -v
```

---

**Siguiente**: [Search and Filters Tests](15-Search-Filters-Tests.md) →