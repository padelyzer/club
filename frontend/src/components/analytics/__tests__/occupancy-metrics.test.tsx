import React from 'react';
import { screen, within } from '@testing-library/react';
import { OccupancyMetrics } from '../occupancy-metrics';
import { render } from '@/test-utils';
import {
  mockOccupancyMetrics,
  createMockOccupancyMetrics,
} from '@/test-utils/analytics-mocks';

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
    <div data-testid="bar" data-key={dataKey}>
      {children}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
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

describe('OccupancyMetrics', () => {
  describe('Rendering', () => {
    it('renders without data', () => {
      render(<OccupancyMetrics data={null} />);

      expect(screen.getByText('analytics.occupancy.title')).toBeInTheDocument();
    });

    it('renders with complete data', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(screen.getByText('analytics.occupancy.title')).toBeInTheDocument();
      expect(
        screen.getByText('analytics.occupancy.overall')
      ).toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} isLoading={true} />);

      expect(screen.getByTestId('metric-loading')).toBeInTheDocument();
    });
  });

  describe('Overall Occupancy Display', () => {
    it('shows overall occupancy metric card', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      const metricCard = screen.getByTestId('metric-card');
      expect(
        within(metricCard).getByText('analytics.occupancy.overall')
      ).toBeInTheDocument();
      expect(within(metricCard).getByText('75%')).toBeInTheDocument();
      expect(within(metricCard).getByText('up')).toBeInTheDocument();
    });

    it('shows utilization rate', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(
        screen.getByText('analytics.occupancy.utilization')
      ).toBeInTheDocument();
      expect(screen.getByText('78.0%')).toBeInTheDocument();
    });

    it('does not show utilization rate when not available', () => {
      const dataWithoutUtilization = createMockOccupancyMetrics({
        utilizationRate: undefined,
      });

      render(<OccupancyMetrics data={dataWithoutUtilization} />);

      expect(
        screen.queryByText('analytics.occupancy.utilization')
      ).not.toBeInTheDocument();
    });
  });

  describe('Time Slot Distribution', () => {
    it('displays all time slots', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(
        screen.getByText('analytics.occupancy.byTimeSlot')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.occupancy.morning')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.occupancy.afternoon')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.occupancy.evening')
      ).toBeInTheDocument();
    });

    it('shows occupancy values for each time slot', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(screen.getByText('65.0%')).toBeInTheDocument(); // Morning
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // Afternoon
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // Evening (also appears in peak slots)
    });

    it('renders progress bars for time slots', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      const progressBars = screen.getAllByTestId('progress');
      expect(progressBars).toHaveLength(3);
      expect(progressBars[0]).toHaveAttribute('data-value', '65');
      expect(progressBars[1]).toHaveAttribute('data-value', '80');
      expect(progressBars[2]).toHaveAttribute('data-value', '85');
    });
  });

  describe('Court Occupancy Chart', () => {
    it('renders court occupancy bar chart', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(
        screen.getByText('analytics.occupancy.byCourt')
      ).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('passes correct data to bar chart', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-value') || '[]');

      expect(chartData).toHaveLength(
        Object.keys(mockOccupancyMetrics.byCourt).length
      );
      expect(chartData[0]).toMatchObject({
        name: expect.any(String),
        value: expect.any(Number),
        color: expect.any(String),
      });
    });

    it('applies correct colors based on occupancy levels', () => {
      const dataWithVariedOccupancy = createMockOccupancyMetrics({
        byCourt: {
          'Court 1': { value: 85, previousValue: 80, changePercentage: 6.25 },
          'Court 2': { value: 65, previousValue: 60, changePercentage: 8.33 },
          'Court 3': { value: 45, previousValue: 40, changePercentage: 12.5 },
          'Court 4': { value: 35, previousValue: 30, changePercentage: 16.67 },
        },
      });

      render(<OccupancyMetrics data={dataWithVariedOccupancy} />);

      const cells = screen.getAllByTestId('cell');
      expect(cells[0]).toHaveAttribute('data-fill', '#10B981'); // >80% = green
      expect(cells[1]).toHaveAttribute('data-fill', '#3B82F6'); // >60% = blue
      expect(cells[2]).toHaveAttribute('data-fill', '#F59E0B'); // >40% = yellow
      expect(cells[3]).toHaveAttribute('data-fill', '#EF4444'); // <40% = red
    });

    it('does not render chart when no court data', () => {
      const dataWithoutCourts = createMockOccupancyMetrics({
        byCourt: {},
      });

      render(<OccupancyMetrics data={dataWithoutCourts} />);

      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Peak Hours', () => {
    it('displays peak hours when available', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(
        screen.getByText('analytics.occupancy.peakHours')
      ).toBeInTheDocument();
      expect(screen.getByText('18:00, 19:00, 20:00')).toBeInTheDocument();
    });

    it('does not show peak hours when not available', () => {
      const dataWithoutPeakHours = createMockOccupancyMetrics({
        peakHours: [],
      });

      render(<OccupancyMetrics data={dataWithoutPeakHours} />);

      expect(
        screen.queryByText('analytics.occupancy.peakHours')
      ).not.toBeInTheDocument();
    });

    it('does not show peak hours section when undefined', () => {
      const dataWithUndefinedPeakHours = createMockOccupancyMetrics({
        peakHours: undefined,
      });

      render(<OccupancyMetrics data={dataWithUndefinedPeakHours} />);

      expect(
        screen.queryByText('analytics.occupancy.peakHours')
      ).not.toBeInTheDocument();
    });
  });

  describe('Occupancy Status', () => {
    it('displays current status', () => {
      render(<OccupancyMetrics data={mockOccupancyMetrics} />);

      expect(
        screen.getByText('analytics.occupancy.currentStatus')
      ).toBeInTheDocument();
    });

    it('shows excellent status for high occupancy', () => {
      const highOccupancyData = createMockOccupancyMetrics({
        overall: {
          value: 85,
          previousValue: 80,
          change: 5,
          changePercentage: 6.25,
          trend: 'up',
        },
      });

      render(<OccupancyMetrics data={highOccupancyData} />);

      expect(
        screen.getByText('analytics.occupancy.status.excellent')
      ).toBeInTheDocument();
    });

    it('shows good status for medium-high occupancy', () => {
      const goodOccupancyData = createMockOccupancyMetrics({
        overall: {
          value: 70,
          previousValue: 65,
          change: 5,
          changePercentage: 7.69,
          trend: 'up',
        },
      });

      render(<OccupancyMetrics data={goodOccupancyData} />);

      expect(
        screen.getByText('analytics.occupancy.status.good')
      ).toBeInTheDocument();
    });

    it('shows moderate status for medium occupancy', () => {
      const moderateOccupancyData = createMockOccupancyMetrics({
        overall: {
          value: 50,
          previousValue: 45,
          change: 5,
          changePercentage: 11.11,
          trend: 'up',
        },
      });

      render(<OccupancyMetrics data={moderateOccupancyData} />);

      expect(
        screen.getByText('analytics.occupancy.status.moderate')
      ).toBeInTheDocument();
    });

    it('shows low status for low occupancy', () => {
      const lowOccupancyData = createMockOccupancyMetrics({
        overall: {
          value: 30,
          previousValue: 35,
          change: -5,
          changePercentage: -14.29,
          trend: 'down',
        },
      });

      render(<OccupancyMetrics data={lowOccupancyData} />);

      expect(
        screen.getByText('analytics.occupancy.status.low')
      ).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies gradient background to main card', () => {
      const { container } = render(
        <OccupancyMetrics data={mockOccupancyMetrics} />
      );

      const mainCard = container.querySelector(
        '.bg-gradient-to-br.from-purple-50.to-pink-50'
      );
      expect(mainCard).toBeInTheDocument();
    });

    it('applies proper styling to time slot icons', () => {
      const { container } = render(
        <OccupancyMetrics data={mockOccupancyMetrics} />
      );

      const yellowBg = container.querySelector('.bg-yellow-100');
      const orangeBg = container.querySelector('.bg-orange-100');
      const purpleBg = container.querySelector('.bg-purple-100');

      expect(yellowBg).toBeInTheDocument();
      expect(orangeBg).toBeInTheDocument();
      expect(purpleBg).toBeInTheDocument();
    });

    it('uses correct text colors for time slots', () => {
      const { container } = render(
        <OccupancyMetrics data={mockOccupancyMetrics} />
      );

      expect(container.querySelector('.text-yellow-700')).toBeInTheDocument();
      expect(container.querySelector('.text-orange-700')).toBeInTheDocument();
      expect(container.querySelector('.text-purple-700')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('displays main occupancy icon in header', () => {
      const { container } = render(
        <OccupancyMetrics data={mockOccupancyMetrics} />
      );

      const headerIcon = container.querySelector('.h-6.w-6.text-purple-600');
      expect(headerIcon).toBeInTheDocument();
    });

    it('shows clock icon for time slot section', () => {
      const { container } = render(
        <OccupancyMetrics data={mockOccupancyMetrics} />
      );

      const clockIcon = container.querySelector('[class*="Clock"]');
      expect(clockIcon).toBeInTheDocument();
    });

    it('shows alert icon for peak hours', () => {
      const { container } = render(
        <OccupancyMetrics data={mockOccupancyMetrics} />
      );

      const alertIcon = container.querySelector('[class*="AlertCircle"]');
      expect(alertIcon).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles null data gracefully', () => {
      render(<OccupancyMetrics data={null} />);

      // Should still render the component structure
      expect(screen.getByText('analytics.occupancy.title')).toBeInTheDocument();
    });

    it('shows zero values when data is null', () => {
      render(<OccupancyMetrics data={null} />);

      const metricValue = screen.getByTestId('metric-value');
      expect(metricValue).toHaveTextContent('0%');
    });
  });

  describe('Color Coding', () => {
    it('applies correct color classes for utilization rate', () => {
      const testCases = [
        { value: 85, expectedClass: 'text-green-600 bg-green-100' },
        { value: 70, expectedClass: 'text-blue-600 bg-blue-100' },
        { value: 50, expectedClass: 'text-yellow-600 bg-yellow-100' },
        { value: 30, expectedClass: 'text-red-600 bg-red-100' },
      ];

      testCases.forEach(({ value, expectedClass }) => {
        const data = createMockOccupancyMetrics({
          utilizationRate: {
            value,
            previousValue: value - 5,
            changePercentage: 5,
          },
        });

        const { container } = render(<OccupancyMetrics data={data} />);

        const utilizationElement = container.querySelector(
          `.${expectedClass.split(' ').join('.')}`
        );
        expect(utilizationElement).toBeInTheDocument();
      });
    });
  });
});
