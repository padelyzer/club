// Employee Management Types

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'instructor' | 'receptionist' | 'maintenance' | 'manager';
  employee_code: string;
  club_id: string;
  is_active: boolean;
  hire_date: string;
  birth_date?: string;
  document_type?: 'dni' | 'passport' | 'other';
  document_number?: string;
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  schedule?: EmployeeSchedule;
  skills?: string[];
  certifications?: Certification[];
  salary?: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  schedules: WeeklySchedule[];
  is_flexible: boolean;
  max_hours_per_week: number;
  min_hours_per_week: number;
}

export interface WeeklySchedule {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  document_url?: string;
}

export interface EmployeeFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  club_id?: string;
  page?: number;
  page_size?: number;
}

export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'instructor' | 'receptionist' | 'maintenance' | 'manager';
  employee_code?: string;
  hire_date: string;
  birth_date?: string;
  document_type?: 'dni' | 'passport' | 'other';
  document_number?: string;
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  skills?: string[];
  salary?: number;
}

export interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  by_role: {
    instructor: number;
    receptionist: number;
    maintenance: number;
    manager: number;
  };
  average_tenure_months: number;
  upcoming_birthdays: Employee[];
  expiring_certifications: {
    employee: Employee;
    certification: Certification;
  }[];
}
