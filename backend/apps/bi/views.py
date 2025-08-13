"""
Views for Business Intelligence module.
"""

import logging
from datetime import datetime, timedelta

from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone

from .cache import cache_analytics_data, KPI_CACHE_TIMEOUT, REVENUE_CACHE_TIMEOUT, USAGE_CACHE_TIMEOUT, GROWTH_CACHE_TIMEOUT
from .optimizations import (
    KPIQueryOptimizer, RevenueQueryOptimizer, UsageQueryOptimizer,
    DatabaseOptimizer, performance_monitor
)
import time

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Alert,
    AlertHistory,
    Dashboard,
    DashboardWidget,
    DataSource,
    Metric,
    MetricValue,
    Report,
    Widget,
)
from .serializers import (
    AlertEvaluateSerializer,
    AlertHistorySerializer,
    AlertSerializer,
    ClubAnalyticsSerializer,
    DashboardAnalyticsSerializer,
    DashboardCreateWidgetSerializer,
    DashboardSerializer,
    DashboardWidgetSerializer,
    DataSourceSerializer,
    ExportDataSerializer,
    MetricCalculateSerializer,
    MetricSerializer,
    MetricValueSerializer,
    ReportGenerateSerializer,
    ReportSerializer,
    WidgetDataSerializer,
    WidgetSerializer,
)
from .services import (
    AlertEvaluator,
    ClubAnalyticsService,
    MetricsCalculator,
    ReportGenerator,
    WidgetDataService,
)

logger = logging.getLogger(__name__)


def get_user_organization(user):
    """Get user's organization safely."""
    try:
        if hasattr(user, 'client_profile') and user.client_profile.organization:
            return user.client_profile.organization
    except Exception:
        pass
    
    # Fallback to first active organization
    from apps.root.models import Organization
    return Organization.objects.filter(is_active=True).first()




class DataSourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DataSource management.
    """

    serializer_class = DataSourceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["source_type", "status", "auto_sync"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "last_sync"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return DataSource.objects.none()
        queryset = DataSource.objects.filter(organization=organization)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        organization = get_user_organization(user)
        if organization:
            serializer.save(organization=organization)

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        """Manually trigger data source sync."""
        data_source = self.get_object()

        try:
            # TODO: Implement actual sync logic based on source type
            data_source.last_sync = timezone.now()
            data_source.status = "active"
            data_source.last_error = ""
            data_source.save()

            return Response(
                {
                    "message": "Sync completed successfully",
                    "last_sync": data_source.last_sync,
                }
            )
        except Exception as e:
            data_source.status = "error"
            data_source.last_error = str(e)
            data_source.save()

            return Response(
                {"error": "Sync failed", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"])
    def test_connection(self, request, pk=None):
        """Test connection to data source."""
        data_source = self.get_object()

        try:
            # TODO: Implement actual connection test based on source type
            return Response(
                {"status": "success", "message": "Connection test successful"}
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MetricViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Metric management.
    """

    serializer_class = MetricSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        "metric_type",
        "calculation_type",
        "period_type",
        "is_public",
        "auto_calculate",
    ]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "metric_type", "created_at"]
    ordering = ["metric_type", "name"]

    def get_queryset(self):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return Metric.objects.none()
        queryset = Metric.objects.filter(organization=organization)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by public/private based on user permissions
        if not user.is_staff:
            queryset = queryset.filter(Q(is_public=True) | Q(club__isnull=True))

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        organization = get_user_organization(user)
        if organization:
            serializer.save(organization=organization)

    @action(detail=True, methods=["post"])
    def calculate(self, request, pk=None):
        """Calculate metric value for specified period."""
        metric = self.get_object()
        serializer = MetricCalculateSerializer(data=request.data)

        if serializer.is_valid():
            start_date = serializer.validated_data.get("start_date")
            end_date = serializer.validated_data.get("end_date")

            try:
                calculator = MetricsCalculator(metric)
                value = calculator.calculate(start_date, end_date)

                # Store the calculated value
                MetricValue.objects.create(
                    metric=metric,
                    value=value,
                    timestamp=timezone.now(),
                    period_start=start_date or timezone.now() - timedelta(days=30),
                    period_end=end_date or timezone.now(),
                )

                return Response(
                    {
                        "metric": metric.name,
                        "value": value,
                        "formatted_value": f"{value:.{metric.decimal_places}f}{metric.unit}",
                        "calculated_at": timezone.now(),
                    }
                )
            except Exception as e:
                logger.error(f"Error calculating metric {metric.name}: {str(e)}")
                return Response(
                    {"error": "Calculation failed", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Get historical values for metric."""
        metric = self.get_object()

        # Parse query parameters
        days = int(request.query_params.get("days", 30))
        limit = int(request.query_params.get("limit", 100))

        start_date = timezone.now() - timedelta(days=days)

        values = metric.values.filter(timestamp__gte=start_date).order_by("-timestamp")[
            :limit
        ]

        serializer = MetricValueSerializer(values, many=True)

        return Response(
            {"metric": metric.name, "period_days": days, "values": serializer.data}
        )

    @action(detail=False, methods=["post"])
    def calculate_all(self, request):
        """Calculate all auto-calculate metrics."""
        user = request.user
        metrics = self.get_queryset().filter(auto_calculate=True)

        results = []
        errors = []

        for metric in metrics:
            try:
                calculator = MetricsCalculator(metric)
                value = calculator.calculate()

                MetricValue.objects.create(
                    metric=metric,
                    value=value,
                    timestamp=timezone.now(),
                    period_start=timezone.now() - timedelta(days=1),
                    period_end=timezone.now(),
                )

                results.append(
                    {"metric": metric.name, "value": value, "status": "success"}
                )
            except Exception as e:
                errors.append({"metric": metric.name, "error": str(e)})

        return Response(
            {
                "calculated": len(results),
                "errors": len(errors),
                "results": results,
                "errors_detail": errors,
            }
        )


class WidgetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Widget management.
    """

    serializer_class = WidgetSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        "widget_type",
        "chart_type",
        "size",
        "is_public",
        "auto_refresh",
    ]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "widget_type", "created_at"]
    ordering = ["widget_type", "name"]

    def get_queryset(self):
        user = self.request.user
        queryset = Widget.objects.filter(organization=get_user_organization(user))

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by public/private based on user permissions
        if not user.is_staff:
            queryset = queryset.filter(Q(is_public=True) | Q(club__isnull=True))

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        organization = get_user_organization(user)
        if organization:
            serializer.save(organization=organization)

    @action(detail=True, methods=["post"])
    def get_data(self, request, pk=None):
        """Get data for widget."""
        widget = self.get_object()
        serializer = WidgetDataSerializer(data=request.data)

        if serializer.is_valid():
            start_date = serializer.validated_data.get("start_date")
            end_date = serializer.validated_data.get("end_date")
            filters = serializer.validated_data.get("filters", {})

            try:
                service = WidgetDataService(widget)
                data = service.get_data(start_date, end_date, filters)

                return Response(
                    {
                        "widget": widget.name,
                        "data": data,
                        "generated_at": timezone.now(),
                    }
                )
            except Exception as e:
                logger.error(f"Error getting widget data for {widget.name}: {str(e)}")
                return Response(
                    {"error": "Failed to get widget data", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate widget with new name."""
        widget = self.get_object()

        new_name = request.data.get("name", f"{widget.name} (Copy)")

        new_widget = Widget.objects.create(
            organization=widget.organization,
            club=widget.club,
            name=new_name,
            description=widget.description,
            widget_type=widget.widget_type,
            chart_type=widget.chart_type,
            data_config=widget.data_config,
            display_config=widget.display_config,
            size=widget.size,
            content=widget.content,
            auto_refresh=widget.auto_refresh,
            refresh_interval_seconds=widget.refresh_interval_seconds,
            is_public=False,  # Make copy private by default
            required_permissions=widget.required_permissions,
        )

        # Copy metrics
        new_widget.metrics.set(widget.metrics.all())

        serializer = self.get_serializer(new_widget)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DashboardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Dashboard management.
    """

    serializer_class = DashboardSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["dashboard_type", "is_public", "is_default", "auto_refresh"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "dashboard_type", "created_at"]
    ordering = ["dashboard_type", "name"]

    def get_queryset(self):
        user = self.request.user
        queryset = Dashboard.objects.filter(
            Q(organization=get_user_organization(user))
            & (Q(is_public=True) | Q(users=user) | Q(club__isnull=True))
        ).distinct()

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        return queryset

    def perform_create(self, serializer):
        dashboard = serializer.save(
            organization=get_user_organization(self.request.user)
        )
        # Add creator to dashboard users
        dashboard.users.add(self.request.user)

    @action(detail=True, methods=["post"])
    def add_widget(self, request, pk=None):
        """Add widget to dashboard."""
        dashboard = self.get_object()
        serializer = DashboardCreateWidgetSerializer(data=request.data)

        if serializer.is_valid():
            widget = serializer.validated_data["widget_id"]

            # Check if widget already exists in dashboard
            if DashboardWidget.objects.filter(
                dashboard=dashboard, widget=widget
            ).exists():
                return Response(
                    {"error": "Widget already exists in dashboard"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            dashboard_widget = DashboardWidget.objects.create(
                dashboard=dashboard,
                widget=widget,
                position_x=serializer.validated_data["position_x"],
                position_y=serializer.validated_data["position_y"],
                width=serializer.validated_data["width"],
                height=serializer.validated_data["height"],
                order=serializer.validated_data["order"],
                title_override=serializer.validated_data.get("title_override", ""),
                config_override=serializer.validated_data.get("config_override", {}),
            )

            response_serializer = DashboardWidgetSerializer(dashboard_widget)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"])
    def remove_widget(self, request, pk=None):
        """Remove widget from dashboard."""
        dashboard = self.get_object()
        widget_id = request.data.get("widget_id")

        if not widget_id:
            return Response(
                {"error": "widget_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            dashboard_widget = DashboardWidget.objects.get(
                dashboard=dashboard, widget_id=widget_id
            )
            dashboard_widget.delete()

            return Response({"message": "Widget removed from dashboard"})
        except DashboardWidget.DoesNotExist:
            return Response(
                {"error": "Widget not found in dashboard"},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=["post"])
    def update_layout(self, request, pk=None):
        """Update dashboard layout configuration."""
        dashboard = self.get_object()

        layout_config = request.data.get("layout_config")
        if layout_config:
            dashboard.layout_config = layout_config
            dashboard.save()

            return Response(
                {
                    "message": "Layout updated successfully",
                    "layout_config": dashboard.layout_config,
                }
            )

        return Response(
            {"error": "layout_config is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate dashboard with new name."""
        dashboard = self.get_object()

        new_name = request.data.get("name", f"{dashboard.name} (Copy)")

        new_dashboard = Dashboard.objects.create(
            organization=dashboard.organization,
            club=dashboard.club,
            name=new_name,
            description=dashboard.description,
            dashboard_type=dashboard.dashboard_type,
            layout_config=dashboard.layout_config,
            is_public=False,  # Make copy private by default
            is_default=False,
            auto_refresh=dashboard.auto_refresh,
            show_filters=dashboard.show_filters,
            show_export=dashboard.show_export,
            theme_config=dashboard.theme_config,
        )

        # Copy users
        new_dashboard.users.add(self.request.user)

        # Copy widgets
        for dashboard_widget in dashboard.dashboard_widgets.all():
            DashboardWidget.objects.create(
                dashboard=new_dashboard,
                widget=dashboard_widget.widget,
                position_x=dashboard_widget.position_x,
                position_y=dashboard_widget.position_y,
                width=dashboard_widget.width,
                height=dashboard_widget.height,
                order=dashboard_widget.order,
                title_override=dashboard_widget.title_override,
                config_override=dashboard_widget.config_override,
            )

        serializer = self.get_serializer(new_dashboard)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Report management.
    """

    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["report_type", "format", "frequency", "is_scheduled"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "report_type", "created_at", "last_generated"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = Report.objects.filter(organization=get_user_organization(user))

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        return queryset

    def perform_create(self, serializer):
        report = serializer.save(organization=get_user_organization(self.request.user))
        # Add creator to recipients
        report.recipient_users.add(self.request.user)

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        """Generate report for specified period."""
        report = self.get_object()
        serializer = ReportGenerateSerializer(data=request.data)

        if serializer.is_valid():
            start_date = serializer.validated_data.get("start_date")
            end_date = serializer.validated_data.get("end_date")
            format_override = serializer.validated_data.get("format")

            try:
                generator = ReportGenerator(report)
                report_data = generator.generate(start_date, end_date)

                return Response(
                    {
                        "message": "Report generated successfully",
                        "format": format_override or report.format,
                        "data": report_data,
                        "generated_at": timezone.now(),
                    }
                )
            except Exception as e:
                logger.error(f"Error generating report {report.name}: {str(e)}")
                return Response(
                    {"error": "Report generation failed", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def schedule(self, request, pk=None):
        """Enable/disable report scheduling."""
        report = self.get_object()

        is_scheduled = request.data.get("is_scheduled", False)
        report.is_scheduled = is_scheduled

        if is_scheduled:
            report.calculate_next_generation()
        else:
            report.next_generation = None

        report.save()

        return Response(
            {
                "message": f"Report scheduling {'enabled' if is_scheduled else 'disabled'}",
                "is_scheduled": report.is_scheduled,
                "next_generation": report.next_generation,
            }
        )

    @action(detail=False, methods=["post"])
    def generate_scheduled(self, request):
        """Generate all scheduled reports that are due."""
        user = request.user
        now = timezone.now()

        due_reports = Report.objects.filter(
            organization=get_user_organization(user),
            is_scheduled=True,
            is_active=True,
            next_generation__lte=now,
        )

        results = []
        errors = []

        for report in due_reports:
            try:
                generator = ReportGenerator(report)
                report_data = generator.generate()

                results.append(
                    {
                        "report": report.name,
                        "status": "success",
                        "generated_at": report.last_generated,
                    }
                )
            except Exception as e:
                errors.append({"report": report.name, "error": str(e)})

        return Response(
            {
                "generated": len(results),
                "errors": len(errors),
                "results": results,
                "errors_detail": errors,
            }
        )


class AlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Alert management.
    """

    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["alert_type", "condition", "severity", "status"]
    search_fields = ["name", "description", "metric__name"]
    ordering_fields = ["name", "severity", "created_at", "last_triggered"]
    ordering = ["-severity", "name"]

    def get_queryset(self):
        user = self.request.user
        queryset = Alert.objects.filter(organization=get_user_organization(user))

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        return queryset

    def perform_create(self, serializer):
        alert = serializer.save(organization=get_user_organization(self.request.user))
        # Add creator to notification users
        alert.notification_users.add(self.request.user)

    @action(detail=True, methods=["post"])
    def evaluate(self, request, pk=None):
        """Manually evaluate alert."""
        alert = self.get_object()
        serializer = AlertEvaluateSerializer(data=request.data)

        if serializer.is_valid():
            force_trigger = serializer.validated_data.get("force_trigger", False)

            try:
                if force_trigger:
                    alert.trigger()
                    result = "triggered"
                else:
                    evaluator = AlertEvaluator(alert)
                    result = evaluator.evaluate()

                return Response(
                    {
                        "alert": alert.name,
                        "result": result,
                        "status": alert.status,
                        "evaluated_at": timezone.now(),
                    }
                )
            except Exception as e:
                logger.error(f"Error evaluating alert {alert.name}: {str(e)}")
                return Response(
                    {"error": "Alert evaluation failed", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Manually resolve alert."""
        alert = self.get_object()

        try:
            alert.resolve()

            return Response(
                {"message": "Alert resolved successfully", "status": alert.status}
            )
        except Exception as e:
            return Response(
                {"error": "Failed to resolve alert", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["post"])
    def evaluate_all(self, request):
        """Evaluate all active alerts."""
        user = request.user
        alerts = self.get_queryset().filter(status="active")

        results = []
        errors = []

        for alert in alerts:
            try:
                evaluator = AlertEvaluator(alert)
                result = evaluator.evaluate()

                results.append(
                    {"alert": alert.name, "result": result, "status": alert.status}
                )
            except Exception as e:
                errors.append({"alert": alert.name, "error": str(e)})

        return Response(
            {
                "evaluated": len(results),
                "errors": len(errors),
                "results": results,
                "errors_detail": errors,
            }
        )


class AnalyticsView(viewsets.ViewSet):
    """
    ViewSet for analytics endpoints - KPIs, revenue, usage, growth metrics.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def dashboard(self, request):
        """Get dashboard analytics data."""
        serializer = DashboardAnalyticsSerializer(data=request.data)

        if serializer.is_valid():
            period = serializer.validated_data.get("period", "month")
            start_date = serializer.validated_data.get("start_date")
            end_date = serializer.validated_data.get("end_date")
            metrics = serializer.validated_data.get("metrics", [])

            # Set default date range if not provided
            if not end_date:
                end_date = timezone.now()
            if not start_date:
                if period == "day":
                    start_date = end_date - timedelta(days=1)
                elif period == "week":
                    start_date = end_date - timedelta(weeks=1)
                elif period == "month":
                    start_date = end_date - timedelta(days=30)
                elif period == "quarter":
                    start_date = end_date - timedelta(days=90)
                elif period == "year":
                    start_date = end_date - timedelta(days=365)
                else:
                    start_date = end_date - timedelta(days=30)

            try:
                # Get organization metrics
                user = request.user
                metric_objects = Metric.objects.filter(
                    organization=get_user_organization(user)
                )

                if metrics:
                    metric_objects = metric_objects.filter(name__in=metrics)

                analytics_data = {
                    "period": period,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "metrics": [],
                }

                for metric in metric_objects:
                    calculator = MetricsCalculator(metric)
                    current_value = calculator.calculate(start_date, end_date)

                    # Calculate previous period for comparison
                    period_duration = end_date - start_date
                    prev_start = start_date - period_duration
                    prev_value = calculator.calculate(prev_start, start_date)

                    change = current_value - prev_value if prev_value else 0
                    change_percent = (change / prev_value) * 100 if prev_value else 0

                    analytics_data["metrics"].append(
                        {
                            "name": metric.name,
                            "type": metric.metric_type,
                            "current_value": current_value,
                            "previous_value": prev_value,
                            "change": change,
                            "change_percent": round(change_percent, 2),
                            "unit": metric.unit,
                            "target": (
                                float(metric.target_value)
                                if metric.target_value
                                else None
                            ),
                        }
                    )

                return Response(analytics_data)

            except Exception as e:
                logger.error(f"Error getting dashboard analytics: {str(e)}")
                return Response(
                    {"error": "Failed to get analytics data", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post", "get"])
    def club(self, request):
        """Get club-specific analytics."""
        # Handle GET request differently
        if request.method == "GET":
            request_data = {
                "period": request.query_params.get("period", "month"),
                "include_revenue": request.query_params.get(
                    "include_revenue", "true"
                ).lower()
                == "true",
                "include_occupancy": request.query_params.get(
                    "include_occupancy", "true"
                ).lower()
                == "true",
                "include_customers": request.query_params.get(
                    "include_customers", "true"
                ).lower()
                == "true",
                "compare_previous": request.query_params.get(
                    "compare_previous", "true"
                ).lower()
                == "true",
            }
            serializer = ClubAnalyticsSerializer(data=request_data)
        else:
            serializer = ClubAnalyticsSerializer(data=request.data)

        if serializer.is_valid():
            club_id = request.query_params.get("club")
            if not club_id:
                return Response(
                    {"error": "club parameter is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                from apps.clubs.models import Club

                club = Club.objects.get(
                    id=club_id, organization=get_user_organization(request.user)
                )

                service = ClubAnalyticsService(club)
                analytics_data = service.get_analytics(
                    period=serializer.validated_data.get("period", "month"),
                    include_revenue=serializer.validated_data.get(
                        "include_revenue", True
                    ),
                    include_occupancy=serializer.validated_data.get(
                        "include_occupancy", True
                    ),
                    include_customers=serializer.validated_data.get(
                        "include_customers", True
                    ),
                    include_retention=serializer.validated_data.get(
                        "include_retention", False
                    ),
                    compare_previous=serializer.validated_data.get(
                        "compare_previous", True
                    ),
                )

                return Response(analytics_data)

            except Club.DoesNotExist:
                return Response(
                    {"error": "Club not found"}, status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                logger.error(f"Error getting club analytics: {str(e)}")
                return Response(
                    {"error": "Failed to get club analytics", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def export(self, request):
        """Export analytics data."""
        serializer = ExportDataSerializer(data=request.data)

        if serializer.is_valid():
            format_type = serializer.validated_data.get("format", "csv")
            include_metadata = serializer.validated_data.get("include_metadata", True)
            start_date = serializer.validated_data.get("start_date")
            end_date = serializer.validated_data.get("end_date")

            try:
                # TODO: Implement actual data export logic
                # This would generate the requested format and return download URL

                return Response(
                    {
                        "message": "Export generated successfully",
                        "format": format_type,
                        "download_url": "/api/bi/downloads/export_123.csv",  # Placeholder
                        "expires_at": (
                            timezone.now() + timedelta(hours=24)
                        ).isoformat(),
                    }
                )

            except Exception as e:
                logger.error(f"Error exporting data: {str(e)}")
                return Response(
                    {"error": "Export failed", "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @cache_analytics_data('kpis', timeout=KPI_CACHE_TIMEOUT, vary_on=['start_date', 'end_date', 'club'])
    @action(detail=False, methods=["get"])
    def kpis(self, request):
        """Get real-time KPIs for dashboard."""
        start_time = time.time()
        
        try:
            user = request.user
            organization = get_user_organization(user)
            club_id = request.query_params.get("club")
            
            # Parse date range from request
            start_date_param = request.query_params.get('start_date')
            end_date_param = request.query_params.get('end_date')
            
            if start_date_param and end_date_param:
                start_date = datetime.fromisoformat(start_date_param.replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(end_date_param.replace('Z', '+00:00'))
            else:
                # Default to last 30 days
                end_date = timezone.now()
                start_date = end_date - timedelta(days=30)
            
            # Use optimized KPI query
            club_ids = [club_id] if club_id else None
            
            try:
                # Use optimized query optimizer
                revenue_kpis = KPIQueryOptimizer.get_revenue_kpis(
                    start_date, end_date, club_ids
                )
                usage_kpis = KPIQueryOptimizer.get_usage_kpis(
                    start_date, end_date, club_ids
                )
                
                # Calculate period for comparison
                period_duration = end_date - start_date
                prev_start = start_date - period_duration
                prev_end = start_date
                
                prev_revenue_kpis = KPIQueryOptimizer.get_revenue_kpis(
                    prev_start, prev_end, club_ids
                )
                prev_usage_kpis = KPIQueryOptimizer.get_usage_kpis(
                    prev_start, prev_end, club_ids
                )
                
                # Build response with optimized data
                kpis = {
                    "timestamp": timezone.now().isoformat(),
                    "period": f"{(end_date - start_date).days}_days",
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
                
                # Revenue KPIs
                current_revenue = revenue_kpis['total_revenue'] or 0
                previous_revenue = prev_revenue_kpis['total_revenue'] or 0
                revenue_change = current_revenue - previous_revenue
                revenue_change_percent = (revenue_change / previous_revenue) * 100 if previous_revenue > 0 else 0
                
                kpis["total_revenue"] = {
                    "value": float(current_revenue),
                    "formatted": f"${current_revenue:,.2f}",
                    "change": float(revenue_change),
                    "change_percent": round(revenue_change_percent, 2),
                    "trend": "up" if revenue_change > 0 else "down" if revenue_change < 0 else "stable",
                    "previous_value": float(previous_revenue)
                }
                
                # Usage KPIs
                current_bookings = usage_kpis['total_bookings'] or 0
                previous_bookings = prev_usage_kpis['total_bookings'] or 0
                bookings_change = current_bookings - previous_bookings
                bookings_change_percent = (bookings_change / previous_bookings) * 100 if previous_bookings > 0 else 0
                
                kpis["total_bookings"] = {
                    "value": current_bookings,
                    "formatted": f"{current_bookings:,}",
                    "change": bookings_change,
                    "change_percent": round(bookings_change_percent, 2),
                    "trend": "up" if bookings_change > 0 else "down" if bookings_change < 0 else "stable",
                    "previous_value": previous_bookings
                }
                
                # Active Users KPIs
                current_users = usage_kpis['unique_users'] or 0
                previous_users = prev_usage_kpis['unique_users'] or 0
                users_change = current_users - previous_users
                users_change_percent = (users_change / previous_users) * 100 if previous_users > 0 else 0
                
                kpis["active_users"] = {
                    "value": current_users,
                    "formatted": f"{current_users:,}",
                    "change": users_change,
                    "change_percent": round(users_change_percent, 2),
                    "trend": "up" if users_change > 0 else "down" if users_change < 0 else "stable",
                    "previous_value": previous_users
                }
                
                # Average transaction value
                avg_transaction = revenue_kpis['avg_transaction'] or 0
                prev_avg_transaction = prev_revenue_kpis['avg_transaction'] or 0
                avg_change = avg_transaction - prev_avg_transaction
                avg_change_percent = (avg_change / prev_avg_transaction) * 100 if prev_avg_transaction > 0 else 0
                
                kpis["avg_transaction_value"] = {
                    "value": float(avg_transaction),
                    "formatted": f"${avg_transaction:.2f}",
                    "change": float(avg_change),
                    "change_percent": round(avg_change_percent, 2),
                    "trend": "up" if avg_change > 0 else "down" if avg_change < 0 else "stable",
                    "previous_value": float(prev_avg_transaction)
                }
                
                # Log performance
                execution_time = time.time() - start_time
                performance_monitor.log_query_time('kpis_endpoint', execution_time)
                
                return Response(kpis)
                
            except Exception as e:
                logger.error(f"Error with optimized KPI queries: {str(e)}")
                # Fallback to original implementation with minimal optimization
                pass
            
            # Fallback implementation with basic optimization
            kpis = {
                "timestamp": timezone.now().isoformat(),
                "period": f"{(end_date - start_date).days}_days",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
            
            # Get specific club or organization-wide metrics
            queryset_filter = {"organization": organization}
            if club_id:
                queryset_filter["club_id"] = club_id
            
            # Revenue KPI with basic optimization
            try:
                from apps.finance.models import Transaction
                
                # Use select_related for better performance
                base_transactions = Transaction.objects.select_related('organization', 'club')
                
                revenue_qs = base_transactions.filter(
                    **queryset_filter,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                )
                revenue_data = revenue_qs.aggregate(
                    total=Sum("amount"),
                    count=Count("id"),
                    avg=Avg("amount")
                )
                revenue = revenue_data['total'] or 0
                
                # Previous period comparison
                prev_start = start_date - (end_date - start_date)
                prev_revenue_qs = base_transactions.filter(
                    **queryset_filter,
                    transaction_type="income", 
                    status="completed",
                    transaction_date__gte=prev_start,
                    transaction_date__lte=start_date,
                )
                prev_revenue_data = prev_revenue_qs.aggregate(
                    total=Sum("amount"),
                    avg=Avg("amount")
                )
                prev_revenue = prev_revenue_data['total'] or 0
                
                revenue_change = float(revenue) - float(prev_revenue)
                revenue_change_percent = (revenue_change / float(prev_revenue)) * 100 if prev_revenue > 0 else 0
                
                kpis["total_revenue"] = {
                    "value": float(revenue),
                    "formatted": f"${revenue:,.2f}",
                    "change": revenue_change,
                    "change_percent": round(revenue_change_percent, 2),
                    "trend": "up" if revenue_change > 0 else "down" if revenue_change < 0 else "stable",
                    "transaction_count": revenue_data['count'] or 0,
                    "avg_transaction": float(revenue_data['avg'] or 0)
                }
            except ImportError:
                kpis["total_revenue"] = {
                    "value": 0,
                    "formatted": "$0.00",
                    "change": 0,
                    "change_percent": 0,
                    "trend": "stable",
                    "transaction_count": 0,
                    "avg_transaction": 0
                }
            
            # Reservations/Usage KPI with optimization
            from apps.reservations.models import Reservation
            from apps.clients.models import ClientProfile
            
            # Use select_related for reservations
            reservations_qs = Reservation.objects.select_related('club', 'user', 'court')
            
            reservations = reservations_qs.filter(
                date__gte=start_date.date(),
                date__lte=end_date.date(),
                status__in=["confirmed", "completed"]
            )
            if club_id:
                reservations = reservations.filter(club_id=club_id)
            
            reservations_data = reservations.aggregate(
                total=Count('id'),
                unique_users=Count('user', distinct=True)
            )
            total_reservations = reservations_data['total']
            total_users = reservations_data['unique_users']
            
            # Previous period reservations
            prev_start = start_date - (end_date - start_date)
            prev_reservations = reservations_qs.filter(
                date__gte=prev_start.date(),
                date__lte=start_date.date(),
                status__in=["confirmed", "completed"]
            )
            if club_id:
                prev_reservations = prev_reservations.filter(club_id=club_id)
            
            prev_data = prev_reservations.aggregate(
                total=Count('id'),
                unique_users=Count('user', distinct=True)
            )
            prev_total = prev_data['total']
            prev_total_users = prev_data['unique_users']
            
            reservations_change = total_reservations - prev_total
            reservations_change_percent = (reservations_change / prev_total) * 100 if prev_total > 0 else 0
            
            users_change = total_users - prev_total_users
            users_change_percent = (users_change / prev_total_users) * 100 if prev_total_users > 0 else 0
            
            kpis["total_bookings"] = {
                "value": total_reservations,
                "formatted": f"{total_reservations:,}",
                "change": reservations_change,
                "change_percent": round(reservations_change_percent, 2),
                "trend": "up" if reservations_change > 0 else "down" if reservations_change < 0 else "stable",
                "previous_value": prev_total
            }
            
            kpis["active_users"] = {
                "value": total_users,
                "formatted": f"{total_users:,}",
                "change": users_change,
                "change_percent": round(users_change_percent, 2),
                "trend": "up" if users_change > 0 else "down" if users_change < 0 else "stable",
                "previous_value": prev_total_users
            }
            
            # Court Utilization KPI (if club specified)
            if club_id:
                try:
                    from apps.clubs.models import Club
                    club = Club.objects.get(id=club_id)
                    courts_count = club.courts.filter(is_active=True).count()
                    
                    if courts_count > 0:
                        days_count = (end_date.date() - start_date.date()).days + 1
                        hours_per_day = 12  # Operating hours
                        
                        total_slots = courts_count * days_count * hours_per_day
                        utilization_rate = (total_reservations / total_slots) * 100 if total_slots > 0 else 0
                        
                        # Previous period utilization
                        prev_days = (start_date.date() - prev_start.date()).days + 1
                        prev_total_slots = courts_count * prev_days * hours_per_day
                        prev_utilization = (prev_total / prev_total_slots) * 100 if prev_total_slots > 0 else 0
                        
                        util_change = utilization_rate - prev_utilization
                        
                        kpis["court_utilization"] = {
                            "value": round(utilization_rate, 1),
                            "formatted": f"{utilization_rate:.1f}%",
                            "change": round(util_change, 1),
                            "change_percent": round(util_change, 2),
                            "trend": "up" if util_change > 0 else "down" if util_change < 0 else "stable",
                            "courts_count": courts_count,
                            "total_slots": total_slots
                        }
                    else:
                        kpis["court_utilization"] = {
                            "value": 0,
                            "formatted": "0.0%",
                            "change": 0,
                            "change_percent": 0,
                            "trend": "stable",
                            "courts_count": 0,
                            "total_slots": 0
                        }
                except Exception as e:
                    logger.error(f"Error calculating court utilization: {str(e)}")
                    kpis["court_utilization"] = {
                        "value": 0,
                        "formatted": "0.0%",
                        "change": 0,
                        "change_percent": 0,
                        "trend": "stable",
                        "error": str(e)
                    }
            
            # Log performance
            execution_time = time.time() - start_time
            performance_monitor.log_query_time('kpis_endpoint_fallback', execution_time)
            
            return Response(kpis)
            
        except Exception as e:
            logger.error(f"Error getting KPIs: {str(e)}")
            return Response(
                {"error": "Failed to get KPIs", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @cache_analytics_data('revenue', timeout=REVENUE_CACHE_TIMEOUT, vary_on=['start_date', 'end_date', 'club', 'period'])
    @action(detail=False, methods=["get"])
    def revenue(self, request):
        """Get revenue breakdown and analytics."""
        start_time = time.time()
        
        try:
            user = request.user
            organization = get_user_organization(user)
            club_id = request.query_params.get("club")
            period = request.query_params.get("period", "month")  # month, week, year
            
            # Parse date range from request
            start_date_param = request.query_params.get('start_date')
            end_date_param = request.query_params.get('end_date')
            
            if start_date_param and end_date_param:
                start_date = datetime.fromisoformat(start_date_param.replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(end_date_param.replace('Z', '+00:00'))
                # Determine grouping based on date range
                days_diff = (end_date - start_date).days
                if days_diff <= 7:
                    grouping = "day"
                elif days_diff <= 90:
                    grouping = "day"
                else:
                    grouping = "month"
            else:
                # Set date range based on period
                end_date = timezone.now()
                if period == "week":
                    start_date = end_date - timedelta(weeks=1)
                    grouping = "day"
                elif period == "month":
                    start_date = end_date - timedelta(days=30)
                    grouping = "day"
                elif period == "year":
                    start_date = end_date - timedelta(days=365)
                    grouping = "month"
                else:
                    start_date = end_date - timedelta(days=30)
                    grouping = "day"
            
            revenue_data = {
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total": 0,
                "by_date": [],
                "by_category": [],
                "by_payment_method": []
            }
            
            # Try optimized revenue queries first
            club_ids = [club_id] if club_id else None
            
            try:
                # Use RevenueQueryOptimizer for time series data
                revenue_time_series = RevenueQueryOptimizer.get_revenue_time_series(
                    start_date, end_date, grouping, club_ids
                )
                
                # Convert QuerySet to list for processing
                time_series_data = list(revenue_time_series)
                
                # Get revenue by source
                revenue_by_source = RevenueQueryOptimizer.get_revenue_by_source(
                    start_date, end_date, club_ids
                )
                source_data = list(revenue_by_source)
                
                # Calculate total revenue
                total_revenue = sum(item['revenue'] or 0 for item in time_series_data)
                
                revenue_data["total"] = float(total_revenue)
                
                # Revenue by date (time series)
                revenue_data["by_date"] = [
                    {
                        "date": item['period_date'].isoformat() if item['period_date'] else None,
                        "value": float(item['revenue'] or 0),
                        "transaction_count": item['transaction_count'] or 0,
                        "avg_transaction": float(item['avg_transaction'] or 0)
                    }
                    for item in time_series_data
                ]
                
                # Revenue by source/category
                revenue_data["by_category"] = [
                    {
                        "category": item["payment_type"] or "Other",
                        "value": float(item["total_amount"] or 0),
                        "count": item["transaction_count"] or 0,
                        "avg_amount": float(item["avg_amount"] or 0)
                    }
                    for item in source_data
                ]
                
                # Get payment method breakdown from time series
                payment_methods = {}
                for item in time_series_data:
                    for method in ['cash_amount', 'card_amount', 'transfer_amount']:
                        method_name = method.replace('_amount', '')
                        if method_name not in payment_methods:
                            payment_methods[method_name] = {"value": 0, "count": 0}
                        payment_methods[method_name]["value"] += float(item.get(method, 0) or 0)
                
                revenue_data["by_payment_method"] = [
                    {
                        "method": method.title(),
                        "value": data["value"],
                        "count": data["count"]
                    }
                    for method, data in payment_methods.items()
                    if data["value"] > 0
                ]
                
                # Log performance
                execution_time = time.time() - start_time
                performance_monitor.log_query_time('revenue_endpoint_optimized', execution_time)
                
            except Exception as e:
                logger.error(f"Error with optimized revenue queries: {str(e)}")
                # Fallback to original implementation
                
                from apps.finance.models import Transaction
                
                # Base query with basic optimization
                base_query = Transaction.objects.select_related('organization', 'club').filter(
                    organization=organization,
                    transaction_type="income",
                    status="completed",
                    transaction_date__gte=start_date,
                    transaction_date__lte=end_date,
                )
                if club_id:
                    base_query = base_query.filter(club_id=club_id)
                
                # Total revenue
                revenue_data["total"] = float(
                    base_query.aggregate(total=Sum("amount"))["total"] or 0
                )
                
                # Revenue by date (time series)
                if grouping == "day":
                    # Group by day
                    current_date = start_date.date()
                    while current_date <= end_date.date():
                        day_revenue = base_query.filter(
                            transaction_date__date=current_date
                        ).aggregate(total=Sum("amount"))["total"] or 0
                        
                        revenue_data["by_date"].append({
                            "date": current_date.isoformat(),
                            "value": float(day_revenue)
                        })
                        current_date += timedelta(days=1)
                        
                elif grouping == "month":
                    # Group by month (for yearly view)
                    from django.db.models.functions import TruncMonth
                    monthly_data = (
                        base_query.annotate(month=TruncMonth('transaction_date'))
                        .values('month')
                        .annotate(total=Sum('amount'))
                        .order_by('month')
                    )
                    
                    for item in monthly_data:
                        revenue_data["by_date"].append({
                            "date": item['month'].isoformat(),
                            "value": float(item['total'])
                        })
                
                # Revenue by category
                by_category = (
                    base_query.values("category")
                    .annotate(total=Sum("amount"), count=Count("id"))
                    .order_by("-total")
                )
                
                for item in by_category:
                    revenue_data["by_category"].append({
                        "category": item["category"] or "Other",
                        "value": float(item["total"]),
                        "count": item["count"]
                    })
                
                # Revenue by payment method
                by_method = (
                    base_query.values("payment_method")
                    .annotate(total=Sum("amount"), count=Count("id"))
                    .order_by("-total")
                )
                
                for item in by_method:
                    revenue_data["by_payment_method"].append({
                        "method": item["payment_method"] or "Other",
                        "value": float(item["total"]),
                        "count": item["count"]
                    })
                    
            except ImportError:
                # Finance module not available, return empty data
                pass
            
            return Response(revenue_data)
            
        except Exception as e:
            logger.error(f"Error getting revenue data: {str(e)}")
            return Response(
                {"error": "Failed to get revenue data", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @cache_analytics_data('usage', timeout=USAGE_CACHE_TIMEOUT, vary_on=['start_date', 'end_date', 'club', 'period'])
    @action(detail=False, methods=["get"])
    def usage(self, request):
        """Get court utilization and usage analytics."""
        try:
            user = request.user
            organization = get_user_organization(user)
            club_id = request.query_params.get("club")
            period = request.query_params.get("period", "month")
            
            if not club_id:
                return Response(
                    {"error": "club parameter is required for usage analytics"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Date range
            end_date = timezone.now()
            if period == "week":
                start_date = end_date - timedelta(weeks=1)
            elif period == "month":
                start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=30)
            
            usage_data = {
                "period": period,
                "club_id": club_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "overall_utilization": 0,
                "peak_hours": [],
                "by_court": [],
                "by_day_of_week": [],
                "heatmap_data": []
            }
            
            try:
                from apps.clubs.models import Club
                club = Club.objects.get(id=club_id, organization=organization)
                
                # Get all reservations for the period
                reservations = Reservation.objects.filter(
                    club=club,
                    date__gte=start_date.date(),
                    date__lte=end_date.date(),
                    status__in=["confirmed", "completed"]
                )
                
                total_reservations = reservations.count()
                
                # Calculate overall utilization
                courts_count = club.courts.filter(is_active=True).count()
                days_count = (end_date.date() - start_date.date()).days + 1
                hours_per_day = 12  # Operating hours
                total_possible_slots = courts_count * days_count * hours_per_day
                
                usage_data["overall_utilization"] = round(
                    (total_reservations / total_possible_slots) * 100 if total_possible_slots > 0 else 0, 
                    1
                )
                
                # Peak hours analysis
                from collections import defaultdict
                hour_counts = defaultdict(int)
                
                for reservation in reservations:
                    if reservation.time:
                        hour = reservation.time.hour
                        hour_counts[hour] += 1
                
                # Sort by usage and get top hours
                sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
                usage_data["peak_hours"] = [
                    {
                        "hour": f"{hour:02d}:00", 
                        "reservations": count,
                        "utilization": round((count / (courts_count * days_count)) * 100, 1) if courts_count * days_count > 0 else 0
                    }
                    for hour, count in sorted_hours[:6]  # Top 6 hours
                ]
                
                # Usage by court
                court_usage = (
                    reservations.values("court__name", "court__id")
                    .annotate(count=Count("id"))
                    .order_by("-count")
                )
                
                for item in court_usage:
                    court_slots = days_count * hours_per_day
                    utilization = (item["count"] / court_slots) * 100 if court_slots > 0 else 0
                    
                    usage_data["by_court"].append({
                        "court_id": str(item["court__id"]),
                        "court_name": item["court__name"] or f"Court {item['court__id']}",
                        "reservations": item["count"],
                        "utilization": round(utilization, 1)
                    })
                
                # Usage by day of week
                dow_counts = defaultdict(int)
                for reservation in reservations:
                    dow = reservation.date.weekday()  # 0=Monday
                    dow_counts[dow] += 1
                
                days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                for dow, name in enumerate(days_of_week):
                    count = dow_counts[dow]
                    weeks_count = days_count // 7 + (1 if days_count % 7 > dow else 0)
                    avg_per_week = count / weeks_count if weeks_count > 0 else 0
                    
                    usage_data["by_day_of_week"].append({
                        "day": name,
                        "day_of_week": dow,
                        "total_reservations": count,
                        "avg_per_week": round(avg_per_week, 1)
                    })
                
                # Heatmap data (hour vs day of week)
                heatmap = {}
                for reservation in reservations:
                    if reservation.time:
                        hour = reservation.time.hour
                        dow = reservation.date.weekday()
                        key = f"{dow}_{hour}"
                        heatmap[key] = heatmap.get(key, 0) + 1
                
                for dow in range(7):
                    for hour in range(6, 24):  # 6 AM to 11 PM
                        key = f"{dow}_{hour}"
                        count = heatmap.get(key, 0)
                        usage_data["heatmap_data"].append({
                            "day_of_week": dow,
                            "hour": hour,
                            "reservations": count,
                            "intensity": min(count / 5, 1) if count > 0 else 0  # Normalized 0-1
                        })
                
            except Club.DoesNotExist:
                return Response(
                    {"error": "Club not found"}, status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(usage_data)
            
        except Exception as e:
            logger.error(f"Error getting usage data: {str(e)}")
            return Response(
                {"error": "Failed to get usage data", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @cache_analytics_data('growth', timeout=GROWTH_CACHE_TIMEOUT, vary_on=['start_date', 'end_date', 'club', 'period'])
    @action(detail=False, methods=["get"])
    def growth(self, request):
        """Get user growth metrics and trends."""
        try:
            user = request.user
            organization = get_user_organization(user)
            club_id = request.query_params.get("club")
            period = request.query_params.get("period", "month")
            
            # Date range
            end_date = timezone.now()
            if period == "week":
                start_date = end_date - timedelta(weeks=1)
                grouping = "day"
            elif period == "month":
                start_date = end_date - timedelta(days=30)
                grouping = "day"
            elif period == "year":
                start_date = end_date - timedelta(days=365)
                grouping = "month"
            else:
                start_date = end_date - timedelta(days=30)
                grouping = "day"
            
            growth_data = {
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_users": 0,
                "new_users": 0,
                "growth_rate": 0,
                "user_growth_timeline": [],
                "retention_metrics": {
                    "returning_users": 0,
                    "retention_rate": 0
                }
            }
            
            # Base user query
            user_query = ClientProfile.objects.filter(
                user__reservations__date__gte=start_date.date(),
                user__reservations__date__lte=end_date.date(),
                user__reservations__status__in=["confirmed", "completed"]
            )
            if club_id:
                user_query = user_query.filter(user__reservations__club_id=club_id)
            
            # Total active users
            growth_data["total_users"] = user_query.distinct().count()
            
            # New users (registered in this period)
            new_users = user_query.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).distinct().count()
            growth_data["new_users"] = new_users
            
            # Growth rate calculation
            previous_end = start_date
            previous_start = previous_end - (end_date - start_date)
            
            prev_user_query = ClientProfile.objects.filter(
                user__reservations__date__gte=previous_start.date(),
                user__reservations__date__lte=previous_end.date(),
                user__reservations__status__in=["confirmed", "completed"]
            )
            if club_id:
                prev_user_query = prev_user_query.filter(user__reservations__club_id=club_id)
            
            previous_total = prev_user_query.distinct().count()
            
            if previous_total > 0:
                growth_rate = ((growth_data["total_users"] - previous_total) / previous_total) * 100
                growth_data["growth_rate"] = round(growth_rate, 2)
            
            # User growth timeline
            if grouping == "day":
                current_date = start_date.date()
                while current_date <= end_date.date():
                    # Active users on this date
                    day_users = ClientProfile.objects.filter(
                        user__reservations__date=current_date,
                        user__reservations__status__in=["confirmed", "completed"]
                    )
                    if club_id:
                        day_users = day_users.filter(user__reservations__club_id=club_id)
                    
                    active_count = day_users.distinct().count()
                    
                    # New registrations on this date
                    new_count = day_users.filter(
                        created_at__date=current_date
                    ).distinct().count()
                    
                    growth_data["user_growth_timeline"].append({
                        "date": current_date.isoformat(),
                        "active_users": active_count,
                        "new_users": new_count
                    })
                    
                    current_date += timedelta(days=1)
            
            # Retention metrics
            # Users who were active in both current and previous periods
            current_user_ids = set(user_query.values_list("id", flat=True))
            previous_user_ids = set(prev_user_query.values_list("id", flat=True))
            
            returning_users = len(current_user_ids.intersection(previous_user_ids))
            growth_data["retention_metrics"]["returning_users"] = returning_users
            
            if previous_total > 0:
                retention_rate = (returning_users / previous_total) * 100
                growth_data["retention_metrics"]["retention_rate"] = round(retention_rate, 2)
            
            return Response(growth_data)
            
        except Exception as e:
            logger.error(f"Error getting growth data: {str(e)}")
            return Response(
                {"error": "Failed to get growth data", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DashboardOverviewView(APIView):
    """
    API View to provide dashboard overview data for quick access.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dashboard overview with key metrics and data."""
        try:
            from apps.root.models import Organization
            from apps.clubs.models import Club
            
            # Get user's organization and clubs
            user = request.user
            organizations = []
            clubs = []
            
            # Try to get user's organizations (simplified)
            try:
                if hasattr(user, 'client_profile') and user.client_profile.organization:
                    org = user.client_profile.organization
                    organizations = [{"id": str(org.id), "name": org.trade_name}]
                    
                    # Get clubs for this organization
                    user_clubs = Club.objects.filter(organization=org, is_active=True)[:10]
                    clubs = [{"id": str(club.id), "name": club.name} for club in user_clubs]
                    
            except Exception:
                # Fallback to any available organizations
                orgs = Organization.objects.filter(is_active=True)[:5]
                organizations = [{"id": str(org.id), "name": org.trade_name} for org in orgs]
                
                if organizations:
                    # Get clubs for first organization
                    first_org_clubs = Club.objects.filter(organization__id=organizations[0]["id"], is_active=True)[:10]
                    clubs = [{"id": str(club.id), "name": club.name} for club in first_org_clubs]
            
            # Get basic dashboard data
            dashboard_data = {
                "organizations": organizations,
                "clubs": clubs,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "is_staff": user.is_staff,
                },
                "timestamp": timezone.now().isoformat(),
                "status": "success"
            }
            
            return Response(dashboard_data)
            
        except Exception as e:
            logger.error(f"Error getting dashboard overview: {str(e)}")
            return Response(
                {
                    "organizations": [],
                    "clubs": [],
                    "user": {"id": request.user.id, "email": request.user.email},
                    "error": "Could not load dashboard data",
                    "status": "partial"
                },
                status=status.HTTP_200_OK  # Return 200 with partial data
            )
