import { api } from './client'

export const riderApi = {
  getStatus:         ()       => api.get('/rider/status'),
  getMyOrders:       (status) => api.get(`/rider/my-orders${status ? `?status=${status}` : ''}`),
  getEarnings:       ()       => api.get('/rider/earnings'),
  uploadVehicleImage: (file)  => {
    const fd = new FormData()
    fd.append('file', file)
    return api.patch('/rider/vehicle-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
