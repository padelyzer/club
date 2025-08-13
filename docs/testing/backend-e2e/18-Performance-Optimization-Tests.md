# ⚡ Performance Optimization Tests

## 📋 Resumen

Esta guía detalla los tests para optimización de rendimiento, incluyendo pruebas de carga, análisis de consultas, caché, y optimizaciones de respuesta.

## 🎯 Objetivos de Testing

### Métricas Target
- **Response Time**: < 200ms (p95)
- **Throughput**: > 1000 req/s
- **Database Queries**: < 10 per request
- **Cache Hit Rate**: > 80%
- **CPU Usage**: < 70%
- **Memory Usage**: < 2GB
- **Error Rate**: < 0.1%

### Componentes a Cubrir
- ✅ Database Query Optimization
- ✅ Caching Strategies
- ✅ API Response Time
- ✅ Concurrent User Handling
- ✅ Memory Management
- ✅ Background Job Performance
- ✅ Static Asset Optimization
- ✅ Load Balancing

## 🧪 Unit Tests

### 1. Query Optimization Tests
```python
# backend/tests/unit/performance/test_query_optimization.py
from django.test import TestCase
from django.test.utils import override_settings
from django.db import connection
from apps.performance.optimizers import QueryOptimizer
from tests.factories import ClubFactory, CourtFactory, UserFactory

class QueryOptimizationTest(TestCase):
    """Test database query optimization"""
    
    def setUp(self):
        self.optimizer = QueryOptimizer()
        self.create_test_data()
        
    def create_test_data(self):
        """Create test data for query testing"""
        self.clubs = ClubFactory.create_batch(10)
        for club in self.clubs:
            CourtFactory.create_batch(5, club=club)
            
    @override_settings(DEBUG=True)
    def test_n_plus_one_detection(self):
        """Test N+1 query detection"""
        from apps.clubs.models import Club
        
        # Bad query (N+1)
        with self.assertNumQueries(11):  # 1 + 10
            clubs = Club.objects.all()
            for club in clubs:
                # This causes N+1
                court_count = club.courts.count()
                
        # Good query (prefetch)
        with self.assertNumQueries(2):  # 1 for clubs, 1 for courts
            clubs = Club.objects.prefetch_related('courts')
            for club in clubs:
                court_count = club.courts.count()
                
    def test_select_related_optimization(self):
        """Test select_related usage"""
        from apps.reservations.models import Reservation
        
        # Create reservations
        for club in self.clubs[:5]:
            court = club.courts.first()
            ReservationFactory.create_batch(
                10,
                court=court,
                user=UserFactory()
            )
            
        # Without select_related
        with self.assertNumQueries(51):  # 1 + 50 (user and court)
            reservations = Reservation.objects.all()[:50]
            for res in reservations:
                _ = res.user.email
                _ = res.court.name
                
        # With select_related
        with self.assertNumQueries(1):
            reservations = Reservation.objects.select_related(
                'user', 'court'
            ).all()[:50]
            for res in reservations:
                _ = res.user.email
                _ = res.court.name
                
    def test_query_annotation_performance(self):
        """Test query annotation optimization"""
        from django.db.models import Count, Avg, Q
        from apps.clubs.models import Club
        
        # Inefficient: Multiple queries
        start_queries = len(connection.queries)
        
        clubs = Club.objects.all()
        for club in clubs:
            club.court_count = club.courts.count()
            club.active_courts = club.courts.filter(is_active=True).count()
            club.avg_price = club.courts.aggregate(
                avg=Avg('price_per_hour')
            )['avg']
            
        inefficient_queries = len(connection.queries) - start_queries
        
        # Efficient: Single query with annotations
        start_queries = len(connection.queries)
        
        clubs = Club.objects.annotate(
            court_count=Count('courts'),
            active_courts=Count('courts', filter=Q(courts__is_active=True)),
            avg_price=Avg('courts__price_per_hour')
        )
        
        for club in clubs:
            _ = club.court_count
            _ = club.active_courts
            _ = club.avg_price
            
        efficient_queries = len(connection.queries) - start_queries
        
        # Efficient should use way fewer queries
        self.assertLess(efficient_queries, inefficient_queries / 5)

class IndexOptimizationTest(TestCase):
    """Test database index optimization"""
    
    def test_index_usage(self):
        """Test that queries use appropriate indexes"""
        from django.db import connection
        
        # Create test data
        users = UserFactory.create_batch(1000)
        
        with connection.cursor() as cursor:
            # Test email lookup uses index
            cursor.execute(
                "EXPLAIN SELECT * FROM users WHERE email = %s",
                ['test@example.com']
            )
            plan = cursor.fetchall()
            
            # Check index is used (implementation specific)
            plan_str = str(plan)
            self.assertIn('index', plan_str.lower())
            
    def test_composite_index_effectiveness(self):
        """Test composite index usage"""
        from apps.reservations.models import Reservation
        
        # Create many reservations
        for i in range(1000):
            ReservationFactory(
                date=timezone.now().date() + timedelta(days=i % 30),
                start_time=f"{9 + i % 12}:00",
                status=random.choice(['confirmed', 'pending', 'cancelled'])
            )
            
        # Query that should use composite index
        with self.assertNumQueries(1):
            reservations = Reservation.objects.filter(
                date=timezone.now().date(),
                status='confirmed'
            ).select_related('user', 'court')
            
            list(reservations)  # Force evaluation
```

### 2. Caching Strategy Tests
```python
# backend/tests/unit/performance/test_caching.py
from django.test import TestCase
from django.core.cache import cache
from apps.performance.caching import CacheManager, CacheKeyBuilder
import time

class CachingStrategyTest(TestCase):
    """Test caching strategies"""
    
    def setUp(self):
        self.cache_manager = CacheManager()
        self.key_builder = CacheKeyBuilder()
        cache.clear()
        
    def test_cache_key_generation(self):
        """Test cache key generation"""
        # Test basic key
        key = self.key_builder.build_key('clubs', 'list', page=1)
        self.assertEqual(key, 'clubs:list:page:1')
        
        # Test with multiple params
        key = self.key_builder.build_key(
            'clubs',
            'search',
            city='Madrid',
            amenities=['parking', 'restaurant'],
            page=2
        )
        self.assertIn('clubs:search:', key)
        self.assertIn('city:Madrid', key)
        self.assertIn('amenities:', key)
        
    def test_cache_invalidation_strategy(self):
        """Test cache invalidation"""
        # Set related cache entries
        cache.set('clubs:list:page:1', ['club1', 'club2'], 3600)
        cache.set('clubs:detail:1', {'id': 1, 'name': 'Club 1'}, 3600)
        cache.set('clubs:search:city:Madrid', ['club1'], 3600)
        
        # Invalidate club 1
        self.cache_manager.invalidate_pattern('clubs:*:1')
        
        # Check invalidation
        self.assertIsNone(cache.get('clubs:detail:1'))
        # List cache might be invalidated depending on strategy
        
    def test_cache_warming(self):
        """Test cache warming strategies"""
        # Define cache warming tasks
        warming_tasks = [
            {
                'key': 'popular:clubs',
                'function': lambda: Club.objects.filter(
                    featured=True
                ).values()
            },
            {
                'key': 'available:courts:today',
                'function': lambda: Court.objects.filter(
                    reservations__date=timezone.now().date()
                ).count()
            }
        ]
        
        # Warm cache
        warmed = self.cache_manager.warm_cache(warming_tasks)
        
        self.assertEqual(len(warmed), 2)
        
        # Verify cache is warm
        for task in warming_tasks:
            self.assertIsNotNone(cache.get(task['key']))
            
    def test_cache_stampede_prevention(self):
        """Test cache stampede prevention"""
        call_count = 0
        
        def expensive_operation():
            nonlocal call_count
            call_count += 1
            time.sleep(0.1)  # Simulate expensive operation
            return f"result_{call_count}"
            
        # Simulate concurrent requests
        import threading
        results = []
        
        def make_request():
            result = self.cache_manager.get_or_set_with_lock(
                'expensive_key',
                expensive_operation,
                timeout=10
            )
            results.append(result)
            
        # Start multiple threads
        threads = []
        for _ in range(10):
            t = threading.Thread(target=make_request)
            threads.append(t)
            t.start()
            
        # Wait for all threads
        for t in threads:
            t.join()
            
        # Should only call expensive operation once
        self.assertEqual(call_count, 1)
        # All results should be the same
        self.assertEqual(len(set(results)), 1)

class CacheEfficiencyTest(TestCase):
    """Test cache efficiency metrics"""
    
    def test_cache_hit_rate_monitoring(self):
        """Test cache hit rate monitoring"""
        monitor = CacheHitRateMonitor()
        
        # Simulate cache operations
        for i in range(100):
            if i < 80:  # 80% hit rate
                monitor.record_hit('test_key')
            else:
                monitor.record_miss('test_key')
                
        stats = monitor.get_stats()
        
        self.assertEqual(stats['total_requests'], 100)
        self.assertEqual(stats['hits'], 80)
        self.assertEqual(stats['misses'], 20)
        self.assertEqual(stats['hit_rate'], 0.8)
        
    def test_cache_size_optimization(self):
        """Test cache size optimization"""
        optimizer = CacheSizeOptimizer()
        
        # Add items with different access patterns
        items = [
            {'key': 'popular1', 'size': 1024, 'access_count': 1000},
            {'key': 'popular2', 'size': 2048, 'access_count': 800},
            {'key': 'rarely_used', 'size': 10240, 'access_count': 10},
            {'key': 'never_used', 'size': 5120, 'access_count': 0},
        ]
        
        for item in items:
            optimizer.track_item(
                item['key'],
                item['size'],
                item['access_count']
            )
            
        # Get eviction candidates
        candidates = optimizer.get_eviction_candidates(
            target_size=8192  # Need to free up space
        )
        
        # Should evict rarely/never used items first
        self.assertIn('never_used', candidates)
        self.assertIn('rarely_used', candidates)
        self.assertNotIn('popular1', candidates)
```

### 3. Response Optimization Tests
```python
# backend/tests/unit/performance/test_response_optimization.py
from django.test import TestCase
from apps.performance.serializers import OptimizedSerializer
from apps.performance.pagination import OptimizedPagination

class ResponseOptimizationTest(TestCase):
    """Test API response optimization"""
    
    def test_serializer_field_optimization(self):
        """Test serializer field optimization"""
        # Create test data
        clubs = ClubFactory.create_batch(10)
        
        # Standard serializer
        from apps.clubs.serializers import ClubSerializer
        standard_data = ClubSerializer(clubs, many=True).data
        
        # Optimized serializer (only requested fields)
        optimized_data = OptimizedSerializer.serialize(
            clubs,
            fields=['id', 'name', 'city'],
            many=True
        )
        
        # Compare sizes
        standard_size = len(json.dumps(standard_data))
        optimized_size = len(json.dumps(optimized_data))
        
        # Optimized should be smaller
        self.assertLess(optimized_size, standard_size * 0.5)
        
    def test_pagination_optimization(self):
        """Test pagination optimization"""
        # Create many items
        items = list(range(1000))
        
        paginator = OptimizedPagination()
        
        # Test cursor pagination (more efficient for large datasets)
        page1 = paginator.paginate_queryset(items, request=None)
        
        self.assertEqual(len(page1), paginator.page_size)
        
        # Test that cursor doesn't load unnecessary data
        with self.assertNumQueries(1):  # Should only query current page
            next_page = paginator.get_next_page(page1)
            
    def test_response_compression(self):
        """Test response compression effectiveness"""
        from apps.performance.middleware import CompressionMiddleware
        
        # Large response data
        large_data = {
            'results': [
                {
                    'id': i,
                    'name': f'Item {i}',
                    'description': 'A' * 1000  # 1KB per item
                }
                for i in range(100)
            ]
        }
        
        # Compress response
        compressor = CompressionMiddleware()
        compressed = compressor.compress_response(
            json.dumps(large_data),
            accept_encoding='gzip'
        )
        
        original_size = len(json.dumps(large_data))
        compressed_size = len(compressed)
        
        # Should achieve good compression ratio
        compression_ratio = compressed_size / original_size
        self.assertLess(compression_ratio, 0.3)  # 70% reduction
```

## 🔌 Integration Tests

### 1. Load Testing
```python
# backend/tests/integration/performance/test_load.py
from locust import HttpUser, task, between
from rest_framework.test import APITestCase
import concurrent.futures

class LoadTestUser(HttpUser):
    """Simulated user for load testing"""
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login before testing"""
        response = self.client.post("/api/v1/auth/login/", json={
            "email": "loadtest@example.com",
            "password": "testpass123"
        })
        self.token = response.json()["access"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    @task(3)
    def view_clubs(self):
        """View clubs list"""
        self.client.get("/api/v1/clubs/", headers=self.headers)
        
    @task(2)
    def search_courts(self):
        """Search available courts"""
        self.client.get(
            "/api/v1/courts/available/",
            params={
                "date": "2023-12-01",
                "duration": 60
            },
            headers=self.headers
        )
        
    @task(1)
    def create_reservation(self):
        """Create a reservation"""
        self.client.post(
            "/api/v1/reservations/",
            json={
                "court_id": 1,
                "date": "2023-12-01",
                "start_time": "10:00",
                "duration": 60
            },
            headers=self.headers
        )

class APILoadTest(APITestCase):
    """Test API under load"""
    
    def test_concurrent_user_handling(self):
        """Test handling concurrent users"""
        def make_request(user_id):
            client = APIClient()
            user = UserFactory()
            client.force_authenticate(user=user)
            
            response = client.get('/api/v1/clubs/')
            return response.status_code
            
        # Simulate 100 concurrent users
        with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
            futures = [
                executor.submit(make_request, i)
                for i in range(100)
            ]
            
            results = [f.result() for f in futures]
            
        # All requests should succeed
        self.assertEqual(results.count(200), 100)
        
    def test_rate_limiting_under_load(self):
        """Test rate limiting effectiveness"""
        client = APIClient()
        
        # Make many requests quickly
        responses = []
        for i in range(150):
            response = client.get('/api/v1/clubs/')
            responses.append(response.status_code)
            
        # Should start rate limiting
        rate_limited = responses.count(429)
        self.assertGreater(rate_limited, 0)
        
        # But not too aggressive
        successful = responses.count(200)
        self.assertGreater(successful, 50)
```

### 2. Database Performance Tests
```python
# backend/tests/integration/performance/test_database_performance.py
class DatabasePerformanceTest(TransactionTestCase):
    """Test database performance under load"""
    
    def test_connection_pooling(self):
        """Test database connection pooling"""
        from django.db import connection
        
        def execute_query():
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM clubs")
                return cursor.fetchone()[0]
                
        # Execute many queries concurrently
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(execute_query) for _ in range(500)]
            results = [f.result() for f in futures]
            
        duration = time.time() - start_time
        
        # Should handle efficiently with connection pooling
        self.assertLess(duration, 5.0)  # 500 queries in 5 seconds
        
    def test_bulk_operation_performance(self):
        """Test bulk operation performance"""
        # Test bulk create
        start_time = time.time()
        
        users = [
            User(
                email=f'user{i}@test.com',
                username=f'user{i}'
            )
            for i in range(10000)
        ]
        
        User.objects.bulk_create(users, batch_size=1000)
        
        create_duration = time.time() - start_time
        
        # Should be fast
        self.assertLess(create_duration, 2.0)
        
        # Test bulk update
        start_time = time.time()
        
        User.objects.filter(
            email__endswith='@test.com'
        ).update(is_active=False)
        
        update_duration = time.time() - start_time
        
        self.assertLess(update_duration, 1.0)
```

## 🔄 E2E Flow Tests

### 1. Full Stack Performance Test
```python
# backend/tests/e2e/performance/test_full_stack_performance.py
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

class FullStackPerformanceE2ETest(TestCase):
    """Test full stack performance"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        options = webdriver.ChromeOptions()
        options.add_argument('--enable-precise-memory-info')
        cls.driver = webdriver.Chrome(options=options)
        
    def test_page_load_performance(self):
        """Test page load performance metrics"""
        # Navigate to page
        self.driver.get(f"{self.live_server_url}/clubs")
        
        # Get performance metrics
        performance = self.driver.execute_script(
            "return window.performance.timing"
        )
        
        # Calculate metrics
        page_load_time = (
            performance['loadEventEnd'] - 
            performance['navigationStart']
        )
        dom_ready_time = (
            performance['domContentLoadedEventEnd'] - 
            performance['navigationStart']
        )
        
        # Should load quickly
        self.assertLess(page_load_time, 3000)  # 3 seconds
        self.assertLess(dom_ready_time, 1500)  # 1.5 seconds
        
        # Check resource timing
        resources = self.driver.execute_script(
            "return window.performance.getEntriesByType('resource')"
        )
        
        # Analyze resource loading
        slow_resources = [
            r for r in resources 
            if r['duration'] > 1000  # Resources taking > 1 second
        ]
        
        self.assertEqual(
            len(slow_resources),
            0,
            f"Slow resources detected: {[r['name'] for r in slow_resources]}"
        )
        
    def test_memory_usage_during_navigation(self):
        """Test memory usage during navigation"""
        if not self.driver.execute_script("return window.performance.memory"):
            self.skipTest("Memory API not available")
            
        # Initial memory
        initial_memory = self.driver.execute_script(
            "return window.performance.memory.usedJSHeapSize"
        )
        
        # Navigate through multiple pages
        pages = ['/clubs', '/courts', '/reservations', '/tournaments']
        
        for page in pages * 5:  # Navigate 20 times
            self.driver.get(f"{self.live_server_url}{page}")
            time.sleep(0.5)
            
        # Final memory
        final_memory = self.driver.execute_script(
            "return window.performance.memory.usedJSHeapSize"
        )
        
        # Check for memory leaks
        memory_increase = final_memory - initial_memory
        memory_increase_mb = memory_increase / 1024 / 1024
        
        # Should not leak too much memory
        self.assertLess(
            memory_increase_mb,
            50,  # Max 50MB increase
            f"Potential memory leak: {memory_increase_mb}MB increase"
        )
```

### 2. API Performance Monitoring
```python
# backend/tests/e2e/performance/test_api_monitoring.py
class APIPerformanceMonitoringE2ETest(TestCase):
    """Test API performance monitoring"""
    
    def test_response_time_monitoring(self):
        """Test API response time monitoring"""
        from apps.performance.monitoring import PerformanceMonitor
        
        monitor = PerformanceMonitor()
        endpoints = [
            '/api/v1/clubs/',
            '/api/v1/courts/',
            '/api/v1/reservations/',
            '/api/v1/users/me/'
        ]
        
        # Make requests and monitor
        for endpoint in endpoints:
            for _ in range(100):
                start = time.time()
                response = self.client.get(endpoint)
                duration = time.time() - start
                
                monitor.record_request(
                    endpoint=endpoint,
                    method='GET',
                    duration=duration,
                    status_code=response.status_code
                )
                
        # Get statistics
        stats = monitor.get_endpoint_stats()
        
        for endpoint in endpoints:
            endpoint_stats = stats[endpoint]
            
            # Check performance metrics
            self.assertLess(
                endpoint_stats['p95'],
                0.2,  # 95th percentile < 200ms
                f"{endpoint} p95 too high: {endpoint_stats['p95']}s"
            )
            
            self.assertLess(
                endpoint_stats['p99'],
                0.5,  # 99th percentile < 500ms
                f"{endpoint} p99 too high: {endpoint_stats['p99']}s"
            )
            
    def test_slow_query_detection(self):
        """Test slow query detection and alerting"""
        from apps.performance.monitoring import SlowQueryMonitor
        
        monitor = SlowQueryMonitor(threshold_ms=100)
        
        # Create a slow query scenario
        with override_settings(DEBUG=True):
            # Query that will be slow
            Club.objects.filter(
                courts__reservations__user__email__contains='test'
            ).distinct().count()
            
        # Check slow queries detected
        slow_queries = monitor.get_slow_queries()
        
        self.assertGreater(len(slow_queries), 0)
        
        # Verify query details captured
        for query in slow_queries:
            self.assertIn('sql', query)
            self.assertIn('duration', query)
            self.assertIn('stack_trace', query)
            self.assertGreater(query['duration'], 100)
```

### 3. Scalability Testing
```python
# backend/tests/e2e/performance/test_scalability.py
class ScalabilityE2ETest(TestCase):
    """Test system scalability"""
    
    def test_horizontal_scaling_simulation(self):
        """Test simulated horizontal scaling"""
        from apps.performance.scaling import LoadBalancer
        
        # Simulate multiple app instances
        instances = []
        for i in range(4):
            instance = AppInstance(port=8000 + i)
            instances.append(instance)
            
        balancer = LoadBalancer(instances)
        
        # Simulate load distribution
        request_counts = {i: 0 for i in range(4)}
        
        for _ in range(1000):
            instance = balancer.get_next_instance()
            request_counts[instance.id] += 1
            
        # Check load is evenly distributed
        min_requests = min(request_counts.values())
        max_requests = max(request_counts.values())
        
        # Should be relatively even (within 20%)
        self.assertLess(
            (max_requests - min_requests) / min_requests,
            0.2
        )
        
    def test_cache_distribution(self):
        """Test distributed cache performance"""
        from apps.performance.cache import DistributedCache
        
        # Setup distributed cache
        cache_nodes = [
            CacheNode(f'node{i}', port=6379 + i)
            for i in range(3)
        ]
        
        distributed_cache = DistributedCache(cache_nodes)
        
        # Test cache operations
        test_data = {
            f'key_{i}': f'value_{i}' * 100  # ~500 bytes each
            for i in range(1000)
        }
        
        # Write performance
        start = time.time()
        for key, value in test_data.items():
            distributed_cache.set(key, value)
        write_duration = time.time() - start
        
        # Read performance  
        start = time.time()
        for key in test_data:
            value = distributed_cache.get(key)
        read_duration = time.time() - start
        
        # Should handle efficiently
        self.assertLess(write_duration, 2.0)  # 1000 writes in 2s
        self.assertLess(read_duration, 1.0)   # 1000 reads in 1s
```

## 🔒 Security Performance Tests

### Security Overhead Tests
```python
# backend/tests/performance/security/test_security_overhead.py
class SecurityPerformanceTest(TestCase):
    """Test security feature performance impact"""
    
    def test_authentication_overhead(self):
        """Test authentication performance overhead"""
        # Without authentication
        start = time.time()
        for _ in range(100):
            self.client.get('/api/v1/public/clubs/')
        public_duration = time.time() - start
        
        # With authentication
        user = UserFactory()
        self.client.force_authenticate(user=user)
        
        start = time.time()
        for _ in range(100):
            self.client.get('/api/v1/clubs/')
        auth_duration = time.time() - start
        
        # Authentication overhead should be minimal
        overhead = (auth_duration - public_duration) / public_duration
        self.assertLess(overhead, 0.2)  # Less than 20% overhead
        
    def test_permission_checking_performance(self):
        """Test permission checking performance"""
        from apps.performance.permissions import PermissionChecker
        
        checker = PermissionChecker()
        user = UserFactory()
        
        # Create complex permission structure
        for i in range(50):
            Permission.objects.create(
                name=f'permission_{i}',
                codename=f'perm_{i}'
            )
            
        # Test permission checking speed
        start = time.time()
        
        for _ in range(1000):
            has_perm = checker.user_has_permission(
                user,
                'perm_25',
                context={'club_id': 1}
            )
            
        duration = time.time() - start
        
        # Should be fast even with many permissions
        self.assertLess(duration, 0.5)  # 1000 checks in 0.5s
```

## 📊 Performance Metrics Tests

### Metrics Collection Tests
```python
# backend/tests/performance/metrics/test_metrics.py
class PerformanceMetricsTest(TestCase):
    """Test performance metrics collection"""
    
    def test_metrics_collection_overhead(self):
        """Test metrics collection doesn't impact performance"""
        from apps.performance.metrics import MetricsCollector
        
        collector = MetricsCollector()
        
        # Function without metrics
        def simple_function():
            time.sleep(0.01)
            return sum(range(1000))
            
        # Function with metrics
        @collector.measure_time('test_function')
        def measured_function():
            time.sleep(0.01)
            return sum(range(1000))
            
        # Compare execution times
        iterations = 100
        
        # Without metrics
        start = time.time()
        for _ in range(iterations):
            simple_function()
        simple_duration = time.time() - start
        
        # With metrics
        start = time.time()
        for _ in range(iterations):
            measured_function()
        measured_duration = time.time() - start
        
        # Overhead should be minimal
        overhead = (measured_duration - simple_duration) / simple_duration
        self.assertLess(overhead, 0.05)  # Less than 5% overhead
        
    def test_metrics_aggregation_performance(self):
        """Test metrics aggregation performance"""
        from apps.performance.metrics import MetricsAggregator
        
        aggregator = MetricsAggregator()
        
        # Generate many metrics
        for i in range(10000):
            aggregator.record_metric(
                'api_response_time',
                random.uniform(0.01, 0.5),
                tags={
                    'endpoint': f'/api/v1/endpoint_{i % 10}/',
                    'method': random.choice(['GET', 'POST']),
                    'status': random.choice([200, 201, 400, 404])
                }
            )
            
        # Test aggregation speed
        start = time.time()
        
        stats = aggregator.get_statistics(
            metric='api_response_time',
            group_by=['endpoint', 'method'],
            percentiles=[50, 95, 99]
        )
        
        duration = time.time() - start
        
        # Should aggregate quickly
        self.assertLess(duration, 0.5)  # Aggregate 10k metrics in 0.5s
        
        # Verify statistics
        self.assertIn('percentiles', stats)
        self.assertIn('mean', stats)
        self.assertIn('count', stats)
```

## 🎯 Test Execution Commands

### Run All Performance Tests
```bash
# Unit tests only
pytest tests/unit/performance/ -v

# Integration tests
pytest tests/integration/performance/ -v

# E2E tests
pytest tests/e2e/performance/ -v

# All performance tests
pytest tests/ -k performance -v

# With profiling
pytest tests/ -k performance --profile

# Load testing with Locust
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

### Run Specific Performance Tests
```bash
# Query optimization tests
pytest tests/ -k "query_optimization" -v

# Caching tests
pytest tests/ -k "caching" -v

# Load tests
pytest tests/ -k "load" -v

# Memory tests
pytest tests/ -k "memory" -v
```

### Performance Profiling Commands
```bash
# Profile specific view
python manage.py profile_view clubs.views.ClubListView

# Generate performance report
python manage.py performance_report --days=7

# Analyze slow queries
python manage.py analyze_slow_queries --threshold=100
```

---

**Siguiente**: [Security Vulnerability Tests](19-Security-Vulnerability-Tests.md) →