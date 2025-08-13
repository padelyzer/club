'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading';
import { ErrorState } from '@/components/ui/states/error-state';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Filter,
  History,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  useBackendTransactions,
  useApproveTransaction,
  useBulkApproveTransactions,
  useCreateTransaction,
  useEnabledPaymentMethods,
} from '@/lib/api/hooks/useFinance';

interface PaymentHistoryProps {
  className?: string;
}

interface TransactionFilters {
  search?: string;
  transaction_type?: 'income' | 'expense' | 'refund' | 'transfer' | 'adjustment' | '';
  status?: 'pending' | 'approved' | 'completed' | 'cancelled' | 'failed' | '';
  category?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  user?: string;
}

const TRANSACTION_CATEGORIES = [
  'reservation_payment',
  'membership_fee',
  'tournament_entry',
  'class_payment',
  'equipment_rental',
  'amenity_payment',
  'late_fee',
  'other_income',
  'staff_salary',
  'utilities',
  'maintenance',
  'equipment_purchase',
  'marketing',
  'insurance',
  'rent',
  'supplies',
  'professional_services',
  'taxes',
  'other_expense',
];

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ 
  className = '' 
}) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Data fetching
  const {
    data: transactionsResponse,
    isLoading,
    error,
    refetch,
  } = useBackendTransactions({
    ...filters,
    ordering: `${sortDirection === 'desc' ? '-' : ''}${sortField}`,
    page: currentPage,
    page_size: pageSize,
  });

  const {
    data: paymentMethods,
    isLoading: paymentMethodsLoading,
  } = useEnabledPaymentMethods();

  // Mutations
  const approveTransactionMutation = useApproveTransaction();
  const bulkApproveTransactionsMutation = useBulkApproveTransactions();
  const createTransactionMutation = useCreateTransaction();

  const transactions = transactionsResponse?.data || [];
  const pagination = transactionsResponse?.pagination;

  // Filter handlers
  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t.id));
    }
  };

  // Action handlers
  const handleApproveTransaction = async (transactionId: string) => {
    try {
      await approveTransactionMutation.mutateAsync(transactionId);
      refetch();
    } catch (error) {
          }
  };

  const handleBulkApprove = async () => {
    if (selectedTransactions.length === 0) return;
    
    try {
      await bulkApproveTransactionsMutation.mutateAsync({
        transactionIds: selectedTransactions,
        notes: 'Bulk approval from payment history',
      });
      setSelectedTransactions([]);
      refetch();
    } catch (error) {
          }
  };

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-blue-600' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      cancelled: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      failed: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {t(`finance.status.${status}`, status)}
      </Badge>
    );
  };

  // Type badge component
  const TypeBadge = ({ type }: { type: string }) => {
    const typeConfig = {
      income: { color: 'bg-green-100 text-green-800', icon: TrendingUp },
      expense: { color: 'bg-red-100 text-red-800', icon: TrendingDown },
      refund: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      transfer: { color: 'bg-purple-100 text-purple-800', icon: ArrowUpDown },
      adjustment: { color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.income;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {t(`finance.transactionType.${type}`, type)}
      </div>
    );
  };

  // Loading state
  if (isLoading && !transactions.length) {
    return <LoadingState message={t('finance.loadingTransactions')} />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title={t('finance.errorLoadingTransactions')}
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <History className="h-8 w-8" />
            {t('finance.paymentHistory')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('finance.manageAllTransactions')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.newTransaction')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('finance.createTransaction')}</DialogTitle>
              </DialogHeader>
              <TransactionForm 
                paymentMethods={paymentMethods || []}
                onSubmit={(data) => {
                  createTransactionMutation.mutate(data);
                  setIsCreateModalOpen(false);
                }}
                onCancel={() => setIsCreateModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('common.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('finance.searchTransactions')}
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div>
              <Label>{t('finance.transactionType')}</Label>
              <Select
                value={filters.transaction_type || ''}
                onValueChange={(value) => handleFilterChange('transaction_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.all')}</SelectItem>
                  <SelectItem value="income">{t('finance.transactionType.income')}</SelectItem>
                  <SelectItem value="expense">{t('finance.transactionType.expense')}</SelectItem>
                  <SelectItem value="refund">{t('finance.transactionType.refund')}</SelectItem>
                  <SelectItem value="transfer">{t('finance.transactionType.transfer')}</SelectItem>
                  <SelectItem value="adjustment">{t('finance.transactionType.adjustment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label>{t('common.status')}</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('finance.status.pending')}</SelectItem>
                  <SelectItem value="approved">{t('finance.status.approved')}</SelectItem>
                  <SelectItem value="completed">{t('finance.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('finance.status.cancelled')}</SelectItem>
                  <SelectItem value="failed">{t('finance.status.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <Label>{t('common.dateRange')}</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {Object.keys(filters).some(key => filters[key as keyof TransactionFilters]) && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">
                {t('common.filtersApplied', { count: Object.keys(filters).filter(key => filters[key as keyof TransactionFilters]).length })}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                {t('common.clearFilters')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {t('common.selectedItems', { count: selectedTransactions.length })}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveTransactionsMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t('finance.bulkApprove')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTransactions([])}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('common.clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('transaction_date')}
                >
                  <div className="flex items-center gap-2">
                    {t('common.date')}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t('finance.reference')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>{t('finance.category')}</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-2">
                    {t('common.amount')}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t('finance.paymentMethod')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-gray-50">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.reference_number}
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={transaction.transaction_type} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {t(`finance.categories.${transaction.category}`, transaction.category.replace(/_/g, ' '))}
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className={`flex items-center gap-1 ${
                      transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}
                      <DollarSign className="h-4 w-4" />
                      {parseFloat(transaction.amount).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      {transaction.payment_method?.name || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={transaction.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view')}
                        </DropdownMenuItem>
                        {transaction.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleApproveTransaction(transaction.id)}
                            disabled={approveTransactionMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {t('common.approve')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          {t('finance.downloadReceipt')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Empty State */}
          {transactions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('finance.noTransactionsFound')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('finance.noTransactionsMessage')}
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.createFirstTransaction')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {t('common.showingResults', {
              start: (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, pagination.total),
              total: pagination.total,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={currentPage === pagination.totalPages}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Transaction Form Component
interface TransactionFormProps {
  paymentMethods: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  paymentMethods,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    transaction_type: 'income',
    category: '',
    description: '',
    amount: '',
    currency: 'MXN',
    payment_method: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('finance.transactionType')}</Label>
          <Select
            value={formData.transaction_type || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, transaction_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">{t('finance.transactionType.income')}</SelectItem>
              <SelectItem value="expense">{t('finance.transactionType.expense')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('finance.category')}</Label>
          <Select
            value={formData.category || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('common.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_CATEGORIES
                .filter(cat => 
                  formData.transaction_type === 'income' ? 
                    cat.includes('payment') || cat.includes('fee') || cat.includes('income') :
                    cat.includes('salary') || cat.includes('expense') || cat.includes('purchase')
                )
                .map(category => (
                  <SelectItem key={category} value={category || ''}>
                    {t(`finance.categories.${category}`, category.replace(/_/g, ' '))}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t('common.description')}</Label>
        <Input
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('finance.transactionDescription')}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('common.amount')}</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="pl-10"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <Label>{t('finance.paymentMethod')}</Label>
          <Select
            value={formData.payment_method || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('common.selectPaymentMethod')} />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map(method => (
                <SelectItem key={method.id} value={method.id || ''}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t('common.notes')} ({t('common.optional')})</Label>
        <Input
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder={t('finance.additionalNotes')}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">
          {t('common.create')}
        </Button>
      </div>
    </form>
  );
};

export default PaymentHistory;