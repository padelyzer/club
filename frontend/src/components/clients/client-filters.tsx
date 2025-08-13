import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X, CheckCircle, XCircle } from 'lucide-react';
import { useClientsStore } from '@/store/clientsStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';

export function ClientFilters() {
  const { t } = useTranslation();
  const { filters, searchQuery, setFilters, setSearchQuery, resetFilters } =
    useClientsStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Update search in store when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const handleStatusFilter = (status: 'active' | 'inactive' | 'all') => {
    if (status === 'all') {
      const { is_active, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ is_active: status === 'active' });
    }
  };

  const handleMembershipFilter = (hasMembership: boolean | null) => {
    if (hasMembership === null) {
      const { has_membership, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ has_membership: hasMembership });
    }
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== 'search'
  ).length;
  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.length > 0;

  const getActiveFilterLabels = () => {
    const labels = [];

    if (filters.is_active !== undefined) {
      labels.push({
        key: 'status',
        label: filters.is_active ? t('common.active') : t('common.inactive'),
        onRemove: () => handleStatusFilter('all'),
      });
    }

    if (filters.has_membership !== undefined) {
      labels.push({
        key: 'membership',
        label: filters.has_membership
          ? t('clients.withMembership')
          : t('clients.withoutMembership'),
        onRemove: () => handleMembershipFilter(null),
      });
    }

    return labels;
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Apple-style Search Input */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder={t('clients.searchPlaceholder')}
            value={localSearch || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 pl-10 pr-10 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Apple-style Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="relative h-10 px-4 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('common.filter')}
              {activeFiltersCount > 0 && (
                <span className="ml-2 h-5 min-w-[20px] rounded-full bg-blue-500 px-2 text-xs text-white font-medium flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('clients.filterBy')}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Status Filter */}
            <DropdownMenuLabel className="text-xs font-normal text-gray-500">
              {t('clients.status')}
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.is_active === undefined}
              onCheckedChange={() => handleStatusFilter('all')}
            >
              {t('common.all')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.is_active === true}
              onCheckedChange={() => handleStatusFilter('active')}
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              {t('common.active')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.is_active === false}
              onCheckedChange={() => handleStatusFilter('inactive')}
            >
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              {t('common.inactive')}
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            {/* Membership Filter */}
            <DropdownMenuLabel className="text-xs font-normal text-gray-500">
              {t('clients.membership')}
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.has_membership === undefined}
              onCheckedChange={() => handleMembershipFilter(null)}
            >
              {t('common.all')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.has_membership === true}
              onCheckedChange={() => handleMembershipFilter(true)}
            >
              {t('clients.withMembership')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.has_membership === false}
              onCheckedChange={() => handleMembershipFilter(false)}
            >
              {t('clients.withoutMembership')}
            </DropdownMenuCheckboxItem>

            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={resetFilters}
                  className="text-red-600 focus:text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('common.clearFilters')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Apple-style Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-sm text-gray-600 font-medium">
            {t('common.activeFilters')}:
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <span>
                {t('common.search')}: {searchQuery}
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {getActiveFilterLabels().map((filter) => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
            >
              <span>{filter.label}</span>
              <button
                onClick={filter.onRemove}
                className="ml-1 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            {t('common.clearAll')}
          </Button>
        </div>
      )}
    </div>
  );
}
