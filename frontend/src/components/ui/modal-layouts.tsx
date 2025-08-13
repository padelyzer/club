'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X, ArrowLeft, Check } from 'lucide-react';
import { Button } from './button';

// Standard Modal Header with Apple HIG styling
interface ModalHeaderProps {
  title?: string;
  subtitle?: string;
  description?: string;
  onClose?: () => void;
  onBack?: () => void;
  showCloseButton?: boolean;
  showBackButton?: boolean;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const AppleModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  description,
  onClose,
  onBack,
  showCloseButton = true,
  showBackButton = false,
  actions,
  className,
  children,
}) => {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Top bar with navigation and actions */}
      {(showBackButton || showCloseButton || actions) && (
        <div className="flex items-center justify-between">
          {/* Left side - Back button */}
          <div className="flex items-center">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className={cn(
                  "flex items-center justify-center",
                  "w-8 h-8 rounded-full",
                  "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
                  "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                  "transition-all duration-150 ease-in-out",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "active:scale-95"
                )}
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right side - Actions and close */}
          <div className="flex items-center gap-2">
            {actions}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className={cn(
                  "flex items-center justify-center",
                  "w-8 h-8 rounded-full",
                  "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
                  "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                  "transition-all duration-150 ease-in-out",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "active:scale-95"
                )}
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Title section */}
      {(title || subtitle || description || children) && (
        <div className="space-y-2">
          {title && (
            <h1 className="text-headline-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
          )}
          {subtitle && (
            <h2 className="text-headline-sm font-medium text-gray-700 dark:text-gray-300">
              {subtitle}
            </h2>
          )}
          {description && (
            <p className="text-body-md text-gray-600 dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

// Form Layout for modal forms
interface FormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppleModalFormLayout: React.FC<FormLayoutProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {children}
    </div>
  );
};

// Form Section for grouping related fields
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AppleModalFormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-ui-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-caption-lg text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// List Layout for selection modals
interface ListLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const AppleModalListLayout: React.FC<ListLayoutProps> = ({
  children,
  className,
  maxHeight = "max-h-96",
}) => {
  return (
    <div className={cn(
      "divide-y divide-gray-200 dark:divide-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden",
      maxHeight,
      className
    )}>
      <div className="overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

// List Item for modal lists
interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export const AppleModalListItem: React.FC<ListItemProps> = ({
  children,
  onClick,
  selected = false,
  disabled = false,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-3 text-left transition-colors duration-150",
        "hover:bg-gray-100 dark:hover:bg-gray-700/50",
        "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700/50",
        "active:bg-gray-200 dark:active:bg-gray-600/50",
        selected && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {children}
        </div>
        {selected && (
          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
      </div>
    </button>
  );
};

// Modal Footer with action buttons
interface ModalFooterProps {
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'destructive';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  tertiaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  children?: React.ReactNode;
  className?: string;
  layout?: 'stacked' | 'inline';
}

export const AppleModalFooter: React.FC<ModalFooterProps> = ({
  primaryAction,
  secondaryAction,
  tertiaryAction,
  children,
  className,
  layout = 'inline',
}) => {
  if (children) {
    return (
      <div className={cn(
        "flex gap-3 pt-6",
        layout === 'stacked' ? "flex-col" : "flex-col-reverse sm:flex-row sm:justify-end",
        className
      )}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 pt-6",
      layout === 'stacked' ? "flex-col" : "flex-col-reverse sm:flex-row sm:justify-end",
      className
    )}>
      {/* Tertiary action (usually on the left) */}
      {tertiaryAction && (
        <Button
          variant="ghost"
          onClick={tertiaryAction.onClick}
          disabled={tertiaryAction.disabled}
          className="sm:order-first"
        >
          {tertiaryAction.label}
        </Button>
      )}
      
      {/* Secondary action */}
      {secondaryAction && (
        <Button
          variant="outline"
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.disabled}
          className={layout === 'stacked' ? "w-full" : ""}
        >
          {secondaryAction.label}
        </Button>
      )}
      
      {/* Primary action */}
      {primaryAction && (
        <Button
          variant={primaryAction.variant === 'destructive' ? 'destructive' : 'default'}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className={layout === 'stacked' ? "w-full" : ""}
        >
          {primaryAction.loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {primaryAction.label}
            </div>
          ) : (
            primaryAction.label
          )}
        </Button>
      )}
    </div>
  );
};

// Information Layout for detail/confirmation modals
interface InfoLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppleModalInfoLayout: React.FC<InfoLayoutProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {children}
    </div>
  );
};

// Info Item for displaying key-value information
interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const AppleModalInfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  className,
}) => {
  return (
    <div className={cn("flex justify-between items-start gap-4", className)}>
      <span className="text-body-md font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
        {label}
      </span>
      <span className="text-body-md text-gray-900 dark:text-white text-right">
        {value}
      </span>
    </div>
  );
};

// Progress Indicator for multi-step modals
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  className?: string;
}

export const AppleModalProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
  className,
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-between text-caption-sm text-gray-600 dark:text-gray-400">
        <span>Step {currentStep} of {totalSteps}</span>
        {steps && steps[currentStep - 1] && (
          <span className="font-medium">{steps[currentStep - 1]}</span>
        )}
      </div>
    </div>
  );
};