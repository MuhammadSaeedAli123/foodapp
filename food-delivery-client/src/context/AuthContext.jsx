import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { saveAuth, getToken, getUser, clearAuth } from '../utils/token'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(getUser)
  const [token, setToken]     = useState(getToken)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      const userObj = {
        id:       data.userId,
        fullName: data.fullName,
        email:    data.email,
        role:     data.role,
      }
      saveAuth(data.token, userObj)
      setToken(data.token)
      setUser(userObj)

      // Enrich every logged-in user with profile fields from /users/me
      try {
        const me = await authApi.getMe()
        const enriched = {
          ...userObj,
          phoneNumber:    me.phoneNumber    ?? null,
          address:        me.address        ?? null,
          createdAt:      me.createdAt      ?? null,
          restaurantId:   me.restaurantId   ?? null,
          restaurantName: me.restaurantName ?? null,
        }
        saveAuth(data.token, enriched)
        setUser(enriched)
        return enriched
      } catch { /* non-fatal — base user still usable */ }

      return userObj
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (formData) => {
    setLoading(true)
    try {
      const data = await authApi.register(formData)
      const userObj = {
        id:          data.userId,
        fullName:    data.fullName,
        email:       data.email,
        role:        data.role,
        phoneNumber: formData.phoneNumber ?? null,
        address:     formData.address     ?? null,
      }
      saveAuth(data.token, userObj)
      setToken(data.token)
      setUser(userObj)
      return userObj
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  const isRole = useCallback((role) => user?.role === role, [user])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isRole, isAuthenticated: !!token, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
