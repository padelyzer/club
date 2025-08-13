// Re-export all club stores and selectors
export * from './activeClubStore';
export * from './clubsUIStore';
export * from './clubsDataStore';

// Re-export performance helpers
export * from './performance';

// Import individual stores
import { useActiveClubStore } from './activeClubStore';
import { useClubsUIStore } from './clubsUIStore';
import { useClubsDataStore } from './clubsDataStore';
import { useMemo, useCallback } from 'react';

// Performance-optimized composite hook that provides backward compatibility
// Uses proper React subscriptions and memoization
export const useClubsStore = () => {
  // Subscribe to each store's state with specific selectors to minimize re-renders
  const activeClub = useActiveClubStore((state) => state.activeClub);
  const activeClubId = useActiveClubStore((state) => state.activeClubId);
  const activeClubStats = useActiveClubStore((state) => state.activeClubStats);
  
  const clubs = useClubsDataStore((state) => state.clubs);
  const totalClubs = useClubsDataStore((state) => state.totalClubs);
  const filters = useClubsDataStore((state) => state.filters);
  const searchQuery = useClubsDataStore((state) => state.searchQuery);
  const currentPage = useClubsDataStore((state) => state.currentPage);
  const pageSize = useClubsDataStore((state) => state.pageSize);
  
  const viewMode = useClubsUIStore((state) => state.viewMode);
  const isFormOpen = useClubsUIStore((state) => state.isFormOpen);
  const isDetailOpen = useClubsUIStore((state) => state.isDetailOpen);
  const selectedClub = useClubsUIStore((state) => state.selectedClub);
  const editingClub = useClubsUIStore((state) => state.editingClub);
  const showMap = useClubsUIStore((state) => state.showMap);

  // Memoized action creators to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    // Active Club Actions
    setActiveClub: useActiveClubStore.getState().setActiveClub,
    setActiveClubStats: useActiveClubStore.getState().setActiveClubStats,
    switchClub: useActiveClubStore.getState().switchClub,
    clearActiveClub: useActiveClubStore.getState().clearActiveClub,
    
    // Data Actions
    setClubs: useClubsDataStore.getState().setClubs,
    addClub: useClubsDataStore.getState().addClub,
    updateClub: useClubsDataStore.getState().updateClub,
    removeClub: useClubsDataStore.getState().removeClub,
    setFilters: useClubsDataStore.getState().setFilters,
    setSearchQuery: useClubsDataStore.getState().setSearchQuery,
    setCurrentPage: useClubsDataStore.getState().setCurrentPage,
    setPageSize: useClubsDataStore.getState().setPageSize,
    resetFilters: useClubsDataStore.getState().resetFilters,
    getClubById: useClubsDataStore.getState().getClubById,
    
    // UI Actions
    setViewMode: useClubsUIStore.getState().setViewMode,
    openForm: useClubsUIStore.getState().openForm,
    closeForm: useClubsUIStore.getState().closeForm,
    openDetail: useClubsUIStore.getState().openDetail,
    closeDetail: useClubsUIStore.getState().closeDetail,
    toggleMap: useClubsUIStore.getState().toggleMap,
    setSelectedClub: useClubsUIStore.getState().setSelectedClub,
  }), []);

  // Memoized composite resetState function
  const resetState = useCallback(() => {
    actions.resetFilters();
    actions.closeForm();
    actions.closeDetail();
  }, [actions]);

  // Return memoized state object
  return useMemo(() => ({
    // Active Club State
    activeClub,
    activeClubId,
    activeClubStats,
    
    // Data State
    clubs,
    totalClubs,
    filters,
    searchQuery,
    currentPage,
    pageSize,
    
    // UI State
    viewMode,
    isFormOpen,
    isDetailOpen,
    selectedClub,
    editingClub,
    showMap,
    
    // Actions
    ...actions,
    resetState,
    
    // Backward compatibility properties
    totalCount: totalClubs,
    loading: false, // This should come from a separate loading store if needed
    error: null as string | null, // This should come from a separate error store if needed
    setLoading: () => {}, // Deprecated - use loading states in queries
    setError: () => {}, // Deprecated - use error states in queries
  }), [
    activeClub,
    activeClubId,
    activeClubStats,
    clubs,
    totalClubs,
    filters,
    searchQuery,
    currentPage,
    pageSize,
    viewMode,
    isFormOpen,
    isDetailOpen,
    selectedClub,
    editingClub,
    showMap,
    actions,
    resetState
  ]);
};

// Individual hook exports for direct usage (recommended)
export const useActiveClub = () => useActiveClubStore((state) => state.activeClub);
export const useActiveClubId = () => useActiveClubStore((state) => state.activeClubId);
export const useClubs = () => useClubsDataStore((state) => state.clubs);
export const useClubFilters = () => useClubsDataStore((state) => state.filters);
export const useClubViewMode = () => useClubsUIStore((state) => state.viewMode);

// Performance-optimized selectors with memoization for complex derived state
export const useFilteredClubsCount = () => {
  return useClubsDataStore((state) => {
    const { clubs, filters } = state;
    if (!filters || Object.keys(filters).length === 0) return clubs.length;
    
    // This selector will only re-run when clubs or filters change
    return clubs.filter((club) => {
      if (filters.city && club.city !== filters.city) return false;
      if (filters.is_active !== undefined && club.is_active !== filters.is_active) return false;
      if (filters.search && !club.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    }).length;
  });
};

export const useActiveClubContext = () => {
  return useActiveClubStore((state) => ({
    activeClub: state.activeClub,
    activeClubId: state.activeClubId,
    activeClubStats: state.activeClubStats,
  }));
};