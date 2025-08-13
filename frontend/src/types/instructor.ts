// Instructor Types

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  specialties: string[];
  certifications: string[];
  experience_years: number;
  rating: number;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InstructorSchedule {
  instructor: string;
  day_of_week: number; // 0-6, where 0 is Monday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
}

export interface InstructorStats {
  total_classes: number;
  total_students: number;
  average_rating: number;
  completion_rate: number;
  revenue_generated: number;
}
