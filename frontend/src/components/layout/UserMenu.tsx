'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle,
  Shield,
  UserCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { AuthService } from '@/lib/api/services/auth.service';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { OrganizationSwitcher } from './OrganizationSwitcher';

interface UserMenuProps {
  onClose: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onClose }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      // AuthService.logout() already handles clearing tokens and redirection
    } catch (error) {
            // Force logout even if API fails
      AuthService.clearAuthTokens();
      window.location.href = '/es/login';
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const menuItems = [
    {
      icon: UserCircle,
      label: 'My Profile',
      description: 'View and edit your profile',
      onClick: () => handleNavigation('/profile'),
    },
    {
      icon: Settings,
      label: 'Account Settings',
      description: 'Manage your account preferences',
      onClick: () => handleNavigation('/profile?tab=settings'),
    },
    {
      icon: CreditCard,
      label: 'Billing & Subscription',
      description: 'Manage your subscription and payments',
      onClick: () => handleNavigation('/profile?tab=billing'),
      show: user?.role === 'club_owner',
    },
    {
      icon: Shield,
      label: 'Security',
      description: 'Update password and security settings',
      onClick: () => handleNavigation('/profile?tab=security'),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help and contact support',
      onClick: () => handleNavigation('/help'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {/* User Info Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.firstName}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <span className="text-white text-lg font-medium">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Organization Switcher Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Current Organization
          </p>
          <OrganizationSwitcher />
        </div>

        {/* Menu Items */}
        <nav className="p-2">
          {menuItems.map((item, index) => {
            if (item.show === false) return null;

            const Icon = item.icon;

            return (
              <button
                key={index}
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-lg',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors text-left group'
                )}
              >
                <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center space-x-3 px-4 py-3 rounded-lg',
              'hover:bg-red-50 dark:hover:bg-red-900/20',
              'transition-colors text-left group'
            )}
          >
            <LogOut className="h-5 w-5 text-red-500 dark:text-red-400" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Log out
            </p>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Padelyzer v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};
