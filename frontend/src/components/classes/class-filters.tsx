'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Filter,
  X,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Star,
  MapPin,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  ClassFilters as ClassFiltersType,
  Instructor,
  ClassLevel,
  ClassCategory,
  ClassType,
  ClassStatus,
} from '@/types/class';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

interface ClassFiltersProps {
// filters: ClassFiltersType;
  onFiltersChange: (filters: Partial<ClassFiltersType>) => void;
  onReset: () => void;
  instructors: Instructor[];
  clubs?: Array<{ id: string; name: string }>;
}

const CLASS_LEVELS: ClassLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'professional',
  'mixed',
];
const CLASS_CATEGORIES: ClassCategory[] = [
  'group',
  'private',
  'semi-private',
  'intensive',
  'clinic',
];
const CLASS_TYPES: ClassType[] = [
  'technique',
  'tactics',
  'physical',
  'match_play',
  'fundamentals',
];
const CLASS_STATUSES: ClassStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
];

export function ClassFilters({
  filters,
  onFiltersChange,
  onReset,
  instructors,
  clubs = [],
}: ClassFiltersProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [priceRange, setPriceRange] = useState([
    filters.priceRange?.min || 0,
    filters.priceRange?.max || 200,
  ]);

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null)
      return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== '';
  }).length;

  const handleFilterChange = useCallback(
    (key: keyof ClassFiltersType, value: any) => {
      onFiltersChange({ [key]: value });
    },
    [onFiltersChange]
  );

  const handleArrayFilterToggle = useCallback(
    (key: keyof ClassFiltersType, item: string) => {
      const currentArray = (filters[key] as string[]) || [];
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];

      handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
    },
    [filters, handleFilterChange]
  );

  const handleDateRangeChange = useCallback(
    (field: 'start' | 'end', value: string) => {
      const currentDateRange = filters.date || {};
      const newDateRange = { ...currentDateRange, [field]: value };

      if (!newDateRange.start && !newDateRange.end) {
        handleFilterChange('date', undefined);
      } else {
        handleFilterChange('date', newDateRange);
      }
    },
    [filters.date, handleFilterChange]
  );

  const handleTimeRangeChange = useCallback(
    (field: 'start' | 'end', value: string) => {
      const currentTimeRange = filters.time || {};
      const newTimeRange = { ...currentTimeRange, [field]: value };

      if (!newTimeRange.start && !newTimeRange.end) {
        handleFilterChange('time', undefined);
      } else {
        handleFilterChange('time', newTimeRange);
      }
    },
    [filters.time, handleFilterChange]
  );

  const handlePriceRangeChange = useCallback(
    (values: number[]) => {
      setPriceRange(values);
      handleFilterChange('priceRange', {
// min: values[0]
// max: values[1]

    },
    [handleFilterChange]
  );

  const clearFilter = useCallback(
    (key: keyof ClassFiltersType) => {
      handleFilterChange(key, undefined);
    },
    [handleFilterChange]
  );

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{t('common.filter', 'Filter')}</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {t('common.clearAll', 'Clear All')}
              </Button>
            )}

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.clubId && (
              <Badge variant="outline" className="text-xs">
                {t('classes.club', 'Club')}:{' '}
                {clubs.find((c) => c.id === filters.clubId)?.name}
                <button
                  onClick={() => clearFilter('clubId')}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {filters.instructorId && (
              <Badge variant="outline" className="text-xs">
                {t('classes.instructor', 'Instructor')}:{' '}
                {
                  instructors.find((i) => i.id === filters.instructorId)
// firstName
                }{' '}
                {
                  instructors.find((i) => i.id === filters.instructorId)
// lastName
                }
                <button
                  onClick={() => clearFilter('instructorId')}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {filters.level?.map((level: any) => (
              <Badge key={level} variant="outline" className="text-xs">
                {t(`classes.levels.${level}`, level)}
                <button
                  onClick={() => handleArrayFilterToggle('level', level)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {filters.category?.map((category: any) => (
              <Badge key={category} variant="outline" className="text-xs">
                {t(`classes.categories.${category}`, category)}
                <button
                  onClick={() => handleArrayFilterToggle('category', category)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {filters.status?.map((status: any) => (
              <Badge key={status} variant="outline" className="text-xs">
                {t(`classes.statuses.${status}`, status)}
                <button
                  onClick={() => handleArrayFilterToggle('status', status)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.clubId || ''}
            onValueChange={(value) =>
              handleFilterChange('clubId', value || undefined)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder={t('classes.selectClub', 'Select Club')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('common.all', 'All Clubs')}</SelectItem>
              {clubs.map((club) => (
                <SelectItem key={club.id} value={club.id || ''}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.instructorId || ''}
            onValueChange={(value) =>
              handleFilterChange('instructorId', value || undefined)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder={t('classes.selectInstructor', 'Select Instructor')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {t('common.all', 'All Instructors')}
              </SelectItem>
              {instructors.map((instructor) => (
                <SelectItem key={instructor.id} value={instructor.id || ''}>
                  {instructor.firstName} {instructor.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.availability || ''}
            onValueChange={(value) =>
              handleFilterChange('availability', value || undefined)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue
                placeholder={t('classes.availability', 'Availability')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('common.all', 'All')}</SelectItem>
              <SelectItem value="available">
                {t('classes.available', 'Available')}
              </SelectItem>
              <SelectItem value="waiting_list">
                {t('classes.waitingList', 'Waiting List')}
              </SelectItem>
              <SelectItem value="full">{t('classes.full', 'Full')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expanded Filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('classes.dateRange', 'Date Range')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('classes.startDate', 'Start Date')}
                  </Label>
                  <Input
                    type="date"
                    value={filters.date?.start || ''}
                    onChange={(e) =>
                      handleDateRangeChange('start', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('classes.endDate', 'End Date')}
                  </Label>
                  <Input
                    type="date"
                    value={filters.date?.end || ''}
                    onChange={(e) =>
                      handleDateRangeChange('end', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('classes.timeRange', 'Time Range')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('classes.startTime', 'Start Time')}
                  </Label>
                  <Input
                    type="time"
                    value={filters.time?.start || ''}
                    onChange={(e) =>
                      handleTimeRangeChange('start', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('classes.endTime', 'End Time')}
                  </Label>
                  <Input
                    type="time"
                    value={filters.time?.end || ''}
                    onChange={(e) =>
                      handleTimeRangeChange('end', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('classes.priceRange', 'Price Range')}
              </Label>
              <div className="px-3">
                <Slider
                  value={priceRange || ''}
                  onValueChange={handlePriceRangeChange}
                  max={200}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>
            </div>

            {/* Class Levels */}
            <div className="space-y-3">
              <Label>{t('classes.levels', 'Class Levels')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CLASS_LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`level-${level}`}
                      checked={filters.level?.includes(level) || false}
                      onCheckedChange={() =>
                        handleArrayFilterToggle('level', level)
                      }
                    />
                    <Label htmlFor={`level-${level}`} className="text-sm">
                      {t(`classes.levels.${level}`, level)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Class Categories */}
            <div className="space-y-3">
              <Label>{t('classes.categories', 'Class Categories')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CLASS_CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filters.category?.includes(category) || false}
                      onCheckedChange={() =>
                        handleArrayFilterToggle('category', category)
                      }
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm">
                      {t(`classes.categories.${category}`, category)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Class Types */}
            <div className="space-y-3">
              <Label>{t('classes.types', 'Class Types')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CLASS_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.type?.includes(type) || false}
                      onCheckedChange={() =>
                        handleArrayFilterToggle('type', type)
                      }
                    />
                    <Label htmlFor={`type-${type}`} className="text-sm">
                      {t(`classes.types.${type}`, type)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Class Status */}
            <div className="space-y-3">
              <Label>{t('classes.status', 'Status')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CLASS_STATUSES.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.status?.includes(status) || false}
                      onCheckedChange={() =>
                        handleArrayFilterToggle('status', status)
                      }
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm">
                      {t(`classes.statuses.${status}`, status)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}
