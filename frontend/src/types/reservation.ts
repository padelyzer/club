// Reservation Types - Synchronized with Django reservation models

// Import related types
import { User } from './user';

// Main Reservation model (complete from Django)
export interface Reservation {
  // IDs
  id: string; // UUID field
  
  // Relationships
  organization: string;
  club: string | {
    id: string;
    name: string;
    slug: string;
  };
  court: string | {
    id: string;
    name: string;
    number: number;
  };
  createdBy?: string | User;
  
  // Linked to registered client (optional)
  clientProfile?: string | {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  
  // Date and time
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number; // calculated field
  
  // Type
  reservationType: 'single' | 'recurring' | 'tournament' | 'class' | 'maintenance' | 'blocked';
  
  // Status
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  
  // Player information (for guests or quick bookings)
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  playerCount: number; // 1-12
  guestCount: number;
  
  // Pricing
  pricePerHour?: string; // DecimalField as string
  totalPrice: string; // DecimalField as string
  specialPrice?: string; // DecimalField as string
  discountPercentage: string; // DecimalField as string
  discountReason?: string;
  
  // Payment
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: string;
  paymentAmount?: string; // DecimalField as string
  paidAt?: string;
  
  // Split payment
  isSplitPayment: boolean;
  splitCount: number;
  
  // Cancellation
  cancellationPolicy: 'flexible' | 'moderate' | 'strict' | 'custom';
  cancellationDeadline?: string;
  cancellationFee: string; // DecimalField as string
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string | User;
  
  // Invoice
  requiresInvoice: boolean;
  invoiceData?: Record<string, any>;
  invoiceStatus: 'not_required' | 'pending' | 'generated' | 'sent' | 'cancelled';
  
  // Recurring
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceEndDate?: string;
  parentReservation?: string | Reservation;
  
  // Wait list
  onWaitList: boolean;
  waitListPosition?: number;
  
  // No-show
  noShow: boolean;
  noShowFee: string; // DecimalField as string
  
  // Tracking
  bookingSource: 'web' | 'mobile' | 'phone' | 'walkin' | 'admin' | 'api';
  confirmationSent: boolean;
  reminderSent: boolean;
  checkedInAt?: string;
  
  // Additional
  notes?: string;
  internalNotes?: string;
  additionalServices: Record<string, any>;
  
  // Computed properties
  canCancel?: boolean;
  isPast?: boolean;
  isToday?: boolean;
  isFuture?: boolean;
  durationHours?: number;
  timeSlot?: string;
  paymentProgress?: number;
  
  // Snake_case equivalents for backend compatibility
  client_profile?: string | {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  created_by?: string | User;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  reservation_type?: 'single' | 'recurring' | 'tournament' | 'class' | 'maintenance' | 'blocked';
  player_name?: string;
  player_email?: string;
  player_phone?: string;
  player_count?: number;
  guest_count?: number;
  price_per_hour?: string;
  total_price?: string;
  special_price?: string;
  discount_percentage?: string;
  discount_reason?: string;
  payment_status?: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  payment_method?: string;
  payment_amount?: string;
  paid_at?: string;
  is_split_payment?: boolean;
  split_count?: number;
  cancellation_policy?: 'flexible' | 'moderate' | 'strict' | 'custom';
  cancellation_deadline?: string;
  cancellation_fee?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string | User;
  requires_invoice?: boolean;
  invoice_data?: Record<string, any>;
  invoice_status?: 'not_required' | 'pending' | 'generated' | 'sent' | 'cancelled';
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrence_end_date?: string;
  parent_reservation?: string | Reservation;
  on_wait_list?: boolean;
  wait_list_position?: number;
  no_show?: boolean;
  no_show_fee?: string;
  booking_source?: 'web' | 'mobile' | 'phone' | 'walkin' | 'admin' | 'api';
  confirmation_sent?: boolean;
  reminder_sent?: boolean;
  checked_in_at?: string;
  internal_notes?: string;
  additional_services?: Record<string, any>;
  can_cancel?: boolean;
  is_past?: boolean;
  is_today?: boolean;
  is_future?: boolean;
  duration_hours?: number;
  time_slot?: string;
  payment_progress?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// ReservationPayment model (split payment tracking)
export interface ReservationPayment {
  id: string;
  reservation: string | Reservation;
  
  playerName: string;
  playerEmail: string;
  amount: string; // DecimalField as string
  
  isPaid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  
  // Payment link
  paymentToken: string; // unique token
  paymentLinkSentAt?: string;
  paymentLinkAccessedAt?: string;
  
  // Check-in
  isCheckedIn: boolean;
  checkedInAt?: string;
  checkInCode: string; // 6-digit code
  
  // Snake_case equivalents
  player_name?: string;
  player_email?: string;
  is_paid?: boolean;
  paid_at?: string;
  payment_method?: string;
  transaction_id?: string;
  payment_token?: string;
  payment_link_sent_at?: string;
  payment_link_accessed_at?: string;
  is_checked_in?: boolean;
  checked_in_at?: string;
  check_in_code?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// BlockedSlot model (maintenance and other blocks)
export interface BlockedSlot {
  id: string;
  organization: string;
  club: string | {
    id: string;
    name: string;
  };
  court?: string | {
    id: string;
    name: string;
    number: number;
  }; // null means all courts
  
  startDatetime: string;
  endDatetime: string;
  
  reason: 'maintenance' | 'tournament' | 'private_event' | 'weather' | 'other';
  description?: string;
  
  createdBy?: string | User;
  
  // Recurring blocks
  isRecurring: boolean;
  recurrencePattern?: Record<string, any>;
  
  // Snake_case equivalents
  start_datetime?: string;
  end_datetime?: string;
  created_by?: string | User;
  is_recurring?: boolean;
  recurrence_pattern?: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Form data types
export interface ReservationFormData {
  club: string;
  court: string;
  date: string;
  startTime: string;
  endTime: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  playerCount: number;
  guestCount?: number;
  reservationType?: 'single' | 'recurring' | 'tournament' | 'class';
  paymentMethod?: string;
  notes?: string;
  requiresInvoice?: boolean;
  invoiceData?: Record<string, any>;
  
  // Recurring fields
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceEndDate?: string;
  
  // Split payment
  isSplitPayment?: boolean;
  splitCount?: number;
  splitPayments?: Array<{
    playerName: string;
    playerEmail: string;
    amount: number;
  }>;
  
  // Snake_case equivalents
  start_time?: string;
  end_time?: string;
  player_name?: string;
  player_email?: string;
  player_phone?: string;
  player_count?: number;
  guest_count?: number;
  reservation_type?: 'single' | 'recurring' | 'tournament' | 'class';
  payment_method?: string;
  requires_invoice?: boolean;
  invoice_data?: Record<string, any>;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrence_end_date?: string;
  is_split_payment?: boolean;
  split_count?: number;
  split_payments?: Array<{
    player_name: string;
    player_email: string;
    amount: number;
  }>;
}

export interface BlockedSlotFormData {
  club: string;
  court?: string; // optional for all courts
  startDatetime: string;
  endDatetime: string;
  reason: 'maintenance' | 'tournament' | 'private_event' | 'weather' | 'other';
  description?: string;
  isRecurring?: boolean;
  recurrencePattern?: Record<string, any>;
  
  // Snake_case equivalents
  start_datetime?: string;
  end_datetime?: string;
  is_recurring?: boolean;
  recurrence_pattern?: Record<string, any>;
}

export interface ReservationPaymentFormData {
  reservation: string;
  playerName: string;
  playerEmail: string;
  amount: number;
  
  // Snake_case equivalents
  player_name?: string;
  player_email?: string;
}

// Response types
export interface ReservationListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Reservation[];
}

export interface ReservationDetailResponse extends Reservation {
  splitPayments?: ReservationPayment[];
  recurringInstances?: Reservation[];
  conflictingReservations?: Reservation[];
  availableSlots?: string[];
  pricing?: {
    basePrice: string;
    totalPrice: string;
    discounts: Array<{
      type: string;
      amount: string;
      description: string;
    }>;
  };
}

export interface ReservationStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  byPaymentStatus: {
    pending: number;
    partial: number;
    paid: number;
    refunded: number;
    failed: number;
  };
  revenue: {
    today: string;
    thisWeek: string;
    thisMonth: string;
  };
  occupancyRate: number;
  averageBookingValue: string;
  
  // Snake_case equivalents
  this_week?: number;
  this_month?: number;
  by_status?: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  by_payment_status?: {
    pending: number;
    partial: number;
    paid: number;
    refunded: number;
    failed: number;
  };
  this_week_revenue?: string;
  this_month_revenue?: string;
  occupancy_rate?: number;
  average_booking_value?: string;
}

// Filter types
export interface ReservationFilters {
  search?: string;
  club?: string;
  court?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  startTimeFrom?: string;
  startTimeTo?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  reservationType?: 'single' | 'recurring' | 'tournament' | 'class' | 'maintenance' | 'blocked';
  bookingSource?: 'web' | 'mobile' | 'phone' | 'walkin' | 'admin' | 'api';
  createdBy?: string;
  clientProfile?: string;
  minAmount?: number;
  maxAmount?: number;
  isRecurring?: boolean;
  onWaitList?: boolean;
  requiresInvoice?: boolean;
  hasNotes?: boolean;
  checkedIn?: boolean;
  noShow?: boolean;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  date_from?: string;
  date_to?: string;
  start_time_from?: string;
  start_time_to?: string;
  payment_status?: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  reservation_type?: 'single' | 'recurring' | 'tournament' | 'class' | 'maintenance' | 'blocked';
  booking_source?: 'web' | 'mobile' | 'phone' | 'walkin' | 'admin' | 'api';
  created_by?: string;
  client_profile?: string;
  min_amount?: number;
  max_amount?: number;
  is_recurring?: boolean;
  on_wait_list?: boolean;
  requires_invoice?: boolean;
  has_notes?: boolean;
  checked_in?: boolean;
  no_show?: boolean;
  page_size?: number;
}

export interface BlockedSlotFilters {
  search?: string;
  club?: string;
  court?: string;
  dateFrom?: string;
  dateTo?: string;
  reason?: 'maintenance' | 'tournament' | 'private_event' | 'weather' | 'other';
  isRecurring?: boolean;
  createdBy?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
  
  // Snake_case equivalents
  date_from?: string;
  date_to?: string;
  is_recurring?: boolean;
  created_by?: string;
  page_size?: number;
}

// Availability types
export interface CourtAvailability {
  courtId: string;
  courtName: string;
  courtNumber: number;
  date: string;
  availableSlots: Array<{
    startTime: string;
    endTime: string;
    duration: number;
    price: string;
    isAvailable: boolean;
    conflictReason?: string;
  }>;
  blockedSlots: Array<{
    startTime: string;
    endTime: string;
    reason: string;
    description?: string;
  }>;
  
  // Snake_case equivalents
  court_id?: string;
  court_name?: string;
  court_number?: number;
  available_slots?: Array<{
    start_time: string;
    end_time: string;
    duration: number;
    price: string;
    is_available: boolean;
    conflict_reason?: string;
  }>;
  blocked_slots?: Array<{
    start_time: string;
    end_time: string;
    reason: string;
    description?: string;
  }>;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  price: string;
  isAvailable: boolean;
  conflictReason?: string;
  reservationId?: string;
  
  // Snake_case equivalents
  start_time?: string;
  end_time?: string;
  is_available?: boolean;
  conflict_reason?: string;
  reservation_id?: string;
}

// Calendar and UI types
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  resourceId?: string; // court ID
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    reservation?: Reservation;
    blockedSlot?: BlockedSlot;
    type: 'reservation' | 'blocked' | 'maintenance';
    status?: string;
    playerName?: string;
    courtName?: string;
  };
}

export interface ReservationFormState {
  selectedCourt?: string;
  selectedDate?: string;
  selectedTimeSlot?: TimeSlot;
  formData: Partial<ReservationFormData>;
  errors: Record<string, string>;
  loading: boolean;
  step: 'court' | 'time' | 'details' | 'payment' | 'confirmation';
}

// Export options
export interface ReservationExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includePayments: boolean;
  includeStats: boolean;
  filters?: ReservationFilters;
  dateRange?: {
    from: string;
    to: string;
  };
}

// Constants
export const RESERVATION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;

export const RESERVATION_TYPES = {
  SINGLE: 'single',
  RECURRING: 'recurring',
  TOURNAMENT: 'tournament',
  CLASS: 'class',
  MAINTENANCE: 'maintenance',
  BLOCKED: 'blocked',
} as const;

export const CANCELLATION_POLICIES = {
  FLEXIBLE: 'flexible',
  MODERATE: 'moderate',
  STRICT: 'strict',
  CUSTOM: 'custom',
} as const;

export const BOOKING_SOURCES = {
  WEB: 'web',
  MOBILE: 'mobile',
  PHONE: 'phone',
  WALKIN: 'walkin',
  ADMIN: 'admin',
  API: 'api',
} as const;

export const RECURRENCE_PATTERNS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const;

export const BLOCKED_SLOT_REASONS = {
  MAINTENANCE: 'maintenance',
  TOURNAMENT: 'tournament',
  PRIVATE_EVENT: 'private_event',
  WEATHER: 'weather',
  OTHER: 'other',
} as const;

export const INVOICE_STATUSES = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  GENERATED: 'generated',
  SENT: 'sent',
  CANCELLED: 'cancelled',
} as const;