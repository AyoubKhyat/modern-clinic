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

export const analyticsApi = {
  revenueTrend: () => api.get('/analytics/revenue-trend'),
  patientGrowth: () => api.get('/analytics/patient-growth'),
  appointmentTrend: () => api.get('/analytics/appointment-trend'),
};

export const appointmentsRangeApi = {
  range: (start: string, end: string) => api.get('/appointments/range', { params: { start, end } }),
};

export const auditLogApi = {
  list: (params?: Record<string, any>) => api.get('/audit-log', { params }),
};

export const backupApi = {
  download: () => api.get('/backup', { responseType: 'blob' }),
  restore: (file: File) => api.post('/restore', file, {
    headers: { 'Content-Type': 'application/octet-stream' },
  }),
};

export const exportApi = {
  csv: (entity: string) => api.get(`/export/${entity}`, { responseType: 'blob' }),
};

export const schedulesApi = {
  list: (doctorId?: number) => api.get('/schedules', { params: doctorId ? { doctor_id: doctorId } : {} }),
  create: (data: any) => api.post('/schedules', data),
  update: (id: number, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: number) => api.delete(`/schedules/${id}`),
};

export const documentsApi = {
  list: (patientId: number) => api.get(`/patients/${patientId}/documents`),
  get: (id: number) => api.get(`/documents/${id}`),
  upload: (patientId: number, data: any) => api.post(`/patients/${patientId}/documents`, data),
  delete: (id: number) => api.delete(`/documents/${id}`),
};

export const medicationsApi = {
  search: (q: string) => api.get('/medications', { params: { q } }),
};

export const visitTemplatesApi = {
  list: () => api.get('/visit-templates'),
  create: (data: any) => api.post('/visit-templates', data),
  delete: (id: number) => api.delete(`/visit-templates/${id}`),
};

export const patientStatsApi = {
  get: (patientId: number) => api.get(`/patients/${patientId}/stats`),
};

export const reportsApi = {
  financial: (params?: Record<string, any>) => api.get('/reports/financial', { params }),
  clinical: (params?: Record<string, any>) => api.get('/reports/clinical', { params }),
};

export const conflictApi = {
  check: (params: Record<string, any>) => api.get('/appointments/check-conflict', { params }),
};

export const remindApi = {
  send: (appointmentId: number) => api.post(`/appointments/${appointmentId}/remind`),
};

export const seedApi = {
  generate: (count: number) => api.post('/seed', { count }),
};

export const passwordApi = {
  change: (current_password: string, new_password: string) => api.post('/auth/change-password', { current_password, new_password }),
};

export const inventoryApi = {
  list: (params?: Record<string, any>) => api.get('/inventory', { params }),
  get: (id: number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  adjust: (id: number, data: any) => api.post(`/inventory/${id}/adjust`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
  lowStock: () => api.get('/inventory/alerts/low-stock'),
};

export const payrollApi = {
  list: (params?: Record<string, any>) => api.get('/payroll', { params }),
  create: (data: any) => api.post('/payroll', data),
  update: (id: number, data: any) => api.put(`/payroll/${id}`, data),
  markPaid: (id: number) => api.patch(`/payroll/${id}/pay`),
};

export const labOrdersApi = {
  list: (params?: Record<string, any>) => api.get('/lab-orders', { params }),
  create: (data: any) => api.post('/lab-orders', data),
  update: (id: number, data: any) => api.patch(`/lab-orders/${id}`, data),
};

export const vaccinationsApi = {
  list: (patientId: number) => api.get('/vaccinations', { params: { patient_id: patientId } }),
  create: (data: any) => api.post('/vaccinations', data),
  delete: (id: number) => api.delete(`/vaccinations/${id}`),
};

export const referralsApi = {
  list: (params?: Record<string, any>) => api.get('/referrals', { params }),
  create: (data: any) => api.post('/referrals', data),
  update: (id: number, data: any) => api.patch(`/referrals/${id}`, data),
};

export const expensesApi = {
  list: (params?: Record<string, any>) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
};

export const leavesApi = {
  list: (params?: Record<string, any>) => api.get('/leaves', { params }),
  create: (data: any) => api.post('/leaves', data),
  approve: (id: number, status: string) => api.patch(`/leaves/${id}`, { status }),
};

export const bulkNotifyApi = {
  send: (data: any) => api.post('/notifications/bulk', data),
};

export const waitingRoomApi = {
  get: () => api.get('/waiting-room'),
};

export const qrApi = {
  getToken: (appointmentId: number) => api.get(`/appointments/${appointmentId}/qr-token`),
};

export const portalApi = {
  login: (phone: string) => api.post('/portal/login', { phone }),
  getData: (token: string) => api.get('/portal/patient', { headers: { Authorization: `Bearer ${token}` } }),
};

export const doctorPerformanceApi = {
  get: () => api.get('/analytics/doctor-performance'),
};
