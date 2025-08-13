'use client';

import React from 'react';
import {
  FileText,
  Users,
  Calendar,
  Search,
  Plus,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type?: 'no-data' | 'search' | 'error' | 'offline' | 'loading';
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const defaultIcons = {
  'no-data': FileText,
  search: Search,
  error: AlertCircle,
  offline: WifiOff,
  loading: Wifi,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  icon,
  action,
  className,
  size = 'md',
}) => {
  const Icon = icon || defaultIcons[type];

  const sizes = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      iconContainer: 'h-16 w-16',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'h-10 w-10',
      iconContainer: 'h-20 w-20',
      title: 'text-lg',
      description: 'text-base',
    },
    lg: {
      container: 'py-16',
      icon: 'h-12 w-12',
      iconContainer: 'h-24 w-24',
      title: 'text-xl',
      description: 'text-lg',
    },
  };

  const sizeConfig = sizes[size];

  const getIconColor = () => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'offline':
        return 'text-orange-500';
      case 'loading':
        return 'text-blue-500';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/10';
      case 'offline':
        return 'bg-orange-50 dark:bg-orange-900/10';
      case 'loading':
        return 'bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        className
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-center rounded-full mb-4',
          sizeConfig.iconContainer,
          getBackgroundColor()
        )}
      >
        <Icon className={cn(sizeConfig.icon, getIconColor())} />
      </div>

      <h3
        className={cn(
          'font-semibold text-gray-900 dark:text-white mb-2',
          sizeConfig.title
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          'text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6',
          sizeConfig.description
        )}
      >
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
            action.variant === 'secondary'
              ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500'
              : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          )}
        >
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </button>
      )}
    </div>
  );
};

// Specific empty state components for common use cases
export const NoReservations: React.FC<{ onCreateNew?: () => void }> = ({
  onCreateNew,
}) => (
  <EmptyState
    type="no-data"
    icon={Calendar as any}
    title="No reservations found"
    description="Get started by creating your first court reservation."
    action={
      onCreateNew
        ? {
            label: 'Create Reservation',
            onClick: onCreateNew,
          }
        : undefined
    }
  />
);

export const NoPlayers: React.FC<{ onAddPlayer?: () => void }> = ({
  onAddPlayer,
}) => (
  <EmptyState
    type="no-data"
    icon={Users as any}
    title="No players found"
    description="Add players to start tracking their performance and statistics."
    action={
      onAddPlayer
        ? {
            label: 'Add Player',
            onClick: onAddPlayer,
          }
        : undefined
    }
  />
);

export const SearchResults: React.FC<{
  query: string;
  onClearSearch?: () => void;
}> = ({ query, onClearSearch }) => (
  <EmptyState
    type="search"
    title="No results found"
    description={`We could not find anything matching "${query}". Try adjusting your search terms.`}
    action={
      onClearSearch
        ? {
            label: 'Clear Search',
            onClick: onClearSearch,
            variant: 'secondary',
          }
        : undefined
    }
  />
);

export const OfflineState: React.FC<{ onRetry?: () => void }> = ({
  onRetry,
}) => (
  <EmptyState
    type="offline"
    title="You're offline"
    description="Check your internet connection and try again."
    action={
      onRetry
        ? {
            label: 'Retry',
            onClick: onRetry,
          }
        : undefined
    }
  />
);

export const ErrorState: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = 'Something went wrong. Please try again.' }) => (
  <EmptyState
    type="error"
    title="Unable to load data"
    description={message}
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
          }
        : undefined
    }
  />
);
