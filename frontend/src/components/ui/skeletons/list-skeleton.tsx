import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListItemSkeletonProps {
  showAvatar?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
  className?: string;
}

export const ListItemSkeleton: React.FC<ListItemSkeletonProps> = ({
  showAvatar = true,
  showDescription = true,
  showActions = true,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b', className)}>
      {showAvatar && <SkeletonAvatar />}
      
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="30%" height={18} />
        {showDescription && (
          <Skeleton variant="text" width="60%" height={14} />
        )}
      </div>
      
      {showActions && (
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={32} height={32} />
          <Skeleton variant="rounded" width={32} height={32} />
        </div>
      )}
    </div>
  );
};

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  ...props
}) => {
  return (
    <div>
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} {...props} />
      ))}
    </div>
  );
};

// Timeline skeleton for calendar/schedule views
export const TimelineItemSkeleton: React.FC = () => {
  return (
    <div className="flex gap-4 p-4">
      <div className="w-20 shrink-0">
        <Skeleton variant="text" width="100%" height={16} />
      </div>
      <div className="flex-1">
        <Skeleton variant="rounded" width="100%" height={80} />
      </div>
    </div>
  );
};

export const TimelineSkeleton: React.FC<{ days?: number }> = ({ days = 7 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: days }).map((_, i) => (
        <TimelineItemSkeleton key={i} />
      ))}
    </div>
  );
};

// Chat/Message skeleton
export const MessageSkeleton: React.FC<{ isOwn?: boolean }> = ({ isOwn = false }) => {
  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <SkeletonAvatar size="sm" />
      <div className={cn('space-y-1', isOwn && 'items-end')}>
        <Skeleton variant="text" width={100} height={14} />
        <Skeleton 
          variant="rounded" 
          width={200 + Math.random() * 100} 
          height={40}
          className={cn(isOwn && 'ml-auto')}
        />
      </div>
    </div>
  );
};

export const ChatSkeleton: React.FC<{ messages?: number }> = ({ messages = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: messages }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </div>
  );
};

// Feed skeleton
export const FeedItemSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width={80} height={14} />
          </div>
          <SkeletonText lines={2} />
        </div>
      </div>
      <Skeleton variant="rounded" width="100%" height={200} />
      <div className="flex items-center gap-4">
        <Skeleton variant="text" width={60} height={14} />
        <Skeleton variant="text" width={80} height={14} />
        <Skeleton variant="text" width={60} height={14} />
      </div>
    </div>
  );
};

export const FeedSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <div className="divide-y">
      {Array.from({ length: items }).map((_, i) => (
        <FeedItemSkeleton key={i} />
      ))}
    </div>
  );
};