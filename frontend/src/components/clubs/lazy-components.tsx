import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
export const ClubDetailModal = lazy(() => 
  import('./club-detail-modal').then(module => ({ 
    default: module.ClubDetailModal 
  }))
);

export const ClubFormModal = lazy(() => 
  import('./enhanced-club-form').then(module => ({ 
    default: module.EnhancedClubForm 
  }))
);

export const ClubsMap = lazy(() => 
  import('./clubs-map').then(module => ({ 
    default: module.ClubsMap 
  }))
);

export const ExportClubsModal = lazy(() => 
  import('./export-clubs-modal').then(module => ({ 
    default: module.ExportClubsModal 
  }))
);

export const ImportClubsModal = lazy(() => 
  import('./import-clubs-modal').then(module => ({ 
    default: module.ImportClubsModal 
  }))
);

export const ClubAnalyticsDashboard = lazy(() => 
  import('./club-analytics-dashboard').then(module => ({ 
    default: module.ClubAnalyticsDashboard 
  }))
);

// Loading component for suspense fallback
export const ClubComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Wrapper component for lazy loading with error boundary
export const LazyClubComponent = ({ 
  Component, 
  fallback = <ClubComponentLoader />,
  ...props 
}: {
  Component: React.ComponentType<any>;
  fallback?: React.ReactNode;
  [key: string]: any;
}) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);