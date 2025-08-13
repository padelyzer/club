/**
 * PWA Notification Components Export Index
 * Centralized exports for Padelyzer PWA notification UI components
 */

export { default as NotificationPermissionPrompt } from './NotificationPermissionPrompt';
export { default as PushNotificationSettings } from './PushNotificationSettings';
export { default as NotificationCenterPWA } from './NotificationCenterPWA';
export { default as InstallPrompt } from './InstallPrompt';

// Re-export existing notification center for backward compatibility
export { NotificationCenter, useToast } from '../layout/NotificationCenter';
