'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, CheckCircle, AlertCircle, Info, Trash2,
  Filter, Clock, ExternalLink, Sparkles, ChevronRight,
  Calendar, Users, Zap, Shield, TrendingUp, Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClubNotifications, ClubNotification, NotificationCategory } from '@/lib/notifications/club-notifications';
import { clubDesignTokens as tokens } from '@/styles/club-design-tokens';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Club Notifications Panel
 * Premium notification center for the world's most powerful club management
 */

interface ClubNotificationsPanelProps {
  clubId?: string;
  position?: 'fixed' | 'relative';
  maxHeight?: string;
}

export const ClubNotificationsPanel: React.FC<ClubNotificationsPanelProps> = ({
  clubId,
  position = 'fixed',
  maxHeight = '600px'
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isOpen,
    filter,
    togglePanel,
    setFilter,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getFilteredNotifications,
    getUnreadByCategory
  } = useClubNotifications();
  
  const filteredNotifications = getFilteredNotifications();
  const displayNotifications = clubId 
    ? filteredNotifications.filter(n => !n.clubId || n.clubId === clubId)
    : filteredNotifications;
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        if (isOpen) togglePanel();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, togglePanel]);
  
  // Auto-mark as read when viewing
  useEffect(() => {
    if (isOpen) {
      const unreadIds = displayNotifications
        .filter(n => !n.read)
        .map(n => n.id);
      
      // Mark as read after 2 seconds
      const timer = setTimeout(() => {
        unreadIds.forEach(id => markAsRead(id));
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, displayNotifications, markAsRead]);
  
  const categories: { key: NotificationCategory | 'all'; label: string; icon: any }[] = [
    { key: 'all', label: 'Todas', icon: Bell },
    { key: 'reservation', label: 'Reservas', icon: Calendar },
    { key: 'member', label: 'Miembros', icon: Users },
    { key: 'payment', label: 'Pagos', icon: Zap },
    { key: 'analytics', label: 'Análisis', icon: TrendingUp },
    { key: 'achievement', label: 'Logros', icon: Trophy },
    { key: 'maintenance', label: 'Manten.', icon: Shield },
  ];
  
  return (
    <div 
      ref={panelRef}
      className={cn(
        position === 'fixed' && "fixed top-20 right-4 z-50"
      )}
    >
      {/* Notification Bell */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={togglePanel}
        className={cn(
          "relative p-3 rounded-xl",
          "bg-white dark:bg-gray-800",
          "shadow-lg shadow-gray-900/10",
          "hover:shadow-xl",
          tokens.effects.transition,
          isOpen && "ring-2 ring-indigo-500"
        )}
      >
        <Bell className={cn(
          "w-6 h-6",
          unreadCount > 0 ? "text-indigo-600" : "text-gray-600"
        )} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute -top-1 -right-1",
              "w-6 h-6 rounded-full",
              "bg-gradient-to-r from-red-500 to-pink-500",
              "text-white text-xs font-bold",
              "flex items-center justify-center",
              "shadow-lg"
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
        
        {/* Pulse Animation */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 rounded-xl">
            <div className="absolute inset-0 rounded-xl bg-indigo-500 animate-ping opacity-20" />
          </div>
        )}
      </motion.button>
      
      {/* Notifications Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute top-16 right-0",
              "w-96 rounded-2xl",
              "bg-white dark:bg-gray-800",
              "shadow-2xl shadow-gray-900/20",
              "border border-gray-200 dark:border-gray-700",
              "overflow-hidden"
            )}
            style={{ maxHeight }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Notificaciones
                    </h3>
                    <p className="text-sm text-gray-500">
                      {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Marcar todas
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePanel}
                    className="w-8 h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Category Tabs */}
              <Tabs value={filter || ''} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="w-full h-auto p-1 bg-gray-100 dark:bg-gray-700/50">
                  <ScrollArea className="w-full" orientation="horizontal">
                    <div className="flex gap-1">
                      {categories.map(cat => {
                        const Icon = cat.icon;
                        const unread = cat.key === 'all' 
                          ? unreadCount 
                          : getUnreadByCategory(cat.key as NotificationCategory);
                        
                        return (
                          <TabsTrigger
                            key={cat.key}
                            value={cat.key || ''}
                            className={cn(
                              "relative px-3 py-1.5 text-xs whitespace-nowrap",
                              "data-[state=active]:bg-white data-[state=active]:shadow-sm"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5 mr-1.5 inline" />
                            {cat.label}
                            {unread > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {unread}
                              </span>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Notifications List */}
            <ScrollArea className="h-full" style={{ maxHeight: 'calc(100% - 140px)' }}>
              {displayNotifications.length === 0 ? (
                <EmptyNotifications filter={filter} />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {displayNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRemove={() => removeNotification(notification.id)}
                      onRead={() => markAsRead(notification.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Individual Notification Item
 */
const NotificationItem: React.FC<{
  notification: ClubNotification;
  onRemove: () => void;
  onRead: () => void;
}> = ({ notification, onRemove, onRead }) => {
  const categoryIcons: Record<NotificationCategory, any> = {
    reservation: Calendar,
    member: Users,
    payment: Zap,
    maintenance: Shield,
    achievement: Trophy,
    system: Info,
    analytics: TrendingUp,
  };
  
  const typeStyles = {
    success: { bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle, color: 'text-green-600' },
    error: { bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle, color: 'text-red-600' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Info, color: 'text-blue-600' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: AlertCircle, color: 'text-amber-600' },
    achievement: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: Sparkles, color: 'text-purple-600' },
  };
  
  const CategoryIcon = categoryIcons[notification.category];
  const style = typeStyles[notification.type];
  const TypeIcon = style.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={onRead}
      className={cn(
        "p-4 cursor-pointer group",
        "hover:bg-gray-50 dark:hover:bg-gray-700/50",
        tokens.effects.transition,
        !notification.read && "bg-indigo-50/50 dark:bg-indigo-900/10"
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
          style.bg
        )}>
          <CategoryIcon className={cn("w-5 h-5", style.color)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn(
                  "font-semibold text-sm",
                  !notification.read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                )}>
                  {notification.title}
                </h4>
                
                {notification.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    Urgente
                  </Badge>
                )}
                
                {notification.type === 'achievement' && (
                  <Sparkles className="w-4 h-4 text-purple-500" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(notification.timestamp, { 
                    addSuffix: true, 
                    locale: es 
                  })}
                </span>
                
                {notification.clubName && (
                  <span className="text-xs text-gray-500">
                    {notification.clubName}
                  </span>
                )}
                
                {notification.actionUrl && (
                  <a
                    href={notification.actionUrl}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {notification.actionLabel || 'Ver más'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className={cn(
                "p-1 rounded-lg opacity-0 group-hover:opacity-100",
                "hover:bg-gray-200 dark:hover:bg-gray-600",
                tokens.effects.transition
              )}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Read indicator */}
        {!notification.read && (
          <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  );
};

/**
 * Empty State
 */
const EmptyNotifications: React.FC<{ filter: string }> = ({ filter }) => {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <Bell className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No hay notificaciones
      </h3>
      <p className="text-sm text-gray-500">
        {filter === 'all' 
          ? 'Todas tus notificaciones aparecerán aquí'
          : `No tienes notificaciones de ${filter}`
        }
      </p>
    </div>
  );
};

export default ClubNotificationsPanel;