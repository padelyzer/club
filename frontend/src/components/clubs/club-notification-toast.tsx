'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, AlertCircle, Info, X, Zap,
  Calendar, Users, TrendingUp, Trophy, Shield,
  ChevronRight, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubNotification, NotificationType } from '@/lib/notifications/club-notifications';
import { clubDesignTokens as tokens } from '@/styles/club-design-tokens';

/**
 * Club Notification Toast
 * Premium toast notifications for real-time updates
 */

interface ClubNotificationToastProps {
  notification: ClubNotification;
  onDismiss: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration?: number;
}

export const ClubNotificationToast: React.FC<ClubNotificationToastProps> = ({
  notification,
  onDismiss,
  position = 'top-right',
  duration = 5000
}) => {
  // Auto dismiss
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);
  
  const typeConfig: Record<NotificationType, {
    bg: string;
    border: string;
    icon: any;
    iconColor: string;
    progressColor: string;
  }> = {
    success: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400',
      progressColor: 'bg-green-500',
    },
    error: {
      bg: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      progressColor: 'bg-red-500',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
      progressColor: 'bg-blue-500',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: AlertCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      progressColor: 'bg-amber-500',
    },
    achievement: {
      bg: 'bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: Trophy,
      iconColor: 'text-purple-600 dark:text-purple-400',
      progressColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
    },
  };
  
  const categoryIcons = {
    reservation: Calendar,
    member: Users,
    payment: Zap,
    maintenance: Shield,
    achievement: Trophy,
    system: Info,
    analytics: TrendingUp,
  };
  
  const config = typeConfig[notification.type];
  const Icon = config.icon;
  const CategoryIcon = categoryIcons[notification.category];
  
  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };
  
  // Animation variants
  const variants = {
    initial: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      x: position.includes('right') ? 20 : -20,
      scale: 0.9,
    },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      x: position.includes('right') ? 20 : -20,
      scale: 0.9,
    },
  };
  
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        "fixed z-50",
        positionClasses[position],
        "max-w-md w-full sm:w-auto"
      )}
    >
      <div className={cn(
        "relative overflow-hidden",
        "rounded-2xl shadow-2xl",
        "border backdrop-blur-md",
        config.bg,
        config.border,
        notification.priority === 'urgent' && "ring-2 ring-red-500 ring-offset-2"
      )}>
        {/* Glow effect for achievements */}
        {notification.type === 'achievement' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-20 blur-xl" />
        )}
        
        <div className="relative p-4">
          <div className="flex gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                "bg-white/50 dark:bg-gray-800/50",
                "shadow-lg"
              )}>
                <Icon className={cn("w-6 h-6", config.iconColor)} />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      {notification.title}
                    </h4>
                    
                    {notification.priority === 'urgent' && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full uppercase">
                        Urgente
                      </span>
                    )}
                    
                    <CategoryIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  
                  {/* Message */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  {/* Actions */}
                  {(notification.actionUrl || notification.clubName) && (
                    <div className="flex items-center gap-3 mt-2">
                      {notification.clubName && (
                        <span className="text-xs text-gray-500 font-medium">
                          {notification.clubName}
                        </span>
                      )}
                      
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          className={cn(
                            "inline-flex items-center gap-1",
                            "text-xs font-medium",
                            "text-indigo-600 hover:text-indigo-700",
                            "hover:underline"
                          )}
                        >
                          {notification.actionLabel || 'Ver detalles'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Close button */}
                <button
                  onClick={onDismiss}
                  className={cn(
                    "p-1 rounded-lg",
                    "hover:bg-gray-200 dark:hover:bg-gray-700",
                    "transition-colors"
                  )}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className={cn("h-full", config.progressColor)}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Toast Container for multiple notifications
 */
interface ClubNotificationToastContainerProps {
  notifications: ClubNotification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export const ClubNotificationToastContainer: React.FC<ClubNotificationToastContainerProps> = ({
  notifications,
  onDismiss,
  position = 'top-right',
  maxToasts = 3
}) => {
  const displayNotifications = notifications.slice(0, maxToasts);
  
  return (
    <AnimatePresence>
      {displayNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${position.includes('top') ? index * 110 : -index * 110}px)`,
            zIndex: 100 - index,
          }}
        >
          <ClubNotificationToast
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
            position={position}
          />
        </div>
      ))}
    </AnimatePresence>
  );
};

export default ClubNotificationToast;