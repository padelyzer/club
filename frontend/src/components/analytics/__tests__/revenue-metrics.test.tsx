import React from 'react';
import { screen, within } from '@testing-library/react';
import { RevenueMetrics } from '../revenue-metrics';
import { render } from '@/test-utils';
import {
  mockRevenueMetrics,
  createMockRevenueMetrics,
} from '@/test-utils/analytics-mocks';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: any) => (
    <div data-testid="pie" data-value={JSON.stringify(data) || ''}>
      {children}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock MetricCard component
jest.mock('@/components/charts/MetricCard', () => ({
  MetricCard: ({ title, value, format, trend, isLoading }: any) => (
    <div data-testid="metric-card">
      <div data-testid="metric-title">{title}</div>
      <div data-testid="metric-value">
        {format === 'currency' ? `€${value.toLocaleString()}` : value}
      </div>
      {trend && <div data-testid="metric-trend">{trend}</div>}
      {isLoading && <div data-testid="metric-loading">Loading...</div>}
    </div>
  ),
}));

describe('RevenueMetrics', () => {
  describe('Rendering', () => {
    it('renders without data', () => {
      render(<RevenueMetrics data={null} />);

      expect(screen.getByText('analytics.revenue.title')).toBeInTheDocument();
    });

    it('renders with complete data', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(screen.getByText('analytics.revenue.title')).toBeInTheDocument();
      expect(screen.getByText('analytics.revenue.total')).toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} isLoading={true} />);

      expect(screen.getByTestId('metric-loading')).toBeInTheDocument();
    });
  });

  describe('Total Revenue Display', () => {
    it('shows total revenue metric card', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      const metricCard = screen.getByTestId('metric-card');
      expect(
        within(metricCard).getByText('analytics.revenue.total')
      ).toBeInTheDocument();
      expect(within(metricCard).getByText('€25,000')).toBeInTheDocument();
      expect(within(metricCard).getByText('up')).toBeInTheDocument();
    });

    it('shows projected revenue when available', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(
        screen.getByText(/analytics.revenue.projected/)
      ).toBeInTheDocument();
      expect(screen.getByText('€28,000')).toBeInTheDocument();
    });

    it('does not show projected revenue when not available', () => {
      const dataWithoutProjected = createMockRevenueMetrics({
        projectedRevenue: undefined,
      });

      render(<RevenueMetrics data={dataWithoutProjected} />);

      expect(
        screen.queryByText('analytics.revenue.projected')
      ).not.toBeInTheDocument();
    });
  });

  describe('Revenue by Source', () => {
    it('displays all revenue sources', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(
        screen.getByText('analytics.revenueSources.reservations')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.revenueSources.memberships')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.revenueSources.classes')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.revenueSources.products')
      ).toBeInTheDocument();
    });

    it('shows revenue values for each source', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(screen.getByText('€18,000')).toBeInTheDocument(); // Reservations
      expect(screen.getByText('€4,000')).toBeInTheDocument(); // Memberships
      expect(screen.getByText('€2,000')).toBeInTheDocument(); // Classes
      expect(screen.getByText('€1,000')).toBeInTheDocument(); // Products
    });

    it('displays change percentages for sources', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(screen.getByText('+12.5%')).toBeInTheDocument(); // Reservations
      expect(screen.getByText('+14.3%')).toBeInTheDocument(); // Memberships
      expect(screen.getByText('+11.1%')).toBeInTheDocument(); // Classes
      expect(screen.getByText('+42.9%')).toBeInTheDocument(); // Products
    });

    it('shows negative change with proper formatting', () => {
      const dataWithNegativeChange = createMockRevenueMetrics({
        bySource: {
          ...mockRevenueMetrics.bySource,
          products: {
            value: 1000,
            previousValue: 1200,
            changePercentage: -16.7,
          },
        },
      });

      render(<RevenueMetrics data={dataWithNegativeChange} />);

      expect(screen.getByText('-16.7%')).toBeInTheDocument();
    });
  });

  describe('Payment Methods Chart', () => {
    it('renders payment methods pie chart', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(
        screen.getByText('analytics.revenue.byPaymentMethod')
      ).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('passes correct data to pie chart', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      const pie = screen.getByTestId('pie');
      const pieData = JSON.parse(pie.getAttribute('data-value') || '[]');

      expect(pieData).toHaveLength(4);
      expect(pieData[0]).toMatchObject({
        name: 'analytics.paymentMethods.cash',
        value: 5000,
        color: '#10B981',
      });
      expect(pieData[1]).toMatchObject({
        name: 'analytics.paymentMethods.card',
        value: 15000,
        color: '#3B82F6',
      });
    });

    it('filters out payment methods with zero value', () => {
      const dataWithZeroPayment = createMockRevenueMetrics({
        byPaymentMethod: {
          cash: 5000,
          card: 15000,
          transfer: 0,
          other: 0,
        },
      });

      render(<RevenueMetrics data={dataWithZeroPayment} />);

      const pie = screen.getByTestId('pie');
      const pieData = JSON.parse(pie.getAttribute('data-value') || '[]');

      expect(pieData).toHaveLength(2);
      expect(pieData.find((item: any) => item.value === 0)).toBeUndefined();
    });

    it('does not render chart when no payment method data', () => {
      const dataWithoutPayments = createMockRevenueMetrics({
        byPaymentMethod: {
          cash: 0,
          card: 0,
          transfer: 0,
          other: 0,
        },
      });

      render(<RevenueMetrics data={dataWithoutPayments} />);

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Average Transaction Value', () => {
    it('displays average transaction value', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(
        screen.getByText('analytics.revenue.averageTransaction')
      ).toBeInTheDocument();
      expect(screen.getByText('€45')).toBeInTheDocument();
    });

    it('shows change percentage for average transaction', () => {
      render(<RevenueMetrics data={mockRevenueMetrics} />);

      expect(screen.getByText('+7.1% vs previous')).toBeInTheDocument();
    });

    it('does not show section when no average transaction data', () => {
      const dataWithoutAverage = createMockRevenueMetrics({
        averageTransactionValue: undefined,
      });

      render(<RevenueMetrics data={dataWithoutAverage} />);

      expect(
        screen.queryByText('analytics.revenue.averageTransaction')
      ).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies gradient background to main card', () => {
      const { container } = render(
        <RevenueMetrics data={mockRevenueMetrics} />
      );

      const mainCard = container.querySelector(
        '.bg-gradient-to-br.from-blue-50.to-indigo-50'
      );
      expect(mainCard).toBeInTheDocument();
    });

    it('uses grid layout for revenue sources', () => {
      const { container } = render(
        <RevenueMetrics data={mockRevenueMetrics} />
      );

      const gridContainer = container.querySelector('.grid.grid-cols-2.gap-4');
      expect(gridContainer).toBeInTheDocument();
    });

    it('applies proper styling to metric cards', () => {
      const { container } = render(
        <RevenueMetrics data={mockRevenueMetrics} />
      );

      const metricCards = container.querySelectorAll(
        '.bg-white.rounded-lg.p-4.border.border-gray-200'
      );
      expect(metricCards.length).toBeGreaterThan(0);
    });
  });

  describe('Icons', () => {
    it('displays correct icons for each revenue source', () => {
      const { container } = render(
        <RevenueMetrics data={mockRevenueMetrics} />
      );

      // Check for presence of icons (they're rendered as part of the component)
      const icons = container.querySelectorAll('[class*="lucide"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows main revenue icon in header', () => {
      const { container } = render(
        <RevenueMetrics data={mockRevenueMetrics} />
      );

      const headerIcon = container.querySelector('.h-6.w-6.text-blue-600');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats large numbers correctly', () => {
      const largeValueData = createMockRevenueMetrics({
        total: {
          ...mockRevenueMetrics.total,
          value: 1234567,
        },
      });

      render(<RevenueMetrics data={largeValueData} />);

      expect(screen.getByText('€1,234,567')).toBeInTheDocument();
    });

    it('formats zero values correctly', () => {
      const zeroValueData = createMockRevenueMetrics({
        bySource: {
          ...mockRevenueMetrics.bySource,
          products: {
            value: 0,
            previousValue: 0,
            changePercentage: 0,
          },
        },
      });

      render(<RevenueMetrics data={zeroValueData} />);

      expect(screen.getByText('€0')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles null data gracefully', () => {
      render(<RevenueMetrics data={null} />);

      // Should still render the component structure
      expect(screen.getByText('analytics.revenue.title')).toBeInTheDocument();
    });

    it('shows zero values when data is null', () => {
      render(<RevenueMetrics data={null} />);

      const metricValue = screen.getByTestId('metric-value');
      expect(metricValue).toHaveTextContent('€0');
    });
  });
});
