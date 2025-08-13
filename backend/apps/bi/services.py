"""
Services for Business Intelligence module.
"""

import json
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, F, Max, Min, Q, Sum
from django.utils import timezone

from apps.clients.models import ClientProfile  # PlayerStats

# from apps.classes.models import ClassSession, ClassEnrollment
# from apps.tournaments.models import Tournament, TournamentRegistration
from apps.clubs.models import Club

# Temporarily comment out disabled modules to avoid import errors
# from apps.finance.models import Transaction
from apps.reservations.models import Reservation  # ReservationPayment

# Define Transaction as None when finance module is disabled
Transaction = None
ClassEnrollment = None

logger = logging.getLogger(__name__)


class MetricsCalculator:
    """
    Service for calculating various business metrics.
    """

    def __init__(self, metric):
        self.metric = metric
        self.organization = metric.organization
        self.club = metric.club

    def calculate(self, start_date=None, end_date=None):
        """
        Calculate metric value for the specified period.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now()

        try:
            if self.metric.metric_type == "revenue":
                return self._calculate_revenue_metric(start_date, end_date)
            elif self.metric.metric_type == "occupancy":
                return self._calculate_occupancy_metric(start_date, end_date)
            elif self.metric.metric_type == "customers":
                return self._calculate_customer_metric(start_date, end_date)
            elif self.metric.metric_type == "retention":
                return self._calculate_retention_metric(start_date, end_date)
            elif self.metric.metric_type == "growth":
                return self._calculate_growth_metric(start_date, end_date)
            elif self.metric.metric_type == "financial":
                return self._calculate_financial_metric(start_date, end_date)
            elif self.metric.metric_type == "operational":
                return self._calculate_operational_metric(start_date, end_date)
            else:
                return self._calculate_custom_metric(start_date, end_date)
        except Exception as e:
            logger.error(f"Error calculating metric {self.metric.name}: {str(e)}")
            return 0

    def _calculate_revenue_metric(self, start_date, end_date):
        """Calculate revenue-related metrics."""
        # Return 0 if Transaction model is not available
        if Transaction is None:
            return 0

        config = self.metric.calculation_config
        calculation_type = self.metric.calculation_type

        # Base query for revenue transactions
        revenue_query = Transaction.objects.filter(
            organization=self.organization,
            transaction_type="income",
            status="completed",
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
        )

        if self.club:
            revenue_query = revenue_query.filter(club=self.club)

        # Apply category filter if specified
        category = config.get("category")
        if category:
            revenue_query = revenue_query.filter(category=category)

        if calculation_type == "sum":
            return float(revenue_query.aggregate(total=Sum("amount"))["total"] or 0)
        elif calculation_type == "avg":
            return float(revenue_query.aggregate(avg=Avg("amount"))["avg"] or 0)
        elif calculation_type == "count":
            return revenue_query.count()
        else:
            return float(revenue_query.aggregate(total=Sum("amount"))["total"] or 0)

    def _calculate_occupancy_metric(self, start_date, end_date):
        """Calculate court occupancy metrics."""
        config = self.metric.calculation_config
        calculation_type = self.metric.calculation_type

        # Get reservations in period
        reservations_query = Reservation.objects.filter(
            club=self.club,
            date__gte=start_date.date(),
            date__lte=end_date.date(),
            status__in=["confirmed", "completed"],
        )

        if calculation_type == "count":
            return reservations_query.count()
        elif calculation_type == "percentage":
            # Calculate occupancy percentage
            total_reservations = reservations_query.count()

            # Calculate total available slots
            courts_count = self.club.courts.filter(is_active=True).count()
            days_count = (end_date.date() - start_date.date()).days + 1
            hours_per_day = config.get("hours_per_day", 12)  # Default 12 hours

            total_slots = courts_count * days_count * hours_per_day

            if total_slots > 0:
                return (total_reservations / total_slots) * 100
            return 0
        else:
            return reservations_query.count()

    def _calculate_customer_metric(self, start_date, end_date):
        """Calculate customer-related metrics."""
        config = self.metric.calculation_config
        calculation_type = self.metric.calculation_type

        if calculation_type == "count":
            # If Transaction model is not available, count clients with reservations
            if Transaction is None:
                customers = ClientProfile.objects.filter(
                    user__reservations__club=self.club,
                    user__reservations__date__gte=start_date.date(),
                    user__reservations__date__lte=end_date.date(),
                    user__reservations__status__in=["confirmed", "completed"],
                ).distinct()
                return customers.count()

            # Count active customers in period
            customers = ClientProfile.objects.filter(
                user__transactions__organization=self.organization,
                user__transactions__transaction_date__gte=start_date,
                user__transactions__transaction_date__lte=end_date,
            ).distinct()

            if self.club:
                customers = customers.filter(user__transactions__club=self.club)

            return customers.count()

        elif calculation_type == "growth_rate":
            # Calculate customer growth rate
            current_period_customers = (
                ClientProfile.objects.filter(
                    user__transactions__organization=self.organization,
                    user__transactions__transaction_date__gte=start_date,
                    user__transactions__transaction_date__lte=end_date,
                )
                .distinct()
                .count()
            )

            # Previous period
            period_duration = end_date - start_date
            prev_start = start_date - period_duration
            prev_end = start_date

            previous_period_customers = (
                ClientProfile.objects.filter(
                    user__transactions__organization=self.organization,
                    user__transactions__transaction_date__gte=prev_start,
                    user__transactions__transaction_date__lte=prev_end,
                )
                .distinct()
                .count()
            )

            if previous_period_customers > 0:
                growth_rate = (
                    (current_period_customers - previous_period_customers)
                    / previous_period_customers
                ) * 100
                return round(growth_rate, 2)
            return 0

        else:
            return 0

    def _calculate_retention_metric(self, start_date, end_date):
        """Calculate customer retention metrics."""
        config = self.metric.calculation_config

        # Get customers from previous period
        period_duration = end_date - start_date
        prev_start = start_date - period_duration

        previous_customers = set(
            ClientProfile.objects.filter(
                user__transactions__organization=self.organization,
                user__transactions__transaction_date__gte=prev_start,
                user__transactions__transaction_date__lt=start_date,
            )
            .distinct()
            .values_list("id", flat=True)
        )

        current_customers = set(
            ClientProfile.objects.filter(
                user__transactions__organization=self.organization,
                user__transactions__transaction_date__gte=start_date,
                user__transactions__transaction_date__lte=end_date,
            )
            .distinct()
            .values_list("id", flat=True)
        )

        # Calculate retention
        retained_customers = previous_customers.intersection(current_customers)

        if len(previous_customers) > 0:
            retention_rate = (len(retained_customers) / len(previous_customers)) * 100
            return round(retention_rate, 2)
        return 0

    def _calculate_growth_metric(self, start_date, end_date):
        """Calculate growth metrics."""
        config = self.metric.calculation_config
        metric_source = config.get("source", "revenue")

        # Current period value
        current_value = 0
        if metric_source == "revenue":
            current_value = (
                Transaction.objects.filter(
                    organization=self.organization,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

        # Previous period value
        period_duration = end_date - start_date
        prev_start = start_date - period_duration
        prev_end = start_date

        previous_value = 0
        if metric_source == "revenue":
            previous_value = (
                Transaction.objects.filter(
                    organization=self.organization,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=prev_start,
                    transaction_date__lte=prev_end,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

        # Calculate growth rate
        if previous_value > 0:
            growth_rate = (
                (float(current_value) - float(previous_value)) / float(previous_value)
            ) * 100
            return round(growth_rate, 2)
        return 0

    def _calculate_financial_metric(self, start_date, end_date):
        """Calculate financial metrics."""
        config = self.metric.calculation_config
        calculation_type = self.metric.calculation_type
        metric_name = config.get("name", "total_revenue")

        if metric_name == "net_profit":
            # Calculate net profit (revenue - expenses)
            revenue = (
                Transaction.objects.filter(
                    organization=self.organization,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

            expenses = (
                Transaction.objects.filter(
                    organization=self.organization,
                    transaction_type="expense",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

            return float(revenue) - float(expenses)

        elif metric_name == "avg_transaction_value":
            # Average transaction value
            return float(
                Transaction.objects.filter(
                    organization=self.organization,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                ).aggregate(avg=Avg("amount"))["avg"]
                or 0
            )

        else:
            return 0

    def _calculate_operational_metric(self, start_date, end_date):
        """Calculate operational metrics."""
        config = self.metric.calculation_config
        metric_name = config.get("name", "total_bookings")

        if metric_name == "total_bookings":
            return Reservation.objects.filter(
                club=self.club,
                date__gte=start_date.date(),
                date__lte=end_date.date(),
                status__in=["confirmed", "completed"],
            ).count()

        elif metric_name == "cancellation_rate":
            total_reservations = Reservation.objects.filter(
                club=self.club, date__gte=start_date.date(), date__lte=end_date.date()
            ).count()

            cancelled_reservations = Reservation.objects.filter(
                club=self.club,
                date__gte=start_date.date(),
                date__lte=end_date.date(),
                status="cancelled",
            ).count()

            if total_reservations > 0:
                return (cancelled_reservations / total_reservations) * 100
            return 0

        elif metric_name == "class_attendance_rate":
            total_enrollments = ClassEnrollment.objects.filter(
                session__club=self.club,
                session__scheduled_datetime__gte=start_date,
                session__scheduled_datetime__lte=end_date,
                status="enrolled",
            ).count()

            attended = ClassEnrollment.objects.filter(
                session__club=self.club,
                session__scheduled_datetime__gte=start_date,
                session__scheduled_datetime__lte=end_date,
                status="enrolled",
                checked_in=True,
            ).count()

            if total_enrollments > 0:
                return (attended / total_enrollments) * 100
            return 0

        else:
            return 0

    def _calculate_custom_metric(self, start_date, end_date):
        """Calculate custom metrics based on configuration."""
        config = self.metric.calculation_config
        # This would implement custom metric calculation logic
        # For now, return 0
        return 0


class WidgetDataService:
    """
    Service for fetching and processing widget data.
    """

    def __init__(self, widget):
        self.widget = widget

    def get_data(self, start_date=None, end_date=None, filters=None):
        """
        Get data for the widget based on its configuration.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now()

        if self.widget.widget_type == "metric":
            return self._get_metric_data(start_date, end_date)
        elif self.widget.widget_type == "chart":
            return self._get_chart_data(start_date, end_date, filters)
        elif self.widget.widget_type == "table":
            return self._get_table_data(start_date, end_date, filters)
        elif self.widget.widget_type == "gauge":
            return self._get_gauge_data(start_date, end_date)
        else:
            return {}

    def _get_metric_data(self, start_date, end_date):
        """Get data for metric widgets."""
        data = {"metrics": []}

        for metric in self.widget.metrics.all():
            calculator = MetricsCalculator(metric)
            current_value = calculator.calculate(start_date, end_date)

            # Calculate comparison with previous period
            period_duration = end_date - start_date
            prev_start = start_date - period_duration
            prev_value = calculator.calculate(prev_start, start_date)

            change = 0
            change_percent = 0
            if prev_value != 0:
                change = current_value - prev_value
                change_percent = (change / prev_value) * 100

            data["metrics"].append(
                {
                    "name": metric.name,
                    "value": current_value,
                    "formatted_value": f"{current_value:.{metric.decimal_places}f}{metric.unit}",
                    "target_value": (
                        float(metric.target_value) if metric.target_value else None
                    ),
                    "change": change,
                    "change_percent": round(change_percent, 2),
                    "color": metric.color,
                    "icon": metric.icon,
                }
            )

        return data

    def _get_chart_data(self, start_date, end_date, filters):
        """Get data for chart widgets."""
        chart_type = self.widget.chart_type
        data_config = self.widget.data_config

        if chart_type in ["line", "area", "bar"]:
            return self._get_time_series_data(start_date, end_date)
        elif chart_type in ["pie", "doughnut"]:
            return self._get_categorical_data(start_date, end_date)
        else:
            return self._get_time_series_data(start_date, end_date)

    def _get_time_series_data(self, start_date, end_date):
        """Get time series data for line/bar charts."""
        data = {"labels": [], "datasets": []}

        # Generate date labels
        current_date = start_date.date()
        end_date_only = end_date.date()

        while current_date <= end_date_only:
            data["labels"].append(current_date.isoformat())
            current_date += timedelta(days=1)

        # Get data for each metric
        for metric in self.widget.metrics.all():
            metric_data = []
            calculator = MetricsCalculator(metric)

            current_date = start_date.date()
            while current_date <= end_date_only:
                day_start = timezone.make_aware(
                    datetime.combine(current_date, datetime.min.time())
                )
                day_end = timezone.make_aware(
                    datetime.combine(current_date, datetime.max.time())
                )

                value = calculator.calculate(day_start, day_end)
                metric_data.append(value)
                current_date += timedelta(days=1)

            data["datasets"].append(
                {
                    "label": metric.name,
                    "data": metric_data,
                    "borderColor": metric.color,
                    "backgroundColor": f"{metric.color}20",  # Add transparency
                    "tension": 0.1,
                }
            )

        return data

    def _get_categorical_data(self, start_date, end_date):
        """Get categorical data for pie/doughnut charts."""
        data = {"labels": [], "datasets": [{"data": [], "backgroundColor": []}]}

        # For now, use revenue by category as example
        if self.widget.club:
            categories = (
                Transaction.objects.filter(
                    club=self.widget.club,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                )
                .values("category")
                .annotate(total=Sum("amount"))
                .order_by("-total")
            )

            colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]

            for i, category in enumerate(categories):
                data["labels"].append(category["category"].replace("_", " ").title())
                data["datasets"][0]["data"].append(float(category["total"]))
                data["datasets"][0]["backgroundColor"].append(colors[i % len(colors)])

        return data

    def _get_table_data(self, start_date, end_date, filters):
        """Get data for table widgets."""
        data = {"headers": [], "rows": []}

        # Example: Recent transactions table
        if self.widget.club:
            transactions = Transaction.objects.filter(
                club=self.widget.club,
                status="completed",
                transaction_date__gte=start_date,
                transaction_date__lte=end_date,
            ).order_by("-transaction_date")[:50]

            data["headers"] = ["Date", "Type", "Category", "Amount", "Status"]

            for transaction in transactions:
                data["rows"].append(
                    [
                        transaction.transaction_date.strftime("%Y-%m-%d %H:%M"),
                        transaction.get_transaction_type_display(),
                        transaction.get_category_display(),
                        f"${transaction.amount:,.2f}",
                        transaction.get_status_display(),
                    ]
                )

        return data

    def _get_gauge_data(self, start_date, end_date):
        """Get data for gauge widgets."""
        if self.widget.metrics.exists():
            metric = self.widget.metrics.first()
            calculator = MetricsCalculator(metric)
            current_value = calculator.calculate(start_date, end_date)

            return {
                "value": current_value,
                "max": (
                    float(metric.target_value)
                    if metric.target_value
                    else current_value * 1.2
                ),
                "min": 0,
                "color": metric.color,
                "formatted_value": f"{current_value:.{metric.decimal_places}f}{metric.unit}",
            }

        return {"value": 0, "max": 100, "min": 0}


class ReportGenerator:
    """
    Service for generating reports.
    """

    def __init__(self, report):
        self.report = report

    def generate(self, start_date=None, end_date=None):
        """
        Generate report data.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now()

        report_data = {
            "report_name": self.report.name,
            "report_type": self.report.report_type,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "generated_at": timezone.now().isoformat(),
            "metrics": [],
            "widgets": [],
            "summary": {},
        }

        # Generate metric data
        for metric in self.report.metrics.all():
            calculator = MetricsCalculator(metric)
            value = calculator.calculate(start_date, end_date)

            report_data["metrics"].append(
                {
                    "name": metric.name,
                    "type": metric.metric_type,
                    "value": value,
                    "unit": metric.unit,
                    "target": (
                        float(metric.target_value) if metric.target_value else None
                    ),
                }
            )

        # Generate widget data
        for widget in self.report.widgets.all():
            service = WidgetDataService(widget)
            widget_data = service.get_data(start_date, end_date)

            report_data["widgets"].append(
                {"name": widget.name, "type": widget.widget_type, "data": widget_data}
            )

        # Generate summary
        report_data["summary"] = self._generate_summary(start_date, end_date)

        # Update report status
        self.report.last_generated = timezone.now()
        self.report.calculate_next_generation()
        self.report.save()

        return report_data

    def _generate_summary(self, start_date, end_date):
        """Generate report summary."""
        summary = {}

        if self.report.club:
            # Revenue summary
            revenue = (
                Transaction.objects.filter(
                    club=self.report.club,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

            # Bookings summary
            bookings = Reservation.objects.filter(
                club=self.report.club,
                date__gte=start_date.date(),
                date__lte=end_date.date(),
                status__in=["confirmed", "completed"],
            ).count()

            # Customers summary
            customers = (
                ClientProfile.objects.filter(
                    user__transactions__club=self.report.club,
                    user__transactions__transaction_date__gte=start_date,
                    user__transactions__transaction_date__lte=end_date,
                )
                .distinct()
                .count()
            )

            summary = {
                "total_revenue": float(revenue),
                "total_bookings": bookings,
                "active_customers": customers,
                "avg_booking_value": float(revenue / bookings) if bookings > 0 else 0,
            }

        return summary


class AlertEvaluator:
    """
    Service for evaluating alert conditions.
    """

    def __init__(self, alert):
        self.alert = alert

    def evaluate(self):
        """
        Evaluate alert condition against current metric value.
        """
        try:
            # Calculate current metric value
            calculator = MetricsCalculator(self.alert.metric)
            current_value = calculator.calculate()

            # Check condition
            condition_met = self._check_condition(current_value)

            # Update alert status
            self.alert.last_evaluation = timezone.now()

            if condition_met:
                self.alert.consecutive_triggers += 1

                # Check if we should trigger the alert
                if (
                    self.alert.consecutive_triggers
                    >= self.alert.consecutive_evaluations
                ):
                    if self.alert.status != "triggered":
                        self.alert.trigger()
                        return "triggered"
                    return "already_triggered"
            else:
                # Reset consecutive triggers
                self.alert.consecutive_triggers = 0

                # Auto-resolve if enabled
                if self.alert.auto_resolve and self.alert.status == "triggered":
                    self.alert.resolve()
                    return "resolved"

            self.alert.save()
            return "evaluated"

        except Exception as e:
            logger.error(f"Error evaluating alert {self.alert.name}: {str(e)}")
            return "error"

    def _check_condition(self, current_value):
        """Check if alert condition is met."""
        condition = self.alert.condition
        threshold = float(self.alert.threshold_value)

        if condition == "greater_than":
            return current_value > threshold
        elif condition == "less_than":
            return current_value < threshold
        elif condition == "equals":
            return (
                abs(current_value - threshold) < 0.01
            )  # Allow small floating point differences
        elif condition == "not_equals":
            return abs(current_value - threshold) >= 0.01
        elif condition == "between":
            threshold2 = float(self.alert.threshold_value_secondary)
            return (
                min(threshold, threshold2)
                <= current_value
                <= max(threshold, threshold2)
            )
        elif condition == "outside":
            threshold2 = float(self.alert.threshold_value_secondary)
            return current_value < min(threshold, threshold2) or current_value > max(
                threshold, threshold2
            )

        return False


class AlertNotificationService:
    """
    Service for sending alert notifications.
    """

    def __init__(self, alert):
        self.alert = alert

    def send_notifications(self):
        """Send notifications for triggered alert."""
        try:
            # Email notifications
            self._send_email_notifications()

            # SMS notifications (if configured)
            # self._send_sms_notifications()

            # Push notifications (if configured)
            # self._send_push_notifications()

            logger.info(f"Notifications sent for alert {self.alert.name}")

        except Exception as e:
            logger.error(
                f"Error sending notifications for alert {self.alert.name}: {str(e)}"
            )

    def _send_email_notifications(self):
        """Send email notifications."""
        # This would integrate with your email service
        # For now, just log the notification

        recipients = []

        # Add user emails
        for user in self.alert.notification_users.all():
            if user.email:
                recipients.append(user.email)

        # Add additional emails
        recipients.extend(self.alert.notification_emails)

        if recipients:
            logger.info(
                f"Would send email notification to {recipients} for alert {self.alert.name}"
            )


class ClubAnalyticsService:
    """
    Service for generating club-specific analytics.
    """

    def __init__(self, club):
        self.club = club

    def get_analytics(
        self,
        period="month",
        include_revenue=True,
        include_occupancy=True,
        include_customers=True,
        include_retention=False,
        compare_previous=True,
    ):
        """
        Get comprehensive club analytics.
        """
        end_date = timezone.now()

        if period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        analytics = {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "club": {"id": str(self.club.id), "name": self.club.name},
        }

        if include_revenue:
            analytics["revenue"] = self._get_revenue_analytics(
                start_date, end_date, compare_previous
            )

        if include_occupancy:
            analytics["occupancy"] = self._get_occupancy_analytics(
                start_date, end_date, compare_previous
            )

        if include_customers:
            analytics["customers"] = self._get_customer_analytics(
                start_date, end_date, compare_previous
            )

        if include_retention:
            analytics["retention"] = self._get_retention_analytics(start_date, end_date)

        return analytics

    def _get_revenue_analytics(self, start_date, end_date, compare_previous):
        """Get revenue analytics."""
        # Return empty analytics if Transaction model is not available
        if Transaction is None:
            analytics = {"total": 0, "by_category": []}
            if compare_previous:
                analytics["comparison"] = {
                    "previous_total": 0,
                    "change": 0,
                    "change_percent": 0,
                }
            return analytics

        current_revenue = (
            Transaction.objects.filter(
                club=self.club,
                transaction_type="income",
                status="completed",
                transaction_date__gte=start_date,
                transaction_date__lte=end_date,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        analytics = {"total": float(current_revenue), "by_category": []}

        # Revenue by category
        by_category = (
            Transaction.objects.filter(
                club=self.club,
                transaction_type="income",
                status="completed",
                transaction_date__gte=start_date,
                transaction_date__lte=end_date,
            )
            .values("category")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        for item in by_category:
            analytics["by_category"].append(
                {
                    "category": item["category"],
                    "total": float(item["total"]),
                    "count": item["count"],
                }
            )

        # Previous period comparison
        if compare_previous:
            period_duration = end_date - start_date
            prev_start = start_date - period_duration
            prev_revenue = (
                Transaction.objects.filter(
                    club=self.club,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=prev_start,
                    transaction_date__lte=start_date,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

            change = float(current_revenue) - float(prev_revenue)
            change_percent = (
                (change / float(prev_revenue)) * 100 if prev_revenue > 0 else 0
            )

            analytics["comparison"] = {
                "previous_total": float(prev_revenue),
                "change": change,
                "change_percent": round(change_percent, 2),
            }

        return analytics

    def _get_occupancy_analytics(self, start_date, end_date, compare_previous):
        """Get occupancy analytics."""
        total_reservations = Reservation.objects.filter(
            club=self.club,
            date__gte=start_date.date(),
            date__lte=end_date.date(),
            status__in=["confirmed", "completed"],
        ).count()

        # Calculate total available slots
        courts_count = self.club.courts.filter(is_active=True).count()
        days_count = (end_date.date() - start_date.date()).days + 1
        hours_per_day = 12  # Assume 12 hours per day

        total_slots = courts_count * days_count * hours_per_day
        occupancy_rate = (
            (total_reservations / total_slots) * 100 if total_slots > 0 else 0
        )

        analytics = {
            "total_reservations": total_reservations,
            "total_slots": total_slots,
            "occupancy_rate": round(occupancy_rate, 2),
            "by_court": [],
        }

        # Occupancy by court
        by_court = (
            Reservation.objects.filter(
                club=self.club,
                date__gte=start_date.date(),
                date__lte=end_date.date(),
                status__in=["confirmed", "completed"],
            )
            .values("court__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        for item in by_court:
            court_slots = days_count * hours_per_day
            court_occupancy = (
                (item["count"] / court_slots) * 100 if court_slots > 0 else 0
            )

            analytics["by_court"].append(
                {
                    "court": item["court__name"],
                    "reservations": item["count"],
                    "occupancy_rate": round(court_occupancy, 2),
                }
            )

        return analytics

    def _get_customer_analytics(self, start_date, end_date, compare_previous):
        """Get customer analytics."""
        # Use reservations to count customers if Transaction is not available
        if Transaction is None:
            # Get unique users who made reservations
            user_ids = (
                Reservation.objects.filter(
                    club=self.club,
                    date__gte=start_date.date(),
                    date__lte=end_date.date(),
                    status__in=["confirmed", "completed"],
                )
                .values_list("created_by", flat=True)
                .distinct()
            )

            # Count distinct clients who made reservations
            active_customers = (
                ClientProfile.objects.filter(user__in=user_ids).distinct().count()
            )

            new_customers = (
                ClientProfile.objects.filter(
                    user__in=user_ids, created_at__gte=start_date
                )
                .distinct()
                .count()
            )
        else:
            active_customers = (
                ClientProfile.objects.filter(
                    user__transactions__club=self.club,
                    user__transactions__transaction_date__gte=start_date,
                    user__transactions__transaction_date__lte=end_date,
                )
                .distinct()
                .count()
            )

            new_customers = (
                ClientProfile.objects.filter(
                    user__transactions__club=self.club,
                    user__transactions__transaction_date__gte=start_date,
                    user__transactions__transaction_date__lte=end_date,
                    created_at__gte=start_date,
                )
                .distinct()
                .count()
            )

        analytics = {
            "active_customers": active_customers,
            "new_customers": new_customers,
        }

        return analytics

    def _get_retention_analytics(self, start_date, end_date):
        """Get customer retention analytics."""
        # This would implement retention analysis
        # For now, return basic structure
        return {"retention_rate": 0, "churn_rate": 0}
