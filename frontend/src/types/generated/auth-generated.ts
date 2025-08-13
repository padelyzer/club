/**
 * Tipos TypeScript para authentication
 * Generado automáticamente desde models.py
 */

export interface OrganizationMembership {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user: string;
  organization: string;
  role: string;
  permissions?: Record<string, any>;
  joinedAt: string;
  joined_at: string;
  invitedBy?: string;
  invited_by?: string;
}

export interface OrganizationMembershipForm {
  user?: string;
  organization?: string;
  role?: string;
  permissions?: Record<string, any>;
  joinedAt?: string;
  invitedBy?: string;
}

export interface Session {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user: string;
  sessionKey: string;
  session_key: string;
  deviceType: string;
  device_type: string;
  deviceName?: string;
  device_name?: string;
  deviceInfo?: Record<string, any>;
  device_info?: Record<string, any>;
  ipAddress: any;
  ip_address: any;
  location?: string;
  organization?: string;
  browser?: string;
  os?: string;
  city?: string;
  country?: string;
  lastActivity: string;
  last_activity: string;
  expiresAt: string;
  expires_at: string;
  revokedAt?: string;
  revoked_at?: string;
  revokedReason?: string;
  revoked_reason?: string;
}

export interface SessionForm {
  user?: string;
  sessionKey?: string;
  deviceType?: string;
  deviceName?: string;
  deviceInfo?: Record<string, any>;
  ipAddress?: any;
  location?: string;
  organization?: string;
  browser?: string;
  os?: string;
  city?: string;
  country?: string;
  lastActivity?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface LoginAttempt {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  email: string;
  ipAddress: any;
  ip_address: any;
  userAgent: string;
  user_agent: string;
  success: boolean;
  failureReason?: string;
  failure_reason?: string;
}

export interface LoginAttemptForm {
  email?: string;
  ipAddress?: any;
  userAgent?: string;
  success?: boolean;
  failureReason?: string;
}

export interface OTPVerification {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user: string;
  purpose: string;
  code: string;
  expiresAt: string;
  expires_at: string;
  attempts: number;
  maxAttempts: number;
  max_attempts: number;
  deliveryMethod: string;
  delivery_method: string;
  sentTo: string;
  sent_to: string;
  usedAt?: string;
  used_at?: string;
}

export interface OTPVerificationForm {
  user?: string;
  purpose?: string;
  code?: string;
  expiresAt?: string;
  attempts?: number;
  maxAttempts?: number;
  deliveryMethod?: string;
  sentTo?: string;
  usedAt?: string;
}

export interface APIKey {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user: string;
  organization: string;
  name: string;
  key: string;
  permissions?: Record<string, any>;
  lastUsedAt?: string;
  last_used_at?: string;
  usageCount: number;
  usage_count: number;
  expiresAt?: string;
  expires_at?: string;
}

export interface APIKeyForm {
  user?: string;
  organization?: string;
  name?: string;
  key?: string;
  permissions?: Record<string, any>;
  lastUsedAt?: string;
  usageCount?: number;
  expiresAt?: string;
}

export interface BlacklistedToken {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  jti: string;
  user: string;
  tokenExpiresAt: string;
  token_expires_at: string;
  blacklistedAt: string;
  blacklisted_at: string;
  reason: string;
  ipAddress?: any;
  ip_address?: any;
  userAgent?: string;
  user_agent?: string;
}

export interface BlacklistedTokenForm {
  jti?: string;
  user?: string;
  tokenExpiresAt?: string;
  blacklistedAt?: string;
  reason?: string;
  ipAddress?: any;
  userAgent?: string;
}

export interface AuthAuditLog {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user?: string;
  eventType: string;
  event_type: string;
  ipAddress: any;
  ip_address: any;
  userAgent: string;
  user_agent: string;
  success: boolean;
  details?: Record<string, any>;
  organization?: string;
  attemptedEmail?: string;
  attempted_email?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  device_type?: string;
  browser?: string;
  os?: string;
}

export interface AuthAuditLogForm {
  user?: string;
  eventType?: string;
  ipAddress?: any;
  userAgent?: string;
  success?: boolean;
  details?: Record<string, any>;
  organization?: string;
  attemptedEmail?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}
