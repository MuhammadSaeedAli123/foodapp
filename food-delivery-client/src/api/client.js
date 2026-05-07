import { getToken, clearAuth } from '../utils/token'

const BASE_URL = '/api'

async function request(path, options = {}) {
  const token = getToken()

  // Don't set Content-Type for FormData — browser adds the multipart boundary automatically
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    return
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed: ${res.status}`)
    err.status = res.status                      // lets callers check e.g. err.status === 409
    if (data?.errors) err.fields = data.errors   // field-level validation map
    throw err
  }

  return data
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)   => request(path, { method: 'PATCH',  body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
}
