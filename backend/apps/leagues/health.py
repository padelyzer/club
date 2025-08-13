"""
League module health monitoring and diagnostics.
Provides comprehensive health checks for league operations and data integrity.

CRITICAL: This module monitors league system health and detects issues early.
All health checks are designed to catch problems before they affect users.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from django.db import connection
from django.db.models import Count, Sum, Avg, Max, Min, Q
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

from .models import League, LeagueSeason, LeagueTeam, LeagueMatch, LeagueStanding
from .validators import LeagueIntegrityValidator
from .circuit_breakers import get_all_circuit_breaker_stats

# Configure health check logger
logger = logging.getLogger('leagues.health')

# Health check constants
HEALTH_CHECK_CACHE_TIMEOUT = 300  # 5 minutes
MAX_HEALTH_CHECK_DURATION = 30  # seconds
CRITICAL_ERROR_THRESHOLD = 5
WARNING_THRESHOLD = 10

# Performance thresholds
MAX_QUERY_TIME_MS = 1000
MAX_STANDINGS_CALCULATION_TIME = 5  # seconds
MAX_SEASON_OVERLAP_DAYS = 7
MIN_SEASON_TEAMS_PERCENTAGE = 0.75  # 75% of min_teams


class HealthStatus(Enum):
    """Health check status levels."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Individual health check result."""
    name: str
    status: HealthStatus
    message: str
    details: Dict[str, Any]
    duration_ms: float
    timestamp: datetime


class LeagueModuleHealth:
    """
    CRITICAL: Comprehensive health monitoring for the league module.
    Performs 6 specialized health checks to ensure league system stability.
    """
    
    def __init__(self):
        self.health_checks = []
        self.overall_status = HealthStatus.UNKNOWN
        self.check_results = {}
    
    def run_full_health_check(self) -> Dict[str, Any]:
        """
        Run complete health check suite for league module.
        
        Returns:
            Comprehensive health report
        """
        start_time = time.time()
        
        logger.info("Starting league module health check")
        
        try:
            # Run all health checks
            self._check_database_connectivity()
            self._check_standings_integrity()
            self._check_season_consistency()
            self._check_match_scheduling_health()
            self._check_performance_metrics()
            self._check_circuit_breaker_status()
            
            # Determine overall health
            self._calculate_overall_health()
            
            duration = time.time() - start_time
            
            health_report = {
                'overall_status': self.overall_status.value,
                'check_results': {name: {
                    'status': result.status.value,
                    'message': result.message,
                    'details': result.details,
                    'duration_ms': result.duration_ms
                } for name, result in self.check_results.items()},
                'summary': self._generate_health_summary(),
                'recommendations': self._generate_health_recommendations(),
                'total_duration_ms': duration * 1000,
                'timestamp': timezone.now().isoformat(),
                'environment': getattr(settings, 'ENVIRONMENT', 'unknown')
            }
            
            # Cache health report
            cache.set('league_health_report', health_report, HEALTH_CHECK_CACHE_TIMEOUT)
            
            logger.info(f"League health check completed: {self.overall_status.value} in {duration:.2f}s")
            return health_report
            
        except Exception as e:
            logger.critical(f"League health check failed: {str(e)}")
            return {
                'overall_status': HealthStatus.CRITICAL.value,
                'error': str(e),
                'timestamp': timezone.now().isoformat(),
                'total_duration_ms': (time.time() - start_time) * 1000
            }
    
    def get_cached_health_report(self) -> Optional[Dict[str, Any]]:
        """Get cached health report if available."""
        return cache.get('league_health_report')
    
    def _check_database_connectivity(self):
        """Check database connectivity and basic query performance."""
        start_time = time.time()
        
        try:
            # Test basic connectivity
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # Test league table access
            league_count = League.objects.count()
            season_count = LeagueSeason.objects.count()
            
            # Test query performance
            query_start = time.time()
            active_seasons = LeagueSeason.objects.filter(
                status__in=['active', 'in_progress']
            ).count()
            query_duration = (time.time() - query_start) * 1000
            
            details = {
                'total_leagues': league_count,
                'total_seasons': season_count,
                'active_seasons': active_seasons,
                'query_performance_ms': query_duration
            }
            
            if query_duration > MAX_QUERY_TIME_MS:
                status = HealthStatus.WARNING
                message = f"Slow database queries: {query_duration:.2f}ms"
            else:
                status = HealthStatus.HEALTHY
                message = f"Database connectivity healthy ({query_duration:.2f}ms)"
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            message = f"Database connectivity failed: {str(e)}"
            details = {'error': str(e)}
        
        duration = (time.time() - start_time) * 1000
        self.check_results['database_connectivity'] = HealthCheckResult(
            'database_connectivity', status, message, details, duration, timezone.now()
        )
    
    def _check_standings_integrity(self):
        """Check league standings data integrity and consistency."""
        start_time = time.time()
        
        try:
            issues_found = []
            total_standings = 0
            corrupted_standings = 0
            
            # Get all active seasons
            active_seasons = LeagueSeason.objects.filter(
                status__in=['active', 'in_progress']
            )
            
            for season in active_seasons:
                standings = list(season.standings.all())
                total_standings += len(standings)
                
                # Check for duplicate positions
                positions = [s.position for s in standings if s.position > 0]
                if len(positions) != len(set(positions)):
                    issues_found.append(f"Duplicate positions in season {season.id}")
                    corrupted_standings += 1
                
                # Check standings completeness
                active_teams = season.teams.filter(status='active').count()
                if len(standings) != active_teams and active_teams > 0:
                    issues_found.append(f"Incomplete standings in season {season.id}: {len(standings)}/{active_teams}")
                    corrupted_standings += 1
                
                # Check mathematical consistency
                for standing in standings:
                    if standing.matches_won + standing.matches_drawn + standing.matches_lost != standing.matches_played:
                        issues_found.append(f"Math error in standings for team {standing.team.id}")
                        corrupted_standings += 1
            
            details = {
                'total_standings_checked': total_standings,
                'corrupted_standings': corrupted_standings,
                'active_seasons_checked': len(active_seasons),
                'issues_found': issues_found[:10]  # Limit to first 10 issues
            }
            
            if corrupted_standings > CRITICAL_ERROR_THRESHOLD:
                status = HealthStatus.CRITICAL
                message = f"Critical standings corruption: {corrupted_standings} corrupted"
            elif corrupted_standings > 0:
                status = HealthStatus.WARNING
                message = f"Standings issues detected: {corrupted_standings} problems"
            else:
                status = HealthStatus.HEALTHY
                message = f"Standings integrity healthy ({total_standings} checked)"
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            message = f"Standings integrity check failed: {str(e)}"
            details = {'error': str(e)}
        
        duration = (time.time() - start_time) * 1000
        self.check_results['standings_integrity'] = HealthCheckResult(
            'standings_integrity', status, message, details, duration, timezone.now()
        )
    
    def _check_season_consistency(self):
        """Check season data consistency and overlap detection."""
        start_time = time.time()
        
        try:
            issues_found = []
            total_seasons = 0
            inconsistent_seasons = 0
            
            # Check all seasons from last 2 years
            cutoff_date = timezone.now().date() - timedelta(days=730)
            recent_seasons = LeagueSeason.objects.filter(
                start_date__gte=cutoff_date
            ).select_related('league')
            
            total_seasons = len(recent_seasons)
            
            # Group seasons by league for overlap checking
            leagues_seasons = {}
            for season in recent_seasons:
                if season.league.id not in leagues_seasons:
                    leagues_seasons[season.league.id] = []
                leagues_seasons[season.league.id].append(season)
            
            # Check for overlaps and inconsistencies
            for league_id, seasons in leagues_seasons.items():
                # Sort seasons by start date
                seasons.sort(key=lambda s: s.start_date)
                
                for i, season in enumerate(seasons):
                    # Check date consistency
                    if season.start_date >= season.end_date:
                        issues_found.append(f"Invalid dates in season {season.id}")
                        inconsistent_seasons += 1
                    
                    # Check overlap with next season
                    if i < len(seasons) - 1:
                        next_season = seasons[i + 1]
                        overlap_days = (season.end_date - next_season.start_date).days
                        if overlap_days > MAX_SEASON_OVERLAP_DAYS:
                            issues_found.append(f"Season overlap: {season.id} and {next_season.id}")
                            inconsistent_seasons += 1
                    
                    # Check team count consistency
                    min_teams = season.league.min_teams
                    actual_teams = season.teams_count
                    if actual_teams < min_teams * MIN_SEASON_TEAMS_PERCENTAGE:
                        issues_found.append(f"Low team count in season {season.id}: {actual_teams}/{min_teams}")
            
            details = {
                'total_seasons_checked': total_seasons,
                'inconsistent_seasons': inconsistent_seasons,
                'leagues_checked': len(leagues_seasons),
                'issues_found': issues_found[:10]
            }
            
            if inconsistent_seasons > CRITICAL_ERROR_THRESHOLD:
                status = HealthStatus.CRITICAL
                message = f"Critical season inconsistencies: {inconsistent_seasons} problems"
            elif inconsistent_seasons > 0:
                status = HealthStatus.WARNING
                message = f"Season consistency issues: {inconsistent_seasons} problems"
            else:
                status = HealthStatus.HEALTHY
                message = f"Season consistency healthy ({total_seasons} checked)"
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            message = f"Season consistency check failed: {str(e)}"
            details = {'error': str(e)}
        
        duration = (time.time() - start_time) * 1000
        self.check_results['season_consistency'] = HealthCheckResult(
            'season_consistency', status, message, details, duration, timezone.now()
        )
    
    def _check_match_scheduling_health(self):
        """Check match scheduling and fixture consistency."""
        start_time = time.time()
        
        try:
            issues_found = []
            scheduling_problems = 0
            
            # Check recent matches (last 30 days)
            cutoff_date = timezone.now() - timedelta(days=30)
            recent_matches = LeagueMatch.objects.filter(
                scheduled_date__gte=cutoff_date
            ).select_related('season', 'home_team', 'away_team', 'court')
            
            total_matches = len(recent_matches)
            
            # Check for venue conflicts
            venue_conflicts = self._find_venue_conflicts(recent_matches)
            if venue_conflicts:
                scheduling_problems += len(venue_conflicts)
                issues_found.extend([f"Venue conflict: {conflict}" for conflict in venue_conflicts[:5]])
            
            # Check for team scheduling conflicts
            team_conflicts = self._find_team_conflicts(recent_matches)
            if team_conflicts:
                scheduling_problems += len(team_conflicts)
                issues_found.extend([f"Team conflict: {conflict}" for conflict in team_conflicts[:5]])
            
            # Check match distribution
            distribution_issues = self._check_match_distribution(recent_matches)
            scheduling_problems += distribution_issues
            
            # Check for orphaned matches
            orphaned_matches = 0
            for match in recent_matches:
                if not match.season or match.season.status == 'cancelled':
                    orphaned_matches += 1
            
            if orphaned_matches > 0:
                issues_found.append(f"{orphaned_matches} orphaned matches found")
                scheduling_problems += orphaned_matches
            
            details = {
                'total_matches_checked': total_matches,
                'scheduling_problems': scheduling_problems,
                'venue_conflicts': len(venue_conflicts) if 'venue_conflicts' in locals() else 0,
                'team_conflicts': len(team_conflicts) if 'team_conflicts' in locals() else 0,
                'orphaned_matches': orphaned_matches,
                'issues_found': issues_found[:10]
            }
            
            if scheduling_problems > CRITICAL_ERROR_THRESHOLD:
                status = HealthStatus.CRITICAL
                message = f"Critical scheduling problems: {scheduling_problems} issues"
            elif scheduling_problems > 0:
                status = HealthStatus.WARNING
                message = f"Scheduling issues detected: {scheduling_problems} problems"
            else:
                status = HealthStatus.HEALTHY
                message = f"Match scheduling healthy ({total_matches} checked)"
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            message = f"Match scheduling check failed: {str(e)}"
            details = {'error': str(e)}
        
        duration = (time.time() - start_time) * 1000
        self.check_results['match_scheduling'] = HealthCheckResult(
            'match_scheduling', status, message, details, duration, timezone.now()
        )
    
    def _check_performance_metrics(self):
        """Check league module performance metrics."""
        start_time = time.time()
        
        try:
            performance_issues = []
            
            # Test standings calculation performance
            calc_start = time.time()
            active_seasons = LeagueSeason.objects.filter(status='in_progress')[:5]  # Limit for testing
            for season in active_seasons:
                # Simulate standings calculation
                season.standings.aggregate(
                    total_points=Sum('points'),
                    avg_points=Avg('points')
                )
            calc_duration = time.time() - calc_start
            
            # Test query performance
            query_start = time.time()
            complex_query = LeagueStanding.objects.select_related(
                'team', 'season', 'season__league'
            ).filter(
                season__status='in_progress'
            )[:100]
            list(complex_query)  # Force evaluation
            query_duration = time.time() - query_start
            
            # Check cache hit rates
            cache_stats = self._get_cache_statistics()
            
            details = {
                'standings_calculation_time': calc_duration,
                'complex_query_time': query_duration,
                'cache_hit_rate': cache_stats.get('hit_rate', 0),
                'active_seasons_tested': len(active_seasons)
            }
            
            if calc_duration > MAX_STANDINGS_CALCULATION_TIME:
                performance_issues.append(f"Slow standings calculation: {calc_duration:.2f}s")
            
            if query_duration > 1.0:  # 1 second threshold
                performance_issues.append(f"Slow query performance: {query_duration:.2f}s")
            
            if cache_stats.get('hit_rate', 1.0) < 0.7:  # Less than 70% hit rate
                performance_issues.append(f"Low cache hit rate: {cache_stats['hit_rate']:.1%}")
            
            if len(performance_issues) > 2:
                status = HealthStatus.WARNING
                message = f"Performance issues detected: {len(performance_issues)} problems"
            elif len(performance_issues) > 0:
                status = HealthStatus.WARNING
                message = f"Minor performance issues: {performance_issues[0]}"
            else:
                status = HealthStatus.HEALTHY
                message = "Performance metrics healthy"
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            message = f"Performance check failed: {str(e)}"
            details = {'error': str(e)}
        
        duration = (time.time() - start_time) * 1000
        self.check_results['performance_metrics'] = HealthCheckResult(
            'performance_metrics', status, message, details, duration, timezone.now()
        )
    
    def _check_circuit_breaker_status(self):
        """Check circuit breaker health and status."""
        start_time = time.time()
        
        try:
            cb_stats = get_all_circuit_breaker_stats()
            circuit_breaker_issues = []
            
            for name, stats in cb_stats.get('circuit_breakers', {}).items():
                if stats['state'] == 'open':
                    circuit_breaker_issues.append(f"Circuit breaker {name} is OPEN")
                elif stats['failure_rate'] > 0.3:  # >30% failure rate
                    circuit_breaker_issues.append(f"High failure rate in {name}: {stats['failure_rate']:.1%}")
            
            details = {
                'total_circuit_breakers': cb_stats.get('total_breakers', 0),
                'open_circuit_breakers': sum(1 for cb in cb_stats.get('circuit_breakers', {}).values() 
                                           if cb['state'] == 'open'),
                'circuit_breaker_stats': cb_stats,
                'issues_found': circuit_breaker_issues
            }
            
            if len(circuit_breaker_issues) > 1:
                status = HealthStatus.CRITICAL
                message = f"Multiple circuit breaker issues: {len(circuit_breaker_issues)} problems"
            elif len(circuit_breaker_issues) == 1:
                status = HealthStatus.WARNING
                message = f"Circuit breaker issue: {circuit_breaker_issues[0]}"
            else:
                status = HealthStatus.HEALTHY
                message = "Circuit breakers healthy"
            
        except Exception as e:
            status = HealthStatus.WARNING
            message = f"Circuit breaker check failed: {str(e)}"
            details = {'error': str(e)}
        
        duration = (time.time() - start_time) * 1000
        self.check_results['circuit_breakers'] = HealthCheckResult(
            'circuit_breakers', status, message, details, duration, timezone.now()
        )
    
    def _find_venue_conflicts(self, matches):
        """Find venue/court conflicts in matches."""
        conflicts = []
        court_bookings = {}
        
        for match in matches:
            if not match.court:
                continue
                
            key = (match.court.id, match.scheduled_date)
            if key in court_bookings:
                conflicts.append(f"Court {match.court.id} at {match.scheduled_date}")
            else:
                court_bookings[key] = match.id
        
        return conflicts
    
    def _find_team_conflicts(self, matches):
        """Find team scheduling conflicts."""
        conflicts = []
        team_schedules = {}
        
        for match in matches:
            # Check both home and away teams
            for team in [match.home_team, match.away_team]:
                key = (team.id, match.scheduled_date.date())  # Same day conflicts
                
                if key in team_schedules:
                    existing_match = team_schedules[key]
                    # Check if matches are close in time (within 2 hours)
                    time_diff = abs((match.scheduled_date - existing_match.scheduled_date).total_seconds())
                    if time_diff < 7200:  # 2 hours
                        conflicts.append(f"Team {team.id} double-booked on {match.scheduled_date.date()}")
                else:
                    team_schedules[key] = match
        
        return conflicts
    
    def _check_match_distribution(self, matches):
        """Check for uneven match distribution."""
        # This would check for teams with significantly different numbers of matches
        # For now, return 0 as a placeholder
        return 0
    
    def _get_cache_statistics(self):
        """Get cache performance statistics."""
        # This would interface with cache backend to get hit/miss stats
        # For now, return mock data
        return {
            'hit_rate': 0.85,
            'total_requests': 1000,
            'hits': 850,
            'misses': 150
        }
    
    def _calculate_overall_health(self):
        """Calculate overall health status based on individual checks."""
        if not self.check_results:
            self.overall_status = HealthStatus.UNKNOWN
            return
        
        critical_count = sum(1 for result in self.check_results.values() 
                           if result.status == HealthStatus.CRITICAL)
        warning_count = sum(1 for result in self.check_results.values() 
                          if result.status == HealthStatus.WARNING)
        
        if critical_count > 0:
            self.overall_status = HealthStatus.CRITICAL
        elif warning_count > 2:  # More than 2 warnings = overall warning
            self.overall_status = HealthStatus.WARNING
        else:
            self.overall_status = HealthStatus.HEALTHY
    
    def _generate_health_summary(self):
        """Generate summary of health check results."""
        if not self.check_results:
            return "No health checks completed"
        
        total_checks = len(self.check_results)
        healthy_count = sum(1 for result in self.check_results.values() 
                          if result.status == HealthStatus.HEALTHY)
        warning_count = sum(1 for result in self.check_results.values() 
                          if result.status == HealthStatus.WARNING)
        critical_count = sum(1 for result in self.check_results.values() 
                           if result.status == HealthStatus.CRITICAL)
        
        return {
            'total_checks': total_checks,
            'healthy': healthy_count,
            'warning': warning_count,
            'critical': critical_count,
            'overall_status': self.overall_status.value
        }
    
    def _generate_health_recommendations(self):
        """Generate recommendations based on health check results."""
        recommendations = []
        
        for name, result in self.check_results.items():
            if result.status == HealthStatus.CRITICAL:
                recommendations.append(f"URGENT: Address critical issue in {name}: {result.message}")
            elif result.status == HealthStatus.WARNING:
                recommendations.append(f"Review warning in {name}: {result.message}")
        
        if not recommendations:
            recommendations.append("All league systems operating normally")
        
        return recommendations


# Convenience functions
def run_league_health_check() -> Dict[str, Any]:
    """Run complete league health check and return results."""
    health_monitor = LeagueModuleHealth()
    return health_monitor.run_full_health_check()


def get_league_health_status() -> str:
    """Get current league health status (cached if available)."""
    health_monitor = LeagueModuleHealth()
    cached_report = health_monitor.get_cached_health_report()
    
    if cached_report:
        return cached_report.get('overall_status', 'unknown')
    
    # Run quick health check if no cached data
    report = health_monitor.run_full_health_check()
    return report.get('overall_status', 'unknown')


def check_standings_integrity() -> bool:
    """Quick check for standings data integrity."""
    try:
        health_monitor = LeagueModuleHealth()
        health_monitor._check_standings_integrity()
        
        if 'standings_integrity' in health_monitor.check_results:
            return health_monitor.check_results['standings_integrity'].status == HealthStatus.HEALTHY
        
        return False
        
    except Exception as e:
        logger.error(f"Standings integrity check failed: {str(e)}")
        return False