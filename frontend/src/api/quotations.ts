import apiClient from './client';

export interface QuotationLineItem {
  id: string;
  quotation: string;
  equipment: string | null;
  equipment_name: string;
  description: string;
  quantity: number;
  rental_period: string;
  start_date: string | null;
  end_date: string | null;
  unit_price: number;
  line_total: number;
}

export interface QuotationListItem {
  id: string;
  quotation_number: string;
  customer: string;
  customer_name: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  valid_until: string | null;
  items_count: number;
  created_at: string;
}

export interface QuotationDetail {
  id: string;
  quotation_number: string;
  customer: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gst?: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  version_number: number;
  lost_reason: string;
  lost_notes: string;
  won_reason: string;
  terms_conditions: string;
  notes: string;
  created_by: string | null;
  created_by_name: string;
  sent_by_email?: string;
  sent_at?: string | null;
  line_items: QuotationLineItem[];
  created_at: string;
  updated_at: string;
}

export interface RentalOrderListItem {
  id: string;
  order_number: string;
  customer: string;
  customer_name: string;
  site: string | null;
  site_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface RentalOrderLineItem {
  id: string;
  rental_order: string;
  equipment: string | null;
  equipment_name: string;
  description: string;
  quantity: number;
  rental_period: string;
  start_date: string | null;
  end_date: string | null;
  unit_price: number;
  line_total: number;
}

export interface RentalOrderDetail {
  id: string;
  order_number: string;
  quotation: string | null;
  quotation_number: string;
  customer: string;
  customer_name: string;
  site: string | null;
  site_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  total_amount: number;
  notes: string;
  created_by: string | null;
  line_items: RentalOrderLineItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AcceptQuotationResponse {
  status: string;
  contract_id: string;
  contract_number: string;
  rental_order_id: string;
  rental_order_number: string;
  invoice_id: string;
  invoice_number: string;
}

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export const RENTAL_PERIODS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const RENTAL_ORDER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const API = {
  quotations: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<QuotationListItem>>('/quotations/', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<QuotationDetail>(`/quotations/${id}/`).then((r) => r.data),
    create: (data: Record<string, any>) =>
      apiClient.post<QuotationDetail>('/quotations/', data).then((r) => r.data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<QuotationDetail>(`/quotations/${id}/`, data).then((r) => r.data),
    delete: (id: string) =>
      apiClient.delete(`/quotations/${id}/`),
    send: (id: string) =>
      apiClient.post(`/quotations/${id}/send_quotation/`).then((r) => r.data),
    submitForReview: (id: string) =>
      apiClient.post(`/quotations/${id}/submit_for_review/`).then((r) => r.data),
    approveAndSend: (id: string) =>
      apiClient.post(`/quotations/${id}/approve_and_send/`).then((r) => r.data),
    returnToDraft: (id: string) =>
      apiClient.post(`/quotations/${id}/return_to_draft/`).then((r) => r.data),
    downloadPdf: (id: string) =>
      apiClient.get(`/quotations/${id}/download-pdf/`, { responseType: 'blob' }).then((r) => r.data),
    accept: (id: string, payload?: { won_reason?: string }) =>
      apiClient.post<AcceptQuotationResponse>(`/quotations/${id}/accept_quotation/`, payload || {}).then((r) => r.data),
    reject: (id: string, payload?: { lost_reason?: string; lost_notes?: string }) =>
      apiClient.post(`/quotations/${id}/reject_quotation/`, payload || {}).then((r) => r.data),
  },
  rentalOrders: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<RentalOrderListItem>>('/rental-orders/', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<RentalOrderDetail>(`/rental-orders/${id}/`).then((r) => r.data),
    complete: (id: string) =>
      apiClient.post(`/rental-orders/${id}/complete_order/`).then((r) => r.data),
    cancel: (id: string) =>
      apiClient.post(`/rental-orders/${id}/cancel_order/`).then((r) => r.data),
  },
};

export default API;
