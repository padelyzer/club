import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  checkAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  
  checkAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      set({ isAuthenticated: !!token });
    }
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ isAuthenticated: false });
    }
  },
}));