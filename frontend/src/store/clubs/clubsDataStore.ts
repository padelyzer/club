import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Club, ClubFilters } from '@/types/club';

interface ClubsDataStore {
  // Data state (temporary cache for optimistic updates)
  clubs: Club[];
  totalClubs: number;
  
  // Pagination & Filters
  currentPage: number;
  pageSize: number;
  filters: ClubFilters;
  searchQuery: string;

  // Actions
  setClubs: (clubs: Club[], total: number) => void;
  addClub: (club: Club) => void;
  updateClub: (id: string, updates: Partial<Club>) => void;
  removeClub: (id: string) => void;
  setFilters: (filters: Partial<ClubFilters>) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;
  getClubById: (id: string) => Club | undefined;
}

export const useClubsDataStore = create<ClubsDataStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      clubs: [],
      totalClubs: 0,
      currentPage: 1,
      pageSize: 20,
      filters: {},
      searchQuery: '',

      // Actions
      setClubs: (clubs, total) =>
        set((state) => {
          state.clubs = clubs;
          state.totalClubs = total;
        }),

      addClub: (club) =>
        set((state) => {
          state.clubs.unshift(club);
          state.totalClubs += 1;
        }),

      updateClub: (id, updates) =>
        set((state) => {
          const index = state.clubs.findIndex((c) => c.id === id);
          if (index !== -1) {
            state.clubs[index] = { ...state.clubs[index], ...updates };
          }
        }),

      removeClub: (id) =>
        set((state) => {
          state.clubs = state.clubs.filter((c) => c.id !== id);
          state.totalClubs = Math.max(0, state.totalClubs - 1);
        }),

      setFilters: (filters) =>
        set((state) => {
          state.filters = { ...state.filters, ...filters };
          state.currentPage = 1; // Reset to first page
        }),

      setSearchQuery: (query) =>
        set((state) => {
          state.searchQuery = query;
          // Don't update filters.search here to avoid triggering useClubs
          state.currentPage = 1;
        }),

      setCurrentPage: (page) =>
        set((state) => {
          state.currentPage = page;
        }),

      setPageSize: (size) =>
        set((state) => {
          state.pageSize = size;
          state.currentPage = 1;
        }),

      resetFilters: () =>
        set((state) => {
          state.filters = {};
          state.searchQuery = '';
          state.currentPage = 1;
        }),

      getClubById: (id) => {
        return get().clubs.find((c) => c.id === id);
      },
    })),
    {
      name: 'ClubsDataStore',
    }
  )
);

// Selectors
export const selectClubs = (state: ClubsDataStore) => state.clubs;
export const selectTotalClubs = (state: ClubsDataStore) => state.totalClubs;
export const selectCurrentPage = (state: ClubsDataStore) => state.currentPage;
export const selectPageSize = (state: ClubsDataStore) => state.pageSize;
export const selectFilters = (state: ClubsDataStore) => state.filters;
export const selectSearchQuery = (state: ClubsDataStore) => state.searchQuery;