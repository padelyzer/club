'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Card } from './Card';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  Building2,
  Target,
  TrendingUp,
  Settings,
  CreditCard,
  Trophy,
  BarChart3,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  subItems?: NavigationItem[];
  color?: string;
}

interface ProfessionalSidebarProps {
  clubSlug?: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

/**
 * Professional Sidebar Component
 * Modern, Apple-inspired sidebar with glassmorphism and smooth animations
 */
export const ProfessionalSidebar: React.FC<ProfessionalSidebarProps> = ({
  clubSlug,
  user,
  collapsed = false,
  onCollapsedChange,
  className,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Default navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: clubSlug ? `/es/${clubSlug}` : '/dashboard',
      icon: <Home className="w-5 h-5" />,
      color: 'text-[#007AFF]',
    },
    {
      id: 'reservations',
      label: 'Reservas',
      href: clubSlug ? `/es/${clubSlug}/reservations` : '/reservations',
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-green-600',
      badge: '12',
    },
    {
      id: 'clients',
      label: 'Clientes',
      href: clubSlug ? `/es/${clubSlug}/clients` : '/clients',
      icon: <Users className="w-5 h-5" />,
      color: 'text-purple-600',
    },
    {
      id: 'courts',
      label: 'Canchas',
      href: clubSlug ? `/es/${clubSlug}/courts` : '/courts',
      icon: <Target className="w-5 h-5" />,
      color: 'text-amber-600',
    },
    {
      id: 'analytics',
      label: 'Análisis',
      href: clubSlug ? `/es/${clubSlug}/analytics` : '/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-indigo-600',
    },
    {
      id: 'tournaments',
      label: 'Torneos',
      href: clubSlug ? `/es/${clubSlug}/tournaments` : '/tournaments',
      icon: <Trophy className="w-5 h-5" />,
      color: 'text-yellow-600',
    },
    {
      id: 'finance',
      label: 'Finanzas',
      href: clubSlug ? `/es/${clubSlug}/finance` : '/finance',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-red-600',
      subItems: [
        {
          id: 'finance-dashboard',
          label: 'Dashboard',
          href: clubSlug ? `/es/${clubSlug}/finance/dashboard` : '/finance/dashboard',
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          id: 'finance-payments',
          label: 'Pagos',
          href: clubSlug ? `/es/${clubSlug}/finance/payments` : '/finance/payments',
          icon: <CreditCard className="w-4 h-4" />,
        },
      ],
    },
    {
      id: 'settings',
      label: 'Configuración',
      href: clubSlug ? `/es/${clubSlug}/settings` : '/settings',
      icon: <Settings className="w-5 h-5" />,
      color: 'text-gray-600',
    },
  ];

  const isItemActive = (item: NavigationItem) => {
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'h-screen bg-white/80 backdrop-blur-xl border-r border-white/20 flex flex-col shadow-xl',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Padelyzer</h2>
                <p className="text-xs text-gray-600">Dashboard Pro</p>
              </div>
            </motion.div>
          )}
          
          {collapsed && (
            <div className="mx-auto">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          )}

          {onCollapsedChange && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!collapsed)}
              className="h-8 w-8 hover:bg-white/60"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {!collapsed && (
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-sm border border-white/20 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.id}>
              {/* Main Item */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => {
                    if (item.subItems && !collapsed) {
                      toggleExpand(item.id);
                    } else {
                      handleNavigation(item.href);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                    isItemActive(item)
                      ? 'bg-gradient-to-r from-[#007AFF]/10 to-[#007AFF]/5 text-[#007AFF] shadow-lg'
                      : 'hover:bg-white/60 text-gray-700',
                    collapsed && 'justify-center'
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 transition-colors',
                    isItemActive(item) ? item.color || 'text-[#007AFF]' : 'text-gray-500 group-hover:text-gray-700'
                  )}>
                    {item.icon}
                  </div>

                  {/* Label and Badge */}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium truncate">
                        {item.label}
                      </span>
                      
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                      
                      {item.subItems && (
                        <motion.div
                          animate={{ rotate: expandedItems.has(item.id) ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Active Indicator */}
                  {isItemActive(item) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#007AFF] rounded-l-full"
                    />
                  )}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              </motion.div>

              {/* Sub Items */}
              <AnimatePresence>
                {!collapsed && item.subItems && expandedItems.has(item.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-6 mt-1 space-y-1 overflow-hidden"
                  >
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.href)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                          isItemActive(subItem)
                            ? 'bg-[#007AFF]/5 text-[#007AFF]'
                            : 'hover:bg-white/40 text-gray-600'
                        )}
                      >
                        <div className="flex-shrink-0 text-gray-400">
                          {subItem.icon}
                        </div>
                        <span className="truncate">{subItem.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Quick Actions */}
        {!collapsed && (
          <div className="mt-8 pt-4 border-t border-white/10">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Acciones Rápidas
            </h3>
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                leftIcon={<Zap className="w-4 h-4" />}
                className="justify-start"
              >
                Nueva Reserva
              </Button>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                leftIcon={<Users className="w-4 h-4" />}
                className="justify-start"
              >
                Agregar Cliente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-lg">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {user?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {user?.role || 'Administrador'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-lg">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserCircle className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfessionalSidebar;