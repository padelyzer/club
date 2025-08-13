/**
 * Revenue Chart Component
 * Advanced revenue analytics with multiple visualization options
 */

'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useCashFlow, useFinanceDashboardOverview } from '@/lib/api/hooks/useFinance';

export interface RevenueChartProps {
  className?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
  onPeriodChange?: (period: string) => void;
}

type ChartType = 'bar' | 'line' | 'area' | 'pie';

export const RevenueChart: React.FC<RevenueChartProps> = ({
  className = '',
  period = 'month',
  onPeriodChange,
}) => {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  // Data fetching with backend-aligned hooks
  const {
    data: overview,
    isLoading: overviewLoading,
  } = useFinanceDashboardOverview({ period: selectedPeriod });

  const {
    data: cashFlow,
    isLoading: cashFlowLoading,
  } = useCashFlow(selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90);

  const isLoading = overviewLoading || cashFlowLoading;

  // Prepare chart data
  const dailyCashFlow = cashFlow?.daily_cash_flow || [];
  const revenueByCategory = overview?.revenue_by_category || [];
  const expensesByCategory = overview?.expenses_by_category || [];

  // Transform daily data for charts
  const chartData = dailyCashFlow.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    revenue: day.income,
    expenses: day.expenses,
    net: day.net,
    fullDate: day.date,
  }));

  // Prepare pie chart data
  const pieData = revenueByCategory.map((category: any, index: any) => ({
    name: category.category.replace(/_/g, ' '),
    value: category.total,
    count: category.count,
    color: `hsl(${index * 45 + 200}, 70%, 50%)`,
  }));

  // Calculate totals and trends
  const totalRevenue = chartData.reduce((sum: any, day: any) => sum + day.revenue, 0);
  const totalExpenses = chartData.reduce((sum: any, day: any) => sum + day.expenses, 0);
  const netIncome = totalRevenue - totalExpenses;
  const averageDailyRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;

  // Calculate trends (comparing first half vs second half of period)
  const midPoint = Math.floor(chartData.length / 2);
  const firstHalfRevenue = chartData.slice(0, midPoint).reduce((sum: any, day: any) => sum + day.revenue, 0);
  const secondHalfRevenue = chartData.slice(midPoint).reduce((sum: any, day: any) => sum + day.revenue, 0);
  const revenueTrend = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod as any);
    onPeriodChange?.(newPeriod);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${t(`finance.${entry.dataKey}`)}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">
            {t('finance.loadingChartData')}
          </div>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('finance.noDataAvailable')}</p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" fill="#10B981" name={t('finance.revenue')} />
              <Bar dataKey="expenses" fill="#EF4444" name={t('finance.expenses')} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                strokeWidth={2}
                name={t('finance.revenue')}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#EF4444" 
                strokeWidth={2}
                name={t('finance.expenses')}
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name={t('finance.netIncome')}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
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
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry: any, index: any) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), t('finance.revenue')]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              {t('finance.revenueAnalytics')}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {t('finance.detailedRevenueBreakdown')}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={selectedPeriod || ''} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{t('common.week')}</SelectItem>
                <SelectItem value="month">{t('common.month')}</SelectItem>
                <SelectItem value="quarter">{t('common.quarter')}</SelectItem>
                <SelectItem value="year">{t('common.year')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="rounded-r-none"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-none"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className="rounded-none"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('pie')}
                className="rounded-l-none"
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-sm text-green-600">{t('finance.totalRevenue')}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrency(averageDailyRevenue)}/day avg
            </div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <div className="text-sm text-red-600">{t('finance.totalExpenses')}</div>
            <div className="text-xs text-gray-500 mt-1">
              {((totalExpenses / totalRevenue) * 100).toFixed(1)}% of revenue
            </div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
            <div className="text-sm text-blue-600">{t('finance.netIncome')}</div>
            <div className="text-xs text-gray-500 mt-1">
              {((netIncome / totalRevenue) * 100).toFixed(1)}% margin
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center">
              <div className={`text-2xl font-bold ${revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
              </div>
              {revenueTrend >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-green-600 ml-1" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-600 ml-1" />
              )}
            </div>
            <div className="text-sm text-purple-600">{t('finance.trend')}</div>
            <div className="text-xs text-gray-500 mt-1">
              vs previous half period
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6">
          {renderChart()}
        </div>

        {/* Revenue Categories (for pie chart) */}
        {chartType === 'pie' && pieData.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {t('finance.revenueBreakdown')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pieData.map((category: any, index: any) => (
                <div key={category.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {t(`finance.categories.${category.name.replace(/ /g, '_')}`, category.name)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(category.value)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.count} transactions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};