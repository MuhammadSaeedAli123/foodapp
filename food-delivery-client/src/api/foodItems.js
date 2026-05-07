import { api } from './client'

export const foodItemsApi = {
  getByRestaurant: (restaurantId) => api.get(`/fooditems?restaurantId=${restaurantId}`),
  getById:         (id)           => api.get(`/fooditems/${id}`),
  create:          (data)         => api.post('/fooditems', data),
  update:          (id, data)     => api.put(`/fooditems/${id}`, data),
  delete:          (id)           => api.delete(`/fooditems/${id}`),
}
