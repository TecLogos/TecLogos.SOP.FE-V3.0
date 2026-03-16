import { useState, useEffect, useRef } from 'react'
import { sopAPI } from '../../services/api'
import SopTable from '../../components/common/SopTable'
import SopDetailModal from '../../components/common/SopDetailModal'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Spinner } from '../../components/common/Loaders'
import { Plus, Download, Search, Filter, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadBlob } from '../../utils/sopUtils'

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 0,  label: 'Not Started' },
  { value: 1,  label: 'In Progress' },
  { value: 2,  label: 'Submitted' },
  { value: 7,  label: 'Completed' },
  { value: 6,  label: 'Rejected' },
  { value: 8,  label: 'Expired' },
]

function SopFormModal({ open, onClose, editSop, onSaved }) {
  const [form, setForm]     = useState({ sopTitle: '', expirationDate: '', remark: '' })
  const [file, setFile]     = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (editSop) {
      setForm({
        sopTitle: editSop.sopTitle || '',
        expirationDate: editSop.expirationDate ? editSop.expirationDate.slice(0, 10) : '',
        remark: editSop.remark || '',
      })
    } else {
      setForm({ sopTitle: '', expirationDate: '', remark: '' })
      setFile(null)
    }
  }, [editSop, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editSop && !file) return toast.error('Please attach a PDF document')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('sopTitle', form.sopTitle)
      if (form.expirationDate) fd.append('expirationDate', form.expirationDate)
      if (form.remark) fd.append('remark', form.remark)
      if (file) fd.append(editSop ? 'newDocument' : 'document', file)

      if (editSop) {
        await sopAPI.update(editSop.id, fd)
        toast.success('SOP updated successfully')
      } else {
        await sopAPI.create(fd)
        toast.success('SOP created successfully')
      }
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editSop ? 'Edit SOP' : 'Upload New SOP'} size="md">
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
            placeholder="Optional notes about this SOP…" />
        </div>
        <div>
          <label className="label">{editSop ? 'Replace Document (optional)' : 'PDF Document *'}</label>
          <div
            onClick={() => fileRef.current.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed
                       border-surface-300 rounded-xl cursor-pointer hover:border-brand-400
                       hover:bg-brand-50/50 transition-all">
            <Upload size={20} className="text-surface-400" />
            <span className="text-sm text-surface-500">
              {file ? file.name : 'Click to browse PDF'}
            </span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => setFile(e.target.files[0])} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Saving…' : editSop ? 'Update SOP' : 'Create SOP'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminSopsPage() {
  const [sops, setSops]           = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('')
  const [page, setPage]           = useState(1)
  const [formOpen, setFormOpen]   = useState(false)
  const [editSop, setEditSop]     = useState(null)
  const [viewId, setViewId]       = useState(null)
  const [deleteTarget, setDelete] = useState(null)
  const [exporting, setExporting] = useState(false)
  const pageSize = 20

  const load = async () => {
    setLoading(true)
    try {
      const params = { pageNumber: page, pageSize, search: search || undefined, status: status !== '' ? status : undefined }
      const { data } = await sopAPI.getAll(params)
      setSops(data.data?.items || [])
      setTotal(data.data?.totalCount || 0)
    } catch { toast.error('Failed to load SOPs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search, status])

  const handleDelete = async (sop) => {
    try {
      await sopAPI.delete(sop.id)
      toast.success('SOP deleted')
      load()
    } catch { toast.error('Delete failed') }
  }

  const handleDownload = async (sop) => {
    try {
      const { data } = await sopAPI.download(sop.id)
      downloadBlob(data, `SOP_${sop.sopTitle}.pdf`)
    } catch { toast.error('Download failed') }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await sopAPI.exportCsv()
      downloadBlob(data, `SOPs_${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('CSV exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const pages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Manage SOPs</h1>
          <p className="text-sm text-surface-500 mt-1">{total} total documents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary">
            {exporting ? <Spinner size="sm" /> : <Download size={14} />}
            Export CSV
          </button>
          <button onClick={() => { setEditSop(null); setFormOpen(true) }} className="btn-primary">
            <Plus size={14} /> New SOP
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input className="input pl-9" placeholder="Search by title…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <select className="input pl-9 pr-8 appearance-none bg-white w-full sm:w-48"
              value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <SopTable
          sops={sops} loading={loading}
          actions={{
            onView: sop => setViewId(sop.id),
            onEdit: sop => { setEditSop(sop); setFormOpen(true) },
            onDelete: sop => setDelete(sop),
            onDownload: handleDownload,
          }}
        />
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <span className="text-xs text-surface-500">
              Page {page} of {pages} · {total} total
            </span>
            <div className="flex gap-1">
              {[...Array(Math.min(pages, 7))].map((_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                      ${p === page ? 'bg-brand-600 text-white' : 'text-surface-600 hover:bg-surface-100'}`}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SopFormModal open={formOpen} onClose={() => setFormOpen(false)}
        editSop={editSop} onSaved={load} />
      <SopDetailModal sopId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete SOP"
        message={`Are you sure you want to delete "${deleteTarget?.sopTitle}"? This cannot be undone.`}
        danger
      />
    </div>
  )
}
