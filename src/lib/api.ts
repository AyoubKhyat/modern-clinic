import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('clinic_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const patientsApi = {
  list: (params?: Record<string, any>) => api.get('/patients', { params }),
  search: (q: string) => api.get('/patients/search', { params: { q } }),
  get: (id: number) => api.get(`/patients/${id}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: number, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: number) => api.delete(`/patients/${id}`),
};

export const appointmentsApi = {
  list: (params?: Record<string, any>) => api.get('/appointments', { params }),
  today: () => api.get('/appointments/today'),
  get: (id: number) => api.get(`/appointments/${id}`),
  create: (data: any) => api.post('/appointments', data),
  update: (id: number, data: any) => api.put(`/appointments/${id}`, data),
  updateStatus: (id: number, status: string) => api.patch(`/appointments/${id}/status`, { status }),
};

export const visitsApi = {
  list: (params?: Record<string, any>) => api.get('/visits', { params }),
  get: (id: number) => api.get(`/visits/${id}`),
  create: (data: any) => api.post('/visits', data),
  update: (id: number, data: any) => api.put(`/visits/${id}`, data),
  start: (id: number) => api.patch(`/visits/${id}/start`),
  complete: (id: number) => api.patch(`/visits/${id}/complete`),
};

export const prescriptionsApi = {
  list: (params?: Record<string, any>) => api.get('/prescriptions', { params }),
  get: (id: number) => api.get(`/prescriptions/${id}`),
  create: (data: any) => api.post('/prescriptions', data),
  update: (id: number, data: any) => api.put(`/prescriptions/${id}`, data),
};

export const paymentsApi = {
  list: (params?: Record<string, any>) => api.get('/payments', { params }),
  get: (id: number) => api.get(`/payments/${id}`),
  create: (data: any) => api.post('/payments', data),
  update: (id: number, data: any) => api.put(`/payments/${id}`, data),
  markAsPaid: (id: number) => api.patch(`/payments/${id}/pay`),
};

export const dashboardApi = {
  admin: () => api.get('/dashboard/admin'),
  doctor: () => api.get('/dashboard/doctor'),
  reception: () => api.get('/dashboard/reception'),
};

export const aiApi = {
  chat: (message: string, context?: { visitId?: number; patientId?: number }) =>
    api.post('/ai/chat', { message, context }),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};
