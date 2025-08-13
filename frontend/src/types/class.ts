// Types for the Classes system in Padelyzer - Matches Django backend
import { User, Club, Court } from './index';

// Class Level - matches Django model
export interface ClassLevel {
  id: string;
  name: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  display_name: string;
  description?: string;
  order: number;
  color: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Class Type - matches Django model
export interface ClassType {
  id: string;
  organization: string;
  club?: string;
  name: 'group' | 'individual' | 'clinic' | 'intensive' | 'workshop';
  display_name: string;
  description?: string;
  min_participants: number;
  max_participants: number;
  default_duration_minutes: number;
  base_price: number;
  // Add legacy property for compatibility
  default_price?: number;
  price_per_participant: boolean;
  allow_drop_in: boolean;
  requires_package: boolean;
  allow_waitlist: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Instructor - matches Django model
export interface Instructor {
  id: string;
  organization: string;
  club?: string;
  user: User;
  bio?: string;
  specialties: ClassType[];
  certifications: string[];
  years_experience: number;
  available_days: number[];
  available_from: string;
  available_until: string;
  rating: number;
  total_ratings: number;
  is_active: boolean;
  accepts_substitutions: boolean;
  max_weekly_hours: number;
  photo_url?: string;
  instagram?: string;
  created_at: string;
  updated_at: string;
}

// Class Schedule - matches Django model
export interface ClassSchedule {
  id: string;
  organization: string;
  club?: string;
  name: string;
  description?: string;
  class_type: ClassType;
  level: ClassLevel;
  instructor: Instructor;
  court?: Court;
  location?: string;
  start_date: string;
  end_date?: string;
  start_time: string;
  duration_minutes: number;
  recurrence: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrence_days: number[];
  min_participants: number;
  max_participants: number;
  price: number;
  member_price?: number;
  allow_drop_in: boolean;
  drop_in_price?: number;
  allow_waitlist: boolean;
  waitlist_size: number;
  enrollment_opens_days: number;
  enrollment_closes_hours: number;
  is_active: boolean;
  is_published: boolean;
  cancelled: boolean;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

// Class Session - matches Django model
export interface ClassSession {
  id: string;
  organization: string;
  club?: string;
  schedule: ClassSchedule;
  scheduled_datetime: string;
  actual_start_time?: string;
  actual_end_time?: string;
  // Add legacy property names for compatibility
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  instructor: Instructor;
  substitute_instructor?: Instructor;
  court?: Court;
  location?: string;
  max_participants: number;
  enrolled_count: number;
  attended_count: number;
  // Add legacy property names for compatibility
  enrolled_students?: number;
  max_students?: number;
  maxParticipants?: number; // camelCase version
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  currentParticipants?: number;
  // Add price and class_type for compatibility
  price?: number;
  class_type?: ClassType;
  // Add more legacy properties for UI compatibility
  name?: string;
  level?: ClassLevel;
  category?: string;
  date?: string;
}

// Class Enrollment - matches Django model
export interface ClassEnrollment {
  id: string;
  session: ClassSession;
  student: User; // ClientProfile in Django
  status: 'enrolled' | 'waitlisted' | 'cancelled' | 'no_show';
  waitlist_position?: number;
  enrolled_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  paid: boolean;
  payment_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  checked_in: boolean;
  check_in_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Class Attendance - matches Django model
export interface ClassAttendance {
  id: string;
  session: ClassSession;
  enrollment: ClassEnrollment;
  student: User; // ClientProfile in Django
  present: boolean;
  arrival_time?: string;
  departure_time?: string;
  instructor_notes?: string;
  performance_rating?: number;
  student_rating?: number;
  student_feedback?: string;
  created_at: string;
  updated_at: string;
}

// Instructor Evaluation - matches Django model
export interface InstructorEvaluation {
  id: string;
  instructor: Instructor;
  student: User; // ClientProfile in Django
  session: ClassSession;
  overall_rating: number;
  teaching_quality: number;
  punctuality: number;
  communication: number;
  comments?: string;
  would_recommend: boolean;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

// Class Package - matches Django model
export interface ClassPackage {
  id: string;
  organization: string;
  club?: string;
  name: string;
  description?: string;
  class_types: ClassType[];
  num_classes: number;
  validity_days: number;
  price: number;
  is_active: boolean;
  transferable: boolean;
  created_at: string;
  updated_at: string;
}

// Student Package - matches Django model
export interface StudentPackage {
  id: string;
  student: User; // ClientProfile in Django
  package: ClassPackage;
  purchased_at: string;
  expires_at: string;
  classes_remaining: number;
  classes_used: number;
  payment_amount: number;
  payment_reference: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form Data Types
export interface CreateClassScheduleData {
  name: string;
  description?: string;
  class_type: string; // ID
  level: string; // ID
  instructor: string; // ID
  court?: string; // ID
  location?: string;
  start_date: string;
  end_date?: string;
  start_time: string;
  duration_minutes: number;
  recurrence: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrence_days: number[];
  min_participants: number;
  max_participants: number;
  price: number;
  member_price?: number;
  allow_drop_in: boolean;
  drop_in_price?: number;
  allow_waitlist: boolean;
  waitlist_size: number;
  enrollment_opens_days: number;
  enrollment_closes_hours: number;
}

export interface UpdateClassScheduleData extends Partial<CreateClassScheduleData> {
  is_active?: boolean;
  is_published?: boolean;
  cancelled?: boolean;
  cancellation_reason?: string;
}

export interface CreateInstructorData {
  user: string; // User ID
  bio?: string;
  specialties: string[]; // ClassType IDs
  certifications: string[];
  years_experience: number;
  available_days: number[];
  available_from: string;
  available_until: string;
  accepts_substitutions: boolean;
  max_weekly_hours: number;
  photo_url?: string;
  instagram?: string;
}

export interface UpdateInstructorData extends Partial<CreateInstructorData> {
  is_active?: boolean;
}

export interface CreateClassEnrollmentData {
  session: string; // ClassSession ID
  student: string; // ClientProfile ID
  notes?: string;
}

// Analytics Types (can be expanded based on backend implementation)
export interface ClassAnalytics {
  session_id: string;
  total_enrollments: number;
  attendance_rate: number;
  average_rating: number;
  revenue: number;
  monthly_trends: {
    month: string;
    enrollments: number;
    revenue: number;
    attendance: number;
  }[];
}

export interface InstructorAnalytics {
  instructor_id: string;
  total_sessions: number;
  total_students: number;
  average_rating: number;
  total_revenue: number;
  attendance_rate: number;
  monthly_performance: {
    month: string;
    sessions: number;
    students: number;
    revenue: number;
    rating: number;
  }[];
}

// Filter Types
export interface ClassFilters {
  club?: string;
  instructor?: string;
  class_type?: string;
  level?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  published_only?: boolean;
  time_filter?: 'upcoming' | 'past';
}

export interface InstructorFilters {
  club?: string;
  active_only?: boolean;
  specialty?: string;
}

// Utility Types
export interface ClassSessionCapacity {
  max_participants: number;
  enrolled_count: number;
  available_spots: number;
  is_full: boolean;
  enrollment_status: 'available' | 'full' | 'waitlist' | 'closed';
}

export interface InstructorStats {
  total_sessions: number;
  completed_sessions: number;
  total_students: number;
  attendance_rate: number;
  average_rating: number;
  total_evaluations: number;
}

export interface ClassCalendarEvent {
  id: string;
  title: string;
  time: string;
  instructor: string;
  enrolled: number;
  max_participants: number;
  status: string;
}

export type CalendarData = Record<string, ClassCalendarEvent[]>;

// Legacy types for backward compatibility
export type ClassLevel_Legacy = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type ClassCategory_Legacy = 'group' | 'individual' | 'clinic' | 'intensive' | 'workshop';
export type ClassStatus_Legacy = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type BookingStatus_Legacy = 'enrolled' | 'waitlisted' | 'cancelled' | 'no_show';

// Aliases for common operations
export type Class = ClassSession; // For backward compatibility
export type ClassBooking = ClassEnrollment; // For backward compatibility

// Calendar view types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  session: ClassSession;
  type: 'session' | 'enrollment' | 'availability';
}

export interface CalendarViewSettings {
  view: 'day' | 'week' | 'month';
  date: Date;
  instructor_filter?: string;
  level_filter?: string[];
  show_enrollments: boolean;
  show_availability: boolean;
}

// Weekly calendar response type
export interface WeeklyCalendarResponse {
  week_start: string;
  week_end: string;
  sessions: ClassSession[];
}

// Student history stats
export interface StudentClassStats {
  total_enrollments: number;
  completed_classes: number;
  missed_classes: number;
  attendance_rate: number;
  active_packages: number;
  total_packages: number;
}
