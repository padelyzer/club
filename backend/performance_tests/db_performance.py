"""
Database performance testing and optimization tools.
Identifies slow queries, N+1 problems, and missing indexes.
"""

import time
import logging
from collections import defaultdict
from contextlib import contextmanager
from django.test import TestCase, TransactionTestCase
from django.db import connection, reset_queries
from django.conf import settings
from django.core.management import call_command
from django.contrib.auth import get_user_model

from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation, TimeSlot
from apps.tournaments.models import Tournament, Match
from apps.clients.models import ClientProfile

User = get_user_model()
logger = logging.getLogger(__name__)


class DatabasePerformanceTest(TransactionTestCase):
    """
    Test and optimize database queries for performance.
    Uses TransactionTestCase to get accurate query counts.
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data for performance testing."""
        super().setUpClass()
        
        # Enable query logging
        settings.DEBUG = True
        
        # Create substantial test data
        cls.create_test_data()
    
    @classmethod
    def create_test_data(cls):
        """Create realistic amount of test data."""
        # This would normally be done with fixtures
        print("Creating test data for performance testing...")
    
    def setUp(self):
        """Reset queries before each test."""
        reset_queries()
    
    @contextmanager
    def assertQueryCount(self, expected_count, tolerance=0):
        """
        Context manager to assert number of queries executed.
        
        Args:
            expected_count: Expected number of queries
            tolerance: Acceptable deviation (for slight variations)
        """
        reset_queries()
        yield
        executed_queries = len(connection.queries)
        
        if abs(executed_queries - expected_count) > tolerance:
            # Print queries for debugging
            print(f"\nExpected {expected_count} queries, but {executed_queries} were executed:")
            for i, query in enumerate(connection.queries, 1):
                print(f"\n{i}. {query['sql'][:200]}...")
                print(f"   Time: {query['time']}s")
            
            self.fail(
                f"Expected {expected_count} queries (±{tolerance}), "
                f"but {executed_queries} were executed"
            )
    
    def test_reservation_list_performance(self):
        """Test reservation list query optimization."""
        # Create test data
        club = Club.objects.create(name="Test Club")
        court = Court.objects.create(club=club, name="Court 1")
        user = User.objects.create_user("testuser", "test@test.com")
        
        # Create 100 reservations
        for i in range(100):
            Reservation.objects.create(
                user=user,
                court=court,
                date="2025-02-01",
                status="confirmed"
            )
        
        # Test unoptimized query
        reset_queries()
        reservations = list(Reservation.objects.all())
        for r in reservations:
            _ = r.court.name  # N+1 query
            _ = r.user.email  # Another N+1
        
        unoptimized_count = len(connection.queries)
        print(f"Unoptimized query count: {unoptimized_count}")
        
        # Test optimized query
        with self.assertQueryCount(1):  # Should be 1 query with proper optimization
            reservations = list(
                Reservation.objects
                .select_related('court', 'user')
                .prefetch_related('participants')
                .all()
            )
            for r in reservations:
                _ = r.court.name
                _ = r.user.email
    
    def test_tournament_bracket_performance(self):
        """Test tournament bracket loading performance."""
        # Create tournament with many matches
        tournament = Tournament.objects.create(
            name="Big Tournament",
            max_teams=64
        )
        
        # Create 63 matches (64-team single elimination)
        matches = []
        for round_num in range(1, 7):  # 6 rounds
            matches_in_round = 2 ** (6 - round_num)
            for match_num in range(matches_in_round):
                matches.append(
                    Match(
                        tournament=tournament,
                        round_number=round_num,
                        match_number=match_num
                    )
                )
        Match.objects.bulk_create(matches)
        
        # Test bracket loading performance
        with self.assertQueryCount(3, tolerance=1):  # Tournament + Matches + Teams
            bracket_data = self.load_tournament_bracket(tournament.id)
            self.assertEqual(len(bracket_data['matches']), 63)
    
    def test_court_availability_performance(self):
        """Test court availability calculation performance."""
        club = Club.objects.create(name="Busy Club")
        
        # Create 10 courts
        courts = []
        for i in range(10):
            courts.append(Court.objects.create(
                club=club,
                name=f"Court {i+1}"
            ))
        
        # Create time slots (16 slots per day)
        slots = []
        for hour in range(8, 24):
            slots.append(TimeSlot.objects.create(
                start_time=f"{hour:02d}:00",
                end_time=f"{hour+1:02d}:00",
                duration_minutes=60
            ))
        
        # Create many reservations
        user = User.objects.create_user("busy_user", "busy@test.com")
        reservations = []
        
        for court in courts:
            for slot in slots[:8]:  # Half the slots are booked
                reservations.append(
                    Reservation(
                        court=court,
                        date="2025-02-15",
                        time_slot=slot,
                        user=user,
                        status="confirmed"
                    )
                )
        
        Reservation.objects.bulk_create(reservations)
        
        # Test availability calculation
        with self.assertQueryCount(3, tolerance=1):  # Courts + Slots + Reservations
            availability = self.calculate_availability("2025-02-15", club.id)
            
            # Verify results
            self.assertEqual(len(availability['courts']), 10)
            for court_avail in availability['courts']:
                # Each court should have 8 available slots
                available_count = sum(1 for s in court_avail['slots'] if s['available'])
                self.assertEqual(available_count, 8)
    
    def test_user_stats_aggregation(self):
        """Test user statistics aggregation performance."""
        # Create users with many reservations
        users = []
        for i in range(50):
            users.append(User.objects.create_user(f"player{i}", f"player{i}@test.com"))
        
        club = Club.objects.create(name="Stats Club")
        court = Court.objects.create(club=club, name="Court 1")
        
        # Create reservations
        reservations = []
        for user in users:
            for j in range(20):  # 20 reservations per user
                reservations.append(
                    Reservation(
                        user=user,
                        court=court,
                        date=f"2025-01-{(j % 28) + 1:02d}",
                        status="completed"
                    )
                )
        
        Reservation.objects.bulk_create(reservations)
        
        # Test stats aggregation
        with self.assertQueryCount(2, tolerance=1):  # Users + Aggregation query
            stats = self.calculate_user_stats(users)
            
            # Verify stats
            for user_stat in stats:
                self.assertEqual(user_stat['total_reservations'], 20)
    
    def analyze_slow_queries(self):
        """
        Analyze slow queries from Django debug toolbar or logs.
        This would integrate with monitoring tools in production.
        """
        slow_queries = []
        
        # Analyze recent queries
        for query in connection.queries:
            execution_time = float(query['time'])
            if execution_time > 0.05:  # 50ms threshold
                slow_queries.append({
                    'sql': query['sql'],
                    'time': execution_time,
                    'recommendations': self._get_query_recommendations(query['sql'])
                })
        
        return slow_queries
    
    def test_n_plus_one_queries(self):
        """Detect and document N+1 query problems."""
        # Common N+1 scenarios in our app
        n_plus_one_scenarios = [
            {
                'name': 'Reservation list with court names',
                'bad_query': lambda: [r.court.name for r in Reservation.objects.all()],
                'good_query': lambda: [r.court.name for r in Reservation.objects.select_related('court').all()],
            },
            {
                'name': 'Tournament list with match counts',
                'bad_query': lambda: [(t.name, t.matches.count()) for t in Tournament.objects.all()],
                'good_query': lambda: [(t.name, t.match_count) for t in Tournament.objects.annotate(match_count=Count('matches')).all()],
            },
            {
                'name': 'User list with reservation history',
                'bad_query': lambda: [(u.username, list(u.reservations.all())) for u in User.objects.all()],
                'good_query': lambda: [(u.username, list(u.reservations.all())) for u in User.objects.prefetch_related('reservations').all()],
            }
        ]
        
        for scenario in n_plus_one_scenarios:
            print(f"\nTesting: {scenario['name']}")
            
            # Test bad query
            reset_queries()
            scenario['bad_query']()
            bad_count = len(connection.queries)
            
            # Test good query
            reset_queries()
            scenario['good_query']()
            good_count = len(connection.queries)
            
            print(f"  Bad query count: {bad_count}")
            print(f"  Good query count: {good_count}")
            print(f"  Improvement: {bad_count - good_count} fewer queries")
    
    def optimize_indexes(self):
        """
        Analyze and recommend database indexes.
        This would normally integrate with database EXPLAIN ANALYZE.
        """
        recommendations = []
        
        # Check common query patterns
        index_checks = [
            {
                'table': 'reservations_reservation',
                'columns': ['date', 'court_id'],
                'reason': 'Frequently filtered by date and court'
            },
            {
                'table': 'reservations_reservation',
                'columns': ['user_id', 'status'],
                'reason': 'User reservation history queries'
            },
            {
                'table': 'tournaments_match',
                'columns': ['tournament_id', 'round_number'],
                'reason': 'Tournament bracket queries'
            },
            {
                'table': 'clubs_court',
                'columns': ['club_id', 'is_active'],
                'reason': 'Active court listings'
            }
        ]
        
        for check in index_checks:
            # This would normally check if index exists
            recommendations.append({
                'table': check['table'],
                'index': f"idx_{check['table']}_{check['columns']}",
                'columns': check['columns'],
                'reason': check['reason']
            })
        
        return recommendations
    
    # Helper methods
    def load_tournament_bracket(self, tournament_id):
        """Load tournament bracket with optimized queries."""
        from apps.tournaments.models import Tournament, Match
        
        tournament = Tournament.objects.get(id=tournament_id)
        matches = Match.objects.filter(
            tournament=tournament
        ).select_related(
            'team1', 'team2', 'winner'
        ).order_by('round_number', 'match_number')
        
        return {
            'tournament': tournament,
            'matches': list(matches)
        }
    
    def calculate_availability(self, date, club_id):
        """Calculate court availability with optimized queries."""
        from apps.clubs.models import Court
        from apps.reservations.models import Reservation, TimeSlot
        
        courts = Court.objects.filter(
            club_id=club_id,
            is_active=True
        ).prefetch_related(
            Prefetch(
                'reservations',
                queryset=Reservation.objects.filter(
                    date=date,
                    status__in=['confirmed', 'pending']
                ).select_related('time_slot')
            )
        )
        
        time_slots = TimeSlot.objects.all()
        
        availability = {'date': date, 'courts': []}
        
        for court in courts:
            reserved_slots = {r.time_slot_id for r in court.reservations.all()}
            court_data = {
                'court': court,
                'slots': []
            }
            
            for slot in time_slots:
                court_data['slots'].append({
                    'slot': slot,
                    'available': slot.id not in reserved_slots
                })
            
            availability['courts'].append(court_data)
        
        return availability
    
    def calculate_user_stats(self, users):
        """Calculate user statistics with optimized queries."""
        from django.db.models import Count, Q
        
        user_stats = User.objects.filter(
            id__in=[u.id for u in users]
        ).annotate(
            total_reservations=Count('reservations'),
            completed_reservations=Count(
                'reservations',
                filter=Q(reservations__status='completed')
            ),
            cancelled_reservations=Count(
                'reservations',
                filter=Q(reservations__status='cancelled')
            )
        ).values(
            'id', 'username', 'total_reservations',
            'completed_reservations', 'cancelled_reservations'
        )
        
        return list(user_stats)
    
    def _get_query_recommendations(self, sql):
        """Get optimization recommendations for a query."""
        recommendations = []
        
        # Simple pattern matching for common issues
        if 'SELECT' in sql and 'JOIN' not in sql and sql.count('FROM') > 1:
            recommendations.append("Consider using select_related() for foreign keys")
        
        if sql.count('SELECT') > 10:  # Multiple queries
            recommendations.append("Possible N+1 query - use prefetch_related()")
        
        if 'COUNT(*)' in sql and 'GROUP BY' not in sql:
            recommendations.append("Consider using annotate() with Count()")
        
        if 'WHERE' in sql and 'INDEX' not in sql:
            # This is simplified - would need EXPLAIN ANALYZE
            recommendations.append("Check if columns in WHERE clause are indexed")
        
        return recommendations


class QueryProfiler:
    """
    Decorator for profiling database queries in views or functions.
    Usage: @QueryProfiler.profile
    """
    
    @staticmethod
    def profile(func):
        """Decorator to profile database queries."""
        def wrapper(*args, **kwargs):
            reset_queries()
            start_time = time.time()
            
            result = func(*args, **kwargs)
            
            end_time = time.time()
            execution_time = end_time - start_time
            query_count = len(connection.queries)
            
            # Log performance metrics
            logger.info(
                f"{func.__name__} - "
                f"Time: {execution_time:.2f}s, "
                f"Queries: {query_count}"
            )
            
            # Alert on performance issues
            if execution_time > 1.0:  # 1 second threshold
                logger.warning(f"SLOW FUNCTION: {func.__name__} took {execution_time:.2f}s")
            
            if query_count > 20:  # Too many queries
                logger.warning(f"QUERY OVERLOAD: {func.__name__} executed {query_count} queries")
            
            # Detailed query analysis in debug mode
            if settings.DEBUG:
                slow_queries = [
                    q for q in connection.queries 
                    if float(q['time']) > 0.05
                ]
                if slow_queries:
                    logger.warning(f"SLOW QUERIES in {func.__name__}:")
                    for q in slow_queries[:5]:  # Top 5 slow queries
                        logger.warning(f"  {q['time']}s: {q['sql'][:100]}...")
            
            return result
        
        return wrapper