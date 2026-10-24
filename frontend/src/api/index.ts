import api from './client'
import type { User } from '../types'

export const authApi = {
  register: (data: { email: string; username: string; full_name: string; password: string }) =>
    api.post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<User>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
}

export const documentsApi = {
  list: (params?: { page?: number; page_size?: number; q?: string; category?: string }) =>
    api.get('/documents', { params }),

  sharedWithMe: (params?: { page?: number; page_size?: number; q?: string }) =>
    api.get('/documents/shared-with-me', { params }),

  get: (id: string) => api.get(`/documents/${id}`),

  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: { title?: string; description?: string; category?: string }) =>
    api.patch(`/documents/${id}`, data),

  delete: (id: string) => api.delete(`/documents/${id}`),

  downloadUrl: (id: string) => {
    const raw = (import.meta as any).env?.VITE_API_URL as string | undefined
    const base = raw ? `${raw.replace(/\/+$/, '')}/api` : '/api'
    const token = localStorage.getItem('tv_token')
    return token ? `${base}/documents/${id}/download?token=${encodeURIComponent(token)}` : `${base}/documents/${id}/download`
  },
}

export const permissionsApi = {
  list: (docId: string) => api.get(`/documents/${docId}/permissions`),

  grant: (docId: string, data: { username: string; permission: string }) =>
    api.post(`/documents/${docId}/permissions`, data),

  update: (docId: string, permId: string, data: { permission: string }) =>
    api.patch(`/documents/${docId}/permissions/${permId}`, data),

  revoke: (docId: string, permId: string) =>
    api.delete(`/documents/${docId}/permissions/${permId}`),
}

export const auditApi = {
  list: (params?: { page?: number; page_size?: number; action?: string; outcome?: string }) =>
    api.get('/audit', { params }),

  my: (params?: { page?: number; page_size?: number }) => api.get('/audit/my', { params }),

  integrity: () => api.get('/audit/integrity'),
}

export const adminApi = {
  stats: () => api.get('/admin/stats'),

  users: (params?: { page?: number; q?: string }) => api.get('/admin/users', { params }),

  getUser: (id: string) => api.get(`/admin/users/${id}`),

  updateUser: (id: string, data: { full_name?: string; is_active?: boolean; role?: string }) =>
    api.patch(`/admin/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
}
