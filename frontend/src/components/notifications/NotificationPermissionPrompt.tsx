'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, X, Smartphone, AlertCircle, Calendar, Trophy, CreditCard, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/store/notifications';
import { cn } from '@/lib/utils';

interface NotificationPermissionPromptProps {
  onClose?: () => void;
  compact?: boolean;
  showBenefits?: boolean;
}

export const NotificationPermissionPrompt: React.FC<
  NotificationPermissionPromptProps
> = ({ onClose, compact = false, showBenefits = true }) => {
  const {
    permissionStatus,
    requestPermission,
    initializePWA,
    subscribeToPush,
    pwaSettings,
    isLoading,
  } = useNotificationStore();

  const [isRequesting, setIsRequesting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initialize PWA when component mounts
    initializePWA();
  }, [initializePWA]);

  const handleEnableNotifications = async () => {
    try {
      setIsRequesting(true);

      // Request permission
      const permission = await requestPermission();

      if (permission === 'granted') {
        // Subscribe to push notifications
        await subscribeToPush();
        onClose?.();
      }
    } catch (error) {
          } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    // Mark permission as requested (dismissed)
    const store = useNotificationStore.getState();
    store.updatePWASettings({
      permissionRequested: true,
    });
    onClose?.();
  };

  // Don't show if permission already granted or permanently denied
  if (permissionStatus === 'granted' || permissionStatus === 'denied') {
    return null;
  }

  // Don't show if user already dismissed recently
  if (pwaSettings.permissionRequested && !showDetails) {
    return null;
  }

  const benefits = [
    {
      icon: <Smartphone className="h-4 w-4" />,
      title: 'Real-time Updates',
      description:
        'Get instant notifications about court reservations and tournament matches',
    },
    {
      icon: <Bell className="h-4 w-4" />,
      title: 'Never Miss Important Events',
      description:
        'Receive alerts for booking confirmations, payment reminders, and schedule changes',
    },
    {
      icon: <Check className="h-4 w-4" />,
      title: 'Quick Actions',
      description: 'Accept or decline invitations directly from notifications',
    },
  ];

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Enable Notifications
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Get real-time updates about your padel activities
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEnableNotifications}
              disabled={isRequesting || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              {isRequesting || isLoading ? 'Enabling...' : 'Enable'}
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
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Enable Notifications
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stay updated with your padel activities
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
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                {benefit.icon}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {benefit.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Browser Support Info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your browser will ask for permission to show notifications. This
              helps us keep you updated even when Padelyzer isn't open.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={handleEnableNotifications}
          disabled={isRequesting || isLoading}
          className={cn(
            'flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
            'text-white font-medium py-2.5 px-4 rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
        >
          {isRequesting || isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Enabling...</span>
            </div>
          ) : (
            'Enable Notifications'
          )}
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          {showDetails ? 'Less Info' : 'More Info'}
        </button>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                What notifications will I receive?
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Court reservation confirmations and reminders</li>
                <li>• Tournament updates and match schedules</li>
                <li>• Payment confirmations and due date reminders</li>
                <li>• Class bookings and schedule changes</li>
                <li>• Important announcements from your club</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Privacy & Control
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                You can customize or disable notifications at any time in your
                settings. We respect your privacy and only send relevant
                updates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionPrompt;
