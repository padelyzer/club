// Club Types - Synchronized with Django Club model

// Import related types
import { Court } from './court';

// Operating hours by day
export interface DaySchedule {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  isOpen: boolean;
  openTime?: string; // HH:MM format
  closeTime?: string; // HH:MM format
  breaks?: TimeBreak[];
  // Snake_case equivalents
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
}

export interface TimeBreak {
  startTime: string;
  endTime: string;
  reason?: string;
  // Snake_case equivalents
  start_time?: string;
  end_time?: string;
}

// Club services and amenities
export interface ClubService {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isAvailable: boolean;
  price?: string; // DecimalField as string
  category: 'equipment' | 'facilities' | 'lessons' | 'food' | 'other';
  // Snake_case equivalents
  is_available?: boolean;
}

// Club contact information
export interface ClubContact {
  phone: string;
  secondaryPhone?: string;
  email: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  // Snake_case equivalents
  secondary_phone?: string;
}

// Club location
export interface ClubLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  neighborhood?: string;
  // Snake_case equivalents
  postal_code?: string;
  google_maps_url?: string;
}

// Pricing structure
export interface ClubPricing {
  id: string;
  name: string;
  description?: string;
  basePrice: string; // DecimalField as string
  currency: string;
  durationType: 'hourly' | 'daily' | 'monthly' | 'session';
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  // Modifiers
  weekdayMultiplier: string; // DecimalField as string
  weekendMultiplier: string; // DecimalField as string
  peakHourMultiplier: string; // DecimalField as string
  memberDiscount: string; // DecimalField as string
  // Snake_case equivalents
  base_price?: string;
  duration_type?: 'hourly' | 'daily' | 'monthly' | 'session';
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
  weekday_multiplier?: string;
  weekend_multiplier?: string;
  peak_hour_multiplier?: string;
  member_discount?: string;
}

// Main Club interface (complete Django model)
export interface Club {
  // Primary fields
  id: string;
  organization: string;
  name: string;
  slug: string;

  // Basic information
  description?: string;
  tagline?: string;
  established?: string; // DateField as string
  category: 'padel' | 'tennis' | 'multi_sport' | 'fitness' | 'other';
  
  // Contact information
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  whatsapp?: string;
  website?: string;
  
  // Address and location
  address: Record<string, any>; // JSONField from backend
  fullAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  
  // Social media
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  
  // Operating hours
  openingTime?: string;
  closingTime?: string;
  operatingHours?: Record<string, any>; // JSONField
  daysOpen: number[];
  timezone?: string;
  
  // Facilities and features
  features: string[];
  amenities: string[];
  services: string[];
  totalCourts: number;
  indoorCourts: number;
  outdoorCourts: number;
  hasLighting: boolean;
  hasParking: boolean;
  hasShowers: boolean;
  hasLockers: boolean;
  hasProShop: boolean;
  hasRestaurant: boolean;
  hasBar: boolean;
  hasGym: boolean;
  hasSwimmingPool: boolean;
  hasSauna: boolean;
  hasChildcare: boolean;
  hasWifi: boolean;
  hasAirConditioning: boolean;
  
  // Accessibility
  isWheelchairAccessible: boolean;
  hasElevator: boolean;
  accessibilityFeatures: string[];
  
  // Pricing and membership
  hasMonthlyMembership: boolean;
  hasDayPasses: boolean;
  acceptsGuests: boolean;
  guestPolicy?: string;
  pricingPolicy?: string;
  cancellationPolicy?: string;
  
  // Payment options
  acceptsCash: boolean;
  acceptsCards: boolean;
  acceptsTransfers: boolean;
  acceptsOnlinePayments: boolean;
  paymentProviders: string[];
  
  // Booking settings
  allowOnlineBooking: boolean;
  maxAdvanceBookingDays: number;
  minBookingDuration: number; // in minutes
  maxBookingDuration: number; // in minutes
  bookingTimeSlots: number; // in minutes
  requiresPaymentConfirmation: boolean;
  allowRecurringBookings: boolean;
  
  // Court configuration
  courtSurfaces: string[];
  courtTypes: string[];
  courtSizes: string[];
  
  // Staff and management
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  headCoachName?: string;
  headCoachEmail?: string;
  headCoachPhone?: string;
  totalStaff: number;
  
  // Business information
  businessLicense?: string;
  taxId?: string;
  vatNumber?: string;
  businessType: 'individual' | 'llc' | 'corporation' | 'non_profit' | 'other';
  
  // Branding
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages: string[];
  primaryColor?: string;
  secondaryColor?: string;
  brandColors: Record<string, any>;
  
  // Settings and configuration
  settings: Record<string, any>;
  preferences: Record<string, any>;
  customFields: Record<string, any>;
  metadata: Record<string, any>;
  
  // Analytics and metrics
  rating?: number;
  totalReviews: number;
  totalMembers: number;
  activeMembers: number;
  monthlyRevenue?: string; // DecimalField as string
  avgOccupancyRate?: number;
  
  // Status and visibility
  isActive: boolean;
  isPublic: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  
  // Publication status
  status: 'draft' | 'published' | 'suspended' | 'archived';
  publishedAt?: string;
  
  // Dates
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  
  // Snake_case equivalents for backend compatibility
  secondary_phone?: string;
  full_address?: string;
  postal_code?: string;
  opening_time?: string;
  closing_time?: string;
  operating_hours?: Record<string, any>;
  days_open?: number[];
  total_courts?: number;
  indoor_courts?: number;
  outdoor_courts?: number;
  has_lighting?: boolean;
  has_parking?: boolean;
  has_showers?: boolean;
  has_lockers?: boolean;
  has_pro_shop?: boolean;
  has_restaurant?: boolean;
  has_bar?: boolean;
  has_gym?: boolean;
  has_swimming_pool?: boolean;
  has_sauna?: boolean;
  has_childcare?: boolean;
  has_wifi?: boolean;
  has_air_conditioning?: boolean;
  is_wheelchair_accessible?: boolean;
  has_elevator?: boolean;
  accessibility_features?: string[];
  has_monthly_membership?: boolean;
  has_day_passes?: boolean;
  accepts_guests?: boolean;
  guest_policy?: string;
  pricing_policy?: string;
  cancellation_policy?: string;
  accepts_cash?: boolean;
  accepts_cards?: boolean;
  accepts_transfers?: boolean;
  accepts_online_payments?: boolean;
  payment_providers?: string[];
  allow_online_booking?: boolean;
  max_advance_booking_days?: number;
  min_booking_duration?: number;
  max_booking_duration?: number;
  booking_time_slots?: number;
  requires_payment_confirmation?: boolean;
  allow_recurring_bookings?: boolean;
  court_surfaces?: string[];
  court_types?: string[];
  court_sizes?: string[];
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  head_coach_name?: string;
  head_coach_email?: string;
  head_coach_phone?: string;
  total_staff?: number;
  business_license?: string;
  tax_id?: string;
  vat_number?: string;
  business_type?: 'individual' | 'llc' | 'corporation' | 'non_profit' | 'other';
  logo_url?: string;
  cover_image_url?: string;
  gallery_images?: string[];
  primary_color?: string;
  secondary_color?: string;
  brand_colors?: Record<string, any>;
  custom_fields?: Record<string, any>;
  total_reviews?: number;
  total_members?: number;
  active_members?: number;
  monthly_revenue?: string;
  avg_occupancy_rate?: number;
  is_active?: boolean;
  is_public?: boolean;
  is_verified?: boolean;
  is_featured?: boolean;
  is_premium?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  last_activity_at?: string;
  
  // Related data (populated from other models)
  courts?: Court[];
  courtsCount?: number;
  activeCourtsCount?: number;
  location?: ClubLocation;
  contact?: ClubContact;
  schedule?: DaySchedule[];
  clubServices?: ClubService[];
  pricing?: ClubPricing[];
  paymentMethods?: ('cash' | 'card' | 'transfer' | 'online')[];
  bookingRules?: BookingRules;
  averageOccupancy?: number;
}

// Booking configuration
export interface BookingRules {
  advanceBookingDays: number;
  minBookingDuration: number; // in minutes
  maxBookingDuration: number; // in minutes
  cancellationHours: number;
  allowRecurringBookings: boolean;
  maxRecurringWeeks: number;
  requirePaymentConfirmation: boolean;
  memberDiscountPercentage?: number;
  // Snake_case equivalents
  advance_booking_days?: number;
  min_booking_duration?: number;
  max_booking_duration?: number;
  cancellation_hours?: number;
  allow_recurring_bookings?: boolean;
  max_recurring_weeks?: number;
  require_payment_confirmation?: boolean;
  member_discount_percentage?: number;
}

// Club statistics
export interface ClubStats {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    trend: number; // percentage
  };
  occupancy: {
    current: number;
    todayAverage: number;
    weekAverage: number;
    peakHours: string[];
  };
  bookings: {
    today: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  };
  members: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  // Snake_case equivalents
  today_average?: number;
  week_average?: number;
  peak_hours?: string[];
  new_this_month?: number;
}

// Dashboard statistics from the dashboard-stats endpoint
export interface DashboardStats {
  todayReservations: number;
  todayReservationsChange: number;
  totalCourts: number;
  activeMembers: number;
  activeMembersChange: number;
  averageOccupancy: number;
  occupancyChange: number;
  upcomingReservations: UpcomingReservation[];
  recentActivity: RecentActivity[];
  generatedAt: string;
  // Snake_case equivalents
  today_reservations?: number;
  today_reservations_change?: number;
  total_courts?: number;
  active_members?: number;
  active_members_change?: number;
  average_occupancy?: number;
  occupancy_change?: number;
  upcoming_reservations?: UpcomingReservation[];
  recent_activity?: RecentActivity[];
  generated_at?: string;
}

export interface UpcomingReservation {
  id: string;
  playerName: string;
  court: string | {
    id: string;
    name: string;
    number: number;
  };
  client: {
    id: string;
    name: string;
    email?: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  playerCount: number;
  price?: number;
  timeUntil?: string; // Human readable time until reservation (e.g., "En 30 min")
  // Snake_case equivalents
  player_name?: string;
  start_time?: string;
  end_time?: string;
  player_count?: number;
  time_until?: string;
}

export interface RecentActivity {
  id: string;
  type: 'reservation_created' | 'reservation_cancelled' | 'client_registered' | 'payment_received' | 'reservation_completed';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  timeAgo?: string; // Human readable time ago (e.g., "Hace 5 minutos")
  details: {
    court?: string;
    date?: string;
    time?: string;
    amount?: number;
    paymentMethod?: string;
    category?: string;
    clientName?: string;
    courtName?: string;
    currency?: string;
    [key: string]: any;
  };
  metadata?: {
    client_name?: string;
    court_name?: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
  };
  // Snake_case equivalents
  time_ago?: string;
  payment_method?: string;
  client_name?: string;
  court_name?: string;
}

// Form data for creating/editing clubs
export interface ClubFormData {
  name: string;
  description?: string;
  tagline?: string;
  category: 'padel' | 'tennis' | 'multi_sport' | 'fitness' | 'other';
  location: Partial<ClubLocation>;
  contact: Partial<ClubContact>;
  schedule: DaySchedule[];
  services: string[];
  features: string[];
  amenities: string[];
  paymentMethods: string[];
  bookingRules: Partial<BookingRules>;
  totalCourts: number;
  indoorCourts: number;
  outdoorCourts: number;
  businessType: 'individual' | 'llc' | 'corporation' | 'non_profit' | 'other';
  primaryColor?: string;
  secondaryColor?: string;
  isPublic: boolean;
  allowOnlineBooking: boolean;
  acceptsGuests: boolean;
  hasMonthlyMembership: boolean;
  // Snake_case equivalents
  total_courts?: number;
  indoor_courts?: number;
  outdoor_courts?: number;
  business_type?: 'individual' | 'llc' | 'corporation' | 'non_profit' | 'other';
  primary_color?: string;
  secondary_color?: string;
  is_public?: boolean;
  allow_online_booking?: boolean;
  accepts_guests?: boolean;
  has_monthly_membership?: boolean;
}

// Club court configuration
export interface ClubCourtConfig {
  courtId: string;
  customName?: string;
  hourlyRates: HourlyRate[];
  maintenanceSchedule?: MaintenanceSchedule[];
  specialRules?: string;
  // Snake_case equivalents
  court_id?: string;
  custom_name?: string;
  hourly_rates?: HourlyRate[];
  maintenance_schedule?: MaintenanceSchedule[];
  special_rules?: string;
}

export interface HourlyRate {
  startTime: string;
  endTime: string;
  rate: string; // DecimalField as string
  days: string[]; // ['monday', 'tuesday', ...]
  // Snake_case equivalents
  start_time?: string;
  end_time?: string;
}

export interface MaintenanceSchedule {
  day: string;
  startTime: string;
  duration: number; // in minutes
  recurring: boolean;
  // Snake_case equivalents
  start_time?: string;
}

// Filter types
export interface ClubFilters {
  search?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: 'padel' | 'tennis' | 'multi_sport' | 'fitness' | 'other';
  isActive?: boolean;
  isPublic?: boolean;
  isVerified?: boolean;
  isFeatured?: boolean;
  hasCourts?: boolean;
  service?: string;
  feature?: string;
  amenity?: string;
  minRating?: number;
  hasOnlineBooking?: boolean;
  acceptsGuests?: boolean;
  hasParking?: boolean;
  hasWifi?: boolean;
  isWheelchairAccessible?: boolean;
  page?: number;
  pageSize?: number;
  ordering?: string;
  // Snake_case equivalents
  is_active?: boolean;
  is_public?: boolean;
  is_verified?: boolean;
  is_featured?: boolean;
  has_courts?: boolean;
  min_rating?: number;
  has_online_booking?: boolean;
  accepts_guests?: boolean;
  has_parking?: boolean;
  has_wifi?: boolean;
  is_wheelchair_accessible?: boolean;
  page_size?: number;
}

// UI State types
export type ClubViewMode = 'list' | 'grid' | 'map';

export interface ClubsPageState {
  viewMode: ClubViewMode;
  selectedClub: Club | null;
  activeClubId: string | null; // Currently active club for context
  isFormOpen: boolean;
  isDetailOpen: boolean;
  editingClub: Club | null;
  showMap: boolean;
}

// Export options
export interface ClubExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeStats: boolean;
  includeCourts: boolean;
  includeServices: boolean;
  includeMembers: boolean;
  filters?: ClubFilters;
}

// Permission types for multi-club management
export interface ClubPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageCourts: boolean;
  canManageServices: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageBookings: boolean;
  canManageMembers: boolean;
  canManagePayments: boolean;
  // Snake_case equivalents
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_manage_courts?: boolean;
  can_manage_services?: boolean;
  can_manage_staff?: boolean;
  can_view_analytics?: boolean;
  can_export_data?: boolean;
  can_manage_bookings?: boolean;
  can_manage_members?: boolean;
  can_manage_payments?: boolean;
}

// Response types
export interface ClubListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Club[];
}

export interface ClubDetailResponse extends Club {
  stats?: ClubStats;
  permissions?: ClubPermissions;
  recentActivity?: RecentActivity[];
}

// Constants
export const CLUB_CATEGORIES = {
  PADEL: 'padel',
  TENNIS: 'tennis',
  MULTI_SPORT: 'multi_sport',
  FITNESS: 'fitness',
  OTHER: 'other',
} as const;

export const CLUB_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
} as const;

export const BUSINESS_TYPES = {
  INDIVIDUAL: 'individual',
  LLC: 'llc',
  CORPORATION: 'corporation',
  NON_PROFIT: 'non_profit',
  OTHER: 'other',
} as const;

export const CLUB_FEATURES = [
  'lighting',
  'parking',
  'showers',
  'lockers',
  'pro_shop',
  'restaurant',
  'bar',
  'gym',
  'swimming_pool',
  'sauna',
  'childcare',
  'wifi',
  'air_conditioning',
  'wheelchair_accessible',
  'elevator',
] as const;

export const COURT_SURFACES = [
  'artificial_grass',
  'concrete',
  'acrylic',
  'clay',
  'hard_court',
  'carpet',
  'glass',
] as const;

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'online',
  'stripe',
  'mercadopago',
  'paypal',
] as const;