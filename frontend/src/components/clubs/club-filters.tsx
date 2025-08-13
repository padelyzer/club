'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClubFilters, useClubsDataStore } from '@/store/clubs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const ClubFilters: React.FC = () => {
  const { t } = useTranslation();
  // Use optimized selectors for better performance
  const filters = useClubFilters();
  const setFilters = useClubsDataStore((state) => state.setFilters);
  const resetFilters = useClubsDataStore((state) => state.resetFilters);
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.keys(filters).filter(
    (key) =>
      filters[key as keyof typeof filters] !== undefined &&
      key !== 'page' &&
      key !== 'page_size'
  ).length;

  const clearFilter = (filterKey: keyof typeof filters) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey];
    setFilters(newFilters);
  };

  const handleCityFilter = (city: string) => {
    setFilters({ city });
    setIsOpen(false);
  };

  const handleStatusFilter = (is_active: boolean) => {
    setFilters({ is_active });
    setIsOpen(false);
  };

  const handleFeatureFilter = (feature: string) => {
    setFilters({ feature });
    setIsOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filter')}
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('clubs.filterBy')}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Status Filter */}
          <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400">
            {t('clubs.status')}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleStatusFilter(true)}>
            {t('common.active')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusFilter(false)}>
            {t('common.inactive')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* City Filter */}
          <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400">
            {t('clubs.city')}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleCityFilter('Madrid')}>
            Madrid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCityFilter('Barcelona')}>
            Barcelona
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCityFilter('Valencia')}>
            Valencia
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Features Filter */}
          <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400">
            {t('clubs.features')}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleFeatureFilter('parking')}>
            {t('clubs.features.parking')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleFeatureFilter('changing_rooms')}
          >
            {t('clubs.features.changing_rooms')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFeatureFilter('pro_shop')}>
            {t('clubs.features.pro_shop')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFeatureFilter('cafeteria')}>
            {t('clubs.features.cafeteria')}
          </DropdownMenuItem>

          {activeFiltersCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  resetFilters();
                  setIsOpen(false);
                }}
                className="text-red-600 dark:text-red-400"
              >
                {t('common.clearFilters')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('common.activeFilters')}:
          </span>

          {filters.city && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>{filters.city}</span>
              <button
                onClick={() => clearFilter('city')}
                className="ml-1 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.is_active !== undefined && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>
                {filters.is_active ? t('common.active') : t('common.inactive')}
              </span>
              <button
                onClick={() => clearFilter('is_active')}
                className="ml-1 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.feature && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>{t(`clubs.features.${filters.feature}`)}</span>
              <button
                onClick={() => clearFilter('feature')}
                className="ml-1 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t('common.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
};
