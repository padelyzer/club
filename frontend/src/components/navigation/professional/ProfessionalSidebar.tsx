import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home,
  Calendar,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Trophy,
  UserCheck,
  MapPin,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';
import { professionalDesignSystem } from '@/styles/professional-design-system';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
  children?: NavigationItem[];
  active?: boolean;
  disabled?: boolean;
}

interface ProfessionalSidebarProps {
  navigation: NavigationItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onNavigate?: (item: NavigationItem) => void;
  onLogout?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  notifications?: number;
  className?: string;
}

export const ProfessionalSidebar = memo<ProfessionalSidebarProps>(({
  navigation,
  collapsed = false,
  onCollapse,
  onNavigate,
  onLogout,
  user,
  notifications = 0,
  className
}) => {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const sidebarVariants = {
    expanded: {
      width: 280,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    collapsed: {
      width: 80,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        delay: 0.1
      }
    },
    collapsed: {
      opacity: 0,
      x: -10,
      transition: {
        duration: 0.2
      }
    }
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const hasNotification = item.badge !== undefined;

    return (
      <div key={item.id} className="space-y-1">
        <motion.div
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant={item.active ? "primary" : "ghost"}
            size="sm"
            onClick={() => {
              if (hasChildren && !collapsed) {
                toggleExpanded(item.id);
              } else {
                onNavigate?.(item);
              }
            }}
            disabled={item.disabled}
            className={cn(
              'w-full justify-start gap-3 h-12 px-3',
              level > 0 && 'ml-6 h-10',
              collapsed && 'justify-center px-0',
              item.active && 'bg-blue-50/80 border-blue-200/50 text-blue-700 shadow-sm',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="relative shrink-0">
              <item.icon className={cn(
                'w-5 h-5',
                item.active ? 'text-blue-600' : 'text-gray-600'
              )} />
              
              {hasNotification && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                  </span>
                </div>
              )}
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="flex-1 flex items-center justify-between min-w-0"
                >
                  <span className={cn(
                    'font-medium truncate',
                    item.active ? 'text-blue-700' : 'text-gray-700'
                  )}>
                    {item.label}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasNotification && !hasChildren && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-xs font-medium rounded-full',
                        item.active 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {item.badge}
                      </span>
                    )}

                    {hasChildren && (
                      <ChevronDown className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isExpanded ? 'rotate-180' : 'rotate-0',
                        item.active ? 'text-blue-600' : 'text-gray-400'
                      )} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        {/* Submenu */}
        <AnimatePresence>
          {hasChildren && isExpanded && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: 1, 
                height: 'auto',
                transition: {
                  duration: 0.2,
                  ease: 'easeOut'
                }
              }}
              exit={{ 
                opacity: 0, 
                height: 0,
                transition: {
                  duration: 0.2,
                  ease: 'easeIn'
                }
              }}
              className="overflow-hidden"
            >
              <div className="space-y-1 mt-1">
                {item.children?.map(child => renderNavigationItem(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      variants={sidebarVariants}
      initial={collapsed ? "collapsed" : "expanded"}
      animate={collapsed ? "collapsed" : "expanded"}
      className={cn(
        'fixed left-0 top-0 h-full z-50',
        'bg-white/95 backdrop-blur-xl border-r border-gray-200/50',
        'shadow-xl shadow-black/5',
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">
                      Padelyzer
                    </h1>
                    <p className="text-xs text-gray-500">
                      {t('navigation.tagline')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCollapse?.(!collapsed)}
              className={cn(
                'shrink-0',
                collapsed && 'mx-auto'
              )}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-2">
            {navigation.map(item => renderNavigationItem(item))}
          </nav>
        </div>

        {/* User Section */}
        {user && (
          <div className="p-4 border-t border-gray-200/50">
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-xl',
              'bg-gray-50/80 backdrop-blur-sm border border-white/50',
              collapsed && 'justify-center'
            )}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {notifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    variants={contentVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.role || user.email}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {!collapsed && onLogout && (
                  <motion.div
                    variants={contentVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      className="shrink-0 text-gray-500 hover:text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.collapsed === nextProps.collapsed &&
    prevProps.notifications === nextProps.notifications &&
    prevProps.user?.name === nextProps.user?.name &&
    JSON.stringify(prevProps.navigation.map(n => ({ 
      id: n.id, 
      active: n.active, 
      badge: n.badge 
    }))) === JSON.stringify(nextProps.navigation.map(n => ({ 
      id: n.id, 
      active: n.active, 
      badge: n.badge 
    })))
  );
});

ProfessionalSidebar.displayName = 'ProfessionalSidebar';

// Predefined navigation structure
export const createDefaultNavigation = (activeRoute?: string): NavigationItem[] => {
  const { t } = useTranslation();
  
  return [
    {
      id: 'dashboard',
      label: t('navigation.dashboard'),
      icon: Home,
      href: '/dashboard',
      active: activeRoute === '/dashboard'
    },
    {
      id: 'reservations',
      label: t('navigation.reservations'),
      icon: Calendar,
      href: '/reservations',
      active: activeRoute?.startsWith('/reservations'),
      children: [
        {
          id: 'reservations-calendar',
          label: t('navigation.calendar'),
          icon: Calendar,
          href: '/reservations/calendar',
          active: activeRoute === '/reservations/calendar'
        },
        {
          id: 'reservations-list',
          label: t('navigation.allReservations'),
          icon: Clock,
          href: '/reservations/list',
          active: activeRoute === '/reservations/list'
        }
      ]
    },
    {
      id: 'clients',
      label: t('navigation.clients'),
      icon: Users,
      href: '/clients',
      active: activeRoute?.startsWith('/clients'),
      children: [
        {
          id: 'clients-active',
          label: t('navigation.activeMembers'),
          icon: UserCheck,
          href: '/clients/active',
          active: activeRoute === '/clients/active'
        },
        {
          id: 'clients-all',
          label: t('navigation.allClients'),
          icon: Users,
          href: '/clients/all',
          active: activeRoute === '/clients/all'
        }
      ]
    },
    {
      id: 'clubs',
      label: t('navigation.clubs'),
      icon: Building2,
      href: '/clubs',
      active: activeRoute?.startsWith('/clubs'),
      children: [
        {
          id: 'clubs-my',
          label: t('navigation.myClub'),
          icon: MapPin,
          href: '/clubs/my',
          active: activeRoute === '/clubs/my'
        },
        {
          id: 'clubs-all',
          label: t('navigation.allClubs'),
          icon: Building2,
          href: '/clubs/all',
          active: activeRoute === '/clubs/all'
        }
      ]
    },
    {
      id: 'tournaments',
      label: t('navigation.tournaments'),
      icon: Trophy,
      href: '/tournaments',
      active: activeRoute?.startsWith('/tournaments')
    },
    {
      id: 'finance',
      label: t('navigation.finance'),
      icon: CreditCard,
      href: '/finance',
      active: activeRoute?.startsWith('/finance')
    },
    {
      id: 'analytics',
      label: t('navigation.analytics'),
      icon: BarChart3,
      href: '/analytics',
      active: activeRoute?.startsWith('/analytics')
    },
    {
      id: 'settings',
      label: t('navigation.settings'),
      icon: Settings,
      href: '/settings',
      active: activeRoute?.startsWith('/settings')
    },
    {
      id: 'help',
      label: t('navigation.help'),
      icon: HelpCircle,
      href: '/help',
      active: activeRoute?.startsWith('/help')
    }
  ];
};

export default ProfessionalSidebar;