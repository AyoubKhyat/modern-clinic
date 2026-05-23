export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'accountant';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'arrived' | 'no_show' | 'cancelled' | 'completed';
export type VisitStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentType = 'consultation' | 'medication' | 'follow_up' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  is_active: boolean;
  employee?: Employee;
}

export interface Employee {
  id: number;
  user_id: number;
  clinic_id: number;
  specialty?: string;
  phone: string;
  license_number?: string;
  status: string;
  hire_date: string;
  clinic?: Clinic;
  user?: User;
}

export interface Clinic {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  settings?: Record<string, any>;
}

export interface Patient {
  id: number;
  clinic_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  phone: string;
  email?: string;
  address?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  insurance_type?: string;
  notes?: string;
  appointments_count?: number;
  visits_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  patient?: Patient;
  doctor?: { id: number; name: string };
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  type: string;
  reason?: string;
  notes?: string;
  visit?: Visit;
  created_at: string;
}

export interface Visit {
  id: number;
  patient?: Patient;
  doctor?: { id: number; name: string };
  appointment?: Appointment;
  status: VisitStatus;
  chief_complaint?: string;
  diagnosis?: string;
  notes?: string;
  vitals?: {
    temperature?: number;
    blood_pressure?: string;
    heart_rate?: number;
    weight?: number;
  };
  started_at?: string;
  completed_at?: string;
  prescriptions?: Prescription[];
  created_at: string;
}

export interface Prescription {
  id: number;
  patient?: Patient;
  doctor?: { id: number; name: string };
  visit_id: number;
  notes?: string;
  is_active: boolean;
  items?: PrescriptionItem[];
  created_at: string;
}

export interface PrescriptionItem {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Payment {
  id: number;
  patient?: Patient;
  visit_id?: number;
  appointment_id?: number;
  amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  paid_at?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AdminDashboard {
  today_patients: number;
  month_revenue: number;
  active_employees: number;
  recent_appointments: Appointment[];
  recent_payments: Payment[];
  appointment_stats: Record<string, number>;
}

export interface DoctorDashboard {
  today_appointments: Appointment[];
  current_visit?: Visit;
  next_patient?: Appointment;
  recent_prescriptions: Prescription[];
  patients_seen_today: number;
}

export interface ReceptionDashboard {
  today_appointments: Appointment[];
  waiting_patients: number;
  cancelled_count: number;
  no_show_count: number;
  pending_payments: Payment[];
}
