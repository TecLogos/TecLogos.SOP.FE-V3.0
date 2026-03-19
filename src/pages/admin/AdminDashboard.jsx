import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sopAPI, employeeAPI } from '../../services/api'
import { PageLoader } from '../../shared/components/Loaders'
import { normalizeSopItem, safeItems } from '../../utils/sopUtils'
import { FileStack, Users, CheckCircle, Clock, XCircle, ArrowRight, TrendingUp } from 'lucide-react'

function StatCard({ icon: Icon, label, value, colorBg, colorText, to }) {
  const card = (
    <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4 group hover:shadow-md transition-all">
      <div className={`w-12 h-12 rounded-xl ${colorBg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={colorText} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      {to && <ArrowRight size={16} className="text-gray-300 group-hover:text-slate-600 transition-colors" />}
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function AdminDashboard() {
  const [sops, setSops]         = useState([])
  const [empCount, setEmpCount] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.allSettled([
      // GET /api/v1/SopDetail/list  → { success, data: [SopDetailResponse] }
      sopAPI.getAll({}),
      // GET api/v1/employee/list/1/1
      employeeAPI.getAll(1, 1),
    ]).then(([sopRes, empRes]) => {
      if (sopRes.status === 'fulfilled') {
        const d = sopRes.value.data
        // Backend: { success, data: { TotalCount, Items: [...] } }
        // Safely drill down until we find an actual array
        const items = safeItems(d)
        setSops(items.map(normalizeSopItem))
      }
      if (empRes.status === 'fulfilled') {
        const e = empRes.value.data
        // Backend: { success, data: { TotalCount, Items } } or { count }
        const totalCount = e?.data?.TotalCount ?? e?.data?.totalCount ?? e?.TotalCount ?? e?.count ?? e?.Count ?? 0
        setEmpCount(totalCount)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  // ApprovalStatus: 0=Pending 1=Approved 2=Rejected 3=Completed 4=Expired 5=NeedsChanges
  // ApprovalLevel:  0=NotStarted 1=InProgress 2=Submitted 3=L1 4=L2 5=L3
  const byApprovalStatus = (s) => sops.filter(x => x.status === s).length
  const pending = sops.filter(x => x.approvalLevel >= 2 && x.status === 0).length

  const stats = [
    { icon: FileStack,   label: 'Total SOPs',      value: sops.length,           colorBg: 'bg-slate-100',   colorText: 'text-slate-700',   to: '/admin/sops' },
    { icon: Clock,       label: 'Pending Approval', value: pending,               colorBg: 'bg-violet-100',  colorText: 'text-violet-700',  to: '/admin/sops' },
    { icon: CheckCircle, label: 'Completed',        value: byApprovalStatus(3),   colorBg: 'bg-emerald-100', colorText: 'text-emerald-700', to: '/admin/sops' },
    { icon: XCircle,     label: 'Rejected',         value: byApprovalStatus(2),   colorBg: 'bg-red-100',     colorText: 'text-red-700',     to: '/admin/sops' },
    { icon: Users,       label: 'Employees',        value: empCount,              colorBg: 'bg-amber-100',   colorText: 'text-amber-700',   to: '/admin/employees' },
    { icon: TrendingUp,  label: 'In Progress',      value: sops.filter(x => x.approvalLevel === 1).length, colorBg: 'bg-sky-100', colorText: 'text-sky-700', to: '/admin/sops' },
  ]

  const recent = [...sops]
    .sort((a, b) => new Date(b.created || b.Created) - new Date(a.created || a.Created))
    .slice(0, 5)

  // ApprovalStatus label map
  const statusLabel = (s) => ['Pending','Approved','Rejected','Completed','Expired','Needs Changes'][s] ?? 'Unknown'
  const statusColor = (s) =>
    s === 3 ? 'bg-emerald-100 text-emerald-700' :
    s === 2 ? 'bg-red-100 text-red-700'         :
    s === 1 ? 'bg-blue-100 text-blue-700'        :
    s === 5 ? 'bg-violet-100 text-violet-700'    :
              'bg-gray-100 text-gray-600'

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of SOP management system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="section-title">Recent SOPs</h2>
          <Link to="/admin/sops" className="text-xs text-slate-600 font-semibold hover:text-slate-900 transition">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.length === 0 ? (
            <p className="py-10 text-center text-gray-400 text-sm">No SOPs yet</p>
          ) : recent.map(sop => (
            <div key={sop.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-white transition-colors">
              <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <FileStack size={14} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{sop.sopTitle}</p>
                <p className="text-xs text-gray-400">v{sop.documentVersion} · {sop.createdByEmail || '—'}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(sop.status)}`}>
                {statusLabel(sop.status)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
