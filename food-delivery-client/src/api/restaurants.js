import { api } from './client'

export const restaurantsApi = {
  getAll:        (search, categoryId) => {
    const params = new URLSearchParams()
    if (search)     params.append('search', search)
    if (categoryId) params.append('categoryId', categoryId)
    const qs = params.toString()
    return api.get(`/restaurants${qs ? `?${qs}` : ''}`)
  },
  getById:       (id)   => api.get(`/restaurants/${id}`),
  getCategories: ()     => api.get('/restaurants/categories'),
  create:        (data) => api.post('/restaurants', data),
  update:        (id, data) => api.put(`/restaurants/${id}`, data),
  delete:        (id)   => api.delete(`/restaurants/${id}`),
  getUnlinked:       ()     => api.get('/restaurants/unlinked'),
  getOwnerDashboard: ()     => api.get('/restaurants/owner/dashboard'),
}
