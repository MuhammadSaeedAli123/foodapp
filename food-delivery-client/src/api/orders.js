import { api } from './client'

export const ordersApi = {
  create:         (data)         => api.post('/orders', data),
  getById:        (id)           => api.get(`/orders/${id}`),
  getMyOrders:    ()             => api.get('/orders/my'),
  getAll:         ()             => api.get('/orders'),
  getAvailable:   ()             => api.get('/orders/available'),
  getKitchen:     ()             => api.get('/orders/kitchen'),
  updateStatus:   (id, status)   => api.patch(`/orders/${id}/status`, { status }),
  // Rider: atomic acceptance — returns 409 if already taken by another rider
  acceptOrder:    (id)           => api.post(`/orders/${id}/accept`),
}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
}
