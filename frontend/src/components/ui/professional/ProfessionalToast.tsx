'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ProfessionalToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: {
    bg: 'bg-green-50/95',
    border: 'border-green-200/60',
    text: 'text-green-900',
    icon: 'text-green-600',
    accent: 'bg-green-500',
  },
  error: {
    bg: 'bg-red-50/95',
    border: 'border-red-200/60',
    text: 'text-red-900',
    icon: 'text-red-600',
    accent: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50/95',
    border: 'border-amber-200/60',
    text: 'text-amber-900',
    icon: 'text-amber-600',
    accent: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50/95',
    border: 'border-blue-200/60',
    text: 'text-blue-900',
    icon: 'text-blue-600',
    accent: 'bg-[#007AFF]',
  },
};

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export const ProfessionalToast: React.FC<ProfessionalToastProps> = ({
  notifications,
  onDismiss,
  position = 'top-right',
}) => {
  return (
    <div className={`fixed ${positionStyles[position]} z-[1080] space-y-3 max-w-sm w-full`}>
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const Icon = toastIcons[notification.type];
          const styles = toastStyles[notification.type];

          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ 
                opacity: 0, 
                x: position.includes('right') ? 300 : -300, 
                scale: 0.8 
              }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                x: position.includes('right') ? 300 : -300, 
                scale: 0.8,
                transition: { duration: 0.2 }
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className={`
                relative overflow-hidden rounded-xl shadow-xl backdrop-blur-xl border 
                ${styles.bg} ${styles.border} ${styles.text}
                cursor-pointer group
              `}
              onClick={() => onDismiss(notification.id)}
            >
              {/* Accent Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`} />
              
              {/* Content */}
              <div className="p-4 pl-6">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${styles.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    {/* Action Button */}
                    {notification.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          notification.action!.onClick();
                          onDismiss(notification.id);
                        }}
                        className={`
                          mt-2 text-xs font-medium underline decoration-1 underline-offset-2
                          hover:no-underline transition-all duration-200
                          ${styles.icon}
                        `}
                      >
                        {notification.action.label}
                      </button>
                    )}
                  </div>
                  
                  {/* Close Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(notification.id);
                    }}
                    className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar for Timed Toasts */}
              {notification.duration && (
                <ToastProgressBar 
                  duration={notification.duration} 
                  accentColor={styles.accent}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

interface ToastProgressBarProps {
  duration: number;
  accentColor: string;
}

const ToastProgressBar: React.FC<ToastProgressBarProps> = ({ duration, accentColor }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 50));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
      <motion.div
        className={`h-full ${accentColor}`}
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.05 }}
      />
    </div>
  );
};

/**
 * Hook for managing toast notifications
 */
export const useProfessionalToast = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss if duration is provided
    if (toast.duration) {
      setTimeout(() => {
        dismissToast(id);
      }, toast.duration);
    }

    return id;
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ ...options, title, message, type: 'success', duration: options?.duration ?? 4000 });
  };

  const error = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ ...options, title, message, type: 'error', duration: options?.duration ?? 6000 });
  };

  const warning = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ ...options, title, message, type: 'warning', duration: options?.duration ?? 5000 });
  };

  const info = (title: string, message: string, options?: Partial<ToastNotification>) => {
    return addToast({ ...options, title, message, type: 'info', duration: options?.duration ?? 4000 });
  };

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
  };
};

export default ProfessionalToast;