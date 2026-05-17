import { api } from './client'

export const riderApi = {
  getStatus:    ()             => api.get('/rider/status'),
  getMyOrders:  (status)       => api.get(`/rider/my-orders${status ? `?status=${status}` : ''}`),
  getEarnings:  ()             => api.get('/rider/earnings'),
}
