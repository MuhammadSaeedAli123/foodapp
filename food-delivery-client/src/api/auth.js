import { api } from './client'

export const authApi = {
  register:       (data)        => api.post('/auth/register', data),
  login:          (data)        => api.post('/auth/login', data),
  getMe:          ()            => api.get('/users/me'),
  updateMe:       (data)        => api.put('/users/me', data),
  changePassword: (newPassword) => api.put('/users/me/password', { newPassword }),
  uploadMyPhoto:  (file)        => { const fd = new FormData(); fd.append('file', file); return api.patch('/users/me/photo', fd) },

  // Forgot-password flow
  forgotPassword: (email)                                         => api.post('/auth/forgot-password', { email }),
  verifyOtp:      (email, otp)                                    => api.post('/auth/verify-otp',      { email, otp }),
  resetPassword:  (resetToken, newPassword, confirmPassword)      => api.post('/auth/reset-password',  { resetToken, newPassword, confirmPassword }),
}
