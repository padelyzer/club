'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { useUIStore } from '@/store/ui';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Palette,
  Globe,
  Clock,
  Calendar,
  DollarSign,
  MapPin,
  Layout,
  RefreshCw,
  Minimize2,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { AppPreferences } from '@/types/profile';

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { setTheme, setLanguage } = useUIStore();
  const { preferences, loadingStates, errors, updateAppPreferences } =
    useProfileStore();

  if (!preferences) {
    return <LoadingState message={t('profile.loading')} />;
  }

  const updatePreference = async (key: keyof AppPreferences, value: any) => {
    try {
      await updateAppPreferences({ [key]: value });

      // Update UI store for immediate effect
      if (key === 'theme') setTheme(value);
      if (key === 'language') setLanguage(value);
    } catch (error) {
          }
  };

  const themeOptions = [
    {
      value: 'light',
      label: t('profile.appearance.themeOptions.light'),
      icon: Sun,
    },
    {
      value: 'dark',
      label: t('profile.appearance.themeOptions.dark'),
      icon: Moon,
    },
    {
      value: 'system',
      label: t('profile.appearance.themeOptions.system'),
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.appearance.theme')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose your preferred color scheme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = preferences.theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => updatePreference('theme', option.value)}
                disabled={loadingStates.preferences}
                className={`
                  p-4 border-2 rounded-lg transition-all duration-200 flex flex-col items-center space-y-2
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${loadingStates.preferences ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon
                  className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                />
                <span
                  className={`font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Language & Localization */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Globe className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Language & Localization
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Customize language and regional settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="language">{t('profile.appearance.language')}</Label>
            <select
              id="language"
              value={preferences.language || ''}
              onChange={(e) => updatePreference('language', e.target.value)}
              disabled={loadingStates.preferences}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">
                {t('profile.appearance.languageOptions.en')}
              </option>
              <option value="es">
                {t('profile.appearance.languageOptions.es')}
              </option>
              <option value="fr">
                {t('profile.appearance.languageOptions.fr')}
              </option>
              <option value="pt">
                {t('profile.appearance.languageOptions.pt')}
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('profile.appearance.timezone')}</Label>
            <select
              id="timezone"
              value={preferences.timezone || ''}
              onChange={(e) => updatePreference('timezone', e.target.value)}
              disabled={loadingStates.preferences}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Madrid">Madrid (CET)</option>
              <option value="America/Argentina/Buenos_Aires">
                Buenos Aires (ART)
              </option>
              <option value="America/Sao_Paulo">São Paulo (BRT)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">
              {t('profile.appearance.dateFormat')}
            </Label>
            <select
              id="dateFormat"
              value={preferences.dateFormat || ''}
              onChange={(e) => updatePreference('dateFormat', e.target.value)}
              disabled={loadingStates.preferences}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeFormat">
              {t('profile.appearance.timeFormat')}
            </Label>
            <select
              id="timeFormat"
              value={preferences.timeFormat || ''}
              onChange={(e) => updatePreference('timeFormat', e.target.value)}
              disabled={loadingStates.preferences}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="12h">
                {t('profile.appearance.timeFormatOptions.12h')}
              </option>
              <option value="24h">
                {t('profile.appearance.timeFormatOptions.24h')}
              </option>
            </select>
          </div>
        </div>
      </Card>

      {/* Display & Layout */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Layout className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Display & Layout
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Customize how content is displayed
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="defaultView">
                {t('profile.appearance.defaultView')}
              </Label>
              <select
                id="defaultView"
                value={preferences.defaultView || ''}
                onChange={(e) =>
                  updatePreference('defaultView', e.target.value)
                }
                disabled={loadingStates.preferences}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="list">
                  {t('profile.appearance.defaultViewOptions.list')}
                </option>
                <option value="grid">
                  {t('profile.appearance.defaultViewOptions.grid')}
                </option>
                <option value="calendar">
                  {t('profile.appearance.defaultViewOptions.calendar')}
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                {t('profile.appearance.currency')}
              </Label>
              <select
                id="currency"
                value={preferences.currency || ''}
                onChange={(e) => updatePreference('currency', e.target.value)}
                disabled={loadingStates.preferences}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="ARS">Argentine Peso (ARS)</option>
                <option value="BRL">Brazilian Real (BRL)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Minimize2 className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {t('profile.appearance.compactMode')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use more compact layout to fit more content
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.compactMode}
                  onChange={(e) =>
                    updatePreference('compactMode', e.target.checked)
                  }
                  disabled={loadingStates.preferences}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {t('profile.appearance.showTutorials')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Show helpful tutorials and tips
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.showTutorials}
                  onChange={(e) =>
                    updatePreference('showTutorials', e.target.checked)
                  }
                  disabled={loadingStates.preferences}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {t('profile.appearance.autoRefresh')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically refresh data in the background
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.autoRefresh}
                  onChange={(e) =>
                    updatePreference('autoRefresh', e.target.checked)
                  }
                  disabled={loadingStates.preferences}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {preferences.autoRefresh && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="refreshInterval">
                  {t('profile.appearance.refreshInterval')}
                </Label>
                <select
                  id="refreshInterval"
                  value={preferences.refreshInterval || ''}
                  onChange={(e) =>
                    updatePreference(
                      'refreshInterval',
                      parseInt(e.target.value)
                    )
                  }
                  disabled={loadingStates.preferences}
                  className="w-48 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15 || ''}>15 seconds</option>
                  <option value={30 || ''}>30 seconds</option>
                  <option value={60 || ''}>1 minute</option>
                  <option value={300 || ''}>5 minutes</option>
                  <option value={600 || ''}>10 minutes</option>
                </select>
              </div>
            )}
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
