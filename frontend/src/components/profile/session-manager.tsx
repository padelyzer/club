'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { UserSession } from '@/types/profile';

export function SessionManager() {
  const { t } = useTranslation();
  const {
    activeSessions,
    loadingStates,
    errors,
    loadActiveSessions,
    terminateSession,
    terminateAllSessions,
  } = useProfileStore();

  useEffect(() => {
    loadActiveSessions();
  }, [loadActiveSessions]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      default:
        return Monitor;
    }
  };

  const handleTerminateAll = () => {
    if (confirm(t('profile.sessions.confirmTerminateAll'))) {
      terminateAllSessions();
    }
  };

  const formatLastActivity = (date: string) => {
    const now = new Date();
    const lastActivity = new Date(date);
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (loadingStates.sessions) {
    return <LoadingState message="Loading sessions..." fullScreen={false} />;
  }

  const currentSession = activeSessions.find((s) => s.isCurrentSession);
  const otherSessions = activeSessions.filter((s) => !s.isCurrentSession);

  return (
    <div className="space-y-6">
      {/* Current Session */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.sessions.currentSession')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This device and browser
              </p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800">Active</Badge>
        </div>

        {currentSession && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start space-x-4">
              {React.createElement(
                getDeviceIcon(currentSession.deviceInfo.type),
                {
                  className: 'w-8 h-8 text-green-600 mt-1',
                }
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-green-900 dark:text-green-100">
                    {currentSession.deviceInfo.browser} on{' '}
                    {currentSession.deviceInfo.os}
                  </h3>
                  <span className="text-sm text-green-700 dark:text-green-300">
                    {formatLastActivity(currentSession.lastActivity)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-green-700 dark:text-green-300">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {currentSession.location.city},{' '}
                      {currentSession.location.country}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Started {formatLastActivity(currentSession.startTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Other Sessions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.sessions.otherSessions')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {otherSessions.length === 0
                ? t('profile.sessions.noOtherSessions')
                : `${otherSessions.length} other active sessions`}
            </p>
          </div>

          {otherSessions.length > 0 && (
            <Button
              onClick={handleTerminateAll}
              variant="outline"
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('profile.sessions.terminateAllSessions')}
            </Button>
          )}
        </div>

        {otherSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('profile.sessions.noOtherSessions')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {otherSessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.deviceInfo.type);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <DeviceIcon className="w-6 h-6 text-gray-600 mt-1" />
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {session.deviceInfo.browser} on{' '}
                            {session.deviceInfo.os}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Last active{' '}
                            {formatLastActivity(session.lastActivity)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {session.location.city},{' '}
                              {session.location.country}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Started {formatLastActivity(session.startTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => terminateSession(session.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      {t('profile.sessions.terminateSession')}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Error Display */}
      {errors.sessions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.sessions}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
