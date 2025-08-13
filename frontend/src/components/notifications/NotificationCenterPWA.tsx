'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Filter,
  Settings,
  Check,
  Trash2,
  Calendar,
  Trophy,
  CreditCard,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import { AppNotification } from '@/types';
import { PWANotification } from '@/types/notifications';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteAllReadNotifications,
} from '@/lib/api/hooks/useNotifications';

interface NotificationCenterPWAProps {
  onClose?: () => void;
  maxHeight?: string;
}

export const NotificationCenterPWA: React.FC<NotificationCenterPWAProps> = ({
  onClose,
  maxHeight = 'max-h-96',
}) => {
  const {
    notifications,
    unreadCount,
    filters,
    setFilters,
    getFilteredNotifications,
    processOfflineQueue,
    isLoading: storeLoading,
  } = useNotificationStore();

  // API hooks
  const { data: notificationsData, isLoading: apiLoading, refetch } = useNotifications({
    unreadOnly: selectedStatus === 'unread',
  });
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteAllReadMutation = useDeleteAllReadNotifications();

  const isLoading = storeLoading || apiLoading;

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'unread' | 'read'
  >('all');

  useEffect(() => {
    // Process any offline notifications when component mounts
    processOfflineQueue();
  }, [processOfflineQueue]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((n) => n.type === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((n) =>
        selectedStatus === 'unread' ? !n.isRead : n.isRead
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, selectedCategory, selectedStatus]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};

    filteredNotifications.forEach((notification) => {
      const date = parseISO(notification.createdAt);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else {
        groupKey = format(date, 'MMMM d, yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  const getNotificationIcon = (type: AppNotification['type']) => {
    const iconClasses = 'h-4 w-4';

    switch (type) {
      case 'success':
        return <CheckCircle className={cn(iconClasses, 'text-green-500')} />;
      case 'error':
        return <AlertCircle className={cn(iconClasses, 'text-red-500')} />;
      case 'warning':
        return <AlertCircle className={cn(iconClasses, 'text-amber-500')} />;
      case 'info':
      default:
        return <Bell className={cn(iconClasses, 'text-blue-500')} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconClasses = 'h-4 w-4';

    switch (category) {
      case 'reservations':
        return <Calendar className={cn(iconClasses, 'text-blue-500')} />;
      case 'tournaments':
        return <Trophy className={cn(iconClasses, 'text-yellow-500')} />;
      case 'payments':
        return <CreditCard className={cn(iconClasses, 'text-green-500')} />;
      case 'classes':
        return <Users className={cn(iconClasses, 'text-purple-500')} />;
      default:
        return <Bell className={cn(iconClasses, 'text-gray-500')} />;
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'reservations', label: 'Reservations' },
    { value: 'tournaments', label: 'Tournaments' },
    { value: 'payments', label: 'Payments' },
    { value: 'classes', label: 'Classes' },
    { value: 'system', label: 'System' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={() => {
              refetch();
              processOfflineQueue();
            }}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            title="Refresh notifications"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Filter notifications"
          >
            <Filter className="h-4 w-4" />
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              title="Mark all as read"
            >
              <Check className="h-4 w-4" />
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className={cn('overflow-y-auto', maxHeight)}>
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="p-8 text-center">
            <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No notifications to show
            </p>
            {selectedCategory !== 'all' || selectedStatus !== 'all' ? (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="text-blue-600 dark:text-blue-400 text-xs mt-2 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(groupedNotifications).map(
              ([dateGroup, groupNotifications]) => (
                <div key={dateGroup}>
                  {/* Date Group Header */}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30">
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {dateGroup}
                    </h4>
                  </div>

                  {/* Notifications in Group */}
                  {groupNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer',
                        !notification.isRead &&
                          'bg-blue-50 dark:bg-blue-900/10 border-l-2 border-blue-500'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p
                                className={cn(
                                  'text-sm font-medium',
                                  notification.isRead
                                    ? 'text-gray-700 dark:text-gray-300'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {notification.title}
                              </p>
                              <p
                                className={cn(
                                  'text-sm mt-1',
                                  notification.isRead
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : 'text-gray-600 dark:text-gray-300'
                                )}
                              >
                                {notification.message}
                              </p>

                              {/* Time and Action */}
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {format(
                                    parseISO(notification.createdAt),
                                    'h:mm a'
                                  )}
                                </p>

                                {notification.actionLabel && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    {notification.actionLabel}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsReadMutation.mutate(notification.id);
                                  }}
                                  disabled={markAsReadMutation.isPending}
                                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                                  title="Mark as read"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                                disabled={deleteNotificationMutation.isPending}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                                title="Delete notification"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {filteredNotifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-between items-center">
            <button
              onClick={() => deleteAllReadMutation.mutate()}
              disabled={deleteAllReadMutation.isPending}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              Clear read notifications
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredNotifications.length} notification
              {filteredNotifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenterPWA;
