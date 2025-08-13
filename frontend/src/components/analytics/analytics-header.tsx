'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Download,
  RefreshCw,
  Settings,
  ChevronDown,
  TrendingUp,
  Clock,
  Filter,
} from 'lucide-react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { Button } from '@/components/ui/button';
import { AnalyticsService } from '@/lib/api/services/analytics.service';
import { ExportConfig } from '@/types/analytics';
import { AnalyticsContextInfo } from '@/lib/utils/analytics-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnalyticsHeaderProps {
  context?: AnalyticsContextInfo;
}

export function AnalyticsHeader({ context }: AnalyticsHeaderProps = {}) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const {
    filters,
    lastUpdate,
    isLoading,
    setQuickPeriod,
    toggleComparison,
    refreshAllMetrics,
    updateLastUpdate,
  } = useAnalyticsStore();

  const periodOptions = [
    { value: 'today', label: t('analytics.periods.today'), icon: Clock },
    {
      value: 'yesterday',
      label: t('analytics.periods.yesterday'),
      icon: Clock,
    },
    {
      value: 'last7days',
      label: t('analytics.periods.last7days'),
      icon: Calendar,
    },
    {
      value: 'last30days',
      label: t('analytics.periods.last30days'),
      icon: Calendar,
    },
    {
      value: 'thisMonth',
      label: t('analytics.periods.thisMonth'),
      icon: Calendar,
    },
    {
      value: 'lastMonth',
      label: t('analytics.periods.lastMonth'),
      icon: Calendar,
    },
    {
      value: 'thisYear',
      label: t('analytics.periods.thisYear'),
      icon: Calendar,
    },
  ];

  const getCurrentPeriodLabel = () => {
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    const today = new Date();

    // Check for preset periods
    const daysDiff = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (
      start.toDateString() === today.toDateString() &&
      end.toDateString() === today.toDateString()
    ) {
      return t('analytics.periods.today');
    }

    if (daysDiff === 6) {
      return t('analytics.periods.last7days');
    }

    if (daysDiff === 29) {
      return t('analytics.periods.last30days');
    }

    // Custom range
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    try {
      const config: ExportConfig = {
        format,
        sections: [
          'revenue',
          'occupancy',
          'customers',
          'bookings',
          'performance',
        ],
        includeCharts: format === 'pdf',
        includeRawData: format !== 'pdf',
        dateRange: filters.dateRange,
      };

      const blob = await AnalyticsService.exportAnalytics(config);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
          } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    await refreshAllMetrics();
    updateLastUpdate();
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return t('analytics.neverUpdated');

    const date = new Date(lastUpdate);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) {
      return t('analytics.justNow');
    } else if (diffMinutes < 60) {
      return t('analytics.minutesAgo', { count: diffMinutes });
    } else {
      return date.toLocaleTimeString();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Title Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span>{t('analytics.title')}</span>
          </h1>
          <p className="text-gray-600 mt-1">
            {t('analytics.subtitle')} • {t('analytics.lastUpdated')}:{' '}
            {formatLastUpdate()}
          </p>
        </div>

        {/* Actions Section */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[200px] justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{getCurrentPeriodLabel()}</span>
                </div>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {periodOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setQuickPeriod(option.value as any)}
                  className="flex items-center space-x-2"
                >
                  <option.icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{t('analytics.customRange')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Comparison Toggle */}
          <Button
            variant={filters.comparisonEnabled ? 'default' : 'outline'}
            onClick={toggleComparison}
            className="flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>{t('analytics.comparison')}</span>
          </Button>

          {/* Filter Button */}
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>{t('analytics.filters')}</span>
          </Button>

          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isExporting}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>{t('analytics.export')}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                {t('analytics.exportPDF')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                {t('analytics.exportExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                {t('analytics.exportCSV')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="relative"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>

          {/* Settings Button */}
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comparison Period Info */}
      {filters.comparisonEnabled && filters.comparisonPeriod && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            {t('analytics.comparingWith')}:{' '}
            <span className="font-medium">
              {new Date(
                filters.comparisonPeriod.previous.start
              ).toLocaleDateString()}{' '}
              -{' '}
              {new Date(
                filters.comparisonPeriod.previous.end
              ).toLocaleDateString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
