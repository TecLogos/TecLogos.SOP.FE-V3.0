import { useEffect, useState } from 'react'
import { sopAPI } from '../../services/api'
import SopDetailModal from '../../shared/components/SopDetailModal'
import Modal from '../../shared/components/Modal'
import { Spinner, PageLoader, EmptyState } from '../../shared/components/Loaders'
import StatusBadge from '../../shared/components/StatusBadge'
import { FileText, Clock, CheckCircle, Send, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, normalizeSopItem, safeItems } from '../../utils/sopUtils'

// GET api/v1/sopdetail/my-history
// Response: { success, data: { TotalCount, Items: [SopDetailResponse] } }
function useMySOPs() {
  const [sops, setSops]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    sopAPI.getMySops()
      .then(r => {
        setSops(safeItems(r.data).map(normalizeSopItem))
      })
      .catch(() => toast.error('Failed to load SOPs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  return { sops, loading, reload: load }
}

// ── Submit Modal ─────────────────────────────────────────────────────────
// PUT api/v1/sopdetail/approve/{sopId}  body: { Comments }
// (Initiator "submits" by triggering approve at level 0 which moves it to Submitted)
// Actually the backend has no explicit "submit" — initiator just moves it forward.
// The supervisor picks it up from pending-list. We show a confirm modal only.
function SubmitConfirmModal({ sop, open, onClose, onDone }) {
  const [comments, setComments] = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      // Forward via supervisor-approve endpoint at this stage
      await sopAPI.supervisorForward(sop.id, { comments })
      toast.success('SOP submitted for review')
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Submit failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Submit SOP for Review" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">SOP</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{sop?.sopTitle}</p>
        </div>
        <div>
          <label className="label">Comments (optional)</label>
          <textarea rows={3} className="input resize-none" value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Add notes for the reviewer…" />
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

// ── Dashboard ────────────────────────────────────────────────────────────
export function InitiatorDashboard() {
  const { sops, loading } = useMySOPs()
  if (loading) return <PageLoader />

  // ApprovalLevel: 0=NotStarted 1=InProgress 2=Submitted 3=L1 4=L2 5=L3
  // ApprovalStatus: 0=Pending 1=Approved 2=Rejected 3=Completed 4=Expired
  const counts = {
    total:     sops.length,
    inProgress:sops.filter(s => s.approvalLevel <= 1 && s.status === 0).length,
    submitted: sops.filter(s => s.approvalLevel >= 2 && s.status === 0).length,
    completed: sops.filter(s => s.status === 3).length,
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div>
        <h1 className="page-title">My Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Track your SOP submissions and approvals</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText,    label: 'Total SOPs',  value: counts.total,      bg: 'bg-slate-100',   text: 'text-slate-700' },
          { icon: Clock,       label: 'In Progress', value: counts.inProgress, bg: 'bg-amber-100',   text: 'text-amber-700' },
          { icon: Send,        label: 'Under Review',value: counts.submitted,  bg: 'bg-blue-100',    text: 'text-blue-700' },
          { icon: CheckCircle, label: 'Completed',   value: counts.completed,  bg: 'bg-emerald-100', text: 'text-emerald-700' },
        ].map(({ icon: Icon, label, value, bg, text }) => (
          <div key={label} className="card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon size={18} className={text} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="section-title">Recent SOPs</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {sops.slice(0, 5).map(sop => (
            <div key={sop.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-white transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{sop.sopTitle}</p>
                <p className="text-xs text-gray-400 mt-0.5">Expires {formatDate(sop.expirationDate)}</p>
              </div>
              <StatusBadge status={sop.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SOPs Page ────────────────────────────────────────────────────────────
export function InitiatorSopsPage() {
  const { sops, loading, reload } = useMySOPs()
  const [viewSop, setViewSop]     = useState(null)
  const [submitSop, setSubmit]    = useState(null)

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">My SOPs</h1>
          <p className="text-gray-500 text-sm mt-1">{sops.length} available SOPs</p>
        </div>
        <button onClick={reload} className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !sops.length ? (
          <EmptyState title="No SOPs assigned" desc="No SOPs have been assigned to you yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th-left">SOP Title</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Version</th>
                  <th className="table-th">Expiry</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 divide-y divide-gray-200">
                {sops.map((sop, idx) => (
                  <tr key={sop.id} className="hover:bg-white transition-colors">
                    <td className="table-td text-gray-400">{idx + 1}</td>
                    <td className="table-td-left font-medium text-gray-900">{sop.sopTitle}</td>
                    <td className="table-td"><StatusBadge status={sop.status} /></td>
                    <td className="table-td">
                      <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">v{sop.documentVersion ?? 1}</span>
                    </td>
                    <td className="table-td text-gray-500">{formatDate(sop.expirationDate)}</td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setViewSop({ id: sop.id, sopTitle: sop.sopTitle })}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-gray-200">
                          View
                        </button>
                        {/* Initiator can submit if level is 0 or 1 (NotStarted / InProgress) */}
                        {sop.approvalLevel <= 1 && sop.status === 0 && (
                          <button onClick={() => setSubmit(sop)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                            Submit
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
      <SopDetailModal
        sopId={viewSop?.id}
        sopTitle={viewSop?.sopTitle}
        open={!!viewSop?.id}
        onClose={() => setViewSop(null)}
      />
      {submitSop && (
        <SubmitConfirmModal sop={submitSop} open={!!submitSop}
          onClose={() => setSubmit(null)} onDone={reload} />
      )}
    </div>
  )
}
