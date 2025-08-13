/**
 * Tipos TypeScript para bi
 * Generado automáticamente desde models.py
 */

export interface DashboardWidget {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  dashboard: string;
  widget: string;
  positionX: number;
  position_x: number;
  positionY: number;
  position_y: number;
  width: number;
  height: number;
  order: number;
  titleOverride?: string;
  title_override?: string;
  configOverride: Record<string, any>;
  config_override: Record<string, any>;
}

export interface DashboardWidgetForm {
  dashboard?: string;
  widget?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  order?: number;
  titleOverride?: string;
  configOverride?: Record<string, any>;
}

export interface MetricValue {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  metric: string;
  value: string;
  timestamp: string;
  periodStart: string;
  period_start: string;
  periodEnd: string;
  period_end: string;
  calculationMetadata: Record<string, any>;
  calculation_metadata: Record<string, any>;
}

export interface MetricValueForm {
  metric?: string;
  value?: string;
  timestamp?: string;
  periodStart?: string;
  periodEnd?: string;
  calculationMetadata?: Record<string, any>;
}

export interface AlertHistory {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  alert: string;
  action: string;
  timestamp: string;
  metricValue?: string;
  metric_value?: string;
  thresholdValue?: string;
  threshold_value?: string;
  message?: string;
  metadata: Record<string, any>;
  user?: string;
}

export interface AlertHistoryForm {
  alert?: string;
  action?: string;
  timestamp?: string;
  metricValue?: string;
  thresholdValue?: string;
  message?: string;
  metadata?: Record<string, any>;
  user?: string;
}
