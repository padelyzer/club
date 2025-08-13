// Analytics types for the Padelyzer application

export interface DateRange {
  start: string;
  end: string;
}

export interface ComparisonPeriod {
  current: DateRange;
  previous: DateRange;
}

export interface MetricValue {
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface RevenueMetrics {
  total: MetricValue;
  bySource: {
    reservations: MetricValue;
    memberships: MetricValue;
    classes: MetricValue;
    products: MetricValue;
  };
  byPaymentMethod: {
    cash: number;
    card: number;
    transfer: number;
    other: number;
  };
  projectedRevenue: number;
  averageTransactionValue: MetricValue;
}

export interface OccupancyMetrics {
  overall: MetricValue;
  byCourt: Record<string, MetricValue>;
  byTimeSlot: {
    morning: MetricValue; // 6:00 - 12:00
    afternoon: MetricValue; // 12:00 - 18:00
    evening: MetricValue; // 18:00 - 23:00
  };
  peakHours: string[];
  utilizationRate: MetricValue;
}

export interface CustomerMetrics {
  totalActive: MetricValue;
  newCustomers: MetricValue;
  returningCustomers: MetricValue;
  churnRate: MetricValue;
  averageLifetimeValue: MetricValue;
  satisfactionScore: MetricValue;
  topCustomers: CustomerSummary[];
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  reservations: number;
  lastVisit: string;
  membershipStatus: 'active' | 'inactive' | 'none';
}

export interface BookingMetrics {
  total: MetricValue;
  byStatus: {
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
  };
  cancellationRate: MetricValue;
  noShowRate: MetricValue;
  averageAdvanceBooking: MetricValue; // days
  recurringBookings: MetricValue;
  peakDays: string[];
}

export interface PerformanceMetrics {
  revenuePerCourt: MetricValue;
  revenuePerCustomer: MetricValue;
  averageOccupancyDuration: MetricValue;
  customerRetentionRate: MetricValue;
  netPromoterScore: MetricValue;
  operationalEfficiency: MetricValue;
}

export interface GrowthMetrics {
  overallGrowthRate: number;
  newCustomers: {
    current: number;
    previous: number;
    growthRate: number;
  };
  revenueGrowth: {
    current: number;
    previous: number;
    growthRate: number;
  };
  bookingGrowth: {
    current: number;
    previous: number;
    growthRate: number;
  };
  retention: {
    current: number;
    previous: number;
    growthRate: number;
  };
  monthlyGrowth: Array<{
    month: string;
    customers: number;
    revenue: number;
    bookings: number;
    retention: number;
  }>;
  cohortAnalysis: Array<{
    period: string;
    retentionRate: number;
    revenueRetention: number;
  }>;
}

export interface TrendData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    previousData?: number[];
  }[];
}

export interface HeatmapData {
  data: Array<{
    day: number;
    hour: number;
    value: number;
  }>;
  maxValue: number;
  minValue: number;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  comparisonEnabled: boolean;
  comparisonPeriod?: ComparisonPeriod;
  clubs?: string[];
  courts?: string[];
  customerSegments?: string[];
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AnalyticsState {
  filters: AnalyticsFilters;
  revenue: RevenueMetrics | null;
  occupancy: OccupancyMetrics | null;
  customers: CustomerMetrics | null;
  bookings: BookingMetrics | null;
  performance: PerformanceMetrics | null;
  growth: GrowthMetrics | null;
  trends: {
    revenue: TrendData | null;
    occupancy: TrendData | null;
    bookings: TrendData | null;
  };
  heatmaps: {
    occupancy: HeatmapData | null;
    revenue: HeatmapData | null;
  };
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'heatmap';
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  height?: number;
  responsive?: boolean;
}

export interface MetricCardConfig {
  title: string;
  value: number | string;
  previousValue?: number | string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  icon?: string;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
  trend?: 'up' | 'down' | 'stable';
  sparkline?: number[];
}

export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv';
  sections: (
    | 'revenue'
    | 'occupancy'
    | 'customers'
    | 'bookings'
    | 'performance'
    | 'growth'
  )[];
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange: DateRange;
}
