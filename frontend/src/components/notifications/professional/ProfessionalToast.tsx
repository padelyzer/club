import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  X,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';

export interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

interface ProfessionalToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  className?: string;
}

export const ProfessionalToast = memo<ProfessionalToastProps>(({
  notifications,
  onDismiss,
  maxVisible = 5,
  className
}) => {
  const { t } = useTranslation();

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

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white/95 border-green-200/50',
          icon: 'text-green-600',
          title: 'text-green-900',
          message: 'text-green-800',
          accent: 'bg-green-500',
          shadow: 'shadow-green-500/20'
        };
      case 'warning':
        return {
          bg: 'bg-white/95 border-amber-200/50',
          icon: 'text-amber-600',
          title: 'text-amber-900',
          message: 'text-amber-800',
          accent: 'bg-amber-500',
          shadow: 'shadow-amber-500/20'
        };
      case 'error':
        return {
          bg: 'bg-white/95 border-red-200/50',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-800',
          accent: 'bg-red-500',
          shadow: 'shadow-red-500/20'
        };
      default:
        return {
          bg: 'bg-white/95 border-blue-200/50',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          message: 'text-blue-800',
          accent: 'bg-blue-500',
          shadow: 'shadow-blue-500/20'
        };
    }
  };

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      default: // top-right
        return 'top-4 right-4';
    }
  };

  const getAnimationVariants = (position: string) => {
    const isLeft = position.includes('left');
    const isRight = position.includes('right');
    const isTop = position.includes('top');
    const isCenter = position.includes('center');

    return {
      initial: {
        opacity: 0,
        scale: 0.9,
        x: isLeft ? -100 : isRight ? 100 : isCenter ? 0 : 100,
        y: isTop ? -20 : 20
      },
      animate: {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        transition: {
          type: "spring",
          damping: 25,
          stiffness: 300,
          duration: 0.4
        }
      },
      exit: {
        opacity: 0,
        scale: 0.8,
        x: isLeft ? -100 : isRight ? 100 : isCenter ? 0 : 100,
        y: isTop ? -20 : 20,
        transition: {
          duration: 0.3,
          ease: "easeInOut"
        }
      }
    };
  };

  // Auto-dismiss notifications
  useEffect(() => {
    notifications.forEach(notification => {
      if (!notification.persistent && notification.duration !== 0) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration || 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onDismiss]);

  // Group notifications by position
  const notificationsByPosition = notifications.reduce((acc, notification) => {
    const position = notification.position || 'top-right';
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(notification);
    return acc;
  }, {} as Record<string, ToastNotification[]>);

  return (
    <>
      {Object.entries(notificationsByPosition).map(([position, positionNotifications]) => {
        const displayedNotifications = positionNotifications.slice(0, maxVisible);
        const variants = getAnimationVariants(position);

        return (
          <div
            key={position}
            className={cn(
              'fixed z-50 flex flex-col gap-3 max-w-sm w-full',
              getPositionClasses(position),
              className
            )}
          >
            <AnimatePresence mode="popLayout">
              {displayedNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const styles = getNotificationStyles(notification.type);

                return (
                  <motion.div
                    key={notification.id}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'backdrop-blur-xl border rounded-xl shadow-xl overflow-hidden',
                      'border-l-4 group cursor-pointer',
                      styles.bg,
                      styles.shadow
                    )}
                    onClick={() => onDismiss(notification.id)}
                  >
                    {/* Progress Bar for Auto-dismiss */}
                    {!notification.persistent && notification.duration !== 0 && (
                      <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ 
                          duration: (notification.duration || 5000) / 1000,
                          ease: "linear"
                        }}
                        className={cn('h-1', styles.accent)}
                      />
                    )}

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'p-2 rounded-lg backdrop-blur-sm border border-white/50 shrink-0',
                          styles.bg.replace('bg-white/95', 'bg-white/50')
                        )}>
                          <Icon className={cn('w-5 h-5', styles.icon)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className={cn('text-sm font-semibold leading-5', styles.title)}>
                            {notification.title}
                          </h4>
                          
                          {notification.message && (
                            <p className={cn('text-sm mt-1 leading-5', styles.message)}>
                              {notification.message}
                            </p>
                          )}

                          {/* Action Button */}
                          {notification.action && (
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notification.action!.onClick();
                                  onDismiss(notification.id);
                                }}
                                rightIcon={<ExternalLink className="w-3 h-3" />}
                                className={cn(
                                  'text-xs',
                                  notification.type === 'success' && 'text-green-700 hover:bg-green-100/50',
                                  notification.type === 'warning' && 'text-amber-700 hover:bg-amber-100/50',
                                  notification.type === 'error' && 'text-red-700 hover:bg-red-100/50',
                                  notification.type === 'info' && 'text-blue-700 hover:bg-blue-100/50'
                                )}
                              >
                                {notification.action.label}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Close Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(notification.id);
                          }}
                          className="w-6 h-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Glassmorphism Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Show count if more notifications */}
            {positionNotifications.length > maxVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-2 bg-white/90 backdrop-blur-xl rounded-lg border border-gray-200/50 shadow-lg"
              >
                <p className="text-xs text-gray-600">
                  +{positionNotifications.length - maxVisible} {t('notifications.moreNotifications')}
                </p>
              </motion.div>
            )}
          </div>
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.notifications.length === nextProps.notifications.length &&
    prevProps.maxVisible === nextProps.maxVisible &&
    JSON.stringify(prevProps.notifications.map(n => ({ 
      id: n.id, 
      title: n.title,
      type: n.type 
    }))) === JSON.stringify(nextProps.notifications.map(n => ({ 
      id: n.id, 
      title: n.title,
      type: n.type 
    })))
  );
});

ProfessionalToast.displayName = 'ProfessionalToast';

export default ProfessionalToast;