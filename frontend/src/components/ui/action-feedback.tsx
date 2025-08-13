'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

// Types
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface FeedbackConfig {
  type: FeedbackType;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Feedback icons
const FEEDBACK_ICONS: Record<FeedbackType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  loading: <Loader2 className="h-5 w-5 animate-spin" />,
};

// Feedback colors
const FEEDBACK_COLORS: Record<FeedbackType, string> = {
  success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  loading: 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
};

// Global feedback instance
let feedbackInstance: ((config: FeedbackConfig) => void) | null = null;

// Feedback component
export function FeedbackProvider() {
  const [feedbacks, setFeedbacks] = useState<(FeedbackConfig & { id: string })[]>([]);

  useEffect(() => {
    feedbackInstance = (config: FeedbackConfig) => {
      const id = Date.now().toString();
      setFeedbacks((prev) => [...prev, { ...config, id }]);

      if (config.type !== 'loading' && config.duration !== 0) {
        setTimeout(() => {
          setFeedbacks((prev) => prev.filter((f) => f.id !== id));
        }, config.duration || 3000);
      }
    };

    return () => {
      feedbackInstance = null;
    };
  }, []);

  const removeFeedback = (id: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence mode="sync">
        {feedbacks.map((feedback) => (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: feedback.position === 'bottom' ? 20 : -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: feedback.position === 'bottom' ? 20 : -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed left-1/2 -translate-x-1/2 pointer-events-auto',
              feedback.position === 'bottom' && 'bottom-4',
              feedback.position === 'top' && 'top-4',
              feedback.position === 'center' && 'top-1/2 -translate-y-1/2'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm',
                FEEDBACK_COLORS[feedback.type]
              )}
            >
              {feedback.icon || FEEDBACK_ICONS[feedback.type]}
              <span className="text-sm font-medium">{feedback.message}</span>
              {feedback.action && (
                <button
                  onClick={() => {
                    feedback.action?.onClick();
                    removeFeedback(feedback.id);
                  }}
                  className="ml-2 text-sm font-semibold underline hover:no-underline"
                >
                  {feedback.action.label}
                </button>
              )}
              {feedback.type !== 'loading' && (
                <button
                  onClick={() => removeFeedback(feedback.id)}
                  className="ml-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// Feedback API
export const feedback = {
  success: (message: string, options?: Partial<FeedbackConfig>) => {
    feedbackInstance?.({ ...options, type: 'success', message });
  },
  error: (message: string, options?: Partial<FeedbackConfig>) => {
    feedbackInstance?.({ ...options, type: 'error', message });
  },
  warning: (message: string, options?: Partial<FeedbackConfig>) => {
    feedbackInstance?.({ ...options, type: 'warning', message });
  },
  info: (message: string, options?: Partial<FeedbackConfig>) => {
    feedbackInstance?.({ ...options, type: 'info', message });
  },
  loading: (message: string, options?: Partial<FeedbackConfig>) => {
    feedbackInstance?.({ ...options, type: 'loading', message, duration: 0 });
  },
  dismiss: () => {
    // Dismiss all feedbacks
    if (feedbackInstance) {
      // Implementation would require exposing a dismiss method
    }
  },
};

// Action feedback button component
interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  children: React.ReactNode;
}

export function ActionButton({
  loading,
  success,
  error,
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText = 'Error!',
  children,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const [internalState, setInternalState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (loading) setInternalState('loading');
    else if (success) setInternalState('success');
    else if (error) setInternalState('error');
    else setInternalState('idle');
  }, [loading, success, error]);

  useEffect(() => {
    if (internalState === 'success' || internalState === 'error') {
      const timer = setTimeout(() => setInternalState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [internalState]);

  const content = {
    idle: children,
    loading: (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {loadingText}
      </>
    ),
    success: (
      <>
        <Check className="h-4 w-4 mr-2" />
        {successText}
      </>
    ),
    error: (
      <>
        <X className="h-4 w-4 mr-2" />
        {errorText}
      </>
    ),
  };

  const colors = {
    idle: '',
    loading: 'opacity-75',
    success: 'bg-green-600 hover:bg-green-700',
    error: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200',
        colors[internalState],
        className
      )}
      disabled={disabled || internalState === 'loading'}
      {...props}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={internalState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center"
        >
          {content[internalState]}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

// Progress feedback component
interface ProgressFeedbackProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressFeedback({
  progress,
  message,
  showPercentage = true,
  className,
}: ProgressFeedbackProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {message && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{message}</span>
          {showPercentage && (
            <span className="font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 dark:bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Confirmation feedback component
interface ConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
}: ConfirmationProps) {
  if (!isOpen) return null;

  const icons = {
    danger: <AlertCircle className="h-6 w-6 text-red-600" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    info: <Info className="h-6 w-6 text-blue-600" />,
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6">
              <div className="flex items-start gap-4">
                {icons[type]}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                    buttonColors[type]
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}