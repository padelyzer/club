import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ProfessionalSidebar, createDefaultNavigation, NavigationItem } from './ProfessionalSidebar';
import { ProfessionalTopNavigation } from './ProfessionalTopNavigation';
import { ProfessionalBreadcrumbs } from './ProfessionalBreadcrumbs';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

interface ProfessionalNavigationLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  breadcrumbs?: BreadcrumbItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  notifications?: Notification[];
  quickActions?: QuickAction[];
  navigation?: NavigationItem[];
  
  // Navigation handlers
  onNavigate?: (item: NavigationItem | BreadcrumbItem) => void;
  onSearch?: (query: string) => void;
  onNotificationClick?: (notification: Notification) => void;
  onNotificationMarkRead?: (notificationId: string) => void;
  onNotificationMarkAllRead?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  onToggleLanguage?: () => void;
  
  // Layout options
  theme?: 'light' | 'dark';
  language?: string;
  showSearch?: boolean;
  showBreadcrumbs?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: (collapsed: boolean) => void;
  
  className?: string;
}

export const ProfessionalNavigationLayout = memo<ProfessionalNavigationLayoutProps>(({
  children,
  currentRoute,
  breadcrumbs = [],
  user,
  notifications = [],
  quickActions = [],
  navigation,
  onNavigate,
  onSearch,
  onNotificationClick,
  onNotificationMarkRead,
  onNotificationMarkAllRead,
  onProfileClick,
  onSettingsClick,
  onLogout,
  onToggleTheme,
  onToggleLanguage,
  theme = 'light',
  language = 'en',
  showSearch = true,
  showBreadcrumbs = true,
  sidebarCollapsed: controlledCollapsed,
  onSidebarToggle,
  className
}) => {
  const { t } = useTranslation();
  const { isClient, isDesktop } = useResponsive();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Use controlled or internal state for sidebar collapse
  const sidebarCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  
  const handleSidebarToggle = (collapsed: boolean) => {
    if (onSidebarToggle) {
      onSidebarToggle(collapsed);
    } else {
      setInternalCollapsed(collapsed);
    }
  };

  // Create navigation items if not provided
  const navigationItems = navigation || createDefaultNavigation(currentRoute);

  // Close mobile sidebar on navigation
  const handleNavigate = (item: NavigationItem | BreadcrumbItem) => {
    setShowMobileSidebar(false);
    onNavigate?.(item);
  };

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMobileSidebar) {
        setShowMobileSidebar(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMobileSidebar]);

  // Handle resize to close mobile sidebar on larger screens
  useEffect(() => {
    if (isDesktop && showMobileSidebar) {
      setShowMobileSidebar(false);
    }
  }, [isDesktop, showMobileSidebar]);

  const sidebarWidth = sidebarCollapsed ? 80 : 280;

  return (
    <div className={cn('min-h-screen bg-gray-50/50', className)}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ProfessionalSidebar
          navigation={navigationItems}
          collapsed={sidebarCollapsed}
          onCollapse={handleSidebarToggle}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          user={user}
          notifications={notifications.filter(n => !n.read).length}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 h-full w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <ProfessionalSidebar
                navigation={navigationItems}
                collapsed={false}
                onNavigate={handleNavigate}
                onLogout={onLogout}
                user={user}
                notifications={notifications.filter(n => !n.read).length}
                className="w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div 
        className={cn(
          'transition-all duration-300 ease-in-out',
          'lg:ml-0',
          `lg:pl-[${sidebarWidth}px]`
        )}
        style={{
          paddingLeft: isClient && isDesktop ? `${sidebarWidth}px` : undefined
        }}
      >
        {/* Top Navigation */}
        <ProfessionalTopNavigation
          user={user}
          notifications={notifications}
          quickActions={quickActions}
          onSearch={onSearch}
          onNotificationClick={onNotificationClick}
          onNotificationMarkRead={onNotificationMarkRead}
          onNotificationMarkAllRead={onNotificationMarkAllRead}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          onLogout={onLogout}
          onToggleTheme={onToggleTheme}
          onToggleLanguage={onToggleLanguage}
          theme={theme}
          language={language}
          onMenuToggle={() => setShowMobileSidebar(true)}
          showSearch={showSearch}
        />

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200/50 bg-white/50">
            <ProfessionalBreadcrumbs
              items={breadcrumbs}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 sm:px-6 lg:px-8 py-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.currentRoute === nextProps.currentRoute &&
    prevProps.sidebarCollapsed === nextProps.sidebarCollapsed &&
    prevProps.theme === nextProps.theme &&
    prevProps.language === nextProps.language &&
    prevProps.showSearch === nextProps.showSearch &&
    prevProps.showBreadcrumbs === nextProps.showBreadcrumbs &&
    prevProps.user?.name === nextProps.user?.name &&
    prevProps.notifications?.length === nextProps.notifications?.length &&
    JSON.stringify(prevProps.breadcrumbs?.map(b => b.id)) === JSON.stringify(nextProps.breadcrumbs?.map(b => b.id))
  );
});

ProfessionalNavigationLayout.displayName = 'ProfessionalNavigationLayout';

export default ProfessionalNavigationLayout;