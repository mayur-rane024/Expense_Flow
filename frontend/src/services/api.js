import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Expenses
export const expenseAPI = {
  create: (data) => api.post('/expenses', data),
  getMy: (params) => api.get('/expenses/my', { params }),
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
};

// Approvals
export const approvalAPI = {
  approve: (expenseId, data) => api.post(`/approvals/${expenseId}/approve`, data),
  reject: (expenseId, data) => api.post(`/approvals/${expenseId}/reject`, data),
  getPending: (params) => api.get('/approvals/pending', { params }),
};

// Workflows
export const workflowAPI = {
  create: (data) => api.post('/workflows', data),
  getAll: (params) => api.get('/workflows', { params }),
  getById: (id) => api.get(`/workflows/${id}`),
  delete: (id) => api.delete(`/workflows/${id}`),
};

// Admin
export const adminAPI = {
  createUser: (data) => api.post('/admin/users', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  overrideExpense: (id, data) => api.post(`/admin/expenses/${id}/override`, data),
  createCategory: (data) => api.post('/admin/categories', data),
};

// Shared
export const sharedAPI = {
  getCategories: () => api.get('/api/categories'),
  getUsers: (params) => api.get('/api/users', { params }),
};

export default api;
