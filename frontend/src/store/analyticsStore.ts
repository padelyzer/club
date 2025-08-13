import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  AnalyticsState,
  AnalyticsFilters,
  DateRange,
  RevenueMetrics,
  OccupancyMetrics,
  CustomerMetrics,
  BookingMetrics,
  PerformanceMetrics,
  TrendData,
  HeatmapData,
  ComparisonPeriod,
  ExportConfig,
} from '@/types/analytics';
import { AnalyticsService } from '@/lib/api/services/analytics.service';
import { 
  AnalyticsContextInfo, 
  buildContextualFilters 
} from '@/lib/utils/analytics-context';

interface AnalyticsStore extends AnalyticsState {
  // NEW: BI Dashboard Data
  biKpis: any | null;
  biRevenue: any | null;
  biUsage: any | null;
  biGrowth: any | null;
  biFetching: boolean;
  biLastUpdate: string | null;

  // Filter actions
  setDateRange: (dateRange: DateRange) => void;
  toggleComparison: () => void;
  setComparisonPeriod: (period: ComparisonPeriod) => void;
  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  resetFilters: () => void;

  // Data actions
  setRevenueMetrics: (data: RevenueMetrics) => void;
  setOccupancyMetrics: (data: OccupancyMetrics) => void;
  setCustomerMetrics: (data: CustomerMetrics) => void;
  setBookingMetrics: (data: BookingMetrics) => void;
  setPerformanceMetrics: (data: PerformanceMetrics) => void;

  // Trend actions
  setRevenueTrend: (data: TrendData) => void;
  setOccupancyTrend: (data: TrendData) => void;
  setBookingsTrend: (data: TrendData) => void;

  // Heatmap actions
  setOccupancyHeatmap: (data: HeatmapData) => void;
  setRevenueHeatmap: (data: HeatmapData) => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLastUpdate: () => void;

  // Export actions
  exportData: (config: ExportConfig) => Promise<void>;
  exportBIData: (options: {
    type: 'kpis' | 'revenue' | 'usage' | 'growth' | 'complete';
    format: 'pdf' | 'excel' | 'csv';
    customOptions?: any;
  }) => Promise<void>;

  // Refresh actions
  refreshAllMetrics: () => Promise<void>;
  refreshMetric: (metric: keyof AnalyticsState['trends']) => Promise<void>;
  
  // Context-aware refresh actions
  refreshAllMetricsWithContext: (context: AnalyticsContextInfo) => Promise<void>;
  loadMetricsForContext: (context: AnalyticsContextInfo, filters?: Partial<AnalyticsFilters>) => Promise<void>;

  // Comparison helpers
  calculateComparison: (
    current: number,
    previous: number
  ) => {
    change: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  };

  // Period presets
  setQuickPeriod: (
    period:
      | 'today'
      | 'yesterday'
      | 'last7days'
      | 'last30days'
      | 'thisMonth'
      | 'lastMonth'
      | 'thisYear'
      | 'custom'
  ) => void;

  // NEW: BI Dashboard Actions
  setBIKpis: (data: any) => void;
  setBIRevenue: (data: any) => void;
  setBIUsage: (data: any) => void;
  setBIGrowth: (data: any) => void;
  setBIFetching: (fetching: boolean) => void;
  refreshBIMetrics: (clubs?: string[]) => Promise<void>;
  loadBIDashboard: (dateRange?: DateRange, clubs?: string[]) => Promise<void>;

  // Real-time data actions
  setRealtimeData: (type: 'kpis' | 'revenue' | 'occupancy' | 'growth', data: any) => void;
  updateRealtimeMetric: (metricPath: string, value: any) => void;
  mergeRealtimeData: (updates: Record<string, any>) => void;
  enableRealtimeMode: () => void;
  disableRealtimeMode: () => void;
  
  // Real-time state
  isRealtimeEnabled: boolean;
  realtimeConnected: boolean;
  setRealtimeConnected: (connected: boolean) => void;
}

// Helper function to calculate date ranges
const getDateRange = (period: string): DateRange => {
  const today = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(today.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(today.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last7days':
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last30days':
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastMonth':
      start.setMonth(today.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisYear':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      // Default to last 30 days
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return {
    start: start.toISOString().split('T')[0]!,
    end: end.toISOString().split('T')[0]!,
  };
};

// Helper to get comparison period
const getComparisonPeriod = (current: DateRange): ComparisonPeriod => {
  const startDate = new Date(current.start);
  const endDate = new Date(current.end);
  const daysDiff = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);

  prevStart.setDate(prevStart.getDate() - daysDiff - 1);
  prevEnd.setDate(prevEnd.getDate() - daysDiff - 1);

  return {
    current,
    previous: {
      start: prevStart.toISOString().split('T')[0]!,
      end: prevEnd.toISOString().split('T')[0]!,
    },
  };
};

const defaultFilters: AnalyticsFilters = {
  dateRange: getDateRange('last30days'),
  comparisonEnabled: true,
  groupBy: 'day',
};

export const useAnalyticsStore = create<AnalyticsStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      filters: defaultFilters,
      revenue: null,
      occupancy: null,
      customers: null,
      bookings: null,
      performance: null,
      trends: {
        revenue: null,
        occupancy: null,
        bookings: null,
      },
      heatmaps: {
        occupancy: null,
        revenue: null,
      },
      isLoading: false,
      error: null,
      lastUpdate: null,

      // NEW: BI Dashboard state
      biKpis: null,
      biRevenue: null,
      biUsage: null,
      biGrowth: null,
      biFetching: false,
      biLastUpdate: null,

      // Real-time state
      isRealtimeEnabled: false,
      realtimeConnected: false,

      // Filter actions
      setDateRange: (dateRange) =>
        set((state) => {
          state.filters.dateRange = dateRange;
          if (state.filters.comparisonEnabled) {
            state.filters.comparisonPeriod = getComparisonPeriod(dateRange);
          }
        }),

      toggleComparison: () =>
        set((state) => {
          state.filters.comparisonEnabled = !state.filters.comparisonEnabled;
          if (state.filters.comparisonEnabled) {
            state.filters.comparisonPeriod = getComparisonPeriod(
              state.filters.dateRange
            );
          } else {
            state.filters.comparisonPeriod = undefined;
          }
        }),

      setComparisonPeriod: (period) =>
        set((state) => {
          state.filters.comparisonPeriod = period;
          state.filters.comparisonEnabled = true;
        }),

      setFilters: (filters) =>
        set((state) => {
          Object.assign(state.filters, filters);
        }),

      resetFilters: () =>
        set((state) => {
          state.filters = defaultFilters;
        }),

      // Data actions
      setRevenueMetrics: (data) =>
        set((state) => {
          state.revenue = data;
        }),

      setOccupancyMetrics: (data) =>
        set((state) => {
          state.occupancy = data;
        }),

      setCustomerMetrics: (data) =>
        set((state) => {
          state.customers = data;
        }),

      setBookingMetrics: (data) =>
        set((state) => {
          state.bookings = data;
        }),

      setPerformanceMetrics: (data) =>
        set((state) => {
          state.performance = data;
        }),

      // Trend actions
      setRevenueTrend: (data) =>
        set((state) => {
          state.trends.revenue = data;
        }),

      setOccupancyTrend: (data) =>
        set((state) => {
          state.trends.occupancy = data;
        }),

      setBookingsTrend: (data) =>
        set((state) => {
          state.trends.bookings = data;
        }),

      // Heatmap actions
      setOccupancyHeatmap: (data) =>
        set((state) => {
          state.heatmaps.occupancy = data;
        }),

      setRevenueHeatmap: (data) =>
        set((state) => {
          state.heatmaps.revenue = data;
        }),

      // Loading and error states
      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      updateLastUpdate: () =>
        set((state) => {
          state.lastUpdate = new Date().toISOString();
        }),

      // Export actions
      exportData: async (config) => {
        try {
          const blob = await AnalyticsService.exportAnalytics(config);
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.${config.format === 'pdf' ? 'pdf' : 'xlsx'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error) {
                    throw error;
        }
      },

      // Refresh actions
      refreshAllMetrics: async () => {
        const { filters } = get();
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          // Load all metrics in parallel using real API endpoints
          const [
            revenueData,
            occupancyData,
            customerData,
            bookingData,
            performanceData,
            revenueTrendData,
            occupancyTrendData,
            bookingsTrendData,
            occupancyHeatmapData,
            revenueHeatmapData,
          ] = await Promise.all([
            AnalyticsService.getRevenueMetrics(filters),
            AnalyticsService.getOccupancyMetrics(filters),
            AnalyticsService.getCustomerMetrics(filters),
            AnalyticsService.getBookingMetrics(filters),
            AnalyticsService.getPerformanceMetrics(filters),
            AnalyticsService.getTrendData({ metric: 'revenue', filters }),
            AnalyticsService.getTrendData({ metric: 'occupancy', filters }),
            AnalyticsService.getTrendData({ metric: 'bookings', filters }),
            AnalyticsService.getHeatmapData({ type: 'occupancy', filters }),
            AnalyticsService.getHeatmapData({ type: 'revenue', filters }),
          ]);

          // Update store with all data
          set((state) => {
            state.revenue = revenueData;
            state.occupancy = occupancyData;
            state.customers = customerData;
            state.bookings = bookingData;
            state.performance = performanceData;
            state.trends.revenue = revenueTrendData;
            state.trends.occupancy = occupancyTrendData;
            state.trends.bookings = bookingsTrendData;
            state.heatmaps.occupancy = occupancyHeatmapData;
            state.heatmaps.revenue = revenueHeatmapData;
            state.lastUpdate = new Date().toISOString();
            state.isLoading = false;
          });
        } catch (error) {
                    set((state) => {
            state.error =
              error instanceof Error ? error.message : 'Failed to load analytics data';
            state.isLoading = false;
          });
        }
      },

      refreshMetric: async (metric) => {
        const { filters } = get();
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          switch (metric) {
            case 'revenue': {
              const [revenueData, trendData, heatmapData] = await Promise.all([
                AnalyticsService.getRevenueMetrics(filters),
                AnalyticsService.getTrendData({ metric: 'revenue', filters }),
                AnalyticsService.getHeatmapData({ type: 'revenue', filters }),
              ]);
              set((state) => {
                state.revenue = revenueData;
                state.trends.revenue = trendData;
                state.heatmaps.revenue = heatmapData;
              });
              break;
            }
            case 'occupancy': {
              const [occupancyData, trendData, heatmapData] = await Promise.all([
                AnalyticsService.getOccupancyMetrics(filters),
                AnalyticsService.getTrendData({ metric: 'occupancy', filters }),
                AnalyticsService.getHeatmapData({ type: 'occupancy', filters }),
              ]);
              set((state) => {
                state.occupancy = occupancyData;
                state.trends.occupancy = trendData;
                state.heatmaps.occupancy = heatmapData;
              });
              break;
            }
            case 'bookings': {
              const [bookingData, trendData] = await Promise.all([
                AnalyticsService.getBookingMetrics(filters),
                AnalyticsService.getTrendData({ metric: 'bookings', filters }),
              ]);
              set((state) => {
                state.bookings = bookingData;
                state.trends.bookings = trendData;
              });
              break;
            }
            default:
                        }

          set((state) => {
            state.lastUpdate = new Date().toISOString();
            state.isLoading = false;
          });
        } catch (error) {
                    set((state) => {
            state.error = error instanceof Error ? error.message : `Failed to refresh ${metric} data`;
            state.isLoading = false;
          });
        }
      },

      // Context-aware refresh actions
      refreshAllMetricsWithContext: async (context: AnalyticsContextInfo) => {
        const { filters } = get();
        await get().loadMetricsForContext(context, filters);
      },

      loadMetricsForContext: async (context: AnalyticsContextInfo, customFilters?: Partial<AnalyticsFilters>) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const { filters: storeFilters } = get();
          const filtersToUse = customFilters ? { ...storeFilters, ...customFilters } : storeFilters;
          const contextualFilters = buildContextualFilters(filtersToUse, context);

          // Load all metrics in parallel with context-aware filtering
          const [
            revenueData,
            occupancyData,
            customerData,
            bookingData,
            performanceData,
            revenueTrendData,
            occupancyTrendData,
            bookingsTrendData,
            occupancyHeatmapData,
            revenueHeatmapData,
          ] = await Promise.all([
            AnalyticsService.getRevenueMetrics(contextualFilters),
            AnalyticsService.getOccupancyMetrics(contextualFilters),
            AnalyticsService.getCustomerMetrics(contextualFilters),
            AnalyticsService.getBookingMetrics(contextualFilters),
            AnalyticsService.getPerformanceMetrics(contextualFilters),
            AnalyticsService.getTrendData({ metric: 'revenue', filters: contextualFilters }),
            AnalyticsService.getTrendData({ metric: 'occupancy', filters: contextualFilters }),
            AnalyticsService.getTrendData({ metric: 'bookings', filters: contextualFilters }),
            AnalyticsService.getHeatmapData({ type: 'occupancy', filters: contextualFilters }),
            AnalyticsService.getHeatmapData({ type: 'revenue', filters: contextualFilters }),
          ]);

          // Update store with all data
          set((state) => {
            state.revenue = revenueData;
            state.occupancy = occupancyData;
            state.customers = customerData;
            state.bookings = bookingData;
            state.performance = performanceData;
            state.trends.revenue = revenueTrendData;
            state.trends.occupancy = occupancyTrendData;
            state.trends.bookings = bookingsTrendData;
            state.heatmaps.occupancy = occupancyHeatmapData;
            state.heatmaps.revenue = revenueHeatmapData;
            state.lastUpdate = new Date().toISOString();
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to load analytics data';
            state.isLoading = false;
          });
        }
      },

      // Comparison helpers
      calculateComparison: (current, previous) => {
        const change = current - previous;
        const changePercentage = previous === 0 ? 0 : (change / previous) * 100;
        const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

        return { change, changePercentage, trend };
      },

      // Period presets
      setQuickPeriod: (period) => {
        if (period === 'custom') return;

        const dateRange = getDateRange(period);
        set((state) => {
          state.filters.dateRange = dateRange;
          if (state.filters.comparisonEnabled) {
            state.filters.comparisonPeriod = getComparisonPeriod(dateRange);
          }
        });
      },

      // NEW: BI Dashboard Actions
      setBIKpis: (data) =>
        set((state) => {
          state.biKpis = data;
        }),

      setBIRevenue: (data) =>
        set((state) => {
          state.biRevenue = data;
        }),

      setBIUsage: (data) =>
        set((state) => {
          state.biUsage = data;
        }),

      setBIGrowth: (data) =>
        set((state) => {
          state.biGrowth = data;
        }),

      setBIFetching: (fetching) =>
        set((state) => {
          state.biFetching = fetching;
        }),

      refreshBIMetrics: async (clubs?: string[]) => {
        const { filters } = get();
        set((state) => {
          state.biFetching = true;
          state.error = null;
        });

        try {
          const params = {
            start_date: filters.dateRange.start,
            end_date: filters.dateRange.end,
            clubs,
          };

          // Load all BI metrics in parallel
          const [kpisData, revenueData, usageData, growthData] = await Promise.all([
            AnalyticsService.getBIKPIs(params),
            AnalyticsService.getBIRevenue({ ...params, group_by: 'day' }),
            AnalyticsService.getBIUsage(params),
            AnalyticsService.getBIGrowth({ ...params, metric: 'all' }),
          ]);

          set((state) => {
            state.biKpis = kpisData;
            state.biRevenue = revenueData;
            state.biUsage = usageData;
            state.biGrowth = growthData;
            state.biLastUpdate = new Date().toISOString();
            state.biFetching = false;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to load BI dashboard data';
            state.biFetching = false;
          });
        }
      },

      loadBIDashboard: async (dateRange?: DateRange, clubs?: string[]) => {
        if (dateRange) {
          set((state) => {
            state.filters.dateRange = dateRange;
          });
        }
        await get().refreshBIMetrics(clubs);
      },

      // Real-time data actions
      setRealtimeData: (type, data) =>
        set((state) => {
          switch (type) {
            case 'kpis':
              state.biKpis = { ...state.biKpis, ...data };
              break;
            case 'revenue':
              state.biRevenue = { ...state.biRevenue, ...data };
              break;
            case 'occupancy':
              state.biUsage = { ...state.biUsage, ...data };
              break;
            case 'growth':
              state.biGrowth = { ...state.biGrowth, ...data };
              break;
          }
          state.biLastUpdate = new Date().toISOString();
        }),

      updateRealtimeMetric: (metricPath, value) =>
        set((state) => {
          const paths = metricPath.split('.');
          let current: any = state;
          
          for (let i = 0; i < paths.length - 1; i++) {
            if (!current[paths[i]]) current[paths[i]] = {};
            current = current[paths[i]];
          }
          
          current[paths[paths.length - 1]] = value;
          state.biLastUpdate = new Date().toISOString();
        }),

      mergeRealtimeData: (updates) =>
        set((state) => {
          Object.keys(updates).forEach(key => {
            if (state[key as keyof typeof state]) {
              (state as any)[key] = { ...(state as any)[key], ...updates[key] };
            }
          });
          state.biLastUpdate = new Date().toISOString();
        }),

      enableRealtimeMode: () =>
        set((state) => {
          state.isRealtimeEnabled = true;
        }),

      disableRealtimeMode: () =>
        set((state) => {
          state.isRealtimeEnabled = false;
          state.realtimeConnected = false;
        }),

      setRealtimeConnected: (connected) =>
        set((state) => {
          state.realtimeConnected = connected;
        }),

      // NEW: BI Export functionality
      exportBIData: async (options) => {
        try {
          const { filters } = get();
          const baseParams = {
            start_date: filters.dateRange.start,
            end_date: filters.dateRange.end,
            format: options.format,
            ...options.customOptions,
          };

          let blob: Blob;
          let filename: string;

          switch (options.type) {
            case 'kpis':
              blob = await AnalyticsService.exportKPIsOnly(baseParams);
              filename = `KPIs-${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : options.format}`;
              break;
            case 'revenue':
              blob = await AnalyticsService.exportRevenueTrends(baseParams);
              filename = `Revenue-${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : options.format}`;
              break;
            case 'usage':
              blob = await AnalyticsService.exportUsageReport(baseParams);
              filename = `Usage-${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : options.format}`;
              break;
            case 'growth':
              blob = await AnalyticsService.exportGrowthAnalysis(baseParams);
              filename = `Growth-${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : options.format}`;
              break;
            case 'complete':
              blob = await AnalyticsService.exportBIReport({
                ...baseParams,
                sections: ['kpis', 'revenue', 'usage', 'growth'],
                includeCharts: true,
                includeRawData: false,
                templateType: 'detailed',
              });
              filename = `Complete-Report-${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : options.format}`;
              break;
          }

          // Create download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

        } catch (error) {
          console.error('BI export failed:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Export failed';
          });
          throw error;
        }
      },
    })),
    {
      name: 'analytics-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);
