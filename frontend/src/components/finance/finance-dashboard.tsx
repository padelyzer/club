'use client';

import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading';
import { MetricCard } from '@/components/charts/MetricCard';
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
} from '@/components/charts/lazy-recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  Plus,
  Receipt,
  CreditCard,
  FileText,
  Activity,
  Target,
} from 'lucide-react';
import {
  useFinanceDashboardOverview,
  useCashFlow,
  useTransactionSummary,
  usePendingExpenses,
  useBackendInvoices,
} from '@/lib/api/hooks/useFinance';
import {
  FinancialMetrics,
  Payment,
  Invoice,
  Subscription,
  Transaction,
} from '@/types/finance';

interface FinanceDashboardProps {
  className?: string;
}

const FinanceDashboardComponent = ({ className = '' }: FinanceDashboardProps) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');

  // Data fetching with backend-aligned API hooks
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError
  } = useFinanceDashboardOverview({ period });

  const {
    data: cashFlow,
    isLoading: cashFlowLoading
  } = useCashFlow(30);

  const {
    data: transactionsSummary,
    isLoading: summaryLoading
  } = useTransactionSummary();

  const {
    data: pendingExpenses,
    isLoading: pendingLoading
  } = usePendingExpenses();

  const {
    data: invoicesResponse,
    isLoading: invoicesLoading
  } = useBackendInvoices({});

  const isLoading = overviewLoading || cashFlowLoading || summaryLoading || pendingLoading || invoicesLoading;

  if (isLoading) {
    return <LoadingState message={t('finance.loadingOverview')} />;
  }

  if (overviewError) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('finance.errorLoadingData')}</h3>
        <p className="text-gray-600">
          {overviewError.message || t('finance.unableToLoadOverview')}
        </p>
      </div>
    );
  }

  // Extract data from API responses
  const summary = overview?.summary || {};
  const revenueByCategory = overview?.revenue_by_category || [];
  const expensesByCategory = overview?.expenses_by_category || [];
  const paymentMethods = overview?.payment_methods || [];
  const recentTransactions = overview?.recent_transactions || [];
  const dailyCashFlow = cashFlow?.daily_cash_flow || [];
  const overdueInvoices = invoicesResponse?.data?.filter((invoice: any) => 
    invoice.status === 'overdue' || 
    (invoice.status === 'sent' && new Date(invoice.dueDate) < new Date())
  ) || [];

  // Create metrics object for compatibility
  const metrics = {
    totalRevenue: summary.total_income || 0,
    totalExpenses: summary.total_expenses || 0,
    netIncome: (summary.total_income || 0) - (summary.total_expenses || 0),
    totalPayments: transactionsSummary?.total_transactions || 0,
    averageTransactionValue: summary.total_income > 0 && summary.transaction_count > 0 
      ? summary.total_income / summary.transaction_count 
      : 0,
    paymentSuccessRate: 95, // This would come from payment processing stats
    totalInvoices: summary.total_invoices || 0,
    paidInvoices: summary.paid_invoices || 0,
    overdueInvoices: overdueInvoices.length,
    overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    activeSubscriptions: summary.active_subscriptions || 0,
    subscriptionRevenue: summary.subscription_revenue || 0,
    churnRate: 2.5, // This would be calculated from subscription data
    averageRevenuePerUser: summary.active_subscriptions > 0 
      ? (summary.subscription_revenue || 0) / summary.active_subscriptions 
      : 0,
    currency: 'MXN',
    period: period,
    lastUpdated: new Date().toISOString(),
    previousPeriod: {
      totalRevenue: (summary.total_income || 0) * 0.9, // Mock previous period data
      totalExpenses: (summary.total_expenses || 0) * 0.95,
      netIncome: ((summary.total_income || 0) * 0.9) - ((summary.total_expenses || 0) * 0.95),
    }
  };

  // Transform recent transactions for compatibility
  const recentPayments = recentTransactions.slice(0, 5).map(transaction => ({
    id: transaction.id,
    amount: parseFloat(transaction.amount),
    currency: transaction.currency,
    method: transaction.payment_method?.name || 'Unknown',
    status: transaction.status === 'completed' ? 'completed' : 
            transaction.status === 'pending' ? 'pending' : 'failed',
    description: transaction.description,
    client: transaction.user ? {
      id: transaction.user.id,
      firstName: transaction.user.first_name,
      lastName: transaction.user.last_name,
      email: transaction.user.email,
    } : null,
    createdAt: transaction.transaction_date,
    updatedAt: transaction.updated_at || transaction.created_at,
  }));

  // Create pending invoices from filtered data
  const pendingInvoices = invoicesResponse?.data?.filter((invoice: any) => 
    invoice.status === 'sent' || invoice.status === 'draft'
  ).slice(0, 4) || [];

  // Calculate growth indicators
  const revenueGrowth = metrics.previousPeriod
    ? ((metrics.totalRevenue - metrics.previousPeriod.totalRevenue) /
        metrics.previousPeriod.totalRevenue) *
      100
    : 0;

  const expensesGrowth = metrics.previousPeriod
    ? ((metrics.totalExpenses - metrics.previousPeriod.totalExpenses) /
        metrics.previousPeriod.totalExpenses) *
      100
    : 0;

  // Sample data for charts
  const revenueChartData = [
    { month: 'Jan', revenue: 4500, expenses: 2800 },
    { month: 'Feb', revenue: 5200, expenses: 3100 },
    { month: 'Mar', revenue: 4800, expenses: 2900 },
    { month: 'Apr', revenue: 6100, expenses: 3400 },
    { month: 'May', revenue: 5800, expenses: 3200 },
    { month: 'Jun', revenue: 6900, expenses: 3600 },
  ];

  const paymentMethodData = [
    { name: 'Card', value: 45, color: '#0088FE' },
    { name: 'Cash', value: 30, color: '#00C49F' },
    { name: 'Transfer', value: 20, color: '#FFBB28' },
    { name: 'Other', value: 5, color: '#FF8042' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Apple-style Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('finance.dashboard')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('finance.comprehensiveOverview')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={period || ''} onValueChange={(value: any) => setPeriod(value)}>
              <SelectTrigger className="w-[140px] h-10 bg-white border-gray-200 rounded-lg">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('common.today')}</SelectItem>
                <SelectItem value="week">{t('common.thisWeek')}</SelectItem>
                <SelectItem value="month">{t('common.thisMonth')}</SelectItem>
                <SelectItem value="quarter">{t('common.thisQuarter')}</SelectItem>
                <SelectItem value="year">{t('common.thisYear')}</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
            <Button className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('finance.newTransaction')}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={t('finance.totalRevenue')}
          value={metrics.totalRevenue || ''}
          format="currency"
          change={revenueGrowth}
          changeType={revenueGrowth >= 0 ? 'increase' : 'decrease'}
          icon={DollarSign as any}
          color="green"
        />

        <MetricCard
          title={t('finance.totalExpenses')}
          value={metrics.totalExpenses || ''}
          format="currency"
          change={expensesGrowth}
          changeType={expensesGrowth >= 0 ? 'increase' : 'decrease'}
          icon={TrendingDown as any}
          color="red"
        />

        <MetricCard
          title={t('finance.netIncome')}
          value={metrics.netIncome || ''}
          format="currency"
          change={metrics.netIncome >= 0 ? 100 : -100}
          changeType={metrics.netIncome >= 0 ? 'increase' : 'decrease'}
          icon={TrendingUp as any}
          color={metrics.netIncome >= 0 ? 'green' : 'red'}
        />

        <MetricCard
          title={t('finance.activeSubscriptions')}
          value={metrics.activeSubscriptions || ''}
          format="number"
          icon={Users as any}
          color="blue"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              {t('finance.cashFlowTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyCashFlow.slice(-7).map((day: any, index: any) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-20">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((day.income / Math.max(...dailyCashFlow.map(d => d.income))) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((day.expenses / Math.max(...dailyCashFlow.map(d => d.expenses))) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <div className={`text-sm font-semibold ${day.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${day.net.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <span className="text-sm text-gray-600 font-medium">{t('finance.income')}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                <span className="text-sm text-gray-600 font-medium">{t('finance.expenses')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              {t('finance.revenueByCategory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByCategory.slice(0, 6).map((category: any, index: any) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ 
                        backgroundColor: `hsl(${index * 45 + 200}, 70%, 50%)` 
                      }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {t(`finance.categories.${category.category}`, category.category.replace(/_/g, ' '))}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${category.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.count} {t('finance.transactions')}
                    </div>
                  </div>
                </div>
              ))}
              {revenueByCategory.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">{t('finance.noRevenueData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              {t('finance.paymentMethods')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods.slice(0, 5).map((method: any, index: any) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ 
                        backgroundColor: `hsl(${index * 60}, 60%, 55%)` 
                      }}
                    />
                    <span className="text-sm font-medium">
                      {method.method}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${method.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {method.count} {t('finance.payments')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {t('finance.recentTransactions')}
            </CardTitle>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              {t('common.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.slice(0, 5).map((transaction: any) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div className={`p-1 rounded-full mr-3 ${
                      transaction.transaction_type === 'income' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {transaction.transaction_type === 'income' ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {transaction.description?.substring(0, 30)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${
                      transaction.transaction_type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}
                      ${parseFloat(transaction.amount).toLocaleString()}
                    </div>
                    <Badge 
                      variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {t(`finance.status.${transaction.status}`)}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">{t('finance.noRecentTransactions')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {t('finance.recentPayments')}
            </h3>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              {t('common.viewAll')}
            </Button>
          </div>
          <div className="space-y-3">
            {recentPayments.slice(0, 5).map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      payment.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : payment.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20'
                          : 'bg-red-100 dark:bg-red-900/20'
                    }`}
                  >
                    <DollarSign
                      className={`h-4 w-4 ${
                        payment.status === 'completed'
                          ? 'text-green-600'
                          : payment.status === 'pending'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {payment.client?.firstName} {payment.client?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.method} •{' '}
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    ${payment.amount.toLocaleString()}
                  </p>
                  <Badge
                    variant={
                      payment.status === 'completed'
                        ? 'default'
                        : payment.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {t(`finance.paymentStatus.${payment.status}`)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Invoices */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('finance.pendingInvoices')}
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">{pendingInvoices.length}</span>
          </div>
          <div className="space-y-3">
            {pendingInvoices.slice(0, 4).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm text-gray-900">#{invoice.number}</p>
                    <p className="text-xs text-gray-500">
                      {invoice.client?.firstName} {invoice.client?.lastName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-gray-900">
                    ${invoice.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Invoices Alert */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">
              {t('finance.overdueInvoices')}
            </h3>
            {overdueInvoices.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">{overdueInvoices.length}</span>
            )}
          </div>
          {overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-gray-500">
                {t('finance.noOverdueInvoices')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueInvoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">#{invoice.number}</p>
                      <p className="text-xs text-gray-500">
                        {invoice.client?.firstName} {invoice.client?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-red-600">
                      ${invoice.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-500">
                      {Math.ceil(
                        (Date.now() - new Date(invoice.dueDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days overdue
                    </p>
                  </div>
                </div>
              ))}
              {overdueInvoices.length > 3 && (
                <button className="w-full h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">
                  View {overdueInvoices.length - 3} more
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('finance.quickActions')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center h-auto p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-medium text-gray-900 text-sm mb-1">{t('finance.createInvoice')}</span>
            <span className="text-xs text-gray-500 text-center">{t('finance.generateCFDI')}</span>
          </button>
          <button className="flex flex-col items-center justify-center h-auto p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <span className="font-medium text-gray-900 text-sm mb-1">{t('finance.recordPayment')}</span>
            <span className="text-xs text-gray-500 text-center">{t('finance.addTransaction')}</span>
          </button>
          <button className="flex flex-col items-center justify-center h-auto p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
            <span className="font-medium text-gray-900 text-sm mb-1">{t('finance.addExpense')}</span>
            <span className="text-xs text-gray-500 text-center">{t('finance.logNewExpense')}</span>
          </button>
          <button className="flex flex-col items-center justify-center h-auto p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900 text-sm mb-1">{t('finance.generateReport')}</span>
            <span className="text-xs text-gray-500 text-center">{t('finance.financialReports')}</span>
          </button>
        </div>
      </div>

      {/* Alerts & Notifications */}
      {(summary.pending_transactions > 0 || summary.pending_expenses > 0 || overdueInvoices.length > 0) && (
        <div className="bg-orange-50 rounded-2xl p-6 shadow-sm border border-orange-200">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center mr-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-orange-800">
              {t('finance.attentionRequired')}
            </h3>
          </div>
          <div>
            <div className="space-y-3">
              {summary.pending_transactions > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-3">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-orange-800">
                        {summary.pending_transactions} {t('finance.pendingTransactions')}
                      </div>
                      <div className="text-xs text-orange-600">
                        {t('finance.requireApprovalCompletion')}
                      </div>
                    </div>
                  </div>
                  <button className="h-8 px-3 bg-white border border-orange-300 hover:bg-orange-50 text-orange-700 rounded-lg font-medium transition-colors">
                    {t('common.review')}
                  </button>
                </div>
              )}
              {summary.pending_expenses > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-3">
                      <Target className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-orange-800">
                        {summary.pending_expenses} {t('finance.expensesPendingApproval')}
                      </div>
                      <div className="text-xs text-orange-600">
                        {t('finance.awaitingManagerReview')}
                      </div>
                    </div>
                  </div>
                  <button className="h-8 px-3 bg-white border border-orange-300 hover:bg-orange-50 text-orange-700 rounded-lg font-medium transition-colors">
                    {t('common.approve')}
                  </button>
                </div>
              )}
              {overdueInvoices.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                      <Receipt className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-800">
                        {overdueInvoices.length} {t('finance.overdueInvoices')}
                      </div>
                      <div className="text-xs text-red-600">
                        ${overdueInvoices.reduce((sum, invoice) => sum + invoice.total, 0).toLocaleString()} {t('finance.overdue')}
                      </div>
                    </div>
                  </div>
                  <button className="h-8 px-3 bg-white border border-red-300 hover:bg-red-50 text-red-700 rounded-lg font-medium transition-colors">
                    {t('common.followUp')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FinanceDashboard = memo(FinanceDashboardComponent);
