import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import SopTable from '../../shared/components/SopTable'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { downloadApiFile, normalizeSopItem, safeItems } from '../../utils/sopUtils'
import useDebouncedValue from '../../shared/hooks/useDebouncedValue'
import { Plus, Search, Filter, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ApprovalHistoryModal = lazy(() => import('../../shared/components/ApprovalHistoryModal'))

const STATUSES = [
  { value: '', label: 'All Statuses' },
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

  const urlStatus = searchParams.get('status') ?? ''

  const [allSops, setAllSops] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatus] = useState(
    urlStatus === 'inprogress' || urlStatus === 'all' ? '' : urlStatus
  )
  const [deleteSop, setDeleteSop] = useState(null)
  const [historySopId, setHistorySopId] = useState(null)

  const debouncedSearch = useDebouncedValue(searchInput, 200)

  const load = useCallback(async ({ force = false } = {}) => {
    setLoading(true)
    try {
      const { data } = await sopAPI.getAll({}, { force })
      const normalized = safeItems(data).map(normalizeSopItem)
      setAllSops(normalized)
    } catch {
      toast.error('Failed to load SOPs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()

    return allSops.filter((sop) => {
      if (term && !sop.sopTitle?.toLowerCase().includes(term)) return false
      if (urlStatus === 'inprogress' && statusFilter === '') return sop.approvalLevel === 1
      if (statusFilter !== '') return sop.status === Number(statusFilter)
      return true
    })
  }, [allSops, debouncedSearch, statusFilter, urlStatus])

  const filterLabel = useMemo(() => {
    if (urlStatus === 'inprogress' && statusFilter === '') return 'In Progress'
    const found = STATUSES.find((status) => status.value === statusFilter && status.value !== '')
    return found?.label ?? null
  }, [statusFilter, urlStatus])

  const tableActions = useMemo(() => ({
    onViewDetails: (sop) => navigate(`/admin/sops/${sop.id}/tracking`, { state: { sop } }),
    onHistory: (sop) => setHistorySopId(sop.id),
    onDownload: async (sop) => {
      if (!sop.sopDocument) {
        toast.error('No document attached to this SOP')
        return
      }

      try {
        const response = await sopAPI.downloadDocument(sop.id)
        downloadApiFile(response, `SOP_${sop.id || 'document'}.pdf`)
      } catch {
        toast.error('Failed to download document')
      }
    },
    onEdit: (sop) => navigate(`/admin/sops/edit/${sop.id}`, { state: { sop } }),
    onDelete: setDeleteSop,
  }), [navigate])

  const handleClear = useCallback(() => {
    setSearchInput('')
    setStatus('')
    navigate('/admin/sops', { replace: true })
  }, [navigate])

  const handleStatusChange = useCallback((event) => {
    setStatus(event.target.value)
    if (urlStatus) navigate('/admin/sops', { replace: true })
  }, [navigate, urlStatus])

  const handleDelete = useCallback(async () => {
    if (!deleteSop) return

    try {
      await sopAPI.delete(deleteSop.id)
      toast.success('SOP deleted')
      setDeleteSop(null)
      load({ force: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Delete failed')
    }
  }, [deleteSop, load])

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Manage SOPs</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
            {filterLabel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-semibold">
                {filterLabel}
                <button
                  type="button"
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
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setSearchInput('')}
            placeholder="Search by title..."
            className="w-44 px-2.5 py-1.5 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-sm focus:outline-none focus:border-slate-400 bg-gray-50"
          />

          <button
            type="button"
            onClick={() => load({ force: true })}
            className="p-1.5 rounded-md border-2 border-cyan-200 bg-cyan-50 text-gray-500 hover:bg-cyan-100"
            title="Refresh list"
          >
            <Search size={16} />
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-md border-2 border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
            title="Clear filters"
          >
            <X size={16} />
          </button>

          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="pl-8 pr-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm bg-gray-50 hover:border-gray-400 appearance-none focus:outline-none"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <button type="button" onClick={() => navigate('/admin/sops/new')} className="btn-primary">
            <Plus size={15} /> New SOP
          </button>

          <button
            type="button"
            onClick={() => load({ force: true })}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <SopTable sops={filtered} loading={loading} actions={tableActions} />
      </div>

      {historySopId && (
        <Suspense fallback={null}>
          <ApprovalHistoryModal
            sopId={historySopId}
            open={!!historySopId}
            onClose={() => setHistorySopId(null)}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={!!deleteSop}
        title="Delete SOP?"
        message={`This will permanently remove "${deleteSop?.sopTitle || ''}". This cannot be undone.`}
        confirmText="Delete"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteSop(null)}
      />
    </div>
  )
}






