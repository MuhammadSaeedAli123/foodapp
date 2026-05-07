import { api } from './client'

export const searchApi = {
  search: (query) => api.get(`/search?query=${encodeURIComponent(query)}`),
}
