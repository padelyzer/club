// Finance-specific types and interfaces for Padelyzer
import {
  User,
  Club,
  ApiResponse,
  PaginatedResponse,
  LoadingState,
} from '@/types';

// Core finance entities
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  reference?: string;

  // Related entities
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  invoiceId?: string;
  reservationId?: string;
  subscriptionId?: string;

  // Payment gateway data
  gatewayTransactionId?: string;
  gatewayData?: Record<string, any>;

  // Timestamps
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;

  // Financial data
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;

  // Client information
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };

  // Invoice details
  items: InvoiceItem[];
  notes?: string;
  terms?: string;

  // Dates
  issueDate: string;
  dueDate: string;
  paidDate?: string;

  // Related entities
  payments: Payment[];
  reservationIds?: string[];
  subscriptionId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type:
    | 'reservation'
    | 'membership'
    | 'class'
    | 'product'
    | 'service'
    | 'other';
  referenceId?: string; // ID of the related entity (reservation, class, etc.)
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;

  // Related entities
  paymentId?: string;
  invoiceId?: string;
  clientId?: string;

  // Categories for reporting
  category: TransactionCategory;
  subcategory?: string;

  // Timestamps
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  type: SubscriptionType;
  status: SubscriptionStatus;

  // Client information
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  // Subscription details
  plan: SubscriptionPlan;
  startDate: string;
  endDate?: string;
  nextPaymentDate?: string;

  // Financial
  amount: number;
  currency: string;
  billingInterval: BillingInterval;

  // Benefits
  benefits: SubscriptionBenefit[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  features: string[];
  maxReservations?: number;
  discountPercentage?: number;
  isActive: boolean;
}

export interface SubscriptionBenefit {
  id: string;
  type: 'discount' | 'free_hours' | 'priority_booking' | 'other';
  description: string;
  value: number;
  unit?: string;
}

export interface Refund {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;

  // Related entities
  paymentId: string;
  payment?: Payment;

  // Process information
  requestedBy: string;
  processedBy?: string;
  requestedAt: string;
  processedAt?: string;

  // Gateway information
  gatewayRefundId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Enums and constants
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer'
  | 'online'
  | 'wallet'
  | 'other';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export type TransactionType = 'income' | 'expense' | 'refund' | 'adjustment';

export type TransactionCategory =
  | 'reservations'
  | 'memberships'
  | 'classes'
  | 'products'
  | 'services'
  | 'equipment'
  | 'maintenance'
  | 'salaries'
  | 'utilities'
  | 'other';

export type SubscriptionType = 'monthly' | 'quarterly' | 'yearly' | 'unlimited';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'suspended'
  | 'pending';

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';

export type RefundStatus = 'requested' | 'approved' | 'processed' | 'rejected';

export type Currency = 'USD' | 'EUR' | 'ARS' | 'BRL' | 'MXN' | 'CLP';

// Filter and query types
export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus[];
  method?: PaymentMethod[];
  clientId?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  currency?: Currency;
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus[];
  clientId?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  overdue?: boolean;
}

export interface TransactionFilters {
  search?: string;
  type?: TransactionType[];
  category?: TransactionCategory[];
  dateRange?: {
    from: string;
    to: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface SubscriptionFilters {
  search?: string;
  type?: SubscriptionType[];
  status?: SubscriptionStatus[];
  planId?: string;
}

// Financial reports and analytics
export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossMargin: number;

  // Payment metrics
  totalPayments: number;
  averageTransactionValue: number;
  paymentSuccessRate: number;

  // Invoice metrics
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  overdueAmount: number;

  // Subscription metrics
  activeSubscriptions: number;
  subscriptionRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;

  // Period comparison
  previousPeriod?: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };

  // Currency
  currency: Currency;
  period: string;
  lastUpdated: string;
}

export interface RevenueByCategory {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  transactions: number;
}

export interface PaymentMethodStats {
  method: PaymentMethod;
  amount: number;
  percentage: number;
  transactions: number;
  averageAmount: number;
}

export interface MonthlyFinancialData {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  transactions: number;
  averageTransaction: number;
}

export interface FinancialReport {
  id: string;
  type: 'revenue' | 'expenses' | 'profit_loss' | 'tax' | 'custom';
  title: string;
  period: {
    from: string;
    to: string;
  };
  data: {
    metrics: FinancialMetrics;
    revenueByCategory: RevenueByCategory[];
    paymentMethodStats: PaymentMethodStats[];
    monthlyData: MonthlyFinancialData[];
  };
  generatedAt: string;
  generatedBy: string;
}

// Form data types
export interface PaymentFormData {
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  description?: string;
  clientId: string;
  invoiceId?: string;
  reservationId?: string;
}

export interface InvoiceFormData {
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  status: InvoiceStatus;
  items: Omit<InvoiceItem, 'id' | 'total'>[];
  discount?: number;
  taxRate?: number;
  notes?: string;
  terms?: string;
}

export interface SubscriptionFormData {
  clientId: string;
  planId: string;
  startDate: string;
  paymentMethod: PaymentMethod;
}

export interface RefundFormData {
  paymentId: string;
  amount: number;
  reason: string;
}

// UI state types
export interface FinancePageState {
  activeTab: FinanceTab;
  selectedPayment: Payment | null;
  selectedInvoice: Invoice | null;
  selectedSubscription: Subscription | null;
  isPaymentFormOpen: boolean;
  isInvoiceFormOpen: boolean;
  isRefundFormOpen: boolean;
  isReportModalOpen: boolean;
}

export type FinanceTab =
  | 'dashboard'
  | 'payments'
  | 'invoices'
  | 'subscriptions'
  | 'reports';

// API response types
export type PaymentsResponse = PaginatedResponse<Payment>;
export type InvoicesResponse = PaginatedResponse<Invoice>;
export type TransactionsResponse = PaginatedResponse<Transaction>;
export type SubscriptionsResponse = PaginatedResponse<Subscription>;
export type RefundsResponse = PaginatedResponse<Refund>;

export type PaymentResponse = ApiResponse<Payment>;
export type InvoiceResponse = ApiResponse<Invoice>;
export type SubscriptionResponse = ApiResponse<Subscription>;
export type RefundResponse = ApiResponse<Refund>;

export type FinancialMetricsResponse = ApiResponse<FinancialMetrics>;
export type FinancialReportResponse = ApiResponse<FinancialReport>;

// Store state interface
export interface FinanceStoreState extends LoadingState {
  // Data
  payments: Payment[];
  invoices: Invoice[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  subscriptionPlans: SubscriptionPlan[];
  refunds: Refund[];

  // Metrics and reports
  metrics: FinancialMetrics | null;
  revenueByCategory: RevenueByCategory[];
  paymentMethodStats: PaymentMethodStats[];
  monthlyData: MonthlyFinancialData[];

  // Pagination
  paymentsPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  invoicesPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  // Filters
  paymentFilters: PaymentFilters;
  invoiceFilters: InvoiceFilters;
  transactionFilters: TransactionFilters;
  subscriptionFilters: SubscriptionFilters;

  // UI state
  pageState: FinancePageState;
}

// All types are already exported above with individual export statements
