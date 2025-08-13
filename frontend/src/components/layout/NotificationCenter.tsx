'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

interface ToastProps {
  notification: AppNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, [setTimeout, const, entrance, clearTimeout, 10]);

  useEffect(() => {
    // Auto-dismiss after 5 seconds for non-error notifications
    if (notification.type !== 'error') {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.type]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-start space-x-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out',
        getBackgroundColor(),
        isVisible && !isExiting
          ? 'transform translate-x-0 opacity-100'
          : 'transform translate-x-full opacity-0',
        'max-w-sm w-full'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {notification.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {notification.message}
        </p>
        {notification.actionUrl && notification.actionLabel && (
          <a
            href={notification.actionUrl}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
          >
            {notification.actionLabel}
          </a>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-md hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </button>
    </div>
  );
};

export const NotificationCenter: React.FC = () => {
  const { notifications, deleteNotification } = useNotificationStore();
  const [visibleToasts, setVisibleToasts] = useState<AppNotification[]>([]);

  // Show recent unread notifications as toasts
  useEffect(() => {
    const recentNotifications = notifications
      .filter((n) => !n.isRead)
      .slice(0, 3) // Limit to 3 visible toasts
      .reverse(); // Show newest at top

    setVisibleToasts(recentNotifications);
  }, [notifications]);

  const handleCloseToast = (notificationId: string) => {
    setVisibleToasts((prev) => prev.filter((n) => n.id !== notificationId));
    // Optionally mark as read instead of deleting
    // markAsRead(notificationId);
  };

  return (
    <div className="fixed top-4 right-4 z-40 space-y-2 pointer-events-none">
      {visibleToasts.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast
            notification={notification}
            onClose={() => handleCloseToast(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for showing programmatic notifications
export const useToast = () => {
  const { addNotification } = useNotificationStore();

  const showToast = (
    type: AppNotification['type'],
    title: string,
    message: string,
    options?: {
      actionUrl?: string;
      actionLabel?: string;
      userId?: string;
    }
  ) => {
    addNotification({
      type,
      title,
      message,
      isRead: false,
      userId: options?.userId || 'system',
      actionUrl: options?.actionUrl,
      actionLabel: options?.actionLabel,
    });
  };

  return {
    success: (title: string, message: string, options?: any) =>
      showToast('success', title, message, options),
    error: (title: string, message: string, options?: any) =>
      showToast('error', title, message, options),
    warning: (title: string, message: string, options?: any) =>
      showToast('warning', title, message, options),
    info: (title: string, message: string, options?: any) =>
      showToast('info', title, message, options),
  };
};
