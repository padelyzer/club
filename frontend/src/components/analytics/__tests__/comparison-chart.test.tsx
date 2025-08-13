import React from 'react';
import { screen } from '@testing-library/react';
import { ComparisonChart } from '../comparison-chart';
import { render } from '@/test-utils';
import { MetricValue } from '@/types/analytics';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-value={JSON.stringify(data) || ''}>
      {children}
    </div>
  ),
  Bar: ({ children, dataKey }: any) => (
    <div data-testid={`bar-${dataKey}`} data-key={dataKey}>
      {children}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ tickFormatter }: any) => (
    <div
      data-testid="y-axis"
      data-formatter={tickFormatter ? 'true' : 'false'}
    />
  ),
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip" data-custom={content ? 'true' : 'false'} />
  ),
  LabelList: ({ position, content }: any) => (
    <div
      data-testid="label-list"
      data-position={position}
      data-custom={content ? 'true' : 'false'}
    />
  ),
}));

describe('ComparisonChart', () => {
  const mockRevenueMetric: MetricValue = {
    value: 25000,
    previousValue: 22000,
    change: 3000,
    changePercentage: 13.6,
    trend: 'up',
  };

  const mockOccupancyMetric: MetricValue = {
    value: 75,
    previousValue: 70,
    change: 5,
    changePercentage: 7.1,
    trend: 'up',
  };

  const mockCustomersMetric: MetricValue = {
    value: 450,
    previousValue: 420,
    change: 30,
    changePercentage: 7.1,
    trend: 'up',
  };

  const mockBookingsMetric: MetricValue = {
    value: 850,
    previousValue: 900,
    change: -50,
    changePercentage: -5.6,
    trend: 'down',
  };

  const defaultProps = {
    title: 'Test Comparison',
    metrics: {
      revenue: mockRevenueMetric,
      occupancy: mockOccupancyMetric,
      customers: mockCustomersMetric,
      bookings: mockBookingsMetric,
    },
  };

  describe('Rendering', () => {
    it('renders with data', () => {
      render(<ComparisonChart {...defaultProps} />);

      expect(screen.getByText('Test Comparison')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<ComparisonChart {...defaultProps} isLoading={true} />);

      const loadingElement = screen
        .getByRole('generic')
        .querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders empty state when no metrics provided', () => {
      render(<ComparisonChart title="Empty Chart" metrics={{}} />);

      expect(screen.getByText('analytics.noDataAvailable')).toBeInTheDocument();
    });

    it('renders with partial metrics', () => {
      render(
        <ComparisonChart
          title="Partial Metrics"
          metrics={{
            revenue: mockRevenueMetric,
            occupancy: mockOccupancyMetric,
          }}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Chart Data Preparation', () => {
    it('prepares data for all metric types', () => {
      render(<ComparisonChart {...defaultProps} />);

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      expect(chartData).toHaveLength(4);
      expect(chartData[0]).toMatchObject({
        name: 'analytics.metrics.revenue',
        format: 'currency',
        change: 13.6,
      });
      expect(chartData[1]).toMatchObject({
        name: 'analytics.metrics.occupancy',
        format: 'percentage',
        change: 7.1,
      });
    });

    it('normalizes currency values for better visualization', () => {
      render(<ComparisonChart {...defaultProps} />);

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      const revenueData = chartData.find((d: any) => d.format === 'currency');
      expect(revenueData.current).toBe(25); // 25000 / 1000
      expect(revenueData.previous).toBe(22); // 22000 / 1000
      expect(revenueData.displayCurrent).toBe(25000);
      expect(revenueData.displayPrevious).toBe(22000);
    });

    it('handles null or undefined metrics gracefully', () => {
      render(
        <ComparisonChart
          title="With Nulls"
          metrics={{
            revenue: null,
            occupancy: undefined,
            customers: mockCustomersMetric,
          }}
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      expect(chartData).toHaveLength(1);
      expect(chartData[0].name).toBe('analytics.metrics.customers');
    });

    it('handles metrics without previous values', () => {
      const metricWithoutPrevious: MetricValue = {
        value: 100,
        trend: 'stable',
      };

      render(
        <ComparisonChart
          title="No Previous"
          metrics={{
            revenue: metricWithoutPrevious,
          }}
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      expect(chartData[0].previous).toBe(0);
      expect(chartData[0].change).toBe(0);
    });
  });

  describe('Bars and Visual Elements', () => {
    it('renders two bars for comparison', () => {
      render(<ComparisonChart {...defaultProps} />);

      expect(screen.getByTestId('bar-previous')).toBeInTheDocument();
      expect(screen.getByTestId('bar-current')).toBeInTheDocument();
    });

    it('applies color coding based on change direction', () => {
      render(<ComparisonChart {...defaultProps} />);

      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(4);

      // Check fill colors
      expect(cells[0]).toHaveAttribute('data-fill', '#10B981'); // Positive change (green)
      expect(cells[3]).toHaveAttribute('data-fill', '#EF4444'); // Negative change (red)
    });

    it('shows percentage labels on bars', () => {
      render(<ComparisonChart {...defaultProps} />);

      const labelList = screen.getByTestId('label-list');
      expect(labelList).toHaveAttribute('data-position', 'top');
      expect(labelList).toHaveAttribute('data-custom', 'true');
    });
  });

  describe('Axes and Grid', () => {
    it('renders chart grid and axes', () => {
      render(<ComparisonChart {...defaultProps} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('formats Y-axis for currency values', () => {
      render(<ComparisonChart {...defaultProps} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-formatter', 'true');
    });
  });

  describe('Tooltip', () => {
    it('renders custom tooltip', () => {
      render(<ComparisonChart {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-custom', 'true');
    });
  });

  describe('Legend', () => {
    it('displays legend with color indicators', () => {
      render(<ComparisonChart {...defaultProps} />);

      expect(screen.getByText('analytics.previousPeriod')).toBeInTheDocument();
      expect(screen.getByText('analytics.currentPeriod')).toBeInTheDocument();

      // Check color boxes
      const { container } = render(<ComparisonChart {...defaultProps} />);
      expect(container.querySelector('.bg-gray-300')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });
  });

  describe('Summary Section', () => {
    it('displays comparison summary', () => {
      render(<ComparisonChart {...defaultProps} />);

      expect(
        screen.getByText(/analytics.comparisonSummary/)
      ).toBeInTheDocument();
    });

    it('calculates improved metrics correctly', () => {
      render(<ComparisonChart {...defaultProps} />);

      // 3 out of 4 metrics have positive change
      const summary = screen.getByText(/analytics.comparisonSummary/);
      expect(summary.parentElement).toBeInTheDocument();
    });

    it('shows correct summary for all declining metrics', () => {
      const decliningMetrics = {
        revenue: {
          ...mockRevenueMetric,
          changePercentage: -5,
          trend: 'down' as const,
        },
        occupancy: {
          ...mockOccupancyMetric,
          changePercentage: -3,
          trend: 'down' as const,
        },
      };

      render(<ComparisonChart title="Declining" metrics={decliningMetrics} />);

      const summary = screen.getByText(/analytics.comparisonSummary/);
      expect(summary).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('displays chart icon in header', () => {
      const { container } = render(<ComparisonChart {...defaultProps} />);

      expect(
        container.querySelector('[class*="BarChart2"]')
      ).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies proper styling to card', () => {
      const { container } = render(<ComparisonChart {...defaultProps} />);

      const card = container.querySelector('.p-6');
      expect(card).toBeInTheDocument();
    });

    it('applies responsive height to chart container', () => {
      const { container } = render(<ComparisonChart {...defaultProps} />);

      const chartContainer = container.querySelector('.h-\\[400px\\]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('styles summary section with gray background', () => {
      const { container } = render(<ComparisonChart {...defaultProps} />);

      const summarySection = container.querySelector('.bg-gray-50.rounded-lg');
      expect(summarySection).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values correctly', () => {
      const zeroMetrics = {
        revenue: {
          value: 0,
          previousValue: 0,
          changePercentage: 0,
          trend: 'stable' as const,
        },
      };

      render(<ComparisonChart title="Zero Values" metrics={zeroMetrics} />);

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      expect(chartData[0].current).toBe(0);
      expect(chartData[0].previous).toBe(0);
      expect(chartData[0].change).toBe(0);
    });

    it('handles very large numbers', () => {
      const largeMetrics = {
        revenue: {
          value: 1000000,
          previousValue: 900000,
          changePercentage: 11.1,
          trend: 'up' as const,
        },
      };

      render(<ComparisonChart title="Large Numbers" metrics={largeMetrics} />);

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      expect(chartData[0].current).toBe(1000); // 1000000 / 1000
      expect(chartData[0].displayCurrent).toBe(1000000);
    });

    it('handles metrics with no change', () => {
      const stableMetrics = {
        revenue: {
          value: 5000,
          previousValue: 5000,
          change: 0,
          changePercentage: 0,
          trend: 'stable' as const,
        },
      };

      render(<ComparisonChart title="No Change" metrics={stableMetrics} />);

      const cells = screen.getAllByTestId('cell');
      expect(cells[0]).toHaveAttribute('data-fill', '#6B7280'); // Gray for no change
    });
  });
});
