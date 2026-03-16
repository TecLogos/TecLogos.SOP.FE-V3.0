import { useEffect, useState } from 'react'
import { sopAPI } from '../../services/api'
import SopDetailModal from '../../components/common/SopDetailModal'
import Modal from '../../components/common/Modal'
import { Spinner, PageLoader, EmptyState } from '../../components/common/Loaders'
import StatusBadge from '../../components/common/StatusBadge'
import { formatDate } from '../../utils/sopUtils'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

// Approval action: 1 = Approved, 2 = Rejected
function ApprovalModal({ sop, action, open, onClose, onDone }) {
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving]   = useState(false)
  const isApprove = action === 1

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await sopAPI.processApproval({
        sopID: sop.id,
        action,
        comments: remarks,
      })
      toast.success(isApprove ? 'SOP approved successfully' : 'SOP rejected — returned to initiator')
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isApprove ? 'Approve SOP' : 'Reject SOP'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface-50 rounded-xl p-3">
          <p className="text-xs text-surface-500 font-medium">SOP</p>
          <p className="text-sm font-semibold text-surface-800 mt-0.5">{sop?.sopTitle}</p>
          <div className="flex gap-2 mt-1.5">
            <StatusBadge status={sop?.status} />
            <span className="badge bg-violet-50 text-violet-700">Level {sop?.currentApprovalLevel}</span>
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
          <label className="label">Remarks {!isApprove && '*'}</label>
          <textarea rows={3} className="input resize-none"
            value={remarks} onChange={e => setRemarks(e.target.value)}
            required={!isApprove}
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

export function ApproverDashboard() {
  const [sops, setSops]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sopAPI.getApproverPending()
      .then(r => setSops(r.data.data || []))
      .catch(() => toast.error('Failed to load pending SOPs'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const byLevel = (l) => sops.filter(s => s.currentApprovalLevel === l).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Approver Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">SOPs assigned for your approval</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(level => (
          <div key={level} className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">{level}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{byLevel(level)}</p>
              <p className="text-xs text-surface-500">Level {level} Pending</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="section-title">Pending Approvals</h2>
        </div>
        <div className="divide-y divide-surface-100">
          {!sops.length ? (
            <div className="py-12 text-center text-surface-400 text-sm">No pending approvals</div>
          ) : sops.map(sop => (
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

export function ApproverPendingPage() {
  const [sops, setSops]       = useState([])
  const [loading, setLoading] = useState(true)
  const [viewId, setViewId]   = useState(null)
  const [modal, setModal]     = useState(null) // { sop, action }

  const load = () => {
    setLoading(true)
    sopAPI.getApproverPending()
      .then(r => setSops(r.data.data || []))
      .catch(() => toast.error('Failed to load pending SOPs'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const levelLabel = (status) => {
    if (status === 3) return 'Level 1'
    if (status === 4) return 'Level 2'
    if (status === 5) return 'Level 3'
    return '—'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pending Approvals</h1>
        <p className="text-sm text-surface-500 mt-1">{sops.length} SOPs awaiting your approval</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !sops.length ? (
          <EmptyState title="No pending approvals" desc="You're all caught up!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="table-th">SOP Title</th>
                  <th className="table-th">Approval Level</th>
                  <th className="table-th">Version</th>
                  <th className="table-th">Expiry</th>
                  <th className="table-th w-44">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map(sop => (
                  <tr key={sop.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td font-medium text-surface-900">{sop.sopTitle}</td>
                    <td className="table-td">
                      <span className="badge bg-violet-50 text-violet-700">{levelLabel(sop.status)}</span>
                    </td>
                    <td className="table-td">
                      <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded">v{sop.documentVersion}</span>
                    </td>
                    <td className="table-td text-surface-500">{formatDate(sop.expirationDate)}</td>
                    <td className="table-td">
                      <div className="flex gap-1.5">
                        <button onClick={() => setViewId(sop.id)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
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

      <SopDetailModal sopId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
      {modal && (
        <ApprovalModal sop={modal.sop} action={modal.action} open={!!modal}
          onClose={() => setModal(null)} onDone={load} />
      )}
    </div>
  )
}
