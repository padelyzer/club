import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppNotification } from '@/types';
import { cn, formatDate } from '@/lib/utils';

interface NotificationFeedProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
}

export const NotificationFeed = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}: NotificationFeedProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'info':
        return Info;
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return XCircle;
    }
  };

  const getColorClass = (type: AppNotification['type']) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      case 'success':
        return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay notificaciones nuevas</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const isExpanded = expandedId === notification.id;

              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={cn(
                    'relative p-4 rounded-lg border transition-all cursor-pointer',
                    notification.isRead
                      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      : 'bg-white dark:bg-gray-800 border-primary/20 shadow-sm'
                  )}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : notification.id);
                    if (!notification.isRead) {
                      onMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        getColorClass(notification.type)
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2"
                          >
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {notification.message}
                            </p>
                            {notification.actionUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="mt-2 p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle action
                                }}
                              >
                                {notification.actionLabel || 'Ver más'}
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="absolute top-4 right-12 w-2 h-2 bg-primary rounded-full" />
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};
