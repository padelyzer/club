"""
Revenue reporting services.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q, F
from django.utils import timezone

from apps.finance.models import Revenue, Payment
from apps.reservations.models import Reservation


class RevenueReportService:
    """Service for generating revenue reports."""
    
    @staticmethod
    def daily_report(date=None, club=None):
        """
        Generate daily revenue report.
        
        Args:
            date: Date for report (default: today)
            club: Filter by club (optional)
            
        Returns:
            Dict with revenue data
        """
        if not date:
            date = timezone.now().date()
        
        # Base queryset
        revenues = Revenue.objects.filter(date=date, is_active=True)
        if club:
            revenues = revenues.filter(club=club)
        
        # Calculate totals
        total = revenues.aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id')
        )
        
        # By payment method
        by_method = revenues.values('payment_method').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('-amount')
        
        # By concept
        by_concept = revenues.values('concept').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('-amount')
        
        # Hourly breakdown (for reservations)
        hourly = []
        reservation_revenues = revenues.filter(concept='reservation')
        for hour in range(6, 23):  # 6 AM to 10 PM
            hour_revenues = reservation_revenues.filter(
                payment__reservation__start_time__hour=hour
            )
            hourly.append({
                'hour': f"{hour:02d}:00",
                'amount': hour_revenues.aggregate(total=Sum('amount'))['total'] or 0,
                'count': hour_revenues.count()
            })
        
        return {
            'date': date,
            'club': club.name if club else 'All clubs',
            'summary': {
                'total_revenue': total['total_amount'] or Decimal('0'),
                'total_transactions': total['total_count'] or 0
            },
            'by_payment_method': list(by_method),
            'by_concept': list(by_concept),
            'hourly_breakdown': hourly
        }
    
    @staticmethod
    def monthly_report(year, month, club=None):
        """
        Generate monthly revenue report.
        
        Args:
            year: Year
            month: Month (1-12)
            club: Filter by club (optional)
            
        Returns:
            Dict with monthly revenue data
        """
        # Get date range
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
        
        # Base queryset
        revenues = Revenue.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            is_active=True
        )
        if club:
            revenues = revenues.filter(club=club)
        
        # Daily breakdown
        daily = revenues.values('date').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('date')
        
        # Week comparison
        weeks = []
        current_date = start_date
        week_num = 1
        while current_date <= end_date:
            week_end = min(current_date + timedelta(days=6), end_date)
            week_revenues = revenues.filter(
                date__gte=current_date,
                date__lte=week_end
            )
            weeks.append({
                'week': week_num,
                'start_date': current_date,
                'end_date': week_end,
                'revenue': week_revenues.aggregate(total=Sum('amount'))['total'] or 0,
                'transactions': week_revenues.count()
            })
            current_date = week_end + timedelta(days=1)
            week_num += 1
        
        # Calculate totals
        total = revenues.aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id')
        )
        
        # By payment method
        by_method = revenues.values('payment_method').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('-amount')
        
        # By concept
        by_concept = revenues.values('concept').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('-amount')
        
        return {
            'year': year,
            'month': month,
            'club': club.name if club else 'All clubs',
            'date_range': {
                'start': start_date,
                'end': end_date
            },
            'summary': {
                'total_revenue': total['total_amount'] or Decimal('0'),
                'total_transactions': total['total_count'] or 0,
                'daily_average': (total['total_amount'] or 0) / (end_date - start_date).days
            },
            'by_payment_method': list(by_method),
            'by_concept': list(by_concept),
            'daily_breakdown': list(daily),
            'weekly_breakdown': weeks
        }
    
    @staticmethod
    def court_utilization_report(start_date, end_date, club):
        """
        Generate court utilization and revenue report.
        
        Args:
            start_date: Start date
            end_date: End date
            club: Club to analyze
            
        Returns:
            Dict with court utilization data
        """
        # Get reservations with payments
        reservations = Reservation.objects.filter(
            club=club,
            date__gte=start_date,
            date__lte=end_date,
            payment_status='paid'
        ).select_related('court')
        
        # By court
        courts_data = {}
        for court in club.courts.filter(is_active=True):
            court_reservations = reservations.filter(court=court)
            court_revenues = Revenue.objects.filter(
                payment__reservation__court=court,
                date__gte=start_date,
                date__lte=end_date
            )
            
            # Calculate utilization
            total_hours = (end_date - start_date).days * 16  # 6 AM to 10 PM
            reserved_hours = sum([
                (r.end_time.hour + r.end_time.minute/60) - 
                (r.start_time.hour + r.start_time.minute/60)
                for r in court_reservations
            ])
            
            courts_data[court.name] = {
                'court_id': court.id,
                'total_reservations': court_reservations.count(),
                'total_revenue': court_revenues.aggregate(total=Sum('amount'))['total'] or 0,
                'utilization_rate': (reserved_hours / total_hours * 100) if total_hours > 0 else 0,
                'reserved_hours': reserved_hours,
                'average_price_per_hour': (
                    courts_data[court.name]['total_revenue'] / reserved_hours
                ) if reserved_hours > 0 else 0
            }
        
        # Peak hours analysis
        peak_hours = {}
        for hour in range(6, 23):
            hour_reservations = reservations.filter(start_time__hour=hour)
            hour_revenues = Revenue.objects.filter(
                payment__reservation__in=hour_reservations
            )
            peak_hours[f"{hour:02d}:00"] = {
                'reservations': hour_reservations.count(),
                'revenue': hour_revenues.aggregate(total=Sum('amount'))['total'] or 0
            }
        
        return {
            'club': club.name,
            'date_range': {
                'start': start_date,
                'end': end_date
            },
            'courts': courts_data,
            'peak_hours': peak_hours,
            'summary': {
                'total_courts': len(courts_data),
                'total_revenue': sum(c['total_revenue'] for c in courts_data.values()),
                'average_utilization': sum(c['utilization_rate'] for c in courts_data.values()) / len(courts_data) if courts_data else 0
            }
        }
    
    @staticmethod
    def payment_method_analysis(start_date, end_date, club=None):
        """
        Analyze payment methods usage and performance.
        
        Args:
            start_date: Start date
            end_date: End date
            club: Filter by club (optional)
            
        Returns:
            Dict with payment method analysis
        """
        # Base queryset
        payments = Payment.objects.filter(
            processed_at__date__gte=start_date,
            processed_at__date__lte=end_date,
            status='completed'
        )
        if club:
            payments = payments.filter(club=club)
        
        # Analysis by payment method
        methods = {}
        for method in ['cash', 'card', 'transfer', 'stripe', 'oxxo', 'spei']:
            method_payments = payments.filter(payment_method=method)
            method_revenues = Revenue.objects.filter(
                payment__in=method_payments
            )
            
            methods[method] = {
                'total_transactions': method_payments.count(),
                'total_amount': method_payments.aggregate(total=Sum('amount'))['total'] or 0,
                'total_revenue': method_revenues.aggregate(total=Sum('amount'))['total'] or 0,
                'total_fees': method_payments.aggregate(total=Sum('processing_fee'))['total'] or 0,
                'average_transaction': (
                    methods[method]['total_amount'] / methods[method]['total_transactions']
                ) if method_payments.count() > 0 else 0,
                'fee_percentage': (
                    methods[method]['total_fees'] / methods[method]['total_amount'] * 100
                ) if methods[method].get('total_amount', 0) > 0 else 0
            }
        
        # Failed payments analysis
        failed_payments = Payment.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status='failed'
        )
        if club:
            failed_payments = failed_payments.filter(club=club)
        
        failed_by_method = failed_payments.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        return {
            'date_range': {
                'start': start_date,
                'end': end_date
            },
            'club': club.name if club else 'All clubs',
            'payment_methods': methods,
            'failed_payments': {
                'total_count': failed_payments.count(),
                'total_amount': failed_payments.aggregate(total=Sum('amount'))['total'] or 0,
                'by_method': list(failed_by_method)
            },
            'recommendations': RevenueReportService._generate_payment_recommendations(methods)
        }
    
    @staticmethod
    def _generate_payment_recommendations(methods_data):
        """Generate recommendations based on payment method analysis."""
        recommendations = []
        
        # Check for high fee methods
        for method, data in methods_data.items():
            if data['fee_percentage'] > 3:
                recommendations.append({
                    'type': 'high_fees',
                    'method': method,
                    'message': f"{method} has high fees ({data['fee_percentage']:.1f}%). Consider promoting lower-fee methods."
                })
        
        # Check for underutilized methods
        total_transactions = sum(m['total_transactions'] for m in methods_data.values())
        for method, data in methods_data.items():
            if total_transactions > 0:
                usage_percentage = (data['total_transactions'] / total_transactions) * 100
                if usage_percentage < 5 and data['fee_percentage'] < 2:
                    recommendations.append({
                        'type': 'underutilized',
                        'method': method,
                        'message': f"{method} has low fees but only {usage_percentage:.1f}% usage. Consider promoting it."
                    })
        
        return recommendations
