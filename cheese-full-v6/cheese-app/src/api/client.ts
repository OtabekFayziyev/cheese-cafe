import axios from 'axios'
import { io as socketIO } from 'socket.io-client'

// ── Axios instance ──
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
})

// JWT tokenni har so'rovga qo'shish
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cheese_token') || localStorage.getItem('cheese_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token muddati o'tsa — qayta login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('cheese_token')
      localStorage.removeItem('cheese_token')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// ── Auth ──
export const authAPI = {
  // Telegram initData bilan login qilish
  telegram: async (initData: string) => {
    const res = await api.post('/api/auth/telegram', { initData })
    const { token, user } = res.data.data
    sessionStorage.setItem('cheese_token', token)
    localStorage.setItem('cheese_token', token)
    return user
  },
}

// ── Menu ──
export const menuAPI = {
  getAll:      (params?: { categoryId?: string; search?: string }) =>
    api.get('/api/menu', { params }).then(r => r.data.data),

  getCategories: () =>
    api.get('/api/menu/categories').then(r => r.data.data),

  getOne: (id: string) =>
    api.get(`/api/menu/${id}`).then(r => r.data.data),

  // Admin
  create: (data: any) =>
    api.post('/api/admin/menu', data).then(r => r.data.data),

  update: (id: string, data: any) =>
    api.patch(`/api/admin/menu/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/api/admin/menu/${id}`).then(r => r.data.data),

  toggle: (id: string) =>
    api.patch(`/api/admin/menu/${id}/toggle`).then(r => r.data.data),
}

// ── Orders ──
export const ordersAPI = {
  create: (data: any) =>
    api.post('/api/orders', data).then(r => r.data.data),

  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/api/orders', { params }).then(r => r.data.data),

  getOne: (id: string) =>
    api.get(`/api/orders/${id}`).then(r => r.data.data),

  // Admin
  adminGetAll: (params?: { status?: string; page?: number; search?: string }) =>
    api.get('/api/admin/orders', { params }).then(r => r.data.data),

  adminUpdateStatus: (id: string, status: string, extra?: { courierId?: number; cancelReason?: string }) =>
    api.patch(`/api/admin/orders/${id}/status`, { status, ...extra }).then(r => r.data.data),

  // Courier
  courierGetActive: () =>
    api.get('/api/courier/orders').then(r => r.data.data),

  courierUpdateStatus: (id: string, status: string) =>
    api.patch(`/api/courier/orders/${id}/status`, { status }).then(r => r.data.data),
}

// ── User ──
export const userAPI = {
  me: () =>
    api.get('/api/user/me').then(r => r.data.data),

  update: (data: { phone?: string }) =>
    api.patch('/api/user/me', data).then(r => r.data.data),

  saveAddress: (data: any) =>
    api.post('/api/user/address', data).then(r => r.data.data),

  deleteAddress: (id: string) =>
    api.delete(`/api/user/address/${id}`).then(r => r.data.data),
}

// ── Promo ──
export const promoAPI = {
  validate: (code: string, orderTotal: number) =>
    api.post('/api/promo/validate', { code, orderTotal }).then(r => r.data.data),

  save: (code: string) =>
    api.post('/api/promo/save', { code }).then(r => r.data.data),
}

// ── Settings ──
export const settingsAPI = {
  get: () =>
    api.get('/api/settings').then(r => r.data.data),

  // Admin
  update: (data: Record<string, string>) =>
    api.patch('/api/admin/settings', data).then(r => r.data.data),

  updateHours: (hours: any[]) =>
    api.patch('/api/admin/settings/hours', hours).then(r => r.data.data),
}

// ── Admin ──
export const adminAPI = {
  stats: () =>
    api.get('/api/admin/stats').then(r => r.data.data),

  users: (params?: any) =>
    api.get('/api/admin/users', { params }).then(r => r.data.data),

  blockUser: (id: number, reason: string, until?: string) =>
    api.patch(`/api/admin/users/${id}/block`, { reason, until }).then(r => r.data.data),

  unblockUser: (id: number) =>
    api.patch(`/api/admin/users/${id}/unblock`).then(r => r.data.data),

  auditLogs: (params?: any) =>
    api.get('/api/admin/audit-logs', { params }).then(r => r.data.data),
}

// ── Socket.io ──
export function createSocket(userId: number, role: string) {
  const socket = socketIO(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    auth: { userId, role },
    transports: ['websocket'],
  })

  socket.on('connect', () => console.log('🔌 Socket connected'))
  socket.on('disconnect', () => console.log('🔌 Socket disconnected'))

  return socket
}