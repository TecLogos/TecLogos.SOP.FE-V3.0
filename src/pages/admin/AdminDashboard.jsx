import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sopAPI, employeeAPI } from '../../services/api'
import { PageLoader } from '../../shared/components/Loaders'
import { normalizeSopItem, safeItems, formatDate } from '../../utils/sopUtils'
import { FileStack, Users, CheckCircle, Clock, XCircle, ArrowRight, TrendingUp } from 'lucide-react'

// ── Stat Card — clickable, navigates to /admin/sops with ?status= filter ──
function StatCard({ icon: Icon, label, value, colorBg, colorText, filterStatus }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (filterStatus !== undefined) {
      // Pass the filter via URL search param so AdminSopsPage can read it
      navigate(`/admin/sops?status=${filterStatus}`)
    } else {
      navigate('/admin/sops')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4 group hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-xl ${colorBg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={colorText} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-slate-600 transition-colors shrink-0" />
    </button>
  )
}

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_LABEL = ['Pending', 'Approved', 'Rejected', 'Completed', 'Expired', 'Needs Changes']
const statusLabel  = (s) => STATUS_LABEL[s] ?? 'Unknown'
const statusColor  = (s) =>
  s === 3 ? 'bg-emerald-100 text-emerald-700' :
  s === 2 ? 'bg-red-100 text-red-700'         :
  s === 1 ? 'bg-blue-100 text-blue-700'        :
  s === 5 ? 'bg-violet-100 text-violet-700'    :
            'bg-gray-100 text-gray-600'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [sops, setSops]         = useState([])
  const [empCount, setEmpCount] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.allSettled([
      sopAPI.getAll({}),
      employeeAPI.getAll(1, 1),
    ]).then(([sopRes, empRes]) => {
      if (sopRes.status === 'fulfilled') {
        const items = safeItems(sopRes.value.data)
        setSops(items.map(normalizeSopItem))
      }
      if (empRes.status === 'fulfilled') {
        const e = empRes.value.data
        const totalCount = e?.data?.TotalCount ?? e?.data?.totalCount ?? e?.TotalCount ?? e?.count ?? e?.Count ?? 0
        setEmpCount(totalCount)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  // ApprovalStatus: 0=Pending 1=Approved 2=Rejected 3=Completed 4=Expired 5=NeedsChanges
  const byStatus  = (s) => sops.filter(x => x.status === s).length
  // Pending Approval = SOPs at level ≥ 2 still with status=0
  const pendingApproval = sops.filter(x => x.approvalLevel >= 2 && x.status === 0).length
  // In Progress = level 1 (submitted by initiator, not yet at approval stage)
  const inProgress = sops.filter(x => x.approvalLevel === 1).length

  const stats = [
    {
      icon: FileStack,  label: 'Total SOPs',       value: sops.length,
      colorBg: 'bg-slate-100',   colorText: 'text-slate-700',
      filterStatus: 'all',   // shows all
    },
    {
      icon: CheckCircle, label: 'Completed',        value: byStatus(3),
      colorBg: 'bg-emerald-100', colorText: 'text-emerald-700',
      filterStatus: 3,           // ApprovalStatus = 3 (Completed)
    },
    {
      icon: CheckCircle, label: 'Expired',        value: byStatus(4),
      colorBg: 'bg-emerald-100', colorText: 'text-emerald-700',
      filterStatus: 4,           // ApprovalStatus = 4 (Expired)
    }
  ]

  // Override Employees card to go to /admin/employees
  const handleCardClick = (stat) => {
    if (stat.label === 'Employees') {
      navigate('/admin/employees')
    } else if (stat.filterStatus === 'all') {
      navigate('/admin/sops')
    } else if (stat.filterStatus === 'inprogress') {
      navigate('/admin/sops?status=inprogress')
    } else {
      navigate(`/admin/sops?status=${stat.filterStatus}`)
    }
  }

  const recent = [...sops]
    .sort((a, b) => new Date(b.created || b.Created) - new Date(a.created || a.Created))
    .slice(0, 5)

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of SOP management system</p>
      </div>

      {/* Stat cards — each navigates to SOPs with the right filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(stat => (
          <button
            key={stat.label}
            type="button"
            onClick={() => handleCardClick(stat)}
            className="w-full text-left card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4 group hover:shadow-md hover:border-gray-300 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.colorBg} flex items-center justify-center shrink-0`}>
              <stat.icon size={20} className={stat.colorText} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-gray-900">{stat.value ?? '—'}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-slate-600 transition-colors shrink-0" />
          </button>
        ))}
      </div>

      {/* Recent SOPs */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="section-title">Recent SOPs</h2>
          <button
            onClick={() => navigate('/admin/sops')}
            className="text-xs text-slate-600 font-semibold hover:text-slate-900 transition"
          >
            View all →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.length === 0 ? (
            <p className="py-10 text-center text-gray-400 text-sm">No SOPs yet</p>
          ) : recent.map(sop => (
            <button
              key={sop.id}
              type="button"
              onClick={() => navigate(`/admin/sops/${sop.id}/tracking`, { state: { sop } })}
              className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-white transition-colors text-left group"
            >
              <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <FileStack size={14} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-slate-900 transition-colors">
                  {sop.sopTitle}
                </p>
              
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusColor(sop.status)}`}>
                {statusLabel(sop.status)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
