/**
 * Tipos TypeScript para finance
 * Generado automáticamente desde models.py
 */

export interface Payment {
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  organization: string;
  club: string;
  user?: string;
  client?: string;
  amount: string;
  currency: string;
  paymentType: string;
  payment_type: string;
  paymentMethod: string;
  payment_method: string;
  status: string;
  reservation?: string;
  membership?: string;
  classEnrollment?: string;
  class_enrollment?: string;
  tournamentRegistration?: string;
  tournament_registration?: string;
  referenceNumber?: string;
  reference_number?: string;
  externalTransactionId?: string;
  external_transaction_id?: string;
  gateway?: string;
  gatewayResponse?: Record<string, any>;
  gateway_response?: Record<string, any>;
  cardLast4?: string;
  card_last4?: string;
  cardBrand?: string;
  card_brand?: string;
  cardCountry?: string;
  card_country?: string;
  billingName?: string;
  billing_name?: string;
  billingEmail?: string;
  billing_email?: string;
  billingPhone?: string;
  billing_phone?: string;
  billingAddress?: string;
  billing_address?: string;
  billingRfc?: string;
  billing_rfc?: string;
  requiresInvoice: boolean;
  requires_invoice: boolean;
  invoiceId?: string;
  invoice_id?: string;
  invoiceUrl?: string;
  invoice_url?: string;
  invoiceSentAt?: string;
  invoice_sent_at?: string;
  isRefundable: boolean;
  is_refundable: boolean;
  refundAmount: string;
  refund_amount: string;
  refundReason?: string;
  refund_reason?: string;
  refundedAt?: string;
  refunded_at?: string;
  refundedBy?: string;
  refunded_by?: string;
  processedAt?: string;
  processed_at?: string;
  failedAt?: string;
  failed_at?: string;
  failureReason?: string;
  failure_reason?: string;
  description?: string;
  notes?: string;
  metadata?: Record<string, any>;
  processingFee: string;
  processing_fee: string;
  netAmount: string;
  net_amount: string;
  reconciled: boolean;
  reconciledAt?: string;
  reconciled_at?: string;
  reconciliationNotes?: string;
  reconciliation_notes?: string;
}

export interface PaymentForm {
  organization?: string;
  club?: string;
  user?: string;
  client?: string;
  amount?: string;
  currency?: string;
  paymentType?: string;
  paymentMethod?: string;
  status?: string;
  reservation?: string;
  membership?: string;
  classEnrollment?: string;
  tournamentRegistration?: string;
  referenceNumber?: string;
  externalTransactionId?: string;
  gateway?: string;
  gatewayResponse?: Record<string, any>;
  cardLast4?: string;
  cardBrand?: string;
  cardCountry?: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingRfc?: string;
  requiresInvoice?: boolean;
  invoiceId?: string;
  invoiceUrl?: string;
  invoiceSentAt?: string;
  isRefundable?: boolean;
  refundAmount?: string;
  refundReason?: string;
  refundedAt?: string;
  refundedBy?: string;
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;
  description?: string;
  notes?: string;
  metadata?: Record<string, any>;
  processingFee?: string;
  netAmount?: string;
  reconciled?: boolean;
  reconciledAt?: string;
  reconciliationNotes?: string;
}

export interface PaymentRefund {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  payment: string;
  amount: string;
  reason: string;
  status: string;
  gatewayRefundId?: string;
  gateway_refund_id?: string;
  gatewayResponse?: Record<string, any>;
  gateway_response?: Record<string, any>;
  processedBy?: string;
  processed_by?: string;
  processedAt?: string;
  processed_at?: string;
  failedAt?: string;
  failed_at?: string;
  failureReason?: string;
  failure_reason?: string;
}

export interface PaymentRefundForm {
  payment?: string;
  amount?: string;
  reason?: string;
  status?: string;
  gatewayRefundId?: string;
  gatewayResponse?: Record<string, any>;
  processedBy?: string;
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;
}

export interface PaymentMethod {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user: string;
  type: string;
  isDefault: boolean;
  is_default: boolean;
  cardLast4?: string;
  card_last4?: string;
  cardBrand?: string;
  card_brand?: string;
  cardExpMonth?: number;
  card_exp_month?: number;
  cardExpYear?: number;
  card_exp_year?: number;
  cardCountry?: string;
  card_country?: string;
  bankName?: string;
  bank_name?: string;
  accountLast4?: string;
  account_last4?: string;
  accountHolderName?: string;
  account_holder_name?: string;
  gateway: string;
  gatewayCustomerId: string;
  gateway_customer_id: string;
  gatewayPaymentMethodId: string;
  gateway_payment_method_id: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethodForm {
  user?: string;
  type?: string;
  isDefault?: boolean;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardCountry?: string;
  bankName?: string;
  accountLast4?: string;
  accountHolderName?: string;
  gateway?: string;
  gatewayCustomerId?: string;
  gatewayPaymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  intentId: string;
  intent_id: string;
  amount: string;
  currency: string;
  status: string;
  customerEmail: string;
  customer_email: string;
  customerName: string;
  customer_name: string;
  customerPhone?: string;
  customer_phone?: string;
  paymentMethodTypes: Record<string, any>;
  payment_method_types: Record<string, any>;
  reservationData?: Record<string, any>;
  reservation_data?: Record<string, any>;
  gateway: string;
  gatewayIntentId?: string;
  gateway_intent_id?: string;
  clientSecret?: string;
  client_secret?: string;
  expiresAt: string;
  expires_at: string;
  confirmedAt?: string;
  confirmed_at?: string;
  cancelledAt?: string;
  cancelled_at?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentForm {
  intentId?: string;
  amount?: string;
  currency?: string;
  status?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethodTypes?: Record<string, any>;
  reservationData?: Record<string, any>;
  gateway?: string;
  gatewayIntentId?: string;
  clientSecret?: string;
  expiresAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  metadata?: Record<string, any>;
}

export interface Membership {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  name: string;
  club: string;
}

export interface MembershipForm {
  name?: string;
  club?: string;
}

export interface Revenue {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  organization: string;
  club: string;
  date: string;
  concept: string;
  description: string;
  amount: string;
  paymentMethod: string;
  payment_method: string;
  payment?: string;
  reference: string;
}

export interface RevenueForm {
  organization?: string;
  club?: string;
  date?: string;
  concept?: string;
  description?: string;
  amount?: string;
  paymentMethod?: string;
  payment?: string;
  reference?: string;
}

export interface Subscription {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  stripeSubscriptionId: string;
  stripe_subscription_id: string;
  stripeCustomerId: string;
  stripe_customer_id: string;
  organization?: string;
  club: string;
  user?: string;
  status: string;
  planId: string;
  plan_id: string;
  planName?: string;
  plan_name?: string;
  planAmount: string;
  plan_amount: string;
  planInterval: string;
  plan_interval: string;
  currentPeriodStart: string;
  current_period_start: string;
  currentPeriodEnd: string;
  current_period_end: string;
  trialStart?: string;
  trial_start?: string;
  trialEnd?: string;
  trial_end?: string;
  cancelAtPeriodEnd: boolean;
  cancel_at_period_end: boolean;
  canceledAt?: string;
  canceled_at?: string;
  endedAt?: string;
  ended_at?: string;
  lastPaymentDate?: string;
  last_payment_date?: string;
  nextPaymentDate?: string;
  next_payment_date?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionForm {
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  organization?: string;
  club?: string;
  user?: string;
  status?: string;
  planId?: string;
  planName?: string;
  planAmount?: string;
  planInterval?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  endedAt?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  stripeInvoiceId: string;
  stripe_invoice_id: string;
  subscription: string;
  invoiceNumber?: string;
  invoice_number?: string;
  status: string;
  amount: string;
  amountPaid: string;
  amount_paid: string;
  amountRemaining: string;
  amount_remaining: string;
  periodStart: string;
  period_start: string;
  periodEnd: string;
  period_end: string;
  dueDate?: string;
  due_date?: string;
  paidAt?: string;
  paid_at?: string;
  voidedAt?: string;
  voided_at?: string;
  paymentIntentId?: string;
  payment_intent_id?: string;
  paymentMethod?: string;
  payment_method?: string;
  invoicePdfUrl?: string;
  invoice_pdf_url?: string;
  hostedInvoiceUrl?: string;
  hosted_invoice_url?: string;
  metadata?: Record<string, any>;
}

export interface InvoiceForm {
  stripeInvoiceId?: string;
  subscription?: string;
  invoiceNumber?: string;
  status?: string;
  amount?: string;
  amountPaid?: string;
  amountRemaining?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  paidAt?: string;
  voidedAt?: string;
  paymentIntentId?: string;
  paymentMethod?: string;
  invoicePdfUrl?: string;
  hostedInvoiceUrl?: string;
  metadata?: Record<string, any>;
}
