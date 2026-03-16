import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileStack, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { Spinner } from '../components/common/Loaders'

const ROLE_REDIRECTS = {
  Admin:      '/admin/dashboard',
  Initiator:  '/initiator/dashboard',
  Supervisor: '/supervisor/dashboard',
  Approver:   '/approver/dashboard',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form)
      toast.success('Welcome back!')
      // role is already set in AuthContext; data.roleName set by our login()
      const ROLE_HOME = {
        Admin: '/admin/dashboard', Initiator: '/initiator/dashboard',
        Supervisor: '/supervisor/dashboard', Approver: '/approver/dashboard',
      }
      const role = data.roleName || ''
      navigate(ROLE_HOME[role] || '/initiator/dashboard')
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-sm animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-glow-lg mb-4">
            <FileStack size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TecLogos SOP</h1>
          <p className="text-surface-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 text-sm bg-surface-800 border border-surface-700 rounded-xl
                           text-white placeholder:text-surface-500
                           focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-surface-800 border border-surface-700 rounded-xl
                             text-white placeholder:text-surface-500
                             focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-500
                         text-white text-sm font-semibold rounded-xl transition-all shadow-glow
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {loading ? <Spinner size="sm" /> : <LogIn size={15} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">
          Standard Operating Procedures Management System
        </p>
      </div>
    </div>
  )
}
