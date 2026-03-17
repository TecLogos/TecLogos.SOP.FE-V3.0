import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

/**
 * Backend response shapes:
 *
 * POST /api/v1/auth/login  →
 *   { Success, Token, RefreshToken, ExpiresAt,
 *     User: { Id, Email, Roles: ["Admin"] } }        ← Roles is List<string>
 *
 * GET  /api/v1/auth/me  →
 *   { Success, Data: { FullName, Email, MobileNumber,
 *     Roles: [{ RoleID, RoleName }] } }              ← Roles is List<Role>
 */

function extractRoleFromLogin(user) {
  // user.Roles is string[] e.g. ["Admin"]
  if (!user) return ''
  const roles = user.Roles || user.roles || []
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0]
    if (typeof first === 'string') return first
    return first?.RoleName || first?.roleName || ''
  }
  return ''
}

function extractRoleFromMe(profile) {
  // profile.Roles is [{ RoleID, RoleName }]
  if (!profile) return ''
  const roles = profile.Roles || profile.roles || []
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0]
    if (typeof first === 'string') return first
    return first?.RoleName || first?.roleName || ''
  }
  return ''
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
      // /me wraps in { Success, Data: {...} }
      const profile = data?.Data ?? data?.data ?? data
      setUser(profile)
      setRole(extractRoleFromMe(profile))
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

    // Login response: { Success, Token, User: { Id, Email, Roles: ["Admin"] } }
    if (!data.Success && !data.success) {
      throw new Error(data.Message || data.message || 'Login failed')
    }

    const token = data.Token || data.token || data.accessToken
    if (token) localStorage.setItem('accessToken', token)

    // Get role from login response immediately so redirect is instant
    const loginRole = extractRoleFromLogin(data.User || data.user)
    if (loginRole) setRole(loginRole)

    // Then fetch full profile for name/email etc
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
