'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFinancialMetrics,
  useRevenueByCategory,
  usePaymentMethodStats,
  useMonthlyFinancialData,
} from '@/lib/api/hooks/useFinance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { FinanceExportService } from '@/lib/api/services/finance-export.service';
import { toast } from '@/lib/toast';

export const FinanceReports = () => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [reportType, setReportType] = useState<
    'overview' | 'revenue' | 'expenses' | 'profit'
  >('overview');

  // Calculate period dates
  const getPeriodDates = (period: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (period) {
      case 'thisMonth':
        return {
          from: new Date(year, month, 1).toISOString().split('T')[0],
          to: new Date(year, month + 1, 0).toISOString().split('T')[0],
        };
      case 'lastMonth':
        return {
          from: new Date(year, month - 1, 1).toISOString().split('T')[0],
          to: new Date(year, month, 0).toISOString().split('T')[0],
        };
      case 'thisQuarter':
        const quarterStart = Math.floor(month / 3) * 3;
        return {
          from: new Date(year, quarterStart, 1).toISOString().split('T')[0],
          to: new Date(year, quarterStart + 3, 0).toISOString().split('T')[0],
        };
      case 'thisYear':
        return {
          from: new Date(year, 0, 1).toISOString().split('T')[0],
          to: new Date(year, 11, 31).toISOString().split('T')[0],
        };
      default:
        return {
          from: new Date(year, month, 1).toISOString().split('T')[0],
          to: new Date(year, month + 1, 0).toISOString().split('T')[0],
        };
    }
  };

  const periodDates = getPeriodDates(selectedPeriod);

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useFinancialMetrics(periodDates);

  const { data: revenueByCategory, isLoading: categoryLoading } =
    useRevenueByCategory(periodDates);

  const { data: paymentMethodStats, isLoading: methodStatsLoading } =
    usePaymentMethodStats(periodDates);

  const { data: monthlyData, isLoading: monthlyLoading } =
    useMonthlyFinancialData(new Date().getFullYear());

  const isLoading =
    metricsLoading || categoryLoading || methodStatsLoading || monthlyLoading;

  // Sample data for charts when real data is not available
  const sampleRevenueData = [
    { category: 'Reservations', amount: 15000, percentage: 45 },
    { category: 'Memberships', amount: 8000, percentage: 24 },
    { category: 'Classes', amount: 6000, percentage: 18 },
    { category: 'Products', amount: 4000, percentage: 12 },
  ];

  const samplePaymentMethodData = [
    { method: 'Card', amount: 18000, percentage: 54, color: '#0088FE' },
    { method: 'Cash', amount: 8000, percentage: 24, color: '#00C49F' },
    { method: 'Transfer', amount: 6000, percentage: 18, color: '#FFBB28' },
    { method: 'Other', amount: 1000, percentage: 3, color: '#FF8042' },
  ];

  const sampleMonthlyData = [
    { month: 'Jan', revenue: 28000, expenses: 18000, profit: 10000 },
    { month: 'Feb', revenue: 32000, expenses: 19000, profit: 13000 },
    { month: 'Mar', revenue: 29000, expenses: 17000, profit: 12000 },
    { month: 'Apr', revenue: 35000, expenses: 21000, profit: 14000 },
    { month: 'May', revenue: 33000, expenses: 20000, profit: 13000 },
    { month: 'Jun', revenue: 38000, expenses: 22000, profit: 16000 },
  ];

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'thisMonth':
        return t('finance.thisMonth');
      case 'lastMonth':
        return t('finance.lastMonth');
      case 'thisQuarter':
        return t('finance.thisQuarter');
      case 'thisYear':
        return t('finance.thisYear');
      default:
        return period;
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const exportData = {
        metrics,
        revenueByCategory: revenueByCategory || sampleRevenueData,
        paymentMethodStats: paymentMethodStats || samplePaymentMethodData,
        monthlyData: monthlyData || sampleMonthlyData,
      };

      await FinanceExportService.exportReport({
        format,
        reportType,
        period: {
          from: periodDates.from,
          to: periodDates.to,
          label: getPeriodLabel(selectedPeriod),
        },
        data: exportData,
      });

      toast.success(
        t('finance.exportSuccess', { format: format.toUpperCase() })
      );
    } catch (error) {
            toast.error(t('finance.exportError'));
    }
  };

  if (isLoading) {
    return <LoadingState message={t('finance.loadingReports')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('finance.reports')}</h2>
            <p className="text-muted-foreground">
              {t('finance.reportsSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMetrics()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport('pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('finance.exportPDF')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={selectedPeriod || ''} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('finance.selectPeriod')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">{t('finance.thisMonth')}</SelectItem>
              <SelectItem value="lastMonth">{t('finance.lastMonth')}</SelectItem>
              <SelectItem value="thisQuarter">{t('finance.thisQuarter')}</SelectItem>
              <SelectItem value="thisYear">{t('finance.thisYear')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={reportType || ''}
            onValueChange={(value: any) => setReportType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('finance.selectReportType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">{t('finance.overview')}</SelectItem>
              <SelectItem value="revenue">{t('finance.revenueReport')}</SelectItem>
              <SelectItem value="expenses">{t('finance.expensesReport')}</SelectItem>
              <SelectItem value="profit">{t('finance.profitReport')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('finance.totalRevenue')}
                </p>
                <p className="text-2xl font-bold">
                  ${metrics.totalRevenue.toLocaleString()}
                </p>
                {metrics.previousPeriod && (
                  <p className="text-sm text-green-600">
                    +
                    {(
                      ((metrics.totalRevenue -
                        metrics.previousPeriod.totalRevenue) /
                        metrics.previousPeriod.totalRevenue) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('finance.totalExpenses')}
                </p>
                <p className="text-2xl font-bold">
                  ${metrics.totalExpenses.toLocaleString()}
                </p>
                {metrics.previousPeriod && (
                  <p className="text-sm text-red-600">
                    +
                    {(
                      ((metrics.totalExpenses -
                        metrics.previousPeriod.totalExpenses) /
                        metrics.previousPeriod.totalExpenses) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-lg ${
                  metrics.netIncome >= 0
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-red-100 dark:bg-red-900/20'
                }`}
              >
                <BarChart3
                  className={`h-6 w-6 ${
                    metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('finance.netIncome')}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  ${metrics.netIncome.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {metrics.grossMargin.toFixed(1)}% margin
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <PieChartIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('finance.averageTransaction')}
                </p>
                <p className="text-2xl font-bold">
                  ${metrics.averageTransactionValue.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {metrics.totalPayments} payments
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {t('finance.revenueTrend')}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport('excel')}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData || sampleMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name={t('finance.revenue')}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stackId="2"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.6}
                name={t('finance.expenses')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by Category */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {t('finance.revenueByCategory')}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={revenueByCategory || sampleRevenueData}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis dataKey="category" type="category" width={100} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Bar dataKey="amount" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {t('finance.paymentMethodsDistribution')}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethodStats || samplePaymentMethodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => `${method} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {(paymentMethodStats || samplePaymentMethodData).map(
                  (entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || '#8884d8'}
                    />
                  )
                )}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Profit Margin Trend */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {t('finance.profitMarginTrend')}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData || sampleMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name={t('finance.profit')}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Revenue Categories */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.topRevenueCategories')}
          </h3>
          <div className="space-y-3">
            {(revenueByCategory || sampleRevenueData).map((category: any, index: any) => (
              <div
                key={category.category}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{category.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.percentage}% of total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${category.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment Method Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.paymentMethodPerformance')}
          </h3>
          <div className="space-y-3">
            {(paymentMethodStats || samplePaymentMethodData).map(
              (method: any, index: number) => (
                <div
                  key={method.method}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: method.color }}
                    />
                    <div>
                      <p className="font-medium">{method.method}</p>
                      <p className="text-sm text-muted-foreground">
                        {method.percentage}% of payments
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${method.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(method as any).transactions || 0} transactions
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      {/* Export Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('finance.exportOptions')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => exportReport('pdf')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {t('finance.exportPDF')}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('excel')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {t('finance.exportExcel')}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('finance.exportCSV')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
