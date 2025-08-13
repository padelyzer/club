/**
 * Tipos COMPLETOS para notifications
 * Incluye TODOS los campos del modelo Django
 */

export interface NotificationType {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  is_system: boolean;
  defaultEnabled: boolean;
  default_enabled: boolean;
  availableChannels: Record<string, any>;
  available_channels: Record<string, any>;
}

export interface NotificationChannel {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  name: string;
  slug: string;
  channelType: string;
  channel_type: string;
  description?: string;
  isEnabled: boolean;
  is_enabled: boolean;
  priority: number;
  rateLimitPerMinute?: number;
  rate_limit_per_minute?: number;
  rateLimitPerHour?: number;
  rate_limit_per_hour?: number;
  rateLimitPerDay?: number;
  rate_limit_per_day?: number;
  providerConfig: Record<string, any>;
  provider_config: Record<string, any>;
  notificationType: string;
  notification_type: string;
  channel: string;
  subjectTemplate?: string;
  subject_template?: string;
  bodyTemplate: string;
  body_template: string;
  variables: Record<string, any>;
  language: string;
  isDefault: boolean;
  is_default: boolean;
}

export interface UserNotificationPreference {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user: string;
  notificationType: string;
  notification_type: string;
  emailEnabled: boolean;
  email_enabled: boolean;
  smsEnabled: boolean;
  sms_enabled: boolean;
  whatsappEnabled: boolean;
  whatsapp_enabled: boolean;
  pushWebEnabled: boolean;
  push_web_enabled: boolean;
  pushMobileEnabled: boolean;
  push_mobile_enabled: boolean;
  inAppEnabled: boolean;
  in_app_enabled: boolean;
  quietHoursStart?: string;
  quiet_hours_start?: string;
  quietHoursEnd?: string;
  quiet_hours_end?: string;
  digestEnabled: boolean;
  digest_enabled: boolean;
  digestFrequency: string;
  digest_frequency: string;
  name: string;
  batchType: string;
  batch_type: string;
  status: string;
  recipients?: string[];
  recipientFilters: Record<string, any>;
  recipient_filters: Record<string, any>;
  subject?: string;
  message: string;
  template?: string;
  templateContext: Record<string, any>;
  template_context: Record<string, any>;
  channels: string[];
  scheduledAt?: string;
  scheduled_at?: string;
  startedAt?: string;
  started_at?: string;
  completedAt?: string;
  completed_at?: string;
  totalRecipients: number;
  total_recipients: number;
  totalSent: number;
  total_sent: number;
  totalDelivered: number;
  total_delivered: number;
  totalFailed: number;
  total_failed: number;
  createdBy?: string;
  created_by?: string;
  errorLog?: string;
  error_log?: string;
  recipient: string;
  title: string;
  priority: string;
  category?: string;
  actionUrl?: string;
  action_url?: string;
  actionLabel?: string;
  action_label?: string;
  deepLink?: string;
  deep_link?: string;
  data: Record<string, any>;
  isRead: boolean;
  is_read: boolean;
  readAt?: string;
  read_at?: string;
  batch?: string;
}

export interface NotificationDelivery {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  notification: string;
  channel: string;
  status: string;
  attemptCount: number;
  attempt_count: number;
  maxAttempts: number;
  max_attempts: number;
  providerId?: string;
  provider_id?: string;
  providerResponse: Record<string, any>;
  provider_response: Record<string, any>;
  sentAt?: string;
  sent_at?: string;
  deliveredAt?: string;
  delivered_at?: string;
  failedAt?: string;
  failed_at?: string;
  readAt?: string;
  read_at?: string;
  clickedAt?: string;
  clicked_at?: string;
  nextRetryAt?: string;
  next_retry_at?: string;
  errorCode?: string;
  error_code?: string;
  errorMessage?: string;
  error_message?: string;
}

export interface NotificationEvent {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  notification: string;
  delivery?: string;
  eventType: string;
  event_type: string;
  eventData: Record<string, any>;
  event_data: Record<string, any>;
  ipAddress?: any;
  ip_address?: any;
  userAgent?: string;
  user_agent?: string;
}
