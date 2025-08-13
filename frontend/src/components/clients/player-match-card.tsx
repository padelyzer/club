'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  MapPin,
  Clock,
  Star,
  TrendingUp,
  Users,
  Target,
  Shield,
  Calendar,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Zap,
  Trophy,
  Award,
  UserCheck,
  UserPlus,
  Ban,
  MoreVertical,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PartnerMatch, CompatibilityScore } from '@/types/client';

interface PlayerMatchCardProps {
  player: PartnerMatch;
  compatibilityScore?: CompatibilityScore;
  onSendRequest: () => void;
  onViewProfile: () => void;
  onAddFavorite?: () => void;
  onBlock?: () => void;
  onViewStats?: () => void;
  showCompatibility?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function PlayerMatchCard({
  player,
  compatibilityScore,
  onSendRequest,
  onViewProfile,
  onAddFavorite,
  onBlock,
  onViewStats,
  showCompatibility = true,
  variant = 'default',
  className,
}: PlayerMatchCardProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 0.7) return 'text-green-600';
    if (winRate >= 0.5) return 'text-blue-600';
    if (winRate >= 0.3) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatLastActivity = (activity: string) => {
    const date = new Date(activity);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return t('clients.yesterday');
    if (diffDays <= 7) return t('clients.daysAgo', { days: diffDays });
    if (diffDays <= 30) return t('clients.weeksAgo', { weeks: Math.floor(diffDays / 7) });
    return t('clients.monthsAgo', { months: Math.floor(diffDays / 30) });
  };

  const renderCompactCard = () => (
    <Card className={cn('p-4 hover:shadow-apple-md transition-all duration-200', className)}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={player.user.avatar_url}
              onError={() => setImageError(true)}
            />
            <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold">
              {player.user.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {player.is_favorite && (
            <Heart className="absolute -top-1 -right-1 h-4 w-4 text-red-500 fill-current" />
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {player.user.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {player.level.name}
                </Badge>
                {showCompatibility && compatibilityScore && (
                  <Badge className={cn('text-xs', getCompatibilityColor(compatibilityScore.overall))}>
                    {compatibilityScore.overall}% match
                  </Badge>
                )}
              </div>
            </div>
            
            <Button
              size="sm"
              onClick={onSendRequest}
              disabled={player.is_blocked}
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderDetailedCard = () => (
    <Card className={cn('p-6 hover:shadow-apple-lg transition-all duration-300', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={player.user.avatar_url}
                  onError={() => setImageError(true)}
                />
                <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white text-xl font-bold">
                  {player.user.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {player.is_favorite && (
                <Heart className="absolute -top-1 -right-1 h-5 w-5 text-red-500 fill-current" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {player.user.full_name}
                </h2>
                {player.user.age && (
                  <span className="text-gray-500">({player.user.age})</span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge 
                  variant="secondary" 
                  className="bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                >
                  {player.level.name}
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {player.rating} rating
                </span>
              </div>

              {player.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {player.bio}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewProfile}>
                <UserCheck className="mr-2 h-4 w-4" />
                {t('clients.viewProfile')}
              </DropdownMenuItem>
              {onViewStats && (
                <DropdownMenuItem onClick={onViewStats}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {t('clients.viewStats')}
                </DropdownMenuItem>
              )}
              {onAddFavorite && (
                <DropdownMenuItem onClick={onAddFavorite}>
                  <Heart className="mr-2 h-4 w-4" />
                  {player.is_favorite ? t('clients.removeFavorite') : t('clients.addFavorite')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onBlock && (
                <DropdownMenuItem onClick={onBlock} className="text-red-600">
                  <Ban className="mr-2 h-4 w-4" />
                  {t('clients.blockPlayer')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Compatibility Score */}
        {showCompatibility && compatibilityScore && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                {t('clients.compatibility')}
              </h3>
              <Badge className={cn('font-semibold', getCompatibilityColor(compatibilityScore.overall))}>
                {compatibilityScore.overall}% match
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: 'skill_match', label: 'Skill', icon: Target },
                { key: 'schedule_overlap', label: 'Schedule', icon: Clock },
                { key: 'location_proximity', label: 'Location', icon: MapPin },
                { key: 'play_style_compatibility', label: 'Style', icon: Users },
                { key: 'social_connection', label: 'Social', icon: Heart },
              ].map(({ key, label, icon: Icon }) => {
                const score = compatibilityScore[key as keyof typeof compatibilityScore] as number;
                return (
                  <TooltipProvider key={key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Icon className="h-4 w-4 text-gray-600" />
                          </div>
                          <Progress value={score || ''} className="h-2 mb-1" />
                          <span className="text-xs font-medium text-gray-600">
                            {Math.round(score)}%
                          </span>
                          <p className="text-xs text-gray-500">{label}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t(`clients.compatibility.${key}`)}: {Math.round(score)}%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            {compatibilityScore.factors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {compatibilityScore.factors.map((factor, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    {t(`clients.compatibilityFactor.${factor}`)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playing Information */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('clients.dominantHand')}</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {t(`clients.${player.dominant_hand}Handed`)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('clients.preferredPosition')}</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {t(`clients.${player.preferred_position}Side`)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('clients.matches')}</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {player.stats.matches_played}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('clients.winRate')}</div>
            <div className={cn('font-medium', getWinRateColor(player.stats.win_rate))}>
              {Math.round(player.stats.win_rate * 100)}%
            </div>
          </div>
        </div>

        {/* Play Styles */}
        {player.play_style.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {t('clients.playStyles')}
            </h4>
            <div className="flex flex-wrap gap-1">
              {player.play_style.map((style) => (
                <Badge key={style} variant="outline" className="text-xs">
                  {t(`clients.playStyle.${style}`)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {player.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {t('clients.strengths')}
            </h4>
            <div className="flex flex-wrap gap-1">
              {player.strengths.slice(0, 6).map((strength) => (
                <Badge key={strength} variant="outline" className="text-xs bg-green-50 text-green-700">
                  {t(`clients.strength.${strength}`)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Location and Availability */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {player.location && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {t('clients.location')}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {player.location.club_name}
                {player.location.distance && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({player.location.distance}km away)
                  </span>
                )}
              </div>
            </div>
          )}

          {player.availability.next_available.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {t('clients.availability')}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {player.availability.next_available.slice(0, 2).map((time, index) => (
                  <div key={index}>{time}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Last Activity */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('clients.lastActive')}: {formatLastActivity(player.stats.recent_activity)}
          </span>
          {player.mutual_connections > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {player.mutual_connections} {t('clients.mutualConnections')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            onClick={onSendRequest}
            disabled={player.is_blocked}
            className="flex-1"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {t('clients.sendRequest')}
          </Button>
          
          <Button
            variant="outline"
            onClick={onViewProfile}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            {t('clients.viewProfile')}
          </Button>
          
          {onAddFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddFavorite}
              className={cn(
                'p-2',
                player.is_favorite && 'text-red-600 hover:text-red-700'
              )}
            >
              <Heart className={cn('h-4 w-4', player.is_favorite && 'fill-current')} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  const renderDefaultCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className={cn('p-4 hover:shadow-apple-md transition-all duration-200', className)}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={player.user.avatar_url}
                onError={() => setImageError(true)}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold text-lg">
                {player.user.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {player.is_favorite && (
              <Heart className="absolute -top-1 -right-1 h-4 w-4 text-red-500 fill-current" />
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {player.user.full_name}
                </h3>
                {player.user.age && (
                  <p className="text-xs text-gray-500">{player.user.age} years old</p>
                )}
              </div>
              
              {/* Compatibility Score */}
              {showCompatibility && compatibilityScore && (
                <Badge className={cn('text-xs font-semibold', getCompatibilityColor(compatibilityScore.overall))}>
                  {compatibilityScore.overall}% match
                </Badge>
              )}
            </div>

            {/* Level and Rating */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {player.level.name}
              </Badge>
              <span className="text-sm text-gray-600">
                {player.rating} rating
              </span>
            </div>

            {/* Play Style and Position */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1">
                {player.play_style.slice(0, 2).map((style) => (
                  <Badge key={style} variant="outline" className="text-xs">
                    {t(`clients.playStyle.${style}`)}
                  </Badge>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {t(`clients.${player.preferred_position}Side`)} • {t(`clients.${player.dominant_hand}Handed`)}
              </span>
            </div>

            {/* Location and Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              {player.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{player.location.club_name}</span>
                  {player.location.distance && (
                    <span>({player.location.distance}km away)</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
                <span>{player.stats.matches_played} matches</span>
                <span className={getWinRateColor(player.stats.win_rate)}>
                  {Math.round(player.stats.win_rate * 100)}% win rate
                </span>
              </div>
            </div>

            {/* Bio */}
            {player.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {player.bio}
              </p>
            )}

            {/* Availability */}
            {player.availability.next_available.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  {t('clients.nextAvailable')}: {player.availability.next_available[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewProfile}
          >
            <UserCheck className="mr-2 h-3 w-3" />
            {t('clients.viewProfile')}
          </Button>
          
          <Button
            size="sm"
            onClick={onSendRequest}
            disabled={player.is_blocked}
          >
            <MessageCircle className="mr-2 h-3 w-3" />
            {t('clients.sendRequest')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );

  switch (variant) {
    case 'compact':
      return renderCompactCard();
    case 'detailed':
      return renderDetailedCard();
    default:
      return renderDefaultCard();
  }
}