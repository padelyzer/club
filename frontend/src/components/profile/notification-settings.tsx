'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Monitor,
  Volume2,
  Vibrate,
  AlertTriangle,
} from 'lucide-react';
import { NotificationPreferences } from '@/types/profile';

interface NotificationToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  title,
  description,
  checked,
  onChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
      </label>
    </div>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const {
    notifications,
    loadingStates,
    errors,
    updateNotificationPreferences,
  } = useProfileStore();

  if (!notifications) {
    return <LoadingState message={t('profile.loading')} />;
  }

  const updatePreference = async (
    section: keyof NotificationPreferences,
    key: string,
    value: boolean
  ) => {
    try {
      const updatedPreferences = {
        ...notifications,
        [section]: {
          ...notifications[section],
          [key]: value,
        },
      };
      await updateNotificationPreferences(updatedPreferences);
    } catch (error) {
          }
  };

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.notifications.email')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Receive notifications via email
            </p>
          </div>
        </div>

        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <NotificationToggle
            title={t('profile.notifications.categories.reservations')}
            description={t('profile.notifications.categories.reservationsDesc')}
            checked={notifications.email.reservations}
            onChange={(checked) =>
              updatePreference('email', 'reservations', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.tournaments')}
            description={t('profile.notifications.categories.tournamentsDesc')}
            checked={notifications.email.tournaments}
            onChange={(checked) =>
              updatePreference('email', 'tournaments', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.matches')}
            description={t('profile.notifications.categories.matchesDesc')}
            checked={notifications.email.matches}
            onChange={(checked) =>
              updatePreference('email', 'matches', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.promotions')}
            description={t('profile.notifications.categories.promotionsDesc')}
            checked={notifications.email.promotions}
            onChange={(checked) =>
              updatePreference('email', 'promotions', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.systemUpdates')}
            description={t(
              'profile.notifications.categories.systemUpdatesDesc'
            )}
            checked={notifications.email.systemUpdates}
            onChange={(checked) =>
              updatePreference('email', 'systemUpdates', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.newsletters')}
            description={t('profile.notifications.categories.newslettersDesc')}
            checked={notifications.email.newsletters}
            onChange={(checked) =>
              updatePreference('email', 'newsletters', checked)
            }
            disabled={loadingStates.preferences}
          />
        </div>
      </Card>

      {/* Push Notifications */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Smartphone className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.notifications.push')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Receive push notifications on your device
            </p>
          </div>
        </div>

        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <NotificationToggle
            title={t('profile.notifications.categories.reservations')}
            description={t('profile.notifications.categories.reservationsDesc')}
            checked={notifications.push.reservations}
            onChange={(checked) =>
              updatePreference('push', 'reservations', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.tournaments')}
            description={t('profile.notifications.categories.tournamentsDesc')}
            checked={notifications.push.tournaments}
            onChange={(checked) =>
              updatePreference('push', 'tournaments', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.matches')}
            description={t('profile.notifications.categories.matchesDesc')}
            checked={notifications.push.matches}
            onChange={(checked) => updatePreference('push', 'matches', checked)}
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.reminders')}
            description={t('profile.notifications.categories.remindersDesc')}
            checked={notifications.push.reminders}
            onChange={(checked) =>
              updatePreference('push', 'reminders', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.systemUpdates')}
            description={t(
              'profile.notifications.categories.systemUpdatesDesc'
            )}
            checked={notifications.push.systemUpdates}
            onChange={(checked) =>
              updatePreference('push', 'systemUpdates', checked)
            }
            disabled={loadingStates.preferences}
          />
        </div>
      </Card>

      {/* SMS Notifications */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.notifications.sms')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Receive important notifications via SMS
            </p>
          </div>
        </div>

        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <NotificationToggle
            title={t('profile.notifications.categories.reservations')}
            description={t('profile.notifications.categories.reservationsDesc')}
            checked={notifications.sms.reservations}
            onChange={(checked) =>
              updatePreference('sms', 'reservations', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.emergencyOnly')}
            description={t(
              'profile.notifications.categories.emergencyOnlyDesc'
            )}
            checked={notifications.sms.emergencyOnly}
            onChange={(checked) =>
              updatePreference('sms', 'emergencyOnly', checked)
            }
            disabled={loadingStates.preferences}
          />

          <NotificationToggle
            title={t('profile.notifications.categories.reminders')}
            description={t('profile.notifications.categories.remindersDesc')}
            checked={notifications.sms.reminders}
            onChange={(checked) =>
              updatePreference('sms', 'reminders', checked)
            }
            disabled={loadingStates.preferences}
          />
        </div>
      </Card>

      {/* In-App Notifications */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Monitor className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.notifications.inApp')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Control how notifications appear in the app
            </p>
          </div>
        </div>

        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <NotificationToggle
            title={t('profile.notifications.preferences.realTimeUpdates')}
            description="Receive live updates as they happen"
            checked={notifications.inApp.realTimeUpdates}
            onChange={(checked) =>
              updatePreference('inApp', 'realTimeUpdates', checked)
            }
            disabled={loadingStates.preferences}
          />

          <div className="flex items-center justify-between py-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <span>
                  {t('profile.notifications.preferences.soundEnabled')}
                </span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Play sound for notifications
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.inApp.soundEnabled}
                onChange={(e) =>
                  updatePreference('inApp', 'soundEnabled', e.target.checked)
                }
                disabled={loadingStates.preferences}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                <Vibrate className="w-4 h-4" />
                <span>
                  {t('profile.notifications.preferences.vibrationEnabled')}
                </span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vibrate for notifications on mobile devices
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.inApp.vibrationEnabled}
                onChange={(e) =>
                  updatePreference(
                    'inApp',
                    'vibrationEnabled',
                    e.target.checked
                  )
                }
                disabled={loadingStates.preferences}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loadingStates.preferences && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-700 dark:text-blue-300">
              {t('profile.saving')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {errors.preferences && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.preferences}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
