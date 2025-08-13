'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Users, 
  Calendar,
  ShoppingCart,
  Inbox,
  FolderOpen,
  Database,
  Wifi,
  AlertCircle,
  Plus,
  Upload,
  RefreshCw,
  Filter,
  Settings,
  MessageSquare,
  Trophy,
  CreditCard,
  Building,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  animate?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  animate = true,
}: EmptyStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="mb-4">
          {typeof Icon === 'function' ? (
            <Icon className="h-12 w-12 text-gray-400 dark:text-gray-600" />
          ) : (
            Icon
          )}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Predefined empty states for common scenarios
export const EmptyStates = {
  // Search & Filters
  NoSearchResults: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={{
        label: "Clear filters",
        onClick: () => {},
        icon: RefreshCw,
      }}
      {...props}
    />
  ),

  // Data & Content
  NoData: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Database}
      title="No data available"
      description="There's no data to display at the moment. Start by adding some content."
      action={{
        label: "Add data",
        onClick: () => {},
        icon: Plus,
      }}
      {...props}
    />
  ),

  NoDocuments: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={FileText}
      title="No documents yet"
      description="Upload your first document to get started."
      action={{
        label: "Upload document",
        onClick: () => {},
        icon: Upload,
      }}
      {...props}
    />
  ),

  EmptyFolder: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={FolderOpen}
      title="This folder is empty"
      description="Add files to this folder to see them here."
      action={{
        label: "Upload files",
        onClick: () => {},
        icon: Upload,
      }}
      {...props}
    />
  ),

  // Communication
  NoMessages: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={MessageSquare}
      title="No messages"
      description="When you receive messages, they'll appear here."
      {...props}
    />
  ),

  NoNotifications: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Inbox}
      title="All caught up!"
      description="You don&apos;t have any notifications right now."
      {...props}
    />
  ),

  // Users & Teams
  NoUsers: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Users}
      title="No users found"
      description="Invite team members to collaborate on your project."
      action={{
        label: "Invite users",
        onClick: () => {},
        icon: Plus,
      }}
      {...props}
    />
  ),

  // Calendar & Events
  NoEvents: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Calendar}
      title="No upcoming events"
      description="Your calendar is clear. Schedule an event to get started."
      action={{
        label: "Create event",
        onClick: () => {},
        icon: Plus,
      }}
      {...props}
    />
  ),

  // E-commerce
  EmptyCart: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={ShoppingCart}
      title="Your cart is empty"
      description="Add items to your cart to see them here."
      action={{
        label: "Continue shopping",
        onClick: () => {},
      }}
      {...props}
    />
  ),

  NoOrders: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={ShoppingCart}
      title="No orders yet"
      description="When you place an order, it will appear here."
      action={{
        label: "Start shopping",
        onClick: () => {},
      }}
      {...props}
    />
  ),

  // Sports & Activities
  NoReservations: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Calendar}
      title="No reservations"
      description="You haven't made any court reservations yet."
      action={{
        label: "Book a court",
        onClick: () => {},
        icon: Plus,
      }}
      {...props}
    />
  ),

  NoTournaments: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Trophy}
      title="No tournaments available"
      description="Check back later for upcoming tournaments."
      secondaryAction={{
        label: "View past tournaments",
        onClick: () => {},
      }}
      {...props}
    />
  ),

  NoClubs: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Building}
      title="No clubs found"
      description="Join a club to start playing and meet other players."
      action={{
        label: "Find clubs",
        onClick: () => {},
        icon: Search,
      }}
      {...props}
    />
  ),

  // Payments & Finance
  NoPayments: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={CreditCard}
      title="No payment history"
      description="Your payment transactions will appear here."
      {...props}
    />
  ),

  // Errors & Issues
  ConnectionError: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Wifi}
      title="Connection error"
      description="Unable to connect to the server. Please check your internet connection."
      action={{
        label: "Retry",
        onClick: () => {},
        icon: RefreshCw,
      }}
      {...props}
    />
  ),

  PermissionDenied: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={AlertCircle}
      title="Access denied"
      description="You don&apos;t have permission to view this content."
      action={{
        label: "Request access",
        onClick: () => {},
      }}
      {...props}
    />
  ),

  // Settings & Configuration
  NoSettings: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Settings}
      title="No settings configured"
      description="Configure your preferences to personalize your experience."
      action={{
        label: "Configure settings",
        onClick: () => {},
        icon: Settings,
      }}
      {...props}
    />
  ),

  // Filters
  NoFilterResults: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Filter}
      title="No matches found"
      description="No items match the current filters. Try adjusting your criteria."
      action={{
        label: "Clear all filters",
        onClick: () => {},
        icon: RefreshCw,
      }}
      secondaryAction={{
        label: "Adjust filters",
        onClick: () => {},
        icon: Filter,
      }}
      {...props}
    />
  ),
};

// Illustrated empty state component
export function IllustratedEmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: {
  illustration: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateProps['action'];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      <div className="mb-8 w-64 h-64">
        {illustration}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} size="default">
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// Empty state with stats
export function EmptyStateWithStats({
  icon: Icon,
  title,
  stats,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  stats: Array<{ label: string; value: string | number }>;
  action?: EmptyStateProps['action'];
  className?: string;
}) {
  return (
    <div className={cn('py-12 px-4', className)}>
      <div className="text-center mb-8">
        {Icon && (
          <Icon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      
      {action && (
        <div className="text-center">
          <Button onClick={action.onClick}>
            {action.icon && <action.icon className="h-4 w-4 mr-2" />}
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}