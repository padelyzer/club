'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Settings,
  X,
  Check,
  Trash2,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Calendar,
  Trophy,
  CreditCard,
  Users,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/store/notifications';
import { AppNotification } from '@/types';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  maxHeight?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onClick: (notification: AppNotification) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClick,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getNotificationIcon = (type: AppNotification['type']) => {
    const iconClasses = 'h-5 w-5';
    
    switch (type) {
      case 'success':
        return <CheckCircle className={cn(iconClasses, 'text-green-500')} />;
      case 'error':
        return <AlertCircle className={cn(iconClasses, 'text-red-500')} />;
      case 'warning':
        return <AlertCircle className={cn(iconClasses, 'text-amber-500')} />;
      case 'info':
      default:
        return <Info className={cn(iconClasses, 'text-blue-500')} />;
    }
  };

  const getCategoryIcon = () => {
    if (!notification.metadata?.category) return null;
    
    const iconClasses = 'h-4 w-4';
    
    switch (notification.metadata.category) {
      case 'reservations':
        return <Calendar className={cn(iconClasses, 'text-blue-500')} />;
      case 'tournaments':
        return <Trophy className={cn(iconClasses, 'text-yellow-500')} />;
      case 'payments':
        return <CreditCard className={cn(iconClasses, 'text-green-500')} />;
      case 'classes':
        return <Users className={cn(iconClasses, 'text-purple-500')} />;
      case 'promotions':
        return <Zap className={cn(iconClasses, 'text-orange-500')} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.002 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/5',
        notification.isRead
          ? 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-700 shadow-sm'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
      )}
      
      <div
        className="p-4 cursor-pointer"
        onClick={() => onClick(notification)}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p
                  className={cn(
                    'text-sm font-medium leading-tight',
                    notification.isRead
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  {notification.title}
                </p>
                
                <p
                  className={cn(
                    'text-sm leading-relaxed',
                    notification.isRead
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-600 dark:text-gray-300'
                  )}
                >
                  {notification.message}
                </p>
              </div>

              {/* Quick actions */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center space-x-1 ml-2"
                  >
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
                {getCategoryIcon()}
                <span>
                  {format(parseISO(notification.createdAt), 'h:mm a')}
                </span>
              </div>

              {notification.actionLabel && (
                <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <span>{notification.actionLabel}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  maxHeight = 'max-h-96',
  position = 'top-right',
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getFilteredNotifications,
    processOfflineQueue,
    isLoading,
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Process offline notifications when opened
  useEffect(() => {
    if (isOpen) {
      processOfflineQueue();
    }
  }, [isOpen, processOfflineQueue]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(
        (n) => n.metadata?.category === categoryFilter
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, filter, categoryFilter]);

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

  const handleNotificationClick = useCallback(
    (notification: AppNotification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }

      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }

      onClose();
    },
    [markAsRead, onClose]
  );

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50 w-full max-w-md';
    
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Notification Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              getPositionClasses(),
              'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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
                {/* Refresh */}
                <button
                  onClick={processOfflineQueue}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Refresh notifications"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', isLoading && 'animate-spin')}
                  />
                </button>

                {/* Filters */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    showFilters
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  title="Filter notifications"
                >
                  <Filter className="h-4 w-4" />
                </button>

                {/* Mark all read */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}

                {/* Settings */}
                <button
                  onClick={() => {
                    // Navigate to notification settings
                    window.location.href = '/profile#notifications';
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Notification settings"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex space-x-2">
                      {(['all', 'unread', 'read'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                            filter === f
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          )}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>

                    <div className="flex space-x-2 flex-wrap">
                      {[
                        'all',
                        'reservations',
                        'tournaments',
                        'payments',
                        'classes',
                        'promotions',
                        'system',
                      ].map((category) => (
                        <button
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          className={cn(
                            'px-2 py-1 rounded-full text-xs transition-colors',
                            categoryFilter === category
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                          )}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notifications List */}
            <div className={cn('overflow-y-auto', maxHeight)}>
              {Object.keys(groupedNotifications).length === 0 ? (
                <div className="p-8 text-center">
                  <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {filter !== 'all' || categoryFilter !== 'all'
                      ? 'No notifications match your filters'
                      : 'No notifications yet'}
                  </p>
                  {(filter !== 'all' || categoryFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setFilter('all');
                        setCategoryFilter('all');
                      }}
                      className="text-blue-600 dark:text-blue-400 text-xs mt-2 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {Object.entries(groupedNotifications).map(
                    ([dateGroup, groupNotifications]) => (
                      <div key={dateGroup} className="mb-4">
                        {/* Date Group Header */}
                        <div className="px-2 py-1 mb-2">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {dateGroup}
                          </h4>
                        </div>

                        {/* Notifications */}
                        <div className="space-y-2">
                          <AnimatePresence>
                            {groupNotifications.map((notification) => (
                              <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={markAsRead}
                                onClick={handleNotificationClick}
                                onDelete={deleteNotification}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <div className="flex justify-between items-center">
                  <button
                    onClick={deleteAllRead}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;