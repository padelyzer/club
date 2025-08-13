'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Shield,
  Eye,
  Users,
  BarChart,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { PrivacySettings as PrivacySettingsType } from '@/types/profile';

export function PrivacySettings() {
  const { t } = useTranslation();
  const { privacy, loadingStates, errors, updatePrivacySettings } =
    useProfileStore();

  if (!privacy) {
    return <LoadingState message={t('profile.loading')} />;
  }

  const updateSetting = async (key: keyof PrivacySettingsType, value: any) => {
    try {
      await updatePrivacySettings({ [key]: value });
    } catch (error) {
          }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.privacy.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('profile.privacy.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div className="space-y-3">
            <Label>{t('profile.privacy.profileVisibility')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['public', 'friends', 'private'].map((option) => (
                <button
                  key={option}
                  onClick={() => updateSetting('profileVisibility', option)}
                  disabled={loadingStates.preferences}
                  className={`
                    p-3 border-2 rounded-lg transition-all text-left
                    ${
                      privacy.profileVisibility === option
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="font-medium">
                    {t(`profile.privacy.profileVisibilityOptions.${option}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="space-y-4 divide-y divide-gray-200 dark:divide-gray-700">
            {[
              {
                key: 'showOnlineStatus',
                icon: Eye,
                label: t('profile.privacy.showOnlineStatus'),
              },
              {
                key: 'allowFriendRequests',
                icon: Users,
                label: t('profile.privacy.allowFriendRequests'),
              },
              {
                key: 'showPlayingHistory',
                icon: BarChart,
                label: t('profile.privacy.showPlayingHistory'),
              },
              {
                key: 'shareStatistics',
                icon: BarChart,
                label: t('profile.privacy.shareStatistics'),
              },
              {
                key: 'allowDataCollection',
                icon: Database,
                label: t('profile.privacy.allowDataCollection'),
              },
              {
                key: 'allowAnalytics',
                icon: BarChart,
                label: t('profile.privacy.allowAnalytics'),
              },
              {
                key: 'allowMarketing',
                icon: Users,
                label: t('profile.privacy.allowMarketing'),
              },
            ].map(({ key, icon: Icon, label }) => (
              <div key={key} className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {label}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      privacy[key as keyof PrivacySettingsType] as boolean
                    }
                    onChange={(e) =>
                      updateSetting(
                        key as keyof PrivacySettingsType,
                        e.target.checked
                      )
                    }
                    disabled={loadingStates.preferences}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Data Retention */}
          <div className="space-y-2">
            <Label>{t('profile.privacy.dataRetention')}</Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('profile.privacy.dataRetentionDesc')}
            </p>
            <select
              value={privacy.dataRetentionPeriod || ''}
              onChange={(e) =>
                updateSetting('dataRetentionPeriod', parseInt(e.target.value))
              }
              disabled={loadingStates.preferences}
              className="w-full md:w-48 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={6 || ''}>6 months</option>
              <option value={12 || ''}>1 year</option>
              <option value={24 || ''}>2 years</option>
              <option value={60 || ''}>5 years</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading/Error States */}
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
