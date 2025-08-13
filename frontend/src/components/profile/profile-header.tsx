'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/auth';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  Camera,
  Shield,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Star,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function ProfileHeader() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { profile, suggestions, analytics, setActiveTab, setEditMode } =
    useProfileStore();

  if (!user || !profile) {
    return null;
  }

  const completedSuggestions = suggestions.filter((s) => s.completed).length;
  const totalSuggestions = suggestions.length;
  const completionPercentage =
    totalSuggestions > 0 ? (completedSuggestions / totalSuggestions) * 100 : 0;

  const handleAvatarClick = () => {
    setActiveTab('profile');
    setEditMode(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      admin: {
        label: 'Admin',
        color:
          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      },
      coach: {
        label: 'Coach',
        color:
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      player: {
        label: 'Player',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      },
      club_manager: {
        label: 'Manager',
        color:
          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      },
    };
    return (
      roleMap[role as keyof typeof roleMap] || {
        label: role,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      }
    );
  };

  const roleDisplay = getRoleDisplay(profile.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Main Profile Card */}
      <Card className="p-6 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-0 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
          {/* Avatar Section */}
          <div className="relative flex-shrink-0">
            <div
              onClick={handleAvatarClick}
              className="relative group cursor-pointer"
            >
              <Avatar
                src={profile.avatar}
                alt={`${profile.firstName} ${profile.lastName}`}
                size="xl" as any
                className="w-24 h-24 lg:w-32 lg:h-32 ring-4 ring-white dark:ring-gray-600 shadow-lg"
              >
                {getInitials(profile.firstName, profile.lastName)}
              </Avatar>

              {/* Upload overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Verification Badge */}
            {profile.isVerified && (
              <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}

            {/* 2FA Badge */}
            {profile.twoFactorEnabled && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="flex-grow space-y-4">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {profile.firstName} {profile.lastName}
                </h2>
                <Badge className={roleDisplay.color}>{roleDisplay.label}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t('clients.memberSince')}{' '}
                    {formatDate(profile.createdAt, 'MMM yyyy')}
                  </span>
                </div>

                {profile.lastLoginAt && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {t('common.lastActive')}{' '}
                      {formatDate(profile.lastLoginAt, 'relative')}
                    </span>
                  </div>
                )}

                {profile.timezone && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.timezone}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 max-w-2xl">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            {analytics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-center space-x-1 text-orange-600 dark:text-orange-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-lg font-semibold">
                      {analytics.loginStreak}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('profile.analytics.loginStreak')}
                  </p>
                </div>

                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-center space-x-1 text-blue-600 dark:text-blue-400">
                    <Star className="w-4 h-4" />
                    <span className="text-lg font-semibold">
                      {analytics.totalLogins}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('profile.analytics.totalLogins')}
                  </p>
                </div>

                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-center space-x-1 text-green-600 dark:text-green-400">
                    <Trophy className="w-4 h-4" />
                    <span className="text-lg font-semibold">
                      {Math.round(analytics.averageSessionDuration / 60)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('profile.analytics.averageSession')} (min)
                  </p>
                </div>

                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-center space-x-1 text-purple-600 dark:text-purple-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-lg font-semibold">
                      {Math.round(completionPercentage)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('profile.profileCompletion')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Completion Progress */}
        {totalSuggestions > 0 && completionPercentage < 100 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('profile.suggestions.title')}
              </h3>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {completedSuggestions} / {totalSuggestions}
              </span>
            </div>

            <Progress value={completionPercentage || ''} className="h-2 mb-2" />

            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('profile.suggestions.completionBonus')}
            </p>

            {/* Incomplete Suggestions */}
            <div className="mt-3 space-y-2">
              {suggestions
                .filter((s) => !s.completed)
                .slice(0, 2)
                .map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      // Navigate to relevant tab based on suggestion type
                      if (suggestion.type === 'security')
                        setActiveTab('security');
                      else if (suggestion.type === 'preferences')
                        setActiveTab('appearance');
                      else setActiveTab('profile');
                    }}
                    className="flex items-center justify-between w-full p-2 text-left bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(
                          `profile.suggestions.suggestions.${suggestion.type}.title`
                        )}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t(
                          `profile.suggestions.suggestions.${suggestion.type}.description`
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {t('profile.suggestions.points', {
                        points: suggestion.points,
                      })}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
