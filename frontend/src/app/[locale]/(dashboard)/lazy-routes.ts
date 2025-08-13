/**
 * Lazy loaded routes for dashboard pages
 * Improves initial load time by splitting code
 */

import dynamic from 'next/dynamic';

// Finance Pages
export const LazyFinancePage = dynamic(
  () => import('./finance/page')
);

// Analytics Page (Heavy with charts)
export const LazyAnalyticsPage = dynamic(
  () => import('./analytics/page')
);

// Classes Pages
export const LazyClassesPage = dynamic(
  () => import('./classes/page')
);