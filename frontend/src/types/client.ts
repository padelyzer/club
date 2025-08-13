// Client-specific types and interfaces
import {
  Client as ApiClient,
  ClientFilters as ApiClientFilters,
  EnhancedClientProfile,
  PartnerMatch,
  PartnerRequest,
  PartnerSearchFilters,
  PartnerRecommendation,
  PlayerLevel,
  PlayerStats,
  PlayerPreferences,
} from '@/lib/api/types';

// Re-export API types for convenience
export type { 
  ApiClient, 
  ApiClientFilters,
  EnhancedClientProfile,
  PartnerMatch,
  PartnerRequest,
  PartnerSearchFilters,
  PartnerRecommendation,
  PlayerLevel,
  PlayerStats,
  PlayerPreferences,
};

// UI-specific client types
export interface ClientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  document_type?: 'dni' | 'passport' | 'other';
  document_number?: string;
  birth_date?: string;
}

export interface ClientSearchResult {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  last_reservation?: string;
  total_spent: number;
}

export interface ClientDetailStats {
  total_spent: number;
  total_reservations: number;
  average_spend: number;
  favorite_court: string;
  favorite_time: string;
  membership_status: string;
  last_reservation?: string;
  retention_rate?: number;
}

export interface ClientActivity {
  id: string;
  type: 'reservation' | 'payment' | 'membership' | 'cancellation';
  date: string;
  description: string;
  amount?: number;
  status?: string;
}

export type ClientViewMode = 'list' | 'grid';

export interface ClientsPageState {
  viewMode: ClientViewMode;
  selectedClient: ApiClient | null;
  isFormOpen: boolean;
  isDetailOpen: boolean;
  editingClient: ApiClient | null;
}

export interface ClientImportResult {
  imported: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export interface ClientExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeStats: boolean;
  filters?: ApiClientFilters;
}

// Partner Matching UI Types
export interface PartnerMatchingFormData {
  // Playing information
  rating: number;
  dominant_hand: 'right' | 'left' | 'ambidextrous';
  preferred_position: 'right' | 'left' | 'both';
  play_style: string[];
  strengths: string[];
  weaknesses: string[];
  
  // Physical information
  height?: number;
  weight?: number;
  
  // Location
  city?: string;
  preferred_clubs: string[];
  max_travel_distance: number;
  
  // Social links
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  
  // Bio
  bio?: string;
  
  // Privacy settings
  is_public: boolean;
  show_in_rankings: boolean;
  allow_partner_requests: boolean;
}

export interface AvailabilitySchedule {
  weekdays: {
    [key: string]: {
      available: boolean;
      morning: boolean;
      afternoon: boolean;
      evening: boolean;
      specific_times?: string[];
    };
  };
  weekends: {
    [key: string]: {
      available: boolean;
      morning: boolean;
      afternoon: boolean;
      evening: boolean;
      specific_times?: string[];
    };
  };
}

export interface PartnerPreferencesFormData {
  // Match preferences
  preferred_match_duration: number;
  preferred_match_format: 'singles' | 'doubles' | 'both';
  partner_level_min: number;
  partner_level_max: number;
  
  // Court preferences
  preferred_court_types: string[];
  indoor_preference: boolean;
  outdoor_preference: boolean;
  
  // Schedule preferences
  availability: AvailabilitySchedule;
  flexible_timing: boolean;
  advance_booking_days: number;
  
  // Communication preferences
  language_preference: string;
  contact_method: 'app' | 'whatsapp' | 'email' | 'phone';
  
  // Notification preferences
  notification_partner_requests: boolean;
  notification_match_reminders: boolean;
  notification_tournaments: boolean;
  notification_level_changes: boolean;
  
  // Privacy preferences
  privacy_show_phone: boolean;
  privacy_show_email: boolean;
  privacy_show_stats: boolean;
  privacy_show_location: boolean;
}

export interface PartnerSearchState {
  filters: PartnerSearchFilters;
  results: PartnerMatch[];
  recommendations: PartnerRecommendation[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

export interface PartnerRequestsState {
  sent: PartnerRequest[];
  received: PartnerRequest[];
  loading: boolean;
  error: string | null;
}

export interface CompatibilityScore {
  overall: number;
  skill_match: number;
  schedule_overlap: number;
  location_proximity: number;
  play_style_compatibility: number;
  social_connection: number;
  factors: string[];
}

export interface PlayerRatingHistory {
  date: string;
  rating: number;
  change: number;
  reason: string;
  match_id?: string;
}

export interface PartnerMatchingPageState {
  activeTab: 'search' | 'recommendations' | 'requests' | 'favorites';
  search: PartnerSearchState;
  requests: PartnerRequestsState;
  selectedPlayer: PartnerMatch | null;
  isRequestModalOpen: boolean;
  isProfileModalOpen: boolean;
}

// Skill level constants
export const SKILL_LEVELS = [
  { value: 1.0, label: 'Beginner (1.0)', description: 'New to padel' },
  { value: 1.5, label: 'Beginner+ (1.5)', description: 'Basic understanding' },
  { value: 2.0, label: 'Novice (2.0)', description: 'Learning fundamentals' },
  { value: 2.5, label: 'Novice+ (2.5)', description: 'Improving consistency' },
  { value: 3.0, label: 'Intermediate (3.0)', description: 'Good technique' },
  { value: 3.5, label: 'Intermediate+ (3.5)', description: 'Strategic play' },
  { value: 4.0, label: 'Advanced (4.0)', description: 'Competitive level' },
  { value: 4.5, label: 'Advanced+ (4.5)', description: 'Tournament ready' },
  { value: 5.0, label: 'Expert (5.0)', description: 'Regional level' },
  { value: 5.5, label: 'Expert+ (5.5)', description: 'National level' },
  { value: 6.0, label: 'Professional (6.0)', description: 'Professional level' },
  { value: 6.5, label: 'Elite (6.5)', description: 'Elite professional' },
  { value: 7.0, label: 'World Class (7.0)', description: 'World ranking' },
] as const;

export const PLAY_STYLES = [
  'aggressive',
  'defensive', 
  'all-court',
  'net-player',
  'baseline',
  'power-player',
  'technical',
  'strategic',
] as const;

export const PLAYING_STRENGTHS = [
  'serve',
  'return',
  'volleys',
  'smash',
  'lob',
  'drop-shot',
  'backhand',
  'forehand',
  'movement',
  'strategy',
  'mental-game',
  'fitness',
] as const;
