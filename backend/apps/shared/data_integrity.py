"""
Data integrity service for maintaining business data consistency.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.management.base import BaseCommand

from apps.finance.models import Payment, Revenue
from apps.reservations.models import Reservation
from apps.clubs.models import Club
from apps.shared.business_validators import RevenueBusinessValidator


class DataIntegrityService:
    """Service for checking and maintaining data integrity."""
    
    @staticmethod
    def check_all_integrity(start_date=None, end_date=None):
        """
        Check data integrity across all business modules.
        
        Args:
            start_date: Start date for check (default: 30 days ago)
            end_date: End date for check (default: today)
            
        Returns:
            Dict with integrity report
        """
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now().date()
        
        report = {
            'period': {
                'start': start_date,
                'end': end_date
            },
            'checks': [],
            'summary': {
                'total_issues': 0,
                'critical_issues': 0,
                'clubs_checked': 0
            }
        }
        
        # Check each active club
        for club in Club.objects.filter(is_active=True):
            club_issues = []
            
            # Check revenue integrity for each day
            current_date = start_date
            while current_date <= end_date:
                validation_result = RevenueBusinessValidator.validate_revenue_integrity(
                    date=current_date,
                    club=club
                )
                
                if not validation_result['is_valid']:
                    club_issues.extend(validation_result['issues'])
                
                current_date += timedelta(days=1)
            
            # Additional club-specific checks
            club_specific_issues = DataIntegrityService._check_club_specific_integrity(
                club, start_date, end_date
            )
            club_issues.extend(club_specific_issues)
            
            report['checks'].append({
                'club': club.name,
                'club_id': club.id,
                'issues': club_issues,
                'issue_count': len(club_issues),
                'status': 'OK' if len(club_issues) == 0 else 'ISSUES_FOUND'
            })
            
            report['summary']['total_issues'] += len(club_issues)
            report['summary']['critical_issues'] += len([
                issue for issue in club_issues 
                if issue.get('type') in ['missing_revenue', 'amount_mismatch']
            ])
        
        report['summary']['clubs_checked'] = Club.objects.filter(is_active=True).count()
        
        return report
    
    @staticmethod
    def _check_club_specific_integrity(club, start_date, end_date):
        """Check club-specific integrity issues."""
        issues = []
        
        # Check 1: Reservations without payments
        unpaid_reservations = Reservation.objects.filter(
            club=club,
            date__range=[start_date, end_date],
            status='confirmed',
            payment_status__in=['pending', 'failed']
        ).count()
        
        if unpaid_reservations > 0:
            issues.append({
                'type': 'unpaid_reservations',
                'message': f"{unpaid_reservations} reservas confirmadas sin pago",
                'severity': 'warning'
            })
        
        # Check 2: Payments without reservations (for reservation payments)
        orphaned_payments = Payment.objects.filter(
            club=club,
            created_at__date__range=[start_date, end_date],
            payment_type='reservation',
            reservation__isnull=True,
            status='completed'
        ).count()
        
        if orphaned_payments > 0:
            issues.append({
                'type': 'orphaned_payments',
                'message': f"{orphaned_payments} pagos de reserva sin reserva asociada",
                'severity': 'critical'
            })
        
        # Check 3: Double payments
        double_payments = []
        reservations_with_payments = Reservation.objects.filter(
            club=club,
            date__range=[start_date, end_date],
            payments__status='completed'
        ).annotate(
            payment_count=models.Count('payments')
        ).filter(payment_count__gt=1)
        
        for reservation in reservations_with_payments:
            if not reservation.is_split_payment:  # Split payments are allowed to have multiple
                double_payments.append(reservation.id)
        
        if double_payments:
            issues.append({
                'type': 'double_payments',
                'message': f"{len(double_payments)} reservas con múltiples pagos",
                'reservation_ids': double_payments,
                'severity': 'warning'
            })
        
        # Check 4: Inconsistent reservation status
        status_inconsistencies = Reservation.objects.filter(
            club=club,
            date__range=[start_date, end_date],
            payment_status='paid',
            status='pending'
        ).count()
        
        if status_inconsistencies > 0:
            issues.append({
                'type': 'status_inconsistency',
                'message': f"{status_inconsistencies} reservas pagadas pero pendientes",
                'severity': 'warning'
            })
        
        return issues
    
    @staticmethod
    @transaction.atomic
    def fix_revenue_integrity_issues(club, date):
        """
        Attempt to fix revenue integrity issues for a specific club and date.
        
        Args:
            club: Club instance
            date: Date to fix
            
        Returns:
            Dict with fix results
        """
        fixes_applied = []
        
        # Get validation result first
        validation_result = RevenueBusinessValidator.validate_revenue_integrity(
            date=date, 
            club=club
        )
        
        if validation_result['is_valid']:
            return {'message': 'No issues found', 'fixes': []}
        
        # Fix 1: Create missing revenue records
        for issue in validation_result['issues']:
            if issue['type'] == 'missing_revenue':
                for payment_id in issue['payment_ids']:
                    try:
                        payment = Payment.objects.get(id=payment_id)
                        
                        # Create missing revenue record
                        Revenue.objects.create(
                            organization=payment.organization,
                            club=payment.club,
                            date=payment.processed_at.date(),
                            concept=payment.payment_type,
                            description=f"Auto-generated from payment {payment.reference_number}",
                            amount=payment.net_amount,
                            payment_method=payment.payment_method,
                            payment=payment,
                            reference=payment.reference_number
                        )
                        
                        fixes_applied.append({
                            'type': 'created_revenue',
                            'payment_id': payment_id,
                            'amount': payment.net_amount
                        })
                        
                    except Payment.DoesNotExist:
                        pass  # Payment was deleted
        
        # Fix 2: Remove orphaned revenues (carefully)
        orphaned_revenues = Revenue.objects.filter(
            club=club,
            date=date,
            payment__isnull=True
        )
        
        orphaned_count = orphaned_revenues.count()
        if orphaned_count > 0:
            # Only delete if they're clearly orphaned (no description or auto-generated)
            safe_to_delete = orphaned_revenues.filter(
                description__icontains='auto-generated'
            )
            
            deleted_count = safe_to_delete.count()
            safe_to_delete.delete()
            
            fixes_applied.append({
                'type': 'removed_orphaned_revenues',
                'count': deleted_count,
                'total_orphaned': orphaned_count
            })
        
        return {
            'club': club.name,
            'date': date,
            'fixes_applied': fixes_applied,
            'fix_count': len(fixes_applied)
        }
    
    @staticmethod
    def generate_integrity_report_html(report):
        """Generate HTML report for integrity check results."""
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>Data Integrity Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; }
        .club-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .ok { border-left: 5px solid #4CAF50; }
        .issues { border-left: 5px solid #f44336; }
        .issue { margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 3px; }
        .critical { background: #f8d7da; }
        .warning { background: #fff3cd; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Data Integrity Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <table>
            <tr><td><strong>Period:</strong></td><td>{start_date} to {end_date}</td></tr>
            <tr><td><strong>Clubs Checked:</strong></td><td>{clubs_checked}</td></tr>
            <tr><td><strong>Total Issues:</strong></td><td>{total_issues}</td></tr>
            <tr><td><strong>Critical Issues:</strong></td><td>{critical_issues}</td></tr>
        </table>
    </div>
    
    <h2>Club Details</h2>
    {club_sections}
    
    <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 5px;">
        <h3>Recommendations</h3>
        <ul>
            <li>Address critical issues immediately (missing revenues, amount mismatches)</li>
            <li>Review warning issues and determine if action is needed</li>
            <li>Run this report daily to catch issues early</li>
            <li>Set up automated alerts for critical integrity violations</li>
        </ul>
    </div>
</body>
</html>
""".format(
            start_date=report['period']['start'],
            end_date=report['period']['end'],
            clubs_checked=report['summary']['clubs_checked'],
            total_issues=report['summary']['total_issues'],
            critical_issues=report['summary']['critical_issues'],
            club_sections='\n'.join([
                DataIntegrityService._format_club_section(club_report)
                for club_report in report["checks"]
            ])
        )
        
        return html
    
    @staticmethod
    def _format_club_section(club_report):
        """Format individual club section for HTML report."""
        status_class = 'ok' if club_report['status'] == 'OK' else 'issues'
        
        issues_html = ''
        if club_report['issues']:
            issues_html = '<h4>Issues Found:</h4>'
            for issue in club_report['issues']:
                severity_class = issue.get('severity', 'warning')
                issues_html += '<div class="issue {}">{}</div>'.format(severity_class, issue["message"])
        else:
            issues_html = '<p style="color: green;">✅ No issues found</p>'
        
        return '<div class="club-section {}"><h3>{} ({} issues)</h3>{}</div>'.format(
            status_class,
            club_report["club"],
            club_report["issue_count"], 
            issues_html
        )


# Django management command for running integrity checks
class IntegrityCheckCommand(BaseCommand):
    """Management command for running data integrity checks."""
    
    help = 'Check data integrity across all business modules'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for check (YYYY-MM-DD)',
            default=(timezone.now().date() - timedelta(days=30)).isoformat()
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for check (YYYY-MM-DD)',
            default=timezone.now().date().isoformat()
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Attempt to fix found issues',
        )
        parser.add_argument(
            '--html-report',
            type=str,
            help='Generate HTML report to file',
        )
    
    def handle(self, *args, **options):
        start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()
        
        self.stdout.write(f"Running integrity check from {start_date} to {end_date}")
        
        # Run integrity check
        report = DataIntegrityService.check_all_integrity(start_date, end_date)
        
        # Display results
        self.stdout.write(f"Checked {report['summary']['clubs_checked']} clubs")
        self.stdout.write(f"Found {report['summary']['total_issues']} total issues")
        self.stdout.write(f"Critical issues: {report['summary']['critical_issues']}")
        
        if options['fix']:
            self.stdout.write("Attempting to fix issues...")
            for club_report in report['checks']:
                if club_report['issues']:
                    # Only fix revenue integrity issues for now
                    club = Club.objects.get(id=club_report['club_id'])
                    current_date = start_date
                    while current_date <= end_date:
                        fix_result = DataIntegrityService.fix_revenue_integrity_issues(
                            club, current_date
                        )
                        if fix_result['fix_count'] > 0:
                            self.stdout.write(f"Applied {fix_result['fix_count']} fixes for {club.name} on {current_date}")
                        current_date += timedelta(days=1)
        
        if options['html_report']:
            html_content = DataIntegrityService.generate_integrity_report_html(report)
            with open(options['html_report'], 'w') as f:
                f.write(html_content)
            self.stdout.write(f"HTML report saved to {options['html_report']}")
        
        # Show summary by club
        for club_report in report['checks']:
            status_color = self.style.SUCCESS if club_report['status'] == 'OK' else self.style.ERROR
            self.stdout.write(
                status_color(f"{club_report['club']}: {club_report['status']} ({club_report['issue_count']} issues)")
            )
