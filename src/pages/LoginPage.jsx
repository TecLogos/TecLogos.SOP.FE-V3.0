import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { Spinner } from '../shared/components/Loaders'

const ROLE_HOME = {
  Admin:      '/admin/dashboard',
  Initiator:  '/initiator/dashboard',
  Supervisor: '/supervisor/dashboard',
  Approver:   '/approver/dashboard',
}

export default function LoginPage() {
  const { login }               = useAuth()
  const navigate                = useNavigate()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form)
      toast.success('Welcome back!')
      const role = data.roleName || ''
      navigate(ROLE_HOME[role] || '/initiator/dashboard')
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">TecLogos SOP</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-500 border border-slate-500 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg
                           text-white placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-700 border border-slate-600 rounded-lg
                             text-white placeholder:text-slate-500
                             focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2
                         bg-slate-700 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg
                         transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Spinner size="sm" /> : <LogIn size={15} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Standard Operating Procedures Management System
        </p>
      </div>
    </div>
  )
}
