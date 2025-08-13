/**
 * Tipos TypeScript para notifications
 * Generado automáticamente desde models.py
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

export interface NotificationTypeForm {
  name?: string;
  slug?: string;
  description?: string;
  isSystem?: boolean;
  defaultEnabled?: boolean;
  availableChannels?: Record<string, any>;
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
}

export interface NotificationChannelForm {
  name?: string;
  slug?: string;
  channelType?: string;
  description?: string;
  isEnabled?: boolean;
  priority?: number;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  providerConfig?: Record<string, any>;
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
}

export interface UserNotificationPreferenceForm {
  user?: string;
  notificationType?: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  pushWebEnabled?: boolean;
  pushMobileEnabled?: boolean;
  inAppEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestEnabled?: boolean;
  digestFrequency?: string;
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

export interface NotificationDeliveryForm {
  notification?: string;
  channel?: string;
  status?: string;
  attemptCount?: number;
  maxAttempts?: number;
  providerId?: string;
  providerResponse?: Record<string, any>;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  readAt?: string;
  clickedAt?: string;
  nextRetryAt?: string;
  errorCode?: string;
  errorMessage?: string;
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

export interface NotificationEventForm {
  notification?: string;
  delivery?: string;
  eventType?: string;
  eventData?: Record<string, any>;
  ipAddress?: any;
  userAgent?: string;
}
