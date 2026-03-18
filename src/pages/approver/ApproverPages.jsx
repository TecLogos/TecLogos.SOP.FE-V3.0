import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import Modal from '../../shared/components/Modal'
import { Spinner, PageLoader, EmptyState } from '../../shared/components/Loaders'
import StatusBadge from '../../shared/components/StatusBadge'
import { CheckCircle, XCircle, Eye, RefreshCw, RotateCcw } from 'lucide-react'
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

function ApprovalModal({ sop, open, onClose, onDone }) {
  debugger ;
  const [remarks, setRemarks] = useState('')
  const [nextApprovalLevel, setNextApprovalLevel] = useState()
  const [saving, setSaving]   = useState(false)
  const [actionType, setActionType] = useState('approve') // approve | changes | reject
  const isApprove = actionType === 'approve'
  const isReject  = actionType === 'reject'

  useEffect(() => {
    if (!open) return
    setRemarks('')
    setActionType('approve')
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (isApprove) {
        await sopAPI.processApproval({ sopID: sop.id, action: 1, comments: remarks })
        toast.success('SOP approved successfully')
      } else if (isReject) {
        await sopAPI.processApproval({ sopID: sop.id, action: 2, comments: remarks })
        toast.success('SOP rejected')
      } else {
        await sopAPI.returnForChanges(sop.id, { comments: remarks })
        toast.success('Changes requested — SOP returned to initiator')
      }
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Action failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isApprove ? 'Approve SOP' : isReject ? 'Reject SOP' : 'Request Changes'} size="sm">
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
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setActionType('approve')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${actionType === 'approve' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            <CheckCircle size={12} className="inline mr-1" /> Approve
          </button>
          <button type="button" onClick={() => setActionType('changes')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${actionType === 'changes' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            <RotateCcw size={12} className="inline mr-1" /> Changes
          </button>
          <button type="button" onClick={() => setActionType('reject')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${actionType === 'reject' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            <XCircle size={12} className="inline mr-1" /> Reject
          </button>
        </div>
        {!isApprove && isReject && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
            <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              Rejecting will close this SOP as rejected. Please provide a reason.
            </p>
          </div>
        )}
        {!isApprove && !isReject && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <XCircle size={16} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              This SOP will be returned to the initiator for revision (not rejected).
            </p>
          </div>
        )}
        <div>
          <label className="label">Comments {!isApprove && '*'}</label>
          <textarea rows={3} className="input resize-none" value={remarks}
            onChange={e => setRemarks(e.target.value)} required={!isApprove}
            placeholder={isApprove ? 'Optional approval notes…' : isReject ? 'Reason for rejection (required)…' : 'Explain what changes are needed (required)…'} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving}
            className={`flex-1 justify-center ${isApprove ? 'btn-success' : isReject ? 'btn-danger' : 'btn-outline border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
            {saving ? <Spinner size="sm" /> : isApprove ? <CheckCircle size={13} /> : <XCircle size={13} />}
            {saving ? 'Saving…' : isApprove ? 'Approve' : isReject ? 'Reject' : 'Request Changes'}
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
  const navigate = useNavigate()
  const { sops, loading, reload } = usePending()
  const [modalSop, setModalSop]   = useState(null)

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
                  {/* <th className="table-th">Version</th> */}
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
                    {/* <td className="table-td">
                      <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">v{sop.documentVersion ?? 1}</span>
                    </td> */}
                    <td className="table-td text-gray-500">{formatDate(sop.expirationDate)}</td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => navigate(`/approver/pending/${sop.id}/tracking`, { state: { sop } })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Tracking">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => setModalSop(sop)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                          Action
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
      {modalSop && (
        <ApprovalModal sop={modalSop} open={!!modalSop}
          onClose={() => setModalSop(null)} onDone={reload} />
      )}
    </div>
  )
}
