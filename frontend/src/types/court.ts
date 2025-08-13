export interface Court {
  id: string; // UUID from Django
  club: string; // UUID from Django
  club_name?: string; // Optional - added by serializer
  organization: string; // UUID from Django
  name: string;
  number: number;
  surface_type: 'glass' | 'wall' | 'mesh' | 'mixed';
  surface_type_display?: string; // Optional - added by serializer
  has_lighting: boolean;
  has_heating: boolean;
  has_roof: boolean;
  is_maintenance: boolean;
  maintenance_notes: string;
  price_per_hour: string; // Decimal field comes as string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourtDetail extends Court {
  description?: string;
  dimensions: {
    length: number;
    width: number;
    height?: number;
  };
  facilities: string[];
  equipment: Array<{
    name: string;
    quantity: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
  }>;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_notes?: string;
  operating_hours: {
    monday: { start: string; end: string; closed: boolean };
    tuesday: { start: string; end: string; closed: boolean };
    wednesday: { start: string; end: string; closed: boolean };
    thursday: { start: string; end: string; closed: boolean };
    friday: { start: string; end: string; closed: boolean };
    saturday: { start: string; end: string; closed: boolean };
    sunday: { start: string; end: string; closed: boolean };
  };
  images: Array<{
    id: number;
    url: string;
    alt_text?: string;
    is_primary: boolean;
  }>;
  current_pricing?: CourtPricing;
  occupancy_rate_last_30_days: number;
  revenue_last_30_days: number;
}

export interface CourtFormData {
  club: string; // UUID
  name: string;
  number: number;
  surface_type: 'glass' | 'wall' | 'mesh' | 'mixed';
  has_lighting?: boolean;
  has_heating?: boolean;
  has_roof?: boolean;
  is_maintenance?: boolean;
  maintenance_notes?: string;
  price_per_hour?: string;
  is_active?: boolean; // Added to match Django model
}

export interface CourtAvailability {
  id: string; // UUID
  court_id: string; // UUID
  date: string;
  time_slots: Array<{
    start_time: string;
    end_time: string;
    is_available: boolean;
    reason?: string;
    reservation_id?: number;
    maintenance_id?: number;
  }>;
  exceptions: Array<{
    start_time: string;
    end_time: string;
    is_available: boolean;
    reason: string;
  }>;
}

export interface CourtPricing {
  id: string; // UUID
  court_id: string; // UUID
  name: string;
  price_per_hour: number;
  currency: string;
  time_slots: Array<{
    start_time: string;
    end_time: string;
    days_of_week: number[]; // 0-6, Monday to Sunday
  }>;
  valid_from: string;
  valid_to?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourtMaintenanceRecord {
  id: string; // UUID
  court_id: string; // UUID
  type: 'cleaning' | 'repair' | 'inspection' | 'renovation' | 'other';
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  estimated_duration: number; // in hours
  actual_duration?: number; // in hours
  cost_estimate?: number;
  actual_cost?: number;
  assigned_to?: string;
  completed_by?: string;
  notes?: string;
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CourtSchedule {
  court_id: string; // UUID
  date_from: string;
  date_to: string;
  events: Array<{
    id: number;
    type: 'reservation' | 'maintenance' | 'blocked';
    title: string;
    start_time: string;
    end_time: string;
    date: string;
    details?: {
      customer_name?: string;
      customer_phone?: string;
      players?: string[];
      cost?: number;
      status?: string;
      notes?: string;
    };
  }>;
  availability_summary: {
    total_slots: number;
    available_slots: number;
    booked_slots: number;
    maintenance_slots: number;
    blocked_slots: number;
  };
}
