"""
Performance KPI tracking and monitoring.
Tracks key performance indicators and generates reports.
"""

import time
import json
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import redis
from django.conf import settings
from django.core.cache import cache
from django.db import connection
import psutil
import logging

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Single performance measurement."""
    timestamp: datetime
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None
    
    def to_dict(self):
        """Convert to dictionary for storage."""
        data = asdict(self)
        data['timestamp'] = data['timestamp'].isoformat()
        return data


class PerformanceKPIs:
    """
    Performance KPI definitions and tracking.
    """
    
    # Target KPIs (in milliseconds where applicable)
    TARGETS = {
        # Response times (ms)
        'api_response_time_p50': 100,
        'api_response_time_p95': 200,
        'api_response_time_p99': 500,
        'page_load_time_p95': 2000,
        'database_query_time_p95': 50,
        
        # Throughput
        'requests_per_second': 200,
        'concurrent_users': 1000,
        
        # Error rates (as decimal)
        'error_rate': 0.001,  # 0.1%
        'timeout_rate': 0.001,
        
        # Resource utilization
        'cpu_usage_percent': 80,
        'memory_usage_percent': 85,
        'database_connection_pool_usage': 80,
        
        # Cache performance
        'cache_hit_rate': 0.8,  # 80%
        'redis_response_time_p95': 10,
        
        # Business metrics
        'booking_success_rate': 0.95,  # 95%
        'payment_success_rate': 0.98,  # 98%
        'average_booking_time': 30000,  # 30 seconds
    }
    
    def __init__(self, redis_client=None):
        """Initialize KPI tracker."""
        self.redis_client = redis_client or self._get_redis_client()
        self.metrics_buffer = []
        self.buffer_size = 100
    
    def _get_redis_client(self):
        """Get Redis client for metrics storage."""
        try:
            return redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_METRICS_DB,
                decode_responses=True
            )
        except:
            logger.warning("Redis not available, using in-memory storage")
            return None
    
    def track_metric(self, metric_name: str, value: float, unit: str = 'ms', 
                    tags: Dict[str, str] = None):
        """
        Track a single metric measurement.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Unit of measurement
            tags: Additional tags for filtering
        """
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name=metric_name,
            value=value,
            unit=unit,
            tags=tags or {}
        )
        
        # Add to buffer
        self.metrics_buffer.append(metric)
        
        # Flush buffer if full
        if len(self.metrics_buffer) >= self.buffer_size:
            self.flush_metrics()
    
    def flush_metrics(self):
        """Flush metrics buffer to storage."""
        if not self.metrics_buffer:
            return
        
        # Store in Redis with TTL
        if self.redis_client:
            pipeline = self.redis_client.pipeline()
            
            for metric in self.metrics_buffer:
                key = f"metrics:{metric.metric_name}:{metric.timestamp.strftime('%Y%m%d%H')}"
                pipeline.zadd(
                    key,
                    {json.dumps(metric.to_dict()): metric.timestamp.timestamp()}
                )
                pipeline.expire(key, 86400 * 7)  # 7 days TTL
            
            pipeline.execute()
        
        # Also store aggregates for quick access
        self._update_aggregates(self.metrics_buffer)
        
        # Clear buffer
        self.metrics_buffer.clear()
    
    def _update_aggregates(self, metrics: List[PerformanceMetric]):
        """Update aggregate statistics."""
        # Group by metric name
        grouped = defaultdict(list)
        for metric in metrics:
            grouped[metric.metric_name].append(metric.value)
        
        # Calculate and store aggregates
        for metric_name, values in grouped.items():
            if values:
                aggregates = {
                    'count': len(values),
                    'sum': sum(values),
                    'mean': statistics.mean(values),
                    'median': statistics.median(values),
                    'p95': self._percentile(values, 95),
                    'p99': self._percentile(values, 99),
                    'min': min(values),
                    'max': max(values),
                }
                
                # Store in cache for quick access
                cache_key = f"perf_aggregate:{metric_name}:{datetime.now().strftime('%Y%m%d%H')}"
                cache.set(cache_key, aggregates, 3600)  # 1 hour cache
    
    def get_current_metrics(self) -> Dict[str, float]:
        """Get current performance metrics."""
        metrics = {}
        
        # Get from cache and Redis
        for metric_name in self.TARGETS.keys():
            # Try cache first
            cache_key = f"perf_aggregate:{metric_name}:{datetime.now().strftime('%Y%m%d%H')}"
            aggregate = cache.get(cache_key)
            
            if aggregate:
                # Use appropriate statistic based on metric name
                if 'p50' in metric_name:
                    metrics[metric_name] = aggregate.get('median', 0)
                elif 'p95' in metric_name:
                    metrics[metric_name] = aggregate.get('p95', 0)
                elif 'p99' in metric_name:
                    metrics[metric_name] = aggregate.get('p99', 0)
                elif 'rate' in metric_name:
                    # Calculate rate from count
                    metrics[metric_name] = aggregate.get('mean', 0)
                else:
                    metrics[metric_name] = aggregate.get('mean', 0)
        
        # Add system metrics
        metrics.update(self._get_system_metrics())
        
        return metrics
    
    def _get_system_metrics(self) -> Dict[str, float]:
        """Get current system metrics."""
        metrics = {}
        
        try:
            # CPU and Memory
            metrics['cpu_usage_percent'] = psutil.cpu_percent(interval=1)
            metrics['memory_usage_percent'] = psutil.virtual_memory().percent
            
            # Database connections
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT count(*) as total,
                           count(*) FILTER (WHERE state = 'active') as active
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                """)
                result = cursor.fetchone()
                if result:
                    metrics['database_connections_active'] = result[1]
                    metrics['database_connections_total'] = result[0]
            
            # Cache hit rate
            cache_stats = cache._cache.get_stats()  # Django cache backend specific
            if cache_stats:
                hits = cache_stats.get('hits', 0)
                misses = cache_stats.get('misses', 0)
                total = hits + misses
                if total > 0:
                    metrics['cache_hit_rate'] = hits / total
        
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
        
        return metrics
    
    def check_sla_compliance(self) -> Tuple[bool, List[str]]:
        """
        Check if current metrics meet SLA targets.
        
        Returns:
            Tuple of (is_compliant, list_of_violations)
        """
        current_metrics = self.get_current_metrics()
        violations = []
        
        for metric_name, target_value in self.TARGETS.items():
            current_value = current_metrics.get(metric_name)
            
            if current_value is None:
                continue
            
            # Check based on metric type
            if 'rate' in metric_name and metric_name != 'cache_hit_rate':
                # For error rates, lower is better
                if current_value > target_value:
                    violations.append(
                        f"{metric_name}: {current_value:.3f} > {target_value:.3f}"
                    )
            elif metric_name in ['cache_hit_rate', 'booking_success_rate', 'payment_success_rate']:
                # For success rates, higher is better
                if current_value < target_value:
                    violations.append(
                        f"{metric_name}: {current_value:.3f} < {target_value:.3f}"
                    )
            else:
                # For response times, lower is better
                if current_value > target_value:
                    violations.append(
                        f"{metric_name}: {current_value:.0f}ms > {target_value:.0f}ms"
                    )
        
        return len(violations) == 0, violations
    
    def generate_performance_report(self, period_hours: int = 24) -> Dict:
        """
        Generate comprehensive performance report.
        
        Args:
            period_hours: Report period in hours
        
        Returns:
            Dictionary with performance report data
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=period_hours)
        
        report = {
            'period': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat(),
                'hours': period_hours
            },
            'summary': {},
            'metrics': {},
            'sla_compliance': {},
            'recommendations': []
        }
        
        # Get metrics for the period
        for metric_name in self.TARGETS.keys():
            metric_data = self._get_metric_history(metric_name, start_time, end_time)
            if metric_data:
                report['metrics'][metric_name] = {
                    'current': metric_data[-1] if metric_data else None,
                    'average': statistics.mean(metric_data) if metric_data else None,
                    'min': min(metric_data) if metric_data else None,
                    'max': max(metric_data) if metric_data else None,
                    'p95': self._percentile(metric_data, 95) if metric_data else None,
                    'trend': self._calculate_trend(metric_data) if len(metric_data) > 10 else 'stable'
                }
        
        # Check SLA compliance
        is_compliant, violations = self.check_sla_compliance()
        report['sla_compliance'] = {
            'is_compliant': is_compliant,
            'violations': violations,
            'compliance_rate': (len(self.TARGETS) - len(violations)) / len(self.TARGETS)
        }
        
        # Summary statistics
        report['summary'] = {
            'total_requests': sum(self._get_metric_history('requests_per_second', start_time, end_time)),
            'average_response_time': statistics.mean(
                self._get_metric_history('api_response_time_p50', start_time, end_time) or [0]
            ),
            'error_rate': statistics.mean(
                self._get_metric_history('error_rate', start_time, end_time) or [0]
            ),
            'uptime_percentage': self._calculate_uptime(start_time, end_time)
        }
        
        # Generate recommendations
        report['recommendations'] = self._generate_recommendations(report)
        
        return report
    
    def _get_metric_history(self, metric_name: str, start_time: datetime, 
                          end_time: datetime) -> List[float]:
        """Get metric values for a time period."""
        values = []
        
        if self.redis_client:
            # Get from Redis
            current = start_time
            while current <= end_time:
                key = f"metrics:{metric_name}:{current.strftime('%Y%m%d%H')}"
                data = self.redis_client.zrangebyscore(
                    key,
                    current.timestamp(),
                    (current + timedelta(hours=1)).timestamp()
                )
                
                for item in data:
                    metric = json.loads(item)
                    values.append(metric['value'])
                
                current += timedelta(hours=1)
        
        return values
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction."""
        if len(values) < 2:
            return 'stable'
        
        # Simple linear regression
        n = len(values)
        x = list(range(n))
        
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 'stable'
        
        slope = numerator / denominator
        
        # Determine trend based on slope
        if slope > 0.1:
            return 'increasing'
        elif slope < -0.1:
            return 'decreasing'
        else:
            return 'stable'
    
    def _calculate_uptime(self, start_time: datetime, end_time: datetime) -> float:
        """Calculate uptime percentage."""
        # Get error rates for the period
        error_rates = self._get_metric_history('error_rate', start_time, end_time)
        
        if not error_rates:
            return 100.0
        
        # Calculate uptime as inverse of error rate
        avg_error_rate = statistics.mean(error_rates)
        return (1 - avg_error_rate) * 100
    
    def _generate_recommendations(self, report: Dict) -> List[str]:
        """Generate performance recommendations based on report."""
        recommendations = []
        
        # Check response times
        if report['metrics'].get('api_response_time_p95', {}).get('current', 0) > 300:
            recommendations.append(
                "API response times are above 300ms. Consider implementing caching "
                "or optimizing database queries."
            )
        
        # Check error rate
        if report['metrics'].get('error_rate', {}).get('current', 0) > 0.01:
            recommendations.append(
                "Error rate is above 1%. Investigate error logs and implement "
                "better error handling."
            )
        
        # Check cache hit rate
        cache_hit_rate = report['metrics'].get('cache_hit_rate', {}).get('current', 0)
        if cache_hit_rate < 0.7:
            recommendations.append(
                f"Cache hit rate is {cache_hit_rate:.1%}. Consider caching more "
                "frequently accessed data."
            )
        
        # Check database performance
        db_query_time = report['metrics'].get('database_query_time_p95', {}).get('current', 0)
        if db_query_time > 100:
            recommendations.append(
                "Database queries are slow. Review slow query log and add "
                "appropriate indexes."
            )
        
        # Check resource utilization
        cpu_usage = report['metrics'].get('cpu_usage_percent', {}).get('current', 0)
        if cpu_usage > 80:
            recommendations.append(
                f"CPU usage is high ({cpu_usage:.0f}%). Consider horizontal scaling "
                "or code optimization."
            )
        
        return recommendations
    
    def _percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value."""
        if not values:
            return 0
        
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        
        if index >= len(sorted_values):
            return sorted_values[-1]
        
        return sorted_values[index]


# Middleware for automatic performance tracking
class PerformanceTrackingMiddleware:
    """
    Django middleware to automatically track API performance.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.kpi_tracker = PerformanceKPIs()
    
    def __call__(self, request):
        # Skip static files and non-API endpoints
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        
        # Track request
        start_time = time.time()
        
        # Get response
        response = self.get_response(request)
        
        # Calculate metrics
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Track metrics
        self.kpi_tracker.track_metric(
            'api_response_time',
            response_time,
            tags={
                'endpoint': request.path,
                'method': request.method,
                'status_code': str(response.status_code)
            }
        )
        
        # Track error rate
        if response.status_code >= 400:
            self.kpi_tracker.track_metric(
                'error_rate',
                1.0,
                unit='count',
                tags={
                    'endpoint': request.path,
                    'status_code': str(response.status_code)
                }
            )
        
        return response