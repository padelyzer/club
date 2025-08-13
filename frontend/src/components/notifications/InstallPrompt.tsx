'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Check,
  Zap,
  Bell,
  Wifi,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import { cn } from '@/lib/utils';

interface InstallPromptProps {
  onClose?: () => void;
  compact?: boolean;
  showBenefits?: boolean;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onClose,
  compact = false,
  showBenefits = true,
}) => {
  const {
    pwaInstallationState,
    installPWA,
    dismissInstallPrompt,
    checkInstallability,
  } = useNotificationStore();

  const [isInstalling, setIsInstalling] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    // Check device type
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    setDeviceType(isMobile ? 'mobile' : 'desktop');

    // Check installability
    checkInstallability();
  }, [checkInstallability]);

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      const success = await installPWA();

      if (success) {
        onClose?.();
      }
    } catch (error) {
          } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    onClose?.();
  };

  // Don't show if not available or already installed
  if (pwaInstallationState !== 'available') {
    return null;
  }

  const benefits = [
    {
      icon: <Zap className="h-4 w-4" />,
      title: 'Faster Access',
      description:
        'Launch instantly from your home screen without opening a browser',
    },
    {
      icon: <Bell className="h-4 w-4" />,
      title: 'Push Notifications',
      description:
        'Get real-time updates about reservations, tournaments, and matches',
    },
    {
      icon: <Wifi className="h-4 w-4" />,
      title: 'Works Offline',
      description:
        'Access your data and receive notifications even without internet',
    },
  ];

  const installInstructions = {
    mobile: {
      title: 'Install on Mobile',
      steps: [
        'Tap the "Install" button below',
        'Confirm installation in the browser prompt',
        'Find Padelyzer on your home screen',
      ],
    },
    desktop: {
      title: 'Install on Desktop',
      steps: [
        'Click the "Install" button below',
        'Confirm installation in the browser prompt',
        'Access Padelyzer from your desktop or taskbar',
      ],
    },
  };

  const instructions = installInstructions[deviceType];

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Install Padelyzer App
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Get faster access and push notifications
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
            {deviceType === 'mobile' ? (
              <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <Monitor className="h-6 w-6 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Install Padelyzer
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get the full app experience
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Benefits */}
      {showBenefits && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Why install the app?
          </h3>
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="text-green-600 dark:text-green-400 mt-0.5">
                {benefit.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {benefit.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Installation Instructions */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {instructions.title}
        </h3>
        <ol className="space-y-1">
          {instructions.steps.map((step, index) => (
            <li
              key={index}
              className="flex items-start space-x-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            Push Notifications
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
          <Wifi className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
          <p className="text-xs font-medium text-purple-900 dark:text-purple-100">
            Offline Access
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className={cn(
            'flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed',
            'text-white font-medium py-3 px-4 rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          )}
        >
          {isInstalling ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Installing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Install App</span>
            </div>
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Maybe Later
        </button>
      </div>

      {/* App Size Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          App size: ~2MB • Takes up minimal storage space
        </p>
      </div>
    </div>
  );
};

export default InstallPrompt;
