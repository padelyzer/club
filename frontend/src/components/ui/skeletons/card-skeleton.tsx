import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar } from '@/components/ui/skeleton';

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton variant="text" width="60%" height={24} className="mb-2" />
        <Skeleton variant="text" width="40%" height={16} />
      </CardHeader>
      <CardContent>
        <SkeletonText lines={3} />
      </CardContent>
      <CardFooter>
        <Skeleton variant="rounded" width={100} height={36} />
      </CardFooter>
    </Card>
  );
};

export const ClubCardSkeleton: React.FC<{ viewMode?: 'grid' | 'list' }> = ({ 
  viewMode = 'grid' 
}) => {
  if (viewMode === 'list') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton variant="rounded" width={64} height={64} />
            <div className="flex-1">
              <Skeleton variant="text" width="30%" height={20} className="mb-2" />
              <Skeleton variant="text" width="20%" height={16} />
            </div>
            <div className="flex gap-2">
              <Skeleton variant="rounded" width={32} height={32} />
              <Skeleton variant="rounded" width={32} height={32} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton variant="rectangular" height={200} />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Skeleton variant="text" width="70%" height={24} className="mb-2" />
            <Skeleton variant="text" width="50%" height={16} />
          </div>
          <Skeleton variant="rounded" width={60} height={24} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width="40%" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width="30%" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Skeleton variant="rounded" width={100} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </CardFooter>
    </Card>
  );
};

export const StatsCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton variant="text" width="60%" height={14} />
        <Skeleton variant="circular" width={16} height={16} />
      </CardHeader>
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} className="mb-2" />
        <Skeleton variant="text" width="80%" height={12} />
      </CardContent>
    </Card>
  );
};

export const ProfileCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <SkeletonAvatar size="lg" />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" height={20} className="mb-2" />
            <Skeleton variant="text" width="30%" height={16} />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <SkeletonText lines={3} />
        </div>
      </CardContent>
    </Card>
  );
};