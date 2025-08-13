// Notifications Types - Synchronized with Django notifications models

// Import User type
import { User } from './user';

// NotificationType model
export interface NotificationType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Configuration
  isSystem: boolean;
  defaultEnabled: boolean;
  
  // Available channels for this notification type
  availableChannels: string[]; // List of channel slugs
  
  // Snake_case equivalents
  is_system?: boolean;
  default_enabled?: boolean;
  available_channels?: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// NotificationChannel model
export interface NotificationChannel {
  id: string;
  name: string;
  slug: string;
  channelType: 'email' | 'sms' | 'whatsapp' | 'push_web' | 'push_mobile' | 'in_app';
  description?: string;
  
  // Configuration
  isEnabled: boolean;
  priority: number; // 1-100, 1=highest, 100=lowest
  
  // Rate limiting
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  
  // Provider configuration
  providerConfig: Record<string, any>;
  
  // Snake_case equivalents
  channel_type?: 'email' | 'sms' | 'whatsapp' | 'push_web' | 'push_mobile' | 'in_app';
  is_enabled?: boolean;
  rate_limit_per_minute?: number;
  rate_limit_per_hour?: number;
  rate_limit_per_day?: number;
  provider_config?: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// NotificationTemplate model
export interface NotificationTemplate {
  id: string;
  name: string;
  notificationType: string | NotificationType;
  channel: string | NotificationChannel;
  organization?: string;
  club?: string;
  
  // Template content
  subjectTemplate?: string;
  bodyTemplate: string;
  
  // Template metadata
  variables: Record<string, any>;
  language: string;
  
  // Template settings
  isDefault: boolean;
  
  // Snake_case equivalents
  notification_type?: string | NotificationType;
  subject_template?: string;
  body_template?: string;
  is_default?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// UserNotificationPreference model
export interface UserNotificationPreference {
  id: string;
  user: string | User;
  notificationType: string | NotificationType;
  
  // Channel preferences
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushWebEnabled: boolean;
  pushMobileEnabled: boolean;
  inAppEnabled: boolean;
  
  // Timing preferences
  quietHoursStart?: string; // TimeField as string
  quietHoursEnd?: string; // TimeField as string
  
  // Frequency control
  digestEnabled: boolean;
  digestFrequency: 'hourly' | 'daily' | 'weekly';
  
  // Snake_case equivalents
  notification_type?: string | NotificationType;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  whatsapp_enabled?: boolean;
  push_web_enabled?: boolean;
  push_mobile_enabled?: boolean;
  in_app_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  digest_enabled?: boolean;
  digest_frequency?: 'hourly' | 'daily' | 'weekly';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// NotificationBatch model
export interface NotificationBatch {
  id: string;
  organization?: string;
  club?: string;
  name: string;
  notificationType: string | NotificationType;
  
  // Batch configuration
  batchType: 'manual' | 'scheduled' | 'triggered';
  status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Recipients
  recipients: string[]; // User IDs
  recipientFilters: Record<string, any>;
  
  // Message content
  subject?: string;
  message: string;
  template?: string | NotificationTemplate;
  templateContext: Record<string, any>;
  
  // Channels
  channels: string[]; // NotificationChannel IDs
  
  // Scheduling
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  
  // Statistics
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  
  // Metadata
  createdBy?: string | User;
  errorLog?: string;
  
  // Snake_case equivalents
  notification_type?: string | NotificationType;
  batch_type?: 'manual' | 'scheduled' | 'triggered';
  recipient_filters?: Record<string, any>;
  template_context?: Record<string, any>;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_recipients?: number;
  total_sent?: number;
  total_delivered?: number;
  total_failed?: number;
  created_by?: string | User;
  error_log?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Notification model
export interface Notification {
  id: string;
  organization?: string;
  club?: string;
  notificationType: string | NotificationType;
  recipient: string | User;
  
  // Content
  title: string;
  message: string;
  
  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  
  // Links and actions
  actionUrl?: string;
  actionLabel?: string;
  deepLink?: string;
  
  // Data payload
  data: Record<string, any>;
  
  // Status
  isRead: boolean;
  readAt?: string;
  
  // Batch relationship
  batch?: string | NotificationBatch;
  
  // Template used
  template?: string | NotificationTemplate;
  
  // Snake_case equivalents
  notification_type?: string | NotificationType;
  action_url?: string;
  action_label?: string;
  deep_link?: string;
  is_read?: boolean;
  read_at?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// NotificationDelivery model
export interface NotificationDelivery {
  id: string;
  notification: string | Notification;
  channel: string | NotificationChannel;
  
  // Delivery details
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read' | 'clicked';
  attemptCount: number;
  maxAttempts: number;
  
  // Provider response
  providerId?: string;
  providerResponse: Record<string, any>;
  
  // Timestamps
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  readAt?: string;
  clickedAt?: string;
  
  // Next retry
  nextRetryAt?: string;
  
  // Error details
  errorCode?: string;
  errorMessage?: string;
  
  // Snake_case equivalents
  attempt_count?: number;
  max_attempts?: number;
  provider_id?: string;
  provider_response?: Record<string, any>;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  read_at?: string;
  clicked_at?: string;
  next_retry_at?: string;
  error_code?: string;
  error_message?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// NotificationEvent model
export interface NotificationEvent {
  id: string;
  notification: string | Notification;
  delivery?: string | NotificationDelivery;
  
  eventType: 'created' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read' | 'clicked' | 'unsubscribed';
  eventData: Record<string, any>;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  
  // Snake_case equivalents
  event_type?: 'created' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read' | 'clicked' | 'unsubscribed';
  event_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  
  // Timestamps
  createdAt: string;
  created_at?: string;
}

// PWA and Push Notification Types (extended)
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionWithMetadata extends PushSubscription {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    isDesktop: boolean;
    isMobile: boolean;
  };
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
}

// Extended notification for PWA
export interface PWANotification extends Notification {
  requiresInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  icon?: string;
  badge?: string;
  image?: string;
  actions?: NotificationAction[];
  tag?: string;
  renotify?: boolean;
  timestamp?: number;
}

// Notification actions for interactive notifications
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Form data types
export interface NotificationFormData {
  title: string;
  message: string;
  notificationType: string;
  recipients: string[];
  channels: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  scheduledAt?: string;
  
  // Snake_case equivalents
  notification_type?: string;
  action_url?: string;
  action_label?: string;
  scheduled_at?: string;
}

export interface NotificationTemplateFormData {
  name: string;
  notificationType: string;
  channel: string;
  subjectTemplate?: string;
  bodyTemplate: string;
  language: string;
  variables: Record<string, any>;
  isDefault: boolean;
  
  // Snake_case equivalents
  notification_type?: string;
  subject_template?: string;
  body_template?: string;
  is_default?: boolean;
}

export interface NotificationPreferencesFormData {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushWebEnabled: boolean;
  pushMobileEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestEnabled: boolean;
  digestFrequency: 'hourly' | 'daily' | 'weekly';
  
  // Snake_case equivalents
  email_enabled?: boolean;
  sms_enabled?: boolean;
  whatsapp_enabled?: boolean;
  push_web_enabled?: boolean;
  push_mobile_enabled?: boolean;
  in_app_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  digest_enabled?: boolean;
  digest_frequency?: 'hourly' | 'daily' | 'weekly';
}

export interface NotificationBatchFormData {
  name: string;
  notificationType: string;
  batchType: 'manual' | 'scheduled' | 'triggered';
  recipients: string[];
  recipientFilters: Record<string, any>;
  subject?: string;
  message: string;
  template?: string;
  templateContext: Record<string, any>;
  channels: string[];
  scheduledAt?: string;
  
  // Snake_case equivalents
  notification_type?: string;
  batch_type?: 'manual' | 'scheduled' | 'triggered';
  recipient_filters?: Record<string, any>;
  template_context?: Record<string, any>;
  scheduled_at?: string;
}

// Response types
export interface NotificationListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Notification[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  byType: Record<string, number>;
  byChannel: Record<string, number>;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
  
  // Snake_case equivalents
  by_priority?: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  by_type?: Record<string, number>;
  by_channel?: Record<string, number>;
  delivery_rate?: number;
  read_rate?: number;
  click_rate?: number;
}

export interface NotificationAnalytics {
  sentToday: number;
  sentThisWeek: number;
  sentThisMonth: number;
  averageDeliveryTime: number; // in minutes
  topFailureReasons: Array<{
    reason: string;
    count: number;
  }>;
  channelPerformance: Array<{
    channel: string;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  
  // Snake_case equivalents
  sent_today?: number;
  sent_this_week?: number;
  sent_this_month?: number;
  average_delivery_time?: number;
  top_failure_reasons?: Array<{
    reason: string;
    count: number;
  }>;
  channel_performance?: Array<{
    channel: string;
    sent: number;
    delivered: number;
    failed: number;
    delivery_rate: number;
  }>;
}

// Filter types
export interface NotificationFilters {
  search?: string;
  notificationType?: string;
  recipient?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isRead?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  readAfter?: string;
  readBefore?: string;
  hasAction?: boolean;
  category?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  notification_type?: string;
  is_read?: boolean;
  created_after?: string;
  created_before?: string;
  read_after?: string;
  read_before?: string;
  has_action?: boolean;
  page_size?: number;
}

export interface NotificationBatchFilters {
  search?: string;
  notificationType?: string;
  batchType?: 'manual' | 'scheduled' | 'triggered';
  status?: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdBy?: string;
  scheduledAfter?: string;
  scheduledBefore?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  notification_type?: string;
  batch_type?: 'manual' | 'scheduled' | 'triggered';
  created_by?: string;
  scheduled_after?: string;
  scheduled_before?: string;
  page_size?: number;
}

// UI State types
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  filters: NotificationFilters;
  selectedNotification: Notification | null;
  
  // Snake_case equivalents
  unread_count?: number;
  selected_notification?: Notification | null;
}

export interface NotificationCenterState {
  isOpen: boolean;
  activeTab: 'all' | 'unread' | 'priority' | 'preferences';
  preferences: UserNotificationPreference[];
  stats: NotificationStats;
  
  // Snake_case equivalents
  is_open?: boolean;
  active_tab?: 'all' | 'unread' | 'priority' | 'preferences';
}

// Constants
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  PUSH_WEB: 'push_web',
  PUSH_MOBILE: 'push_mobile',
  IN_APP: 'in_app',
} as const;

export const BATCH_TYPES = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  TRIGGERED: 'triggered',
} as const;

export const BATCH_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const DELIVERY_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  READ: 'read',
  CLICKED: 'clicked',
} as const;

export const EVENT_TYPES = {
  CREATED: 'created',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  READ: 'read',
  CLICKED: 'clicked',
  UNSUBSCRIBED: 'unsubscribed',
} as const;

export const DIGEST_FREQUENCIES = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

// Legacy compatibility - deprecated types (for backward compatibility)
export interface AppNotification extends Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  userId: string;
  expiresAt?: string;
  
  // Snake_case equivalents
  user_id?: string;
  expires_at?: string;
}

// Common notification action types used throughout the app
export const NOTIFICATION_ACTIONS = {
  ACCEPT_RESERVATION: 'accept-reservation',
  DECLINE_RESERVATION: 'decline-reservation',
  VIEW_DETAILS: 'view-details',
  QUICK_REPLY: 'quick-reply',
  MARK_READ: 'mark-read',
  SNOOZE: 'snooze',
  JOIN_TOURNAMENT: 'join-tournament',
  MAKE_PAYMENT: 'make-payment',
} as const;

export type NotificationActionType =
  (typeof NOTIFICATION_ACTIONS)[keyof typeof NOTIFICATION_ACTIONS];

// Notification permission states
export type NotificationPermission = 'default' | 'granted' | 'denied';