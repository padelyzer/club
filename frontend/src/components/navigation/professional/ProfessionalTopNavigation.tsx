import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  Bell,
  Plus,
  Settings,
  User,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  Globe,
  HelpCircle,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/professional/Input';
import { Card } from '@/components/ui/professional/Card';
import { cn } from '@/lib/utils';

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

interface ProfessionalTopNavigationProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  notifications?: Notification[];
  quickActions?: QuickAction[];
  onSearch?: (query: string) => void;
  onNotificationClick?: (notification: Notification) => void;
  onNotificationMarkRead?: (notificationId: string) => void;
  onNotificationMarkAllRead?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  onToggleLanguage?: () => void;
  theme?: 'light' | 'dark';
  language?: string;
  onMenuToggle?: () => void;
  showSearch?: boolean;
  className?: string;
}

export const ProfessionalTopNavigation = memo<ProfessionalTopNavigationProps>(({
  user,
  notifications = [],
  quickActions = [],
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
  onMenuToggle,
  showSearch = true,
  className
}) => {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadNotifications = notifications.filter(n => !n.read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📩';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'warning':
        return 'border-l-amber-500 bg-amber-50/50';
      case 'error':
        return 'border-l-red-500 bg-red-50/50';
      default:
        return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-gray-200/50',
        'shadow-sm shadow-black/5',
        className
      )}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo (mobile) */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Padelyzer
              </span>
            </div>
          </div>

          {/* Center Section - Search */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <Input
                variant="filled"
                placeholder={t('navigation.searchPlaceholder')}
                value={searchQuery}
                onChange={handleSearchChange}
                leftIcon={<Search className="w-4 h-4" />}
                className="w-full"
              />
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="hidden sm:flex"
                >
                  <Plus className="w-4 h-4" />
                </Button>

                <AnimatePresence>
                  {showQuickActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 z-50"
                    >
                      <Card variant="white" padding="sm" className="shadow-xl border border-gray-200/50">
                        <div className="space-y-1">
                          {quickActions.map((action) => (
                            <Button
                              key={action.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                action.onClick();
                                setShowQuickActions(false);
                              }}
                              className="w-full justify-start gap-3"
                            >
                              <action.icon className="w-4 h-4" />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Theme Toggle */}
            {onToggleTheme && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTheme}
                className="hidden sm:flex"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                  </span>
                )}
              </Button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 max-h-96 z-50"
                  >
                    <Card variant="white" padding="none" className="shadow-xl border border-gray-200/50">
                      {/* Header */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {t('navigation.notifications')}
                          </h3>
                          {unreadNotifications.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onNotificationMarkAllRead}
                              className="text-xs"
                            >
                              {t('navigation.markAllRead')}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">{t('navigation.noNotifications')}</p>
                          </div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {notifications.map((notification) => (
                              <motion.div
                                key={notification.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                  onNotificationClick?.(notification);
                                  if (!notification.read) {
                                    onNotificationMarkRead?.(notification.id);
                                  }
                                }}
                                className={cn(
                                  'p-3 rounded-lg cursor-pointer transition-colors',
                                  'border-l-4 border-l-transparent',
                                  getNotificationColor(notification.type),
                                  !notification.read && 'bg-blue-50/30 border-l-blue-500'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-lg">
                                    {getNotificationIcon(notification.type)}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      'text-sm font-medium text-gray-900',
                                      !notification.read && 'font-semibold'
                                    )}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {new Date(notification.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            {user && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name.split(' ')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.role}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </Button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-56 z-50"
                    >
                      <Card variant="white" padding="sm" className="shadow-xl border border-gray-200/50">
                        {/* User Info */}
                        <div className="p-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.email}
                          </p>
                        </div>

                        {/* Menu Items */}
                        <div className="space-y-1 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onProfileClick?.();
                              setShowUserMenu(false);
                            }}
                            className="w-full justify-start gap-3"
                          >
                            <User className="w-4 h-4" />
                            {t('navigation.profile')}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onSettingsClick?.();
                              setShowUserMenu(false);
                            }}
                            className="w-full justify-start gap-3"
                          >
                            <Settings className="w-4 h-4" />
                            {t('navigation.settings')}
                          </Button>

                          {onToggleLanguage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onToggleLanguage();
                                setShowUserMenu(false);
                              }}
                              className="w-full justify-start gap-3"
                            >
                              <Globe className="w-4 h-4" />
                              {t('navigation.language')} ({language.toUpperCase()})
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowUserMenu(false);
                            }}
                            className="w-full justify-start gap-3"
                          >
                            <HelpCircle className="w-4 h-4" />
                            {t('navigation.help')}
                          </Button>

                          <div className="border-t border-gray-100 my-2" />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onLogout?.();
                              setShowUserMenu(false);
                            }}
                            className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                            {t('navigation.logout')}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {showSearch && (
        <div className="px-4 pb-4 md:hidden">
          <Input
            variant="filled"
            placeholder={t('navigation.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>
      )}
    </motion.header>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.theme === nextProps.theme &&
    prevProps.language === nextProps.language &&
    prevProps.showSearch === nextProps.showSearch &&
    prevProps.user?.name === nextProps.user?.name &&
    prevProps.notifications?.length === nextProps.notifications?.length &&
    JSON.stringify(prevProps.quickActions?.map(q => q.id)) === JSON.stringify(nextProps.quickActions?.map(q => q.id))
  );
});

ProfessionalTopNavigation.displayName = 'ProfessionalTopNavigation';

export default ProfessionalTopNavigation;