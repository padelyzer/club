/**
 * Tipos COMPLETOS para root
 * Incluye TODOS los campos del modelo Django
 */

export interface Organization {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  type: string;
  businessName: string;
  business_name: string;
  tradeName: string;
  trade_name: string;
  rfc: string;
  taxAddress: Record<string, any>;
  tax_address: Record<string, any>;
  legalRepresentative: string;
  legal_representative: string;
  primaryEmail: string;
  primary_email: string;
  primaryPhone: string;
  primary_phone: string;
  state: string;
  trialEndsAt?: string;
  trial_ends_at?: string;
  suspendedAt?: string;
  suspended_at?: string;
  suspendedReason?: string;
  suspended_reason?: string;
  cancelledAt?: string;
  cancelled_at?: string;
  cancellationReason?: string;
  cancellation_reason?: string;
  totalRevenue: string;
  total_revenue: string;
  activeUsers: number;
  active_users: number;
  monthlyReservations: number;
  monthly_reservations: number;
  lastActivity?: string;
  last_activity?: string;
  healthScore: number;
  health_score: number;
  churnRisk: string;
  churn_risk: string;
}

export interface Subscription {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  organization: string;
  plan: string;
  customModules?: Record<string, any>;
  custom_modules?: Record<string, any>;
  billingFrequency: string;
  billing_frequency: string;
  amount: string;
  currency: string;
  taxRate: string;
  tax_rate: string;
  paymentMethodType: string;
  payment_method_type: string;
  paymentMethodDetails?: Record<string, any>;
  payment_method_details?: Record<string, any>;
  stripeCustomerId?: string;
  stripe_customer_id?: string;
  stripeSubscriptionId?: string;
  stripe_subscription_id?: string;
  mercadopagoCustomerId?: string;
  mercadopago_customer_id?: string;
  cfdiUse: string;
  cfdi_use: string;
  invoiceEmail: string;
  invoice_email: string;
  automaticInvoice: boolean;
  automatic_invoice: boolean;
  clubsAllowed: number;
  clubs_allowed: number;
  usersPerClub: number;
  users_per_club: number;
  courtsPerClub: number;
  courts_per_club: number;
  monthlyReservationsLimit: number;
  monthly_reservations_limit: number;
  dataRetentionDays: number;
  data_retention_days: number;
  apiCallsPerHour: number;
  api_calls_per_hour: number;
  startDate: string;
  start_date: string;
  endDate?: string;
  end_date?: string;
  autoRenew: boolean;
  auto_renew: boolean;
  minimumTermMonths: number;
  minimum_term_months: number;
  earlyTerminationFee: string;
  early_termination_fee: string;
  currentPeriodStart: string;
  current_period_start: string;
  currentPeriodEnd: string;
  current_period_end: string;
  nextBillingDate: string;
  next_billing_date: string;
}

export interface Invoice {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  organization: string;
  subscription: string;
  invoiceNumber: string;
  invoice_number: string;
  invoiceDate: string;
  invoice_date: string;
  dueDate: string;
  due_date: string;
  subtotal: string;
  taxAmount: string;
  tax_amount: string;
  total: string;
  status: string;
  paidAt?: string;
  paid_at?: string;
  paymentMethod?: string;
  payment_method?: string;
  paymentReference?: string;
  payment_reference?: string;
  cfdiUuid?: string;
  cfdi_uuid?: string;
  cfdiXml?: string;
  cfdi_xml?: string;
  cfdiPdfUrl?: string;
  cfdi_pdf_url?: string;
  cfdiStampedAt?: string;
  cfdi_stamped_at?: string;
  periodStart: string;
  period_start: string;
  periodEnd: string;
  period_end: string;
  notes?: string;
}

export interface Payment {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  organization: string;
  invoice?: string;
  amount: string;
  currency: string;
  status: string;
  gateway: string;
  gatewayPaymentId: string;
  gateway_payment_id: string;
  gatewayPaymentMethod: string;
  gateway_payment_method: string;
  processedAt?: string;
  processed_at?: string;
  failedAt?: string;
  failed_at?: string;
  failureReason?: string;
  failure_reason?: string;
  refundedAmount: string;
  refunded_amount: string;
  refundedAt?: string;
  refunded_at?: string;
  refundReason?: string;
  refund_reason?: string;
  metadata?: Record<string, any>;
}

export interface ClubOnboarding {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  organization: string;
  assignedTo?: string;
  assigned_to?: string;
  currentStep: string;
  current_step: string;
  stepsCompleted: Record<string, any>;
  steps_completed: Record<string, any>;
  targetLaunchDate: string;
  target_launch_date: string;
  actualLaunchDate?: string;
  actual_launch_date?: string;
  notes?: string;
  checklist: Record<string, any>;
}

export interface AuditLog {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  user?: string;
  ipAddress: any;
  ip_address: any;
  userAgent: string;
  user_agent: string;
  action: string;
  modelName: string;
  model_name: string;
  objectId: string;
  object_id: string;
  objectRepr: string;
  object_repr: string;
  changes: Record<string, any>;
  organization?: string;
}
