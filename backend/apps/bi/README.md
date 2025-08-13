# Business Intelligence Module

## Descripción

El módulo BI (Business Intelligence) de Padelyzer proporciona análisis de datos, métricas, dashboards personalizables, reportes automáticos y alertas inteligentes para clubs de pádel.

## Características Principales

### 1. Modelos de Datos

#### DataSource
- **Propósito**: Configuración de fuentes de datos externas
- **Tipos soportados**: Database, API, File, Manual
- **Funcionalidades**: Auto-sync, configuración de conexión, mapeo de datos

#### Metric
- **Propósito**: Definición de métricas y KPIs calculables
- **Tipos**: Revenue, Occupancy, Customers, Retention, Growth, Financial, Operational, Custom
- **Cálculos**: Sum, Average, Count, Percentage, Growth Rate, Custom
- **Configuración**: Valores objetivo, benchmarks, unidades, formato

#### Widget
- **Propósito**: Widgets visuales para dashboards
- **Tipos**: Metric, Chart, Table, Gauge, Map, Text, IFrame, Custom
- **Gráficos**: Line, Bar, Pie, Doughnut, Area, Scatter, Radar, Bubble, Heatmap
- **Configuración**: Tamaño, auto-refresh, permisos, configuración visual

#### Dashboard
- **Propósito**: Contenedores de widgets con layout personalizable
- **Tipos**: Executive, Operational, Financial, Customer, Staff, Custom
- **Funcionalidades**: Layout grid, control de acceso, temas, filtros, exportación

#### Report
- **Propósito**: Generación automática de reportes
- **Tipos**: Financial, Operational, Customer, Staff, Inventory, Marketing, Custom
- **Formatos**: PDF, Excel, CSV, JSON, HTML
- **Programación**: Manual, Daily, Weekly, Monthly, Quarterly, Yearly

#### Alert
- **Propósito**: Alertas automáticas basadas en umbrales
- **Tipos**: Threshold, Anomaly, Trend, Comparison, Scheduled
- **Condiciones**: Greater than, Less than, Equals, Between, Outside, Change percent
- **Severidad**: Low, Medium, High, Critical

### 2. Servicios de Análisis

#### MetricsCalculator
- Cálculo de métricas en tiempo real
- Integración con módulos existentes (Finance, Reservations, Clients, etc.)
- Cálculos de tendencias y comparaciones

#### WidgetDataService
- Generación de datos para widgets
- Soporte para diferentes tipos de visualización
- Caching y optimización de consultas

#### ReportGenerator
- Generación automática de reportes
- Múltiples formatos de salida
- Programación y distribución automática

#### AlertEvaluator
- Evaluación de condiciones de alerta
- Notificaciones automáticas
- Historial de disparos y resoluciones

#### ClubAnalyticsService
- Análisis específicos por club
- Métricas de negocio integrales
- Comparaciones temporales

### 3. API Endpoints

#### DataSources (`/api/bi/data-sources/`)
- `GET /` - Listar fuentes de datos
- `POST /` - Crear fuente de datos
- `GET /{id}/` - Obtener fuente específica
- `PUT /{id}/` - Actualizar fuente
- `DELETE /{id}/` - Eliminar fuente
- `POST /{id}/sync/` - Sincronizar datos manualmente
- `GET /{id}/test_connection/` - Probar conexión

#### Metrics (`/api/bi/metrics/`)
- `GET /` - Listar métricas
- `POST /` - Crear métrica
- `GET /{id}/` - Obtener métrica específica
- `PUT /{id}/` - Actualizar métrica
- `DELETE /{id}/` - Eliminar métrica
- `POST /{id}/calculate/` - Calcular valor de métrica
- `GET /{id}/history/` - Obtener historial de valores
- `POST /calculate_all/` - Calcular todas las métricas

#### Widgets (`/api/bi/widgets/`)
- `GET /` - Listar widgets
- `POST /` - Crear widget
- `GET /{id}/` - Obtener widget específico
- `PUT /{id}/` - Actualizar widget
- `DELETE /{id}/` - Eliminar widget
- `POST /{id}/get_data/` - Obtener datos del widget
- `POST /{id}/duplicate/` - Duplicar widget

#### Dashboards (`/api/bi/dashboards/`)
- `GET /` - Listar dashboards
- `POST /` - Crear dashboard
- `GET /{id}/` - Obtener dashboard específico
- `PUT /{id}/` - Actualizar dashboard
- `DELETE /{id}/` - Eliminar dashboard
- `POST /{id}/add_widget/` - Agregar widget al dashboard
- `DELETE /{id}/remove_widget/` - Remover widget del dashboard
- `POST /{id}/update_layout/` - Actualizar layout
- `POST /{id}/duplicate/` - Duplicar dashboard

#### Reports (`/api/bi/reports/`)
- `GET /` - Listar reportes
- `POST /` - Crear reporte
- `GET /{id}/` - Obtener reporte específico
- `PUT /{id}/` - Actualizar reporte
- `DELETE /{id}/` - Eliminar reporte
- `POST /{id}/generate/` - Generar reporte
- `POST /{id}/schedule/` - Programar/desprogramar reporte
- `POST /generate_scheduled/` - Generar reportes programados

#### Alerts (`/api/bi/alerts/`)
- `GET /` - Listar alertas
- `POST /` - Crear alerta
- `GET /{id}/` - Obtener alerta específica
- `PUT /{id}/` - Actualizar alerta
- `DELETE /{id}/` - Eliminar alerta
- `POST /{id}/evaluate/` - Evaluar alerta manualmente
- `POST /{id}/resolve/` - Resolver alerta
- `POST /evaluate_all/` - Evaluar todas las alertas

#### Analytics (`/api/bi/analytics/`)
- `POST /dashboard/` - Análisis para dashboard
- `POST /club/` - Análisis específicos de club
- `POST /export/` - Exportar datos de análisis

## Métricas Predefinidas

### Métricas de Ingresos
- **Total Revenue**: Suma de todos los ingresos
- **Revenue by Category**: Ingresos segmentados por categoría
- **Average Transaction Value**: Valor promedio por transacción
- **Revenue Growth Rate**: Tasa de crecimiento de ingresos

### Métricas de Ocupación
- **Court Occupancy Rate**: Porcentaje de ocupación de canchas
- **Peak Hours Usage**: Uso en horas pico
- **Booking Count**: Número total de reservas
- **Cancellation Rate**: Tasa de cancelaciones

### Métricas de Clientes
- **Active Customers**: Clientes activos en el período
- **New Customers**: Nuevos clientes adquiridos
- **Customer Retention Rate**: Tasa de retención de clientes
- **Customer Growth Rate**: Tasa de crecimiento de clientes

### Métricas Operacionales
- **Class Attendance Rate**: Tasa de asistencia a clases
- **Tournament Participation**: Participación en torneos
- **Staff Utilization**: Utilización del personal
- **Equipment Usage**: Uso de equipamiento

## Configuración de Métricas

### Ejemplo: Métrica de Ingresos
```json
{
    "name": "Monthly Revenue",
    "metric_type": "revenue",
    "calculation_type": "sum",
    "calculation_config": {
        "category": "reservation_payment",
        "period": "monthly"
    },
    "target_value": 50000.00,
    "unit": "$",
    "auto_calculate": true
}
```

### Ejemplo: Alerta de Ingresos Bajos
```json
{
    "name": "Low Monthly Revenue Alert",
    "alert_type": "threshold",
    "condition": "less_than",
    "threshold_value": 40000.00,
    "severity": "high",
    "auto_resolve": true,
    "notification_config": {
        "email": true,
        "sms": false
    }
}
```

## Dashboards Predefinidos

### Executive Dashboard
- KPIs principales del negocio
- Métricas de ingresos y crecimiento
- Indicadores de rendimiento

### Operational Dashboard
- Ocupación de canchas
- Eficiencia operacional
- Métricas de personal

### Financial Dashboard
- Análisis financiero detallado
- P&L simplificado
- Proyecciones

### Customer Dashboard
- Métricas de clientes
- Retención y adquisición
- Satisfacción del cliente

## Integración con Módulos Existentes

El módulo BI se integra automáticamente con:

- **Finance**: Análisis de transacciones, ingresos, gastos
- **Reservations**: Ocupación, cancelaciones, tendencias de reservas
- **Clients**: Análisis de clientes, retención, segmentación
- **Classes**: Asistencia, participación, efectividad de clases
- **Tournaments**: Participación, ingresos de torneos
- **Clubs**: Métricas específicas por club

## Configuración de Desarrollo

### 1. Migraciones
```bash
python manage.py makemigrations bi
python manage.py migrate
```

### 2. Crear Datos de Prueba
```python
# En Django shell
from apps.bi.models import *
from apps.clubs.models import Club

# Crear métrica de ejemplo
metric = Metric.objects.create(
    organization=organization,
    club=club,
    name="Revenue",
    metric_type="revenue",
    calculation_type="sum"
)
```

### 3. Ejecutar Pruebas
```bash
python manage.py test apps.bi
```

## Administración

El módulo incluye configuración completa del Django Admin para:
- Gestión de fuentes de datos
- Configuración de métricas
- Administración de dashboards
- Configuración de alertas
- Gestión de reportes

## Próximas Funcionalidades

- [ ] Machine Learning para predicciones
- [ ] Análisis de sentimientos de clientes
- [ ] Optimización automática de precios
- [ ] Análisis de competencia
- [ ] Integración con Google Analytics
- [ ] Dashboard móvil optimizado
- [ ] Alertas por WhatsApp
- [ ] Reportes con IA generativa