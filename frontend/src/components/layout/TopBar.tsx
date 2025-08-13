'use client';

import React, { useState } from 'react';
import {
  Search,
  Bell,
  Settings,
  Moon,
  Sun,
  Monitor,
  Menu,
  Plus,
  Command,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { ClubSwitcher } from '@/components/clubs/club-switcher';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { UserMenu } from './UserMenu';
import { OfflineStatusBadge } from '../ui/offline-indicator';
import { cn } from '@/lib/utils';

export const TopBar: React.FC = () => {
  const { theme, setTheme, isMobile, toggleSidebar, openModal } = useUIStore();

  const { unreadCount } = useNotificationStore();
  const { user } = useAuthStore();
  const { state: wsState, isConnected: wsConnected } = useWebSocketContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleThemeChange = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
        return Monitor;
      default:
        return Sun;
    }
  };

  const ThemeIcon = getThemeIcon();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
          }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        {/* Search Bar */}
        <div className="relative hidden sm:block">
          <form onSubmit={handleSearch} className="relative">
            <div
              className={cn(
                'relative flex items-center transition-all duration-200',
                searchFocused ? 'w-80' : 'w-64'
              )}
            >
              <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search... (Ctrl+/)"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={cn(
                  'w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700',
                  'border border-gray-200 dark:border-gray-600 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'text-gray-900 dark:text-gray-100',
                  'transition-all duration-200'
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              )}
            </div>
          </form>

          {/* Search Results Dropdown */}
          {searchFocused && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Search results for &quot;{searchQuery}&quot;
                </p>
                {/* Add search results here */}
              </div>
            </div>
          )}
        </div>

        {/* Command Palette Hint */}
        <div className="hidden lg:flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <Command className="h-3 w-3" />
          <span>+</span>
          <span>K</span>
        </div>
      </div>

      {/* Center Section - Organization & Club Switcher */}
      <div className="flex-1 flex justify-center items-center space-x-4">
        <OrganizationSwitcher />
        <ClubSwitcher />
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        {/* Offline Status Badge */}
        <OfflineStatusBadge />

        {/* WebSocket Connection Indicator */}
        <div className="flex items-center space-x-1">
          <div
            className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
              wsConnected
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : wsState === 'reconnecting'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            )}
            title={`Real-time updates: ${wsState}`}
          >
            {wsConnected ? (
              <Wifi className="h-3 w-3" />
            ) : wsState === 'reconnecting' ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {!isMobile && (
              <span>
                {wsConnected
                  ? 'Live'
                  : wsState === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Quick Action - New Reservation */}
        <button
          onClick={() => openModal('new-reservation')}
          className="hidden sm:flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New</span>
        </button>

        {/* Mobile Search Button */}
        <button
          onClick={() => openModal('search')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors sm:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={handleThemeChange}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
          title={`Current: ${theme} theme`}
        >
          <ThemeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => openModal('notifications')}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => openModal('settings')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(true)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="User menu"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.firstName}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              )}
            </div>
            {!isMobile && (
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* User Menu Modal */}
      {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
    </header>
  );
};
