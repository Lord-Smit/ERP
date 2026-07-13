import apiClient from './client';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  customer_type: 'company' | 'individual';
  email: string;
  phone: string;
  alternate_phone: string;
  billing_address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  credit_limit: number | null;
  outstanding_amount: number;
  payment_terms: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerListItem {
  id: string;
  customer_code: string;
  name: string;
  customer_type: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  credit_limit: number | null;
  outstanding_amount: number;
  is_active: boolean;
  contracts_count: number;
  sites_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerSite {
  id: string;
  customer: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface ContractListItem {
  id: string;
  contract_number: string;
  contract_type: string;
  customer: string;
  customer_name: string;
  start_date: string;
  end_date: string | null;
  value: number | null;
  status: string;
  items_count: number;
  signed_by_client: boolean;
  auto_renew: boolean;
  created_at: string;
}

export interface ContractLineItem {
  id: string;
  contract: string;
  equipment: string | null;
  equipment_name: string;
  site: string | null;
  site_name: string;
  description: string;
  quantity: number;
  rental_period: string;
  unit_price: number;
  line_total: number;
  start_date: string;
  end_date: string | null;
}

export interface ContractAmendment {
  id: string;
  contract: string;
  amendment_number: number;
  amended_data: Record<string, any>;
  amended_by: string | null;
  amended_by_name: string;
  amended_at: string;
  notes: string;
}

export interface ContractSignature {
  id: string;
  contract: string;
  signatory_name: string;
  signatory_email: string;
  signature_data: string;
  ip_address: string | null;
  signed_at: string;
}

export interface ContractDetail {
  id: string;
  contract_number: string;
  contract_type: string;
  customer: string;
  customer_name: string;
  start_date: string;
  end_date: string | null;
  value: number | null;
  status: string;
  payment_terms: string;
  notes: string;
  mobilization_charges: number | null;
  demobilization_charges: number | null;
  security_deposit: number | null;
  insurance_amount: number | null;
  insurance_policy_number: string;
  auto_renew: boolean;
  renewal_reminder_days: number;
  signed_by_client: boolean;
  signed_at: string | null;
  amendment_number: number;
  line_items: ContractLineItem[];
  amendments: ContractAmendment[];
  signatures: ContractSignature[];
  created_at: string;
  updated_at: string;
}

export interface ContractExpiryAlert {
  id: string;
  type: 'contract_expiry';
  contract_number: string;
  customer_name: string;
  customer_id: string;
  event_date: string;
  days_remaining: number;
  severity: 'warning' | 'critical' | 'overdue';
  message: string;
  auto_renew: boolean;
  renewal_reminder_days: number;
}

export interface Contract {
  id: string;
  customer: string;
  customer_name: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  value: number | null;
  status: string;
  payment_terms: string;
  notes: string;
  mobilization_charges: number | null;
  demobilization_charges: number | null;
  security_deposit: number | null;
  insurance_amount: number | null;
  insurance_policy_number: string;
  auto_renew: boolean;
  renewal_reminder_days: number;
  signed_by_client: boolean;
  signed_at: string | null;
  amendment_number: number;
  created_at: string;
  updated_at: string;
}

export interface SiteEquipmentDeployment {
  id: string;
  site: string;
  site_name: string;
  customer_name: string;
  equipment: string;
  equipment_name: string;
  equipment_serial: string | null;
  start_date: string;
  end_date: string | null;
  status: 'deployed' | 'removed';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerActivity {
  id: string;
  customer: string;
  activity_type: string;
  subject: string;
  description: string;
  conducted_by: string | null;
  conducted_by_name: string;
  conducted_at: string;
  follow_up_date: string | null;
  follow_up_status: string;
  created_at: string;
}

export interface CustomerFeedback {
  id: string;
  customer: string;
  rating: number;
  category: string;
  feedback_text: string;
  received_date: string;
  submitted_by: string | null;
  submitted_by_name: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string;
  created_at: string;
}

export interface PaymentReminder {
  id: string;
  customer: string;
  customer_name: string;
  invoice_number: string;
  amount: number | null;
  due_date: string | null;
  reminded_at: string | null;
  reminder_type: string;
  notes: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const CUSTOMER_TYPES = [
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual' },
];

export const CONTRACT_TYPES = [
  { value: 'rental', label: 'Rental' },
  { value: 'service', label: 'Service' },
  { value: 'lease', label: 'Lease' },
  { value: 'maintenance', label: 'Maintenance' },
];

export const CONTRACT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'draft', label: 'Draft' },
];

export const RENTAL_PERIODS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const ACTIVITY_TYPES = [
  { value: 'call', label: 'Phone Call' },
  { value: 'visit', label: 'Site Visit' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Internal Note' },
];

export const FEEDBACK_CATEGORIES = [
  { value: 'service', label: 'Service' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'support', label: 'Support' },
  { value: 'general', label: 'General' },
];

export const REMINDER_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'sms', label: 'SMS' },
  { value: 'visit', label: 'Site Visit' },
];

export const DEPLOYMENT_STATUSES = [
  { value: 'deployed', label: 'Deployed' },
  { value: 'removed', label: 'Removed' },
];

const API = {
  contracts: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<ContractListItem>>('/contracts/', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<ContractDetail>(`/contracts/${id}/`).then((r) => r.data),
    create: (data: Record<string, any>) =>
      apiClient.post<ContractDetail>('/contracts/', data).then((r) => r.data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<ContractDetail>(`/contracts/${id}/`, data).then((r) => r.data),
    delete: (id: string) =>
      apiClient.delete(`/contracts/${id}/`),
    sign: (id: string, data: Record<string, any>) =>
      apiClient.post(`/contracts/${id}/sign/`, data).then((r) => r.data),
    amend: (id: string, data: Record<string, any>) =>
      apiClient.post(`/contracts/${id}/amend/`, data).then((r) => r.data),
    renew: (id: string, data: Record<string, any>) =>
      apiClient.post(`/contracts/${id}/renew/`, data).then((r) => r.data),
    lineItems: {
      list: (contractId: string) =>
        apiClient.get<ContractLineItem[]>(`/contracts/${contractId}/line_items/`).then((r) => r.data),
      create: (contractId: string, data: Record<string, any>) =>
        apiClient.post<ContractLineItem>(`/contracts/${contractId}/line_items/`, data).then((r) => r.data),
    },
    amendments: {
      list: (contractId: string) =>
        apiClient.get<ContractAmendment[]>(`/contracts/${contractId}/amendments/`).then((r) => r.data),
    },
    signatures: {
      list: (contractId: string) =>
        apiClient.get<ContractSignature[]>(`/contracts/${contractId}/signatures/`).then((r) => r.data),
    },
    expiryAlerts: () =>
      apiClient.get<ContractExpiryAlert[]>('/contracts/expiry_alerts/').then((r) => r.data),
  },
  customers: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<CustomerListItem>>('/customers/', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<Customer>(`/customers/${id}/`).then((r) => r.data),
    create: (data: Record<string, any>) =>
      apiClient.post<Customer>('/customers/', data).then((r) => r.data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<Customer>(`/customers/${id}/`, data).then((r) => r.data),
    delete: (id: string) =>
      apiClient.delete(`/customers/${id}/`),
    sites: {
      list: (customerId: string) =>
        apiClient.get<CustomerSite[]>(`/customers/${customerId}/sites/`).then((r) => r.data),
      create: (customerId: string, data: Record<string, any>) =>
        apiClient.post<CustomerSite>(`/customers/${customerId}/sites/`, data).then((r) => r.data),
      update: (customerId: string, siteId: string, data: Record<string, any>) =>
        apiClient.patch<CustomerSite>(`/customers/${customerId}/sites/${siteId}/`, data).then((r) => r.data),
      delete: (customerId: string, siteId: string) =>
        apiClient.delete(`/customers/${customerId}/sites/${siteId}/`),
    },
    contracts: {
      list: (customerId: string) =>
        apiClient.get<Contract[]>(`/customers/${customerId}/contracts/`).then((r) => r.data),
      create: (customerId: string, data: Record<string, any>) =>
        apiClient.post<Contract>(`/customers/${customerId}/contracts/`, data).then((r) => r.data),
      update: (customerId: string, contractId: string, data: Record<string, any>) =>
        apiClient.patch<Contract>(`/customers/${customerId}/contracts/${contractId}/`, data).then((r) => r.data),
      delete: (customerId: string, contractId: string) =>
        apiClient.delete(`/customers/${customerId}/contracts/${contractId}/`),
    },
    activity: {
      list: (customerId: string) =>
        apiClient.get<CustomerActivity[]>(`/customers/${customerId}/activity/`).then((r) => r.data),
      create: (customerId: string, data: Record<string, any>) =>
        apiClient.post<CustomerActivity>(`/customers/${customerId}/activity/`, data).then((r) => r.data),
    },
    feedback: {
      list: (customerId: string) =>
        apiClient.get<CustomerFeedback[]>(`/customers/${customerId}/feedback/`).then((r) => r.data),
      create: (customerId: string, data: Record<string, any>) =>
        apiClient.post<CustomerFeedback>(`/customers/${customerId}/feedback/`, data).then((r) => r.data),
    },
    reminders: {
      list: (customerId: string) =>
        apiClient.get<PaymentReminder[]>(`/customers/${customerId}/reminders/`).then((r) => r.data),
      create: (customerId: string, data: Record<string, any>) =>
        apiClient.post<PaymentReminder>(`/customers/${customerId}/reminders/`, data).then((r) => r.data),
      update: (customerId: string, reminderId: string, data: Record<string, any>) =>
        apiClient.patch<PaymentReminder>(`/customers/${customerId}/reminders/${reminderId}/`, data).then((r) => r.data),
      delete: (customerId: string, reminderId: string) =>
        apiClient.delete(`/customers/${customerId}/reminders/${reminderId}/`),
    },
  },
  deployments: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<SiteEquipmentDeployment>>('/deployments/', { params }).then((r) => r.data),
    create: (data: Record<string, any>) =>
      apiClient.post<SiteEquipmentDeployment>('/deployments/', data).then((r) => r.data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<SiteEquipmentDeployment>(`/deployments/${id}/`, data).then((r) => r.data),
    delete: (id: string) =>
      apiClient.delete(`/deployments/${id}/`),
  },
  sites: {
    list: () => apiClient.get<CustomerSite[]>('/sites/').then((r) => r.data),
  },
};

export default API;
