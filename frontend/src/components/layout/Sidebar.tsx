'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Calendar,
  Users,
  BarChart3,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Building,
  MapPin,
  GraduationCap,
  CreditCard,
  Shield,
  Target,
  Database,
} from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { useActiveClubStore } from '@/store/clubs';
import { AuthService } from '@/lib/api/services/auth.service';
// import { useNavigationAccess } from '@/lib/rbac/hooks';
// import { NavigationPermissions } from '@/lib/rbac/permissions';
import { cn } from '@/lib/utils';
import { Typography, CaptionSM, Body } from '@/components/ui/typography';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  submenu?: NavItem[];
  // permission?: keyof typeof NavigationPermissions;
}

// Spanish translations for navigation items
const navigationTranslations = {
  Dashboard: 'Panel',
  Reservations: 'Reservas',
  Clients: 'Clientes',
  Clubs: 'Clubes',
  'My Club': 'Mi Club',
  Courts: 'Canchas',
  Leagues: 'Ligas',
  Tournaments: 'Torneos',
  Classes: 'Clases',
  Finance: 'Finanzas',
  Analytics: 'Analíticas',
  'System Config': 'Configuración',
  Profile: 'Perfil',
  'ROOT Admin': 'Admin ROOT',
};

// Navigation for ROOT/SUPERUSER - COMPLETELY ISOLATED
const rootNavigation: NavItem[] = [
  {
    name: 'ROOT Dashboard',
    href: '/root',  // Stay within ROOT context
    icon: Database,
  },
  {
    name: 'Clubs Manager',
    href: '/root/clubmngr',
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
  {
    name: 'ROOT Profile',
    href: '/root/profile',  // ROOT-specific profile
    icon: Shield,
  },
];

// Navigation for Club Admin/Staff (base paths, will be prefixed with club slug)
const clubNavigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '', // Will be /{club-slug}
    icon: Home,
  },
  {
    name: 'Reservations',
    href: '/reservations',
    icon: Calendar,
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    name: 'Courts',
    href: '/courts',
    icon: MapPin,
  },
  {
    name: 'Leagues',
    href: '/leagues',
    icon: Target,
  },
  {
    name: 'Tournaments',
    href: '/tournaments',
    icon: Trophy,
  },
  {
    name: 'Classes',
    href: '/classes',
    icon: GraduationCap,
  },
  {
    name: 'Finance',
    href: '/finance',
    icon: CreditCard,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Function to get navigation - STRICTLY SEPARATED by context
const getNavigationByRole = (user: any, pathname: string): NavItem[] => {
  const pathSegments = pathname.split('/');
  const isRootPath = pathSegments.includes('root');
  
  // STRICT SEPARATION: If in ROOT path, ONLY show ROOT navigation
  if (isRootPath) {
    // Only superusers/staff can see ROOT navigation
    if (user?.is_superuser || user?.is_staff) {
      return rootNavigation;
    } else {
      // Non-root users shouldn&apos;t be here, return empty
      return [];
    }
  }
  
  // If NOT in ROOT path, show club navigation
  // This ensures complete separation
  return clubNavigation;
};

// Create a separate component for navigation items to handle permissions
const NavigationItem: React.FC<{
  item: NavItem;
  pathname: string;
  sidebarCollapsed: boolean;
  clubSlug?: string;
}> = ({ item, pathname, sidebarCollapsed, clubSlug }) => {
  // Temporarily disable permission checks to show all menu items
  // const hasAccess = item.permission ? useNavigationAccess(item.permission) : true;
  // if (!hasAccess) {
  //   return null;
  // }
  const hasAccess = true; // Show all menu items for now

  // Extract locale from pathname
  const locale = pathname.split('/')[1] || 'es';
  
  // Build the href based on context
  let localizedHref: string;
  if (clubSlug) {
    // For club context, prefix with club slug
    localizedHref = `/${locale}/${clubSlug}${item.href}`;
  } else {
    // For root/general context
    localizedHref = `/${locale}${item.href}`;
  }

  // Check if active
  const isActive = pathname === localizedHref || 
    (item.href && pathname.startsWith(localizedHref + '/'));

  // Get translated name (default to original name if translation not found)
  const displayName =
    locale === 'es'
      ? navigationTranslations[
          item.name as keyof typeof navigationTranslations
        ] || item.name
      : item.name;

  return (
    <li>
      <Link
        href={localizedHref}
        className={cn(
          'group relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
            : 'text-gray-600 dark:text-gray-300'
        )}
      >
        <item.icon
          className={cn(
            'h-5 w-5 flex-shrink-0 transition-colors',
            isActive
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
          )}
        />

        {!sidebarCollapsed && (
          <>
            <Typography variant="ui-md" className="ml-3 flex-1">
              {displayName}
            </Typography>
            {item.badge && (
              <CaptionSM className="ml-3 inline-flex items-center justify-center px-2 py-1 leading-none text-white bg-red-500 rounded-full">
                {item.badge}
              </CaptionSM>
            )}
          </>
        )}

        {/* Tooltip for collapsed state */}
        {sidebarCollapsed && (
          <div className="absolute left-16 top-0 z-50 hidden group-hover:block">
            <div className="px-3 py-1 bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap">
              <CaptionSM className="text-white">
                {displayName}
              </CaptionSM>
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
            </div>
          </div>
        )}
      </Link>
    </li>
  );
};

export const Sidebar: React.FC = React.memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const activeClub = useActiveClubStore((state) => state.activeClub);
  
  // Memoize path calculations to avoid recalculating on every render
  const pathInfo = useMemo(() => {
    const pathSegments = pathname.split('/');
    const potentialClubSlug = pathSegments[2]; // After locale
    const isClubContext = activeClub?.slug === potentialClubSlug;
    const clubSlug = isClubContext ? potentialClubSlug : undefined;
    return { pathSegments, potentialClubSlug, isClubContext, clubSlug };
  }, [pathname, activeClub?.slug]);

  // Memoize navigation items to avoid recalculating when user/pathname haven't changed
  const navigation = useMemo(() => {
    return getNavigationByRole(user, pathname);
  }, [user, pathname]);

  const handleLogout = useCallback(async () => {
        try {
      await AuthService.logout();
      // AuthService.logout() already handles redirection
    } catch (error) {
            // Force redirect even if API fails
      AuthService.clearAuthTokens();
      window.location.href = '/es/login';
    }
  }, []);

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-white dark:bg-gray-800 shadow-lg transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo/Brand Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <Typography variant="ui-md" className="text-white font-bold">
                P
              </Typography>
            </div>
            <Typography variant="headline-sm" className="text-gray-900 dark:text-white">
              Padelyzer
            </Typography>
          </Link>
        )}

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <NavigationItem
              key={item.name}
              item={item}
              pathname={pathname}
              sidebarCollapsed={sidebarCollapsed}
              clubSlug={pathInfo.clubSlug}
            />
          ))}
        </ul>
        
        {/* Profile link - context-aware */}
        {pathname.includes('/root') ? null : (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <NavigationItem
              item={{
                name: 'Profile',
                href: '/profile',
                icon: User,
              }}
              pathname={pathname}
              sidebarCollapsed={sidebarCollapsed}
            />
          </div>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        {!sidebarCollapsed ? (
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.firstName}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                                handleLogout();
              }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              type="button"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            {/* User Avatar - Collapsed */}
            <div className="relative group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mx-auto">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.firstName}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute left-12 top-0 z-50 hidden group-hover:block">
                <div className="px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
                  <p className="font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-300">{user?.email}</p>
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Logout Button - Collapsed */}
            <button
              onClick={(e) => {
                e.preventDefault();
                                handleLogout();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mx-auto cursor-pointer"
              title="Cerrar sesión"
              type="button"
            >
              <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
