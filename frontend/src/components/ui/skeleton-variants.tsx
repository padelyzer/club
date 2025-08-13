import { cn } from '@/lib/utils';
import { Skeleton, SkeletonText, SkeletonAvatar } from './skeleton';

// Card skeleton
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" height={12} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  );
}

// Table skeleton
export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className,
  showHeader = true
}: { 
  rows?: number; 
  columns?: number; 
  className?: string;
  showHeader?: boolean;
}) {
  return (
    <div className={cn('w-full rounded-lg border', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/50">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" className="flex-1" height={16} />
          ))}
        </div>
      )}
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1">
              <Skeleton 
                variant="text" 
                width={colIndex === 0 ? '60%' : '80%'}
                height={14}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// List skeleton
export function SkeletonList({ 
  items = 3, 
  className,
  showAvatar = true,
  showAction = true
}: { 
  items?: number; 
  className?: string;
  showAvatar?: boolean;
  showAction?: boolean;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-lg border">
          {showAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
          {showAction && <Skeleton variant="rounded" width={24} height={24} />}
        </div>
      ))}
    </div>
  );
}

// Grid skeleton
export function SkeletonGrid({ 
  items = 6, 
  columns = 3, 
  className 
}: { 
  items?: number; 
  columns?: number; 
  className?: string;
}) {
  return (
    <div 
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Form skeleton
export function SkeletonForm({ 
  fields = 4, 
  className,
  showLabels = true 
}: { 
  fields?: number; 
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {showLabels && <Skeleton variant="text" width="30%" height={14} />}
          <Skeleton variant="rounded" height={40} />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton variant="rounded" width={100} height={40} />
        <Skeleton variant="rounded" width={100} height={40} />
      </div>
    </div>
  );
}

// Chart skeleton
export function SkeletonChart({ 
  height = 300, 
  className,
  type = 'bar'
}: { 
  height?: number; 
  className?: string;
  type?: 'bar' | 'line' | 'pie';
}) {
  return (
    <div className={cn('w-full', className)}>
      {type === 'pie' ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <Skeleton variant="circular" width={height * 0.8} height={height * 0.8} />
        </div>
      ) : (
        <>
          <Skeleton variant="rectangular" height={height} className="rounded-lg" />
          <div className="flex justify-between mt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} variant="text" width={30} height={12} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Dashboard skeleton
export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={300} height={16} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={100} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border space-y-2">
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="80%" height={28} />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border">
          <Skeleton variant="text" width="40%" height={20} className="mb-4" />
          <SkeletonChart height={250} />
        </div>
        <div className="p-6 rounded-lg border">
          <Skeleton variant="text" width="40%" height={20} className="mb-4" />
          <SkeletonChart height={250} type="pie" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton variant="text" width="30%" height={20} />
        </div>
        <SkeletonTable rows={5} columns={5} showHeader={false} />
      </div>
    </div>
  );
}

// Profile skeleton
export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-6">
        <SkeletonAvatar size="lg" />
        <div className="space-y-2">
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="text" width={150} height={16} />
        </div>
      </div>
      <SkeletonForm fields={6} />
    </div>
  );
}

// Calendar skeleton
export function SkeletonCalendar({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="rounded" width={24} height={24} />
        <Skeleton variant="text" width={150} height={20} />
        <Skeleton variant="rounded" width={24} height={24} />
      </div>
      
      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="text" height={20} />
        ))}
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={32} />
        ))}
      </div>
    </div>
  );
}

// Court booking skeleton
export function SkeletonCourtBooking({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Court selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" height={12} />
            <Skeleton variant="rounded" width="100%" height={32} />
          </div>
        ))}
      </div>
      
      {/* Time slots */}
      <div className="p-4 rounded-lg border">
        <Skeleton variant="text" width="30%" height={20} className="mb-4" />
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={40} />
          ))}
        </div>
      </div>
      
      {/* Booking form */}
      <SkeletonForm fields={3} />
    </div>
  );
}