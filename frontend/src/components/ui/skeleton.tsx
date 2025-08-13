import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = 'text',
    width,
    height,
    animation = 'pulse',
    style,
    ...props 
  }, ref) => {
    const baseClasses = 'bg-muted relative overflow-hidden';
    
    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'after:absolute after:inset-0 after:translate-x-[-100%] after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent',
      none: '',
    };

    const variantClasses = {
      text: 'h-4 w-full rounded',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-lg',
    };

    const combinedStyle = {
      width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
      height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          animationClasses[animation],
          variantClasses[variant],
          className
        )}
        style={combinedStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Convenience components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className 
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 && lines > 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonAvatar: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ 
  size = 'md',
  className 
}) => {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 56,
  };

  return (
    <Skeleton
      variant="circular"
      width={sizes[size]}
      height={sizes[size]}
      className={className}
    />
  );
};

export const SkeletonButton: React.FC<{
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}> = ({
  size = 'default',
  className
}) => {
  const sizes = {
    sm: { width: 80, height: 36 },
    default: { width: 100, height: 44 },
    lg: { width: 120, height: 48 },
  };

  return (
    <Skeleton
      variant="rounded"
      width={sizes[size].width}
      height={sizes[size].height}
      className={className}
    />
  );
};

// Add shimmer animation to globals.css
export const shimmerKeyframes = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}`;