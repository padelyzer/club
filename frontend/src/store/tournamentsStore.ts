// Temporary tournaments store - to be fixed later
import { create } from 'zustand';

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface TournamentStore {
  tournaments: Tournament[];
  setTournaments: (tournaments: Tournament[]) => void;
}

export const useTournamentStore = create<TournamentStore>((set) => ({
  tournaments: [],
  setTournaments: (tournaments) => set({ tournaments }),
}));
