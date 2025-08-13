import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Club, ClubStats } from '@/types/club';

interface ActiveClubStore {
  // State
  activeClub: Club | null;
  activeClubId: string | null;
  activeClubStats: ClubStats | null;

  // Actions
  setActiveClub: (club: Club | null) => void;
  setActiveClubStats: (stats: ClubStats | null) => void;
  switchClub: (clubId: string, club?: Club) => void;
  clearActiveClub: () => void;
}

export const useActiveClubStore = create<ActiveClubStore>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        activeClub: null,
        activeClubId: null,
        activeClubStats: null,

        // Actions
        setActiveClub: (club) =>
          set((state) => {
            state.activeClub = club;
            state.activeClubId = club?.id || null;
            if (club) {
              localStorage.setItem('activeClubId', club.id);
            } else {
              localStorage.removeItem('activeClubId');
            }
          }),

        setActiveClubStats: (stats) =>
          set((state) => {
            state.activeClubStats = stats;
          }),

        switchClub: (clubId, club) =>
          set((state) => {
            state.activeClubId = clubId;
            if (club) {
              state.activeClub = club;
            }
            localStorage.setItem('activeClubId', clubId);
          }),

        clearActiveClub: () =>
          set((state) => {
            state.activeClub = null;
            state.activeClubId = null;
            state.activeClubStats = null;
            localStorage.removeItem('activeClubId');
          }),
      })),
      {
        name: 'active-club-store',
        partialize: (state) => ({
          activeClubId: state.activeClubId,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            const activeClubId = localStorage.getItem('activeClubId');
            if (activeClubId) {
              state.activeClubId = activeClubId;
            }
          }
        },
      }
    ),
    {
      name: 'ActiveClubStore',
    }
  )
);

// Selectors
export const selectActiveClub = (state: ActiveClubStore) => state.activeClub;
export const selectActiveClubId = (state: ActiveClubStore) => state.activeClubId;
export const selectActiveClubStats = (state: ActiveClubStore) => state.activeClubStats;

// Memoized selector creator for checking if a club is active
const memoizedSelectors = new Map<string, (state: ActiveClubStore) => boolean>();
export const selectIsActiveClub = (clubId: string) => {
  if (!memoizedSelectors.has(clubId)) {
    memoizedSelectors.set(clubId, (state: ActiveClubStore) => state.activeClubId === clubId);
  }
  return memoizedSelectors.get(clubId)!;
};