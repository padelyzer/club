'use client';

import { useMemo, memo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useClubsDataStore } from '@/store/clubs/clubsDataStore';
import { useClubsUIStore } from '@/store/clubs/clubsUIStore';
import { ClubCard } from './club-card';
import { Club } from '@/types/club';
import { MapPin } from './icons';
import { shallow } from 'zustand/shallow';
import { ClubComponentLoader } from './lazy-components';
import { PerformanceMonitor } from './with-performance-monitoring';

// Lazy load virtualized list
const VirtualizedClubsList = lazy(() => 
  import('./virtualized-clubs-list').then(module => ({ 
    default: module.VirtualizedClubsList 
  }))
);

export const ClubsList: React.FC = memo(() => {
  const { t } = useTranslation();
  
  // Use specialized stores
  const { clubs, totalClubs, currentPage, pageSize, setCurrentPage, setPageSize } = useClubsDataStore(
    (state) => ({
      clubs: state.clubs,
      totalClubs: state.totalClubs,
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      setCurrentPage: state.setCurrentPage,
      setPageSize: state.setPageSize
    }),
    shallow
  );
  
  const viewMode = useClubsUIStore((state) => state.viewMode);

  const paginatedClubs = useMemo(() => {
    return clubs;
  }, [clubs]);
  
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(currentPage - 1);
  }, [currentPage, setCurrentPage]);
  
  const handleNextPage = useCallback(() => {
    setCurrentPage(currentPage + 1);
  }, [currentPage, setCurrentPage]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
  }, [setPageSize]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);
  
  // Use virtualization for large lists
  const shouldVirtualize = totalClubs > 50;

  if (viewMode === 'map') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4 h-96">
          <MapPin className="h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('clubs.mapViewComingSoon')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            {t('clubs.mapViewDescription')}
          </p>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Use virtualized list for large datasets
  if (shouldVirtualize) {
    return (
      <div className="h-[calc(100vh-300px)]">
        <Suspense fallback={<ClubComponentLoader />}>
          <VirtualizedClubsList clubs={clubs} />
        </Suspense>
        
        {/* Simple pagination info for virtualized list */}
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('common.showingTotal', { total: totalClubs })} clubes
        </div>
      </div>
    );
  }

  // Regular animated list for smaller datasets
  return (
    <PerformanceMonitor componentName="ClubsList">
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-4"
          >
            {paginatedClubs.map((club: any) => (
              <motion.div key={club.id} variants={itemVariants}>
                <ClubCard club={club} viewMode="list" />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {paginatedClubs.map((club: any) => (
              <motion.div key={club.id} variants={itemVariants}>
                <ClubCard club={club} viewMode="grid" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Pagination */}
      {totalClubs > 0 && (
        <div className="mt-6 space-y-4">
          {/* Results info and page size selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('common.showing', {
                  from: (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, totalClubs),
                  total: totalClubs,
                })}
              </p>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.itemsPerPage', 'Items per page:')}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pagination controls */}
          {totalClubs > pageSize && (
            <div className="flex items-center justify-center gap-2">
              {/* Previous button */}
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('common.previous')}
              </button>

              {/* Page numbers */}
              {(() => {
                const totalPages = Math.ceil(totalClubs / pageSize);
                const pages = [];
                const maxVisiblePages = 5;
                
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                // Adjust start if we're near the end
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                // First page and ellipsis
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => handleGoToPage(1)}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      1
                    </button>
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
                    <button
                      key={i}
                      onClick={() => handleGoToPage(i)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        i === currentPage
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {i}
                    </button>
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
                    <button
                      key={totalPages}
                      onClick={() => handleGoToPage(totalPages)}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                return pages;
              })()}

              {/* Next button */}
              <button
                onClick={handleNextPage}
                disabled={currentPage * pageSize >= totalClubs}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {t('common.next')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </PerformanceMonitor>
  );
});

ClubsList.displayName = 'ClubsList';
