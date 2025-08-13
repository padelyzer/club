/**
 * Tipos TypeScript para classes
 * Generado automáticamente desde models.py
 */

export interface ClassLevel {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  name: string;
  displayName: string;
  display_name: string;
  description?: string;
  order: number;
  color: string;
  icon?: string;
}

export interface ClassLevelForm {
  name?: string;
  displayName?: string;
  description?: string;
  order?: number;
  color?: string;
  icon?: string;
}

export interface ClassEnrollment {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  session: string;
  student: string;
  status: string;
  waitlistPosition?: number;
  waitlist_position?: number;
  enrolledAt: string;
  enrolled_at: string;
  cancelledAt?: string;
  cancelled_at?: string;
  cancellationReason?: string;
  cancellation_reason?: string;
  paid: boolean;
  paymentAmount?: string;
  payment_amount?: string;
  paymentMethod?: string;
  payment_method?: string;
  paymentReference?: string;
  payment_reference?: string;
  checkedIn: boolean;
  checked_in: boolean;
  checkInTime?: string;
  check_in_time?: string;
  notes?: string;
}

export interface ClassEnrollmentForm {
  session?: string;
  student?: string;
  status?: string;
  waitlistPosition?: number;
  enrolledAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  paid?: boolean;
  paymentAmount?: string;
  paymentMethod?: string;
  paymentReference?: string;
  checkedIn?: boolean;
  checkInTime?: string;
  notes?: string;
}

export interface ClassAttendance {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  session: string;
  enrollment: string;
  student: string;
  present: boolean;
  arrivalTime?: string;
  arrival_time?: string;
  departureTime?: string;
  departure_time?: string;
  instructorNotes?: string;
  instructor_notes?: string;
  performanceRating?: number;
  performance_rating?: number;
  studentRating?: number;
  student_rating?: number;
  studentFeedback?: string;
  student_feedback?: string;
}

export interface ClassAttendanceForm {
  session?: string;
  enrollment?: string;
  student?: string;
  present?: boolean;
  arrivalTime?: string;
  departureTime?: string;
  instructorNotes?: string;
  performanceRating?: number;
  studentRating?: number;
  studentFeedback?: string;
}

export interface InstructorEvaluation {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  instructor: string;
  student: string;
  session: string;
  overallRating: number;
  overall_rating: number;
  teachingQuality: number;
  teaching_quality: number;
  punctuality: number;
  communication: number;
  comments?: string;
  wouldRecommend: boolean;
  would_recommend: boolean;
  isAnonymous: boolean;
  is_anonymous: boolean;
}

export interface InstructorEvaluationForm {
  instructor?: string;
  student?: string;
  session?: string;
  overallRating?: number;
  teachingQuality?: number;
  punctuality?: number;
  communication?: number;
  comments?: string;
  wouldRecommend?: boolean;
  isAnonymous?: boolean;
}

export interface StudentPackage {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  student: string;
  package: string;
  purchasedAt: string;
  purchased_at: string;
  expiresAt: string;
  expires_at: string;
  classesRemaining: number;
  classes_remaining: number;
  classesUsed: number;
  classes_used: number;
  paymentAmount: string;
  payment_amount: string;
  paymentReference: string;
  payment_reference: string;
  isActive: boolean;
  is_active: boolean;
}

export interface StudentPackageForm {
  student?: string;
  package?: string;
  purchasedAt?: string;
  expiresAt?: string;
  classesRemaining?: number;
  classesUsed?: number;
  paymentAmount?: string;
  paymentReference?: string;
  isActive?: boolean;
}
