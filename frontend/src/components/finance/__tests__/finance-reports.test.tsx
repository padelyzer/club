import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceReports } from '../finance-reports';
import { FinanceExportService } from '@/lib/api/services/finance-export.service';
import { toast } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/lib/api/services/finance-export.service', () => ({
  FinanceExportService: {
    exportReport: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params?.format) {
        return `Report exported successfully as ${params.format}`;
      }
      return key;
    },
  }),
}));

// Mock finance hooks
jest.mock('@/lib/api/hooks/useFinance', () => ({
  useFinancialMetrics: () => ({
    data: {
      totalRevenue: 50000,
      totalExpenses: 30000,
      netIncome: 20000,
      grossMargin: 40,
      averageTransactionValue: 150,
      totalPayments: 333,
      previousPeriod: null,
    },
    isLoading: false,
  }),
  useRevenueByCategory: () => ({
    data: [
      { category: 'Reservations', amount: 25000, percentage: 50 },
      { category: 'Memberships', amount: 15000, percentage: 30 },
      { category: 'Classes', amount: 10000, percentage: 20 },
    ],
    isLoading: false,
  }),
  usePaymentMethodStats: () => ({
    data: [
      {
        method: 'Card',
        amount: 30000,
        percentage: 60,
        transactions: 200,
        color: '#0088FE',
      },
      {
        method: 'Cash',
        amount: 15000,
        percentage: 30,
        transactions: 100,
        color: '#00C49F',
      },
      {
        method: 'Transfer',
        amount: 5000,
        percentage: 10,
        transactions: 33,
        color: '#FFBB28',
      },
    ],
    isLoading: false,
  }),
  useMonthlyFinancialData: () => ({
    data: [
      { month: 'Jan', revenue: 45000, expenses: 28000, profit: 17000 },
      { month: 'Feb', revenue: 50000, expenses: 30000, profit: 20000 },
      { month: 'Mar', revenue: 48000, expenses: 29000, profit: 19000 },
    ],
    isLoading: false,
  }),
}));

const mockExportReport = FinanceExportService.exportReport as jest.Mock;

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('FinanceReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the finance reports page', () => {
      renderWithProviders(<FinanceReports />);

      expect(screen.getByText('finance.reports')).toBeInTheDocument();
      expect(screen.getByText('finance.reportsSubtitle')).toBeInTheDocument();
    });

    it('displays key metrics', () => {
      renderWithProviders(<FinanceReports />);

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      // Multiple elements with $30,000 may exist (expenses and payment method)
      const thirtyThousandElements = screen.getAllByText('$30,000');
      expect(thirtyThousandElements.length).toBeGreaterThan(0);
      expect(screen.getByText('$20,000')).toBeInTheDocument();
      expect(screen.getByText('40.0% margin')).toBeInTheDocument();
    });

    it('shows revenue by category chart', () => {
      renderWithProviders(<FinanceReports />);

      expect(screen.getByText('finance.revenueByCategory')).toBeInTheDocument();
      expect(screen.getByText('Reservations')).toBeInTheDocument();
      expect(screen.getByText('Memberships')).toBeInTheDocument();
      expect(screen.getByText('Classes')).toBeInTheDocument();
    });

    it('shows payment methods distribution', () => {
      renderWithProviders(<FinanceReports />);

      expect(
        screen.getByText('finance.paymentMethodsDistribution')
      ).toBeInTheDocument();
      expect(screen.getByText('Card')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('exports report as PDF', async () => {
      renderWithProviders(<FinanceReports />);

      const exportButton = screen.getAllByText('finance.exportPDF')[0];
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportReport).toHaveBeenCalledWith({
          format: 'pdf',
          reportType: 'overview',
          period: expect.objectContaining({
            label: 'finance.thisMonth',
          }),
          data: expect.objectContaining({
            metrics: expect.any(Object),
            revenueByCategory: expect.any(Array),
            paymentMethodStats: expect.any(Array),
            monthlyData: expect.any(Array),
          }),
        });
        expect(toast.success).toHaveBeenCalledWith(
          'Report exported successfully as PDF'
        );
      });
    });

    it('exports report as Excel', async () => {
      renderWithProviders(<FinanceReports />);

      const exportButton = screen.getByText('Excel');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportReport).toHaveBeenCalledWith({
          format: 'excel',
          reportType: 'overview',
          period: expect.any(Object),
          data: expect.any(Object),
        });
        expect(toast.success).toHaveBeenCalledWith(
          'Report exported successfully as EXCEL'
        );
      });
    });

    it('exports report as CSV', async () => {
      renderWithProviders(<FinanceReports />);

      const exportButton = screen.getByText('CSV');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportReport).toHaveBeenCalledWith({
          format: 'csv',
          reportType: 'overview',
          period: expect.any(Object),
          data: expect.any(Object),
        });
        expect(toast.success).toHaveBeenCalledWith(
          'Report exported successfully as CSV'
        );
      });
    });

    it('handles export errors', async () => {
      mockExportReport.mockRejectedValue(new Error('Export failed'));

      renderWithProviders(<FinanceReports />);

      const exportButton = screen.getAllByText('finance.exportPDF')[0];
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('finance.exportError');
      });
    });
  });

  describe('Period Selection', () => {
    it('renders period selector', () => {
      renderWithProviders(<FinanceReports />);

      // Check that period options are present in the component
      expect(screen.getByText('finance.thisMonth')).toBeInTheDocument();
    });
  });

  describe('Report Type Selection', () => {
    it('renders report type selector', () => {
      renderWithProviders(<FinanceReports />);

      // Check that report type options are present in the component
      expect(screen.getByText('finance.overview')).toBeInTheDocument();
    });
  });
});
