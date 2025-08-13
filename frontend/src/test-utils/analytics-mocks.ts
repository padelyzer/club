/**
 * MOCK DATA FOR TESTING ONLY
 * 
 * This file contains mock/dummy data generators for testing analytics components.
 * These mocks should ONLY be used in test files, not in production code.
 * Real analytics data is fetched from the backend BI API endpoints.
 */

import {
  RevenueMetrics,
  OccupancyMetrics,
  CustomerMetrics,
  BookingMetrics,
  PerformanceMetrics,
  TrendData,
  HeatmapData,
  AnalyticsFilters,
  DateRange,
  ComparisonPeriod,
} from '@/types/analytics';

// Date range mocks
export const mockDateRange: DateRange = {
  start: '2024-03-01',
  end: '2024-03-31',
};

export const mockComparisonPeriod: ComparisonPeriod = {
  current: mockDateRange,
  previous: {
    start: '2024-02-01',
    end: '2024-02-29',
  },
};

// Revenue metrics mock
export const mockRevenueMetrics: RevenueMetrics = {
  total: {
    value: 25000,
    previousValue: 22000,
    change: 3000,
    changePercentage: 13.6,
    trend: 'up',
  },
  bySource: {
    reservations: {
      value: 18000,
      previousValue: 16000,
      changePercentage: 12.5,
    },
    memberships: {
      value: 4000,
      previousValue: 3500,
      changePercentage: 14.3,
    },
    classes: {
      value: 2000,
      previousValue: 1800,
      changePercentage: 11.1,
    },
    products: {
      value: 1000,
      previousValue: 700,
      changePercentage: 42.9,
    },
  },
  byPaymentMethod: {
    cash: 5000,
    card: 15000,
    transfer: 4000,
    other: 1000,
  },
  averageTransactionValue: {
    value: 45,
    previousValue: 42,
    changePercentage: 7.1,
  },
  projectedRevenue: 28000,
};

// Occupancy metrics mock
export const mockOccupancyMetrics: OccupancyMetrics = {
  overall: {
    value: 75,
    previousValue: 70,
    change: 5,
    changePercentage: 7.1,
    trend: 'up',
  },
  byCourt: {
    'Court 1': { value: 85, previousValue: 80, changePercentage: 6.25 },
    'Court 2': { value: 70, previousValue: 65, changePercentage: 7.69 },
    'Court 3': { value: 60, previousValue: 55, changePercentage: 9.09 },
  },
  byTimeSlot: {
    morning: { value: 65, previousValue: 60, changePercentage: 8.33 },
    afternoon: { value: 80, previousValue: 75, changePercentage: 6.67 },
    evening: { value: 85, previousValue: 82, changePercentage: 3.66 },
  },
  peakHours: ['18:00', '19:00', '20:00'],
  utilizationRate: {
    value: 78,
    previousValue: 75,
    changePercentage: 4.0,
  },
};

// Customer metrics mock
export const mockCustomerMetrics: CustomerMetrics = {
  totalActive: {
    value: 450,
    previousValue: 420,
    change: 30,
    changePercentage: 7.1,
    trend: 'up',
  },
  newCustomers: {
    value: 45,
    previousValue: 38,
    changePercentage: 18.4,
  },
  returningCustomers: {
    value: 405,
    previousValue: 382,
    changePercentage: 6.0,
  },
  churnRate: {
    value: 3.5,
    previousValue: 4.0,
    changePercentage: -12.5,
  },
  averageLifetimeValue: {
    value: 2500,
    previousValue: 2200,
    changePercentage: 13.6,
  },
  satisfactionScore: {
    value: 4.8,
    previousValue: 4.6,
    changePercentage: 4.3,
  },
  topCustomers: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      totalSpent: 1250,
      reservations: 25,
      lastVisit: '2024-03-30',
      membershipStatus: 'active' as const,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      totalSpent: 1100,
      reservations: 22,
      lastVisit: '2024-03-28',
      membershipStatus: 'inactive' as const,
    },
    {
      id: '3',
      name: 'Carlos García',
      email: 'carlos.garcia@example.com',
      totalSpent: 1000,
      reservations: 20,
      lastVisit: '2024-03-25',
      membershipStatus: 'none' as const,
    },
  ],
};

// Booking metrics mock
export const mockBookingMetrics: BookingMetrics = {
  total: {
    value: 850,
    previousValue: 780,
    change: 70,
    changePercentage: 9.0,
    trend: 'up',
  },
  byStatus: {
    confirmed: 720,
    pending: 80,
    cancelled: 50,
    completed: 0,
  },
  cancellationRate: {
    value: 5.9,
    previousValue: 6.5,
    changePercentage: -9.2,
  },
  noShowRate: {
    value: 2.5,
    previousValue: 3.0,
    changePercentage: -16.7,
  },
  averageAdvanceBooking: {
    value: 3.2,
    previousValue: 2.8,
    changePercentage: 14.3,
  },
  recurringBookings: {
    value: 320,
    previousValue: 280,
    changePercentage: 14.3,
  },
  peakDays: ['Friday', 'Saturday', 'Thursday'],
};

// Performance metrics mock
export const mockPerformanceMetrics: PerformanceMetrics = {
  revenuePerCourt: {
    value: 8500,
    previousValue: 7800,
    changePercentage: 9.0,
  },
  revenuePerCustomer: {
    value: 55,
    previousValue: 52,
    changePercentage: 5.8,
  },
  averageOccupancyDuration: {
    value: 90,
    previousValue: 85,
    changePercentage: 5.9,
  },
  customerRetentionRate: {
    value: 85,
    previousValue: 82,
    changePercentage: 3.7,
  },
  netPromoterScore: {
    value: 72,
    previousValue: 68,
    changePercentage: 5.9,
  },
  operationalEfficiency: {
    value: 92,
    previousValue: 88,
    changePercentage: 4.5,
  },
};

// Trend data mock
export const mockTrendData: TrendData = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  datasets: [
    {
      label: 'Current Period',
      data: [5000, 5500, 6200, 6800],
      previousData: [4500, 4800, 5200, 5500],
    },
  ],
};

// Heatmap data mock
export const mockHeatmapData: HeatmapData = {
  data: [
    { day: 1, hour: 8, value: 45 },
    { day: 1, hour: 9, value: 65 },
    { day: 1, hour: 10, value: 80 },
    { day: 2, hour: 8, value: 50 },
    { day: 2, hour: 9, value: 70 },
    { day: 2, hour: 10, value: 85 },
  ],
  maxValue: 100,
  minValue: 0,
};

// Analytics filters mock
export const mockAnalyticsFilters: AnalyticsFilters = {
  dateRange: mockDateRange,
  comparisonEnabled: true,
  comparisonPeriod: mockComparisonPeriod,
  groupBy: 'day',
  courtIds: [],
  instructorIds: [],
};

// Analytics store state mock
export const mockAnalyticsStoreState = {
  filters: mockAnalyticsFilters,
  revenue: mockRevenueMetrics,
  occupancy: mockOccupancyMetrics,
  customers: mockCustomerMetrics,
  bookings: mockBookingMetrics,
  performance: mockPerformanceMetrics,
  trends: {
    revenue: mockTrendData,
    occupancy: mockTrendData,
    bookings: mockTrendData,
  },
  heatmaps: {
    occupancy: mockHeatmapData,
    revenue: mockHeatmapData,
  },
  isLoading: false,
  error: null,
  lastUpdate: '2024-03-31T15:30:00Z',
};

// Helper function to create mock metrics with custom values
export const createMockRevenueMetrics = (
  overrides: Partial<RevenueMetrics> = {}
): RevenueMetrics => ({
  ...mockRevenueMetrics,
  ...overrides,
});

export const createMockOccupancyMetrics = (
  overrides: Partial<OccupancyMetrics> = {}
): OccupancyMetrics => ({
  ...mockOccupancyMetrics,
  ...overrides,
});

export const createMockCustomerMetrics = (
  overrides: Partial<CustomerMetrics> = {}
): CustomerMetrics => ({
  ...mockCustomerMetrics,
  ...overrides,
});

export const createMockBookingMetrics = (
  overrides: Partial<BookingMetrics> = {}
): BookingMetrics => ({
  ...mockBookingMetrics,
  ...overrides,
});

export const createMockPerformanceMetrics = (
  overrides: Partial<PerformanceMetrics> = {}
): PerformanceMetrics => ({
  ...mockPerformanceMetrics,
  ...overrides,
});

// Mock analytics store
export const createMockAnalyticsStore = (overrides: any = {}) => ({
  ...mockAnalyticsStoreState,
  setDateRange: jest.fn(),
  toggleComparison: jest.fn(),
  setComparisonPeriod: jest.fn(),
  setFilters: jest.fn(),
  resetFilters: jest.fn(),
  setRevenueMetrics: jest.fn(),
  setOccupancyMetrics: jest.fn(),
  setCustomerMetrics: jest.fn(),
  setBookingMetrics: jest.fn(),
  setPerformanceMetrics: jest.fn(),
  setRevenueTrend: jest.fn(),
  setOccupancyTrend: jest.fn(),
  setBookingsTrend: jest.fn(),
  setOccupancyHeatmap: jest.fn(),
  setRevenueHeatmap: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  updateLastUpdate: jest.fn(),
  exportData: jest.fn(),
  refreshAllMetrics: jest.fn(),
  refreshMetric: jest.fn(),
  calculateComparison: jest.fn((current, previous) => ({
    change: current - previous,
    changePercentage: ((current - previous) / previous) * 100,
    trend: current > previous ? 'up' : current < previous ? 'down' : 'stable',
  })),
  setQuickPeriod: jest.fn(),
  ...overrides,
});
