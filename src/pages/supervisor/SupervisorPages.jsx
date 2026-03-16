import { useEffect, useState } from 'react'
import { sopAPI } from '../../services/api'
import SopDetailModal from '../../components/common/SopDetailModal'
import Modal from '../../components/common/Modal'
import { Spinner, PageLoader, EmptyState } from '../../components/common/Loaders'
import StatusBadge from '../../components/common/StatusBadge'
import { formatDate } from '../../utils/sopUtils'
import { CheckCircle, RotateCcw, Eye, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

function ActionModal({ sop, mode, open, onClose, onDone }) {
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving]   = useState(false)

  const isForward = mode === 'forward'

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (isForward) {
        await sopAPI.supervisorForward(sop.id, { comments: remarks })
        toast.success('SOP forwarded to Level 1 Approver')
      } else {
        await sopAPI.supervisorReqChanges(sop.id, { comments: remarks })
        toast.success('Changes requested — SOP returned to initiator')
      }
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isForward ? 'Forward for Approval' : 'Request Changes'}
      size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface-50 rounded-xl p-3">
          <p className="text-xs text-surface-500 font-medium">SOP</p>
          <p className="text-sm font-semibold text-surface-800 mt-0.5">{sop?.sopTitle}</p>
        </div>
        {!isForward && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
            The SOP will be returned to the initiator for revision.
          </div>
        )}
        <div>
          <label className="label">Remarks {!isForward && '*'}</label>
          <textarea rows={3} className="input resize-none" value={remarks}
            onChange={e => setRemarks(e.target.value)}
            required={!isForward}
            placeholder={isForward ? 'Optional notes…' : 'Explain what changes are needed…'} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving}
            className={`flex-1 justify-center ${isForward ? 'btn-primary' : 'btn-secondary border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
            {saving ? <Spinner size="sm" /> : isForward ? <CheckCircle size={13} /> : <RotateCcw size={13} />}
            {saving ? 'Saving…' : isForward ? 'Forward' : 'Request Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function SupervisorDashboard() {
  const [sops, setSops]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sopAPI.getSupervisorPending()
      .then(r => setSops(r.data.data || []))
      .catch(() => toast.error('Failed to load pending SOPs'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Supervisor Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">SOPs awaiting your review</p>
      </div>
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
          <UserCheck size={20} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-surface-900">{sops.length}</p>
          <p className="text-sm text-surface-500">Pending SOPs awaiting review</p>
        </div>
      </div>
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="section-title">Submitted SOPs</h2>
        </div>
        <div className="divide-y divide-surface-100">
          {!sops.length ? (
            <div className="py-12 text-center text-surface-400 text-sm">No pending SOPs</div>
          ) : sops.map(sop => (
            <div key={sop.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">{sop.sopTitle}</p>
                <p className="text-xs text-surface-400 mt-0.5">Submitted · Expires {formatDate(sop.expirationDate)}</p>
              </div>
              <StatusBadge status={sop.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SupervisorPendingPage() {
  const [sops, setSops]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [viewId, setViewId]     = useState(null)
  const [action, setAction]     = useState(null) // { sop, mode }

  const load = () => {
    setLoading(true)
    sopAPI.getSupervisorPending()
      .then(r => setSops(r.data.data || []))
      .catch(() => toast.error('Failed to load pending SOPs'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pending SOPs</h1>
        <p className="text-sm text-surface-500 mt-1">{sops.length} SOPs awaiting your review</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !sops.length ? (
          <EmptyState title="No pending SOPs" desc="All SOPs have been reviewed" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className="table-th">SOP Title</th>
                  <th className="table-th">Version</th>
                  <th className="table-th">Expiry</th>
                  <th className="table-th w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map(sop => (
                  <tr key={sop.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td font-medium text-surface-900">{sop.sopTitle}</td>
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
                        <button onClick={() => setAction({ sop, mode: 'forward' })}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center gap-1">
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

      <SopDetailModal sopId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
      {action && (
        <ActionModal sop={action.sop} mode={action.mode} open={!!action}
          onClose={() => setAction(null)} onDone={load} />
      )}
    </div>
  )
}
