import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import SopTable from '../../shared/components/SopTable'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { normalizeSopItem, safeItems } from '../../utils/sopUtils'
import { Plus, Search, Filter, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'

// ApprovalStatus: 0=Pending 1=Approved 2=Rejected 3=Completed 4=Expired 5=NeedsChanges
const STATUSES = [
  { value: '',  label: 'All Statuses' },
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Approved' },
  { value: '2', label: 'Rejected' },
  { value: '3', label: 'Completed' },
  { value: '4', label: 'Expired' },
  { value: '5', label: 'Needs Changes' },
]

export default function AdminSopsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Read ?status= from URL — set by dashboard card clicks
  // 'inprogress' is a special FE-only value for approvalLevel=1
  const urlStatus = searchParams.get('status') ?? ''

  const [allSops, setAllSops]         = useState([])   // raw full list from API
  const [loading, setLoading]         = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatus]     = useState(
    // Map dashboard ?status= values to the dropdown values
    urlStatus === 'inprogress' || urlStatus === 'all' ? '' : urlStatus
  )
  const [deleteSop, setDeleteSop]     = useState(null)

  // Load all SOPs once from backend (client-side filtering handles the rest)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await sopAPI.getAll({})
      const normalized = safeItems(data).map(normalizeSopItem)
      setAllSops(normalized)
    } catch {
      toast.error('Failed to load SOPs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Client-side filtering ─────────────────────────────────────────────
  // Apply: URL special cases + status dropdown + search input
  const filtered = allSops.filter(sop => {
    // Search filter
    if (searchInput.trim()) {
      if (!sop.sopTitle?.toLowerCase().includes(searchInput.trim().toLowerCase())) return false
    }

    // "In Progress" from dashboard — approval level = 1
    if (urlStatus === 'inprogress' && statusFilter === '') {
      return sop.approvalLevel === 1
    }

    // Status dropdown (overrides URL if user changed it)
    if (statusFilter !== '') {
      return sop.status === Number(statusFilter)
    }

    return true
  })

  // ── Active filter label ───────────────────────────────────────────────
  const activeFilterLabel = () => {
    if (urlStatus === 'inprogress' && statusFilter === '') return 'In Progress'
    const found = STATUSES.find(s => s.value === statusFilter && s.value !== '')
    return found?.label ?? null
  }
  const filterLabel = activeFilterLabel()

  const handleDownload = (sop) => {
    if (!sop.sopDocument) { toast.error('No document attached to this SOP'); return }
    window.open(sop.sopDocument, '_blank')
  }

  const handleClear = () => {
    setSearchInput('')
    setStatus('')
    // Remove ?status= from URL without full reload
    navigate('/admin/sops', { replace: true })
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Manage SOPs</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
            {/* Active filter badge */}
            {filterLabel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-semibold">
                {filterLabel}
                <button
                  onClick={handleClear}
                  className="ml-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Clear filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setSearchInput('')}
            placeholder="Search by title…"
            className="w-44 px-2.5 py-1.5 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-sm focus:outline-none focus:border-slate-400 bg-gray-50"
          />
          <button onClick={load}
            className="p-1.5 rounded-md border-2 border-cyan-200 bg-cyan-50 text-gray-500 hover:bg-cyan-100" title="Search">
            <Search size={16} />
          </button>
          <button onClick={handleClear}
            className="p-1.5 rounded-md border-2 border-red-200 bg-red-50 text-red-500 hover:bg-red-100" title="Clear filters">
            <X size={16} />
          </button>
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={e => {
                setStatus(e.target.value)
                // When user manually picks a status, remove URL hint so it doesn't conflict
                if (urlStatus) navigate('/admin/sops', { replace: true })
              }}
              className="pl-8 pr-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm bg-gray-50 hover:border-gray-400 appearance-none focus:outline-none"
            >
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button onClick={() => navigate('/admin/sops/new')} className="btn-primary">
            <Plus size={15} /> New SOP
          </button>
          <button onClick={load}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <SopTable
          sops={filtered}
          loading={loading}
          actions={{
            onViewDetails: sop => navigate(`/admin/sops/${sop.id}/tracking`, { state: { sop } }),
            onDownload:    handleDownload,
            onEdit:        sop => navigate(`/admin/sops/edit/${sop.id}`, { state: { sop } }),
            onDelete:      sop => setDeleteSop(sop),
          }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteSop}
        title="Delete SOP?"
        message={`This will permanently remove "${deleteSop?.sopTitle || ''}". This cannot be undone.`}
        confirmText="Delete"
        confirmClass="btn-danger"
        onConfirm={async () => {
          try {
            await sopAPI.delete(deleteSop.id)
            toast.success('SOP deleted')
            setDeleteSop(null)
            load()
          } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.Message || 'Delete failed')
          }
        }}
        onClose={() => setDeleteSop(null)}
      />
    </div>
  )
}
