import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sopAPI, employeeAPI } from '../../services/api'
import { PageLoader } from '../../components/common/Loaders'
import { FileStack, Users, CheckCircle, Clock, XCircle, ArrowRight, TrendingUp } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, to }) {
  const card = (
    <div className={`card p-5 flex items-center gap-4 group transition-all hover:shadow-lg`}>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-surface-900">{value ?? '—'}</p>
        <p className="text-sm text-surface-500">{label}</p>
      </div>
      {to && <ArrowRight size={16} className="text-surface-300 group-hover:text-brand-500 transition-colors" />}
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function AdminDashboard() {
  const [sops, setSops]         = useState([])
  const [empCount, setEmpCount] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      sopAPI.getAll({ pageNumber: 1, pageSize: 500 }),
      employeeAPI.getAll(1, 1),
    ]).then(([sopRes, empRes]) => {
      setSops(sopRes.data.data?.items || [])
      setEmpCount(empRes.data.count)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const byStatus = (s) => sops.filter(x => x.status === s).length
  const pending  = sops.filter(x => [3, 4, 5].includes(x.status)).length

  const stats = [
    { icon: FileStack,   label: 'Total SOPs',   value: sops.length, color: 'bg-brand-600',   to: '/admin/sops' },
    { icon: Clock,       label: 'Pending Approval', value: pending, color: 'bg-violet-500',  to: '/admin/sops' },
    { icon: CheckCircle, label: 'Completed',    value: byStatus(7), color: 'bg-emerald-500', to: '/admin/sops' },
    { icon: XCircle,     label: 'Rejected',     value: byStatus(6), color: 'bg-red-500',     to: '/admin/sops' },
    { icon: Users,       label: 'Employees',    value: empCount,    color: 'bg-amber-500',   to: '/admin/employees' },
    { icon: TrendingUp,  label: 'In Progress',  value: byStatus(1), color: 'bg-sky-500',     to: '/admin/sops' },
  ]

  const recent = [...sops].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Overview of SOP management system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Recent SOPs */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h2 className="section-title">Recent SOPs</h2>
          <Link to="/admin/sops" className="text-xs text-brand-600 font-semibold hover:text-brand-700">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-surface-100">
          {recent.map(sop => (
            <div key={sop.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                <FileStack size={14} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">{sop.sopTitle}</p>
                <p className="text-xs text-surface-400">v{sop.documentVersion}</p>
              </div>
              <span className={`badge text-xs ${
                sop.status === 7 ? 'bg-emerald-50 text-emerald-700' :
                sop.status === 6 ? 'bg-red-50 text-red-700' :
                'bg-surface-100 text-surface-600'}`}>
                {['Not Started','In Progress','Submitted','Pending L1','Pending L2','Pending L3','Rejected','Completed','Expired'][sop.status] ?? 'Unknown'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
