import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DashboardPage from '@/app/[locale]/(dashboard)/dashboard/page';
import { 
  createTestWrapper, 
  mockBFFResponses, 
  setupGlobalMocks,
  MockWebSocket
} from '@/test-utils/setup';
import { createMockDashboardData, createMockWebSocketMessage } from '@/test-utils/mock-factories';

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  BFF_FEATURES: { dashboard: true }
}));

// Mock the analytics hook
vi.mock('@/lib/api/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn(() => ({
    monthlyRevenue: 15420,
    todayReservations: 23,
    weeklyGrowth: 12.5,
    occupancyRate: 78,
    activeMembers: 156,
    pendingPayments: 8,
    upcomingClasses: 5,
    maintenanceTasks: 3,
    recentActivity: mockBFFResponses.dashboard.recentActivity,
    courtUtilization: mockBFFResponses.dashboard.courtUtilization,
    revenueChart: mockBFFResponses.dashboard.revenueChart,
    isLoading: false,
    error: null,
    refresh: vi.fn()
  }))
}));

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null
}));

describe('Dashboard Overview Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render dashboard with BFF data correctly', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
    });

    // Verify key metrics are displayed
    expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
    expect(screen.getByText('$15,420')).toBeInTheDocument();
    
    expect(screen.getByText('Today\'s Reservations')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    
    expect(screen.getByText('Occupancy Rate')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('should show loading skeleton during fetch', async () => {
    // Mock loading state
    const useAnalyticsMock = await import('@/lib/api/hooks/useAnalytics');
    (useAnalyticsMock.useAnalytics as any).mockReturnValueOnce({
      isLoading: true,
      error: null
    });

    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    // Should show skeleton
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
    
    // Should not show data yet
    expect(screen.queryByText('$15,420')).not.toBeInTheDocument();
  });

  it('should handle errors with error boundary', async () => {
    // Mock error state
    const useAnalyticsMock = await import('@/lib/api/hooks/useAnalytics');
    (useAnalyticsMock.useAnalytics as any).mockReturnValueOnce({
      isLoading: false,
      error: new Error('Failed to load dashboard data')
    });

    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    // Should show error state
    expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should display metrics with correct formatting', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('$15,420')).toBeInTheDocument();
    });

    // Currency formatting
    expect(screen.getByText('$15,420')).toBeInTheDocument();
    
    // Percentage formatting
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument(); // Weekly growth
    
    // Number formatting
    expect(screen.getByText('156')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('should handle real-time updates correctly', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('23')).toBeInTheDocument();
    });

    // Simulate WebSocket connection
    const ws = new MockWebSocket('ws://localhost:3000/ws');
    
    // Simulate real-time update
    const updateMessage = createMockWebSocketMessage('dashboard.update', {
      todayReservations: 25,
      monthlyRevenue: 16000
    });

    act(() => {
      ws.simulateMessage(updateMessage);
    });

    // Check if update is reflected
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('$16,000')).toBeInTheDocument();
    });
  });

  it('should be mobile responsive', async () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('$15,420')).toBeInTheDocument();
    });

    // Check mobile-specific layout
    const dashboard = screen.getByTestId('dashboard-container');
    expect(dashboard).toHaveClass('md:grid-cols-2', 'lg:grid-cols-4');
    
    // Verify cards stack vertically on mobile
    const metricCards = screen.getAllByTestId('metric-card');
    expect(metricCards.length).toBeGreaterThan(0);
  });

  it('should display recent activity feed', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Check activity items
    const activitySection = screen.getByTestId('recent-activity');
    expect(within(activitySection).getByText('Court 1 booked')).toBeInTheDocument();
    expect(within(activitySection).getByText('5 min ago')).toBeInTheDocument();
    expect(within(activitySection).getByText('Payment received')).toBeInTheDocument();
    expect(within(activitySection).getByText('10 min ago')).toBeInTheDocument();
  });

  it('should render court utilization chart', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('Court Utilization')).toBeInTheDocument();
    });

    // Check chart is rendered
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render revenue trend chart', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });

    // Check chart is rendered
    const revenueSection = screen.getByTestId('revenue-chart-section');
    expect(within(revenueSection).getByTestId('chart-container')).toBeInTheDocument();
    expect(within(revenueSection).getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle refresh action', async () => {
    const refreshMock = vi.fn();
    const useAnalyticsMock = await import('@/lib/api/hooks/useAnalytics');
    (useAnalyticsMock.useAnalytics as any).mockReturnValue({
      ...mockBFFResponses.dashboard,
      isLoading: false,
      error: null,
      refresh: refreshMock
    });

    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    // Click refresh button
    await user.click(screen.getByRole('button', { name: /refresh/i }));

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('should show quick actions', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    // Verify quick action buttons
    expect(screen.getByRole('button', { name: /new reservation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /schedule class/i })).toBeInTheDocument();
  });

  it('should display pending tasks summary', async () => {
    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    });

    // Check pending items
    expect(screen.getByText('8 Pending Payments')).toBeInTheDocument();
    expect(screen.getByText('3 Maintenance Tasks')).toBeInTheDocument();
    expect(screen.getByText('5 Upcoming Classes')).toBeInTheDocument();
  });

  it('should handle empty state gracefully', async () => {
    const useAnalyticsMock = await import('@/lib/api/hooks/useAnalytics');
    (useAnalyticsMock.useAnalytics as any).mockReturnValueOnce({
      monthlyRevenue: 0,
      todayReservations: 0,
      weeklyGrowth: 0,
      occupancyRate: 0,
      activeMembers: 0,
      pendingPayments: 0,
      upcomingClasses: 0,
      maintenanceTasks: 0,
      recentActivity: [],
      courtUtilization: { labels: [], data: [] },
      revenueChart: { labels: [], data: [] },
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<DashboardPage />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    // Should show empty state for activity
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });
});