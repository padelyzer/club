"""
Tournament health monitoring and system status checks.
Provides comprehensive monitoring of tournament system health, integrity, and performance.

Based on finance and reservations health monitoring patterns.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal

from django.core.cache import cache
from django.db import connection, transaction
from django.db.models import Count, Q, F, Sum, Avg
from django.utils import timezone

from .validators import TournamentIntegrityValidator
from .circuit_breakers import get_tournament_circuit_breaker_status

logger = logging.getLogger('tournaments.health')

# Health check thresholds
HEALTH_CHECK_TIMEOUT = 30  # seconds
MAX_HEALTHY_RESPONSE_TIME = 2.0  # seconds
MIN_HEALTHY_TOURNAMENTS_RATIO = 0.8  # 80% of tournaments should be healthy
MAX_BRACKET_INCONSISTENCY_RATIO = 0.05  # Max 5% of brackets can have issues
MIN_REGISTRATION_SUCCESS_RATE = 0.95  # 95% registration success rate


class TournamentHealthMonitor:
    """
    Comprehensive health monitoring for tournament system.
    Monitors database health, tournament integrity, bracket consistency, and system performance.
    """
    
    def __init__(self):
        self.start_time = timezone.now()
        self.health_cache_key = "tournament_health_status"
        self.health_cache_timeout = 300  # 5 minutes
    
    def check_overall_health(self, include_detailed: bool = True) -> Dict[str, Any]:
        """
        Perform comprehensive tournament system health check.
        
        Args:
            include_detailed: Whether to include detailed per-tournament checks
            
        Returns:
            Dict with complete health status
        """
        health_report = {
            'timestamp': timezone.now().isoformat(),
            'overall_healthy': True,
            'response_time_seconds': 0.0,
            'checks': {},
            'summary': {},
            'recommendations': []
        }
        
        start_time = time.time()
        
        try:
            # Database connectivity check
            health_report['checks']['database'] = self._check_database_health()
            
            # Tournament data integrity
            health_report['checks']['tournament_integrity'] = self._check_tournament_integrity()
            
            # Active tournaments health
            health_report['checks']['active_tournaments'] = self._check_active_tournaments()
            
            # Bracket consistency checks
            health_report['checks']['bracket_consistency'] = self._check_bracket_integrity()
            
            # Registration system health
            health_report['checks']['registration_system'] = self._check_registration_system()
            
            # Circuit breaker status
            health_report['checks']['circuit_breakers'] = self._check_circuit_breakers()
            
            # Performance metrics
            health_report['checks']['performance'] = self._check_performance_metrics()
            
            # Prize distribution integrity
            health_report['checks']['prize_integrity'] = self._check_prize_distribution()
            
            # Recent system activity
            health_report['checks']['system_activity'] = self._check_system_activity()
            
            # Detailed tournament checks if requested
            if include_detailed:
                health_report['checks']['detailed_tournaments'] = self._check_individual_tournaments()
            
            # Calculate overall health
            health_report['overall_healthy'] = self._calculate_overall_health(health_report['checks'])
            
            # Generate summary
            health_report['summary'] = self._generate_health_summary(health_report['checks'])
            
            # Generate recommendations
            health_report['recommendations'] = self._generate_recommendations(health_report['checks'])
            
            health_report['response_time_seconds'] = time.time() - start_time
            
            # Cache results
            cache.set(self.health_cache_key, health_report, self.health_cache_timeout)
            
            logger.info(f"Tournament health check completed in {health_report['response_time_seconds']:.3f}s")
            
            return health_report
            
        except Exception as e:
            logger.critical(f"Tournament health check failed: {e}")
            health_report['overall_healthy'] = False
            health_report['error'] = str(e)
            health_report['response_time_seconds'] = time.time() - start_time
            return health_report
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and basic query performance."""
        db_health = {
            'status': 'healthy',
            'response_time_ms': 0,
            'query_count': 0,
            'issues': []
        }
        
        start_time = time.time()
        
        try:
            with connection.cursor() as cursor:
                # Basic connectivity test
                cursor.execute("SELECT 1")
                db_health['query_count'] += 1
                
                # Tournament table access test
                cursor.execute("SELECT COUNT(*) FROM tournaments_tournament")
                result = cursor.fetchone()
                db_health['tournament_count'] = result[0]
                db_health['query_count'] += 1
                
                # Index performance test
                cursor.execute("""
                    SELECT COUNT(*) FROM tournaments_tournament 
                    WHERE status = 'in_progress' AND start_date >= %s
                """, [timezone.now().date() - timedelta(days=30)])
                db_health['query_count'] += 1
                
            response_time = time.time() - start_time
            db_health['response_time_ms'] = int(response_time * 1000)
            
            if response_time > MAX_HEALTHY_RESPONSE_TIME:
                db_health['status'] = 'slow'
                db_health['issues'].append(f"Slow database response: {response_time:.3f}s")
            
        except Exception as e:
            db_health['status'] = 'unhealthy'
            db_health['issues'].append(f"Database error: {str(e)}")
            logger.error(f"Database health check failed: {e}")
        
        return db_health
    
    def _check_tournament_integrity(self) -> Dict[str, Any]:
        """Check overall tournament data integrity."""
        integrity_health = {
            'status': 'healthy',
            'tournaments_checked': 0,
            'integrity_issues': 0,
            'issues': [],
            'issue_types': {}
        }
        
        try:
            from apps.tournaments.models import Tournament
            
            # Check recent tournaments for data integrity
            recent_tournaments = Tournament.objects.filter(
                modified_at__gte=timezone.now() - timedelta(days=7)
            )[:50]  # Limit to 50 most recent
            
            validator = TournamentIntegrityValidator()
            
            for tournament in recent_tournaments:
                try:
                    validation_result = validator.validate_tournament_structure(tournament)
                    integrity_health['tournaments_checked'] += 1
                    
                    if not validation_result['is_valid']:
                        integrity_health['integrity_issues'] += 1
                        
                        for error in validation_result['errors']:
                            error_type = error.split(':')[0] if ':' in error else 'general'
                            integrity_health['issue_types'][error_type] = (
                                integrity_health['issue_types'].get(error_type, 0) + 1
                            )
                        
                        integrity_health['issues'].append({
                            'tournament_id': str(tournament.id),
                            'tournament_name': tournament.name,
                            'errors': validation_result['errors'][:3]  # Limit errors shown
                        })
                        
                        # Only show first 10 problematic tournaments
                        if len(integrity_health['issues']) >= 10:
                            break
                
                except Exception as e:
                    logger.warning(f"Error validating tournament {tournament.id}: {e}")
                    continue
            
            # Determine status based on issue ratio
            if integrity_health['tournaments_checked'] > 0:
                issue_ratio = integrity_health['integrity_issues'] / integrity_health['tournaments_checked']
                
                if issue_ratio > (1 - MIN_HEALTHY_TOURNAMENTS_RATIO):
                    integrity_health['status'] = 'unhealthy'
                elif issue_ratio > 0.1:  # More than 10% have issues
                    integrity_health['status'] = 'warning'
            
        except Exception as e:
            integrity_health['status'] = 'error'
            integrity_health['issues'].append(f"Integrity check failed: {str(e)}")
            logger.error(f"Tournament integrity check failed: {e}")
        
        return integrity_health
    
    def _check_active_tournaments(self) -> Dict[str, Any]:
        """Check health of currently active tournaments."""
        active_health = {
            'status': 'healthy',
            'active_count': 0,
            'in_progress_count': 0,
            'registration_open_count': 0,
            'issues': [],
            'tournaments_with_issues': []
        }
        
        try:
            from apps.tournaments.models import Tournament
            
            # Get active tournaments
            active_tournaments = Tournament.objects.filter(
                status__in=['registration_open', 'registration_closed', 'in_progress']
            )
            
            active_health['active_count'] = active_tournaments.count()
            active_health['in_progress_count'] = active_tournaments.filter(status='in_progress').count()
            active_health['registration_open_count'] = active_tournaments.filter(status='registration_open').count()
            
            # Check each active tournament
            for tournament in active_tournaments[:20]:  # Limit to 20 for performance
                tournament_issues = []
                
                # Check if tournament can proceed
                if tournament.status == 'registration_closed' and not tournament.can_start:
                    tournament_issues.append("Cannot start - insufficient teams")
                
                # Check if registration period is valid
                if tournament.status == 'registration_open' and not tournament.is_registration_open:
                    tournament_issues.append("Status inconsistent with registration period")
                
                # Check if tournament is overdue
                if tournament.status == 'in_progress' and tournament.end_date < timezone.now().date():
                    tournament_issues.append("Tournament overdue for completion")
                
                if tournament_issues:
                    active_health['tournaments_with_issues'].append({
                        'tournament_id': str(tournament.id),
                        'name': tournament.name,
                        'status': tournament.status,
                        'issues': tournament_issues
                    })
            
            # Determine overall status
            if active_health['active_count'] > 0:
                issue_ratio = len(active_health['tournaments_with_issues']) / min(active_health['active_count'], 20)
                
                if issue_ratio > 0.3:  # More than 30% have issues
                    active_health['status'] = 'warning'
                elif issue_ratio > 0.5:  # More than 50% have issues
                    active_health['status'] = 'unhealthy'
            
        except Exception as e:
            active_health['status'] = 'error'
            active_health['issues'].append(f"Active tournament check failed: {str(e)}")
            logger.error(f"Active tournament health check failed: {e}")
        
        return active_health
    
    def _check_bracket_integrity(self) -> Dict[str, Any]:
        """Check bracket structure integrity for tournaments with brackets."""
        bracket_health = {
            'status': 'healthy',
            'tournaments_with_brackets': 0,
            'brackets_checked': 0,
            'inconsistent_brackets': 0,
            'issues': [],
            'issue_summary': {}
        }
        
        try:
            from apps.tournaments.models import Tournament
            
            # Get tournaments with bracket formats
            bracket_tournaments = Tournament.objects.filter(
                format__in=['elimination', 'double_elimination'],
                status__in=['in_progress', 'completed']
            )[:30]  # Limit for performance
            
            validator = TournamentIntegrityValidator()
            
            for tournament in bracket_tournaments:
                try:
                    bracket_health['tournaments_with_brackets'] += 1
                    
                    # Validate bracket consistency
                    bracket_result = validator.validate_bracket_consistency(tournament)
                    bracket_health['brackets_checked'] += 1
                    
                    if not bracket_result['is_consistent']:
                        bracket_health['inconsistent_brackets'] += 1
                        
                        # Categorize issues
                        for error in bracket_result['errors']:
                            error_type = error.split(':')[0] if ':' in error else 'general'
                            bracket_health['issue_summary'][error_type] = (
                                bracket_health['issue_summary'].get(error_type, 0) + 1
                            )
                        
                        bracket_health['issues'].append({
                            'tournament_id': str(tournament.id),
                            'name': tournament.name,
                            'format': tournament.format,
                            'error_count': len(bracket_result['errors'])
                        })
                        
                        # Limit issues shown
                        if len(bracket_health['issues']) >= 10:
                            break
                
                except Exception as e:
                    logger.warning(f"Error checking bracket for tournament {tournament.id}: {e}")
                    continue
            
            # Determine status
            if bracket_health['brackets_checked'] > 0:
                inconsistency_ratio = bracket_health['inconsistent_brackets'] / bracket_health['brackets_checked']
                
                if inconsistency_ratio > MAX_BRACKET_INCONSISTENCY_RATIO:
                    bracket_health['status'] = 'unhealthy'
                elif inconsistency_ratio > 0.02:  # More than 2% inconsistent
                    bracket_health['status'] = 'warning'
            
        except Exception as e:
            bracket_health['status'] = 'error'
            bracket_health['issues'].append(f"Bracket integrity check failed: {str(e)}")
            logger.error(f"Bracket integrity check failed: {e}")
        
        return bracket_health
    
    def _check_registration_system(self) -> Dict[str, Any]:
        """Check tournament registration system health."""
        registration_health = {
            'status': 'healthy',
            'recent_registrations': 0,
            'successful_registrations': 0,
            'failed_registrations': 0,
            'success_rate': 1.0,
            'issues': []
        }
        
        try:
            from apps.tournaments.models import TournamentRegistration
            
            # Check recent registrations (last 24 hours)
            recent_cutoff = timezone.now() - timedelta(hours=24)
            recent_registrations = TournamentRegistration.objects.filter(
                created_at__gte=recent_cutoff
            )
            
            registration_health['recent_registrations'] = recent_registrations.count()
            registration_health['successful_registrations'] = recent_registrations.filter(
                status__in=['confirmed', 'pending']
            ).count()
            registration_health['failed_registrations'] = recent_registrations.filter(
                status__in=['rejected', 'cancelled']
            ).count()
            
            # Calculate success rate
            if registration_health['recent_registrations'] > 0:
                registration_health['success_rate'] = (
                    registration_health['successful_registrations'] / registration_health['recent_registrations']
                )
                
                if registration_health['success_rate'] < MIN_REGISTRATION_SUCCESS_RATE:
                    registration_health['status'] = 'warning'
                    registration_health['issues'].append(
                        f"Low registration success rate: {registration_health['success_rate']:.2%}"
                    )
            
            # Check for registration bottlenecks
            peak_registrations = recent_registrations.extra(
                select={'hour': "strftime('%%H', created_at)"}
            ).values('hour').annotate(count=Count('id')).order_by('-count').first()
            
            if peak_registrations and peak_registrations['count'] > 50:
                registration_health['issues'].append(
                    f"High registration volume detected: {peak_registrations['count']} in hour {peak_registrations['hour']}"
                )
        
        except Exception as e:
            registration_health['status'] = 'error'
            registration_health['issues'].append(f"Registration system check failed: {str(e)}")
            logger.error(f"Registration system health check failed: {e}")
        
        return registration_health
    
    def _check_circuit_breakers(self) -> Dict[str, Any]:
        """Check circuit breaker status."""
        try:
            cb_status = get_tournament_circuit_breaker_status()
            
            return {
                'status': 'healthy' if cb_status['overall_healthy'] else 'unhealthy',
                'overall_healthy': cb_status['overall_healthy'],
                'breaker_count': len(cb_status['breakers']),
                'open_breakers': [
                    name for name, breaker in cb_status['breakers'].items() 
                    if breaker['state'] == 'open'
                ],
                'details': cb_status['breakers']
            }
        
        except Exception as e:
            logger.error(f"Circuit breaker health check failed: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _check_performance_metrics(self) -> Dict[str, Any]:
        """Check tournament system performance metrics."""
        perf_health = {
            'status': 'healthy',
            'avg_response_time_ms': 0,
            'slow_operations': [],
            'cache_hit_rate': 0.0,
            'issues': []
        }
        
        try:
            # Simulate performance checks
            start_time = time.time()
            
            # Test database query performance
            from apps.tournaments.models import Tournament
            Tournament.objects.filter(status='in_progress').count()
            
            query_time = (time.time() - start_time) * 1000
            perf_health['avg_response_time_ms'] = int(query_time)
            
            if query_time > 1000:  # More than 1 second
                perf_health['status'] = 'warning'
                perf_health['issues'].append(f"Slow database queries: {query_time:.0f}ms")
            
            # Check cache performance (simplified)
            cache_test_key = f"health_check_{int(time.time())}"
            cache.set(cache_test_key, "test", 60)
            cache_result = cache.get(cache_test_key)
            
            if cache_result == "test":
                perf_health['cache_hit_rate'] = 1.0
                cache.delete(cache_test_key)
            else:
                perf_health['cache_hit_rate'] = 0.0
                perf_health['issues'].append("Cache not functioning properly")
        
        except Exception as e:
            perf_health['status'] = 'error'
            perf_health['issues'].append(f"Performance check failed: {str(e)}")
            logger.error(f"Performance health check failed: {e}")
        
        return perf_health
    
    def _check_prize_distribution(self) -> Dict[str, Any]:
        """Check prize distribution integrity."""
        prize_health = {
            'status': 'healthy',
            'tournaments_with_prizes': 0,
            'total_prize_value': 0,
            'prize_issues': [],
            'issues': []
        }
        
        try:
            from apps.tournaments.models import Tournament, Prize
            
            # Check tournaments with prizes
            tournaments_with_prizes = Tournament.objects.filter(
                prizes__isnull=False
            ).distinct()[:20]
            
            prize_health['tournaments_with_prizes'] = tournaments_with_prizes.count()
            
            total_prize_value = Decimal('0.00')
            
            for tournament in tournaments_with_prizes:
                try:
                    prizes = tournament.prizes.all()
                    tournament_prize_total = sum(
                        p.cash_value for p in prizes if p.cash_value
                    )
                    
                    total_prize_value += tournament_prize_total
                    
                    # Check if prizes exceed registration fees
                    if tournament.registration_fee > 0:
                        max_possible_pool = tournament.current_teams_count * tournament.registration_fee
                        
                        if tournament_prize_total > max_possible_pool:
                            prize_health['prize_issues'].append({
                                'tournament_id': str(tournament.id),
                                'name': tournament.name,
                                'issue': 'prizes_exceed_pool',
                                'prize_total': float(tournament_prize_total),
                                'max_pool': float(max_possible_pool)
                            })
                
                except Exception as e:
                    logger.warning(f"Error checking prizes for tournament {tournament.id}: {e}")
                    continue
            
            prize_health['total_prize_value'] = float(total_prize_value)
            
            if len(prize_health['prize_issues']) > 0:
                prize_health['status'] = 'warning'
                prize_health['issues'].append(
                    f"{len(prize_health['prize_issues'])} tournaments have prize distribution issues"
                )
        
        except Exception as e:
            prize_health['status'] = 'error'
            prize_health['issues'].append(f"Prize distribution check failed: {str(e)}")
            logger.error(f"Prize distribution health check failed: {e}")
        
        return prize_health
    
    def _check_system_activity(self) -> Dict[str, Any]:
        """Check recent tournament system activity."""
        activity_health = {
            'status': 'healthy',
            'last_24h_activity': {},
            'trends': {},
            'issues': []
        }
        
        try:
            from apps.tournaments.models import Tournament, TournamentRegistration, Match
            
            cutoff_24h = timezone.now() - timedelta(hours=24)
            cutoff_7d = timezone.now() - timedelta(days=7)
            
            # Tournament activity
            activity_health['last_24h_activity']['tournaments_created'] = Tournament.objects.filter(
                created_at__gte=cutoff_24h
            ).count()
            
            activity_health['last_24h_activity']['tournaments_started'] = Tournament.objects.filter(
                status='in_progress',
                modified_at__gte=cutoff_24h
            ).count()
            
            # Registration activity
            activity_health['last_24h_activity']['new_registrations'] = TournamentRegistration.objects.filter(
                created_at__gte=cutoff_24h
            ).count()
            
            # Match activity
            activity_health['last_24h_activity']['matches_completed'] = Match.objects.filter(
                status='completed',
                actual_end_time__gte=cutoff_24h
            ).count()
            
            # Weekly comparison for trends
            week_tournaments = Tournament.objects.filter(created_at__gte=cutoff_7d).count()
            week_registrations = TournamentRegistration.objects.filter(created_at__gte=cutoff_7d).count()
            
            daily_avg_tournaments = week_tournaments / 7
            daily_avg_registrations = week_registrations / 7
            
            activity_health['trends']['avg_tournaments_per_day'] = round(daily_avg_tournaments, 1)
            activity_health['trends']['avg_registrations_per_day'] = round(daily_avg_registrations, 1)
            
            # Check for unusual inactivity
            if (activity_health['last_24h_activity']['tournaments_created'] == 0 and
                activity_health['last_24h_activity']['new_registrations'] == 0 and
                daily_avg_registrations > 1):
                activity_health['status'] = 'warning'
                activity_health['issues'].append("Unusually low system activity detected")
        
        except Exception as e:
            activity_health['status'] = 'error'
            activity_health['issues'].append(f"System activity check failed: {str(e)}")
            logger.error(f"System activity health check failed: {e}")
        
        return activity_health
    
    def _check_individual_tournaments(self) -> Dict[str, Any]:
        """Detailed health check of individual tournaments."""
        detailed_health = {
            'status': 'healthy',
            'tournaments_checked': 0,
            'healthy_tournaments': 0,
            'problematic_tournaments': [],
            'issues': []
        }
        
        try:
            from apps.tournaments.models import Tournament
            
            # Check recent important tournaments
            recent_tournaments = Tournament.objects.filter(
                Q(status__in=['in_progress', 'registration_open']) |
                Q(modified_at__gte=timezone.now() - timedelta(hours=6))
            )[:15]  # Limit to 15 for performance
            
            validator = TournamentIntegrityValidator()
            
            for tournament in recent_tournaments:
                try:
                    detailed_health['tournaments_checked'] += 1
                    tournament_issues = []
                    
                    # Structure validation
                    structure_result = validator.validate_tournament_structure(tournament)
                    if not structure_result['is_valid']:
                        tournament_issues.extend(structure_result['errors'][:2])  # Limit errors
                    
                    # Bracket validation for bracket tournaments
                    if tournament.format in ['elimination', 'double_elimination'] and tournament.status == 'in_progress':
                        bracket_result = validator.validate_bracket_consistency(tournament)
                        if not bracket_result['is_consistent']:
                            tournament_issues.extend(bracket_result['errors'][:2])
                    
                    if tournament_issues:
                        detailed_health['problematic_tournaments'].append({
                            'tournament_id': str(tournament.id),
                            'name': tournament.name,
                            'status': tournament.status,
                            'issues': tournament_issues
                        })
                    else:
                        detailed_health['healthy_tournaments'] += 1
                
                except Exception as e:
                    logger.warning(f"Error in detailed check for tournament {tournament.id}: {e}")
                    continue
            
            # Determine status
            if detailed_health['tournaments_checked'] > 0:
                healthy_ratio = detailed_health['healthy_tournaments'] / detailed_health['tournaments_checked']
                
                if healthy_ratio < 0.8:  # Less than 80% healthy
                    detailed_health['status'] = 'warning'
                elif healthy_ratio < 0.6:  # Less than 60% healthy
                    detailed_health['status'] = 'unhealthy'
        
        except Exception as e:
            detailed_health['status'] = 'error'
            detailed_health['issues'].append(f"Detailed tournament check failed: {str(e)}")
            logger.error(f"Detailed tournament health check failed: {e}")
        
        return detailed_health
    
    def _calculate_overall_health(self, checks: Dict[str, Any]) -> bool:
        """Calculate overall system health based on individual checks."""
        critical_checks = ['database', 'tournament_integrity', 'bracket_consistency']
        warning_checks = ['active_tournaments', 'registration_system', 'circuit_breakers']
        
        # Critical checks must be healthy
        for check_name in critical_checks:
            if check_name in checks:
                check_status = checks[check_name].get('status', 'healthy')
                if check_status in ['unhealthy', 'error']:
                    return False
        
        # Count warning-level issues
        warning_count = 0
        for check_name in warning_checks:
            if check_name in checks:
                check_status = checks[check_name].get('status', 'healthy')
                if check_status in ['warning', 'unhealthy', 'error']:
                    warning_count += 1
        
        # Overall unhealthy if too many warnings
        return warning_count <= 2
    
    def _generate_health_summary(self, checks: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary statistics from health checks."""
        summary = {
            'total_checks': len(checks),
            'healthy_checks': 0,
            'warning_checks': 0,
            'unhealthy_checks': 0,
            'error_checks': 0
        }
        
        for check_name, check_data in checks.items():
            status = check_data.get('status', 'unknown')
            
            if status == 'healthy':
                summary['healthy_checks'] += 1
            elif status == 'warning':
                summary['warning_checks'] += 1
            elif status == 'unhealthy':
                summary['unhealthy_checks'] += 1
            elif status == 'error':
                summary['error_checks'] += 1
        
        summary['health_percentage'] = (
            summary['healthy_checks'] / summary['total_checks'] * 100
            if summary['total_checks'] > 0 else 0
        )
        
        return summary
    
    def _generate_recommendations(self, checks: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on health check results."""
        recommendations = []
        
        # Database recommendations
        if 'database' in checks and checks['database'].get('status') == 'slow':
            recommendations.append("Consider optimizing database queries or adding indexes")
        
        # Tournament integrity recommendations
        if 'tournament_integrity' in checks and checks['tournament_integrity'].get('integrity_issues', 0) > 0:
            recommendations.append("Review and fix tournament data integrity issues")
        
        # Bracket recommendations
        if 'bracket_consistency' in checks and checks['bracket_consistency'].get('inconsistent_brackets', 0) > 0:
            recommendations.append("Investigate and repair bracket inconsistencies")
        
        # Registration recommendations
        if 'registration_system' in checks:
            reg_data = checks['registration_system']
            if reg_data.get('success_rate', 1.0) < MIN_REGISTRATION_SUCCESS_RATE:
                recommendations.append("Investigate registration failures and improve success rate")
        
        # Circuit breaker recommendations
        if 'circuit_breakers' in checks:
            cb_data = checks['circuit_breakers']
            if cb_data.get('open_breakers'):
                recommendations.append(f"Address issues causing circuit breaker trips: {cb_data['open_breakers']}")
        
        # Performance recommendations
        if 'performance' in checks and checks['performance'].get('avg_response_time_ms', 0) > 500:
            recommendations.append("Optimize system performance - response times are elevated")
        
        return recommendations


# Convenience functions for easy health checking
def check_active_tournaments() -> Dict[str, Any]:
    """Quick check of active tournament health."""
    monitor = TournamentHealthMonitor()
    return monitor._check_active_tournaments()


def check_bracket_integrity() -> Dict[str, Any]:
    """Quick check of bracket integrity across tournaments."""
    monitor = TournamentHealthMonitor()
    return monitor._check_bracket_integrity()


def check_pending_matches() -> Dict[str, Any]:
    """Check for matches that need attention."""
    check_result = {
        'status': 'healthy',
        'pending_matches': 0,
        'overdue_matches': 0,
        'issues': []
    }
    
    try:
        from apps.tournaments.models import Match
        
        now = timezone.now()
        
        # Check scheduled matches
        pending_matches = Match.objects.filter(status='scheduled')
        check_result['pending_matches'] = pending_matches.count()
        
        # Check overdue matches (scheduled for more than 2 hours ago)
        overdue_cutoff = now - timedelta(hours=2)
        overdue_matches = pending_matches.filter(scheduled_date__lt=overdue_cutoff)
        check_result['overdue_matches'] = overdue_matches.count()
        
        if check_result['overdue_matches'] > 0:
            check_result['status'] = 'warning'
            check_result['issues'].append(f"{check_result['overdue_matches']} matches are overdue")
        
        # Check in-progress matches that might be stuck
        long_running_matches = Match.objects.filter(
            status='in_progress',
            actual_start_time__lt=now - timedelta(hours=4)
        )
        
        if long_running_matches.exists():
            check_result['issues'].append(f"{long_running_matches.count()} matches running for >4 hours")
            if check_result['status'] == 'healthy':
                check_result['status'] = 'warning'
    
    except Exception as e:
        check_result['status'] = 'error'
        check_result['issues'].append(f"Error checking matches: {str(e)}")
        logger.error(f"Pending matches check failed: {e}")
    
    return check_result


def check_prize_distribution() -> Dict[str, Any]:
    """Check prize distribution across tournaments."""
    monitor = TournamentHealthMonitor()
    return monitor._check_prize_distribution()


def get_tournament_health_status() -> Dict[str, Any]:
    """Get cached tournament health status or perform new check."""
    monitor = TournamentHealthMonitor()
    
    # Try cache first
    cached_status = cache.get(monitor.health_cache_key)
    if cached_status:
        cached_status['from_cache'] = True
        return cached_status
    
    # Perform new check
    return monitor.check_overall_health(include_detailed=False)