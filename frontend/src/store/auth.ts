import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { User, LoadingState } from '@/types';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthStore extends LoadingState {
  // Core auth state
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  currentOrganization: any | null; // Current organization details
  availableOrganizations: any[]; // List of organizations user has access to

  // Security
  lastActivity: number;
  sessionExpiry: number;
  deviceId: string;

  // Login attempts
  loginAttempts: number;
  lockoutUntil: number | null;

  // Remember me
  rememberMe: boolean;

  // Actions
  login: (user: User, session: AuthSession, rememberMe?: boolean) => void;
  logout: (reason?: 'manual' | 'expired' | 'security') => void;
  refreshSession: (newSession: AuthSession) => void;
  updateUser: (updates: Partial<User>) => void;
  setCurrentOrganization: (organization: any) => void;
  setAvailableOrganizations: (organizations: any[]) => void;

  // Session management
  updateActivity: () => void;
  checkSessionExpiry: () => boolean;
  extendSession: () => void;

  // Security
  recordLoginAttempt: () => void;
  clearLoginAttempts: () => void;
  isLocked: () => boolean;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Two-factor authentication
  twoFactorRequired: boolean;
  setTwoFactorRequired: (required: boolean) => void;
  completeTwoFactor: (user: User, session: AuthSession) => void;

  // Device management
  generateDeviceId: () => string;

  // Utility
  getTokens: () => { accessToken: string; refreshToken: string } | null;
  isTokenExpired: () => boolean;
}

// Secure encryption for sensitive data
import CryptoJS from 'crypto-js';

// Use environment variable for key, with fallback for development
// In production, use a secure key management solution
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'dev-key-change-in-production';

const encrypt = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    // Don't log error details in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Encryption failed:', error);
    }
    throw new Error('Failed to encrypt sensitive data');
  }
};

const decrypt = (data: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Invalid encrypted data');
    }
    return decrypted;
  } catch (error) {
    // Don't log error details in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Decryption failed:', error);
    }
    throw new Error('Failed to decrypt sensitive data');
  }
};

// Custom storage with encryption
const createEncryptedStorage = () => ({
  getItem: (name: string): string | null => {
    const item = localStorage.getItem(name);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);
      if (parsed.encrypted) {
        parsed.state = JSON.parse(decrypt(parsed.state));
      }
      return JSON.stringify(parsed);
    } catch {
      return item;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      const encryptedState = encrypt(JSON.stringify(parsed.state));
      const encryptedData = {
        ...parsed,
        state: encryptedState,
        encrypted: true,
      };
      localStorage.setItem(name, JSON.stringify(encryptedData));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
});

export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      currentOrganization: null,
      availableOrganizations: [],
      isLoading: true, // Start with loading true until hydration completes
      error: null,
      lastActivity: Date.now(),
      sessionExpiry: 24 * 60 * 60 * 1000, // 24 hours
      deviceId: '',
      loginAttempts: 0,
      lockoutUntil: null,
      rememberMe: false,
      twoFactorRequired: false,

      // Actions
      login: (user, session, rememberMe = false) =>
        set((state) => {
          state.user = user;
          state.session = session;
          state.isAuthenticated = true;
          state.rememberMe = rememberMe;
          state.lastActivity = Date.now();
          state.loginAttempts = 0;
          state.lockoutUntil = null;
          state.twoFactorRequired = false;
          state.error = null;

          // Generate device ID if not exists
          if (!state.deviceId) {
            state.deviceId = get().generateDeviceId();
          }
        }),

      logout: (reason = 'manual') =>
        set((state) => {
          // Logout initiated
          state.user = null;
          state.session = null;
          state.isAuthenticated = false;
          state.twoFactorRequired = false;
          state.error = null;

          // Keep device ID and remember me preference
          // Clear login attempts only for manual logout
          if (reason === 'manual') {
            state.loginAttempts = 0;
            state.lockoutUntil = null;
          }

          // Logout completed
        }),

      refreshSession: (newSession) =>
        set((state) => {
          state.session = newSession;
          state.lastActivity = Date.now();
        }),

      updateUser: (updates) =>
        set((state) => {
          if (state.user) {
            state.user = { ...state.user, ...updates };
          }
        }),

      // Session management
      updateActivity: () =>
        set((state) => {
          state.lastActivity = Date.now();
        }),

      checkSessionExpiry: () => {
        const { session, lastActivity, sessionExpiry, rememberMe } = get();

        if (!session) return false;

        const now = Date.now();
        const tokenExpired = session.expiresAt < now;
        const activityExpired =
          !rememberMe && now - lastActivity > sessionExpiry;

        if (tokenExpired || activityExpired) {
          get().logout(tokenExpired ? 'expired' : 'security');
          return false;
        }

        return true;
      },

      extendSession: () =>
        set((state) => {
          if (state.session && state.rememberMe) {
            // Extend session by updating activity
            state.lastActivity = Date.now();
          }
        }),

      // Security
      recordLoginAttempt: () =>
        set((state) => {
          state.loginAttempts += 1;

          // Lock account after 5 failed attempts for 15 minutes
          if (state.loginAttempts >= 5) {
            state.lockoutUntil = Date.now() + 15 * 60 * 1000;
          }
        }),

      clearLoginAttempts: () =>
        set((state) => {
          state.loginAttempts = 0;
          state.lockoutUntil = null;
        }),

      isLocked: () => {
        const { lockoutUntil } = get();
        return lockoutUntil !== null && Date.now() < lockoutUntil;
      },

      // Loading and error states
      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      // Two-factor authentication
      setTwoFactorRequired: (required) =>
        set((state) => {
          state.twoFactorRequired = required;
        }),

      completeTwoFactor: (user, session) =>
        set((state) => {
          state.user = user;
          state.session = session;
          state.isAuthenticated = true;
          state.twoFactorRequired = false;
          state.lastActivity = Date.now();
        }),

      // Device management
      generateDeviceId: () => {
        const deviceId =
          'device_' +
          Date.now().toString(36) +
          Math.random().toString(36).substr(2);
        set((state) => {
          state.deviceId = deviceId;
        });
        return deviceId;
      },

      // Utility
      getTokens: () => {
        const { session } = get();
        if (!session) return null;

        return {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        };
      },

      isTokenExpired: () => {
        const { session } = get();
        return !session || session.expiresAt < Date.now();
      },

      // Organization management
      setCurrentOrganization: (organization) =>
        set((state) => {
          state.currentOrganization = organization;
        }),

      setAvailableOrganizations: (organizations) =>
        set((state) => {
          state.availableOrganizations = organizations;
        }),
    })),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => createEncryptedStorage()),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        deviceId: state.deviceId,
        rememberMe: state.rememberMe,
        // Don't persist sensitive security data
      }),
      // Handle rehydration from storage
      onRehydrateStorage: () => (state) => {
        // Auth store rehydrating
        
        // Set loading to false after rehydration
        if (state) {
          state.isLoading = false;
        }
        
        // Don't clear session on rehydration - let middleware handle auth checks
        // The remember me preference should only affect initial login persistence
        // not whether we maintain the session after page refresh
        
        // Always check session expiry on rehydration
        if (state?.session) {
          const isValid = state.checkSessionExpiry();
          // Session validity checked
        }
        
        // Auth store rehydration complete
      },
    }
  )
);
