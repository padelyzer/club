'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Users, BarChart3, Plus, Menu, X, GraduationCap } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mobileNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
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
    name: 'Classes',
    href: '/classes',
    icon: GraduationCap,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
];

export const MobileNavigation: React.FC = () => {
  const pathname = usePathname();
  const { openModal } = useUIStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden">
        <div className="grid grid-cols-6 h-16">
          {mobileNavigation.map((item) => {
            // Extract locale from pathname
            const locale = pathname.split('/')[1] || 'es';
            const localizedHref = `/${locale}${item.href}`;
            
            const isActive =
              pathname === localizedHref || pathname.startsWith(localizedHref + '/');

            return (
              <Link
                key={item.name}
                href={localizedHref}
                className={cn(
                  'flex flex-col items-center justify-center space-y-1 px-2 py-2 transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive && 'text-blue-600 dark:text-blue-400'
                  )}
                />
                <span className="text-xs font-medium truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Center FAB - New Reservation */}
          <button
            onClick={() => openModal('new-reservation')}
            className="flex flex-col items-center justify-center space-y-1 px-2 py-2"
          >
            <div className="h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-colors">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              New
            </span>
          </button>
        </div>
      </div>

      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsMenuOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Full Screen Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Content */}
          <div className="relative h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Padelyzer
                </span>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              {[
                ...mobileNavigation,
                {
                  name: 'Tournaments',
                  href: '/tournaments',
                  icon: BarChart3,
                },
                {
                  name: 'Settings',
                  href: '/settings',
                  icon: BarChart3,
                },
              ].map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5',
                        isActive
                          ? 'text-blue-500 dark:text-blue-400'
                          : 'text-gray-400 dark:text-gray-500'
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  openModal('new-reservation');
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>New Reservation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding to account for bottom navigation */}
      <div className="h-16 md:hidden" />
    </>
  );
};
