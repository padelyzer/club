import { useCallback, useMemo } from 'react';
import { Club, ClubFilters } from '@/types/club';
import { useClubsDataStore, useActiveClubStore, useClubsUIStore } from './index';

/**
 * Performance monitoring wrapper for store selectors
 * Helps identify performance bottlenecks in store subscriptions
 */
let performanceWarnings = true;

export const setPerformanceWarnings = (enabled: boolean) => {
  performanceWarnings = enabled;
};

// Performance monitoring wrapper
function withPerformanceMonitoring<T>(
  selectorName: string,
  selector: () => T
): T {
  if (!performanceWarnings) return selector();
  
  const start = performance.now();
  const result = selector();
  const duration = performance.now() - start;
  
  if (duration > 5) { // Warn if selector takes more than 5ms
    console.warn(`[Performance] Selector ${selectorName} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Memoized selector for filtered clubs with performance monitoring
 * This prevents re-filtering on every render when filters haven't changed
 */
export const useFilteredClubs = () => {
  return useClubsDataStore(
    useCallback((state) => {
      return withPerformanceMonitoring('filteredClubs', () => {
        const { clubs, filters } = state;
        if (!filters || Object.keys(filters).length === 0) return clubs;
        
        return clubs.filter((club) => {
          if (filters.city && club.city !== filters.city) return false;
          if (filters.is_active !== undefined && club.is_active !== filters.is_active) return false;
          if (filters.search && !club.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
          if (filters.feature && !club.features?.includes(filters.feature)) return false;
          return true;
        });
      });
    }, [])
  );
};

/**
 * Memoized selector for club pagination state
 * Only re-runs when pagination-related state changes
 */
export const useClubPagination = () => {
  return useClubsDataStore(
    useCallback((state) => ({
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      totalClubs: state.totalClubs,
      hasNextPage: state.currentPage * state.pageSize < state.totalClubs,
      hasPreviousPage: state.currentPage > 1,
      totalPages: Math.ceil(state.totalClubs / state.pageSize),
    }), [])
  );
};

/**
 * Optimized selector for club statistics
 * Memoizes computed stats to avoid recalculation
 */
export const useClubStats = () => {
  return useClubsDataStore(
    useCallback((state) => {
      return withPerformanceMonitoring('clubStats', () => {
        const { clubs } = state;
        
        return {
          totalCount: clubs.length,
          activeCount: clubs.filter(c => c.is_active).length,
          inactiveCount: clubs.filter(c => !c.is_active).length,
          citiesCount: new Set(clubs.map(c => c.city).filter(Boolean)).size,
          averageRating: clubs.length > 0 
            ? clubs.reduce((sum, c) => sum + (c.rating || 0), 0) / clubs.length 
            : 0,
        };
      });
    }, [])
  );
};

/**
 * Performance-optimized selector for UI state
 * Groups related UI state to minimize subscriptions
 */
export const useClubsUIState = () => {
  return useClubsUIStore(
    useCallback((state) => ({
      viewMode: state.viewMode,
      isFormOpen: state.isFormOpen,
      isDetailOpen: state.isDetailOpen,
      showMap: state.showMap,
    }), [])
  );
};

/**
 * Optimized selector for checking if a club is selected
 * Uses memoization to prevent unnecessary re-renders
 */
export const useIsClubSelected = (clubId: string) => {
  return useClubsUIStore(
    useCallback((state) => state.selectedClub?.id === clubId, [clubId])
  );
};

/**
 * Optimized selector for checking if a club is active
 * Uses memoization to prevent unnecessary re-renders
 */
export const useIsClubActive = (clubId: string) => {
  return useActiveClubStore(
    useCallback((state) => state.activeClubId === clubId, [clubId])
  );
};

/**
 * Composite selector for club search functionality
 * Optimized for search UI components
 */
export const useClubSearch = () => {
  const filters = useClubsDataStore((state) => state.filters);
  const setSearchQuery = useClubsDataStore((state) => state.setSearchQuery);
  const setFilters = useClubsDataStore((state) => state.setFilters);
  const filteredClubs = useFilteredClubs();
  
  const searchState = useMemo(() => ({
    query: filters.search || '',
    results: filteredClubs,
    hasResults: filteredClubs.length > 0,
    isSearching: Boolean(filters.search?.length),
  }), [filters.search, filteredClubs]);
  
  const searchActions = useMemo(() => ({
    search: setSearchQuery,
    clearSearch: () => setSearchQuery(''),
    setFilters,
  }), [setSearchQuery, setFilters]);
  
  return { ...searchState, ...searchActions };
};

/**
 * Performance metrics for debugging
 * Returns render count and performance stats
 */
export const useClubsPerformanceMetrics = () => {
  const activeClub = useActiveClubStore((state) => state.activeClub);
  const clubs = useClubsDataStore((state) => state.clubs);
  const filters = useClubsDataStore((state) => state.filters);
  
  return useMemo(() => {
    const filterCount = Object.keys(filters || {}).length;
    
    return {
      totalClubs: clubs.length,
      activeClub: activeClub?.name || 'None',
      activeFilters: filterCount,
      renderTimestamp: Date.now(),
      // Add this to components to track re-render frequency
      logRender: (componentName: string) => {
        if (performanceWarnings) {
          console.log(`[Render] ${componentName} rendered at ${new Date().toLocaleTimeString()}`);
        }
      },
    };
  }, [activeClub?.name, clubs.length, filters]);
};

/**
 * Optimized bulk operations helper
 * For components that need to perform multiple club operations
 */
export const useClubsBulkOperations = () => {
  const addClub = useClubsDataStore((state) => state.addClub);
  const updateClub = useClubsDataStore((state) => state.updateClub);
  const removeClub = useClubsDataStore((state) => state.removeClub);
  
  return useMemo(() => ({
    bulkAdd: (clubs: Club[]) => {
      clubs.forEach(club => addClub(club));
    },
    bulkUpdate: (updates: Array<{ id: string; updates: Partial<Club> }>) => {
      updates.forEach(({ id, updates: clubUpdates }) => updateClub(id, clubUpdates));
    },
    bulkRemove: (clubIds: string[]) => {
      clubIds.forEach(id => removeClub(id));
    },
  }), [addClub, updateClub, removeClub]);
};