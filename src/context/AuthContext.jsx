import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

/**
 * Backend /me returns:
 *   { success, data: { fullName, email, mobileNumber, roles: [{ roleName }] } }
 *
 * Backend /login returns:
 *   { success, token, refreshToken, expiresAt, user: { id, email, roles: ["Admin"] } }
 *
 * We extract the first role string from either shape.
 */
function extractRole(userData) {
  if (!userData) return ''

  // Shape A: roles is [{ roleName: "Admin" }]  (from /me AuthEmployee)
  if (Array.isArray(userData.roles) && userData.roles.length > 0) {
    const first = userData.roles[0]
    if (typeof first === 'string') return first          // Shape B: ["Admin"]
    if (first?.roleName)          return first.roleName  // Shape A
    if (first?.name)              return first.name      // Safety fallback
  }

  // Shape C: flat string fields
  return userData.roleName || userData.role || ''
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState('')
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authAPI.me()
      const profile = data?.data ?? data   // handle { data: {...} } or flat
      setUser(profile)
      setRole(extractRole(profile))
    } catch {
      localStorage.removeItem('accessToken')
      setUser(null)
      setRole('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials)

    if (!data.success) {
      throw new Error(data.message || 'Login failed')
    }

    // Backend returns { token } not { accessToken }
    const token = data.token || data.accessToken
    if (token) localStorage.setItem('accessToken', token)

    // Optimistically set role from login response so redirect is instant
    const loginRole = extractRole(data.user)
    if (loginRole) setRole(loginRole)

    // Then fetch full profile
    await fetchMe()
    return { ...data, roleName: loginRole }
  }

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('accessToken')
    setUser(null)
    setRole('')
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, role,
      isAdmin:      role === 'Admin',
      isInitiator:  role === 'Initiator',
      isSupervisor: role === 'Supervisor',
      isApprover:   role === 'Approver',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
