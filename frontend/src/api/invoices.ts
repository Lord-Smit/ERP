import apiClient from './client';

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  customer: string;
  customer_name: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: string;
  total_amount: string;
  paid_amount: string;
  balance_due: number;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice: string;
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gst?: string;
  quotation: string | null;
  rental_order: string | null;
  contract: string | null;
  contract_details?: {
    contract_number: string;
    contract_type: string;
    start_date: string;
    end_date: string | null;
  } | null;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  balance_due: number;
  notes: string;
  created_by: string;
  created_by_name: string;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface AgingBucket {
  count: number;
  total: number;
}

export interface InvoiceStats {
  active_rentals: number;
  total_equipment: number;
  equipment_by_status: { status: string; count: number }[];
  pending_contracts: number;
  total_revenue: number;
  pending_invoices: number;
  pending_amount: number;
  overdue_invoices: number;
  overdue_amount: number;
  revenue_month: number;
  aging: {
    '0_30': AgingBucket;
    '31_60': AgingBucket;
    '61_90': AgingBucket;
    '90_plus': AgingBucket;
  };
}

export interface PaymentRecord {
  id: string;
  invoice: string;
  amount_paid: string;
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  notes: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

const invoicesApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await apiClient.get('/invoices/', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<Invoice>(`/invoices/${id}/`);
    return data;
  },
  create: async (payload: Record<string, any>) => {
    const { data } = await apiClient.post('/invoices/', payload);
    return data;
  },
  update: async (id: string, payload: Record<string, any>) => {
    const { data } = await apiClient.patch(`/invoices/${id}/`, payload);
    return data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/invoices/${id}/`);
  },
  markSent: async (id: string) => {
    const { data } = await apiClient.post(`/invoices/${id}/mark_sent/`);
    return data;
  },
  markPaid: async (id: string, payload: { amount?: number; payment_date?: string; payment_mode?: string; reference_number?: string; notes?: string }) => {
    const { data } = await apiClient.post(`/invoices/${id}/mark_paid/`, payload);
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await apiClient.post(`/invoices/${id}/cancel/`);
    return data;
  },
  stats: async () => {
    const { data } = await apiClient.get<InvoiceStats>('/invoices/stats/');
    return data;
  },
  revenueChart: async () => {
    const { data } = await apiClient.get<{ month: string; label: string; revenue: number; pending: number }[]>('/invoices/revenue_chart/');
    return data;
  },
  listPayments: async (params?: Record<string, any>) => {
    const { data } = await apiClient.get('/payments/', { params });
    return data;
  },
  invoicePayments: async (invoiceId: string) => {
    const { data } = await apiClient.get<PaymentRecord[]>(`/invoices/${invoiceId}/payments/`);
    return data;
  },
  previewFromLogsheets: async (payload: { contract_id: string; date_from: string; date_to: string }) => {
    const { data } = await apiClient.post('/invoices/generate_from_logsheets/?preview=true', payload);
    return data;
  },
  generateFromLogsheets: async (payload: { contract_id: string; date_from: string; date_to: string }) => {
    const { data } = await apiClient.post('/invoices/generate_from_logsheets/', payload);
    return data;
  },
};

export default invoicesApi;
