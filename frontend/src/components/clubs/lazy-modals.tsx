import { lazy, Suspense } from 'react';
import { ClubComponentLoader } from './lazy-components';

// Lazy load heavy modal components
const ClubDetailLazy = lazy(() => import('./club-detail').then(module => ({ 
  default: module.ClubDetail 
})));

const ClubFormLazy = lazy(() => import('./club-form').then(module => ({ 
  default: module.ClubForm 
})));

const EnhancedClubFormLazy = lazy(() => import('./enhanced-club-form').then(module => ({ 
  default: module.EnhancedClubForm 
})));

const ImportClubsModalLazy = lazy(() => import('./import-clubs-modal').then(module => ({ 
  default: module.ImportClubsModal 
})));

const ExportClubsModalLazy = lazy(() => import('./export-clubs-modal').then(module => ({ 
  default: module.ExportClubsModal 
})));

// Lazy wrappers with suspense
export const LazyClubDetail = (props: any) => (
  <Suspense fallback={<ClubComponentLoader />}>
    <ClubDetailLazy {...props} />
  </Suspense>
);

export const LazyClubForm = (props: any) => (
  <Suspense fallback={<ClubComponentLoader />}>
    <ClubFormLazy {...props} />
  </Suspense>
);

export const LazyEnhancedClubForm = (props: any) => (
  <Suspense fallback={<ClubComponentLoader />}>
    <EnhancedClubFormLazy {...props} />
  </Suspense>
);

export const LazyImportClubsModal = (props: any) => (
  <Suspense fallback={<ClubComponentLoader />}>
    <ImportClubsModalLazy {...props} />
  </Suspense>
);

export const LazyExportClubsModal = (props: any) => (
  <Suspense fallback={<ClubComponentLoader />}>
    <ExportClubsModalLazy {...props} />
  </Suspense>
);