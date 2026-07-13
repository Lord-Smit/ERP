import apiClient from './client';
import type { EquipmentCertAlerts } from './equipment';

export interface ActiveRental {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
}

export interface RecentQuery {
  id: string;
  subject: string;
  customer_name: string;
  priority: string;
  status: string;
  created_at: string;
}

export interface ActivityItem {
  type: string;
  description: string;
  customer_name: string;
  timestamp: string;
}

export interface DashboardData {
  pending_quotations: number;
  pending_queries: number;
  active_rentals_count: number;
  pending_contracts: number;
  active_rentals: ActiveRental[];
  recent_queries: RecentQuery[];
  recent_activity: ActivityItem[];
  equipment_cert_alerts: EquipmentCertAlerts;
}

export interface InvoiceStats {
  active_rentals: number;
  available_equipment: number;
  pending_contracts: number;
  total_revenue: number;
  pending_invoices: number;
  pending_amount: number;
  overdue_invoices: number;
  overdue_amount: number;
  revenue_month: number;
  aging: Record<string, { count: number; total: number }>;
}

const dashboardApi = {
  get: async () => {
    const { data } = await apiClient.get<DashboardData>('/dashboard/');
    return data;
  },
};

export default dashboardApi;
