import { useState, useEffect, useRef } from 'react'
import { sopAPI } from '../../services/api'
import SopTable from '../../shared/components/SopTable'
import SopDetailModal from '../../shared/components/SopDetailModal'
import Modal from '../../shared/components/Modal'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner } from '../../shared/components/Loaders'
import { normalizeSopItem, safeItems } from '../../utils/sopUtils'
import { Plus, Search, Filter, Upload, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'

// ApprovalStatus: 0=Pending 1=Approved 2=Rejected 3=Completed 4=Expired
const STATUSES = [
  { value: '',  label: 'All Statuses' },
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Approved' },
  { value: '2', label: 'Rejected' },
  { value: '3', label: 'Completed' },
  { value: '4', label: 'Expired' },
]

function SopFormModal({ open, onClose, onSaved }) {
  const [form, setForm]     = useState({ sopTitle: '', expirationDate: '', remark: '' })
  const [file, setFile]     = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (open) { setForm({ sopTitle: '', expirationDate: '', remark: '' }); setFile(null) }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Please attach a PDF document')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('SopTitle', form.sopTitle)
      if (form.expirationDate) fd.append('ExpirationDate', form.expirationDate)
      if (form.remark)         fd.append('Remark', form.remark)
      fd.append('SopDocument', file)
      await sopAPI.create(fd)
      toast.success('SOP created successfully')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload New SOP" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">SOP Title *</label>
          <input className="input" required value={form.sopTitle}
            onChange={e => setForm(f => ({ ...f, sopTitle: e.target.value }))}
            placeholder="e.g. Emergency Shutdown Procedure" />
        </div>
        <div>
          <label className="label">Expiry Date</label>
          <input type="date" className="input" value={form.expirationDate}
            onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))} />
        </div>
        <div>
          <label className="label">Remarks</label>
          <textarea rows={3} className="input resize-none" value={form.remark}
            onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
            placeholder="Optional notes…" />
        </div>
        <div>
          <label className="label">PDF Document *</label>
          <div onClick={() => fileRef.current.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-gray-100 transition-all">
            <Upload size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500">{file ? file.name : 'Click to browse PDF'}</span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => setFile(e.target.files[0])} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Saving…' : 'Create SOP'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminSopsPage() {
  const [sops, setSops]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus]     = useState('')
  const [formOpen, setFormOpen] = useState(false)
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
          <button onClick={() => setFormOpen(true)} className="btn-primary">
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
          actions={{ onView: sop => setViewSop({ id: sop.id, sopTitle: sop.sopTitle }) }}
        />
      </div>

      <SopFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <SopDetailModal
        sopId={viewSop?.id}
        sopTitle={viewSop?.sopTitle}
        open={!!viewSop?.id}
        onClose={() => setViewSop(null)}
      />
    </div>
  )
}
