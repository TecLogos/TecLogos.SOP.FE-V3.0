import { useEffect, useState } from 'react'
import { sopAPI } from '../../services/api'
import SopDetailModal from '../../shared/components/SopDetailModal'
import Modal from '../../shared/components/Modal'
import { Spinner, PageLoader, EmptyState } from '../../shared/components/Loaders'
import StatusBadge from '../../shared/components/StatusBadge'
import { CheckCircle, RotateCcw, Eye, UserCheck, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, normalizeSopItem, safeItems } from '../../utils/sopUtils'

// GET api/v1/sopdetail/pending-list
// Response: { success, data: { TotalCount, Items: [SopDetailResponse] } }
function usePending() {
  const [sops, setSops]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    sopAPI.getSupervisorPending()
      .then(r => {
        setSops(safeItems(r.data).map(normalizeSopItem))
      })
      .catch(() => toast.error('Failed to load pending SOPs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  return { sops, loading, reload: load }
}

// ── Action Modal ─────────────────────────────────────────────────────────
// Forward: PUT api/v1/sopdetail/approve/{id}  { Comments }
// Changes: PUT api/v1/sopdetail/reject/{id}   { Comments }
function ActionModal({ sop, mode, open, onClose, onDone }) {
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving]   = useState(false)
  const isForward             = mode === 'forward'

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (isForward) {
        await sopAPI.supervisorForward(sop.id, { comments: remarks })
        toast.success('SOP forwarded to next approver')
      } else {
        await sopAPI.supervisorReqChanges(sop.id, { comments: remarks })
        toast.success('Changes requested — SOP returned to initiator')
      }
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Action failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isForward ? 'Forward for Approval' : 'Request Changes'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">SOP</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{sop?.sopTitle}</p>
        </div>
        {!isForward && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            The SOP will be returned to the initiator for revision.
          </div>
        )}
        <div>
          <label className="label">Comments {!isForward && '*'}</label>
          <textarea rows={3} className="input resize-none" value={remarks}
            onChange={e => setRemarks(e.target.value)} required={!isForward}
            placeholder={isForward ? 'Optional notes…' : 'Explain what changes are needed…'} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving}
            className={`flex-1 justify-center ${isForward ? 'btn-primary' : 'btn-outline border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
            {saving ? <Spinner size="sm" /> : isForward ? <CheckCircle size={13} /> : <RotateCcw size={13} />}
            {saving ? 'Saving…' : isForward ? 'Forward' : 'Request Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────
export function SupervisorDashboard() {
  const { sops, loading } = usePending()
  if (loading) return <PageLoader />
  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div>
        <h1 className="page-title">Supervisor Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">SOPs awaiting your review</p>
      </div>
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4 max-w-xs">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <UserCheck size={20} className="text-blue-700" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{sops.length}</p>
          <p className="text-sm text-gray-500">Pending SOPs awaiting review</p>
        </div>
      </div>
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="section-title">Submitted SOPs</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {!sops.length ? (
            <p className="py-12 text-center text-gray-400 text-sm">No pending SOPs</p>
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
export function SupervisorPendingPage() {
  const { sops, loading, reload } = usePending()
  const [viewSop, setViewSop]     = useState(null)
  const [action, setAction]       = useState(null)

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Pending SOPs</h1>
          <p className="text-gray-500 text-sm mt-1">{sops.length} SOPs awaiting your review</p>
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
          <EmptyState title="No pending SOPs" desc="All SOPs have been reviewed" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th-left">SOP Title</th>
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
                      <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">v{sop.documentVersion ?? 1}</span>
                    </td>
                    <td className="table-td text-gray-500">{formatDate(sop.expirationDate)}</td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setViewSop({ id: sop.id, sopTitle: sop.sopTitle })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => setAction({ sop, mode: 'forward' })}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors flex items-center gap-1">
                          <CheckCircle size={11} /> Forward
                        </button>
                        <button onClick={() => setAction({ sop, mode: 'changes' })}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1">
                          <RotateCcw size={11} /> Changes
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
      {action && (
        <ActionModal sop={action.sop} mode={action.mode} open={!!action}
          onClose={() => setAction(null)} onDone={reload} />
      )}
    </div>
  )
}
