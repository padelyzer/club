import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FormFieldSkeletonProps {
  showLabel?: boolean;
  showHelperText?: boolean;
  fieldType?: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio';
  className?: string;
}

export const FormFieldSkeleton: React.FC<FormFieldSkeletonProps> = ({
  showLabel = true,
  showHelperText = false,
  fieldType = 'input',
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <Skeleton variant="text" width="30%" height={16} />
      )}
      
      {fieldType === 'input' && (
        <Skeleton variant="rounded" width="100%" height={44} />
      )}
      
      {fieldType === 'textarea' && (
        <Skeleton variant="rounded" width="100%" height={80} />
      )}
      
      {fieldType === 'select' && (
        <Skeleton variant="rounded" width="100%" height={44} />
      )}
      
      {fieldType === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" width={20} height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      )}
      
      {fieldType === 'radio' && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width="30%" height={16} />
            </div>
          ))}
        </div>
      )}
      
      {showHelperText && (
        <Skeleton variant="text" width="60%" height={14} />
      )}
    </div>
  );
};

interface FormSectionSkeletonProps {
  title?: boolean;
  fields?: number;
  columns?: 1 | 2 | 3;
  className?: string;
}

export const FormSectionSkeleton: React.FC<FormSectionSkeletonProps> = ({
  title = true,
  fields = 3,
  columns = 1,
  className
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
  };

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <Skeleton variant="text" width="40%" height={24} />
      )}
      
      <div className={cn('grid gap-4', gridClasses[columns])}>
        {Array.from({ length: fields }).map((_, i) => (
          <FormFieldSkeleton 
            key={i} 
            fieldType={i % 4 === 3 ? 'select' : 'input'}
            showHelperText={i % 3 === 0}
          />
        ))}
      </div>
    </div>
  );
};

interface FormSkeletonProps {
  sections?: number;
  showHeader?: boolean;
  showActions?: boolean;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  sections = 2,
  showHeader = true,
  showActions = true,
  className
}) => {
  return (
    <div className={cn('space-y-8', className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton variant="text" width="50%" height={32} />
          <Skeleton variant="text" width="80%" height={16} />
        </div>
      )}
      
      {Array.from({ length: sections }).map((_, i) => (
        <FormSectionSkeleton 
          key={i}
          fields={i === 0 ? 4 : 3}
          columns={i === 0 ? 2 : 1}
        />
      ))}
      
      {showActions && (
        <div className="flex gap-3 pt-4">
          <Skeleton variant="rounded" width={100} height={44} />
          <Skeleton variant="rounded" width={100} height={44} />
        </div>
      )}
    </div>
  );
};

// Specific form skeletons
export const ClubFormSkeleton: React.FC = () => {
  return (
    <FormSkeleton 
      sections={3}
      showHeader={true}
      showActions={true}
    />
  );
};

export const ProfileFormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={100} height={100} />
        <Skeleton variant="rounded" width={120} height={40} />
      </div>
      <FormSkeleton sections={2} showHeader={false} />
    </div>
  );
};

export const LoginFormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full max-w-sm mx-auto">
      <div className="text-center space-y-2">
        <Skeleton variant="text" width="60%" height={32} className="mx-auto" />
        <Skeleton variant="text" width="80%" height={16} className="mx-auto" />
      </div>
      
      <div className="space-y-4">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <div className="flex items-center justify-between">
          <FormFieldSkeleton fieldType="checkbox" showLabel={false} />
          <Skeleton variant="text" width={120} height={16} />
        </div>
      </div>
      
      <Skeleton variant="rounded" width="100%" height={44} />
      
      <div className="text-center">
        <Skeleton variant="text" width="50%" height={16} className="mx-auto" />
      </div>
    </div>
  );
};