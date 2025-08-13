/**
 * Expense Tracker Component
 * Comprehensive expense management with approval workflow
 */

'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Check,
  X,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  FileText,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import {
  useExpenses,
  usePendingExpenses,
  useCreateExpense,
  useApproveExpense,
} from '@/lib/api/hooks/useFinance';
import type { FinanceQueryParams } from '@/lib/api/finance';

export interface ExpenseTrackerProps {
  className?: string;
}

interface ExpenseFormData {
  description: string;
  expense_type: 'fixed' | 'variable' | 'one_time' | 'recurring';
  category: string;
  amount: number;
  currency: string;
  expense_date: string;
  due_date?: string;
  vendor_name?: string;
  vendor_rfc?: string;
  vendor_email?: string;
  receipt_url?: string;
  notes?: string;
  tags?: string[];
}

const expenseTypes = [
  { value: 'fixed', label: 'Fixed Expense' },
  { value: 'variable', label: 'Variable Expense' },
  { value: 'one_time', label: 'One-time Expense' },
  { value: 'recurring', label: 'Recurring Expense' },
];

const expenseCategories = [
  { value: 'staff_salary', label: 'Staff Salaries' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'equipment_purchase', label: 'Equipment Purchase' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'rent', label: 'Rent' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'other_expense', label: 'Other Expenses' },
];

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  className = '',
}) => {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    expense_type: 'one_time',
    category: 'other_expense',
    amount: 0,
    currency: 'MXN',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    vendor_rfc: '',
    vendor_email: '',
    notes: '',
    tags: [],
  });

  // Build query parameters
  const queryParams: FinanceQueryParams = {
    search: searchTerm || undefined,
    approval_status: statusFilter !== 'all' ? statusFilter : undefined,
    ordering: '-expense_date',
  };

  // Data fetching
  const {
    data: expensesData,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses(queryParams);

  const {
    data: pendingExpenses,
    isLoading: pendingLoading,
  } = useExpensesPendingApproval();

  // Mutations
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const approveExpenseMutation = useApproveExpense();
  const rejectExpenseMutation = useRejectExpense();
  const markPaidMutation = useMarkExpensePaid();

  const isLoading = expensesLoading || pendingLoading;
  const expenses = showPendingOnly ? pendingExpenses : expensesData?.results || [];

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExpenseMutation.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        description: '',
        expense_type: 'one_time',
        category: 'other_expense',
        amount: 0,
        currency: 'MXN',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        vendor_rfc: '',
        vendor_email: '',
        notes: '',
        tags: [],
      });
      refetchExpenses();
    } catch (error) {
          }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    try {
      await updateExpenseMutation.mutateAsync({
        id: selectedExpense.id,
        data: formData,
      });
      setIsEditDialogOpen(false);
      setSelectedExpense(null);
      refetchExpenses();
    } catch (error) {
          }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await approveExpenseMutation.mutateAsync(expenseId);
      refetchExpenses();
    } catch (error) {
          }
  };

  const handleRejectExpense = async (expenseId: string) => {
    const reason = prompt(t('finance.enterRejectionReason'));
    if (reason === null) return;

    try {
      await rejectExpenseMutation.mutateAsync({ id: expenseId, reason });
      refetchExpenses();
    } catch (error) {
          }
  };

  const handleMarkAsPaid = async (expenseId: string) => {
    const paymentReference = prompt(t('finance.enterPaymentReference'));
    if (paymentReference === null) return;

    try {
      await markPaidMutation.mutateAsync({
        id: expenseId,
        paymentReference,
        paymentDate: new Date().toISOString().split('T')[0],
      });
      refetchExpenses();
    } catch (error) {
          }
  };

  const openEditDialog = (expense: any) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description,
      expense_type: expense.expense_type,
      category: expense.category,
      amount: parseFloat(expense.amount),
      currency: expense.currency,
      expense_date: expense.expense_date,
      due_date: expense.due_date,
      vendor_name: expense.vendor_name || '',
      vendor_rfc: expense.vendor_rfc || '',
      vendor_email: expense.vendor_email || '',
      receipt_url: expense.receipt_url || '',
      notes: expense.notes || '',
      tags: expense.tags || [],
    });
    setIsEditDialogOpen(true);
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-600';
      case 'rejected':
        return 'bg-red-100 text-red-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('finance.expenseTracker')}
          </h2>
          <p className="text-gray-600">
            {t('finance.manageAndTrackExpenses')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={showPendingOnly}
              onCheckedChange={setShowPendingOnly}
              id="pending-only"
            />
            <label htmlFor="pending-only" className="text-sm text-gray-600">
              {t('finance.pendingOnly')}
            </label>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.addExpense')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('finance.createNewExpense')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.description')} *
                    </label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('finance.enterExpenseDescription')}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.expenseType')} *
                    </label>
                    <Select
                      value={formData.expense_type || ''}
                      onValueChange={(value) => setFormData({ ...formData, expense_type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseTypes.map(type => (
                          <SelectItem key={type.value} value={type.value || ''}>
                            {t(`finance.expenseTypes.${type.value}`, type.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.category')} *
                    </label>
                    <Select
                      value={formData.category || ''}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category.value} value={category.value || ''}>
                            {t(`finance.categories.${category.value}`, category.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.amount')} *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.expenseDate')} *
                    </label>
                    <Input
                      type="date"
                      value={formData.expense_date || ''}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.vendorName')}
                    </label>
                    <Input
                      value={formData.vendor_name || ''}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      placeholder={t('finance.enterVendorName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.vendorRFC')}
                    </label>
                    <Input
                      value={formData.vendor_rfc || ''}
                      onChange={(e) => setFormData({ ...formData, vendor_rfc: e.target.value })}
                      placeholder="RFC123456789"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      {t('finance.notes')}
                    </label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={t('finance.additionalNotes')}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                  >
                    {createExpenseMutation.isPending ? t('common.creating') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('finance.searchExpenses')}
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter || ''} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('finance.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('finance.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('finance.pending')}</SelectItem>
                <SelectItem value="approved">{t('finance.approved')}</SelectItem>
                <SelectItem value="rejected">{t('finance.rejected')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('finance.expenses')}</span>
            <Badge variant="secondary">
              {expenses.length} {t('finance.total')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message={t('finance.loadingExpenses')} />
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('finance.noExpensesFound')}
              </h3>
              <p className="text-gray-500">
                {t('finance.addFirstExpense')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('finance.description')}</TableHead>
                    <TableHead>{t('finance.category')}</TableHead>
                    <TableHead>{t('finance.amount')}</TableHead>
                    <TableHead>{t('finance.vendor')}</TableHead>
                    <TableHead>{t('finance.date')}</TableHead>
                    <TableHead>{t('finance.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {expense.description?.substring(0, 50)}
                            {expense.description?.length > 50 && '...'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t(`finance.expenseTypes.${expense.expense_type}`)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`finance.categories.${expense.category}`, expense.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{expense.vendor_name || '-'}</div>
                          {expense.vendor_rfc && (
                            <div className="text-sm text-gray-500">{expense.vendor_rfc}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.approval_status)}>
                          {getStatusIcon(expense.approval_status)}
                          <span className="ml-1">
                            {t(`finance.status.${expense.approval_status}`)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          {expense.approval_status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveExpense(expense.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectExpense(expense.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {expense.approval_status === 'approved' && !expense.is_paid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(expense.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('finance.editExpense')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateExpense} className="space-y-4">
            {/* Same form fields as create, but with update handler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  {t('finance.description')} *
                </label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('finance.enterExpenseDescription')}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('finance.amount')} *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('finance.expenseDate')} *
                </label>
                <Input
                  type="date"
                  value={formData.expense_date || ''}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={updateExpenseMutation.isPending}
              >
                {updateExpenseMutation.isPending ? t('common.updating') : t('common.update')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};