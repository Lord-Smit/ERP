import apiClient from './client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'super_admin' | 'operations_manager' | 'finance' | 'field_supervisor' | 'operator';
  role_display: string;
  is_active: boolean;
  registration_status: string;
  registration_status_display: string;
  rejection_reason: string;
  date_joined: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login/', { email, password });
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me/');
  return data;
};

export interface CreateUserPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: User['role'];
  is_active?: boolean;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: User['role'];
  is_active?: boolean;
  password?: string;
}

export const getUsers = async (query?: string): Promise<User[]> => {
  const url = query ? `/auth/users/${query}` : '/auth/users/';
  const { data } = await apiClient.get<{ count: number; results: User[] }>(url);
  return data.results;
};

export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const { data } = await apiClient.post<User>('/auth/users/', payload);
  return data;
};

export const updateUser = async (id: string, payload: UpdateUserPayload): Promise<User> => {
  const { data } = await apiClient.patch<User>(`/auth/users/${id}/`, payload);
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/auth/users/${id}/`);
};

export interface RegisterOperatorPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  name: string;
  license_type?: string;
  license_number?: string;
  license_expiry?: string;
  license_file?: File | null;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export const registerOperator = async (payload: RegisterOperatorPayload): Promise<{ detail: string }> => {
  const hasFile = payload.license_file instanceof File;
  if (hasFile) {
    const fd = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'license_file') {
          fd.append(key, value as File);
        } else {
          fd.append(key, String(value));
        }
      }
    }
    const { data } = await apiClient.post<{ detail: string }>('/auth/register/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await apiClient.post<{ detail: string }>('/auth/register/', payload);
  return data;
};

export const approveRegistration = async (id: string): Promise<User> => {
  const { data } = await apiClient.post<User>(`/auth/users/${id}/approve/`);
  return data;
};

export const rejectRegistration = async (id: string, reason?: string): Promise<User> => {
  const { data } = await apiClient.post<User>(`/auth/users/${id}/reject/`, { rejection_reason: reason });
  return data;
};

export interface OperatorProfile {
  name: string;
  phone: string;
  email: string;
  license_type: string;
  license_number: string;
  license_expiry: string | null;
  license_file: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RegistrationDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  role_display: string;
  is_active: boolean;
  registration_status: string;
  registration_status_display: string;
  rejection_reason: string;
  date_joined: string;
  operator_profile: OperatorProfile | null;
}

export const getRegistrationDetail = async (id: string): Promise<RegistrationDetail> => {
  const { data } = await apiClient.get<RegistrationDetail>(`/auth/users/${id}/registration_detail/`);
  return data;
};
