/**
 * Unified Club Data Model
 * The most powerful club management system in the world
 */

// API Response Types (from backend)
export interface ClubAPIResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  website?: string;
  address: string | Record<string, any>;
  
  // Stats from API
  total_members: number;
  active_members?: number;
  average_occupancy?: number;
  monthly_revenue?: number;
  
  // Features & Services
  features?: string[];
  services?: ClubService[];
  
  // Schedule
  schedule?: DaySchedule[];
  timezone: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  is_active: boolean;
  subscription_plan?: string;
  
  // Relations
  courts?: Court[];
  upcoming_events?: number;
  active_leagues?: number;
}

// UI Display Types (for components)
export interface ClubUI {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Visual elements
  logo: string;
  coverImage: string;
  accentColor: string;
  
  // Contact info formatted for display
  contact: {
    phone: string;
    email: string;
    website: string;
    whatsapp?: string;
  };
  
  // Location formatted for display
  location: {
    address: string;
    city?: string;
    region?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Stats formatted for display
  stats: {
    members: {
      total: number;
      active: number;
      growth: number; // percentage
    };
    occupancy: {
      current: number;
      average: number;
      peak: number;
    };
    revenue: {
      monthly: number;
      growth: number; // percentage
      currency: string;
    };
    rating: {
      value: number;
      count: number;
    };
  };
  
  // Features for badges
  highlights: string[];
  services: ClubServiceUI[];
  
  // Status
  status: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    nextOpen?: string;
    statusText: string;
    statusColor: 'green' | 'yellow' | 'red';
  };
  
  // Metadata
  tier: 'basic' | 'premium' | 'elite';
  verified: boolean;
  yearEstablished?: number;
  
  // Quick actions available
  actions: {
    canBook: boolean;
    canJoin: boolean;
    canContact: boolean;
    canVisit: boolean;
  };
}

// Service types
export interface ClubService {
  id: string;
  name: string;
  description?: string;
  price?: number;
  icon?: string;
  available: boolean;
}

export interface ClubServiceUI {
  id: string;
  name: string;
  icon: string;
  available: boolean;
  highlight?: boolean;
}

// Day Schedule
export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  is_open: boolean;
  open_time?: string;
  close_time?: string;
  breaks?: Array<{
    start_time: string;
    end_time: string;
    reason?: string;
  }>;
}

// Court type
export interface Court {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor' | 'covered';
  surface: string;
  features?: string[];
}

// Form data types
export interface ClubFormData {
  // Basic info
  name: string;
  description?: string;
  
  // Contact
  email: string;
  phone: string;
  website?: string;
  whatsapp?: string;
  
  // Location
  address: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  
  // Features
  features: string[];
  services: string[];
  
  // Schedule
  schedule: DaySchedule[];
  timezone: string;
  
  // Images
  logo?: File | string;
  coverImage?: File | string;
  
  // Settings
  allowOnlineBooking: boolean;
  requireMembership: boolean;
  publicProfile: boolean;
}