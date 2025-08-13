import React, { useState, useCallback } from 'react';
import {
  TournamentFilters as Filters,
  TournamentStatus,
  TournamentCategory,
  TournamentFormat,
} from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Filter,
  X,
  Calendar,
  Grid3X3,
  List,
  Search,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';

interface TournamentFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
  onReset: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function TournamentFilters({
  filters,
  onFilterChange,
  onReset,
  viewMode,
  onViewModeChange,
}: TournamentFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const statusOptions: {
    value: TournamentStatus;
    label: string;
    color: string;
  }[] = [
    { value: 'upcoming', label: 'Upcoming', color: 'blue' },
    { value: 'registration_open', label: 'Open', color: 'green' },
    { value: 'registration_closed', label: 'Closed', color: 'yellow' },
    { value: 'in_progress', label: 'In Progress', color: 'purple' },
    { value: 'completed', label: 'Completed', color: 'gray' },
  ];

  const categoryOptions: { value: TournamentCategory; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'beginner' as ClassLevel, label: 'Beginner' },
    { value: 'intermediate' as ClassLevel, label: 'Intermediate' },
    { value: 'advanced' as ClassLevel, label: 'Advanced' },
    { value: 'professional', label: 'Professional' },
    { value: 'senior', label: 'Senior' },
    { value: 'junior', label: 'Junior' },
  ];

  const formatOptions: {
    value: TournamentFormat;
    label: string;
    icon: string;
  }[] = [
    { value: 'elimination', label: 'Elimination', icon: '🏆' },
    { value: 'round-robin', label: 'Round Robin', icon: '🔄' },
    { value: 'groups', label: 'Groups', icon: '👥' },
    { value: 'mixed', label: 'Mixed', icon: '🎯' },
  ];

  const handleStatusToggle = (status: TournamentStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFilterChange({ status: newStatuses });
  };

  const handleCategoryToggle = (category: TournamentCategory) => {
    const newCategories = filters.category.includes(category)
      ? filters.category.filter((c) => c !== category)
      : [...filters.category, category];
    onFilterChange({ category: newCategories });
  };

  const handleFormatToggle = (format: TournamentFormat) => {
    const newFormats = filters.format.includes(format)
      ? filters.format.filter((f) => f !== format)
      : [...filters.format, format];
    onFilterChange({ format: newFormats });
  };

  const activeFiltersCount =
    filters.status.length +
    filters.category.length +
    filters.format.length +
    (filters.hasAvailableSpots ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Main Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search tournaments..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
          {/* Status Filter */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                Status
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    {filters.status.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[200px] z-50"
                sideOffset={5}
              >
                {statusOptions.map((option) => (
                  <DropdownMenu.CheckboxItem
                    key={option.value}
                    checked={filters.status.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                    className="flex items-center px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 bg-${option.color}-500`}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                    {filters.status.includes(option.value) && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </DropdownMenu.CheckboxItem>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Date Range */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="outline" className="min-w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80 z-50"
                sideOffset={5}
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={filters.dateRange.start || ''}
                      onChange={(e) =>
                        onFilterChange({
                          dateRange: {
                            ...filters.dateRange,
                            start: e.target.value,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={filters.dateRange.end || ''}
                      onChange={(e) =>
                        onFilterChange({
                          dateRange: {
                            ...filters.dateRange,
                            end: e.target.value,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
            <ChevronDown
              className={`h-4 w-4 ml-2 transition-transform ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
          </Button>

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={onReset}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          {/* Categories */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={
                    filters.category.includes(option.value)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => handleCategoryToggle(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Formats */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Tournament Format
            </label>
            <div className="flex flex-wrap gap-2">
              {formatOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={
                    filters.format.includes(option.value)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => handleFormatToggle(option.value)}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAvailableSpots || false}
                onChange={(e) =>
                  onFilterChange({ hasAvailableSpots: e.target.checked })
                }
                className="mr-2 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show only tournaments with available spots
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Active filters:</span>
          <div className="flex flex-wrap gap-2">
            {filters.status.map((status) => (
              <Badge
                key={status}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleStatusToggle(status)}
              >
                {statusOptions.find((o) => o.value === status)?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {filters.category.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleCategoryToggle(category)}
              >
                {categoryOptions.find((o) => o.value === category)?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {filters.format.map((format) => (
              <Badge
                key={format}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleFormatToggle(format)}
              >
                {formatOptions.find((o) => o.value === format)?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {filters.hasAvailableSpots && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onFilterChange({ hasAvailableSpots: false })}
              >
                Available spots only
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
