/**
 * Centralized lazy imports for heavy components
 * This reduces initial bundle size and improves performance
 */

import { lazyComponent } from '@/components/ui/lazy-component';
import { LoadingState } from '@/components/ui/states/loading-state';

// Finance Components
export const LazyFinanceDashboard = lazyComponent(
  () => import('./finance/finance-dashboard').then(m => ({ default: m.FinanceDashboard }))
);

export const LazyInvoiceForm = lazyComponent(
  () => import('./finance/invoice-form')
);

export const LazyInvoiceGenerator = lazyComponent(
  () => import('./finance/InvoiceGenerator')
);

export const LazyPaymentHistory = lazyComponent(
  () => import('./finance/PaymentHistory')
);

export const LazyExpenseTracker = lazyComponent(
  () => import('./finance/expense-tracker')
);

// Club Components
export const LazyClubForm = lazyComponent(
  () => import('./clubs/club-form')
);

export const LazyClubDetail = lazyComponent(
  () => import('./clubs/club-detail')
);

export const LazyEnhancedClubForm = lazyComponent(
  () => import('./clubs/enhanced-club-form')
);

// Client Components
export const LazyClientImportModal = lazyComponent(
  () => import('./clients/import-modal')
);

export const LazyClientExportModal = lazyComponent(
  () => import('./clients/export-modal')
);

export const LazyEnhancedClientForm = lazyComponent(
  () => import('./clients/enhanced-client-form')
);

export const LazyPartnerSearch = lazyComponent(
  () => import('./clients/partner-search')
);

// Class Components
export const LazyClassScheduleForm = lazyComponent(
  () => import('./classes/ClassScheduleForm').then(m => ({ default: m.ClassScheduleForm }))
);

export const LazyClassForm = lazyComponent(
  () => import('./classes/class-form')
);

// Tournament Components
export const LazyTournamentRegistrationModal = lazyComponent(
  () => import('./tournaments/tournament-registration-modal')
);

// Reservation Components
export const LazyBulkReservationModal = lazyComponent(
  () => import('./reservations/bulk-reservation-modal')
);

export const LazyMobileBookingFlow = lazyComponent(
  () => import('./reservations/mobile-booking-flow')
);

// Court Components
export const LazyCourtPricingConfig = lazyComponent(
  () => import('./courts/court-pricing-config').then(m => ({ default: m.CourtPricingConfig }))
);

// Notification Components
export const LazyNotificationPreferences = lazyComponent(
  () => import('./notifications/notification-preferences')
);

// Payment Components
export const LazyPaymentHistoryList = lazyComponent(
  () => import('./payments/payment-history')
);

// Charts (Heavy library)
export const LazyCharts = lazyComponent(
  () => import('./charts/lazy-recharts')
);