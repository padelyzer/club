import React from 'react';
import { Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/styles/design-tokens';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'dots';
  className?: string;
}

// Generic loading state component
export const ClubLoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  size = 'md',
  variant = 'spinner',
  className,
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (variant === 'skeleton') {
    return <ClubCardSkeleton className={className} />;
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full bg-blue-500 animate-pulse',
                size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
        {message && (
          <span className={cn('ml-3 text-gray-600 dark:text-gray-400', sizeClasses[size])}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <Loader2 className={cn('animate-spin text-blue-500', iconSizes[size])} />
      {message && (
        <span className={cn('ml-3 text-gray-600 dark:text-gray-400', sizeClasses[size])}>
          {message}
        </span>
      )}
    </div>
  );
};

// Skeleton for club cards
export const ClubCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse', className)}>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Image skeleton */}
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
      
      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        
        {/* Status */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        
        {/* Info */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        </div>
      </div>
    </div>
  </div>
);

// List skeleton
export const ClubListSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className 
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <ClubCardSkeleton key={i} />
    ))}
  </div>
);

// Specific loading states
export const ClubDetailsLoading: React.FC = () => (
  <ClubLoadingState 
    message="Cargando detalles del club..." 
    size="lg"
    className="py-12"
  />
);

export const ClubsListLoading: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <Building2 className="w-6 h-6 text-blue-500" />
      <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
        Cargando clubes...
      </span>
    </div>
    <ClubListSkeleton count={6} />
  </div>
);

export const ClubFormLoading: React.FC = () => (
  <ClubLoadingState 
    message="Preparando formulario..." 
    variant="dots"
    size="sm"
  />
);

export const ClubStatsLoading: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="space-y-2">
            <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Hook for consistent loading states
export const useClubLoadingStates = () => {
  return {
    ClubLoadingState,
    ClubCardSkeleton,
    ClubListSkeleton,
    ClubDetailsLoading,
    ClubsListLoading,
    ClubFormLoading,
    ClubStatsLoading,
  };
};