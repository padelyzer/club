'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from '@/lib/utils';
import {
  Bell,
  Search,
  Settings,
  User,
  ChevronDown,
  Activity,
  Shield,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  HelpCircle,
  LogOut,
  BarChart3,
  Grid3x3,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface ProfessionalTopNavigationProps {
  clubName?: string;
  clubInfo?: {
    city?: string;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive';
    members?: number;
    courts?: number;
    occupancy?: number;
  };
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  notifications?: Notification[];
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  className?: string;
}

/**
 * Professional Top Navigation Component
 * Modern header with club info, search, notifications, and user menu
 */
export const ProfessionalTopNavigation: React.FC<ProfessionalTopNavigationProps> = ({
  clubName,
  clubInfo,
  user,
  notifications = [],
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  onLogout,
  className,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white/60 backdrop-blur-xl shadow-sm border-b border-gray-100/50 sticky top-0 z-40',
        className
      )}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Only Club Name */}
          <div className="flex items-center gap-4">
            {/* Modern Logo */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] shadow-md flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {clubName?.charAt(0) || 'P'}
                </span>
              </div>
              {/* Status Indicator */}
              {clubInfo?.status === 'active' && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                />
              )}
            </motion.div>
            
            <h1 className="text-gray-900 font-semibold text-xl">
              {clubName || 'Padelyzer'}
            </h1>
          </div>

          {/* Right Side - Search, Notifications, User Menu */}
          <div className="flex items-center gap-4">
            {/* Modern Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/50 transition-all hover:bg-white/90"
              />
              {searchValue && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchValue('')}
                >
                  <span className="text-xs">✕</span>
                </motion.button>
              )}
            </div>

            {/* Quick Actions - Minimalist Style */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 rounded-xl hover:bg-gray-100/80 transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF3B30] text-white text-[10px] rounded-full flex items-center justify-center font-medium"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Settings */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl hover:bg-gray-100/80 transition-colors"
                onClick={onSettingsClick}
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>

            {/* User Menu */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-gray-100/80 transition-all"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] flex items-center justify-center shadow-sm">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  {/* Online Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="font-medium text-gray-900 text-sm">
                    {user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role || 'Administrador'}
                  </p>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-400 transition-transform",
                  showUserMenu && "rotate-180"
                )} />
              </motion.button>

              {/* User Dropdown - White Theme */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 z-50"
                  >
                    <div className="bg-white/95 backdrop-blur-xl border border-gray-100/50 rounded-2xl shadow-xl overflow-hidden">
                      <div className="p-2">
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={onProfileClick}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100/80 transition-all text-left group"
                        >
                          <User className="w-4 h-4 text-gray-500 group-hover:text-[#007AFF]" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">Ver Perfil</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={onSettingsClick}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100/80 transition-all text-left group"
                        >
                          <Settings className="w-4 h-4 text-gray-500 group-hover:text-[#007AFF]" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">Configuración</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ x: 4 }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100/80 transition-all text-left group"
                        >
                          <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-[#007AFF]" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">Ayuda</span>
                        </motion.button>
                        <div className="h-px bg-gray-100 my-2 mx-4"></div>
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={onLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-all text-left group"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-500">Cerrar Sesión</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Dropdown - White Theme */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-6 mt-2 w-80 z-50"
          >
            <div className="bg-white/95 backdrop-blur-xl border border-gray-100/50 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-[#007AFF] font-medium">
                      {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                    </span>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="p-2">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        whileHover={{ x: 4 }}
                        className={cn(
                          "p-3 rounded-xl mb-1 cursor-pointer transition-all",
                          "hover:bg-gray-50",
                          !notification.read && "bg-blue-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5",
                            notification.type === 'success' && "bg-green-500",
                            notification.type === 'error' && "bg-red-500",
                            notification.type === 'warning' && "bg-amber-500",
                            notification.type === 'info' && "bg-blue-500"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">
                              {notification.title}
                            </p>
                            <p className="text-gray-600 text-xs mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-gray-400 text-[10px] mt-2">
                              {notification.timestamp.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-600">Sin notificaciones</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Las notificaciones aparecerán aquí
                    </p>
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-100">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-all"
                    onClick={() => setShowNotifications(false)}
                  >
                    Marcar todas como leídas
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click Outside Handlers */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </motion.header>
  );
};

export default ProfessionalTopNavigation;