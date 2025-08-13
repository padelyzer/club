import React from 'react';
import { screen, within } from '@testing-library/react';
import { CustomerMetrics } from '../customer-metrics';
import { render } from '@/test-utils';
import {
  mockCustomerMetrics,
  createMockCustomerMetrics,
} from '@/test-utils/analytics-mocks';

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

// Mock Avatar component
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
}));

// Mock Badge component
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

describe('CustomerMetrics', () => {
  describe('Rendering', () => {
    it('renders without data', () => {
      render(<CustomerMetrics data={null} />);

      expect(screen.getByText('analytics.customers.title')).toBeInTheDocument();
    });

    it('renders with complete data', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(screen.getByText('analytics.customers.title')).toBeInTheDocument();
      expect(
        screen.getByText('analytics.customers.totalActive')
      ).toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} isLoading={true} />);

      expect(screen.getByTestId('metric-loading')).toBeInTheDocument();
    });
  });

  describe('Total Active Customers', () => {
    it('shows total active customers metric card', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      const metricCard = screen.getByTestId('metric-card');
      expect(
        within(metricCard).getByText('analytics.customers.totalActive')
      ).toBeInTheDocument();
      expect(within(metricCard).getByText('450')).toBeInTheDocument();
      expect(within(metricCard).getByText('up')).toBeInTheDocument();
    });

    it('shows average lifetime value when available', () => {
      const dataWithLifetimeValue = createMockCustomerMetrics({
        averageLifetimeValue: {
          value: 2500,
          previousValue: 2200,
          changePercentage: 13.6,
        },
      });

      render(<CustomerMetrics data={dataWithLifetimeValue} />);

      expect(
        screen.getByText('analytics.customers.avgLifetimeValue')
      ).toBeInTheDocument();
      expect(screen.getByText('€2,500')).toBeInTheDocument();
    });

    it('does not show lifetime value when not available', () => {
      const dataWithoutLifetimeValue = createMockCustomerMetrics({
        averageLifetimeValue: undefined,
      });

      render(<CustomerMetrics data={dataWithoutLifetimeValue} />);

      expect(
        screen.queryByText('analytics.customers.avgLifetimeValue')
      ).not.toBeInTheDocument();
    });
  });

  describe('Customer Metrics Grid', () => {
    it('displays all customer metrics', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(screen.getByText('analytics.customers.new')).toBeInTheDocument();
      expect(
        screen.getByText('analytics.customers.returning')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.customers.churnRate')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.customers.satisfaction')
      ).toBeInTheDocument();
    });

    it('shows correct values for each metric', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(screen.getByText('45')).toBeInTheDocument(); // New customers
      expect(screen.getByText('405')).toBeInTheDocument(); // Returning customers
      expect(screen.getByText('3.5%')).toBeInTheDocument(); // Churn rate
      expect(screen.getByText('4.8')).toBeInTheDocument(); // Satisfaction score
    });

    it('displays trend indicators for metrics', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      // Should have trend indicators for all metrics
      const trendIndicators = screen.getAllByText(/[+-]\d+\.\d%/);
      expect(trendIndicators.length).toBeGreaterThan(0);
    });

    it('shows inverted trend for churn rate', () => {
      const dataWithHigherChurn = createMockCustomerMetrics({
        churnRate: {
          value: 5.0,
          previousValue: 3.5,
          changePercentage: 42.9,
        },
      });

      render(<CustomerMetrics data={dataWithHigherChurn} />);

      // Higher churn should show as negative (red)
      const churnSection = screen
        .getByText('analytics.customers.churnRate')
        .closest('div');
      const trendIndicator = within(churnSection!).getByText('+42.9%');
      expect(trendIndicator).toHaveClass('text-red-600');
    });
  });

  describe('Top Customers', () => {
    it('displays top customers section', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(
        screen.getByText('analytics.customers.topCustomers')
      ).toBeInTheDocument();
      expect(
        screen.getByText('analytics.customers.thisMonth')
      ).toBeInTheDocument();
    });

    it('shows customer information', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Carlos García')).toBeInTheDocument();
    });

    it('displays customer reservations and spending', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(
        screen.getByText(/25.*analytics.customers.reservations/)
      ).toBeInTheDocument();
      expect(screen.getByText('€1,250')).toBeInTheDocument();
    });

    it('shows customer initials in avatars', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
      expect(screen.getByText('CG')).toBeInTheDocument(); // Carlos García
    });

    it('displays star badges for top 3 customers', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      const avatars = screen.getAllByTestId('avatar');
      // First 3 should have star badges
      expect(
        avatars
          .slice(0, 3)
          .every((avatar) => avatar.querySelector('[class*="Star"]'))
      ).toBeTruthy();
    });

    it('shows membership status badges', () => {
      const dataWithMemberships = createMockCustomerMetrics({
        topCustomers: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            totalSpent: 1250,
            reservations: 25,
            lastVisit: '2024-03-30',
            membershipStatus: 'active',
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            totalSpent: 1100,
            reservations: 22,
            lastVisit: '2024-03-28',
            membershipStatus: 'inactive',
          },
        ],
      });

      render(<CustomerMetrics data={dataWithMemberships} />);

      const memberBadges = screen
        .getAllByTestId('badge')
        .filter((badge) => badge.getAttribute('data-variant') === 'success');
      expect(memberBadges).toHaveLength(1);
      expect(memberBadges[0]).toHaveTextContent('analytics.customers.member');
    });

    it('limits display to 5 customers', () => {
      const dataWithManyCustomers = createMockCustomerMetrics({
        topCustomers: Array.from({ length: 10 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`,
          totalSpent: 1000 - i * 50,
          reservations: 20 - i,
          lastVisit: '2024-03-30',
          membershipStatus: 'none' as const,
        })),
      });

      render(<CustomerMetrics data={dataWithManyCustomers} />);

      const customerNames = screen.getAllByText(/Customer \d+/);
      expect(customerNames).toHaveLength(5);
    });

    it('does not show top customers when empty', () => {
      const dataWithoutCustomers = createMockCustomerMetrics({
        topCustomers: [],
      });

      render(<CustomerMetrics data={dataWithoutCustomers} />);

      expect(
        screen.queryByText('analytics.customers.topCustomers')
      ).not.toBeInTheDocument();
    });
  });

  describe('Customer Insights', () => {
    it('displays insights section', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      expect(
        screen.getByText('analytics.customers.insights')
      ).toBeInTheDocument();
    });

    it('shows growth insight for high new customer growth', () => {
      const dataWithHighGrowth = createMockCustomerMetrics({
        newCustomers: {
          value: 45,
          previousValue: 30,
          changePercentage: 50,
        },
      });

      render(<CustomerMetrics data={dataWithHighGrowth} />);

      expect(
        screen.getByText(/analytics.customers.insightGrowth.*50/)
      ).toBeInTheDocument();
    });

    it('shows low churn insight when churn is below 5%', () => {
      const dataWithLowChurn = createMockCustomerMetrics({
        churnRate: {
          value: 3.5,
          previousValue: 4.0,
          changePercentage: -12.5,
        },
      });

      render(<CustomerMetrics data={dataWithLowChurn} />);

      expect(
        screen.getByText(/analytics.customers.insightLowChurn/)
      ).toBeInTheDocument();
    });

    it('shows high satisfaction insight when score is above 4.5', () => {
      const dataWithHighSatisfaction = createMockCustomerMetrics({
        satisfactionScore: {
          value: 4.8,
          previousValue: 4.6,
          changePercentage: 4.3,
        },
      });

      render(<CustomerMetrics data={dataWithHighSatisfaction} />);

      expect(
        screen.getByText(/analytics.customers.insightHighSatisfaction/)
      ).toBeInTheDocument();
    });

    it('does not show insights when conditions are not met', () => {
      const dataWithNoInsights = createMockCustomerMetrics({
        newCustomers: { value: 45, previousValue: 40, changePercentage: 12.5 },
        churnRate: { value: 8.0, previousValue: 7.5, changePercentage: 6.7 },
        satisfactionScore: {
          value: 4.0,
          previousValue: 4.2,
          changePercentage: -4.8,
        },
      });

      render(<CustomerMetrics data={dataWithNoInsights} />);

      expect(
        screen.queryByText(/analytics.customers.insightGrowth/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/analytics.customers.insightLowChurn/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/analytics.customers.insightHighSatisfaction/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies gradient background to main card', () => {
      const { container } = render(
        <CustomerMetrics data={mockCustomerMetrics} />
      );

      const mainCard = container.querySelector(
        '.bg-gradient-to-br.from-green-50.to-emerald-50'
      );
      expect(mainCard).toBeInTheDocument();
    });

    it('uses grid layout for metrics', () => {
      const { container } = render(
        <CustomerMetrics data={mockCustomerMetrics} />
      );

      const gridContainer = container.querySelector('.grid.grid-cols-2.gap-4');
      expect(gridContainer).toBeInTheDocument();
    });

    it('applies proper styling to customer cards', () => {
      const { container } = render(
        <CustomerMetrics data={mockCustomerMetrics} />
      );

      const customerCards = container.querySelectorAll(
        '.bg-white.rounded-lg.p-4.border.border-gray-200'
      );
      expect(customerCards.length).toBeGreaterThan(0);
    });
  });

  describe('Icons', () => {
    it('displays main customers icon in header', () => {
      const { container } = render(
        <CustomerMetrics data={mockCustomerMetrics} />
      );

      const headerIcon = container.querySelector('.h-6.w-6.text-green-600');
      expect(headerIcon).toBeInTheDocument();
    });

    it('shows trophy icon for top customers', () => {
      const { container } = render(
        <CustomerMetrics data={mockCustomerMetrics} />
      );

      const trophyIcon = container.querySelector('[class*="Trophy"]');
      expect(trophyIcon).toBeInTheDocument();
    });

    it('displays metric icons', () => {
      const { container } = render(
        <CustomerMetrics data={mockCustomerMetrics} />
      );

      // Check for presence of metric icons
      expect(
        container.querySelector('[class*="UserPlus"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[class*="UserCheck"]')
      ).toBeInTheDocument();
      expect(container.querySelector('[class*="UserX"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="Heart"]')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles null data gracefully', () => {
      render(<CustomerMetrics data={null} />);

      // Should still render the component structure
      expect(screen.getByText('analytics.customers.title')).toBeInTheDocument();
    });

    it('shows zero values when data is null', () => {
      render(<CustomerMetrics data={null} />);

      const metricValue = screen.getByTestId('metric-value');
      expect(metricValue).toHaveTextContent('0');
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency values correctly', () => {
      render(<CustomerMetrics data={mockCustomerMetrics} />);

      // Check customer spending is formatted
      expect(screen.getByText('€1,250')).toBeInTheDocument();
      expect(screen.getByText('€1,100')).toBeInTheDocument();
      expect(screen.getByText('€1,000')).toBeInTheDocument();
    });

    it('handles zero currency values', () => {
      const dataWithZeroRevenue = createMockCustomerMetrics({
        topCustomers: [
          {
            id: '1',
            name: 'Free User',
            email: 'free@example.com',
            totalSpent: 0,
            reservations: 5,
            lastVisit: '2024-03-30',
            membershipStatus: 'none',
          },
        ],
      });

      render(<CustomerMetrics data={dataWithZeroRevenue} />);

      expect(screen.getByText('€0')).toBeInTheDocument();
    });
  });
});
