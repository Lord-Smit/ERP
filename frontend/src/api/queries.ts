import apiClient from './client';

export interface CustomerQuery {
  id: string;
  customer: string | null;
  customer_name: string;
  client_display: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  subject: string;
  description: string;
  equipment_type: string;
  site_location: string;
  duration: number | null;
  duration_unit: 'hours' | 'days' | 'weeks' | 'months';
  quantity: number;
  status: 'open' | 'in_progress' | 'converted' | 'lost' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lost_reason: string;
  lost_notes: string;
  assigned_to: string | null;
  assigned_to_name: string;
  quotation: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export const QUERY_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'closed', label: 'Closed' },
];

export const QUERY_LOST_REASONS = [
  { value: 'price_too_high', label: 'Price Too High' },
  { value: 'found_competitor', label: 'Found Better Vendor' },
  { value: 'budget_constraints', label: 'Budget Constraints' },
  { value: 'delayed_delivery', label: 'Delayed Delivery' },
  { value: 'spec_not_met', label: 'Specifications Not Met' },
  { value: 'no_longer_needed', label: 'No Longer Needed' },
  { value: 'other', label: 'Other' },
];

export const QUERY_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-600',
};

export { priorityColors, statusColors };

const queriesApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await apiClient.get('/queries/', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<CustomerQuery>(`/queries/${id}/`);
    return data;
  },
  create: async (payload: Record<string, any>) => {
    const { data } = await apiClient.post<CustomerQuery>('/queries/', payload);
    return data;
  },
  update: async (id: string, payload: Record<string, any>) => {
    const { data } = await apiClient.patch<CustomerQuery>(`/queries/${id}/`, payload);
    return data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/queries/${id}/`);
  },
  convertToQuotation: async (id: string) => {
    const { data } = await apiClient.post(`/queries/${id}/convert_to_quotation/`);
    return data;
  },
  markLost: async (id: string, payload: { lost_reason: string; lost_notes?: string }) => {
    const { data } = await apiClient.post(`/queries/${id}/mark_lost/`, payload);
    return data;
  },
};

export default queriesApi;