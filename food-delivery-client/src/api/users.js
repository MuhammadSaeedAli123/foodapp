import { api } from './client'

const photoForm = (file) => { const f = new FormData(); f.append('file', file); return f }

export const usersApi = {
  // Workers
  getWorkers:         ()           => api.get('/users/workers'),
  createWorker:       (data)       => api.post('/users/workers', data),
  updateWorker:       (id, data)   => api.put(`/users/workers/${id}`, data),
  deleteWorker:       (id)         => api.delete(`/users/workers/${id}`),
  uploadWorkerPhoto:  (id, file)   => api.patch(`/users/workers/${id}/photo`, photoForm(file)),

  // Riders
  getRiders:          ()           => api.get('/users/riders'),
  createRider:        (data)       => api.post('/users/riders', data),
  updateRider:        (id, data)   => api.put(`/users/riders/${id}`, data),
  deleteRider:        (id)         => api.delete(`/users/riders/${id}`),
  uploadRiderPhoto:   (id, file)   => api.patch(`/users/riders/${id}/photo`,         photoForm(file)),
  uploadVehiclePhoto: (id, file)   => api.patch(`/users/riders/${id}/vehicle-photo`, photoForm(file)),

  // Owners
  getOwners:         ()           => api.get('/users/owners'),
  createOwner:       (data)       => api.post('/users/owners', data),
  updateOwner:       (id, data)   => api.put(`/users/owners/${id}`, data),
  deleteOwner:       (id)         => api.delete(`/users/owners/${id}`),
  uploadOwnerPhoto:  (id, file)   => api.patch(`/users/owners/${id}/photo`, photoForm(file)),

  // Kitchen Staff (managed by Restaurant Owner)
  getStaff:          ()           => api.get('/users/staff'),
  createStaff:       (data)       => api.post('/users/staff', data),
  updateStaff:       (id, data)   => api.put(`/users/staff/${id}`, data),
  deleteStaff:       (id)         => api.delete(`/users/staff/${id}`),
  uploadStaffPhoto:  (id, file)   => api.patch(`/users/staff/${id}/photo`, photoForm(file)),

  // Shared
  toggleActive:  (id) => api.patch(`/users/${id}/toggle`, {}),
}
