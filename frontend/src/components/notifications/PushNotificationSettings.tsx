'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Smartphone,
  Mail,
  Volume2,
  VolumeX,
  Vibrate,
  Moon,
  Sun,
  Settings,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import {
  PWANotificationSettings,
  NotificationCategorySettings,
} from '@/types/notifications';
import { cn } from '@/lib/utils';

interface PushNotificationSettingsProps {
  onClose?: () => void;
}

export const PushNotificationSettings: React.FC<
  PushNotificationSettingsProps
> = ({ onClose }) => {
  const {
    permissionStatus,
    pwaSettings,
    serviceState,
    subscribeToPush,
    unsubscribeFromPush,
    updatePWASettings,
    requestPermission,
    isLoading,
  } = useNotificationStore();

  const [localSettings, setLocalSettings] =
    useState<PWANotificationSettings>(pwaSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(pwaSettings);
  }, [pwaSettings]);

  useEffect(() => {
    const hasLocalChanges =
      JSON.stringify(localSettings) !== JSON.stringify(pwaSettings);
    setHasChanges(hasLocalChanges);
  }, [localSettings, pwaSettings]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updatePWASettings(localSettings);
      setHasChanges(false);
    } catch (error) {
          } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePushNotifications = async () => {
    if (localSettings.pushNotificationsEnabled) {
      // Disable push notifications
      await unsubscribeFromPush();
      updateLocalSettings({ pushNotificationsEnabled: false });
    } else {
      // Enable push notifications
      if (permissionStatus !== 'granted') {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }

      const success = await subscribeToPush();
      if (success) {
        updateLocalSettings({ pushNotificationsEnabled: true });
      }
    }
  };

  const updateLocalSettings = (updates: Partial<PWANotificationSettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateCategorySettings = (
    category: keyof PWANotificationSettings['categories'],
    updates: Partial<NotificationCategorySettings>
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          ...updates,
        },
      },
    }));
  };

  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: <Check className="h-4 w-4" />,
          text: 'Notifications enabled',
          color: 'text-green-600 dark:text-green-400',
        };
      case 'denied':
        return {
          icon: <BellOff className="h-4 w-4" />,
          text: 'Notifications blocked',
          color: 'text-red-600 dark:text-red-400',
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Permission not requested',
          color: 'text-amber-600 dark:text-amber-400',
        };
    }
  };

  const permissionInfo = getPermissionStatusInfo();
  const canConfigurePush = permissionStatus === 'granted';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Notification Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customize your notification preferences
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Permission Status */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={permissionInfo.color}>{permissionInfo.icon}</div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Browser Permission Status
              </p>
              <p className={cn('text-sm', permissionInfo.color)}>
                {permissionInfo.text}
              </p>
            </div>
          </div>
          {permissionStatus !== 'granted' && (
            <button
              onClick={requestPermission}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Main Settings */}
      <div className="space-y-6">
        {/* Global Toggles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Notification Types
          </h3>

          <div className="space-y-3">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Push Notifications
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive notifications even when the app is closed
                  </p>
                </div>
              </div>
              <button
                onClick={handleTogglePushNotifications}
                disabled={!canConfigurePush || isLoading}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  localSettings.pushNotificationsEnabled && canConfigurePush
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    localSettings.pushNotificationsEnabled && canConfigurePush
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    In-App Notifications
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Show notifications while using the app
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  updateLocalSettings({
                    inAppNotificationsEnabled:
                      !localSettings.inAppNotificationsEnabled,
                  })
                }
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  localSettings.inAppNotificationsEnabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    localSettings.inAppNotificationsEnabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Email Notifications
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive important updates via email
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  updateLocalSettings({
                    emailNotificationsEnabled:
                      !localSettings.emailNotificationsEnabled,
                  })
                }
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  localSettings.emailNotificationsEnabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    localSettings.emailNotificationsEnabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Category Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Notification Categories
          </h3>

          <div className="space-y-3">
            {Object.entries(localSettings.categories).map(
              ([categoryKey, categorySettings]) => {
                const category =
                  categoryKey as keyof PWANotificationSettings['categories'];
                const categoryNames = {
                  reservations: 'Court Reservations',
                  tournaments: 'Tournaments',
                  classes: 'Classes',
                  payments: 'Payments',
                  promotions: 'Promotions',
                  system: 'System Updates',
                };

                return (
                  <div
                    key={category}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {categoryNames[category]}
                      </h4>
                      <button
                        onClick={() =>
                          updateCategorySettings(category, {
                            enabled: !categorySettings.enabled,
                          })
                        }
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          categorySettings.enabled
                            ? 'bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                            categorySettings.enabled
                              ? 'translate-x-5'
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {categorySettings.enabled && (
                      <div className="space-y-3">
                        {/* Push Enabled */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Push notifications
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              updateCategorySettings(category, {
                                pushEnabled: !categorySettings.pushEnabled,
                              })
                            }
                            disabled={!canConfigurePush}
                            className={cn(
                              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                              categorySettings.pushEnabled && canConfigurePush
                                ? 'bg-blue-600'
                                : 'bg-gray-300 dark:bg-gray-600',
                              'disabled:opacity-50'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-2 w-2 transform rounded-full bg-white transition-transform',
                                categorySettings.pushEnabled && canConfigurePush
                                  ? 'translate-x-4'
                                  : 'translate-x-1'
                              )}
                            />
                          </button>
                        </div>

                        {/* Sound Enabled */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {categorySettings.soundEnabled ? (
                              <Volume2 className="h-4 w-4 text-gray-500" />
                            ) : (
                              <VolumeX className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Sound
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              updateCategorySettings(category, {
                                soundEnabled: !categorySettings.soundEnabled,
                              })
                            }
                            className={cn(
                              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                              categorySettings.soundEnabled
                                ? 'bg-blue-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-2 w-2 transform rounded-full bg-white transition-transform',
                                categorySettings.soundEnabled
                                  ? 'translate-x-4'
                                  : 'translate-x-1'
                              )}
                            />
                          </button>
                        </div>

                        {/* Vibration */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Vibrate className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Vibration
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              updateCategorySettings(category, {
                                vibrationEnabled:
                                  !categorySettings.vibrationEnabled,
                              })
                            }
                            className={cn(
                              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                              categorySettings.vibrationEnabled
                                ? 'bg-blue-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-2 w-2 transform rounded-full bg-white transition-transform',
                                categorySettings.vibrationEnabled
                                  ? 'translate-x-4'
                                  : 'translate-x-1'
                              )}
                            />
                          </button>
                        </div>

                        {/* Quiet Hours */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Moon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Quiet hours
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              updateCategorySettings(category, {
                                quietHours: {
                                  ...categorySettings.quietHours,
                                  enabled: !categorySettings.quietHours.enabled,
                                },
                              })
                            }
                            className={cn(
                              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                              categorySettings.quietHours.enabled
                                ? 'bg-blue-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-2 w-2 transform rounded-full bg-white transition-transform',
                                categorySettings.quietHours.enabled
                                  ? 'translate-x-4'
                                  : 'translate-x-1'
                              )}
                            />
                          </button>
                        </div>

                        {/* Quiet Hours Time Range */}
                        {categorySettings.quietHours.enabled && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              From
                            </span>
                            <input
                              type="time"
                              value={categorySettings.quietHours.start || ''}
                              onChange={(e) =>
                                updateCategorySettings(category, {
                                  quietHours: {
                                    ...categorySettings.quietHours,
                                    start: e.target.value,
                                  },
                                })
                              }
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <span className="text-gray-600 dark:text-gray-400">
                              to
                            </span>
                            <input
                              type="time"
                              value={categorySettings.quietHours.end || ''}
                              onChange={(e) =>
                                updateCategorySettings(category, {
                                  quietHours: {
                                    ...categorySettings.quietHours,
                                    end: e.target.value,
                                  },
                                })
                              }
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setLocalSettings(pwaSettings)}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={cn(
              'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'text-white font-medium py-2 px-6 rounded-lg transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PushNotificationSettings;
