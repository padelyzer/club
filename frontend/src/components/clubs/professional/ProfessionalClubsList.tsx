import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid3X3, 
  List, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  Building2,
  Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Club, ClubViewMode } from '@/types/club';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/professional/Input';
import { cn } from '@/lib/utils';
import { ProfessionalClubCard } from './ProfessionalClubCard';
import { ClubEmptyState } from '../ui/error-states';

interface ProfessionalClubsListProps {
  clubs: Club[];
  loading?: boolean;
  viewMode: ClubViewMode;
  onViewModeChange: (mode: ClubViewMode) => void;
  onCreateClub?: () => void;
  onClubView?: (club: Club) => void;
  onClubEdit?: (club: Club) => void;
  onClubSetActive?: (club: Club) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortBy?: 'name' | 'members' | 'occupancy' | 'created';
  onSortChange?: (sort: string) => void;
  sortOrder?: 'asc' | 'desc';
  onSortOrderChange?: (order: 'asc' | 'desc') => void;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const ProfessionalClubsList = memo<ProfessionalClubsListProps>(({
  clubs,
  loading = false,
  viewMode,
  onViewModeChange,
  onCreateClub,
  onClubView,
  onClubEdit,
  onClubSetActive,
  searchQuery = '',
  onSearchChange,
  sortBy = 'name',
  onSortChange,
  sortOrder = 'asc',
  onSortOrderChange,
  totalCount = 0,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  className
}) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  // Server-side filtering and sorting - clubs come pre-processed
  const processedClubs = clubs;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  if (loading) {
    return <ClubsListSkeleton viewMode={viewMode} />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {t('clubs.title')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalCount} {totalCount === 1 ? t('clubs.club') : t('clubs.clubs')}
          </p>
        </div>

        {onCreateClub && (
          <Button
            onClick={onCreateClub}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shrink-0"
          >
            {t('clubs.create')}
          </Button>
        )}
      </div>

      {/* Controls */}
      <Card variant="glass" padding="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              variant="filled"
              placeholder={t('clubs.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSortOrderChange?.(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="px-3"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'name', label: t('clubs.sortByName') },
            { key: 'members', label: t('clubs.sortByMembers') },
            { key: 'occupancy', label: t('clubs.sortByOccupancy') },
            { key: 'created', label: t('clubs.sortByDate') },
          ].map((option) => (
            <Button
              key={option.key}
              variant={sortBy === option.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onSortChange?.(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Clubs Grid/List */}
      {processedClubs.length === 0 ? (
        <ClubEmptyState
          title={searchQuery ? t('clubs.noResults') : t('clubs.noClubs')}
          message={
            searchQuery 
              ? t('clubs.noResultsMessage', { query: searchQuery })
              : t('clubs.noClubsMessage')
          }
          action={onCreateClub ? {
            label: t('clubs.createFirst'),
            onClick: onCreateClub
          } : undefined}
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          )}
        >
          <AnimatePresence mode="popLayout">
            {processedClubs.map((club, index) => (
              <motion.div
                key={club.id}
                variants={itemVariants}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <ProfessionalClubCard
                  club={club}
                  viewMode={viewMode}
                  onView={() => onClubView?.(club)}
                  onEdit={() => onClubEdit?.(club)}
                  onSetActive={() => onClubSetActive?.(club)}
                  featured={index === 0 && viewMode === 'grid'} // Featured first card
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination Controls */}
      {totalCount > pageSize && onPageChange && (
        <Card variant="glass" padding="default" className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Results info and page size selector */}
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {t('common.showing', {
                  from: (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, totalCount),
                  total: totalCount,
                })}
              </p>
              
              {/* Page Size Selector */}
              {onPageSizeChange && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {t('common.itemsPerPage', 'Items per page:')}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center justify-center gap-2">
              {/* Previous button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('common.previous')}
              </Button>

              {/* Page numbers */}
              {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                const pages = [];
                const maxVisiblePages = 5;
                
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                // First page and ellipsis
                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant="ghost"
                      size="sm"
                      onClick={() => onPageChange(1)}
                      className="px-3"
                    >
                      1
                    </Button>
                  );
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipsis1" className="px-2 py-2 text-gray-500">...</span>
                    );
                  }
                }
                
                // Page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={i === currentPage ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => onPageChange(i)}
                      className="px-3"
                    >
                      {i}
                    </Button>
                  );
                }
                
                // Last page and ellipsis
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis2" className="px-2 py-2 text-gray-500">...</span>
                    );
                  }
                  pages.push(
                    <Button
                      key={totalPages}
                      variant="ghost"
                      size="sm"
                      onClick={() => onPageChange(totalPages)}
                      className="px-3"
                    >
                      {totalPages}
                    </Button>
                  );
                }
                
                return pages;
              })()}

              {/* Next button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage * pageSize >= totalCount}
                className="px-3"
              >
                {t('common.next')}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.clubs.length === nextProps.clubs.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortOrder === nextProps.sortOrder &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.pageSize === nextProps.pageSize &&
    JSON.stringify(prevProps.clubs.map(c => c.id)) === JSON.stringify(nextProps.clubs.map(c => c.id))
  );
});

ProfessionalClubsList.displayName = 'ProfessionalClubsList';

// Skeleton para loading
const ClubsListSkeleton = memo<{ viewMode: ClubViewMode }>(({ viewMode }) => (
  <div className={cn(
    viewMode === 'grid' 
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
      : 'space-y-4'
  )}>
    {Array.from({ length: viewMode === 'grid' ? 8 : 6 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <Card padding="none" className="overflow-hidden">
          {viewMode === 'grid' ? (
            <>
              <div className="h-48 bg-gray-200" />
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="text-center space-y-2">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg mx-auto" />
                      <div className="h-4 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-9 bg-gray-200 rounded flex-1" />
                  <div className="h-9 bg-gray-200 rounded flex-1" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center p-6 gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="flex gap-6">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-4 bg-gray-200 rounded w-16" />
                  ))}
                </div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          )}
        </Card>
      </div>
    ))}
  </div>
));

ClubsListSkeleton.displayName = 'ClubsListSkeleton';

export default ProfessionalClubsList;