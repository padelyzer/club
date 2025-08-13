import { lazyComponent } from '@/components/ui/lazy-component';

export const LazyFinanceDashboard = lazyComponent(
  () => import('./finance-dashboard').then(m => ({ default: m.FinanceDashboard }))
);