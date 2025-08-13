import React, { useState, memo } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClubLogoProps {
  logo?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ClubLogo = memo<ClubLogoProps>(({ 
  logo, 
  name, 
  size = 'md',
  className 
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
    xl: 'h-24 w-24',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  };

  if (logo && !imageError) {
    return (
      <img
        src={logo}
        alt={name}
        className={cn(
          sizeClasses[size],
          'rounded-lg object-cover',
          className
        )}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center',
        className
      )}
    >
      <Building2 className={cn(iconSizes[size], 'text-white')} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.logo === nextProps.logo &&
    prevProps.name === nextProps.name &&
    prevProps.size === nextProps.size
  );
});

ClubLogo.displayName = 'ClubLogo';