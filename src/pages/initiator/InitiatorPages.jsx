import { useEffect, useState } from 'react'
import { sopAPI } from '../../services/api'
import SopDetailModal from '../../components/common/SopDetailModal'
import Modal from '../../components/common/Modal'
import { Spinner, PageLoader } from '../../components/common/Loaders'
import { FileText, Clock, CheckCircle, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import StatusBadge from '../../components/common/StatusBadge'
import { formatDate, downloadBlob } from '../../utils/sopUtils'

function SubmitModal({ sop, open, onClose, onSubmitted }) {
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Backend expects: { sopID, comments }
      await sopAPI.submit({ sopID: sop.id, comments })
      toast.success('SOP submitted for supervisor review')
      onSubmitted()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Submit SOP for Review" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface-50 rounded-xl p-3">
          <p className="text-xs text-surface-500 font-medium">SOP</p>
          <p className="text-sm font-semibold text-surface-800 mt-0.5">{sop?.sopTitle}</p>
        </div>
        <div>
          <label className="label">Comments (optional)</label>
          <textarea rows={3} className="input resize-none" value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Add any notes for the supervisor…" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Spinner size="sm" /> : <Send size={13} />}
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function InitiatorDashboard() {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sopAPI.getMySops()
      .then(r => setSops(r.data.data || []))
      .catch(() => toast.error('Failed to load SOPs'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const counts = {
    total:     sops.length,
    pending:   sops.filter(s => [0, 1].includes(s.status)).length,
    submitted: sops.filter(s => s.status === 2).length,
    completed: sops.filter(s => s.status === 7).length,
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">My Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Track your SOP submissions and approvals</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText,    label: 'Total SOPs',  value: counts.total,     color: 'bg-brand-600' },
          { icon: Clock,       label: 'In Progress', value: counts.pending,   color: 'bg-amber-500' },
          { icon: Send,        label: 'Submitted',   value: counts.submitted, color: 'bg-blue-500' },
          { icon: CheckCircle, label: 'Completed',   value: counts.completed, color: 'bg-emerald-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-surface-900">{value}</p>
              <p className="text-xs text-surface-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="section-title">Recent SOPs</h2>
        </div>
        <div className="divide-y divide-surface-100">
          {sops.slice(0, 5).map(sop => (
            <div key={sop.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">{sop.sopTitle}</p>
                <p className="text-xs text-surface-400 mt-0.5">Expires {formatDate(sop.expirationDate)}</p>
              </div>
              <StatusBadge status={sop.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function InitiatorSopsPage() {
  const [sops, setSops]       = useState([])
  const [loading, setLoading] = useState(true)
  const [viewId, setViewId]   = useState(null)
  const [submitSop, setSubmit] = useState(null)

  const load = () => {
    setLoading(true)
    sopAPI.getMySops()
      .then(r => setSops(r.data.data || []))
      .catch(() => toast.error('Failed to load SOPs'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDownload = async (sop) => {
    try {
      const { data } = await sopAPI.download(sop.id)
      downloadBlob(data, `SOP_${sop.sopTitle}.pdf`)
    } catch { toast.error('Download failed') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My SOPs</h1>
        <p className="text-sm text-surface-500 mt-1">{sops.length} available SOPs</p>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !sops.length ? (
          <div className="py-16 text-center text-surface-400 text-sm">No SOPs assigned to you yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className="table-th">SOP Title</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Version</th>
                  <th className="table-th">Expiry</th>
                  <th className="table-th w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map(sop => (
                  <tr key={sop.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td font-medium text-surface-900">{sop.sopTitle}</td>
                    <td className="table-td"><StatusBadge status={sop.status} /></td>
                    <td className="table-td">
                      <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded">v{sop.documentVersion}</span>
                    </td>
                    <td className="table-td text-surface-500">{formatDate(sop.expirationDate)}</td>
                    <td className="table-td">
                      <div className="flex gap-1.5">
                        <button onClick={() => setViewId(sop.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-100 text-surface-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                          View
                        </button>
                        {[0, 1].includes(sop.status) && (
                          <button onClick={() => setSubmit(sop)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                            Submit
                          </button>
                        )}
                        {sop.status === 7 && (
                          <button onClick={() => handleDownload(sop)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                            Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SopDetailModal sopId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
      {submitSop && (
        <SubmitModal sop={submitSop} open={!!submitSop}
          onClose={() => setSubmit(null)} onSubmitted={load} />
      )}
    </div>
  )
}
