'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  Target,
  Star,
  Heart,
  MessageCircle,
  Calendar,
  Sliders,
  X,
  ChevronDown,
  SlidersHorizontal,
  UserCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  PartnerSearchFilters, 
  PartnerMatch, 
  PartnerRecommendation,
  SKILL_LEVELS,
  PLAY_STYLES 
} from '@/types/client';

interface PartnerSearchProps {
  onSearch: (filters: PartnerSearchFilters) => void;
  onSelectPlayer: (player: PartnerMatch) => void;
  onSendRequest: (player: PartnerMatch) => void;
  results: PartnerMatch[];
  recommendations: PartnerRecommendation[];
  loading: boolean;
  className?: string;
}

const SEARCH_TABS = [
  { key: 'search', label: 'Search Players', icon: Search },
  { key: 'recommendations', label: 'Recommended', icon: Zap },
  { key: 'favorites', label: 'Favorites', icon: Heart },
] as const;

const TIME_PERIODS = [
  { key: 'morning', label: 'Morning', value: '06:00-12:00' },
  { key: 'afternoon', label: 'Afternoon', value: '12:00-18:00' },
  { key: 'evening', label: 'Evening', value: '18:00-23:00' },
];

const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

export function PartnerSearch({
  onSearch,
  onSelectPlayer,
  onSendRequest,
  results,
  recommendations,
  loading,
  className,
}: PartnerSearchProps) {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'search' | 'recommendations' | 'favorites'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PartnerSearchFilters>({
    skill_level_min: 1.0,
    skill_level_max: 7.0,
    location_radius: 25,
    available_days: [],
    available_times: [],
    age_min: 18,
    age_max: 65,
    play_style: [],
    exclude_blocked: true,
    page: 1,
    page_size: 20,
  });
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedPlayStyles, setSelectedPlayStyles] = useState<string[]>([]);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Update filters when search query changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearch || undefined,
      page: 1, // Reset to first page on new search
    }));
  }, [debouncedSearch]);

  // Trigger search when filters change
  useEffect(() => {
    const searchFilters = {
      ...filters,
      available_days: selectedDays,
      available_times: selectedTimes,
      play_style: selectedPlayStyles,
    };
    onSearch(searchFilters);
  }, [filters, selectedDays, selectedTimes, selectedPlayStyles, onSearch]);

  const updateFilter = <K extends keyof PartnerSearchFilters>(
    key: K,
    value: PartnerSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(item => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const resetFilters = () => {
    setFilters({
      skill_level_min: 1.0,
      skill_level_max: 7.0,
      location_radius: 25,
      available_days: [],
      available_times: [],
      age_min: 18,
      age_max: 65,
      play_style: [],
      exclude_blocked: true,
      page: 1,
      page_size: 20,
    });
    setSelectedDays([]);
    setSelectedTimes([]);
    setSelectedPlayStyles([]);
    setSearchQuery('');
  };

  const getSkillLevelLabel = (level: number) => {
    const skillLevel = SKILL_LEVELS.find(s => s.value === level);
    return skillLevel ? skillLevel.label : `${level}`;
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.4) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.skill_level_min !== 1.0 || filters.skill_level_max !== 7.0) count++;
    if (filters.location_radius !== 25) count++;
    if (selectedDays.length > 0) count++;
    if (selectedTimes.length > 0) count++;
    if (filters.age_min !== 18 || filters.age_max !== 65) count++;
    if (selectedPlayStyles.length > 0) count++;
    if (filters.dominant_hand) count++;
    if (filters.preferred_position) count++;
    return count;
  }, [filters, selectedDays, selectedTimes, selectedPlayStyles]);

  const renderFiltersContent = () => (
    <div className="space-y-6">
      {/* Skill Level Range */}
      <div>
        <Label className="mb-3 block text-sm font-medium">
          {t('clients.skillLevelRange')}
        </Label>
        <div className="space-y-3">
          <Slider
            value={[filters.skill_level_min!, filters.skill_level_max!] || ''}
            onValueChange={([min, max]) => {
              updateFilter('skill_level_min', min);
              updateFilter('skill_level_max', max);
            }}
            min={1.0}
            max={7.0}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{getSkillLevelLabel(filters.skill_level_min!)}</span>
            <span>{getSkillLevelLabel(filters.skill_level_max!)}</span>
          </div>
        </div>
      </div>

      {/* Location Radius */}
      <div>
        <Label className="mb-3 block text-sm font-medium">
          {t('clients.locationRadius')}: {filters.location_radius}km
        </Label>
        <Slider
          value={[filters.location_radius!] || ''}
          onValueChange={([value]) => updateFilter('location_radius', value)}
          min={5}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Age Range */}
      <div>
        <Label className="mb-3 block text-sm font-medium">
          {t('clients.ageRange')}: {filters.age_min} - {filters.age_max}
        </Label>
        <Slider
          value={[filters.age_min!, filters.age_max!] || ''}
          onValueChange={([min, max]) => {
            updateFilter('age_min', min);
            updateFilter('age_max', max);
          }}
          min={16}
          max={80}
          step={1}
          className="w-full"
        />
      </div>

      {/* Available Days */}
      <div>
        <Label className="mb-3 block text-sm font-medium">
          {t('clients.availableDays')}
        </Label>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((day) => (
            <Button
              key={day.key}
              variant={selectedDays.includes(day.key) ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => toggleArrayValue(selectedDays, setSelectedDays, day.key)}
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Available Times */}
      <div>
        <Label className="mb-3 block text-sm font-medium">
          {t('clients.availableTimes')}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_PERIODS.map((time) => (
            <Button
              key={time.key}
              variant={selectedTimes.includes(time.value) ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => toggleArrayValue(selectedTimes, setSelectedTimes, time.value)}
            >
              {t(`clients.time.${time.key}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t('clients.advancedFilters')}
            </span>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              isAdvancedOpen && 'rotate-180'
            )} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4 space-y-4">
          {/* Dominant Hand */}
          <div>
            <Label className="mb-2 block text-sm font-medium">
              {t('clients.dominantHand')}
            </Label>
            <Select
              value={filters.dominant_hand || ''}
              onValueChange={(value) => 
                updateFilter('dominant_hand', value as any || undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('clients.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('clients.any')}</SelectItem>
                <SelectItem value="right">{t('clients.rightHanded')}</SelectItem>
                <SelectItem value="left">{t('clients.leftHanded')}</SelectItem>
                <SelectItem value="ambidextrous">{t('clients.ambidextrous')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred Position */}
          <div>
            <Label className="mb-2 block text-sm font-medium">
              {t('clients.preferredPosition')}
            </Label>
            <Select
              value={filters.preferred_position || ''}
              onValueChange={(value) => 
                updateFilter('preferred_position', value as any || undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('clients.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('clients.any')}</SelectItem>
                <SelectItem value="right">{t('clients.rightSide')}</SelectItem>
                <SelectItem value="left">{t('clients.leftSide')}</SelectItem>
                <SelectItem value="both">{t('clients.bothSides')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Play Styles */}
          <div>
            <Label className="mb-3 block text-sm font-medium">
              {t('clients.playStyles')}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PLAY_STYLES.map((style) => (
                <div
                  key={style}
                  className={cn(
                    'cursor-pointer rounded-lg border-2 p-2 text-center text-xs transition-all',
                    selectedPlayStyles.includes(style)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  )}
                  onClick={() => toggleArrayValue(selectedPlayStyles, setSelectedPlayStyles, style)}
                >
                  {t(`clients.playStyle.${style}`)}
                </div>
              ))}
            </div>
          </div>

          {/* Exclude Blocked */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {t('clients.excludeBlocked')}
              </Label>
              <p className="text-xs text-gray-500">
                {t('clients.excludeBlockedDescription')}
              </p>
            </div>
            <Switch
              checked={filters.exclude_blocked}
              onCheckedChange={(checked) => updateFilter('exclude_blocked', checked)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Reset Filters */}
      <Button
        variant="outline"
        onClick={resetFilters}
        className="w-full"
        disabled={activeFiltersCount === 0}
      >
        <X className="mr-2 h-4 w-4" />
        {t('common.resetFilters')}
      </Button>
    </div>
  );

  const renderPlayerCard = (player: PartnerMatch, isRecommendation = false) => {
    const recommendation = isRecommendation 
      ? recommendations.find(r => r.player.id === player.id)
      : undefined;

    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
      >
        <Card className="p-4 hover:shadow-apple-md transition-all duration-200 cursor-pointer">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
                {player.user.full_name.charAt(0)}
              </div>
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
                {isRecommendation && recommendation && (
                  <Badge className={cn('text-xs font-semibold', getCompatibilityColor(recommendation.confidence_score))}>
                    {Math.round(recommendation.confidence_score * 100)}% match
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
                  <span>{Math.round(player.stats.win_rate * 100)}% win rate</span>
                </div>
              </div>

              {/* Match Reasons (for recommendations) */}
              {isRecommendation && recommendation && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {recommendation.match_reasons.slice(0, 3).map((reason, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        {t(`clients.matchReason.${reason}`)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {player.bio && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {player.bio}
                </p>
              )}

              {/* Availability */}
              {player.availability.next_available.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
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
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlayer(player);
              }}
            >
              <UserCheck className="mr-2 h-3 w-3" />
              {t('clients.viewProfile')}
            </Button>
            
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendRequest(player);
              }}
              disabled={player.is_blocked}
            >
              <MessageCircle className="mr-2 h-3 w-3" />
              {t('clients.sendRequest')}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('clients.findPartners')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('clients.findPartnersDescription')}
          </p>
        </div>
        
        {/* Mobile Filters */}
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <Filter className="mr-2 h-4 w-4" />
              {t('common.filters')}
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-primary-600">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{t('common.filters')}</SheetTitle>
              <SheetDescription>
                {t('clients.filterPlayersDescription')}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {renderFiltersContent()}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="hidden lg:block">
          <Card className="p-4 sticky top-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('common.filters')}
              </h3>
              {activeFiltersCount > 0 && (
                <Badge className="bg-primary-600">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            {renderFiltersContent()}
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t('clients.searchPlayersPlaceholder')}
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab || ''} onValueChange={setActiveTab as any} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              {SEARCH_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.key} value={tab.key || ''} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t(`clients.${tab.key}`)}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="search" className="mt-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence>
                    {results.map((player) => renderPlayerCard(player))}
                  </AnimatePresence>
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('clients.noPlayersFound')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('clients.noPlayersFoundDescription')}
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="mt-6">
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence>
                    {recommendations.map((recommendation) => 
                      renderPlayerCard(recommendation.player, true)
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('clients.noRecommendations')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('clients.noRecommendationsDescription')}
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-6">
              <Card className="p-8 text-center">
                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('clients.noFavorites')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('clients.noFavoritesDescription')}
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}