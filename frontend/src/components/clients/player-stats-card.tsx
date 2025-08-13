'use client';

import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Award,
  Calendar,
  BarChart3,
  Zap,
  Medal,
  Flame,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PlayerStats, PlayerRatingHistory } from '@/types/client';

interface PlayerStatsCardProps {
  stats: PlayerStats;
  ratingHistory?: PlayerRatingHistory[];
  compact?: boolean;
  showTrends?: boolean;
  className?: string;
}

export function PlayerStatsCard({
  stats,
  ratingHistory = [],
  compact = false,
  showTrends = true,
  className,
}: PlayerStatsCardProps) {
  const { t } = useTranslation();

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getWinRateColor = (winRate: number): string => {
    if (winRate >= 0.7) return 'text-green-600 bg-green-50 border-green-200';
    if (winRate >= 0.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (winRate >= 0.3) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStreakColor = (streak: number): string => {
    if (streak >= 5) return 'text-green-600';
    if (streak >= 3) return 'text-blue-600';
    if (streak >= 2) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getRankingBadgeColor = (ranking?: number): string => {
    if (!ranking) return 'bg-gray-100 text-gray-600';
    if (ranking <= 10) return 'bg-gold-100 text-gold-700 border-gold-200';
    if (ranking <= 50) return 'bg-silver-100 text-silver-700 border-silver-200';
    if (ranking <= 100) return 'bg-bronze-100 text-bronze-700 border-bronze-200';
    return 'bg-gray-100 text-gray-600';
  };

  const recentRatingChange = ratingHistory.length > 1 
    ? ratingHistory[0].change 
    : 0;

  if (compact) {
    return (
      <TooltipProvider>
        <Card className={cn('p-4', className)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Win Rate */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(stats.win_rate)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('clients.stats.winRate')}
              </div>
            </div>

            {/* Matches */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.matches_played}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('clients.stats.matches')}
              </div>
            </div>

            {/* Streak */}
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getStreakColor(stats.current_win_streak))}>
                {stats.current_win_streak}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('clients.stats.streak')}
              </div>
            </div>

            {/* Ranking */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.club_ranking || '--'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('clients.stats.ranking')}
              </div>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Win Rate Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-blue-600" />
              {showTrends && recentRatingChange !== 0 && (
                <Badge variant="secondary" className="text-xs">
                  {recentRatingChange > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                  )}
                  {Math.abs(recentRatingChange)}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(stats.win_rate)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('clients.stats.winRate')}
              </p>
              <Progress 
                value={stats.win_rate * 100 || ''} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{stats.matches_won}W</span>
                <span>{stats.matches_lost}L</span>
              </div>
            </div>
          </Card>

          {/* Matches Played */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.matches_played}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('clients.stats.totalMatches')}
              </p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('clients.stats.thisMonth')}: {stats.matches_played}</span>
              </div>
            </div>
          </Card>

          {/* Current Streak */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="h-5 w-5 text-orange-600" />
              {stats.current_win_streak > 0 && (
                <Badge className="bg-orange-100 text-orange-700">
                  {t('clients.stats.onFire')}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className={cn('text-3xl font-bold', getStreakColor(stats.current_win_streak))}>
                {stats.current_win_streak}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('clients.stats.currentStreak')}
              </p>
              <div className="text-xs text-gray-500">
                {t('clients.stats.best')}: {stats.best_win_streak}
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Game/Set Statistics */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {t('clients.stats.gameSetStats')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('clients.stats.gamesWon')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.games_won}</span>
                  <Progress 
                    value={(stats.games_won / (stats.games_won + stats.games_lost)) * 100 || ''}
                    className="w-16 h-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('clients.stats.setsWon')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.sets_won}</span>
                  <Progress 
                    value={(stats.sets_won / (stats.sets_won + stats.sets_lost)) * 100 || ''}
                    className="w-16 h-2"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Tournament Performance */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="h-4 w-4" />
              {t('clients.stats.tournaments')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('clients.stats.tournamentsPlayed')}
                </span>
                <span className="font-medium">{stats.tournaments_played}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('clients.stats.tournamentsWon')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.tournaments_won}</span>
                  {stats.tournaments_won > 0 && (
                    <Medal className="h-4 w-4 text-gold-500" />
                  )}
                </div>
              </div>

              {stats.tournaments_played > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('clients.stats.tournamentWinRate')}
                  </span>
                  <span className="font-medium">
                    {formatPercentage(stats.tournaments_won / stats.tournaments_played)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Time and Activity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('clients.stats.totalPlayTime')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(stats.total_play_time)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('clients.stats.avgMatch')}: {formatDuration(stats.average_match_duration)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('clients.stats.activity')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Date(stats.updated_at).toLocaleDateString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('clients.stats.lastMatch')}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('clients.stats.frequency')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.matches_played > 0 
                ? Math.round(stats.total_play_time / stats.matches_played / 60 * 7) // Matches per week estimate
                : 0
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('clients.stats.matchesPerWeek')}
            </p>
          </Card>
        </div>

        {/* Rankings */}
        {(stats.club_ranking || stats.regional_ranking || stats.national_ranking) && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t('clients.stats.rankings')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.club_ranking && (
                <div className="text-center">
                  <Badge className={cn('mb-2', getRankingBadgeColor(stats.club_ranking))}>
                    #{stats.club_ranking}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('clients.stats.clubRanking')}
                  </p>
                </div>
              )}
              
              {stats.regional_ranking && (
                <div className="text-center">
                  <Badge className={cn('mb-2', getRankingBadgeColor(stats.regional_ranking))}>
                    #{stats.regional_ranking}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('clients.stats.regionalRanking')}
                  </p>
                </div>
              )}
              
              {stats.national_ranking && (
                <div className="text-center">
                  <Badge className={cn('mb-2', getRankingBadgeColor(stats.national_ranking))}>
                    #{stats.national_ranking}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('clients.stats.nationalRanking')}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}