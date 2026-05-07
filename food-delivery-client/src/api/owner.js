import { api } from './client'

export const ownerApi = {
  // Profile
  getProfile:    ()       => api.get('/owner/profile'),
  updateProfile: (data)   => api.put('/owner/profile', data),
  toggleOpen:    ()       => api.patch('/owner/toggle-open'),

  // Menu
  getMenu:        ()           => api.get('/owner/menu'),
  createMenuItem: (data)       => api.post('/owner/menu', data),
  updateMenuItem: (id, data)   => api.put(`/owner/menu/${id}`, data),
  deleteMenuItem: (id)         => api.delete(`/owner/menu/${id}`),

  // Orders
  getOrders:         (status)  => api.get(`/owner/orders${status && status !== 'All' ? `?status=${status}` : ''}`),
  updateOrderStatus: (id, status) => api.patch(`/owner/orders/${id}/status`, { status }),

  // Earnings
  getEarnings: () => api.get('/owner/earnings'),

  // Image uploads
  uploadRestaurantImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.patch('/owner/restaurant-image', fd)
  },
  uploadMenuItemImage: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.patch(`/owner/menu/${id}/image`, fd)
  },
}
