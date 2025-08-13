"""
Query optimizations for BI analytics performance.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from django.db.models import (
    QuerySet, Q, Count, Sum, Avg, Max, Min, F, Value, Case, When,
    IntegerField, DateField, FloatField, DecimalField, OuterRef, Subquery,
    Prefetch, ExpressionWrapper, DurationField
)
from django.db.models.functions import (
    TruncDate, TruncWeek, TruncMonth, TruncYear, TruncHour,
    Extract, Coalesce, Cast, Concat
)
from django.utils import timezone
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """
    Utility class for optimizing BI analytics queries.
    """
    
    @staticmethod
    def optimize_reservations_query(base_queryset: QuerySet) -> QuerySet:
        """
        Optimize reservations query with proper joins and prefetches.
        
        Args:
            base_queryset: Base reservations QuerySet
            
        Returns:
            Optimized QuerySet
        """
        return base_queryset.select_related(
            'club', 
            'user', 
            'court',
            'court__club'
        ).prefetch_related(
            'payments',
            'participants'
        )
    
    @staticmethod
    def optimize_users_query(base_queryset: QuerySet) -> QuerySet:
        """
        Optimize users query with proper joins.
        
        Args:
            base_queryset: Base users QuerySet
            
        Returns:
            Optimized QuerySet
        """
        return base_queryset.select_related(
            'club',
            'profile'
        ).prefetch_related(
            'reservations',
            'memberships'
        )
    
    @staticmethod
    def get_time_series_annotations(
        period: str = 'day',
        date_field: str = 'created_at'
    ) -> Dict[str, Any]:
        """
        Get time series annotations based on period.
        
        Args:
            period: 'hour', 'day', 'week', 'month', 'year'
            date_field: Field name to truncate
            
        Returns:
            Dict with annotations
        """
        trunc_functions = {
            'hour': TruncHour,
            'day': TruncDate,
            'week': TruncWeek,
            'month': TruncMonth,
            'year': TruncYear
        }
        
        if period not in trunc_functions:
            period = 'day'
        
        return {
            'period_date': trunc_functions[period](date_field),
        }
    
    @staticmethod
    def build_filter_conditions(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        club_ids: Optional[List[str]] = None,
        user_role: Optional[str] = None,
        date_field: str = 'created_at'
    ) -> Q:
        """
        Build optimized filter conditions with proper indexing.
        
        Args:
            start_date: Filter start date
            end_date: Filter end date
            club_ids: List of club IDs to filter
            user_role: User role for additional filtering
            date_field: Date field to filter on
            
        Returns:
            Q object with filter conditions
        """
        conditions = Q()
        
        # Date range filtering (most selective first)
        if start_date and end_date:
            conditions &= Q(**{
                f'{date_field}__gte': start_date,
                f'{date_field}__lt': end_date
            })
        elif start_date:
            conditions &= Q(**{f'{date_field}__gte': start_date})
        elif end_date:
            conditions &= Q(**{f'{date_field}__lt': end_date})
        
        # Club filtering (second most selective)
        if club_ids:
            if len(club_ids) == 1:
                conditions &= Q(club_id=club_ids[0])
            else:
                conditions &= Q(club_id__in=club_ids)
        
        return conditions


class KPIQueryOptimizer:
    """
    Specialized optimizer for KPI queries.
    """
    
    @staticmethod
    def get_revenue_kpis(
        start_date: datetime,
        end_date: datetime,
        club_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Optimized query for revenue KPIs.
        
        Returns:
            Dict with revenue KPIs
        """
        from apps.reservations.models import Reservation
        from apps.finance.models import Payment
        
        # Build filter conditions
        conditions = QueryOptimizer.build_filter_conditions(
            start_date, end_date, club_ids, date_field='created_at'
        )
        
        # Single query for all revenue metrics
        revenue_data = Payment.objects.filter(
            conditions,
            status='completed'
        ).aggregate(
            total_revenue=Coalesce(Sum('amount'), Value(0)),
            total_transactions=Count('id'),
            avg_transaction=Coalesce(Avg('amount'), Value(0)),
            max_transaction=Coalesce(Max('amount'), Value(0)),
            
            # Payment method breakdown in single query
            cash_revenue=Sum(
                Case(
                    When(payment_method='cash', then='amount'),
                    default=Value(0),
                    output_field=DecimalField()
                )
            ),
            card_revenue=Sum(
                Case(
                    When(payment_method='card', then='amount'),
                    default=Value(0),
                    output_field=DecimalField()
                )
            ),
            transfer_revenue=Sum(
                Case(
                    When(payment_method='transfer', then='amount'),
                    default=Value(0),
                    output_field=DecimalField()
                )
            )
        )
        
        return revenue_data
    
    @staticmethod
    def get_usage_kpis(
        start_date: datetime,
        end_date: datetime,
        club_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Optimized query for court usage KPIs.
        
        Returns:
            Dict with usage KPIs
        """
        from apps.reservations.models import Reservation
        
        conditions = QueryOptimizer.build_filter_conditions(
            start_date, end_date, club_ids, date_field='date'
        )
        
        # Single aggregation query for usage metrics
        usage_data = Reservation.objects.filter(
            conditions,
            status__in=['confirmed', 'completed']
        ).aggregate(
            total_bookings=Count('id'),
            unique_users=Count('user', distinct=True),
            unique_courts=Count('court', distinct=True),
            
            # Time slot distribution
            morning_bookings=Count(
                Case(
                    When(time__hour__lt=12, then=1),
                    output_field=IntegerField()
                )
            ),
            afternoon_bookings=Count(
                Case(
                    When(time__hour__gte=12, time__hour__lt=18, then=1),
                    output_field=IntegerField()
                )
            ),
            evening_bookings=Count(
                Case(
                    When(time__hour__gte=18, then=1),
                    output_field=IntegerField()
                )
            )
        )
        
        return usage_data
    
    @staticmethod
    def get_growth_kpis(
        current_start: datetime,
        current_end: datetime,
        previous_start: datetime,
        previous_end: datetime,
        club_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Optimized query for growth KPIs comparing two periods.
        
        Returns:
            Dict with growth KPIs
        """
        from django.contrib.auth import get_user_model
        from apps.reservations.models import Reservation
        
        User = get_user_model()
        
        # Build conditions for both periods
        current_conditions = QueryOptimizer.build_filter_conditions(
            current_start, current_end, club_ids, date_field='date_joined'
        )
        previous_conditions = QueryOptimizer.build_filter_conditions(
            previous_start, previous_end, club_ids, date_field='date_joined'
        )
        
        # Subqueries for growth metrics
        current_users_subq = User.objects.filter(
            current_conditions
        ).aggregate(count=Count('id'))['count'] or 0
        
        previous_users_subq = User.objects.filter(
            previous_conditions
        ).aggregate(count=Count('id'))['count'] or 0
        
        # Booking growth
        current_bookings = Reservation.objects.filter(
            QueryOptimizer.build_filter_conditions(
                current_start, current_end, club_ids, date_field='date'
            )
        ).count()
        
        previous_bookings = Reservation.objects.filter(
            QueryOptimizer.build_filter_conditions(
                previous_start, previous_end, club_ids, date_field='date'
            )
        ).count()
        
        return {
            'current_new_users': current_users_subq,
            'previous_new_users': previous_users_subq,
            'current_bookings': current_bookings,
            'previous_bookings': previous_bookings,
        }


class RevenueQueryOptimizer:
    """
    Specialized optimizer for revenue analytics queries.
    """
    
    @staticmethod
    def get_revenue_time_series(
        start_date: datetime,
        end_date: datetime,
        period: str = 'day',
        club_ids: Optional[List[str]] = None
    ) -> QuerySet:
        """
        Get revenue time series data optimized for charting.
        
        Args:
            start_date: Start date
            end_date: End date
            period: 'day', 'week', 'month'
            club_ids: Optional club filtering
            
        Returns:
            QuerySet with time series data
        """
        from apps.finance.models import Payment
        
        conditions = QueryOptimizer.build_filter_conditions(
            start_date, end_date, club_ids, date_field='created_at'
        )
        
        # Time series annotations
        time_annotations = QueryOptimizer.get_time_series_annotations(
            period, 'created_at'
        )
        
        return Payment.objects.filter(
            conditions,
            status='completed'
        ).annotate(
            **time_annotations
        ).values('period_date').annotate(
            revenue=Sum('amount'),
            transaction_count=Count('id'),
            avg_transaction=Avg('amount'),
            
            # Payment method breakdown
            cash_amount=Sum(
                Case(When(payment_method='cash', then='amount'), default=0)
            ),
            card_amount=Sum(
                Case(When(payment_method='card', then='amount'), default=0)
            ),
            transfer_amount=Sum(
                Case(When(payment_method='transfer', then='amount'), default=0)
            )
        ).order_by('period_date')
    
    @staticmethod
    def get_revenue_by_source(
        start_date: datetime,
        end_date: datetime,
        club_ids: Optional[List[str]] = None
    ) -> QuerySet:
        """
        Get revenue breakdown by source (reservations, memberships, etc).
        
        Returns:
            QuerySet with revenue by source
        """
        from apps.finance.models import Payment
        
        conditions = QueryOptimizer.build_filter_conditions(
            start_date, end_date, club_ids, date_field='created_at'
        )
        
        return Payment.objects.filter(
            conditions,
            status='completed'
        ).values('payment_type').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id'),
            avg_amount=Avg('amount')
        ).order_by('-total_amount')


class UsageQueryOptimizer:
    """
    Specialized optimizer for usage analytics queries.
    """
    
    @staticmethod
    def get_court_utilization_heatmap(
        start_date: datetime,
        end_date: datetime,
        club_ids: Optional[List[str]] = None
    ) -> QuerySet:
        """
        Get court utilization data for heatmap visualization.
        
        Returns:
            QuerySet with heatmap data
        """
        from apps.reservations.models import Reservation
        
        conditions = QueryOptimizer.build_filter_conditions(
            start_date, end_date, club_ids, date_field='date'
        )
        
        return Reservation.objects.filter(
            conditions,
            status__in=['confirmed', 'completed']
        ).annotate(
            hour=Extract('time', lookup_name='hour'),
            day_of_week=Extract('date', lookup_name='week_day'),
        ).values(
            'court_id', 'court__name', 'hour', 'day_of_week'
        ).annotate(
            booking_count=Count('id'),
            unique_users=Count('user', distinct=True)
        ).order_by('court_id', 'day_of_week', 'hour')
    
    @staticmethod
    def get_peak_hours_analysis(
        start_date: datetime,
        end_date: datetime,
        club_ids: Optional[List[str]] = None
    ) -> QuerySet:
        """
        Analyze peak hours across all courts.
        
        Returns:
            QuerySet with peak hours data
        """
        from apps.reservations.models import Reservation
        
        conditions = QueryOptimizer.build_filter_conditions(
            start_date, end_date, club_ids, date_field='date'
        )
        
        return Reservation.objects.filter(
            conditions,
            status__in=['confirmed', 'completed']
        ).annotate(
            hour=Extract('time', lookup_name='hour')
        ).values('hour').annotate(
            total_bookings=Count('id'),
            utilization_rate=Count('id') * 100.0 / Count('court', distinct=True)
        ).order_by('-total_bookings')


class DatabaseOptimizer:
    """
    Database-level optimizations and monitoring.
    """
    
    @staticmethod
    def analyze_query_performance(queryset: QuerySet) -> Dict[str, Any]:
        """
        Analyze query performance and suggest optimizations.
        
        Args:
            queryset: QuerySet to analyze
            
        Returns:
            Dict with performance analysis
        """
        import time
        from django.db import connection
        
        # Record query count before
        queries_before = len(connection.queries)
        
        # Time the query execution
        start_time = time.time()
        list(queryset)  # Force evaluation
        end_time = time.time()
        
        # Record query count after
        queries_after = len(connection.queries)
        
        return {
            'execution_time': end_time - start_time,
            'query_count': queries_after - queries_before,
            'queries': connection.queries[queries_before:queries_after] if queries_before < queries_after else [],
        }
    
    @staticmethod
    def suggest_indexes(model_class, filters: List[str]) -> List[str]:
        """
        Suggest database indexes based on common filter patterns.
        
        Args:
            model_class: Django model class
            filters: List of commonly filtered fields
            
        Returns:
            List of suggested index definitions
        """
        suggestions = []
        
        # Single field indexes
        for field in filters:
            suggestions.append(f"CREATE INDEX idx_{model_class._meta.db_table}_{field} ON {model_class._meta.db_table} ({field});")
        
        # Composite indexes for common combinations
        if 'club_id' in filters and 'created_at' in filters:
            suggestions.append(
                f"CREATE INDEX idx_{model_class._meta.db_table}_club_date "
                f"ON {model_class._meta.db_table} (club_id, created_at);"
            )
        
        if 'date' in filters and 'status' in filters:
            suggestions.append(
                f"CREATE INDEX idx_{model_class._meta.db_table}_date_status "
                f"ON {model_class._meta.db_table} (date, status);"
            )
        
        return suggestions
    
    @staticmethod
    def get_table_stats(model_class) -> Dict[str, Any]:
        """
        Get table statistics for monitoring.
        
        Args:
            model_class: Django model class
            
        Returns:
            Dict with table statistics
        """
        from django.db import connection
        
        table_name = model_class._meta.db_table
        
        with connection.cursor() as cursor:
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            # Get table size (PostgreSQL specific)
            if connection.vendor == 'postgresql':
                cursor.execute(f"SELECT pg_size_pretty(pg_total_relation_size('{table_name}'))")
                table_size = cursor.fetchone()[0]
            else:
                table_size = 'Unknown'
        
        return {
            'table_name': table_name,
            'row_count': row_count,
            'table_size': table_size,
        }


class PerformanceMonitor:
    """
    Monitor and log performance metrics.
    """
    
    def __init__(self):
        self.query_times = []
        self.cache_hits = 0
        self.cache_misses = 0
    
    def log_query_time(self, query_name: str, execution_time: float):
        """Log query execution time."""
        self.query_times.append({
            'query': query_name,
            'time': execution_time,
            'timestamp': timezone.now()
        })
        
        if execution_time > 1.0:  # Log slow queries
            logger.warning(f"Slow query detected: {query_name} took {execution_time:.2f}s")
    
    def log_cache_hit(self):
        """Log cache hit."""
        self.cache_hits += 1
    
    def log_cache_miss(self):
        """Log cache miss."""
        self.cache_misses += 1
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary."""
        if not self.query_times:
            return {'no_data': True}
        
        avg_time = sum(q['time'] for q in self.query_times) / len(self.query_times)
        max_time = max(q['time'] for q in self.query_times)
        
        cache_hit_rate = (
            self.cache_hits / (self.cache_hits + self.cache_misses)
            if (self.cache_hits + self.cache_misses) > 0
            else 0
        )
        
        return {
            'total_queries': len(self.query_times),
            'avg_query_time': avg_time,
            'max_query_time': max_time,
            'cache_hit_rate': cache_hit_rate,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
        }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()