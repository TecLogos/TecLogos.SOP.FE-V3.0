import { useEffect, useState } from 'react'
import { sopAPI } from '../../services/api'
import SopDetailModal from '../../shared/components/SopDetailModal'
import Modal from '../../shared/components/Modal'
import { Spinner, PageLoader, EmptyState } from '../../shared/components/Loaders'
import StatusBadge from '../../shared/components/StatusBadge'
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, normalizeSopItem, safeItems } from '../../utils/sopUtils'

// GET api/v1/sopdetail/pending-list
// Response: { success, data: { TotalCount, Items: [SopDetailResponse] } }
function usePending() {
  const [sops, setSops]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    sopAPI.getApproverPending()
      .then(r => {
        setSops(safeItems(r.data).map(normalizeSopItem))
      })
      .catch(() => toast.error('Failed to load pending SOPs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  return { sops, loading, reload: load }
}

// ── Approval Modal ────────────────────────────────────────────────────────
// Approve: PUT api/v1/sopdetail/approve/{sopId}  { Comments }
// Reject:  PUT api/v1/sopdetail/reject/{sopId}   { Comments }
function ApprovalModal({ sop, action, open, onClose, onDone }) {
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving]   = useState(false)
  const isApprove             = action === 1

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await sopAPI.processApproval({ sopID: sop.id, action, comments: remarks })
      toast.success(isApprove ? 'SOP approved successfully' : 'SOP rejected')
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Action failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isApprove ? 'Approve SOP' : 'Reject SOP'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">SOP</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{sop?.sopTitle}</p>
          <div className="flex gap-2 mt-1.5">
            <StatusBadge status={sop?.status} />
            {sop?.approvalLevel > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                Level {sop.approvalLevel}
              </span>
            )}
          </div>
        </div>
        {!isApprove && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
            <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              Rejecting will return this SOP to the initiator. Please provide a reason.
            </p>
          </div>
        )}
        <div>
          <label className="label">Comments {!isApprove && '*'}</label>
          <textarea rows={3} className="input resize-none" value={remarks}
            onChange={e => setRemarks(e.target.value)} required={!isApprove}
            placeholder={isApprove ? 'Optional approval notes…' : 'Reason for rejection (required)…'} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving}
            className={`flex-1 justify-center ${isApprove ? 'btn-success' : 'btn-danger'}`}>
            {saving ? <Spinner size="sm" /> : isApprove ? <CheckCircle size={13} /> : <XCircle size={13} />}
            {saving ? 'Saving…' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────
export function ApproverDashboard() {
  const { sops, loading } = usePending()
  if (loading) return <PageLoader />

  // ApprovalLevel 3=L1, 4=L2, 5=L3
  const byLevel = (l) => sops.filter(s => s.approvalLevel === l).length

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div>
        <h1 className="page-title">Approver Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">SOPs assigned for your approval</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[3, 4, 5].map((level, i) => (
          <div key={level} className="card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <span className="text-violet-700 text-sm font-bold">{i + 1}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{byLevel(level)}</p>
              <p className="text-xs text-gray-500">Level {i + 1} Pending</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="section-title">Pending Approvals</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {!sops.length ? (
            <p className="py-12 text-center text-gray-400 text-sm">No pending approvals</p>
          ) : sops.map(sop => (
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

// ── Pending Page ─────────────────────────────────────────────────────────
export function ApproverPendingPage() {
  const { sops, loading, reload } = usePending()
  const [viewSop, setViewSop]     = useState(null)
  const [modal, setModal]         = useState(null)

  const levelLabel = (l) =>
    l === 3 ? 'Level 1' : l === 4 ? 'Level 2' : l === 5 ? 'Level 3' : `L${l}`

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="text-gray-500 text-sm mt-1">{sops.length} SOPs awaiting your approval</p>
        </div>
        <button onClick={reload} className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !sops.length ? (
          <EmptyState title="No pending approvals" desc="You're all caught up!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th-left">SOP Title</th>
                  <th className="table-th">Approval Level</th>
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
                    <td className="table-td">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                        {levelLabel(sop.approvalLevel)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">v{sop.documentVersion ?? 1}</span>
                    </td>
                    <td className="table-td text-gray-500">{formatDate(sop.expirationDate)}</td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setViewSop({ id: sop.id, sopTitle: sop.sopTitle })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => setModal({ sop, action: 1 })}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1">
                          <CheckCircle size={11} /> Approve
                        </button>
                        <button onClick={() => setModal({ sop, action: 2 })}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1">
                          <XCircle size={11} /> Reject
                        </button>
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
      {modal && (
        <ApprovalModal sop={modal.sop} action={modal.action} open={!!modal}
          onClose={() => setModal(null)} onDone={reload} />
      )}
    </div>
  )
}
