import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showActions?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  columns = 5, 
  rows = 5,
  showActions = true,
  className 
}) => {
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton variant="text" width={i === 0 ? '40%' : '60%'} />
              </TableHead>
            ))}
            {showActions && (
              <TableHead>
                <Skeleton variant="text" width="50%" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton 
                    variant="text" 
                    width={`${Math.random() * 40 + 60}%`}
                  />
                </TableCell>
              ))}
              {showActions && (
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Skeleton variant="rounded" width={32} height={32} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const DataTableSkeleton: React.FC<{
  showFilters?: boolean;
  showPagination?: boolean;
}> = ({ 
  showFilters = true,
  showPagination = true 
}) => {
  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" width={300} height={40} />
          <Skeleton variant="rounded" width={120} height={40} />
          <Skeleton variant="rounded" width={120} height={40} />
          <div className="ml-auto">
            <Skeleton variant="rounded" width={100} height={40} />
          </div>
        </div>
      )}
      
      <TableSkeleton />
      
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={200} />
          <div className="flex gap-2">
            <Skeleton variant="rounded" width={80} height={32} />
            <Skeleton variant="rounded" width={32} height={32} />
            <Skeleton variant="rounded" width={32} height={32} />
            <Skeleton variant="rounded" width={32} height={32} />
            <Skeleton variant="rounded" width={80} height={32} />
          </div>
        </div>
      )}
    </div>
  );
};

// Specific table skeletons
export const ClubsTableSkeleton: React.FC = () => {
  return (
    <TableSkeleton 
      columns={6} 
      rows={5}
      showActions={true}
    />
  );
};

export const ClientsTableSkeleton: React.FC = () => {
  return (
    <TableSkeleton 
      columns={5} 
      rows={8}
      showActions={true}
    />
  );
};

export const ReservationsTableSkeleton: React.FC = () => {
  return (
    <TableSkeleton 
      columns={7} 
      rows={6}
      showActions={true}
    />
  );
};