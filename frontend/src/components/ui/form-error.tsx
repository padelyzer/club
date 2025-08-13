import * as React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Typography } from './typography';
import { motion, AnimatePresence } from 'framer-motion';

interface FormErrorProps {
  message?: string | string[];
  className?: string;
  showIcon?: boolean;
}

export const FormError: React.FC<FormErrorProps> = ({
  message,
  className,
  showIcon = true,
}) => {
  if (!message) return null;

  const messages = Array.isArray(message) ? message : [message];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn('overflow-hidden', className)}
      >
        <div className="flex items-start gap-2 pt-1">
          {showIcon && (
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          )}
          <div className="space-y-1">
            {messages.map((msg, index) => (
              <Typography
                key={index}
                variant="body-sm"
                className="text-destructive"
              >
                {msg}
              </Typography>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface FieldErrorProps extends FormErrorProps {
  name: string;
  errors?: Record<string, any>;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  name,
  errors,
  ...props
}) => {
  const error = errors?.[name];
  const message = error?.message || error;

  return <FormError message={message} {...props} />;
};

interface FormErrorSummaryProps {
  errors?: Record<string, any>;
  title?: string;
  className?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title = 'Please fix the following errors:',
  className,
}) => {
  if (!errors || Object.keys(errors).length === 0) return null;

  const errorMessages = Object.entries(errors).map(([field, error]) => ({
    field,
    message: error?.message || error,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border border-destructive/20 bg-destructive/5 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-destructive mt-0.5" />
        <div className="flex-1">
          <Typography variant="ui-md" weight="semibold" className="text-destructive">
            {title}
          </Typography>
          <ul className="mt-2 space-y-1">
            {errorMessages.map(({ field, message }) => (
              <li key={field}>
                <Typography variant="body-sm" className="text-destructive/90">
                  • <span className="font-medium">{field}:</span> {message}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

// Inline error for inputs
interface InlineErrorProps {
  error?: string;
  touched?: boolean;
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, touched }) => {
  if (!error || !touched) return null;

  return (
    <motion.span
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="text-xs text-destructive mt-1 flex items-center gap-1"
    >
      <AlertCircle className="h-3 w-3" />
      {error}
    </motion.span>
  );
};

// Toast error notification
interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  onClose,
  duration = 5000,
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div className="bg-destructive text-destructive-foreground px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <Typography variant="body-sm">{message}</Typography>
        <button
          onClick={onClose}
          className="ml-4 text-destructive-foreground/70 hover:text-destructive-foreground"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};