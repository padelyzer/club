// Profile types for Padelyzer application

import { User, LoadingState } from './index';

// Base profile information
export interface UserProfile extends User {
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  timezone?: string;
  language?: 'en' | 'es' | 'fr' | 'pt';
  bio?: string;
  profileCompleteness: number;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  loginCount: number;
}

// Notification preferences
export interface NotificationPreferences {
  email: {
    reservations: boolean;
    tournaments: boolean;
    matches: boolean;
    promotions: boolean;
    systemUpdates: boolean;
    newsletters: boolean;
  };
  push: {
    reservations: boolean;
    tournaments: boolean;
    matches: boolean;
    promotions: boolean;
    systemUpdates: boolean;
    reminders: boolean;
  };
  sms: {
    reservations: boolean;
    emergencyOnly: boolean;
    reminders: boolean;
  };
  inApp: {
    realTimeUpdates: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

// Application preferences
export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr' | 'pt';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  currency: 'USD' | 'EUR' | 'GBP' | 'ARS' | 'BRL';
  distanceUnit: 'km' | 'mi';
  defaultView: 'list' | 'grid' | 'calendar';
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  compactMode: boolean;
  showTutorials: boolean;
}

// Privacy settings
export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  showPlayingHistory: boolean;
  shareStatistics: boolean;
  allowDataCollection: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  dataRetentionPeriod: number; // in months
}

// Security settings
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  backupCodes: string[];
  trustedDevices: TrustedDevice[];
  loginAlerts: boolean;
  sessionTimeout: number; // in minutes
  requirePasswordForSensitiveActions: boolean;
  allowRememberDevice: boolean;
  passwordLastChanged?: string;
  securityQuestions: SecurityQuestion[];
}

// Trusted device information
export interface TrustedDevice {
  id: string;
  name: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser?: string;
  os?: string;
  location?: string;
  lastUsed: string;
  isCurrentDevice: boolean;
  trusted: boolean;
}

// Security questions
export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string; // hashed answer
  createdAt: string;
}

// Active session information
export interface UserSession {
  id: string;
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    browser?: string;
    os?: string;
    userAgent: string;
  };
  location: {
    country?: string;
    city?: string;
    ip: string;
  };
  startTime: string;
  lastActivity: string;
  isCurrentSession: boolean;
  status: 'active' | 'expired' | 'terminated';
}

// Password change request
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Email change request
export interface EmailChangeRequest {
  newEmail: string;
  password: string;
  verificationCode?: string;
}

// Profile update request
export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  timezone?: string;
  bio?: string;
  avatar?: File | string;
}

// Two-factor authentication
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  code: string;
  backupCode?: string;
}

// Data export request
export interface DataExportRequest {
  format: 'json' | 'csv' | 'pdf';
  includePersonalData: boolean;
  includeReservations: boolean;
  includeMatches: boolean;
  includeTournaments: boolean;
  includePayments: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

// Data export status
export interface DataExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  fileSize?: number;
  error?: string;
}

// Account deletion request
export interface AccountDeletionRequest {
  reason: string;
  password: string;
  feedback?: string;
  deleteImmediately: boolean;
}

// Profile completion suggestions
export interface ProfileSuggestion {
  id: string;
  type: 'avatar' | 'bio' | 'preferences' | 'security' | 'verification';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  points: number;
}

// Profile analytics
export interface ProfileAnalytics {
  loginStreak: number;
  totalLogins: number;
  averageSessionDuration: number;
  mostActiveDay: string;
  mostActiveHour: number;
  deviceUsage: Record<string, number>;
  locationHistory: Array<{
    country: string;
    city: string;
    loginCount: number;
    lastLogin: string;
  }>;
}

// Profile store state
export interface ProfileState extends LoadingState {
  // Core profile data
  profile: UserProfile | null;
  notifications: NotificationPreferences;
  preferences: AppPreferences;
  privacy: PrivacySettings;
  security: SecuritySettings;

  // Session management
  activeSessions: UserSession[];

  // Data export
  dataExports: DataExportStatus[];

  // Profile suggestions
  suggestions: ProfileSuggestion[];

  // Analytics
  analytics: ProfileAnalytics | null;

  // UI state
  activeTab: string;
  editMode: boolean;
  hasUnsavedChanges: boolean;

  // Loading states for different sections
  loadingStates: {
    profile: boolean;
    preferences: boolean;
    security: boolean;
    sessions: boolean;
    dataExport: boolean;
  };

  // Error states
  errors: {
    profile: string | null;
    preferences: string | null;
    security: string | null;
    sessions: string | null;
    dataExport: string | null;
  };
}

// API response types
export interface ProfileResponse {
  profile: UserProfile;
  notifications: NotificationPreferences;
  preferences: AppPreferences;
  privacy: PrivacySettings;
  security: Omit<SecuritySettings, 'backupCodes' | 'securityQuestions'>;
  suggestions: ProfileSuggestion[];
}

export interface SessionsResponse {
  sessions: UserSession[];
  total: number;
}

export interface SecurityResponse {
  twoFactorEnabled: boolean;
  trustedDevicesCount: number;
  lastPasswordChange?: string;
  loginAlertsEnabled: boolean;
}

// Form validation types
export interface ProfileFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// All types are already exported above with individual export statements
