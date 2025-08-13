import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ClubCardSkeletonProps {
  viewMode?: 'grid' | 'list';
}

export const ClubCardSkeleton: React.FC<ClubCardSkeletonProps> = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return <ClubCardListSkeleton />;
  }
  
  return <ClubCardGridSkeleton />;
};

const ClubCardListSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          {/* Logo skeleton */}
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          
          <div className="flex-1 min-w-0">
            {/* Title skeleton */}
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-3" />
            
            {/* Info lines skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            </div>
            
            {/* Stats skeleton */}
            <div className="flex gap-6 mt-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
            
            {/* Status skeleton */}
            <div className="mt-3 h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          </div>
        </div>
        
        {/* Actions skeleton */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const ClubCardGridSkeleton = () => (
  <Card className="overflow-hidden animate-pulse">
    {/* Header image skeleton */}
    <div className="relative h-48 bg-gray-200 dark:bg-gray-700" />
    
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          {/* Status skeleton */}
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
        {/* Actions skeleton */}
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </CardHeader>
    
    <CardContent className="space-y-4">
      {/* Info skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
      
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      
      {/* Features skeleton */}
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
      </div>
    </CardContent>
    
    <CardFooter className="flex justify-between gap-2">
      <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
      <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
    </CardFooter>
  </Card>
);

export const ClubsListSkeleton: React.FC<{ count?: number; viewMode?: 'grid' | 'list' }> = ({ 
  count = 8, 
  viewMode = 'grid' 
}) => {
  const items = Array.from({ length: count }, (_, i) => i);
  
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {items.map((i) => (
          <ClubCardSkeleton key={i} viewMode="list" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((i) => (
        <ClubCardSkeleton key={i} viewMode="grid" />
      ))}
    </div>
  );
};