import React from 'react';
import { screen, within } from '@testing-library/react';
import { PerformanceMetrics } from '../performance-metrics';
import { render } from '@/test-utils';
import {
  mockPerformanceMetrics,
  createMockPerformanceMetrics,
} from '@/test-utils/analytics-mocks';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  RadarChart: ({ children, data }: any) => (
    <div data-testid="radar-chart" data-value={JSON.stringify(data) || ''}>
      {children}
    </div>
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: ({ dataKey }: any) => (
    <div data-testid="polar-angle-axis" data-key={dataKey} />
  ),
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: ({ dataKey, name }: any) => (
    <div data-testid="radar" data-key={dataKey} data-name={name} />
  ),
}));

// Mock MetricCard component
jest.mock('@/components/charts/MetricCard', () => ({
  MetricCard: ({ title, value, format, trend, isLoading }: any) => (
    <div data-testid="metric-card">
      <div data-testid="metric-title">{title}</div>
      <div data-testid="metric-value">
        {format === 'percentage' ? `${value}%` : value}
      </div>
      {trend && <div data-testid="metric-trend">{trend}</div>}
      {isLoading && <div data-testid="metric-loading">Loading...</div>}
    </div>
  ),
}));

// Mock Progress component
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div
      data-testid="progress"
      data-value={value || ''}
      style={{ width: `${value}%` }}
    />
  ),
}));

describe('PerformanceMetrics', () => {
  describe('Rendering', () => {
    it('renders without data', () => {
      render(<PerformanceMetrics data={null} />);

      expect(
        screen.getByText('analytics.performance.title')
      ).toBeInTheDocument();
    });

    it('renders with complete data', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.title')
      ).toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(
        <PerformanceMetrics data={mockPerformanceMetrics} isLoading={true} />
      );

      // Loading state would be shown in child components if implemented
      expect(
        screen.getByText('analytics.performance.title')
      ).toBeInTheDocument();
    });
  });

  describe('Performance Level Display', () => {
    it('shows excellent performance for efficiency >= 90%', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.excellent')
      ).toBeInTheDocument();
      expect(screen.getByText('analytics.performance.excellent')).toHaveClass(
        'text-green-600'
      );
    });

    it('shows good performance for efficiency >= 75%', () => {
      const dataWithGoodEfficiency = createMockPerformanceMetrics({
        operationalEfficiency: {
          value: 78,
          previousValue: 75,
          changePercentage: 4.0,
        },
      });

      render(<PerformanceMetrics data={dataWithGoodEfficiency} />);

      expect(
        screen.getByText('analytics.performance.good')
      ).toBeInTheDocument();
      expect(screen.getByText('analytics.performance.good')).toHaveClass(
        'text-blue-600'
      );
    });

    it('shows moderate performance for efficiency >= 60%', () => {
      const dataWithModerateEfficiency = createMockPerformanceMetrics({
        operationalEfficiency: {
          value: 65,
          previousValue: 60,
          changePercentage: 8.3,
        },
      });

      render(<PerformanceMetrics data={dataWithModerateEfficiency} />);

      expect(
        screen.getByText('analytics.performance.moderate')
      ).toBeInTheDocument();
      expect(screen.getByText('analytics.performance.moderate')).toHaveClass(
        'text-yellow-600'
      );
    });

    it('shows needs improvement for efficiency < 60%', () => {
      const dataWithLowEfficiency = createMockPerformanceMetrics({
        operationalEfficiency: {
          value: 45,
          previousValue: 50,
          changePercentage: -10.0,
        },
      });

      render(<PerformanceMetrics data={dataWithLowEfficiency} />);

      expect(
        screen.getByText('analytics.performance.needsImprovement')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.performance.needsImprovement')
      ).toHaveClass('text-red-600');
    });
  });

  describe('KPI Cards', () => {
    it('displays all KPI cards', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.revenuePerCourt')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.performance.revenuePerCustomer')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.performance.avgOccupancyDuration')
      ).toBeInTheDocument();
    });

    it('shows correct values for KPIs', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(screen.getByText('€8,500')).toBeInTheDocument(); // Revenue per court
      expect(screen.getByText('€55')).toBeInTheDocument(); // Revenue per customer
      expect(screen.getByText('90h')).toBeInTheDocument(); // Avg occupancy duration
    });

    it('displays previous values when available', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText(/analytics.performance.previous.*€7,800/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/analytics.performance.previous.*€52/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/analytics.performance.previous.*85h/)
      ).toBeInTheDocument();
    });

    it('shows trend indicators', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      const trendIcons = container.querySelectorAll('[class*="TrendingUp"]');
      expect(trendIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Radar Chart', () => {
    it('renders radar chart with data', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.overview')
      ).toBeInTheDocument();
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('passes correct data to radar chart', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      const radarChart = screen.getByTestId('radar-chart');
      const chartData = JSON.parse(
        radarChart.getAttribute('data-value') || '[]'
      );

      expect(chartData).toHaveLength(4);
      expect(chartData[0]).toMatchObject({
        metric: 'analytics.performance.efficiency',
        value: 92,
        fullMark: 100,
      });
    });

    it('normalizes NPS score for visualization', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      const radarChart = screen.getByTestId('radar-chart');
      const chartData = JSON.parse(
        radarChart.getAttribute('data-value') || '[]'
      );

      // NPS of 72 should be normalized to (72 + 100) / 2 = 86
      const npsData = chartData.find(
        (d: any) => d.metric === 'analytics.performance.nps'
      );
      expect(npsData.value).toBe(86);
    });

    it('does not render chart when no data', () => {
      render(<PerformanceMetrics data={null} />);

      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Individual Performance Metrics', () => {
    it('displays customer retention rate', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.customerRetention')
      ).toBeInTheDocument();
      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });

    it('shows retention rate progress bar', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      const progressBars = screen.getAllByTestId('progress');
      const retentionProgress = progressBars.find(
        (bar) => bar.getAttribute('data-value') === '85'
      );
      expect(retentionProgress).toBeInTheDocument();
    });

    it('displays retention rate change percentage', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText(/\+3.7%.*analytics.performance.vsPrevious/)
      ).toBeInTheDocument();
    });

    it('displays net promoter score', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.netPromoterScore')
      ).toBeInTheDocument();
      expect(screen.getByText('+72')).toBeInTheDocument();
    });

    it('shows correct NPS status for excellent score', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.npsExcellent')
      ).toBeInTheDocument();
    });

    it('shows correct NPS status for good score', () => {
      const dataWithGoodNPS = createMockPerformanceMetrics({
        netPromoterScore: {
          value: 25,
          previousValue: 20,
          changePercentage: 25.0,
        },
      });

      render(<PerformanceMetrics data={dataWithGoodNPS} />);

      expect(
        screen.getByText('analytics.performance.npsGood')
      ).toBeInTheDocument();
    });

    it('shows correct NPS status for needs work score', () => {
      const dataWithLowNPS = createMockPerformanceMetrics({
        netPromoterScore: {
          value: -10,
          previousValue: -5,
          changePercentage: -100.0,
        },
      });

      render(<PerformanceMetrics data={dataWithLowNPS} />);

      expect(
        screen.getByText('analytics.performance.npsNeedsWork')
      ).toBeInTheDocument();
    });

    it('displays operational efficiency', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.operationalEfficiency')
      ).toBeInTheDocument();
      expect(screen.getByText('92.0%')).toBeInTheDocument();
    });

    it('shows efficiency progress bar', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      const progressBars = screen.getAllByTestId('progress');
      const efficiencyProgress = progressBars.find(
        (bar) => bar.getAttribute('data-value') === '92'
      );
      expect(efficiencyProgress).toBeInTheDocument();
    });
  });

  describe('Performance Insights', () => {
    it('displays insights section', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText('analytics.performance.insights')
      ).toBeInTheDocument();
    });

    it('shows high efficiency insight when efficiency > 85%', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText(/analytics.performance.insightHighEfficiency/)
      ).toBeInTheDocument();
    });

    it('shows high NPS insight when NPS > 50', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(
        screen.getByText(/analytics.performance.insightHighNPS/)
      ).toBeInTheDocument();
    });

    it('shows revenue growth insight when trend is up', () => {
      const dataWithUpTrend = createMockPerformanceMetrics({
        revenuePerCourt: {
          value: 8500,
          previousValue: 7800,
          changePercentage: 9.0,
          trend: 'up',
        },
      });

      render(<PerformanceMetrics data={dataWithUpTrend} />);

      expect(
        screen.getByText(/analytics.performance.insightRevenueGrowth/)
      ).toBeInTheDocument();
    });

    it('does not show insights when conditions are not met', () => {
      const dataWithNoInsights = createMockPerformanceMetrics({
        operationalEfficiency: {
          value: 70,
          previousValue: 72,
          changePercentage: -2.8,
        },
        netPromoterScore: {
          value: 30,
          previousValue: 35,
          changePercentage: -14.3,
        },
        revenuePerCourt: {
          value: 8500,
          previousValue: 8500,
          changePercentage: 0,
          trend: 'stable',
        },
      });

      render(<PerformanceMetrics data={dataWithNoInsights} />);

      expect(
        screen.queryByText(/analytics.performance.insightHighEfficiency/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/analytics.performance.insightHighNPS/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/analytics.performance.insightRevenueGrowth/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies gradient background to main card', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      const mainCard = container.querySelector(
        '.bg-gradient-to-br.from-purple-50.to-pink-50'
      );
      expect(mainCard).toBeInTheDocument();
    });

    it('uses grid layout for KPI cards', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      const gridContainer = container.querySelector(
        '.grid.grid-cols-1.lg\\:grid-cols-3.gap-4'
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it('applies proper styling to metric cards', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      const metricCards = container.querySelectorAll(
        '.bg-white.rounded-lg.p-4.border.border-gray-200'
      );
      expect(metricCards.length).toBeGreaterThan(0);
    });
  });

  describe('Icons', () => {
    it('displays main performance icon in header', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      const headerIcon = container.querySelector('.h-6.w-6.text-purple-600');
      expect(headerIcon).toBeInTheDocument();
    });

    it('shows appropriate icons for KPIs', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      expect(
        container.querySelector('[class*="DollarSign"]')
      ).toBeInTheDocument();
      expect(container.querySelector('[class*="Users"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="Clock"]')).toBeInTheDocument();
    });

    it('displays metric-specific icons', () => {
      const { container } = render(
        <PerformanceMetrics data={mockPerformanceMetrics} />
      );

      expect(container.querySelector('[class*="Award"]')).toBeInTheDocument(); // NPS
      expect(container.querySelector('[class*="Target"]')).toBeInTheDocument(); // Target
      expect(container.querySelector('[class*="Zap"]')).toBeInTheDocument(); // Efficiency
    });
  });

  describe('Empty States', () => {
    it('handles null data gracefully', () => {
      render(<PerformanceMetrics data={null} />);

      // Should still render the component structure
      expect(
        screen.getByText('analytics.performance.title')
      ).toBeInTheDocument();
    });

    it('does not show performance level when no data', () => {
      render(<PerformanceMetrics data={null} />);

      expect(
        screen.queryByText('analytics.performance.excellent')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('analytics.performance.good')
      ).not.toBeInTheDocument();
    });

    it('does not render individual metrics when no data', () => {
      render(<PerformanceMetrics data={null} />);

      expect(
        screen.queryByText('analytics.performance.customerRetention')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('analytics.performance.netPromoterScore')
      ).not.toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency values correctly', () => {
      render(<PerformanceMetrics data={mockPerformanceMetrics} />);

      expect(screen.getByText('€8,500')).toBeInTheDocument();
      expect(screen.getByText('€55')).toBeInTheDocument();
    });

    it('handles zero currency values', () => {
      const dataWithZeroRevenue = createMockPerformanceMetrics({
        revenuePerCourt: { value: 0, previousValue: 0, changePercentage: 0 },
        revenuePerCustomer: { value: 0, previousValue: 0, changePercentage: 0 },
      });

      render(<PerformanceMetrics data={dataWithZeroRevenue} />);

      expect(screen.getAllByText('€0')).toHaveLength(2);
    });
  });
});
