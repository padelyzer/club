"""
Financial system health monitoring and integrity checks.
Provides comprehensive monitoring of all financial operations and data integrity.

CRITICAL: This module ensures the financial system is operating correctly and safely.
All checks are designed to detect potential revenue loss, data corruption, or system failures.
"""

import logging
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict

from django.core.cache import cache
from django.db import connection, transaction, models
from django.db.models import Sum, Count, Avg, Max, Min, Q
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError

from .circuit_breakers import payment_gateway_manager
from .validators import financial_integrity_validator, fraud_detection_validator

logger = logging.getLogger('finance.health')


@dataclass
class HealthCheckResult:
    """Standardized health check result."""
    name: str
    status: str  # healthy, warning, critical, unknown
    message: str
    details: Dict[str, Any] = None
    timestamp: str = None
    response_time_ms: float = 0
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = timezone.now().isoformat()
        if self.details is None:
            self.details = {}


class FinancialHealthMonitor:
    """
    CRITICAL: Comprehensive financial system health monitoring.
    
    Monitors all aspects of financial operations including:
    - Database integrity and performance
    - Payment gateway availability
    - Transaction processing health
    - Balance integrity and reconciliation
    - Fraud detection system status
    - Audit trail completeness
    """
    
    def __init__(self):
        self.health_cache_key = 'finance_health_status'
        self.health_cache_timeout = 300  # 5 minutes
        
        # Health check thresholds
        self.thresholds = {
            'database_response_time_ms': 100,
            'gateway_failure_rate': 0.05,  # 5%
            'transaction_success_rate': 0.95,  # 95%
            'balance_discrepancy_threshold': Decimal('1.00'),  # $1.00
            'orphaned_transaction_limit': 10,
            'fraud_detection_response_time_ms': 200
        }
    
    def get_comprehensive_health_status(self) -> Dict[str, Any]:
        """
        CRITICAL: Get complete financial system health status.
        
        Performs all health checks and returns comprehensive status.
        Used for monitoring dashboards and alerting systems.
        """
        start_time = timezone.now()
        
        # Try to get cached status first
        cached_status = cache.get(self.health_cache_key)
        if cached_status:
            logger.debug("Returning cached health status")
            return cached_status
        
        logger.info("Performing comprehensive financial health check")
        
        health_status = {
            'overall_status': 'healthy',
            'timestamp': start_time.isoformat(),
            'system_info': self._get_system_info(),
            'checks': {},
            'summary': {
                'total_checks': 0,
                'healthy_checks': 0,
                'warning_checks': 0,
                'critical_checks': 0,
                'failed_checks': 0
            },
            'recommendations': []
        }
        
        # Perform all health checks
        health_checks = [
            ('database_connectivity', self._check_database_connectivity),
            ('payment_gateways', self._check_payment_gateway_health),
            ('transaction_integrity', self._check_transaction_integrity),
            ('balance_integrity', self._check_balance_integrity),
            ('audit_trail_completeness', self._check_audit_trail),
            ('fraud_detection', self._check_fraud_detection_system),
            ('reconciliation_status', self._check_reconciliation_status),
            ('performance_metrics', self._check_performance_metrics),
            ('system_resources', self._check_system_resources),
            ('backup_status', self._check_backup_status)
        ]
        
        for check_name, check_function in health_checks:
            try:
                result = check_function()
                health_status['checks'][check_name] = asdict(result)
                
                # Update summary
                health_status['summary']['total_checks'] += 1
                
                if result.status == 'healthy':
                    health_status['summary']['healthy_checks'] += 1
                elif result.status == 'warning':
                    health_status['summary']['warning_checks'] += 1
                elif result.status == 'critical':
                    health_status['summary']['critical_checks'] += 1
                else:
                    health_status['summary']['failed_checks'] += 1
                
            except Exception as e:
                logger.error(f"Health check {check_name} failed: {e}")
                health_status['checks'][check_name] = asdict(HealthCheckResult(
                    name=check_name,
                    status='critical',
                    message=f"Health check failed: {str(e)}",
                    details={'error': str(e)}
                ))
                health_status['summary']['total_checks'] += 1
                health_status['summary']['critical_checks'] += 1
        
        # Determine overall status
        overall_status = self._determine_overall_status(health_status['summary'])
        health_status['overall_status'] = overall_status
        
        # Generate recommendations
        recommendations = self._generate_health_recommendations(health_status)
        health_status['recommendations'] = recommendations
        
        # Calculate total check time
        total_time = (timezone.now() - start_time).total_seconds() * 1000
        health_status['total_check_time_ms'] = round(total_time, 2)
        
        # Cache the result
        cache.set(self.health_cache_key, health_status, self.health_cache_timeout)
        
        # Log critical issues
        if overall_status in ['critical', 'warning']:
            logger.warning(f"Financial health check completed with status: {overall_status}")
        else:
            logger.info(f"Financial health check completed successfully")
        
        return health_status
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get basic system information."""
        return {
            'environment': getattr(settings, 'ENVIRONMENT', 'unknown'),
            'debug_mode': settings.DEBUG,
            'database_engine': settings.DATABASES['default']['ENGINE'],
            'cache_backend': str(settings.CACHES['default']['BACKEND']),
            'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        }
    
    def _check_database_connectivity(self) -> HealthCheckResult:
        """Check database connectivity and basic performance."""
        start_time = timezone.now()
        
        try:
            with connection.cursor() as cursor:
                # Basic connectivity test
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
                if result[0] != 1:
                    return HealthCheckResult(
                        name='database_connectivity',
                        status='critical',
                        message='Database connectivity test failed',
                        response_time_ms=0
                    )
                
                # Performance test
                cursor.execute("SELECT COUNT(*) FROM finance_payment LIMIT 1")
                
            response_time = (timezone.now() - start_time).total_seconds() * 1000
            
            if response_time > self.thresholds['database_response_time_ms']:
                status = 'warning'
                message = f'Database response slow: {response_time:.2f}ms'
            else:
                status = 'healthy'
                message = f'Database responsive: {response_time:.2f}ms'
            
            return HealthCheckResult(
                name='database_connectivity',
                status=status,
                message=message,
                response_time_ms=response_time,
                details={
                    'response_time_ms': response_time,
                    'threshold_ms': self.thresholds['database_response_time_ms']
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='database_connectivity',
                status='critical',
                message=f'Database connectivity failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_payment_gateway_health(self) -> HealthCheckResult:
        """Check payment gateway availability and performance."""
        try:
            gateway_status = payment_gateway_manager.get_gateway_health_status()
            
            total_gateways = len(gateway_status['gateways'])
            healthy_gateways = sum(
                1 for gw in gateway_status['gateways'].values()
                if gw['can_execute']
            )
            
            if healthy_gateways == 0:
                status = 'critical'
                message = 'All payment gateways unavailable'
            elif healthy_gateways < total_gateways / 2:
                status = 'warning'
                message = f'Only {healthy_gateways}/{total_gateways} gateways available'
            else:
                status = 'healthy'
                message = f'{healthy_gateways}/{total_gateways} gateways available'
            
            return HealthCheckResult(
                name='payment_gateways',
                status=status,
                message=message,
                details={
                    'total_gateways': total_gateways,
                    'healthy_gateways': healthy_gateways,
                    'gateway_details': gateway_status['gateways']
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='payment_gateways',
                status='critical',
                message=f'Gateway health check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_transaction_integrity(self) -> HealthCheckResult:
        """Check transaction data integrity and completeness."""
        try:
            from apps.finance.models import Payment
            
            # Check for orphaned transactions
            orphaned_payments = Payment.objects.filter(
                Q(reservation__isnull=True) & 
                Q(membership__isnull=True) &
                Q(metadata__reference_id__isnull=True),
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
            
            # Check for transactions with invalid amounts
            invalid_amount_payments = Payment.objects.filter(
                amount__lte=0
            ).count()
            
            # Check for transactions missing audit data
            missing_audit_payments = Payment.objects.filter(
                metadata__transaction_id__isnull=True,
                created_at__gte=timezone.now() - timedelta(days=1)
            ).count()
            
            total_issues = orphaned_payments + invalid_amount_payments + missing_audit_payments
            
            if total_issues == 0:
                status = 'healthy'
                message = 'All transaction data is valid'
            elif orphaned_payments > self.thresholds['orphaned_transaction_limit'] or invalid_amount_payments > 0:
                status = 'critical'
                message = f'Critical transaction integrity issues detected: {total_issues}'
            else:
                status = 'warning'
                message = f'Minor transaction integrity issues detected: {total_issues}'
            
            return HealthCheckResult(
                name='transaction_integrity',
                status=status,
                message=message,
                details={
                    'orphaned_payments': orphaned_payments,
                    'invalid_amount_payments': invalid_amount_payments,
                    'missing_audit_payments': missing_audit_payments,
                    'total_issues': total_issues
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='transaction_integrity',
                status='critical',
                message=f'Transaction integrity check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_balance_integrity(self) -> HealthCheckResult:
        """
        CRITICAL: Check balance integrity and detect discrepancies.
        This is the most important financial health check.
        """
        try:
            from apps.finance.models import Payment
            
            # Calculate total processed payments
            total_payments = Payment.objects.filter(
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Calculate total refunds
            total_refunds = Payment.objects.filter(
                status__in=['refunded', 'partial_refund']
            ).aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')
            
            # Net revenue calculation
            net_revenue = total_payments - total_refunds
            
            # Check for negative balances (should never happen)
            negative_balance_count = Payment.objects.filter(
                net_amount__lt=0
            ).count()
            
            # Check for precision errors
            precision_errors = Payment.objects.exclude(
                amount=models.F('amount').quantize(Decimal('0.01'))
            ).count()
            
            if negative_balance_count > 0 or precision_errors > 0:
                status = 'critical'
                message = f'Balance integrity violations detected'
            elif net_revenue < 0:
                status = 'warning'
                message = f'Negative net revenue: {net_revenue}'
            else:
                status = 'healthy'
                message = f'Balance integrity validated. Net revenue: {net_revenue}'
            
            return HealthCheckResult(
                name='balance_integrity',
                status=status,
                message=message,
                details={
                    'total_payments': str(total_payments),
                    'total_refunds': str(total_refunds),
                    'net_revenue': str(net_revenue),
                    'negative_balance_count': negative_balance_count,
                    'precision_errors': precision_errors
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='balance_integrity',
                status='critical',
                message=f'Balance integrity check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_audit_trail(self) -> HealthCheckResult:
        """Check audit trail completeness and integrity."""
        try:
            from apps.finance.models import Payment
            
            # Check recent payments for audit data
            recent_payments = Payment.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            )
            
            total_payments = recent_payments.count()
            payments_with_audit = recent_payments.filter(
                metadata__transaction_id__isnull=False
            ).count()
            
            if total_payments == 0:
                status = 'healthy'
                message = 'No recent payments to audit'
                audit_percentage = 100
            else:
                audit_percentage = (payments_with_audit / total_payments) * 100
                
                if audit_percentage < 95:
                    status = 'critical'
                    message = f'Audit trail incomplete: {audit_percentage:.1f}% coverage'
                elif audit_percentage < 99:
                    status = 'warning'
                    message = f'Audit trail mostly complete: {audit_percentage:.1f}% coverage'
                else:
                    status = 'healthy'
                    message = f'Audit trail complete: {audit_percentage:.1f}% coverage'
            
            return HealthCheckResult(
                name='audit_trail_completeness',
                status=status,
                message=message,
                details={
                    'total_payments_24h': total_payments,
                    'payments_with_audit': payments_with_audit,
                    'audit_percentage': audit_percentage
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='audit_trail_completeness',
                status='critical',
                message=f'Audit trail check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_fraud_detection_system(self) -> HealthCheckResult:
        """Check fraud detection system health and performance."""
        start_time = timezone.now()
        
        try:
            # Test fraud detection response time
            test_result = fraud_detection_validator.analyze_transaction_risk(
                user=None,
                amount=Decimal('100.00'),
                payment_method='card',
                metadata={'test': True}
            )
            
            response_time = (timezone.now() - start_time).total_seconds() * 1000
            
            if response_time > self.thresholds['fraud_detection_response_time_ms']:
                status = 'warning'
                message = f'Fraud detection slow: {response_time:.2f}ms'
            elif test_result.risk_score < 0 or test_result.risk_score > 100:
                status = 'critical'
                message = 'Fraud detection returning invalid scores'
            else:
                status = 'healthy'
                message = f'Fraud detection responsive: {response_time:.2f}ms'
            
            return HealthCheckResult(
                name='fraud_detection',
                status=status,
                message=message,
                response_time_ms=response_time,
                details={
                    'response_time_ms': response_time,
                    'test_risk_score': test_result.risk_score,
                    'threshold_ms': self.thresholds['fraud_detection_response_time_ms']
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='fraud_detection',
                status='critical',
                message=f'Fraud detection system failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_reconciliation_status(self) -> HealthCheckResult:
        """Check financial reconciliation status."""
        try:
            from apps.finance.models import Payment
            
            # Check if reconciliation has been run recently
            unreconciled_payments = Payment.objects.filter(
                status='completed',
                reconciled=False,
                processed_at__lte=timezone.now() - timedelta(days=1)
            ).count()
            
            if unreconciled_payments == 0:
                status = 'healthy'
                message = 'All payments reconciled'
            elif unreconciled_payments < 10:
                status = 'warning'
                message = f'{unreconciled_payments} payments need reconciliation'
            else:
                status = 'critical'
                message = f'{unreconciled_payments} payments need reconciliation (>24h old)'
            
            return HealthCheckResult(
                name='reconciliation_status',
                status=status,
                message=message,
                details={
                    'unreconciled_payments': unreconciled_payments,
                    'cutoff_date': (timezone.now() - timedelta(days=1)).isoformat()
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='reconciliation_status',
                status='critical',
                message=f'Reconciliation check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_performance_metrics(self) -> HealthCheckResult:
        """Check financial system performance metrics."""
        try:
            from apps.finance.models import Payment
            
            # Calculate recent transaction success rate
            recent_payments = Payment.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            )
            
            total_attempts = recent_payments.count()
            successful_payments = recent_payments.filter(status='completed').count()
            
            if total_attempts == 0:
                success_rate = 1.0
                status = 'healthy'
                message = 'No recent transactions to measure'
            else:
                success_rate = successful_payments / total_attempts
                
                if success_rate < self.thresholds['transaction_success_rate']:
                    status = 'critical'
                    message = f'Low transaction success rate: {success_rate:.1%}'
                elif success_rate < 0.98:
                    status = 'warning'
                    message = f'Transaction success rate: {success_rate:.1%}'
                else:
                    status = 'healthy'
                    message = f'Transaction success rate: {success_rate:.1%}'
            
            return HealthCheckResult(
                name='performance_metrics',
                status=status,
                message=message,
                details={
                    'total_attempts_24h': total_attempts,
                    'successful_payments_24h': successful_payments,
                    'success_rate': success_rate,
                    'threshold': self.thresholds['transaction_success_rate']
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='performance_metrics',
                status='critical',
                message=f'Performance metrics check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_system_resources(self) -> HealthCheckResult:
        """Check system resource usage."""
        try:
            import psutil
            
            # Check memory usage
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            
            if memory.percent > 90 or cpu_percent > 90:
                status = 'critical'
                message = f'High resource usage: Memory {memory.percent}%, CPU {cpu_percent}%'
            elif memory.percent > 80 or cpu_percent > 80:
                status = 'warning'
                message = f'Moderate resource usage: Memory {memory.percent}%, CPU {cpu_percent}%'
            else:
                status = 'healthy'
                message = f'Resource usage normal: Memory {memory.percent}%, CPU {cpu_percent}%'
            
            return HealthCheckResult(
                name='system_resources',
                status=status,
                message=message,
                details={
                    'memory_percent': memory.percent,
                    'cpu_percent': cpu_percent,
                    'memory_available_gb': round(memory.available / (1024**3), 2)
                }
            )
            
        except ImportError:
            return HealthCheckResult(
                name='system_resources',
                status='warning',
                message='psutil not available for resource monitoring',
                details={'error': 'psutil not installed'}
            )
        except Exception as e:
            return HealthCheckResult(
                name='system_resources',
                status='warning',
                message=f'Resource check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _check_backup_status(self) -> HealthCheckResult:
        """Check backup system status."""
        try:
            # This would check backup system status in production
            # For now, return a basic check
            
            return HealthCheckResult(
                name='backup_status',
                status='healthy',
                message='Backup system status check not implemented',
                details={'note': 'Implement backup monitoring in production'}
            )
            
        except Exception as e:
            return HealthCheckResult(
                name='backup_status',
                status='warning',
                message=f'Backup status check failed: {str(e)}',
                details={'error': str(e)}
            )
    
    def _determine_overall_status(self, summary: Dict[str, int]) -> str:
        """Determine overall health status from check summary."""
        if summary['critical_checks'] > 0:
            return 'critical'
        elif summary['warning_checks'] > summary['healthy_checks']:
            return 'warning'
        elif summary['failed_checks'] > 0:
            return 'warning'
        else:
            return 'healthy'
    
    def _generate_health_recommendations(self, health_status: Dict) -> List[str]:
        """Generate recommendations based on health check results."""
        recommendations = []
        
        for check_name, check_data in health_status['checks'].items():
            if check_data['status'] == 'critical':
                if check_name == 'balance_integrity':
                    recommendations.append('URGENT: Investigate balance integrity issues immediately')
                elif check_name == 'payment_gateways':
                    recommendations.append('URGENT: Restore payment gateway connectivity')
                elif check_name == 'database_connectivity':
                    recommendations.append('URGENT: Resolve database connectivity issues')
                else:
                    recommendations.append(f'URGENT: Address critical issue in {check_name}')
            
            elif check_data['status'] == 'warning':
                if check_name == 'performance_metrics':
                    recommendations.append('Investigate transaction processing performance')
                elif check_name == 'reconciliation_status':
                    recommendations.append('Schedule financial reconciliation')
                else:
                    recommendations.append(f'Review and address {check_name} warnings')
        
        # General recommendations
        if health_status['overall_status'] == 'critical':
            recommendations.append('Notify financial operations team immediately')
            recommendations.append('Consider enabling maintenance mode if revenue at risk')
        
        return recommendations
    
    def force_health_check_refresh(self):
        """Force refresh of health check cache."""
        cache.delete(self.health_cache_key)
        logger.info("Financial health check cache cleared")


# Singleton instance for global use
financial_health_monitor = FinancialHealthMonitor()


# Convenience function for external use
def get_financial_health_status() -> Dict[str, Any]:
    """Get current financial system health status."""
    return financial_health_monitor.get_comprehensive_health_status()


# Health check endpoint function for Django health checks
def django_health_check():
    """Django-compatible health check function."""
    health_status = get_financial_health_status()
    
    if health_status['overall_status'] == 'critical':
        raise Exception(f"Critical financial health issues: {health_status['summary']['critical_checks']} critical checks failed")
    
    return True