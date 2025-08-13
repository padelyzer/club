'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Database,
  Building,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Home,
} from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { AuthService } from '@/lib/api/services/auth.service';
import { cn } from '@/lib/utils';
import { Typography, CaptionSM } from '@/components/ui/typography';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// ROOT-ONLY Navigation
const rootNavigation: NavItem[] = [
  {
    name: 'ROOT Dashboard',
    href: '/root',
    icon: Database,
  },
  {
    name: 'Organizations',
    href: '/root/organizations',
    icon: Building,
  },
  {
    name: 'System Analytics',
    href: '/root/analytics',
    icon: BarChart3,
  },
  {
    name: 'System Config',
    href: '/root/system-config',
    icon: Settings,
  },
];

// ROOT Admin Tools
const rootTools: NavItem[] = [
  {
    name: 'Audit Logs',
    href: '/root/audit',
    icon: Shield,
  },
  {
    name: 'System Health',
    href: '/root/health',
    icon: Shield,
  },
];

export const RootSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  
  // Extract locale from pathname
  const locale = pathname.split('/')[1] || 'es';

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
            AuthService.clearAuthTokens();
      window.location.href = '/es/login';
    }
  };

  const handleExitRoot = () => {
    // Exit ROOT mode and go to regular dashboard
    router.push(`/${locale}/dashboard`);
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-white text-gray-900 shadow-lg transition-all duration-300 border-r border-gray-200',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ROOT Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-red-200 bg-red-50">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-red-600" />
            <Typography variant="headline-sm" className="text-red-600 font-bold">
              ROOT ADMIN
            </Typography>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-red-100 transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Warning Banner */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200">
          <CaptionSM className="text-red-700">
            Sistema de administración ROOT. Acceso restringido.
          </CaptionSM>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {rootNavigation.map((item) => {
            const localizedHref = `/${locale}${item.href}`;
            const isActive = pathname === localizedHref || 
              pathname.startsWith(localizedHref + '/');

            return (
              <li key={item.name}>
                <Link
                  href={localizedHref}
                  className={cn(
                    'group relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    'hover:bg-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white',
                    isActive
                      ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                      : 'text-gray-600'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive
                        ? 'text-red-600'
                        : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />

                  {!sidebarCollapsed && (
                    <Typography variant="ui-md" className="ml-3 flex-1">
                      {item.name}
                    </Typography>
                  )}

                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-16 top-0 z-50 hidden group-hover:block">
                      <div className="px-3 py-1 bg-gray-900 rounded-lg shadow-lg whitespace-nowrap">
                        <CaptionSM className="text-white">
                          {item.name}
                        </CaptionSM>
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ROOT Tools Section */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          {!sidebarCollapsed && (
            <CaptionSM className="px-3 text-gray-500 uppercase">
              Herramientas ROOT
            </CaptionSM>
          )}
          <ul className="mt-2 space-y-1">
            {rootTools.map((item) => {
              const localizedHref = `/${locale}${item.href}`;
              const isActive = pathname === localizedHref;

              return (
                <li key={item.name}>
                  <Link
                    href={localizedHref}
                    className={cn(
                      'group relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                      'hover:bg-gray-100',
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600'
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <Typography variant="ui-sm" className="ml-3 flex-1">
                        {item.name}
                      </Typography>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* User Actions Section */}
      <div className="border-t border-gray-200 p-3 space-y-2">
        {/* Exit ROOT Mode Button */}
        <button
          onClick={handleExitRoot}
          className={cn(
            "w-full flex items-center text-sm font-medium rounded-lg transition-colors",
            "px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700",
            sidebarCollapsed && "justify-center"
          )}
          title="Salir del modo ROOT"
        >
          <Home className="h-4 w-4" />
          {!sidebarCollapsed && <span className="ml-3">Salir de ROOT</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center text-sm font-medium rounded-lg transition-colors",
            "px-3 py-2 hover:bg-red-50 text-red-600",
            sidebarCollapsed && "justify-center"
          )}
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          {!sidebarCollapsed && <span className="ml-3">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
};