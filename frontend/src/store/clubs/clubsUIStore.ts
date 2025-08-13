import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Club, ClubViewMode } from '@/types/club';

interface ClubsUIStore {
  // View state
  viewMode: ClubViewMode;
  selectedClub: Club | null;
  isFormOpen: boolean;
  isDetailOpen: boolean;
  editingClub: Club | null;
  showMap: boolean;

  // Actions
  setViewMode: (mode: ClubViewMode) => void;
  openForm: (club?: Club) => void;
  closeForm: () => void;
  openDetail: (club: Club) => void;
  closeDetail: () => void;
  toggleMap: () => void;
  setSelectedClub: (club: Club | null) => void;
}

export const useClubsUIStore = create<ClubsUIStore>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        viewMode: 'grid',
        selectedClub: null,
        isFormOpen: false,
        isDetailOpen: false,
        editingClub: null,
        showMap: false,

        // Actions
        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        openForm: (club) =>
          set((state) => {
            state.isFormOpen = true;
            state.editingClub = club || null;
          }),

        closeForm: () =>
          set((state) => {
            state.isFormOpen = false;
            state.editingClub = null;
          }),

        openDetail: (club) =>
          set((state) => {
            state.selectedClub = club;
            state.isDetailOpen = true;
          }),

        closeDetail: () =>
          set((state) => {
            state.isDetailOpen = false;
          }),

        toggleMap: () =>
          set((state) => {
            state.showMap = !state.showMap;
            if (state.showMap) {
              state.viewMode = 'map';
            } else {
              state.viewMode = 'grid';
            }
          }),

        setSelectedClub: (club) =>
          set((state) => {
            state.selectedClub = club;
          }),
      })),
      {
        name: 'clubs-ui-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
        }),
      }
    ),
    {
      name: 'ClubsUIStore',
    }
  )
);

// Selectors
export const selectViewMode = (state: ClubsUIStore) => state.viewMode;
export const selectIsFormOpen = (state: ClubsUIStore) => state.isFormOpen;
export const selectIsDetailOpen = (state: ClubsUIStore) => state.isDetailOpen;
export const selectEditingClub = (state: ClubsUIStore) => state.editingClub;
export const selectSelectedClub = (state: ClubsUIStore) => state.selectedClub;
export const selectShowMap = (state: ClubsUIStore) => state.showMap;