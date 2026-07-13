import apiClient from './client';

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  parent: string | null;
  children: EquipmentCategory[];
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_person: string;
  contact_phone: string;
  is_active: boolean;
  created_at: string;
}

export interface EquipmentImage {
  id: string;
  image: string;
  is_primary: boolean;
  uploaded_at: string;
}

export interface EquipmentListItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string | null;
  category: string | null;
  category_name: string;
  warehouse: string | null;
  warehouse_name: string;
  operator: string | null;
  operator_name: string | null;
  status: string;
  rental_price_hourly: number | null;
  rental_price_daily: number | null;
  rental_price_weekly: number | null;
  rental_price_monthly: number | null;
  deposit_amount: number | null;
  primary_image: string | null;
  created_at: string;
}

export interface EquipmentSpecification {
  id: string;
  equipment: string;
  key: string;
  value: string;
  unit: string;
  created_at: string;
}

export interface EquipmentAttachment {
  id: string;
  equipment: string;
  name: string;
  file: string;
  file_type: string;
  issue_date: string | null;
  expiry_date: string | null;
  uploaded_at: string;
}

export interface EquipmentCertAlert {
  id: string;
  equipment_name: string;
  equipment_model: string;
  name: string;
  expiry_date: string | null;
}

export interface EquipmentCertAlerts {
  expiring: EquipmentCertAlert[];
  expired: EquipmentCertAlert[];
}

export interface MaintenanceRecord {
  id: string;
  equipment: string;
  date: string;
  maintenance_type: string;
  description: string;
  cost: number | null;
  performed_by: string;
  next_due_date: string | null;
  notes: string;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
}

export interface EquipmentTransit {
  id: string;
  equipment: string;
  date: string;
  route_type: 'warehouse_to_site' | 'site_to_site';
  source_warehouse: string | null;
  source_warehouse_name: string;
  source_site: string | null;
  source_site_name: string;
  destination_site: string | null;
  destination_site_name: string;
  status: 'in_transit' | 'completed' | 'cancelled';
  cost: number;
  notes: string;
  created_by_name: string;
}

export interface EquipmentDetail {
  id: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string | null;
  category: string | null;
  category_name: string;
  warehouse: string | null;
  warehouse_name: string;
  operator: string | null;
  operator_name: string | null;
  purchase_price: number | null;
  rental_price_hourly: number | null;
  rental_price_daily: number | null;
  rental_price_weekly: number | null;
  rental_price_monthly: number | null;
  deposit_amount: number | null;
  status: string;
  location_details: string;
  notes: string;
  images: EquipmentImage[];
  specifications: EquipmentSpecification[];
  attachments: EquipmentAttachment[];
  maintenance_records: MaintenanceRecord[];
  transit_records: EquipmentTransit[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const STATUS_CHOICES = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'retired', label: 'Retired' },
];

export const getStatusLabel = (status: string) =>
  STATUS_CHOICES.find((s) => s.value === status)?.label ?? status;

const API = {
  categories: {
    list: (params?: Record<string, any>) =>
      apiClient.get<EquipmentCategory[]>('/categories/', { params }).then((r) => r.data),
    create: (data: Partial<EquipmentCategory>) =>
      apiClient.post<EquipmentCategory>('/categories/', data).then((r) => r.data),
    update: (id: string, data: Partial<EquipmentCategory>) =>
      apiClient.patch<EquipmentCategory>(`/categories/${id}/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/categories/${id}/`),
  },
  warehouses: {
    list: (params?: Record<string, any>) =>
      apiClient.get<Warehouse[]>('/warehouses/', { params }).then((r) => r.data),
    create: (data: Partial<Warehouse>) =>
      apiClient.post<Warehouse>('/warehouses/', data).then((r) => r.data),
    update: (id: string, data: Partial<Warehouse>) =>
      apiClient.patch<Warehouse>(`/warehouses/${id}/`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/warehouses/${id}/`),
  },
  equipment: {
    list: (params?: Record<string, any>) =>
      apiClient.get<PaginatedResponse<EquipmentListItem>>('/equipment/', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<EquipmentDetail>(`/equipment/${id}/`).then((r) => r.data),
    create: (data: FormData | Record<string, any>) =>
      apiClient.post<EquipmentDetail>('/equipment/', data, {
        headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' },
      }).then((r) => r.data),
    update: (id: string, data: FormData | Record<string, any>) =>
      apiClient.patch<EquipmentDetail>(`/equipment/${id}/`, data, {
        headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' },
      }).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/equipment/${id}/`),
    uploadImage: (id: string, file: File) => {
      const fd = new FormData();
      fd.append('image', file);
      return apiClient.post(`/equipment/${id}/images/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((r) => r.data);
    },
    setPrimaryImage: (id: string, imageId: string) =>
      apiClient.patch(`/equipment/${id}/set-primary-image/`, { image_id: imageId }).then((r) => r.data),
    deleteImage: (id: string, imageId: string) =>
      apiClient.post(`/equipment/${id}/delete-image/`, { image_id: imageId }).then((r) => r.data),
    markReserved: (id: string) =>
      apiClient.post(`/equipment/${id}/mark_reserved/`).then((r) => r.data),
    markAvailable: (id: string) =>
      apiClient.post(`/equipment/${id}/mark_available/`).then((r) => r.data),
    markRented: (id: string) =>
      apiClient.post(`/equipment/${id}/mark_rented/`).then((r) => r.data),
    markMaintenance: (id: string) =>
      apiClient.post(`/equipment/${id}/mark_maintenance/`).then((r) => r.data),
    markRetired: (id: string) =>
      apiClient.post(`/equipment/${id}/mark_retired/`).then((r) => r.data),
    markInTransit: (id: string) =>
      apiClient.post(`/equipment/${id}/mark_in_transit/`).then((r) => r.data),
    specs: {
      list: (equipId: string) =>
        apiClient.get<EquipmentSpecification[]>(`/equipment/${equipId}/specs/`).then((r) => r.data),
      create: (equipId: string, data: Record<string, any>) =>
        apiClient.post<EquipmentSpecification>(`/equipment/${equipId}/specs/`, data).then((r) => r.data),
      update: (equipId: string, specId: string, data: Record<string, any>) =>
        apiClient.patch<EquipmentSpecification>(`/equipment/${equipId}/specs/${specId}/`, data).then((r) => r.data),
      delete: (equipId: string, specId: string) =>
        apiClient.delete(`/equipment/${equipId}/specs/${specId}/`),
    },
    attachments: {
      list: (equipId: string) =>
        apiClient.get<EquipmentAttachment[]>(`/equipment/${equipId}/attachments/`).then((r) => r.data),
      create: (equipId: string, data: FormData) =>
        apiClient.post<EquipmentAttachment>(`/equipment/${equipId}/attachments/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).then((r) => r.data),
      update: (equipId: string, attId: string, data: FormData) =>
        apiClient.patch<EquipmentAttachment>(`/equipment/${equipId}/attachments/${attId}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).then((r) => r.data),
      delete: (equipId: string, attId: string) =>
        apiClient.delete(`/equipment/${equipId}/attachments/${attId}/`),
    },
    maintenance: {
      list: (equipId: string) =>
        apiClient.get<MaintenanceRecord[]>(`/equipment/${equipId}/maintenance/`).then((r) => r.data),
      create: (equipId: string, data: Record<string, any>) =>
        apiClient.post<MaintenanceRecord>(`/equipment/${equipId}/maintenance/`, data).then((r) => r.data),
      update: (equipId: string, recordId: string, data: Record<string, any>) =>
        apiClient.patch<MaintenanceRecord>(`/equipment/${equipId}/maintenance/${recordId}/`, data).then((r) => r.data),
      delete: (equipId: string, recordId: string) =>
        apiClient.delete(`/equipment/${equipId}/maintenance/${recordId}/`),
    },
    transit: {
      list: (equipId: string) =>
        apiClient.get<EquipmentTransit[]>(`/equipment/${equipId}/transit/`).then((r) => r.data),
      create: (equipId: string, data: Record<string, any>) =>
        apiClient.post<EquipmentTransit>(`/equipment/${equipId}/transit/`, data).then((r) => r.data),
      update: (equipId: string, transitId: string, data: Record<string, any>) =>
        apiClient.patch<EquipmentTransit>(`/equipment/${equipId}/transit/${transitId}/`, data).then((r) => r.data),
      delete: (equipId: string, transitId: string) =>
        apiClient.delete(`/equipment/${equipId}/transit/${transitId}/`),
    },
    certExpiryAlerts: (days?: number) =>
      apiClient.get<EquipmentCertAlerts>('/equipment/cert-expiry-alerts/', { params: { days: days || 30 } }).then((r) => r.data),
  },
};

export default API;
