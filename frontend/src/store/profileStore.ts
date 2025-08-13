import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  UserProfile,
  NotificationPreferences,
  AppPreferences,
  PrivacySettings,
  SecuritySettings,
  UserSession,
  DataExportStatus,
  ProfileSuggestion,
  ProfileAnalytics,
  ProfileState,
  PasswordChangeRequest,
  EmailChangeRequest,
  ProfileUpdateRequest,
  TwoFactorVerification,
  DataExportRequest,
  AccountDeletionRequest,
  TrustedDevice,
} from '@/types/profile';
import { ProfileService } from '@/lib/api/services/profile.service';

interface ProfileActions {
  // Profile management
  loadProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateRequest) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;

  // Email management
  requestEmailChange: (data: EmailChangeRequest) => Promise<void>;
  confirmEmailChange: (token: string, code: string) => Promise<void>;

  // Password management
  changePassword: (data: PasswordChangeRequest) => Promise<void>;

  // Preferences management
  updateNotificationPreferences: (
    preferences: Partial<NotificationPreferences>
  ) => Promise<void>;
  updateAppPreferences: (preferences: Partial<AppPreferences>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateSecuritySettings: (
    settings: Partial<SecuritySettings>
  ) => Promise<void>;

  // Two-factor authentication
  setupTwoFactor: () => Promise<{ secret: string; qrCode: string }>;
  enableTwoFactor: (verification: TwoFactorVerification) => Promise<void>;
  disableTwoFactor: (verification: TwoFactorVerification) => Promise<void>;
  regenerateBackupCodes: () => Promise<string[]>;

  // Session management
  loadActiveSessions: () => Promise<void>;
  terminateSession: (sessionId: string) => Promise<void>;
  terminateAllSessions: () => Promise<void>;
  trustDevice: (deviceId: string, trust: boolean) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;

  // Data export
  requestDataExport: (request: DataExportRequest) => Promise<void>;
  loadDataExports: () => Promise<void>;
  downloadDataExport: (exportId: string) => Promise<void>;
  deleteDataExport: (exportId: string) => Promise<void>;

  // Account deletion
  requestAccountDeletion: (request: AccountDeletionRequest) => Promise<void>;
  cancelAccountDeletion: () => Promise<void>;
  confirmAccountDeletion: (password: string) => Promise<void>;

  // Suggestions and analytics
  loadSuggestions: () => Promise<void>;
  markSuggestionCompleted: (suggestionId: string) => Promise<void>;
  loadAnalytics: () => Promise<void>;

  // UI state management
  setActiveTab: (tab: string) => void;
  setEditMode: (editing: boolean) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;

  // Loading and error states
  setLoading: (
    section: keyof ProfileState['loadingStates'],
    loading: boolean
  ) => void;
  setError: (
    section: keyof ProfileState['errors'],
    error: string | null
  ) => void;
  clearError: (section: keyof ProfileState['errors']) => void;
  clearAllErrors: () => void;

  // Reset and cleanup
  reset: () => void;
}

interface ProfileStore extends ProfileState, ProfileActions {}

// Default values
const defaultNotificationPreferences: NotificationPreferences = {
  email: {
    reservations: true,
    tournaments: true,
    matches: true,
    promotions: false,
    systemUpdates: true,
    newsletters: false,
  },
  push: {
    reservations: true,
    tournaments: true,
    matches: true,
    promotions: false,
    systemUpdates: true,
    reminders: true,
  },
  sms: {
    reservations: false,
    emergencyOnly: true,
    reminders: false,
  },
  inApp: {
    realTimeUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
  },
};

const defaultAppPreferences: AppPreferences = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  currency: 'USD',
  distanceUnit: 'km',
  defaultView: 'list',
  autoRefresh: true,
  refreshInterval: 30,
  compactMode: false,
  showTutorials: true,
};

const defaultPrivacySettings: PrivacySettings = {
  profileVisibility: 'public',
  showOnlineStatus: true,
  allowFriendRequests: true,
  showPlayingHistory: true,
  shareStatistics: true,
  allowDataCollection: true,
  allowAnalytics: true,
  allowMarketing: false,
  dataRetentionPeriod: 24,
};

const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  backupCodes: [],
  trustedDevices: [],
  loginAlerts: true,
  sessionTimeout: 60,
  requirePasswordForSensitiveActions: true,
  allowRememberDevice: true,
  securityQuestions: [],
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      profile: null,
      notifications: defaultNotificationPreferences,
      preferences: defaultAppPreferences,
      privacy: defaultPrivacySettings,
      security: defaultSecuritySettings,
      activeSessions: [],
      dataExports: [],
      suggestions: [],
      analytics: null,
      activeTab: 'profile',
      editMode: false,
      hasUnsavedChanges: false,
      isLoading: false,
      error: null,
      loadingStates: {
        profile: false,
        preferences: false,
        security: false,
        sessions: false,
        dataExport: false,
      },
      errors: {
        profile: null,
        preferences: null,
        security: null,
        sessions: null,
        dataExport: null,
      },

      // Profile management
      loadProfile: async () => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          const response = await ProfileService.getProfile();

          set((state) => {
            state.profile = response.profile;
            state.notifications = response.notifications;
            state.preferences = response.preferences;
            state.privacy = response.privacy;
            state.security = response.security as SecuritySettings;
            state.suggestions = response.suggestions;
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to load profile';
          get().setError('profile', message);
          if (process.env.NODE_ENV === 'development') {
                      }
        } finally {
          get().setLoading('profile', false);
        }
      },

      updateProfile: async (data: ProfileUpdateRequest) => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          const updatedProfile = await ProfileService.updateProfile(data);

          set((state) => {
            state.profile = updatedProfile;
            state.hasUnsavedChanges = false;
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to update profile';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      uploadAvatar: async (file: File) => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          const response = await ProfileService.uploadAvatar(file);

          set((state) => {
            if (state.profile) {
              state.profile.avatar = response.avatar;
            }
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to upload avatar';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      deleteAvatar: async () => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          await ProfileService.deleteAvatar();

          set((state) => {
            if (state.profile) {
              state.profile.avatar = undefined;
            }
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to delete avatar';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      // Email management
      requestEmailChange: async (data: EmailChangeRequest) => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          await ProfileService.requestEmailChange(data);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to request email change';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      confirmEmailChange: async (token: string, code: string) => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          await ProfileService.confirmEmailChange(token, code);
          await get().loadProfile(); // Reload profile to get updated email
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to confirm email change';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      // Password management
      changePassword: async (data: PasswordChangeRequest) => {
        get().setLoading('security', true);
        get().clearError('security');

        try {
          await ProfileService.changePassword(data);

          set((state) => {
            if (state.security) {
              state.security.passwordLastChanged = new Date().toISOString();
            }
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to change password';
          get().setError('security', message);
          throw error;
        } finally {
          get().setLoading('security', false);
        }
      },

      // Preferences management
      updateNotificationPreferences: async (
        preferences: Partial<NotificationPreferences>
      ) => {
        get().setLoading('preferences', true);
        get().clearError('preferences');

        try {
          const updated =
            await ProfileService.updateNotificationPreferences(preferences);

          set((state) => {
            state.notifications = updated;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to update notification preferences';
          get().setError('preferences', message);
          throw error;
        } finally {
          get().setLoading('preferences', false);
        }
      },

      updateAppPreferences: async (preferences: Partial<AppPreferences>) => {
        get().setLoading('preferences', true);
        get().clearError('preferences');

        try {
          const updated =
            await ProfileService.updateAppPreferences(preferences);

          set((state) => {
            state.preferences = updated;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to update app preferences';
          get().setError('preferences', message);
          throw error;
        } finally {
          get().setLoading('preferences', false);
        }
      },

      updatePrivacySettings: async (settings: Partial<PrivacySettings>) => {
        get().setLoading('preferences', true);
        get().clearError('preferences');

        try {
          const updated = await ProfileService.updatePrivacySettings(settings);

          set((state) => {
            state.privacy = updated;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to update privacy settings';
          get().setError('preferences', message);
          throw error;
        } finally {
          get().setLoading('preferences', false);
        }
      },

      updateSecuritySettings: async (settings: Partial<SecuritySettings>) => {
        get().setLoading('security', true);
        get().clearError('security');

        try {
          const updated = await ProfileService.updateSecuritySettings(settings);

          set((state) => {
            state.security = {
              ...state.security,
              ...updated,
            } as SecuritySettings;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to update security settings';
          get().setError('security', message);
          throw error;
        } finally {
          get().setLoading('security', false);
        }
      },

      // Two-factor authentication
      setupTwoFactor: async () => {
        get().setLoading('security', true);
        get().clearError('security');

        try {
          const setup = await ProfileService.setupTwoFactor();
          return { secret: setup.secret, qrCode: setup.qrCode };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to setup two-factor authentication';
          get().setError('security', message);
          throw error;
        } finally {
          get().setLoading('security', false);
        }
      },

      enableTwoFactor: async (verification: TwoFactorVerification) => {
        get().setLoading('security', true);
        get().clearError('security');

        try {
          const result = await ProfileService.enableTwoFactor(verification);

          set((state) => {
            state.security.twoFactorEnabled = result.enabled;
            state.security.backupCodes = result.backupCodes;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to enable two-factor authentication';
          get().setError('security', message);
          throw error;
        } finally {
          get().setLoading('security', false);
        }
      },

      disableTwoFactor: async (verification: TwoFactorVerification) => {
        get().setLoading('security', true);
        get().clearError('security');

        try {
          await ProfileService.disableTwoFactor(verification);

          set((state) => {
            state.security.twoFactorEnabled = false;
            state.security.backupCodes = [];
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to disable two-factor authentication';
          get().setError('security', message);
          throw error;
        } finally {
          get().setLoading('security', false);
        }
      },

      regenerateBackupCodes: async () => {
        get().setLoading('security', true);
        get().clearError('security');

        try {
          const result = await ProfileService.regenerateBackupCodes();

          set((state) => {
            state.security.backupCodes = result.backupCodes;
          });

          return result.backupCodes;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to regenerate backup codes';
          get().setError('security', message);
          throw error;
        } finally {
          get().setLoading('security', false);
        }
      },

      // Session management
      loadActiveSessions: async () => {
        get().setLoading('sessions', true);
        get().clearError('sessions');

        try {
          const response = await ProfileService.getActiveSessions();

          set((state) => {
            state.activeSessions = response.sessions;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to load active sessions';
          get().setError('sessions', message);
        } finally {
          get().setLoading('sessions', false);
        }
      },

      terminateSession: async (sessionId: string) => {
        get().setLoading('sessions', true);
        get().clearError('sessions');

        try {
          await ProfileService.terminateSession(sessionId);

          set((state) => {
            state.activeSessions = state.activeSessions.filter(
              (session) => session.id !== sessionId
            );
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to terminate session';
          get().setError('sessions', message);
          throw error;
        } finally {
          get().setLoading('sessions', false);
        }
      },

      terminateAllSessions: async () => {
        get().setLoading('sessions', true);
        get().clearError('sessions');

        try {
          await ProfileService.terminateAllSessions();

          set((state) => {
            state.activeSessions = state.activeSessions.filter(
              (session) => session.isCurrentSession
            );
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to terminate all sessions';
          get().setError('sessions', message);
          throw error;
        } finally {
          get().setLoading('sessions', false);
        }
      },

      trustDevice: async (deviceId: string, trust: boolean) => {
        try {
          const updatedDevice = await ProfileService.trustDevice(
            deviceId,
            trust
          );

          set((state) => {
            const deviceIndex = state.security.trustedDevices.findIndex(
              (device) => device.id === deviceId
            );
            if (deviceIndex !== -1) {
              state.security.trustedDevices[deviceIndex] = updatedDevice;
            }
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to update device trust';
          get().setError('security', message);
          throw error;
        }
      },

      removeDevice: async (deviceId: string) => {
        try {
          await ProfileService.removeDevice(deviceId);

          set((state) => {
            state.security.trustedDevices =
              state.security.trustedDevices.filter(
                (device) => device.id !== deviceId
              );
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to remove device';
          get().setError('security', message);
          throw error;
        }
      },

      // Data export
      requestDataExport: async (request: DataExportRequest) => {
        get().setLoading('dataExport', true);
        get().clearError('dataExport');

        try {
          const exportStatus = await ProfileService.requestDataExport(request);

          set((state) => {
            state.dataExports.unshift(exportStatus);
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to request data export';
          get().setError('dataExport', message);
          throw error;
        } finally {
          get().setLoading('dataExport', false);
        }
      },

      loadDataExports: async () => {
        get().setLoading('dataExport', true);
        get().clearError('dataExport');

        try {
          const exports = await ProfileService.getDataExports();

          set((state) => {
            state.dataExports = exports;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to load data exports';
          get().setError('dataExport', message);
        } finally {
          get().setLoading('dataExport', false);
        }
      },

      downloadDataExport: async (exportId: string) => {
        try {
          const blob = await ProfileService.downloadDataExport(exportId);

          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `padelyzer-data-export-${exportId}.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to download data export';
          get().setError('dataExport', message);
          throw error;
        }
      },

      deleteDataExport: async (exportId: string) => {
        try {
          await ProfileService.deleteDataExport(exportId);

          set((state) => {
            state.dataExports = state.dataExports.filter(
              (exp) => exp.id !== exportId
            );
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to delete data export';
          get().setError('dataExport', message);
          throw error;
        }
      },

      // Account deletion
      requestAccountDeletion: async (request: AccountDeletionRequest) => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          await ProfileService.requestAccountDeletion(request);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to request account deletion';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      cancelAccountDeletion: async () => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          await ProfileService.cancelAccountDeletion();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to cancel account deletion';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      confirmAccountDeletion: async (password: string) => {
        get().setLoading('profile', true);
        get().clearError('profile');

        try {
          await ProfileService.confirmAccountDeletion(password);
          // Account will be deleted, this should trigger logout
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to confirm account deletion';
          get().setError('profile', message);
          throw error;
        } finally {
          get().setLoading('profile', false);
        }
      },

      // Suggestions and analytics
      loadSuggestions: async () => {
        try {
          const suggestions = await ProfileService.getProfileSuggestions();

          set((state) => {
            state.suggestions = suggestions;
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      markSuggestionCompleted: async (suggestionId: string) => {
        try {
          await ProfileService.markSuggestionCompleted(suggestionId);

          set((state) => {
            const suggestion = state.suggestions.find(
              (s) => s.id === suggestionId
            );
            if (suggestion) {
              suggestion.completed = true;
            }
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      loadAnalytics: async () => {
        try {
          const analytics = await ProfileService.getProfileAnalytics();

          set((state) => {
            state.analytics = analytics;
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      // UI state management
      setActiveTab: (tab: string) =>
        set((state) => {
          state.activeTab = tab;
        }),

      setEditMode: (editing: boolean) =>
        set((state) => {
          state.editMode = editing;
        }),

      setUnsavedChanges: (hasChanges: boolean) =>
        set((state) => {
          state.hasUnsavedChanges = hasChanges;
        }),

      // Loading and error states
      setLoading: (section, loading) =>
        set((state) => {
          state.loadingStates[section] = loading;
          state.isLoading = Object.values(state.loadingStates).some(Boolean);
        }),

      setError: (section, error) =>
        set((state) => {
          state.errors[section] = error;
          state.error = error;
        }),

      clearError: (section) =>
        set((state) => {
          state.errors[section] = null;

          // Update main error if this was the only error
          const hasOtherErrors = Object.values(state.errors).some(
            (err) => err !== null
          );
          if (!hasOtherErrors) {
            state.error = null;
          }
        }),

      clearAllErrors: () =>
        set((state) => {
          state.errors = {
            profile: null,
            preferences: null,
            security: null,
            sessions: null,
            dataExport: null,
          };
          state.error = null;
        }),

      // Reset and cleanup
      reset: () =>
        set((state) => {
          state.profile = null;
          state.notifications = defaultNotificationPreferences;
          state.preferences = defaultAppPreferences;
          state.privacy = defaultPrivacySettings;
          state.security = defaultSecuritySettings;
          state.activeSessions = [];
          state.dataExports = [];
          state.suggestions = [];
          state.analytics = null;
          state.activeTab = 'profile';
          state.editMode = false;
          state.hasUnsavedChanges = false;
          state.isLoading = false;
          state.error = null;
          state.loadingStates = {
            profile: false,
            preferences: false,
            security: false,
            sessions: false,
            dataExport: false,
          };
          state.errors = {
            profile: null,
            preferences: null,
            security: null,
            sessions: null,
            dataExport: null,
          };
        }),
    })),
    {
      name: 'profile-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        privacy: state.privacy,
        // Don't persist sensitive data like security settings or sessions
      }),
    }
  )
);
