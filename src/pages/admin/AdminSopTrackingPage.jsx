import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import { downloadBlob, formatDate } from '../../utils/sopUtils'
import { Spinner } from '../../shared/components/Loaders'
import Modal from '../../shared/components/Modal'
import { ArrowLeft, CheckCircle2, XCircle, Clock, RotateCcw, CheckCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const STEP_COLOR = { 1: 'text-emerald-600', 2: 'text-red-600', 5: 'text-violet-700', 0: 'text-amber-500' }
const STEP_ICON  = { 1: CheckCircle2,        2: XCircle,        5: RotateCcw,         0: Clock }

export default function AdminSopTrackingPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const location   = useLocation()
  const passedSop  = location.state?.sop

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionOpen, setActionOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    sopAPI.getTracking(id)
      .then(r => setData(r.data?.data ?? r.data?.Data ?? r.data))
      .catch(() => toast.error('Failed to load SOP tracking details'))
      .finally(() => setLoading(false))
  }, [id])

  const sopTitle = passedSop?.sopTitle || data?.sopTitle || data?.SopTitle || '—'

  const steps = (data?.Steps ?? data?.steps ?? [])
  const lastAction = [...steps].reverse().find(s => (s.ApprovalStatus ?? s.approvalStatus) != null)
  const currentApprovalStatus = lastAction?.ApprovalStatus ?? lastAction?.approvalStatus ?? 0
  const canDownload = currentApprovalStatus === 3

  const handleDownload = async () => {
    try {
      const res = await sopAPI.downloadPdf(id)
      const safeTitle = (sopTitle || 'SOP').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim()
      downloadBlob(res.data, `${safeTitle || 'SOP'}_${id}.pdf`)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Download failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 surface flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">SOP Tracking Details</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              View approval workflow and tracking history for this SOP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActionOpen(true)}
            className="btn-primary">
            <CheckCircle size={15} /> Action
          </button>
          {canDownload && (
            <button type="button" onClick={handleDownload}
              className="btn-success">
              <Download size={15} /> Download PDF
            </button>
          )}
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
            Back
          </button>
        </div>
      </div>

      {data ? (
        <div className="space-y-6">
          {/* SOP Title Card */}
          <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6 bg-white shrink-0">
            <h2 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Document Title</h2>
            <p className="text-lg font-bold text-gray-900">{sopTitle}</p>
          </div>

          {/* Workflow Steps Card */}
          <div className="card-surface border border-gray-200 rounded-2xl shadow-sm bg-white p-6 w-full">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4">
              Workflow Timeline
            </h3>

            {(data.Steps ?? data.steps ?? []).length === 0 ? (
              <div className="text-center py-12">
                <Clock size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">No workflow steps configured yet.</p>
                <p className="text-sm text-gray-400 mt-1">This SOP may still be in draft or needs configuration.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(data.Steps ?? data.steps ?? []).map((step, idx) => {
                  const status    = step.ApprovalStatus ?? step.approvalStatus
                  const Icon      = STEP_ICON[status] ?? Clock
                  const color     = STEP_COLOR[status] ?? 'text-gray-400'
                  const label     = step.StageStatusLabel ?? step.stageStatusLabel ?? 'Not Yet Reached'
                  const stageName = step.StageName ?? step.stageName ?? `Stage ${idx + 1}`
                  const level     = step.ApprovalLevel ?? step.approvalLevel
                  const isSup     = step.IsSupervisor ?? step.isSupervisor
                  const comments  = step.Comments ?? step.comments
                  const actionedOn = step.ActionedOn ?? step.actionedOn
                  const actionedBy = step.ActionedByEmail ?? step.actionedByEmail

                  return (
                    <div key={step.ID ?? step.id ?? idx}
                      className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-colors">
                      
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 shadow-sm mt-0.5">
                        {idx + 1}
                      </div>
                      
                      <div className={`mt-2 shrink-0 ${color}`}>
                        <Icon size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-base font-bold text-gray-800">{stageName}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-gray-200 text-gray-600 shadow-sm leading-none pt-1">
                            {isSup ? 'Supervisor' : `Level ${level}`}
                          </span>
                          <span className={`text-sm font-bold ml-1 ${color}`}>{label}</span>
                        </div>
                        
                        {(actionedBy || actionedOn) && (
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1.5 flex-wrap">
                            {actionedBy && <span className="flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">👤 {actionedBy}</span>}
                            {actionedOn && <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">🕒 {formatDate(actionedOn)}</span>}
                          </div>
                        )}
                        
                        {comments && (
                          <div className="mt-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 rounded-l-lg"></div>
                            <p className="text-sm text-gray-600 pl-1"><span className="text-gray-400 font-semibold mr-1">Remarks:</span>{comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm bg-white p-12 text-center">
          <p className="text-gray-500 font-medium">No tracking data available for this document.</p>
        </div>
      )}

      <ActionModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        sop={{ id, sopTitle }}
        onDone={() => {
          setActionOpen(false)
          // refresh tracking after action
          setLoading(true)
          sopAPI.getTracking(id)
            .then(r => setData(r.data?.data ?? r.data?.Data ?? r.data))
            .catch(() => {})
            .finally(() => setLoading(false))
        }}
      />
    </div>
  )
}

function ActionModal({ open, onClose, sop, onDone }) {
  const [actionType, setActionType] = useState('approve') // approve | changes | reject
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setActionType('approve')
    setComments('')
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (actionType === 'approve') {
        await sopAPI.processApproval({ sopID: sop.id, action: 1, comments })
        toast.success('Approved and forwarded to next level')
      } else if (actionType === 'changes') {
        await sopAPI.returnForChanges(sop.id, { comments })
        toast.success('Changes requested — returned to initiator')
      } else {
        await sopAPI.processApproval({ sopID: sop.id, action: 2, comments })
        toast.success('Rejected')
      }
      onDone?.()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const needsComment = actionType !== 'approve'

  return (
    <Modal open={open} onClose={onClose} title="SOP Action" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">SOP</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{sop?.sopTitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setActionType('approve')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${actionType === 'approve' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            Approve
          </button>
          <button type="button" onClick={() => setActionType('changes')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${actionType === 'changes' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            Needs Changes
          </button>
          <button type="button" onClick={() => setActionType('reject')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${actionType === 'reject' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            Reject
          </button>
        </div>

        <div>
          <label className="label">Comments {needsComment ? '*' : '(optional)'}</label>
          <textarea rows={3} className="input resize-none" value={comments}
            onChange={e => setComments(e.target.value)}
            required={needsComment}
            placeholder={
              actionType === 'approve'
                ? 'Optional notes…'
                : actionType === 'reject'
                  ? 'Reason for rejection (required)…'
                  : 'Explain what changes are needed (required)…'
            }
          />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving}
            className={`flex-1 justify-center ${actionType === 'approve' ? 'btn-success' : actionType === 'reject' ? 'btn-danger' : 'btn-outline border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Saving…' : actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Request Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
