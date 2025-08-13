"""
Models for Business Intelligence module.
"""

import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from core.models import BaseModel, MultiTenantModel

User = get_user_model()


class DataSource(MultiTenantModel):
    """
    Configuration for different data sources used in BI.
    """

    SOURCE_TYPE_CHOICES = [
        ("database", "Base de Datos"),
        ("api", "API Externa"),
        ("file", "Archivo"),
        ("manual", "Manual"),
    ]

    STATUS_CHOICES = [
        ("active", "Activa"),
        ("inactive", "Inactiva"),
        ("error", "Error"),
        ("maintenance", "Mantenimiento"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)

    # Connection Configuration
    connection_config = models.JSONField(
        default=dict, help_text="Configuration for data source connection"
    )

    # Data Mapping
    data_mapping = models.JSONField(
        default=dict, help_text="Mapping of data fields to standard format"
    )

    # Status and Health
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    last_sync = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)

    # Performance
    sync_frequency_minutes = models.IntegerField(
        default=60,
        validators=[MinValueValidator(1), MaxValueValidator(10080)],  # Max 1 week
    )
    auto_sync = models.BooleanField(default=True)

    class Meta:
        ordering = ["organization", "name"]
        indexes = [
            models.Index(fields=["organization", "club", "status"]),
            models.Index(fields=["source_type", "status"]),
        ]
        verbose_name = "Data Source"
        verbose_name_plural = "Data Sources"

    def __str__(self):
        return (
            f"{self.club.name if self.club else self.organization.name} - {self.name}"
        )


class Metric(MultiTenantModel):
    """
    Defined metrics and KPIs that can be calculated.
    """

    METRIC_TYPE_CHOICES = [
        ("revenue", "Ingresos"),
        ("occupancy", "Ocupación"),
        ("customers", "Clientes"),
        ("retention", "Retención"),
        ("growth", "Crecimiento"),
        ("financial", "Financiero"),
        ("operational", "Operacional"),
        ("custom", "Personalizada"),
    ]

    CALCULATION_TYPE_CHOICES = [
        ("sum", "Suma"),
        ("avg", "Promedio"),
        ("count", "Conteo"),
        ("max", "Máximo"),
        ("min", "Mínimo"),
        ("percentage", "Porcentaje"),
        ("ratio", "Ratio"),
        ("growth_rate", "Tasa de Crecimiento"),
        ("custom", "Personalizada"),
    ]

    PERIOD_TYPE_CHOICES = [
        ("real_time", "Tiempo Real"),
        ("daily", "Diaria"),
        ("weekly", "Semanal"),
        ("monthly", "Mensual"),
        ("quarterly", "Trimestral"),
        ("yearly", "Anual"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES)

    # Calculation
    calculation_type = models.CharField(max_length=20, choices=CALCULATION_TYPE_CHOICES)
    calculation_config = models.JSONField(
        default=dict, help_text="Configuration for metric calculation"
    )

    # Data Source
    data_sources = models.ManyToManyField(
        DataSource,
        related_name="metrics",
        help_text="Data sources used for this metric",
    )

    # Aggregation
    period_type = models.CharField(
        max_length=20, choices=PERIOD_TYPE_CHOICES, default="daily"
    )

    # Target and Benchmarks
    target_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Target value for this metric",
    )
    benchmark_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Benchmark value for comparison",
    )

    # Display
    unit = models.CharField(
        max_length=20, blank=True, help_text="Unit of measurement (%, $, etc.)"
    )
    decimal_places = models.IntegerField(
        default=2, validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    color = models.CharField(max_length=7, default="#3498db")
    icon = models.CharField(max_length=50, blank=True)

    # Settings
    is_public = models.BooleanField(default=False)
    auto_calculate = models.BooleanField(default=True)
    cache_duration_minutes = models.IntegerField(
        default=15, validators=[MinValueValidator(1), MaxValueValidator(1440)]
    )

    class Meta:
        ordering = ["organization", "metric_type", "name"]
        indexes = [
            models.Index(fields=["organization", "club", "metric_type"]),
            models.Index(fields=["calculation_type", "period_type"]),
        ]
        unique_together = ["organization", "club", "name"]
        verbose_name = "Metric"
        verbose_name_plural = "Metrics"

    def __str__(self):
        return (
            f"{self.club.name if self.club else self.organization.name} - {self.name}"
        )

    def calculate_value(self, start_date=None, end_date=None):
        """
        Calculate metric value for the given period.
        """
        from .services import MetricsCalculator

        calculator = MetricsCalculator(self)
        return calculator.calculate(start_date, end_date)


class Widget(MultiTenantModel):
    """
    Dashboard widgets that display metrics and data.
    """

    WIDGET_TYPE_CHOICES = [
        ("metric", "Métrica"),
        ("chart", "Gráfico"),
        ("table", "Tabla"),
        ("gauge", "Indicador"),
        ("map", "Mapa"),
        ("text", "Texto"),
        ("iframe", "IFrame"),
        ("custom", "Personalizado"),
    ]

    CHART_TYPE_CHOICES = [
        ("line", "Línea"),
        ("bar", "Barras"),
        ("pie", "Pastel"),
        ("doughnut", "Dona"),
        ("area", "Área"),
        ("scatter", "Dispersión"),
        ("radar", "Radar"),
        ("bubble", "Burbuja"),
        ("heatmap", "Mapa de Calor"),
    ]

    SIZE_CHOICES = [
        ("small", "Pequeño (1x1)"),
        ("medium", "Mediano (2x1)"),
        ("large", "Grande (2x2)"),
        ("wide", "Ancho (3x1)"),
        ("tall", "Alto (1x3)"),
        ("full", "Completo (3x3)"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    widget_type = models.CharField(max_length=20, choices=WIDGET_TYPE_CHOICES)

    # Chart Configuration
    chart_type = models.CharField(
        max_length=20,
        choices=CHART_TYPE_CHOICES,
        blank=True,
        help_text="Required if widget_type is chart",
    )

    # Data Configuration
    metrics = models.ManyToManyField(
        Metric,
        related_name="widgets",
        blank=True,
        help_text="Metrics displayed in this widget",
    )
    data_config = models.JSONField(
        default=dict, help_text="Configuration for data display"
    )

    # Display Configuration
    display_config = models.JSONField(
        default=dict, help_text="Configuration for widget appearance"
    )
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, default="medium")

    # Content (for text/iframe widgets)
    content = models.TextField(blank=True)

    # Refresh Settings
    auto_refresh = models.BooleanField(default=True)
    refresh_interval_seconds = models.IntegerField(
        default=300, validators=[MinValueValidator(30), MaxValueValidator(3600)]
    )

    # Access Control
    is_public = models.BooleanField(default=False)
    required_permissions = models.JSONField(
        default=list, help_text="List of required permissions to view widget"
    )

    class Meta:
        ordering = ["organization", "name"]
        indexes = [
            models.Index(fields=["organization", "club", "widget_type"]),
            models.Index(fields=["widget_type", "is_active"]),
        ]
        unique_together = ["organization", "club", "name"]
        verbose_name = "Widget"
        verbose_name_plural = "Widgets"

    def __str__(self):
        return (
            f"{self.club.name if self.club else self.organization.name} - {self.name}"
        )

    def get_data(self, start_date=None, end_date=None):
        """
        Get data for the widget based on its configuration.
        """
        from .services import WidgetDataService

        service = WidgetDataService(self)
        return service.get_data(start_date, end_date)


class Dashboard(MultiTenantModel):
    """
    Dashboard containers that hold multiple widgets.
    """

    DASHBOARD_TYPE_CHOICES = [
        ("executive", "Ejecutivo"),
        ("operational", "Operacional"),
        ("financial", "Financiero"),
        ("customer", "Cliente"),
        ("staff", "Personal"),
        ("custom", "Personalizado"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    dashboard_type = models.CharField(max_length=20, choices=DASHBOARD_TYPE_CHOICES)

    # Layout Configuration
    layout_config = models.JSONField(
        default=dict, help_text="Grid layout configuration for widgets"
    )

    # Widgets
    widgets = models.ManyToManyField(
        Widget, through="DashboardWidget", related_name="dashboards"
    )

    # Access Control
    is_public = models.BooleanField(default=False)
    is_default = models.BooleanField(
        default=False, help_text="Default dashboard for user role"
    )

    # Users with access
    users = models.ManyToManyField(
        User,
        blank=True,
        related_name="dashboards",
        help_text="Users with specific access to this dashboard",
    )

    # Settings
    auto_refresh = models.BooleanField(default=True)
    show_filters = models.BooleanField(default=True)
    show_export = models.BooleanField(default=True)

    # Theming
    theme_config = models.JSONField(
        default=dict, help_text="Theme and styling configuration"
    )

    class Meta:
        ordering = ["organization", "dashboard_type", "name"]
        indexes = [
            models.Index(fields=["organization", "club", "dashboard_type"]),
            models.Index(fields=["is_public", "is_active"]),
        ]
        unique_together = ["organization", "club", "name"]
        verbose_name = "Dashboard"
        verbose_name_plural = "Dashboards"

    def __str__(self):
        return (
            f"{self.club.name if self.club else self.organization.name} - {self.name}"
        )

    def can_user_access(self, user):
        """
        Check if user can access this dashboard.
        """
        if self.is_public:
            return True

        if user in self.users.all():
            return True

        # Check organization/club access
        if self.club and hasattr(user, "client_profile"):
            # TODO: Implement club membership check
            return True

        return False


class DashboardWidget(BaseModel):
    """
    Through model for Dashboard-Widget relationship with positioning.
    """

    dashboard = models.ForeignKey(
        Dashboard, on_delete=models.CASCADE, related_name="dashboard_widgets"
    )
    widget = models.ForeignKey(
        Widget, on_delete=models.CASCADE, related_name="widget_dashboards"
    )

    # Position in grid
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=1)
    height = models.IntegerField(default=1)

    # Display order
    order = models.IntegerField(default=0)

    # Widget-specific overrides
    title_override = models.CharField(max_length=200, blank=True)
    config_override = models.JSONField(
        default=dict, help_text="Override widget configuration for this dashboard"
    )

    class Meta:
        ordering = ["dashboard", "order"]
        unique_together = ["dashboard", "widget"]
        verbose_name = "Dashboard Widget"
        verbose_name_plural = "Dashboard Widgets"

    def __str__(self):
        return f"{self.dashboard.name} - {self.widget.name}"


class Report(MultiTenantModel):
    """
    Automated reports generation and scheduling.
    """

    REPORT_TYPE_CHOICES = [
        ("financial", "Financiero"),
        ("operational", "Operacional"),
        ("customer", "Clientes"),
        ("staff", "Personal"),
        ("inventory", "Inventario"),
        ("marketing", "Marketing"),
        ("custom", "Personalizado"),
    ]

    FORMAT_CHOICES = [
        ("pdf", "PDF"),
        ("excel", "Excel"),
        ("csv", "CSV"),
        ("json", "JSON"),
        ("html", "HTML"),
    ]

    FREQUENCY_CHOICES = [
        ("manual", "Manual"),
        ("daily", "Diario"),
        ("weekly", "Semanal"),
        ("monthly", "Mensual"),
        ("quarterly", "Trimestral"),
        ("yearly", "Anual"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)

    # Data Configuration
    metrics = models.ManyToManyField(
        Metric, related_name="reports", help_text="Metrics included in this report"
    )
    widgets = models.ManyToManyField(
        Widget,
        related_name="reports",
        blank=True,
        help_text="Widgets included in this report",
    )

    # Report Configuration
    template_config = models.JSONField(
        default=dict, help_text="Report template and layout configuration"
    )
    filter_config = models.JSONField(
        default=dict, help_text="Default filters for report data"
    )

    # Generation Settings
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default="pdf")
    frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, default="manual"
    )

    # Scheduling
    scheduled_time = models.TimeField(
        null=True, blank=True, help_text="Time of day to generate report"
    )
    scheduled_day = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month for monthly reports",
    )
    scheduled_weekday = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        help_text="Day of week for weekly reports (0=Monday)",
    )

    # Recipients
    recipients = models.JSONField(
        default=list, help_text="List of email addresses to send report to"
    )
    recipient_users = models.ManyToManyField(
        User,
        blank=True,
        related_name="reports",
        help_text="Users who receive this report",
    )

    # Status
    is_scheduled = models.BooleanField(default=False)
    last_generated = models.DateTimeField(null=True, blank=True)
    next_generation = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["organization", "report_type", "name"]
        indexes = [
            models.Index(fields=["organization", "club", "report_type"]),
            models.Index(fields=["frequency", "is_scheduled"]),
            models.Index(fields=["next_generation", "is_active"]),
        ]
        unique_together = ["organization", "club", "name"]
        verbose_name = "Report"
        verbose_name_plural = "Reports"

    def __str__(self):
        return (
            f"{self.club.name if self.club else self.organization.name} - {self.name}"
        )

    def generate(self, start_date=None, end_date=None):
        """
        Generate the report for the specified period.
        """
        from .services import ReportGenerator

        generator = ReportGenerator(self)
        return generator.generate(start_date, end_date)

    def calculate_next_generation(self):
        """
        Calculate next generation time based on frequency.
        """
        from datetime import datetime, timedelta

        if not self.is_scheduled or self.frequency == "manual":
            self.next_generation = None
            return

        now = timezone.now()

        if self.frequency == "daily":
            next_gen = now.replace(
                hour=self.scheduled_time.hour,
                minute=self.scheduled_time.minute,
                second=0,
                microsecond=0,
            )
            if next_gen <= now:
                next_gen += timedelta(days=1)

        elif self.frequency == "weekly":
            days_ahead = self.scheduled_weekday - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_gen = now + timedelta(days=days_ahead)
            next_gen = next_gen.replace(
                hour=self.scheduled_time.hour,
                minute=self.scheduled_time.minute,
                second=0,
                microsecond=0,
            )

        elif self.frequency == "monthly":
            next_gen = now.replace(
                day=self.scheduled_day,
                hour=self.scheduled_time.hour,
                minute=self.scheduled_time.minute,
                second=0,
                microsecond=0,
            )
            if next_gen <= now:
                if next_gen.month == 12:
                    next_gen = next_gen.replace(year=next_gen.year + 1, month=1)
                else:
                    next_gen = next_gen.replace(month=next_gen.month + 1)

        else:
            next_gen = None

        self.next_generation = next_gen
        self.save(update_fields=["next_generation"])


class Alert(MultiTenantModel):
    """
    Automated alerts based on metric thresholds.
    """

    ALERT_TYPE_CHOICES = [
        ("threshold", "Umbral"),
        ("anomaly", "Anomalía"),
        ("trend", "Tendencia"),
        ("comparison", "Comparación"),
        ("schedule", "Programada"),
    ]

    CONDITION_CHOICES = [
        ("greater_than", "Mayor que"),
        ("less_than", "Menor que"),
        ("equals", "Igual a"),
        ("not_equals", "Diferente de"),
        ("between", "Entre"),
        ("outside", "Fuera de rango"),
        ("change_percent", "Cambio porcentual"),
    ]

    SEVERITY_CHOICES = [
        ("low", "Baja"),
        ("medium", "Media"),
        ("high", "Alta"),
        ("critical", "Crítica"),
    ]

    STATUS_CHOICES = [
        ("active", "Activa"),
        ("triggered", "Disparada"),
        ("resolved", "Resuelta"),
        ("disabled", "Deshabilitada"),
    ]

    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)

    # Metric Configuration
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name="alerts")

    # Condition Configuration
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    threshold_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    threshold_value_secondary = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="For range conditions (between, outside)",
    )

    # Evaluation Settings
    evaluation_period_minutes = models.IntegerField(
        default=60, validators=[MinValueValidator(5), MaxValueValidator(1440)]
    )
    consecutive_evaluations = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Number of consecutive evaluations needed to trigger",
    )

    # Alert Settings
    severity = models.CharField(
        max_length=20, choices=SEVERITY_CHOICES, default="medium"
    )
    auto_resolve = models.BooleanField(
        default=True, help_text="Auto-resolve when condition is no longer met"
    )

    # Notification Configuration
    notification_config = models.JSONField(
        default=dict, help_text="Configuration for alert notifications"
    )

    # Recipients
    notification_users = models.ManyToManyField(
        User,
        blank=True,
        related_name="alerts",
        help_text="Users to notify when alert triggers",
    )
    notification_emails = models.JSONField(
        default=list, help_text="Additional email addresses for notifications"
    )

    # Status and Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    last_evaluation = models.DateTimeField(null=True, blank=True)
    last_triggered = models.DateTimeField(null=True, blank=True)
    trigger_count = models.IntegerField(default=0)
    consecutive_triggers = models.IntegerField(default=0)

    class Meta:
        ordering = ["organization", "severity", "name"]
        indexes = [
            models.Index(fields=["organization", "club", "status"]),
            models.Index(fields=["metric", "status"]),
            models.Index(fields=["status", "severity"]),
            models.Index(fields=["last_evaluation", "status"]),
        ]
        unique_together = ["organization", "club", "name"]
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"

    def __str__(self):
        return (
            f"{self.club.name if self.club else self.organization.name} - {self.name}"
        )

    def evaluate(self):
        """
        Evaluate alert condition against current metric value.
        """
        from .services import AlertEvaluator

        evaluator = AlertEvaluator(self)
        return evaluator.evaluate()

    def trigger(self):
        """
        Trigger the alert and send notifications.
        """
        self.status = "triggered"
        self.last_triggered = timezone.now()
        self.trigger_count += 1
        self.consecutive_triggers += 1
        self.save()

        # Send notifications
        from .services import AlertNotificationService

        service = AlertNotificationService(self)
        service.send_notifications()

    def resolve(self):
        """
        Resolve the alert.
        """
        self.status = "resolved"
        self.consecutive_triggers = 0
        self.save()


class MetricValue(BaseModel):
    """
    Historical values for metrics.
    """

    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name="values")

    # Value and Timestamp
    value = models.DecimalField(max_digits=15, decimal_places=5)
    timestamp = models.DateTimeField(db_index=True)

    # Period Information
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    # Metadata
    calculation_metadata = models.JSONField(
        default=dict, help_text="Metadata about how the value was calculated"
    )

    class Meta:
        ordering = ["metric", "-timestamp"]
        indexes = [
            models.Index(fields=["metric", "timestamp"]),
            models.Index(fields=["metric", "period_start", "period_end"]),
        ]
        unique_together = ["metric", "timestamp"]
        verbose_name = "Metric Value"
        verbose_name_plural = "Metric Values"

    def __str__(self):
        return f"{self.metric.name} - {self.value} ({self.timestamp})"


class AlertHistory(BaseModel):
    """
    History of alert triggers and resolutions.
    """

    ACTION_CHOICES = [
        ("triggered", "Disparada"),
        ("resolved", "Resuelta"),
        ("disabled", "Deshabilitada"),
        ("modified", "Modificada"),
    ]

    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name="history")

    # Action Information
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    # Values
    metric_value = models.DecimalField(
        max_digits=15, decimal_places=5, null=True, blank=True
    )
    threshold_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )

    # Context
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)

    # User who performed action (if manual)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alert_actions",
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["alert", "-timestamp"]),
            models.Index(fields=["action", "-timestamp"]),
        ]
        verbose_name = "Alert History"
        verbose_name_plural = "Alert History"

    def __str__(self):
        return f"{self.alert.name} - {self.get_action_display()} ({self.timestamp})"
