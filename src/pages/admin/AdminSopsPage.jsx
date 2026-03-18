import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import SopTable from '../../shared/components/SopTable'
import Modal from '../../shared/components/Modal'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner } from '../../shared/components/Loaders'
import { normalizeSopItem, safeItems } from '../../utils/sopUtils'
import { Plus, Search, Filter, Upload, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadBlob } from '../../utils/sopUtils'

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
  const [sops, setSops]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus]     = useState('')
  const [deleteSop, setDeleteSop] = useState(null)
  const [viewSop, setViewSop]   = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      // GET api/v1/sopdetail/all?approvalStatus=&year=
      const params = {}
      if (status !== '') params.approvalStatus = Number(status)
      const { data } = await sopAPI.getAll(params)
      // safeItems handles all nesting shapes from backend
      const normalized = safeItems(data).map(normalizeSopItem)
      // client-side title search
      const q = searchInput.trim().toLowerCase()
      const filtered = q
        ? normalized.filter(s => s.sopTitle?.toLowerCase().includes(q))
        : normalized
      setSops(filtered)
      setTotal(filtered.length)
    } catch (err) {
      toast.error('Failed to load SOPs')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [status])

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Manage SOPs</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total documents</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by title…"
            className="w-44 px-2.5 py-1.5 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-sm focus:outline-none focus:border-slate-400 bg-gray-50" />
          <button onClick={load}
            className="p-1.5 rounded-md border-2 border-cyan-200 bg-cyan-50 text-gray-500 hover:bg-cyan-100" title="Search">
            <Search size={16} />
          </button>
          <button onClick={() => { setSearchInput(''); setStatus(''); }}
            className="p-1.5 rounded-md border-2 border-red-200 bg-red-50 text-red-500 hover:bg-red-100" title="Clear">
            <X size={16} />
          </button>
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="pl-8 pr-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm bg-gray-50 hover:border-gray-400 appearance-none focus:outline-none">
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
          sops={sops}
          loading={loading}
          actions={{
            // Single View button shows full details + tracking
            onViewDetails: sop => navigate(`/admin/sops/${sop.id}/tracking`, { state: { sop } }),
            onDownload: async (sop) => {
              try {
                const res = await sopAPI.downloadPdf(sop.id)
                const name = (sop.sopDocument || '').split(/[\\/]/).pop() || `SOP_${sop.id}.pdf`
                downloadBlob(res.data, name)
              } catch (err) {
                toast.error(err.response?.data?.message || err.response?.data?.Message || 'Download failed')
              }
            },
            onEdit: sop => navigate(`/admin/sops/edit/${sop.id}`, { state: { sop } }),
            onDelete: sop => setDeleteSop(sop),
          }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteSop}
        title="Delete SOP?"
        message={`This will remove "${deleteSop?.sopTitle || ''}". This cannot be undone.`}
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
