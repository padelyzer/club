import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Payment,
  Invoice,
  Transaction,
  Subscription,
  SubscriptionPlan,
  Refund,
  FinancialMetrics,
  RevenueByCategory,
  PaymentMethodStats,
  MonthlyFinancialData,
  PaymentFilters,
  InvoiceFilters,
  TransactionFilters,
  SubscriptionFilters,
  FinancePageState,
  FinanceTab,
  FinanceStoreState,
} from '@/types/finance';

interface FinanceStore extends FinanceStoreState {
  // Basic state setters
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Data setters
  setPayments: (payments: Payment[], pagination?: any) => void;
  setInvoices: (invoices: Invoice[], pagination?: any) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setSubscriptions: (subscriptions: Subscription[], pagination?: any) => void;
  setSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
  setRefunds: (refunds: Refund[]) => void;

  // Metrics setters
  setMetrics: (metrics: FinancialMetrics) => void;
  setRevenueByCategory: (data: RevenueByCategory[]) => void;
  setPaymentMethodStats: (data: PaymentMethodStats[]) => void;
  setMonthlyData: (data: MonthlyFinancialData[]) => void;

  // Filter setters
  setPaymentFilters: (filters: Partial<PaymentFilters>) => void;
  setInvoiceFilters: (filters: Partial<InvoiceFilters>) => void;
  setTransactionFilters: (filters: Partial<TransactionFilters>) => void;
  setSubscriptionFilters: (filters: Partial<SubscriptionFilters>) => void;

  // UI actions
  setActiveTab: (tab: FinanceTab) => void;
  setSelectedPayment: (payment: Payment | null) => void;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  setSelectedSubscription: (subscription: Subscription | null) => void;
  openPaymentForm: () => void;
  closePaymentForm: () => void;
  openInvoiceForm: () => void;
  closeInvoiceForm: () => void;
  openRefundForm: () => void;
  closeRefundForm: () => void;
  openReportModal: () => void;
  closeReportModal: () => void;

  // Data actions
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  removePayment: (id: string) => void;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;

  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  addSubscription: (subscription: Subscription) => void;
  updateSubscription: (id: string, subscription: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;

  addRefund: (refund: Refund) => void;
  updateRefund: (id: string, refund: Partial<Refund>) => void;

  // Pagination actions
  setPaymentsPage: (page: number) => void;
  setPaymentsPageSize: (pageSize: number) => void;
  setInvoicesPage: (page: number) => void;
  setInvoicesPageSize: (pageSize: number) => void;

  // Utility actions
  resetFilters: () => void;
  resetState: () => void;
}

const initialState: Omit<FinanceStore, keyof ReturnType<typeof createActions>> =
  {
    // Loading state
    isLoading: false,
    error: null,

    // Data
    payments: [],
    invoices: [],
    transactions: [],
    subscriptions: [],
    subscriptionPlans: [],
    refunds: [],

    // Metrics and reports
    metrics: null,
    revenueByCategory: [],
    paymentMethodStats: [],
    monthlyData: [],

    // Pagination
    paymentsPagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },
    invoicesPagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },

    // Filters
    paymentFilters: {},
    invoiceFilters: {},
    transactionFilters: {},
    subscriptionFilters: {},

    // UI state
    pageState: {
      activeTab: 'dashboard',
      selectedPayment: null,
      selectedInvoice: null,
      selectedSubscription: null,
      isPaymentFormOpen: false,
      isInvoiceFormOpen: false,
      isRefundFormOpen: false,
      isReportModalOpen: false,
    },
  };

const createActions = (set: any, get: any) => ({
  // Basic state setters
  setLoading: (loading: boolean) =>
    set((state: FinanceStore) => {
      state.isLoading = loading;
    }),

  setError: (error: string | null) =>
    set((state: FinanceStore) => {
      state.error = error;
    }),

  // Data setters
  setPayments: (payments: Payment[], pagination?: any) =>
    set((state: FinanceStore) => {
      state.payments = payments;
      if (pagination) {
        state.paymentsPagination = pagination;
      }
    }),

  setInvoices: (invoices: Invoice[], pagination?: any) =>
    set((state: FinanceStore) => {
      state.invoices = invoices;
      if (pagination) {
        state.invoicesPagination = pagination;
      }
    }),

  setTransactions: (transactions: Transaction[]) =>
    set((state: FinanceStore) => {
      state.transactions = transactions;
    }),

  setSubscriptions: (subscriptions: Subscription[], pagination?: any) =>
    set((state: FinanceStore) => {
      state.subscriptions = subscriptions;
    }),

  setSubscriptionPlans: (plans: SubscriptionPlan[]) =>
    set((state: FinanceStore) => {
      state.subscriptionPlans = plans;
    }),

  setRefunds: (refunds: Refund[]) =>
    set((state: FinanceStore) => {
      state.refunds = refunds;
    }),

  // Metrics setters
  setMetrics: (metrics: FinancialMetrics) =>
    set((state: FinanceStore) => {
      state.metrics = metrics;
    }),

  setRevenueByCategory: (data: RevenueByCategory[]) =>
    set((state: FinanceStore) => {
      state.revenueByCategory = data;
    }),

  setPaymentMethodStats: (data: PaymentMethodStats[]) =>
    set((state: FinanceStore) => {
      state.paymentMethodStats = data;
    }),

  setMonthlyData: (data: MonthlyFinancialData[]) =>
    set((state: FinanceStore) => {
      state.monthlyData = data;
    }),

  // Filter setters
  setPaymentFilters: (filters: Partial<PaymentFilters>) =>
    set((state: FinanceStore) => {
      state.paymentFilters = { ...state.paymentFilters, ...filters };
      state.paymentsPagination.page = 1; // Reset to first page
    }),

  setInvoiceFilters: (filters: Partial<InvoiceFilters>) =>
    set((state: FinanceStore) => {
      state.invoiceFilters = { ...state.invoiceFilters, ...filters };
      state.invoicesPagination.page = 1; // Reset to first page
    }),

  setTransactionFilters: (filters: Partial<TransactionFilters>) =>
    set((state: FinanceStore) => {
      state.transactionFilters = { ...state.transactionFilters, ...filters };
    }),

  setSubscriptionFilters: (filters: Partial<SubscriptionFilters>) =>
    set((state: FinanceStore) => {
      state.subscriptionFilters = { ...state.subscriptionFilters, ...filters };
    }),

  // UI actions
  setActiveTab: (tab: FinanceTab) =>
    set((state: FinanceStore) => {
      state.pageState.activeTab = tab;
    }),

  setSelectedPayment: (payment: Payment | null) =>
    set((state: FinanceStore) => {
      state.pageState.selectedPayment = payment;
    }),

  setSelectedInvoice: (invoice: Invoice | null) =>
    set((state: FinanceStore) => {
      state.pageState.selectedInvoice = invoice;
    }),

  setSelectedSubscription: (subscription: Subscription | null) =>
    set((state: FinanceStore) => {
      state.pageState.selectedSubscription = subscription;
    }),

  openPaymentForm: () =>
    set((state: FinanceStore) => {
      state.pageState.isPaymentFormOpen = true;
    }),

  closePaymentForm: () =>
    set((state: FinanceStore) => {
      state.pageState.isPaymentFormOpen = false;
    }),

  openInvoiceForm: () =>
    set((state: FinanceStore) => {
      state.pageState.isInvoiceFormOpen = true;
    }),

  closeInvoiceForm: () =>
    set((state: FinanceStore) => {
      state.pageState.isInvoiceFormOpen = false;
    }),

  openRefundForm: () =>
    set((state: FinanceStore) => {
      state.pageState.isRefundFormOpen = true;
    }),

  closeRefundForm: () =>
    set((state: FinanceStore) => {
      state.pageState.isRefundFormOpen = false;
    }),

  openReportModal: () =>
    set((state: FinanceStore) => {
      state.pageState.isReportModalOpen = true;
    }),

  closeReportModal: () =>
    set((state: FinanceStore) => {
      state.pageState.isReportModalOpen = false;
    }),

  // Data actions
  addPayment: (payment: Payment) =>
    set((state: FinanceStore) => {
      state.payments.unshift(payment);
      state.paymentsPagination.total += 1;
    }),

  updatePayment: (id: string, updates: Partial<Payment>) =>
    set((state: FinanceStore) => {
      const index = state.payments.findIndex((p) => p.id === id);
      if (index !== -1) {
        state.payments[index] = { ...state.payments[index], ...updates };
      }
      if (state.pageState.selectedPayment?.id === id) {
        state.pageState.selectedPayment = {
          ...state.pageState.selectedPayment,
          ...updates,
        };
      }
    }),

  removePayment: (id: string) =>
    set((state: FinanceStore) => {
      state.payments = state.payments.filter((p) => p.id !== id);
      state.paymentsPagination.total -= 1;
      if (state.pageState.selectedPayment?.id === id) {
        state.pageState.selectedPayment = null;
      }
    }),

  addInvoice: (invoice: Invoice) =>
    set((state: FinanceStore) => {
      state.invoices.unshift(invoice);
      state.invoicesPagination.total += 1;
    }),

  updateInvoice: (id: string, updates: Partial<Invoice>) =>
    set((state: FinanceStore) => {
      const index = state.invoices.findIndex((i) => i.id === id);
      if (index !== -1) {
        state.invoices[index] = { ...state.invoices[index], ...updates };
      }
      if (state.pageState.selectedInvoice?.id === id) {
        state.pageState.selectedInvoice = {
          ...state.pageState.selectedInvoice,
          ...updates,
        };
      }
    }),

  removeInvoice: (id: string) =>
    set((state: FinanceStore) => {
      state.invoices = state.invoices.filter((i) => i.id !== id);
      state.invoicesPagination.total -= 1;
      if (state.pageState.selectedInvoice?.id === id) {
        state.pageState.selectedInvoice = null;
      }
    }),

  addTransaction: (transaction: Transaction) =>
    set((state: FinanceStore) => {
      state.transactions.unshift(transaction);
    }),

  updateTransaction: (id: string, updates: Partial<Transaction>) =>
    set((state: FinanceStore) => {
      const index = state.transactions.findIndex((t) => t.id === id);
      if (index !== -1) {
        state.transactions[index] = {
          ...state.transactions[index],
          ...updates,
        };
      }
    }),

  removeTransaction: (id: string) =>
    set((state: FinanceStore) => {
      state.transactions = state.transactions.filter((t) => t.id !== id);
    }),

  addSubscription: (subscription: Subscription) =>
    set((state: FinanceStore) => {
      state.subscriptions.unshift(subscription);
    }),

  updateSubscription: (id: string, updates: Partial<Subscription>) =>
    set((state: FinanceStore) => {
      const index = state.subscriptions.findIndex((s) => s.id === id);
      if (index !== -1) {
        state.subscriptions[index] = {
          ...state.subscriptions[index],
          ...updates,
        };
      }
      if (state.pageState.selectedSubscription?.id === id) {
        state.pageState.selectedSubscription = {
          ...state.pageState.selectedSubscription,
          ...updates,
        };
      }
    }),

  removeSubscription: (id: string) =>
    set((state: FinanceStore) => {
      state.subscriptions = state.subscriptions.filter((s) => s.id !== id);
      if (state.pageState.selectedSubscription?.id === id) {
        state.pageState.selectedSubscription = null;
      }
    }),

  addRefund: (refund: Refund) =>
    set((state: FinanceStore) => {
      state.refunds.unshift(refund);
    }),

  updateRefund: (id: string, updates: Partial<Refund>) =>
    set((state: FinanceStore) => {
      const index = state.refunds.findIndex((r) => r.id === id);
      if (index !== -1) {
        state.refunds[index] = { ...state.refunds[index], ...updates };
      }
    }),

  // Pagination actions
  setPaymentsPage: (page: number) =>
    set((state: FinanceStore) => {
      state.paymentsPagination.page = page;
    }),

  setPaymentsPageSize: (pageSize: number) =>
    set((state: FinanceStore) => {
      state.paymentsPagination.pageSize = pageSize;
      state.paymentsPagination.page = 1;
    }),

  setInvoicesPage: (page: number) =>
    set((state: FinanceStore) => {
      state.invoicesPagination.page = page;
    }),

  setInvoicesPageSize: (pageSize: number) =>
    set((state: FinanceStore) => {
      state.invoicesPagination.pageSize = pageSize;
      state.invoicesPagination.page = 1;
    }),

  // Utility actions
  resetFilters: () =>
    set((state: FinanceStore) => {
      state.paymentFilters = {};
      state.invoiceFilters = {};
      state.transactionFilters = {};
      state.subscriptionFilters = {};
      state.paymentsPagination.page = 1;
      state.invoicesPagination.page = 1;
    }),

  resetState: () => set(() => initialState),
});

export const useFinanceStore = create<FinanceStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        ...createActions(set, get),
      })),
      {
        name: 'finance-store',
        partialize: (state) => ({
          // Persist only UI preferences
          paymentsPagination: {
            pageSize: state.paymentsPagination.pageSize,
            page: 1, // Reset page to 1 on reload
            total: 0,
            totalPages: 0,
          },
          invoicesPagination: {
            pageSize: state.invoicesPagination.pageSize,
            page: 1, // Reset page to 1 on reload
            total: 0,
            totalPages: 0,
          },
          pageState: {
            activeTab: state.pageState.activeTab,
            selectedPayment: null,
            selectedInvoice: null,
            selectedSubscription: null,
            isPaymentFormOpen: false,
            isInvoiceFormOpen: false,
            isRefundFormOpen: false,
            isReportModalOpen: false,
          },
        }),
      }
    ),
    {
      name: 'FinanceStore',
    }
  )
);
