import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Club,
  ClubFilters,
  ClubViewMode,
  ClubsPageState,
  ClubStats,
} from '@/types/club';

interface ClubsStore extends ClubsPageState {
  // State
  clubs: Club[];
  totalClubs: number;
  currentPage: number;
  pageSize: number;
  filters: ClubFilters;
  searchQuery: string;
  loading: boolean;
  error: string | null;

  // Active club context
  activeClub: Club | null;
  activeClubStats: ClubStats | null;

  // Actions
  setClubs: (clubs: Club[], total: number) => void;
  setSelectedClub: (club: Club | null) => void;
  setActiveClub: (club: Club | null) => void;
  setActiveClubStats: (stats: ClubStats | null) => void;
  setViewMode: (mode: ClubViewMode) => void;
  setFilters: (filters: Partial<ClubFilters>) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // UI Actions
  openForm: (club?: Club) => void;
  closeForm: () => void;
  openDetail: (club: Club) => void;
  closeDetail: () => void;
  toggleMap: () => void;

  // Data Actions
  addClub: (club: Club) => void;
  updateClub: (id: string, club: Partial<Club>) => void;
  removeClub: (id: string) => void;
  switchClub: (clubId: string) => void;

  // Utility Actions
  resetFilters: () => void;
  resetState: () => void;
  getClubById: (id: string) => Club | undefined;
}

const initialState: Omit<ClubsStore, keyof ReturnType<typeof createActions>> = {
  // Data
  clubs: [],
  totalClubs: 0,
  currentPage: 1,
  pageSize: 20,
  filters: {},
  searchQuery: '',
  loading: false,
  error: null,

  // Active club context
  activeClub: null,
  activeClubId: null,
  activeClubStats: null,

  // UI
  viewMode: 'grid',
  selectedClub: null,
  isFormOpen: false,
  isDetailOpen: false,
  editingClub: null,
  showMap: false,
};

const createActions = (set: any, get: any) => ({
  // Basic setters
  setClubs: (clubs: Club[], total: number) =>
    set((state: ClubsStore) => {
      state.clubs = clubs;
      state.totalClubs = total;
    }),

  setSelectedClub: (club: Club | null) =>
    set((state: ClubsStore) => {
      state.selectedClub = club;
    }),

  setActiveClub: (club: Club | null) =>
    set((state: ClubsStore) => {
      state.activeClub = club;
      state.activeClubId = club?.id || null;
      if (club) {
        // Persist active club ID to localStorage
        localStorage.setItem('activeClubId', club.id);
      } else {
        localStorage.removeItem('activeClubId');
      }
    }),

  setActiveClubStats: (stats: ClubStats | null) =>
    set((state: ClubsStore) => {
      state.activeClubStats = stats;
    }),

  setViewMode: (mode: ClubViewMode) =>
    set((state: ClubsStore) => {
      state.viewMode = mode;
    }),

  setFilters: (filters: Partial<ClubFilters>) =>
    set((state: ClubsStore) => {
      state.filters = { ...state.filters, ...filters };
      state.currentPage = 1; // Reset to first page when filters change
    }),

  setSearchQuery: (query: string) =>
    set((state: ClubsStore) => {
      state.searchQuery = query;
      state.filters.search = query;
      state.currentPage = 1;
    }),

  setCurrentPage: (page: number) =>
    set((state: ClubsStore) => {
      state.currentPage = page;
    }),

  setPageSize: (size: number) =>
    set((state: ClubsStore) => {
      state.pageSize = size;
      state.currentPage = 1;
    }),

  setLoading: (loading: boolean) =>
    set((state: ClubsStore) => {
      state.loading = loading;
    }),

  setError: (error: string | null) =>
    set((state: ClubsStore) => {
      state.error = error;
    }),

  // UI Actions
  openForm: (club?: Club) =>
    set((state: ClubsStore) => {
      state.isFormOpen = true;
      state.editingClub = club || null;
    }),

  closeForm: () =>
    set((state: ClubsStore) => {
      state.isFormOpen = false;
      state.editingClub = null;
    }),

  openDetail: (club: Club) =>
    set((state: ClubsStore) => {
      state.selectedClub = club;
      state.isDetailOpen = true;
    }),

  closeDetail: () =>
    set((state: ClubsStore) => {
      state.isDetailOpen = false;
      // Keep selectedClub for smooth transition
    }),

  toggleMap: () =>
    set((state: ClubsStore) => {
      state.showMap = !state.showMap;
      if (state.showMap) {
        state.viewMode = 'map';
      } else {
        state.viewMode = 'grid';
      }
    }),

  // Data Actions
  addClub: (club: Club) =>
    set((state: ClubsStore) => {
      state.clubs.unshift(club);
      state.totalClubs += 1;
      // If this is the first club, set it as active
      if (state.totalClubs === 1) {
        state.activeClub = club;
        state.activeClubId = club.id;
        localStorage.setItem('activeClubId', club.id);
      }
    }),

  updateClub: (id: string, updates: Partial<Club>) =>
    set((state: ClubsStore) => {
      const index = state.clubs.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.clubs[index] = { ...state.clubs[index], ...updates };
      }
      if (state.selectedClub?.id === id) {
        state.selectedClub = { ...state.selectedClub, ...updates };
      }
      if (state.editingClub?.id === id) {
        state.editingClub = { ...state.editingClub, ...updates };
      }
      if (state.activeClub?.id === id) {
        state.activeClub = { ...state.activeClub, ...updates };
      }
    }),

  removeClub: (id: string) =>
    set((state: ClubsStore) => {
      state.clubs = state.clubs.filter((c) => c.id !== id);
      state.totalClubs -= 1;
      if (state.selectedClub?.id === id) {
        state.selectedClub = null;
        state.isDetailOpen = false;
      }
      if (state.activeClub?.id === id) {
        // Switch to first available club or null
        const nextClub = state.clubs[0] || null;
        state.activeClub = nextClub;
        state.activeClubId = nextClub?.id || null;
        if (nextClub) {
          localStorage.setItem('activeClubId', nextClub.id);
        } else {
          localStorage.removeItem('activeClubId');
        }
      }
    }),

  switchClub: (clubId: string) => {
    const club = get().clubs.find((c: Club) => c.id === clubId);
    if (club) {
      set((state: ClubsStore) => {
        state.activeClub = club;
        state.activeClubId = club.id;
        localStorage.setItem('activeClubId', club.id);
      });
    }
  },

  // Utility Actions
  resetFilters: () =>
    set((state: ClubsStore) => {
      state.filters = {};
      state.searchQuery = '';
      state.currentPage = 1;
    }),

  resetState: () =>
    set((state: ClubsStore) => ({
      ...initialState,
      // Preserve active club context
      activeClub: state.activeClub,
      activeClubId: state.activeClubId,
    })),

  getClubById: (id: string) => {
    return get().clubs.find((c: Club) => c.id === id);
  },
});

export const useClubsStore = create<ClubsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        ...createActions(set, get),
      })),
      {
        name: 'clubs-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
          pageSize: state.pageSize,
          activeClubId: state.activeClubId,
        }),
        onRehydrateStorage: () => (state) => {
          // Restore active club from localStorage
          if (state) {
            const activeClubId = localStorage.getItem('activeClubId');
            if (activeClubId && state.clubs.length > 0) {
              const activeClub = state.clubs.find((c) => c.id === activeClubId);
              if (activeClub) {
                state.activeClub = activeClub;
                state.activeClubId = activeClubId;
              }
            }
          }
        },
      }
    ),
    {
      name: 'ClubsStore',
    }
  )
);
