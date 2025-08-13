/**
 * Tipos COMPLETOS para bi
 * Incluye TODOS los campos del modelo Django
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
  name: string;
  description?: string;
  reportType: string;
  report_type: string;
  metrics: string[];
  widgets?: string[];
  templateConfig: Record<string, any>;
  template_config: Record<string, any>;
  filterConfig: Record<string, any>;
  filter_config: Record<string, any>;
  format: string;
  frequency: string;
  scheduledTime?: string;
  scheduled_time?: string;
  scheduledDay?: number;
  scheduled_day?: number;
  scheduledWeekday?: number;
  scheduled_weekday?: number;
  recipients: Record<string, any>;
  recipientUsers?: string[];
  recipient_users?: string[];
  isScheduled: boolean;
  is_scheduled: boolean;
  lastGenerated?: string;
  last_generated?: string;
  nextGeneration?: string;
  next_generation?: string;
  alertType: string;
  alert_type: string;
  metric: string;
  condition: string;
  thresholdValue?: string;
  threshold_value?: string;
  thresholdValueSecondary?: string;
  threshold_value_secondary?: string;
  evaluationPeriodMinutes: number;
  evaluation_period_minutes: number;
  consecutiveEvaluations: number;
  consecutive_evaluations: number;
  severity: string;
  autoResolve: boolean;
  auto_resolve: boolean;
  notificationConfig: Record<string, any>;
  notification_config: Record<string, any>;
  notificationUsers?: string[];
  notification_users?: string[];
  notificationEmails: Record<string, any>;
  notification_emails: Record<string, any>;
  status: string;
  lastEvaluation?: string;
  last_evaluation?: string;
  lastTriggered?: string;
  last_triggered?: string;
  triggerCount: number;
  trigger_count: number;
  consecutiveTriggers: number;
  consecutive_triggers: number;
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
