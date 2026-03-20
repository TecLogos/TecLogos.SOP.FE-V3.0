import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import { PageLoader } from '../../shared/components/Loaders'
import { normalizeSopItem, safeItems } from '../../utils/sopUtils'
import { FileStack, CheckCircle, CircleMinus, ArrowRight } from 'lucide-react'

const STATUS_LABEL = ['Pending', 'Approved', 'Rejected', 'Completed', 'Expired', 'Needs Changes']

function statusLabel(status) {
  return STATUS_LABEL[status] ?? 'Unknown'
}

function statusColor(status) {
  if (status === 3) return 'bg-emerald-100 text-emerald-700'
  if (status === 2) return 'bg-red-100 text-red-700'
  if (status === 1) return 'bg-blue-100 text-blue-700'
  if (status === 5) return 'bg-violet-100 text-violet-700'
  return 'bg-gray-100 text-gray-600'
}

const StatCard = memo(function StatCard({ icon: Icon, label, value, colorBg, colorText, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4 group hover:shadow-md hover:border-gray-300 active:scale-[0.99] transition-all cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-xl ${colorBg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={colorText} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-slate-600 transition-colors shrink-0" />
    </button>
  )
})

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    sopAPI.getAll()
      .then((response) => {
        if (cancelled) return
        const items = safeItems(response.data)
        setSops(items.map(normalizeSopItem))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleCardClick = useCallback((filterStatus) => {
    if (filterStatus === 'all') {
      navigate('/admin/sops')
      return
    }

    if (filterStatus === 'inprogress') {
      navigate('/admin/sops?status=inprogress')
      return
    }

    navigate(`/admin/sops?status=${filterStatus}`)
  }, [navigate])

  const handleViewRecent = useCallback((sop) => {
    navigate(`/admin/sops/${sop.id}/tracking`, { state: { sop } })
  }, [navigate])

  const handleViewAll = useCallback(() => {
    navigate('/admin/sops')
  }, [navigate])

  const { stats, recent } = useMemo(() => {
    const counts = sops.reduce((acc, sop) => {
      acc[sop.status] = (acc[sop.status] || 0) + 1
      return acc
    }, {})

    return {
      stats: [
        {
          icon: FileStack,
          label: 'Total SOPs',
          value: sops.length,
          colorBg: 'bg-slate-100',
          colorText: 'text-slate-700',
          filterStatus: 'all',
        },
        {
          icon: CheckCircle,
          label: 'Completed',
          value: counts[3] || 0,
          colorBg: 'bg-emerald-100',
          colorText: 'text-emerald-700',
          filterStatus: 3,
        },
        {
          icon: CircleMinus,
          label: 'Expired',
          value: counts[4] || 0,
          colorBg: 'bg-red-100',
          colorText: 'text-red-700',
          filterStatus: 4,
        },
      ],
      recent: [...sops]
        .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
        .slice(0, 5),
    }
  }, [sops])

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of SOP management system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            {...stat}
            onClick={() => handleCardClick(stat.filterStatus)}
          />
        ))}
      </div>

      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="section-title">Recent SOPs</h2>
          <button
            type="button"
            onClick={handleViewAll}
            className="text-xs text-slate-600 font-semibold hover:text-slate-900 transition"
          >
            View all →
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {recent.length === 0 ? (
            <p className="py-10 text-center text-gray-400 text-sm">No SOPs yet</p>
          ) : recent.map((sop) => (
            <button
              key={sop.id}
              type="button"
              onClick={() => handleViewRecent(sop)}
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
