/**
 * React Query hooks for Finance operations
 * Complete financial management with caching, mutations, and real-time updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { financeApi, type FinanceQueryParams } from '@/lib/api/finance';
import type {
  Transaction,
  Invoice,
  PaymentFormData,
  InvoiceFormData,
  SubscriptionFormData,
  RefundFormData,
  PaymentFilters,
  InvoiceFilters,
  TransactionFilters,
  SubscriptionFilters,
} from '@/types/finance';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const financeKeys = {
  all: ['finance'] as const,
  
  // Payment Methods
  paymentMethods: () => [...financeKeys.all, 'paymentMethods'] as const,
  paymentMethodsEnabled: () => [...financeKeys.paymentMethods(), 'enabled'] as const,
  
  // Transactions
  transactions: () => [...financeKeys.all, 'transactions'] as const,
  transactionsList: (params?: FinanceQueryParams) => [...financeKeys.transactions(), 'list', params] as const,
  transactionDetail: (id: string) => [...financeKeys.transactions(), 'detail', id] as const,
  transactionsSummary: (params?: FinanceQueryParams) => [...financeKeys.transactions(), 'summary', params] as const,
  
  // Invoices
  invoices: () => [...financeKeys.all, 'invoices'] as const,
  invoicesList: (params?: FinanceQueryParams) => [...financeKeys.invoices(), 'list', params] as const,
  invoiceDetail: (id: string) => [...financeKeys.invoices(), 'detail', id] as const,
  
  // Expenses
  expenses: () => [...financeKeys.all, 'expenses'] as const,
  expensesList: (params?: FinanceQueryParams) => [...financeKeys.expenses(), 'list', params] as const,
  expenseDetail: (id: string) => [...financeKeys.expenses(), 'detail', id] as const,
  expensesPendingApproval: () => [...financeKeys.expenses(), 'pendingApproval'] as const,
  
  // Reports
  reports: () => [...financeKeys.all, 'reports'] as const,
  reportsList: (params?: FinanceQueryParams) => [...financeKeys.reports(), 'list', params] as const,
  reportDetail: (id: string) => [...financeKeys.reports(), 'detail', id] as const,
  
  // Dashboard
  dashboard: () => [...financeKeys.all, 'dashboard'] as const,
  dashboardOverview: (params?: any) => [...financeKeys.dashboard(), 'overview', params] as const,
  dashboardCashFlow: (days?: number) => [...financeKeys.dashboard(), 'cashFlow', days] as const,
};

// ============================================================================
// PAYMENT METHODS HOOKS
// ============================================================================

export const usePaymentMethods = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: financeKeys.paymentMethods(),
    queryFn: () => financeApi.paymentMethods.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEnabledPaymentMethods = () => {
  return useQuery({
    queryKey: financeKeys.paymentMethodsEnabled(),
    queryFn: () => financeApi.paymentMethods.getEnabled(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.paymentMethods.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.paymentMethods() });
      toast.success('Payment method created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create payment method');
    },
  });
};

export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.paymentMethods.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.paymentMethods() });
      toast.success('Payment method updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update payment method');
    },
  });
};

export const useTogglePaymentMethodStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.paymentMethods.toggleStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.paymentMethods() });
      toast.success(data.message || 'Status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to toggle payment method status');
    },
  });
};

// ============================================================================
// TRANSACTIONS HOOKS
// ============================================================================

export const useTransactions = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: financeKeys.transactionsList(params),
    queryFn: () => financeApi.transactions.getAll(params),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: financeKeys.transactionDetail(id),
    queryFn: () => financeApi.transactions.getById(id),
    enabled: !!id,
  });
};

export const useTransactionsSummary = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: financeKeys.transactionsSummary(params),
    queryFn: () => financeApi.transactions.getSummary(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.transactions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Transaction created: The transaction has been created successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create transaction.');
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.transactions.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.transactionDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Transaction updated: The transaction has been updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update transaction.');
    },
  });
};

export const useApproveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.transactions.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Transaction approved: The transaction has been approved successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve transaction.');
    },
  });
};

export const useBulkApproveTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionIds, notes }: { transactionIds: string[]; notes?: string }) =>
      financeApi.transactions.bulkApprove(transactionIds, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success(`${data.approved_count} of ${data.total_requested} transactions approved`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve transactions.');
    },
  });
};

export const useCompleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.transactions.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Transaction completed: The transaction has been marked as completed.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete transaction.');
    },
  });
};

export const useCancelTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      financeApi.transactions.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Transaction cancelled: The transaction has been cancelled successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel transaction.');
    },
  });
};

// ============================================================================
// INVOICES HOOKS
// ============================================================================

export const useInvoices = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: financeKeys.invoicesList(params),
    queryFn: () => financeApi.invoices.getAll(params),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: financeKeys.invoiceDetail(id),
    queryFn: () => financeApi.invoices.getById(id),
    enabled: !!id,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.invoices.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Invoice created: The invoice has been created successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice.');
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.invoices.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.invoiceDetail(variables.id) });
      toast.success('Invoice updated: The invoice has been updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update invoice.');
    },
  });
};

export const useGenerateInvoiceFromTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.invoices.generateFromTransactions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      toast.success(`Invoice ${data.invoice_number} has been generated successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate invoice.');
    },
  });
};

export const useGenerateCFDI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.invoices.generateCFDI,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      toast.success('CFDI generated: The CFDI has been generated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate CFDI.');
    },
  });
};

export const useSendInvoiceToCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.invoices.sendToCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      toast.success('Invoice sent: The invoice has been sent to the customer.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send invoice.');
    },
  });
};

export const useCancelInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motive }: { id: string; motive?: string }) =>
      financeApi.invoices.cancel(id, motive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      toast.success('Invoice cancelled: The invoice has been cancelled successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel invoice.');
    },
  });
};

// ============================================================================
// EXPENSES HOOKS
// ============================================================================

export const useExpenses = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: financeKeys.expensesList(params),
    queryFn: () => financeApi.expenses.getAll(params),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useExpense = (id: string) => {
  return useQuery({
    queryKey: financeKeys.expenseDetail(id),
    queryFn: () => financeApi.expenses.getById(id),
    enabled: !!id,
  });
};

export const useExpensesPendingApproval = () => {
  return useQuery({
    queryKey: financeKeys.expensesPendingApproval(),
    queryFn: () => financeApi.expenses.getPendingApproval(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.expenses.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Expense created: The expense has been created successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create expense.');
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.expenses.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.expenseDetail(variables.id) });
      toast.success('Expense updated: The expense has been updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update expense.');
    },
  });
};

export const useApproveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.expenses.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Expense approved: The expense has been approved successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve expense.');
    },
  });
};

export const useRejectExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      financeApi.expenses.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      toast.success('Expense rejected: The expense has been rejected.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject expense.');
    },
  });
};

export const useMarkExpensePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentReference, paymentDate }: { 
      id: string; 
      paymentReference?: string;
      paymentDate?: string;
    }) => financeApi.expenses.markPaid(id, paymentReference, paymentDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success('Expense marked as paid: The expense has been marked as paid.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark expense as paid.');
    },
  });
};

// ============================================================================
// REPORTS HOOKS
// ============================================================================

export const useReports = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: financeKeys.reportsList(params),
    queryFn: () => financeApi.reports.getAll(params),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useReport = (id: string) => {
  return useQuery({
    queryKey: financeKeys.reportDetail(id),
    queryFn: () => financeApi.reports.getById(id),
    enabled: !!id,
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.reports.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.reports() });
      toast.success('Report created: The financial report has been generated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create report.');
    },
  });
};

export const useRegenerateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.reports.regenerate,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.reports() });
      queryClient.invalidateQueries({ queryKey: financeKeys.reportDetail(variables as string) });
      toast.success('Report regenerated: The report has been regenerated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to regenerate report.');
    },
  });
};

export const useGenerateCustomReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.reports.generateCustom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.reports() });
      toast.success('Custom report generated: The custom report has been generated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate custom report.');
    },
  });
};

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

export const useFinancialOverview = (params?: {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: financeKeys.dashboardOverview(params),
    queryFn: () => financeApi.dashboard.getOverview(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useCashFlowData = (days?: number) => {
  return useQuery({
    queryKey: financeKeys.dashboardCashFlow(days),
    queryFn: () => financeApi.dashboard.getCashFlow(days),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ============================================================================
// PAYMENT INTEGRATION HOOKS
// ============================================================================

export const useCreatePaymentIntent = () => {

  return useMutation({
    mutationFn: financeApi.paymentIntegration.createPaymentIntent,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create payment intent.');
    },
  });
};

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financeApi.paymentIntegration.confirmPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success(`Payment confirmed. Transaction ${data.reference_number} created`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to confirm payment.');
    },
  });
};

// ============================================================================
// BANK RECONCILIATION HOOKS
// ============================================================================

export const useUploadBankStatement = () => {

  return useMutation({
    mutationFn: financeApi.bankReconciliation.uploadStatement,
    onSuccess: (data) => {
      toast.success(`Processed statement. ${data.matched_transactions} transactions matched`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload bank statement.');
    },
  });
};

export const useReconciliationReport = (params?: FinanceQueryParams) => {
  return useQuery({
    queryKey: [...financeKeys.all, 'reconciliation', params],
    queryFn: () => financeApi.bankReconciliation.getReconciliationReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// EXPORT ALL HOOKS
// ============================================================================

export {
  // Payment Methods
  usePaymentMethods,
  useEnabledPaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useTogglePaymentMethodStatus,
  
  // Transactions
  useTransactions,
  useTransaction,
  useTransactionsSummary,
  useCreateTransaction,
  useUpdateTransaction,
  useApproveTransaction,
  useBulkApproveTransactions,
  useCompleteTransaction,
  useCancelTransaction,
  
  // Invoices
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useGenerateInvoiceFromTransactions,
  useGenerateCFDI,
  useSendInvoiceToCustomer,
  useCancelInvoice,
  
  // Expenses
  useExpenses,
  useExpense,
  useExpensesPendingApproval,
  useCreateExpense,
  useUpdateExpense,
  useApproveExpense,
  useRejectExpense,
  useMarkExpensePaid,
  
  // Reports
  useReports,
  useReport,
  useCreateReport,
  useRegenerateReport,
  useGenerateCustomReport,
  
  // Dashboard
  useFinancialOverview,
  useCashFlowData,
  
  // Payment Integration
  useCreatePaymentIntent,
  useConfirmPayment,
  
  // Bank Reconciliation
  useUploadBankStatement,
  useReconciliationReport,
};