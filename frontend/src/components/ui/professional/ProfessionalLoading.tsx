'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Building2, Loader2 } from 'lucide-react';

// Loading Spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'text-[#007AFF]',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2 className={cn(
      'animate-spin',
      sizeClasses[size],
      color,
      className
    )} />
  );
};

// Loading Dots
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'bg-[#007AFF]',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full', sizeClasses[size], color)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

// Skeleton Loader
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = false,
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        rounded ? 'rounded-full' : 'rounded',
        className
      )}
      style={{ width, height }}
    />
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card variant="default" padding="lg" className={className}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton width={40} height={40} rounded />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="80%" />
          <Skeleton height={12} width="60%" />
        </div>
      </div>
    </Card>
  );
};

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <Card variant="default" padding="none" className={className}>
      <div className="overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} height={16} width="80%" />
            ))}
          </div>
        </div>
        
        {/* Rows */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton key={colIndex} height={14} width="70%" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// List Skeleton
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showAvatar = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} variant="default" padding="default">
          <div className="flex items-center gap-4">
            {showAvatar && (
              <Skeleton width={48} height={48} rounded />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton height={16} width="60%" />
              <Skeleton height={12} width="40%" />
            </div>
            <Skeleton width={80} height={32} />
          </div>
        </Card>
      ))}
    </div>
  );
};

// Form Skeleton
export const FormSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card variant="glass" padding="lg" className={className}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton height={24} width="30%" />
          <Skeleton height={12} width="60%" />
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height={14} width="20%" />
              <Skeleton height={40} width="100%" />
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-3">
          <Skeleton width={80} height={40} />
          <Skeleton width={100} height={40} />
        </div>
      </div>
    </Card>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="space-y-4">
        <Skeleton height={32} width="40%" />
        <div className="flex items-center gap-4">
          <Skeleton height={16} width="20%" />
          <Skeleton height={16} width="15%" />
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="glass" padding="lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton width={40} height={40} />
              </div>
              <div className="space-y-2">
                <Skeleton height={24} width="60%" />
                <Skeleton height={14} width="80%" />
                <Skeleton height={12} width="50%" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Quick Actions */}
      <Card variant="glass" padding="lg">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton width={32} height={32} />
            <Skeleton height={20} width="20%" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={64} width="100%" />
            ))}
          </div>
        </div>
      </Card>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="lg">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton width={32} height={32} />
              <Skeleton height={20} width="30%" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton width={20} height={20} />
                    <div className="space-y-1">
                      <Skeleton height={16} width={120} />
                      <Skeleton height={12} width={80} />
                    </div>
                  </div>
                  <Skeleton height={12} width={40} />
                </div>
              ))}
            </div>
          </div>
        </Card>
        
        <Card variant="glass" padding="lg">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton width={32} height={32} />
              <Skeleton height={20} width="30%" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton width={12} height={12} rounded />
                  <div className="flex-1 space-y-1">
                    <Skeleton height={12} width="80%" />
                    <Skeleton height={10} width="50%" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Full Page Loading
interface FullPageLoadingProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  title = 'Cargando',
  subtitle = 'Preparando la información...',
  className,
}) => {
  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4',
      className
    )}>
      <div className="text-center">
        <motion.div 
          className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-2xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Building2 className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {title}
        </h2>
        <p className="text-gray-600 mb-8">
          {subtitle}
        </p>
        <LoadingDots size="lg" />
      </div>
    </div>
  );
};

// Loading Overlay
interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  title = 'Cargando...',
  subtitle = 'Por favor espera',
  className,
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50',
        className
      )}
    >
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </motion.div>
  );
};

// Progress Bar
interface ProgressBarProps {
  progress: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showPercentage = true,
  size = 'md',
  color = 'bg-[#007AFF]',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('space-y-2', className)}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progreso</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default {
  LoadingSpinner,
  LoadingDots,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  DashboardSkeleton,
  FullPageLoading,
  LoadingOverlay,
  ProgressBar,
};