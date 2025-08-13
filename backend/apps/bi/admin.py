"""
Admin configuration for Business Intelligence module.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

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


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "organization",
        "club",
        "source_type",
        "status",
        "last_sync",
        "auto_sync",
    ]
    list_filter = ["source_type", "status", "auto_sync", "organization", "club"]
    search_fields = ["name", "description"]
    readonly_fields = ["last_sync", "last_error", "created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "description", "source_type", "organization", "club")},
        ),
        ("Configuration", {"fields": ("connection_config", "data_mapping")}),
        ("Sync Settings", {"fields": ("auto_sync", "sync_frequency_minutes")}),
        (
            "Status",
            {"fields": ("status", "last_sync", "last_error"), "classes": ["collapse"]},
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at", "is_active"),
                "classes": ["collapse"],
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("organization", "club")


class MetricValueInline(admin.TabularInline):
    model = MetricValue
    extra = 0
    readonly_fields = ["timestamp", "value", "period_start", "period_end"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "organization",
        "club",
        "metric_type",
        "calculation_type",
        "target_value",
        "auto_calculate",
        "is_public",
    ]
    list_filter = [
        "metric_type",
        "calculation_type",
        "period_type",
        "auto_calculate",
        "is_public",
        "organization",
        "club",
    ]
    search_fields = ["name", "description"]
    filter_horizontal = ["data_sources"]
    inlines = [MetricValueInline]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "description", "metric_type", "organization", "club")},
        ),
        (
            "Calculation",
            {
                "fields": (
                    "calculation_type",
                    "calculation_config",
                    "period_type",
                    "data_sources",
                )
            },
        ),
        (
            "Targets & Benchmarks",
            {"fields": ("target_value", "benchmark_value"), "classes": ["collapse"]},
        ),
        (
            "Display",
            {
                "fields": ("unit", "decimal_places", "color", "icon"),
                "classes": ["collapse"],
            },
        ),
        (
            "Settings",
            {
                "fields": ("is_public", "auto_calculate", "cache_duration_minutes"),
                "classes": ["collapse"],
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at", "is_active"),
                "classes": ["collapse"],
            },
        ),
    )

    actions = ["calculate_metrics"]

    def calculate_metrics(self, request, queryset):
        for metric in queryset:
            try:
                value = metric.calculate_value()
                self.message_user(request, f"Metric {metric.name} calculated: {value}")
            except Exception as e:
                self.message_user(
                    request, f"Error calculating {metric.name}: {str(e)}", level="error"
                )

    calculate_metrics.short_description = "Calculate selected metrics"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("organization", "club")


@admin.register(Widget)
class WidgetAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "organization",
        "club",
        "widget_type",
        "chart_type",
        "size",
        "auto_refresh",
        "is_public",
    ]
    list_filter = [
        "widget_type",
        "chart_type",
        "size",
        "auto_refresh",
        "is_public",
        "organization",
        "club",
    ]
    search_fields = ["name", "description"]
    filter_horizontal = ["metrics"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "description", "widget_type", "organization", "club")},
        ),
        ("Chart Configuration", {"fields": ("chart_type",), "classes": ["collapse"]}),
        ("Data Configuration", {"fields": ("metrics", "data_config")}),
        ("Display Configuration", {"fields": ("display_config", "size", "content")}),
        (
            "Refresh Settings",
            {
                "fields": ("auto_refresh", "refresh_interval_seconds"),
                "classes": ["collapse"],
            },
        ),
        (
            "Access Control",
            {"fields": ("is_public", "required_permissions"), "classes": ["collapse"]},
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at", "is_active"),
                "classes": ["collapse"],
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("organization", "club")


class DashboardWidgetInline(admin.TabularInline):
    model = DashboardWidget
    extra = 0
    fields = [
        "widget",
        "position_x",
        "position_y",
        "width",
        "height",
        "order",
        "title_override",
    ]
    autocomplete_fields = ["widget"]


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "organization",
        "club",
        "dashboard_type",
        "is_public",
        "is_default",
        "auto_refresh",
        "widget_count",
    ]
    list_filter = [
        "dashboard_type",
        "is_public",
        "is_default",
        "auto_refresh",
        "organization",
        "club",
    ]
    search_fields = ["name", "description"]
    filter_horizontal = ["users"]
    inlines = [DashboardWidgetInline]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "name",
                    "description",
                    "dashboard_type",
                    "organization",
                    "club",
                )
            },
        ),
        (
            "Layout Configuration",
            {"fields": ("layout_config",), "classes": ["collapse"]},
        ),
        ("Access Control", {"fields": ("is_public", "is_default", "users")}),
        (
            "Settings",
            {
                "fields": ("auto_refresh", "show_filters", "show_export"),
                "classes": ["collapse"],
            },
        ),
        ("Theming", {"fields": ("theme_config",), "classes": ["collapse"]}),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at", "is_active"),
                "classes": ["collapse"],
            },
        ),
    )

    def widget_count(self, obj):
        return obj.widgets.count()

    widget_count.short_description = "Widgets"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("organization", "club")
            .prefetch_related("widgets")
        )


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "organization",
        "club",
        "report_type",
        "format",
        "frequency",
        "is_scheduled",
        "last_generated",
        "next_generation",
    ]
    list_filter = [
        "report_type",
        "format",
        "frequency",
        "is_scheduled",
        "organization",
        "club",
    ]
    search_fields = ["name", "description"]
    filter_horizontal = ["metrics", "widgets", "recipient_users"]
    readonly_fields = ["last_generated", "next_generation", "created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "description", "report_type", "organization", "club")},
        ),
        ("Data Configuration", {"fields": ("metrics", "widgets", "filter_config")}),
        ("Generation Settings", {"fields": ("format", "template_config")}),
        (
            "Scheduling",
            {
                "fields": (
                    "frequency",
                    "scheduled_time",
                    "scheduled_day",
                    "scheduled_weekday",
                    "is_scheduled",
                )
            },
        ),
        ("Recipients", {"fields": ("recipients", "recipient_users")}),
        (
            "Status",
            {"fields": ("last_generated", "next_generation"), "classes": ["collapse"]},
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at", "is_active"),
                "classes": ["collapse"],
            },
        ),
    )

    actions = ["generate_reports"]

    def generate_reports(self, request, queryset):
        for report in queryset:
            try:
                result = report.generate()
                self.message_user(
                    request, f"Report {report.name} generated successfully"
                )
            except Exception as e:
                self.message_user(
                    request, f"Error generating {report.name}: {str(e)}", level="error"
                )

    generate_reports.short_description = "Generate selected reports"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("organization", "club")


class AlertHistoryInline(admin.TabularInline):
    model = AlertHistory
    extra = 0
    readonly_fields = [
        "action",
        "timestamp",
        "metric_value",
        "threshold_value",
        "message",
        "user",
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "organization",
        "club",
        "metric",
        "alert_type",
        "condition",
        "severity",
        "status",
        "last_triggered",
        "trigger_count",
    ]
    list_filter = [
        "alert_type",
        "condition",
        "severity",
        "status",
        "organization",
        "club",
    ]
    search_fields = ["name", "description", "metric__name"]
    filter_horizontal = ["notification_users"]
    readonly_fields = [
        "last_evaluation",
        "last_triggered",
        "trigger_count",
        "consecutive_triggers",
        "created_at",
        "updated_at",
    ]
    inlines = [AlertHistoryInline]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "description", "alert_type", "organization", "club")},
        ),
        ("Metric Configuration", {"fields": ("metric",)}),
        (
            "Condition Configuration",
            {"fields": ("condition", "threshold_value", "threshold_value_secondary")},
        ),
        (
            "Evaluation Settings",
            {"fields": ("evaluation_period_minutes", "consecutive_evaluations")},
        ),
        ("Alert Settings", {"fields": ("severity", "auto_resolve")}),
        (
            "Notification Configuration",
            {
                "fields": (
                    "notification_config",
                    "notification_users",
                    "notification_emails",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "status",
                    "last_evaluation",
                    "last_triggered",
                    "trigger_count",
                    "consecutive_triggers",
                ),
                "classes": ["collapse"],
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at", "is_active"),
                "classes": ["collapse"],
            },
        ),
    )

    actions = ["evaluate_alerts", "trigger_alerts", "resolve_alerts"]

    def evaluate_alerts(self, request, queryset):
        for alert in queryset:
            try:
                result = alert.evaluate()
                self.message_user(request, f"Alert {alert.name} evaluated: {result}")
            except Exception as e:
                self.message_user(
                    request, f"Error evaluating {alert.name}: {str(e)}", level="error"
                )

    def trigger_alerts(self, request, queryset):
        for alert in queryset:
            try:
                alert.trigger()
                self.message_user(request, f"Alert {alert.name} triggered manually")
            except Exception as e:
                self.message_user(
                    request, f"Error triggering {alert.name}: {str(e)}", level="error"
                )

    def resolve_alerts(self, request, queryset):
        for alert in queryset:
            try:
                alert.resolve()
                self.message_user(request, f"Alert {alert.name} resolved")
            except Exception as e:
                self.message_user(
                    request, f"Error resolving {alert.name}: {str(e)}", level="error"
                )

    evaluate_alerts.short_description = "Evaluate selected alerts"
    trigger_alerts.short_description = "Trigger selected alerts"
    resolve_alerts.short_description = "Resolve selected alerts"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("organization", "club", "metric")
        )


@admin.register(MetricValue)
class MetricValueAdmin(admin.ModelAdmin):
    list_display = ["metric", "value", "timestamp", "period_start", "period_end"]
    list_filter = ["metric__metric_type", "timestamp", "metric__organization"]
    search_fields = ["metric__name"]
    readonly_fields = ["timestamp", "created_at", "updated_at"]
    date_hierarchy = "timestamp"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("metric", "metric__organization", "metric__club")
        )


@admin.register(AlertHistory)
class AlertHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "alert",
        "action",
        "timestamp",
        "metric_value",
        "threshold_value",
        "user",
    ]
    list_filter = ["action", "timestamp", "alert__severity"]
    search_fields = ["alert__name", "message"]
    readonly_fields = ["timestamp", "created_at", "updated_at"]
    date_hierarchy = "timestamp"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("alert", "user")


@admin.register(DashboardWidget)
class DashboardWidgetAdmin(admin.ModelAdmin):
    list_display = [
        "dashboard",
        "widget",
        "position_x",
        "position_y",
        "width",
        "height",
        "order",
    ]
    list_filter = ["dashboard__organization", "dashboard__club"]
    search_fields = ["dashboard__name", "widget__name"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("dashboard", "widget")
