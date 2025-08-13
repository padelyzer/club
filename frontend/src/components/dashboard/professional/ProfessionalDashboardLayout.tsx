import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/professional/Input';
import { cn } from '@/lib/utils';
import { professionalDesignSystem } from '@/styles/professional-design-system';

interface ProfessionalDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  notifications?: number;
  onSearch?: (query: string) => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  className?: string;
}

export const ProfessionalDashboardLayout = memo<ProfessionalDashboardLayoutProps>(({
  children,
  title = 'Dashboard',
  subtitle,
  user,
  notifications = 0,
  onSearch,
  onNotifications,
  onSettings,
  className
}) => {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 to-gray-100', className)}>
      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-gray-200/50"
      >
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Center section - Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <Input
                variant="filled"
                placeholder={t('dashboard.searchPlaceholder')}
                leftIcon={<Search className="w-4 h-4" />}
                onChange={(e) => onSearch?.(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {/* Quick Actions */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNotifications}
                  className="relative"
                >
                  <Bell className="w-4 h-4" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#007AFF] text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  )}
                </Button>
              </div>

              {/* User Menu */}
              {user && (
                <div className="flex items-center gap-3 ml-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    {user.role && (
                      <p className="text-xs text-gray-500">
                        {user.role}
                      </p>
                    )}
                  </div>

                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center">
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
                </div>
              )}

              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.navigation')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Navigation Menu */}
              <nav className="space-y-2">
                {[
                  { icon: BarChart3, label: t('dashboard.analytics'), href: '/analytics' },
                  { icon: Calendar, label: t('dashboard.schedule'), href: '/schedule' },
                  { icon: Users, label: t('dashboard.members'), href: '/members' },
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
});

ProfessionalDashboardLayout.displayName = 'ProfessionalDashboardLayout';

export default ProfessionalDashboardLayout;