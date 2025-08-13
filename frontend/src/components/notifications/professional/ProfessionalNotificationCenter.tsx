import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  X,
  Check,
  Clock,
  Filter,
  MoreHorizontal,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';

export interface ProfessionalNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
  read: boolean;
  persistent?: boolean;
  actionable?: {
    label: string;
    action: () => void;
  };
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface ProfessionalNotificationCenterProps {
  notifications: ProfessionalNotification[];
  onNotificationClick?: (notification: ProfessionalNotification) => void;
  onNotificationDismiss?: (notificationId: string) => void;
  onNotificationMarkRead?: (notificationId: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  onSettingsClick?: () => void;
  maxVisible?: number;
  autoHideDelay?: number;
  soundEnabled?: boolean;
  onSoundToggle?: () => void;
  className?: string;
}

export const ProfessionalNotificationCenter = memo<ProfessionalNotificationCenterProps>(({
  notifications,
  onNotificationClick,
  onNotificationDismiss,
  onNotificationMarkRead,
  onMarkAllRead,
  onClearAll,
  onSettingsClick,
  maxVisible = 5,
  autoHideDelay,
  soundEnabled = true,
  onSoundToggle,
  className
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'unread' | 'success' | 'warning' | 'error' | 'info'>('all');
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return XCircle;
      default:
        return Info;
    }
  };

  const getNotificationStyles = (type: string, priority?: string) => {
    const baseStyles = {
      success: {
        bg: 'bg-green-50/90 border-green-200/50',
        icon: 'text-green-600',
        title: 'text-green-900',
        message: 'text-green-800',
        accent: 'bg-green-500'
      },
      warning: {
        bg: 'bg-amber-50/90 border-amber-200/50',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        message: 'text-amber-800',
        accent: 'bg-amber-500'
      },
      error: {
        bg: 'bg-red-50/90 border-red-200/50',
        icon: 'text-red-600',
        title: 'text-red-900',
        message: 'text-red-800',
        accent: 'bg-red-500'
      },
      info: {
        bg: 'bg-blue-50/90 border-blue-200/50',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        message: 'text-blue-800',
        accent: 'bg-blue-500'
      }
    };

    const styles = baseStyles[type as keyof typeof baseStyles] || baseStyles.info;
    
    if (priority === 'high') {
      return {
        ...styles,
        bg: styles.bg.replace('/90', '/95') + ' shadow-lg shadow-black/10'
      };
    }
    
    return styles;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const displayedNotifications = filteredNotifications.slice(0, maxVisible);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Auto-hide notifications
  useEffect(() => {
    if (autoHideDelay) {
      notifications.forEach(notification => {
        if (!notification.persistent && !notification.read) {
          const timer = setTimeout(() => {
            onNotificationDismiss?.(notification.id);
          }, autoHideDelay);
          
          return () => clearTimeout(timer);
        }
      });
    }
  }, [notifications, autoHideDelay, onNotificationDismiss]);

  // Show/hide animations
  useEffect(() => {
    const newNotifications = notifications.filter(n => !visibleNotifications.has(n.id));
    if (newNotifications.length > 0) {
      newNotifications.forEach(notification => {
        setVisibleNotifications(prev => new Set([...prev, notification.id]));
      });
    }
  }, [notifications, visibleNotifications]);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: { duration: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 100, scale: 0.95 },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    exit: { 
      opacity: 0, 
      x: 100,
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <Card variant="glass" padding="md" className="backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('notifications.title')}
              </h2>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 
                  ? t('notifications.unreadCount', { count: unreadCount })
                  : t('notifications.allRead')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSoundToggle}
              className="w-8 h-8 p-0"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
              className="w-8 h-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {[
            { key: 'all', label: t('notifications.filters.all') },
            { key: 'unread', label: t('notifications.filters.unread') },
            { key: 'success', label: t('notifications.filters.success') },
            { key: 'warning', label: t('notifications.filters.warning') },
            { key: 'error', label: t('notifications.filters.error') },
            { key: 'info', label: t('notifications.filters.info') }
          ].map((filterOption) => (
            <Button
              key={filterOption.key}
              variant={filter === filterOption.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(filterOption.key as any)}
              className="text-xs"
            >
              {filterOption.label}
            </Button>
          ))}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/50">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllRead}
                leftIcon={<Check className="w-4 h-4" />}
              >
                {t('notifications.markAllRead')}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              leftIcon={<X className="w-4 h-4" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {t('notifications.clearAll')}
            </Button>
          </div>
        )}
      </Card>

      {/* Notifications List */}
      <AnimatePresence mode="popLayout">
        {displayedNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card variant="glass" padding="lg" className="text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                {filter === 'unread' 
                  ? t('notifications.noUnread')
                  : t('notifications.noNotifications')
                }
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {displayedNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const styles = getNotificationStyles(notification.type, notification.priority);
              
              return (
                <motion.div
                  key={notification.id}
                  variants={itemVariants}
                  layout
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card 
                    variant="white"
                    padding="none"
                    className={cn(
                      'cursor-pointer transition-all duration-200',
                      'hover:shadow-lg border-l-4',
                      styles.bg,
                      !notification.read && 'shadow-md'
                    )}
                    onClick={() => {
                      onNotificationClick?.(notification);
                      if (!notification.read) {
                        onNotificationMarkRead?.(notification.id);
                      }
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'p-2 rounded-lg backdrop-blur-sm border border-white/50',
                          styles.bg.replace('/90', '/50')
                        )}>
                          <Icon className={cn('w-5 h-5', styles.icon)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              'text-sm font-semibold leading-5',
                              styles.title,
                              !notification.read && 'font-bold'
                            )}>
                              {notification.title}
                            </h4>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {!notification.read && (
                                <div className={cn('w-2 h-2 rounded-full', styles.accent)} />
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNotificationDismiss?.(notification.id);
                                }}
                                className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <p className={cn('text-sm mt-1 leading-5', styles.message)}>
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(notification.timestamp).toLocaleString()}
                                </span>
                              </div>
                              
                              {notification.category && (
                                <span className="px-2 py-1 bg-gray-100/80 rounded-full">
                                  {notification.category}
                                </span>
                              )}
                              
                              {notification.priority === 'high' && (
                                <span className="px-2 py-1 bg-red-100/80 text-red-700 rounded-full font-medium">
                                  {t('notifications.priority.high')}
                                </span>
                              )}
                            </div>

                            {notification.actionable && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notification.actionable!.action();
                                }}
                                className="text-xs"
                              >
                                {notification.actionable.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Glassmorphism Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Show More Button */}
      {filteredNotifications.length > maxVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button
            variant="ghost"
            onClick={() => {
              // Handle show more functionality
            }}
          >
            {t('notifications.showMore', { 
              count: filteredNotifications.length - maxVisible 
            })}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.notifications.length === nextProps.notifications.length &&
    prevProps.maxVisible === nextProps.maxVisible &&
    prevProps.soundEnabled === nextProps.soundEnabled &&
    JSON.stringify(prevProps.notifications.map(n => ({ 
      id: n.id, 
      read: n.read, 
      timestamp: n.timestamp 
    }))) === JSON.stringify(nextProps.notifications.map(n => ({ 
      id: n.id, 
      read: n.read, 
      timestamp: n.timestamp 
    })))
  );
});

ProfessionalNotificationCenter.displayName = 'ProfessionalNotificationCenter';

export default ProfessionalNotificationCenter;