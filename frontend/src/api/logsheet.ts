import apiClient from './client';

export interface Operator {
  id: string;
  user: string | null;
  name: string;
  phone: string;
  email: string;
  license_type: string;
  license_number: string;
  license_expiry: string | null;
  license_file: string | null;
  certifications: string;
  experience_years: number | null;
  is_active: boolean;
  date_of_hire: string | null;
  daily_rate: number | null;
  overtime_rate: number | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  created_at: string;
}

export interface OperatorDetail extends Operator {
  certification_records: OperatorCertification[];
  attendance_records: Attendance[];
  allowances: OperatorAllowance[];
}

export interface OperatorCertification {
  id: string;
  operator: string;
  cert_type: string;
  cert_type_display: string;
  name: string;
  cert_number: string;
  issuing_authority: string;
  issue_date: string | null;
  expiry_date: string | null;
  attachment: string | null;
  notes: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  operator: string;
  operator_name: string;
  date: string;
  shift: string;
  status: string;
  status_display: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  notes: string;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  date: string;
  total_operators: number;
  present: number;
  absent: number;
  on_leave: number;
  half_day: number;
  holiday: number;
  unmarked: number;
}

export interface OperatorAllowance {
  id: string;
  operator: string;
  operator_name: string;
  date: string;
  allowance_type: string;
  allowance_type_display: string;
  amount: number;
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface OperatorAvailability {
  id: string;
  operator: string;
  operator_name: string;
  date: string;
  shift: string;
  status: string;
  status_display: string;
  source: string;
  notes: string;
  updated_at: string;
}

export interface CalendarData {
  date_from: string;
  date_to: string;
  operators: { id: string; name: string }[];
  availabilities: Record<string, {
    operator_id: string;
    operator_name: string;
    shift: string;
    status: string;
    status_display: string;
    source: string;
  }[]>;
}

export interface OperatorAnalytics {
  operator_name: string;
  total_logsheets: number;
  total_hours: number;
  productive_hours: number;
  idle_hours: number;
  breakdown_hours: number;
  total_overtime_hours: number;
  utilization_percentage: number;
  breakdown_incidents: number;
  days_present: number;
  days_absent: number;
  days_on_leave: number;
}

export interface ExpiryAlerts {
  expiring: OperatorCertification[];
  expired: OperatorCertification[];
}

export interface LogsheetOperator {
  id: string;
  logsheet: string;
  operator: string;
  operator_name: string;
  check_in: string | null;
  check_out: string | null;
  is_present: boolean;
  overtime_hours: number | null;
  notes: string;
}

export interface LogsheetBreakdown {
  id: string;
  logsheet: string;
  reason_code: string;
  reason_display: string;
  description: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
}

export interface LogsheetFuel {
  id: string;
  logsheet: string;
  liters: number;
  rate_per_liter: number | null;
  total_cost: number | null;
  vendor: string;
  receipt_number: string;
  notes: string;
}

export interface LogsheetApproval {
  id: string;
  logsheet: string;
  approved_by: string;
  approver_name: string;
  status: string;
  comments: string;
  created_at: string;
}

export interface LogsheetListItem {
  id: string;
  equipment: string;
  equipment_name: string;
  date: string;
  shift: string;
  shift_display: string;
  total_hours: number | null;
  productive_hours: number | null;
  status: string;
  status_display: string;
  site_name: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface LogsheetDetail {
  id: string;
  equipment: string;
  equipment_name: string;
  equipment_serial: string | null;
  date: string;
  shift: string;
  shift_display: string;
  site_name: string;
  contract_line: string;
  shift_start: string | null;
  break_start: string | null;
  break_end: string | null;
  shift_end: string | null;
  total_hours: number | null;
  idle_hours: number | null;
  breakdown_hours: number | null;
  productive_hours: number | null;
  meter_start: number | null;
  meter_end: number | null;
  fuel_liters: number | null;
  fuel_cost: number | null;
  status: string;
  status_display: string;
  submitted_by: string | null;
  submitted_by_name: string;
  submitted_at: string | null;
  notes: string;
  created_by: string;
  created_by_name: string;
  operators: LogsheetOperator[];
  breakdowns: LogsheetBreakdown[];
  fuel_entries: LogsheetFuel[];
  approvals: LogsheetApproval[];
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const SHIFT_CHOICES = [
  { value: 'morning', label: 'Morning (6AM-2PM)' },
  { value: 'evening', label: 'Evening (2PM-10PM)' },
  { value: 'night', label: 'Night (10PM-6AM)' },
  { value: 'general', label: 'General (Full Day)' },
];

export const STATUS_CHOICES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'operator_approved', label: 'Operator Approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'flagged', label: 'Flagged for Review' },
];

export const BREAKDOWN_REASONS = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hydraulic', label: 'Hydraulic' },
  { value: 'tire', label: 'Tire / Track' },
  { value: 'engine', label: 'Engine' },
  { value: 'no_work', label: 'No Work / Idle' },
  { value: 'weather', label: 'Weather' },
  { value: 'operator', label: 'Operator Unavailable' },
  { value: 'material', label: 'Material Not Available' },
  { value: 'other', label: 'Other' },
];

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'On Leave' },
  { value: 'holiday', label: 'Holiday' },
];

export const ALLOWANCE_TYPES = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'hazard', label: 'Hazard Pay' },
  { value: 'overtime', label: 'Overtime Allowance' },
  { value: 'other', label: 'Other' },
];

export const CERT_TYPES = [
  { value: 'license', label: 'License' },
  { value: 'safety', label: 'Safety Training' },
  { value: 'medical', label: 'Medical Clearance' },
  { value: 'other', label: 'Other' },
];

const API = {
  operators: {
    list: () => apiClient.get<Operator[]>('/operators/').then((r) => r.data),
    get: (id: string) => apiClient.get<OperatorDetail>(`/operators/${id}/`).then((r) => r.data),
    create: (data: Partial<Operator>) => apiClient.post<Operator>('/operators/', data).then((r) => r.data),
    update: (id: string, data: Partial<Operator>) => apiClient.patch<Operator>(`/operators/${id}/`, data).then((r) => r.data),
    selfUpdate: (id: string, data: Partial<Operator>) => apiClient.patch<Operator>(`/operators/${id}/self-update/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/operators/${id}/`),
    getAnalytics: (id: string, params?: Record<string, string>) =>
      apiClient.get<OperatorAnalytics>(`/operators/${id}/analytics/`, { params }).then((r) => r.data),
    getExpiryAlerts: (days?: number) =>
      apiClient.get<ExpiryAlerts>('/operators/expiry-alerts/', { params: { days: days || 30 } }).then((r) => r.data),
  },
  certifications: {
    list: (operatorId: string) =>
      apiClient.get<OperatorCertification[]>(`/operators/${operatorId}/certifications/`).then((r) => r.data),
    create: (operatorId: string, data: Partial<OperatorCertification>) =>
      apiClient.post<OperatorCertification>(`/operators/${operatorId}/certifications/`, data).then((r) => r.data),
    update: (operatorId: string, id: string, data: Partial<OperatorCertification>) =>
      apiClient.put<OperatorCertification>(`/operators/${operatorId}/certifications/${id}/`, data).then((r) => r.data),
    delete: (operatorId: string, id: string) =>
      apiClient.delete(`/operators/${operatorId}/certifications/${id}/`),
  },
  attendance: {
    list: (params?: Record<string, any>) =>
      apiClient.get<Attendance[]>('/attendance/', { params }).then((r) => r.data),
    create: (data: Partial<Attendance>) =>
      apiClient.post<Attendance>('/attendance/', data).then((r) => r.data),
    update: (id: string, data: Partial<Attendance>) =>
      apiClient.patch<Attendance>(`/attendance/${id}/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/attendance/${id}/`),
    bulk: (records: Partial<Attendance>[]) =>
      apiClient.post<Attendance[]>('/attendance/bulk/', { records }).then((r) => r.data),
    summary: (date?: string) =>
      apiClient.get<AttendanceSummary>('/attendance/summary/', { params: { date } }).then((r) => r.data),
  },
  allowances: {
    list: (params?: Record<string, any>) =>
      apiClient.get<OperatorAllowance[]>('/allowances/', { params }).then((r) => r.data),
    create: (data: Partial<OperatorAllowance>) =>
      apiClient.post<OperatorAllowance>('/allowances/', data).then((r) => r.data),
    update: (id: string, data: Partial<OperatorAllowance>) =>
      apiClient.patch<OperatorAllowance>(`/allowances/${id}/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/allowances/${id}/`),
  },
  availability: {
    list: (params?: Record<string, any>) =>
      apiClient.get<OperatorAvailability[]>('/availability/', { params }).then((r) => r.data),
    create: (data: Partial<OperatorAvailability>) =>
      apiClient.post<OperatorAvailability>('/availability/', data).then((r) => r.data),
    update: (id: string, data: Partial<OperatorAvailability>) =>
      apiClient.patch<OperatorAvailability>(`/availability/${id}/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/availability/${id}/`),
    calendar: (params?: Record<string, any>) =>
      apiClient.get<CalendarData>('/availability/calendar/', { params }).then((r) => r.data),
  },
  logsheets: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<LogsheetListItem>>('/logsheets/', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<LogsheetDetail>(`/logsheets/${id}/`).then((r) => r.data),
    create: (data: Record<string, any>) =>
      apiClient.post<LogsheetDetail>('/logsheets/', data).then((r) => r.data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<LogsheetDetail>(`/logsheets/${id}/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/logsheets/${id}/`),
    submit: (id: string) =>
      apiClient.post(`/logsheets/${id}/submit/`).then((r) => r.data),
    approve: (id: string, comments?: string) =>
      apiClient.post(`/logsheets/${id}/approve/`, { status: 'approved', comments }).then((r) => r.data),
    reject: (id: string, comments?: string) =>
      apiClient.post(`/logsheets/${id}/approve/`, { status: 'rejected', comments }).then((r) => r.data),
    consolidated: (params?: Record<string, any>) =>
      apiClient.get('/logsheets/consolidated/', { params }).then((r) => r.data),
  },
};

export default API;
