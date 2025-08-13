// Legacy exports (for backward compatibility)
export { ClubsList } from './clubs-list';
export { ClubCard } from './club-card';
export { ClubDetail } from './club-detail';
export { ClubFilters } from './club-filters';
export { ClubForm } from './club-form';
export { ClubSwitcher } from './club-switcher';
export { ClubSettings } from './club-settings';
export { ClubSchedule } from './club-schedule';
export { ClubCourts } from './club-courts';
export { ClubServices } from './club-services';

// Modern exports (recommended)
export { ModernClubCard } from './club-card-modern';
export { ModernClubsList } from './clubs-list-modern';
export { ModernClubForm } from './club-form-modern';

// Analytics & Visualization
// export { ClubAnalyticsDashboard } from './club-analytics-dashboard';
export * from './club-charts';

// Notifications
export { ClubNotificationsPanel } from './club-notifications-panel';
export { ClubNotificationToast, ClubNotificationToastContainer } from './club-notification-toast';

// Enhanced components
export { EnhancedClubForm } from './enhanced-club-form';
export { ImportClubsModal } from './import-clubs-modal';
export { ExportClubsModal } from './export-clubs-modal';

// Sub-components
export { CourtConfiguration } from './court-configuration';
export { FormValidationSummary } from './form-validation-summary';
export { SubscriptionPlanSelector } from './subscription-plan-selector';

// Types and utilities
export * from '@/types/club-unified';
export * from '@/lib/adapters/club-adapter';
export * from '@/styles/club-design-tokens';
export * from '@/lib/validations/club-form';

// State management exports
export { 
  useClubStore,
  useFilteredClubs,
  useSortedClubs,
  useSelectedClub,
  useCurrentClubId,
  useClubFilters,
  useClubViewMode 
} from '@/lib/stores/club-store';

// Optimized hooks exports
export {
  useClubsOptimized,
  useClubOptimized,
  useCreateClubOptimized,
  useUpdateClubOptimized,
  useDeleteClubOptimized,
  useClubAnalytics,
  usePrefetchClubs,
  useInvalidateClubQueries,
  useClubMembers,
  useClubBatchOperations,
  clubKeys
} from '@/lib/api/hooks/useClubsOptimized';

// Notification exports
export { 
  useClubNotifications,
  notificationTemplates,
  setupClubNotificationListeners 
} from '@/lib/notifications/club-notifications';

export {
  useClubNotificationsSocket,
  useClubNotificationToasts,
  useClubNotificationAnalytics
} from '@/hooks/useClubNotifications';
