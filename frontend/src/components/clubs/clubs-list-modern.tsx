'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, List, Search, Filter, TrendingUp, 
  Sparkles, Crown, Star, MapPin 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClubsOptimized } from '@/lib/api/hooks/useClubsOptimized';
import { 
  useClubStore, 
  useClubViewMode,
  useClubFilters
} from '@/lib/stores/club-store';
import { ModernClubCard } from './club-card-modern';
import { adaptClubForUI } from '@/lib/adapters/club-adapter';
import { clubDesignTokens as tokens } from '@/styles/club-design-tokens';
import { filterAndSortClubs } from '@/lib/utils/club-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClubViewMode } from '@/types/club';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

interface ModernClubsListProps {
  showFilters?: boolean;
  showViewToggle?: boolean;
  featuredClubIds?: string[];
  onClubClick?: (clubId: string) => void;
}

/**
 * Loading Skeleton Component - Defined early to avoid hoisting issues
 */
const LoadingSkeleton: React.FC<{ viewMode: ClubViewMode }> = ({ viewMode }) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex gap-6">
              <Skeleton className="w-64 h-48 rounded-xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <div className="grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-16 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <Skeleton className="h-48 w-full" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-16 rounded-lg" />
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ModernClubsList: React.FC<ModernClubsListProps> = ({
  showFilters = true,
  showViewToggle = true,
  featuredClubIds = [],
  onClubClick
}) => {
  const { clubs, isLoading } = useClubsOptimized();
  const viewMode = useClubViewMode();
  const filters = useClubFilters();
  const { 
    setViewMode,
    setFilter,
    sortBy,
    setSortBy,
    toggleSortOrder,
    sortOrder
  } = useClubStore();

  // Compute filtered and sorted clubs using utility function
  const sortedClubs = React.useMemo(() => {
    if (!clubs) return [];
    const adaptedClubs = clubs.map(adaptClubForUI);
    return filterAndSortClubs(adaptedClubs, filters, sortBy, sortOrder);
  }, [clubs, filters, sortBy, sortOrder]);
  
  const [localSearch, setLocalSearch] = useState(filters.search);
  
  // Apply featured priority to already sorted clubs from store
  const displayClubs = React.useMemo(() => {
    if (featuredClubIds && featuredClubIds.length > 0) {
      const featured = sortedClubs.filter(club => featuredClubIds.includes(club.id));
      const nonFeatured = sortedClubs.filter(club => !featuredClubIds.includes(club.id));
      return [...featured, ...nonFeatured];
    }
    return sortedClubs;
  }, [sortedClubs, featuredClubIds]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter('search', localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setFilter]);
  
  if (isLoading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }
  
  if (sortedClubs.length === 0) {
    return (
      <EmptyState
        title="No se encontraron clubes"
        description="Prueba ajustando los filtros o creando un nuevo club"
        icon={
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        }
      />
    );
  }
  
  // Pagination support (for future implementation)
  const currentPage = 1;
  const pageSize = 20;
  const totalClubs = sortedClubs.length;
  const totalPages = Math.ceil(totalClubs / pageSize);
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Bar */}
        {showFilters && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={localSearch || ''}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar clubes por nombre, ubicación..."
              className="pl-10 pr-4 h-11 border-gray-200 dark:border-gray-700 rounded-xl"
            />
          </div>
        )}
        
        {/* View Toggle */}
        {showViewToggle && (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'grid' 
                  ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'list' 
                  ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      {/* Featured Section */}
      {featuredClubIds.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Clubes Destacados
            </h2>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      )}
      
      {/* Clubs Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          )}
        >
          {displayClubs.map((club, index) => (
            <motion.div
              key={club.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <ModernClubCard
                club={club}
                viewMode={viewMode}
                featured={featuredClubIds.includes(club.id)}
                onQuickAction={(action) => {
                  if (action === 'book') {
                    onClubClick?.(club.id);
                  }
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // setCurrentPage(currentPage - 1) // TODO: Implement pagination
            }}
            disabled={currentPage === 1}
            className="rounded-lg"
          >
            Anterior
          </Button>
          
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;
              const isNearby = Math.abs(page - currentPage) <= 1;
              
              if (!isNearby && page !== 1 && page !== totalPages) {
                if (page === 2 || page === totalPages - 1) {
                  return <span key={page} className="px-1 text-gray-400">...</span>;
                }
                return null;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => {
                  // setCurrentPage(page) // TODO: Implement pagination
                }}
                  className={cn(
                    "w-10 h-10 rounded-lg font-medium text-sm transition-all",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // setCurrentPage(currentPage + 1) // TODO: Implement pagination
            }}
            disabled={currentPage === totalPages}
            className="rounded-lg"
          >
            Siguiente
          </Button>
        </div>
      )}
      
      {/* Stats Footer */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalClubs}
            </div>
            <div className="text-sm text-gray-500">Clubes Totales</div>
          </div>
          
          <div>
            <div className="text-3xl font-bold text-indigo-600">
              {displayClubs.filter(c => c.tier === 'elite').length}
            </div>
            <div className="text-sm text-gray-500">Clubes Elite</div>
          </div>
          
          <div>
            <div className="text-3xl font-bold text-green-600 flex items-center justify-center gap-1">
              4.8
              <Star className="w-5 h-5 fill-green-600" />
            </div>
            <div className="text-sm text-gray-500">Rating Promedio</div>
          </div>
          
          <div>
            <div className="text-3xl font-bold text-purple-600 flex items-center justify-center gap-1">
              +15%
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm text-gray-500">Crecimiento Mensual</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component moved to top of file

export default ModernClubsList;