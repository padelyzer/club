'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springPresets } from '@/lib/animations/spring-presets';
import { cn } from '@/lib/utils';

// Shimmer effect component
const Shimmer: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    className={cn(
      'absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent',
      className
    )}
    animate={{
      x: ['-100%', '100%'],
    }}
    transition={{
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    }}
  />
);

// Base skeleton component
export interface SkeletonProps {
  className?: string;
  animate?: boolean;
  shimmer?: boolean;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animate = true,
  shimmer = true,
  rounded = true,
}) => (
  <motion.div
    className={cn(
      'bg-gray-200 dark:bg-gray-800 overflow-hidden relative',
      rounded && 'rounded-lg',
      className
    )}
    initial={animate ? { opacity: 0.6 } : false}
    animate={animate ? { opacity: 1 } : false}
    transition={animate ? { repeat: Infinity, repeatType: 'reverse', duration: 1 } : false}
  >
    {shimmer && <Shimmer />}
  </motion.div>
);

// Card skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800', className)}>
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('space-y-4', className)}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} className="h-4 flex-1" />
      ))}
    </div>
    
    {/* Rows */}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                'h-3 flex-1',
                colIndex === 0 && 'w-16 flex-none', // First column typically narrower
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// List skeleton
export const ListSkeleton: React.FC<{ 
  items?: number; 
  showAvatar?: boolean;
  className?: string;
}> = ({ items = 5, showAvatar = true, className }) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC<{ 
  type?: 'bar' | 'line' | 'pie';
  className?: string;
}> = ({ type = 'bar', className }) => {
  if (type === 'pie') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="relative">
          <Skeleton className="h-48 w-48 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-20 w-20 rounded-full bg-white dark:bg-gray-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between h-48 gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton 
            key={index} 
            className="flex-1"
            style={{ height: `${Math.random() * 70 + 30}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
};

// Dashboard skeleton
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Metrics grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
    
    {/* Chart area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border">
        <Skeleton className="h-6 w-32 mb-4" />
        <ChartSkeleton type="bar" />
      </div>
      <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border">
        <Skeleton className="h-6 w-28 mb-4" />
        <ChartSkeleton type="line" />
      </div>
    </div>
  </div>
);

// Loading spinner variants
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
  className?: string;
}> = ({ size = 'md', variant = 'default', className }) => {
  const sizeConfig = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn('bg-current rounded-full', sizeConfig[size])}
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={cn('bg-current rounded-full', sizeConfig[size], className)}
        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-current rounded-full"
            style={{ height: size === 'sm' ? '16px' : size === 'md' ? '24px' : '32px' }}
            animate={{ scaleY: [1, 2, 1] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    );
  }

  // Default spinner
  return (
    <motion.div
      className={cn(
        'border-2 border-current border-t-transparent rounded-full',
        sizeConfig[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
  spinner?: React.ReactNode;
  backdrop?: boolean;
  className?: string;
}> = ({ 
  isVisible, 
  message = 'Loading...', 
  spinner,
  backdrop = true,
  className 
}) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          backdrop && 'bg-black/50 backdrop-blur-sm',
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={springPresets.gentle}
      >
        <motion.div
          className="flex flex-col items-center space-y-4 p-8 bg-white dark:bg-gray-900 rounded-xl shadow-xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={springPresets.bouncy}
        >
          {spinner || <LoadingSpinner size="lg" />}
          {message && (
            <p className="text-sm text-muted-foreground text-center">
              {message}
            </p>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Skeleton screen with staggered reveal
export const SkeletonScreen: React.FC<{
  children: React.ReactNode;
  loading: boolean;
  skeleton: React.ReactNode;
  stagger?: boolean;
}> = ({ children, loading, skeleton, stagger = true }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: stagger ? {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      } : {},
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: springPresets.gentle,
    },
  };

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          variants={stagger ? containerVariants : undefined}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={springPresets.gentle}
        >
          {stagger ? (
            <motion.div variants={itemVariants}>
              {skeleton}
            </motion.div>
          ) : (
            skeleton
          )}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={springPresets.gentle}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Progressive image loading with blur effect
export const ProgressiveImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  blurDataURL?: string;
}> = ({ src, alt, placeholder, className, blurDataURL }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageSrc, setImageeSrc] = React.useState(placeholder || blurDataURL);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageeSrc(src);
      setImageLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <motion.img
        src={imageSrc}
        alt={alt}
        className={cn('w-full h-full object-cover', !imageLoaded && 'blur-sm')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={springPresets.gentle}
      />
      
      {!imageLoaded && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          initial={{ opacity: 1 }}
          animate={{ opacity: imageLoaded ? 0 : 1 }}
          transition={springPresets.gentle}
        >
          <LoadingSpinner size="sm" />
        </motion.div>
      )}
    </div>
  );
};

export default {
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
  LoadingSpinner,
  LoadingOverlay,
  SkeletonScreen,
  ProgressiveImage,
};