import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { FileStack, Eye, EyeOff, CheckCircle, AlertTriangle, Lock } from 'lucide-react'
import { Spinner } from '../components/common/Loaders'
import axios from 'axios'
import toast from 'react-hot-toast'

// Standalone axios instance — no auth token needed for public onboarding routes
const publicApi = axios.create({ baseURL: '', withCredentials: true })

const RULES = [
  { id: 'len',    label: 'At least 8 characters',         test: p => p.length >= 8 },
  { id: 'upper',  label: 'One uppercase letter (A–Z)',     test: p => /[A-Z]/.test(p) },
  { id: 'lower',  label: 'One lowercase letter (a–z)',     test: p => /[a-z]/.test(p) },
  { id: 'digit',  label: 'One number (0–9)',               test: p => /\d/.test(p) },
  { id: 'symbol', label: 'One special character (!@#$…)',  test: p => /[^a-zA-Z0-9]/.test(p) },
]

function PasswordStrength({ password }) {
  const passed = RULES.filter(r => r.test(password)).length
  const pct    = (passed / RULES.length) * 100
  const color  = pct <= 20 ? 'bg-red-500' : pct <= 60 ? 'bg-amber-500' : pct <= 80 ? 'bg-blue-500' : 'bg-emerald-500'
  const label  = pct <= 20 ? 'Weak' : pct <= 60 ? 'Fair' : pct <= 80 ? 'Good' : 'Strong'

  if (!password) return null
  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-semibold ${
          pct <= 20 ? 'text-red-600' : pct <= 60 ? 'text-amber-600' : pct <= 80 ? 'text-blue-600' : 'text-emerald-600'
        }`}>{label}</span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {RULES.map(r => (
          <div key={r.id} className={`flex items-center gap-1.5 text-xs transition-colors ${
            r.test(password) ? 'text-emerald-600' : 'text-surface-400'}`}>
            <CheckCircle size={11} className={r.test(password) ? 'text-emerald-500' : 'text-surface-300'} />
            {r.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  const [params]          = useSearchParams()
  const navigate          = useNavigate()
  const token             = params.get('token') || ''

  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState('')

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [saving, setSaving]       = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No invitation token found. Please check your email link.')
      setValidating(false)
      return
    }
    publicApi.get(`/api/v1/authonboarding/validate?token=${encodeURIComponent(token)}`)
      .then(() => setTokenValid(true))
      .catch(err => {
        const msg = err.response?.data?.message || err.response?.data || 'Invalid or expired invitation link.'
        setTokenError(typeof msg === 'string' ? msg : 'This invitation link is invalid or has already been used.')
      })
      .finally(() => setValidating(false))
  }, [token])

  const allRulesPassed = RULES.every(r => r.test(password))
  const passwordsMatch = password === confirm && confirm.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allRulesPassed) return toast.error('Password does not meet the requirements')
    if (!passwordsMatch)  return toast.error('Passwords do not match')
    setSaving(true)
    try {
      await publicApi.post('/api/v1/authonboarding/set-password', {
        token,
        password,
      })
      toast.success('Password set successfully! Redirecting to login…')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data
      toast.error(typeof msg === 'string' ? msg : 'Failed to set password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (validating) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-surface-400 text-sm mt-4">Validating your invitation…</p>
        </div>
      </div>
    )
  }

  // ── Invalid token ────────────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm text-center animate-slide-in">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-900/40 rounded-2xl mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-surface-400 text-sm mb-6">{tokenError}</p>
          <Link to="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // ── Set password form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-sm animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-glow-lg mb-4">
            <FileStack size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to TecLogos</h1>
          <p className="text-surface-400 text-sm mt-1">Set your account password to get started</p>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 bg-brand-900/40 border border-brand-800 rounded-xl p-3 mb-5">
            <Lock size={14} className="text-brand-400 shrink-0" />
            <p className="text-xs text-brand-300">
              Your invitation is valid. Create a strong password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-surface-800 border border-surface-700 rounded-xl
                             text-white placeholder:text-surface-500
                             focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showCf ? 'text' : 'password'} required
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm bg-surface-800 border rounded-xl
                             text-white placeholder:text-surface-500
                             focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all
                             ${confirm.length > 0
                               ? passwordsMatch ? 'border-emerald-600 focus:border-emerald-500' : 'border-red-600 focus:border-red-500'
                               : 'border-surface-700 focus:border-brand-500'}`}
                />
                <button type="button" onClick={() => setShowCf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle size={11} /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !allRulesPassed || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2
                         bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white text-sm font-semibold rounded-xl transition-all shadow-glow">
              {saving ? <Spinner size="sm" /> : <CheckCircle size={15} />}
              {saving ? 'Setting Password…' : 'Set Password & Activate Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
