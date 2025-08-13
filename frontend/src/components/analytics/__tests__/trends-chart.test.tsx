import React from 'react';
import { screen } from '@testing-library/react';
import { TrendsChart } from '../trends-chart';
import { render } from '@/test-utils';
import { mockTrendData } from '@/test-utils/analytics-mocks';
import { TrendData } from '@/types/analytics';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: any) => (
    <div data-testid="area-chart" data-value={JSON.stringify(data) || ''}>
      {children}
    </div>
  ),
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-value={JSON.stringify(data) || ''}>
      {children}
    </div>
  ),
  Area: ({
    dataKey,
    type,
    fill,
    stroke,
    strokeWidth,
    strokeDasharray,
    name,
  }: any) => (
    <div
      data-testid={`area-${dataKey}`}
      data-type={type}
      data-fill={fill}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-stroke-dasharray={strokeDasharray}
      data-name={name}
    />
  ),
  Line: ({
    dataKey,
    type,
    stroke,
    strokeWidth,
    strokeDasharray,
    dot,
    activeDot,
    name,
  }: any) => (
    <div
      data-testid={`line-${dataKey}`}
      data-type={type}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-stroke-dasharray={strokeDasharray}
      data-dot={JSON.stringify(dot)}
      data-active-dot={JSON.stringify(activeDot)}
      data-name={name}
    />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ tickFormatter }: any) => (
    <div
      data-testid="y-axis"
      data-formatter={tickFormatter ? 'true' : 'false'}
    />
  ),
  Tooltip: ({ formatter }: any) => (
    <div data-testid="tooltip" data-formatter={formatter ? 'true' : 'false'} />
  ),
  Legend: ({ formatter }: any) => (
    <div data-testid="legend" data-formatter={formatter ? 'true' : 'false'} />
  ),
}));

describe('TrendsChart', () => {
  const defaultProps = {
    title: 'Test Trends',
    data: mockTrendData,
    type: 'revenue' as const,
  };

  describe('Rendering', () => {
    it('renders with data', () => {
      render(<TrendsChart {...defaultProps} />);

      expect(screen.getByText('Test Trends')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<TrendsChart {...defaultProps} isLoading={true} />);

      const loadingElement = screen
        .getByRole('generic')
        .querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders empty state when no data', () => {
      render(<TrendsChart {...defaultProps} data={null} />);

      expect(screen.getByText('analytics.noDataAvailable')).toBeInTheDocument();
    });

    it('renders empty state when datasets array is empty', () => {
      const emptyData: TrendData = {
        labels: [],
        datasets: [],
      };

      render(<TrendsChart {...defaultProps} data={emptyData} />);

      expect(screen.getByText('analytics.noDataAvailable')).toBeInTheDocument();
    });
  });

  describe('Chart Type Selection', () => {
    it('renders area chart for revenue type', () => {
      render(<TrendsChart {...defaultProps} type="revenue" />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('renders area chart for occupancy type', () => {
      render(<TrendsChart {...defaultProps} type="occupancy" />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('renders line chart for bookings type', () => {
      render(<TrendsChart {...defaultProps} type="bookings" />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
    });

    it('renders line chart for customers type', () => {
      render(<TrendsChart {...defaultProps} type="customers" />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
    });
  });

  describe('Chart Data Transformation', () => {
    it('transforms data correctly for charts', () => {
      render(<TrendsChart {...defaultProps} />);

      const areaChart = screen.getByTestId('area-chart');
      const chartData = JSON.parse(
        areaChart.getAttribute('data-value') || '[]'
      );

      expect(chartData).toHaveLength(4); // 4 weeks
      expect(chartData[0]).toMatchObject({
        name: 'Week 1',
        current: 5000,
        previous: 4500,
      });
    });

    it('handles data without previous period', () => {
      const dataWithoutPrevious: TrendData = {
        labels: ['Week 1', 'Week 2'],
        datasets: [
          {
            label: 'Current',
            data: [1000, 1200],
          },
        ],
      };

      render(<TrendsChart {...defaultProps} data={dataWithoutPrevious} />);

      const areaChart = screen.getByTestId('area-chart');
      const chartData = JSON.parse(
        areaChart.getAttribute('data-value') || '[]'
      );

      expect(chartData[0]).toMatchObject({
        name: 'Week 1',
        current: 1000,
      });
      expect(chartData[0].previous).toBeUndefined();
    });
  });

  describe('Color Schemes', () => {
    it('applies correct colors for revenue type', () => {
      render(<TrendsChart {...defaultProps} type="revenue" />);

      const currentArea = screen.getByTestId('area-current');
      expect(currentArea).toHaveAttribute('data-stroke', '#10B981');
    });

    it('applies correct colors for occupancy type', () => {
      render(<TrendsChart {...defaultProps} type="occupancy" />);

      const currentArea = screen.getByTestId('area-current');
      expect(currentArea).toHaveAttribute('data-stroke', '#3B82F6');
    });

    it('applies correct colors for bookings type', () => {
      render(<TrendsChart {...defaultProps} type="bookings" />);

      const currentLine = screen.getByTestId('line-current');
      expect(currentLine).toHaveAttribute('data-stroke', '#8B5CF6');
    });

    it('applies correct colors for customers type', () => {
      render(<TrendsChart {...defaultProps} type="customers" />);

      const currentLine = screen.getByTestId('line-current');
      expect(currentLine).toHaveAttribute('data-stroke', '#F59E0B');
    });
  });

  describe('Comparison Mode', () => {
    it('shows comparison by default', () => {
      render(<TrendsChart {...defaultProps} />);

      expect(screen.getByTestId('area-previous')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('hides comparison when showComparison is false', () => {
      render(<TrendsChart {...defaultProps} showComparison={false} />);

      expect(screen.queryByTestId('area-previous')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('applies dashed line style for previous period', () => {
      render(<TrendsChart {...defaultProps} />);

      const previousArea = screen.getByTestId('area-previous');
      expect(previousArea).toHaveAttribute('data-stroke-dasharray', '5 5');
    });
  });

  describe('Chart Components', () => {
    it('renders all chart components', () => {
      render(<TrendsChart {...defaultProps} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('configures X-axis with data key', () => {
      render(<TrendsChart {...defaultProps} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'name');
    });

    it('configures Y-axis with formatter', () => {
      render(<TrendsChart {...defaultProps} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-formatter', 'true');
    });
  });

  describe('Area Chart Features', () => {
    it('applies gradient fill for area charts', () => {
      render(<TrendsChart {...defaultProps} type="revenue" />);

      const currentArea = screen.getByTestId('area-current');
      expect(currentArea).toHaveAttribute(
        'data-fill',
        'url(#gradient-revenue)'
      );
    });

    it('does not apply fill for previous period area', () => {
      render(<TrendsChart {...defaultProps} type="revenue" />);

      const previousArea = screen.getByTestId('area-previous');
      expect(previousArea).toHaveAttribute('data-fill', 'none');
    });
  });

  describe('Line Chart Features', () => {
    it('configures dots for line charts', () => {
      render(<TrendsChart {...defaultProps} type="bookings" />);

      const currentLine = screen.getByTestId('line-current');
      const dotConfig = JSON.parse(
        currentLine.getAttribute('data-dot') || '{}'
      );

      expect(dotConfig).toMatchObject({
        fill: '#8B5CF6',
        r: 4,
      });
    });

    it('configures active dots for interaction', () => {
      render(<TrendsChart {...defaultProps} type="bookings" />);

      const currentLine = screen.getByTestId('line-current');
      const activeDotConfig = JSON.parse(
        currentLine.getAttribute('data-active-dot') || '{}'
      );

      expect(activeDotConfig).toMatchObject({
        r: 6,
      });
    });

    it('applies smaller dots for previous period', () => {
      render(<TrendsChart {...defaultProps} type="bookings" />);

      const previousLine = screen.getByTestId('line-previous');
      const dotConfig = JSON.parse(
        previousLine.getAttribute('data-dot') || '{}'
      );

      expect(dotConfig.r).toBe(3);
    });
  });

  describe('Header Actions', () => {
    it('renders custom range button', () => {
      render(<TrendsChart {...defaultProps} />);

      const customRangeButton = screen.getByText('analytics.customRange');
      expect(customRangeButton).toBeInTheDocument();
    });

    it('renders filter button', () => {
      const { container } = render(<TrendsChart {...defaultProps} />);

      const filterButton = container.querySelector('[class*="Filter"]');
      expect(filterButton).toBeInTheDocument();
    });
  });

  describe('Chart Summary', () => {
    it('displays period indicators', () => {
      render(<TrendsChart {...defaultProps} />);

      expect(screen.getByText('analytics.currentPeriod')).toBeInTheDocument();
      expect(screen.getByText('analytics.previousPeriod')).toBeInTheDocument();
    });

    it('shows data point count', () => {
      render(<TrendsChart {...defaultProps} />);

      expect(screen.getByText(/analytics.dataPoints.*4/)).toBeInTheDocument();
    });

    it('displays color indicators with correct colors', () => {
      const { container } = render(
        <TrendsChart {...defaultProps} type="revenue" />
      );

      const colorIndicators = container.querySelectorAll(
        '.w-3.h-3.rounded-full'
      );
      expect(colorIndicators).toHaveLength(2);

      // Check inline styles
      expect(colorIndicators[0]).toHaveStyle({ backgroundColor: '#10B981' });
      expect(colorIndicators[1]).toHaveStyle({ backgroundColor: '#6EE7B7' });
    });

    it('hides previous period indicator when showComparison is false', () => {
      render(<TrendsChart {...defaultProps} showComparison={false} />);

      expect(screen.getByText('analytics.currentPeriod')).toBeInTheDocument();
      expect(
        screen.queryByText('analytics.previousPeriod')
      ).not.toBeInTheDocument();
    });
  });

  describe('Custom Height', () => {
    it('applies default height of 300px', () => {
      const { container } = render(<TrendsChart {...defaultProps} />);

      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '300px' });
    });

    it('applies custom height when provided', () => {
      const { container } = render(
        <TrendsChart {...defaultProps} height={400} />
      );

      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '400px' });
    });
  });

  describe('Icons', () => {
    it('displays trending up icon in header', () => {
      const { container } = render(<TrendsChart {...defaultProps} />);

      expect(
        container.querySelector('[class*="TrendingUp"]')
      ).toBeInTheDocument();
    });

    it('shows calendar icon in custom range button', () => {
      const { container } = render(<TrendsChart {...defaultProps} />);

      expect(
        container.querySelector('[class*="Calendar"]')
      ).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies proper card styling', () => {
      const { container } = render(<TrendsChart {...defaultProps} />);

      const card = container.querySelector('.p-6');
      expect(card).toBeInTheDocument();
    });

    it('applies flex layout for header', () => {
      const { container } = render(<TrendsChart {...defaultProps} />);

      const header = container.querySelector(
        '.flex.items-center.justify-between'
      );
      expect(header).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty labels array', () => {
      const dataWithEmptyLabels: TrendData = {
        labels: [],
        datasets: [{ label: 'Current', data: [] }],
      };

      render(<TrendsChart {...defaultProps} data={dataWithEmptyLabels} />);

      expect(screen.getByText('analytics.noDataAvailable')).toBeInTheDocument();
    });

    it('handles mismatched data lengths', () => {
      const mismatchedData: TrendData = {
        labels: ['Week 1', 'Week 2', 'Week 3'],
        datasets: [
          {
            label: 'Current',
            data: [1000, 1200], // Only 2 values for 3 labels
          },
        ],
      };

      render(<TrendsChart {...defaultProps} data={mismatchedData} />);

      const areaChart = screen.getByTestId('area-chart');
      const chartData = JSON.parse(
        areaChart.getAttribute('data-value') || '[]'
      );

      expect(chartData).toHaveLength(3);
      expect(chartData[2].current).toBeUndefined();
    });
  });
});
