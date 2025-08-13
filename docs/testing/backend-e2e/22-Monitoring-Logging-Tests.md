# 📊 Monitoring and Logging Tests

## 📋 Resumen

Esta guía detalla los tests para sistemas de monitoreo y logging, incluyendo métricas de aplicación, alertas, trazabilidad y análisis de logs.

## 🎯 Objetivos de Testing

### Cobertura de Monitoreo
- **Metrics Collection**: 95% - Todas las métricas críticas
- **Log Aggregation**: 90% - Logs centralizados
- **Alert Rules**: 100% - Alertas configuradas
- **Tracing**: 85% - Trazabilidad distribuida
- **Dashboard Coverage**: 90% - Visualización completa
- **Error Tracking**: 100% - Captura de errores
- **Performance Monitoring**: 95% - Métricas de rendimiento

### Componentes a Cubrir
- ✅ Application Metrics (Prometheus)
- ✅ Log Management (ELK Stack)
- ✅ Error Tracking (Sentry)
- ✅ APM (Application Performance Monitoring)
- ✅ Custom Business Metrics
- ✅ Alert Configuration
- ✅ Dashboard Visualization
- ✅ Distributed Tracing

## 🧪 Unit Tests

### 1. Metrics Collection Tests
```python
# backend/tests/unit/monitoring/test_metrics_collection.py
from django.test import TestCase
from unittest.mock import Mock, patch
from apps.monitoring.metrics import MetricsCollector, MetricTypes
from prometheus_client import Counter, Histogram, Gauge

class MetricsCollectorTest(TestCase):
    """Test metrics collection functionality"""
    
    def setUp(self):
        self.collector = MetricsCollector()
        
    def test_counter_metrics(self):
        """Test counter metric collection"""
        # Create counter
        request_counter = self.collector.create_counter(
            name='http_requests_total',
            description='Total HTTP requests',
            labels=['method', 'endpoint', 'status']
        )
        
        # Increment counter
        request_counter.labels(
            method='GET',
            endpoint='/api/v1/clubs/',
            status='200'
        ).inc()
        
        # Verify value
        value = self.collector.get_metric_value(
            'http_requests_total',
            labels={
                'method': 'GET',
                'endpoint': '/api/v1/clubs/',
                'status': '200'
            }
        )
        
        self.assertEqual(value, 1.0)
        
    def test_histogram_metrics(self):
        """Test histogram metric collection"""
        # Create histogram
        response_time = self.collector.create_histogram(
            name='http_response_time_seconds',
            description='HTTP response time',
            labels=['method', 'endpoint'],
            buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
        )
        
        # Record observations
        observations = [0.15, 0.23, 0.45, 0.12, 0.89, 1.2, 0.34]
        
        for obs in observations:
            response_time.labels(
                method='GET',
                endpoint='/api/v1/clubs/'
            ).observe(obs)
            
        # Get statistics
        stats = self.collector.get_histogram_stats(
            'http_response_time_seconds',
            labels={'method': 'GET', 'endpoint': '/api/v1/clubs/'}
        )
        
        self.assertEqual(stats['count'], 7)
        self.assertAlmostEqual(stats['sum'], sum(observations), places=2)
        self.assertIn('buckets', stats)
        
    def test_gauge_metrics(self):
        """Test gauge metric collection"""
        # Create gauge
        active_connections = self.collector.create_gauge(
            name='active_connections',
            description='Number of active connections',
            labels=['service']
        )
        
        # Set gauge value
        active_connections.labels(service='websocket').set(42)
        
        # Update gauge
        active_connections.labels(service='websocket').inc(5)
        active_connections.labels(service='websocket').dec(2)
        
        # Verify final value
        value = self.collector.get_metric_value(
            'active_connections',
            labels={'service': 'websocket'}
        )
        
        self.assertEqual(value, 45.0)

class BusinessMetricsTest(TestCase):
    """Test business metrics collection"""
    
    def setUp(self):
        self.metrics = BusinessMetricsCollector()
        
    def test_revenue_metrics(self):
        """Test revenue metric tracking"""
        # Record revenue
        self.metrics.record_revenue(
            amount=50.00,
            currency='EUR',
            type='reservation',
            club_id=1
        )
        
        self.metrics.record_revenue(
            amount=30.00,
            currency='EUR',
            type='class',
            club_id=1
        )
        
        # Get revenue metrics
        revenue_stats = self.metrics.get_revenue_stats(
            club_id=1,
            period='today'
        )
        
        self.assertEqual(revenue_stats['total'], 80.00)
        self.assertEqual(revenue_stats['by_type']['reservation'], 50.00)
        self.assertEqual(revenue_stats['by_type']['class'], 30.00)
        
    def test_occupancy_metrics(self):
        """Test occupancy metric tracking"""
        # Record court usage
        for hour in range(9, 19):  # 9 AM to 7 PM
            occupied = hour in [10, 11, 14, 15, 16, 18]
            self.metrics.record_court_occupancy(
                court_id=1,
                hour=hour,
                occupied=occupied
            )
            
        # Calculate occupancy rate
        occupancy = self.metrics.calculate_occupancy_rate(
            court_id=1,
            date='2023-12-15'
        )
        
        self.assertEqual(occupancy['total_hours'], 10)
        self.assertEqual(occupancy['occupied_hours'], 6)
        self.assertEqual(occupancy['rate'], 0.6)
        
    def test_user_activity_metrics(self):
        """Test user activity tracking"""
        # Record user activities
        activities = [
            ('login', 1),
            ('view_clubs', 1),
            ('create_reservation', 1),
            ('login', 2),
            ('view_clubs', 2),
            ('cancel_reservation', 2)
        ]
        
        for activity, user_id in activities:
            self.metrics.record_user_activity(
                user_id=user_id,
                activity=activity
            )
            
        # Get activity stats
        stats = self.metrics.get_activity_stats(period='today')
        
        self.assertEqual(stats['unique_users'], 2)
        self.assertEqual(stats['total_activities'], 6)
        self.assertEqual(stats['by_type']['login'], 2)
        self.assertEqual(stats['by_type']['create_reservation'], 1)
```

### 2. Logging System Tests
```python
# backend/tests/unit/monitoring/test_logging.py
import logging
import json
from django.test import TestCase
from apps.monitoring.logging import StructuredLogger, LogProcessor, LogAnalyzer

class StructuredLoggingTest(TestCase):
    """Test structured logging functionality"""
    
    def setUp(self):
        self.logger = StructuredLogger('test_logger')
        
    def test_structured_log_format(self):
        """Test structured log formatting"""
        # Log with context
        self.logger.info(
            "User logged in",
            extra={
                'user_id': 123,
                'ip_address': '192.168.1.1',
                'user_agent': 'Mozilla/5.0',
                'session_id': 'abc123'
            }
        )
        
        # Get last log entry
        log_entry = self.logger.get_last_entry()
        
        # Verify structure
        self.assertIn('timestamp', log_entry)
        self.assertIn('level', log_entry)
        self.assertIn('message', log_entry)
        self.assertIn('context', log_entry)
        
        # Verify context
        context = log_entry['context']
        self.assertEqual(context['user_id'], 123)
        self.assertEqual(context['ip_address'], '192.168.1.1')
        
    def test_error_logging_with_traceback(self):
        """Test error logging with exception details"""
        try:
            # Cause an error
            1 / 0
        except ZeroDivisionError as e:
            self.logger.error(
                "Division by zero error",
                exc_info=True,
                extra={
                    'operation': 'calculate_rate',
                    'input_values': {'numerator': 1, 'denominator': 0}
                }
            )
            
        log_entry = self.logger.get_last_entry()
        
        self.assertEqual(log_entry['level'], 'ERROR')
        self.assertIn('traceback', log_entry)
        self.assertIn('ZeroDivisionError', log_entry['traceback'])
        self.assertEqual(
            log_entry['context']['operation'],
            'calculate_rate'
        )
        
    def test_log_sanitization(self):
        """Test sensitive data sanitization in logs"""
        # Log with sensitive data
        self.logger.info(
            "Payment processed",
            extra={
                'user_id': 123,
                'amount': 50.00,
                'card_number': '4111111111111111',
                'cvv': '123',
                'password': 'secret123',
                'api_key': 'sk_live_abcd1234'
            }
        )
        
        log_entry = self.logger.get_last_entry()
        context = log_entry['context']
        
        # Sensitive data should be masked
        self.assertEqual(context['card_number'], '411111******1111')
        self.assertEqual(context['cvv'], '***')
        self.assertEqual(context['password'], '********')
        self.assertEqual(context['api_key'], 'sk_live_****')
        
        # Non-sensitive data should remain
        self.assertEqual(context['user_id'], 123)
        self.assertEqual(context['amount'], 50.00)

class LogProcessorTest(TestCase):
    """Test log processing and analysis"""
    
    def setUp(self):
        self.processor = LogProcessor()
        
    def test_log_parsing(self):
        """Test log parsing from different formats"""
        # JSON log
        json_log = '{"timestamp": "2023-12-15T10:30:00Z", "level": "INFO", "message": "Test"}'
        parsed = self.processor.parse_log(json_log)
        
        self.assertEqual(parsed['level'], 'INFO')
        self.assertEqual(parsed['message'], 'Test')
        
        # Apache-style log
        apache_log = '192.168.1.1 - - [15/Dec/2023:10:30:00 +0000] "GET /api/v1/clubs/ HTTP/1.1" 200 1234'
        parsed = self.processor.parse_log(apache_log, format='apache')
        
        self.assertEqual(parsed['ip'], '192.168.1.1')
        self.assertEqual(parsed['method'], 'GET')
        self.assertEqual(parsed['status'], 200)
        
    def test_log_aggregation(self):
        """Test log aggregation by patterns"""
        logs = [
            {'level': 'ERROR', 'message': 'Database connection failed', 'timestamp': '2023-12-15T10:00:00Z'},
            {'level': 'ERROR', 'message': 'Database connection failed', 'timestamp': '2023-12-15T10:01:00Z'},
            {'level': 'WARNING', 'message': 'Slow query detected', 'timestamp': '2023-12-15T10:02:00Z'},
            {'level': 'ERROR', 'message': 'Payment gateway timeout', 'timestamp': '2023-12-15T10:03:00Z'},
        ]
        
        aggregated = self.processor.aggregate_logs(
            logs,
            group_by='message',
            time_window='5m'
        )
        
        self.assertEqual(aggregated['Database connection failed']['count'], 2)
        self.assertEqual(aggregated['Slow query detected']['count'], 1)
        
    def test_anomaly_detection(self):
        """Test log anomaly detection"""
        # Normal pattern
        normal_logs = [
            {'level': 'INFO', 'response_time': 0.1} for _ in range(100)
        ]
        
        # Add anomalies
        anomaly_logs = [
            {'level': 'INFO', 'response_time': 5.0},  # Slow response
            {'level': 'ERROR', 'response_time': 0.1},  # Error
            {'level': 'INFO', 'response_time': 10.0},  # Very slow
        ]
        
        all_logs = normal_logs + anomaly_logs
        
        anomalies = self.processor.detect_anomalies(
            all_logs,
            metrics=['response_time', 'error_rate']
        )
        
        self.assertGreater(len(anomalies), 0)
        self.assertTrue(
            any(a['type'] == 'high_response_time' for a in anomalies)
        )
```

### 3. Alert Configuration Tests
```python
# backend/tests/unit/monitoring/test_alerts.py
from django.test import TestCase
from apps.monitoring.alerts import AlertManager, AlertRule, AlertChannel

class AlertConfigurationTest(TestCase):
    """Test alert configuration and triggering"""
    
    def setUp(self):
        self.alert_manager = AlertManager()
        
    def test_alert_rule_creation(self):
        """Test creating alert rules"""
        # Create error rate alert
        rule = self.alert_manager.create_rule(
            name='high_error_rate',
            condition='error_rate > 0.05',
            duration='5m',
            severity='critical',
            labels={'team': 'backend', 'service': 'api'}
        )
        
        self.assertEqual(rule.name, 'high_error_rate')
        self.assertEqual(rule.severity, 'critical')
        
        # Create response time alert
        rule2 = self.alert_manager.create_rule(
            name='slow_response',
            condition='p95_response_time > 1.0',
            duration='3m',
            severity='warning'
        )
        
        self.assertEqual(rule2.severity, 'warning')
        
    def test_alert_evaluation(self):
        """Test alert rule evaluation"""
        # Create rule
        rule = AlertRule(
            name='high_cpu',
            condition='cpu_usage > 80',
            duration='2m'
        )
        
        # Test with metrics below threshold
        metrics = {'cpu_usage': 75}
        should_alert = rule.evaluate(metrics)
        self.assertFalse(should_alert)
        
        # Test with metrics above threshold
        metrics = {'cpu_usage': 85}
        should_alert = rule.evaluate(metrics)
        self.assertTrue(should_alert)
        
    def test_alert_notification_channels(self):
        """Test alert notification channels"""
        # Configure channels
        email_channel = AlertChannel(
            type='email',
            config={
                'recipients': ['alerts@padelyzer.com'],
                'template': 'alert_email.html'
            }
        )
        
        slack_channel = AlertChannel(
            type='slack',
            config={
                'webhook_url': 'https://hooks.slack.com/...',
                'channel': '#alerts'
            }
        )
        
        # Add channels to manager
        self.alert_manager.add_channel('email', email_channel)
        self.alert_manager.add_channel('slack', slack_channel)
        
        # Test notification routing
        alert = {
            'name': 'high_error_rate',
            'severity': 'critical',
            'value': 0.08,
            'labels': {'service': 'api'}
        }
        
        with patch.object(email_channel, 'send') as mock_email:
            with patch.object(slack_channel, 'send') as mock_slack:
                self.alert_manager.send_alert(alert, channels=['email', 'slack'])
                
                mock_email.assert_called_once()
                mock_slack.assert_called_once()

class AlertThrottlingTest(TestCase):
    """Test alert throttling and deduplication"""
    
    def test_alert_throttling(self):
        """Test alert throttling to prevent spam"""
        throttler = AlertThrottler(
            max_alerts_per_hour=10,
            dedup_window='5m'
        )
        
        # Send same alert multiple times
        alert = {'name': 'high_error_rate', 'severity': 'warning'}
        
        results = []
        for i in range(15):
            result = throttler.should_send(alert)
            results.append(result)
            
        # First should be sent
        self.assertTrue(results[0])
        
        # Some should be throttled
        sent_count = sum(results)
        self.assertLess(sent_count, 15)
        self.assertLessEqual(sent_count, 10)
        
    def test_alert_deduplication(self):
        """Test alert deduplication"""
        deduplicator = AlertDeduplicator(window='5m')
        
        # Same alert
        alert1 = {
            'name': 'database_down',
            'labels': {'db': 'primary'},
            'timestamp': '2023-12-15T10:00:00Z'
        }
        
        alert2 = {
            'name': 'database_down',
            'labels': {'db': 'primary'},
            'timestamp': '2023-12-15T10:02:00Z'
        }
        
        # Different alert
        alert3 = {
            'name': 'database_down',
            'labels': {'db': 'replica'},
            'timestamp': '2023-12-15T10:01:00Z'
        }
        
        self.assertTrue(deduplicator.is_new(alert1))
        self.assertFalse(deduplicator.is_new(alert2))  # Duplicate
        self.assertTrue(deduplicator.is_new(alert3))   # Different db
```

## 🔌 Integration Tests

### 1. Monitoring Stack Integration
```python
# backend/tests/integration/monitoring/test_monitoring_stack.py
from rest_framework.test import APITestCase
import requests
from prometheus_client.parser import text_string_to_metric_families

class MonitoringStackIntegrationTest(APITestCase):
    """Test monitoring stack integration"""
    
    def test_prometheus_metrics_endpoint(self):
        """Test Prometheus metrics endpoint"""
        response = self.client.get('/metrics')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/plain; version=0.0.4')
        
        # Parse metrics
        metrics = {}
        for family in text_string_to_metric_families(response.content.decode()):
            metrics[family.name] = family
            
        # Verify standard metrics exist
        self.assertIn('http_requests_total', metrics)
        self.assertIn('http_request_duration_seconds', metrics)
        self.assertIn('python_gc_objects_collected_total', metrics)
        
        # Verify custom business metrics
        self.assertIn('reservations_created_total', metrics)
        self.assertIn('revenue_total', metrics)
        self.assertIn('active_users_gauge', metrics)
        
    def test_grafana_dashboard_queries(self):
        """Test Grafana dashboard queries work"""
        # Mock Prometheus query API
        queries = [
            'rate(http_requests_total[5m])',
            'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
            'sum(revenue_total) by (type)',
            'avg(court_occupancy_rate) by (club_id)'
        ]
        
        prometheus_url = 'http://localhost:9090'
        
        for query in queries:
            response = requests.get(
                f'{prometheus_url}/api/v1/query',
                params={'query': query}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.assertEqual(data['status'], 'success')
                self.assertIn('data', data)
                
    def test_elasticsearch_log_indexing(self):
        """Test logs are properly indexed in Elasticsearch"""
        from elasticsearch import Elasticsearch
        
        es = Elasticsearch(['localhost:9200'])
        
        # Generate some logs
        self.logger.info("Test log entry", extra={'user_id': 123})
        self.logger.error("Test error", extra={'error_code': 'E001'})
        
        # Wait for indexing
        import time
        time.sleep(2)
        
        # Search logs
        result = es.search(
            index='logs-*',
            body={
                'query': {
                    'match': {
                        'message': 'Test log entry'
                    }
                }
            }
        )
        
        self.assertGreater(result['hits']['total']['value'], 0)
        
        # Test aggregation
        agg_result = es.search(
            index='logs-*',
            body={
                'aggs': {
                    'levels': {
                        'terms': {
                            'field': 'level.keyword'
                        }
                    }
                }
            }
        )
        
        buckets = agg_result['aggregations']['levels']['buckets']
        levels = [b['key'] for b in buckets]
        self.assertIn('INFO', levels)
        self.assertIn('ERROR', levels)
```

### 2. Error Tracking Integration
```python
# backend/tests/integration/monitoring/test_error_tracking.py
class ErrorTrackingIntegrationTest(APITestCase):
    """Test error tracking integration"""
    
    def test_sentry_error_capture(self):
        """Test Sentry captures errors correctly"""
        import sentry_sdk
        
        # Capture test error
        try:
            raise ValueError("Test error for Sentry")
        except ValueError:
            event_id = sentry_sdk.capture_exception()
            
        self.assertIsNotNone(event_id)
        
        # Verify error in Sentry (mock in tests)
        with patch('sentry_sdk.Hub.current.client') as mock_client:
            # Verify error attributes
            self.assertTrue(mock_client.transport.capture_event.called)
            
    def test_error_context_enrichment(self):
        """Test error context is properly enriched"""
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        # Make request that causes error
        with patch('apps.clubs.views.ClubViewSet.list') as mock_view:
            mock_view.side_effect = Exception("Database error")
            
            response = self.client.get('/api/v1/clubs/')
            
        self.assertEqual(response.status_code, 500)
        
        # Check Sentry context (in real scenario)
        # In tests, we mock this
        with patch('sentry_sdk.set_context') as mock_context:
            # Verify user context
            mock_context.assert_any_call('user', {
                'id': user.id,
                'email': user.email
            })
            
            # Verify request context
            mock_context.assert_any_call('request', {
                'url': '/api/v1/clubs/',
                'method': 'GET'
            })
            
    def test_error_grouping_rules(self):
        """Test errors are grouped correctly"""
        # Similar errors should be grouped
        errors = [
            DatabaseError("Connection timeout to db1.example.com"),
            DatabaseError("Connection timeout to db2.example.com"),
            DatabaseError("Connection timeout to db3.example.com"),
        ]
        
        grouping_rules = ErrorGroupingRules()
        
        groups = set()
        for error in errors:
            group = grouping_rules.get_group_hash(error)
            groups.add(group)
            
        # Should be grouped as same error
        self.assertEqual(len(groups), 1)
```

## 🔄 E2E Flow Tests

### 1. Complete Monitoring Flow
```python
# backend/tests/e2e/monitoring/test_monitoring_flow.py
class MonitoringFlowE2ETest(TestCase):
    """Test complete monitoring flow"""
    
    def test_request_tracking_flow(self):
        """Test request tracking through monitoring stack"""
        # Make request with trace ID
        trace_id = 'test-trace-123'
        
        response = self.client.get(
            '/api/v1/clubs/',
            HTTP_X_TRACE_ID=trace_id
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify metrics recorded
        metrics = self._get_prometheus_metrics()
        
        request_metric = metrics.get('http_requests_total')
        self.assertIsNotNone(request_metric)
        
        # Verify log created with trace ID
        logs = self._search_elasticsearch_logs(trace_id)
        self.assertGreater(len(logs), 0)
        
        log_entry = logs[0]
        self.assertEqual(log_entry['trace_id'], trace_id)
        self.assertEqual(log_entry['endpoint'], '/api/v1/clubs/')
        
        # Verify trace in APM
        trace = self._get_apm_trace(trace_id)
        self.assertIsNotNone(trace)
        self.assertIn('database_query', trace['spans'])
        
    def test_error_tracking_flow(self):
        """Test error tracking through monitoring stack"""
        # Cause an error
        with patch('apps.payments.services.StripeService.charge') as mock_charge:
            mock_charge.side_effect = Exception("Payment gateway error")
            
            response = self.client.post(
                '/api/v1/payments/',
                {'amount': 50.00}
            )
            
        self.assertEqual(response.status_code, 500)
        
        # Check error in logs
        error_logs = self._search_elasticsearch_logs(
            query='level:ERROR AND message:"Payment gateway error"'
        )
        self.assertGreater(len(error_logs), 0)
        
        # Check error in Sentry
        sentry_events = self._get_sentry_events(
            query='message:"Payment gateway error"'
        )
        self.assertGreater(len(sentry_events), 0)
        
        # Check alert triggered
        alerts = self._get_triggered_alerts()
        payment_alerts = [
            a for a in alerts 
            if a['name'] == 'payment_errors_high'
        ]
        self.assertGreater(len(payment_alerts), 0)
```

### 2. Performance Monitoring Flow
```python
# backend/tests/e2e/monitoring/test_performance_monitoring.py
class PerformanceMonitoringE2ETest(TestCase):
    """Test performance monitoring flow"""
    
    def test_slow_request_detection(self):
        """Test slow request detection and alerting"""
        # Create slow endpoint
        with patch('time.sleep') as mock_sleep:
            # Simulate 3 second delay
            mock_sleep.return_value = None
            
            response = self.client.get('/api/v1/slow-endpoint/')
            
        # Check response time metric
        metrics = self._get_prometheus_metrics()
        
        response_time = metrics.get(
            'http_request_duration_seconds',
            labels={'endpoint': '/api/v1/slow-endpoint/'}
        )
        
        self.assertGreater(response_time, 3.0)
        
        # Check slow query log
        slow_logs = self._search_elasticsearch_logs(
            query='tags:slow_request AND duration:>3000'
        )
        self.assertGreater(len(slow_logs), 0)
        
        # Check APM trace
        traces = self._get_apm_traces(
            query='duration:>3000ms'
        )
        self.assertGreater(len(traces), 0)
        
        # Verify alert triggered
        alerts = self._get_triggered_alerts()
        slow_alerts = [
            a for a in alerts
            if a['name'] == 'slow_response_time'
        ]
        self.assertGreater(len(slow_alerts), 0)
        
    def test_resource_usage_monitoring(self):
        """Test resource usage monitoring"""
        # Generate high CPU load
        import multiprocessing
        
        def cpu_intensive_task():
            for _ in range(10000000):
                _ = 2 ** 100
                
        process = multiprocessing.Process(target=cpu_intensive_task)
        process.start()
        process.join(timeout=5)
        
        # Check CPU metric
        metrics = self._get_prometheus_metrics()
        cpu_usage = metrics.get('process_cpu_seconds_total')
        
        self.assertIsNotNone(cpu_usage)
        
        # Check memory usage
        memory_usage = metrics.get('process_resident_memory_bytes')
        self.assertGreater(memory_usage, 0)
        
        # Check if resource alert triggered
        if cpu_usage > 0.8:  # 80% threshold
            alerts = self._get_triggered_alerts()
            cpu_alerts = [
                a for a in alerts
                if a['name'] == 'high_cpu_usage'
            ]
            self.assertGreater(len(cpu_alerts), 0)
```

### 3. Dashboard Verification
```python
# backend/tests/e2e/monitoring/test_dashboards.py
class DashboardVerificationE2ETest(TestCase):
    """Test monitoring dashboards"""
    
    def test_grafana_dashboards_load(self):
        """Test Grafana dashboards load correctly"""
        grafana_url = 'http://localhost:3000'
        
        dashboards = [
            'api-overview',
            'business-metrics',
            'infrastructure',
            'error-analysis'
        ]
        
        for dashboard_slug in dashboards:
            response = requests.get(
                f'{grafana_url}/d/{dashboard_slug}',
                auth=('admin', 'admin')
            )
            
            self.assertEqual(response.status_code, 200)
            
            # Verify panels load
            self.assertIn('panels', response.text)
            
    def test_dashboard_data_accuracy(self):
        """Test dashboard data accuracy"""
        # Generate known data
        for i in range(10):
            self.client.get('/api/v1/clubs/')
            
        PaymentFactory.create_batch(
            5,
            amount=50.00,
            status='completed'
        )
        
        # Wait for metrics aggregation
        time.sleep(5)
        
        # Query dashboard API
        response = requests.post(
            'http://localhost:3000/api/ds/query',
            json={
                'queries': [{
                    'datasourceId': 1,
                    'expr': 'sum(http_requests_total)',
                    'refId': 'A'
                }]
            },
            auth=('admin', 'admin')
        )
        
        data = response.json()
        
        # Verify request count
        request_count = data['results']['A']['frames'][0]['data']['values'][1][-1]
        self.assertGreaterEqual(request_count, 10)
```

## 🔒 Security Monitoring Tests

### Security Event Monitoring
```python
# backend/tests/integration/monitoring/test_security_monitoring.py
class SecurityMonitoringTest(TestCase):
    """Test security event monitoring"""
    
    def test_failed_login_monitoring(self):
        """Test failed login attempts are monitored"""
        # Generate failed login attempts
        for i in range(5):
            self.client.post(
                '/api/v1/auth/login/',
                {
                    'email': 'attacker@test.com',
                    'password': f'wrong{i}'
                }
            )
            
        # Check security metrics
        metrics = self._get_prometheus_metrics()
        
        failed_logins = metrics.get(
            'authentication_failures_total',
            labels={'reason': 'invalid_credentials'}
        )
        
        self.assertGreaterEqual(failed_logins, 5)
        
        # Check security logs
        security_logs = self._search_elasticsearch_logs(
            query='tags:security AND event:failed_login'
        )
        
        self.assertGreaterEqual(len(security_logs), 5)
        
        # Verify security alert
        alerts = self._get_triggered_alerts()
        security_alerts = [
            a for a in alerts
            if a['name'] == 'brute_force_attempt'
        ]
        
        self.assertGreater(len(security_alerts), 0)
        
    def test_suspicious_activity_detection(self):
        """Test suspicious activity detection"""
        # Simulate suspicious patterns
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        # Rapid API calls
        for _ in range(100):
            self.client.get('/api/v1/users/')
            
        # Check rate limit metrics
        metrics = self._get_prometheus_metrics()
        
        rate_limited = metrics.get(
            'rate_limit_exceeded_total',
            labels={'user_id': str(user.id)}
        )
        
        self.assertGreater(rate_limited, 0)
        
        # Check anomaly detection
        anomalies = self._get_anomaly_alerts()
        
        user_anomalies = [
            a for a in anomalies
            if a['user_id'] == user.id
        ]
        
        self.assertGreater(len(user_anomalies), 0)
```

## 📊 Performance Impact Tests

### Monitoring Overhead Tests
```python
# backend/tests/performance/monitoring/test_monitoring_overhead.py
class MonitoringOverheadTest(TestCase):
    """Test monitoring system overhead"""
    
    def test_metrics_collection_overhead(self):
        """Test metrics collection performance impact"""
        import time
        
        # Baseline without metrics
        with patch('apps.monitoring.metrics.MetricsCollector.record'):
            start = time.time()
            for _ in range(1000):
                self.client.get('/api/v1/health/')
            baseline_duration = time.time() - start
            
        # With metrics collection
        start = time.time()
        for _ in range(1000):
            self.client.get('/api/v1/health/')
        metrics_duration = time.time() - start
        
        # Calculate overhead
        overhead = (metrics_duration - baseline_duration) / baseline_duration
        
        # Should be less than 5% overhead
        self.assertLess(
            overhead,
            0.05,
            f"Metrics overhead too high: {overhead * 100:.1f}%"
        )
        
    def test_logging_performance_impact(self):
        """Test logging performance impact"""
        # Test with different log levels
        log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR']
        
        for level in log_levels:
            with self.settings(LOG_LEVEL=level):
                start = time.time()
                
                for _ in range(100):
                    self.logger.debug("Debug message")
                    self.logger.info("Info message")
                    self.logger.warning("Warning message")
                    self.logger.error("Error message")
                    
                duration = time.time() - start
                
                # Should complete quickly
                self.assertLess(
                    duration,
                    1.0,  # 100 iterations in < 1 second
                    f"Logging too slow at {level} level"
                )
```

## 🎯 Test Execution Commands

### Run All Monitoring Tests
```bash
# Unit tests
pytest tests/unit/monitoring/ -v

# Integration tests
pytest tests/integration/monitoring/ -v

# E2E tests
pytest tests/e2e/monitoring/ -v

# All monitoring tests
pytest tests/ -k monitoring -v

# With coverage
pytest tests/ -k monitoring --cov=apps.monitoring --cov-report=html
```

### Monitoring Verification Commands
```bash
# Check metrics endpoint
curl http://localhost:8000/metrics

# Verify Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Test alert rules
promtool check rules /etc/prometheus/rules/*.yml

# Verify Grafana dashboards
python manage.py check_dashboards
```

### Log Analysis Commands
```bash
# Search recent errors
python manage.py search_logs --level=ERROR --last=1h

# Analyze log patterns
python manage.py analyze_logs --pattern="database.*timeout"

# Export logs for analysis
python manage.py export_logs --format=json --output=logs.json
```

---

**Siguiente**: [Error Recovery Tests](23-Error-Recovery-Tests.md) →