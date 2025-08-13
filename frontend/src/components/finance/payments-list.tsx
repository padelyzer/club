'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePayments,
  useProcessPayment,
  useFinanceFilters,
} from '@/lib/api/hooks/useFinance';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/ui';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/states/loading-state';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  CreditCard,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Plus,
  DollarSign,
} from 'lucide-react';
import { Payment, PaymentStatus, PaymentMethod } from '@/types/finance';

export const PaymentsList = () => {
  const { t } = useTranslation();
  const { paymentFilters, updatePaymentFilters } = useFinanceFilters();
  const { setSelectedPayment, openPaymentForm } = useFinanceStore();
  const { openModal } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'processedAt'>(
    'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: paymentsData, isLoading, error } = usePayments(paymentFilters);

  const processPaymentMutation = useProcessPayment();

  const payments = paymentsData?.data || [];

  // Filter payments based on search query
  const filteredPayments = payments.filter(
    (payment: any) =>
      payment.client?.firstName
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      payment.client?.lastName
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      payment.client?.email
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.amount.toString().includes(searchQuery)
  );

  // Sort payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let valueA: any, valueB: any;

    switch (sortBy) {
      case 'createdAt':
        valueA = new Date(a.createdAt);
        valueB = new Date(b.createdAt);
        break;
      case 'processedAt':
        valueA = a.processedAt ? new Date(a.processedAt) : new Date(0);
        valueB = b.processedAt ? new Date(b.processedAt) : new Date(0);
        break;
      case 'amount':
        valueA = a.amount;
        valueB = b.amount;
        break;
// default: return 0;
    }

    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;

  const handleSort = (field: 'createdAt' | 'amount' | 'processedAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    openModal('payment-detail');
  };

  const handleProcessPayment = (payment: Payment) => {
    processPaymentMutation.mutate(payment.id);
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'refunded':
      case 'partially_refunded':
        return <AlertCircle className="h-4 w-4 text-purple-600" />;
// default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
// default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'cash':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'transfer':
        return <RefreshCw className="h-4 w-4 text-purple-600" />;
      case 'online':
        return <CreditCard className="h-4 w-4 text-indigo-600" />;
      case 'wallet':
        return <DollarSign className="h-4 w-4 text-orange-600" />;
// default: return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'online':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'wallet':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
// default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return <LoadingState message={t('finance.loadingPayments')} />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          {t('finance.errorLoadingPayments')}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('finance.payments')}</h2>
            <p className="text-muted-foreground">
              {t('finance.paymentsSubtitle', { count: payments.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
            <Button onClick={openPaymentForm}>
              <Plus className="h-4 w-4 mr-2" />
              {t('finance.newPayment')}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('finance.searchPayments')}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={paymentFilters.status?.[0] || ''}
              onValueChange={(value) =>
                updatePaymentFilters({
// status: value ? [value as PaymentStatus] : undefined
                })
              }
            >
              <option value="">{t('finance.allStatuses')}</option>
              <option value="pending">{t('finance.pending')}</option>
              <option value="processing">{t('finance.processing')}</option>
              <option value="completed">{t('finance.completed')}</option>
              <option value="failed">{t('finance.failed')}</option>
              <option value="cancelled">{t('finance.cancelled')}</option>
              <option value="refunded">{t('finance.refunded')}</option>
            </Select>

            <Select
              value={paymentFilters.method?.[0] || ''}
              onValueChange={(value) =>
                updatePaymentFilters({
// method: value ? [value as PaymentMethod] : undefined
                })
              }
            >
              <option value="">{t('finance.allMethods')}</option>
              <option value="card">{t('finance.card')}</option>
              <option value="cash">{t('finance.cash')}</option>
              <option value="transfer">{t('finance.transfer')}</option>
              <option value="online">{t('finance.online')}</option>
              <option value="wallet">{t('finance.wallet')}</option>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.totalProcessed')}
              </p>
              <p className="text-2xl font-bold">
                $
                {payments
                  .filter((p: any) => p.status === 'completed')
                  .reduce((sum: any, p: any) => sum + p.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.completedPayments')}
              </p>
              <p className="text-2xl font-bold">
                {payments.filter((p: any) => p.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.pendingPayments')}
              </p>
              <p className="text-2xl font-bold">
                {
                  payments.filter((p: any) =>
                    ['pending', 'processing'].includes(p.status)
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.failedPayments')}
              </p>
              <p className="text-2xl font-bold">
                {payments.filter((p: any) => p.status === 'failed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        {sortedPayments.length === 0 ? (
          <EmptyState
            title={t('finance.noPayments')}
            description={t('finance.noPaymentsDescription')}
            icon={CreditCard as any}
            action={{
// label: t('finance.createFirstPayment')
// onClick: openPaymentForm
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('finance.client')}</TableHead>
                <TableHead>{t('finance.description')}</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.date')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>{t('finance.method')}</TableHead>
                <TableHead>{t('finance.status')}</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.amount')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {payment.client?.firstName} {payment.client?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.client?.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {payment.description || t('finance.noDescription')}
                      </p>
                      {payment.reference && (
                        <p className="text-sm text-muted-foreground">
                          Ref: {payment.reference}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMethodIcon(payment.method)}
                      <Badge className={getMethodColor(payment.method)}>
                        {t(`finance.paymentMethod.${payment.method}`)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <Badge className={getStatusColor(payment.status)}>
                        {t(`finance.paymentStatus.${payment.status}`)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">
                        ${payment.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {payment.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewPayment(payment)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view')}
                        </DropdownMenuItem>
                        {payment.status === 'pending' && (
                          <DropdownMenuItem
                            onClick={() => handleProcessPayment(payment)}
                            disabled={processPaymentMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('finance.processPayment')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {payment.status === 'completed' && (
                          <DropdownMenuItem>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {t('finance.requestRefund')}
                          </DropdownMenuItem>
                        )}
                        {payment.status === 'pending' && (
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            {t('finance.cancelPayment')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
