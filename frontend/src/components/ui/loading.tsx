import * as React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', variant = 'default', ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };

    if (variant === 'dots') {
      return (
        <div ref={ref} className={cn('flex space-x-1', className)} role="status" aria-label="Loading" {...props}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full bg-blue-600 animate-bounce',
                sizeClasses[size]
                  .replace('h-', 'h-')
                  .replace('w-', 'w-')
                  .split(' ')[0],
                sizeClasses[size]
                  .replace('h-', 'h-')
                  .replace('w-', 'w-')
                  .split(' ')[1]
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s',
              }}
              aria-hidden="true"
            />
          ))}
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-full bg-blue-600 animate-pulse',
            sizeClasses[size],
            className
          )}
          role="status"
          aria-label="Loading"
          {...props}
        >
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    if (variant === 'bars') {
      return (
        <div ref={ref} className={cn('flex space-x-1', className)} role="status" aria-label="Loading" {...props}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'bg-blue-600 animate-pulse',
                size === 'xs'
                  ? 'w-0.5 h-3'
                  : size === 'sm'
                    ? 'w-1 h-4'
                    : size === 'md'
                      ? 'w-1 h-6'
                      : size === 'lg'
                        ? 'w-1.5 h-8'
                        : 'w-2 h-12'
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.2s',
              }}
              aria-hidden="true"
            />
          ))}
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400',
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  message?: string;
  variant?: 'overlay' | 'inline';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  className,
  message = 'Loading...',
  variant = 'overlay',
}) => {
  if (variant === 'inline') {
    return (
      <div className={cn('space-y-4', className)}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 rounded-lg"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  ...props
}) => {
  const baseClass = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClass, 'h-4 rounded')}
            style={{
              width: i === lines - 1 ? '75%' : width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(baseClass, variantClasses[variant], className)}
      style={{
        width: width || (variant === 'circular' ? height || '2rem' : '100%'),
        height: height || '2rem',
      }}
      {...props}
    />
  );
};

interface LoadingStateProps {
  type: 'page' | 'section' | 'card' | 'list' | 'table';
  count?: number;
}

const LoadingState: React.FC<LoadingStateProps> = ({ type, count = 3 }) => {
  switch (type) {
    case 'page':
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton variant="text" height="2rem" width="40%" />
            <Skeleton variant="text" lines={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <Skeleton variant="rectangular" height="8rem" />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'section':
      return (
        <div className="space-y-4">
          <Skeleton variant="text" height="1.5rem" width="30%" />
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} variant="text" />
            ))}
          </div>
        </div>
      );

    case 'card':
      return (
        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Skeleton variant="circular" width="3rem" height="3rem" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </div>
          </div>
          <Skeleton variant="rectangular" height="6rem" />
          <Skeleton variant="text" lines={2} />
        </div>
      );

    case 'list':
      return (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="50%" />
              </div>
              <Skeleton variant="rectangular" width="4rem" height="2rem" />
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 p-3 border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="text" width="80%" />
            ))}
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 p-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} variant="text" width="60%" />
              ))}
            </div>
          ))}
        </div>
      );

    default:
      return <LoadingSpinner />;
  }
};

export { LoadingSpinner, LoadingOverlay, Skeleton, LoadingState };
