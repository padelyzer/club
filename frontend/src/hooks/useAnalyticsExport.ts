'use client';

import { useState, useCallback } from 'react';
import { AnalyticsService } from '@/lib/api/services/analytics.service';
import { useAuthStore } from '@/store/auth';
import { useActiveClub } from '@/store/clubs';
import { useAnalyticsStore } from '@/store/analyticsStore';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  sections?: ('kpis' | 'revenue' | 'usage' | 'growth')[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  templateType?: 'executive' | 'detailed' | 'summary';
  customDateRange?: {
    start: string;
    end: string;
  };
}

interface ExportState {
  isExporting: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  lastExportedFile?: string;
}

export function useAnalyticsExport() {
  const { role } = useAuthStore();
  const { activeClub } = useActiveClub();
  const { filters } = useAnalyticsStore();

  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    error: null,
    success: false,
  });

  const resetState = useCallback(() => {
    setExportState({
      isExporting: false,
      progress: 0,
      error: null,
      success: false,
    });
  }, []);

  const generateFileName = useCallback((type: string, format: string) => {
    const clubName = activeClub?.name || 'Organization';
    const dateStr = new Date().toISOString().split('T')[0];
    const cleanClubName = clubName.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${cleanClubName}-${type}-${dateStr}.${format === 'excel' ? 'xlsx' : format}`;
  }, [activeClub]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  const simulateProgress = useCallback(() => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
          setExportState(prev => ({ ...prev, progress: 90 }));
          clearInterval(interval);
          resolve();
        } else {
          setExportState(prev => ({ ...prev, progress: Math.min(progress, 90) }));
        }
      }, 300);
    });
  }, []);

  // Export complete BI report with multiple sections
  const exportCompleteReport = useCallback(async (options: ExportOptions) => {
    resetState();
    setExportState(prev => ({ ...prev, isExporting: true }));

    try {
      const progressPromise = simulateProgress();

      const exportParams = {
        format: options.format,
        sections: options.sections || ['kpis', 'revenue', 'usage', 'growth'],
        start_date: options.customDateRange?.start || filters.dateRange.start,
        end_date: options.customDateRange?.end || filters.dateRange.end,
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
        includeCharts: options.includeCharts ?? true,
        includeRawData: options.includeRawData ?? false,
        templateType: options.templateType || 'detailed',
      };

      const [blob] = await Promise.all([
        AnalyticsService.exportBIReport(exportParams),
        progressPromise,
      ]);

      setExportState(prev => ({ ...prev, progress: 100 }));
      
      const sectionsStr = exportParams.sections.join('-');
      const filename = generateFileName(`Analytics-${sectionsStr}`, options.format);
      downloadBlob(blob, filename);

      setExportState(prev => ({ 
        ...prev, 
        success: true, 
        lastExportedFile: filename 
      }));

    } catch (error) {
      console.error('Complete export failed:', error);
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed',
        progress: 0,
      }));
    } finally {
      setExportState(prev => ({ ...prev, isExporting: false }));
    }
  }, [role, activeClub, filters, generateFileName, downloadBlob, simulateProgress, resetState]);

  // Export only KPIs
  const exportKPIs = useCallback(async (format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
    resetState();
    setExportState(prev => ({ ...prev, isExporting: true }));

    try {
      const params = {
        format,
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
      };

      const blob = await AnalyticsService.exportKPIsOnly(params);
      const filename = generateFileName('KPIs', format);
      downloadBlob(blob, filename);

      setExportState(prev => ({ 
        ...prev, 
        success: true, 
        lastExportedFile: filename 
      }));

    } catch (error) {
      console.error('KPIs export failed:', error);
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'KPIs export failed',
      }));
    } finally {
      setExportState(prev => ({ ...prev, isExporting: false }));
    }
  }, [role, activeClub, filters, generateFileName, downloadBlob, resetState]);

  // Export revenue trends
  const exportRevenue = useCallback(async (options: {
    format?: 'pdf' | 'excel' | 'csv';
    groupBy?: 'day' | 'week' | 'month';
    includeBreakdown?: boolean;
  } = {}) => {
    resetState();
    setExportState(prev => ({ ...prev, isExporting: true }));

    try {
      const params = {
        format: options.format || 'pdf',
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
        group_by: options.groupBy || 'day',
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
        includeBreakdown: options.includeBreakdown ?? true,
      };

      const blob = await AnalyticsService.exportRevenueTrends(params);
      const filename = generateFileName('Revenue', params.format);
      downloadBlob(blob, filename);

      setExportState(prev => ({ 
        ...prev, 
        success: true, 
        lastExportedFile: filename 
      }));

    } catch (error) {
      console.error('Revenue export failed:', error);
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Revenue export failed',
      }));
    } finally {
      setExportState(prev => ({ ...prev, isExporting: false }));
    }
  }, [role, activeClub, filters, generateFileName, downloadBlob, resetState]);

  // Export usage/occupancy report
  const exportUsage = useCallback(async (options: {
    format?: 'pdf' | 'excel' | 'csv';
    courts?: string[];
    includeHeatmap?: boolean;
  } = {}) => {
    resetState();
    setExportState(prev => ({ ...prev, isExporting: true }));

    try {
      const params = {
        format: options.format || 'pdf',
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
        courts: options.courts,
        includeHeatmap: options.includeHeatmap ?? true,
      };

      const blob = await AnalyticsService.exportUsageReport(params);
      const filename = generateFileName('Usage', params.format);
      downloadBlob(blob, filename);

      setExportState(prev => ({ 
        ...prev, 
        success: true, 
        lastExportedFile: filename 
      }));

    } catch (error) {
      console.error('Usage export failed:', error);
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Usage export failed',
      }));
    } finally {
      setExportState(prev => ({ ...prev, isExporting: false }));
    }
  }, [role, activeClub, filters, generateFileName, downloadBlob, resetState]);

  // Export growth analysis
  const exportGrowth = useCallback(async (options: {
    format?: 'pdf' | 'excel' | 'csv';
    metric?: 'all' | 'customers' | 'revenue' | 'bookings';
    includePredictions?: boolean;
  } = {}) => {
    resetState();
    setExportState(prev => ({ ...prev, isExporting: true }));

    try {
      const params = {
        format: options.format || 'pdf',
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
        metric: options.metric || 'all',
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
        includePredictions: options.includePredictions ?? true,
      };

      const blob = await AnalyticsService.exportGrowthAnalysis(params);
      const filename = generateFileName('Growth', params.format);
      downloadBlob(blob, filename);

      setExportState(prev => ({ 
        ...prev, 
        success: true, 
        lastExportedFile: filename 
      }));

    } catch (error) {
      console.error('Growth export failed:', error);
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Growth export failed',
      }));
    } finally {
      setExportState(prev => ({ ...prev, isExporting: false }));
    }
  }, [role, activeClub, filters, generateFileName, downloadBlob, resetState]);

  // Bulk export - export all sections at once
  const exportAll = useCallback(async (format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
    resetState();
    setExportState(prev => ({ ...prev, isExporting: true }));

    try {
      const progressPromise = simulateProgress();

      const [kpisBlob, revenueBlob, usageBlob, growthBlob] = await Promise.all([
        AnalyticsService.exportKPIsOnly({ 
          format, 
          start_date: filters.dateRange.start,
          end_date: filters.dateRange.end,
          clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
        }),
        AnalyticsService.exportRevenueTrends({ 
          format, 
          start_date: filters.dateRange.start,
          end_date: filters.dateRange.end,
          clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
          includeBreakdown: true,
        }),
        AnalyticsService.exportUsageReport({ 
          format, 
          start_date: filters.dateRange.start,
          end_date: filters.dateRange.end,
          clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
          includeHeatmap: true,
        }),
        AnalyticsService.exportGrowthAnalysis({ 
          format, 
          start_date: filters.dateRange.start,
          end_date: filters.dateRange.end,
          clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
          metric: 'all',
          includePredictions: true,
        }),
        progressPromise,
      ]);

      setExportState(prev => ({ ...prev, progress: 100 }));

      // Download all files
      downloadBlob(kpisBlob, generateFileName('KPIs', format));
      downloadBlob(revenueBlob, generateFileName('Revenue', format));
      downloadBlob(usageBlob, generateFileName('Usage', format));
      downloadBlob(growthBlob, generateFileName('Growth', format));

      setExportState(prev => ({ 
        ...prev, 
        success: true, 
        lastExportedFile: '4 files downloaded' 
      }));

    } catch (error) {
      console.error('Bulk export failed:', error);
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Bulk export failed',
        progress: 0,
      }));
    } finally {
      setExportState(prev => ({ ...prev, isExporting: false }));
    }
  }, [role, activeClub, filters, generateFileName, downloadBlob, simulateProgress, resetState]);

  return {
    // State
    ...exportState,
    
    // Actions
    exportCompleteReport,
    exportKPIs,
    exportRevenue,
    exportUsage,
    exportGrowth,
    exportAll,
    resetState,
    
    // Utilities
    generateFileName,
  };
}