import { api } from './client'

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
}
