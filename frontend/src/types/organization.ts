// Organization and ROOT module types - Synchronized with Django models

// Organization model
export interface Organization {
  id: string;
  
  // Type and basic info
  type: 'club' | 'chain' | 'franchise';
  
  // Legal information
  businessName: string;
  tradeName: string;
  rfc: string;
  taxAddress: Record<string, any>; // JSONField
  legalRepresentative: string;
  
  // Contact information
  primaryEmail: string;
  primaryPhone: string;
  
  // Status
  state: 'trial' | 'active' | 'suspended' | 'cancelled';
  trialEndsAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  
  // Metrics (calculated fields)
  totalRevenue: string; // DecimalField as string
  activeUsers: number;
  monthlyReservations: number;
  lastActivity?: string;
  healthScore: number; // 0-100
  churnRisk: 'low' | 'medium' | 'high';
  
  // Snake_case equivalents
  business_name?: string;
  trade_name?: string;
  tax_address?: Record<string, any>;
  legal_representative?: string;
  primary_email?: string;
  primary_phone?: string;
  trial_ends_at?: string;
  suspended_at?: string;
  suspended_reason?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  total_revenue?: string;
  active_users?: number;
  monthly_reservations?: number;
  last_activity?: string;
  health_score?: number;
  churn_risk?: 'low' | 'medium' | 'high';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
  
  // Relationships
  subscription?: Subscription;
  clubs?: any[]; // Club type from club.ts
  invoices?: Invoice[];
  payments?: Payment[];
}

// Subscription model
export interface Subscription {
  id: string;
  organization: string | Organization;
  
  // Plan details
  plan: 'basic' | 'competitions' | 'finance' | 'bi' | 'complete' | 'custom';
  customModules: string[];
  
  // Billing information
  billingFrequency: 'monthly' | 'quarterly' | 'yearly';
  amount: string; // DecimalField as string
  currency: string;
  taxRate: string; // DecimalField as string
  
  // Payment method
  paymentMethodType: 'card' | 'transfer' | 'oxxo';
  paymentMethodDetails: Record<string, any>;
  
  // Stripe/MercadoPago IDs
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  mercadopagoCustomerId?: string;
  
  // Invoicing
  cfdiUse: string;
  invoiceEmail: string;
  automaticInvoice: boolean;
  
  // Limits
  clubsAllowed: number;
  usersPerClub: number;
  courtsPerClub: number;
  monthlyReservationsLimit: number;
  dataRetentionDays: number;
  apiCallsPerHour: number;
  
  // Contract
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  minimumTermMonths: number;
  earlyTerminationFee: string; // DecimalField as string
  
  // Current period
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  
  // Snake_case equivalents
  custom_modules?: string[];
  billing_frequency?: 'monthly' | 'quarterly' | 'yearly';
  tax_rate?: string;
  payment_method_type?: 'card' | 'transfer' | 'oxxo';
  payment_method_details?: Record<string, any>;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  mercadopago_customer_id?: string;
  cfdi_use?: string;
  invoice_email?: string;
  automatic_invoice?: boolean;
  clubs_allowed?: number;
  users_per_club?: number;
  courts_per_club?: number;
  monthly_reservations_limit?: number;
  data_retention_days?: number;
  api_calls_per_hour?: number;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  minimum_term_months?: number;
  early_termination_fee?: string;
  current_period_start?: string;
  current_period_end?: string;
  next_billing_date?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Invoice model
export interface Invoice {
  id: string;
  organization: string | Organization;
  subscription: string | Subscription;
  
  // Invoice details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  
  // Amounts
  subtotal: string; // DecimalField as string
  taxAmount: string; // DecimalField as string
  total: string; // DecimalField as string
  
  // Payment
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  
  // CFDI
  cfdiUuid?: string;
  cfdiXml?: string;
  cfdiPdfUrl?: string;
  cfdiStampedAt?: string;
  
  // Billing period
  periodStart: string;
  periodEnd: string;
  
  // Notes
  notes?: string;
  
  // Snake_case equivalents
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  tax_amount?: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  cfdi_uuid?: string;
  cfdi_xml?: string;
  cfdi_pdf_url?: string;
  cfdi_stamped_at?: string;
  period_start?: string;
  period_end?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Payment model
export interface Payment {
  id: string;
  organization: string | Organization;
  invoice?: string | Invoice;
  
  // Payment details
  amount: string; // DecimalField as string
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  
  // Gateway information
  gateway: 'stripe' | 'mercadopago';
  gatewayPaymentId: string;
  gatewayPaymentMethod: string;
  
  // Processing
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;
  
  // Refund
  refundedAmount: string; // DecimalField as string
  refundedAt?: string;
  refundReason?: string;
  
  // Metadata
  metadata: Record<string, any>;
  
  // Snake_case equivalents
  gateway_payment_id?: string;
  gateway_payment_method?: string;
  processed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  refunded_amount?: string;
  refunded_at?: string;
  refund_reason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Club Onboarding model
export interface ClubOnboarding {
  id: string;
  organization: string | Organization;
  
  // Assignment
  assignedTo?: string; // User ID
  
  // Progress
  currentStep: 'legal_info' | 'club_setup' | 'technical_setup' | 'training' | 'payment' | 'golive';
  stepsCompleted: Record<string, any>;
  
  // Dates
  targetLaunchDate: string;
  actualLaunchDate?: string;
  
  // Notes
  notes?: string;
  
  // Checklist
  checklist: Record<string, any>;
  
  // Snake_case equivalents
  assigned_to?: string;
  current_step?: 'legal_info' | 'club_setup' | 'technical_setup' | 'training' | 'payment' | 'golive';
  steps_completed?: Record<string, any>;
  target_launch_date?: string;
  actual_launch_date?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Audit Log model
export interface AuditLog {
  id: string;
  
  // Actor
  user?: string; // User ID
  ipAddress: string;
  userAgent: string;
  
  // Action
  action: 'create' | 'update' | 'delete' | 'suspend' | 'reactivate' | 'cancel' | 'payment' | 'invoice' | 'impersonate';
  modelName: string;
  objectId: string;
  objectRepr: string;
  
  // Changes
  changes: Record<string, any>;
  
  // Organization context
  organization?: string | Organization;
  
  // Snake_case equivalents
  ip_address?: string;
  user_agent?: string;
  model_name?: string;
  object_id?: string;
  object_repr?: string;
  
  // Timestamps
  createdAt: string;
  created_at?: string;
}

// Form data types
export interface OrganizationFormData {
  type: 'club' | 'chain' | 'franchise';
  businessName: string;
  tradeName: string;
  rfc: string;
  taxAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  legalRepresentative: string;
  primaryEmail: string;
  primaryPhone: string;
  
  // Snake_case equivalents
  business_name?: string;
  trade_name?: string;
  tax_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  legal_representative?: string;
  primary_email?: string;
  primary_phone?: string;
}

export interface SubscriptionFormData {
  plan: 'basic' | 'competitions' | 'finance' | 'bi' | 'complete' | 'custom';
  customModules?: string[];
  billingFrequency: 'monthly' | 'quarterly' | 'yearly';
  paymentMethodType: 'card' | 'transfer' | 'oxxo';
  invoiceEmail: string;
  automaticInvoice: boolean;
  cfdiUse: string;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  
  // Snake_case equivalents
  custom_modules?: string[];
  billing_frequency?: 'monthly' | 'quarterly' | 'yearly';
  payment_method_type?: 'card' | 'transfer' | 'oxxo';
  invoice_email?: string;
  automatic_invoice?: boolean;
  cfdi_use?: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
}

// Response types
export interface OrganizationListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Organization[];
}

export interface OrganizationDetailResponse extends Organization {
  clubs?: any[]; // Club array
  invoices?: Invoice[];
  payments?: Payment[];
  onboarding?: ClubOnboarding;
  recentAuditLogs?: AuditLog[];
}

export interface SubscriptionAnalytics {
  totalRevenue: string;
  monthlyRecurringRevenue: string;
  churnRate: number;
  averageRevenuePerUser: string;
  lifetimeValue: string;
  conversionRate: number;
  trialConversions: number;
  
  // Snake_case equivalents
  total_revenue?: string;
  monthly_recurring_revenue?: string;
  churn_rate?: number;
  average_revenue_per_user?: string;
  lifetime_value?: string;
  conversion_rate?: number;
  trial_conversions?: number;
}

// Filter types
export interface OrganizationFilters {
  search?: string;
  type?: 'club' | 'chain' | 'franchise';
  state?: 'trial' | 'active' | 'suspended' | 'cancelled';
  plan?: 'basic' | 'competitions' | 'finance' | 'bi' | 'complete' | 'custom';
  billingFrequency?: 'monthly' | 'quarterly' | 'yearly';
  churnRisk?: 'low' | 'medium' | 'high';
  minHealthScore?: number;
  maxHealthScore?: number;
  createdAfter?: string;
  createdBefore?: string;
  trialEndingBefore?: string;
  nextBillingAfter?: string;
  nextBillingBefore?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  billing_frequency?: 'monthly' | 'quarterly' | 'yearly';
  churn_risk?: 'low' | 'medium' | 'high';
  min_health_score?: number;
  max_health_score?: number;
  created_after?: string;
  created_before?: string;
  trial_ending_before?: string;
  next_billing_after?: string;
  next_billing_before?: string;
  page_size?: number;
}

export interface InvoiceFilters {
  search?: string;
  organization?: string;
  status?: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDateAfter?: string;
  dueDateBefore?: string;
  paidAfter?: string;
  paidBefore?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  due_date_after?: string;
  due_date_before?: string;
  paid_after?: string;
  paid_before?: string;
  min_amount?: number;
  max_amount?: number;
  page_size?: number;
}

export interface PaymentFilters {
  search?: string;
  organization?: string;
  status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  gateway?: 'stripe' | 'mercadopago';
  processedAfter?: string;
  processedBefore?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  processed_after?: string;
  processed_before?: string;
  min_amount?: number;
  max_amount?: number;
  page_size?: number;
}

// Constants
export const ORGANIZATION_TYPES = {
  CLUB: 'club',
  CHAIN: 'chain',
  FRANCHISE: 'franchise',
} as const;

export const ORGANIZATION_STATES = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const;

export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  COMPETITIONS: 'competitions',
  FINANCE: 'finance',
  BI: 'bi',
  COMPLETE: 'complete',
  CUSTOM: 'custom',
} as const;

export const BILLING_FREQUENCIES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

export const PAYMENT_METHOD_TYPES = {
  CARD: 'card',
  TRANSFER: 'transfer',
  OXXO: 'oxxo',
} as const;

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_GATEWAYS = {
  STRIPE: 'stripe',
  MERCADOPAGO: 'mercadopago',
} as const;

export const CHURN_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const ONBOARDING_STEPS = {
  LEGAL_INFO: 'legal_info',
  CLUB_SETUP: 'club_setup',
  TECHNICAL_SETUP: 'technical_setup',
  TRAINING: 'training',
  PAYMENT: 'payment',
  GOLIVE: 'golive',
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  SUSPEND: 'suspend',
  REACTIVATE: 'reactivate',
  CANCEL: 'cancel',
  PAYMENT: 'payment',
  INVOICE: 'invoice',
  IMPERSONATE: 'impersonate',
} as const;