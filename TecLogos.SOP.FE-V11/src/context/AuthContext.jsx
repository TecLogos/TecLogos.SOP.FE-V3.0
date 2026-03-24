import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

function extractRoleFromJwt(token) {
  if (!token) return ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const roleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    const role = payload[roleKey] || payload['role'] || payload['Role'] || ''
    if (Array.isArray(role)) return role[0] || ''
    return role || ''
  } catch {
    return ''
  }
}

// ── Extract role from login response User object ──────────────────────────
function extractRoleFromLogin(user) {
  if (!user) return ''
  const roles = user.Roles || user.roles || []
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0]
    if (typeof first === 'string') return first
    return first?.RoleName || first?.roleName || ''
  }
  return ''
}

// ── Extract role from /me profile ────────────────────────────────────────
function extractRoleFromMe(profile) {
  if (!profile) return ''
  const direct =
    profile.ResolvedRole ??
    profile.resolvedRole ??
    profile.RoleName ??
    profile.roleName ??
    ''
  if (typeof direct === 'string' && direct) return direct
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
      const profile = data?.Data ?? data?.data ?? data
      setUser(profile)

      // Try role from /me profile first
      let resolvedRole = extractRoleFromMe(profile)

      // If /me returns no role (unpatched backend), fall back to JWT decode
      if (!resolvedRole) {
        resolvedRole = extractRoleFromJwt(token)
      }

      // Never default to Admin; safest fallback is Initiator.
      setRole(resolvedRole || 'Initiator')
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

    if (!data.Success && !data.success) {
      throw new Error(data.Message || data.message || 'Login failed')
    }

    const token = data.Token || data.token || data.accessToken
    if (token) localStorage.setItem('accessToken', token)

    let loginRole = extractRoleFromLogin(data.User || data.user)

    if (!loginRole && token) {
      loginRole = extractRoleFromJwt(token)
    }

    // Never default to Admin; safest fallback is Initiator.
    loginRole = loginRole || 'Initiator'
    setRole(loginRole)

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
