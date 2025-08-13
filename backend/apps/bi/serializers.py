"""
Serializers for Business Intelligence module.
"""

from django.contrib.auth import get_user_model

from rest_framework import serializers

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

User = get_user_model()


class DataSourceSerializer(serializers.ModelSerializer):
    """Serializer for DataSource model."""

    class Meta:
        model = DataSource
        fields = [
            "id",
            "name",
            "description",
            "source_type",
            "connection_config",
            "data_mapping",
            "status",
            "last_sync",
            "last_error",
            "sync_frequency_minutes",
            "auto_sync",
            "organization",
            "club",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = ["last_sync", "last_error", "created_at", "updated_at"]


class MetricValueSerializer(serializers.ModelSerializer):
    """Serializer for MetricValue model."""

    class Meta:
        model = MetricValue
        fields = [
            "id",
            "value",
            "timestamp",
            "period_start",
            "period_end",
            "calculation_metadata",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class MetricSerializer(serializers.ModelSerializer):
    """Serializer for Metric model."""

    data_source_names = serializers.StringRelatedField(
        source="data_sources", many=True, read_only=True
    )
    current_value = serializers.SerializerMethodField()
    latest_values = MetricValueSerializer(source="values", many=True, read_only=True)

    class Meta:
        model = Metric
        fields = [
            "id",
            "name",
            "description",
            "metric_type",
            "calculation_type",
            "calculation_config",
            "data_sources",
            "data_source_names",
            "period_type",
            "target_value",
            "benchmark_value",
            "unit",
            "decimal_places",
            "color",
            "icon",
            "is_public",
            "auto_calculate",
            "cache_duration_minutes",
            "organization",
            "club",
            "current_value",
            "latest_values",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "current_value",
            "latest_values",
            "created_at",
            "updated_at",
        ]

    def get_current_value(self, obj) -> str:
        """Get the current/latest value for this metric."""
        latest_value = obj.values.first()
        if latest_value:
            return {
                "value": latest_value.value,
                "timestamp": latest_value.timestamp,
                "formatted_value": f"{latest_value.value}{obj.unit}",
            }
        return None

    def get_latest_values(self, obj) -> str:
        """Get latest 10 values for the metric."""
        values = obj.values.all()[:10]
        return MetricValueSerializer(values, many=True).data


class MetricCalculateSerializer(serializers.Serializer):
    """Serializer for metric calculation requests."""

    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)

    def validate(self, data):
        if "start_date" in data and "end_date" in data:
            if data["start_date"] >= data["end_date"]:
                raise serializers.ValidationError("start_date must be before end_date")
        return data


class WidgetSerializer(serializers.ModelSerializer):
    """Serializer for Widget model."""

    metric_names = serializers.StringRelatedField(
        source="metrics", many=True, read_only=True
    )
    dashboard_count = serializers.SerializerMethodField()

    class Meta:
        model = Widget
        fields = [
            "id",
            "name",
            "description",
            "widget_type",
            "chart_type",
            "metrics",
            "metric_names",
            "data_config",
            "display_config",
            "size",
            "content",
            "auto_refresh",
            "refresh_interval_seconds",
            "is_public",
            "required_permissions",
            "dashboard_count",
            "organization",
            "club",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "metric_names",
            "dashboard_count",
            "created_at",
            "updated_at",
        ]

    def get_dashboard_count(self, obj) -> str:
        """Get number of dashboards using this widget."""
        return obj.dashboards.count()


class WidgetDataSerializer(serializers.Serializer):
    """Serializer for widget data requests."""

    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    filters = serializers.JSONField(required=False)

    def validate(self, data):
        if "start_date" in data and "end_date" in data:
            if data["start_date"] >= data["end_date"]:
                raise serializers.ValidationError("start_date must be before end_date")
        return data


class DashboardWidgetSerializer(serializers.ModelSerializer):
    """Serializer for DashboardWidget model."""

    widget = WidgetSerializer(read_only=True)
    widget_id = serializers.PrimaryKeyRelatedField(
        queryset=Widget.objects.all(), source="widget", write_only=True
    )

    class Meta:
        model = DashboardWidget
        fields = [
            "id",
            "widget",
            "widget_id",
            "position_x",
            "position_y",
            "width",
            "height",
            "order",
            "title_override",
            "config_override",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DashboardSerializer(serializers.ModelSerializer):
    """Serializer for Dashboard model."""

    dashboard_widgets = DashboardWidgetSerializer(many=True, read_only=True)
    widget_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Dashboard
        fields = [
            "id",
            "name",
            "description",
            "dashboard_type",
            "layout_config",
            "is_public",
            "is_default",
            "users",
            "auto_refresh",
            "show_filters",
            "show_export",
            "theme_config",
            "dashboard_widgets",
            "widget_count",
            "user_count",
            "organization",
            "club",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "dashboard_widgets",
            "widget_count",
            "user_count",
            "created_at",
            "updated_at",
        ]

    def get_widget_count(self, obj) -> str:
        """Get number of widgets in this dashboard."""
        return obj.widgets.count()

    def get_user_count(self, obj) -> str:
        """Get number of users with access to this dashboard."""
        return obj.users.count()


class DashboardCreateWidgetSerializer(serializers.Serializer):
    """Serializer for adding widgets to dashboards."""

    widget_id = serializers.PrimaryKeyRelatedField(queryset=Widget.objects.all())
    position_x = serializers.IntegerField(default=0)
    position_y = serializers.IntegerField(default=0)
    width = serializers.IntegerField(default=1)
    height = serializers.IntegerField(default=1)
    order = serializers.IntegerField(default=0)
    title_override = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    config_override = serializers.JSONField(required=False)


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for Report model."""

    metric_names = serializers.StringRelatedField(
        source="metrics", many=True, read_only=True
    )
    widget_names = serializers.StringRelatedField(
        source="widgets", many=True, read_only=True
    )
    recipient_user_emails = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "name",
            "description",
            "report_type",
            "metrics",
            "metric_names",
            "widgets",
            "widget_names",
            "template_config",
            "filter_config",
            "format",
            "frequency",
            "scheduled_time",
            "scheduled_day",
            "scheduled_weekday",
            "recipients",
            "recipient_users",
            "recipient_user_emails",
            "is_scheduled",
            "last_generated",
            "next_generation",
            "organization",
            "club",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "metric_names",
            "widget_names",
            "recipient_user_emails",
            "last_generated",
            "next_generation",
            "created_at",
            "updated_at",
        ]

    def get_recipient_user_emails(self, obj) -> str:
        """Get emails of recipient users."""
        return [user.email for user in obj.recipient_users.all()]


class ReportGenerateSerializer(serializers.Serializer):
    """Serializer for report generation requests."""

    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    format = serializers.ChoiceField(choices=Report.FORMAT_CHOICES, required=False)

    def validate(self, data):
        if "start_date" in data and "end_date" in data:
            if data["start_date"] >= data["end_date"]:
                raise serializers.ValidationError("start_date must be before end_date")
        return data


class AlertHistorySerializer(serializers.ModelSerializer):
    """Serializer for AlertHistory model."""

    user_name = serializers.StringRelatedField(source="user", read_only=True)

    class Meta:
        model = AlertHistory
        fields = [
            "id",
            "action",
            "timestamp",
            "metric_value",
            "threshold_value",
            "message",
            "metadata",
            "user",
            "user_name",
            "created_at",
        ]
        read_only_fields = ["timestamp", "user_name", "created_at"]


class AlertSerializer(serializers.ModelSerializer):
    """Serializer for Alert model."""

    metric_name = serializers.StringRelatedField(source="metric", read_only=True)
    notification_user_emails = serializers.SerializerMethodField()
    recent_history = AlertHistorySerializer(source="history", many=True, read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "name",
            "description",
            "alert_type",
            "metric",
            "metric_name",
            "condition",
            "threshold_value",
            "threshold_value_secondary",
            "evaluation_period_minutes",
            "consecutive_evaluations",
            "severity",
            "auto_resolve",
            "notification_config",
            "notification_users",
            "notification_user_emails",
            "notification_emails",
            "status",
            "last_evaluation",
            "last_triggered",
            "trigger_count",
            "consecutive_triggers",
            "recent_history",
            "organization",
            "club",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "metric_name",
            "notification_user_emails",
            "recent_history",
            "last_evaluation",
            "last_triggered",
            "trigger_count",
            "consecutive_triggers",
            "created_at",
            "updated_at",
        ]

    def get_notification_user_emails(self, obj) -> str:
        """Get emails of notification users."""
        return [user.email for user in obj.notification_users.all()]

    def get_recent_history(self, obj) -> str:
        """Get recent 5 history entries."""
        history = obj.history.all()[:5]
        return AlertHistorySerializer(history, many=True).data


class AlertEvaluateSerializer(serializers.Serializer):
    """Serializer for alert evaluation requests."""

    force_trigger = serializers.BooleanField(default=False)


class DashboardAnalyticsSerializer(serializers.Serializer):
    """Serializer for dashboard analytics data."""

    period = serializers.ChoiceField(
        choices=[
            ("day", "Day"),
            ("week", "Week"),
            ("month", "Month"),
            ("quarter", "Quarter"),
            ("year", "Year"),
        ],
        default="month",
    )
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    metrics = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of metric names to include",
    )

    def validate(self, data):
        if "start_date" in data and "end_date" in data:
            if data["start_date"] >= data["end_date"]:
                raise serializers.ValidationError("start_date must be before end_date")
        return data


class ClubAnalyticsSerializer(serializers.Serializer):
    """Serializer for club-specific analytics."""

    include_revenue = serializers.BooleanField(default=True)
    include_occupancy = serializers.BooleanField(default=True)
    include_customers = serializers.BooleanField(default=True)
    include_retention = serializers.BooleanField(default=False)
    period = serializers.ChoiceField(
        choices=[
            ("week", "Week"),
            ("month", "Month"),
            ("quarter", "Quarter"),
            ("year", "Year"),
        ],
        default="month",
    )
    compare_previous = serializers.BooleanField(default=True)


class ExportDataSerializer(serializers.Serializer):
    """Serializer for data export requests."""

    format = serializers.ChoiceField(
        choices=[("csv", "CSV"), ("excel", "Excel"), ("json", "JSON")], default="csv"
    )
    include_metadata = serializers.BooleanField(default=True)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)

    def validate(self, data):
        if "start_date" in data and "end_date" in data:
            if data["start_date"] >= data["end_date"]:
                raise serializers.ValidationError("start_date must be before end_date")
        return data
