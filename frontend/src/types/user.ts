// User and Authentication Types - Synchronized with Django models

// Player Level types
export interface PlayerLevel {
  id: string;
  name: string;
  description?: string;
  minRating: number;
  maxRating: number;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Django User model (extended)
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  
  // Django standard fields
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  dateJoined: string;
  lastLogin?: string;
  
  // Additional profile fields
  phone?: string;
  avatar?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  language?: string;
  timezone?: string;
  
  // Relationships
  clubMemberships?: ClubMembership[];
  organizationMemberships?: OrganizationMembership[];
  groups?: string[];
  userPermissions?: string[];
  
  // Snake_case equivalents for backend compatibility
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  last_login?: string;
  club_memberships?: ClubMembership[];
  organization_memberships?: OrganizationMembership[];
  user_permissions?: string[];
  birth_date?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

// UserProfile model from Django
export interface UserProfile {
  id: string;
  user: string | User;
  organization?: string;
  club?: string;
  
  // Personal information
  phone?: string;
  alternativePhone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  nationality?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  
  // Professional
  occupation?: string;
  company?: string;
  
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  
  // Medical information
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
  
  // Preferences
  language: string;
  timezone: string;
  preferredCommunicationChannel: 'email' | 'sms' | 'whatsapp' | 'phone';
  
  // Privacy settings
  isPublic: boolean;
  showInDirectory: boolean;
  allowContactFromOtherMembers: boolean;
  
  // Marketing
  acceptsMarketing: boolean;
  marketingSource?: string;
  referredBy?: string;
  
  // Profile completeness
  profileCompleteness: number;
  lastProfileUpdate?: string;
  
  // Social links
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  
  // Avatar and media
  avatar?: string;
  coverPhoto?: string;
  
  // Snake_case equivalents
  alternative_phone?: string;
  birth_date?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_conditions?: string;
  preferred_communication_channel?: 'email' | 'sms' | 'whatsapp' | 'phone';
  is_public?: boolean;
  show_in_directory?: boolean;
  allow_contact_from_other_members?: boolean;
  accepts_marketing?: boolean;
  marketing_source?: string;
  referred_by?: string;
  profile_completeness?: number;
  last_profile_update?: string;
  cover_photo?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Club Membership
export interface ClubMembership {
  id: string;
  user: string | User;
  club: string | {
    id: string;
    name: string;
    slug: string;
  };
  organization: string;
  
  // Role and permissions
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'trainer' | 'member';
  permissions: Record<string, any>;
  
  // Status
  isActive: boolean;
  
  // Membership details
  membershipType?: 'monthly' | 'annual' | 'daily' | 'trial' | 'lifetime';
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  
  // Payment
  monthlyFee?: string; // DecimalField as string
  lastPayment?: string;
  nextPaymentDue?: string;
  paymentStatus?: 'current' | 'overdue' | 'suspended';
  
  // Access
  accessLevel?: 'basic' | 'premium' | 'vip';
  allowedReservationDays?: number;
  maxAdvanceBookingDays?: number;
  discountPercentage?: string; // DecimalField as string
  
  // Guest privileges
  guestPrivileges?: boolean;
  maxGuestsPerReservation?: number;
  guestFeeDiscount?: string; // DecimalField as string
  
  // Special access
  hasCourtAccess?: boolean;
  hasEquipmentAccess?: boolean;
  hasLockerAccess?: boolean;
  hasGymAccess?: boolean;
  
  // Notes
  notes?: string;
  internalNotes?: string;
  
  // Status dates
  joinedAt: string;
  suspendedAt?: string;
  suspendedReason?: string;
  terminatedAt?: string;
  terminationReason?: string;
  
  // Snake_case equivalents
  is_active?: boolean;
  membership_type?: 'monthly' | 'annual' | 'daily' | 'trial' | 'lifetime';
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  monthly_fee?: string;
  last_payment?: string;
  next_payment_due?: string;
  payment_status?: 'current' | 'overdue' | 'suspended';
  access_level?: 'basic' | 'premium' | 'vip';
  allowed_reservation_days?: number;
  max_advance_booking_days?: number;
  discount_percentage?: string;
  guest_privileges?: boolean;
  max_guests_per_reservation?: number;
  guest_fee_discount?: string;
  has_court_access?: boolean;
  has_equipment_access?: boolean;
  has_locker_access?: boolean;
  has_gym_access?: boolean;
  internal_notes?: string;
  joined_at?: string;
  suspended_at?: string;
  suspended_reason?: string;
  terminated_at?: string;
  termination_reason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Organization Membership
export interface OrganizationMembership {
  id: string;
  user: string | User;
  organization: string | {
    id: string;
    businessName: string;
    tradeName: string;
  };
  
  // Role and permissions
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'accountant' | 'support';
  permissions: Record<string, any>;
  
  // Department and position
  department?: string;
  position?: string;
  
  // Access control
  isActive: boolean;
  canImpersonate: boolean;
  allowedModules: string[];
  ipRestrictions?: string[];
  
  // Work schedule
  workSchedule?: Record<string, any>;
  timezone?: string;
  
  // Contact preferences
  businessEmail?: string;
  businessPhone?: string;
  extension?: string;
  
  // Status tracking
  lastActiveAt?: string;
  loginCount: number;
  failedLoginAttempts: number;
  lockedUntil?: string;
  
  // Dates
  joinedAt: string;
  leftAt?: string;
  
  // Notes
  notes?: string;
  
  // Snake_case equivalents
  can_impersonate?: boolean;
  allowed_modules?: string[];
  ip_restrictions?: string[];
  work_schedule?: Record<string, any>;
  business_email?: string;
  business_phone?: string;
  is_active?: boolean;
  last_active_at?: string;
  login_count?: number;
  failed_login_attempts?: number;
  locked_until?: string;
  joined_at?: string;
  left_at?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Authentication session information
export interface UserSession {
  id: string;
  user: string | User;
  sessionKey: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  isActive: boolean;
  expiresAt: string;
  lastActivity: string;
  createdAt: string;
}

// Password reset and security
export interface PasswordResetToken {
  id: string;
  user: string | User;
  token: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  createdAt: string;
}

// Two-factor authentication
export interface TwoFactorAuth {
  id: string;
  user: string | User;
  isEnabled: boolean;
  secretKey?: string;
  backupCodes?: string[];
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

// Login attempt tracking
export interface LoginAttempt {
  id: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  location?: {
    country?: string;
    city?: string;
  };
  timestamp: string;
}

// User activity log
export interface UserActivity {
  id: string;
  user: string | User;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: string;
}

// Form data types for UI
export interface UserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  language?: string;
  timezone?: string;
}

export interface UserProfileFormData {
  phone?: string;
  alternativePhone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  occupation?: string;
  company?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  language: string;
  timezone: string;
  preferredCommunicationChannel: 'email' | 'sms' | 'whatsapp' | 'phone';
  isPublic: boolean;
  showInDirectory: boolean;
  allowContactFromOtherMembers: boolean;
  acceptsMarketing: boolean;
  marketingSource?: string;
  referredBy?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

export interface ClubMembershipFormData {
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'trainer' | 'member';
  membershipType?: 'monthly' | 'annual' | 'daily' | 'trial' | 'lifetime';
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  monthlyFee?: number;
  accessLevel?: 'basic' | 'premium' | 'vip';
  allowedReservationDays?: number;
  maxAdvanceBookingDays?: number;
  discountPercentage?: number;
  guestPrivileges?: boolean;
  maxGuestsPerReservation?: number;
  guestFeeDiscount?: number;
  hasCourtAccess?: boolean;
  hasEquipmentAccess?: boolean;
  hasLockerAccess?: boolean;
  hasGymAccess?: boolean;
  notes?: string;
}

// Response types
export interface UserListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: User[];
}

export interface UserDetailResponse extends User {
  profile?: UserProfile;
  clubMemberships?: ClubMembership[];
  organizationMemberships?: OrganizationMembership[];
  lastActivity?: UserActivity;
  sessionCount?: number;
}

// Filter types
export interface UserFilters {
  search?: string;
  isActive?: boolean;
  isStaff?: boolean;
  role?: string;
  club?: string;
  organization?: string;
  gender?: 'M' | 'F' | 'O';
  membershipType?: string;
  accessLevel?: string;
  language?: string;
  country?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
}

// Constants
export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  TRAINER: 'trainer',
  MEMBER: 'member',
} as const;

export const MEMBERSHIP_TYPES = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  DAILY: 'daily',
  TRIAL: 'trial',
  LIFETIME: 'lifetime',
} as const;

export const ACCESS_LEVELS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  VIP: 'vip',
} as const;

export const GENDER_CHOICES = {
  MALE: 'M',
  FEMALE: 'F',
  OTHER: 'O',
} as const;

export const COMMUNICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  PHONE: 'phone',
} as const;